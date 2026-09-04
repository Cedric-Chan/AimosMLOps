/* Aimos — Feature Tag 原型
 *
 * 领域规则：
 * - Tag 为二级结构：Category（一级，如 Biz Term / Remark / format）→ Feature Tag（二级）
 * - Category 目录由 Category Dir 浮窗管理（交互同 User 模块 Team Dir）；
 *   删除 Category 级联移除其下所有 Tag
 * - Tag 注册在一级 Category 下，(Category, Tag) 唯一；Description 选填
 * - 注册表通过 localStorage（aimos.ft.tags / aimos.ft.categories）与 Feature Map
 *   共享：FM 打 tag 和 Tag 检索组件读取本模块注册的 Tag
 * - 真实平台 Category Dir 里的「[New]undefined-xxxx」是自动命名缺陷，本原型不复刻
 * 数据存 localStorage（同源共享），首次访问自动播种。
 */

const LS_CATEGORIES = 'aimos.ft.categories';
const LS_TAGS = 'aimos.ft.tags';

const SEED_CATEGORIES = ['Biz Term', 'Remark', 'format', 'Calculate', 'fa'];

const SEED_TAGS = [
  { category: 'Biz Term', tag: 'gps',         desc: '地理位置相关特征' },
  { category: 'Biz Term', tag: 'addr',        desc: '地址相关特征' },
  { category: 'Biz Term', tag: 'device',      desc: '设备相关特征' },
  { category: 'Biz Term', tag: 'login',       desc: '登录相关特征' },
  { category: 'Biz Term', tag: 'dpd',         desc: 'dpd相关特征' },
  { category: 'Biz Term', tag: 'external',    desc: '记录的外数特征' },
  { category: 'Biz Term', tag: 'transaction', desc: '交易相关特征' },
  { category: 'Biz Term', tag: 'network',     desc: '关系网络特征' },
  { category: 'Remark',   tag: 'namelist',    desc: '黑白名单类特征' },
  { category: 'Remark',   tag: 'test',        desc: '测试用的临时特征' },
  { category: 'Remark',   tag: 'core',        desc: '核心重要特征' },
  { category: 'Remark',   tag: 'experimental', desc: '实验性特征' },
  { category: 'format',   tag: 'MD5',         desc: 'MD5加密处理' },
  { category: 'format',   tag: 'encoded',     desc: '编码处理特征' },
  { category: 'format',   tag: 'normalized',  desc: '归一化处理特征' },
  { category: 'Calculate', tag: 'ratio',      desc: '比率类计算特征' },
  { category: 'Calculate', tag: 'count',      desc: '计数类统计特征' },
  { category: 'Calculate', tag: 'trend',      desc: '趋势类统计特征' },
];

function loadRegistry() {
  try {
    let categories = JSON.parse(localStorage.getItem(LS_CATEGORIES) || 'null');
    let tags = JSON.parse(localStorage.getItem(LS_TAGS) || 'null');
    if (!Array.isArray(categories)) categories = [...SEED_CATEGORIES];
    if (!Array.isArray(tags)) tags = SEED_TAGS.map(t => ({ ...t }));
    localStorage.setItem(LS_CATEGORIES, JSON.stringify(categories));
    localStorage.setItem(LS_TAGS, JSON.stringify(tags));
    return { categories, tags };
  } catch (e) {
    return { categories: [...SEED_CATEGORIES], tags: SEED_TAGS.map(t => ({ ...t })) };
  }
}

let { categories, tags } = loadRegistry();

function saveRegistry() {
  localStorage.setItem(LS_CATEGORIES, JSON.stringify(categories));
  localStorage.setItem(LS_TAGS, JSON.stringify(tags));
}

const state = {
  filters: { category: '', tag: '' },
  page: 1,
  pageSize: 10,
  editing: null,   // 编辑中的原 (category, tag)
  confirmFn: null,
};

/* ---------- 工具 ---------- */

const $ = (id) => document.getElementById(id);

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

function filteredTags() {
  const { category, tag } = state.filters;
  return tags
    .filter(t => !category || t.category.toLowerCase().includes(category.trim().toLowerCase()))
    .filter(t => !tag || t.tag.toLowerCase().includes(tag.trim().toLowerCase()))
    .sort((a, b) =>
      a.category.localeCompare(b.category, undefined, { sensitivity: 'base' }) ||
      a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }));
}

