import { DataStoreService } from "@rbxts/services";
import {
  AUDIT_FLUSH_INTERVAL_SECONDS,
  AUDIT_MAX_EVENTS_PER_BUCKET,
  DATASTORE_KEYS,
  DATASTORE_NAMES,
  DEFAULT_SCHEMA_VERSION,
} from "./constants";
import { runDataStoreOperation } from "./datastore-utils";
import type { AuditBucket, AuditEvent } from "./types";

const auditStore = DataStoreService.GetDataStore(DATASTORE_NAMES.audit);
const pendingEvents: AuditEvent[] = [];
let initialized = false;

const getBucketId = (timestamp: number) => {
  return os.date("!%Y%m%d", timestamp);
};

const buildBucket = (existing?: AuditBucket): AuditBucket => {
  if (existing && typeIs(existing, "table") && typeIs(existing.events, "table")) {
    return existing;
  }
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    events: [],
  };
};

const flushBucketEvents = (bucketId: string, events: AuditEvent[]) => {
  if (events.size() <= 0) {
    return;
  }

  const key = DATASTORE_KEYS.auditBucket(bucketId);
  runDataStoreOperation({
    storeName: DATASTORE_NAMES.audit,
    key,
    op: "Update",
    requestType: Enum.DataStoreRequestType.UpdateAsync,
    reason: "audit_flush",
  }, () =>
    auditStore.UpdateAsync(key, (old) => {
      const bucket = buildBucket(old as AuditBucket | undefined);
      for (const event of events) {
        bucket.events.push(event);
      }
      if (bucket.events.size() > AUDIT_MAX_EVENTS_PER_BUCKET) {
        bucket.events.splice(0, bucket.events.size() - AUDIT_MAX_EVENTS_PER_BUCKET);
      }
      return $tuple(bucket);
    })
  );
};

const flushAuditEvents = () => {
  if (pendingEvents.size() <= 0) {
    return;
  }

  const grouped = new Map<string, AuditEvent[]>();
  while (pendingEvents.size() > 0) {
    const event = pendingEvents.shift();
    if (!event) {
      break;
    }
    const bucketId = getBucketId(event.timestamp);
    const bucketEvents = grouped.get(bucketId) ?? [];
    bucketEvents.push(event);
    grouped.set(bucketId, bucketEvents);
  }

  for (const [bucketId, events] of grouped) {
    flushBucketEvents(bucketId, events);
  }
};

export const logEconomyEvent = (userId: number, type: string, reason: string, payload: Record<string, unknown>) => {
  pendingEvents.push({
    timestamp: os.time(),
    userId,
    type,
    reason,
    payload,
  });
};

export const initAuditStore = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  task.spawn(() => {
    while (true) {
      task.wait(AUDIT_FLUSH_INTERVAL_SECONDS);
      flushAuditEvents();
    }
  });
};
