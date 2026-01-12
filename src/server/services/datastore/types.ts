export type PlayerInventoryEntry = {
  qty: number;
  firstAt: number;
  updatedAt: number;
};

export type PlayerData = {
  bananaMoney: number;
  inventory: Record<string, PlayerInventoryEntry>;
  gacha: {
    nextAt: number;
  };
  npc: {
    slotCount: number;
  };
  meta: {
    schemaVersion: number;
    createdAt: number;
    updatedAt: number;
  };
};

export type ListingStatus = "OPEN" | "SOLD" | "CANCELLED";

export type ListingRecord = {
  listingId: string;
  sellerUserId: number;
  buyerUserId?: number;
  bananaId: string;
  quantity: number;
  price: number;
  status: ListingStatus;
  createdAt: number;
  updatedAt: number;
  soldAt?: number;
  meta: {
    schemaVersion: number;
  };
};

export type GlobalConfig = {
  schemaVersion: number;
  economy: {
    taxRate: number;
    priceMultiplier: number;
  };
  features: {
    marketEnabled: boolean;
    gachaEnabled: boolean;
  };
  updatedAt: number;
  updatedBy: string;
};

export type AuditEvent = {
  timestamp: number;
  userId: number;
  type: string;
  reason: string;
  payload: Record<string, unknown>;
};

export type AuditBucket = {
  schemaVersion: number;
  events: AuditEvent[];
};

export type ServerSnapshot = {
  schemaVersion: number;
  updatedAt: number;
  activePlayers: number;
  openListings: number;
  saveFailuresLast5m: number;
  avgSaveDurationMs: number;
};
