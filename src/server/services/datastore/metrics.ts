import { METRIC_MAX_ENTRIES, METRIC_WINDOW_SECONDS } from "./constants";

type DataStoreMetric = {
  timestamp: number;
  durationMs: number;
  success: boolean;
};

const metrics: DataStoreMetric[] = [];

const trimMetrics = (now: number) => {
  const cutoff = now - METRIC_WINDOW_SECONDS;
  let firstValidIndex = 0;
  while (firstValidIndex < metrics.size() && metrics[firstValidIndex].timestamp < cutoff) {
    firstValidIndex += 1;
  }

  if (firstValidIndex > 0) {
    metrics.splice(0, firstValidIndex);
  }

  if (metrics.size() > METRIC_MAX_ENTRIES) {
    metrics.splice(0, metrics.size() - METRIC_MAX_ENTRIES);
  }
};

export const recordDataStoreMetric = (metric: DataStoreMetric) => {
  metrics.push(metric);
  trimMetrics(metric.timestamp);
};

export const getSaveFailuresLastWindow = (windowSeconds = METRIC_WINDOW_SECONDS) => {
  const cutoff = os.time() - windowSeconds;
  let failures = 0;
  for (const entry of metrics) {
    if (entry.timestamp < cutoff) {
      continue;
    }
    if (!entry.success) {
      failures += 1;
    }
  }
  return failures;
};

export const getAverageDurationMs = (windowSeconds = METRIC_WINDOW_SECONDS) => {
  const cutoff = os.time() - windowSeconds;
  let total = 0;
  let count = 0;
  for (const entry of metrics) {
    if (entry.timestamp < cutoff) {
      continue;
    }
    total += entry.durationMs;
    count += 1;
  }
  if (count <= 0) {
    return 0;
  }
  return math.floor(total / count);
};
