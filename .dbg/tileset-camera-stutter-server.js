import http from 'http';
import fs from 'fs';
import path from 'path';

const sessionId = 'tileset-camera-stutter';
const outdir = process.cwd().includes('.dbg') ? process.cwd() : path.join(process.cwd(), '.dbg');
const port = 7778;
const logFile = path.join(outdir, `trae-debug-log-${sessionId}.ndjson`);
const envFile = path.join(outdir, `${sessionId}.env`);

fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(logFile, '');
fs.writeFileSync(envFile, `DEBUG_SERVER_URL=http://127.0.0.1:${port}/event\nDEBUG_SESSION_ID=${sessionId}\n`, 'utf8');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessionId, logFile }));
    return;
  }

  if (req.method === 'DELETE' && req.url === '/logs') {
    fs.writeFileSync(logFile, '');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload.ts) payload.ts = Date.now();
        fs.appendFileSync(logFile, `${JSON.stringify(payload)}\n`, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(error?.message || error));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(JSON.stringify({
    sessionId,
    port,
    apiUrl: `http://127.0.0.1:${port}/event`,
    logFile,
    envFile,
  }));
});
