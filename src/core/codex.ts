import type { AgentConfig } from "./types";

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

  const fullPrompt = config.systemPrompt
    ? `${config.systemPrompt}\n\n${prompt}`
    : prompt;

  args.push(fullPrompt);

  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CLAUDE_CODE_ENTRYPOINT;

  const proc = Bun.spawn(["codex", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Codex exited with code ${exitCode}: ${stderr}`);
  }

  return stdout.trim();
}
