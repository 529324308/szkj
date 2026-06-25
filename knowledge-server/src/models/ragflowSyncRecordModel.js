export function createRagflowSyncRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || buildSyncRecordId(),
    documentId: String(input.documentId || '').trim(),
    datasetKey: String(input.datasetKey || '').trim(),
    datasetId: String(input.datasetId || '').trim(),
    status: input.status || 'pending',
    action: input.action || 'upload',
    remoteDocumentId: input.remoteDocumentId || '',
    remoteDocumentName: input.remoteDocumentName || '',
    message: input.message || '',
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

function buildSyncRecordId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ragflow-sync-${stamp}-${suffix}`;
}
