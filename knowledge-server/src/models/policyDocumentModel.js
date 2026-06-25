export function createPolicyDocumentRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || buildPolicyDocumentId(),
    reviewCandidateId: String(input.reviewCandidateId || '').trim(),
    parseRunId: String(input.parseRunId || '').trim(),
    crawlJobId: String(input.crawlJobId || '').trim(),
    sourceId: String(input.sourceId || '').trim(),
    sourceName: String(input.sourceName || '').trim(),
    sourceUrl: String(input.sourceUrl || '').trim(),
    filePath: String(input.filePath || '').trim(),
    markdownFile: String(input.markdownFile || '').trim(),
    finalMarkdownFile: String(input.finalMarkdownFile || '').trim(),
    title: String(input.title || '').trim(),
    sourceOrg: String(input.sourceOrg || '').trim(),
    publishDate: String(input.publishDate || '').trim(),
    docNo: String(input.docNo || '').trim(),
    region: String(input.region || '').trim(),
    tags: Array.isArray(input.tags) ? input.tags : [],
    summary: String(input.summary || '').trim(),
    metadata: input.metadata || {},
    aiExtract: input.aiExtract || null,
    status: input.status || 'approved',
    approvedAt: input.approvedAt || now,
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

function buildPolicyDocumentId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `policy-${stamp}-${suffix}`;
}
