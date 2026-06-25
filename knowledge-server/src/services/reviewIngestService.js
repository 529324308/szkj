import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { createPolicyDocumentRecord } from '../models/policyDocumentModel.js';
import { createReviewCandidateRecord } from '../models/reviewPolicyModel.js';
import { getParseRunDetail } from './parseRunService.js';
import { getPolicyDocumentById, listPolicyDocuments, savePolicyDocument } from '../repositories/policyDocumentRepository.js';
import {
  getReviewPolicyById,
  listReviewPolicies,
  reviewPolicyExistsForFile,
  saveReviewPolicy
} from '../repositories/reviewPolicyRepository.js';

const FINAL_MARKDOWN_ROOT = path.join(env.storageRoot, 'markdown', 'approved');

export function listReviewCandidates({ reviewStatus } = {}) {
  const items = listReviewPolicies().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  if (!reviewStatus) return items;
  return items.filter((item) => item.reviewStatus === reviewStatus);
}

export function getReviewCandidateDetail(id) {
  return getReviewPolicyById(id);
}

export function listApprovedDocuments() {
  return listPolicyDocuments().sort((a, b) => String(b.approvedAt || b.createdAt || '').localeCompare(String(a.approvedAt || a.createdAt || '')));
}

export function getApprovedDocumentDetail(id) {
  return getPolicyDocumentById(id);
}

