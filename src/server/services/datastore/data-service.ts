import type { BananaEntry } from "shared/banana-table";
import { initAuditStore, logEconomyEvent } from "./audit-store";
import { initGlobalConfigStore } from "./global-config-store";
import { initLeaderboardStore } from "./leaderboard-store";
import { buyListing, cancelListing, createListing } from "./market-listing-store";
import {
  addBanana,
  addMoney,
  flushPlayer,
  getInventorySnapshot,
  getPlayerMoney,
  hasBanana,
  initPlayerStore,
  removeBanana,
  setNextGachaAt,
  spendMoney,
  upgradeNpcSlots,
} from "./player-store";
import { initSnapshotStore } from "./snapshot-store";

let initialized = false;

export const initDataService = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  initPlayerStore();
  initLeaderboardStore();
  initGlobalConfigStore();
  initAuditStore();
  initSnapshotStore();
};

export const recordBananaPull = (player: Player, entry: BananaEntry) => {
  const result = addBanana(player, entry.id, 1, "GACHA");
  if (result.ok) {
    logEconomyEvent(player.UserId, "GACHA", "GACHA", {
      bananaId: entry.id,
      bananaName: entry.name,
      bananaMoney: entry.bananaMoney,
    });
  }
  return result;
};

export const addBananaMoney = (player: Player, delta: number) => {
  const result = addMoney(player, delta, "SLOT_AWARD");
  if (result.ok) {
    logEconomyEvent(player.UserId, "SLOT_AWARD", "SLOT_AWARD", {
      delta,
      total: result.value,
    });
    return result.value;
  }
  return getPlayerMoney(player);
};

export {
  addBanana,
  removeBanana,
  addMoney,
  spendMoney,
  setNextGachaAt,
  upgradeNpcSlots,
  hasBanana,
  getInventorySnapshot,
  getPlayerMoney,
  flushPlayer,
  createListing,
  cancelListing,
  buyListing,
};
