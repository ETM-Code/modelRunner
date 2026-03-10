import type { AgentConfig, DebateRound } from "./core/types";
import { singlePrompt } from "./modes/prompt";
import { debate } from "./modes/debate";
import { critique } from "./modes/critique";
import { loadSession, listSessions } from "./core/session";

function jsonError(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function parseAgentConfig(obj: unknown): AgentConfig {
  if (typeof obj === "string") {
    return { backend: obj as "codex" | "claude" };
  }
  const o = obj as Record<string, unknown>;
  return {
    backend: (o.backend as "codex" | "claude") ?? "claude",
    model: o.model as string | undefined,
    tools: o.tools as boolean | undefined,
    maxBudget: o.maxBudget as number | undefined,
  };
}

// Track active SSE streams per session so we can push live rounds
const activeStreams = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

function addStreamController(sessionId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  if (!activeStreams.has(sessionId)) {
    activeStreams.set(sessionId, new Set());
  }
  activeStreams.get(sessionId)!.add(controller);
}

function removeStreamController(sessionId: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  activeStreams.get(sessionId)?.delete(controller);
  if (activeStreams.get(sessionId)?.size === 0) {
    activeStreams.delete(sessionId);
  }
}

function broadcastRound(sessionId: string, round: DebateRound) {
  const controllers = activeStreams.get(sessionId);
  if (!controllers) return;
  const data = `data: ${JSON.stringify({ type: "round", ...round })}\n\n`;
  const encoded = new TextEncoder().encode(data);
  for (const c of controllers) {
    try {
      c.enqueue(encoded);
    } catch {
      // stream closed
    }
  }
}

function broadcastComplete(sessionId: string, winner?: string, reason?: string) {
  const controllers = activeStreams.get(sessionId);
  if (!controllers) return;
  const data = `data: ${JSON.stringify({ type: "complete", winner, reason })}\n\n`;
  const encoded = new TextEncoder().encode(data);
  for (const c of controllers) {
    try {
      c.enqueue(encoded);
      c.close();
    } catch {
      // stream closed
    }
  }
  activeStreams.delete(sessionId);
}

// Track running sessions to enable SSE streaming for in-progress sessions
const runningSessions = new Set<string>();

export function startServer(port: number) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({ status: "ok" });
      }

      // GET /sessions — list sessions
      if (req.method === "GET" && url.pathname === "/sessions") {
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const sessions = await listSessions(limit);
        return Response.json({ sessions });
      }

      // GET /sessions/:id/stream — SSE stream
      const streamMatch = url.pathname.match(/^\/sessions\/([^/]+)\/stream$/);
      if (req.method === "GET" && streamMatch) {
        const sessionId = streamMatch[1];

        try {
          const { meta, rounds } = await loadSession(sessionId);
          const encoder = new TextEncoder();

          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              // Replay existing rounds
              for (const round of rounds) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "round", ...round })}\n\n`));
              }

              // If session is done, send complete and close
              if (meta.status === "completed" || meta.status === "error") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "complete", winner: meta.winner, reason: meta.reason })}\n\n`),
                );
                controller.close();
                return;
              }

              // Session is still running — register for live updates
              addStreamController(sessionId, controller);
            },
            cancel() {
              removeStreamController(sessionId, this as unknown as ReadableStreamDefaultController<Uint8Array>);
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch {
          return jsonError("Session not found", 404);
        }
      }

      // GET /sessions/:id — session detail
      const sessionMatch = url.pathname.match(/^\/sessions\/([^/]+)$/);
      if (req.method === "GET" && sessionMatch) {
        const sessionId = sessionMatch[1];
        try {
          const session = await loadSession(sessionId);
          return Response.json(session);
        } catch {
          return jsonError("Session not found", 404);
        }
      }

      // POST /sessions/:id/resume — resume session
      const resumeMatch = url.pathname.match(/^\/sessions\/([^/]+)\/resume$/);
      if (req.method === "POST" && resumeMatch) {
        const sessionId = resumeMatch[1];
        try {
          const { meta } = await loadSession(sessionId);

          const onRound = (round: DebateRound) => broadcastRound(sessionId, round);

          if (meta.mode === "debate") {
            runningSessions.add(sessionId);
            debate(meta.config as any, { sessionId, onRound })
              .then((t) => broadcastComplete(sessionId, t.winner, t.reason))
              .catch(() => broadcastComplete(sessionId, undefined, "error"))
              .finally(() => runningSessions.delete(sessionId));
          } else {
            runningSessions.add(sessionId);
            critique(meta.config as any, { sessionId, onRound })
              .then((t) => broadcastComplete(sessionId, t.winner, t.reason))
              .catch(() => broadcastComplete(sessionId, undefined, "error"))
              .finally(() => runningSessions.delete(sessionId));
          }

          return Response.json({ sessionId, status: "resuming" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return jsonError(msg, 400);
        }
      }

      if (req.method !== "POST") {
        return jsonError("Method not allowed", 405);
      }

      try {
        const body = await parseBody(req);

        if (url.pathname === "/prompt") {
          const prompt = body.prompt as string;
          if (!prompt) return jsonError("Missing 'prompt' field");

          const config: AgentConfig = {
            backend: (body.backend as "codex" | "claude") ?? "claude",
            model: body.model as string | undefined,
            tools: body.tools as boolean | undefined,
            maxBudget: body.maxBudget as number | undefined,
          };

          const text = await singlePrompt(config, prompt);
          return Response.json({ result: text });
        }

        if (url.pathname === "/debate") {
          const topic = body.topic as string;
          if (!topic) return jsonError("Missing 'topic' field");

          const debateConfig = {
            topic,
            agent1: parseAgentConfig(body.agent1 ?? "claude"),
            agent2: parseAgentConfig(body.agent2 ?? "codex"),
            maxRounds: (body.maxRounds as number) ?? 5,
          };

          // Start in background, return session ID immediately
          const { createSession: cs } = await import("./core/session");
          const sessionId = await cs("debate", debateConfig);

          const onRound = (round: DebateRound) => broadcastRound(sessionId, round);

          runningSessions.add(sessionId);
          debate(debateConfig, { sessionId, onRound })
            .then((t) => broadcastComplete(sessionId, t.winner, t.reason))
            .catch(() => broadcastComplete(sessionId, undefined, "error"))
            .finally(() => runningSessions.delete(sessionId));

          return Response.json({ sessionId });
        }

        if (url.pathname === "/critique") {
          const task = body.task as string;
          if (!task) return jsonError("Missing 'task' field");

          const critiqueConfig = {
            task,
            creator: parseAgentConfig(body.creator ?? "codex"),
            critic: parseAgentConfig(body.critic ?? "claude"),
            maxRounds: (body.maxRounds as number) ?? 5,
          };

          const { createSession: cs } = await import("./core/session");
          const sessionId = await cs("critique", critiqueConfig);

          const onRound = (round: DebateRound) => broadcastRound(sessionId, round);

          runningSessions.add(sessionId);
          critique(critiqueConfig, { sessionId, onRound })
            .then((t) => broadcastComplete(sessionId, t.winner, t.reason))
            .catch(() => broadcastComplete(sessionId, undefined, "error"))
            .finally(() => runningSessions.delete(sessionId));

          return Response.json({ sessionId });
        }

        return jsonError("Not found", 404);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return jsonError(msg, 500);
      }
    },
  });

  console.log(`modelRunner server listening on http://localhost:${server.port}`);
  return server;
}
