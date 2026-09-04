/* Aimos Platform shell — 导航配置与路由
 *
 * NAV 是平台导航的唯一配置源：新增/调整模块只改这里。
 * - type: 'iframe'      → 嵌入 apps/ 下的原型应用（隐藏其内置侧边栏）
 * - type: 'placeholder' → 渲染占位页（待设计模块）
 * hash 路由：#<moduleId>/<itemId>，刷新后保持当前页面。
 */

const GITHUB_BASE = 'https://github.com/Cedric-Chan/AimosMLOps/blob/main';

const ICONS = {
  onlineRuntime: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
  aiHub: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"/><path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"/></svg>',
  modelPlatform: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
  featureStore: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 11 2-2-2-2"/><path d="M11 13h4"/><rect width="18" height="18" x="3" y="3" rx="2"/></svg>',
  console: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  backgroundTask: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
};

const FS_APP = 'apps/feature-store/index.html';
const ME_APP = 'apps/model-experiment/index.html';
const USER_APP = 'apps/user-mgmt/index.html';
const AG_APP = 'apps/alert-group/index.html';
const FE_APP = 'apps/feature-entity/index.html';
const FT_APP = 'apps/feature-tag/index.html';

/* 应用缓存版本号：改动任一原型 app 后递增，强制浏览器刷新 iframe 里的 index.html
 * （应用的 index.html 被缓存而 assets 哈希已换时会出现空白页面） */
const APPS_VERSION = '20260904b';
const ARCH_APP = 'apps/architecture/index.html';

