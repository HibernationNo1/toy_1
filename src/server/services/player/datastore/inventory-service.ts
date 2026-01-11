import { DataStoreService, Players, ReplicatedStorage } from "@rbxts/services";
import { BANANA_TABLE, BananaEntry } from "shared/banana-table";
import { InventoryRecord, InventorySnapshotItem, InventorySnapshotResponse } from "shared/inventory-types";
import { INVENTORY_SNAPSHOT_REMOTE } from "shared/remotes";
import { logInfo } from "../../../logger";
import { playerInventories, PlayerInventoryState } from "../../../state/player-inventory-state";

const DATASTORE_NAME = "PlayerInventoryV1";
const SAVE_INTERVAL_SECONDS = 30;
const DEBOUNCE_SECONDS = 3;
const SAVE_RETRY_COUNT = 3;
const SAVE_RETRY_DELAY = 3;

const inventoryStore = DataStoreService.GetDataStore(DATASTORE_NAME);
const bananaNameById = new Map<string, string>(
  BANANA_TABLE.map((entry) => [entry.id, entry.name] as [string, string])
);

const getBananaKey = (userId: number) => `${userId}:bananas`;

const getDefaultRecord = (now: number): InventoryRecord => ({
  schemaVersion: 1,
  items: {},
  createdAt: now,
  lastSavedAt: 0,
  lastUpdatedBy: "init",
});

const normalizeRecord = (raw: unknown) => {
  const now = os.time();
  if (typeIs(raw, "table")) {
    const record = raw as InventoryRecord;
    record.schemaVersion = 1;
    record.items = record.items ?? {};
    record.createdAt = record.createdAt ?? now;
    record.lastSavedAt = record.lastSavedAt ?? 0;
    record.lastUpdatedBy = record.lastUpdatedBy ?? "load";
    return record;
  }

  return getDefaultRecord(now);
};

const getOrCreateState = (player: Player) => {
  const existing = playerInventories.get(player.UserId);
  if (existing) {
    return existing;
  }

  const data = getDefaultRecord(os.time());
  const state: PlayerInventoryState = {
    data,
    loaded: false,
    dirty: false,
    saving: false,
    lastChangeAt: 0,
    debounceScheduled: false,
    failedSaves: 0,
  };
  playerInventories.set(player.UserId, state);
  return state;
};

const getOrCreateSnapshotRemote = () => {
  const existing = ReplicatedStorage.FindFirstChild(INVENTORY_SNAPSHOT_REMOTE);
  if (existing && existing.IsA("RemoteFunction")) {
    return existing;
  }
  if (existing) {
    existing.Destroy();
  }

  const remote = new Instance("RemoteFunction");
  remote.Name = INVENTORY_SNAPSHOT_REMOTE;
  remote.Parent = ReplicatedStorage;
  return remote;
};

const buildSnapshot = (record: InventoryRecord) => {
  const items: InventorySnapshotItem[] = [];
  for (const [rawId, item] of pairs(record.items)) {
    const id = tostring(rawId);
    const name = bananaNameById.get(id) ?? id;
    items.push({
      id,
      name,
      qty: item.qty,
      firstAt: item.firstAt,
      updatedAt: item.updatedAt,
    });
  }

  items.sort((a, b) => a.updatedAt > b.updatedAt);
  return items;
};

const markDirty = (state: PlayerInventoryState) => {
  state.dirty = true;
  state.lastChangeAt = os.time();
};

const saveState = (userId: number, state: PlayerInventoryState, immediate: boolean) => {
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
  const key = getBananaKey(userId);

  const attemptSave = (attempt: number): boolean => {
    const budget = DataStoreService.GetRequestBudgetForRequestType(Enum.DataStoreRequestType.UpdateAsync);
    if (budget <= 0) {
      return false;
    }

    const [ok, err] = pcall(() => {
      const savedAt = os.time();
      state.data.lastSavedAt = savedAt;
      inventoryStore.UpdateAsync(key, () => $tuple(state.data));
    });

    if (ok) {
      state.failedSaves = 0;
      state.dirty = false;
      return true;
    }

    state.failedSaves += 1;
    warn(`[InventorySave] Failed to save user ${userId} (attempt ${attempt}): ${tostring(err)}`);
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

const scheduleDebouncedSave = (userId: number, state: PlayerInventoryState) => {
  if (state.debounceScheduled) {
    return;
  }

  state.debounceScheduled = true;
  task.delay(DEBOUNCE_SECONDS, () => {
    state.debounceScheduled = false;
    saveState(userId, state, false);
  });
};

const loadInventory = (player: Player) => {
  const state = getOrCreateState(player);
  const key = getBananaKey(player.UserId);

  const [ok, result] = pcall(() => inventoryStore.GetAsync(key));
  if (ok) {
    state.data = normalizeRecord(result);
  } else {
    warn(`[InventoryLoad] Failed to load user ${player.UserId}: ${tostring(result)}`);
    state.data = getDefaultRecord(os.time());
  }
  state.loaded = true;
};

const saveInventoryNow = (player: Player) => {
  const state = playerInventories.get(player.UserId);
  if (!state) {
    return;
  }
  saveState(player.UserId, state, true);
};

const saveAllInventories = () => {
  for (const [userId, state] of playerInventories) {
    saveState(userId, state, true);
  }
};

export const recordBananaPull = (player: Player, entry: BananaEntry) => {
  const state = getOrCreateState(player);
  const now = os.time();
  const items = state.data.items;
  const existing = items[entry.id];
  if (existing) {
    existing.qty += 1;
    existing.updatedAt = now;
  } else {
    items[entry.id] = {
      qty: 1,
      firstAt: now,
      updatedAt: now,
    };
  }

  state.data.lastUpdatedBy = "pull";
  markDirty(state);
  scheduleDebouncedSave(player.UserId, state);
};

export const initPlayerInventoryService = () => {
  const snapshotRemote = getOrCreateSnapshotRemote();
  snapshotRemote.OnServerInvoke = (player) => {
    const state = getOrCreateState(player);
    const response: InventorySnapshotResponse = {
      loaded: state.loaded,
      items: state.loaded ? buildSnapshot(state.data) : [],
    };
    return response;
  };

  Players.PlayerAdded.Connect((player) => {
    loadInventory(player);
  });

  Players.PlayerRemoving.Connect((player) => {
    saveInventoryNow(player);
    playerInventories.delete(player.UserId);
  });

  game.BindToClose(() => {
    saveAllInventories();
  });

  task.spawn(() => {
    while (true) {
      task.wait(SAVE_INTERVAL_SECONDS);
      for (const [userId, state] of playerInventories) {
        saveState(userId, state, false);
      }
    }
  });

  logInfo("[Inventory] PlayerInventoryV1 service initialized.");
};
