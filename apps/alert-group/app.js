/* Aimos Console — Alert Group 模块原型
 *
 * 领域规则：
 * - Alert Group = 一组告警接收配置（Name + Type + Webhook），Name 唯一
 * - Type 当前支持 SeaTalk（Webhook 指向 openapi.seatalk.io）
 * - Verify：向该 Group 配置的 webhook 发送一条测试消息；原型中仅做发送动效演示，
 *   不发起真实网络请求，成功提示自动消失
 * 数据为前端 mock，刷新后重置。
 */

const TYPES = ['SeaTalk'];

const seedGroups = [
  { id: 6, name: 'genos', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/k2jsx1WSwSBBvyrKgw-7A', updated: '2026-08-28 14:52:19' },
  { id: 5, name: 'algo_business', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/59ueoA8URcuDp5HcsU41bg', updated: '2026-08-14 17:35:01' },
  { id: 4, name: 'rta_group_alert', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/ZnQM99bHsdmbuFFXlpKzmQ', updated: '2026-08-13 10:08:56' },
  { id: 3, name: 'alert_sly', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/-KvJgJthQYiqPdMWPPp6Vw', updated: '2026-06-29 18:13:35' },
  { id: 2, name: 'test_alert', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/NfaOlMbaRm2PmQmHlwKQrQ', updated: '2026-01-13 16:49:43' },
  { id: 1, name: 'test', type: 'seatalk', webhook: 'https://openapi.seatalk.io/webhook/group/q85ZboPyT7iRrbXmbpc3bw', updated: '2026-01-05 19:52:12' },
];

let groups = seedGroups.map(g => ({ ...g }));

const state = {
  filter: '',
  page: 1,
  pageSize: 10,
  editingId: null,   // 编辑中的 Group Id；null = Add
  confirmFn: null,
  verifyTimer: null,
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

function filteredGroups() {
  return groups
    .filter(g => !state.filter || g.name.toLowerCase().includes(state.filter.trim().toLowerCase()))
    .sort((a, b) => b.id - a.id);
}

/* ---------- 渲染 ---------- */

function render() {
  renderTable();
  renderPagination();
}

function renderTable() {
  const list = filteredGroups();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  tbody.innerHTML = pageList.map(g => `
    <tr>
      <td>${g.id}</td>
      <td>${escapeHtml(g.name)}</td>
      <td>${escapeHtml(g.type)}</td>
      <td class="webhook-cell" title="${escapeHtml(g.webhook)}">${escapeHtml(g.webhook)}</td>
      <td>${escapeHtml(g.updated)}</td>
      <td>
        <button class="link-btn edit" data-id="${g.id}">Edit</button>
        <button class="link-btn verify" data-id="${g.id}">Verify</button>
        <button class="link-btn delete" data-id="${g.id}">Delete</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.link-btn.edit').forEach(b =>
    b.addEventListener('click', () => openAgModal('edit', Number(b.dataset.id))));
  tbody.querySelectorAll('.link-btn.verify').forEach(b =>
    b.addEventListener('click', () => verifyGroup(Number(b.dataset.id), b)));
  tbody.querySelectorAll('.link-btn.delete').forEach(b =>
    b.addEventListener('click', () => {
      const g = groups.find(x => x.id === Number(b.dataset.id));
      openConfirm(`确认删除 Alert Group「${g.name}」？删除后指向该 Group 的告警将不再送达。`, () => {
        groups = groups.filter(x => x.id !== g.id);
        toast('Alert Group deleted');
        render();
      });
    }));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredGroups();
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

/* ---------- Add / Edit ---------- */

function openAgModal(mode, id) {
  state.editingId = mode === 'edit' ? id : null;
  $('ag-modal-title').textContent = mode === 'edit' ? 'Edit Alert Group' : 'Add Alert Group';
  $('m-type').innerHTML = '<option value="">Please Select</option>' +
    TYPES.map(t => `<option ${t.toLowerCase() === (mode === 'edit' ? groups.find(g => g.id === id).type : '') ? 'selected' : ''}>${t}</option>`).join('');
  $('m-name').value = mode === 'edit' ? groups.find(g => g.id === id).name : '';
  $('m-webhook').value = mode === 'edit' ? groups.find(g => g.id === id).webhook : '';
  ['name', 'type', 'webhook'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('ag-modal').classList.remove('hidden');
  if (mode === 'add') $('m-name').focus();
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitAgModal() {
  const name = $('m-name').value.trim();
  const type = $('m-type').value;
  const webhook = $('m-webhook').value.trim();
  let ok = true;

  if (!name) { setErr('name', 'Name 为必填项'); ok = false; }
  else if (groups.some(g => g.name.toLowerCase() === name.toLowerCase() && g.id !== state.editingId)) {
    setErr('name', `Alert Group「${name}」已存在`); ok = false;
  } else setErr('name', '');

  if (!type) { setErr('type', 'Type 为必填项'); ok = false; } else setErr('type', '');

  if (!webhook) { setErr('webhook', 'Webhook 为必填项'); ok = false; }
  else if (!/^https:\/\/[^\s]+$/.test(webhook)) { setErr('webhook', 'Webhook 需为 https:// 开头的合法 URL'); ok = false; }
  else setErr('webhook', '');

  if (!ok) return;

  if (state.editingId != null) {
    const g = groups.find(x => x.id === state.editingId);
    g.name = name; g.type = type.toLowerCase(); g.webhook = webhook; g.updated = nowStr();
    toast('Alert Group updated');
  } else {
    const nextId = groups.length ? Math.max(...groups.map(g => g.id)) + 1 : 1;
    groups.push({ id: nextId, name, type: type.toLowerCase(), webhook, updated: nowStr() });
    toast('Alert Group added');
  }
  $('ag-modal').classList.add('hidden');
  render();
}

/* ---------- Verify（发送测试消息动效） ---------- */

function verifyGroup(id, btn) {
  if (btn.classList.contains('loading')) return;
  const g = groups.find(x => x.id === id);
  btn.classList.add('loading');
  btn.innerHTML = '<span class="spinner"></span>Sending…';

  // 原型不发起真实网络请求；模拟发送耗时后展示成功动效
  setTimeout(() => {
    btn.classList.remove('loading');
    btn.textContent = 'Verify';
    showVerifySuccess(g);
  }, 700);
}

function showVerifySuccess(g) {
  const el = $('verify-success');
  $('verify-detail').textContent = `→ ${g.name} (${g.type} webhook)`;
  el.classList.remove('hidden', 'hide');
  clearTimeout(state.verifyTimer);
  state.verifyTimer = setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.classList.add('hidden'), 340);
  }, 2200);
}

/* ---------- 通用确认 ---------- */

function openConfirm(text, fn) {
  $('confirm-text').textContent = text;
  state.confirmFn = fn;
  $('confirm-modal').classList.remove('hidden');
}

/* ---------- 事件绑定 ---------- */

function bindEvents() {
  $('btn-query').addEventListener('click', () => { state.filter = $('f-name').value; state.page = 1; render(); });
  $('f-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-query').click(); });
  $('btn-reset').addEventListener('click', () => { $('f-name').value = ''; state.filter = ''; state.page = 1; render(); });

  $('btn-add').addEventListener('click', () => openAgModal('add'));
  $('btn-ag-cancel').addEventListener('click', () => $('ag-modal').classList.add('hidden'));
  $('btn-ag-modal-close').addEventListener('click', () => $('ag-modal').classList.add('hidden'));
  $('btn-ag-ok').addEventListener('click', submitAgModal);
  $('m-name').addEventListener('keydown', e => { if (e.key === 'Enter') submitAgModal(); });

  document.querySelectorAll('.input-clear').forEach(btn =>
    btn.addEventListener('click', () => { $(btn.dataset.for).value = ''; $(btn.dataset.for).focus(); }));

  document.querySelectorAll('.help').forEach(h =>
    h.addEventListener('click', () => toast(h.dataset.tip)));

  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('Alert Group：告警接收组配置（Name 唯一）；Verify 会向 webhook 发送一条测试消息'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });

  $('btn-confirm-cancel').addEventListener('click', () => $('confirm-modal').classList.add('hidden'));
  $('btn-confirm-ok').addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (state.confirmFn) { state.confirmFn(); state.confirmFn = null; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('ag-modal').classList.add('hidden');
      $('confirm-modal').classList.add('hidden');
    }
  });
}

bindEvents();
render();