export function updateReviewCandidateMetadata(id, updates = {}) {
  const candidate = getReviewPolicyById(id);
  if (!candidate) {
    const error = new Error(`Review candidate not found: ${id}`);
    error.code = 'REVIEW_CANDIDATE_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  if (candidate.reviewStatus === 'approved') {
    const error = new Error('Approved review candidates cannot be edited directly.');
    error.code = 'REVIEW_CANDIDATE_LOCKED';
    error.statusCode = 409;
    throw error;
  }

  if (typeof updates.title === 'string') candidate.title = updates.title.trim();
  if (typeof updates.sourceOrg === 'string') candidate.sourceOrg = updates.sourceOrg.trim();
  if (typeof updates.publishDate === 'string') candidate.publishDate = updates.publishDate.trim();
  if (typeof updates.docNo === 'string') candidate.docNo = updates.docNo.trim();
  if (typeof updates.region === 'string') candidate.region = updates.region.trim();
  if (typeof updates.summary === 'string') candidate.summary = updates.summary.trim();
  if (typeof updates.reviewNote === 'string') candidate.reviewNote = updates.reviewNote.trim();
  if (Array.isArray(updates.tags)) {
    candidate.tags = updates.tags.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (updates.metadata && typeof updates.metadata === 'object' && !Array.isArray(updates.metadata)) {
    candidate.metadata = {
      ...candidate.metadata,
      ...updates.metadata
    };
  }
  if (updates.aiExtract && typeof updates.aiExtract === 'object' && !Array.isArray(updates.aiExtract)) {
    candidate.aiExtract = {
      ...(candidate.aiExtract || {}),
      ...updates.aiExtract
    };
  }

  candidate.dedupe = detectDuplicate(candidate, candidate.id);
  candidate.updatedAt = new Date().toISOString();
  saveReviewPolicy(candidate);
  return candidate;
}

export function createReviewCandidatesFromParseRun(parseRunId) {
  const parseRun = getParseRunDetail(parseRunId);
  if (!parseRun) {
    const error = new Error(`Parse run not found: ${parseRunId}`);
    error.code = 'PARSE_RUN_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const createdItems = [];
  for (const document of parseRun.documents || []) {
    if (document.status !== 'parsed') continue;
    if (reviewPolicyExistsForFile(parseRunId, document.filePath)) continue;

    const aiData = document.enhancement?.aiExtract?.structuredData || {};
    const candidate = createReviewCandidateRecord({
      parseRunId,
      crawlJobId: parseRun.crawlJobId,
      sourceId: document.sourceId,
      sourceName: document.sourceName,
      sourceUrl: document.sourceUrl,
      filePath: document.filePath,
      markdownFile: document.markdownFile,
      title: aiData.title || document.title,
      sourceOrg: aiData.sourceOrg || document.metadata?.SiteName || '',
      publishDate: aiData.publishDate || '',
      docNo: aiData.docNo || '',
      region: aiData.region || '',
      tags: Array.isArray(aiData.tags) ? aiData.tags : [],
      summary: aiData.summary || '',
      aiExtract: document.enhancement?.aiExtract || null,
      metadata: document.metadata || {}
    });

    candidate.dedupe = detectDuplicate(candidate);
    saveReviewPolicy(candidate);
    createdItems.push(candidate);
  }

  return createdItems;
}

export function approveReviewCandidate(id, options = {}) {
  const candidate = getReviewPolicyById(id);
  if (!candidate) {
    const error = new Error(`Review candidate not found: ${id}`);
    error.code = 'REVIEW_CANDIDATE_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  const finalDir = path.join(FINAL_MARKDOWN_ROOT, sanitizeSegment(candidate.sourceId || 'default'));
  mkdirSync(finalDir, { recursive: true });
  const finalMarkdownFile = path.join(finalDir, `${sanitizeDocumentFileName(candidate.title || candidate.id, candidate.id)}.md`);
  if (candidate.markdownFile) {
    copyFileSync(candidate.markdownFile, finalMarkdownFile);
  }

  const document = createPolicyDocumentRecord({
    reviewCandidateId: candidate.id,
    parseRunId: candidate.parseRunId,
    crawlJobId: candidate.crawlJobId,
    sourceId: candidate.sourceId,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    filePath: candidate.filePath,
    markdownFile: candidate.markdownFile,
    finalMarkdownFile,
    title: options.title || candidate.title,
    sourceOrg: options.sourceOrg || candidate.sourceOrg,
    publishDate: options.publishDate || candidate.publishDate,
    docNo: options.docNo || candidate.docNo,
    region: options.region || candidate.region,
    tags: Array.isArray(options.tags) ? options.tags : candidate.tags,
    summary: options.summary || candidate.summary,
    metadata: candidate.metadata,
    aiExtract: candidate.aiExtract
  });

  savePolicyDocument(document);

  candidate.reviewStatus = 'approved';
  candidate.documentId = document.id;
  candidate.reviewedAt = new Date().toISOString();
  candidate.updatedAt = candidate.reviewedAt;
  candidate.reviewNote = String(options.reviewNote || '').trim();
  saveReviewPolicy(candidate);

  return {
    candidate,
    document
  };
}

export function rejectReviewCandidate(id, reviewNote = '') {
  return updateReviewStatus(id, 'rejected', {
    reviewNote
  });
}

export function markReviewCandidateAsDuplicate(id, reviewNote = '', matchedDocumentId = '') {
  const result = updateReviewStatus(id, 'duplicate', {
    reviewNote
  });
  result.dedupe = {
    status: 'duplicate',
    matchedDocumentId: matchedDocumentId || result.dedupe?.matchedDocumentId || '',
    matchedReviewId: result.dedupe?.matchedReviewId || '',
    reason: reviewNote || result.dedupe?.reason || 'Marked as duplicate during review.'
  };
  saveReviewPolicy(result);
  return result;
}

function updateReviewStatus(id, reviewStatus, { reviewNote = '' } = {}) {
  const candidate = getReviewPolicyById(id);
  if (!candidate) {
    const error = new Error(`Review candidate not found: ${id}`);
    error.code = 'REVIEW_CANDIDATE_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  candidate.reviewStatus = reviewStatus;
  candidate.reviewedAt = new Date().toISOString();
  candidate.updatedAt = candidate.reviewedAt;
  candidate.reviewNote = String(reviewNote || '').trim();
  saveReviewPolicy(candidate);
  return candidate;
}

function detectDuplicate(candidate, excludeReviewId = '') {
  const signature = buildSignature(candidate);
  const matchedDocument = listPolicyDocuments().find((item) => buildSignature(item) === signature || sameSourceUrl(item, candidate));
  if (matchedDocument) {
    return {
      status: 'suspected_duplicate',
      matchedDocumentId: matchedDocument.id,
      matchedReviewId: '',
      reason: 'Title/source/date signature matched an approved document.'
    };
  }

  const matchedReview = listReviewPolicies().find((item) => item.id !== excludeReviewId && (buildSignature(item) === signature || sameSourceUrl(item, candidate)));
  if (matchedReview) {
    return {
      status: 'suspected_duplicate',
      matchedDocumentId: '',
      matchedReviewId: matchedReview.id,
      reason: 'Title/source/date signature matched an existing review candidate.'
    };
  }

  return {
    status: 'unique',
    matchedDocumentId: '',
    matchedReviewId: '',
    reason: ''
  };
}

function buildSignature(item = {}) {
  const parts = [
    normalizeText(item.title),
    normalizeText(item.sourceOrg),
    normalizeText(item.publishDate)
  ];
  return parts.join('|');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function sameSourceUrl(left = {}, right = {}) {
  const a = String(left.sourceUrl || '').trim();
  const b = String(right.sourceUrl || '').trim();
  return Boolean(a && b && a === b);
}

function sanitizeSegment(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';
}

function sanitizeDocumentFileName(value, fallback = 'document') {
  const sanitized = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');

  if (sanitized.length >= 2) {
    return sanitized.slice(0, 80);
  }

  return fallback;
}
