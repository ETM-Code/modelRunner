import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createSession,
  appendRound,
  completeSession,
  loadSession,
  listSessions,
  getResumeState,
  setSessionsDir,
  getSessionsDir,
} from "./session";

let tempDir: string;
let originalDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mr-test-"));
  originalDir = getSessionsDir();
  setSessionsDir(tempDir);
});

afterEach(async () => {
  setSessionsDir(originalDir);
  await rm(tempDir, { recursive: true, force: true });
});

describe("session", () => {
  test("createSession creates meta.json and rounds.jsonl", async () => {
    const id = await createSession("debate", {
      topic: "Tabs vs spaces",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 3,
    });

    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(10);

    const sessDir = join(tempDir, id);
    const files = await readdir(sessDir);
    expect(files).toContain("meta.json");
    expect(files).toContain("rounds.jsonl");

    const meta = JSON.parse(await readFile(join(sessDir, "meta.json"), "utf-8"));
    expect(meta.id).toBe(id);
    expect(meta.mode).toBe("debate");
    expect(meta.status).toBe("running");
    expect(meta.roundsCompleted).toBe(0);
    expect(meta.config.topic).toBe("Tabs vs spaces");
  });

  test("appendRound appends to rounds.jsonl and updates meta", async () => {
    const id = await createSession("debate", {
      topic: "Test",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 3,
    });

    await appendRound(id, { round: 1, agent: "A", text: "Hello", conceded: false });
    await appendRound(id, { round: 1, agent: "B", text: "World", conceded: false });

    const { meta, rounds } = await loadSession(id);
    expect(rounds).toHaveLength(2);
    expect(rounds[0].agent).toBe("A");
    expect(rounds[0].text).toBe("Hello");
    expect(rounds[1].agent).toBe("B");
    expect(rounds[1].text).toBe("World");
    expect(meta.roundsCompleted).toBe(1);
  });

  test("completeSession updates status and endTime", async () => {
    const id = await createSession("critique", {
      task: "Write code",
      creator: { backend: "codex" },
      critic: { backend: "claude" },
      maxRounds: 3,
    });

    await completeSession(id, { status: "completed", winner: "Creator", reason: "concede" });

    const { meta } = await loadSession(id);
    expect(meta.status).toBe("completed");
    expect(meta.winner).toBe("Creator");
    expect(meta.reason).toBe("concede");
    expect(meta.endTime).toBeTruthy();
  });

  test("listSessions returns sessions sorted by date", async () => {
    await createSession("debate", {
      topic: "First",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 1,
    });

    await new Promise((r) => setTimeout(r, 10));

    await createSession("critique", {
      task: "Second",
      creator: { backend: "codex" },
      critic: { backend: "claude" },
      maxRounds: 1,
    });

    const all = await listSessions();
    expect(all).toHaveLength(2);
    expect(all[0].mode).toBe("critique");
    expect(all[1].mode).toBe("debate");

    const limited = await listSessions(1);
    expect(limited).toHaveLength(1);
  });

  test("getResumeState returns correct state for running session", async () => {
    const id = await createSession("debate", {
      topic: "Resume test",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 5,
    });

    await appendRound(id, { round: 1, agent: "A", text: "Arg1", conceded: false });
    await appendRound(id, { round: 1, agent: "B", text: "Counter1", conceded: false });
    await appendRound(id, { round: 2, agent: "A", text: "Arg2", conceded: false });

    const state = await getResumeState(id);
    expect(state.lastRound).toBe(2);
    expect(state.lastResponse).toBe("Arg2");
    expect(state.rounds).toHaveLength(3);
  });

  test("getResumeState throws for completed session", async () => {
    const id = await createSession("debate", {
      topic: "Done",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 1,
    });
    await completeSession(id, { status: "completed", reason: "max-rounds" });

    expect(getResumeState(id)).rejects.toThrow("cannot be resumed");
  });

  test("listSessions returns empty array when no sessions exist", async () => {
    const result = await listSessions();
    expect(result).toEqual([]);
  });

  test("appendRound handles multiline text", async () => {
    const id = await createSession("debate", {
      topic: "Multiline",
      agent1: { backend: "claude" },
      agent2: { backend: "codex" },
      maxRounds: 1,
    });

    const multiline = "Line 1\nLine 2\nLine 3";
    await appendRound(id, { round: 1, agent: "A", text: multiline, conceded: false });

    const { rounds } = await loadSession(id);
    expect(rounds[0].text).toBe(multiline);
  });
});
