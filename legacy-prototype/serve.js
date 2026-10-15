const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  const filePath = path.join(BASE_DIR, cleanUrl);

  // Security: Prevent directory traversal outside BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;text-align:center;padding:5rem;">
          <h1 style="color:#2563eb;">Dispatch Not Found (404)</h1>
          <p>The requested StyleVault intelligence feed is not available.</p>
          <a href="/" style="color:#38bdf8;">Return to Africa-Wide Feed</a>
        </body>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

let currentPort = Number(process.env.PORT) || 3000;

function startServer(port) {
  server.listen(port, () => {
    console.log('\n================================================================');
    console.log('  ✦ STYLEVAULT: PAN-AFRICAN NEWS & INTELLIGENCE PLATFORM ✦');
    console.log('================================================================');
    console.log(`\n  Platform Live at:             http://localhost:${port}`);
    console.log('\n  Press Ctrl+C to stop local news server.\n');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Notice: Port ${currentPort} is currently occupied. Trying http://localhost:${currentPort + 1}...`);
    currentPort += 1;
    startServer(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

startServer(currentPort);
