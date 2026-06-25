import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { createCrawlJobRecord, normalizeCrawlJobInput } from '../models/crawlJobModel.js';
import { getPolicySourceDetail, getAllPolicySources } from './policySourceService.js';
import { getCrawlJobById, listCrawlJobs, saveCrawlJob } from '../repositories/crawlJobRepository.js';

const RAW_CRAWLER_ROOT = path.join(env.storageRoot, 'raw', 'crawler');

export function getAllCrawlJobs() {
  return listCrawlJobs().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function getCrawlJobDetail(jobId) {
  return getCrawlJobById(jobId);
}

export async function createAndRunCrawlJob(input = {}) {
  const normalized = normalizeCrawlJobInput(input);
  const availableSources = getAllPolicySources().filter((item) => item.enabled !== false);
  const selectedSources = normalized.sourceIds.length > 0
    ? normalized.sourceIds.map((id) => getPolicySourceDetail(id)).filter(Boolean)
    : availableSources;

  if (selectedSources.length === 0) {
    const error = new Error('No enabled policy source is available for crawling.');
    error.code = 'NO_POLICY_SOURCE';
    error.statusCode = 400;
    throw error;
  }

  const job = createCrawlJobRecord({
    ...normalized,
    sourceIds: selectedSources.map((item) => item.id)
  });
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.updatedAt = job.startedAt;
  job.summary.totalSources = selectedSources.length;
  saveCrawlJob(job);

  const jobDir = path.join(RAW_CRAWLER_ROOT, job.id);
  mkdirSync(jobDir, { recursive: true });

  for (const source of selectedSources) {
    const result = await crawlSingleSource(job, source, jobDir);
    job.results.push(result);
    if (result.status === 'success') {
      job.summary.succeededSources += 1;
    } else {
      job.summary.failedSources += 1;
      if (result.error) {
        job.errors.push({
          sourceId: source.id,
          message: result.error
        });
      }
    }

    job.summary.discoveredItems += result.items.length;
    job.summary.downloadedDetails += result.items.filter((item) => item.detailSaved).length;
    job.updatedAt = new Date().toISOString();
    saveCrawlJob(job);
  }

  job.status = job.summary.failedSources > 0 && job.summary.succeededSources === 0 ? 'failed' : 'completed';
  job.finishedAt = new Date().toISOString();
  job.updatedAt = job.finishedAt;
  saveCrawlJob(job);
  return job;
}

async function crawlSingleSource(job, source, jobDir) {
  const sourceDir = path.join(jobDir, sanitizeSegment(source.id));
  mkdirSync(sourceDir, { recursive: true });

  try {
    const listUrl = source?.config?.listUrl || source.baseUrl;
    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
      throw new Error(`List page request failed: HTTP ${listResponse.status}`);
    }

    const listHtml = await listResponse.text();
    const listFilePath = path.join(sourceDir, 'list.html');
    writeFileSync(listFilePath, listHtml, 'utf8');

    const anchors = extractAnchors(listHtml, listUrl)
      .filter((item) => item.href.startsWith(source.baseUrl))
      .slice(0, job.maxItemsPerSource);

    const items = [];
    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index];
      const item = {
        index,
        title: anchor.text || anchor.title || `item-${index + 1}`,
        url: anchor.href,
        detailSaved: false,
        detailFile: null
      };

      if (job.fetchDetails) {
        try {
          const detailResponse = await fetch(anchor.href);
          if (!detailResponse.ok) {
            throw new Error(`Detail page request failed: HTTP ${detailResponse.status}`);
          }
          const detailHtml = await detailResponse.text();
          const fileName = `detail-${String(index + 1).padStart(2, '0')}.html`;
          const detailFilePath = path.join(sourceDir, fileName);
          writeFileSync(detailFilePath, detailHtml, 'utf8');
          item.detailSaved = true;
          item.detailFile = detailFilePath;
          item.detailTitle = extractDocumentTitle(detailHtml) || item.title;
        } catch (error) {
          item.detailError = error.message;
        }
      }

      items.push(item);
    }

    return {
      sourceId: source.id,
      sourceName: source.name,
      status: 'success',
      listUrl,
      listFile: listFilePath,
      discoveredCount: items.length,
      items
    };
  } catch (error) {
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: 'failed',
      items: [],
      error: error.message
    };
  }
}

function extractAnchors(html, baseUrl) {
  const results = [];
  const seen = new Set();
  const pattern = /<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const rawHref = match[1] || match[2] || '';
    const rawText = stripHtml(match[3] || '');
    if (!rawHref || !rawText) continue;
    if (rawHref.startsWith('javascript:') || rawHref.startsWith('#')) continue;

    const href = toAbsoluteUrl(rawHref, baseUrl);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    results.push({
      href,
      text: rawText,
      title: rawText
    });
  }

  return results;
}

function extractDocumentTitle(html) {
  const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const h1Text = stripHtml(h1Match[1]);
    if (h1Text) return h1Text;
  }

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    return stripHtml(titleMatch[1]);
  }

  return '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function sanitizeSegment(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'source';
}
