import {
  createPolicySource,
  getAllPolicySources,
  getPolicySourceDetail
} from '../services/policySourceService.js';
import { sendJson } from '../utils/http.js';
import { readJsonBody } from '../utils/requestBody.js';

export function handleListPolicySourcesRequest(_req, res) {
  const items = getAllPolicySources();
  sendJson(res, 200, {
    ok: true,
    total: items.length,
    items
  });
}

export async function handleCreatePolicySourceRequest(req, res) {
  const body = await readJsonBody(req);
  const item = createPolicySource(body);
  sendJson(res, 201, {
    ok: true,
    item
  });
}

export function handlePolicySourceDetailRequest(_req, res, sourceId) {
  const item = getPolicySourceDetail(sourceId);

  if (!item) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: 'POLICY_SOURCE_NOT_FOUND',
        message: `Policy source not found: ${sourceId}`
      }
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    item
  });
}
