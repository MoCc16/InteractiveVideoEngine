/* ═══════════════════════════════════════════════════════════════
   Interactive Video Engine — app.js
   互动影游可视化编辑系统
   ═══════════════════════════════════════════════════════════════ */

const TYPES = {
  scene:   ['空白场景',   '#9aa8ba'],
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
  folders: [],
  sceneElements: [],
  sceneTemplates: {},
  variables: {}
});

let data = load();
let syncTimer = null;
let resourceClickTimer = null;
let backendOnline = location.protocol !== 'file:';

let ui = {
  view:   'home',
  tab:    'story',
  activeProject: 'p1',
  selected:      '',
  selectedSceneElement: '',
  sceneLayersCollapsed: false,
  sceneNodeType: '',
  scenePropertyTab: 'content',
  sceneSnapshots: {},
  selectedResource: '',
  resourceView: 'grid',
  resourceFolder: 'all',
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
    if (state) { data = state; data.folders = data.folders || []; data.sceneElements = data.sceneElements || []; data.sceneTemplates = data.sceneTemplates || {}; localStorage.setItem(KEY, JSON.stringify(data)); await enrichExistingResourceMetadata(); }
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
  const tabs = [['story','故事图'],['scene','场景'],['node','节点'],['resource','资源'],['chapter','章节'],['preview','预览']];
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

      <!-- 节点类型 -->
      <div class="drawer-section node-types-section">
        <div class="node-types-label">节点类型</div>
        <div class="node-type-list">
          ${Object.entries(TYPES).map(([key,[name,color]]) =>
            `<button class="tool ${key==='scene' ? 'blank-scene-tool' : ''}" style="--node:${color}" draggable="true"
              ondragstart="startNodeDragFromTool(event,'${key}')"
              onclick="addNode('${key}')" title="拖拽到画布或点击创建">
              ${key==='scene' ? '<i class="blank-scene-icon">＋</i>' : '<i class="dot"></i>'}${name}
            </button>`
          ).join('')}
        </div>
      </div>

      ${storyOutline()}

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

/* ── Story Outline ─────────────────────────────────────────── */
function nodeTypeName(type) {
  return TYPES[type]?.[0] || '未分类';
}

function orphanNodes() {
  const linked = new Set();
  edges().forEach(edge => { linked.add(edge.from); linked.add(edge.to); });
  return data.nodes.filter(node => !linked.has(node.id));
}

function visibleOutlineNodes() {
  const keyword = (ui.outlineSearch || '').trim().toLowerCase();
  return data.nodes.filter(node => {
    const typeMatches = !ui.outlineType || node.type === ui.outlineType;
    const text = `${node.title || ''} ${node.code || ''} ${nodeTypeName(node.type)}`.toLowerCase();
    return typeMatches && (!keyword || text.includes(keyword));
  });
}

function outlineTreeMarkup() {
  const nodes = visibleOutlineNodes();
  const groups = [...new Set(nodes.map(node => node.type))];
  if (!groups.length) return `<div class="outline-empty">没有匹配的节点</div>`;

  return groups.map(type => {
    const groupNodes = nodes.filter(node => node.type === type);
    const expanded = !!ui.outlineOpen?.[type];
    return `<div class="outline-group ${expanded ? 'expanded' : ''}">
      <button class="outline-group-head" onclick="toggleOutlineGroup('${type}')">
        <span class="outline-caret">▶</span>
        <span>${esc(nodeTypeName(type))}</span>
        <span class="outline-group-count">(${groupNodes.length})</span>
      </button>
      ${expanded ? `<div class="outline-children">
        ${groupNodes.map(node => `<button class="outline-node ${ui.selected===node.id ? 'selected' : ''}" onclick="focusCanvasNode('${node.id}')" title="定位到 ${esc(node.title)}">
          <span>◇</span>${esc(node.title || nodeTypeName(node.type))}
        </button>`).join('')}
      </div>` : ''}
    </div>`;
  }).join('');
}

function storyOutline() {
  const typeTags = [...new Set(data.nodes.map(node => node.type))];
  const islands = orphanNodes().length;
  const startNode = getStartNode();
  return `<section class="outline-panel" aria-label="剧情大纲">
    <div class="outline-title">剧情大纲</div>
    <input class="outline-search" id="outlineSearch" value="${esc(ui.outlineSearch || '')}" oninput="setOutlineSearch(this.value)" placeholder="搜索节点名称…" />
    <div class="outline-actions">
      <button class="outline-status outline-start" type="button" ${startNode ? `onclick="focusStartNode()" title="定位到 ${esc(startNode.title || nodeTypeName(startNode.type))}"` : 'disabled title="尚未设置起始节点"'}><span>◉</span>起始节点</button>
      <button class="outline-status outline-island" type="button" onclick="focusNextOrphan()"><span>⚠</span>孤岛 ${islands}</button>
    </div>
    ${typeTags.length ? `<div class="outline-filter-label">筛选 tag <span>已创建 ${data.nodes.length} 个节点</span></div>
      <div class="outline-tags">${typeTags.map(type => `<button class="outline-tag ${ui.outlineType===type ? 'active' : ''}" onclick="toggleOutlineTag('${type}')">${esc(nodeTypeName(type))}</button>`).join('')}</div>` : `<div class="outline-filter-label">筛选 tag <span>拖拽节点到画布后显示</span></div>`}
    <div class="outline-tree" id="outlineTree">${outlineTreeMarkup()}</div>
  </section>`;
}

function getStartNode() {
  if (data.startNodeId) return q(data.startNodeId) || null;
  return data.nodes.find(node => node.type === 'start') || null;
}

function focusStartNode() {
  const startNode = getStartNode();
  if (!startNode) return;
  focusCanvasNode(startNode.id);
}

function setOutlineSearch(value) {
  ui.outlineSearch = value;
  const tree = document.querySelector('#outlineTree');
  if (tree) tree.innerHTML = outlineTreeMarkup();
}

function toggleOutlineTag(type) {
  ui.outlineType = ui.outlineType === type ? null : type;
  render();
}

function toggleOutlineGroup(type) {
  ui.outlineOpen = ui.outlineOpen || {};
  ui.outlineOpen[type] = !ui.outlineOpen[type];
  const tree = document.querySelector('#outlineTree');
  if (tree) tree.innerHTML = outlineTreeMarkup();
}

function focusCanvasNode(id) {
  const node = q(id);
  const canvas = document.querySelector('.canvas');
  if (!node || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  ui.selected = id;
  canvasView.x = rect.width / 2 - (node.x + 90) * canvasView.scale;
  canvasView.y = rect.height / 2 - (node.y + 44) * canvasView.scale;
  render();
  toast(`已定位：${node.title || nodeTypeName(node.type)}`);
}

function focusNextOrphan() {
  const islands = orphanNodes();
  if (!islands.length) return toast('当前画布没有孤岛节点');
  ui.orphanCursor = (ui.orphanCursor || 0) % islands.length;
  const target = islands[ui.orphanCursor];
  ui.orphanCursor = (ui.orphanCursor + 1) % islands.length;
  focusCanvasNode(target.id);
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
    x: Math.max(20, x - 90), y: Math.max(60, y - 30),
    createdAt: new Date().toISOString()
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
    maxX = Math.max(maxX, n.x + 220); maxY = Math.max(maxY, n.y + 150);
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
  const x1 = one.x + 220, y1 = one.y + 68;
  const x2 = two.x, y2 = two.y + 68;
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
  if (n.resource) cls.push('has-resource');
  const isStart = data.startNodeId ? data.startNodeId === n.id : n.type === 'start';
  const isOrphan = !edges().some(edge => edge.from === n.id || edge.to === n.id);
  const resource = data.resources.find(item => item.name === n.resource);
  const preview = resource?.url
    ? resource.kind === 'image'
      ? `<img class="node-asset" src="${esc(resource.url)}" alt="${esc(n.title)}" />`
      : resource.kind === 'video'
        ? `<video class="node-asset" src="${esc(resource.url)}" muted preload="metadata"></video>`
        : ''
    : `<span class="node-empty-preview">无预览</span>`;
  return `<article class="${cls.join(' ')}" data-node="${n.id}" style="left:${n.x}px;top:${n.y}px;--node:${color}"
    onpointerdown="startDrag(event,'${n.id}')" onclick="selectCanvasNode('${n.id}')" ondblclick="openNodeDetail('${n.id}')" oncontextmenu="showNodeMenu(event,'${n.id}')">
    <div class="node-preview">${preview}</div>
    <div class="node-card-status">${isStart ? '<span class="start-marker">● START</span>' : `<span>${esc(name)}</span>`}</div>
    ${isOrphan ? '<span class="node-warning" title="该节点尚未连接">!</span>' : ''}
    <strong>${esc(n.title)}</strong>
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
  const sx = isOut ? node.x + 220 : node.x;
  const sy = node.y + 68;
  const ex = isOut ? wx : (node.x + 220);
  const ey = isOut ? wy : (node.y + 68);
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
    maxX = Math.max(maxX, n.x + 220); maxY = Math.max(maxY, n.y + 150);
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

/* ── Story Inspector & Context Menu ─────────────────────────── */
function resourcePreview(resource, title) {
  if (!resource?.url) return `<div class="inspector-preview-empty">未绑定资源，暂无预览内容。</div>`;
  const mediaId = `preview-${String(resource.id || resource.name).replace(/[^a-zA-Z0-9_-]/g,'')}`;
  const media = resource.kind === 'image'
    ? `<img id="${mediaId}" src="${esc(resource.url)}" alt="${esc(title)}" />`
    : resource.kind === 'video'
      ? `<video id="${mediaId}" src="${esc(resource.url)}" controls preload="metadata"></video>`
      : '';
  if (media) return `<div class="media-preview-wrap">${media}</div>`;
  return `<div class="inspector-preview-empty">${esc(resource.name)}</div>`;
}

function storyInspector() {
  const node = q(ui.selected);
  if (!node) return '';
  const resource = data.resources.find(item => item.name === node.resource);
  const incoming = edges().filter(edge => edge.to === node.id).map(edge => q(edge.from)).filter(Boolean);
  const outgoing = edges().filter(edge => edge.from === node.id).map(edge => q(edge.to)).filter(Boolean);
  const media = data.resources.filter(item => item.kind === 'video' || item.kind === 'image');
  return `<aside class="story-inspector">
    <div class="inspector-head"><span>节点检查器</span><button onclick="closeInspector()" title="关闭">×</button></div>
    <section class="inspector-section"><h4>基础</h4>
      <label>节点名称<input value="${esc(node.title)}" oninput="setNode('${node.id}','title',this.value)" /></label>
      <div class="inspector-row"><span>节点 ID</span><code>${esc(node.id)}</code></div>
      <div class="inspector-row"><span>节点类型</span><b>${esc(TYPES[node.type]?.[0] || node.type)}</b></div>
      <div class="inspector-row"><span>创建时间</span><span>${node.createdAt ? esc(node.createdAt.slice(0,16).replace('T',' ')) : '—'}</span></div>
    </section>
    <section class="inspector-section"><h4>内容绑定</h4>
      <label>绑定视频 / 图片<select onchange="bindNodeResource('${node.id}',this.value)"><option value="">（选择资源绑定…）</option>${media.map(item => `<option value="${esc(item.name)}" ${node.resource===item.name?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label>
      <label>资源预览<div class="inspector-preview">${resourcePreview(resource,node.title)}</div></label>
    </section>
    <section class="inspector-section"><h4>基本信息</h4>
      <div class="inspector-row"><span>自动跳转</span><b>${node.type==='choice'||node.type==='ending'?'否':'是'}</b></div>
      <div class="inspector-row"><span>片段时长(秒)</span><span>${resource?.duration || '—'}</span></div>
    </section>
    <section class="inspector-section"><h4>关联节点</h4>
      <div class="inspector-link-list"><span>前序节点</span>${incoming.length ? incoming.map(item => `<button onclick="focusCanvasNode('${item.id}')">${esc(item.title)}</button>`).join('') : '<em>无前序节点</em>'}</div>
      <div class="inspector-link-list"><span>后序节点</span>${outgoing.length ? outgoing.map(item => `<button onclick="focusCanvasNode('${item.id}')">${esc(item.title)}</button>`).join('') : '<em>无后序节点</em>'}</div>
    </section>
    ${node.type==='ending' ? `<section class="inspector-section ending-only"><h4>结局专属</h4><label>结局分类<input value="${esc(node.endingCategory || '')}" placeholder="例如：真结局" oninput="setNode('${node.id}','endingCategory',this.value)" /></label></section>` : ''}
  </aside>`;
}

function nodeContextMenu() {
  const menu = ui.contextMenu;
  const node = q(menu?.id);
  if (!node) return '';
  const isStart = data.startNodeId ? data.startNodeId===node.id : node.type==='start';
  return `<div class="node-context-menu" style="left:${menu.x}px;top:${menu.y}px" onclick="event.stopPropagation()">
    <button onclick="previewFromNode('${node.id}')">从此节点试玩</button>
    <button onclick="openNodeDetail('${node.id}')">打开节点</button>
    <button class="menu-divider" ${isStart?'disabled':''} onclick="setStartNode('${node.id}')">${isStart?'✓ 已是起点':'设为起点'}</button>
    <button class="menu-divider" onclick="duplicateNode('${node.id}',true)">创建副本</button>
    <button onclick="duplicateNode('${node.id}',false)">复制节点</button>
    <button class="menu-danger" onclick="removeNodeFromMenu('${node.id}')">删除节点</button>
  </div>`;
}

function showNodeMenu(event,id) {
  event.preventDefault(); event.stopPropagation();
  ui.selected=id; ui.contextMenu={id,x:Math.min(event.clientX,window.innerWidth-190),y:Math.min(event.clientY,window.innerHeight-250)};
  render();
}

function closeInspector() { ui.selected=''; ui.contextMenu=null; render(); }
function closeNodeMenu() { if(ui.contextMenu){ui.contextMenu=null;render();} }
function bindNodeResource(id,name) { q(id).resource=name; save(); render(); }
function setStartNode(id) { data.startNodeId=id; ui.contextMenu=null; save(); render(); toast('已设为起点'); }
function previewFromNode(id) { ui.previewNode=id; ui.previewHistory=[id]; ui.previewVars=structuredClone(data.variables||{}); ui.contextMenu=null; ui.tab='preview'; render(); }
function duplicateNode(id,withConfig) { const source=q(id); if(!source)return; const copy=structuredClone(source); copy.id='n'+Date.now(); copy.title=withConfig?`${source.title}副本`:source.title; copy.code=`${source.code || 'NODE'}-${withConfig?'副本':'复制'}`; copy.x=source.x+250; copy.y=source.y+30; copy.createdAt=new Date().toISOString(); if(!withConfig){delete copy.next; if(copy.choices)copy.choices=[];} data.nodes.push(copy); ui.selected=copy.id; ui.contextMenu=null; save(); render(); toast(withConfig?'已创建副本':'已复制节点'); }
function removeNodeFromMenu(id) { ui.contextMenu=null; removeNode(id); }

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
      onwheel="canvasZoom(event)" oncontextmenu="closeNodeMenu();return false"
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
    ${storyInspector()}
    ${nodeContextMenu()}
  </div>`;
}

/* ── Scene Composer ─────────────────────────────────────────── */
const SCENE_COMPONENTS = {
  text: ['T', '文字'], image: ['▧', '图片'], video: ['▶', '视频'], button: ['▣', '按钮'], progress: ['▰', '进度条'], field: ['◆', '节点字段文字']
};

function sceneNodeTypes() { return [...new Set(data.nodes.map(node => node.type))]; }
function sceneTemplateType(types=sceneNodeTypes()) { if (!types.length) return ''; if (!types.includes(ui.sceneNodeType)) ui.sceneNodeType=types[0]; return ui.sceneNodeType; }
function sceneElementsForTemplate(type=sceneTemplateType()) {
  if (!type) return [];
  data.sceneTemplates = data.sceneTemplates || {};
  if (!data.sceneTemplates[type]) {
    data.sceneTemplates[type] = (data.sceneElements || []).splice(0);
  }
  return data.sceneTemplates[type];
}
function setSceneNodeType(type) { ui.sceneNodeType=type; ui.selectedSceneElement=''; render(); }
function sceneProperties(element) {
  if (!element) return `<aside class="scene-properties scene-properties-empty"><div><span>PROPERTIES</span><p>在画布中选择一个元件</p></div></aside>`;
  const [icon,label]=SCENE_COMPONENTS[element.type] || ['◇','元件'];
  if (element.type === 'image') return imageProperties(element);
  if (element.type === 'video') return videoProperties(element);
  if (element.type === 'button') return buttonProperties(element);
  if (element.type === 'progress') return progressProperties(element);
  if (element.type === 'field') return fieldProperties(element);
  if (element.type !== 'text') return `<aside class="scene-properties"><div class="scene-properties-head"><span>元件信息</span><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><section class="scene-properties-body"><div class="scene-property-type"><b>${icon}</b><div><strong>${esc(element.name || label)}</strong><small>${esc(label)}</small></div></div><dl><dt>位置</dt><dd>${element.x} × ${element.y}</dd><dt>可见性</dt><dd>${element.visible===false?'已隐藏':'显示中'}</dd><dt>图层顺序</dt><dd>${sceneElementsForTemplate().indexOf(element)+1}</dd></dl><div class="scene-property-actions"><button onclick="toggleSceneElement('${element.id}')">${element.visible===false?'显示元件':'隐藏元件'}</button><button class="danger" onclick="removeSceneElement('${element.id}')">删除元件</button></div></section></aside>`;
  const tab=ui.scenePropertyTab;
  const tabs=[['content','内容'],['transform','变换'],['style','样式'],['animation','动画'],['visibility','可见性']];
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">文字</span><strong>${esc(element.name || '文字')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${textPropertyPanel(element,tab)}</section></aside>`;
}

function textPropertyPanel(element, tab) {
  if(tab==='content') return `<div class="property-section"><label>文本内容<textarea oninput="setSceneElementProp('${element.id}','content',this.value)">${esc(element.content || '新文字')}</textarea></label><div class="property-caption">排版</div><label>字体<select onchange="setSceneElementProp('${element.id}','fontFamily',this.value)"><option value="system-ui" ${element.fontFamily==='system-ui'?'selected':''}>系统默认</option><option value="serif" ${element.fontFamily==='serif'?'selected':''}>衬线字体</option><option value="monospace" ${element.fontFamily==='monospace'?'selected':''}>等宽字体</option></select></label><label>字号<input type="number" min="8" max="120" value="${element.fontSize || 22}" oninput="setSceneElementProp('${element.id}','fontSize',this.value)" /></label><label>颜色<input type="color" value="${esc(element.color || '#f1f4f7')}" onchange="setSceneElementProp('${element.id}','color',this.value)" /></label><label>对齐<div class="property-align">${['left','center','right'].map(value=>`<button class="${(element.textAlign||'left')===value?'active':''}" onclick="setSceneElementProp('${element.id}','textAlign','${value}');render()">${{left:'左',center:'中',right:'右'}[value]}</button>`).join('')}</div></label><label>行高<input type="number" step="0.1" min="0.8" max="3" value="${element.lineHeight || 1.4}" oninput="setSceneElementProp('${element.id}','lineHeight',this.value)" /></label></div>`;
  if(tab==='transform') return `<div class="property-section"><div class="property-caption">位置 / POSITION</div><div class="property-grid"><label>X<input type="number" value="${element.x}" oninput="setSceneElementProp('${element.id}','x',this.value)" /></label><label>Y<input type="number" value="${element.y}" oninput="setSceneElementProp('${element.id}','y',this.value)" /></label></div><div class="property-caption">尺寸 / SIZE</div><div class="property-grid"><label>宽 W<input type="number" value="${element.width || 200}" oninput="setSceneElementProp('${element.id}','width',this.value)" /></label><label>高 H<input type="number" value="${element.height || 40}" oninput="setSceneElementProp('${element.id}','height',this.value)" /></label></div><label>旋转 <input type="range" min="-180" max="180" value="${element.rotation || 0}" oninput="setSceneElementProp('${element.id}','rotation',this.value)" /></label><label>不透明度 <input type="range" min="0" max="100" value="${element.opacity ?? 100}" oninput="setSceneElementProp('${element.id}','opacity',this.value)" /></label></div>`;
  if(tab==='style') return `<div class="property-section"><div class="property-caption">高级样式 / STYLE</div><p class="property-help">用于内容区未覆盖的 CSS 属性，例如 box-shadow、letter-spacing。</p><label>CSS 样式<input placeholder="例如 letter-spacing: 2px" value="${esc(element.customStyle || '')}" oninput="setSceneElementProp('${element.id}','customStyle',this.value)" /></label></div>`;
  if(tab==='animation') return `<div class="property-section">${animationFields(element,'enter','入场 / ENTER')}${animationFields(element,'exit','出场 / EXIT')}</div>`;
  return `<div class="property-section"><div class="property-caption">显隐条件 / VISIBLE IF</div><label>显示规则<select onchange="setSceneElementProp('${element.id}','visibleRule',this.value)"><option value="always" ${(element.visibleRule||'always')==='always'?'selected':''}>永远显示</option><option value="expression" ${element.visibleRule==='expression'?'selected':''}>条件表达式（后续接入）</option></select></label><label class="property-switch"><input type="checkbox" ${element.visible!==false?'checked':''} onchange="setSceneElementProp('${element.id}','visible',this.checked);render()" /> 在该模板中显示该元件</label><p class="property-help">隐藏后仍会保留在图层中，可随时重新显示。</p></div>`;
}

function imageProperties(element) {
  const tab=ui.scenePropertyTab;
  const tabs=[['content','内容'],['transform','变换'],['style','样式'],['animation','动画'],['visibility','可见性']];
  const images=data.resources.filter(resource=>resource.kind==='image');
  const content = tab==='content' ? `<div class="property-section"><div class="property-caption">图片资源</div><label>图片<select onchange="setSceneElementProp('${element.id}','resourceId',this.value);render()"><option value="">选择图片资源</option>${images.map(resource=>`<option value="${resource.id}" ${element.resourceId===resource.id?'selected':''}>${esc(resource.name)}</option>`).join('')}</select></label><label>填充方式<select onchange="setSceneElementProp('${element.id}','objectFit',this.value);render()"><option value="cover" ${element.objectFit==='cover'?'selected':''}>裁剪填充 cover</option><option value="contain" ${element.objectFit==='contain'?'selected':''}>完整显示 contain</option><option value="fill" ${element.objectFit==='fill'?'selected':''}>拉伸填充 fill</option></select></label><label>圆角<input type="number" min="0" value="${element.borderRadius || 0}" oninput="setSceneElementProp('${element.id}','borderRadius',this.value)" /></label></div>` : textPropertyPanel(element,tab);
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">图片</span><strong>${esc(element.name || '图片')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${content}</section></aside>`;
}

function videoProperties(element) {
  const tab=ui.scenePropertyTab;
  const tabs=[['content','内容'],['transform','变换'],['style','样式'],['animation','动画'],['visibility','可见性']];
  const videos=data.resources.filter(resource=>resource.kind==='video');
  const content=tab==='content' ? `<div class="property-section"><div class="property-caption">视频资源</div><label>视频<select onchange="setSceneElementProp('${element.id}','resourceId',this.value);render()"><option value="">选择视频资源</option>${videos.map(resource=>`<option value="${resource.id}" ${element.resourceId===resource.id?'selected':''}>${esc(resource.name)}</option>`).join('')}</select></label><div class="property-grid property-check-grid"><label class="property-switch"><input type="checkbox" ${element.loop?'checked':''} onchange="setSceneElementProp('${element.id}','loop',this.checked)" /> 循环播放</label><label class="property-switch"><input type="checkbox" ${element.muted?'checked':''} onchange="setSceneElementProp('${element.id}','muted',this.checked)" /> 静音</label><label class="property-switch"><input type="checkbox" ${element.hoverPlay?'checked':''} onchange="setSceneElementProp('${element.id}','hoverPlay',this.checked)" /> 悬停播放</label></div><div class="property-caption">显示</div><label>填充方式<select onchange="setSceneElementProp('${element.id}','objectFit',this.value)"><option value="cover" ${element.objectFit==='cover'?'selected':''}>裁剪填充 cover</option><option value="contain" ${element.objectFit==='contain'?'selected':''}>完整显示 contain</option><option value="fill" ${element.objectFit==='fill'?'selected':''}>拉伸填充 fill</option></select></label><div class="property-caption">效果</div><label>混合模式<select onchange="setSceneElementProp('${element.id}','blendMode',this.value)"><option value="normal" ${(element.blendMode||'normal')==='normal'?'selected':''}>正常 normal</option><option value="screen" ${element.blendMode==='screen'?'selected':''}>滤色 screen</option><option value="multiply" ${element.blendMode==='multiply'?'selected':''}>正片叠底 multiply</option><option value="overlay" ${element.blendMode==='overlay'?'selected':''}>叠加 overlay</option></select></label><label class="property-switch"><input type="checkbox" ${element.grayscale?'checked':''} onchange="setSceneElementProp('${element.id}','grayscale',this.checked)" /> 去色（黑白）</label><label>对比度<input type="range" min="0" max="200" value="${element.contrast ?? 100}" oninput="setSceneElementProp('${element.id}','contrast',this.value)" /></label></div>` : textPropertyPanel(element,tab);
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">video</span><strong>${esc(element.name || '视频')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${content}</section></aside>`;
}

function buttonProperties(element) {
  const tab=ui.scenePropertyTab;
  const tabs=[['content','内容'],['transform','变换'],['style','样式'],['animation','动画'],['visibility','可见性']];
  const icons=['▶','Ⅱ','⏭','⏮','✓','×','←','→','↑','↓','☼','☰','★','♥','⟳','🔊'];
  const content=tab==='content' ? `<div class="property-section"><label>按钮文本<input value="${esc(element.buttonText || element.content || '按钮')}" oninput="updateSceneButtonContent('${element.id}','buttonText',this.value)" /></label><div class="property-caption">图标</div><div class="button-icon-grid">${icons.map(icon=>`<button class="${element.buttonIcon===icon?'active':''}" onclick="updateSceneButtonContent('${element.id}','buttonIcon','${icon}');render()">${icon}</button>`).join('')}</div><p class="property-help">点击图标可设置按钮前缀；再次选择当前图标可保留图标。</p><div class="property-caption">样式与动作</div><label>样式预设<select onchange="setSceneElementProp('${element.id}','buttonStyle',this.value);render()"><option value="inherit" ${(element.buttonStyle||'inherit')==='inherit'?'selected':''}>无（继承样式）</option><option value="primary" ${element.buttonStyle==='primary'?'selected':''}>强调按钮</option><option value="outline" ${element.buttonStyle==='outline'?'selected':''}>描边按钮</option><option value="ghost" ${element.buttonStyle==='ghost'?'selected':''}>幽灵按钮</option></select></label><label>点击动作<input placeholder="如 goto:scene_2 / flow:next" value="${esc(element.clickAction || '')}" oninput="setSceneElementProp('${element.id}','clickAction',this.value)" /></label></div>` : textPropertyPanel(element,tab);
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">按钮</span><strong>${esc(element.name || '按钮')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${content}</section></aside>`;
}

function progressProperties(element) {
  const tab=ui.scenePropertyTab;
  const tabs=[['binding','绑定'],['style','样式'],['animation','动画'],['visibility','可见性']];
  const content=tab==='binding'
    ? `<div class="property-section"><p class="property-help progress-binding-note">「progressBar」不是成品元件，暂无可绑定的 props。</p></div>`
    : textPropertyPanel(element,tab);
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">进度条</span><strong>${esc(element.name || 'progressBar')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${content}</section></aside>`;
}

function fieldProperties(element) {
  const tab=ui.scenePropertyTab;
  const tabs=[['content','内容'],['transform','变换'],['style','样式'],['animation','动画'],['visibility','可见性']];
  const fieldValue=element.content || '节点字段 [章节名]\n${node.章节名}';
  const content=tab==='content' ? `<div class="property-section"><div class="property-caption">节点字段变量</div><label><textarea class="field-expression" oninput="setSceneElementProp('${element.id}','content',this.value)">${esc(fieldValue)}</textarea></label><p class="property-help">绑定一个节点字段（例如 <b>{{node.&lt;键&gt;}}</b>）。各节点在“节点”菜单里填写对应值，预览时会替换为字段文本。</p><div class="property-caption">排版</div><label>字体<select onchange="setSceneElementProp('${element.id}','fontFamily',this.value)"><option value="system-ui" ${element.fontFamily==='system-ui'?'selected':''}>系统默认</option><option value="serif" ${element.fontFamily==='serif'?'selected':''}>衬线字体</option><option value="monospace" ${element.fontFamily==='monospace'?'selected':''}>等宽字体</option></select></label><label>字号<input type="number" min="8" max="120" value="${element.fontSize || 22}" oninput="setSceneElementProp('${element.id}','fontSize',this.value)" /></label><label>颜色<input type="color" value="${esc(element.color || '#8ed4f0')}" onchange="setSceneElementProp('${element.id}','color',this.value)" /></label><label>对齐<div class="property-align">${['left','center','right'].map(value=>`<button class="${(element.textAlign||'left')===value?'active':''}" onclick="setSceneElementProp('${element.id}','textAlign','${value}');render()">${{left:'左',center:'中',right:'右'}[value]}</button>`).join('')}</div></label><label>行高<input type="number" step="0.1" min="0.8" max="3" value="${element.lineHeight || 1.4}" oninput="setSceneElementProp('${element.id}','lineHeight',this.value)" /></label></div>` : textPropertyPanel(element,tab);
  return `<aside class="scene-properties text-properties"><div class="scene-properties-head"><div><span class="property-kind">节点字段文字</span><strong>${esc(element.name || '节点字段文字')}</strong><small>id: ${esc(element.id)}</small></div><button onclick="ui.selectedSceneElement='';render()" title="取消选择">×</button></div><div class="property-save-row"><button class="property-save" onclick="saveSceneElement('${element.id}')">保存</button><button onclick="undoSceneElement('${element.id}')">撤回</button></div><nav class="property-tabs">${tabs.map(([id,name])=>`<button class="${tab===id?'active':''}" onclick="setScenePropertyTab('${id}')">${name}</button>`).join('')}</nav><section class="scene-properties-body">${content}</section></aside>`;
}

function animationFields(element, key, title) { return `<div class="property-animation"><div class="property-caption">${title}</div><label>预设<select onchange="setSceneElementProp('${element.id}','${key}Preset',this.value)"><option value="none">none</option><option value="fade">fade</option><option value="slideUp">slideUp</option><option value="zoom">zoom</option></select></label><label>时长 ms<input type="number" value="${element[`${key}Duration`] || ''}" oninput="setSceneElementProp('${element.id}','${key}Duration',this.value)" /></label><label>延迟 ms<input type="number" value="${element[`${key}Delay`] || ''}" oninput="setSceneElementProp('${element.id}','${key}Delay',this.value)" /></label><label>缓动<select onchange="setSceneElementProp('${element.id}','${key}Ease',this.value)"><option>easeOut</option><option>easeIn</option><option>easeInOut</option></select></label></div>`; }

function scene() {
  const nodeTypes = sceneNodeTypes();
  const activeType = sceneTemplateType(nodeTypes);
  const elements = sceneElementsForTemplate(activeType);
  const selectedElement = elements.find(element => element.id === ui.selectedSceneElement);
  return `<div class="scene-workspace">
    <aside class="scene-sidebar">
      <section class="scene-library"><div class="scene-panel-title">元件库</div>
        ${sceneLibraryGroup('基础元件', ['text','image','video','button','progress'])}
        ${sceneLibraryGroup('节点字段', ['field'])}
        <div class="scene-group"><div class="scene-group-label">成品元件</div><div class="scene-empty-library">暂无成品元件</div></div>
      </section>
      <section class="scene-layers ${ui.sceneLayersCollapsed?'collapsed':''}"><div class="scene-panel-title"><b>图层</b><span>${elements.length}<button class="scene-layer-toggle" onclick="toggleSceneLayers()" title="${ui.sceneLayersCollapsed?'展开图层':'折叠图层'}">${ui.sceneLayersCollapsed?'展开':'折叠'}</button></span></div>
        ${ui.sceneLayersCollapsed ? '' : `<div class="scene-layer-list">${elements.length ? [...elements].reverse().map(sceneLayerItem).join('') : '<div class="scene-layer-empty">拖拽元件到画布后，会在这里显示图层。</div>'}</div>`}
      </section>
    </aside>
    <main class="scene-stage-shell">
      <div class="scene-template-bar"><label>节点类型<select ${nodeTypes.length?'':'disabled'} onchange="setSceneNodeType(this.value)">${nodeTypes.length ? nodeTypes.map(type => `<option value="${type}" ${activeType===type?'selected':''}>${esc(nodeTypeName(type))}</option>`).join('') : '<option>请先在故事图创建节点</option>'}</select></label><span>编辑的是节点类型模板，同类节点共用</span></div>
      <div class="scene-stage-head"><div><span class="eyebrow">SCENE COMPOSER</span><h2>${activeType ? esc(nodeTypeName(activeType)) : '场景画布'}</h2></div><span>${activeType ? '拖拽元件到 16:9 画面中' : '请先在故事图创建节点'}</span></div>
      <div class="scene-stage-wrap"><section class="scene-stage ${activeType?'':'is-disabled'}" id="sceneStage" ondragover="sceneDragOver(event)" ondrop="sceneDrop(event)">
        ${elements.filter(element => element.visible !== false).map(sceneElementMarkup).join('')}
        ${elements.length ? '' : '<div class="scene-stage-empty"><span>＋</span><b>开始搭建场景</b><small>从左侧拖入文字、图片、视频或交互元件</small></div>'}
      </section></div>
    </main>
    ${sceneProperties(selectedElement)}
  </div>`;
}

function sceneLibraryGroup(title, types) {
  return `<div class="scene-group"><div class="scene-group-label">${title}</div><div class="scene-tool-grid">${types.map(type => `<button class="scene-tool" draggable="true" ondragstart="sceneToolDragStart(event,'${type}')" onclick="${type==='image'?'openImagePicker()':type==='video'?'openVideoPicker()':`addSceneElement('${type}')`}"><span>${SCENE_COMPONENTS[type][0]}</span>${SCENE_COMPONENTS[type][1]}</button>`).join('')}</div></div>`;
}

function sceneLayerItem(element) {
  const [icon, label] = SCENE_COMPONENTS[element.type] || ['◇','未知元件'];
  return `<div class="scene-layer-item ${ui.selectedSceneElement===element.id?'selected':''}" draggable="true" ondragstart="sceneLayerDragStart(event,'${element.id}')" ondragover="event.preventDefault()" ondrop="sceneLayerDrop(event,'${element.id}')" onclick="selectSceneElement('${element.id}')"><span class="scene-layer-grip">⋮⋮</span><span class="scene-layer-type">${icon}</span><span class="scene-layer-name">${esc(element.name || label)}</span><button class="scene-layer-eye ${element.visible===false?'off':''}" onclick="event.stopPropagation();toggleSceneElement('${element.id}')" title="${element.visible===false?'显示':'隐藏'}">${element.visible===false?'◌':'◉'}</button><button class="scene-layer-delete" onclick="event.stopPropagation();removeSceneElement('${element.id}')" title="删除元件">×</button></div>`;
}

function sceneElementMarkup(element) {
  const selected=ui.selectedSceneElement===element.id ? 'selected' : '';
  const content = element.content || { text:'新文字', image:'图片资源', video:'视频资源', button:'点击继续', progress:'', field:'{节点字段}' }[element.type] || '元件';
  const imageResource=element.type==='image' ? data.resources.find(resource=>resource.id===element.resourceId) : null;
  const videoResource=element.type==='video' ? data.resources.find(resource=>resource.id===element.resourceId) : null;
  const boxStyle=(element.type==='text'||element.type==='image'||element.type==='field') ? `width:${Number(element.width || 200)}px;height:${Number(element.height || (element.type==='image'?120:40))}px;transform:rotate(${Number(element.rotation || 0)}deg);opacity:${Number(element.opacity ?? 100)/100};border-radius:${Number(element.borderRadius || 0)}px;${(element.type==='text'||element.type==='field')?`font-family:${esc(element.fontFamily || 'system-ui')};font-size:${Number(element.fontSize || (element.type==='field'?16:22))}px;color:${esc(element.color || (element.type==='field'?'#8ed4f0':'#f1f4f7'))};text-align:${esc(element.textAlign || 'left')};line-height:${Number(element.lineHeight || 1.4)};`:''}${esc(element.customStyle || '')}` : '';
  const videoStyle=`width:${Number(element.width || 240)}px;height:${Number(element.height || 135)}px;transform:rotate(${Number(element.rotation || 0)}deg);opacity:${Number(element.opacity ?? 100)/100};mix-blend-mode:${esc(element.blendMode || 'normal')};filter:${element.grayscale?'grayscale(1) ':''}contrast(${Number(element.contrast ?? 100)}%);${esc(element.customStyle || '')}`;
  const progressStyle=esc(element.customStyle || '');
  const body=element.type==='progress'?'<i></i>':element.type==='image'?(imageResource?.url?`<img src="${esc(imageResource.url)}" alt="${esc(imageResource.name)}" style="object-fit:${esc(element.objectFit || 'cover')}" />`:'<span class="scene-media-icon">▧</span>'):element.type==='video'?(videoResource?.url?`<video src="${esc(videoResource.url)}" ${element.loop?'loop':''} ${element.muted?'muted':''} playsinline preload="metadata" style="object-fit:${esc(element.objectFit || 'cover')}"></video><span class="scene-video-badge">▶</span>`:'<span class="scene-media-icon">▶</span>'):element.type==='button'?`<span class="scene-button-icon">${esc(element.buttonIcon || '')}</span><span class="scene-button-text">${esc(element.buttonText || element.content || '按钮')}</span>`:esc(content);
  return `<div class="scene-element scene-${element.type} ${element.type==='button'?`scene-button-${esc(element.buttonStyle || 'inherit')}`:''} ${selected}" data-scene-element="${element.id}" style="left:${element.x}px;top:${element.y}px;z-index:${sceneElementsForTemplate().indexOf(element)+1};${element.type==='video'?videoStyle:element.type==='progress'?progressStyle:boxStyle}" onpointerdown="startSceneElementMove(event,'${element.id}')" onmouseenter="sceneVideoHover('${element.id}',true)" onmouseleave="sceneVideoHover('${element.id}',false)" onclick="selectSceneElement('${element.id}')">${body}</div>`;
}

function sceneToolDragStart(event, type) { event.dataTransfer.setData('application/scene-component', type); event.dataTransfer.effectAllowed='copy'; }
function sceneDragOver(event) { event.preventDefault(); event.dataTransfer.dropEffect='copy'; }
function sceneDrop(event) { event.preventDefault(); const type=event.dataTransfer.getData('application/scene-component'); if (!SCENE_COMPONENTS[type]) return; const rect=event.currentTarget.getBoundingClientRect(); addSceneElement(type, Math.max(8,event.clientX-rect.left), Math.max(8,event.clientY-rect.top)); }
function openImagePicker() { const images=data.resources.filter(resource=>resource.kind==='image'&&resource.url); showModal(`<div class="image-picker"><div class="image-picker-head"><h2>选择图片资源</h2><button onclick="closeModal()">×</button></div><div class="image-picker-actions"><button class="btn btn-primary" onclick="uploadResource(true)">上传新图片</button><span>或从下方资源库中选择一张</span></div><div class="image-picker-grid">${images.length?images.map(resource=>`<button onclick="addSceneImage('${resource.id}')"><img src="${esc(resource.url)}" alt="${esc(resource.name)}" /><span>${esc(resource.name)}</span></button>`).join(''):'<p>资源库暂无图片，请先上传图片资源。</p>'}</div></div>`); }
function addSceneImage(resourceId) { const resource=data.resources.find(item=>item.id===resourceId); if(!resource)return; const elements=sceneElementsForTemplate(); if(!elements.length&&!sceneTemplateType()) return toast('请先在故事图创建节点类型'); const element={id:`scene-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,type:'image',name:`image_${Date.now().toString().slice(-6)}`,resourceId,x:260,y:160,width:220,height:130,objectFit:'cover',borderRadius:0,opacity:100,rotation:0,visible:true}; elements.push(element); ui.selectedSceneElement=element.id; ui.scenePropertyTab='content'; ui.sceneSnapshots[element.id]=structuredClone(element); closeModal(); save(); render(); }
function openVideoPicker() { const videos=data.resources.filter(resource=>resource.kind==='video'&&resource.url); showModal(`<div class="image-picker video-picker"><div class="image-picker-head"><h2>选择视频资源</h2><button onclick="closeModal()">×</button></div><div class="image-picker-actions"><button class="btn btn-primary" onclick="uploadResource('video')">上传新视频</button><span>或从下方资源库中选择一个视频</span></div><div class="image-picker-grid">${videos.length?videos.map(resource=>`<button onmouseenter="previewPickerVideo(this,true)" onmouseleave="previewPickerVideo(this,false)" onclick="addSceneVideo('${resource.id}')"><video src="${esc(resource.url)}" muted playsinline preload="metadata"></video><span>▶ ${esc(resource.name)}</span></button>`).join(''):'<p>资源库暂无视频，请先上传视频资源。</p>'}</div></div>`); }
function previewPickerVideo(button, play) { const video=button.querySelector('video'); if(!video)return; if(play) video.play().catch(()=>{}); else { video.pause(); video.currentTime=0; } }
function addSceneVideo(resourceId) { const resource=data.resources.find(item=>item.id===resourceId); if(!resource)return; const elements=sceneElementsForTemplate(); if(!elements.length&&!sceneTemplateType()) return toast('请先在故事图创建节点类型'); const element={id:`scene-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,type:'video',name:`video_${Date.now().toString().slice(-6)}`,resourceId,x:260,y:160,width:240,height:135,objectFit:'cover',loop:false,muted:false,hoverPlay:false,blendMode:'normal',grayscale:false,contrast:100,opacity:100,rotation:0,visible:true}; elements.push(element); ui.selectedSceneElement=element.id; ui.scenePropertyTab='content'; ui.sceneSnapshots[element.id]=structuredClone(element); closeModal(); save(); render(); }
function sceneVideoHover(id, entering) { const element=sceneElementsForTemplate().find(item=>item.id===id); if(!element?.hoverPlay)return; const video=document.querySelector(`[data-scene-element="${id}"] video`); if(!video)return; if(entering) video.play().catch(()=>{}); else { video.pause(); video.currentTime=0; } }
function addSceneElement(type, x=310, y=180) { const elements=sceneElementsForTemplate(); if(!elements.length && !sceneTemplateType()) return toast('请先在故事图创建节点类型'); const [,name]=SCENE_COMPONENTS[type]; const element={id:`scene-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,type,name,x:Math.round(x),y:Math.round(y),visible:true,content:type==='text'?'新文字':type==='field'?'节点字段 [章节名]\n${node.章节名}':'',fontFamily:'system-ui',fontSize:type==='field'?16:22,color:type==='field'?'#8ed4f0':'#f1f4f7',textAlign:'left',lineHeight:1.4,width:200,height:40,opacity:100,rotation:0}; elements.push(element); ui.selectedSceneElement=element.id; ui.scenePropertyTab=type==='progress'?'binding':'content'; ui.sceneSnapshots[element.id]=structuredClone(element); save(); render(); }
function selectSceneElement(id) { const element=sceneElementsForTemplate().find(item=>item.id===id); if(element) { ui.sceneSnapshots[id]=structuredClone(element); ui.scenePropertyTab=element.type==='progress'?'binding':'content'; } ui.selectedSceneElement=id; render(); }
function setScenePropertyTab(tab) { ui.scenePropertyTab=tab; render(); }
function setSceneElementProp(id,key,value) { const element=sceneElementsForTemplate().find(item=>item.id===id); if(!element)return; element[key]=value; const node=document.querySelector(`[data-scene-element="${id}"]`); if(!node)return; if(key==='content') node.textContent=value; else if(key==='x'||key==='y') node.style[key==='x'?'left':'top']=`${Number(value)||0}px`; else if(key==='width'||key==='height') node.style[key]=`${Number(value)||0}px`; else if(key==='fontSize') node.style.fontSize=`${Number(value)||0}px`; else if(key==='fontFamily'||key==='color'||key==='textAlign'||key==='lineHeight') node.style[key]=value; else if(key==='rotation') node.style.transform=`rotate(${Number(value)||0}deg)`; else if(key==='opacity') node.style.opacity=(Number(value)||0)/100; else if(key==='borderRadius') node.style.borderRadius=`${Number(value)||0}px`; else if(key==='objectFit') node.querySelector('img,video')?.style.setProperty('object-fit',value); else if(key==='loop'||key==='muted') { const video=node.querySelector('video'); if(video) video[key]=Boolean(value); } else if(key==='blendMode') node.style.mixBlendMode=value; else if(key==='grayscale'||key==='contrast') node.style.filter=`${element.grayscale?'grayscale(1) ':''}contrast(${Number(element.contrast ?? 100)}%)`; else if(key==='customStyle') node.style.cssText+=`;${value}`; }
function updateSceneButtonContent(id,key,value) { const element=sceneElementsForTemplate().find(item=>item.id===id); if(!element)return; element[key]=value; const node=document.querySelector(`[data-scene-element="${id}"]`); if(!node)return; node.querySelector('.scene-button-icon').textContent=element.buttonIcon || ''; node.querySelector('.scene-button-text').textContent=element.buttonText || element.content || '按钮'; }
function saveSceneElement(id) { const element=sceneElementsForTemplate().find(item=>item.id===id); if(!element)return; ui.sceneSnapshots[id]=structuredClone(element); save(); toast('元件配置已保存'); }
function undoSceneElement(id) { const snapshot=ui.sceneSnapshots[id]; if(!snapshot)return; const items=sceneElementsForTemplate(); const index=items.findIndex(item=>item.id===id); if(index<0)return; items[index]=structuredClone(snapshot); render(); toast('已撤回未保存的修改'); }
function toggleSceneLayers() { ui.sceneLayersCollapsed=!ui.sceneLayersCollapsed; render(); }
function toggleSceneElement(id) { const element=sceneElementsForTemplate().find(item=>item.id===id); if (!element) return; element.visible=element.visible===false; save(); render(); }
function removeSceneElement(id) { data.sceneTemplates[sceneTemplateType()]=sceneElementsForTemplate().filter(item=>item.id!==id); if(ui.selectedSceneElement===id) ui.selectedSceneElement=''; save(); render(); }
function sceneLayerDragStart(event,id) { event.dataTransfer.setData('application/scene-layer',id); event.dataTransfer.effectAllowed='move'; }
function sceneLayerDrop(event,targetId) { event.preventDefault(); event.stopPropagation(); const sourceId=event.dataTransfer.getData('application/scene-layer'); if(!sourceId || sourceId===targetId) return; const items=sceneElementsForTemplate(); const sourceIndex=items.findIndex(item=>item.id===sourceId), targetIndex=items.findIndex(item=>item.id===targetId); if(sourceIndex<0||targetIndex<0)return; const [item]=items.splice(sourceIndex,1); items.splice(targetIndex,0,item); save(); render(); }
let sceneMove = null;
function startSceneElementMove(event,id) { if(event.button!==0)return; event.stopPropagation(); const element=sceneElementsForTemplate().find(item=>item.id===id); const stage=document.querySelector('#sceneStage'); if(!element||!stage)return; ui.selectedSceneElement=id; const rect=stage.getBoundingClientRect(); sceneMove={id,offsetX:event.clientX-rect.left-element.x,offsetY:event.clientY-rect.top-element.y}; document.addEventListener('pointermove',moveSceneElement); document.addEventListener('pointerup',endSceneElementMove,{once:true}); }
function moveSceneElement(event) { if(!sceneMove)return; const element=sceneElementsForTemplate().find(item=>item.id===sceneMove.id); const stage=document.querySelector('#sceneStage'); if(!element||!stage)return; const rect=stage.getBoundingClientRect(); element.x=Math.max(0,Math.min(rect.width-40,Math.round(event.clientX-rect.left-sceneMove.offsetX))); element.y=Math.max(0,Math.min(rect.height-30,Math.round(event.clientY-rect.top-sceneMove.offsetY))); const node=document.querySelector(`[data-scene-element="${sceneMove.id}"]`); if(node){node.style.left=`${element.x}px`;node.style.top=`${element.y}px`;node.classList.add('selected');} }
function endSceneElementMove() { if(!sceneMove)return; sceneMove=null; document.removeEventListener('pointermove',moveSceneElement); save(); render(); }

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
  const folders = data.folders || [];
  const supported = data.resources.filter(r => r.kind === 'video' || r.kind === 'image');
  let rs = supported.filter(r => (ui.filter === 'all' || r.kind === ui.filter) && (ui.resourceFolder === 'all' || r.folderId === ui.resourceFolder));
  const selectedResource = data.resources.find(r => r.id === ui.selectedResource);
  return `<main class="content-page">
    <section class="resource-main">
      <div class="eyebrow">ASSET LIBRARY</div>
      <h1 class="page-title">资源</h1>
      <div class="resource-toolbar">
        ${['all','video','image'].map(x =>
          `<button class="filter ${ui.filter===x?'active':''}" onclick="setFilter('${x}')">${{all:'全部',video:'🎬 视频',image:'🖼 图片'}[x]}</button>`
        ).join('')}
        <button class="btn btn-primary" onclick="uploadResource()">＋ 上传资源</button>
      </div>
      <div class="resource-folder-bar" aria-label="资源文件夹">
        <button class="folder-chip ${ui.resourceFolder==='all'?'active':''}" onclick="setResourceFolder('all')">▣ 全部 <span>${supported.length}</span></button>
        ${folders.map(folder => `<button class="folder-chip ${ui.resourceFolder===folder.id?'active':''}" onclick="setResourceFolder('${folder.id}')">▰ ${esc(folder.name)} <span>${supported.filter(r => r.folderId===folder.id).length}</span></button>`).join('')}
        <button class="folder-create" onclick="createResourceFolder()">＋ 新建文件夹</button>
      </div>
      <div class="upload-zone" onclick="uploadResource()">
        📁 点击选择资源文件，或拖放到这里<br>
        <small>支持 MP4、WebM、PNG、JPG、WebP</small>
      </div>
      <div class="resource-view-actions"><span>共 ${rs.length} 个资源</span><div><button class="view-switch ${ui.resourceView==='grid'?'active':''}" onclick="setResourceView('grid')">▦ 网格</button><button class="view-switch ${ui.resourceView==='list'?'active':''}" onclick="setResourceView('list')">☷ 列表</button></div></div>
      ${ui.resourceView==='grid' ? `<div class="resources">${rs.map(resourceGridCard).join('')}</div>` : resourceList(rs)}
    </section>
    ${selectedResource ? resourceInspector(selectedResource) : ''}
  </main>`;
}

function resourceMediaPreview(resource) {
  if (!resource.url) return `<span>${resource.kind==='video'?'▶ 视频':'🖼 图片'}</span>`;
  return resource.kind === 'video'
    ? `<video data-resource-video="${esc(resource.id)}" src="${esc(resource.url)}" muted playsinline preload="metadata"></video><span class="asset-video-badge">▶ 视频</span>`
    : `<img src="${esc(resource.url)}" alt="${esc(resource.name)}" />`;
}

function resourceGridCard(r) {
  return `<article class="resource-card resource-card-media ${ui.selectedResource===r.id?'selected':''}" data-resource-id="${esc(r.id)}" onclick="handleResourceClick(event,'${r.id}')" title="单击查看详情，双击全屏查看">
    <div class="asset-preview ${r.kind==='image'?'image':''}" onmouseenter="previewResourceVideo('${r.id}')" onmouseleave="pauseResourceVideo('${r.id}')">${resourceMediaPreview(r)}</div>
    <div class="asset-info"><div class="asset-info-head"><b>${esc(r.name)}</b><button class="asset-delete" onclick="event.stopPropagation();deleteResource('${r.id}')" title="移除资源" aria-label="移除资源"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 .8 13h8.4L17 7M10 11v5m4-5v5" /></svg></button></div><small><span>${esc(r.info || '—')}</span><span class="asset-format">${resourceFileFormat(r)}</span><span class="asset-dimensions">${esc(r.dimensions || '—')}</span></small></div>
  </article>`;
}

function resourceFileFormat(resource) {
  const fileName = String(resource.name || resource.url || '');
  const extension = fileName.split('.').pop();
  return extension && extension !== fileName ? extension.toUpperCase() : (resource.kind === 'video' ? 'VIDEO' : 'IMAGE');
}

function resourceList(rs) {
  return `<div class="resource-list" role="list">
    <div class="resource-list-head"><span>名称</span><span>类型</span><span>大小</span><span>时长</span><span>创建时间</span></div>
    ${rs.map(r => `<button class="resource-list-row ${ui.selectedResource===r.id?'selected':''}" data-resource-id="${esc(r.id)}" onclick="handleResourceClick(event,'${r.id}')" onmouseenter="previewResourceVideo('${r.id}')" onmouseleave="pauseResourceVideo('${r.id}')" title="单击查看详情，双击全屏查看"><span class="resource-list-name"><span class="resource-list-thumb">${r.url && r.kind==='image'?`<img src="${esc(r.url)}" alt="" />`:r.url && r.kind==='video'?`<video data-resource-video="${esc(r.id)}" src="${esc(r.url)}" muted playsinline preload="metadata"></video>`:'▣'}</span>${esc(r.name)}</span><span>${r.kind==='video'?'视频':'图片'}</span><span>${esc(r.info || '—')}</span><span>${esc(r.kind==='video' ? (r.duration || '—') : '—')}</span><span>${resourceCreatedAt(r)}</span></button>`).join('')}
  </div>`;
}

function resourceCreatedAt(resource) { return resource.createdAt ? esc(resource.createdAt.slice(0,16).replace('T',' ')) : '—'; }
function boundResourceNodes(resource) { return data.nodes.filter(node => node.resource === resource.name); }

function resourceInspector(resource) {
  const nodes = boundResourceNodes(resource);
  const folders = data.folders || [];
  return `<aside class="resource-inspector"><div class="resource-inspector-head"><span>资源详情</span><button onclick="closeResourceInspector()" title="关闭">×</button></div>
    <div class="resource-inspector-media" data-resource-id="${esc(resource.id)}" ondblclick="fullscreenResource('${resource.id}')">${resource.kind==='video' ? `<video src="${esc(resource.url || '')}" controls preload="metadata" onloadedmetadata="recordResourceVideoMetadata('${resource.id}',this)"></video>` : resource.url ? `<img src="${esc(resource.url)}" alt="${esc(resource.name)}" />` : '<span>暂无预览</span>'}</div>
    <section class="resource-inspector-body"><label>名称<input value="${esc(resource.name)}" onchange="renameResource('${resource.id}',this.value)" /></label><dl><dt>类型</dt><dd>${resource.kind==='video'?'视频':'图片'}</dd><dt>创建时间</dt><dd>${resourceCreatedAt(resource)}</dd><dt>分辨率</dt><dd>${esc(resource.dimensions || '—')}</dd>${resource.kind==='video'?`<dt>时长</dt><dd>${esc(resource.duration || '—')}</dd>`:''}<dt>大小</dt><dd>${esc(resource.info || '—')}</dd><dt>路径</dt><dd title="${esc(resource.url || '')}">${esc(resource.url || '—')}</dd></dl>
      <label>所属文件夹<select onchange="moveResourceToFolder('${resource.id}',this.value)"><option value="">未分类</option>${folders.map(folder => `<option value="${folder.id}" ${resource.folderId===folder.id?'selected':''}>${esc(folder.name)}</option>`).join('')}</select></label>
      <div class="resource-bindings"><h4>当前绑定节点 <span>${nodes.length}</span></h4>${nodes.length ? nodes.map(node => `<button onclick="openBoundNode('${node.id}')">${esc(node.title || nodeTypeName(node.type))}<span>${esc(nodeTypeName(node.type))}</span></button>`).join('') : '<p>当前资源未绑定节点</p>'}</div>
    </section>
  </aside>`;
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
  let content = { story, scene, node:nodePage, resource:resourcePage, chapter:chapterPage, preview:previewPage }[ui.tab]();
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
  ui.contextMenu = null;
  render();
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

function setNode(id, k, v) {
  const node = q(id);
  if (!node) return;
  node[k] = v;
  save();
  if (k === 'title' && ui.tab === 'story') {
    const title = document.querySelector(`[data-node="${id}"] strong`);
    if (title) title.textContent = v || nodeTypeName(node.type);
    const tree = document.querySelector('#outlineTree');
    if (tree) tree.innerHTML = outlineTreeMarkup();
  }
}
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
    x: 280 + (index%3) * 200, y: 380 + Math.floor(index/3) * 120,
    createdAt: new Date().toISOString()
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
function uploadResource(resourceType='all') {
  const imagesOnly=resourceType===true || resourceType==='image';
  const videosOnly=resourceType==='video';
  let input = document.createElement('input');
  input.type = 'file'; input.multiple = true;
  input.accept = imagesOnly ? 'image/*' : videosOnly ? 'video/*' : 'video/*,image/*';
  input.onchange = async () => {
    let files = [...input.files].filter(f => imagesOnly ? f.type.startsWith('image/') : videosOnly ? f.type.startsWith('video/') : (f.type.startsWith('video/') || f.type.startsWith('image/')));
    if (!files.length) return toast(imagesOnly ? '仅支持上传图片资源' : videosOnly ? '仅支持上传视频资源' : '仅支持上传图片或视频资源');
    toast('📤 资源正在上传…');
    try {
      for (const f of files) {
        if (backendOnline) {
          let form = new FormData(); form.append('file', f);
          let r = await fetch('/api/assets', { method:'POST', body:form });
          if (!r.ok) throw Error(f.name+' 上传失败');
          const resource={...await r.json(), createdAt:new Date().toISOString(), folderId: ui.resourceFolder==='all' ? '' : ui.resourceFolder};
          data.resources.unshift(resource); await captureResourceMetadata(resource);
        } else {
          let kind = f.type.startsWith('video')?'video':'image';
          data.resources.unshift({ id:'r'+Date.now()+Math.random(), name:f.name, kind, info:(f.size/1024/1024).toFixed(1)+' MB', used:'未绑定', createdAt:new Date().toISOString(), folderId: ui.resourceFolder==='all' ? '' : ui.resourceFolder });
        }
      }
      save(); render();
      if (imagesOnly) openImagePicker();
      if (videosOnly) openVideoPicker();
      toast(`✅ 已添加 ${files.length} 个资源`);
    } catch (error) { toast(error.message || '资源上传失败'); }
  };
  input.click();
}

function deleteResource(id) {
  let r = data.resources.find(x => x.id === id);
  if (data.nodes.some(n => n.resource === r.name)) return toast('该资源正在被节点使用，请先解除绑定');
  data.resources = data.resources.filter(r => r.id !== id);
  if (ui.selectedResource === id) ui.selectedResource = '';
  save(); render(); toast('资源已移除');
}

function setResourceView(view) { ui.resourceView=view; render(); }
function setResourceFolder(folderId) { ui.resourceFolder=folderId; ui.selectedResource=''; render(); }
function selectResource(id) { ui.selectedResource=id; render(); }
function handleResourceClick(event, id) { clearTimeout(resourceClickTimer); if (event.detail > 1) return fullscreenResource(id); resourceClickTimer=setTimeout(() => selectResource(id), 190); }
function closeResourceInspector() { ui.selectedResource=''; render(); }
function previewResourceVideo(id) { const video=document.querySelector(`[data-resource-video="${CSS.escape(id)}"]`); if (!video) return; video.play().catch(() => {}); }
function pauseResourceVideo(id) { const video=document.querySelector(`[data-resource-video="${CSS.escape(id)}"]`); if (!video) return; video.pause(); video.currentTime = 0; }
function fullscreenResource(id) {
  const holder = document.querySelector(`[data-resource-id="${CSS.escape(id)}"]`);
  const media = holder?.querySelector('img, video');
  if (!media) return toast('该资源暂无预览内容');
  media.requestFullscreen?.().catch(() => toast('无法进入全屏'));
}
function captureResourceMetadata(resource) {
  if (!resource?.url) return Promise.resolve();
  return new Promise(resolve => {
    const media=document.createElement(resource.kind==='video'?'video':'img');
    const done=()=>{ resource.dimensions=`${media.videoWidth || media.naturalWidth || '—'}×${media.videoHeight || media.naturalHeight || '—'}`; if(resource.kind==='video' && Number.isFinite(media.duration) && media.duration>0) resource.duration=`${media.duration.toFixed(1)}s`; resolve(); };
    media.onloadedmetadata=done; media.onload=done; media.onerror=resolve; media.src=resource.url;
  });
}
async function enrichExistingResourceMetadata() {
  const targets=data.resources.filter(resource => resource.kind==='video' && resource.url && (!resource.duration || resource.duration==='—'));
  if (!targets.length) return;
  for (const resource of targets) await captureResourceMetadata(resource);
  save();
}
function recordResourceVideoMetadata(id, video) {
  const resource=data.resources.find(item=>item.id===id);
  if (!resource || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const duration=`${video.duration.toFixed(1)}s`;
  const dimensions=`${video.videoWidth || '—'}×${video.videoHeight || '—'}`;
  if (resource.duration===duration && resource.dimensions===dimensions) return;
  resource.duration=duration; resource.dimensions=dimensions; save();
}
function renameResource(id, name) { const resource=data.resources.find(item=>item.id===id); const nextName=name.trim(); if (!resource || !nextName || resource.name===nextName) return; const oldName=resource.name; resource.name=nextName; data.nodes.forEach(node => { if (node.resource===oldName) node.resource=nextName; }); save(); render(); }
function moveResourceToFolder(id, folderId) { const resource=data.resources.find(item=>item.id===id); if (!resource) return; resource.folderId=folderId; save(); render(); }
function createResourceFolder() { showModal(`<div class="eyebrow">RESOURCE FOLDER</div><h2>新建文件夹</h2><p style="color:var(--muted);margin:0 0 16px">文件夹用于归类视频和图片资源，可在资源详情中调整归属。</p><label class="modal-field">文件夹名称<input id="folderName" placeholder="例如：第一章素材" maxlength="30" /></label><div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmCreateResourceFolder()">创建文件夹</button></div>`); }
function confirmCreateResourceFolder() { const input=document.querySelector('#folderName'); const name=input?.value.trim(); if (!name) return input?.focus(); data.folders=data.folders||[]; if(data.folders.some(folder=>folder.name===name)) return toast('已有同名文件夹'); const folder={id:`folder-${Date.now()}`,name}; data.folders.push(folder); ui.resourceFolder=folder.id; closeModal(); save(); render(); toast('文件夹已创建'); }
function openBoundNode(id) { ui.tab='story'; ui.selectedResource=''; render(); requestAnimationFrame(()=>focusCanvasNode(id)); }

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
    story: { nodes:data.nodes, chapters:data.chapters, resources:data.resources, folders:data.folders || [], sceneElements:data.sceneElements || [], sceneTemplates:data.sceneTemplates || {}, variables:data.variables }
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
      if (obj.story.folders) data.folders = obj.story.folders;
      if (obj.story.sceneElements) data.sceneElements = obj.story.sceneElements;
      if (obj.story.sceneTemplates) data.sceneTemplates = obj.story.sceneTemplates;
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
