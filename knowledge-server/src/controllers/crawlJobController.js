import { createAndRunCrawlJob, getAllCrawlJobs, getCrawlJobDetail } from '../services/crawlerJobService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export function handleListCrawlJobsRequest(_req, res) {
  const items = getAllCrawlJobs();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleCreateCrawlJobRequest(req, res) {
  const body = await readJsonBody(req);
  const job = await createAndRunCrawlJob(body);
  sendJson(res, 201, {
    ok: true,
    item: job
  });
}

export function handleCrawlJobDetailRequest(_req, res, jobId) {
  const item = getCrawlJobDetail(jobId);

  if (!item) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'CRAWL_JOB_NOT_FOUND',
        message: `Crawl job not found: ${jobId}`
      }
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    item
  });
}
