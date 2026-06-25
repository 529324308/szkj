export function createParseRunRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: buildParseRunId(),
    crawlJobId: String(input.crawlJobId || '').trim(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
    summary: {
      totalFiles: 0,
      parsedFiles: 0,
      failedFiles: 0,
      unsupportedFiles: 0
    },
    documents: [],
    errors: []
  };
}

function buildParseRunId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `parse-${stamp}-${suffix}`;
}
