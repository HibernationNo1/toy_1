import { DataStoreService, Players } from "@rbxts/services";
import { logInfo } from "../../../logger";
import { playerScores, PlayerScoreState } from "../../../state/player-score-state";

const DATASTORE_NAME = "PlayerBananaScoreV1";
const SAVE_INTERVAL_SECONDS = 30;
const DEBOUNCE_SECONDS = 3;
const SAVE_RETRY_COUNT = 3;
const SAVE_RETRY_DELAY = 3;

const scoreStore = DataStoreService.GetOrderedDataStore(DATASTORE_NAME);

const getScoreKey = (userId: number) => `${userId}:bananasScore`;

const normalizeScore = (raw: unknown) => {
  if (typeIs(raw, "number")) {
    return math.floor(raw);
  }
  return 0;
};

const getOrCreateState = (player: Player) => {
  const existing = playerScores.get(player.UserId);
  if (existing) {
    return existing;
  }

  const state: PlayerScoreState = {
    score: 0,
    loaded: false,
    dirty: false,
    saving: false,
    lastChangeAt: 0,
    debounceScheduled: false,
    failedSaves: 0,
  };
  playerScores.set(player.UserId, state);
  return state;
};

const markDirty = (state: PlayerScoreState) => {
  state.dirty = true;
  state.lastChangeAt = os.time();
};

const saveState = (userId: number, state: PlayerScoreState, immediate: boolean) => {
  if (state.saving) {
    return;
  }
  if (!state.dirty) {
    return;
  }

  const now = os.time();
  if (!immediate && now - state.lastChangeAt < DEBOUNCE_SECONDS) {
    return;
  }

  state.saving = true;
  const key = getScoreKey(userId);

  const attemptSave = (attempt: number): boolean => {
    const budget = DataStoreService.GetRequestBudgetForRequestType(Enum.DataStoreRequestType.UpdateAsync);
    if (budget <= 0) {
      return false;
    }

    const [ok, err] = pcall(() => {
      const nextScore = state.score;
      scoreStore.UpdateAsync(key, () => nextScore);
    });

    if (ok) {
      state.failedSaves = 0;
      state.dirty = false;
      return true;
    }

    state.failedSaves += 1;
    warn(`[ScoreSave] Failed to save user ${userId} (attempt ${attempt}): ${tostring(err)}`);
    return false;
  };

  let saved = false;
  for (let attempt = 1; attempt <= SAVE_RETRY_COUNT; attempt += 1) {
    saved = attemptSave(attempt);
    if (saved) {
      break;
    }
    if (attempt < SAVE_RETRY_COUNT) {
      task.wait(SAVE_RETRY_DELAY);
    }
  }

  state.saving = false;
};

const scheduleDebouncedSave = (userId: number, state: PlayerScoreState) => {
  if (state.debounceScheduled) {
    return;
  }

  state.debounceScheduled = true;
  task.delay(DEBOUNCE_SECONDS, () => {
    state.debounceScheduled = false;
    saveState(userId, state, false);
  });
};

const loadScore = (player: Player) => {
  const state = getOrCreateState(player);
  const key = getScoreKey(player.UserId);

  const [ok, result] = pcall(() => scoreStore.GetAsync(key));
  if (ok) {
    state.score = normalizeScore(result);
  } else {
    warn(`[ScoreLoad] Failed to load user ${player.UserId}: ${tostring(result)}`);
    state.score = 0;
  }
  state.loaded = true;
};

const saveScoreNow = (player: Player) => {
  const state = playerScores.get(player.UserId);
  if (!state) {
    return;
  }
  saveState(player.UserId, state, true);
};

const saveAllScores = () => {
  for (const [userId, state] of playerScores) {
    saveState(userId, state, true);
  }
};

export const addBananaScore = (player: Player, delta: number) => {
  const state = getOrCreateState(player);
  state.score += delta;
  markDirty(state);
  scheduleDebouncedSave(player.UserId, state);
  return state.score;
};

export const initPlayerScoreService = () => {
  Players.PlayerAdded.Connect((player) => {
    loadScore(player);
  });

  Players.PlayerRemoving.Connect((player) => {
    saveScoreNow(player);
    playerScores.delete(player.UserId);
  });

  game.BindToClose(() => {
    saveAllScores();
  });

  task.spawn(() => {
    while (true) {
      task.wait(SAVE_INTERVAL_SECONDS);
      for (const [userId, state] of playerScores) {
        saveState(userId, state, false);
      }
    }
  });

  logInfo("[Score] PlayerBananaScoreV1 service initialized.");
};
