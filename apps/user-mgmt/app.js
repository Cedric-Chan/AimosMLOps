/* Aimos Console — User 模块原型
 *
 * 领域规则（与线上实现对齐）：
 * - 一个用户可归属多个 Biz Team；每个 (Email, Biz Team) 组合一条角色记录
 * - Team 内角色三档：VIEWER / EDITOR / ADMIN
 * - 一个用户在一个 Team 下同一时间只能有一个角色（唯一性校验）
 * - 列表按 Email + Biz Team 聚合展示（同 Email 合并单元格）
 * - superadmin 可通过 Team Dir 浮窗自由增删 Biz Team（删除级联移除该 Team 的角色记录）
 * 数据为前端 mock，刷新后重置。
 */

const CURRENT_USER = { email: 'cedric.chencan@seamoney.com', superadmin: true };

const ROLES = ['VIEWER', 'EDITOR', 'ADMIN'];

/* ---------- mock 数据 ---------- */

const seedTeams = [
  'Credit', 'Collection', 'Insurance', 'RealTimeFeature', 'DataSci-SGPII', 'Ops',
  'BankAlgo', 'MoneeAlgo', 'RiskPolicy', 'AntiFraud', 'DataSci', 'DataMart',
  'CreditFund', 'AimosTeam',
];

const seedAssignments = [
  { email: 'gulyuan.zhang@shopee.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:08:20' },
  { email: 'shuang.peng@shopee.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:08:24' },
  { email: 'alan.li@shopee.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:07:15' },
  { email: 'alan.li@shopee.com', team: 'DataSci', role: 'ADMIN', updated: '2025-05-19 18:32:41' },
  { email: 'cedric.chencan@seamoney.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:07:26' },
  { email: 'ruowen.li@seamoney.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:07:51' },
  { email: 'ruowen.li@seamoney.com', team: 'DataSci', role: 'ADMIN', updated: '2025-06-25 16:15:09' },
  { email: 'hexinran@seamoney.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:08:03' },
  { email: 'huangwei@shopee.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 15:54:52' },
  { email: 'biyao.bie@shopee.com', team: 'AimosTeam', role: 'ADMIN', updated: '2025-05-07 16:16:56' },
  { email: 'wei.wang@shopee.com', team: 'Credit', role: 'EDITOR', updated: '2025-06-01 10:12:00' },
  { email: 'wei.wang@shopee.com', team: 'RiskPolicy', role: 'VIEWER', updated: '2025-06-20 09:30:00' },
  { email: 'min.chen@shopee.com', team: 'DataSci', role: 'EDITOR', updated: '2025-06-11 14:05:00' },
  { email: 'jun.zhang@seamoney.com', team: 'MoneeAlgo', role: 'VIEWER', updated: '2025-06-15 11:00:00' },
  { email: 'jun.zhang@seamoney.com', team: 'AntiFraud', role: 'EDITOR', updated: '2025-06-22 16:40:00' },
  { email: 'lin.guo@shopee.com', team: 'CreditFund', role: 'VIEWER', updated: '2025-06-18 09:15:00' },
  { email: 'tao.liu@seamoney.com', team: 'RealTimeFeature', role: 'EDITOR', updated: '2025-06-25 10:00:00' },
  { email: 'tao.liu@seamoney.com', team: 'DataMart', role: 'VIEWER', updated: '2025-07-01 15:20:00' },
  { email: 'yan.sun@shopee.com', team: 'Insurance', role: 'VIEWER', updated: '2025-07-02 13:45:00' },
  { email: 'kevin.xu@shopee.com', team: 'Collection', role: 'EDITOR', updated: '2025-07-05 17:30:00' },
  { email: 'grace.he@seamoney.com', team: 'BankAlgo', role: 'VIEWER', updated: '2025-07-08 10:05:00' },
  { email: 'grace.he@seamoney.com', team: 'DataSci-SGPII', role: 'EDITOR', updated: '2025-07-10 12:00:00' },
  { email: 'bo.zhou@shopee.com', team: 'Ops', role: 'VIEWER', updated: '2025-07-12 09:40:00' },
  { email: 'fang.ye@seamoney.com', team: 'Credit', role: 'EDITOR', updated: '2025-07-15 14:25:00' },
];

let teams = [...seedTeams];
let assignments = seedAssignments.map(a => ({ ...a }));

/* ---------- 状态 ---------- */

