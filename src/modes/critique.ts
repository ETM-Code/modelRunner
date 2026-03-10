import type { AgentConfig, CritiqueConfig, DebateRound, Transcript } from "../core/types";
import { runAgent } from "../core/engine";
import { createSession, appendRound, completeSession, getResumeState } from "../core/session";
import * as log from "../util/logger";

export interface CritiqueOptions {
  sessionId?: string;
  onRound?: (round: DebateRound) => void;
}

export async function critique(config: CritiqueConfig, opts?: CritiqueOptions): Promise<Transcript & { sessionId: string }> {
  const { task, maxRounds } = config;

  const creator: AgentConfig = {
    ...config.creator,
    systemPrompt: `You are a creator. Your task: "${task}". Produce your best work. When you receive critique, revise and improve your output. Present only the latest version of your work.`,
  };

  const critic: AgentConfig = {
    ...config.critic,
    systemPrompt: `You are a critic reviewing work for the task: "${task}". Provide specific, actionable feedback. If the work meets a high quality bar, respond with CONCEDE to indicate it's good enough. Be demanding but fair.`,
  };

  let rounds: DebateRound[] = [];
  let startRound = 1;
  let creatorPrompt = `Please complete this task: "${task}"`;
  let sessionId: string;
  let resumeSkipCreator = false;
  let lastCreatorWork: string | null = null;

  if (opts?.sessionId) {
    const state = await getResumeState(opts.sessionId);
    sessionId = opts.sessionId;
    rounds = state.rounds;

    if (state.rounds.length > 0) {
      const lastEntry = state.rounds[state.rounds.length - 1];

      if (lastEntry.agent === "Creator") {
        // Creator finished, critic didn't — skip creator, feed work to critic
        startRound = lastEntry.round;
        resumeSkipCreator = true;
        lastCreatorWork = lastEntry.text;
      } else {
        // Critic finished — start next round with creator revision
        startRound = lastEntry.round + 1;
        creatorPrompt = `The critic gave this feedback on your work:\n\n${lastEntry.text}\n\nPlease revise your work to address the feedback.`;
      }
    }

    log.header(`Resuming Critique: ${task} (round ${startRound})`);
  } else {
    sessionId = await createSession("critique", config);
    log.header(`Critique: ${task}`);
    log.info(`Session: ${sessionId}`);
  }

  log.info(`Creator: ${creator.backend}${creator.model ? ` (${creator.model})` : ""}`);
  log.info(`Critic: ${critic.backend}${critic.model ? ` (${critic.model})` : ""}`);

  try {
    for (let round = startRound; round <= maxRounds; round++) {
      log.roundMarker(round, maxRounds);

      let workText: string;

      if (round === startRound && resumeSkipCreator && lastCreatorWork) {
        workText = lastCreatorWork;
      } else {
        // Creator produces work
        log.agentLabel("Creator", creator.backend, "a");
        const work = await runAgent(creator, creatorPrompt);
        log.agentText(work.text);
        const creatorRound: DebateRound = { round, agent: "Creator", text: work.text, conceded: false };
        rounds.push(creatorRound);
        await appendRound(sessionId, creatorRound);
        opts?.onRound?.(creatorRound);
        workText = work.text;
      }

      // Critic reviews
      log.agentLabel("Critic", critic.backend, "b");
      const review = await runAgent(critic, `Here is the work to review:\n\n${workText}`);
      log.agentText(review.text);
      const criticRound: DebateRound = { round, agent: "Critic", text: review.text, conceded: review.conceded };
      rounds.push(criticRound);
      await appendRound(sessionId, criticRound);
      opts?.onRound?.(criticRound);

      if (review.conceded) {
        log.concession("Critic (work approved!)");
        const result = { rounds, winner: "Creator", reason: "concede" as const, sessionId };
        await completeSession(sessionId, { status: "completed", winner: "Creator", reason: "concede" });
        return result;
      }

      creatorPrompt = `The critic gave this feedback on your work:\n\n${review.text}\n\nPlease revise your work to address the feedback.`;

      if (resumeSkipCreator) resumeSkipCreator = false;
    }

    log.result("Incomplete", "max rounds reached without approval");
    const result = { rounds, reason: "max-rounds" as const, sessionId };
    await completeSession(sessionId, { status: "completed", reason: "max-rounds" });
    return result;
  } catch (err) {
    await completeSession(sessionId, {
      status: "interrupted",
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
