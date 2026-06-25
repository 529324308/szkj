import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { createParseRunRecord } from '../models/parseRunModel.js';
import { getCrawlJobDetail } from './crawlerJobService.js';
import { getParseRunById, listParseRuns, saveParseRun } from '../repositories/parseRunRepository.js';
import { parseHtmlDocument } from '../parsers/htmlParser.js';
import { parsePdfDocument } from '../parsers/pdfParser.js';
import { parseDocxDocument } from '../parsers/docxParser.js';
import { parseImageDocument } from '../parsers/imageParser.js';
import { runAiDocumentExtraction } from './aiParseService.js';
import { runOcrForFile } from './ocrService.js';
import { toMarkdownDocument } from '../parsers/markdownNormalizer.js';

const PARSED_MARKDOWN_ROOT = path.join(env.storageRoot, 'markdown', 'parsed');

export function getAllParseRuns() {
  return listParseRuns().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function getParseRunDetail(parseRunId) {
  return getParseRunById(parseRunId);
}

export async function createAndRunParseJob({ crawlJobId } = {}) {
  const job = getCrawlJobDetail(crawlJobId);
  if (!job) {
    const error = new Error(`Crawl job not found: ${crawlJobId}`);
    error.code = 'CRAWL_JOB_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const parseRun = createParseRunRecord({ crawlJobId });
  parseRun.status = 'running';
  parseRun.startedAt = new Date().toISOString();
  parseRun.updatedAt = parseRun.startedAt;
  saveParseRun(parseRun);

  const outputRoot = path.join(PARSED_MARKDOWN_ROOT, crawlJobId, parseRun.id);
  mkdirSync(outputRoot, { recursive: true });

  const candidates = collectParseCandidates(job);
  parseRun.summary.totalFiles = candidates.length;

  for (const candidate of candidates) {
    const documentResult = await parseCandidateFile(candidate, outputRoot);
    parseRun.documents.push(documentResult);

    if (documentResult.status === 'parsed') {
      parseRun.summary.parsedFiles += 1;
    } else if (documentResult.status === 'unsupported') {
      parseRun.summary.unsupportedFiles += 1;
    } else {
      parseRun.summary.failedFiles += 1;
      parseRun.errors.push({
        filePath: candidate.filePath,
        message: documentResult.error || 'Unknown parse error'
      });
    }

    parseRun.updatedAt = new Date().toISOString();
    saveParseRun(parseRun);
  }

  parseRun.status = parseRun.summary.failedFiles > 0 && parseRun.summary.parsedFiles === 0 ? 'failed' : 'completed';
  parseRun.finishedAt = new Date().toISOString();
  parseRun.updatedAt = parseRun.finishedAt;
  saveParseRun(parseRun);
  return parseRun;
}

function collectParseCandidates(crawlJob) {
  const candidates = [];

  for (const result of crawlJob.results || []) {
    for (const item of result.items || []) {
      if (!item.detailFile) continue;
      candidates.push({
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        title: item.detailTitle || item.title,
        sourceUrl: item.url,
        filePath: item.detailFile
      });
    }
  }

  return candidates;
}

async function parseCandidateFile(candidate, outputRoot) {
  const extension = path.extname(candidate.filePath).toLowerCase();
  let parsed;

  try {
    if (extension === '.html' || extension === '.htm') {
      parsed = parseHtmlDocument(candidate.filePath, {
        sourceUrl: candidate.sourceUrl,
        fallbackTitle: candidate.title
      });
    } else if (extension === '.pdf') {
      parsed = parsePdfDocument(candidate.filePath);
    } else if (extension === '.docx') {
      parsed = parseDocxDocument(candidate.filePath);
    } else if (['.png', '.jpg', '.jpeg', '.webp', '.bmp'].includes(extension)) {
      parsed = parseImageDocument(candidate.filePath, {
        fallbackTitle: candidate.title
      });
    } else {
      parsed = {
        parser: extension.replace('.', '') || 'unknown',
        status: 'unsupported',
        title: candidate.title,
        metadata: {},
        content: '',
        markdown: '',
        imageFiles: [],
        error: `Unsupported file extension: ${extension || '(none)'}`
      };
    }
  } catch (error) {
    return {
      sourceId: candidate.sourceId,
      sourceName: candidate.sourceName,
      filePath: candidate.filePath,
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      parser: extension.replace('.', '') || 'unknown',
      status: 'failed',
      markdownFile: null,
      enhancement: {
        ocr: {
          status: 'failed',
          textPreview: '',
          model: '',
          reason: error.message,
          entries: []
        },
        aiExtract: {
          status: 'failed',
          model: '',
          structuredData: null,
          reason: error.message
        }
      },
      error: error.message
    };
  }

  const ocrTargetFiles = Array.isArray(parsed.imageFiles) && parsed.imageFiles.length > 0
    ? parsed.imageFiles
    : [candidate.filePath];
  const ocrResults = [];
  for (const filePath of ocrTargetFiles) {
    const ocrResult = await runOcrForFile(filePath);
    ocrResults.push({
      filePath,
      ...ocrResult
    });
  }

  const mergedOcrText = ocrResults
    .filter((item) => item.status === 'up' && item.text)
    .map((item) => item.text)
    .join('\n\n')
    .trim();

  const aiExtract = await runAiDocumentExtraction({
    sourceType: parsed.parser,
    title: parsed.title || candidate.title,
    metadata: parsed.metadata,
    content: parsed.content,
    ocrText: mergedOcrText
  });

  const finalMarkdown = parsed.status === 'parsed'
    ? toMarkdownDocument({
        title: parsed.title || candidate.title,
        metadata: parsed.metadata,
        content: parsed.content,
        sourcePath: candidate.filePath,
        sourceUrl: candidate.sourceUrl,
        ocrText: mergedOcrText,
        aiExtract: aiExtract.structuredData
      })
    : parsed.markdown;

  let markdownFile = null;
  if (parsed.status === 'parsed' && finalMarkdown) {
    const fileName = `${sanitizeSegment(path.basename(candidate.filePath, extension))}.md`;
    markdownFile = path.join(outputRoot, fileName);
    writeFileSync(markdownFile, finalMarkdown, 'utf8');
  }

  return {
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    filePath: candidate.filePath,
    sourceUrl: candidate.sourceUrl,
    title: parsed.title || candidate.title,
    parser: parsed.parser,
    status: parsed.status,
    metadata: parsed.metadata,
    contentPreview: String(parsed.content || '').slice(0, 400),
    markdownFile,
    enhancement: {
      ocr: {
        status: ocrResults.some((item) => item.status === 'up')
          ? 'up'
          : ocrResults.every((item) => item.status === 'not_applicable')
            ? 'not_applicable'
            : 'failed',
        textPreview: mergedOcrText.slice(0, 400),
        model: ocrResults.find((item) => item.model)?.model || '',
        entries: ocrResults.map((item) => ({
          filePath: item.filePath,
          status: item.status,
          reason: item.reason || ''
        }))
      },
      aiExtract: {
        status: aiExtract.status,
        model: aiExtract.model,
        structuredData: aiExtract.structuredData,
        reason: aiExtract.reason || ''
      }
    },
    error: parsed.error || null
  };
}

function sanitizeSegment(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
}