const state = {
  filters: { email: '', team: '', role: '' },
  page: 1,
  pageSize: 10,
  editing: null,   // 编辑中的原记录 {email, team}
  confirmFn: null, // 确认弹窗回调
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

/* ---------- 数据查询 ---------- */

function filteredAssignments() {
  const { email, team, role } = state.filters;
  return assignments
    .filter(a => !email || a.email.toLowerCase().includes(email.trim().toLowerCase()))
    .filter(a => !team || a.team === team)
    .filter(a => !role || a.role === role)
    .sort((a, b) => a.email.localeCompare(b.email) || b.updated.localeCompare(a.updated));
}

/* ---------- 渲染 ---------- */

function render() {
  renderFilterOptions();
  renderTable();
  renderPagination();
}

function renderFilterOptions() {
  const sel = $('f-team');
  const current = sel.value || state.filters.team;
  sel.innerHTML = '<option value="">Please select</option>' +
    teams.map(t => `<option ${t === current ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function renderTable() {
  const list = filteredAssignments();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  // 按 Email 聚合渲染：同 Email 的连续行合并首列（rowspan）
  let html = '';
  let i = 0;
  while (i < pageList.length) {
    const email = pageList[i].email;
    let span = 0;
    while (i + span < pageList.length && pageList[i + span].email === email) span++;
    for (let k = 0; k < span; k++) {
      const a = pageList[i + k];
      html += '<tr>';
      if (k === 0) html += `<td class="group-email" rowspan="${span}">${escapeHtml(email)}</td>`;
      html += `<td>${escapeHtml(a.team)}</td>`;
      html += `<td>${escapeHtml(a.role)}</td>`;
      html += `<td>${escapeHtml(a.updated)}</td>`;
      html += `<td>
        <button class="link-btn edit" data-email="${escapeHtml(a.email)}" data-team="${escapeHtml(a.team)}">Edit</button>
        <button class="link-btn delete" data-email="${escapeHtml(a.email)}" data-team="${escapeHtml(a.team)}">Delete</button>
      </td>`;
      html += '</tr>';
    }
    i += span;
  }
  tbody.innerHTML = html;

  tbody.querySelectorAll('.link-btn.edit').forEach(btn =>
    btn.addEventListener('click', () => openUserModal('edit', btn.dataset.email, btn.dataset.team)));
  tbody.querySelectorAll('.link-btn.delete').forEach(btn =>
    btn.addEventListener('click', () => confirmDelete(btn.dataset.email, btn.dataset.team)));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${list.length === 0 ? 0 : start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredAssignments();
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
  const pages = windowedPages(state.page, totalPages);
  pages.forEach(p => {
    if (p === '...') {
      const s = document.createElement('span');
      s.textContent = '…';
      s.style.cssText = 'color:#999;align-self:center;';
      wrap.appendChild(s);
    } else {
      wrap.appendChild(mk(p, p, { current: p === state.page }));
    }
  });
  wrap.appendChild(mk('>', state.page + 1, { disabled: state.page >= totalPages }));
}

function windowedPages(cur, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, cur - 1, cur, cur + 1, total - 1, total]);
  const list = [...set].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  let prev = 0;
  for (const p of list) {
    if (p - prev > 1) out.push('...');
    out.push(p);
    prev = p;
  }
  return out;
}

/* ---------- Team Dir ---------- */

function renderTeamDir() {
  const wrap = $('team-tags');
  wrap.innerHTML = '';
  teams.forEach(t => {
    const tag = document.createElement('span');
    tag.className = 'team-tag';
    tag.innerHTML = `<span>${escapeHtml(t)}</span>`;
    const x = document.createElement('button');
    x.className = 'tag-x';
    x.textContent = '✕';
    x.title = '删除该 Biz Team';
    x.addEventListener('click', () => confirmRemoveTeam(t));
    tag.appendChild(x);
    wrap.appendChild(tag);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'tag-new';
  addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg><span>New Directory</span>`;
  addBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.id = 'team-new-input';
    input.placeholder = 'Team name, Enter to add';
    addBtn.replaceWith(input);
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') renderTeamDir();
    });
    input.addEventListener('blur', commit);
    let done = false;
    function commit() {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (!name) { renderTeamDir(); return; }
      if (teams.some(t => t.toLowerCase() === name.toLowerCase())) {
        toast(`Biz Team「${name}」已存在`, 'error');
        renderTeamDir();
        return;
      }
      teams.push(name);
      toast(`Biz Team「${name}」已添加`);
      renderTeamDir();
      render();
    }
  });
  wrap.appendChild(addBtn);
}

function confirmRemoveTeam(team) {
  const count = assignments.filter(a => a.team === team).length;
  openConfirm(
    count > 0
      ? `删除 Biz Team「${team}」将同时移除该 Team 下 ${count} 条用户角色配置，确认删除？`
      : `确认删除 Biz Team「${team}」？`,
    () => {
      teams = teams.filter(t => t !== team);
      assignments = assignments.filter(a => a.team !== team);
      toast(`Biz Team「${team}」已删除`);
      renderTeamDir();
      render();
    },
  );
}

/* ---------- Add / Edit User ---------- */

