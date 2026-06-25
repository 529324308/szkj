import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const SYNC_FILE = path.join(CONFIG_DIR, 'ragflow-sync-records.json');

function readSyncFile() {
  if (!existsSync(SYNC_FILE)) return [];
  const text = readFileSync(SYNC_FILE, 'utf8').trim();
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeSyncFile(records) {
  writeFileSync(SYNC_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listRagflowSyncRecords() {
  return readSyncFile();
}

export function saveRagflowSyncRecord(record) {
  const records = readSyncFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  writeSyncFile(records);
  return record;
}

export function findRagflowSyncRecord(documentId, datasetId) {
  return readSyncFile().find((item) => item.documentId === documentId && item.datasetId === datasetId && item.status === 'completed') || null;
}
