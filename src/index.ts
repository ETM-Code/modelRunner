#!/usr/bin/env bun

import type { AgentConfig } from "./core/types";
import { singlePrompt } from "./modes/prompt";
import { debate } from "./modes/debate";
import { critique } from "./modes/critique";
import { startServer } from "./server";
import * as log from "./util/logger";

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
  modelrunner debate <topic> [--agent1 claude|codex] [--agent2 claude|codex] [--max-rounds <n>] [--tools]
  modelrunner critique <task> [--creator claude|codex] [--critic claude|codex] [--max-rounds <n>] [--tools]
  modelrunner serve [--port <port>]

Options:
  --backend   Backend for prompt mode (default: claude)
  --model     Model name (e.g. gpt-5.2, sonnet, opus)
  --tools     Enable tool use (codex: --full-auto, claude: --dangerously-skip-permissions)
  --agent1    First agent backend for debate (default: claude)
  --agent2    Second agent backend for debate (default: codex)
  --creator   Creator backend for critique (default: codex)
  --critic    Critic backend for critique (default: claude)
  --max-rounds  Max rounds for debate/critique (default: 5)
  --port      Server port (default: 7420)
`);
}

function makeConfig(backend: string, model?: string, tools?: boolean): AgentConfig {
  return {
    backend: backend as "codex" | "claude",
    model: model || undefined,
    tools: tools ?? false,
  };
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
      const transcript = await debate({
        topic,
        agent1: makeConfig(flags.agent1 ?? "claude", flags.model, tools),
        agent2: makeConfig(flags.agent2 ?? "codex", flags.model, tools),
        maxRounds: parseInt(flags["max-rounds"] ?? "5", 10),
      });
      log.info(`\nDebate ended: ${transcript.reason}`);
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
      log.info(`\nCritique ended: ${transcript.reason}`);
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