function fillTeamSelect(sel, current) {
  sel.innerHTML = '<option value="">请选择Biz Team</option>' +
    teams.map(t => `<option ${t === current ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function openUserModal(mode, email, team) {
  state.editing = mode === 'edit' ? { email, team } : null;
  $('user-modal-title').textContent = mode === 'edit' ? 'Edit User' : 'Add User';
  $('m-email').value = mode === 'edit' ? email : '';
  $('m-email').disabled = mode === 'edit';
  fillTeamSelect($('m-team'), mode === 'edit' ? team : '');
  $('m-role').value = mode === 'edit'
    ? assignments.find(a => a.email === email && a.team === team)?.role || ''
    : '';
  ['email', 'team', 'role'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('user-modal').classList.remove('hidden');
  if (mode === 'add') $('m-email').focus();
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitUserModal() {
  const mode = state.editing ? 'edit' : 'add';
  const email = $('m-email').value.trim().toLowerCase();
  const team = $('m-team').value;
  const role = $('m-role').value;
  let ok = true;

  if (!email) { setErr('email', 'Email 为必填项'); ok = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('email', 'Email 格式不正确'); ok = false; }
  else setErr('email', '');

  if (!team) { setErr('team', 'Biz Team 为必填项'); ok = false; } else setErr('team', '');
  if (!role) { setErr('role', 'Role 为必填项'); ok = false; } else setErr('role', '');
  if (!ok) return;

  // 一个用户在一个 Team 下同一时间只能有一个角色
  const dup = assignments.find(a =>
    a.email === email && a.team === team &&
    !(state.editing && a.email === state.editing.email && a.team === state.editing.team));
  if (dup) {
    setErr('team', `该用户在「${team}」下已有 ${dup.role} 角色，请直接 Edit 修改`);
    return;
  }

  if (state.editing) {
    const rec = assignments.find(a => a.email === state.editing.email && a.team === state.editing.team);
    rec.email = email; rec.team = team; rec.role = role; rec.updated = nowStr();
    toast('User role updated');
  } else {
    assignments.push({ email, team, role, updated: nowStr() });
    toast('User added');
  }
  $('user-modal').classList.add('hidden');
  render();
}

function confirmDelete(email, team) {
  openConfirm(`确认删除 ${email} 在「${team}」下的角色配置？`, () => {
    assignments = assignments.filter(a => !(a.email === email && a.team === team));
    toast('Role assignment deleted');
    render();
  });
}

/* ---------- 通用确认弹窗 ---------- */

function openConfirm(text, fn) {
  $('confirm-text').textContent = text;
  state.confirmFn = fn;
  $('confirm-modal').classList.remove('hidden');
}

/* ---------- 事件绑定 ---------- */

function bindEvents() {
  $('btn-query').addEventListener('click', () => {
    state.filters = { email: $('f-email').value, team: $('f-team').value, role: $('f-role').value };
    state.page = 1;
    render();
  });
  $('btn-reset').addEventListener('click', () => {
    $('f-email').value = '';
    $('f-team').value = '';
    $('f-role').value = '';
    state.filters = { email: '', team: '', role: '' };
    state.page = 1;
    render();
  });
  $('f-team').addEventListener('change', () => { state.filters.team = $('f-team').value; state.page = 1; render(); });
  $('f-role').addEventListener('click', () => {});
  $('btn-add').addEventListener('click', () => openUserModal('add'));
  $('btn-user-cancel').addEventListener('click', () => $('user-modal').classList.add('hidden'));
  $('btn-user-modal-close').addEventListener('click', () => $('user-modal').classList.add('hidden'));
  $('btn-user-ok').addEventListener('click', submitUserModal);
  $('m-email').addEventListener('keydown', e => { if (e.key === 'Enter') submitUserModal(); });

  $('btn-team-dir').addEventListener('click', () => {
    const panel = $('team-dir-panel');
    if (panel.classList.contains('hidden')) { renderTeamDir(); panel.classList.remove('hidden'); }
    else panel.classList.add('hidden');
  });
  $('btn-team-close').addEventListener('click', () => $('team-dir-panel').classList.add('hidden'));

  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('列表按 Email + Biz Team 聚合展示；一个用户在一个 Team 下同一时间只有一个角色（VIEWER / EDITOR / ADMIN）'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));

  $('page-size').addEventListener('change', () => {
    state.pageSize = Number($('page-size').value);
    state.page = 1;
    render();
  });

  $('btn-confirm-cancel').addEventListener('click', () => $('confirm-modal').classList.add('hidden'));
  $('btn-confirm-ok').addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (state.confirmFn) { state.confirmFn(); state.confirmFn = null; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('user-modal').classList.add('hidden');
      $('confirm-modal').classList.add('hidden');
      $('team-dir-panel').classList.add('hidden');
    }
  });
}

/* ---------- 初始化 ---------- */

if (!CURRENT_USER.superadmin) $('btn-team-dir').style.display = 'none';
bindEvents();
render();
