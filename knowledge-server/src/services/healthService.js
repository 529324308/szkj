import { getPublicRuntimeConfig } from '../config/env.js';
import { getLlmHealthSnapshot } from './llmService.js';
import { getRagflowHealthSnapshot } from './ragflowService.js';
import { getStorageHealthSnapshot } from './storageHealthService.js';

export async function getHealthSnapshot() {
  const [storage, llm, ragflow] = await Promise.all([
    getStorageHealthSnapshot(),
    getLlmHealthSnapshot(),
    getRagflowHealthSnapshot()
  ]);

  return {
    ok: true,
    service: 'knowledge-server',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    runtime: getPublicRuntimeConfig(),
    checks: {
      api: 'up',
      ragflow: ragflow.status,
      llm: llm.status,
      postgres: storage.postgres.status,
      minio: storage.minio.status,
      localStorage: storage.localStorage.status
    },
    storage,
    llm,
    ragflow
  };
}
