import { readdir, mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SessionMeta, DebateRound, DebateConfig, CritiqueConfig, Transcript } from "./types";

let SESSIONS_DIR = join(homedir(), ".modelrunner", "sessions");

/** Override sessions directory (for testing). */
export function setSessionsDir(dir: string) {
  SESSIONS_DIR = dir;
}

/** Get current sessions directory. */
export function getSessionsDir(): string {
  return SESSIONS_DIR;
}

function generateId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

function sessionDir(id: string): string {
  return join(SESSIONS_DIR, id);
}

function metaPath(id: string): string {
  return join(sessionDir(id), "meta.json");
}

function roundsPath(id: string): string {
  return join(sessionDir(id), "rounds.jsonl");
}

export async function createSession(
  mode: "debate" | "critique",
  config: DebateConfig | CritiqueConfig,
): Promise<string> {
  const id = generateId();
  const dir = sessionDir(id);
  await mkdir(dir, { recursive: true });

  const meta: SessionMeta = {
    id,
    mode,
    config,
    status: "running",
    startTime: new Date().toISOString(),
    roundsCompleted: 0,
  };

  await writeFile(metaPath(id), JSON.stringify(meta, null, 2) + "\n");
  await writeFile(roundsPath(id), "");
  return id;
}

export async function appendRound(id: string, round: DebateRound): Promise<void> {
  await appendFile(roundsPath(id), JSON.stringify(round) + "\n");

  const meta = await readMeta(id);
  // Count unique round numbers (debate has 2 entries per round, critique also 2)
  const maxRound = Math.max(meta.roundsCompleted, round.round);
  meta.roundsCompleted = maxRound;
  await writeMeta(id, meta);
}

export async function completeSession(
  id: string,
  result: { status: "completed" | "error" | "interrupted"; winner?: string; reason?: string },
): Promise<void> {
  const meta = await readMeta(id);
  meta.status = result.status;
  meta.endTime = new Date().toISOString();
  meta.winner = result.winner;
  meta.reason = result.reason;
  await writeMeta(id, meta);
}

export async function loadSession(id: string): Promise<{ meta: SessionMeta; rounds: DebateRound[] }> {
  const meta = await readMeta(id);
  const rounds = await readRounds(id);
  return { meta, rounds };
}

export async function listSessions(limit?: number): Promise<SessionMeta[]> {
  try {
    await mkdir(SESSIONS_DIR, { recursive: true });
    const entries = await readdir(SESSIONS_DIR);
    const metas: SessionMeta[] = [];

    for (const entry of entries) {
      try {
        const raw = await readFile(join(SESSIONS_DIR, entry, "meta.json"), "utf-8");
        metas.push(JSON.parse(raw));
      } catch {
        // skip invalid entries
      }
    }

    metas.sort((a, b) => b.startTime.localeCompare(a.startTime));
    return limit ? metas.slice(0, limit) : metas;
  } catch {
    return [];
  }
}

export async function getResumeState(id: string): Promise<{
  meta: SessionMeta;
  rounds: DebateRound[];
  lastRound: number;
  lastResponse: string | null;
}> {
  const { meta, rounds } = await loadSession(id);

  if (meta.status !== "running" && meta.status !== "interrupted" && meta.status !== "error") {
    throw new Error(`Session ${id} has status '${meta.status}' and cannot be resumed`);
  }

  const lastRound = rounds.length > 0 ? rounds[rounds.length - 1].round : 0;
  const lastResponse = rounds.length > 0 ? rounds[rounds.length - 1].text : null;

  return { meta, rounds, lastRound, lastResponse };
}

async function readMeta(id: string): Promise<SessionMeta> {
  const raw = await readFile(metaPath(id), "utf-8");
  return JSON.parse(raw);
}

async function writeMeta(id: string, meta: SessionMeta): Promise<void> {
  await writeFile(metaPath(id), JSON.stringify(meta, null, 2) + "\n");
}

async function readRounds(id: string): Promise<DebateRound[]> {
  const raw = await readFile(roundsPath(id), "utf-8");
  return raw
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}
