import http from 'node:http';
import { env } from './config/env.js';
import { handleCrawlerRoute } from './routes/crawler.js';
import { handleHealthRoute } from './routes/health.js';
import { handleKnowledgeRoute } from './routes/knowledge.js';
import { handleRagflowRoute } from './routes/ragflow.js';
import { handleReviewRoute } from './routes/review.js';
import { sendNotFound, sendServerError } from './utils/http.js';
import { logger } from './utils/logger.js';
import { ensureStorageLayout } from './services/storageBootstrapService.js';

async function requestListener(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${env.host}:${env.port}`}`);
  const pathname = url.pathname;
  const query = url.searchParams;

  if (pathname === '/api/health') {
    await handleHealthRoute(req, res);
    return;
  }

  if (pathname === '/api/knowledge/health') {
    await handleKnowledgeRoute(req, res, pathname);
    return;
  }

  if (pathname === '/api/knowledge/chat' || pathname === '/api/knowledge/models') {
    await handleKnowledgeRoute(req, res, pathname);
    return;
  }

  if (
    pathname === '/api/crawler/sources' ||
    pathname.startsWith('/api/crawler/sources/') ||
    pathname === '/api/crawler/jobs' ||
    pathname.startsWith('/api/crawler/jobs/') ||
    pathname === '/api/crawler/parse-runs' ||
    pathname.startsWith('/api/crawler/parse-runs/')
  ) {
    await handleCrawlerRoute(req, res, pathname);
    return;
  }

  if (
    pathname === '/api/review/policies' ||
    pathname === '/api/review/policies/from-parse-run' ||
    pathname.startsWith('/api/review/policies/') ||
    pathname === '/api/review/documents' ||
    pathname.startsWith('/api/review/documents/')
  ) {
    await handleReviewRoute(req, res, pathname, query);
    return;
  }

  if (
    pathname === '/api/ragflow/health' ||
    pathname === '/api/ragflow/datasets' ||
    pathname === '/api/ragflow/sync-preview' ||
    pathname === '/api/ragflow/remote-datasets' ||
    pathname === '/api/ragflow/ensure-datasets' ||
    pathname === '/api/ragflow/sync-documents' ||
    pathname === '/api/ragflow/sync-records'
  ) {
    await handleRagflowRoute(req, res, pathname);
    return;
  }

  sendNotFound(res, pathname);
}

const storageLayout = ensureStorageLayout();
logger.info('Storage layout ensured.', storageLayout);

const server = http.createServer((req, res) => {
  Promise.resolve(requestListener(req, res)).catch((error) => {
    logger.error('Unhandled request error.', {
      message: error?.message || 'Unknown error'
    });
    sendServerError(res, error);
  });
});

server.listen(env.port, env.host, () => {
  logger.info('knowledge-server listening.', {
    url: `http://${env.host}:${env.port}`
  });
});

server.on('error', (error) => {
  logger.error('knowledge-server failed to start.', {
    message: error?.message || 'Unknown error'
  });
  process.exitCode = 1;
});
