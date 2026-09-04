/* Aimos — Model Mgmt 原型
 *
 * 领域规则（Model → ModelVersion 逻辑实体，见 docs/model-mgmt/spec.md）：
 * - 模型逻辑实体 = (Name, Version)，唯一；(Region, Product, Biz Team, Owner[], Description) 为元信息
 * - Model Status：Deployed（可 Edit / Build / Deprecate）/ Deprecate（仅 View）
 * - View → Build Detail：Model Info + Build Info + Input/Output Parameter（部署明细）
 * - Create：Owner 多选（邮箱 chips）决定 Biz Team 可选项；Edit 时标识字段锁定
 * 数据为前端 mock，刷新后重置。
 */

const CURRENT_USER = 'cedric.chencan@seamoney.com';
const REGIONS = ['id', 'ph', 'mx', 'sg', 'th'];
const OWNERS_POOL = [
  'cedric.chencan@seamoney.com', 'zhengyi.loh@seamoney.com', 'xiaoxin.chen@seamoney.com',
  'dylan.seekl@seamoney.com', 'chenyingying@shopee.com', 'jinghui.bi@shopee.com',
  'alan.li@shopee.com', 'jack.yangiy@seamoney.com', 'ziyan.liu@seamoney.com',
  'siyan.chen@monee.com',
];
// Owner → Biz Team 映射（mock：真实实现由 Owner 在 Team 中的角色推导）
const OWNER_TEAM = {
  'cedric.chencan@seamoney.com': 'AimosTeam',
  'siyan.chen@monee.com': 'DataSci',
};
function teamOf(owner) { return OWNER_TEAM[owner] || 'DataSci'; }

/* ---------- seed（对齐线上列表截图） ---------- */

const seedModels = [
  { name: 'id_splx_txn_cp', version: 'v2.1', region: 'id', team: 'DataSci', product: 'splx', status: 'Deployed', created: '2025-07-03 10:30:16', updated: '2025-07-03 11:48:15', owners: ['cedric.chencan@seamoney.com', 'zhengyi.loh@seamoney.com', 'xiaoxin.chen@seamoney.com'], desc: 'id splx transaction credit policy model' },
  { name: 'realtime-hpl-acard-isolated', version: 'v1.0', region: 'ph', team: 'DataSci', product: 'HPL', status: 'Deployed', created: '2025-06-27 16:40:54', updated: '2025-06-27 17:23:45', owners: ['zhengyi.loh@seamoney.com', 'dylan.seekl@seamoney.com'], desc: 'realtime HPL acard isolated model' },
  { name: 'funding-rac-test-model', version: 'v1.0', region: 'id', team: 'DataMart', product: 'SPL', status: 'Deployed', created: '2025-06-09 17:44:47', updated: '2025-07-15 16:06:30', owners: ['chenyingying@shopee.com', 'jinghui.bi@shopee.com'], desc: 'funding rac test model' },
  { name: 'funding-rac-test-model', version: 'v1', region: 'id', team: 'DataMart', product: 'SPL', status: 'Deprecate', created: '2025-06-09 16:30:52', updated: '2025-06-09 17:43:58', owners: ['chenyingying@shopee.com'], desc: 'funding rac test model (deprecated)' },
  { name: 'SharkTest', version: 'v1.0', region: 'sg', team: '57', product: 'spl', status: 'Deprecate', created: '2025-06-04 15:06:34', updated: '2025-12-22 12:36:32', owners: ['alan.li@shopee.com'], desc: 'shark test model' },
  { name: 'mx_bureau', version: 'v1.0', region: 'mx', team: 'DataSci', product: 'SPL', status: 'Deployed', created: '2025-06-04 10:21:23', updated: '2025-09-02 13:44:19', owners: ['zhengyi.loh@seamoney.com', 'jack.yangiy@seamoney.com'], desc: 'mx bureau model' },
  { name: 'mx_bureau', version: '1.0', region: 'mx', team: 'DataSci', product: 'SPL', status: 'Deprecate', created: '2025-06-03 18:29:46', updated: '2025-06-04 10:20:46', owners: ['zhengyi.loh@seamoney.com', 'jack.yangiy@seamoney.com'], desc: 'mx bureau model (deprecated)' },
  { name: 'ph_cic', version: 'v2.0', region: 'ph', team: 'DataSci', product: 'SPL', status: 'Deployed', created: '2025-05-26 11:56:10', updated: '2025-06-02 16:58:00', owners: ['ziyan.liu@seamoney.com', 'zhengyi.loh@seamoney.com'], desc: 'ph cic model' },
];

