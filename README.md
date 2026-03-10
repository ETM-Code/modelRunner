# modelRunner

Agent orchestration tool that pits AI agents against each other in debates, critique loops, and exploratory research sessions. Uses [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex) as backends.

Built for people who want better answers than any single LLM can give — by making them argue, challenge, and tear apart each other's ideas.

## Why

A single LLM gives you a single perspective. Two LLMs debating a topic — with a contrarian periodically dropping in to call out lazy thinking — produces something far more useful. modelRunner orchestrates multi-agent conversations where:

- **Different models challenge each other** (Claude vs GPT, or same model against itself)
- **A contrarian agent disrupts groupthink** every N rounds
- **Agents have tool access** for web search, code execution, and file analysis
- **Sandboxing** keeps agents from touching your credentials or files
- **Sessions persist** — resume interrupted debates, review transcripts later

## Install

Requires [Bun](https://bun.sh), [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), and/or [Codex CLI](https://github.com/openai/codex).

```bash
git clone https://github.com/ETM-Code/modelRunner.git
cd modelRunner
bun install

# Run directly
bun run src/index.ts --help

# Or link globally
bun link
modelrunner --help
```

## Quick Start

```bash
# Simple exploratory debate — two agents research and challenge each other
modelrunner debate "What are the most impactful open-source AI agent frameworks right now?" \
  --tools --max-rounds 6

# Deep research with context about you, sandboxed, with a contrarian
modelrunner debate "What startup should I build?" \
  --tools --sandbox \
  --context ~/my-background.md --context-mode open \
  --contrarian-every 3 \
  --max-rounds 10

# Classic adversarial FOR/AGAINST
modelrunner debate "Rust is better than C++ for embedded systems" \
  --style adversarial --max-rounds 5

# Critique loop — one agent builds, another tears it apart iteratively
modelrunner critique "Design a REST API for a multiplayer game lobby system" \
  --creator codex --critic claude --max-rounds 5 --tools
```

## Modes

### Debate

Two agents explore a topic together, pushing back on each other's ideas.

**Exploratory** (default): Agent A proposes and explores, Agent B challenges and deepens. Neither is locked into a fixed position — they update their thinking when the other makes a good point, but defend their position with evidence when they believe they're right.

**Adversarial**: Classic FOR/AGAINST format. One agent argues for the proposition, the other against. Useful for topics with genuine two-sided tension.

```bash
# Exploratory (default)
modelrunner debate "Best approach to neuromorphic chip design for sub-1mW inference" \
  --tools --sandbox --max-rounds 8

# Adversarial
modelrunner debate "LLMs will replace most software engineers within 5 years" \
  --style adversarial --agent1 claude --agent2 codex --max-rounds 6
```

### Critique

One agent produces work, another critiques it. The creator improves based on feedback each round. Ends when the critic is satisfied (CONCEDE) or max rounds hit.

```bash
modelrunner critique "Write a production-ready rate limiter in TypeScript" \
  --creator codex --critic claude --max-rounds 5 --tools
```

### Single Prompt

Send a one-shot prompt to any backend:

```bash
modelrunner prompt "Explain the tradeoffs of analog vs digital neuromorphic computing" --backend claude
modelrunner prompt "Write a Rust BFS implementation" --backend codex --model gpt-5.2
```

## Features

### Contrarian Agent

The most useful feature for long debates. Every N rounds, a separate agent receives the full transcript and tears into both agents' thinking:

- Finds lazy agreements and groupthink
- Points out ideas neither agent has considered
- Provides specific counter-examples and evidence
- Uses web search independently to challenge claims

The contrarian's output is injected into the next round — both debaters see it, but aren't obligated to agree. It prevents the common failure mode where two agents converge on a mediocre answer and stop pushing.

```bash
modelrunner debate "How to make €500K as fast as possible" \
  --tools --sandbox \
  --contrarian-every 3 --contrarian-backend codex \
  --max-rounds 12
```

### Context Injection

Pass personal context so agents can tailor their analysis to your specific situation:

```bash
# From a file
modelrunner debate "What fellowship programs should I apply to?" \
  --context ~/cv.md --context-mode strict

# Inline
modelrunner debate "How should I allocate my time this quarter?" \
  --context "19yo EE student, runs software company, building neuromorphic chip" \
  --context-mode open
```

**Context modes:**
- `open` (default) — use the context as helpful background, but think broadly
- `strict` — stay grounded in and specific to this person's situation
- `none` — ignore the context entirely (useful for general research)

### Sandboxing

When `--sandbox` is enabled:

- Each agent gets its own temp directory
- **All credentials stripped** from environment: `GH_TOKEN`, `GITHUB_TOKEN`, AWS keys, API keys, `SSH_AUTH_SOCK`, plus any env var containing "token", "secret", "password", or "credential"
- Agents can **read** files anywhere for reference, but can only **write** in their sandbox
- Sandboxes auto-cleanup when the debate ends

```bash
# Agents get tools but can't touch your GitHub, AWS, etc.
modelrunner debate "Best AI agent frameworks to deploy" \
  --tools --sandbox --max-rounds 8
```

### Sessions

All debates and critiques are persisted to `~/.modelrunner/sessions/`. You can review transcripts and resume interrupted sessions:

```bash
# List all sessions
modelrunner sessions

# View a specific session transcript
modelrunner sessions <session-id>

# Resume an interrupted debate
modelrunner resume <session-id>
```

Sessions use append-only JSONL for crash safety — if a debate crashes mid-round, you can resume from exactly where it left off.

### HTTP Server

Run modelRunner as an API server with SSE streaming for live debate monitoring:

```bash
modelrunner serve --port 7420
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/prompt` | Single prompt |
| `POST` | `/debate` | Start debate (returns session ID) |
| `POST` | `/critique` | Start critique (returns session ID) |
| `GET` | `/sessions` | List sessions |
| `GET` | `/sessions/:id` | Get session detail |
| `GET` | `/sessions/:id/stream` | SSE stream — live rounds as they happen |
| `POST` | `/sessions/:id/resume` | Resume interrupted session |

## All Options

### Debate

| Flag | Description | Default |
|------|-------------|---------|
| `--agent1` | First agent backend (`claude` or `codex`) | `claude` |
| `--agent2` | Second agent backend | `codex` |
| `--max-rounds` | Maximum rounds | `5` |
| `--tools` | Enable web search, code execution, file access | `false` |
| `--sandbox` | Isolate agents in temp dirs, strip credentials | `false` |
| `--style` | `exploratory` or `adversarial` | `exploratory` |
| `--context` | Context string or path to `.txt`/`.md` file | — |
| `--context-mode` | `open`, `strict`, or `none` | `open` |
| `--contrarian-every` | Inject contrarian every N rounds | disabled |
| `--contrarian-backend` | Backend for contrarian | `codex` |
| `--contrarian-model` | Model for contrarian | backend default |
| `--model` | Model override for both agents | backend default |

### Critique

| Flag | Description | Default |
|------|-------------|---------|
| `--creator` | Creator backend | `codex` |
| `--critic` | Critic backend | `claude` |
| `--max-rounds` | Maximum rounds | `5` |
| `--tools` | Enable tool use | `false` |
| `--model` | Model override | backend default |

### Prompt

| Flag | Description | Default |
|------|-------------|---------|
| `--backend` | Agent backend | `claude` |
| `--model` | Model name | backend default |
| `--tools` | Enable tool use | `false` |

## Architecture

```
src/
├── index.ts              # CLI entry point, argument parsing
├── server.ts             # HTTP/SSE server
├── core/
│   ├── types.ts          # Type definitions
│   ├── engine.ts         # Agent dispatch (routes to claude/codex)
│   ├── claude.ts         # Claude Code CLI runner
│   ├── codex.ts          # Codex CLI runner
│   ├── sandbox.ts        # Sandbox creation, env stripping, cleanup
│   └── session.ts        # Session persistence (JSONL + meta.json)
├── modes/
│   ├── prompt.ts         # Single prompt mode
│   ├── debate.ts         # Debate orchestration (exploratory + adversarial + contrarian)
│   └── critique.ts       # Critique loop orchestration
└── util/
    └── logger.ts         # Colored terminal output
```

## Use Cases

**Research & Strategy**
- "What are the most impactful things I can do this quarter?" — with your context, contrarian every 3 rounds, 10 rounds deep
- "What startup should I build right now?" — no personal context, pure market research with web search
- "How should I approach [technical problem]?" — with relevant codebase context

**Technical Deep Dives**
- "Best architecture for a real-time multiplayer game server" — agents can write and run code to prototype
- "Compare RISC-V vs ARM for edge ML inference" — with web search for latest benchmarks
- "Design a testing strategy for [system]" — critique mode, creator builds the strategy, critic tears it apart

**Career & Opportunities**
- "What fellowship programs am I missing?" — strict context mode with your CV
- "How do I position myself for [role]?" — open context, agents research the landscape
- "What's the fastest path to [goal]?" — contrarian keeps them from being too conservative

**Code Quality**
- "Write a production rate limiter" → critique mode, one builds, one reviews iteratively
- "Design an API for [domain]" → debate mode, different architectural philosophies clash

## License

MIT
