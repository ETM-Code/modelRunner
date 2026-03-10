import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { SandboxConfig } from "./types";

// Env vars to strip for sandboxed agents — credentials they shouldn't touch
const STRIPPED_ENV_VARS = [
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "GH_ENTERPRISE_TOKEN",
  "HOMEBREW_GITHUB_API_TOKEN",
  "NPM_TOKEN",
  "NODE_AUTH_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "SSH_AUTH_SOCK",
];

export async function createSandbox(sessionId: string, agentLabel: string): Promise<SandboxConfig> {
  const prefix = join(tmpdir(), `modelrunner-${sessionId}-${agentLabel}-`);
  const workDir = await mkdtemp(prefix);

  // Init a git repo so Codex doesn't refuse to run
  const proc = Bun.spawn(["git", "init"], { cwd: workDir, stdout: "pipe", stderr: "pipe" });
  await proc.exited;

  return { enabled: true, workDir };
}

export async function createSharedSandbox(sessionId: string): Promise<SandboxConfig> {
  const prefix = join(tmpdir(), `modelrunner-${sessionId}-shared-`);
  const workDir = await mkdtemp(prefix);

  const proc = Bun.spawn(["git", "init"], { cwd: workDir, stdout: "pipe", stderr: "pipe" });
  await proc.exited;

  return { enabled: true, workDir };
}

export function makeSandboxedEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };

  // Strip credentials
  for (const key of STRIPPED_ENV_VARS) {
    delete env[key];
  }

  // Also strip any key that looks like a token/secret
  for (const key of Object.keys(env)) {
    const lower = key.toLowerCase();
    if (
      (lower.includes("token") || lower.includes("secret") || lower.includes("password") || lower.includes("credential")) &&
      !lower.includes("path") // don't strip PATH-like vars
    ) {
      delete env[key];
    }
  }

  return env;
}

export async function cleanupSandbox(sandbox: SandboxConfig): Promise<void> {
  try {
    await rm(sandbox.workDir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

export const SANDBOX_SYSTEM_PROMPT_SUFFIX = `

SANDBOX RULES:
- You are running in a sandboxed environment. Your working directory is a temporary sandbox.
- You may READ files anywhere on the filesystem for reference.
- You may only WRITE or CREATE files within your current working directory.
- Do NOT attempt to modify files outside your working directory.
- Do NOT attempt to use git push, gh, or any commands that interact with remote services or credentials.
- You DO have access to web search and can fetch URLs for research.
- Focus on research, analysis, and reasoning. Write code/files in your sandbox if it helps your analysis.`;

export const SHARED_SANDBOX_SYSTEM_PROMPT_SUFFIX = `

SHARED SANDBOX RULES:
- You are running in a SHARED sandboxed environment. Both you and the other agent work in the same directory.
- You may READ files anywhere on the filesystem for reference.
- You may WRITE and CREATE files within your shared working directory.
- The other agent can see, read, run, and modify files you create, and vice versa.
- USE THIS: Write proof-of-concept code, run experiments, leave results for the other agent to inspect and critique.
- When the other agent has written code or results, READ and RUN their work before responding. Inspect their experiments.
- Do NOT attempt to modify files outside your working directory.
- Do NOT attempt to use git push, gh, or any commands that interact with remote services or credentials.
- You DO have access to web search and can fetch URLs for research.
- Be experimental — write small scripts, run them, share results. This is a lab, not a lecture.`;
