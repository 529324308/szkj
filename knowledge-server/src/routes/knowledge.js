import { handleKnowledgeChatRequest, handleKnowledgeModelsRequest } from '../controllers/knowledgeController.js';
import { sendJson, sendMethodNotAllowed, sendNotFound } from '../utils/http.js';

export function handleKnowledgeHealthRoute(req, res) {
  if (req.method !== 'GET') {
    sendMethodNotAllowed(res, req.method, '/api/knowledge/health');
    return;
  }

  sendJson(res, 200, {
    ok: true,
    service: 'knowledge',
    message: 'Knowledge route scaffold is ready.',
    nextStep: 'Implement chat, search, and preview endpoints in M1/T2-T4.'
  });
}

export async function handleKnowledgeRoute(req, res, pathname) {
  if (pathname === '/api/knowledge/health') {
    handleKnowledgeHealthRoute(req, res);
    return;
  }

  if (pathname === '/api/knowledge/models') {
    if (req.method !== 'GET') {
      sendMethodNotAllowed(res, req.method, pathname);
      return;
    }
    await handleKnowledgeModelsRequest(req, res);
    return;
  }

  if (pathname === '/api/knowledge/chat') {
    if (req.method !== 'POST') {
      sendMethodNotAllowed(res, req.method, pathname);
      return;
    }
    await handleKnowledgeChatRequest(req, res);
    return;
  }

  sendNotFound(res, pathname);
}
