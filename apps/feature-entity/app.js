/* Aimos — Feature Entity 原型
 *
 * 领域规则：
 * - 实体 = 唯一实体说明（避免混用和歧义），Entity 名全局唯一
 * - 当前线上用途：FG 注册、Orches Service 链路 Start 节点的 auto complete
 * - 未来定位：特征实体的统一治理入口（特征 = 描述实体的客观度量；
 *   多实体特征描述实体间关系，见 docs/feature-entity/spec.md）
 * 数据为前端 mock，刷新后重置。
 */

const seedEntities = [
  { entity: 'device_fingerprint', desc: 'device_fingerprint', updated: '2026-08-18T03:08:26.000Z' },
  { entity: 'task_id',            desc: 'task id',                             updated: '2026-03-04T10:43:43.000Z' },
  { entity: 'app_id',             desc: 'risk app id',                         updated: '2026-03-04T10:41:41.000Z' },
  { entity: 'scene_id',           desc: 'Risk Scene id',                       updated: '2026-03-04T10:41:29.000Z' },
  { entity: 'tin_no',             desc: 'tax identifier number',               updated: '2025-05-29T09:07:27.000Z' },
  { entity: 'id_card_no',         desc: 'id_card_no',                          updated: '2025-05-29T06:51:23.000Z' },
  { entity: 'gpshex6',            desc: 'gpshex6',                             updated: '2024-10-15T08:51:19.000Z' },
  { entity: 'imei',               desc: 'imei_sub',                            updated: '2024-10-15T08:47:20.000Z' },
  { entity: 'szdf',               desc: 'szdf',                                updated: '2024-10-15T08:31:04.000Z' },
  { entity: 'linkage_type',       desc: 'linkage_type for antifraud graph features', updated: '2024-10-15T08:09:54.000Z' },
  { entity: 'user_id',            desc: 'platform user id',                    updated: '2024-09-20T07:22:00.000Z' },
  { entity: 'phone_number',       desc: 'hashed phone number',                 updated: '2024-09-20T07:20:11.000Z' },
  { entity: 'bank_card_no',       desc: 'masked bank card number',             updated: '2024-08-11T12:05:40.000Z' },
  { entity: 'merchant_id',        desc: 'payment merchant id',                 updated: '2024-08-11T12:01:33.000Z' },
  { entity: 'order_id',           desc: 'transaction order id',                updated: '2024-07-02T16:44:05.000Z' },
  { entity: 'ip_address',         desc: 'login ip address',                    updated: '2024-07-02T16:40:18.000Z' },
  { entity: 'email_address',      desc: 'user email address',                  updated: '2024-06-14T09:33:52.000Z' },
  { entity: 'imsi',               desc: 'imsi of sim card',                    updated: '2024-06-14T09:30:07.000Z' },
  { entity: 'mac_address',        desc: 'device mac address',                  updated: '2024-05-08T14:18:26.000Z' },
  { entity: 'device_id',          desc: 'unique device id',                    updated: '2024-05-08T14:15:00.000Z' },
];

let entities = seedEntities.map(e => ({ ...e }));

const state = {
  filter: '',
  page: 1,
  pageSize: 10,
  editingEntity: null, // 编辑中的原 entity 名；null = Add
  confirmFn: null,
};

/* ---------- 工具 ---------- */

const $ = (id) => document.getElementById(id);

