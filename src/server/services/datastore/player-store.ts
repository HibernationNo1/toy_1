import { DataStoreService, Players, ReplicatedStorage } from "@rbxts/services";
import { BANANA_TABLE } from "shared/banana-table";
import type { InventorySnapshotItem, InventorySnapshotResponse } from "shared/inventory-types";
import { INVENTORY_SNAPSHOT_REMOTE } from "shared/remotes";
import {
  DATASTORE_KEYS,
  DATASTORE_NAMES,
  DEFAULT_NPC_SLOT_COUNT,
  DEFAULT_SCHEMA_VERSION,
  NPC_SLOT_MAX,
  NPC_SLOT_MIN,
  PLAYER_STORE_DEBOUNCE_SECONDS,
  PLAYER_STORE_SAVE_INTERVAL_SECONDS,
} from "./constants";
import { runDataStoreOperation } from "./datastore-utils";
import { queueLeaderboardUpdate } from "./leaderboard-store";
import type { PlayerData, PlayerInventoryEntry } from "./types";

const playerStore = DataStoreService.GetDataStore(DATASTORE_NAMES.player);
const bananaNameById = new Map<string, string>(
  BANANA_TABLE.map((entry) => [entry.id, entry.name] as [string, string])
);
const validBananaIds = new Set<string>(BANANA_TABLE.map((entry) => entry.id));

type PlayerStoreState = {
  data: PlayerData;
  loaded: boolean;
  dirty: boolean;
  saving: boolean;
  lastChangeAt: number;
  debounceScheduled: boolean;
  failedSaves: number;
  lastReason: string;
};

type MutationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      reason: string;
    };

const playerStates = new Map<number, PlayerStoreState>();
let initialized = false;

const getDefaultPlayerData = (now: number): PlayerData => ({
  bananaMoney: 0,
  inventory: {},
  gacha: {
    nextAt: 0,
  },
  npc: {
    slotCount: DEFAULT_NPC_SLOT_COUNT,
  },
  meta: {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  },
});

const normalizeInventory = (rawInventory?: Record<string, PlayerInventoryEntry>) => {
  const normalized: Record<string, PlayerInventoryEntry> = {};
  if (!typeIs(rawInventory, "table")) {
    return normalized;
  }

  for (const [rawId, rawItem] of pairs(rawInventory)) {
    if (!typeIs(rawItem, "table")) {
      continue;
    }
    const id = tostring(rawId);
    const item = rawItem as PlayerInventoryEntry;
    const qty = typeIs(item.qty, "number") ? math.floor(item.qty) : 0;
    if (qty <= 0) {
      continue;
    }
    normalized[id] = {
      qty,
      firstAt: typeIs(item.firstAt, "number") ? item.firstAt : os.time(),
      updatedAt: typeIs(item.updatedAt, "number") ? item.updatedAt : os.time(),
    };
  }

  return normalized;
};

const normalizePlayerData = (raw: unknown): PlayerData => {
  const now = os.time();
  if (!typeIs(raw, "table")) {
    return getDefaultPlayerData(now);
  }

  const data = raw as Partial<PlayerData> & { items?: Record<string, PlayerInventoryEntry> };
  const inventory = normalizeInventory(data.inventory ?? data.items);
  const bananaMoney = typeIs(data.bananaMoney, "number") ? math.max(0, math.floor(data.bananaMoney)) : 0;
  const nextAt = typeIs(data.gacha?.nextAt, "number") ? data.gacha.nextAt : 0;
  const slotCountRaw = typeIs(data.npc?.slotCount, "number") ? math.floor(data.npc.slotCount) : DEFAULT_NPC_SLOT_COUNT;
  const slotCount = math.clamp(slotCountRaw, NPC_SLOT_MIN, NPC_SLOT_MAX);
  const createdAt = typeIs(data.meta?.createdAt, "number") ? data.meta.createdAt : now;

  return {
    bananaMoney,
    inventory,
    gacha: {
      nextAt,
    },
    npc: {
      slotCount,
    },
    meta: {
      schemaVersion: DEFAULT_SCHEMA_VERSION,
      createdAt,
      updatedAt: now,
    },
  };
};

