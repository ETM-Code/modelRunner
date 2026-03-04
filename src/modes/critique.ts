import type { AgentConfig, CritiqueConfig, DebateRound, Transcript } from "../core/types";
import { runAgent } from "../core/engine";
import * as log from "../util/logger";

export async function critique(config: CritiqueConfig): Promise<Transcript> {
  const { task, maxRounds } = config;

  const creator: AgentConfig = {
    ...config.creator,
    systemPrompt: `You are a creator. Your task: "${task}". Produce your best work. When you receive critique, revise and improve your output. Present only the latest version of your work.`,
  };

  const critic: AgentConfig = {
    ...config.critic,
    systemPrompt: `You are a critic reviewing work for the task: "${task}". Provide specific, actionable feedback. If the work meets a high quality bar, respond with CONCEDE to indicate it's good enough. Be demanding but fair.`,
  };

  const rounds: DebateRound[] = [];

  log.header(`Critique: ${task}`);
  log.info(`Creator: ${creator.backend}${creator.model ? ` (${creator.model})` : ""}`);
  log.info(`Critic: ${critic.backend}${critic.model ? ` (${critic.model})` : ""}`);

  let creatorPrompt = `Please complete this task: "${task}"`;

  for (let round = 1; round <= maxRounds; round++) {
    log.roundMarker(round, maxRounds);

    // Creator produces work
    log.agentLabel("Creator", creator.backend, "a");
    const work = await runAgent(creator, creatorPrompt);
    log.agentText(work.text);
    rounds.push({ round, agent: "Creator", text: work.text, conceded: false });

    // Critic reviews
    log.agentLabel("Critic", critic.backend, "b");
    const review = await runAgent(critic, `Here is the work to review:\n\n${work.text}`);
    log.agentText(review.text);
    rounds.push({ round, agent: "Critic", text: review.text, conceded: review.conceded });

    if (review.conceded) {
      log.concession("Critic (work approved!)");
      return { rounds, winner: "Creator", reason: "concede" };
    }

    creatorPrompt = `The critic gave this feedback on your work:\n\n${review.text}\n\nPlease revise your work to address the feedback.`;
  }

  log.result("Incomplete", "max rounds reached without approval");
  return { rounds, reason: "max-rounds" };
}
