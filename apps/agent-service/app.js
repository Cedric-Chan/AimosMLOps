/* Aimos — Agent Service 原型（纯静态）
 *
 * 领域口径见 docs/agent-service/spec.md：
 * - 应用级 onlineStatus：0 UnDeployed / 1 Online；API Debug 仅 Online 可点（硬门控 1）
 * - Deploy 的前置是 Space 资源，与 onlineStatus 正交（硬门控 2）
 * - 空 Prompt 不可保存/发布
 * - 页面结构：列表（筛选 + 表格 + 分页）/ 配置台（四卡 + Preview，无画布、无版本表）/ 部署管理（Space 资源 + 部署记录）
 *
 * 与 spec 记录不同的两处，均为本次需求的显式取舍：
 * 1. 列表 Region 筛选按需求写作文本输入（spec §2 记录平台为下拉，见 Q16）。
 * 2. 无 Space 资源时仍展示部署记录（平台实测空态为 No data），以便演示状态筛选与门控。
 *
 * 数据全部为合成占位：邮箱 @example.com，Agent Code 为合成 32 位 hex。
 */

const R = window.AGENT_RULES;
const { canApiDebug, canDeploy, canPublish, onlineLabel, formatTs, DEPLOY_STATUSES } = R;

const CURRENT_USER = 'cedric.chen@example.com';
const TEAMS = ['Team-Alpha', 'Team-Bravo', 'Team-Charlie', 'Team-Delta'];
const REGIONS = ['ID', 'PH', 'VN', 'MY', 'SG', 'TH'];
const MODELS = [
  'Qwen3-VL-8B-Instruct · AI Hub / SG',
  'Qwen2.5-VL-7B-SFT-V1 · AI Hub / ID',
  'Qwen3.5-VL-9B-SFT-V2 · AI Hub / PH',
  'gemini-2.5-flash · AI Hub / SG',
  'claude-sonnet-4 · AI Hub / MY',
];

const VARIABLES = [
  { token: 'customer_name', desc: 'string' },
  { token: 'risk_score', desc: 'float' },
  { token: 'policy_version', desc: 'string' },
  { token: 'locale', desc: 'enum' },
  { token: 'order_id', desc: 'string' },
];
const TOOLS = ['lookup_kyc_document', 'fetch_policy_rules', 'ocr_extract_fields', 'escalate_to_human'];
const KNOWLEDGE_BASES = ['kb-kyc-policy-sg', 'kb-fraud-case-library', 'kb-refund-policy'];

/* ---------- seed ---------- */

