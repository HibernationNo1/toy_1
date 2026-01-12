import { DataStoreService } from "@rbxts/services";
import { logInfo } from "../../logger";
import {
  DATASTORE_RETRY_COUNT,
  DATASTORE_RETRY_DELAYS_SECONDS,
  LOG_DATASTORE_SUCCESS,
} from "./constants";
import { recordDataStoreMetric } from "./metrics";

type DataStoreOperation = {
  storeName: string;
  key: string;
  op: "Get" | "Set" | "Update" | "GetSorted";
  requestType: Enum.DataStoreRequestType;
  reason?: string;
};

type DataStoreResult<T> = {
  ok: boolean;
  value?: T;
  error?: unknown;
  attempts: number;
  durationMs: number;
};

const logDataStoreOperation = (entry: {
  storeName: string;
  key: string;
  op: string;
  reason?: string;
  attempt: number;
  durationMs: number;
  success: boolean;
  error?: unknown;
}) => {
  if (entry.success && !LOG_DATASTORE_SUCCESS) {
    return;
  }

  const reasonSuffix = entry.reason ? ` reason=${entry.reason}` : "";
  const message = `[DataStore] op=${entry.op} store=${entry.storeName} key=${entry.key}${reasonSuffix} attempt=${entry.attempt} durationMs=${entry.durationMs} success=${tostring(entry.success)} error=${tostring(entry.error)}`;
  if (entry.success) {
    logInfo(message);
  } else {
    warn(message);
  }
};

export const runDataStoreOperation = <T>(
  operation: DataStoreOperation,
  action: () => T
): DataStoreResult<T> => {
  let lastError: unknown = "unknown";
  let durationMs = 0;

  for (let attempt = 1; attempt <= DATASTORE_RETRY_COUNT; attempt += 1) {
    const budget = DataStoreService.GetRequestBudgetForRequestType(operation.requestType);
    if (budget <= 0) {
      lastError = "budget_exhausted";
      if (attempt < DATASTORE_RETRY_COUNT) {
        const delaySeconds =
          DATASTORE_RETRY_DELAYS_SECONDS[attempt - 1] ??
          DATASTORE_RETRY_DELAYS_SECONDS[DATASTORE_RETRY_DELAYS_SECONDS.size() - 1];
        task.wait(delaySeconds);
        continue;
      }

      logDataStoreOperation({
        storeName: operation.storeName,
        key: operation.key,
        op: operation.op,
        reason: operation.reason,
        attempt,
        durationMs,
        success: false,
        error: lastError,
      });
      recordDataStoreMetric({
        timestamp: os.time(),
        durationMs,
        success: false,
      });
      return { ok: false, error: lastError, attempts: attempt, durationMs };
    }

    const start = os.clock();
    const [ok, result] = pcall(action);
    durationMs = math.floor((os.clock() - start) * 1000);

    recordDataStoreMetric({
      timestamp: os.time(),
      durationMs,
      success: ok,
    });

    if (ok) {
      logDataStoreOperation({
        storeName: operation.storeName,
        key: operation.key,
        op: operation.op,
        reason: operation.reason,
        attempt,
        durationMs,
        success: true,
      });
      return { ok: true, value: result as T, attempts: attempt, durationMs };
    }

    lastError = result;
    if (attempt < DATASTORE_RETRY_COUNT) {
      const delaySeconds =
        DATASTORE_RETRY_DELAYS_SECONDS[attempt - 1] ??
        DATASTORE_RETRY_DELAYS_SECONDS[DATASTORE_RETRY_DELAYS_SECONDS.size() - 1];
      task.wait(delaySeconds);
    } else {
      logDataStoreOperation({
        storeName: operation.storeName,
        key: operation.key,
        op: operation.op,
        reason: operation.reason,
        attempt,
        durationMs,
        success: false,
        error: lastError,
      });
      return { ok: false, error: lastError, attempts: attempt, durationMs };
    }
  }

  logDataStoreOperation({
    storeName: operation.storeName,
    key: operation.key,
    op: operation.op,
    reason: operation.reason,
    attempt: DATASTORE_RETRY_COUNT,
    durationMs,
    success: false,
    error: lastError,
  });

  return { ok: false, error: lastError, attempts: DATASTORE_RETRY_COUNT, durationMs };
};
