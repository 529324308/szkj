import {
  approveReviewCandidate,
  createReviewCandidatesFromParseRun,
  getApprovedDocumentDetail,
  getReviewCandidateDetail,
  listApprovedDocuments,
  listReviewCandidates,
  markReviewCandidateAsDuplicate,
  rejectReviewCandidate,
  updateReviewCandidateMetadata
} from '../services/reviewIngestService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export function handleListReviewCandidatesRequest(req, res, query) {
  const reviewStatus = query.get('status') || '';
  const items = listReviewCandidates({ reviewStatus });
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleCreateReviewCandidatesRequest(req, res) {
  const body = await readJsonBody(req);
  const items = createReviewCandidatesFromParseRun(String(body.parseRunId || '').trim());
  sendJson(res, 201, {
    ok: true,
    total: items.length,
    items
  });
}

export function handleReviewCandidateDetailRequest(_req, res, reviewId) {
  const item = getReviewCandidateDetail(reviewId);
  if (!item) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'REVIEW_CANDIDATE_NOT_FOUND',
        message: `Review candidate not found: ${reviewId}`
      }
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    item
  });
}

export async function handleApproveReviewCandidateRequest(req, res, reviewId) {
  const body = await readJsonBody(req);
  const result = approveReviewCandidate(reviewId, body);
  sendJson(res, 200, {
    ok: true,
    item: result.candidate,
    document: result.document
  });
}

export async function handleRejectReviewCandidateRequest(req, res, reviewId) {
  const body = await readJsonBody(req);
  const item = rejectReviewCandidate(reviewId, body.reviewNote || '');
  sendJson(res, 200, {
    ok: true,
    item
  });
}

export async function handleMarkDuplicateRequest(req, res, reviewId) {
  const body = await readJsonBody(req);
  const item = markReviewCandidateAsDuplicate(reviewId, body.reviewNote || '', body.matchedDocumentId || '');
  sendJson(res, 200, {
    ok: true,
    item
  });
}

export async function handleUpdateReviewCandidateMetadataRequest(req, res, reviewId) {
  const body = await readJsonBody(req);
  const item = updateReviewCandidateMetadata(reviewId, body);
  sendJson(res, 200, {
    ok: true,
    item
  });
}

export function handleListApprovedDocumentsRequest(_req, res) {
  const items = listApprovedDocuments();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export function handleApprovedDocumentDetailRequest(_req, res, documentId) {
  const item = getApprovedDocumentDetail(documentId);
  if (!item) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'POLICY_DOCUMENT_NOT_FOUND',
        message: `Policy document not found: ${documentId}`
      }
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    item
  });
}