function nowStr() {
  return new Date().toISOString();
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

function filteredEntities() {
  return entities
    .filter(e => !state.filter || e.entity.toLowerCase().includes(state.filter.trim().toLowerCase()))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

/* ---------- 渲染 ---------- */

function render() {
  renderTable();
  renderPagination();
}

function renderTable() {
  const list = filteredEntities();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  if (pageList.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No data</td></tr>';
    $('page-total').textContent = '0 items';
    return;
  }

  tbody.innerHTML = pageList.map(e => `
    <tr>
      <td class="mono">${escapeHtml(e.entity)}</td>
      <td>${escapeHtml(e.desc)}</td>
      <td class="time">${escapeHtml(e.updated)}</td>
      <td>
        <button class="link-btn edit" data-entity="${escapeHtml(e.entity)}">Edit</button>
        <button class="link-btn delete" data-entity="${escapeHtml(e.entity)}">Delete</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.link-btn.edit').forEach(b =>
    b.addEventListener('click', () => openEntityModal('edit', b.dataset.entity)));
  tbody.querySelectorAll('.link-btn.delete').forEach(b =>
    b.addEventListener('click', () => {
      openConfirm(`确认删除实体「${b.dataset.entity}」？若有 Feature Group / Service 正引用该实体，需先解除引用。`, () => {
        entities = entities.filter(x => x.entity !== b.dataset.entity);
        toast('Entity deleted');
        render();
      });
    }));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredEntities();
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

function openEntityModal(mode, entityName) {
  state.editingEntity = mode === 'edit' ? entityName : null;
  $('entity-modal-title').textContent = mode === 'edit' ? 'Edit Entity' : 'Add Entity';
  const rec = mode === 'edit' ? entities.find(e => e.entity === entityName) : null;
  $('m-entity').value = rec ? rec.entity : '';
  $('m-desc').value = rec ? rec.desc : '';
  ['entity', 'desc'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('entity-modal').classList.remove('hidden');
  if (mode === 'add') $('m-entity').focus();
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitEntityModal() {
  const entity = $('m-entity').value.trim();
  const desc = $('m-desc').value.trim();
  let ok = true;

  if (!entity) { setErr('entity', 'Entity 为必填项'); ok = false; }
  else if (entities.some(e => e.entity.toLowerCase() === entity.toLowerCase() && e.entity !== state.editingEntity)) {
    setErr('entity', `实体「${entity}」已存在。实体是全局唯一标识，禁止混用和歧义`); ok = false;
  } else setErr('entity', '');

  if (!desc) { setErr('desc', 'Description 为必填项'); ok = false; } else setErr('desc', '');
  if (!ok) return;

  if (state.editingEntity) {
    const rec = entities.find(e => e.entity === state.editingEntity);
    rec.entity = entity; rec.desc = desc; rec.updated = nowStr();
    toast('Entity updated');
  } else {
    entities.push({ entity, desc, updated: nowStr() });
    toast('Entity added');
  }
  $('entity-modal').classList.add('hidden');
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
  $('btn-query').addEventListener('click', () => { state.filter = $('f-entity').value; state.page = 1; render(); });
  $('f-entity').addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-query').click(); });
  $('btn-reset').addEventListener('click', () => { $('f-entity').value = ''; state.filter = ''; state.page = 1; render(); });

  $('btn-add').addEventListener('click', () => openEntityModal('add'));
  $('btn-entity-cancel').addEventListener('click', () => $('entity-modal').classList.add('hidden'));
  $('btn-entity-modal-close').addEventListener('click', () => $('entity-modal').classList.add('hidden'));
  $('btn-entity-ok').addEventListener('click', submitEntityModal);
  $('m-entity').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) submitEntityModal(); });

  document.querySelectorAll('.input-clear').forEach(btn =>
    btn.addEventListener('click', () => { $(btn.dataset.for).value = ''; $(btn.dataset.for).focus(); }));

  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('实体是唯一标识（避免混用和歧义）；当前用于 FG 注册与 Orches Service Start 节点自动补全，未来承载特征实体统一治理'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });

  $('btn-confirm-cancel').addEventListener('click', () => $('confirm-modal').classList.add('hidden'));
  $('btn-confirm-ok').addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (state.confirmFn) { state.confirmFn(); state.confirmFn = null; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('entity-modal').classList.add('hidden');
      $('confirm-modal').classList.add('hidden');
    }
  });
}

bindEvents();
render();
