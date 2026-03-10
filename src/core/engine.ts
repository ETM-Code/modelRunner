import type { AgentConfig, AgentResponse } from "./types";
import { runCodex } from "./codex";
import { runClaude } from "./claude";
import { RateLimitError } from "./errors";
import * as log from "../util/logger";

const CONCEDE_PATTERN = /\bCONCEDE\b/;
const MAX_RATE_LIMIT_RETRIES = 5;

function formatWait(ms: number): string {
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export async function runAgent(
  config: AgentConfig,
  prompt: string,
): Promise<AgentResponse> {
  let lastError: RateLimitError | null = null;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      const rawText =
        config.backend === "codex"
          ? await runCodex(config, prompt)
          : await runClaude(config, prompt);

      return {
        text: rawText,
        conceded: CONCEDE_PATTERN.test(rawText),
      };
    } catch (err) {
      if (err instanceof RateLimitError && attempt < MAX_RATE_LIMIT_RETRIES) {
        lastError = err;
        // Add jitter: ±20% randomness to avoid thundering herd
        const jitter = err.retryAfterMs * (0.8 + Math.random() * 0.4);
        const waitMs = Math.round(jitter);

        log.info(`\x1b[33m[Rate limit] ${config.backend} hit rate limit. Waiting ${formatWait(waitMs)} before retry (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})...\x1b[0m`);

        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }

  // Should never reach here, but just in case
  throw lastError ?? new Error("Rate limit retries exhausted");
}
