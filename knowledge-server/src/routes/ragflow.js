import {
  handleRagflowCreateRemoteDatasetRequest,
  handleRagflowDatasetListRequest,
  handleRagflowEnsureDatasetsRequest,
  handleRagflowHealthRequest,
  handleRagflowRemoteDatasetListRequest,
  handleRagflowSyncApprovedDocumentsRequest,
  handleRagflowSyncPreviewRequest
  ,
  handleRagflowSyncRecordListRequest
} from '../controllers/ragflowController.js';
import { sendMethodNotAllowed, sendNotFound } from '../utils/http.js';

export async function handleRagflowRoute(req, res, pathname) {
  if (pathname === '/api/ragflow/health') {
    if (req.method === 'GET') {
      await handleRagflowHealthRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/datasets') {
    if (req.method === 'GET') {
      handleRagflowDatasetListRequest(req, res);
      return;
    }
    if (req.method === 'POST') {
      await handleRagflowCreateRemoteDatasetRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/sync-preview') {
    if (req.method === 'GET') {
      handleRagflowSyncPreviewRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/remote-datasets') {
    if (req.method === 'GET') {
      await handleRagflowRemoteDatasetListRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/ensure-datasets') {
    if (req.method === 'POST') {
      await handleRagflowEnsureDatasetsRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/sync-records') {
    if (req.method === 'GET') {
      handleRagflowSyncRecordListRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  if (pathname === '/api/ragflow/sync-documents') {
    if (req.method === 'POST') {
      await handleRagflowSyncApprovedDocumentsRequest(req, res);
      return;
    }
    sendMethodNotAllowed(res, req.method, pathname);
    return;
  }

  sendNotFound(res, pathname);
}
