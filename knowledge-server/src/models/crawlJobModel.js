export function normalizeCrawlJobInput(input = {}) {
  return {
    sourceIds: Array.isArray(input.sourceIds)
      ? input.sourceIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    maxItemsPerSource: clampPositiveInteger(input.maxItemsPerSource, 5, 1, 20),
    fetchDetails: input.fetchDetails !== false
  };
}

export function createCrawlJobRecord(input = {}) {
  const normalized = normalizeCrawlJobInput(input);
  const now = new Date().toISOString();

  return {
    id: buildCrawlJobId(),
    status: 'pending',
    sourceIds: normalized.sourceIds,
    maxItemsPerSource: normalized.maxItemsPerSource,
    fetchDetails: normalized.fetchDetails,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    summary: {
      totalSources: 0,
      succeededSources: 0,
      failedSources: 0,
      discoveredItems: 0,
      downloadedDetails: 0
    },
    results: [],
    errors: []
  };
}

function buildCrawlJobId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `crawl-${stamp}-${suffix}`;
}

function clampPositiveInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}
