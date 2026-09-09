/* Aimos — LLM Mgmt 原型
 *
 * 领域规则：
 * - LLM 资产（逻辑实体）：Name 全局唯一；Region / Provider / Model Type / Model Name /
 *   API Key / Endpoint / Owner 为必填元信息；Model Type 枚举 Chat / Embedding
 * - Provider 枚举：OpenAI / Gemini / Claude / Compass
 * - Team Access：None (Private) 表示仅 Owner 可用；选择 Biz Team 后该团队可用
 * - Check：校验 Endpoint 连通性（原型为 mock 模拟）
 * 数据为前端 mock，刷新后重置。
 */

const CURRENT_USER = 'cedric.chencan@seamoney.com';
const REGIONS = ['ID', 'TH', 'PH', 'VN', 'MY', 'SG', 'TW', 'BR'];
const PROVIDERS = ['OpenAI', 'Gemini', 'Claude', 'Compass'];
const TYPES = ['Chat', 'Embedding'];
const TEAMS = ['AimosTeam', 'DataSci', 'DataMart', 'RiskPolicy', 'Credit'];

const EP_AIS = 'https://ais-apid1pg78.risk.shopee.io/services/808700/v1';
const EP_MY = 'https://ais-di-my.risk.shopee.io/services/808700/v1';
const EP_COMPASS = 'https://compass.llm.shopee.io/completions';