let models = seedModels.map(m => ({ ...m, owners: [...m.owners] }));

const state = {
  filters: {},
  expanded: false,   // 筛选折叠
  ownedOnly: false,
  page: 1,
  pageSize: 10,
  editing: null,     // 编辑中的 (name, version)
  detail: null,      // 当前 View 的模型
  owners: [],        // 弹窗内 Owner chips
  confirmFn: null,
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
  setTimeout(() => el.remove(), 2600);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function regionChip(r) { return `<span class="chip-tag r-${escapeHtml(r)}">${escapeHtml(r)}</span>`; }
function statusChip(s) {
  const cls = s === 'Deployed' ? 's-deployed' : 's-deprecate';
  return `<span class="chip-tag ${cls}">${s === 'Deployed' ? 'Deployed' : 'Deprecate'}</span>`;
}

function filteredModels() {
  const f = state.filters;
  return models.filter(m =>
    (!f.name || m.name.toLowerCase().includes(f.name.trim().toLowerCase())) &&
    (!f.version || m.version.toLowerCase().includes(f.version.trim().toLowerCase())) &&
    (!f.region || m.region === f.region) &&
    (!f.team || m.team === f.team) &&
    (!f.product || m.product.toLowerCase().includes(f.product.trim().toLowerCase())) &&
    (!f.status || m.status === f.status) &&
    (!f.owner || m.owners.some(o => o.toLowerCase().includes(f.owner.trim().toLowerCase()))) &&
    (!state.ownedOnly || m.owners.includes(CURRENT_USER))
  ).sort((a, b) => b.updated.localeCompare(a.updated));
}

/* ---------- 列表渲染 ---------- */

function render() {
  renderFilterOptions();
  if (state.detail) renderDetail();
  else renderTable();
  renderPagination();
}

function renderFilterOptions() {
  for (const [id, values] of [['f-region', REGIONS], ['f-team', [...new Set(models.map(m => m.team))]]]) {
    const sel = $(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">Please select</option>' +
      values.slice().sort().map(v => `<option ${v === cur ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  }
}

function renderTable() {
  const list = filteredModels();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  tbody.innerHTML = pageList.map(m => {
    const deployed = m.status === 'Deployed';
    const actions = deployed
      ? `<button class="link-btn edit" data-k="${escapeHtml(m.name)}|${escapeHtml(m.version)}">View</button>
         <button class="link-btn edit" data-edit="${escapeHtml(m.name)}|${escapeHtml(m.version)}">Edit</button>
         <button class="link-btn edit" data-build="${escapeHtml(m.name)}|${escapeHtml(m.version)}">Build</button>
         <button class="link-btn delete" data-deprecate="${escapeHtml(m.name)}|${escapeHtml(m.version)}">Deprecate</button>`
      : `<button class="link-btn edit" data-k="${escapeHtml(m.name)}|${escapeHtml(m.version)}">View</button>`;
    return `<tr>
      <td class="mono">${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.version)}</td>
      <td>${regionChip(m.region)}</td>
      <td>${escapeHtml(m.team)}</td>
      <td>${escapeHtml(m.product)}</td>
      <td>${statusChip(m.status)}</td>
      <td class="time">${escapeHtml(m.created)}</td>
      <td class="time">${escapeHtml(m.updated)}</td>
      <td class="multi-owner">${m.owners.map(o => `<div>${escapeHtml(o)}</div>`).join('')}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-k]').forEach(b =>
    b.addEventListener('click', () => {
      const [name, version] = b.dataset.k.split('|');
      openDetail(models.find(m => m.name === name && m.version === version));
    }));
  tbody.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', () => {
      const [name, version] = b.dataset.edit.split('|');
      openModelModal('edit', models.find(m => m.name === name && m.version === version));
    }));
  tbody.querySelectorAll('[data-build]').forEach(b =>
    b.addEventListener('click', () => {
      const [name, version] = b.dataset.build.split('|');
      openConfirm(`为「${name} ${version}」发起新 Build？将拉取最新模型产物执行部署流水线。`, () => {
        toast(`Build request submitted for ${name} ${version} (mock)`);
      });
    }));
  tbody.querySelectorAll('[data-deprecate]').forEach(b =>
    b.addEventListener('click', () => {
      const [name, version] = b.dataset.deprecate.split('|');
      openConfirm(`确认下线（Deprecate）「${name} ${version}」？下线后仅可查看。`, () => {
        const m = models.find(x => x.name === name && x.version === version);
        m.status = 'Deprecate';
        m.updated = nowStr();
        toast('Model deprecated');
        render();
      });
    }));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredModels();
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
}

