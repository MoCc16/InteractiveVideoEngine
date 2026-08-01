/* ═══════════════════════════════════════════════════════════════
   Interactive Video Engine — app.js
   互动影游可视化编辑系统
   ═══════════════════════════════════════════════════════════════ */

const TYPES = {
  start:   ['启动屏',     '#31c7cb'],
  home:    ['主界面',     '#7386d8'],
  play:    ['播放节点',   '#4c91c8'],
  choice:  ['选择节点',   '#7567ef'],
  qte:     ['QTE节点',    '#eb9856'],
  settle:  ['章节结算节点',   '#73b887'],
  chapters:['章节列表节点',   '#7f9caf'],
  ending:  ['结局节点',   '#d65f6d']
};

const KEY = 'interactive-film-editor-v5';
const THEME_KEY = 'interactive-film-theme';

const seed = () => ({
  projects: [
    { id:'p1', name:'逆光而行', desc:'都市情感项目 — 三个平行人生，因为一个决定交织在一起', author:'赵晴', date:'2026-07-21', cover:'third' }
  ],
  nodes: [],
  chapters: [
    { id:'c1', code:'CH01', name:'第一章', desc:'故事从这里开始。' }
  ],
  resources: [],
  variables: {}
});

let data = load();
let syncTimer = null;
let backendOnline = location.protocol !== 'file:';

let ui = {
  view:   'home',
  tab:    'story',
  activeProject: 'p1',
  selected:      '',
  menu:          null,
  filter:        'all',
  connectFrom:   null,
  previewNode:   '',
  previewHistory: [],
  previewVars:   {},
  drag:          null,
  theme:         loadTheme()
};

const app = document.querySelector('#app');

/* ── Data ───────────────────────────────────────────────────── */
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || seed(); }
  catch { return seed(); }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
  const s = document.querySelector('.status-badge');
  if (s) { s.textContent = '保存中…'; setTimeout(() => s.textContent = '已保存', 800); }
  if (backendOnline) { clearTimeout(syncTimer); syncTimer = setTimeout(syncServer, 400); }
}

async function syncServer() {
  try {
    let r = await fetch('/api/state', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw Error();
    const s = document.querySelector('.status-badge');
    if (s) s.textContent = '已同步';
  } catch { backendOnline = false; toast('服务器连接失败，已保留本地草稿'); }
}

async function hydrate() {
  if (!backendOnline) { resetPreview(); return; }
  try {
    let r = await fetch('/api/state');
    if (!r.ok) throw Error();
    let { state } = await r.json();
    if (state) { data = state; localStorage.setItem(KEY, JSON.stringify(data)); }
    resetPreview();
  } catch { backendOnline = false; resetPreview(); toast('无法连接服务器，已使用本地草稿'); }
}

/* ── Theme ──────────────────────────────────────────────────── */
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; }
  catch { return 'light'; }
}

function toggleTheme() {
  ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, ui.theme);
  applyTheme();
  render();
}

function applyTheme() {
  document.documentElement.classList.toggle('theme-dark', ui.theme === 'dark');
}