const seedLLMs = [
  { name: 'Qwen2.5-VL-7B-SFT-V1-ID-Payslip', model: 'Monee/Qwen2.5-VL-7B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'ID', endpoint: EP_AIS, desc: 'Qwen2.5-VL-7B-SFT-V1-ID-Payslip', created: '2026-09-08 17:22:00', updated: '2026-09-08 17:22:00', proxy: true, apikey: 'sk-qw25id001' },
  { name: 'Qwen3-VL-8B-Instruct-ID', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'sankar.shyamal@seamoney.com'], access: '', region: 'ID', endpoint: EP_AIS, desc: '', created: '2026-09-08 10:27:29', updated: '2026-09-08 10:27:29', proxy: true, apikey: 'sk-qw3id002' },
  { name: 'Monee-Qwen3-VL-8B-SFT-V1-New', model: 'Monee/Qwen3-VL-8B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'MY', endpoint: EP_MY, desc: '', created: '2026-09-07 17:29:13', updated: '2026-09-07 17:29:13', proxy: true, apikey: 'sk-my003' },
  { name: 'Qwen3-VL-8B-Instruct-MY-New', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com'], access: '', region: 'MY', endpoint: EP_MY, desc: '', created: '2026-09-07 15:24:05', updated: '2026-09-07 15:24:05', proxy: true, apikey: 'sk-my004' },
  { name: 'Qwen3.5-VL-9B-SFT-V2-PH-Payslip-Copy', model: 'Monee/Qwen35-VL-9B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-04 15:46:42', updated: '2026-09-07 12:21:03', proxy: true, apikey: 'sk-ph005' },
  { name: 'Qwen3-VL-8B-Instruct-PH', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-04 14:47:35', updated: '2026-09-07 12:20:55', proxy: true, apikey: 'sk-ph006' },
  { name: 'Qwen3-VL-8B-SFT-V1-PH-BIR2316', model: 'Monee/Qwen3-VL-8B-SFT-V1', provider: 'OpenAI', type: 'Chat', owners: ['zezhi.xiang@monee.com', 'jiaxi.chen@monee.com'], access: '', region: 'PH', endpoint: EP_AIS, desc: '', created: '2026-09-03 18:27:26', updated: '2026-09-07 12:20:34', proxy: true, apikey: 'sk-ph007' },
  { name: 'Same-Person-AIS-Qwen3.6-35B-A3b-PH', model: 'qwen3.6-35b-a3b', provider: 'OpenAI', type: 'Chat', owners: ['jiaxi.chen@monee.com', 'siyan.chen@monee.com'], access: '', region: 'PH', endpoint: 'https://ais-di-all.risk.shopee.io/services/808700/v1', desc: '', created: '2026-09-02 18:46:53', updated: '2026-09-02 18:46:53', proxy: true, apikey: 'sk-ph008' },
  { name: 'Qwen3-VL-8B-Instruct-VN', model: 'Monee/Qwen3-VL-8B-Instruct', provider: 'OpenAI', type: 'Chat', owners: ['linhai.liu@monee.com', 'zhengyi.loh@seamoney.com'], access: '', region: 'VN', endpoint: EP_AIS, desc: 'Qwen3-VL-8B-Instruct-VN', created: '2026-08-28 16:05:19', updated: '2026-09-07 11:02:23', proxy: true, apikey: 'sk-vn009' },
  { name: 'Same-Person-Qwen3.6-35B-A3b-PH', model: 'qwen3.6-35b-a3b', provider: 'OpenAI', type: 'Chat', owners: ['jiaxi.chen@monee.com', 'siyan.chen@monee.com'], access: '', region: 'PH', endpoint: EP_COMPASS, desc: '', created: '2026-08-28 10:24:28', updated: '2026-08-28 10:24:28', proxy: true, apikey: 'sk-ph010' },
  // ── 第 2 页（4 条，共 14）──
  { name: 'Embedding-Risk-Doc-SG', model: 'Monee/bge-large-sg', provider: 'Compass', type: 'Embedding', owners: ['cedric.chencan@seamoney.com'], access: 'DataSci', region: 'SG', endpoint: EP_COMPASS, desc: '风控文档向量化 Embedding 模型', created: '2026-08-20 14:10:00', updated: '2026-09-01 09:30:00', proxy: false, apikey: 'sk-sg011' },
  { name: 'Claude-Review-Assistant-MY', model: 'claude-sonnet-4', provider: 'Claude', type: 'Chat', owners: ['cedric.chencan@seamoney.com'], access: '', region: 'MY', endpoint: EP_COMPASS, desc: '材料审查辅助', created: '2026-08-15 11:00:00', updated: '2026-08-15 11:00:00', proxy: false, apikey: 'sk-my012' },
  { name: 'Gemini-Doc-Parse-ID', model: 'gemini-2.5-flash', provider: 'Gemini', type: 'Chat', owners: ['zhengyi.loh@seamoney.com'], access: 'AimosTeam', region: 'ID', endpoint: EP_COMPASS, desc: '', created: '2026-08-10 09:20:00', updated: '2026-08-28 15:00:00', proxy: true, apikey: 'sk-id013' },
  { name: 'Embed-TH-Kyc-Doc', model: 'Monee/bge-base-th', provider: 'Compass', type: 'Embedding', owners: ['linhai.liu@monee.com'], access: 'RiskPolicy', region: 'TH', endpoint: EP_COMPASS, desc: 'TH KYC 材料向量化', created: '2026-08-01 16:45:00', updated: '2026-08-01 16:45:00', proxy: false, apikey: 'sk-th014' },
];

let llms = seedLLMs.map(m => ({ ...m, owners: [...m.owners] }));

const state = {
  filters: {},
  expanded: false,
  page: 1,
  pageSize: 10,
  editing: null,
  owners: [],
  proxy: true,
};

/* ---------- 工具 ---------- */

const $ = (id) => document.getElementById(id);

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.textContent = msg;
  $('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function typeChip(t) {
  return `<span class="chip-tag t-${t.toLowerCase()}">${t}</span>`;
}

function maskedKey(key) {
  return '****' + key.slice(-1);
}

function filteredLLMs() {
  const f = state.filters;
  return llms.filter(m =>
    (!f.name || m.name.toLowerCase().includes(f.name.trim().toLowerCase())) &&
    (!f.model || m.model.toLowerCase().includes(f.model.trim().toLowerCase())) &&
    (!f.type || m.type === f.type) &&
    (!f.region || m.region.toLowerCase().includes(f.region.trim().toLowerCase())) &&
    (!f.provider || m.provider === f.provider) &&
    (!f.access || (f.access === 'Private' ? !m.access : m.access === f.access))
  ).sort((a, b) => b.updated.localeCompare(a.updated));
}

/* ---------- 列表渲染 ---------- */

function render() {
  renderFilterOptions();
  renderTable();
  renderPagination();
}

function renderFilterOptions() {
  const sel = $('f-provider');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Please select</option>' +
    PROVIDERS.map(p => `<option ${p === cur ? 'selected' : ''}>${p}</option>`).join('');
}

function renderTable() {
  const list = filteredLLMs();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  tbody.innerHTML = pageList.map(m => `<tr>
    <td class="mono">${escapeHtml(m.name)}</td>
    <td class="mono">${escapeHtml(m.model)}</td>
    <td>${escapeHtml(m.provider)}</td>
    <td>${typeChip(m.type)}</td>
    <td class="multi-owner">${m.owners.map(o => `<div>${escapeHtml(o)}</div>`).join('')}</td>
    <td>${m.access ? escapeHtml(m.access) : 'Private'}</td>
    <td>${escapeHtml(m.region)}</td>
    <td class="webhook-cell" title="${escapeHtml(m.endpoint)}">${escapeHtml(m.endpoint)}</td>
    <td>${m.desc ? escapeHtml(m.desc) : '<span style="color:#ccc">-</span>'}</td>
    <td class="time">${escapeHtml(m.created)}</td>
    <td class="time">${escapeHtml(m.updated)}</td>
    <td>
      <button class="link-btn edit" data-name="${escapeHtml(m.name)}">Edit</button>
      <button class="link-btn delete" data-name="${escapeHtml(m.name)}">Delete</button>
    </td>
  </tr>`).join('');

  tbody.querySelectorAll('.link-btn.edit').forEach(b =>
    b.addEventListener('click', () => openLlmModal('edit', b.dataset.name)));
  tbody.querySelectorAll('.link-btn.delete').forEach(b =>
    b.addEventListener('click', () => {
      const m = llms.find(x => x.name === b.dataset.name);
      openConfirm(`确认删除 LLM「${m.name}」？删除后依赖该模型的调用将失败。`, b, () => {
        llms = llms.filter(x => x.name !== m.name);
        toast('LLM deleted');
        render();
      });
    }));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredLLMs();
  const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;

  const wrap = $('page-buttons');
  wrap.innerHTML = '';
  const mk = (label, page, opts = {}) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (opts.current ? ' current' : '');
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    else b.addEventListener('click', () => { state.page = page; render(); });
    return b;
  };
  wrap.appendChild(mk('<', state.page - 1, { disabled: state.page <= 1 }));
  for (let p = 1; p <= totalPages; p++) wrap.appendChild(mk(p, p, { current: p === state.page }));
  wrap.appendChild(mk('>', state.page + 1, { disabled: state.page >= totalPages }));
  $('goto-input').max = totalPages;
  $('goto-input').value = '';
}

/* ---------- Create / Edit ---------- */

function quietValidate() {
  const name = $('m-name').value.trim();
  const region = $('m-region').value;
  const provider = $('m-provider').value;
  const type = $('m-type').value;
  const model = $('m-model').value.trim();
  const key = $('m-apikey').value;
  const endpoint = $('m-endpoint').value.trim();
  const ownerOk = state.owners.length > 0;
  const dup = llms.some(l => l.name.toLowerCase() === name.toLowerCase() && l !== state.editing);
  return { name, region, provider, type, model, key, endpoint, ownerOk, dup };
}

function refreshModalButtons() {
  const v = quietValidate();
  const valid = v.name && v.region && v.provider && v.type && v.model && v.key && v.endpoint &&
    v.ownerOk && !v.dup;
  $('btn-llm-check').disabled = !(v.name && v.region && v.provider && v.type && v.model && v.key && v.endpoint && v.ownerOk);
  $('btn-llm-submit').disabled = !valid;
}

function openLlmModal(mode, name) {
  state.editing = mode === 'edit' ? llms.find(l => l.name === name) : null;
  $('llm-modal-title').textContent = mode === 'edit' ? 'Edit LLM Model' : 'Create LLM Model';
  $('m-region').innerHTML = '<option value="">Please select</option>' +
    REGIONS.map(r => `<option ${state.editing && state.editing.region === r ? 'selected' : ''}>${r}</option>`).join('');
  $('m-provider').innerHTML = '<option value="">Please select</option>' +
    PROVIDERS.map(p => `<option ${state.editing && state.editing.provider === p ? 'selected' : ''}>${p}</option>`).join('');
  $('m-name').value = state.editing ? state.editing.name : '';
  $('m-model').value = state.editing ? state.editing.model : '';
  $('m-apikey').value = state.editing ? maskedKey(state.editing.apikey) : '';
  $('m-endpoint').value = state.editing ? state.editing.endpoint : '';
  state.proxy = state.editing ? state.editing.proxy : true;
  $('m-proxy').classList.toggle('on', state.proxy);
  $('m-proxy').setAttribute('aria-pressed', String(state.proxy));
  state.owners = [state.editing ? state.editing.owners[0] : CURRENT_USER];
  renderOwnerChips();
  const sel = $('m-access');
  const cur = state.editing ? state.editing.access : '';
  sel.innerHTML = '<option value="">None (Private)</option>' +
    TEAMS.map(t => `<option ${t === cur ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
  $('m-desc').value = state.editing ? state.editing.desc : '';
  ['name', 'region', 'provider', 'type', 'model', 'apikey', 'endpoint', 'owner'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('llm-modal').classList.remove('hidden');
  refreshModalButtons();
  if (mode === 'add') $('m-name').focus();
}

function renderOwnerChips() {
  $('owner-chips').innerHTML = state.owners.map(o =>
    `<span class="owner-chip">${escapeHtml(o)}<button class="chip-x" aria-label="移除该 Owner" data-o="${escapeHtml(o)}">×</button></span>`).join('');
  $('owner-box').querySelectorAll('.chip-x').forEach(x =>
    x.addEventListener('click', () => {
      state.owners = state.owners.filter(o => o !== x.dataset.o);
      renderOwnerChips();
    }));
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitLlmModal() {
  const name = $('m-name').value.trim();
  const region = $('m-region').value;
  const provider = $('m-provider').value;
  const type = $('m-type').value;
  const model = $('m-model').value.trim();
  const endpoint = $('m-endpoint').value.trim();
  let keyInput = $('m-apikey').value;
  let ok = true;

  const req = (key, empty, msg) => { if (empty) { setErr(key, msg); ok = false; } else setErr(key, ''); };
  req('name', !name, 'Name 为必填项');
  req('region', !region, 'Region 为必填项');
  req('provider', !provider, 'Provider 为必填项');
  req('type', !type, 'Model Type 为必填项');
  req('model', !model, 'Model Name 为必填项');
  req('apikey', !keyInput, 'API Key 为必填项');
  req('endpoint', !endpoint, 'Endpoint 为必填项');
  if (state.owners.length === 0) { setErr('owner', 'Owner 为必填项'); ok = false; } else setErr('owner', '');
  if (!ok) return;

  if (llms.some(l => l.name.toLowerCase() === name.toLowerCase() && l !== state.editing)) {
    setErr('name', `LLM「${name}」已存在`);
    return;
  }

  // API Key：未修改（保持掩码形态）则沿用原值
  const origKey = state.editing ? state.editing.apikey : '';
  const finalKey = keyInput === maskedKey(origKey) && state.editing ? origKey : keyInput;

  if (state.editing) {
    const m = state.editing;
    m.region = region; m.provider = provider; m.type = type; m.model = model;
    m.apikey = finalKey; m.endpoint = endpoint; m.proxy = state.proxy;
    m.owners = [...state.owners]; m.access = $('m-access').value;
    m.desc = $('m-desc').value.trim(); m.updated = nowStr();
    toast('LLM updated');
  } else {
    llms.push({
      name, region, provider, type, model, apikey: finalKey, endpoint,
      proxy: state.proxy, owners: [...state.owners], access: $('m-access').value,
      desc: $('m-desc').value.trim(), created: nowStr(), updated: nowStr(),
    });
    toast('LLM created');
  }
  $('llm-modal').classList.add('hidden');
  render();
}

/* ---------- Check（Endpoint 连通性 mock） ---------- */

function runCheck() {
  const btn = $('btn-llm-check');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Check';
    toast('Endpoint reachable (mock)', 'info');
  }, 600);
}

/* ---------- 通用确认（popconfirm） ---------- */

let popEl = null, popFn = null;
function closePop() {
  if (popEl) { popEl.remove(); popEl = null; }
  document.removeEventListener('click', outsideClose);
}
function outsideClose(e) {
  if (popEl && !popEl.contains(e.target)) closePop();
}
function openConfirm(text, anchor, fn) {
  closePop();
  popFn = fn;
  popEl = document.createElement('div');
  popEl.className = 'popconfirm';
  const t = document.createElement('div');
  t.className = 'pop-text';
  t.textContent = text;
  const acts = document.createElement('div');
  acts.className = 'pop-actions';
  const cancel = document.createElement('button');
  cancel.className = 'pop-btn';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', closePop);
  const ok = document.createElement('button');
  ok.className = 'pop-btn danger';
  ok.textContent = 'OK';
  ok.addEventListener('click', () => { const f = popFn; closePop(); if (f) f(); });
  acts.append(cancel, ok);
  popEl.append(t, acts);
  document.body.appendChild(popEl);
  const width = Math.min(280, window.innerWidth - 24);
  const r = anchor.getBoundingClientRect();
  popEl.style.width = width + 'px';
  popEl.style.left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12)) + 'px';
  popEl.style.top = Math.min(r.bottom + 6, window.innerHeight - 110) + 'px';
  setTimeout(() => document.addEventListener('click', outsideClose), 0);
}

/* ---------- 事件绑定 ---------- */

function bindEvents() {
  const applyFilters = () => {
    state.filters = {
      name: $('f-name').value, model: $('f-model').value, type: $('f-type').value,
      region: $('f-region').value, provider: $('f-provider').value, access: $('f-access').value,
    };
    state.page = 1;
    render();
  };
  $('btn-query').addEventListener('click', applyFilters);
  $('btn-reset').addEventListener('click', () => {
    ['f-name', 'f-model', 'f-region', 'f-provider', 'f-access'].forEach(id => $(id).value = '');
    $('f-type').value = '';
    state.filters = {};
    state.page = 1;
    render();
  });
  $('btn-collapse').addEventListener('click', () => {
    state.expanded = !state.expanded;
    document.querySelectorAll('[data-extra]').forEach(el => el.hidden = !state.expanded);
    $('btn-collapse').textContent = state.expanded ? 'Expand ∨' : 'Collapse ∧';
  });

  $('btn-add').addEventListener('click', () => openLlmModal('create'));
  $('btn-llm-cancel').addEventListener('click', () => $('llm-modal').classList.add('hidden'));
  $('btn-llm-close').addEventListener('click', () => $('llm-modal').classList.add('hidden'));
  $('btn-llm-submit').addEventListener('click', submitLlmModal);
  $('btn-llm-check').addEventListener('click', runCheck);
  ['m-name', 'm-model', 'm-apikey', 'm-endpoint'].forEach(id =>
    $(id).addEventListener('input', refreshModalButtons));
  ['m-region', 'm-provider', 'm-type'].forEach(id =>
    $(id).addEventListener('change', refreshModalButtons));

  $('m-proxy').addEventListener('click', () => {
    state.proxy = !state.proxy;
    $('m-proxy').classList.toggle('on', state.proxy);
    $('m-proxy').setAttribute('aria-pressed', String(state.proxy));
  });

  $('m-owner-input').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = e.target.value.trim().toLowerCase();
    if (!v) return;
    e.target.value = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('owner', '邮箱格式不正确'); return; }
    state.owners = [v]; // 单 Owner：替换
    setErr('owner', '');
    renderOwnerChips();
  });

  document.querySelectorAll('.help').forEach(h =>
    h.addEventListener('click', () => toast(h.dataset.tip)));
  $('btn-info').addEventListener('click', () =>
    toast('LLM Mgmt 管理 AI Hub 的 LLM 资产：接入信息（Provider / Endpoint / API Key）与可见范围（Team Access）'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));
  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });
  $('goto-input').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const list = filteredLLMs();
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    const p = Number(e.target.value);
    if (p >= 1 && p <= totalPages) { state.page = p; render(); }
    e.target.value = '';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('llm-modal').classList.add('hidden');
      closePop();
    }
  });
}

render();
bindEvents();
