export const DATASTORE_NAMES = {
  player: "BananaGame:Player:v1",
  marketListing: "BananaGame:Market:Listings:v1",
  leaderboardMoney: "BananaGame:Leaderboard:Money:v1",
  globalConfig: "BananaGame:GlobalConfig:v1",
  audit: "BananaGame:Audit:v1",
  snapshot: "BananaGame:ServerSnapshot:v1",
} as const;

export const DATASTORE_KEYS = {
  player: (userId: number) => `u_${userId}`,
  listing: (listingId: string) => `l_${listingId}`,
  globalConfig: "g_config",
  snapshot: "g_snapshot",
  auditBucket: (bucketId: string) => `a_${bucketId}`,
};

export const DEFAULT_SCHEMA_VERSION = 1;

export const PLAYER_STORE_SAVE_INTERVAL_SECONDS = 15;
export const PLAYER_STORE_DEBOUNCE_SECONDS = 3;

export const LEADERBOARD_FLUSH_INTERVAL_SECONDS = 45;
export const AUDIT_FLUSH_INTERVAL_SECONDS = 20;
export const SNAPSHOT_FLUSH_INTERVAL_SECONDS = 120;

export const DATASTORE_RETRY_DELAYS_SECONDS = [0.5, 1, 2];
export const DATASTORE_RETRY_COUNT = 3;

export const LOG_DATASTORE_SUCCESS = false;

export const NPC_SLOT_MIN = 1;
export const NPC_SLOT_MAX = 3;
export const DEFAULT_NPC_SLOT_COUNT = 1;

export const MARKET_PRICE_MIN = 1;
export const MARKET_PRICE_MAX = 1_000_000;
export const MARKET_QTY_MIN = 1;

export const AUDIT_MAX_EVENTS_PER_BUCKET = 200;
export const METRIC_WINDOW_SECONDS = 300;
export const METRIC_MAX_ENTRIES = 500;
