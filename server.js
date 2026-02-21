const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- Metrics ---

function getCpuUsage() {
  return new Promise((resolve) => {
    function parseStat() {
      const line = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0];
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + (parts[4] || 0);
      const total = parts.reduce((a, b) => a + b, 0);
      return { idle, total };
    }
    const t1 = parseStat();
    setTimeout(() => {
      const t2 = parseStat();
      const idleDelta = t2.idle - t1.idle;
      const totalDelta = t2.total - t1.total;
      const usage = totalDelta === 0 ? 0 : Math.round((1 - idleDelta / totalDelta) * 100);
      resolve(usage);
    }, 500);
  });
}

function getZpools() {
  return new Promise((resolve) => {
    exec('zpool list -H -p -o name,size,alloc,free,cap,health', (err, stdout) => {
      if (err || !stdout.trim()) return resolve([]);
      const pools = stdout.trim().split('\n').map(line => {
        const [name, size, alloc, free, cap, health] = line.split('\t');
        return {
          name,
          size: parseInt(size),
          alloc: parseInt(alloc),
          free: parseInt(free),
          cap: parseInt(cap),
          health: health.trim(),
        };
      });
      resolve(pools);
    });
  });
}

function getUpdates() {
  return new Promise((resolve) => {
    exec('apt list --upgradable 2>/dev/null', (err, stdout) => {
      const lines = stdout.trim().split('\n').filter(l => l.includes('/'));
      const security = lines.filter(l => l.includes('security'));
      resolve({
        total: lines.length,
        security: security.length,
        securityPackages: security.slice(0, 20).map(l => l.split('/')[0]),
      });
    });
  });
}

function getSystemInfo() {
  return {
    hostname: os.hostname(),
    uptime: os.uptime(),
    loadavg: os.loadavg().map(n => n.toFixed(2)),
    ram: {
      total: os.totalmem(),
      free: os.freemem(),
    },
  };
}

// --- HTTP Server ---

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

async function handleStats(res) {
  try {
    const [cpu, pools, updates] = await Promise.all([
      getCpuUsage(),
      getZpools(),
      getUpdates(),
    ]);
    const data = { cpu, pools, updates, system: getSystemInfo(), timestamp: new Date().toISOString() };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

function serveStatic(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(PUBLIC_DIR, urlPath);
  const ext = path.extname(filePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end();
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/stats' && req.method === 'GET') {
    handleStats(res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server monitor running at http://0.0.0.0:${PORT}`);
});
