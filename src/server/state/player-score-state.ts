export type PlayerMoneyState = {
  bananaMoney: number;
  loaded: boolean;
  dirty: boolean;
  saving: boolean;
  lastChangeAt: number;
  debounceScheduled: boolean;
  failedSaves: number;
};

export const playerMoneyStates = new Map<number, PlayerMoneyState>();
