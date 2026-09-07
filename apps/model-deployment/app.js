/* Aimos — Model Deployment 原型
 *
 * 领域规则（Build 发布 → 部署 → Online Runtime，见 docs/model-deployment/spec.md）：
 * - 部署单元 = Model（Name+Version，登记于 Model Mgmt）的某个 Build + Region + Env
 * - Deployment Status：Deploying → Deployed / Failed；Deployed → Offline（下线终态）
 * - Action 门控：Redeploy 仅 Failed 可用；Offline 仅 Deployed 可用（红险 + popconfirm 二次确认）
 * - View = 部署明细（Model Info / Build Info / Input-Output Parameter，与 Model Mgmt 的 Build Detail 同构）
 * - Monitor / Logs 跳转外部系统（Grafana / 日志台），本原型以整页深色 mock 示意
 * 数据为前端 mock，刷新后重置。加载 #selftest 运行门控与规则自检。
 */

const CURRENT_USER = 'cedric.chencan@seamoney.com';
const REGIONS = ['id', 'ph', 'mx', 'sg', 'th'];
const DEPLOY_TYPES = ['Epic', 'K8s', 'Serverless'];
const STATUSES = ['Deployed', 'Deploying', 'Failed', 'Offline'];

/* ---------- 可选模型登记表（与 Model Mgmt 逻辑实体对齐） ---------- */
const MODELS = [
  { name: 'id_splx_txn_cp', version: 'v2.1', region: 'id', team: 'DataSci', owners: ['cedric.chencan@seamoney.com', 'zhengyi.loh@seamoney.com'] },
  { name: 'realtime-hpl-acard-isolated', version: 'v1.0', region: 'ph', team: 'DataSci', owners: ['zhengyi.loh@seamoney.com'] },
  { name: 'funding-rac-test-model', version: 'v1.0', region: 'id', team: 'DataMart', owners: ['chenyingying@shopee.com'] },
  { name: 'funding-rac-test-model', version: 'v1.1', region: 'id', team: 'DataMart', owners: ['chenyingying@shopee.com'] },
  { name: 'mx_bureau', version: 'v1.0', region: 'mx', team: 'DataSci', owners: ['zhengyi.loh@seamoney.com', 'jack.yangiy@seamoney.com'] },
  { name: 'mx_bureau', version: 'v2.0-rc', region: 'mx', team: 'DataSci', owners: ['zhengyi.loh@seamoney.com'] },
  { name: 'ph_cic', version: 'v2.0', region: 'ph', team: 'DataSci', owners: ['ziyan.liu@seamoney.com'] },
  { name: 'ph_cic', version: 'v2.1', region: 'ph', team: 'DataSci', owners: ['ziyan.liu@seamoney.com'] },
  { name: 'SharkTest', version: 'v1.0', region: 'sg', team: '57', owners: ['alan.li@shopee.com'] },
];

