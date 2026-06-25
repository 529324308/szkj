export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

export function sendBadRequest(res, message, details = []) {
  sendJson(res, 400, {
    ok: false,
    error: {
      code: 'BAD_REQUEST',
      message,
      details
    }
  });
}

export function sendServerError(res, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  sendJson(res, statusCode, {
    ok: false,
    error: {
      code: error?.code || 'INTERNAL_SERVER_ERROR',
      message: error?.message || 'Unexpected server error',
      details: Array.isArray(error?.details) ? error.details : undefined
    }
  });
}

export function sendNotFound(res, pathname) {
  sendJson(res, 404, {
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${pathname}`
    }
  });
}

export function sendMethodNotAllowed(res, method, pathname) {
  sendJson(res, 405, {
    ok: false,
    error: {
      code: 'METHOD_NOT_ALLOWED',
      message: `Method ${method} is not allowed for ${pathname}`
    }
  });
}
