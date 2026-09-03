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
      { id: 'entity', label: 'Entity', type: 'placeholder',
        desc: '特征实体（Entity）管理：特征所挂载的业务主体定义。现有 Feature Store 原型未覆盖独立 Entity 页面，占位待设计。',
        notes: ['真实平台 Feature Store 导航项，原型暂缺', '概念定义参见特征平台架构说明'],
        doc: `${GITHUB_BASE}/docs/feature-store/architecture/在线特征平台架构说明.md` },
      { id: 'feature-tag', label: 'Feature Tag', type: 'placeholder',
        desc: '特征标签（Feature Tag）管理：标签体系与打标管理。目前标签能力内嵌于 Feature Map 的过滤面板，独立管理页待设计。',
        notes: ['真实平台 Feature Store 导航项，原型暂缺独立页面', '现有标签数据目录见原型 tagCatalog'],
        doc: `${GITHUB_BASE}/docs/feature-store/architecture/在线特征平台架构说明.md` },
      { id: 'wide-table', label: 'Wide Table', type: 'iframe', app: FS_APP, route: '#/wt' },
      // Architecture 入口固定在左下角页脚（hidden 不进导航）；原 /arch 原型资产已下线，待填充新内容
      { id: 'architecture', label: 'Architecture', hidden: true, type: 'placeholder',
        desc: '平台架构内容占位：原 Feature Store 架构图资产已下线，新的架构与数据流内容将在此填充。',
        notes: ['入口固定在页面左下角页脚', '待填充：新架构图、数据流说明'] },
    ],
  },
  {
    id: 'console',
    label: 'Console',
    icon: ICONS.console,
    items: [
      { id: 'user', label: 'User', type: 'iframe', app: USER_APP,
        desc: '用户管理中心原型：用户可归属多个 Biz Team，Team 内角色分 VIEWER / EDITOR / ADMIN；列表按 Email + Biz Team 聚合展示；superadmin 经 Team Dir 浮窗管理 Biz Team 目录。' },
      { id: 'alert-group', label: 'Alert Group', type: 'placeholder',
        desc: '告警组：配置告警 webhook 的地方。原型待设计。',
        notes: ['对应线上平台 Console / Alert Group 页面', '待补充：告警组列表、webhook 配置表单'],
        doc: `${GITHUB_BASE}/docs/platform/module-inventory.md` },
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
const contentEl = document.getElementById('content');
let currentKey = null;

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
    header.innerHTML =
      `<span class="icon">${mod.icon}</span><span>${mod.label}</span><span class="chevron">${ICONS.chevron}</span>`;
    header.addEventListener('click', () => modEl.classList.toggle('collapsed'));
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
  // 独立顶级模块（无子项文案差异）时高亮其模块头
  navEl.querySelectorAll('.module').forEach((el) => {
    const standalone = el.classList.contains('module-standalone');
    const owns = key && key.startsWith(el.dataset.module + '/');
    el.querySelector('.module-header').classList.toggle('active-header', standalone && !!owns);
  });
}

function showPlaceholder(mod, item) {
  const chipClass = item.badge === 'Future' ? 'future' : 'placeholder';
  const chipText = item.badge === 'Future' ? 'Future · 预留' : 'Placeholder · 待设计';
  contentEl.innerHTML = `
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
  const src = item.app + (item.route || '');
  contentEl.innerHTML = `<iframe id="proto" src="${src}"></iframe>`;
  const iframe = contentEl.querySelector('iframe');
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
}

renderNav();
window.addEventListener('hashchange', navigate);
navigate();
