import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { listApprovedDocuments } from './reviewIngestService.js';
import { createRagflowSyncRecord } from '../models/ragflowSyncRecordModel.js';
import { findRagflowSyncRecord, listRagflowSyncRecords, saveRagflowSyncRecord } from '../repositories/ragflowSyncRecordRepository.js';

const RAGFLOW_DATASETS = [
  {
    key: 'engineering_examples',
    name: '工程样例库',
    description: '用于存放工程模板、样例项目、可复刻文档结构与交付骨架。',
    datasetId: env.ragflowEngineeringDatasetId,
    documentHint: 'engineering'
  },
  {
    key: 'natural_resources_policy',
    name: '自然资源政策库',
    description: '用于存放政策原文、法规文件、通知、指南、报批依据等知识文档。',
    datasetId: env.ragflowPolicyDatasetId,
    documentHint: 'policy'
  },
  {
    key: 'platform_capabilities',
    name: '平台功能库',
    description: '用于存放平台接口说明、操作规则、页面能力、地图能力等平台侧知识。',
    datasetId: env.ragflowPlatformDatasetId,
    documentHint: 'platform'
  }
];

const EXPORT_ROOT = path.join(env.storageRoot, 'exports', 'ragflow');
let cachedBearerToken = '';

function buildRagflowUrl(pathname) {
  return new URL(pathname, env.ragflowBaseUrl).toString();
}

async function fetchOpenApiDocument() {
  const response = await fetch(buildRagflowUrl('/openapi.json'));
  if (!response.ok) {
    throw new Error(`RAGFlow openapi request failed: HTTP ${response.status}`);
  }
  return response.json();
}

async function loginRagflow() {
  if (cachedBearerToken) {
    return cachedBearerToken;
  }

  if (env.ragflowApiKey) {
    cachedBearerToken = env.ragflowApiKey.startsWith('Bearer ')
      ? env.ragflowApiKey
      : `Bearer ${env.ragflowApiKey}`;
    return cachedBearerToken;
  }

  if (!env.ragflowEmail || !env.ragflowPassword) {
    throw new Error('RAGFlow token or login credentials are not configured.');
  }

  const response = await fetch(buildRagflowUrl('/api/v1/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: env.ragflowEmail,
      password: env.ragflowPassword
    })
  });

  const data = await response.json().catch(() => ({}));
  const token =
    data?.data?.access_token ||
    data?.data?.token ||
    data?.access_token ||
    data?.token ||
    '';

  if (!response.ok || !token) {
    const message = data?.message || `HTTP ${response.status}`;
    throw new Error(`RAGFlow login failed. ${message}`.trim());
  }

  cachedBearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return cachedBearerToken;
}

async function authorizedFetch(pathname, options = {}) {
  const token = await loginRagflow();
  const headers = {
    Authorization: token,
    ...(options.headers || {})
  };
  return fetch(buildRagflowUrl(pathname), {
    ...options,
    headers
  });
}

function ensureBusinessSuccess(payload, contextMessage) {
  if (payload && typeof payload === 'object' && 'code' in payload && Number(payload.code) !== 0) {
    throw new Error(`${contextMessage} ${payload.message || `code=${payload.code}`}`.trim());
  }
  return payload;
}

export function getRagflowDatasetDefinitions() {
  return RAGFLOW_DATASETS.map((item) => ({
    ...item,
    configured: Boolean(item.datasetId)
  }));
}

export async function getRagflowHealthSnapshot() {
  if (!env.ragflowBaseUrl) {
    return {
      status: 'not_configured',
      message: 'RAGFLOW_BASE_URL is empty.'
    };
  }

  try {
    const openapi = await fetchOpenApiDocument();
    let tenantModels = null;
    let tenantModelsError = '';
    try {
      tenantModels = await getRemoteTenantModelConfig();
    } catch (error) {
      tenantModelsError = error.message;
    }
    return {
      status: 'up',
      baseUrl: env.ragflowBaseUrl,
      title: openapi?.info?.title || '',
      version: openapi?.info?.version || '',
      authConfigured: Boolean(env.ragflowApiKey || (env.ragflowEmail && env.ragflowPassword)),
      datasetsConfigured: getRagflowDatasetDefinitions().filter((item) => item.configured).length,
      tenantModels: tenantModels?.data || null,
      tenantModelsError
    };
  } catch (error) {
    return {
      status: 'unreachable',
      baseUrl: env.ragflowBaseUrl,
      message: error.message
    };
  }
}

