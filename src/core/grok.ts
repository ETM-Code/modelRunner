import type { AgentConfig } from "./types";
import { GrokUnavailableError } from "./errors";
import * as log from "../util/logger";

const GROK_API_DIR =
  process.env.GROK_API_DIR ??
  `${process.env.HOME ?? "/Users/eoghancollins"}/Personal Tools/Grok-Api`;

const GROK_MODELS = ["grok-4", "grok-3-fast"] as const;

async function tryGrokModel(model: string, prompt: string): Promise<string> {
  const proc = Bun.spawn(["uv", "run", "python", "run.py", model, prompt], {
    cwd: GROK_API_DIR,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Grok ${model} failed: ${stderr.trim() || "non-zero exit"}`);
  }

  const text = stdout.trim();
  if (!text) throw new Error(`Grok ${model} returned empty response`);
  return text;
}

export async function runGrok(
  config: AgentConfig,
  prompt: string,
): Promise<string> {
  // Respect an explicit model override if provided
  const modelsToTry = config.model ? [config.model, ...GROK_MODELS.filter(m => m !== config.model)] : [...GROK_MODELS];

  const fullPrompt = config.systemPrompt
    ? `${config.systemPrompt}\n\n${prompt}`
    : prompt;

  for (const model of modelsToTry) {
    try {
      log.info(`[Grok] Trying ${model}...`);
      const result = await tryGrokModel(model, fullPrompt);
      log.info(`[Grok] ${model} succeeded`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.info(`[Grok] ${model} failed: ${msg.slice(0, 120)}`);
    }
  }

  throw new GrokUnavailableError("All Grok models unavailable (grok-4, grok-3-fast)");
}
