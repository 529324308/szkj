import { handleHealthRequest } from '../controllers/healthController.js';
import { sendMethodNotAllowed } from '../utils/http.js';

export async function handleHealthRoute(req, res) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, req.method, '/api/health');
    return;
  }

  await handleHealthRequest(req, res);
}