/* ── Helpers ────────────────────────────────────────────────── */
const q  = id => data.nodes.find(n => n.id === id);
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function toast(msg) {
  const el = document.querySelector('#toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

function showModal(inner) {
  closeModal();
  app.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="activeModal" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">${inner}</div>
  </div>`);
  setTimeout(() => document.querySelector('#activeModal input')?.focus(), 100);
  window.addEventListener('keydown', onModalKey);
}

function closeModal() {
  document.querySelector('#activeModal')?.remove();
  window.removeEventListener('keydown', onModalKey);
}

function onModalKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
}

function project() {
  return data.projects.find(p => p.id === ui.activeProject) || data.projects[0];
}

/* ── Header ─────────────────────────────────────────────────── */
function header() {
  const tabs = [['story','故事图'],['node','节点'],['resource','节点资源'],['chapter','章节'],['preview','预览']];
  return `<header class="work-header">
    <button class="back-btn" onclick="goHome()">← 项目列表</button>
    <span class="project-name">${esc(project().name)}</span>
    <nav class="tabs">${tabs.map(([id,n]) =>
      `<button class="tab ${ui.tab===id?'active':''}" onclick="setTab('${id}')">${n}</button>`
    ).join('')}</nav>
    <span class="status-badge">已保存</span>
    <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">${ui.theme==='dark'?'☀ 浅色':'☾ 深色'}</button>
    <button class="export-btn" onclick="exportProject()">导出项目</button>
  </header>`;
}

/* ── Home Page ──────────────────────────────────────────────── */
function renderHome() {
  app.innerHTML = `<div class="app">
    <header class="home-header">
      <div class="brand">互动影游可视化编辑系统</div>
      <div class="home-actions">
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">${ui.theme==='dark'?'☀ 浅色模式':'☾ 深色模式'}</button>
        <button class="btn btn-ghost" onclick="importProject()">导入项目</button>
        <button class="btn btn-primary" onclick="newProject()">＋ 新建项目</button>
      </div>
    </header>
    <main class="home-main">
      <div class="eyebrow">YOUR STORY ROOM / PROJECT ARCHIVE</div>
      <h1 class="home-title">从剧本，到每一个可被选择的瞬间。</h1>
      <div class="projects">
        ${data.projects.map((p, i) => `
          <article class="project-card" onclick="openProject('${p.id}')">
            <div class="cover ${p.cover||''}">
              <small>INTERACTIVE FILM / ${String(i+1).padStart(2,'0')}</small>
              <button class="card-ellipsis" onclick="event.stopPropagation();ui.menu=ui.menu==='${p.id}'?null:'${p.id}';render()">···</button>
            </div>
            <div class="card-info">
              <h3>${esc(p.name)}</h3>
              <p>${esc(p.desc)}</p>
              <div class="card-meta">
                <span>✎ ${esc(p.author)}</span>
                <span>${p.date}</span>
              </div>
            </div>
            ${ui.menu===p.id ? `
              <div class="card-menu">
                <button onclick="event.stopPropagation();renameProject('${p.id}')"><span class="menu-icon">✏</span>重命名</button>
                <button onclick="event.stopPropagation();copyProject('${p.id}')"><span class="menu-icon">⧉</span>复制项目</button>
                <button onclick="event.stopPropagation();exportProject()"><span class="menu-icon">⬇</span>导出</button>
                <button onclick="event.stopPropagation();deleteProject('${p.id}')" style="color:var(--red)"><span class="menu-icon">✕</span>删除</button>
              </div>` : ''}
          </article>`
        ).join('')}
        <article class="project-card new-card" onclick="newProject()">
          <div><strong>＋</strong>创建新的互动故事</div>
        </article>
      </div>
    </main>
  </div>`;
}

/* ── Drawer Sidebar ─────────────────────────────────────────── */
function drawerSidebar() {
  const sceneExpanded = !ui.sectionCollapsed?.scenes;
  const importExpanded = !ui.sectionCollapsed?.importTools;

  return `<aside class="drawer-sidebar${ui.drawerCollapsed ? ' collapsed' : ''}">
    <button class="drawer-toggle" onclick="toggleDrawer()" title="${ui.drawerCollapsed?'展开侧栏':'收起侧栏'}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        ${ui.drawerCollapsed
          ? '<polyline points="9 18 15 12 9 6"/>'
          : '<polyline points="15 18 9 12 15 6"/>'}
      </svg>
    </button>
    <div class="drawer-inner">

      <!-- 预设场景 -->
      <div class="drawer-section">
        <div class="drawer-section-head" onclick="toggleDrawerSection('scenes')">
          <span class="section-icon">🎬</span>
          <span>
            <span class="section-label">预设场景</span>
            <span class="section-sub">${data.chapters.length} 个章节</span>
          </span>
          <span class="section-arrow${sceneExpanded ? ' open' : ''}">▶</span>
        </div>
        <div class="drawer-section-body${sceneExpanded ? '' : ' collapsed'}">
          <div class="scene-cards">
            ${data.chapters.map((ch, i) => `
              <div class="scene-card story-scene" onclick="setTab('chapter')" title="${esc(ch.name)}">
                <span class="scene-icon">${['🎭','🔍','⚡','🌟','💫'][i]||'📌'}</span>
                <span class="scene-title">${esc(ch.code)}<br>${esc(ch.name)}</span>
              </div>
            `).join('')}
            <div class="scene-card blank" onclick="newSceneStoryboard()" title="新建空白场景">
              <span class="scene-icon">＋</span>
              <span class="scene-title">空白场景</span>
            </div>
          </div>

          <!-- 节点类型卡片（预设场景展开时显示在其下方） -->
          <div style="padding:2px 4px 6px">
            <div style="font:500 10px var(--font-mono);color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin:4px 0 8px 4px">节点类型</div>
            <div class="node-type-list">
              ${Object.entries(TYPES).map(([key,[name,color]]) =>
                `<button class="tool" style="--node:${color}" draggable="true"
                  ondragstart="startNodeDragFromTool(event,'${key}')"
                  onclick="addNode('${key}')" title="拖拽到画布或点击创建">
                  <i class="dot"></i>${name}
                </button>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- 剧本导入 -->
      <div class="drawer-section">
        <div class="drawer-section-head" onclick="toggleDrawerSection('importTools')">
          <span class="section-icon">📜</span>
          <span>
            <span class="section-label">剧本导入</span>
            <span class="section-sub">.txt / .md</span>
          </span>
          <span class="section-arrow${importExpanded ? ' open' : ''}">▶</span>
        </div>
        <div class="drawer-section-body${importExpanded ? '' : ' collapsed'}">
          <div class="import-box">
            <button class="tool" onclick="importScript()" style="--node:#7567ef"><i></i>导入剧本文件</button>
            <button class="tool" onclick="autoSplit()" style="--node:#73b887"><i></i>AI 自动拆分场景</button>
            <span class="hint">支持 .txt / .md，按 # 标题自动拆分为场景节点</span>
          </div>
        </div>
      </div>

    </div>
  </aside>`;
}

/* ── Drag from Toolbox to Canvas ────────────────────────────── */
function startNodeDragFromTool(e, type) {
  e.dataTransfer.setData('application/node-type', type);
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.dropEffect = 'copy';
}

function onCanvasDragOver(e) {
  if (e.dataTransfer.types.includes('application/node-type')) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
}

function onCanvasDrop(e) {
  e.preventDefault();
  const type = e.dataTransfer.getData('application/node-type');
  if (!type || !TYPES[type]) return;
  const canvas = document.querySelector('.canvas');
  const rect = canvas.getBoundingClientRect();
  const s = canvasView.scale || 1;
  const x = (e.clientX - rect.left - canvasView.x) / s;
  const y = (e.clientY - rect.top - canvasView.y) / s;
  addNodeAt(type, x, y);
}

function addNodeAt(type, x, y) {
  let index = data.nodes.length + 1;
  let id = 'n' + Date.now();
  let node = {
    id, type, title: TYPES[type][0],
    code: `CH01-${String(index).padStart(3,'0')}`,
    chapter: '第一章：雾港来信',
    x: Math.max(20, x - 90), y: Math.max(60, y - 30)
  };
  if (type === 'choice') node.choices = [];
  data.nodes.push(node);
  ui.selected = id;
  save(); render();
  toast(`✅ ${TYPES[type][0]} 已放置`);
}

/* ── Drawer Controls ────────────────────────────────────────── */
function toggleDrawer() {
  ui.drawerCollapsed = !ui.drawerCollapsed;
  render();
}

function toggleDrawerSection(key) {
  if (!ui.sectionCollapsed) ui.sectionCollapsed = {};
  ui.sectionCollapsed[key] = !ui.sectionCollapsed[key];
  render();
}

function newSceneStoryboard() {
  toast('空白场景已创建 — 在故事图中添加节点即可开始');
}

/* ── Canvas Viewport ─────────────────────────────────────────── */
let canvasView = { x: -200, y: -80, scale: 0.85 };

function applyCanvasView() {
  const w = document.querySelector('.canvas-world');
  if (w) w.style.transform = `translate(${canvasView.x}px,${canvasView.y}px) scale(${canvasView.scale})`;
  updateMinimap();
}

function canvasZoom(e) {
  e.preventDefault();
  const cvs = document.querySelector('.canvas');
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const wx = (cx - canvasView.x) / canvasView.scale, wy = (cy - canvasView.y) / canvasView.scale;
  const delta = -Math.sign(e.deltaY) * 0.1;
  canvasView.scale = Math.min(3, Math.max(0.15, canvasView.scale * (1 + delta)));
  canvasView.x = cx - wx * canvasView.scale;
  canvasView.y = cy - wy * canvasView.scale;
  applyCanvasView();
}

let panStart = null;
function canvasPanStart(e) {
  if (e.target.closest('.flow-node')) return;
  panStart = { x: e.clientX - canvasView.x, y: e.clientY - canvasView.y };
  document.querySelector('.canvas')?.classList.add('dragging');
}

function canvasPanMove(e) {
  if (ui.drag) { dragNode(e); return; }
  if (!panStart) return;
  canvasView.x = e.clientX - panStart.x;
  canvasView.y = e.clientY - panStart.y;
  applyCanvasView();
}

function canvasPanEnd() {
  if (ui.drag) { stopDrag(); return; }
  panStart = null;
  document.querySelector('.canvas')?.classList.remove('dragging');
}

function fitCanvasView() {
  if (!data.nodes.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  data.nodes.forEach(n => {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + 200); maxY = Math.max(maxY, n.y + 120);
  });
  const cvs = document.querySelector('.canvas');
  if (!cvs) return;
  const r = cvs.getBoundingClientRect();
  const pad = 60;
  const sw = (r.width - pad*2) / (maxX - minX + 100);
  const sh = (r.height - pad*2) / (maxY - minY + 100);
  canvasView.scale = Math.min(1.2, sw, sh);
  canvasView.x = r.width/2 - (minX + (maxX-minX)/2) * canvasView.scale;
  canvasView.y = r.height/2 - (minY + (maxY-minY)/2) * canvasView.scale;
  applyCanvasView();
}

/* ── Edges & Lines ──────────────────────────────────────────── */
function edges() {
  const result = [];
  data.nodes.forEach(n => {
    if (n.type === 'choice') {
      (n.choices||[]).forEach((c, i) => {
        if (c.next) result.push({ id: n.id + '_c' + i, from: n.id, to: c.next, choiceIdx: i });
      });
    } else if (n.next) {
      result.push({ id: n.id + '_next', from: n.id, to: n.next });
    }
  });
  return result;
}

function line(edge) {
  const one = q(edge.from), two = q(edge.to);
  if (!one || !two) return '';
  const x1 = one.x + 180, y1 = one.y + 42;
  const x2 = two.x, y2 = two.y + 42;
  const dx = Math.abs(x2 - x1) * 0.4;
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  return `<g class="conn-group" data-conn="${edge.id}" data-from="${edge.from}" data-to="${edge.to}">
    <path class="flow-line" d="M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}"/>
    <path class="flow-hit" d="M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}"/>
    <circle class="conn-scissors" cx="${midX}" cy="${midY}" r="12" data-conn="${edge.id}" data-from="${edge.from}" data-to="${edge.to}"/>
    <text class="conn-scissors-icon" x="${midX}" y="${midY+5}" text-anchor="middle" data-conn="${edge.id}" data-from="${edge.from}" data-to="${edge.to}">✂</text>
  </g>`;
}

function deleteConnectionById(connId, fromId, toId) {
  const from = q(fromId);
  if (!from) return;
  if (from.type === 'choice') {
    from.choices = (from.choices||[]).filter(c => c.next !== toId);
  } else if (from.next === toId) {
    from.next = '';
  }
  save(); render();
  toast('连线已删除');
}

function setupConnEvents() {
  document.querySelectorAll('.conn-scissors, .conn-scissors-icon').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      deleteConnectionById(el.dataset.conn, el.dataset.from, el.dataset.to);
    });
  });
}

