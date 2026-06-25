import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

const CONFIG_DIR = path.join(env.storageRoot, 'config');
const CRAWL_JOB_FILE = path.join(CONFIG_DIR, 'crawl-jobs.json');

function readCrawlJobFile() {
  if (!existsSync(CRAWL_JOB_FILE)) {
    return [];
  }

  const text = readFileSync(CRAWL_JOB_FILE, 'utf8').trim();
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

function writeCrawlJobFile(records) {
  writeFileSync(CRAWL_JOB_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

export function listCrawlJobs() {
  return readCrawlJobFile();
}

export function getCrawlJobById(id) {
  return readCrawlJobFile().find((item) => item.id === id) || null;
}

export function saveCrawlJob(record) {
  const records = readCrawlJobFile();
  const existingIndex = records.findIndex((item) => item.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  writeCrawlJobFile(records);
  return record;
}
