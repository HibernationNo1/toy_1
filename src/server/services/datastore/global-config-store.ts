import { DataStoreService } from "@rbxts/services";
import { DATASTORE_KEYS, DATASTORE_NAMES, DEFAULT_SCHEMA_VERSION } from "./constants";
import { runDataStoreOperation } from "./datastore-utils";
import type { GlobalConfig } from "./types";

const globalConfigStore = DataStoreService.GetDataStore(DATASTORE_NAMES.globalConfig);

const defaultConfig: GlobalConfig = {
  schemaVersion: DEFAULT_SCHEMA_VERSION,
  economy: {
    taxRate: 0.05,
    priceMultiplier: 1,
  },
  features: {
    marketEnabled: true,
    gachaEnabled: true,
  },
  updatedAt: os.time(),
  updatedBy: "init",
};

let cachedConfig: GlobalConfig = defaultConfig;
let loaded = false;
let initialized = false;

const normalizeConfig = (raw: unknown): GlobalConfig => {
  if (!typeIs(raw, "table")) {
    return defaultConfig;
  }

  const data = raw as Partial<GlobalConfig>;
  const now = os.time();
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    economy: {
      taxRate: typeIs(data.economy?.taxRate, "number") ? data.economy.taxRate : defaultConfig.economy.taxRate,
      priceMultiplier: typeIs(data.economy?.priceMultiplier, "number")
        ? data.economy.priceMultiplier
        : defaultConfig.economy.priceMultiplier,
    },
    features: {
      marketEnabled: typeIs(data.features?.marketEnabled, "boolean")
        ? data.features.marketEnabled
        : defaultConfig.features.marketEnabled,
      gachaEnabled: typeIs(data.features?.gachaEnabled, "boolean")
        ? data.features.gachaEnabled
        : defaultConfig.features.gachaEnabled,
    },
    updatedAt: typeIs(data.updatedAt, "number") ? data.updatedAt : now,
    updatedBy: typeIs(data.updatedBy, "string") ? data.updatedBy : "unknown",
  };
};

export const loadGlobalConfig = () => {
  const key = DATASTORE_KEYS.globalConfig;
  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.globalConfig,
    key,
    op: "Get",
    requestType: Enum.DataStoreRequestType.GetAsync,
  }, () => globalConfigStore.GetAsync(key));

  if (result.ok) {
    cachedConfig = normalizeConfig(result.value);
    loaded = true;
    return cachedConfig;
  }

  cachedConfig = defaultConfig;
  loaded = true;

  runDataStoreOperation({
    storeName: DATASTORE_NAMES.globalConfig,
    key,
    op: "Set",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "seed_default",
  }, () => globalConfigStore.UpdateAsync(key, () => $tuple(defaultConfig)));

  return cachedConfig;
};

export const getGlobalConfig = () => {
  if (!loaded) {
    return loadGlobalConfig();
  }
  return cachedConfig;
};

export const updateGlobalConfig = (
  updatedBy: string,
  updater: (current: GlobalConfig) => GlobalConfig
) => {
  const key = DATASTORE_KEYS.globalConfig;
  const result = runDataStoreOperation({
    storeName: DATASTORE_NAMES.globalConfig,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "global_config_update",
  }, () =>
    globalConfigStore.UpdateAsync(key, (old) => {
      const current = normalizeConfig(old);
      const next = updater(current);
      return $tuple({
        ...next,
        schemaVersion: DEFAULT_SCHEMA_VERSION,
        updatedAt: os.time(),
        updatedBy,
      });
    })
  );

  if (result.ok && result.value) {
    cachedConfig = normalizeConfig(result.value);
    loaded = true;
    return { ok: true, value: cachedConfig } as const;
  }

  return { ok: false, reason: tostring(result.error) } as const;
};

export const initGlobalConfigStore = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  loadGlobalConfig();
};
