const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 5173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'project-state.json');
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp4':'video/mp4','.mp3':'audio/mpeg','.webm':'video/webm','.webp':'image/webp','.vtt':'text/vtt; charset=utf-8','.srt':'text/plain; charset=utf-8'};

async function ensureStorage() { await fsp.mkdir(DATA_DIR, {recursive:true}); await fsp.mkdir(UPLOAD_DIR, {recursive:true}); }
async function readState() { try { return JSON.parse(await fsp.readFile(STATE_FILE, 'utf8')); } catch { return null; } }
async function writeState(state) { await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8'); }
function send(res, status, body, type='application/json; charset=utf-8') { res.writeHead(status, {'Content-Type':type, 'Cache-Control':'no-store'}); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); }
function safePath(urlPath) { const resolved = path.resolve(ROOT, '.' + urlPath); return resolved.startsWith(ROOT) ? resolved : null; }
function resourceKind(mime, name) { if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(name)) return 'video'; if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name)) return 'image'; if (mime.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(name)) return 'audio'; return 'subtitle'; }
function parseMultipart(buffer, boundary) {
  const marker = Buffer.from(`--${boundary}`); const parts = []; let start = buffer.indexOf(marker) + marker.length + 2;
  while (start > marker.length) { const end = buffer.indexOf(marker, start); if (end === -1) break; const part = buffer.subarray(start, end - 2); const split = part.indexOf(Buffer.from('\r\n\r\n')); if (split !== -1) { const headers = part.subarray(0, split).toString('utf8'); const content = part.subarray(split + 4); const name = /name="([^"]+)"/.exec(headers)?.[1]; const filename = /filename="([^"]*)"/.exec(headers)?.[1]; const type = /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1] || 'application/octet-stream'; parts.push({name, filename, type, content}); } start = end + marker.length + 2; }
  return parts;
}
function body(req) { return new Promise((resolve, reject) => { const chunks=[]; let size=0; req.on('data', c => { size += c.length; if (size > 1024 * 1024 * 1024) { reject(new Error('文件超过 1GB 限制')); req.destroy(); } else chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); }); }

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/state') return send(res, 200, {state: await readState()});
  if (req.method === 'PUT' && url.pathname === '/api/state') { const payload = JSON.parse((await body(req)).toString('utf8')); await writeState(payload); return send(res, 200, {ok:true, updatedAt:new Date().toISOString()}); }
  if (req.method === 'POST' && url.pathname === '/api/assets') {
    const match = /boundary=([^;]+)/i.exec(req.headers['content-type'] || ''); if (!match) return send(res, 400, {error:'请使用 multipart/form-data 上传'});
    const file = parseMultipart(await body(req), match[1])[0]; if (!file?.filename) return send(res, 400, {error:'未找到文件'});
    const clean = path.basename(file.filename).replace(/[^\w.\-\u4e00-\u9fff]/g, '_'); const storedName = `${crypto.randomUUID()}-${clean}`; await fsp.writeFile(path.join(UPLOAD_DIR, storedName), file.content);
    return send(res, 201, {id:`r-${crypto.randomUUID()}`, name:clean, kind:resourceKind(file.type, clean), info:(file.content.length / 1024 / 1024).toFixed(1) + ' MB', used:'未绑定', url:`/uploads/${encodeURIComponent(storedName)}`});
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/assets/')) { const storedName = path.basename(decodeURIComponent(url.pathname.slice('/api/assets/'.length))); if (storedName && storedName !== '.') { await fsp.unlink(path.join(UPLOAD_DIR, storedName)).catch(()=>{}); } return send(res, 200, {ok:true}); }
  return send(res, 404, {error:'API 不存在'});
}

const server = http.createServer(async (req, res) => {
  try { const url = new URL(req.url, `http://${req.headers.host}`); if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    const requested = url.pathname === '/' ? '/index.html' : url.pathname; const file = safePath(requested); if (!file) return send(res, 403, 'Forbidden', 'text/plain');
    const content = await fsp.readFile(file); return send(res, 200, content, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
  } catch (error) { if (error.code === 'ENOENT') return send(res, 404, 'Not found', 'text/plain'); console.error(error); return send(res, 500, {error:'服务器内部错误'}); }
});
ensureStorage().then(() => server.listen(PORT, () => console.log(`Interactive Video Engine running at http://localhost:${PORT}`)));
