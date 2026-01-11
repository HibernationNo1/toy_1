import type { InventoryRecord } from "shared/inventory-types";

export type PlayerInventoryState = {
  data: InventoryRecord;
  loaded: boolean;
  dirty: boolean;
  saving: boolean;
  lastChangeAt: number;
  debounceScheduled: boolean;
  failedSaves: number;
};

export const playerInventories = new Map<number, PlayerInventoryState>();
