---
name: modelrunner
description: Run prompts through Codex CLI or Claude Code CLI, run debates between agents, or critique loops. Delegates to the modelrunner CLI tool.
argument-hint: <prompt|debate|critique|serve> [args]
allowed-tools: Bash(bun:*), Bash(modelrunner:*), Bash(cat:*), Read
---

# modelRunner - Agent Orchestration

Run prompts, debates, and critique loops using Codex CLI and Claude Code CLI as backends.

## Commands

### Single Prompt
Send a prompt to an agent and get the response:
```
/modelrunner prompt "What is the capital of France?" --backend claude
/modelrunner prompt "Explain monads" --backend codex --model gpt-5.2
```

### Debate
Two agents argue opposing sides until one concedes or max rounds reached:
```
/modelrunner debate "Is functional programming better than OOP?"
/modelrunner debate "Tabs vs spaces" --agent1 claude --agent2 codex --max-rounds 5
```

### Critique
One agent produces work, another critiques it iteratively:
```
/modelrunner critique "Write a Python fibonacci function"
/modelrunner critique "Write a REST API design" --creator codex --critic claude --max-rounds 5
```

### HTTP Server
Start the API server:
```
/modelrunner serve --port 7420
```

## Implementation

All commands run through the `modelrunner` CLI which is a Bun TypeScript tool located at:
`/Users/eoghancollins/Personal Tools/modelRunner/`

To execute, run from the modelRunner project directory:
```bash
cd "/Users/eoghancollins/Personal Tools/modelRunner" && bun run src/index.ts <subcommand> [args]
```

Or if globally linked:
```bash
modelrunner <subcommand> [args]
```

### Options
| Flag | Description | Default |
|------|-------------|---------|
| `--backend` | Agent backend (prompt mode) | `claude` |
| `--model` | Model name (e.g. `gpt-5.2`, `sonnet`, `opus`) | backend default |
| `--tools` | Enable tool use | `false` |
| `--agent1` | First agent backend (debate) | `claude` |
| `--agent2` | Second agent backend (debate) | `codex` |
| `--creator` | Creator backend (critique) | `codex` |
| `--critic` | Critic backend (critique) | `claude` |
| `--max-rounds` | Max rounds for debate/critique | `5` |
| `--port` | Server port | `7420` |

### Important
- Output goes to stdout. For long-running debates, consider running in background.
- The `--tools` flag gives agents file/shell access (`--full-auto` for codex, `--dangerously-skip-permissions` for claude). Only use when needed.
- Debates end when an agent outputs `CONCEDE` or max rounds are reached.
