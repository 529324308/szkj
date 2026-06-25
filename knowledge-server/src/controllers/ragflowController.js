import {
  createRemoteDataset,
  ensureRemoteDatasets,
  exportRagflowSyncPreview,
  getRagflowDatasetDefinitions,
  getRagflowHealthSnapshot,
  listRemoteDatasets,
  listSyncRecords,
  syncApprovedDocumentsToRagflow
} from '../services/ragflowService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export function handleRagflowDatasetListRequest(_req, res) {
  const items = getRagflowDatasetDefinitions();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleRagflowHealthRequest(_req, res) {
  const item = await getRagflowHealthSnapshot();
  sendJson(res, 200, {
    ok: item.status === 'up' || item.status === 'degraded',
    item
  });
}

export function handleRagflowSyncPreviewRequest(_req, res) {
  const result = exportRagflowSyncPreview();
  sendJson(res, 200, {
    ok: true,
    filePath: result.filePath,
    preview: result.preview
  });
}

export async function handleRagflowRemoteDatasetListRequest(_req, res) {
  const data = await listRemoteDatasets();
  sendJson(res, 200, {
    ok: true,
    data
  });
}

export async function handleRagflowCreateRemoteDatasetRequest(req, res) {
  const body = await readJsonBody(req);
  const definition = getRagflowDatasetDefinitions().find((item) => item.key === body.key);
  if (!definition) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'RAGFLOW_DATASET_DEFINITION_NOT_FOUND',
        message: `Unknown ragflow dataset key: ${body.key || ''}`
      }
    });
    return;
  }

  const data = await createRemoteDataset(definition);
  sendJson(res, 201, {
    ok: true,
    data
  });
}

export async function handleRagflowEnsureDatasetsRequest(_req, res) {
  const data = await ensureRemoteDatasets();
  sendJson(res, 200, {
    ok: true,
    data
  });
}

export function handleRagflowSyncRecordListRequest(_req, res) {
  const items = listSyncRecords();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleRagflowSyncApprovedDocumentsRequest(req, res) {
  const body = await readJsonBody(req);
  const data = await syncApprovedDocumentsToRagflow({
    limit: Number(body.limit) || 10
  });
  sendJson(res, 200, {
    ok: true,
    data
  });
}