function nodeCard(n) {
  let [name, color] = TYPES[n.type];
  let cls = ['flow-node'];
  if (ui.selected === n.id) cls.push('selected');
  if (ui.connectFrom === n.id) cls.push('connecting');
  let ch = data.chapters.find(c => n.chapter.includes(c.name));
  return `<article class="${cls.join(' ')}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px;--node:${color}"
    onpointerdown="startDrag(event,'${n.id}')" onclick="selectCanvasNode('${n.id}')" ondblclick="openNodeDetail('${n.id}')">
    <div class="node-type">${name.toUpperCase()}</div>
    <strong>${esc(n.title)}</strong>
    <div class="node-meta">
      <span>${esc(n.code)}</span>
      <span class="node-chapter">${esc(ch?.code||'CH01')}</span>
    </div>
    <div class="node-port node-port-out" title="拖拽连线到目标卡片" onpointerdown="startPortDrag(event,'${n.id}','out')" onclick="event.stopPropagation()">＋</div>
    <div class="node-port node-port-in" title="拖拽连线到目标卡片" onpointerdown="startPortDrag(event,'${n.id}','in')" onclick="event.stopPropagation()">＋</div>
  </article>`;
}

/* ── Port Drag to Connect ────────────────────────────────────── */
let portDrag = null;

function startPortDrag(e, nodeId, kind) {
  e.stopPropagation();
  e.preventDefault();
  portDrag = { fromId: nodeId, kind };
  window.addEventListener('pointermove', onPortDragMove);
  window.addEventListener('pointerup', onPortDragEnd);
}

function onPortDragMove(e) {
  if (!portDrag) return;
  const svg = document.querySelector('#flowSvg');
  if (!svg) return;
  let tmp = svg.querySelector('.flow-temp');
  if (!tmp) { tmp = document.createElementNS('http://www.w3.org/2000/svg','path'); tmp.classList.add('flow-temp'); svg.appendChild(tmp); }
  const node = q(portDrag.fromId);
  if (!node) return;
  const cvs = document.querySelector('.canvas');
  const rect = cvs.getBoundingClientRect();
  const wx = (e.clientX - rect.left - canvasView.x) / canvasView.scale;
  const wy = (e.clientY - rect.top - canvasView.y) / canvasView.scale;
  // Start from output (right), or end at input (left)
  const isOut = portDrag.kind === 'out';
  const sx = isOut ? node.x + 180 : node.x;
  const sy = node.y + 42;
  const ex = isOut ? wx : (node.x + 180);
  const ey = isOut ? wy : (node.y + 42);
  const x1 = isOut ? sx : wx, y1 = isOut ? sy : wy;
  const x2 = isOut ? wx : sx, y2 = isOut ? wy : sy;
  const dx = Math.abs(x2 - x1) * 0.4;
  tmp.setAttribute('d', `M ${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`);
}

