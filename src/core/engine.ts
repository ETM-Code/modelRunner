import type { AgentConfig, AgentResponse } from "./types";
import { runCodex } from "./codex";
import { runClaude } from "./claude";
import { runGrok } from "./grok";
import { RateLimitError, GrokUnavailableError } from "./errors";
import * as log from "../util/logger";

const CONCEDE_PATTERN = /\bCONCEDE\b/;

function formatWait(ms: number): string {
  if (ms >= 60_000) return `${Math.round(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
  return `${Math.round(ms / 1000)}s`;
}

export async function runAgent(
  config: AgentConfig,
  prompt: string,
): Promise<AgentResponse> {
  let rateLimitHits = 0;

  for (;;) {
    try {
      let rawText: string;
      if (config.backend === "codex") {
        rawText = await runCodex(config, prompt);
      } else if (config.backend === "grok") {
        try {
          rawText = await runGrok(config, prompt);
        } catch (err) {
          if (err instanceof GrokUnavailableError) {
            log.info(`\x1b[33m[Grok unavailable] Falling back to codex\x1b[0m`);
            rawText = await runCodex({ ...config, model: undefined }, prompt);
          } else {
            throw err;
          }
        }
      } else {
        rawText = await runClaude(config, prompt);
      }

      return {
        text: rawText,
        conceded: CONCEDE_PATTERN.test(rawText),
      };
    } catch (err) {
      if (err instanceof RateLimitError) {
        rateLimitHits++;
        // Add jitter: ±20% randomness to avoid thundering herd
        const jitter = err.retryAfterMs * (0.8 + Math.random() * 0.4);
        const waitMs = Math.round(jitter);

        log.info(`\x1b[33m[Rate limit] ${config.backend} hit rate limit. Waiting ${formatWait(waitMs)} before retry (hit #${rateLimitHits})...\x1b[0m`);

        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}
