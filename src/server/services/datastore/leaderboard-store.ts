import { DataStoreService } from "@rbxts/services";
import { DATASTORE_NAMES, LEADERBOARD_FLUSH_INTERVAL_SECONDS } from "./constants";
import { runDataStoreOperation } from "./datastore-utils";

const leaderboardStore = DataStoreService.GetOrderedDataStore(DATASTORE_NAMES.leaderboardMoney);
const pendingUpdates = new Map<string, number>();
let initialized = false;

export type LeaderboardEntry = {
  userId: number;
  value: number;
};

export const queueLeaderboardUpdate = (userId: number, value: number) => {
  pendingUpdates.set(tostring(userId), math.max(0, math.floor(value)));
};

const flushLeaderboard = () => {
  if (pendingUpdates.size() <= 0) {
    return;
  }

  for (const [userId, value] of pendingUpdates) {
    const result = runDataStoreOperation({
      storeName: DATASTORE_NAMES.leaderboardMoney,
      key: userId,
      op: "Set",
      requestType: Enum.DataStoreRequestType.UpdateAsync,
      reason: "leaderboard_flush",
    }, () => leaderboardStore.UpdateAsync(userId, () => value));

    if (result.ok) {
      pendingUpdates.delete(userId);
    }
  }
};

export const getLeaderboardTop = (topN: number): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [];
  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.leaderboardMoney,
    key: "top",
    op: "GetSorted",
    requestType: Enum.DataStoreRequestType.GetSortedAsync,
    reason: "leaderboard_top",
  }, () => leaderboardStore.GetSortedAsync(false, topN));

  if (!result.ok || !result.value) {
    return entries;
  }

  const pages = result.value;
  const currentPage = pages.GetCurrentPage();
  for (const entry of currentPage) {
    const userId = tonumber(entry.key) ?? 0;
    entries.push({
      userId,
      value: entry.value,
    });
  }

  return entries;
};

export const initLeaderboardStore = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  task.spawn(() => {
    while (true) {
      task.wait(LEADERBOARD_FLUSH_INTERVAL_SECONDS);
      flushLeaderboard();
    }
  });
};