function onPortDragEnd(e) {
  if (!portDrag) return;
  window.removeEventListener('pointermove', onPortDragMove);
  window.removeEventListener('pointerup', onPortDragEnd);
  const svg = document.querySelector('#flowSvg');
  const tmp = svg?.querySelector('.flow-temp');
  if (tmp) tmp.remove();

  const target = document.elementFromPoint(e.clientX, e.clientY);
  const targetPort = target?.closest?.('.node-port');
  const targetNodeEl = target?.closest?.('.flow-node');
  const toId = targetNodeEl?.dataset?.node;

  if (!toId || toId === portDrag.fromId || !portDrag.fromId) { portDrag = null; return; }

  const selfNode = q(portDrag.fromId);
  const otherNode = q(toId);

  if (portDrag.kind === 'out') {
    // Dragging from right port: self → other
    if (selfNode.type === 'choice') {
      selfNode.choices = selfNode.choices || [];
      if (!selfNode.choices.some(c => c.next === toId)) {
        selfNode.choices.push({ label: '新选项', next: toId, effect: '' });
      }
    } else {
      selfNode.next = toId;
    }
  } else {
    // Dragging from left port: other → self
    if (otherNode.type === 'choice') {
      otherNode.choices = otherNode.choices || [];
      if (!otherNode.choices.some(c => c.next === portDrag.fromId)) {
        otherNode.choices.push({ label: '新选项', next: portDrag.fromId, effect: '' });
      }
    } else {
      otherNode.next = portDrag.fromId;
    }
  }
  save(); render();
  toast('✅ 连线已建立');
  portDrag = null;
}

/* ── Minimap ─────────────────────────────────────────────────── */
function updateMinimap() {
  const map = document.querySelector('.minimap-content');
  if (!map) return;
  if (!data.nodes.length) { map.innerHTML = ''; return; }

  // Compute world bounds from all nodes
  const pad = 200;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  data.nodes.forEach(n => {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + 180); maxY = Math.max(maxY, n.y + 100);
  });
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;

  const mapRect = document.querySelector('.minimap')?.getBoundingClientRect();
  const mw = (mapRect?.width || 160) - 4;
  const mh = (mapRect?.height || 100) - 4;
  const worldW = maxX - minX || 1;
  const worldH = maxY - minY || 1;
  const scale = Math.min(mw / worldW, mh / worldH);

  let dots = data.nodes.map(n =>
    `<div class="minimap-dot" style="left:${(n.x - minX)*scale + 2}px;top:${(n.y - minY)*scale + 2}px;background:${TYPES[n.type][1]};${ui.selected===n.id?'outline:2px solid var(--cyan);z-index:2':''}"></div>`
  ).join('');

  const cvs = document.querySelector('.canvas');
  const rect = cvs?.getBoundingClientRect();
  let vp = '';
  if (rect) {
    const vx = ((-canvasView.x / canvasView.scale) - minX) * scale + 2;
    const vy = ((-canvasView.y / canvasView.scale) - minY) * scale + 2;
    const vw = (rect.width / canvasView.scale) * scale;
    const vh = (rect.height / canvasView.scale) * scale;
    vp = `<div class="minimap-viewport" style="left:${vx}px;top:${vy}px;width:${vw}px;height:${vh}px"></div>`;
  }
  map.innerHTML = dots + vp;
}

/* ── Story Canvas ───────────────────────────────────────────── */
function story() {
  return `<div class="workspace">
    ${drawerSidebar()}
    ${ui.drawerCollapsed ? `<button class="drawer-float-toggle visible" onclick="toggleDrawer()" title="展开侧栏">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
      </svg>
    </button>` : ''}
    <section class="canvas" id="mainCanvas"
      onpointerdown="canvasPanStart(event)" onpointermove="canvasPanMove(event)" onpointerup="canvasPanEnd()"
      onwheel="canvasZoom(event)" oncontextmenu="return false"
      ondragover="onCanvasDragOver(event)" ondrop="onCanvasDrop(event)">
      <div class="canvas-head">
        <div class="eyebrow">STORY MAP</div>
        <h2>${esc(data.chapters[0]?.code||'CH01')} · ${esc(data.chapters[0]?.name||'未命名章节')}</h2>
      </div>
      <div class="canvas-actions">
        <button onclick="fitCanvasView()">⌘ 适配画布</button>
        <span style="font:11px var(--font-mono);color:var(--muted);padding:7px 8px">${Math.round(canvasView.scale*100)}%</span>
      </div>
      <div class="canvas-world" style="transform:translate(${canvasView.x}px,${canvasView.y}px) scale(${canvasView.scale})">
        <svg class="flow-svg" id="flowSvg">${edges().map(e => line(e)).join('')}</svg>
        ${data.nodes.length ? data.nodes.map(nodeCard).join('') : `<div style="position:absolute;left:300px;top:200px;text-align:center;color:var(--muted);pointer-events:none;user-select:none">
          <div style="font-size:56px;margin-bottom:12px;opacity:0.5">🎬</div>
          <div style="font:600 20px var(--font-display);margin-bottom:6px;opacity:0.6">空白画布</div>
          <div style="font-size:13px;opacity:0.45">从左侧拖拽节点类型卡片到此处开始创作</div>
        </div>`}
      </div>
      <div class="minimap">
        <div class="minimap-title">MAP</div>
        <div class="minimap-content"></div>
      </div>
    </section>
  </div>`;
}