/* ---------- Build Detail（View） ---------- */

function kvRow(k, v, opts = {}) {
  return `<div class="kv-row${opts.wide ? ' wide' : ''}"><span class="k">${k}：</span><span class="v${opts.mono ? ' mono' : ''}">${v}</span></div>`;
}

function buildInfo(m) {
  const ymd = m.updated.slice(0, 10).replace(/-/g, '');
  return {
    buildVersion: `${m.version}.${ymd}.1`,
    deployStatus: 'Online',
    deployTime: m.updated,
    modelType: 'FpDataSci',
    sourceFile: `${m.updated.replace(/[- :]/g, '')}.zip`,
    python: '3.9.21',
    operator: m.owners[0],
    addition: 'Add Via SDK',
    dependencies: '["pip==24.2","setuptools==72.1.0","wheel==0.43.0"]',
    pips: '["--index-url https://pypi.org/simple","--extra-index-url https://pypi.shopee.io/simple","mlflow==2.21.3","cfftle==1.17.1","cloudpickle==3.0.0","lz4==4.3.2","matplotlib==3.8.4","numpy==1.26.4","pandas==2.2.2","psutil==5.9.0","scikit-learn==1.5.1","scipy==1.12.0","statsmodels==0.14.0","termcolor==2.4.0","tqdm==4.66.5","lightgbm==4.5.0","xgboost==2.1.1","imbalanced-learn==0.12.4","onnxruntime==1.16.3","seamoney-aimos==1.0.42","seamoney-ml-util==0.0.126"]',
    commands: '[]',
    runModule: 'main',
    envs: '{"CONTAINER_MODEL_PATH":"model","MODEL_LOSS_THRESHOLD":"1e-2"}',
    s3Path: `s3://sg-szfin-feature-management-aimos-bff/live/model_management/1788344863860-${m.updated.replace(/[- :]/g, '')}.zip`,
  };
}

function inputParams(m) {
  const base = [
    ['circulo_prob', 'float'], ['shopee_prob', 'float'], ['aai_prob', 'float'],
    ['circulo_query_grantor_collection_cnt_ratio_180d', 'float'],
  ];
  const out = [...base];
  for (let i = out.length; i < 205; i++) {
    out.push([`${m.name.split(/[-_]/)[0]}_feat_${String(i + 1).padStart(3, '0')}`, i % 5 === 0 ? 'int' : 'float']);
  }
  return out;
}

function outputParams() { return [['prediction', 'float']]; }

function openDetail(m) {
  state.detail = m;
  $('page-list').hidden = true;
  $('page-detail').hidden = false;
  renderDetail();
}

