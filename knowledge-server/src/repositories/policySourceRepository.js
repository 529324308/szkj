import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const POLICY_SOURCE_FILE = path.join(CONFIG_DIR, 'policy-sources.json');

function readPolicySourceFile() {
  if (!existsSync(POLICY_SOURCE_FILE)) {
    return [];
  }

  const text = readFileSync(POLICY_SOURCE_FILE, 'utf8').trim();
  if (!text) {
    return [];
  }

  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writePolicySourceFile(records) {
  writeFileSync(POLICY_SOURCE_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listPolicySources() {
  return readPolicySourceFile();
}

export function getPolicySourceById(id) {
  return readPolicySourceFile().find((item) => item.id === id) || null;
}

export function savePolicySource(record) {
  const records = readPolicySourceFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  writePolicySourceFile(records);
  return record;
}

export function policySourceNameExists(name) {
  const normalized = String(name || '').trim().toLowerCase();
  return readPolicySourceFile().some((item) => String(item.name || '').trim().toLowerCase() === normalized);
}
