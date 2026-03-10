import type { AgentConfig, DebateConfig, CritiqueConfig, DebateRound } from "./core/types";
import { RateLimitError } from "./core/errors";
import { singlePrompt } from "./modes/prompt";
import { debate } from "./modes/debate";
import { critique } from "./modes/critique";
import { loadSession, listSessions, createSession } from "./core/session";
import { createSandbox, createSharedSandbox } from "./core/sandbox";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import * as log from "./util/logger";

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

// ─── SSE Streaming ───

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

// ─── Job Queue ───

interface QueueJob {
  id: string;
  mode: "debate" | "critique";
  config: DebateConfig | CritiqueConfig;
  status: "queued" | "running" | "completed" | "error";
  sessionId?: string;
  error?: string;
  addedAt: string;
  startedAt?: string;
  completedAt?: string;
  retries: number;
  maxRetries: number;
  label?: string; // human-readable label
}

const QUEUE_DIR = join(homedir(), ".modelrunner", "queue");
const QUEUE_FILE = join(QUEUE_DIR, "jobs.json");

let jobQueue: QueueJob[] = [];
let queueProcessing = false;

async function saveQueue() {
  await mkdir(QUEUE_DIR, { recursive: true });
  await writeFile(QUEUE_FILE, JSON.stringify(jobQueue, null, 2));
}

