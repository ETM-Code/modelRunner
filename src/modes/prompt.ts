import type { AgentConfig } from "../core/types";
import { runAgent } from "../core/engine";

export async function singlePrompt(
  config: AgentConfig,
  prompt: string,
): Promise<string> {
  const response = await runAgent(config, prompt);
  return response.text;
}