/* ---------- 渲染 ---------- */

function render() {
  renderTable();
  renderPagination();
}

function renderTable() {
  const list = filteredTags();
  const start = (state.page - 1) * state.pageSize;
  const pageList = list.slice(start, start + state.pageSize);
  const tbody = $('table-body');

  // 按 Category 聚合渲染：同 Category 连续行合并首列（rowspan）
  let html = '';
  let i = 0;
  while (i < pageList.length) {
    const category = pageList[i].category;
    let span = 0;
    while (i + span < pageList.length && pageList[i + span].category === category) span++;
    for (let k = 0; k < span; k++) {
      const t = pageList[i + k];
      html += '<tr>';
      if (k === 0) html += `<td class="group-category" rowspan="${span}">${escapeHtml(category)}</td>`;
      html += `<td class="mono">${escapeHtml(t.tag)}</td>`;
      html += `<td>${escapeHtml(t.desc)}</td>`;
      html += `<td>
        <button class="link-btn edit" data-category="${escapeHtml(t.category)}" data-tag="${escapeHtml(t.tag)}">Edit</button>
        <button class="link-btn delete" data-category="${escapeHtml(t.category)}" data-tag="${escapeHtml(t.tag)}">Delete</button>
      </td>`;
      html += '</tr>';
    }
    i += span;
  }
  if (!html) html = '<tr class="empty-row"><td colspan="4">No data</td></tr>';
  tbody.innerHTML = html;

  tbody.querySelectorAll('.link-btn.edit').forEach(b =>
    b.addEventListener('click', () => openTagModal('edit', b.dataset.category, b.dataset.tag)));
  tbody.querySelectorAll('.link-btn.delete').forEach(b =>
    b.addEventListener('click', () => {
      openConfirm(`确认删除 Feature Tag「${b.dataset.tag}」（${b.dataset.category}）？已打该标签的特征将失去此标签。`, () => {
        tags = tags.filter(t => !(t.category === b.dataset.category && t.tag === b.dataset.tag));
        saveRegistry();
        toast('Feature Tag deleted');
        render();
      });
    }));

  const end = Math.min(start + pageList.length, list.length);
  $('page-total').textContent = `${list.length === 0 ? 0 : start + 1}-${end} of ${list.length} items`;
}