/* ---------- seed（对齐线上列表截图口径） ---------- */
const seedRows = [
  { name: 'id_splx_txn_cp', version: 'v2.1', region: 'id', dtype: 'Epic', build: 'v2.1.20250703.1', env: 'prod', status: 'Deployed', created: '2025-07-03 10:30:16', updated: '2025-07-03 11:48:15', owners: ['cedric.chencan@seamoney.com', 'zhengyi.loh@seamoney.com', 'xiaoxin.chen@seamoney.com'] },
  { name: 'id_splx_txn_cp', version: 'v2.1', region: 'id', dtype: 'Epic', build: 'v2.1.20250703.1', env: 'staging', status: 'Deployed', created: '2025-07-03 12:02:40', updated: '2025-07-03 12:10:03', owners: ['cedric.chencan@seamoney.com'] },
  { name: 'realtime-hpl-acard-isolated', version: 'v1.0', region: 'ph', dtype: 'Epic', build: 'v1.0.20250627.1', env: 'prod', status: 'Deployed', created: '2025-06-27 16:40:54', updated: '2025-06-27 17:23:45', owners: ['zhengyi.loh@seamoney.com', 'dylan.seekl@seamoney.com'] },
  { name: 'funding-rac-test-model', version: 'v1.0', region: 'id', dtype: 'K8s', build: 'v1.0.20250715.1', env: 'prod', status: 'Deployed', created: '2025-06-09 17:44:47', updated: '2025-07-15 16:06:30', owners: ['chenyingying@shopee.com', 'jinghui.bi@shopee.com'] },
  { name: 'mx_bureau', version: 'v1.0', region: 'mx', dtype: 'Epic', build: 'v1.0.20250902.1', env: 'prod', status: 'Deployed', created: '2025-06-04 10:21:23', updated: '2025-09-02 13:44:19', owners: ['zhengyi.loh@seamoney.com', 'jack.yangiy@seamoney.com'] },
  { name: 'ph_cic', version: 'v2.0', region: 'ph', dtype: 'K8s', build: 'v2.0.20250602.1', env: 'prod', status: 'Deployed', created: '2025-05-26 11:56:10', updated: '2025-06-02 16:58:00', owners: ['ziyan.liu@seamoney.com', 'zhengyi.loh@seamoney.com'] },
  { name: 'mx_bureau', version: 'v2.0-rc', region: 'mx', dtype: 'Epic', build: 'v2.0rc.20250830.1', env: 'staging', status: 'Deploying', created: '2025-08-30 09:12:00', updated: '2025-08-30 09:12:40', owners: ['zhengyi.loh@seamoney.com'] },
  { name: 'funding-rac-test-model', version: 'v1.1', region: 'id', dtype: 'Serverless', build: 'v1.1.20250901.1', env: 'prod', status: 'Failed', created: '2025-09-01 14:20:11', updated: '2025-09-01 14:26:52', owners: ['chenyingying@shopee.com'] },
  { name: 'ph_cic', version: 'v2.1', region: 'ph', dtype: 'Epic', build: 'v2.1.20250905.1', env: 'prod', status: 'Failed', created: '2025-09-05 10:08:33', updated: '2025-09-05 10:15:07', owners: ['ziyan.liu@seamoney.com'] },
  { name: 'id_splx_txn_cp', version: 'v2.0', region: 'id', dtype: 'Epic', build: 'v2.0.20250620.1', env: 'prod', status: 'Offline', created: '2025-06-20 11:00:00', updated: '2025-07-03 11:50:00', owners: ['cedric.chencan@seamoney.com', 'zhengyi.loh@seamoney.com'] },
  { name: 'SharkTest', version: 'v1.0', region: 'sg', dtype: 'K8s', build: 'v1.0.20251222.1', env: 'prod', status: 'Offline', created: '2025-06-04 15:06:34', updated: '2025-12-22 12:36:32', owners: ['alan.li@shopee.com'] },
  { name: 'realtime-hpl-acard-isolated', version: 'v0.9', region: 'ph', dtype: 'Epic', build: 'v0.9.20250610.1', env: 'prod', status: 'Offline', created: '2025-06-10 09:30:00', updated: '2025-06-27 17:30:00', owners: ['zhengyi.loh@seamoney.com'] },
];

let rows = seedRows.map((r, i) => ({ id: 'd' + (i + 1), ...r, owners: [...r.owners] }));

