#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = process.cwd();
const args = new Map(process.argv.slice(2).flatMap(arg => {
  const [k, v] = arg.split('=');
  if (k && v) return [[k.replace(/^--/, ''), v]];
  if (k?.startsWith('--')) return [[k.replace(/^--/, ''), 'true']];
  return [];
}));

const port = Number(args.get('port') || process.env.PORT || 5173);
const host = args.get('host') || '0.0.0.0';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mime[ext] || 'application/octet-stream';
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  if (body && (body.pipe)) return body.pipe(res);
  res.end(body);
}

function serveFile(filePath, res) {
  fs.stat(filePath, (err, stats) => {
    if (err) return send(res, 404, 'Not found');
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (e2) => {
        if (e2) return send(res, 403, 'Forbidden');
        return serveFile(indexPath, res);
      });
      return;
    }
    const type = contentType(filePath);
    send(res, 200, fs.createReadStream(filePath), { 'Content-Type': type });
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
    let safePath = path.normalize(urlPath).replace(/^\/+/, '');
    if (safePath === '') safePath = 'landing.html';
    const filePath = path.join(root, safePath);
    if (!filePath.startsWith(root)) return send(res, 403, 'Forbidden');
    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) return serveFile(filePath, res);
      // Try HTML fallback
      const htmlFallback = path.join(root, 'index.html');
      fs.stat(htmlFallback, (e2, st2) => {
        if (!e2 && st2.isFile()) return serveFile(htmlFallback, res);
        return send(res, 404, 'Not found');
      });
    });
  } catch (e) {
    send(res, 500, 'Server error');
  }
});

server.listen(port, host, () => {
  const ifaces = os.networkInterfaces();
  const addrs = Object.values(ifaces)
    .flat()
    .filter(Boolean)
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
  console.log(`Serving ${root}`);
  console.log(`Local:   http://localhost:${port}/landing.html`);
  addrs.forEach(ip => console.log(`Network: http://${ip}:${port}/landing.html`));
  console.log('\nTip: open the Network URL on your phone (same Wi‑Fi).');
});