function renderPagination() {
  const list = filteredTags();
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

/* ---------- Category Dir ---------- */

function renderCategoryDir() {
  const wrap = $('category-tags');
  wrap.innerHTML = '';
  [...categories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).forEach(c => {
    const tag = document.createElement('span');
    tag.className = 'team-tag';
    tag.innerHTML = `<span>${escapeHtml(c)}</span>`;
    const x = document.createElement('button');
    x.className = 'tag-x';
    x.textContent = '✕';
    x.title = '删除该 Category';
    x.addEventListener('click', () => confirmRemoveCategory(c));
    tag.appendChild(x);
    wrap.appendChild(tag);
  });
  const addBtn = document.createElement('button');
  addBtn.className = 'tag-new';
  addBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg><span>New Directory</span>`;
  addBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.className = 'team-new-input';
    input.placeholder = 'Category name, Enter to add';
    addBtn.replaceWith(input);
    input.focus();
    let done = false;
    function commit() {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (!name) { renderCategoryDir(); return; }
      if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
        toast(`Category「${name}」已存在`, 'error');
        renderCategoryDir();
        return;
      }
      categories.push(name);
      saveRegistry();
      toast(`Category「${name}」已添加`);
      renderCategoryDir();
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commit();
      if (e.key === 'Escape') renderCategoryDir();
    });
    input.addEventListener('blur', commit);
  });
  wrap.appendChild(addBtn);
}

function confirmRemoveCategory(category) {
  const count = tags.filter(t => t.category === category).length;
  openConfirm(
    count > 0
      ? `删除 Category「${category}」将同时移除其下 ${count} 个 Feature Tag，确认删除？`
      : `确认删除 Category「${category}」？`,
    () => {
      categories = categories.filter(c => c !== category);
      tags = tags.filter(t => t.category !== category);
      saveRegistry();
      toast(`Category「${category}」已删除`);
      renderCategoryDir();
      render();
    },
  );
}

/* ---------- Add / Edit Feature Tag ---------- */

function fillCategorySelect(current) {
  $('m-category').innerHTML = '<option value="">Please select Category</option>' +
    [...categories].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(c => `<option ${c === current ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function openTagModal(mode, category, tag) {
  state.editing = mode === 'edit' ? { category, tag } : null;
  $('tag-modal-title').textContent = mode === 'edit' ? 'Edit Feature Tag' : 'Add Feature Tag';
  fillCategorySelect(mode === 'edit' ? category : '');
  $('m-tag').value = mode === 'edit' ? tag : '';
  $('m-desc').value = mode === 'edit' ? (tags.find(t => t.category === category && t.tag === tag)?.desc || '') : '';
  ['category', 'tag'].forEach(k => $('err-' + k).classList.add('hidden'));
  $('tag-modal').classList.remove('hidden');
  if (mode === 'add') $('m-category').focus();
}

function setErr(key, msg) {
  const el = $('err-' + key);
  if (msg) { el.textContent = msg; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function submitTagModal() {
  const category = $('m-category').value;
  const tag = $('m-tag').value.trim();
  const desc = $('m-desc').value.trim();
  let ok = true;

  if (!category) { setErr('category', 'Category 为必填项'); ok = false; } else setErr('category', '');

  if (!tag) { setErr('tag', 'Feature Tag 为必填项'); ok = false; }
  else if (tags.some(t =>
    t.category === category && t.tag.toLowerCase() === tag.toLowerCase() &&
    !(state.editing && t.category === state.editing.category && t.tag === state.editing.tag))) {
    setErr('tag', `「${category}」下已存在 Feature Tag「${tag}」`); ok = false;
  } else setErr('tag', '');

  if (!ok) return;

  if (state.editing) {
    const rec = tags.find(t => t.category === state.editing.category && t.tag === state.editing.tag);
    rec.category = category; rec.tag = tag; rec.desc = desc;
    toast('Feature Tag updated');
  } else {
    tags.push({ category, tag, desc });
    toast('Feature Tag added');
  }
  saveRegistry();
  $('tag-modal').classList.add('hidden');
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
  $('btn-query').addEventListener('click', () => {
    state.filters = { category: $('f-category').value, tag: $('f-tag').value };
    state.page = 1;
    render();
  });
  $('btn-reset').addEventListener('click', () => {
    $('f-category').value = '';
    $('f-tag').value = '';
    state.filters = { category: '', tag: '' };
    state.page = 1;
    render();
  });

  $('btn-add').addEventListener('click', () => openTagModal('add'));
  $('btn-tag-cancel').addEventListener('click', () => $('tag-modal').classList.add('hidden'));
  $('btn-tag-modal-close').addEventListener('click', () => $('tag-modal').classList.add('hidden'));
  $('btn-tag-ok').addEventListener('click', submitTagModal);
  $('m-tag').addEventListener('keydown', e => { if (e.key === 'Enter') submitTagModal(); });

  $('btn-category-dir').addEventListener('click', () => {
    const panel = $('category-dir-panel');
    if (panel.classList.contains('hidden')) { renderCategoryDir(); panel.classList.remove('hidden'); }
    else panel.classList.add('hidden');
  });
  $('btn-category-close').addEventListener('click', () => $('category-dir-panel').classList.add('hidden'));

  document.querySelectorAll('.input-clear').forEach(btn =>
    btn.addEventListener('click', () => { $(btn.dataset.for).value = ''; $(btn.dataset.for).focus(); }));

  $('btn-refresh').addEventListener('click', () => { render(); toast('Refreshed'); });
  $('btn-info').addEventListener('click', () =>
    toast('二级结构：Category（一级）→ Feature Tag（二级）。注册的 Tag 会出现在 Feature Map 的打标签与 Tag 检索组件中'));
  $('btn-settings').addEventListener('click', () => toast('列设置：预留', 'error'));

  $('page-size').addEventListener('change', () => { state.pageSize = Number($('page-size').value); state.page = 1; render(); });

  $('btn-confirm-cancel').addEventListener('click', () => $('confirm-modal').classList.add('hidden'));
  $('btn-confirm-ok').addEventListener('click', () => {
    $('confirm-modal').classList.add('hidden');
    if (state.confirmFn) { state.confirmFn(); state.confirmFn = null; }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('tag-modal').classList.add('hidden');
      $('confirm-modal').classList.add('hidden');
      $('category-dir-panel').classList.add('hidden');
    }
  });
}

bindEvents();
render();
