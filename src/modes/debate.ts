import type { AgentConfig, DebateConfig, DebateRound, Transcript } from "../core/types";
import { runAgent } from "../core/engine";
import * as log from "../util/logger";

export async function debate(config: DebateConfig): Promise<Transcript> {
  const { topic, maxRounds } = config;

  const agentA: AgentConfig = {
    ...config.agent1,
    systemPrompt: `You are debating the topic: "${topic}". You argue FOR this position. Engage with your opponent's arguments directly. If you become genuinely convinced by their reasoning, respond with CONCEDE. Otherwise, make your strongest case.`,
  };

  const agentB: AgentConfig = {
    ...config.agent2,
    systemPrompt: `You are debating the topic: "${topic}". You argue AGAINST this position. Engage with your opponent's arguments directly. If you become genuinely convinced by their reasoning, respond with CONCEDE. Otherwise, make your strongest case.`,
  };

  const rounds: DebateRound[] = [];
  let lastResponse = `The debate topic is: "${topic}". Please present your opening argument FOR this position.`;

  log.header(`Debate: ${topic}`);
  log.info(`Agent A: ${agentA.backend}${agentA.model ? ` (${agentA.model})` : ""} — FOR`);
  log.info(`Agent B: ${agentB.backend}${agentB.model ? ` (${agentB.model})` : ""} — AGAINST`);

  for (let round = 1; round <= maxRounds; round++) {
    log.roundMarker(round, maxRounds);

    // Agent A's turn
    log.agentLabel("Agent A", agentA.backend, "a");
    const respA = await runAgent(agentA, lastResponse);
    log.agentText(respA.text);
    rounds.push({ round, agent: "A", text: respA.text, conceded: respA.conceded });

    if (respA.conceded) {
      log.concession("Agent A");
      return { rounds, winner: "Agent B", reason: "concede" };
    }

    // Agent B's turn
    log.agentLabel("Agent B", agentB.backend, "b");
    const respB = await runAgent(agentB, respA.text);
    log.agentText(respB.text);
    rounds.push({ round, agent: "B", text: respB.text, conceded: respB.conceded });

    if (respB.conceded) {
      log.concession("Agent B");
      return { rounds, winner: "Agent A", reason: "concede" };
    }

    lastResponse = respB.text;
  }

  log.result("Draw", "max rounds reached");
  return { rounds, reason: "max-rounds" };
}
