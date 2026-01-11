export type InventoryItem = {
  qty: number;
  firstAt: number;
  updatedAt: number;
};

export type InventoryRecord = {
  schemaVersion: 1;
  items: { [itemId: string]: InventoryItem };
  createdAt: number;
  lastSavedAt: number;
  lastUpdatedBy: string;
};

export type InventorySnapshotItem = {
  id: string;
  name: string;
  qty: number;
  firstAt: number;
  updatedAt: number;
};

export type InventorySnapshotResponse = {
  loaded: boolean;
  items: InventorySnapshotItem[];
};