const state = {
  filters: { statusArr: [] },
  expanded: false,
  ownedOnly: false,
  page: 1,
  pageSize: 10,
  view: 'list',       // list | detail | monitor | logs
  detail: null,
  extRow: null,       // monitor / logs 当前行
  testRow: null,
  testing: false,
  popRow: null,
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
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function regionChip(r) { return `<span class="chip-tag r-${escapeHtml(r)}">${escapeHtml(r)}</span>`; }
function dtypeChip(t) {
  const cls = { Epic: 't-epic', K8s: 't-k8s', Serverless: 't-serverless' }[t] || 't-k8s';
  return `<span class="chip-tag ${cls}">${escapeHtml(t)}</span>`;
}
function statusChip(s) {
  return `<span class="status-cell ${s === 'Deploying' ? 'deploying' : ''} ${s}"><i class="status-dot"></i>${s}</span>`;
}

/* Action 门控：Redeploy 仅 Failed；Offline 仅 Deployed */
const canRedeploy = (status) => status === 'Failed';
const canOffline = (status) => status === 'Deployed';

function buildVersionOf(model) {
  const ymd = nowStr().slice(0, 10).replace(/-/g, '');
  return `${model.version}.${ymd}.1`;
}

function filteredRows() {
  const f = state.filters;
  return rows.filter(r =>
    (!f.name || r.name.toLowerCase().includes(f.name.trim().toLowerCase())) &&
    (!f.version || r.version.toLowerCase().includes(f.version.trim().toLowerCase())) &&
    (!f.region || r.region === f.region) &&
    (!f.dtype || r.dtype === f.dtype) &&
    (!f.build || r.build.toLowerCase().includes(f.build.trim().toLowerCase())) &&
    (f.statusArr.length === 0 || f.statusArr.includes(r.status)) &&
    (!state.ownedOnly || r.owners.includes(CURRENT_USER))
  ).sort((a, b) => b.updated.localeCompare(a.updated));
}

/* ---------- 页面切换 ---------- */

function showPage(view) {
  state.view = view;
  for (const id of ['page-list', 'page-detail', 'page-monitor', 'page-logs']) $(id).hidden = true;
  $({ list: 'page-list', detail: 'page-detail', monitor: 'page-monitor', logs: 'page-logs' }[view]).hidden = false;
}

/* ---------- 列表渲染 ---------- */

function render() {
  renderFilterOptions();
  if (state.view === 'list') renderTable();
  renderPagination();
}

function renderFilterOptions() {
  for (const [id, values] of [['f-region', REGIONS], ['f-dtype', DEPLOY_TYPES]]) {
    const sel = $(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">Please select</option>' +
      values.map(v => `<option ${v === cur ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
  }
}

function renderTable() {
  const list = filteredRows();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="11">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  tbody.innerHTML = pageList.map(r => {
    const redeploy = canRedeploy(r.status), offline = canOffline(r.status);
    return `<tr>
      <td class="mono">${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.version)}</td>
      <td>${regionChip(r.region)}</td>
      <td>${dtypeChip(r.dtype)}</td>
      <td class="mono">${escapeHtml(r.build)}</td>
      <td class="env-cell">${escapeHtml(r.env)}</td>
      <td>${statusChip(r.status)}</td>
      <td class="time">${escapeHtml(r.created)}</td>
      <td class="time">${escapeHtml(r.updated)}</td>
      <td class="multi-owner">${r.owners.map(o => `<div>${escapeHtml(o)}</div>`).join('')}</td>
      <td>
        <button class="link-btn edit" data-act="view" data-id="${r.id}">View</button>
        <button class="link-btn edit" data-act="test" data-id="${r.id}">Test Run</button>
        <button class="link-btn ${redeploy ? 'edit' : 'disabled'}" data-act="redeploy" data-id="${r.id}" ${redeploy ? '' : 'disabled'}>Redeploy</button>
        <button class="link-btn edit" data-act="monitor" data-id="${r.id}">Monitor</button>
        <button class="link-btn edit" data-act="logs" data-id="${r.id}">Logs</button>
        <button class="link-btn ${offline ? 'danger' : 'disabled'}" data-act="offline" data-id="${r.id}" ${offline ? '' : 'disabled'}>Offline</button>
      </td>
    </tr>`;
  }).join('');

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredRows();
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

/* ---------- Status 多选 ---------- */

function renderStatusSelect() {
  const panel = $('f-status-panel');
  panel.innerHTML = STATUSES.map(s =>
    `<label><input type="checkbox" value="${s}" ${state.filters.statusArr.includes(s) ? 'checked' : ''}>${s}</label>`).join('');
  panel.querySelectorAll('input').forEach(cb =>
    cb.addEventListener('change', () => {
      state.filters.statusArr = [...panel.querySelectorAll('input:checked')].map(c => c.value);
      renderStatusTags();
    }));
  renderStatusTags();
}

function renderStatusTags() {
  const sel = state.filters.statusArr;
  $('f-status-tags').innerHTML = sel.length
    ? sel.map(s => `<span class="ms-tag">${escapeHtml(s)}</span>`).join('')
    : '<span class="ms-placeholder">Please select</span>';
}

/* ---------- 部署明细页（View，与 Model Mgmt 的 Build Detail 同构） ---------- */

function kvRow(k, v, opts = {}) {
  return `<div class="kv-row${opts.wide ? ' wide' : ''}"><span class="k">${k}：</span><span class="v${opts.mono ? ' mono' : ''}">${v}</span></div>`;
}

function buildInfo(r) {
  return {
    modelType: 'FpDataSci',
    sourceFile: `${r.updated.replace(/[- :]/g, '')}.zip`,
    python: '3.9.21',
    operator: r.owners[0],
    addition: 'Add Via SDK',
    dependencies: '["pip==24.2","setuptools==72.1.0","wheel==0.43.0"]',
    pips: '["--index-url https://pypi.org/simple","--extra-index-url https://pypi.shopee.io/simple","mlflow==2.21.3","lightgbm==4.5.0","xgboost==2.1.1","scikit-learn==1.5.1","pandas==2.2.2","numpy==1.26.4","seamoney-aimos==1.0.42","seamoney-ml-util==0.0.126"]',
    commands: '[]',
    runModule: 'main',
    envs: '{"CONTAINER_MODEL_PATH":"model","MODEL_LOSS_THRESHOLD":"1e-2"}',
    s3Path: `s3://sg-szfin-feature-management-aimos-bff/live/model_management/1788344863860-${r.updated.replace(/[- :]/g, '')}.zip`,
  };
}

function inputParams(r) {
  const base = [
    ['circulo_prob', 'float'], ['shopee_prob', 'float'], ['aai_prob', 'float'],
    ['circulo_query_grantor_collection_cnt_ratio_180d', 'float'],
  ];
  const out = [...base];
  for (let i = out.length; i < 205; i++) {
    out.push([`${r.name.split(/[-_]/)[0]}_feat_${String(i + 1).padStart(3, '0')}`, i % 5 === 0 ? 'int' : 'float']);
  }
  return out;
}

function outputParams() { return [['prediction', 'float']]; }

function openDetail(r) {
  state.detail = r;
  showPage('detail');
  renderDetail();
}

function renderDetail() {
  const r = state.detail;
  const b = buildInfo(r);

  $('detail-model-info').innerHTML =
    kvRow('Model Name', escapeHtml(r.name), { mono: true }) +
    kvRow('Model Version', escapeHtml(r.version), { mono: true }) +
    kvRow('Region', escapeHtml(r.region)) +
    kvRow('Biz Team', escapeHtml(MODELS.find(m => m.name === r.name && m.version === r.version)?.team || 'DataSci')) +
    kvRow('Owner', escapeHtml(r.owners[0]));

  $('detail-build-info').innerHTML =
    kvRow('Build Version', escapeHtml(r.build), { mono: true }) +
    `<div class="kv-row"><span class="k">Deployment Status：</span><span class="v">${statusChip(r.status)}</span></div>` +
    kvRow('DeployType', escapeHtml(r.dtype)) +
    kvRow('Env', escapeHtml(r.env)) +
    kvRow('Deployment Time', escapeHtml(r.updated)) +
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

  const inParams = inputParams(r);
  $('detail-input-params').innerHTML = inParams
    .map(([n, t]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(t)}</td></tr>`).join('');
  $('input-count').textContent = `Input Parameter Count:${inParams.length}`;

  const outParams = outputParams();
  $('detail-output-params').innerHTML = outParams
    .map(([n, t]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(t)}</td></tr>`).join('');
  $('output-count').textContent = `Output Parameter Count:${outParams.length}`;
}

/* ---------- Test Run（参考 FS Transformation Test Modal） ---------- */

function testInputParams(r) { return inputParams(r).slice(0, 6); }

function openTest(r) {
  state.testRow = r;
  state.testing = false;
  $('test-title').textContent = `${r.name} ${r.build} Test Run`;
  $('t-region').innerHTML = `<option value="">Please select</option><option selected>${escapeHtml(r.region)}</option>`;
  $('t-region').value = r.region;
  $('btn-test-run').disabled = false;
  $('btn-test-run').textContent = 'Test';
  $('test-duration').textContent = 'Duration: — ms';
  $('test-inputs').innerHTML = testInputParams(r).map(([n, t]) =>
    `<tr><td>${escapeHtml(n)}</td><td class="type-cell">${escapeHtml(t)}</td><td><input type="text" data-p="${escapeHtml(n)}" placeholder="please input"></td></tr>`).join('');
  renderTestOutputs(null, null);
  $('test-modal').classList.remove('hidden');
}

function renderTestOutputs(value, testing) {
  $('test-outputs').innerHTML = outputParams().map(([n, t]) =>
    `<tr><td>${escapeHtml(n)}</td><td class="type-cell">${escapeHtml(t)}</td><td class="out-val">${testing ? '<span class="testing-dots">…</span>' : (value ?? '—')}</td></tr>`).join('');
}

function runTest() {
  if (state.testing || !state.testRow) return;
  state.testing = true;
  $('btn-test-run').disabled = true;
  $('btn-test-run').textContent = 'Testing…';
  renderTestOutputs(null, true);
  const ms = 120 + Math.floor(Math.random() * 380);
  setTimeout(() => {
    renderTestOutputs((Math.random() * 0.9 + 0.02).toFixed(4), false);
    $('test-duration').textContent = `Duration: ${ms} ms`;
    state.testing = false;
    $('btn-test-run').disabled = false;
    $('btn-test-run').textContent = 'Test';
  }, ms);
}

function applyJsonInputs() {
  let parsed;
  try { parsed = JSON.parse($('json-paste').value); } catch { toast('JSON 解析失败，请检查格式', 'error'); return; }
  if (typeof parsed !== 'object' || parsed === null) { toast('JSON 需为对象（param → value）', 'error'); return; }
  $('test-inputs').querySelectorAll('input[data-p]').forEach(inp => {
    const k = inp.dataset.p;
    if (k in parsed) inp.value = String(parsed[k]);
  });
  $('json-paste').value = '';
  $('json-editor').classList.add('hidden');
}

/* ---------- Redeploy / Offline ---------- */

function redeploy(r) {
  r.status = 'Deploying';
  r.updated = nowStr();
  toast(`Redeploying ${r.name} ${r.build}…`);
  render();
  setTimeout(() => {
    r.status = 'Deployed';
    r.updated = nowStr();
    toast(`${r.name} ${r.build} redeployed`);
    render();
  }, 1800);
}

function openPopconfirm(btn, r) {
  const pop = $('popconfirm');
  $('pop-text').textContent = `「${r.name} ${r.build}（${r.env}）」下线后停止在线推理服务，状态转为 Offline，需重新 Deploy 才能恢复。`;
  state.popRow = r;
  pop.classList.remove('hidden');
  const rect = btn.getBoundingClientRect();
  pop.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
  pop.style.top = (rect.bottom + window.scrollY + 10) + 'px';
}

function closePopconfirm() {
  $('popconfirm').classList.add('hidden');
  state.popRow = null;
}

/* ---------- Deploy 弹窗 ---------- */

function openDeployModal() {
  const cur = $('d-model').value;
  $('d-model').innerHTML = '<option value="">Please select</option>' +
    MODELS.map(m => `<option value="${escapeHtml(m.name)}|${escapeHtml(m.version)}">${escapeHtml(m.name)} · ${escapeHtml(m.version)}</option>`).join('');
  $('d-model').value = cur;
  $('d-region').innerHTML = '<option value="">Please select</option>' + REGIONS.map(r => `<option>${r}</option>`).join('');
  $('d-env').value = '';
  $('d-dtype').innerHTML = '<option value="">Please select</option>' + DEPLOY_TYPES.map(t => `<option>${t}</option>`).join('');
  $('d-build').value = '';
  ['d-model', 'd-region', 'd-env', 'd-dtype'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('deploy-modal').classList.remove('hidden');
}

function submitDeploy() {
  const modelKey = $('d-model').value;
  const region = $('d-region').value;
  const env = $('d-env').value;
  const dtype = $('d-dtype').value;
  let ok = true;
  for (const [key, empty] of [['d-model', !modelKey], ['d-region', !region], ['d-env', !env], ['d-dtype', !dtype]]) {
    $('err-' + key).classList.toggle('hidden', !empty);
    if (empty) ok = false;
  }
  if (!ok) return;

  const model = MODELS.find(m => `${m.name}|${m.version}` === modelKey);
  const row = {
    id: 'd' + Date.now(),
    name: model.name, version: model.version, region, dtype, env,
    build: buildVersionOf(model),
    status: 'Deploying', created: nowStr(), updated: nowStr(),
    owners: [CURRENT_USER],
  };
  rows.unshift(row);
  $('deploy-modal').classList.add('hidden');
  state.page = 1;
  render();
  toast(`Deployment submitted：${row.name} ${row.build} → ${region}/${env}`);
  setTimeout(() => {
    row.status = 'Deployed';
    row.updated = nowStr();
    toast(`${row.name} ${row.build} deployed`);
    render();
  }, 2200);
}

/* ---------- Monitor（外部 Grafana mock） ---------- */

function seeded(seed) { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; }

function genSeries(seed, base, jitter, n = 48) {
  const rnd = seeded(seed);
  return Array.from({ length: n }, (_, i) => Math.max(0, base + Math.sin(i / 5) * jitter * 0.4 + (rnd() - 0.5) * jitter));
}

function lineSvg(seriesList, labels) {
  const w = 560, h = 130, pad = 6;
  const all = seriesList.flatMap(s => s.vals);
  const max = Math.max(...all) * 1.1 || 1, min = Math.min(0, ...all);
  const x = (i) => pad + i * (w - 2 * pad) / (seriesList[0].vals.length - 1);
  const y = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);
  const grid = [0.25, 0.5, 0.75].map(f =>
    `<line x1="${pad}" x2="${w - pad}" y1="${(h * f).toFixed(1)}" y2="${(h * f).toFixed(1)}" stroke="#242938" stroke-width="1"/>`).join('');
  const lines = seriesList.map(s =>
    `<polyline fill="none" stroke="${s.color}" stroke-width="1.6" points="${s.vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`).join('');
  const axis = labels.map((lb, i) =>
    `<text x="${(pad + i * (w - 2 * pad) / (labels.length - 1)).toFixed(1)}" y="${h - 1}" fill="#5b6478" font-size="9" text-anchor="middle">${lb}</text>`).join('');
  return `<svg class="gf-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}${lines}${axis}</svg>`;
}

function barSvg(heights, labels, color) {
  const w = 560, h = 130, pad = 8;
  const bw = (w - 2 * pad) / heights.length;
  const max = Math.max(...heights) || 1;
  const bars = heights.map((v, i) => {
    const bh = (v / max) * (h - 24);
    return `<rect x="${(pad + i * bw + bw * 0.15).toFixed(1)}" y="${(h - 16 - bh).toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${color}" opacity="${(0.45 + 0.55 * v / max).toFixed(2)}"/>`;
  }).join('');
  const axis = labels.map((lb, i) =>
    `<text x="${(pad + i * bw + bw / 2).toFixed(1)}" y="${h - 4}" fill="#5b6478" font-size="9" text-anchor="middle">${lb}</text>`).join('');
  return `<svg class="gf-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}${axis}</svg>`;
}

function openMonitor(r) {
  state.extRow = r;
  const hours = ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  const qps = genSeries(11, 1280, 260);
  const hist = genSeries(31, 60, 80, 12).map(v => v.toFixed(0));
  const regionTable = REGIONS.map((reg, i) => {
    const q = [1240, 860, 640, 310, 180][i];
    return `<tr><td style="font-family:inherit">${regionChip(reg)}</td><td>${q}</td><td>${34 + i * 6}ms</td><td>${(0.08 + i * 0.03).toFixed(2)}%</td><td class="gf-up">4/4</td></tr>`;
  }).join('');
  $('monitor-body').innerHTML = `
    <div class="grafana">
      <div class="gf-topbar">
        <span class="gf-brand">◉ GRAFANA</span>
        <span class="gf-crumb">Model Serving / <b>${escapeHtml(r.name)} · ${escapeHtml(r.build)}</b>（${escapeHtml(r.env)}）</span>
        <span class="gf-spacer"></span>
        <span class="gf-time">Last 6 hours · Auto refresh 30s ⟳</span>
      </div>
      <div class="gf-row stats">
        <div class="gf-panel gf-stat"><h3>Request Rate (QPS)</h3><div class="gf-stat-num">1,284</div><div class="gf-stat-sub gf-up">▲ 4.2% vs 6h ago</div></div>
        <div class="gf-panel gf-stat"><h3>P99 Latency</h3><div class="gf-stat-num">42<small>ms</small></div><div class="gf-stat-sub gf-up">▼ 3ms vs 6h ago</div></div>
        <div class="gf-panel gf-stat"><h3>Error Rate</h3><div class="gf-stat-num">0.12<small>%</small></div><div class="gf-stat-sub gf-warn">budget 0.5%</div></div>
        <div class="gf-panel gf-stat"><h3>Healthy Pods</h3><div class="gf-stat-num gf-up">4 / 4</div><div class="gf-stat-sub gf-dim">replicas: 4 · target QPS/pod 1500</div></div>
      </div>
      <div class="gf-row half">
        <div class="gf-panel"><h3>Request Rate</h3>${lineSvg([{ vals: qps, color: '#3fb68b' }, { vals: qps.map(v => v * 0.72), color: '#ffaa33' }], hours)}
          <div class="gf-legend"><span><i style="background:#3fb68b"></i>total</span><span><i style="background:#ffaa33"></i>score&gt;threshold</span></div></div>
        <div class="gf-panel"><h3>Inference Latency</h3>${lineSvg([{ vals: genSeries(21, 24, 8), color: '#58a6ff' }, { vals: genSeries(22, 36, 10), color: '#b48eff' }, { vals: genSeries(23, 44, 12), color: '#f2564d' }], hours)}
          <div class="gf-legend"><span><i style="background:#58a6ff"></i>p50</span><span><i style="background:#b48eff"></i>p95</span><span><i style="background:#f2564d"></i>p99</span></div></div>
      </div>
      <div class="gf-row half">
        <div class="gf-panel"><h3>Model Score Distribution（1h）</h3>${barSvg(hist, ['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '——'], '#3fb68b')}</div>
        <div class="gf-panel"><h3>Region Serving</h3>
          <table class="gf-table"><thead><tr><th>Region</th><th>QPS</th><th>P99</th><th>Err%</th><th>Pods</th></tr></thead><tbody>${regionTable}</tbody></table>
        </div>
      </div>
    </div>`;
  showPage('monitor');
  window.scrollTo(0, 0);
}

/* ---------- Logs（外部日志台 mock） ---------- */

function openLogs(r) {
  state.extRow = r;
  const rnd = seeded(r.id.length * 7 + r.name.length);
  const templates = [
    ['INFO', '[grpc-server] serving on 0.0.0.0:8500, workers=8, model=<span class="hl">MODEL_ZIP</span>'],
    ['INFO', '[model-loader] model loaded from s3://…/MODEL_ZIP (214MB) in 3.2s, md5 verified'],
    ['INFO', '[feature-fetch] FG serving lookup entity=uid, fg=fg_txn_cp_180d, took 8ms'],
    ['INFO', '[inference] request_id=RID latency=38ms score=0.1732'],
    ['INFO', '[inference] request_id=RID latency=41ms score=0.8841'],
    ['WARN', '[feature-fetch] fg_splx_device_30d slow lookup 156ms (p99 budget 200ms)'],
    ['INFO', '[autoscaler] replicas 4 → 4 (qps 1284, target 1500)'],
    ['ERROR', '[inference] upstream feature timeout, request_id=RID, retry 1/2 → fallback default vector'],
    ['INFO', '[healthz] ok · mem 61% · cpu 43%'],
  ];
  const now = Date.now();
  const lines = Array.from({ length: 42 }, (_, i) => {
    const t = templates[Math.floor(rnd() * templates.length)];
    const ts = new Date(now - (42 - i) * 7300);
    const p = (n) => String(n).padStart(2, '0');
    const stamp = `${p(ts.getHours())}:${p(ts.getMinutes())}:${p(ts.getSeconds())}.${String(ts.getMilliseconds()).padStart(3, '0')}`;
    const msg = t[1].replace(/MODEL_ZIP/g, escapeHtml(r.build)).replace(/RID/g, `req-${Math.floor(rnd() * 1e8).toString(16)}`);
    return { lv: t[0], stamp, msg };
  });
  state.logLines = lines;
  $('logs-body').innerHTML = `
    <div class="logconsole">
      <div class="lc-toolbar">
        <select id="lc-service"><option>${escapeHtml(r.name)} · ${escapeHtml(r.build)} · ${escapeHtml(r.region)}/${escapeHtml(r.env)}</option></select>
        <button class="lc-level on-INFO" data-lv="INFO">INFO</button>
        <button class="lc-level on-WARN" data-lv="WARN">WARN</button>
        <button class="lc-level on-ERROR" data-lv="ERROR">ERROR</button>
        <input type="text" id="lc-search" placeholder="filter logs…">
        <span class="lc-spacer" style="flex:1"></span>
        <span class="lc-live"><i></i>Live tail</span>
      </div>
      <div class="lc-stream" id="lc-stream"></div>
    </div>`;
  renderLogs(['INFO', 'WARN', 'ERROR'], '');
  showPage('logs');
  window.scrollTo(0, 0);
}

function renderLogs(levels, keyword) {
  const stream = $('lc-stream');
  if (!stream || !state.logLines) return;
  const visible = state.logLines.filter(l =>
    levels.includes(l.lv) && (!keyword || (l.stamp + l.msg).toLowerCase().includes(keyword.toLowerCase())));
  stream.innerHTML = visible.length
    ? visible.map(l => `<div class="lc-line" data-lv="${l.lv}"><span class="ts">${l.stamp}</span>  <span class="lv-${l.lv}">${l.lv.padEnd(5, ' ')}</span> <span class="msg">${l.msg}</span></div>`).join('')
    : '<div class="lc-line">— no matching log lines —</div>';
  stream.scrollTop = stream.scrollHeight;
}

/* ---------- 事件绑定 ---------- */

function bindEvents() {
  const applyFilters = () => {
    state.filters = {
      ...state.filters,
      name: $('f-name').value, version: $('f-version').value, region: $('f-region').value,
      dtype: $('f-dtype').value, build: $('f-build').value,
    };
    state.page = 1;
    render();
  };
  $('btn-query').addEventListener('click', applyFilters);
  $('btn-reset').addEventListener('click', () => {
    ['f-name', 'f-version', 'f-region', 'f-dtype', 'f-build'].forEach(id => $(id).value = '');
    state.filters = { statusArr: [] };
    state.ownedOnly = false;
    $('owned-me').checked = false;
    renderStatusTags();
    state.page = 1;
    render();
  });
  $('btn-collapse').addEventListener('click', () => {
    state.expanded = !state.expanded;
    document.querySelectorAll('[data-extra]').forEach(el => el.hidden = !state.expanded);
    $('btn-collapse').textContent = state.expanded ? 'Expand ∨' : 'Collapse ∧';
  });
  $('owned-me').addEventListener('change', () => { state.ownedOnly = $('owned-me').checked; state.page = 1; render(); });

  // Status 多选下拉
  $('f-status-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    $('f-status-panel').classList.toggle('hidden');
  });
  $('f-status-panel').addEventListener('click', (e) => e.stopPropagation());

  // 表格动作（委托）
  $('table-body').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn || btn.disabled) return;
    const row = rows.find(r => r.id === btn.dataset.id);
    if (!row) return;
    switch (btn.dataset.act) {
      case 'view': openDetail(row); break;
      case 'test': openTest(row); break;
      case 'redeploy': if (canRedeploy(row.status)) redeploy(row); break;
      case 'monitor': openMonitor(row); break;
      case 'logs': openLogs(row); break;
      case 'offline': if (canOffline(row.status)) openPopconfirm(btn, row); break;
    }
  });

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });

  // 明细页返回
  $('btn-back-top').addEventListener('click', () => { showPage('list'); render(); });
  $('btn-back-bottom').addEventListener('click', () => { showPage('list'); render(); });
  $('btn-monitor-back').addEventListener('click', () => { showPage('list'); render(); });
  $('btn-logs-back').addEventListener('click', () => { showPage('list'); render(); });

  // Copy Setting
  document.querySelectorAll('.copy-setting').forEach(b =>
    b.addEventListener('click', () => {
      if (!state.detail) return;
      const params = b.dataset.copy === 'input' ? inputParams(state.detail) : outputParams();
      const text = JSON.stringify(Object.fromEntries(params), null, 2);
      const done = () => toast('Setting copied to clipboard');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => toast(text, 'info'));
      else toast(text, 'info');
    }));

  // Deploy 弹窗
  $('btn-deploy').addEventListener('click', openDeployModal);
  $('btn-deploy-cancel').addEventListener('click', () => $('deploy-modal').classList.add('hidden'));
  $('btn-deploy-close').addEventListener('click', () => $('deploy-modal').classList.add('hidden'));
  $('btn-deploy-submit').addEventListener('click', submitDeploy);
  $('d-model').addEventListener('change', () => {
    const model = MODELS.find(m => `${m.name}|${m.version}` === $('d-model').value);
    $('d-build').value = model ? buildVersionOf(model) : '';
    if (model) $('d-region').value = model.region;
  });

  // Test Run 弹窗
  $('btn-test-cancel').addEventListener('click', () => $('test-modal').classList.add('hidden'));
  $('btn-test-close').addEventListener('click', () => $('test-modal').classList.add('hidden'));
  $('btn-test-run').addEventListener('click', runTest);
  $('btn-test-json').addEventListener('click', () => $('json-editor').classList.remove('hidden'));
  $('btn-json-cancel').addEventListener('click', () => $('json-editor').classList.add('hidden'));
  $('btn-json-close').addEventListener('click', () => $('json-editor').classList.add('hidden'));
  $('btn-json-apply').addEventListener('click', applyJsonInputs);

  // Popconfirm
  $('btn-pop-cancel').addEventListener('click', closePopconfirm);
  $('btn-pop-ok').addEventListener('click', () => {
    const r = state.popRow;
    closePopconfirm();
    if (!r) return;
    r.status = 'Offline';
    r.updated = nowStr();
    toast(`${r.name} ${r.build} 已下线`);
    render();
  });

  // 工具栏
  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('Model Deployment：发布 Build 为在线推理服务（Deploy）；View 查看部署明细；Test Run 手工试跑；Redeploy 仅失败可重发；Offline 下线（仅 Deployed）'));

  document.addEventListener('click', (e) => {
    // 关闭 Status 下拉
    if (!e.target.closest('#f-status')) $('f-status-panel').classList.add('hidden');
    // 关闭 popconfirm（点击气泡外）
    if (!e.target.closest('#popconfirm') && !e.target.closest('[data-act="offline"]')) closePopconfirm();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['deploy-modal', 'test-modal', 'json-editor'].forEach(id => $(id).classList.add('hidden'));
      closePopconfirm();
    }
  });

  // Logs 页筛选（事件委托，页面按需重建）
  $('logs-body').addEventListener('click', (e) => {
    const lv = e.target.closest('.lc-level');
    if (lv) {
      lv.classList.toggle('on-' + lv.dataset.lv);
      const on = [...document.querySelectorAll('.lc-level')].filter(b => b.className.includes('on-')).map(b => b.dataset.lv);
      renderLogs(on, $('lc-search').value);
    }
  });
  $('logs-body').addEventListener('input', (e) => {
    if (e.target.id === 'lc-search') {
      const on = [...document.querySelectorAll('.lc-level')].filter(b => b.className.includes('on-')).map(b => b.dataset.lv);
      renderLogs(on, e.target.value);
    }
  });
}

