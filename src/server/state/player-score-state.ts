export type PlayerScoreState = {
  score: number;
  loaded: boolean;
  dirty: boolean;
  saving: boolean;
  lastChangeAt: number;
  debounceScheduled: boolean;
  failedSaves: number;
};

export const playerScores = new Map<number, PlayerScoreState>();
