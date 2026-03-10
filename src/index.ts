#!/usr/bin/env bun

import type { AgentConfig, ContrarianConfig } from "./core/types";
import { createSandbox } from "./core/sandbox";
import { singlePrompt } from "./modes/prompt";
import { debate } from "./modes/debate";
import { critique } from "./modes/critique";
import { startServer } from "./server";
import { listSessions, loadSession } from "./core/session";
import * as log from "./util/logger";
import { readFile } from "fs/promises";

function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
  const flags: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

function usage() {
  console.log(`
modelrunner - Agent orchestration tool

Usage:
  modelrunner prompt <text> [--backend claude|codex] [--model <model>] [--tools]
  modelrunner debate <topic> [options]
  modelrunner critique <task> [--creator claude|codex] [--critic claude|codex] [--max-rounds <n>] [--tools]
  modelrunner sessions [--limit <n>]
  modelrunner sessions <id>
  modelrunner resume <id>
  modelrunner serve [--port <port>]

Debate options:
  --agent1            First agent backend (default: claude)
  --agent2            Second agent backend (default: codex)
  --max-rounds        Max rounds (default: 5)
  --tools             Enable tool use (web search, code execution)
  --sandbox           Sandbox agents in temp dirs, strip credentials
  --style             exploratory (default) or adversarial (FOR/AGAINST)
  --context           Context string or path to .txt/.md file
  --context-mode      open (default), strict, or none
  --contrarian-every  Inject contrarian agent every N rounds (e.g. 3)
  --contrarian-backend  Backend for contrarian (default: codex)

General options:
  --backend     Backend for prompt mode (default: claude)
  --model       Model name (e.g. gpt-5.2, sonnet, opus)
  --tools       Enable tool use (codex: --full-auto, claude: --dangerously-skip-permissions)
  --creator     Creator backend for critique (default: codex)
  --critic      Critic backend for critique (default: claude)
  --max-rounds  Max rounds for debate/critique (default: 5)
  --port        Server port (default: 7420)
  --limit       Max sessions to list (default: all)
`);
}

function makeConfig(backend: string, model?: string, tools?: boolean): AgentConfig {
  return {
    backend: backend as "codex" | "claude",
    model: model || undefined,
    tools: tools ?? false,
  };
}