/* ── Node Detail Page ───────────────────────────────────────── */
function nodePage() {
  let n = q(ui.selected) || data.nodes[0];
  if (!n) {
    return `<main class="content-page"><div style="text-align:center;padding:80px 20px;color:var(--muted)"><div style="font-size:48px;margin-bottom:16px">📝</div><h2 style="font:600 20px var(--font-display);margin:0 0 8px">暂无节点</h2><p>在故事图中从左侧拖拽节点类型卡片到画布上创建第一个节点</p></div></main>`;
  }
  let chapterOptions = ['全局', ...data.chapters.map(c => `第${c.code.slice(2)}章：${c.name}`)];
  return `<main class="content-page">
    <div class="page-grid">
      <aside class="side-list">
        <input class="search" placeholder="🔍 搜索节点…" oninput="filterNodes(this.value)" />
        <div id="nodeList">${nodeList(n.id)}</div>
      </aside>
      <section class="form-card">
        <div class="node-badge">${esc(TYPES[n.type][0].toUpperCase())} / ${esc(n.code)}</div>
        <h1 class="page-title">${esc(n.title)}</h1>
        <div class="form-row">
          <div class="field"><label>节点标题</label><input value="${esc(n.title)}" oninput="setNode('${n.id}','title',this.value)" /></div>
          <div class="field"><label>节点编号</label><input value="${esc(n.code)}" oninput="setNode('${n.id}','code',this.value)" /></div>
          <div class="field"><label>所属章节</label><select onchange="setNode('${n.id}','chapter',this.value)">${chapterOptions.map(x => `<option ${n.chapter===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
          <div class="field"><label>节点类型</label><select disabled><option>${TYPES[n.type][0]}</option></select></div>
        </div>
        <div class="field"><label>剧本文本</label><textarea oninput="setNode('${n.id}','script',this.value)">${esc(n.script||'林夏抵达雾港，发现周野正在码头等待。远处的雾笛声打破了沉默。')}</textarea></div>
        ${playFields(n)}
        ${choiceFields(n)}
        <div class="field"><label>下一节点（普通节点）</label><select onchange="setNode('${n.id}','next',this.value)"><option value="">无 / 结局</option>${data.nodes.filter(x => x.id!==n.id).map(x => `<option value="${x.id}" ${n.next===x.id?'selected':''}>${esc(x.code)} · ${esc(x.title)}</option>`).join('')}</select></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="setTab('story')">📍 在故事图中定位</button>
          <button class="btn btn-danger" onclick="removeNode('${n.id}')">删除节点</button>
          <button class="btn btn-primary" onclick="save();toast('节点配置已保存')">保存节点</button>
        </div>
      </section>
    </div>
  </main>`;
}

function nodeList(selected) {
  let groups = ['全局', ...data.chapters.map(c => `第${c.code.slice(2)}章：${c.name}`)];
  return groups.map(g => {
    let ns = data.nodes.filter(n => n.chapter === g);
    return ns.length ? `<div class="chapter-label">${esc(g)}</div>` +
      ns.map(n => `<button class="node-list-item ${n.id===selected?'active':''}" onclick="selectNode('${n.id}')">${esc(n.code)}　${esc(n.title)}</button>`).join('') : '';
  }).join('');
}

function playFields(n) {
  return n.type === 'play' ? `<div class="form-row">
    <div class="field"><label>视频资源</label><select onchange="setNode('${n.id}','resource',this.value)"><option value="">未绑定</option>${data.resources.filter(r => r.kind==='video').map(r => `<option ${n.resource===r.name?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
    <div class="field"><label>播放模式</label><select><option>播放完成后跳转</option><option>手动继续</option></select></div>
  </div>` : '';
}

function choiceFields(n) {
  if (n.type !== 'choice') return '';
  let cs = n.choices || [];
  return `<div class="field"><label>选择问题</label><input value="${esc(n.question||'你要如何选择？')}" oninput="setNode('${n.id}','question',this.value)" /></div>
  <div class="choices">${cs.map((c,i) => `<div class="choice-row">
    <input value="${esc(c.label)}" oninput="setChoice('${n.id}',${i},'label',this.value)" placeholder="选项文本" />
    <select onchange="setChoice('${n.id}',${i},'next',this.value)">${data.nodes.filter(x => x.id!==n.id).map(x => `<option value="${x.id}" ${c.next===x.id?'selected':''}>${esc(x.code)}</option>`).join('')}</select>
    <input value="${esc(c.effect||'')}" placeholder="变量后果" oninput="setChoice('${n.id}',${i},'effect',this.value)" />
    <button onclick="removeChoice('${n.id}',${i})">×</button>
  </div>`).join('')}
  <button class="add-choice" onclick="addChoice('${n.id}')">＋ 添加选项</button></div>`;
}

/* ── Resource Page ──────────────────────────────────────────── */
function resourcePage() {
  let rs = data.resources.filter(r => ui.filter === 'all' || r.kind === ui.filter);
  return `<main class="content-page">
    <section class="resource-main">
      <div class="eyebrow">ASSET LIBRARY</div>
      <h1 class="page-title">节点资源</h1>
      <div class="resource-toolbar">
        ${['all','video','image','audio'].map(x =>
          `<button class="filter ${ui.filter===x?'active':''}" onclick="setFilter('${x}')">${{all:'全部',video:'🎬 视频',image:'🖼 图片',audio:'🎵 音频'}[x]}</button>`
        ).join('')}
        <button class="btn btn-primary" onclick="uploadResource()">＋ 上传资源</button>
      </div>
      <div class="upload-zone" onclick="uploadResource()">
        📁 点击选择资源文件，或拖放到这里<br>
        <small>支持 MP4、PNG、JPG、MP3、SRT、VTT</small>
      </div>
      <div class="resources">
        ${rs.map(r => `<article class="resource-card">
          <div class="asset-preview ${r.kind==='image'?'image':r.kind==='audio'?'audio':''}">${r.kind==='video'?'▶ 视频':r.kind==='image'?'🖼 图片':'♫ 音频'}</div>
          <div class="asset-info"><b>${esc(r.name)}</b><small>${esc(r.info)}　·　${esc(r.used)}</small><button class="asset-delete" onclick="deleteResource('${r.id}')">移除</button></div>
        </article>`).join('')}
      </div>
    </section>
  </main>`;
}

/* ── Chapter Page ───────────────────────────────────────────── */
function chapterPage() {
  let c = data.chapters[0], title = `第${c.code.slice(2)}章：${c.name}`;
  let nodes = data.nodes.filter(n => n.chapter === title);
  return `<main class="content-page">
    <div class="page-grid">
      <aside class="side-list">
        <button class="btn btn-primary" onclick="newChapter()" style="width:100%;margin-bottom:14px">＋ 新建章节</button>
        <div class="chapter-list">${data.chapters.map((x,i) =>
          `<button class="chapter-select ${i===0?'active':''}"><b>${esc(x.code)}　${esc(x.name)}</b><small>${data.nodes.filter(n => n.chapter===`第${x.code.slice(2)}章：${x.name}`).length} 个节点</small></button>`
        ).join('')}</div>
      </aside>
      <section class="chapter-card">
        <div class="node-badge">${esc(c.code)}</div>
        <h1 class="page-title">${esc(title)}</h1>
        <div class="form-row">
          <div class="field"><label>章节编号</label><input value="${esc(c.code)}" oninput="setChapter('code',this.value)" /></div>
          <div class="field"><label>章节名称</label><input value="${esc(c.name)}" oninput="setChapter('name',this.value)" /></div>
        </div>
        <div class="field"><label>章节简介</label><textarea oninput="setChapter('desc',this.value)">${esc(c.desc)}</textarea></div>
        <div class="field"><label>本章节节点</label><div>${nodes.map(n => `<span class="pill">${esc(n.code)} · ${esc(n.title)}</span>`).join('')||'<span class="hint">暂无节点；可在节点 Tab 中归类。</span>'}</div></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="setTab('story')">📍 在故事图中查看</button>
          <button class="btn btn-primary" onclick="save();toast('章节配置已保存')">保存章节</button>
        </div>
      </section>
    </div>
  </main>`;
}

/* ── Preview Page ───────────────────────────────────────────── */
function previewPage() {
  let n = q(ui.previewNode) || data.nodes[0];
  if (!n) {
    return `<main class="content-page"><div style="text-align:center;padding:80px 20px;color:var(--muted)"><div style="font-size:48px;margin-bottom:16px">🎬</div><h2 style="font:600 20px var(--font-display);margin:0 0 8px">无可预览节点</h2><p>请先在故事图中创建节点</p></div></main>`;
  }
  let isChoice = n.type === 'choice', isEnd = n.type === 'ending';
  return `<main class="content-page">
    <div class="preview-layout">
      <section class="preview-stage">
        <div class="preview-copy">
          <div class="eyebrow" style="color:#bdeeee">${isEnd ? 'ENDING' : 'INTERACTIVE FILM / PREVIEW'}</div>
          <h1>${esc(n.title)}</h1>
          <p>${esc(n.script || previewText(n))}</p>
          ${n.type === 'start'
            ? `<button class="start-preview" onclick="advancePreview('${n.next||''}')">▶ 开始游戏</button>`
            : isChoice
              ? `<div class="preview-choices">${(n.choices||[]).map((c,i) =>
                  `<button class="start-preview choice-preview" onclick="choosePreview(${i})">${String.fromCharCode(65+i)}. ${esc(c.label)}</button>`
                ).join('')}</div>`
              : isEnd
                ? `<button class="start-preview" onclick="resetPreview()">↻ 重新开始</button>`
                : `<button class="start-preview" onclick="advancePreview('${n.next||''}')">▶ 继续</button>`}
        </div>
      </section>
      <aside class="debug-panel">
        <h4>🔧 调试面板</h4>
        <p><b>当前节点</b><br><code>${esc(n.code)} · ${esc(n.title)}</code></p>
        <p><b>玩家变量</b><br>${Object.entries(ui.previewVars).map(([k,v]) => `<code>${k}: ${v}</code><br>`).join('')}</p>
        <p><b>历史路径</b><br><code>${ui.previewHistory.map(id => q(id)?.title).join(' → ')}</code></p>
        <div class="debug-actions">
          <button class="btn btn-ghost" onclick="resetPreview()" style="flex:1">重置预览</button>
          <button class="btn btn-primary" onclick="ui.selected=ui.previewNode;setTab('story')" style="flex:1">定位节点</button>
        </div>
      </aside>
    </div>
  </main>`;
}

function previewText(n) {
  return n.type === 'play'   ? '画面正在播放。你可以继续推进这段故事。'
       : n.type === 'choice' ? '此刻，你的选择将改变故事的走向。'
       : '故事已经抵达终点。';
}

/* ── Render ─────────────────────────────────────────────────── */
function renderWork() {
  let content = { story, node:nodePage, resource:resourcePage, chapter:chapterPage, preview:previewPage }[ui.tab]();
  app.innerHTML = `<div class="app">${header()}${content}</div>`;
  if (ui.tab === 'story') {
    requestAnimationFrame(() => { applyCanvasView(); updateMinimap(); setupConnEvents(); });
  }
}

function render() {
  ui.view === 'home' ? renderHome() : renderWork();
}

/* ── Navigation ─────────────────────────────────────────────── */
function openProject(id)  { ui.activeProject = id; ui.view = 'work'; ui.tab = 'story'; render(); }
function goHome()          { ui.view = 'home'; render(); }
function setTab(tab)       { ui.tab = tab; render(); }
function selectNode(id)    { ui.selected = id; render(); }

/* ── Node Interaction ───────────────────────────────────────── */
function selectCanvasNode(id) {
  if (ui.suppressClick) { ui.suppressClick = false; return; }
  if (ui.drag?.moved) return;
  ui.selected = id;
  updateNodeSelection();
}

function openNodeDetail(id) {
  ui.selected = id; ui.tab = 'node'; render();
}

function updateNodeSelection() {
  document.querySelectorAll('.flow-node').forEach(el => {
    el.classList.toggle('selected', el.dataset.node === ui.selected);
  });
  updateMinimap();
}

function handleNodeClick(id) {
  if (ui.suppressClick) { ui.suppressClick = false; return; }
  if (ui.drag?.moved) return;
  if (ui.connectFrom) {
    if (ui.connectFrom === id) return;
    const from = q(ui.connectFrom);
    if (from.type === 'choice') {
      from.choices = from.choices || [];
      from.choices.push({ label:'新选项', next:id, effect:'' });
    } else from.next = id;
    ui.connectFrom = null;
    save(); render();
    toast('✅ 连线已建立');
  } else {
    ui.selected = id; ui.tab = 'node'; render();
  }
}

function setNode(id, k, v)   { q(id)[k] = v; save(); }
function setChoice(id,i,k,v) { q(id).choices[i][k] = v; save(); }
function addChoice(id)       { q(id).choices.push({ label:'新选项', next:data.nodes.find(n => n.id!==id)?.id||'', effect:'' }); save(); render(); }
function removeChoice(id,i)  { q(id).choices.splice(i,1); save(); render(); }

/* ── Drag & Drop ────────────────────────────────────────────── */
function startDrag(e, id) {
  if (e.button !== 0) return;
  e.stopPropagation();
  ui.drag = { id, startX:e.clientX, startY:e.clientY, originX:q(id).x, originY:q(id).y, moved:false };
  e.currentTarget.setPointerCapture?.(e.pointerId);
  window.addEventListener('pointerup', onDragPointerUp);
}

function onDragPointerUp(e) {
  window.removeEventListener('pointerup', onDragPointerUp);
  if (ui.drag) stopDrag();
}

function dragNode(e) {
  if (!ui.drag) return;
  let d = ui.drag, n = q(d.id);
  const s = canvasView.scale || 1;
  n.x = d.originX + (e.clientX - d.startX) / s;
  n.y = d.originY + (e.clientY - d.startY) / s;
  if (Math.abs(e.clientX - d.startX) > 2 || Math.abs(e.clientY - d.startY) > 2) d.moved = true;
  const el = document.querySelector(`[data-node="${d.id}"]`);
  if (el) { el.style.left = n.x+'px'; el.style.top = n.y+'px'; }
  drawEdges();
}

function stopDrag() {
  if (!ui.drag) return;
  let moved = ui.drag.moved;
  ui.drag = null;
  if (moved) { ui.suppressClick = true; save(); setTimeout(() => ui.suppressClick = false, 80); }
}

function drawEdges() {
  let svg = document.querySelector('#flowSvg');
  if (svg) svg.innerHTML = edges().map(e => line(e)).join('');
}

function toggleConnect() {
  if (ui.connectFrom) { ui.connectFrom = null; render(); return; }
  ui.connectFrom = ui.selected;
  toast('请点击要连接的目标节点');
  render();
}

function fitCanvas() {
  toast('故事图已适配当前画布');
}

/* ── Node CRUD ──────────────────────────────────────────────── */
function addNode(type) {
  let index = data.nodes.length + 1, id = 'n' + Date.now();
  let node = {
    id, type, title: TYPES[type][0],
    code: `CH01-${String(index).padStart(3,'0')}`,
    chapter: '第一章：雾港来信',
    x: 280 + (index%3) * 200, y: 380 + Math.floor(index/3) * 120
  };
  if (type === 'choice') node.choices = [];
  data.nodes.push(node);
  ui.selected = id; save(); render();
  toast('✅ 新节点已添加');
}

function removeNode(id) {
  const n = q(id);
  showModal(`
    <div class="eyebrow" style="color:var(--red)">REMOVE NODE</div>
    <h2>删除节点</h2>
    <p style="color:var(--muted);line-height:1.6;margin:0 0 18px">确定删除「<b style="color:var(--ink)">${esc(n.title)}</b>」吗？其所有连线将一并移除。</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmRemoveNode('${id}')">确认删除</button>
    </div>
  `);
}

function confirmRemoveNode(id) {
  data.nodes = data.nodes.filter(n => n.id !== id);
  data.nodes.forEach(n => {
    if (n.next === id) n.next = '';
    if (n.choices) n.choices = n.choices.filter(c => c.next !== id);
  });
  closeModal(); ui.selected = data.nodes[0]?.id || ''; save(); ui.tab = 'story'; render();
  toast('节点已删除');
}

/* ── Script Import ──────────────────────────────────────────── */
function importScript() {
  let input = document.createElement('input');
  input.type = 'file'; input.accept = '.txt,.md,text/plain,text/markdown';
  input.onchange = async () => {
    let f = input.files[0]; if (!f) return;
    ui.importedScript = await f.text();
    toast(`📄 已读取剧本：${f.name}，请点击“AI 自动拆分”`);
  };
  input.click();
}

function autoSplit() {
  let script = ui.importedScript || '# 第一章：雾港来信\n## 场景：码头相遇\n林夏在雾中见到了周野。';
  let lines = script.split(/\r?\n/).filter(Boolean);
  let heads = lines.filter(x => /^#{1,3}\s|^第.+章|^场景[：:]/.test(x));
  let created = heads.slice(0,8).map((h,i) => ({
    id: 'auto'+Date.now()+i, type:'play',
    title: h.replace(/^#+\s*/,'').replace(/^场景[：:]?/,''),
    code: `CH01-${String(data.nodes.length+i+1).padStart(3,'0')}`,
    chapter: '第一章：雾港来信',
    x: 260+(i%3)*210, y: 410+Math.floor(i/3)*125,
    script: lines.slice(i*3,i*3+3).join(' ')
  }));
  if (!created.length) created = [{
    id:'auto'+Date.now(), type:'play', title:'AI 拆分：剧情片段',
    code: `CH01-${String(data.nodes.length+1).padStart(3,'0')}`,
    chapter:'第一章：雾港来信', x:320, y:410,
    script: lines.slice(0,5).join(' ')
  }];
  data.nodes.push(...created);
  save(); render();
  toast(`✅ 已生成 ${created.length} 个待确认节点`);
}

/* ── Resources ──────────────────────────────────────────────── */
function uploadResource() {
  let input = document.createElement('input');
  input.type = 'file'; input.multiple = true;
  input.accept = 'video/*,image/*,audio/*,.srt,.vtt';
  input.onchange = async () => {
    let files = [...input.files]; if (!files.length) return;
    toast('📤 资源正在上传…');
    try {
      for (const f of files) {
        if (backendOnline) {
          let form = new FormData(); form.append('file', f);
          let r = await fetch('/api/assets', { method:'POST', body:form });
          if (!r.ok) throw Error(f.name+' 上传失败');
          data.resources.unshift(await r.json());
        } else {
          let kind = f.type.startsWith('video')?'video':f.type.startsWith('image')?'image':f.type.startsWith('audio')?'audio':'subtitle';
          data.resources.unshift({ id:'r'+Date.now()+Math.random(), name:f.name, kind, info:(f.size/1024/1024).toFixed(1)+' MB', used:'未绑定' });
        }
      }
      save(); render();
      toast(`✅ 已添加 ${files.length} 个资源`);
    } catch (error) { toast(error.message || '资源上传失败'); }
  };
  input.click();
}

function deleteResource(id) {
  let r = data.resources.find(x => x.id === id);
  if (data.nodes.some(n => n.resource === r.name)) return toast('该资源正在被节点使用，请先解除绑定');
  data.resources = data.resources.filter(r => r.id !== id);
  save(); render(); toast('资源已移除');
}

function setFilter(f) { ui.filter = f; render(); }

/* ── Chapter ────────────────────────────────────────────────── */
function setChapter(k,v) { data.chapters[0][k] = v; save(); }
function newChapter() {
  let i = data.chapters.length + 1;
  data.chapters.push({ id:'c'+Date.now(), code:'CH'+String(i).padStart(2,'0'), name:'未命名章节', desc:'' });
  save(); render(); toast('✅ 新章节已创建');
}

/* ── Preview ────────────────────────────────────────────────── */
function advancePreview(next) {
  if (!next) return toast('当前节点没有设置下一节点');
  ui.previewNode = next; ui.previewHistory.push(next); render();
}

function choosePreview(i) {
  let n = q(ui.previewNode), c = n.choices[i];
  let m = (c.effect||'').match(/(\w+)\s*([+-])\s*(\d+)/);
  if (m) ui.previewVars[m[1]] = (Number(ui.previewVars[m[1]]) || 0) + (m[2]==='+'?1:-1) * Number(m[3]);
  advancePreview(c.next);
}

function resetPreview() {
  const startNode = data.nodes.find(n => n.type === 'start');
  ui.previewNode = startNode?.id || data.nodes[0]?.id || '';
  ui.previewHistory = ui.previewNode ? [ui.previewNode] : [];
  ui.previewVars = structuredClone(data.variables || {});
  render();
}

/* ── Projects ───────────────────────────────────────────────── */
function newProject() {
  app.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal">
    <div class="modal">
      <div class="eyebrow">NEW PROJECT</div>
      <h2>创建互动项目</h2>
      <div class="field"><label>项目名称</label><input id="newName" placeholder="例如：雾港疑案" autofocus /></div>
      <div class="field"><label>项目描述</label><input id="newDesc" placeholder="一句话描述这个故事" /></div>
      <div class="field"><label>创作者</label><input id="newAuthor" placeholder="你的名字" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.querySelector('#modal').remove()">取消</button>
        <button class="btn btn-primary" onclick="createProject()">创建项目</button>
      </div>
    </div>
  </div>`);
}

function createProject() {
  let name = document.querySelector('#newName').value || '未命名项目';
  data.projects.unshift({
    id:'p'+Date.now(), name,
    desc: document.querySelector('#newDesc').value || '新的互动影游项目',
    author: document.querySelector('#newAuthor').value || '未署名',
    date: new Date().toISOString().slice(0,10), cover: 'third'
  });
  save(); ui.view = 'home'; render();
  toast('✅ 项目已创建');
}

function renameProject(id) {
  let p = data.projects.find(x => x.id === id);
  ui.menu = null;
  showModal(`
    <div class="eyebrow">RENAME</div>
    <h2>重命名项目</h2>
    <div class="field"><label>项目名称</label><input id="modalRenameInput" value="${esc(p.name)}" autofocus /></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmRename('${id}')">确认</button>
    </div>
  `);
}

function confirmRename(id) {
  let p = data.projects.find(x => x.id === id);
  let name = document.querySelector('#modalRenameInput')?.value?.trim();
  if (name) { p.name = name; closeModal(); save(); render(); toast('项目已重命名'); }
}

function copyProject(id) {
  let p = data.projects.find(x => x.id === id);
  data.projects.unshift({...p, id:'p'+Date.now(), name:p.name+'（副本）', date:new Date().toISOString().slice(0,10)});
  ui.menu = null; save(); render(); toast('✅ 项目副本已创建');
}

function deleteProject(id) {
  let p = data.projects.find(x => x.id === id);
  ui.menu = null;
  showModal(`
    <div class="eyebrow" style="color:var(--red)">DANGER ZONE</div>
    <h2>删除项目</h2>
    <p style="color:var(--muted);line-height:1.6;margin:0 0 18px">确定删除「<b style="color:var(--ink)">${esc(p.name)}</b>」吗？<br>此操作不可恢复，所有节点、资源和章节将被永久移除。</p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="confirmDelete('${id}')">确认删除</button>
    </div>
  `);
}

function confirmDelete(id) {
  data.projects = data.projects.filter(x => x.id !== id);
  closeModal(); save(); render(); toast('项目已删除');
}

/* ── Export / Import ────────────────────────────────────────── */
function exportProject() {
  let blob = new Blob([JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    project: project(),
    story: { nodes:data.nodes, chapters:data.chapters, resources:data.resources, variables:data.variables }
  }, null, 2)], { type:'application/json' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project().name}-互动项目.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('📦 项目包已导出');
}

function importProject() {
  let input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async () => {
    try {
      let obj = JSON.parse(await input.files[0].text()), p = obj.project;
      if (!p || !obj.story) throw Error();
      data.projects.unshift({...p, id:'p'+Date.now(), name:p.name+'（导入）'});
      if (obj.story.nodes) data.nodes = obj.story.nodes;
      if (obj.story.chapters) data.chapters = obj.story.chapters;
      if (obj.story.resources) data.resources = obj.story.resources;
      if (obj.story.variables) data.variables = obj.story.variables;
      save(); render(); toast('✅ 项目已导入，已加载到编辑器');
    } catch { toast('无法识别该项目文件'); }
  };
  input.click();
}

/* ── Filter Nodes ───────────────────────────────────────────── */
function filterNodes(keyword) {
  let holder = document.querySelector('#nodeList');
  if (!holder) return;
  holder.innerHTML = nodeList(ui.selected);
  if (keyword) {
    [...holder.querySelectorAll('.node-list-item')].forEach(el => {
      if (!el.textContent.toLowerCase().includes(keyword.toLowerCase())) el.style.display = 'none';
    });
  }
}

/* ── Init ───────────────────────────────────────────────────── */
applyTheme();
resetPreview();
hydrate();
