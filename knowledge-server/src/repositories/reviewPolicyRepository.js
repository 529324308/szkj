import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const REVIEW_POLICY_FILE = path.join(CONFIG_DIR, 'review-policies.json');

function readReviewPolicyFile() {
  if (!existsSync(REVIEW_POLICY_FILE)) return [];
  const text = readFileSync(REVIEW_POLICY_FILE, 'utf8').trim();
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeReviewPolicyFile(records) {
  writeFileSync(REVIEW_POLICY_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listReviewPolicies() {
  return readReviewPolicyFile();
}

export function getReviewPolicyById(id) {
  return readReviewPolicyFile().find((item) => item.id === id) || null;
}

export function saveReviewPolicy(record) {
  const records = readReviewPolicyFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }
  writeReviewPolicyFile(records);
  return record;
}

export function reviewPolicyExistsForFile(parseRunId, filePath) {
  return readReviewPolicyFile().some((item) => item.parseRunId === parseRunId && item.filePath === filePath);
}