const getOrCreateState = (userId: number) => {
  const existing = playerStates.get(userId);
  if (existing) {
    return existing;
  }

  const now = os.time();
  const state: PlayerStoreState = {
    data: getDefaultPlayerData(now),
    loaded: false,
    dirty: false,
    saving: false,
    lastChangeAt: 0,
    debounceScheduled: false,
    failedSaves: 0,
    lastReason: "init",
  };
  playerStates.set(userId, state);
  return state;
};

const markDirty = (state: PlayerStoreState, reason: string) => {
  state.dirty = true;
  state.lastChangeAt = os.time();
  state.lastReason = reason;
};

const saveState = (userId: number, state: PlayerStoreState, immediate: boolean) => {
  if (state.saving) {
    return;
  }
  if (!state.dirty) {
    return;
  }

  const now = os.time();
  if (!immediate && now - state.lastChangeAt < PLAYER_STORE_DEBOUNCE_SECONDS) {
    return;
  }

  state.saving = true;
  state.data.meta.updatedAt = now;
  const key = DATASTORE_KEYS.player(userId);

  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.player,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: state.lastReason,
  }, () => playerStore.UpdateAsync(key, () => $tuple(state.data)));

  if (result.ok) {
    state.failedSaves = 0;
    state.dirty = false;
  } else {
    state.failedSaves += 1;
  }

  state.saving = false;
};

const scheduleDebouncedSave = (userId: number, state: PlayerStoreState) => {
  if (state.debounceScheduled) {
    return;
  }

  state.debounceScheduled = true;
  task.delay(PLAYER_STORE_DEBOUNCE_SECONDS, () => {
    state.debounceScheduled = false;
    saveState(userId, state, false);
  });
};

const buildSnapshotItems = (data: PlayerData) => {
  const items: InventorySnapshotItem[] = [];
  for (const [rawId, item] of pairs(data.inventory)) {
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

const loadPlayer = (player: Player) => {
  const state = getOrCreateState(player.UserId);
  const key = DATASTORE_KEYS.player(player.UserId);

  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.player,
    key,
    op: "Get",
    requestType: Enum.DataStoreRequestType.GetAsync,
  }, () => playerStore.GetAsync(key));

  if (result.ok) {
    state.data = normalizePlayerData(result.value);
  } else {
    warn(`[PlayerStore] Failed to load user ${player.UserId}: ${tostring(result.error)}`);
    state.data = getDefaultPlayerData(os.time());
    state.dirty = true;
    state.lastReason = "load_failed";
  }

  state.loaded = true;
};

const savePlayerNow = (player: Player) => {
  const state = playerStates.get(player.UserId);
  if (!state) {
    return;
  }
  saveState(player.UserId, state, true);
};

const saveAllPlayers = () => {
  for (const [userId, state] of playerStates) {
    saveState(userId, state, true);
  }
};

export const initPlayerStore = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  const snapshotRemote = getOrCreateSnapshotRemote();
  snapshotRemote.OnServerInvoke = (player) => {
    const state = getOrCreateState(player.UserId);
    const response: InventorySnapshotResponse = {
      loaded: state.loaded,
      items: buildSnapshotItems(state.data),
    };
    return response;
  };

  Players.PlayerAdded.Connect((player) => {
    loadPlayer(player);
  });

  Players.PlayerRemoving.Connect((player) => {
    savePlayerNow(player);
    playerStates.delete(player.UserId);
  });

  game.BindToClose(() => {
    saveAllPlayers();
  });

  task.spawn(() => {
    while (true) {
      task.wait(PLAYER_STORE_SAVE_INTERVAL_SECONDS);
      for (const [userId, state] of playerStates) {
        saveState(userId, state, false);
      }
    }
  });
};

export const getPlayerMoney = (player: Player) => {
  const state = getOrCreateState(player.UserId);
  return state.data.bananaMoney;
};

export const hasBanana = (player: Player, bananaId: string) => {
  const state = playerStates.get(player.UserId);
  if (!state || !state.loaded) {
    return false;
  }
  const entry = state.data.inventory[bananaId];
  return entry !== undefined && entry.qty > 0;
};

export const getInventorySnapshot = (player: Player) => {
  const state = getOrCreateState(player.UserId);
  return buildSnapshotItems(state.data);
};

