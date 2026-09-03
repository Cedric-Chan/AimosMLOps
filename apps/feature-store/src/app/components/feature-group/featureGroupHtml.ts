/* ─────────────────────────────────────────────────────────────────────────────
   Static HTML export for Feature Group List page.
   All embedded JavaScript intentionally uses string-concatenation (no backticks)
   to avoid TypeScript template-literal escaping issues.
───────────────────────────────────────────────────────────────────────────── */

export const FEATURE_GROUP_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feature Group List</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; margin: 0; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .fg-card { border: 1px solid #e5e7eb; box-shadow: 0 1px 4px 0 rgba(0,0,0,0.04); transition: border-color .2s, box-shadow .2s; }
    .fg-card:hover { border-color: #13c2c2; box-shadow: 0 4px 24px 0 rgba(19,194,194,0.10), 0 1px 4px 0 rgba(0,0,0,0.04); }
    .fg-card:hover .card-accent  { background-color: #13c2c2 !important; }
    .fg-card:hover .card-name    { color: #13c2c2 !important; }
    .fg-card:hover .card-chevron { opacity: 1 !important; transform: translateX(2px); }
    .card-name-btn:hover .card-name { text-decoration: underline; }
    .dropdown-panel { display: none; position: absolute; right: 0; top: calc(100% + 4px);
      background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
      box-shadow: 0 10px 40px rgba(0,0,0,.12); z-index: 999; overflow: hidden; min-width: 156px; }
    .dropdown-panel.open { display: block; }
    .chevron-icon { transition: transform .2s; display: inline-flex; }
    .chevron-icon.rotated { transform: rotate(180deg); }
    .menu-item { width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 14px;
      font-size: 12px; text-align: left; background: none; border: none; cursor: pointer;
      transition: background .15s, color .15s; }
    .menu-item:disabled { color: #d1d5db !important; cursor: not-allowed; }
    .menu-item:not(:disabled).item-online:hover  { background: #ecfdf5; color: #065f46; }
    .menu-item:not(:disabled).item-disable:hover { background: #fff7ed; color: #c2410c; }
    .menu-item:not(:disabled).item-delete:hover  { background: #fef2f2; color: #dc2626; }
    .menu-item .icon { flex-shrink: 0; display: inline-flex; }
    .menu-item:disabled .icon svg { stroke: #d1d5db !important; }
    .menu-item .na-badge { margin-left: auto; font-size: 10px; color: #d1d5db; }
    .menu-divider { height: 1px; background: #f3f4f6; margin: 4px 0; }
    input[type=text]:focus { outline: none; border-color: #13c2c2; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .page-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid #d1d5db; background: #fff; color: #6b7280; border-radius: 6px;
      cursor: pointer; font-size: 13px; transition: border-color .15s, color .15s; }
    .page-btn:hover { border-color: #13c2c2; color: #13c2c2; }
    .page-btn.active { background: #13c2c2; border-color: #13c2c2; color: #fff; font-weight: 600; }
    .page-nav { padding: 4px 10px; border: 1px solid #d1d5db; background: #fff; border-radius: 6px;
      cursor: pointer; font-size: 14px; color: #6b7280; transition: border-color .15s, color .15s; }
    .page-nav:hover:not([disabled]) { border-color: #13c2c2; color: #13c2c2; }
    .page-nav[disabled] { opacity: 0.4; cursor: not-allowed; }
    .hidden { display: none !important; }
  </style>
</head>
<body>

<!-- Toolbar -->
<div style="background:#fff; border-bottom:1px solid #e5e7eb;">
  <div style="padding:10px 24px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:4px;height:20px;border-radius:9999px;background:#13c2c2;flex-shrink:0;"></div>
      <span style="font-weight:600;font-size:16px;color:#1f2937;">Feature Groups</span>
      <span id="count-badge" style="font-size:12px;padding:2px 10px;border-radius:9999px;background:#f3f4f6;color:#6b7280;"></span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <div style="position:relative;">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;display:inline-flex;">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <input id="search-input" type="text" placeholder="Search feature groups..."
          style="padding:6px 12px 6px 32px;font-size:13px;border:1px solid #d1d5db;border-radius:6px;background:#fff;width:210px;transition:border-color .15s;"
          oninput="handleSearch()" />
      </div>
      <div style="width:1px;height:20px;background:#e5e7eb;"></div>
      <button onclick="alert('Add Feature Group')"
        style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:13px;font-weight:500;border-radius:6px;border:none;background:#13c2c2;color:#fff;cursor:pointer;"
        onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Add Feature Group
      </button>
      <button onclick="alert('Module Dir')"
        style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:13px;font-weight:500;border-radius:6px;border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;"
        onmouseover="this.style.borderColor='#13c2c2';this.style.color='#13c2c2';"
        onmouseout="this.style.borderColor='#d1d5db';this.style.color='#374151';">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>
        Module Dir
      </button>
    </div>
  </div>
</div>

<!-- Card list -->
<div id="card-list" style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;"></div>

<!-- Empty state -->
<div id="empty-state" class="hidden" style="padding:80px 24px;text-align:center;color:#9ca3af;">
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 12px;opacity:.3;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  <p style="font-size:14px;">No feature groups found</p>
</div>

<!-- Pagination -->
<div id="pagination-wrap" style="padding:0 24px 32px;display:flex;align-items:center;justify-content:space-between;">
  <span id="page-info" style="font-size:13px;color:#6b7280;"></span>
  <div id="page-buttons" style="display:flex;align-items:center;gap:4px;"></div>
</div>

<script>
// ── Data ─────────────────────────────────────────────────────────────────────
var MOCK_DATA = [
  { id:"1", name:"user_risk_score_fg",       region:"TH",        module:"Credit Buyer Behavior", owner:"cedric.chencan@seamoney.com",  updateTime:"2026-02-16 08:30:00", description:"User risk scoring feature group for Thailand market, aggregates behavioral signals and transaction patterns." },
  { id:"2", name:"mx_acard_realtime_fg",     region:"MX",        module:"External Data",         owner:"zhengyi.loh@seamoney.com",     updateTime:"2026-02-15 11:00:00", description:"Real-time feature group for Mexico A-card model, capturing live transaction velocity and account age features." },
  { id:"3", name:"th_embedding_fg_v3",       region:"TH",        module:"External Data",         owner:"sankar.shyamal@seamoney.com",  updateTime:"2026-02-11 16:20:00", description:"Version 3 of Thailand embedding feature group, includes improved user graph embeddings and NLP-derived features." },
  { id:"4", name:"dp_recommend_score_fg",    region:"SHOPEE_SG", module:"Credit Buyer Behavior", owner:"huangwei@shopee.com",          updateTime:"2026-02-16 13:45:00", description:"Feature group for Shopee Singapore recommendation scoring." },
  { id:"5", name:"user_graph_relation_fg",   region:"TH",        module:"Credit Buyer Behavior", owner:"cedric.chencan@seamoney.com",  updateTime:"2026-02-13 09:00:00", description:"User social graph and relation feature group, derives network-based features for fraud detection models." },
  { id:"6", name:"mx_device_fingerprint_fg", region:"MX",        module:"External Data",         owner:"xiaochen.kuang@monee.com",     updateTime:"2026-02-15 20:00:00", description:"Device fingerprint feature group for Mexico, tracks device identity signals and cross-device behavior patterns." }
];

// STATUS_CFG removed — FG is stateless

// ── SVG icons ─────────────────────────────────────────────────────────────────
var ICO_MAP_PIN       = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
var ICO_LAYERS        = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>';
var ICO_USER          = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
var ICO_CLOCK         = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
var ICO_CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
var ICO_CHEVRON_DOWN  = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
var ICO_EDIT2         = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';
var ICO_CHECK_CIRCLE  = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
var ICO_BAN           = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>';
var ICO_TRASH2        = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';
var ICO_ALERT         = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fa8c16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

// ── Builders (string concatenation, no template literals) ─────────────────────
// statusTag removed — FG is stateless

function metaItem(icon, label, value) {
  return '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'
    + '<span style="color:#9ca3af;display:inline-flex;flex-shrink:0;">' + icon + '</span>'
    + '<span style="font-size:12px;color:#9ca3af;">' + label + ':</span>'
    + '<span style="font-size:12px;font-weight:600;padding:2px 8px;border-radius:6px;'
    + 'background:rgba(19,194,194,0.08);color:#0e9494;border:1px solid rgba(19,194,194,0.18);white-space:nowrap;">'
    + value + '</span></div>';
}

function menuItemHtml(id, action, icon, label, enabled) {
  var dis       = enabled ? '' : 'disabled';
  var na        = enabled ? '' : '<span class="na-badge">N/A</span>';
  var iconColor = enabled ? (action === 'online' ? '#10b981' : action === 'disable' ? '#fb923c' : '#ef4444') : '#d1d5db';
  var txtColor  = enabled ? (action === 'delete' ? '#dc2626' : '#374151') : '#d1d5db';
  return '<button class="menu-item item-' + action + (action === 'delete' ? ' danger' : '') + '" '
    + dis + ' data-id="' + id + '" data-action="' + action + '" style="color:' + txtColor + ';">'
    + '<span class="icon" style="color:' + iconColor + ';">' + icon + '</span>'
    + label + na + '</button>';
}

function buildDropdown(fg) {
  var canDelete  = true;
  return '<div class="dropdown-panel" id="ddpanel-' + fg.id + '">'
    + '<div id="menu-normal-' + fg.id + '" style="padding:4px 0;">'
    + menuItemHtml(fg.id, 'delete',  ICO_TRASH2,       'Delete',  canDelete)
    + '</div>'
    + '<div id="menu-confirm-' + fg.id + '" style="display:none;padding:16px;width:220px;">'
    +   '<div style="display:flex;gap:10px;margin-bottom:14px;">'
    +     '<span style="flex-shrink:0;margin-top:2px;">' + ICO_ALERT + '</span>'
    +     '<p style="font-size:12px;color:#374151;line-height:1.6;margin:0;">'
    +       '确认要将该 Feature Group 设为 <strong>Disable</strong> 吗？此操作不可立即撤销。'
    +     '</p></div>'
    +   '<div style="display:flex;justify-content:flex-end;gap:8px;">'
    +     '<button id="confirm-cancel-' + fg.id + '" '
    +       'style="padding:4px 12px;font-size:12px;border-radius:5px;border:1px solid #d1d5db;background:#fff;color:#4b5563;cursor:pointer;" '
    +       'onmouseover="this.style.background=\'#f9fafb\'" onmouseout="this.style.background=\'#fff\'">取消</button>'
    +     '<button id="confirm-ok-' + fg.id + '" data-id="' + fg.id + '" '
    +       'style="padding:4px 12px;font-size:12px;border-radius:5px;border:none;background:#fa8c16;color:#fff;cursor:pointer;font-weight:500;" '
    +       'onmouseover="this.style.opacity=\'.88\'" onmouseout="this.style.opacity=\'1\'">确认 Disable</button>'
    +   '</div>'
    + '</div></div>';
}

function buildCard(fg) {
  return '<div class="fg-card" id="card-' + fg.id + '" style="background:#fff;border-radius:12px;overflow:hidden;">'
    + '<div style="display:flex;">'
    +   '<div class="card-accent" style="width:6px;flex-shrink:0;border-radius:12px 0 0 12px;background:#e0f7f7;transition:background .2s;"></div>'
    +   '<div style="flex:1;padding:20px 24px;">'
    +     '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">'
    +       '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0;">'
    +         '<button class="card-name-btn" style="background:none;border:none;padding:0;cursor:pointer;display:flex;align-items:center;gap:6px;" '
    +           'onclick="alert(\'Navigate to: ' + fg.name + '\')">'
    +           '<span class="card-name mono" style="font-size:17px;font-weight:700;color:#1a1a2e;letter-spacing:-0.01em;transition:color .2s;">'
    +             fg.name
    +           '</span>'
    +           '<span class="card-chevron" style="color:#13c2c2;opacity:0;transition:opacity .2s,transform .2s;display:inline-flex;">'
    +             ICO_CHEVRON_RIGHT
    +           '</span>'
    +         '</button>'
    +       '</div>'
    +       '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">'
    +         '<button onclick="alert(\'Edit: ' + fg.name + '\')" '
    +           'style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:500;border-radius:8px;border:1px solid #e5e7eb;background:#fff;color:#4b5563;cursor:pointer;" '
    +           'onmouseover="this.style.borderColor=\'#5eead4\';this.style.color=\'#0d9488\';this.style.background=\'#f0fdfa\';" '
    +           'onmouseout="this.style.borderColor=\'#e5e7eb\';this.style.color=\'#4b5563\';this.style.background=\'#fff\';">'
    +           ICO_EDIT2 + ' Edit'
    +         '</button>'
    +         '<div style="position:relative;" id="ddwrap-' + fg.id + '">'
    +           '<button style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;font-size:12px;font-weight:500;border-radius:8px;border:none;background:#13c2c2;color:#fff;cursor:pointer;" '
    +             'onmouseover="this.style.opacity=\'.88\'" onmouseout="this.style.opacity=\'1\'" '
    +             'onclick="toggleDropdown(\'' + fg.id + '\',event)">'
    +             'Manage'
    +             '<span id="chevron-' + fg.id + '" class="chevron-icon">' + ICO_CHEVRON_DOWN + '</span>'
    +           '</button>'
    +           buildDropdown(fg)
    +         '</div>'
    +       '</div>'
    +     '</div>'
    +     '<p class="line-clamp-2" style="margin:10px 0 0;font-size:14px;color:#6b7280;line-height:1.6;">' + fg.description + '</p>'
    +     '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f3f4f6;">'
    +       '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:16px 24px;">'
    +         metaItem(ICO_MAP_PIN, 'Region',  fg.region)
    +         metaItem(ICO_LAYERS,  'Module',  fg.module)
    +         metaItem(ICO_USER,    'Owner',   fg.owner)
    +         metaItem(ICO_CLOCK,   'Updated', fg.updateTime)
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

// ── State & render ────────────────────────────────────────────────────────────
var searchQuery = '', currentPage = 1;
var PAGE_SIZE = 20;

function getFiltered() {
  var q = searchQuery.toLowerCase();
  return MOCK_DATA.filter(function(fg) {
    return fg.name.toLowerCase().indexOf(q) !== -1
        || fg.owner.toLowerCase().indexOf(q) !== -1
        || fg.region.toLowerCase().indexOf(q) !== -1;
  });
}

function render() {
  var filtered   = getFiltered();
  var total      = filtered.length;
  var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  var start = (currentPage - 1) * PAGE_SIZE;
  var paged = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('count-badge').textContent = total + ' items';

  var list  = document.getElementById('card-list');
  var empty = document.getElementById('empty-state');

  if (paged.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    list.innerHTML = paged.map(function(fg) { return buildCard(fg); }).join('');
    attachListeners();
  }

  var wrap = document.getElementById('pagination-wrap');
  if (total === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';

  var from = start + 1, to = Math.min(start + PAGE_SIZE, total);
  document.getElementById('page-info').textContent = from + '\u2013' + to + ' of ' + total + ' items';

  var btnHtml = '<button class="page-nav"' + (currentPage === 1 ? ' disabled' : '')
    + ' onclick="goPage(' + (currentPage - 1) + ')">\u00ab</button>';
  for (var p = 1; p <= totalPages; p++) {
    btnHtml += '<button class="page-btn' + (p === currentPage ? ' active' : '') + '" onclick="goPage(' + p + ')">' + p + '</button>';
  }
  btnHtml += '<button class="page-nav"' + (currentPage === totalPages ? ' disabled' : '')
    + ' onclick="goPage(' + (currentPage + 1) + ')">\u00bb</button>';
  document.getElementById('page-buttons').innerHTML = btnHtml;
}

function goPage(p) { currentPage = p; render(); }
function handleSearch() { searchQuery = document.getElementById('search-input').value; currentPage = 1; render(); }

// ── Dropdown ─────────────────────────────────────────────────────────────────
var openId = null;

function toggleDropdown(id, e) {
  e.stopPropagation();
  var panel   = document.getElementById('ddpanel-' + id);
  var chevron = document.getElementById('chevron-' + id);
  if (openId && openId !== id) closeDropdown(openId);
  if (panel.classList.contains('open')) {
    closeDropdown(id);
  } else {
    openId = id;
    panel.classList.add('open');
    if (chevron) chevron.classList.add('rotated');
    showNormal(id);
  }
}
function closeDropdown(id) {
  var p = document.getElementById('ddpanel-'  + id);
  var c = document.getElementById('chevron-' + id);
  if (p) { p.classList.remove('open'); showNormal(id); }
  if (c) c.classList.remove('rotated');
  if (openId === id) openId = null;
}
function showNormal(id) {
  var n = document.getElementById('menu-normal-'  + id);
  var m = document.getElementById('menu-confirm-' + id);
  if (n) n.style.display = 'block';
  if (m) m.style.display = 'none';
}
function showConfirm(id) {
  var n = document.getElementById('menu-normal-'  + id);
  var m = document.getElementById('menu-confirm-' + id);
  if (n) n.style.display = 'none';
  if (m) m.style.display = 'block';
}

document.addEventListener('mousedown', function(e) {
  if (!openId) return;
  var w = document.getElementById('ddwrap-' + openId);
  if (w && !w.contains(e.target)) closeDropdown(openId);
});

function attachListeners() {
  document.querySelectorAll('.menu-item:not([disabled])').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var id = this.dataset.id, action = this.dataset.action;
      if (action === 'disable') { showConfirm(id); return; }
      var name = (MOCK_DATA.find(function(f){ return f.id === id; }) || {}).name || id;
      alert('Action: ' + action.toUpperCase() + '\nFeature Group: ' + name);
      closeDropdown(id);
    });
  });
  document.querySelectorAll('[id^="confirm-cancel-"]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      showNormal(this.id.replace('confirm-cancel-', ''));
    });
  });
  document.querySelectorAll('[id^="confirm-ok-"]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var id   = this.dataset.id;
      var name = (MOCK_DATA.find(function(f){ return f.id === id; }) || {}).name || id;
      alert('DISABLE confirmed\n' + name);
      closeDropdown(id);
    });
  });
}

// Init
render();
<\/script>
</body>
</html>`;
