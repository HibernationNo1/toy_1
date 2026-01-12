import { DataStoreService, Players } from "@rbxts/services";
import { DATASTORE_KEYS, DATASTORE_NAMES, DEFAULT_SCHEMA_VERSION, SNAPSHOT_FLUSH_INTERVAL_SECONDS } from "./constants";
import { runDataStoreOperation } from "./datastore-utils";
import { getAverageDurationMs, getSaveFailuresLastWindow } from "./metrics";
import { getOpenListingCount } from "./market-listing-store";
import type { ServerSnapshot } from "./types";

const snapshotStore = DataStoreService.GetDataStore(DATASTORE_NAMES.snapshot);
let initialized = false;

const buildSnapshot = (): ServerSnapshot => ({
  schemaVersion: DEFAULT_SCHEMA_VERSION,
  updatedAt: os.time(),
  activePlayers: Players.GetPlayers().size(),
  openListings: getOpenListingCount(),
  saveFailuresLast5m: getSaveFailuresLastWindow(),
  avgSaveDurationMs: getAverageDurationMs(),
});

const saveSnapshot = () => {
  const key = DATASTORE_KEYS.snapshot;
  const snapshot = buildSnapshot();
  runDataStoreOperation({
    storeName: DATASTORE_NAMES.snapshot,
    key,
    op: "Set",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "snapshot",
  }, () => snapshotStore.UpdateAsync(key, () => $tuple(snapshot)));
};

export const initSnapshotStore = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  task.spawn(() => {
    while (true) {
      task.wait(SNAPSHOT_FLUSH_INTERVAL_SECONDS);
      saveSnapshot();
    }
  });
};
