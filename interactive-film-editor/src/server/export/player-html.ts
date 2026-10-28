import type { ProjectDoc } from "@/domain/project/schema";

/**
 * 生成独立播放器 HTML：内嵌项目 JSON + 一份零依赖运行时代码（原生 JS）。
 * 不是把 Next 产物搬过去，而是「数据 + 轻量播放器」——体积小、双击就能看。
 */
// 该函数主体是 HTML/CSS/JS 模板字符串（无分支逻辑），按行数拆分反而更难维护，
// 因此豁免 max-lines-per-function；模板里的脚本是导出包唯一运行时，改动需配套 e2e。
// eslint-disable-next-line max-lines-per-function
export function buildPlayerHtml(doc: ProjectDoc): string {
  const title = escapeHtml(doc.name || "互动影游");
  const payload = JSON.stringify(doc).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #0b0b0d; color: #fff; font-family: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif; }
  #stage { position: relative; width: 100vw; height: 100vh; overflow: hidden; margin: 0 auto; }
  #canvas { position: absolute; top: 0; left: 0; transform-origin: top left; }
  .node { position: absolute; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .node img, .node video { width: 100%; height: 100%; object-fit: cover; }
  #choices { position: absolute; left: 0; right: 0; bottom: 8%; display: flex; flex-direction: column; gap: 12px; align-items: center; z-index: 9; }
  .choice { min-width: 320px; padding: 12px 18px; border: 1px solid #ffffff2e; border-radius: 8px; background: rgba(16,16,18,.78); color: #fff; font-size: 18px; letter-spacing: .06em; cursor: pointer; backdrop-filter: blur(10px); }
  .choice:hover { border-color: #c9a84c; color: #f0d060; }
  #qte { position: absolute; inset: 0; display: none; place-items: center; z-index: 9; }
  #qte button { width: 104px; height: 104px; border-radius: 50%; border: 2px solid #c9a84c; background: radial-gradient(circle at 50% 40%, #c9a84c33, transparent 70%); color: #f0d060; font-size: 18px; cursor: pointer; }
  #hud { position: fixed; top: 10px; left: 12px; font-size: 11px; color: #ffffff61; letter-spacing: .08em; z-index: 20; }
</style>
</head>
<body>
<div id="stage"><div id="canvas"></div><div id="choices"></div><div id="qte"><button id="qte-btn">点击</button></div></div>
<div id="hud"></div>
<script>
const DOC = ${payload};
const canvas = document.getElementById('canvas');
const choices = document.getElementById('choices');
const qte = document.getElementById('qte');
const qteBtn = document.getElementById('qte-btn');
const hud = document.getElementById('hud');

let state = { sceneId: DOC.start.sceneId, elapsed: 0, hits: 0, running: true };

function sceneOf(id) { return DOC.scenes.find(s => s.id === id); }
function layoutOf(scene) { const list = (DOC.layouts && DOC.layouts.shared) || []; return list.find(l => l.id === (scene && scene.layoutId)) || list[0]; }
function tokens() { return (DOC.theme && DOC.theme.tokens) || {}; }

function anchor(node, side, axisSize, parentBox) {
  const a = node.anchors && node.anchors[side];
  if (!a) return null;
  const base = a.unit === '%' ? (axisSize * a.value) / 100 : a.value;
  return base + (a.offset || 0);
}

function boxOf(node, parent) {
  const left = anchor(node, 'left', parent.width, parent);
  const right = anchor(node, 'right', parent.width, parent);
  const top = anchor(node, 'top', parent.height, parent);
  const bottom = anchor(node, 'bottom', parent.height, parent);
  const width = left != null && right != null ? parent.width - left - right : (node.size && node.size.width) || undefined;
  const height = top != null && bottom != null ? parent.height - top - bottom : (node.size && node.size.height) || undefined;
  return {
    x: left != null ? left : (right != null && width != null ? parent.width - right - width : 0),
    y: top != null ? top : (bottom != null && height != null ? parent.height - bottom - height : 0),
    width: width != null ? width : parent.width,
    height: height != null ? height : parent.height,
  };
}

function contentOf(node) {
  const c = node.content;
  if (!c) return '';
  if (c.kind === 'literal') return String(c.value == null ? '' : c.value);
  if (c.kind === 'binding') return String(c.expr || '');
  return '';
}

function assetSrc(id) {
  const a = DOC.assets || {};
  const hit = (a.videos && a.videos[id]) || (a.images && a.images[id]) || (a.audio && a.audio[id]);
  return hit ? 'assets/' + hit.src.split('/').pop() : undefined;
}

function renderNode(node, parent, container) {
  const box = boxOf(node, parent);
  const el = document.createElement('div');
  el.className = 'node';
  el.style.left = box.x + 'px';
  el.style.top = box.y + 'px';
  el.style.width = box.width + 'px';
  el.style.height = box.height + 'px';
  el.style.zIndex = node.z || 0;
  const s = node.style || {};
  const val = (key) => s[key] && (s[key].kind === 'literal' ? s[key].value : undefined);
  if (val('color')) el.style.color = val('color');
  if (val('backgroundColor')) el.style.background = val('backgroundColor');
  if (val('fontSize')) el.style.fontSize = val('fontSize') + 'px';
  if (val('fontWeight')) el.style.fontWeight = String(val('fontWeight'));
  if (val('textAlign')) el.style.alignItems = val('textAlign') === 'center' ? 'center' : val('textAlign') === 'right' ? 'flex-end' : 'flex-start';
  if (val('borderRadius')) el.style.borderRadius = val('borderRadius') + 'px';

  if (node.type === 'video') {
    const src = assetSrc(contentOf(node));
    if (src) { const v = document.createElement('video'); v.src = src; v.muted = true; v.autoplay = true; v.loop = true; v.playsInline = true; el.appendChild(v); }
  } else if (node.type === 'image') {
    const src = assetSrc(contentOf(node));
    if (src) { const img = document.createElement('img'); img.src = src; el.appendChild(img); }
  } else if (node.type !== 'group') {
    const text = contentOf(node);
    if (text) { const span = document.createElement('span'); span.textContent = text; el.appendChild(span); }
  }
  (node.children || []).sort((a, b) => (a.z || 0) - (b.z || 0)).forEach((child) => renderNode(child, box, el));
  container.appendChild(el);
}

function renderScene() {
  const scene = sceneOf(state.sceneId);
  canvas.innerHTML = '';
  choices.innerHTML = '';
  qte.style.display = 'none';
  if (!scene) { hud.textContent = '场景不存在'; return; }
  const layout = layoutOf(scene);
  const W = DOC.canvas.width, H = DOC.canvas.height;
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  canvas.style.transform = 'scale(' + scale + ')';
  const root = layout && layout.root;
  if (root) renderNode(root, { x: 0, y: 0, width: W, height: H }, canvas);
  const bg = parseFloat(tokens().background ? '0' : '0');
  hud.textContent = (scene.displayTitle || scene.title || scene.id) + ' · ' + scene.flow.kind;

  if (scene.flow.kind === 'choice') {
    (scene.flow.choices || []).forEach((choice) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = choice.text || '选项';
      b.onclick = () => go(choice.nextSceneId);
      choices.appendChild(b);
    });
  } else if (scene.flow.kind === 'menu') {
    (scene.flow.items || []).forEach((item) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = item.label || '菜单项';
      b.onclick = () => { if (item.action && item.action.sceneId) go(item.action.sceneId); };
      choices.appendChild(b);
    });
  } else if (scene.flow.kind === 'ending') {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = '重新开始';
    b.onclick = () => go(DOC.start.sceneId);
    choices.appendChild(b);
  } else if (scene.flow.kind === 'settlement' && scene.flow.nextChapterNodeId) {
    const b = document.createElement('button');
    b.className = 'choice';
    b.textContent = scene.flow.nextBtnText || '下一章';
    b.onclick = () => go(scene.flow.nextChapterNodeId);
    choices.appendChild(b);
  } else if (scene.flow.kind === 'qte') {
    const action = (scene.flow.qtes || [])[0];
    if (action) {
      qte.style.display = 'grid';
      const required = action.required || action.threshold || 1;
      state.hits = 0;
      qteBtn.textContent = '0/' + required;
      qteBtn.onclick = () => {
        state.hits += 1;
        qteBtn.textContent = state.hits + '/' + required;
        if (state.hits >= required) go(action.onSuccess && action.onSuccess.nextSceneId);
      };
    }
  }
  state.elapsed = 0;
}

function go(sceneId) {
  if (!sceneId) return;
  state.sceneId = sceneId;
  renderScene();
}

setInterval(() => {
  if (!state.running) return;
  const scene = sceneOf(state.sceneId);
  if (!scene) return;
  state.elapsed += 0.1;
  if (scene.flow.kind === 'auto') {
    const duration = (scene.video && scene.video.duration) || 0;
    if (duration > 0 && state.elapsed >= duration) go(scene.flow.nextSceneId);
  }
  if (scene.flow.kind === 'qte') {
    const action = (scene.flow.qtes || [])[0];
    if (action && state.elapsed > action.endSec) go(action.onFail && action.onFail.nextSceneId);
  }
}, 100);

window.addEventListener('resize', renderScene);
renderScene();
</script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : ch === '"' ? "&quot;" : "&#39;",
  );
}