import type { AgentConfig, ContrarianConfig, DebateConfig, DebateRound, Transcript } from "../core/types";
import { runAgent } from "../core/engine";
import { createSession, appendRound, completeSession, getResumeState } from "../core/session";
import { createSandbox, cleanupSandbox, SANDBOX_SYSTEM_PROMPT_SUFFIX } from "../core/sandbox";
import * as log from "../util/logger";

export interface DebateOptions {
  sessionId?: string;
  onRound?: (round: DebateRound) => void;
}

function buildContextBlock(context: string, contextMode: string): string {
  if (contextMode === "none" || !context) return "";

  const modeInstruction =
    contextMode === "strict"
      ? "Use this context closely — your analysis should be grounded in and specific to this person's situation."
      : "Use this context as helpful background, but don't restrict yourself to it. Think broadly and bring in outside knowledge, trends, and possibilities.";

  return `\n\nCONTEXT ABOUT THE PERSON:\n${context}\n\n${modeInstruction}`;
}

function buildExploratoryPrompts(
  topic: string,
  contextBlock: string,
  sandboxed: boolean,
): { promptA: string; promptB: string } {
  const sandboxSuffix = sandboxed ? SANDBOX_SYSTEM_PROMPT_SUFFIX : "";

  const promptA = `You are Agent A in an exploratory debate on the topic: "${topic}"

Your role: PROPOSER & EXPLORER. Generate bold, concrete, well-researched ideas. Dig into specifics — names, tools, links, numbers. Don't be generic. Push the frontier of what's possible.

When Agent B pushes back, engage seriously — update your thinking if they're right, but defend your position with evidence when you believe you're correct. Don't roll over.

Use web search and research tools extensively to ground your arguments in real, current information. Pull specific examples, repos, tools, papers.

If you genuinely believe the other agent has arrived at the best possible answer and you have nothing meaningful to add, you may respond with CONCEDE. But do not concede easily — keep pushing for better answers.${contextBlock}${sandboxSuffix}`;

  const promptB = `You are Agent B in an exploratory debate on the topic: "${topic}"

Your role: CHALLENGER & DEEPENER. Stress-test every idea. Find the gaps, the hidden assumptions, the better alternatives. Don't just criticize — propose better paths when you see them.

When Agent A makes a strong point, acknowledge it and build on it. When they're wrong or shallow, call it out with specifics. Bring your own research — don't just react.

Use web search and research tools extensively to ground your arguments in real, current information. Pull specific examples, repos, tools, papers.

If you genuinely believe the other agent has arrived at the best possible answer and you have nothing meaningful to add, you may respond with CONCEDE. But do not concede easily — keep digging.${contextBlock}${sandboxSuffix}`;

  return { promptA, promptB };
}

function buildAdversarialPrompts(
  topic: string,
  contextBlock: string,
  sandboxed: boolean,
): { promptA: string; promptB: string } {
  const sandboxSuffix = sandboxed ? SANDBOX_SYSTEM_PROMPT_SUFFIX : "";

  const promptA = `You are debating the topic: "${topic}". You argue FOR this position. Engage with your opponent's arguments directly. If you become genuinely convinced by their reasoning, respond with CONCEDE. Otherwise, make your strongest case.

Use web search and research tools to support your arguments with evidence.${contextBlock}${sandboxSuffix}`;

  const promptB = `You are debating the topic: "${topic}". You argue AGAINST this position. Engage with your opponent's arguments directly. If you become genuinely convinced by their reasoning, respond with CONCEDE. Otherwise, make your strongest case.

Use web search and research tools to support your arguments with evidence.${contextBlock}${sandboxSuffix}`;

  return { promptA, promptB };
}

function buildContrarianPrompt(
  topic: string,
  transcriptSoFar: string,
  sandboxed: boolean,
): string {
  const sandboxSuffix = sandboxed ? SANDBOX_SYSTEM_PROMPT_SUFFIX : "";

  return `You are the CONTRARIAN in a debate about: "${topic}"

The two agents have been discussing this topic. Here is their conversation so far:

${transcriptSoFar}

YOUR JOB: Rip into their ideas. Be the smartest person in the room who thinks they're both being too comfortable. Find:
- Agreements that are actually wrong or lazy
- Ideas they haven't considered at all
- Ways they're both being too safe or conventional
- Specific, concrete counter-examples to their claims
- Blind spots, biases, and echo chamber effects

Be sharp, specific, and provocative. Use web search to find evidence that contradicts their positions. Don't be mean for its own sake — be mean because they can do better.

Do NOT output CONCEDE. Your job is to destabilize, not agree.${sandboxSuffix}`;
}

function formatTranscriptForContrarian(rounds: DebateRound[]): string {
  return rounds
    .map((r) => `[${r.agent} - Round ${r.round}]:\n${r.text}`)
    .join("\n\n---\n\n");
}

