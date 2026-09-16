export type BattleSide = "left" | "right";
export type BattleDepth = "fast" | "balanced" | "deep";

export type BattleSideSettings = {
  provider: string;
  model: string;
  depth: BattleDepth;
};

export type BattleAnswer = {
  model: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  thinkingMs: number;
};

export type BattleRound = {
  id: string;
  prompt: string;
  preferred: BattleSide | null;
  createdAt: string;
  leftSettings: BattleSideSettings;
  rightSettings: BattleSideSettings;
  left: BattleAnswer;
  right: BattleAnswer;
};

export type BattleSession = {
  id: string;
  title: string;
  agentId: string | null;
  updatedAt: string;
  left: BattleSideSettings;
  right: BattleSideSettings;
  rounds: BattleRound[];
};