/* ---------- 自检（#selftest）：门控矩阵 + Build Version 推导 ---------- */

function runSelfTest() {
  const results = [];
  const assert = (name, cond) => results.push([name, !!cond]);
  const matrix = {
    Deployed: { redeploy: false, offline: true },
    Deploying: { redeploy: false, offline: false },
    Failed: { redeploy: true, offline: false },
    Offline: { redeploy: false, offline: false },
  };
  for (const [st, exp] of Object.entries(matrix)) {
    assert(`canRedeploy(${st}) === ${exp.redeploy}`, canRedeploy(st) === exp.redeploy);
    assert(`canOffline(${st}) === ${exp.offline}`, canOffline(st) === exp.offline);
  }
  assert('buildVersionOf format {version}.{YYYYMMDD}.1', /^\.\d{8}\.1$/.test(buildVersionOf({ version: '' })));
  assert('filter by status multi-select', (() => {
    const f = { statusArr: ['Failed'] };
    return rows.filter(r => f.statusArr.length === 0 || f.statusArr.includes(r.status)).every(r => r.status === 'Failed');
  })());
  const failed = results.filter(r => !r[1]);
  document.body.innerHTML = `<pre style="padding:24px;font:13px/1.7 monospace">${results.map(([n, ok]) => `${ok ? 'PASS' : 'FAIL'}  ${n}`).join('\n')}\n\n${failed.length} failed / ${results.length} total</pre>`;
  console.assert(failed.length === 0, 'selftest failures', failed);
}

if (location.hash === '#selftest') {
  runSelfTest();
} else {
  bindEvents();
  renderStatusSelect();
  render();
  // 深链直达外部系统 mock 页（shell「新窗口打开」跟随 iframe 内 hash 时使用）
  const demoRow = rows.find(r => r.status === 'Deployed') || rows[0];
  if (location.hash === '#monitor') openMonitor(demoRow);
  else if (location.hash === '#logs') openLogs(demoRow);
}
