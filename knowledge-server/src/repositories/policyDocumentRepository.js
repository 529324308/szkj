import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const POLICY_DOCUMENT_FILE = path.join(CONFIG_DIR, 'policy-documents.json');

function readPolicyDocumentFile() {
  if (!existsSync(POLICY_DOCUMENT_FILE)) return [];
  const text = readFileSync(POLICY_DOCUMENT_FILE, 'utf8').trim();
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writePolicyDocumentFile(records) {
  writeFileSync(POLICY_DOCUMENT_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listPolicyDocuments() {
  return readPolicyDocumentFile();
}

export function getPolicyDocumentById(id) {
  return readPolicyDocumentFile().find((item) => item.id === id) || null;
}

export function savePolicyDocument(record) {
  const records = readPolicyDocumentFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  writePolicyDocumentFile(records);
  return record;
}
