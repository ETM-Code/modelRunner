import type { AgentConfig } from "./core/types";
import { singlePrompt } from "./modes/prompt";
import { debate } from "./modes/debate";
import { critique } from "./modes/critique";

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

export function startServer(port: number) {
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/health") {
        return Response.json({ status: "ok" });
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

          const transcript = await debate({
            topic,
            agent1: parseAgentConfig(body.agent1 ?? "claude"),
            agent2: parseAgentConfig(body.agent2 ?? "codex"),
            maxRounds: (body.maxRounds as number) ?? 5,
          });
          return Response.json({ transcript });
        }

        if (url.pathname === "/critique") {
          const task = body.task as string;
          if (!task) return jsonError("Missing 'task' field");

          const transcript = await critique({
            task,
            creator: parseAgentConfig(body.creator ?? "codex"),
            critic: parseAgentConfig(body.critic ?? "claude"),
            maxRounds: (body.maxRounds as number) ?? 5,
          });
          return Response.json({ transcript });
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