export const addMoney = (player: Player, amount: number, reason: string): MutationResult<number> => {
  if (!typeIs(amount, "number") || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  const state = getOrCreateState(player.UserId);
  state.data.bananaMoney += math.floor(amount);
  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  queueLeaderboardUpdate(player.UserId, state.data.bananaMoney);
  return { ok: true, value: state.data.bananaMoney };
};

export const spendMoney = (player: Player, amount: number, reason: string): MutationResult<number> => {
  if (!typeIs(amount, "number") || amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  const state = getOrCreateState(player.UserId);
  const next = state.data.bananaMoney - math.floor(amount);
  if (next < 0) {
    return { ok: false, reason: "insufficient_funds" };
  }

  state.data.bananaMoney = next;
  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  queueLeaderboardUpdate(player.UserId, state.data.bananaMoney);
  return { ok: true, value: state.data.bananaMoney };
};

export const addBanana = (
  player: Player,
  bananaId: string,
  count: number,
  reason: string
): MutationResult<number> => {
  if (!validBananaIds.has(bananaId)) {
    return { ok: false, reason: "invalid_banana" };
  }
  if (!typeIs(count, "number") || count <= 0) {
    return { ok: false, reason: "invalid_count" };
  }

  const delta = math.floor(count);
  if (delta <= 0) {
    return { ok: false, reason: "invalid_count" };
  }

  const state = getOrCreateState(player.UserId);
  const now = os.time();
  const entry = state.data.inventory[bananaId];
  if (entry) {
    entry.qty += delta;
    entry.updatedAt = now;
  } else {
    state.data.inventory[bananaId] = {
      qty: delta,
      firstAt: now,
      updatedAt: now,
    };
  }

  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  return { ok: true, value: state.data.inventory[bananaId].qty };
};

export const removeBanana = (
  player: Player,
  bananaId: string,
  count: number,
  reason: string
): MutationResult<number> => {
  if (!validBananaIds.has(bananaId)) {
    return { ok: false, reason: "invalid_banana" };
  }
  if (!typeIs(count, "number") || count <= 0) {
    return { ok: false, reason: "invalid_count" };
  }

  const delta = math.floor(count);
  if (delta <= 0) {
    return { ok: false, reason: "invalid_count" };
  }

  const state = getOrCreateState(player.UserId);
  const entry = state.data.inventory[bananaId];
  if (!entry || entry.qty < delta) {
    return { ok: false, reason: "insufficient_quantity" };
  }

  entry.qty -= delta;
  entry.updatedAt = os.time();
  if (entry.qty <= 0) {
    delete state.data.inventory[bananaId];
  }

  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  return { ok: true, value: entry.qty };
};

export const setNextGachaAt = (
  player: Player,
  timestamp: number,
  reason: string
): MutationResult<number> => {
  if (!typeIs(timestamp, "number")) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const state = getOrCreateState(player.UserId);
  state.data.gacha.nextAt = timestamp;
  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  return { ok: true, value: timestamp };
};

export const upgradeNpcSlots = (
  player: Player,
  newSlotCount: number,
  cost: number,
  reason: string
): MutationResult<number> => {
  if (!typeIs(newSlotCount, "number")) {
    return { ok: false, reason: "invalid_slot_count" };
  }

  const nextCount = math.clamp(math.floor(newSlotCount), NPC_SLOT_MIN, NPC_SLOT_MAX);
  const costAmount = typeIs(cost, "number") ? math.max(0, math.floor(cost)) : 0;
  const state = getOrCreateState(player.UserId);

  if (costAmount > 0 && state.data.bananaMoney < costAmount) {
    return { ok: false, reason: "insufficient_funds" };
  }

  state.data.bananaMoney -= costAmount;
  state.data.npc.slotCount = nextCount;
  markDirty(state, reason);
  scheduleDebouncedSave(player.UserId, state);
  queueLeaderboardUpdate(player.UserId, state.data.bananaMoney);
  return { ok: true, value: nextCount };
};

export const flushPlayer = (player: Player, reason: string) => {
  const state = getOrCreateState(player.UserId);
  state.lastReason = reason;
  saveState(player.UserId, state, true);
};

export const getPlayerStoreState = (userId: number) => {
  return playerStates.get(userId);
};
