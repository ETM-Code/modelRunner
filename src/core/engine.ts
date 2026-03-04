import type { AgentConfig, AgentResponse } from "./types";
import { runCodex } from "./codex";
import { runClaude } from "./claude";

const CONCEDE_PATTERN = /\bCONCEDE\b/;

export async function runAgent(
  config: AgentConfig,
  prompt: string,
): Promise<AgentResponse> {
  const rawText =
    config.backend === "codex"
      ? await runCodex(config, prompt)
      : await runClaude(config, prompt);

  return {
    text: rawText,
    conceded: CONCEDE_PATTERN.test(rawText),
  };
}
