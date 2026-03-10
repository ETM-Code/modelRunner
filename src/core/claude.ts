import type { AgentConfig } from "./types";
import { makeSandboxedEnv } from "./sandbox";

export async function runClaude(
  config: AgentConfig,
  prompt: string,
): Promise<string> {
  const args: string[] = ["-p", "--output-format", "json"];

  if (config.tools) {
    args.push("--dangerously-skip-permissions");
  }

  if (config.model) {
    args.push("--model", config.model);
  }

  if (config.systemPrompt) {
    args.push("--system-prompt", config.systemPrompt);
  }

  if (config.maxBudget !== undefined) {
    args.push("--max-cost", String(config.maxBudget));
  }

  // Build environment
  let env: Record<string, string | undefined>;
  if (config.sandbox?.enabled) {
    env = makeSandboxedEnv();
  } else {
    env = { ...process.env };
  }
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;

  args.push(prompt);

  const spawnOpts: any = {
    stdout: "pipe",
    stderr: "pipe",
    env,
  };

  // Set cwd for sandboxed agents
  if (config.sandbox?.enabled) {
    spawnOpts.cwd = config.sandbox.workDir;
  }

  const proc = Bun.spawn(["claude", ...args], spawnOpts);

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Claude exited with code ${exitCode}: ${stderr}`);
  }

  try {
    const parsed = JSON.parse(stdout);
    return (parsed.result ?? parsed.text ?? stdout).trim();
  } catch {
    return stdout.trim();
  }
}
