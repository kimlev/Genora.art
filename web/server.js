const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const projectJsonPath = path.join(projectRoot, 'project.json');
const anamnesisPath = path.join(projectRoot, 'anamnesis.json');
const publishScript = path.join(projectRoot, 'scripts', 'publish-github.sh');
const publicDir = path.join(__dirname, 'public');

let publishState = { status: 'idle' };

function readPort() {
  if (process.env.PORT) {
    const n = Number(process.env.PORT);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  try {
    const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    if (project.port) return Number(project.port);
  } catch (_) {}
  return 3300;
}

const PORT = readPort();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readProject() {
  return JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
}

function publicizeUrl(url, req) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/')) return url;
  const hostHeader = req.headers.host || `127.0.0.1:${PORT}`;
  const hostname = hostHeader.split(':')[0];
  return url
    .replace(/http:\/\/localhost(?=[:/]|$)/g, `http://${hostname}`)
    .replace(/http:\/\/127\.0\.0\.1(?=[:/]|$)/g, `http://${hostname}`);
}

function publicizeLinks(links, req) {
  return (Array.isArray(links) ? links : []).map((item) => ({
    ...item,
    url: publicizeUrl(item.url, req),
  }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(publicDir, urlPath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function maybePublish(description) {
  const desc = (description || '').trim();
  if (!desc) return;

  let project;
  try {
    project = readProject();
  } catch (_) {
    return;
  }
  if (project.github && project.github.url) return;
  if (publishState.status === 'pending') return;

  publishState = { status: 'pending' };
  console.log('publish-github: запуск…');

  const child = spawn('bash', [publishScript], {
    cwd: projectRoot,
    env: process.env,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => {
    stdout += d.toString();
    process.stdout.write(d);
  });
  child.stderr.on('data', (d) => {
    stderr += d.toString();
    process.stderr.write(d);
  });
  child.on('close', (code) => {
    try {
      const updated = readProject();
      if (updated.github && updated.github.url) {
        publishState = { status: 'ok', github: updated.github };
        console.log('publish-github: готово', updated.github.url);
        return;
      }
    } catch (_) {}

    if (code === 0) {
      const url = stdout.trim().split('\n').filter(Boolean).pop();
      publishState = url
        ? { status: 'ok', github: { url, private: true } }
        : { status: 'error', error: 'Скрипт завершился без URL' };
    } else {
      const hint = stderr.trim() || `код выхода ${code}`;
      publishState = {
        status: 'error',
        error: hint.includes('gh')
          ? `${hint}. Проверьте: brew install gh && gh auth login`
          : hint,
      };
      console.error('publish-github: ошибка', publishState.error);
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/api/anamnesis' && req.method === 'GET') {
    try {
      const raw = fs.readFileSync(anamnesisPath, 'utf8');
      return sendJson(res, 200, JSON.parse(raw));
    } catch (e) {
      return sendJson(res, 500, { error: 'Не удалось прочитать anamnesis.json' });
    }
  }

  if (url === '/api/anamnesis' && req.method === 'POST') {
    try {
      const text = await readBody(req);
      const payload = JSON.parse(text || '{}');
      const next = {
        description: payload.description ?? null,
        competitors: Array.isArray(payload.competitors) ? payload.competitors : [],
        priorities: payload.priorities ?? null,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(anamnesisPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
      setImmediate(() => maybePublish(next.description));
      return sendJson(res, 200, next);
    } catch (e) {
      return sendJson(res, 400, { error: 'Не удалось сохранить anamnesis.json' });
    }
  }

  if (url === '/api/project' && req.method === 'GET') {
    try {
      const project = readProject();
      return sendJson(res, 200, {
        name: project.name || null,
        slug: project.slug || null,
        github: project.github || null,
        links: publicizeLinks(project.links, req),
      });
    } catch (e) {
      return sendJson(res, 500, { error: 'Не удалось прочитать project.json' });
    }
  }

  if (url === '/api/github' && req.method === 'GET') {
    try {
      const project = readProject();
      if (project.github && project.github.url) {
        return sendJson(res, 200, {
          status: 'ok',
          github: project.github,
          links: publicizeLinks(project.links, req),
        });
      }
    } catch (_) {}
    if (publishState.status === 'pending') {
      return sendJson(res, 200, { status: 'pending' });
    }
    if (publishState.status === 'error') {
      return sendJson(res, 200, {
        status: 'error',
        error: publishState.error || 'Ошибка публикации',
      });
    }
    if (publishState.status === 'ok' && publishState.github) {
      return sendJson(res, 200, {
        status: 'ok',
        github: publishState.github,
        links: [],
      });
    }
    return sendJson(res, 200, { status: 'idle' });
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res);
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Агрегатор нейросетей: http://${HOST}:${PORT}`);
});