const NAV = [
  {
    id: 'online-runtime',
    label: 'Online Runtime',
    icon: ICONS.onlineRuntime,
    items: [
      { id: 'orches-service', label: 'Orches Service', type: 'placeholder',
        desc: '传统模型实时服务的编排入口：在线推理服务的注册、编排、发布与治理。原型与交互规格待设计。',
        notes: ['对应线上平台 Online Runtime / Orches Service 页面', '待补充：服务列表视图、编排画布、版本与流量治理'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
      { id: 'llm-workflow', label: 'LLM Workflow', type: 'placeholder',
        desc: 'AI Workflow 编排页：LLM 应用 / 工作流的搭建、调试与运行。原型与交互规格待设计。',
        notes: ['对应线上平台 Online Runtime / LLM Workflow 页面', '待补充：Workflow 画布、节点配置、调试与发布链路'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
      { id: 'agent-app', label: 'Agent App', type: 'placeholder', badge: 'Future',
        desc: '未来空槽位：预留承载 Agent 应用的模块，当前不做设计。',
        notes: ['真实平台导航中的预留扩展位', '待 Agent 应用形态明确后再启动设计'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
    ],
  },
  {
    id: 'ai-hub',
    label: 'AI Hub',
    icon: ICONS.aiHub,
    items: [
      { id: 'llm-mgmt', label: 'LLM Mgmt', type: 'placeholder',
        desc: 'AI 资产统一管理入口：LLM 模型资产的接入、版本与供应商管理（对应线上平台的 (new) LLM Management）。原型待设计。',
        notes: ['线上平台当前拆分为 (new) LLM Management / LLM Model / LLM Provider，目标结构收敛为 LLM Mgmt 一个子模块', '待补充：资产列表、接入表单、供应商配置'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
      { id: 'skill-market', label: 'Skill Market', type: 'placeholder',
        desc: 'Skill 市场：AI 技能（Skill）资产的发布、分发与订阅管理。原型待设计。',
        notes: ['AI Hub 三大子模块之一', '待补充：Skill 上架流程、市场列表、使用统计'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
      { id: 'knowledge-base', label: 'Knowledge Base', type: 'placeholder',
        desc: '知识库：AI 资产中的知识（文档 / 语料 / 索引）管理。原型待设计。',
        notes: ['AI Hub 三大子模块之一', '待补充：知识库列表、文档导入、索引构建链路'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
    ],
  },
  {
    id: 'model-platform',
    label: 'Model Platform',
    icon: ICONS.modelPlatform,
    items: [
      { id: 'mlflow', label: 'MLFlow', type: 'placeholder',
        desc: '连接 DS GitLab 与 Aimos 平台的桥梁：实验记录与模型产物的同步、注册入口。原型待设计。',
        notes: ['对应线上平台 Model Platform / MLFLow 页面', '上下游关系见平台架构文档'],
        doc: `${GITHUB_BASE}/docs/model-experiment/architecture/mlflow-integration.md` },
      { id: 'model-mgmt', label: 'Model Mgmt', type: 'placeholder',
        desc: 'Aimos 管理模型逻辑容器（Model → ModelVersion → Build）的列表。原型待设计，领域模型参考 Model Experiment 的术语表。',
        notes: ['对应线上平台 Model Platform / Model Management 页面', '领域模型：docs/model-experiment/GLOSSARY.md'],
        doc: `${GITHUB_BASE}/docs/model-experiment/GLOSSARY.md` },
      { id: 'model-experiment', label: 'Model Experiment', type: 'iframe', app: ME_APP,
        desc: '由 ModelExperiment 仓库原型覆盖：训练任务全生命周期（任务配置 → 调度执行 → Pipeline → 评估 → 归档 → 注册）。' },
      { id: 'model-deployment', label: 'Model Deployment', type: 'placeholder',
        desc: '部署模型训练产物（Build）为在线推理服务的地方，向下对接 Online Runtime。原型待设计。',
        notes: ['对应线上平台 Model Platform / Model Deployment 页面', '待补充：部署表单、实例列表、发布与回滚'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
    ],
  },
  {
    id: 'feature-store',
    label: 'Feature Store',
    icon: ICONS.featureStore,
    items: [
      { id: 'data-source', label: 'Data Source', type: 'iframe', app: FS_APP, route: '#/ds' },
      { id: 'feature-source', label: 'Feature Source', type: 'iframe', app: FS_APP, route: '#/fs' },
      { id: 'transformation', label: 'Transformation', type: 'iframe', app: FS_APP, route: '#/tf' },
      { id: 'feature-group', label: 'Feature Group', type: 'iframe', app: FS_APP, route: '#/fg' },
      { id: 'feature-map', label: 'Feature Map', type: 'iframe', app: FS_APP, route: '#/fm' },
      { id: 'entity', label: 'Feature Entity', type: 'iframe', app: FE_APP,
        desc: '特征实体管理原型：实体 = 唯一实体说明（避免混用和歧义）；当前用于 FG 注册与 Orches Service Start 节点自动补全，未来承载特征实体统一治理。' },
      { id: 'feature-tag', label: 'Feature Tag', type: 'iframe', app: FT_APP,
        desc: '特征标签管理原型：二级结构 Category → Feature Tag；Category Dir 浮窗管理一级目录；注册的 Tag 供 Feature Map 打标签与 Tag 检索使用（localStorage 共享注册表）。' },
      { id: 'wide-table', label: 'Wide Table', type: 'iframe', app: FS_APP, route: '#/wt' },
      // Architecture 入口固定在左下角页脚（hidden 不进导航）；archify 生成的平台架构图册
      { id: 'architecture', label: 'Architecture', hidden: true, type: 'iframe', app: ARCH_APP,
        desc: '平台架构图册（archify 生成）：架构总览 + 端到端数据流 + 说明与待确认事项。' },
    ],
  },
  {
    id: 'console',
    label: 'Console',
    icon: ICONS.console,
    items: [
      { id: 'user', label: 'User', type: 'iframe', app: USER_APP,
        desc: '用户管理中心原型：用户可归属多个 Biz Team，Team 内角色分 VIEWER / EDITOR / ADMIN；列表按 Email + Biz Team 聚合展示；superadmin 经 Team Dir 浮窗管理 Biz Team 目录。' },
      { id: 'alert-group', label: 'Alert Group', type: 'iframe', app: AG_APP,
        desc: '告警接收组配置原型：Name（唯一）+ Type（SeaTalk）+ Webhook；Verify 向 webhook 发送一条测试消息（原型为动效演示，不真实发送）。' },
    ],
  },
  {
    id: 'background-task',
    label: 'Background Task',
    icon: ICONS.backgroundTask,
    standalone: true,
    items: [
      { id: 'background-task-home', label: 'Background Task', type: 'placeholder',
        desc: '后台任务：平台后台异步任务（调度、补偿、清理等）的查询与管理。原型待设计。',
        notes: ['线上平台为独立顶级模块'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
    ],
  },
];

/* ---------- 渲染与路由 ---------- */

const navEl = document.getElementById('nav');
const contentBody = document.getElementById('content-body');
const openStandaloneBtn = document.getElementById('open-standalone');
let currentKey = null;
let currentIframeItem = null;

function findItem(key) {
  const [moduleId, itemId] = (key || '').split('/');
  for (const mod of NAV) {
    if (mod.id !== moduleId) continue;
    for (const item of mod.items) {
      if (item.id === itemId) return { mod, item };
    }
  }
  return null;
}

function renderNav() {
  navEl.innerHTML = '';
  for (const mod of NAV) {
    const modEl = document.createElement('div');
    modEl.className = 'module' + (mod.standalone ? ' module-standalone' : '');
    modEl.dataset.module = mod.id;

    const header = document.createElement('button');
    header.className = 'module-header';
    header.title = mod.label;
    header.innerHTML =
      `<span class="icon">${mod.icon}</span><span>${mod.label}</span><span class="chevron">${ICONS.chevron}</span>`;
    header.addEventListener('click', () => {
      if (document.getElementById('sidebar').classList.contains('collapsed')) {
        // 收起态点模块图标：展开侧边栏并打开该模块分组
        document.getElementById('sidebar').classList.remove('collapsed');
        modEl.classList.remove('collapsed');
        syncToggle();
      } else {
        modEl.classList.toggle('collapsed');
      }
    });
    modEl.appendChild(header);

    const itemsEl = document.createElement('div');
    itemsEl.className = 'module-items';
    for (const item of mod.items) {
      if (item.hidden) continue;
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.key = `${mod.id}/${item.id}`;
      btn.innerHTML = `<span>${item.label}</span>` +
        (item.badge ? `<span class="badge">${item.badge}</span>` : '');
      btn.addEventListener('click', () => {
        location.hash = `#${mod.id}/${item.id}`;
      });
      itemsEl.appendChild(btn);
    }
    modEl.appendChild(itemsEl);
    navEl.appendChild(modEl);
  }
}

function highlight(key) {
  const archLink = document.getElementById('arch-link');
  if (archLink) archLink.classList.toggle('active', key === 'feature-store/architecture');
  navEl.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.key === key);
  });
  // 当前所在模块的标题/图标高亮（对齐真实平台：默认深灰，激活 teal）
  navEl.querySelectorAll('.module').forEach((el) => {
    const owns = !!key && key.startsWith(el.dataset.module + '/');
    el.querySelector('.module-header').classList.toggle('active-header', owns);
  });
}

function showPlaceholder(mod, item) {
  currentIframeItem = null;
  openStandaloneBtn.hidden = true;
  const chipClass = item.badge === 'Future' ? 'future' : 'placeholder';
  const chipText = item.badge === 'Future' ? 'Future · 预留' : 'Placeholder · 待设计';
  contentBody.innerHTML = `
    <div class="placeholder-wrap">
      <div class="placeholder-card">
        <div class="crumb">${mod.label} / ${item.label}</div>
        <h1>${item.label}<span class="chip ${chipClass}">${chipText}</span></h1>
        <p class="desc">${item.desc || ''}</p>
        ${item.notes ? `<h2>设计备注</h2><ul>${item.notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
        ${item.doc ? `<h2>相关文档</h2><ul><li><a href="${item.doc}" target="_blank" rel="noopener">${item.doc.replace(GITHUB_BASE + '/', '')}</a></li></ul>` : ''}
        <div class="footer">Aimos MLOps 平台交互 Demo · 本页为占位页，原型与规格将在后续迭代中补充</div>
      </div>
    </div>`;
}

function showIframe(mod, item) {
  currentIframeItem = item;
  openStandaloneBtn.hidden = false;
  openStandaloneBtn.title = `在新窗口打开 ${item.label} 原型（用于元素选取）`;
  const src = item.app + '?v=' + APPS_VERSION + (item.route || '');
  contentBody.innerHTML = `<iframe id="proto" src="${src}"></iframe>`;
  const iframe = contentBody.querySelector('iframe');
  iframe.addEventListener('load', () => {
    // 同源注入：隐藏原型应用自带的侧边栏，保持与真实平台一致的单一导航
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.head) {
        const style = doc.createElement('style');
        style.textContent = 'aside{display:none!important}';
        doc.head.appendChild(style);
      }
    } catch (e) { /* 跨域时忽略 */ }
  });
}

/* ---------- 模块手风琴：导航后只展开当前模块，其余折叠 ---------- */

function syncModuleGroups(activeModuleId) {
  navEl.querySelectorAll('.module').forEach((el) => {
    el.classList.toggle('collapsed', el.dataset.module !== activeModuleId);
  });
}

function navigate() {
  const key = (location.hash || '').replace(/^#\/?/, '');
  const found = findItem(key) || findItem('online-runtime/orches-service');
  if (!found) return;
  const { mod, item } = found;
  const fullKey = `${mod.id}/${item.id}`;

  if (fullKey !== currentKey) {
    currentKey = fullKey;
    if (item.type === 'iframe') showIframe(mod, item);
    else showPlaceholder(mod, item);
    document.title = `${item.label} · Aimos Platform`;
  }
  highlight(fullKey);
  syncModuleGroups(mod.id);
}

renderNav();

/* ---------- 右下角：新窗口打开原型（元素选取用） ---------- */

openStandaloneBtn.addEventListener('click', () => {
  if (!currentIframeItem) return;
  let url = currentIframeItem.app + (currentIframeItem.route || '');
  try {
    // 跟随 iframe 内部的实时路由（如 FG 详情 /fg/1），保证新窗口落在同一页面
    const innerHash = document.querySelector('iframe')?.contentWindow?.location.hash;
    if (innerHash) url = currentIframeItem.app + innerHash;
  } catch (e) { /* 跨域时忽略 */ }
  window.open(url, '_blank', 'noopener');
});

/* ---------- 侧边栏收起 / 展开 ---------- */

const sidebarEl = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

function syncToggle() {
  const collapsed = sidebarEl.classList.contains('collapsed');
  toggleBtn.title = collapsed ? '展开导航' : '收起导航';
  toggleBtn.setAttribute('aria-label', toggleBtn.title);
}

toggleBtn.addEventListener('click', () => {
  sidebarEl.classList.toggle('collapsed');
  syncToggle();
});

window.addEventListener('hashchange', navigate);
navigate();