export async function listRemoteDatasets() {
  const response = await authorizedFetch('/api/v1/datasets?page=1&page_size=100');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`RAGFlow dataset list failed. ${data?.message || `HTTP ${response.status}`}`.trim());
  }
  return ensureBusinessSuccess(data, 'RAGFlow dataset list failed.');
}

export async function searchDataset({
  datasetId,
  question,
  topK = 5,
  similarityThreshold = 0,
  keyword = false
} = {}) {
  const response = await authorizedFetch(`/api/v1/datasets/${datasetId}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question,
      top_k: topK,
      similarity_threshold: similarityThreshold,
      keyword
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`RAGFlow dataset search failed. ${data?.message || `HTTP ${response.status}`}`.trim());
  }
  return ensureBusinessSuccess(data, 'RAGFlow dataset search failed.');
}

export async function getDocumentChunks(datasetId, documentId) {
  const response = await authorizedFetch(`/api/v1/datasets/${datasetId}/documents/${documentId}/chunks?page=1&page_size=100`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`RAGFlow document chunk list failed. ${data?.message || `HTTP ${response.status}`}`.trim());
  }
  return ensureBusinessSuccess(data, 'RAGFlow document chunk list failed.');
}

export async function createRemoteDataset(definition) {
  const tenantModels = await getRemoteTenantModelConfig();
  const embeddingModel = tenantModels?.data?.embd_id || env.ollamaEmbeddingModel || undefined;
  const response = await authorizedFetch('/api/v1/datasets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: definition.name,
      description: definition.description,
      embedding_model: embeddingModel,
      permission: 'me',
      chunk_method: chooseChunkMethod(definition.key)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`RAGFlow dataset create failed. ${data?.message || `HTTP ${response.status}`}`.trim());
  }
  return ensureBusinessSuccess(data, 'RAGFlow dataset create failed.');
}

export async function getRemoteTenantModelConfig() {
  const response = await authorizedFetch('/api/v1/users/me/models');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`RAGFlow tenant model config failed. ${data?.message || `HTTP ${response.status}`}`.trim());
  }
  return ensureBusinessSuccess(data, 'RAGFlow tenant model config failed.');
}

export async function ensureRemoteDatasets() {
  const remote = await listRemoteDatasets();
  const remoteItems = Array.isArray(remote?.data) ? remote.data : Array.isArray(remote) ? remote : [];
  const results = [];

  for (const definition of getRagflowDatasetDefinitions()) {
    const existing = remoteItems.find((item) => String(item.name || '').trim() === definition.name);
    if (existing) {
      results.push({
        key: definition.key,
        name: definition.name,
        datasetId: existing.id || existing.dataset_id || '',
        action: 'existing'
      });
      continue;
    }

    const created = await createRemoteDataset(definition);
    const data = created?.data || created;
    results.push({
      key: definition.key,
      name: definition.name,
      datasetId: data?.id || data?.dataset_id || '',
      action: 'created'
    });
  }

  return {
    total: results.length,
    items: results
  };
}

export function listSyncRecords() {
  return listRagflowSyncRecords().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function syncApprovedDocumentsToRagflow({ limit = 10 } = {}) {
  const documents = listApprovedDocuments();
  const results = [];

  for (const document of documents.slice(0, limit)) {
    const datasetKey = chooseDatasetKey(document);
    const datasetId = resolveDatasetId(datasetKey);

    if (!datasetId) {
      results.push(saveRagflowSyncRecord(createRagflowSyncRecord({
        documentId: document.id,
        datasetKey,
        datasetId: '',
        status: 'skipped',
        action: 'missing_dataset_id',
        message: 'Dataset id is not configured.'
      })));
      continue;
    }

    if (looksGarbled(document.title) || looksGarbled(document.summary) || looksGarbled(document.sourceOrg)) {
      results.push(saveRagflowSyncRecord(createRagflowSyncRecord({
        documentId: document.id,
        datasetKey,
        datasetId,
        status: 'skipped',
        action: 'garbled_document',
        message: 'Document looks garbled and was skipped from sync.'
      })));
      continue;
    }

    const existing = findRagflowSyncRecord(document.id, datasetId);
    if (existing) {
      results.push(existing);
      continue;
    }

    const synced = await uploadApprovedDocument(document, datasetKey, datasetId);
    results.push(synced);
  }

  return {
    total: results.length,
    items: results
  };
}

export function buildRagflowSyncPreview() {
  const documents = listApprovedDocuments();
  const datasets = getRagflowDatasetDefinitions();
  const items = documents.map((document) => ({
    documentId: document.id,
    datasetKey: chooseDatasetKey(document),
    datasetId: resolveDatasetId(chooseDatasetKey(document)),
    title: document.title,
    sourceOrg: document.sourceOrg,
    publishDate: document.publishDate,
    region: document.region,
    tags: document.tags || [],
    markdownFile: document.finalMarkdownFile || document.markdownFile || '',
    sourceUrl: document.sourceUrl || '',
    summary: document.summary || ''
  }));

  return {
    generatedAt: new Date().toISOString(),
    ragflowBaseUrl: env.ragflowBaseUrl,
    datasets,
    totalDocuments: documents.length,
    items
  };
}

export function exportRagflowSyncPreview() {
  const preview = buildRagflowSyncPreview();
  mkdirSync(EXPORT_ROOT, { recursive: true });
  const filePath = path.join(EXPORT_ROOT, 'sync-preview.json');
  writeFileSync(filePath, `${JSON.stringify(preview, null, 2)}\n`, 'utf8');
  return {
    filePath,
    preview
  };
}

export function getDatasetIdByKey(datasetKey) {
  const match = RAGFLOW_DATASETS.find((item) => item.key === datasetKey);
  return match?.datasetId || '';
}

async function uploadApprovedDocument(document, datasetKey, datasetId) {
  const record = createRagflowSyncRecord({
    documentId: document.id,
    datasetKey,
    datasetId,
    status: 'running',
    action: 'upload'
  });
  saveRagflowSyncRecord(record);

  try {
    const filePath = document.finalMarkdownFile || document.markdownFile;
    if (!filePath) {
      throw new Error('No markdown file available for sync.');
    }

    const fileName = path.basename(filePath);
    const fileBuffer = readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: 'text/markdown' }), fileName);

    const uploadResponse = await authorizedFetch(`/api/v1/datasets/${datasetId}/documents`, {
      method: 'POST',
      body: form
    });
    const uploadData = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) {
      throw new Error(`RAGFlow upload failed. ${uploadData?.message || `HTTP ${uploadResponse.status}`}`.trim());
    }
    ensureBusinessSuccess(uploadData, 'RAGFlow upload failed.');

    const uploadedDoc = Array.isArray(uploadData?.data) ? uploadData.data[0] : uploadData?.data;
    const remoteDocumentId = uploadedDoc?.id || '';
    const remoteDocumentName = uploadedDoc?.name || '';

    if (remoteDocumentId) {
      const parseResponse = await authorizedFetch(`/api/v1/datasets/${datasetId}/documents/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_ids: [remoteDocumentId]
        })
      });
      const parseData = await parseResponse.json().catch(() => ({}));
      if (!parseResponse.ok) {
        throw new Error(`RAGFlow parse trigger failed. ${parseData?.message || `HTTP ${parseResponse.status}`}`.trim());
      }
      ensureBusinessSuccess(parseData, 'RAGFlow parse trigger failed.');
    }

    record.status = 'completed';
    record.action = 'uploaded_and_parse_started';
    record.remoteDocumentId = remoteDocumentId;
    record.remoteDocumentName = remoteDocumentName;
    record.message = 'Uploaded to RAGFlow and parse was triggered.';
    record.updatedAt = new Date().toISOString();
    return saveRagflowSyncRecord(record);
  } catch (error) {
    record.status = 'failed';
    record.action = 'upload_failed';
    record.message = error.message;
    record.updatedAt = new Date().toISOString();
    return saveRagflowSyncRecord(record);
  }
}

function chooseDatasetKey(document = {}) {
  const sourceId = String(document.sourceId || '').toLowerCase();
  if (sourceId.includes('platform')) {
    return 'platform_capabilities';
  }

  const tags = Array.isArray(document.tags) ? document.tags.join(' ') : '';
  const title = `${document.title || ''} ${tags}`.toLowerCase();
  if (title.includes('模板') || title.includes('样例') || title.includes('复刻')) {
    return 'engineering_examples';
  }

  return 'natural_resources_policy';
}

function resolveDatasetId(datasetKey) {
  const match = RAGFLOW_DATASETS.find((item) => item.key === datasetKey);
  return match?.datasetId || '';
}

function chooseChunkMethod(datasetKey) {
  if (datasetKey === 'natural_resources_policy') return 'laws';
  if (datasetKey === 'platform_capabilities') return 'manual';
  return 'one';
}

function looksGarbled(text = '') {
  const value = String(text || '');
  return value.includes('锛') || value.includes('鍏') || value.includes('娴') || value.includes('????') || value.includes('�');
}