export async function debate(config: DebateConfig, opts?: DebateOptions): Promise<Transcript & { sessionId: string }> {
  const { topic, maxRounds, style = "exploratory", context, contextMode = "none", contrarian } = config;

  const sandboxed = config.agent1.sandbox?.enabled || config.agent2.sandbox?.enabled || false;
  const contextBlock = buildContextBlock(context ?? "", contextMode);

  // Build system prompts based on style
  const { promptA, promptB } =
    style === "exploratory"
      ? buildExploratoryPrompts(topic, contextBlock, sandboxed)
      : buildAdversarialPrompts(topic, contextBlock, sandboxed);

  const agentA: AgentConfig = { ...config.agent1, systemPrompt: promptA };
  const agentB: AgentConfig = { ...config.agent2, systemPrompt: promptB };

  let rounds: DebateRound[] = [];
  let startRound = 1;
  let lastResponse = style === "exploratory"
    ? `The topic for exploration is: "${topic}". Present your opening analysis — be specific, bold, and well-researched. Use web search.`
    : `The debate topic is: "${topic}". Please present your opening argument FOR this position.`;
  let sessionId: string;
  let resumeSkipA = false;

  if (opts?.sessionId) {
    const state = await getResumeState(opts.sessionId);
    sessionId = opts.sessionId;
    rounds = state.rounds;

    if (state.rounds.length > 0) {
      const lastEntry = state.rounds[state.rounds.length - 1];
      lastResponse = lastEntry.text;

      if (lastEntry.agent === "A") {
        startRound = lastEntry.round;
        resumeSkipA = true;
      } else {
        startRound = lastEntry.round + 1;
      }
    }

    log.header(`Resuming Debate: ${topic} (round ${startRound})`);
  } else {
    sessionId = await createSession("debate", config);
    log.header(`${style === "exploratory" ? "Exploratory " : ""}Debate: ${topic}`);
    log.info(`Session: ${sessionId}`);
  }

  log.info(`Agent A: ${agentA.backend}${agentA.model ? ` (${agentA.model})` : ""} — ${style === "exploratory" ? "PROPOSER" : "FOR"}`);
  log.info(`Agent B: ${agentB.backend}${agentB.model ? ` (${agentB.model})` : ""} — ${style === "exploratory" ? "CHALLENGER" : "AGAINST"}`);
  if (contrarian) {
    log.info(`Contrarian: ${contrarian.backend}${contrarian.model ? ` (${contrarian.model})` : ""} — every ${contrarian.every} rounds`);
  }
  if (sandboxed) {
    log.info(`Sandbox: enabled (agents confined to temp directories)`);
  }
  if (context) {
    log.info(`Context: provided (mode: ${contextMode})`);
  }

  // Track sandboxes for cleanup
  const sandboxes: Array<{ enabled: boolean; workDir: string }> = [];
  if (agentA.sandbox) sandboxes.push(agentA.sandbox);
  if (agentB.sandbox) sandboxes.push(agentB.sandbox);

  try {
    for (let round = startRound; round <= maxRounds; round++) {
      log.roundMarker(round, maxRounds);

      // Agent A's turn
      if (!(round === startRound && resumeSkipA)) {
        log.agentLabel("Agent A", agentA.backend, "a");
        const respA = await runAgent(agentA, lastResponse);
        log.agentText(respA.text);
        const roundA: DebateRound = { round, agent: "A", text: respA.text, conceded: respA.conceded };
        rounds.push(roundA);
        await appendRound(sessionId, roundA);
        opts?.onRound?.(roundA);

        if (respA.conceded) {
          log.concession("Agent A");
          const result = { rounds, winner: "Agent B", reason: "concede" as const, sessionId };
          await completeSession(sessionId, { status: "completed", winner: "Agent B", reason: "concede" });
          return result;
        }

        lastResponse = respA.text;
      }

      // Agent B's turn
      log.agentLabel("Agent B", agentB.backend, "b");
      const respB = await runAgent(agentB, lastResponse);
      log.agentText(respB.text);
      const roundB: DebateRound = { round, agent: "B", text: respB.text, conceded: respB.conceded };
      rounds.push(roundB);
      await appendRound(sessionId, roundB);
      opts?.onRound?.(roundB);

      if (respB.conceded) {
        log.concession("Agent B");
        const result = { rounds, winner: "Agent A", reason: "concede" as const, sessionId };
        await completeSession(sessionId, { status: "completed", winner: "Agent A", reason: "concede" });
        return result;
      }

      lastResponse = respB.text;

      // Contrarian injection
      if (contrarian && round % contrarian.every === 0 && round < maxRounds) {
        log.roundMarker(round, maxRounds);
        console.log(`\n\x1b[1m\x1b[31m[CONTRARIAN (${contrarian.backend})]\x1b[0m`);

        const contrarianConfig: AgentConfig = {
          backend: contrarian.backend,
          model: contrarian.model,
          tools: contrarian.tools ?? true,
          sandbox: contrarian.sandbox,
          systemPrompt: buildContrarianPrompt(
            topic,
            formatTranscriptForContrarian(rounds),
            contrarian.sandbox?.enabled ?? false,
          ),
        };

        const contResp = await runAgent(contrarianConfig, "Tear into their discussion. What are they getting wrong? What are they missing entirely?");
        log.agentText(contResp.text);

        const contRound: DebateRound = {
          round,
          agent: "Contrarian",
          text: contResp.text,
          conceded: false,
        };
        rounds.push(contRound);
        await appendRound(sessionId, contRound);
        opts?.onRound?.(contRound);

        // Feed contrarian's critique to the next round
        lastResponse = `[CONTRARIAN INTERJECTION — consider these challenges but don't feel obligated to agree]:\n\n${contResp.text}\n\n[Previous Agent B response for reference]:\n${respB.text}`;
      }

      if (resumeSkipA) resumeSkipA = false;
    }

    log.result("Draw", "max rounds reached");
    const result = { rounds, reason: "max-rounds" as const, sessionId };
    await completeSession(sessionId, { status: "completed", reason: "max-rounds" });
    return result;
  } catch (err) {
    await completeSession(sessionId, {
      status: "interrupted",
      reason: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    // Cleanup sandboxes
    for (const sb of sandboxes) {
      await cleanupSandbox(sb);
    }
  }
}
