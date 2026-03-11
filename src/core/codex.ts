import type { AgentConfig } from "./types";
import { makeSandboxedEnv } from "./sandbox";
import { RateLimitError, detectRateLimit } from "./errors";

export async function runCodex(
  config: AgentConfig,
  prompt: string,
): Promise<string> {
  const args: string[] = ["exec"];

  if (config.tools) {
    args.push("--full-auto");
  }

  if (config.model) {
    args.push("-m", config.model);
  }

  // Set working directory for sandboxed agents
  if (config.sandbox?.enabled) {
    args.push("--cd", config.sandbox.workDir);
  }

  const fullPrompt = config.systemPrompt
    ? `${config.systemPrompt}\n\n${prompt}`
    : prompt;

  args.push(fullPrompt);

  // Build environment
  let env: Record<string, string | undefined>;
  if (config.sandbox?.enabled) {
    env = makeSandboxedEnv();
  } else {
    env = { ...process.env };
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;

  // Use absolute path to avoid PATH issues when running as a daemon
  const codexBin = process.env.CODEX_BIN ?? "/opt/homebrew/bin/codex";
  const proc = Bun.spawn([codexBin, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    const combined = `${stderr}\n${stdout}`;
    const retryMs = detectRateLimit(combined);
    if (retryMs !== null) {
      throw new RateLimitError(`Codex rate limited: ${stderr.slice(0, 200)}`, retryMs);
    }
    throw new Error(`Codex exited with code ${exitCode}: ${stderr}`);
  }

  return stdout.trim();
}