function renderDetail() {
  const m = state.detail;
  const b = buildInfo(m);

  $('detail-model-info').innerHTML =
    kvRow('Model Name', escapeHtml(m.name), { mono: true }) +
    kvRow('Model Version', escapeHtml(m.version), { mono: true }) +
    kvRow('Region', escapeHtml(m.region)) +
    kvRow('Biz Team', escapeHtml(m.team)) +
    kvRow('Owner', escapeHtml(m.owners[0]));

  $('detail-build-info').innerHTML =
    kvRow('Build Version', escapeHtml(b.buildVersion), { mono: true }) +
    `<div class="kv-row"><span class="k">Deployment Status：</span><span class="v"><span class="chip-tag s-online">Online</span></span></div>` +
    kvRow('Deployment Time', escapeHtml(b.deployTime)) +
    kvRow('Model Type', escapeHtml(b.modelType)) +
    kvRow('Source File', escapeHtml(b.sourceFile), { mono: true }) +
    kvRow('Python Release', escapeHtml(b.python)) +
    kvRow('Operator', escapeHtml(b.operator)) +
    kvRow('Addition Method', escapeHtml(b.addition)) +
    kvRow('Dependencies', escapeHtml(b.dependencies), { mono: true, wide: true }) +
    kvRow('Pips', escapeHtml(b.pips), { mono: true, wide: true }) +
    kvRow('Commands', escapeHtml(b.commands), { mono: true }) +
    kvRow('Run Module', escapeHtml(b.runModule), { mono: true }) +
    kvRow('Envs', escapeHtml(b.envs), { mono: true, wide: true }) +
    kvRow('Model S3 Path', escapeHtml(b.s3Path), { mono: true, wide: true });

  const inParams = inputParams(m);
  $('detail-input-params').innerHTML = inParams
    .map(([n, t]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(t)}</td></tr>`).join('');
  $('input-count').textContent = `Input Parameter Count:${inParams.length}`;

  const outParams = outputParams();
  $('detail-output-params').innerHTML = outParams
    .map(([n, t]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(t)}</td></tr>`).join('');
  $('output-count').textContent = `Output Parameter Count:${outParams.length}`;
}

function closeDetail() {
  state.detail = null;
  $('page-detail').hidden = true;
  $('page-list').hidden = false;
}

/* ---------- Create / Edit 弹窗 ---------- */

function renderOwnerChips() {
  $('owner-chips').innerHTML = state.owners.map(o =>
    `<span class="owner-chip">${escapeHtml(o)}<button class="chip-x" data-o="${escapeHtml(o)}">×</button></span>`).join('');
  $('owner-box').querySelectorAll('.chip-x').forEach(x =>
    x.addEventListener('click', () => {
      state.owners = state.owners.filter(o => o !== x.dataset.o);
      renderOwnerChips();
      syncTeamOptions();
    }));
  syncTeamOptions();
}

