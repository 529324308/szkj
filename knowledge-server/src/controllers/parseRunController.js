import { createAndRunParseJob, getAllParseRuns, getParseRunDetail } from '../services/parseRunService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export function handleListParseRunsRequest(_req, res) {
  const items = getAllParseRuns();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleCreateParseRunRequest(req, res) {
  const body = await readJsonBody(req);
  const item = await createAndRunParseJob(body);
  sendJson(res, 201, {
    ok: true,
    item
  });
}

export function handleParseRunDetailRequest(_req, res, parseRunId) {
  const item = getParseRunDetail(parseRunId);
  if (!item) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'PARSE_RUN_NOT_FOUND',
        message: `Parse run not found: ${parseRunId}`
      }
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    item
  });
}