async function loadContext(contextFlag: string): Promise<string> {
  // If it looks like a file path, try to read it
  if (contextFlag.endsWith(".txt") || contextFlag.endsWith(".md") || contextFlag.startsWith("/") || contextFlag.startsWith("~")) {
    const resolved = contextFlag.startsWith("~")
      ? contextFlag.replace("~", process.env.HOME ?? "")
      : contextFlag;
    try {
      return (await readFile(resolved, "utf-8")).trim();
    } catch {
      // Not a file, treat as literal text
      return contextFlag;
    }
  }
  return contextFlag;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    running: "\x1b[33m",    // yellow
    completed: "\x1b[32m",  // green
    error: "\x1b[31m",      // red
    interrupted: "\x1b[31m", // red
  };
  return `${colors[status] ?? ""}${status}\x1b[0m`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    usage();
    process.exit(0);
  }

  const command = args[0];
  const { flags, positional } = parseArgs(args.slice(1));
  const tools = flags.tools === "true";
  const sandboxEnabled = flags.sandbox === "true";

  switch (command) {
    case "prompt": {
      const text = positional.join(" ");
      if (!text) {
        log.error("Missing prompt text");
        process.exit(1);
      }
      const config = makeConfig(flags.backend ?? "claude", flags.model, tools);
      const result = await singlePrompt(config, text);
      console.log(result);
      break;
    }

    case "debate": {
      const topic = positional.join(" ");
      if (!topic) {
        log.error("Missing debate topic");
        process.exit(1);
      }

      const style = (flags.style ?? "exploratory") as "exploratory" | "adversarial";
      const contextMode = (flags["context-mode"] ?? "open") as "open" | "strict" | "none";

      // Load context if provided
      let context: string | undefined;
      if (flags.context) {
        context = await loadContext(flags.context);
      }

      // Build agent configs
      const agent1 = makeConfig(flags.agent1 ?? "claude", flags.model, tools);
      const agent2 = makeConfig(flags.agent2 ?? "codex", flags.model, tools);

      // Generate a temporary session ID for sandbox naming
      const tempId = crypto.randomUUID().slice(0, 8);

      // Set up sandboxes if requested
      if (sandboxEnabled) {
        agent1.sandbox = await createSandbox(tempId, "agentA");
        agent2.sandbox = await createSandbox(tempId, "agentB");
      }

      // Set up contrarian if requested
      let contrarian: ContrarianConfig | undefined;
      if (flags["contrarian-every"]) {
        const contrarianBackend = flags["contrarian-backend"] ?? "codex";
        contrarian = {
          every: parseInt(flags["contrarian-every"], 10),
          backend: contrarianBackend as "codex" | "claude",
          model: flags["contrarian-model"],
          tools: true, // contrarian always gets tools for research
        };
        if (sandboxEnabled) {
          contrarian.sandbox = await createSandbox(tempId, "contrarian");
        }
      }

      const transcript = await debate({
        topic,
        agent1,
        agent2,
        maxRounds: parseInt(flags["max-rounds"] ?? "5", 10),
        style,
        context,
        contextMode,
        contrarian,
      });

      log.info(`\nSession: ${transcript.sessionId}`);
      log.info(`Debate ended: ${transcript.reason}`);
      if (transcript.winner) log.result(transcript.winner, transcript.reason);
      break;
    }

    case "critique": {
      const task = positional.join(" ");
      if (!task) {
        log.error("Missing critique task");
        process.exit(1);
      }
      const transcript = await critique({
        task,
        creator: makeConfig(flags.creator ?? "codex", flags.model, tools),
        critic: makeConfig(flags.critic ?? "claude", flags.model, tools),
        maxRounds: parseInt(flags["max-rounds"] ?? "5", 10),
      });
      log.info(`\nSession: ${transcript.sessionId}`);
      log.info(`Critique ended: ${transcript.reason}`);
      break;
    }

    case "sessions": {
      const id = positional[0];

      if (id) {
        try {
          const { meta, rounds } = await loadSession(id);
          console.log();
          log.header(`Session: ${meta.id}`);
          log.info(`Mode: ${meta.mode}`);
          log.info(`Status: ${statusColor(meta.status)}`);
          log.info(`Started: ${formatTime(meta.startTime)}`);
          if (meta.endTime) log.info(`Ended: ${formatTime(meta.endTime)}`);
          if (meta.winner) log.info(`Winner: ${meta.winner}`);
          if (meta.reason) log.info(`Reason: ${meta.reason}`);

          if (meta.mode === "debate") {
            log.info(`Topic: ${(meta.config as any).topic}`);
          } else {
            log.info(`Task: ${(meta.config as any).task}`);
          }

          console.log();
          for (const round of rounds) {
            const side = round.agent === "A" || round.agent === "Creator" ? "a" : "b";
            log.agentLabel(round.agent, "", side as "a" | "b");
            log.agentText(round.text);
            if (round.conceded) log.concession(round.agent);
          }
        } catch {
          log.error(`Session not found: ${id}`);
          process.exit(1);
        }
      } else {
        const limit = flags.limit ? parseInt(flags.limit, 10) : undefined;
        const sessions = await listSessions(limit);

        if (sessions.length === 0) {
          log.info("No sessions found.");
          break;
        }

        console.log();
        console.log("\x1b[1m  ID                    Mode      Status       Rounds  Topic/Task\x1b[0m");
        console.log("  " + "─".repeat(90));

        for (const s of sessions) {
          const label = s.mode === "debate"
            ? (s.config as any).topic
            : (s.config as any).task;
          const truncated = label.length > 40 ? label.slice(0, 37) + "..." : label;
          console.log(
            `  ${s.id}  ${s.mode.padEnd(9)} ${statusColor(s.status).padEnd(22)} ${String(s.roundsCompleted).padStart(3)}    ${truncated}`,
          );
        }
        console.log();
      }
      break;
    }

    case "resume": {
      const id = positional[0];
      if (!id) {
        log.error("Missing session ID. Usage: modelrunner resume <id>");
        process.exit(1);
      }

      try {
        const { meta } = await loadSession(id);

        if (meta.mode === "debate") {
          const transcript = await debate(meta.config as any, { sessionId: id });
          log.info(`\nDebate ended: ${transcript.reason}`);
          if (transcript.winner) log.result(transcript.winner, transcript.reason);
        } else {
          const transcript = await critique(meta.config as any, { sessionId: id });
          log.info(`\nCritique ended: ${transcript.reason}`);
        }
      } catch (err) {
        log.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
      break;
    }

    case "serve": {
      const port = parseInt(flags.port ?? "7420", 10);
      startServer(port);
      break;
    }

    case "help":
    case "--help":
    case "-h":
      usage();
      break;

    default:
      log.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  log.error(err.message ?? String(err));
  process.exit(1);
});