async function loadQueue(): Promise<QueueJob[]> {
  try {
    const data = await readFile(QUEUE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function addToQueue(job: QueueJob) {
  jobQueue.push(job);
  saveQueue().catch(() => {});
  log.info(`[Queue] Added job ${job.id}: ${job.label ?? job.mode}`);
  processQueue(); // kick off processing if idle
}

async function processQueue() {
  if (queueProcessing) return;
  queueProcessing = true;

  while (true) {
    const next = jobQueue.find((j) => j.status === "queued");
    if (!next) break;

    next.status = "running";
    next.startedAt = new Date().toISOString();
    await saveQueue();

    log.header(`[Queue] Starting: ${next.label ?? next.id}`);
    log.info(`[Queue] ${jobQueue.filter((j) => j.status === "queued").length} jobs remaining`);

    try {
      if (next.mode === "debate") {
        const config = next.config as DebateConfig;
        const onRound = (round: DebateRound) => {
          if (next.sessionId) broadcastRound(next.sessionId, round);
        };

        let sessionId: string;
        if (next.sessionId) {
          // Resuming a previous session
          const transcript = await debate(config, { sessionId: next.sessionId, onRound });
          sessionId = transcript.sessionId;
          broadcastComplete(sessionId, transcript.winner, transcript.reason);
        } else {
          const transcript = await debate(config, { onRound });
          sessionId = transcript.sessionId;
          next.sessionId = sessionId;
          broadcastComplete(sessionId, transcript.winner, transcript.reason);
        }

        next.status = "completed";
        next.completedAt = new Date().toISOString();
        log.info(`[Queue] Completed: ${next.label ?? next.id} (session: ${next.sessionId})`);
      } else {
        const config = next.config as CritiqueConfig;
        const onRound = (round: DebateRound) => {
          if (next.sessionId) broadcastRound(next.sessionId, round);
        };

        const transcript = await critique(config, { onRound });
        next.sessionId = (transcript as any).sessionId;
        next.status = "completed";
        next.completedAt = new Date().toISOString();
        broadcastComplete(next.sessionId!, (transcript as any).winner, transcript.reason);
        log.info(`[Queue] Completed: ${next.label ?? next.id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = err instanceof RateLimitError;

      if (isRateLimit) {
        const waitMs = (err as RateLimitError).retryAfterMs;
        log.error(`[Queue] Rate limited on: ${next.label ?? next.id}`);
        log.info(`[Queue] Pausing queue for ${Math.round(waitMs / 1000)}s before retry...`);
        next.retries++;
        next.status = "queued"; // always re-queue rate limits regardless of retry count
        await saveQueue();
        await new Promise((r) => setTimeout(r, waitMs));
        continue; // skip the normal pause, go straight to next job
      }

      log.error(`[Queue] Failed: ${next.label ?? next.id} — ${msg}`);

      if (next.retries < next.maxRetries) {
        next.retries++;
        next.status = "queued";
        log.info(`[Queue] Retrying (${next.retries}/${next.maxRetries}): ${next.label ?? next.id}`);
      } else {
        next.status = "error";
        next.error = msg;
        next.completedAt = new Date().toISOString();
      }
    }

    await saveQueue();

    // Brief pause between jobs to avoid immediate rate limit hits
    await new Promise((r) => setTimeout(r, 2000));
  }

  queueProcessing = false;
  log.info("[Queue] All jobs processed");
}

// ─── Server ───

export function startServer(port: number) {
  // Load persisted queue on startup and resume any queued jobs
  loadQueue().then((saved) => {
    // Mark any "running" jobs as "queued" (they were interrupted)
    for (const job of saved) {
      if (job.status === "running") {
        job.status = "queued";
      }
    }
    jobQueue = saved;

    const queued = jobQueue.filter((j) => j.status === "queued").length;
    if (queued > 0) {
      log.info(`[Queue] Loaded ${queued} pending jobs from disk, resuming...`);
      processQueue();
    }
  });

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({ status: "ok", queueLength: jobQueue.filter((j) => j.status === "queued").length });
      }

      // ─── Queue endpoints ───

      // GET /queue — list queue
      if (req.method === "GET" && url.pathname === "/queue") {
        return Response.json({
          jobs: jobQueue.map((j) => ({
            id: j.id,
            mode: j.mode,
            label: j.label,
            status: j.status,
            sessionId: j.sessionId,
            error: j.error,
            addedAt: j.addedAt,
            startedAt: j.startedAt,
            completedAt: j.completedAt,
            retries: j.retries,
          })),
          processing: queueProcessing,
          pending: jobQueue.filter((j) => j.status === "queued").length,
          running: jobQueue.filter((j) => j.status === "running").length,
        });
      }

      // POST /queue — add job(s) to queue
      if (req.method === "POST" && url.pathname === "/queue") {
        try {
          const body = await parseBody(req);

          // Support both single job and array of jobs
          const jobs = Array.isArray(body.jobs) ? body.jobs : [body];
          const addedIds: string[] = [];

          for (const jobDef of jobs) {
            const mode = jobDef.mode as "debate" | "critique";
            if (!mode || !["debate", "critique"].includes(mode)) {
              return jsonError("Each job needs a 'mode' field ('debate' or 'critique')");
            }

            const jobId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

            let config: DebateConfig | CritiqueConfig;
            if (mode === "debate") {
              const topic = jobDef.topic as string;
              if (!topic) return jsonError("Missing 'topic' for debate job");

              // Build agent configs
              const agent1 = parseAgentConfig(jobDef.agent1 ?? "claude");
              const agent2 = parseAgentConfig(jobDef.agent2 ?? "codex");

              if (jobDef.tools) {
                agent1.tools = true;
                agent2.tools = true;
              }

              // Handle sandbox
              const tempId = crypto.randomUUID().slice(0, 8);
              if (jobDef.sharedSandbox) {
                const shared = await createSharedSandbox(tempId);
                agent1.sandbox = shared;
                agent2.sandbox = shared;
              } else if (jobDef.sandbox) {
                agent1.sandbox = await createSandbox(tempId, "agentA");
                agent2.sandbox = await createSandbox(tempId, "agentB");
              }

              // Load context from file if provided
              let context: string | undefined;
              if (typeof jobDef.context === "string") {
                if (jobDef.context.startsWith("/") || jobDef.context.startsWith("~")) {
                  const resolved = jobDef.context.replace(/^~/, homedir());
                  try {
                    context = (await readFile(resolved, "utf-8")).trim();
                  } catch {
                    context = jobDef.context;
                  }
                } else {
                  context = jobDef.context;
                }
              }

              config = {
                topic,
                agent1,
                agent2,
                maxRounds: (jobDef.maxRounds as number) ?? 5,
                style: (jobDef.style as any) ?? "exploratory",
                context,
                contextMode: (jobDef.contextMode as any) ?? "open",
                contrarian: jobDef.contrarianEvery
                  ? {
                      every: jobDef.contrarianEvery as number,
                      backend: (jobDef.contrarianBackend as any) ?? "codex",
                      model: jobDef.contrarianModel as string | undefined,
                      tools: true,
                      sandbox: agent1.sandbox, // share the sandbox
                    }
                  : undefined,
              };
            } else {
              const task = jobDef.task as string;
              if (!task) return jsonError("Missing 'task' for critique job");

              config = {
                task,
                creator: parseAgentConfig(jobDef.creator ?? "codex"),
                critic: parseAgentConfig(jobDef.critic ?? "claude"),
                maxRounds: (jobDef.maxRounds as number) ?? 5,
              };
            }

            const job: QueueJob = {
              id: jobId,
              mode,
              config,
              status: "queued",
              addedAt: new Date().toISOString(),
              retries: 0,
              maxRetries: (jobDef.maxRetries as number) ?? 2,
              label: (jobDef.label as string) ?? (mode === "debate" ? (config as DebateConfig).topic.slice(0, 60) : (config as CritiqueConfig).task.slice(0, 60)),
              sessionId: jobDef.resumeSession as string | undefined,
            };

            addToQueue(job);
            addedIds.push(jobId);
          }

          return Response.json({ queued: addedIds, queueLength: jobQueue.filter((j) => j.status === "queued").length });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return jsonError(msg, 500);
        }
      }

      // DELETE /queue/:id — remove a queued job
      const deleteMatch = url.pathname.match(/^\/queue\/([^/]+)$/);
      if (req.method === "DELETE" && deleteMatch) {
        const jobId = deleteMatch[1];
        const idx = jobQueue.findIndex((j) => j.id === jobId && j.status === "queued");
        if (idx === -1) return jsonError("Job not found or not in queued state", 404);
        jobQueue.splice(idx, 1);
        await saveQueue();
        return Response.json({ removed: jobId });
      }

      // POST /queue/clear — clear completed/error jobs
      if (req.method === "POST" && url.pathname === "/queue/clear") {
        jobQueue = jobQueue.filter((j) => j.status === "queued" || j.status === "running");
        await saveQueue();
        return Response.json({ remaining: jobQueue.length });
      }

      // ─── Session endpoints ───

      if (req.method === "GET" && url.pathname === "/sessions") {
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : undefined;
        const sessions = await listSessions(limit);
        return Response.json({ sessions });
      }

      const streamMatch = url.pathname.match(/^\/sessions\/([^/]+)\/stream$/);
      if (req.method === "GET" && streamMatch) {
        const sessionId = streamMatch[1];

        try {
          const { meta, rounds } = await loadSession(sessionId);
          const encoder = new TextEncoder();

          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              for (const round of rounds) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "round", ...round })}\n\n`));
              }

              if (meta.status === "completed" || meta.status === "error") {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "complete", winner: meta.winner, reason: meta.reason })}\n\n`),
                );
                controller.close();
                return;
              }

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

      // POST /sessions/:id/resume — resume via queue
      const resumeMatch = url.pathname.match(/^\/sessions\/([^/]+)\/resume$/);
      if (req.method === "POST" && resumeMatch) {
        const sessionId = resumeMatch[1];
        try {
          const { meta } = await loadSession(sessionId);

          const jobId = `q-resume-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const job: QueueJob = {
            id: jobId,
            mode: meta.mode,
            config: meta.config,
            status: "queued",
            sessionId,
            addedAt: new Date().toISOString(),
            retries: 0,
            maxRetries: 2,
            label: `Resume: ${meta.mode === "debate" ? (meta.config as DebateConfig).topic.slice(0, 40) : (meta.config as CritiqueConfig).task.slice(0, 40)}`,
          };

          addToQueue(job);
          return Response.json({ jobId, sessionId, status: "queued" });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return jsonError(msg, 400);
        }
      }

      // ─── Direct execution (non-queued) ───

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

        // POST /debate — direct (non-queued) debate start
        if (url.pathname === "/debate") {
          const topic = body.topic as string;
          if (!topic) return jsonError("Missing 'topic' field");

          const debateConfig: DebateConfig = {
            topic,
            agent1: parseAgentConfig(body.agent1 ?? "claude"),
            agent2: parseAgentConfig(body.agent2 ?? "codex"),
            maxRounds: (body.maxRounds as number) ?? 5,
          };

          const sessionId = await createSession("debate", debateConfig);
          const onRound = (round: DebateRound) => broadcastRound(sessionId, round);

          debate(debateConfig, { sessionId, onRound })
            .then((t) => broadcastComplete(sessionId, t.winner, t.reason))
            .catch(() => broadcastComplete(sessionId, undefined, "error"));

          return Response.json({ sessionId });
        }

        if (url.pathname === "/critique") {
          const task = body.task as string;
          if (!task) return jsonError("Missing 'task' field");

          const critiqueConfig: CritiqueConfig = {
            task,
            creator: parseAgentConfig(body.creator ?? "codex"),
            critic: parseAgentConfig(body.critic ?? "claude"),
            maxRounds: (body.maxRounds as number) ?? 5,
          };

          const sessionId = await createSession("critique", critiqueConfig);
          const onRound = (round: DebateRound) => broadcastRound(sessionId, round);

          critique(critiqueConfig, { sessionId, onRound })
            .then((t) => broadcastComplete(sessionId, (t as any).winner, t.reason))
            .catch(() => broadcastComplete(sessionId, undefined, "error"));

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
  console.log(`Queue endpoint: POST /queue`);
  console.log(`Queue status:   GET  /queue`);
  return server;
}
