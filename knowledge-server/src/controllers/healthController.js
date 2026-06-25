import { getHealthSnapshot } from '../services/healthService.js';
import { sendJson } from '../utils/http.js';

export async function handleHealthRequest(_req, res) {
  const snapshot = await getHealthSnapshot();
  sendJson(res, 200, snapshot);
}
