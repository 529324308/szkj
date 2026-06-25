export function createReviewCandidateRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || buildReviewCandidateId(),
    parseRunId: String(input.parseRunId || '').trim(),
    crawlJobId: String(input.crawlJobId || '').trim(),
    sourceId: String(input.sourceId || '').trim(),
    sourceName: String(input.sourceName || '').trim(),
    sourceUrl: String(input.sourceUrl || '').trim(),
    filePath: String(input.filePath || '').trim(),
    markdownFile: String(input.markdownFile || '').trim(),
    title: String(input.title || '').trim(),
    sourceOrg: String(input.sourceOrg || '').trim(),
    publishDate: String(input.publishDate || '').trim(),
    docNo: String(input.docNo || '').trim(),
    region: String(input.region || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    summary: String(input.summary || '').trim(),
    reviewStatus: input.reviewStatus || 'pending_review',
    dedupe: input.dedupe || {
      status: 'unique',
      matchedDocumentId: '',
      matchedReviewId: '',
      reason: ''
    },
    aiExtract: input.aiExtract || null,
    metadata: input.metadata || {},
    createdAt: input.createdAt || now,
    updatedAt: now,
    reviewedAt: input.reviewedAt || null,
    reviewNote: input.reviewNote || '',
    documentId: input.documentId || ''
  };
}

function buildReviewCandidateId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `review-${stamp}-${suffix}`;
}
