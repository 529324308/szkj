import {
  handleCreateCrawlJobRequest,
  handleCrawlJobDetailRequest,
  handleListCrawlJobsRequest
} from '../controllers/crawlJobController.js';
import {
  handleCreateParseRunRequest,
  handleListParseRunsRequest,
  handleParseRunDetailRequest
} from '../controllers/parseRunController.js';
import {
  handleCreatePolicySourceRequest,
  handleListPolicySourcesRequest,
  handlePolicySourceDetailRequest
} from '../controllers/crawlerController.js';
import { sendMethodNotAllowed, sendNotFound } from '../utils/http.js';

const JOB_COLLECTION_PATH = '/api/crawler/jobs';
const JOB_DETAIL_PREFIX = '/api/crawler/jobs/';
const PARSE_COLLECTION_PATH = '/api/crawler/parse-runs';
const PARSE_DETAIL_PREFIX = '/api/crawler/parse-runs/';
const SOURCE_COLLECTION_PATH = '/api/crawler/sources';
const SOURCE_DETAIL_PREFIX = '/api/crawler/sources/';

export async function handleCrawlerRoute(req, res, pathname) {
  if (pathname === JOB_COLLECTION_PATH) {
    if (req.method === 'GET') {
      handleListCrawlJobsRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      await handleCreateCrawlJobRequest(req, res);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === PARSE_COLLECTION_PATH) {
    if (req.method === 'GET') {
      handleListParseRunsRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      await handleCreateParseRunRequest(req, res);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname.startsWith(PARSE_DETAIL_PREFIX)) {
    const parseRunId = pathname.slice(PARSE_DETAIL_PREFIX.length).trim();
    if (!parseRunId) {
      sendNotFound(res, pathname);
      return;
    }

    if (req.method === 'GET') {
      handleParseRunDetailRequest(req, res, parseRunId);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname.startsWith(JOB_DETAIL_PREFIX)) {
    const jobId = pathname.slice(JOB_DETAIL_PREFIX.length).trim();
    if (!jobId) {
      sendNotFound(res, pathname);
      return;
    }

    if (req.method === 'GET') {
      handleCrawlJobDetailRequest(req, res, jobId);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === SOURCE_COLLECTION_PATH) {
    if (req.method === 'GET') {
      handleListPolicySourcesRequest(req, res);
      return;
    }

    if (req.method === 'POST') {
      await handleCreatePolicySourceRequest(req, res);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname.startsWith(SOURCE_DETAIL_PREFIX)) {
    const sourceId = pathname.slice(SOURCE_DETAIL_PREFIX.length).trim();
    if (!sourceId) {
      sendNotFound(res, pathname);
      return;
    }

    if (req.method === 'GET') {
      handlePolicySourceDetailRequest(req, res, sourceId);
      return;
    }

    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  sendNotFound(res, pathname);
}