function syncTeamOptions() {
  const sel = $('m-team');
  const disabled = state.owners.length === 0;
  sel.disabled = disabled;
  const teams = [...new Set(state.owners.map(teamOf))];
  const cur = sel.value;
  sel.innerHTML = disabled
    ? '<option value="">Please select owner firstly!</option>'
    : '<option value="">Please select</option>' + teams.map(t => `<option ${t === cur ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function openModelModal(mode, m) {
  state.editing = mode === 'edit' ? m : null;
  $('model-modal-title').textContent = mode === 'edit' ? 'Edit Model' : 'Create Model';
  const lock = mode === 'edit';
  $('m-name').value = m ? m.name : '';
  $('m-name').disabled = lock;
  $('m-version').value = m ? m.version : '';
  $('m-version').disabled = lock;
  $('m-region').innerHTML = '<option value="">Please select</option>' +
    REGIONS.map(r => `<option ${m && m.region === r ? 'selected' : ''}>${r}</option>`).join('');
  $('m-region').disabled = lock;
  $('m-product').value = m ? m.product : '';
  $('m-product').disabled = lock;
  state.owners = m ? [...m.owners] : [CURRENT_USER];
  renderOwnerChips();
  $('m-team').value = m ? m.team : '';
  $('m-desc').value = m ? m.desc : '';
  ['name', 'version', 'region', 'product', 'owner', 'team', 'desc'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('model-modal').classList.remove('hidden');
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitModelModal() {
  const mode = state.editing ? 'edit' : 'create';
  const name = $('m-name').value.trim();
  const version = $('m-version').value.trim();
  const region = $('m-region').value;
  const product = $('m-product').value.trim();
  const team = $('m-team').value;
  const desc = $('m-desc').value.trim();
  let ok = true;

  const req = (key, empty, msg) => { if (empty) { setErr(key, msg); ok = false; } else setErr(key, ''); };
  req('name', !name, 'Name 为必填项');
  req('version', !version, 'Version 为必填项');
  req('region', !region, 'Region 为必填项');
  req('product', !product, 'Product 为必填项');
  if (state.owners.length === 0) { setErr('owner', '至少需要一名 Owner'); ok = false; } else setErr('owner', '');
  req('team', !team, 'Biz Team 为必填项');
  req('desc', !desc, 'Description 为必填项');
  if (!ok) return;

  // 逻辑实体唯一性：Name + Version
  if (!state.editing && models.some(m => m.name.toLowerCase() === name.toLowerCase() && m.version === version)) {
    setErr('version', `模型「${name} ${version}」已存在`);
    return;
  }

  if (state.editing) {
    const m = state.editing;
    m.owners = [...state.owners];
    m.team = team;
    m.desc = desc;
    m.updated = nowStr();
    toast('Model updated');
  } else {
    models.push({
      name, version, region, team, product, owners: [...state.owners], desc,
      status: 'Deployed', created: nowStr(), updated: nowStr(),
    });
    toast('Model created');
  }
  $('model-modal').classList.add('hidden');
  render();
}

/* ---------- 通用确认 ---------- */

function openConfirm(text, fn) {
  $('confirm-text').textContent = text;
  state.confirmFn = fn;
  $('confirm-modal').classList.remove('hidden');
}

/* ---------- 事件绑定 ---------- */

function bindEvents() {
  const applyFilters = () => {
    state.filters = {
      name: $('f-name').value, version: $('f-version').value, region: $('f-region').value,
      team: $('f-team').value, product: $('f-product').value, status: $('f-status').value,
      owner: $('f-owner').value,
    };
    state.page = 1;
    render();
  };
  $('btn-query').addEventListener('click', applyFilters);
  $('btn-reset').addEventListener('click', () => {
    ['f-name', 'f-version', 'f-region', 'f-team', 'f-product', 'f-status', 'f-owner'].forEach(id => $(id).value = '');
    state.filters = {};
    state.ownedOnly = false;
    $('owned-me').checked = false;
    state.page = 1;
    render();
  });
  $('btn-collapse').addEventListener('click', () => {
    state.expanded = !state.expanded;
    document.querySelectorAll('[data-extra]').forEach(el => el.hidden = !state.expanded);
    $('btn-collapse').textContent = state.expanded ? 'Expand ∨' : 'Collapse ∧';
  });
  $('owned-me').addEventListener('change', () => { state.ownedOnly = $('owned-me').checked; state.page = 1; render(); });

  $('btn-add').addEventListener('click', () => openModelModal('create'));
  $('btn-model-cancel').addEventListener('click', () => $('model-modal').classList.add('hidden'));
  $('btn-model-close').addEventListener('click', () => $('model-modal').classList.add('hidden'));
  $('btn-model-submit').addEventListener('click', submitModelModal);
  $('m-owner-input').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = e.target.value.trim().toLowerCase();
    if (!v) return;
    e.target.value = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('owner', '邮箱格式不正确'); return; }
    if (state.owners.includes(v)) { setErr('owner', '该 Owner 已添加'); return; }
    setErr('owner', '');
    state.owners.push(v);
    renderOwnerChips();
  });

  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('Model Mgmt 管理模型逻辑实体（Model + Version）：Create/Edit 维护元信息，Build 触发部署构建，View 查看 Build 部署明细'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });

  $('btn-back-top').addEventListener('click', closeDetail);
  $('btn-back-bottom').addEventListener('click', closeDetail);

  document.querySelectorAll('.copy-setting').forEach(b =>
    b.addEventListener('click', () => {
      if (!state.detail) return;
      const params = b.dataset.copy === 'input' ? inputParams(state.detail) : outputParams();
      const text = JSON.stringify(Object.fromEntries(params), null, 2);
      const done = () => toast('Setting copied to clipboard');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast(text, 'info'));
      else toast(text, 'info');
    }));

  $('btn-confirm-cancel').addEventListener('click', () => $('confirm-modal').classList.add('hidden'));
  $('btn-confirm-ok').addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (state.confirmFn) { state.confirmFn(); state.confirmFn = null; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('model-modal').classList.add('hidden');
      $('confirm-modal').classList.add('hidden');
    }
  });
}

bindEvents();
render();
