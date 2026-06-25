import { exportRagflowSyncPreview, getRagflowDatasetDefinitions, getRagflowHealthSnapshot } from '../src/services/ragflowService.js';

async function main() {
  const health = await getRagflowHealthSnapshot();
  console.log('[RAGFLOW] Health:', JSON.stringify(health, null, 2));

  const datasets = getRagflowDatasetDefinitions();
  console.log('[RAGFLOW] Dataset definitions:', JSON.stringify(datasets, null, 2));

  const result = exportRagflowSyncPreview();
  console.log('[RAGFLOW] Sync preview exported to:', result.filePath);
  console.log('[RAGFLOW] Total preview documents:', result.preview.totalDocuments);

  if (health.status !== 'up' && health.status !== 'degraded') {
    console.log('[RAGFLOW] RAGFlow is not reachable yet. Preview export completed; real sync should wait for service readiness.');
  }
}

main().catch((error) => {
  console.error('[RAGFLOW] Sync preview failed:', error.message);
  process.exitCode = 1;
});