const at = (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();

const AGENT_SEED = [
  ['4f2a9c7d1e8b4a6f9c0d3e5b7a1f2c84', 'kyc-document-reviewer', 'cedric.chen@example.com', 'Team-Alpha', 'SG', 1,
    'Reviews uploaded identity documents and returns a pass/fail decision.', at(2026, 8, 12, 9, 14, 22), at(2026, 10, 21, 16, 41, 5),
    'qwen-kyc'],
  ['a19c3e5f7b2d4a680c1e9f3b5d7a2c40', 'payslip-income-extractor', 'aaron.loh@example.com', 'Team-Bravo', 'ID', 1,
    'Extracts monthly income and employer fields from payslip images.', at(2026, 7, 3, 11, 2, 40), at(2026, 10, 18, 10, 22, 13),
    ''],
  ['7d3b9a1c5e8f2d604b7a3c9e1f5d8b26', 'fraud-case-summarizer', 'zoe.liu@example.com', 'Team-Alpha', 'TH', 1,
    'Summarises case evidence into a reviewer-facing narrative.', at(2026, 6, 27, 15, 40, 54), at(2026, 9, 30, 14, 5, 47),
    'qwen-kyc'],
  ['c5e8f2d604b7a3c9e1f5d8b267d3b9a1', 'loan-application-precheck', 'cedric.chen@example.com', 'Team-Delta', 'PH', 1,
    'Pre-screens loan applications against policy hints before manual review.', at(2026, 5, 19, 8, 12, 31), at(2026, 10, 8, 9, 3, 52),
    ''],
  ['e1f5d8b267d3b9a1c5e8f2d604b7a3c9', 'dispute-ticket-classifier', 'mei.tan@example.com', 'Team-Charlie', 'VN', 0,
    'Classifies dispute tickets into refund, chargeback, or product issue.', at(2026, 9, 1, 17, 26, 8), at(2026, 9, 14, 11, 47, 19),
    ''],
  ['b267d3b9a1c5e8f2d604b7a3c9e1f5d8', 'merchant-onboarding-assistant', 'kenji.sato@example.com', 'Team-Bravo', 'MY', 0,
    'Answers onboarding questions and flags incomplete merchant documents.', at(2026, 8, 28, 13, 5, 44), at(2026, 10, 2, 18, 31, 27),
    ''],
  ['d3b9a1c5e8f2d604b7a3c9e1f5d8b267', 'aml-alert-triage-helper', 'cedric.chen@example.com', 'Team-Alpha', 'SG', 0,
    'Drafts triage notes for AML alerts and suggests the next reviewer action.', at(2026, 7, 22, 10, 48, 15), at(2026, 9, 11, 9, 19, 40),
    ''],
  ['f2d604b7a3c9e1f5d8b267d3b9a1c5e8', 'refund-policy-qa-bot', 'zoe.liu@example.com', 'Team-Charlie', 'ID', 0,
    'Answers refund policy questions with citations from the policy knowledge base.', at(2026, 9, 16, 14, 12, 3), at(2026, 10, 19, 12, 8, 36),
    ''],
  ['9a1c5e8f2d604b7a3c9e1f5d8b267d3b', 'collection-script-writer', 'mei.tan@example.com', 'Team-Delta', 'TH', 0,
    'Writes and localises collection call scripts from a case summary.', at(2026, 6, 9, 16, 44, 27), at(2026, 8, 5, 15, 2, 11),
    ''],
  ['5e8f2d604b7a3c9e1f5d8b267d3b9a1c', 'address-normalizer-agent', 'kenji.sato@example.com', 'Team-Bravo', 'PH', 0,
    'Normalises free-text addresses into structured region and street fields.', at(2026, 8, 3, 10, 21, 9), at(2026, 9, 22, 17, 55, 2),
    ''],
  ['2d604b7a3c9e1f5d8b267d3b9a1c5e8f', 'identity-liveness-explainer', 'cedric.chen@example.com', 'Team-Alpha', 'VN', 0,
    'Explains liveness check failures to support agents with next steps.', at(2026, 9, 25, 9, 36, 51), at(2026, 10, 12, 10, 2, 14),
    ''],
  ['6d3b9a1c5e8f2d604b7a3c9e1f5d8b26', 'seller-risk-interviewer', 'aaron.loh@example.com', 'Team-Charlie', 'MY', 0,
    'Runs a structured risk interview with new sellers and records answers.', at(2026, 7, 14, 11, 58, 30), at(2026, 9, 3, 13, 40, 58),
    ''],
];

const KYC_PROMPT = `You are a KYC document reviewer for {{locale}} merchants.

Task
- Read the uploaded identity document and verify that the name, ID number, and expiry match the application record.
- Return a decision of pass or fail, with one short reason per failed check.

Rules
- Never guess a value that is not visible on the document.
- If the image quality is too low to read a field, return fail with reason "unreadable".
- Use fetch_policy_rules when the document type is not covered by @kb-kyc-policy-sg.

Response
Reply in JSON: {"decision": "pass|fail", "reasons": ["..."]}`;

const agents = AGENT_SEED.map(([uuid, name, owner, team, region, online, desc, created, updated, preset], i) => ({
  id: i + 1,
  uuid,
  name,
  owner,
  team,
  region,
  onlineStatus: online,
  description: desc,
  createdAt: created,
  updatedAt: updated,
  // Draft 时间与列表 Update Time 不是同一时间源（spec §5.1），这里分开维护
  draftUpdatedAt: updated - (i % 3) * 3600 * 1000,
  prompt: preset === 'qwen-kyc' ? KYC_PROMPT : '',
  model: online ? MODELS[0] : '',
  memory: online ? 10 : 10,
  temperature: '0.3',
  langfuseProjectId: 'proj_' + uuid.slice(0, 8),
  // Space 资源：已在线应用视为资源已就绪；未部署应用默认未申请
  space: online
    ? { state: 'approved', serviceId: 'sp-' + uuid.slice(0, 6), ticketId: 'TKT-' + (4200 + i), appliedAt: created - 5 * 86400 * 1000 }
    : { state: 'none' },
}));

/* 部署记录：覆盖 Success / Failed / Deploying。顺序为「最新在前」。 */
const DEPLOY_PATTERNS = [
  [['v2.0', 'Success'], ['v1.1', 'Failed'], ['v1.0', 'Success']],
  [['v1.2', 'Deploying'], ['v1.1', 'Success'], ['v1.0', 'Failed']],
  [['v3.0', 'Failed'], ['v2.1', 'Success'], ['v1.0', 'Success']],
];

const deployments = {};
agents.forEach((a, i) => {
  const pattern = DEPLOY_PATTERNS[i % DEPLOY_PATTERNS.length];
  deployments[a.id] = pattern.map(([version, status], j) => ({
    version,
    action: j === pattern.length - 1 ? 'First deployment' : 'Redeploy',
    status,
    startedAt: a.updatedAt - j * 36 * 3600 * 1000,
    operator: j === 0 ? a.owner : CURRENT_USER,
  }));
});

const state = {
  filters: { name: '', owner: '', team: '', region: '', status: '', desc: '' },
  expanded: false,
  page: 1,
  pageSize: 10,
  moreRowId: null,
  cfg: null,                 // 当前配置台 agent
  previewCollapsed: false,
  chat: [],                  // { role: 'agent'|'user', text }
  perm: null,                // { agent, rows: [{type, subject, role}] }
  debug: null,               // { agent }
  trigger: { open: false, kind: null, items: [], index: 0, start: 0 },
  depFilters: { version: '', statuses: [] },
  myOpsOnly: false,
};

/* ---------- 工具 ---------- */

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pad2(n) { return String(n).padStart(2, '0'); }

function inkStamp(d = new Date()) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : type === 'warn' ? ' warn' : '');
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function regionChip(r) {
  const cls = ['id', 'ph', 'mx', 'sg', 'th'].includes(String(r).toLowerCase()) ? `r-${String(r).toLowerCase()}` : 'r-sg';
  return `<span class="chip-tag ${cls}">${escapeHtml(r)}</span>`;
}

function onlineChip(status) {
  const label = onlineLabel(status);
  const cls = label === 'Online' ? 's-online' : 's-undeployed';
  return `<span class="chip-tag ${cls}">${escapeHtml(label)}</span>`;
}

function deployChip(status) {
  return `<span class="chip-tag d-${String(status).toLowerCase()}">${escapeHtml(status)}</span>`;
}

const agentById = (id) => agents.find(a => String(a.id) === String(id));

/* ---------- 页面切换 ---------- */

const PAGES = ['page-list', 'page-config', 'page-deployment'];

function showPage(id) {
  PAGES.forEach(p => { $(p).hidden = p !== id; });
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const parts = raw.split('/').filter(Boolean);
  return { page: parts[0] || 'list', param: parts[1] || '', rest: parts };
}

/* 路由切换时收起所有覆盖层：弹窗/抽屉/菜单与上一页的上下文无关，
 * 否则从配置台跳部署页会留下半屏遮挡。 */
function closeAllOverlays() {
  ['create-modal', 'perm-modal', 'debug-modal'].forEach(id => $(id).classList.add('hidden'));
  closeDrawer();
  closeMoreMenu();
  closeTriggerPop();
  const panel = $('d-status-panel');
  if (panel) panel.classList.add('hidden');
}

function route() {
  const { page, param } = parseHash();
  closeAllOverlays();

  if (page === 'config' && param) {
    const a = agentById(param);
    if (!a) { toast('Agent not found', 'error'); location.hash = '#/'; return; }
    showPage('page-config');
    openConfig(a);
    return;
  }
  if (page === 'deployment' && param) {
    const a = agentById(param);
    if (!a) { toast('Agent not found', 'error'); location.hash = '#/'; return; }
    showPage('page-deployment');
    openDeployment(a);
    return;
  }
  showPage('page-list');
  renderList();
}

/* ══════════════ 1. 列表页 ══════════════ */

