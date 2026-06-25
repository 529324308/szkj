import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const envFilePath = path.join(projectRoot, '.env');

function loadDotEnvFile(filepath) {
  if (!existsSync(filepath)) {
    return;
  }

  const text = readFileSync(filepath, 'utf8');
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    const value = trimmed.slice(equalIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(envFilePath);

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: toNumber(process.env.PORT, 3001),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL || '',
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL || '',
  ollamaExtractModel: process.env.OLLAMA_EXTRACT_MODEL || '',
  ollamaReasoningModel: process.env.OLLAMA_REASONING_MODEL || '',
  ollamaVisionModel: process.env.OLLAMA_VISION_MODEL || '',
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || '',
  ragflowBaseUrl: process.env.RAGFLOW_BASE_URL || 'http://127.0.0.1:9380',
  ragflowApiKey: process.env.RAGFLOW_API_KEY || '',
  ragflowEmail: process.env.RAGFLOW_EMAIL || '',
  ragflowPassword: process.env.RAGFLOW_PASSWORD || '',
  ragflowEngineeringDatasetId: process.env.RAGFLOW_ENGINEERING_DATASET_ID || '',
  ragflowPolicyDatasetId: process.env.RAGFLOW_POLICY_DATASET_ID || '',
  ragflowPlatformDatasetId: process.env.RAGFLOW_PLATFORM_DATASET_ID || '',
  postgresUrl: process.env.POSTGRES_URL || '',
  minioEndpoint: process.env.MINIO_ENDPOINT || '',
  minioBucket: process.env.MINIO_BUCKET || '',
  minioRootUser: process.env.MINIO_ROOT_USER || '',
  minioRootPassword: process.env.MINIO_ROOT_PASSWORD || '',
  storageRoot: process.env.STORAGE_ROOT || path.join(projectRoot, 'storage'),
  logLevel: process.env.LOG_LEVEL || 'info'
};

export function getPublicRuntimeConfig() {
  return {
    nodeEnv: env.nodeEnv,
    ollamaBaseUrl: env.ollamaBaseUrl,
    ollamaDefaultModel: env.ollamaDefaultModel,
    ollamaChatModel: env.ollamaChatModel,
    ollamaExtractModel: env.ollamaExtractModel,
    ollamaReasoningModel: env.ollamaReasoningModel,
    ollamaVisionModel: env.ollamaVisionModel,
    ollamaEmbeddingModel: env.ollamaEmbeddingModel,
    ragflowBaseUrl: env.ragflowBaseUrl,
    ragflowApiKeyConfigured: Boolean(env.ragflowApiKey),
    ragflowLoginConfigured: Boolean(env.ragflowEmail && env.ragflowPassword),
    ragflowDatasetIdsConfigured: Boolean(
      env.ragflowEngineeringDatasetId ||
      env.ragflowPolicyDatasetId ||
      env.ragflowPlatformDatasetId
    ),
    postgresConfigured: Boolean(env.postgresUrl),
    minioConfigured: Boolean(env.minioEndpoint && env.minioBucket),
    minioCredentialsConfigured: Boolean(env.minioRootUser && env.minioRootPassword),
    storageRoot: env.storageRoot,
    logLevel: env.logLevel
  };
}
