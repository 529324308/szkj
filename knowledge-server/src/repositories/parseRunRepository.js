import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const PARSE_RUN_FILE = path.join(CONFIG_DIR, 'parse-runs.json');

function readParseRunFile() {
  if (!existsSync(PARSE_RUN_FILE)) {
    return [];
  }

  const text = readFileSync(PARSE_RUN_FILE, 'utf8').trim();
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

function writeParseRunFile(records) {
  writeFileSync(PARSE_RUN_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listParseRuns() {
  return readParseRunFile();
}

export function getParseRunById(id) {
  return readParseRunFile().find((item) => item.id === id) || null;
}

export function saveParseRun(record) {
  const records = readParseRunFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  writeParseRunFile(records);
  return record;
}
