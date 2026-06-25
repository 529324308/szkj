import {
  handleApproveReviewCandidateRequest,
  handleApprovedDocumentDetailRequest,
  handleCreateReviewCandidatesRequest,
  handleListApprovedDocumentsRequest,
  handleListReviewCandidatesRequest,
  handleMarkDuplicateRequest,
  handleRejectReviewCandidateRequest,
  handleReviewCandidateDetailRequest,
  handleUpdateReviewCandidateMetadataRequest
} from '../controllers/reviewController.js';
import { sendMethodNotAllowed, sendNotFound } from '../utils/http.js';

const REVIEW_COLLECTION_PATH = '/api/review/policies';
const REVIEW_FROM_PARSE_PATH = '/api/review/policies/from-parse-run';
const REVIEW_DETAIL_PREFIX = '/api/review/policies/';
const APPROVED_COLLECTION_PATH = '/api/review/documents';
const APPROVED_DETAIL_PREFIX = '/api/review/documents/';

export async function handleReviewRoute(req, res, pathname, query) {
  if (pathname === REVIEW_COLLECTION_PATH) {
    if (req.method === 'GET') {
      handleListReviewCandidatesRequest(req, res, query);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === REVIEW_FROM_PARSE_PATH) {
    if (req.method === 'POST') {
      await handleCreateReviewCandidatesRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === APPROVED_COLLECTION_PATH) {
    if (req.method === 'GET') {
      handleListApprovedDocumentsRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname.startsWith(APPROVED_DETAIL_PREFIX)) {
    const documentId = pathname.slice(APPROVED_DETAIL_PREFIX.length).trim();
    if (!documentId) {
      sendNotFound(res, pathname);
      return;
    }
    if (req.method === 'GET') {
      handleApprovedDocumentDetailRequest(req, res, documentId);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname.startsWith(REVIEW_DETAIL_PREFIX)) {
    const subPath = pathname.slice(REVIEW_DETAIL_PREFIX.length).trim();
    if (!subPath) {
      sendNotFound(res, pathname);
      return;
    }

    const parts = subPath.split('/').filter(Boolean);
    const reviewId = parts[0];
    const action = parts[1] || '';

    if (!action && req.method === 'GET') {
      handleReviewCandidateDetailRequest(req, res, reviewId);
      return;
    }

    if (action === 'metadata' && req.method === 'PATCH') {
      await handleUpdateReviewCandidateMetadataRequest(req, res, reviewId);
      return;
    }

    if (action === 'approve' && req.method === 'POST') {
      await handleApproveReviewCandidateRequest(req, res, reviewId);
      return;
    }

    if (action === 'reject' && req.method === 'POST') {
      await handleRejectReviewCandidateRequest(req, res, reviewId);
      return;
    }

    if (action === 'mark-duplicate' && req.method === 'POST') {
      await handleMarkDuplicateRequest(req, res, reviewId);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  sendNotFound(res, pathname);
}
