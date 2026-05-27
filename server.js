/**
 * Dev server M&A Elo — serve ficheiros estáticos + proxy Neon (resolve CORS)
 * Uso: node server.js
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT      = 8080;
const NEON_HOST = 'ep-dry-term-alu2f51d.c-3.eu-central-1.aws.neon.tech';
const ROOT      = __dirname;

const MIME = {
  '.html':'.html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff',
  '.ttf':'font/ttf','.pdf':'application/pdf',
};
function mime(ext){ return MIME[ext]||'application/octet-stream'; }
function ct(ext){ return ext==='.html'?'text/html; charset=utf-8':mime(ext); }

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);

  // ── CORS universal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Neon-Connection-String');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Proxy → Neon SQL API
  if (parsed.pathname === '/neon-proxy' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const connStr = req.headers['neon-connection-string'] || '';
      const opts = {
        hostname: NEON_HOST, port: 443, path: '/sql', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Neon-Connection-String': connStr,
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const pr = https.request(opts, nr => {
        let data = '';
        nr.on('data', c => data += c);
        nr.on('end', () => {
          res.writeHead(nr.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      pr.on('error', e => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
      pr.write(body);
      pr.end();
    });
    return;
  }

  // ── Ficheiros estáticos
  let fp = path.join(ROOT, parsed.pathname === '/' ? 'index.html' : parsed.pathname);
  fs.stat(fp, (err, stat) => {
    if (err || !stat || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — ficheiro não encontrado: ' + parsed.pathname);
      return;
    }
    res.writeHead(200, { 'Content-Type': ct(path.extname(fp)) });
    fs.createReadStream(fp).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✓  M&A Elo · Servidor a correr');
  console.log('');
  console.log('  Painel admin  →  http://localhost:' + PORT + '/admin.html');
  console.log('  Site          →  http://localhost:' + PORT + '/index.html');
  console.log('');
  console.log('  (Ctrl+C para parar)');
  console.log('');
});
