import net from 'node:net';
import { URL } from 'node:url';
import { env } from '../config/env.js';
import { getStorageLayoutStatus } from './storageBootstrapService.js';

function tcpCheck(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finalize({ ok: true }));
    socket.once('timeout', () => finalize({ ok: false, reason: 'timeout' }));
    socket.once('error', (error) => finalize({ ok: false, reason: error.message }));
    socket.connect(port, host);
  });
}

async function checkPostgres() {
  if (!env.postgresUrl) {
    return {
      status: 'not_configured',
      message: 'POSTGRES_URL is empty.'
    };
  }

  try {
    const url = new URL(env.postgresUrl);
    const host = url.hostname;
    const port = Number(url.port) || 5432;
    const tcp = await tcpCheck(host, port);

    return tcp.ok
      ? {
          status: 'up',
          host,
          port,
          message: 'TCP connection accepted.'
        }
      : {
          status: 'unreachable',
          host,
          port,
          message: tcp.reason || 'Unable to connect.'
        };
  } catch (error) {
    return {
      status: 'invalid_config',
      message: error.message
    };
  }
}

async function checkMinio() {
  if (!env.minioEndpoint || !env.minioBucket) {
    return {
      status: 'not_configured',
      message: 'MINIO_ENDPOINT or MINIO_BUCKET is empty.'
    };
  }

  try {
    const endpoint = new URL(env.minioEndpoint);
    const healthUrl = new URL('/minio/health/live', endpoint).toString();
    const host = endpoint.hostname;
    const port = Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80);
    const tcp = await tcpCheck(host, port);

    if (!tcp.ok) {
      return {
        status: 'unreachable',
        host,
        port,
        message: tcp.reason || 'Unable to connect.'
      };
    }

    const response = await fetch(healthUrl, { method: 'GET' });
    return {
      status: response.ok ? 'up' : 'degraded',
      host,
      port,
      bucket: env.minioBucket,
      message: response.ok ? 'MinIO health endpoint responded.' : `MinIO responded with HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      status: 'invalid_config',
      message: error.message
    };
  }
}

export async function getStorageHealthSnapshot() {
  const [postgres, minio] = await Promise.all([checkPostgres(), checkMinio()]);
  const localStorage = getStorageLayoutStatus();

  return {
    localStorage: {
      status: localStorage.directories.every((item) => item.exists) ? 'up' : 'degraded',
      ...localStorage
    },
    postgres,
    minio
  };
}