function filteredAgents() {
  const f = state.filters;
  return agents.filter(a =>
    (!f.name || a.name.toLowerCase().includes(f.name.trim().toLowerCase())) &&
    (!f.owner || a.owner.toLowerCase().includes(f.owner.trim().toLowerCase())) &&
    (!f.team || a.team === f.team) &&
    (!f.region || a.region.toUpperCase() === f.region.trim().toUpperCase()) &&
    (!f.status || onlineLabel(a.onlineStatus) === f.status) &&
    (!f.desc || a.description.toLowerCase().includes(f.desc.trim().toLowerCase()))
  ).sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderList() {
  renderListFilterOptions();
  renderListTable();
}

function renderListFilterOptions() {
  const team = $('f-team');
  const curTeam = team.value;
  team.innerHTML = '<option value="">Please select</option>' +
    TEAMS.map(t => `<option ${t === curTeam ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');

  const st = $('f-status');
  const curSt = st.value;
  st.innerHTML = '<option value="">Please select</option>' +
    ['Online', 'UnDeployed'].map(s => `<option ${s === curSt ? 'selected' : ''}>${s}</option>`).join('');
}

function renderListTable() {
  const list = filteredAgents();
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (!pageList.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9">No data</td></tr>';
    $('page-total').textContent = '0 items';
    renderPagination(1);
    return;
  }

  tbody.innerHTML = pageList.map(a => {
    const debugOk = canApiDebug(a.onlineStatus);
    // 置灰用 aria-disabled + class，不用 disabled 属性：disabled 会吞掉 title，用户看不到原因
    // （UAT 问题 3：置灰无 tooltip；spec §3.1 可及性修正）
    const debugBtn = debugOk
      ? `<button class="link-btn teal" data-act="debug" data-id="${a.id}">API Debug</button>`
      : `<button class="link-btn disabled" data-act="debug" data-id="${a.id}" aria-disabled="true" title="Deploy first to enable API Debug">API Debug</button>`;
    return `<tr>
      <td class="mono">${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.owner)}</td>
      <td>${escapeHtml(a.team)}</td>
      <td>${regionChip(a.region)}</td>
      <td>${onlineChip(a.onlineStatus)}</td>
      <td class="desc-cell">${escapeHtml(a.description || '-')}</td>
      <td class="time">${escapeHtml(formatTs(a.createdAt))}</td>
      <td class="time">${escapeHtml(formatTs(a.updatedAt))}</td>
      <td>
        <button class="link-btn teal" data-act="configure" data-id="${a.id}">Configure</button>
        ${debugBtn}
        <button class="link-btn teal" data-act="deployment" data-id="${a.id}">Deployment</button>
        <button class="link-btn teal" data-act="more" data-id="${a.id}" aria-label="More actions">...</button>
      </td>
    </tr>`;
  }).join('');

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const wrap = $('page-buttons');
  wrap.innerHTML = '';
  const mk = (label, page, opts = {}) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (opts.current ? ' current' : '');
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    else b.addEventListener('click', () => { state.page = page; renderListTable(); });
    return b;
  };
  wrap.appendChild(mk('<', state.page - 1, { disabled: state.page <= 1 }));
  for (let p = 1; p <= totalPages; p++) wrap.appendChild(mk(p, p, { current: p === state.page }));
  wrap.appendChild(mk('>', state.page + 1, { disabled: state.page >= totalPages }));
}

/* 行内 ... 菜单：fixed 定位，避免被 .table-scroll 裁切 */
function openMoreMenu(btn, agent) {
  const menu = $('more-menu');
  state.moreRowId = agent.id;
  menu.classList.remove('hidden');
  const rect = btn.getBoundingClientRect();
  const menuW = 140;
  menu.style.left = Math.max(8, Math.min(rect.right - menuW, window.innerWidth - menuW - 8)) + 'px';
  menu.style.top = (rect.bottom + 6) + 'px';
}

function closeMoreMenu() {
  $('more-menu').classList.add('hidden');
  state.moreRowId = null;
}

/* ══════════════ 2. 配置台 ══════════════ */

function openConfig(agent) {
  state.cfg = agent;
  state.chat = [];
  state.previewCollapsed = false;

  $('cfg-name').textContent = agent.name;
  $('cfg-uuid').textContent = agent.uuid;
  $('cfg-draft-ts').textContent = 'Draft updated: ' + formatTs(agent.draftUpdatedAt);
  $('preview-name').textContent = agent.name;

  const sel = $('cfg-model');
  sel.innerHTML = '<option value="">Select model</option>' +
    MODELS.map(m => `<option ${m === agent.model ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');
  sel.value = agent.model || '';

  $('cfg-prompt').value = agent.prompt;
  $('cfg-temp').value = agent.temperature;
  $('cfg-topp').value = '0.95';
  $('cfg-maxtok').value = '2048';
  $('cfg-toolto').value = '30';

  $('mem-range').value = agent.memory;
  $('mem-num').value = String(agent.memory);

  $('adv-body').hidden = true;
  $('btn-adv').setAttribute('aria-expanded', 'false');

  $('preview-empty').hidden = false;
  $('preview-session').hidden = true;
  $('preview-body').style.display = '';
  $('btn-preview-collapse').style.transform = '';

  closeTriggerPop();
  updatePublishGate();
  updateConfigDebugGate();
}

function updatePublishGate() {
  const agent = state.cfg;
  if (!agent) return;
  const ok = canPublish($('cfg-prompt').value);
  const btn = $('btn-publish');
  btn.disabled = !ok;
  btn.title = ok ? 'Publish the current draft' : 'A prompt is required to save or publish.';
}

function updateConfigDebugGate() {
  const agent = state.cfg;
  if (!agent) return;
  const btn = $('btn-cfg-api-debug');
  const ok = canApiDebug(agent.onlineStatus);
  // 与列表页保持一致：用 aria-disabled 而不是 disabled 属性 ——
  // 原生 disabled 会让浏览器吞掉 title，用户看不到「为什么不能点」
  btn.disabled = false;
  btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  btn.classList.toggle('disabled', !ok);
  btn.title = ok ? 'Call the online endpoint' : 'Deploy first to enable API Debug';
  // 配置台内 API Debug 的门控是推断（spec §5.1 / Q5），标题里说明来源
  btn.dataset.gated = ok ? 'available' : 'undeployed';
}

function markDraftUpdated(agent) {
  agent.draftUpdatedAt = Date.now();
  $('cfg-draft-ts').textContent = 'Draft updated: ' + formatTs(agent.draftUpdatedAt);
}

function publishDraft() {
  const agent = state.cfg;
  if (!agent) return;
  if (!canPublish($('cfg-prompt').value)) {
    toast('A prompt is required to save or publish.', 'error');
    return;
  }
  // 原型简化：Publish 直接翻 onlineStatus。平台如何由部署记录聚合出该状态未采集（spec Q4），
  // 这里不据部署记录推导，只在文案里说明。
  agent.prompt = $('cfg-prompt').value;
  agent.onlineStatus = 1;
  agent.updatedAt = Date.now();
  markDraftUpdated(agent);
  updateConfigDebugGate();
  toast(`Published. ${agent.name} is now Online; API Debug is enabled.`);
}

/* ---- Prompt 触发符：/ 变量，@ tools + knowledge bases ---- */

function caretPoint(ta) {
  const mirror = document.createElement('div');
  const cs = getComputedStyle(ta);
  ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderWidth',
    'fontFamily', 'fontSize', 'lineHeight', 'letterSpacing'].forEach(p => { mirror.style[p] = cs[p]; });
  mirror.style.position = 'absolute';
  mirror.style.top = '0';
  mirror.style.left = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflow = 'hidden';
  mirror.style.height = 'auto';
  mirror.textContent = ta.value.slice(0, ta.selectionStart);
  const span = document.createElement('span');
  span.textContent = '\u200b';
  mirror.appendChild(span);
  ta.parentNode.appendChild(mirror);
  const x = span.offsetLeft - ta.scrollLeft;
  const y = span.offsetTop - ta.scrollTop;
  mirror.remove();
  return { x, y, lineHeight: parseFloat(cs.lineHeight) || 20 };
}

/* 触发规则是本原型自选的约束，不是平台实测（spec §5.2 红线 + Q6）：
 * 从光标向前找最近的 `/` 或 `@`，遇到空白即放弃；且触发符前必须是行首或空白，
 * 避免把 URL / email 里的字符当成触发符。*/ 
function detectTrigger() {
  const ta = $('cfg-prompt');
  const pos = ta.selectionStart;
  if (pos !== ta.selectionEnd) return null;
  const value = ta.value;
  for (let i = pos - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === '/' || ch === '@') {
      const before = value[i - 1];
      if (i > 0 && before && !/\s/.test(before)) return null;
      return { kind: ch === '/' ? 'variable' : 'resource', index: i, query: value.slice(i + 1, pos) };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

function openTriggerPop(trigger, query = '') {
  const ta = $('cfg-prompt');
  const q = String(query).toLowerCase();
  const all = trigger.kind === 'variable'
    ? VARIABLES.map(v => ({ group: 'Variables', token: '{{' + v.token + '}}', label: v.token, desc: v.desc, insert: '{{' + v.token + '}}' }))
    : [
        ...TOOLS.map(t => ({ group: 'Tools', token: '@' + t, label: t, desc: 'tool', insert: '@' + t })),
        ...KNOWLEDGE_BASES.map(k => ({ group: 'Knowledge Bases', token: '@' + k, label: k, desc: 'knowledge base', insert: '@' + k })),
      ];
  const items = q ? all.filter(it => it.label.toLowerCase().includes(q)) : all;
  state.trigger = { open: true, kind: trigger.kind, items, index: 0, start: trigger.index };

  const pop = $('trigger-pop');
  let lastGroup = '';
  pop.innerHTML = items.length
    ? items.map((it, i) => {
        const head = it.group !== lastGroup ? `<div class="tp-group">${escapeHtml(it.group)}</div>` : '';
        lastGroup = it.group;
        return head + `<button type="button" class="tp-item${i === 0 ? ' active' : ''}" data-i="${i}">
          <span class="tp-token">${escapeHtml(it.token)}</span>
          <span class="tp-desc">${escapeHtml(it.desc)}</span></button>`;
      }).join('')
    : '<div class="tp-empty">No match</div>';
  pop.classList.remove('hidden');

  const caret = caretPoint(ta);
  const popW = 300;
  const left = Math.min(Math.max(0, caret.x), Math.max(0, ta.clientWidth - popW - 8));
  pop.style.left = left + 'px';
  // 光标行下方放不下时向上翻（浮层最终高度只有渲染后才知道，先按上限估）
  const estH = Math.min(220, pop.scrollHeight || 220);
  const belowTop = ta.offsetTop + caret.y + caret.lineHeight + 6;
  const fitsBelow = caret.y + caret.lineHeight + estH <= ta.clientHeight;
  pop.style.top = (fitsBelow || caret.y < estH
    ? belowTop
    : ta.offsetTop + caret.y - estH - 4) + 'px';
}

function closeTriggerPop() {
  state.trigger.open = false;
  $('trigger-pop').classList.add('hidden');
}

function moveTriggerSelection(delta) {
  if (!state.trigger.open) return;
  const n = state.trigger.items.length;
  if (!n) return;
  state.trigger.index = (state.trigger.index + delta + n) % n;
  document.querySelectorAll('#trigger-pop .tp-item').forEach((el, i) => {
    el.classList.toggle('active', i === state.trigger.index);
    if (i === state.trigger.index) el.scrollIntoView({ block: 'nearest' });
  });
}

function applyTriggerItem(i) {
  const ta = $('cfg-prompt');
  const item = state.trigger.items[i];
  if (!item) return;
  // 用「当前光标」作为替换段末尾，覆盖触发符之后的过滤前缀
  const caret = ta.selectionStart;
  const before = ta.value.slice(0, state.trigger.start);
  const after = ta.value.slice(caret);
  const insert = item.insert + ' ';
  ta.value = before + insert + after;
  const next = before.length + insert.length;
  ta.focus();
  ta.setSelectionRange(next, next);
  closeTriggerPop();
  onPromptChanged();
}

function onPromptChanged() {
  const agent = state.cfg;
  if (!agent) return;
  agent.prompt = $('cfg-prompt').value;
  updatePublishGate();
  markDraftUpdated(agent);
}

/* ---- Preview & Debug 会话 ---- */

function startSession() {
  const agent = state.cfg;
  if (!agent) return;
  $('preview-empty').hidden = true;
  $('preview-session').hidden = false;
  state.chat = [
    { role: 'agent', text: `Hi, I'm ${agent.name}. This is a prototype session — no model is called and replies are synthetic.` },
    { role: 'agent', text: 'Ask me to review a document, extract a field, or explain a policy. I will answer in the shape the draft prompt describes.' },
  ];
  renderChat();
}

function renderChat() {
  const box = $('chat-scroll');
  box.innerHTML = state.chat.map(m => `
    <div class="msg ${m.role}">
      <span class="msg-role">${m.role === 'agent' ? 'Agent' : 'You'}</span>
      <div class="msg-bubble">${escapeHtml(m.text)}</div>
    </div>`).join('');
  box.scrollTop = box.scrollHeight;
}

function sendChat() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;
  state.chat.push({ role: 'user', text });
  input.value = '';
  renderChat();
  setTimeout(() => {
    state.chat.push({
      role: 'agent',
      text: `[mock] I received ${text.length} characters. With conversation memory = ${state.cfg ? state.cfg.memory : 0}, the last ${state.cfg ? state.cfg.memory : 0} rounds would be attached to this request.`,
    });
    renderChat();
  }, 550);
}

/* ══════════════ 3. 部署管理 ══════════════ */

function openDeployment(agent) {
  state.dep = agent;
  $('dep-name').textContent = agent.name;
  renderSpaceBlock(agent);
  renderDepStatusPanel();
  $('d-version').value = state.depFilters.version;
  $('my-ops').checked = state.myOpsOnly;
  renderDeploymentTable();
}

function renderSpaceBlock(agent) {
  const sp = agent.space;
  const has = canDeploy(sp.state === 'approved');
  $('sp-service').textContent = sp.serviceId || '—';
  $('sp-ticket').textContent = sp.ticketId || '—';
  $('sp-status').textContent = sp.state === 'approved' ? 'Approved' : sp.state === 'applying' ? 'Applying' : '—';
  $('sp-time').textContent = sp.appliedAt ? formatTs(sp.appliedAt) : '—';

  const bar = $('space-warning');
  const text = $('space-warning-text');
  const apply = $('btn-apply');
  bar.classList.remove('applying', 'approved');

  if (sp.state === 'approved') {
    bar.classList.add('approved');
    text.textContent = 'Space resources are ready. Deployment is enabled.';
    apply.classList.add('hidden');
  } else if (sp.state === 'applying') {
    bar.classList.add('applying');
    text.textContent = 'Space resource application submitted. Deployment will be enabled when the application is complete.';
    apply.classList.add('hidden');
  } else {
    text.textContent = 'This agent has not applied for Space resources. Please apply first; deployment will be enabled when the application is complete.';
    apply.classList.remove('hidden');
    apply.disabled = false;
    apply.textContent = 'Apply';
  }

  // 与列表页 API Debug 同一手法：disabled 会吞掉 title，用 aria-disabled 保留置灰 + 可读原因
  // （spec §7.1 要求 deactivate 而不是只给 warning 条；UAT 问题 7）
  const btn = $('btn-deploy');
  btn.setAttribute('aria-disabled', String(!has));
  btn.classList.toggle('is-gated', !has);
  btn.title = has
    ? 'Deploy the selected published version'
    : 'Apply for Space resources first — deployment is enabled when the application is complete';
}

function filteredDeployments(agent) {
  const rows = deployments[agent.id] || [];
  const f = state.depFilters;
  return rows.filter(r =>
    (!f.version || r.version.toLowerCase().includes(f.version.trim().toLowerCase())) &&
    (f.statuses.length === 0 || f.statuses.includes(r.status)) &&
    (!state.myOpsOnly || r.operator === CURRENT_USER)
  );
}

function renderDeploymentTable() {
  const agent = state.dep;
  if (!agent) return;
  const list = filteredDeployments(agent);
  const tbody = $('dep-body');
  if (!list.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No data</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((r, i) => `<tr>
    <td class="mono">${escapeHtml(r.version)}</td>
    <td>${escapeHtml(r.action)}</td>
    <td>${deployChip(r.status)}</td>
    <td class="time">${escapeHtml(formatTs(r.startedAt))}</td>
    <td>${escapeHtml(r.operator)}</td>
    <td><button class="link-btn teal" data-dep-act="detail" data-i="${i}">Detail</button></td>
  </tr>`).join('');
}

function renderDepStatusPanel() {
  const panel = $('d-status-panel');
  panel.innerHTML = DEPLOY_STATUSES.map(s =>
    `<label><input type="checkbox" value="${s}" ${state.depFilters.statuses.includes(s) ? 'checked' : ''}>${s}</label>`).join('');
  panel.querySelectorAll('input').forEach(cb =>
    cb.addEventListener('change', () => {
      state.depFilters.statuses = [...panel.querySelectorAll('input:checked')].map(c => c.value);
      renderDepStatusTags();
    }));
  renderDepStatusTags();
}

function renderDepStatusTags() {
  const sel = state.depFilters.statuses;
  $('d-status-tags').innerHTML = sel.length
    ? sel.map(s => `<span class="ms-tag">${escapeHtml(s)}</span>`).join('')
    : '<span class="ms-placeholder">Please select</span>';
}

function applySpace() {
  const agent = state.dep;
  if (!agent) return;
  agent.space = {
    state: 'applying',
    ticketId: 'TKT-' + inkStamp().slice(-6),
    appliedAt: Date.now(),
  };
  renderSpaceBlock(agent);
  toast('Space resource application submitted. Ticket ID: ' + agent.space.ticketId);

  // 原型：申请即时「通过」，以便演示 Deploy 解锁；真实审批时长未采集
  setTimeout(() => {
    if (state.dep !== agent) return;
    agent.space = {
      ...agent.space,
      state: 'approved',
      serviceId: 'sp-' + agent.uuid.slice(0, 6),
    };
    renderSpaceBlock(agent);
    renderDeploymentTable();
    toast('Space resources are ready. Deploy is now enabled.');
  }, 1600);
}

function deployAgent() {
  const agent = state.dep;
  if (!agent) return;
  if (!canDeploy(agent.space.state === 'approved')) {
    toast('Apply for Space resources first.', 'error');
    return;
  }
  const rows = deployments[agent.id] || (deployments[agent.id] = []);
  const nextVersion = 'v' + (rows.length + 1) + '.0';
  const rec = {
    version: nextVersion,
    action: rows.length ? 'Redeploy' : 'First deployment',
    status: 'Deploying',
    startedAt: Date.now(),
    operator: CURRENT_USER,
  };
  rows.unshift(rec);
  state.myOpsOnly = true;
  $('my-ops').checked = true;
  renderDeploymentTable();
  toast(`Deployment submitted: ${agent.name} ${nextVersion}`);

  setTimeout(() => {
    rec.status = 'Success';
    agent.onlineStatus = 1;
    agent.updatedAt = Date.now();
    renderDeploymentTable();
    toast(`${agent.name} ${nextVersion} deployed. Agent is now Online.`);
  }, 2000);
}

/* ══════════════ 弹窗：Create Agent ══════════════ */

function openCreateModal() {
  $('c-name').value = '';
  $('c-owner').value = CURRENT_USER;
  $('c-team').innerHTML = '<option value="">Please select</option>' +
    TEAMS.map(t => `<option>${escapeHtml(t)}</option>`).join('');
  $('c-region').innerHTML = '<option value="">Please select</option>' +
    REGIONS.map(r => `<option>${escapeHtml(r)}</option>`).join('');
  $('c-desc').value = '';
  $('c-desc-count').textContent = '0 / 1000';
  ['c-name', 'c-team', 'c-region'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('create-modal').classList.remove('hidden');
  setTimeout(() => $('c-name').focus(), 0);
}

function submitCreate() {
  const name = $('c-name').value.trim();
  const team = $('c-team').value;
  const region = $('c-region').value;
  let ok = true;
  $('err-c-name').classList.toggle('hidden', !!name);
  $('err-c-team').classList.toggle('hidden', !!team);
  $('err-c-region').classList.toggle('hidden', !!region);
  ['err-c-name', 'err-c-team', 'err-c-region'].forEach(id => { if (!$(id).classList.contains('hidden')) ok = false; });
  if (!ok) return;
  if (agents.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    $('err-c-name').textContent = 'This name is already used by another Agent.';
    $('err-c-name').classList.remove('hidden');
    return;
  }
  $('err-c-name').textContent = 'Name is required.';

  const uuid = (Date.now().toString(16) + Math.floor(Math.random() * 1e16).toString(16)).padEnd(32, '0').slice(0, 32);
  const now = Date.now();
  const agent = {
    id: Math.max(0, ...agents.map(a => a.id)) + 1,
    uuid,
    name,
    owner: CURRENT_USER,
    team,
    region,
    onlineStatus: 0,
    description: $('c-desc').value.trim(),
    createdAt: now,
    updatedAt: now,
    draftUpdatedAt: now,
    prompt: '',
    model: '',
    memory: 10,
    temperature: '0.3',
    langfuseProjectId: 'proj_' + uuid.slice(0, 8),
    space: { state: 'none' },
  };
  agents.unshift(agent);
  deployments[agent.id] = [];

  $('create-modal').classList.add('hidden');
  state.page = 1;
  state.filters = { name: '', owner: '', team: '', region: '', status: '', desc: '' };
  ['f-name', 'f-owner', 'f-region', 'f-desc'].forEach(id => { $(id).value = ''; });
  $('f-team').value = '';
  $('f-status').value = '';
  renderList();
  toast(`Agent created: ${agent.name} (UnDeployed). Configure a prompt, then Publish.`);
}

/* ══════════════ 弹窗：Permission ══════════════ */

function openPermission(agent) {
  state.perm = {
    agent,
    rows: [
      { type: 'User', subject: agent.owner, role: 'OWNER' },
      { type: 'Team', subject: agent.team, role: 'VIEWER' },
    ],
  };
  $('perm-title').textContent = `${agent.name} Permission`;
  $('perm-role').value = 'Viewer';
  renderPermObjects();
  renderPermList();
  $('perm-modal').classList.remove('hidden');
}

function permObjectOptions(type) {
  if (type === 'Team') return TEAMS;
  return ['aaron.loh@example.com', 'zoe.liu@example.com', 'mei.tan@example.com', 'kenji.sato@example.com'].filter(
    e => !state.perm.rows.some(r => r.type === 'User' && r.subject === e));
}

function renderPermObjects() {
  const type = $('perm-type').value;
  const opts = permObjectOptions(type);
  $('perm-object').innerHTML = opts.length
    ? opts.map(o => `<option>${escapeHtml(o)}</option>`).join('')
    : '<option value="">No more candidates</option>';
}

function renderPermList() {
  const rows = state.perm.rows;
  $('perm-list').innerHTML = rows.length ? rows.map((r, i) => `
    <div class="perm-row">
      <span class="perm-subject">${escapeHtml(r.subject)}</span>
      <span class="perm-badge ${r.type === 'User' ? 'b-user' : 'b-team'}">${escapeHtml(r.type)}</span>
      <select class="perm-role-select" data-perm-row="${i}">
        ${['OWNER', 'EDITOR', 'INVOKER', 'VIEWER'].map(x => `<option ${x === r.role ? 'selected' : ''}>${x}</option>`).join('')}
      </select>
    </div>`).join('') : '<div class="perm-empty">No permission entries</div>';
}

function addPermission() {
  const type = $('perm-type').value;
  const subject = $('perm-object').value;
  if (!subject) { toast('No candidate left to add for this type.', 'warn'); return; }
  if (state.perm.rows.some(r => r.type === type && r.subject === subject)) {
    toast('Already granted.', 'warn');
    return;
  }
  state.perm.rows.push({ type, subject, role: $('perm-role').value.toUpperCase() });
  renderPermObjects();
  renderPermList();
  toast(`Granted ${$('perm-role').value} to ${subject}`);
}

/* ══════════════ 弹窗：API Debug ══════════════ */

const DEBUG_DEFAULT_BODY = JSON.stringify({
  input: {
    customer_name: 'Nguyen Van A',
    risk_score: 0.42,
    locale: 'VN',
    document_url: 'https://example.com/synthetic/id-sample.png',
  },
  session_id: 'sess-demo-0001',
}, null, 2);

function openDebug(agent) {
  if (!canApiDebug(agent.onlineStatus)) {
    toast('Deploy first to enable API Debug', 'warn');
    return;
  }
  state.debug = { agent };
  $('debug-title').textContent = `${agent.name} · API Debug`;
  $('debug-endpoint').textContent =
    `POST https://agent-runtime.example.com/v1/agents/${agent.uuid}/invoke  ·  Header: Authorization: Bearer <token>`;
  $('debug-curl').textContent =
`curl -X POST "https://agent-runtime.example.com/v1/agents/${agent.uuid}/invoke" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <api-key>" \\
  -d @body.json`;
  $('debug-body').value = DEBUG_DEFAULT_BODY;
  $('debug-response').textContent = '// Click Send to call the endpoint';
  $('debug-modal').classList.remove('hidden');
}

function sendDebug() {
  const agent = state.debug && state.debug.agent;
  if (!agent) return;
  let parsed;
  try {
    parsed = JSON.parse($('debug-body').value);
  } catch {
    $('debug-response').textContent = JSON.stringify({ code: 400, message: 'Request body is not valid JSON' }, null, 2);
    toast('Request body is not valid JSON', 'error');
    return;
  }
  const started = performance.now();
  $('debug-response').textContent = '// calling…';
  setTimeout(() => {
    const ms = Math.round(performance.now() - started);
    const hasPrompt = canPublish(agent.prompt);
    $('debug-response').textContent = JSON.stringify({
      code: 0,
      data: {
        agent_uuid: agent.uuid,
        session_id: parsed.session_id || 'sess-demo-0001',
        output: hasPrompt
          ? { decision: 'pass', reasons: [] }
          : { decision: 'fail', reasons: ['This Agent has no prompt configured.'] },
        usage: { prompt_tokens: 412, completion_tokens: 38, total_tokens: 450 },
        latency_ms: ms,
        langfuse_project: agent.langfuseProjectId,
        note: 'Synthetic response from the prototype — no real endpoint was called.',
      },
    }, null, 2);
    toast(`Response received in ${ms} ms`);
  }, 420);
}

/* ══════════════ Version Management 抽屉 ══════════════ */

function openDrawer() {
  const agent = state.cfg;
  if (!agent) return;
  $('drawer-draft-ts').textContent = formatTs(agent.draftUpdatedAt);
  $('version-drawer').classList.remove('hidden');
  $('drawer-mask').classList.remove('hidden');
}

function closeDrawer() {
  $('version-drawer').classList.add('hidden');
  $('drawer-mask').classList.add('hidden');
}

/* ══════════════ 事件绑定 ══════════════ */

function bindEvents() {
  /* ---- 列表筛选 ---- */
  const query = () => {
    state.filters = {
      name: $('f-name').value,
      owner: $('f-owner').value,
      team: $('f-team').value,
      region: $('f-region').value,
      status: $('f-status').value,
      desc: $('f-desc').value,
    };
    state.page = 1;
    renderList();
  };
  $('btn-query').addEventListener('click', query);
  ['f-name', 'f-owner'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') query(); }));

  $('btn-reset').addEventListener('click', () => {
    state.filters = { name: '', owner: '', team: '', region: '', status: '', desc: '' };
    ['f-name', 'f-owner', 'f-region', 'f-desc'].forEach(id => { $(id).value = ''; });
    $('f-team').value = '';
    $('f-status').value = '';
    state.page = 1;
    renderList();
  });

  $('btn-collapse').addEventListener('click', () => {
    state.expanded = !state.expanded;
    document.querySelectorAll('#filter-grid [data-extra]').forEach(el => { el.hidden = !state.expanded; });
    $('btn-collapse').textContent = state.expanded ? 'Expand ∨' : 'Collapse ∧';
  });

  $('btn-create').addEventListener('click', openCreateModal);
  $('page-size').addEventListener('change', () => {
    state.pageSize = Number($('page-size').value);
    state.page = 1;
    renderListTable();
  });

  /* ---- 表格动作 ---- */
  $('table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const agent = agentById(btn.dataset.id);
    if (!agent) return;

    if (btn.dataset.act === 'debug' && btn.getAttribute('aria-disabled') === 'true') {
      toast('Deploy first to enable API Debug', 'warn');
      return;
    }

    switch (btn.dataset.act) {
      case 'configure':
        location.hash = `#/config/${agent.id}`;
        break;
      case 'debug':
        openDebug(agent);
        break;
      case 'deployment':
        location.hash = `#/deployment/${agent.id}`;
        break;
      case 'more':
        openMoreMenu(btn, agent);
        break;
    }
  });

  $('more-menu').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-more]');
    if (!btn) return;
    const agent = agentById(state.moreRowId);
    const act = btn.dataset.more;
    closeMoreMenu();
    if (!agent) return;
    switch (act) {
      case 'copy': {
        // Copy 的语义（整应用副本 vs 仅草稿）未采集（spec Q17），原型按「应用副本」演示并明示
        const copy = {
          ...agent,
          id: Math.max(0, ...agents.map(a => a.id)) + 1,
          uuid: (Date.now().toString(16) + Math.floor(Math.random() * 1e16).toString(16)).padEnd(32, '0').slice(0, 32),
          name: agent.name + '-copy',
          onlineStatus: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          draftUpdatedAt: Date.now(),
          space: { state: 'none' },
          langfuseProjectId: 'proj_' + Math.random().toString(16).slice(2, 10),
        };
        agents.unshift(copy);
        deployments[copy.id] = [];
        state.page = 1;
        renderList();
        toast(`Copied as "${copy.name}". Copy semantics are unconfirmed — prototype copies the whole application.`, 'warn');
        break;
      }
      case 'edit':
        // Edit 与 Configure 是否重复未采集（spec Q17）：原型指向同一配置台并说明
        location.hash = `#/config/${agent.id}`;
        toast('Edit opens the same Configure page — their overlap is unconfirmed (spec Q17).', 'warn');
        break;
      case 'logs':
        // Logs 的跳转形态未采集（spec Q3）；这里只展示 Langfuse project 标识
        toast(`Logs: observability is per-Agent in Langfuse (project ${agent.langfuseProjectId}). Jump target unconfirmed.`);
        break;
      case 'permission':
        openPermission(agent);
        break;
    }
  });

  /* ---- Create Agent 弹窗 ---- */
  $('btn-create-close').addEventListener('click', () => $('create-modal').classList.add('hidden'));
  $('btn-create-cancel').addEventListener('click', () => $('create-modal').classList.add('hidden'));
  $('btn-create-submit').addEventListener('click', submitCreate);
  $('c-desc').addEventListener('input', () => {
    const n = $('c-desc').value.length;
    $('c-desc-count').textContent = `${n} / 1000`;
  });

  /* ---- Permission 弹窗 ---- */
  $('btn-perm-close').addEventListener('click', () => $('perm-modal').classList.add('hidden'));
  $('btn-perm-done').addEventListener('click', () => {
    $('perm-modal').classList.add('hidden');
    toast('Permission saved (prototype: applied immediately).');
  });
  $('perm-type').addEventListener('change', renderPermObjects);
  $('btn-perm-add').addEventListener('click', addPermission);
  $('perm-list').addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-perm-row]');
    if (!sel) return;
    const row = state.perm.rows[Number(sel.dataset.permRow)];
    row.role = sel.value;
    toast(`Role updated: ${row.subject} → ${row.role}`);
  });

  /* ---- API Debug 弹窗 ---- */
  $('btn-debug-close').addEventListener('click', () => $('debug-modal').classList.add('hidden'));
  $('btn-debug-reset').addEventListener('click', () => { $('debug-body').value = DEBUG_DEFAULT_BODY; });
  $('btn-debug-send').addEventListener('click', sendDebug);

  /* ---- 配置台：页头 ---- */
  $('btn-config-back').addEventListener('click', () => { location.hash = '#/'; });
  $('btn-version-mgmt').addEventListener('click', openDrawer);
  $('btn-publish').addEventListener('click', publishDraft);
  $('btn-cfg-api-debug').addEventListener('click', () => {
    if (!canApiDebug(state.cfg.onlineStatus)) {
      toast('Deploy first to enable API Debug', 'warn');
      return;
    }
    openDebug(state.cfg);
  });

  /* ---- 配置台：Model ---- */
  $('btn-adv').addEventListener('click', () => {
    const body = $('adv-body');
    const open = body.hidden;
    body.hidden = !open;
    $('btn-adv').setAttribute('aria-expanded', String(open));
  });
  $('cfg-model').addEventListener('change', () => {
    if (!state.cfg) return;
    state.cfg.model = $('cfg-model').value;
    markDraftUpdated(state.cfg);
  });

  /* ---- 配置台：Prompt ---- */
  const ta = $('cfg-prompt');
  ta.addEventListener('input', () => {
    onPromptChanged();
    const trigger = detectTrigger();
    if (trigger) openTriggerPop(trigger, trigger.query);
    else closeTriggerPop();
  });
  ta.addEventListener('keydown', (e) => {
    if (!state.trigger.open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveTriggerSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveTriggerSelection(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); applyTriggerItem(state.trigger.index); }
    else if (e.key === 'Escape') { e.preventDefault(); closeTriggerPop(); }
  });
  ta.addEventListener('blur', () => setTimeout(closeTriggerPop, 120));
  $('trigger-pop').addEventListener('mousedown', (e) => {
    const item = e.target.closest('.tp-item');
    if (!item) return;
    e.preventDefault();
    applyTriggerItem(Number(item.dataset.i));
  });

  $('btn-manage-vars').addEventListener('click', () =>
    toast('Manage variables: ' + VARIABLES.map(v => v.token).join(', ') + ' (variable list fields are unconfirmed, spec Q6)'));

  /* ---- 配置台：Tools ---- */
  $('res-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-configure]');
    if (!btn) return;
    const name = btn.dataset.configure;
    const hint = name === 'Tools' ? TOOLS.length + ' available'
      : name === 'Knowledge Bases' ? KNOWLEDGE_BASES.length + ' available'
      : name === 'Skills' ? 'not configured'
      : 'not configured';
    toast(`${name}: Configure opens a second-level panel (${hint}). Panel form is unconfirmed (spec Q7).`);
  });
  $('btn-tool-settings').addEventListener('click', () =>
    toast('Tool Settings opens the shared resource configuration (spec Q7: panel form unconfirmed).'));

  /* ---- 配置台：Conversation Memory ---- */
  const setMemory = (v) => {
    if (!state.cfg) return;
    const n = Math.max(0, Math.min(30, Number.isFinite(v) ? Math.round(v) : 0));
    state.cfg.memory = n;
    $('mem-range').value = n;
    $('mem-num').value = String(n);
    markDraftUpdated(state.cfg);
  };
  $('mem-range').addEventListener('input', () => setMemory(Number($('mem-range').value)));
  $('mem-minus').addEventListener('click', () => setMemory(state.cfg.memory - 1));
  $('mem-plus').addEventListener('click', () => setMemory(state.cfg.memory + 1));
  $('mem-num').addEventListener('change', () => setMemory(Number($('mem-num').value)));

  /* ---- 配置台：Preview ---- */
  $('btn-start-session').addEventListener('click', startSession);
  $('btn-chat-send').addEventListener('click', sendChat);
  $('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
  $('btn-preview-collapse').addEventListener('click', () => {
    state.previewCollapsed = !state.previewCollapsed;
    $('preview-body').style.display = state.previewCollapsed ? 'none' : '';
    $('btn-preview-collapse').style.transform = state.previewCollapsed ? 'rotate(-90deg)' : '';
  });

  /* ---- Version drawer ---- */
  $('btn-drawer-close').addEventListener('click', closeDrawer);
  $('drawer-mask').addEventListener('click', closeDrawer);
  $('btn-overwrite-draft').addEventListener('click', () => {
    const agent = state.cfg;
    if (!agent) return;
    toast('Overwrite Draft: the draft is replaced. Source version and confirmation step are unconfirmed (spec Q12).', 'warn');
    markDraftUpdated(agent);
    $('drawer-draft-ts').textContent = formatTs(agent.draftUpdatedAt);
  });

  /* ---- 部署管理 ---- */
  $('btn-deploy-back').addEventListener('click', () => { location.hash = '#/'; });
  $('btn-apply').addEventListener('click', applySpace);
  $('btn-deploy').addEventListener('click', deployAgent);
  $('btn-dep-query').addEventListener('click', () => {
    state.depFilters.version = $('d-version').value;
    renderDeploymentTable();
  });
  $('btn-dep-reset').addEventListener('click', () => {
    state.depFilters = { version: '', statuses: [] };
    state.myOpsOnly = false;
    $('d-version').value = '';
    $('my-ops').checked = false;
    renderDepStatusPanel();
    renderDeploymentTable();
  });
  $('my-ops').addEventListener('change', () => {
    state.myOpsOnly = $('my-ops').checked;
    renderDeploymentTable();
  });
  $('d-status-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    $('d-status-panel').classList.toggle('hidden');
  });
  $('d-status-panel').addEventListener('click', (e) => e.stopPropagation());
  $('dep-body').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-dep-act]');
    if (!btn) return;
    const agent = state.dep;
    const rec = filteredDeployments(agent)[Number(btn.dataset.i)];
    if (!rec) return;
    toast(`${agent.name} ${rec.version}: status ${rec.status}, started ${formatTs(rec.startedAt)} by ${rec.operator}. Row-level actions are unconfirmed (spec Q14).`);
  });

  /* ---- 全局 ---- */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#more-menu') && !e.target.closest('button[data-act="more"]')) closeMoreMenu();
    if (!e.target.closest('#d-status')) $('d-status-panel').classList.add('hidden');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $('create-modal').classList.add('hidden');
    $('perm-modal').classList.add('hidden');
    $('debug-modal').classList.add('hidden');
    closeDrawer();
    closeMoreMenu();
    closeTriggerPop();
    $('d-status-panel').classList.add('hidden');
  });

  window.addEventListener('hashchange', route);
}

/* ---------- 启动 ---------- */

bindEvents();
route();
