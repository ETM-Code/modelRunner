export interface AgentConfig {
  backend: "codex" | "claude";
  model?: string;
  systemPrompt?: string;
  tools?: boolean;
  maxBudget?: number;
  sandbox?: SandboxConfig;
}

export interface SandboxConfig {
  enabled: boolean;
  workDir: string;  // temp dir the agent is confined to
}

export interface AgentResponse {
  text: string;
  conceded: boolean;
}

export interface DebateConfig {
  topic: string;
  agent1: AgentConfig;
  agent2: AgentConfig;
  maxRounds: number;
  style?: "adversarial" | "exploratory";
  context?: string;
  contextMode?: "open" | "strict" | "none";
  contrarian?: ContrarianConfig;
}

export interface ContrarianConfig {
  every: number;           // inject contrarian every N rounds
  backend: "codex" | "claude";
  model?: string;
  tools?: boolean;
  sandbox?: SandboxConfig;
}

export interface CritiqueConfig {
  task: string;
  creator: AgentConfig;
  critic: AgentConfig;
  maxRounds: number;
}

export interface DebateRound {
  round: number;
  agent: string;  // "A", "B", or "Contrarian"
  text: string;
  conceded: boolean;
}

export interface Transcript {
  rounds: DebateRound[];
  winner?: string;
  reason: "concede" | "max-rounds";
}

export type SessionStatus = "running" | "completed" | "error" | "interrupted";

export interface SessionMeta {
  id: string;
  mode: "debate" | "critique";
  config: DebateConfig | CritiqueConfig;
  status: SessionStatus;
  startTime: string;
  endTime?: string;
  winner?: string;
  reason?: string;
  roundsCompleted: number;
}
