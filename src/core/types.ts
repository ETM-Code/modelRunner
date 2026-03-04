export interface AgentConfig {
  backend: "codex" | "claude";
  model?: string;
  systemPrompt?: string;
  tools?: boolean;
  maxBudget?: number;
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
}

export interface CritiqueConfig {
  task: string;
  creator: AgentConfig;
  critic: AgentConfig;
  maxRounds: number;
}

export interface DebateRound {
  round: number;
  agent: string;
  text: string;
  conceded: boolean;
}

export interface Transcript {
  rounds: DebateRound[];
  winner?: string;
  reason: "concede" | "max-rounds";
}
