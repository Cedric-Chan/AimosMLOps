/* Aimos — Orches Service 原型
 *
 * 依据 docs/orches-service/spec.md：
 * - 两层实体：FeatureService（服务） └── * ServiceVersion（版本）
 * - 版本状态三值 1 DRAFT / 2 ENABLED / 3 DISABLED；Router 列是独立信号（ENABLED → ONLINE）
 * - DISABLED 版本 Edit 置灰（实测）；第 4 个动作位随状态换文案 Disable / Enable
 * - Add Service 与 Add Version 是同一表单：按入口区分标题，行内进入时服务身份只读（修正实测歧义）
 * - 画布：chartConfig（节点 + 边混排），六种 componentName（规则见 rules.js）
 * - Router / Tracing Log 是服务级路由，画布是版本级路由
 *
 * 数据全部为前端合成占位，刷新即重置。
 */
(function () {
  'use strict';

  var R = window.OrchesRules;

  /* ══════════ 常量与合成数据 ══════════ */

  var CURRENT_USER = 'cedric.chen@example.com';
  var REGIONS = ['ID', 'TH', 'PH', 'VN', 'MY', 'SG', 'TW', 'BR', 'MX', 'SHOPEE_SG'];
  var BIZ_TEAMS = ['RiskStrategy', 'CreditPolicy', 'PaymentRisk', 'Identity', 'Merchant',
    'GrowthRisk', 'MarketingRisk', 'Collections', 'Seller', 'Lending'];
  var OWNERS = ['cedric.chen@example.com', 'aaron.loh@example.com', 'ying.chen@example.com',
    'zoe.liu@example.com', 'alvin.li@example.com', 'jason.yang@example.com'];

  /* Owner → 可选 Biz Team（Biz Team 依赖 Owner 的实测口径） */
  var OWNER_TEAMS = {
    'cedric.chen@example.com': ['RiskStrategy', 'PaymentRisk'],
    'aaron.loh@example.com': ['CreditPolicy', 'Lending'],
    'ying.chen@example.com': ['Identity', 'Merchant'],
    'zoe.liu@example.com': ['GrowthRisk', 'MarketingRisk'],
    'alvin.li@example.com': ['Seller', 'Collections'],
    'jason.yang@example.com': ['PaymentRisk', 'Collections']
  };
  var ALL_TEAMS = Object.keys(OWNER_TEAMS).reduce(function (acc, k) {
    OWNER_TEAMS[k].forEach(function (t) { if (acc.indexOf(t) < 0) acc.push(t); });
    return acc;
  }, []);

  var DEFAULT_ROUTER = {
    rateLimit: 100, logSample: 0, logEnable: 1,
    dryRunTriggerRate: 0.1, allowPartialExec: false, tracingDetailSwitch: true
  };

  /* 版本：status 用接口整数枚举（1/2/3），展示层经 rules.js 映射 */
  function mkService(id, name, region, team, owners, created, updated, versions, routerConfig) {
    return {
      id: id, name: name, region: region, team: team, owners: owners,
      created: created, updated: updated,
      routerConfig: routerConfig === undefined ? JSON.parse(JSON.stringify(DEFAULT_ROUTER)) : routerConfig,
      versions: versions.map(function (v, i) {
        return {
          id: id + '-v' + (i + 1),
          version: v[0], status: v[1], description: v[2] || '',
          /* router 是版本自身的路由标志，独立于 status：只有实测确认过
           * 「ENABLED 版本出现在流量路由里」这一种对应，其余一律 null。 */
          router: v[1] === 2 ? 'ONLINE' : null,
          updater: v[3] || owners[0],
          created: v[4] || created, updated: v[5] || updated
        };
      })
    };
  }

  var services = [
    mkService('s1', 'id-txn-risk-orchestration', 'ID', 'RiskStrategy',
      ['cedric.chen@example.com', 'aaron.loh@example.com'],
      '2025-06-11 10:24:07', '2026-10-27 16:02:41', [
        ['V1', 3, 'Initial production cut, superseded by V2', 'cedric.chen@example.com', '2025-06-11 10:24:07', '2025-09-02 11:20:16'],
        ['V2', 2, 'Add device velocity branch', 'aaron.loh@example.com', '2025-09-02 11:20:16', '2026-10-27 16:02:41'],
        ['V3', 1, 'Draft: split CallModel into two builds', 'cedric.chen@example.com', '2026-10-27 16:02:41', '2026-10-27 16:02:41']
      ]),
    mkService('s2', 'th-loan-eligibility-flow', 'TH', 'CreditPolicy',
      ['aaron.loh@example.com'],
      '2025-07-19 09:41:55', '2026-10-21 15:33:10', [
        ['V1', 2, '', 'aaron.loh@example.com', '2025-07-19 09:41:55', '2026-10-21 15:33:10'],
        ['V2', 1, 'Draft: tighten income threshold', 'aaron.loh@example.com', '2026-10-21 15:33:10', '2026-10-21 15:33:10']
      ]),
    mkService('s3', 'ph-cashback-ab-guard', 'PH', 'GrowthRisk',
      ['zoe.liu@example.com', 'jason.yang@example.com'],
      '2025-08-03 14:12:30', '2026-09-30 10:08:22', [
        ['V1', 3, 'Rolled back after promo spike', 'zoe.liu@example.com', '2025-08-03 14:12:30', '2025-12-04 18:22:09'],
        ['V2', 2, 'Guard v2 with cap per user', 'jason.yang@example.com', '2025-12-04 18:22:09', '2026-09-30 10:08:22']
      ]),
    mkService('s4', 'vn-kyc-route-selector', 'VN', 'Identity',
      ['ying.chen@example.com'],
      '2025-09-15 11:05:44', '2026-10-12 09:14:03', [
        ['V1', 2, 'Route by document type', 'ying.chen@example.com', '2025-09-15 11:05:44', '2026-10-12 09:14:03']
      ]),
    mkService('s5', 'my-merchant-onboarding-check', 'MY', 'Merchant',
      ['ying.chen@example.com', 'alvin.li@example.com'],
      '2025-10-02 16:48:19', '2026-08-19 13:57:36', [
        ['V1', 1, 'Draft: onboarding pre-check', 'alvin.li@example.com', '2025-10-02 16:48:19', '2026-08-19 13:57:36'],
        ['V2', 3, 'Disabled pending merchant schema change', 'ying.chen@example.com', '2026-08-19 13:57:36', '2026-09-11 10:02:55']
      ]),
    mkService('s6', 'sg-payment-fraud-gate', 'SG', 'PaymentRisk',
      ['cedric.chen@example.com'],
      '2025-11-08 09:02:13', '2026-10-25 19:41:02', [
        ['V1', 3, '', 'cedric.chen@example.com', '2025-11-08 09:02:13', '2026-02-17 12:30:00'],
        ['V2', 2, 'Serve both card and wallet rails', 'cedric.chen@example.com', '2026-02-17 12:30:00', '2026-08-05 08:11:37'],
        ['V3', 1, 'Draft: add wallet velocity guard', 'cedric.chen@example.com', '2026-08-05 08:11:37', '2026-10-25 19:41:02']
      ]),
    mkService('s7', 'tw-promo-abuse-screen', 'TW', 'MarketingRisk',
      ['zoe.liu@example.com'],
      '2025-12-01 10:33:28', '2026-07-14 11:20:45', [
        ['V1', 2, '', 'zoe.liu@example.com', '2025-12-01 10:33:28', '2026-07-14 11:20:45']
      ], null),
    mkService('s8', 'br-credit-limit-recalc', 'BR', 'CreditPolicy',
      ['aaron.loh@example.com', 'jason.yang@example.com'],
      '2026-01-12 15:26:51', '2026-10-28 09:05:12', [
        ['V1', 1, 'Draft: monthly recalculation', 'aaron.loh@example.com', '2026-01-12 15:26:51', '2026-10-28 09:05:12']
      ]),
    mkService('s9', 'mx-collection-priority', 'MX', 'Collections',
      ['jason.yang@example.com'],
      '2026-02-20 08:47:36', '2026-09-18 17:12:59', [
        ['V1', 3, 'Superseded by V2 routing', 'jason.yang@example.com', '2026-02-20 08:47:36', '2026-06-06 14:44:01'],
        ['V2', 2, '', 'jason.yang@example.com', '2026-06-06 14:44:01', '2026-09-18 17:12:59']
      ]),
    mkService('s10', 'sg-seller-verification-orchestration', 'SHOPEE_SG', 'Seller',
      ['alvin.li@example.com'],
      '2026-03-09 13:19:02', '2026-10-08 10:31:14', [
        ['V1', 2, 'Seller KYC gate', 'alvin.li@example.com', '2026-03-09 13:19:02', '2026-10-08 10:31:14'],
        ['V2', 1, 'Draft: add bank account branch', 'alvin.li@example.com', '2026-10-08 10:31:14', '2026-10-08 10:31:14']
      ]),
    mkService('s11', 'id-disbursement-precheck', 'ID', 'Lending',
      ['aaron.loh@example.com'],
      '2026-04-17 11:52:40', '2026-10-02 16:20:33', [
        ['V1', 2, '', 'aaron.loh@example.com', '2026-04-17 11:52:40', '2026-10-02 16:20:33']
      ]),
    mkService('s12', 'th-topup-anomaly-branch', 'TH', 'PaymentRisk',
      ['cedric.chen@example.com', 'zoe.liu@example.com'],
      '2026-05-22 09:37:18', '2026-10-19 12:05:47', [
        ['V1', 3, 'Paused during carrier incident', 'cedric.chen@example.com', '2026-05-22 09:37:18', '2026-07-01 08:00:41'],
        ['V2', 1, 'Draft: anomaly scoring', 'zoe.liu@example.com', '2026-07-01 08:00:41', '2026-10-19 12:05:47']
      ]),
    mkService('s13', 'ph-device-fingerprint-join', 'PH', 'Identity',
      ['ying.chen@example.com'],
      '2026-06-30 14:03:56', '2026-09-25 15:48:12', [
        ['V1', 2, 'Join device fingerprint to profile', 'ying.chen@example.com', '2026-06-30 14:03:56', '2026-09-25 15:48:12']
      ]),
    mkService('s14', 'vn-refund-abuse-rule', 'VN', 'Merchant',
      ['alvin.li@example.com', 'aaron.loh@example.com'],
      '2026-07-14 10:11:29', '2026-10-23 09:29:04', [
        ['V1', 3, '', 'alvin.li@example.com', '2026-07-14 10:11:29', '2026-08-08 11:11:11'],
        ['V2', 2, 'Refund abuse counter', 'aaron.loh@example.com', '2026-08-08 11:11:11', '2026-10-23 09:29:04']
      ])
  ];

  /* Router History（服务级审计面） */
  var routerHistory = {
    s1: [
      { time: '2026-10-27 16:04:12', operator: 'cedric.chen@example.com',
        detail: 'Max QPS 50 → 100；Trigger Rate 5% → 10%' },
      { time: '2026-09-02 11:22:40', operator: 'aaron.loh@example.com',
        detail: 'Enabled Version V1 → V2；Open Tracing Detail false → true' }
    ],
    s6: [
      { time: '2026-10-25 19:44:55', operator: 'cedric.chen@example.com',
        detail: 'Tracing Sampling 0% → 20%；Log Enable Rate 100% → 100%' }
    ]
  };

  /* Permission 初始授权 */
  var permissions = {
    s1: [
      { subject: 'cedric.chen@example.com', type: 'User', role: 'Owner' },
      { subject: 'aaron.loh@example.com', type: 'User', role: 'Editor' },
      { subject: 'risk-strategy-team', type: 'Team', role: 'Viewer' }
    ],
    s6: [
      { subject: 'cedric.chen@example.com', type: 'User', role: 'Owner' },
      { subject: 'payment-risk-team', type: 'Team', role: 'Invoker' }
    ]
  };

  var TEAMS = ['risk-strategy-team', 'payment-risk-team', 'credit-policy-team',
    'identity-team', 'merchant-ops-team'];

  /* ══════════ 画布：合成的示例编排图 ══════════ */

  var NODE_W = 180;
  var NODE_H = 66;

  var pipelineNodes = [
    { id: 'node_start_0001', type: 'Start', name: 'Start', desc: 'Entry · declares output variables', x: 36, y: 320 },
    { id: 'node_udf_read_02', type: 'UDFProcessor', name: 'ReadFile', desc: 'UDF · parse raw request payload', x: 240, y: 320 },
    { id: 'node_if_03', type: 'IfCondition2', name: 'code == 0', desc: 'Two-way condition split', x: 444, y: 320 },
    { id: 'node_model_04', type: 'CallModel', name: 'ScoreModel', desc: 'Call deployed model build', x: 648, y: 110 },
    { id: 'node_udf_out_05', type: 'UDFProcessor', name: 'OutputProcess', desc: 'UDF · shape response', x: 852, y: 110 },
    { id: 'node_udf_fb_06', type: 'UDFProcessor', name: 'FallbackFill', desc: 'UDF · default payload', x: 648, y: 530 },
    { id: 'node_end_07', type: 'End', name: 'End', desc: 'Exit · output mapping', x: 1056, y: 320 }
  ];

  var pipelineEdges = [
    { from: 'node_start_0001', port: 'r', to: 'node_udf_read_02' },
    { from: 'node_udf_read_02', port: 'r', to: 'node_if_03' },
    { from: 'node_if_03', port: 'case1', to: 'node_model_04' },
    { from: 'node_model_04', port: 'r', to: 'node_udf_out_05' },
    { from: 'node_udf_out_05', port: 'r', to: 'node_end_07' },
    { from: 'node_if_03', port: 'case2', to: 'node_udf_fb_06' },
    { from: 'node_udf_fb_06', port: 'r', to: 'node_end_07' }
  ];

  var NODE_OUTPUTS = {
    node_start_0001: { user_id: 'u_88213641', order_id: 'o_20261029_004417', txn_amount: 128.5, country: 'ID', event_time: '2026-10-29 09:41:02' },
    node_udf_read_02: { rowCount: 1, encoding: 'json', parseMs: 41, fields: 5 },
    node_if_03: { code: 0, branch: 'case1' },
    node_model_04: { modelName: 'txn_risk_scorer', modelVersion: 'v2.1', buildVersion: 'v2.1.20261021.1', score: 0.8342 },
    node_udf_out_05: { decision: 'REVIEW', score: 0.8342, reasons: ['device_velocity', 'amount_bucket'] },
    node_udf_fb_06: { skipped: true, note: 'case2 not taken for this run' },
    node_end_07: { decision: 'REVIEW', score: 0.8342, flowNo: 'FL20261029A000183' }
  };

  var NODE_TIMINGS = {
    node_start_0001: 2, node_udf_read_02: 41, node_if_03: 3, node_model_04: 128,
    node_udf_out_05: 22, node_udf_fb_06: 0, node_end_07: 4
  };
  var SLOW_NODES = ['node_model_04'];

  /* ══════════ 状态 ══════════ */

  var state = {
    filters: { name: '', region: '', team: '', owner: '' },
    ownedOnly: false,
    page: 1,
    pageSize: 10,
    expanded: {},          // serviceId → bool
    filtersCollapsed: false,
    // pipeline
    pipe: { serviceId: null, versionId: null, ran: false, runCount: 0, tab: 'RESULT', nodeId: null, dirty: false },
    // router
    router: { serviceId: null, tab: 'manage' },
    // tracing
    trace: { serviceId: null, rows: [], filters: {}, selected: {} },
    // modals
    smMode: 'service', smService: null,
    permService: null, permRows: [],
    batchVersion: null, batchFile: null, batchVerified: false,
    menuService: null,
    snap: { kind: null, tab: 'RESULT', nodeId: null, row: null }
  };

  /* ══════════ 工具 ══════════ */

  function $(id) { return document.getElementById(id); }

  function nowStr() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function toast(msg, type) {
    var el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' error' : '');
    el.textContent = msg;
    $('toast-container').appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* 代码块高亮：只转义 & < >，保留引号（引号在 text 内容里是安全的，
   * 转成 &quot; 会让下面的正则匹配不到） */
  function hlJson(obj) {
    var json = JSON.stringify(obj, null, 2)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json
      .replace(/"([^"]+)":/g, '<span class="k">"$1"</span>:')
      .replace(/: ("(?:[^"\\]|\\.)*")/g, ': <span class="s">$1</span>')
      .replace(/: (-?\d+(?:\.\d+)?)/g, ': <span class="n">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="b">$1</span>');
  }

  function regionChip(r) {
    return '<span class="chip-tag r-' + escapeHtml(String(r).toLowerCase()) + '">' + escapeHtml(r) + '</span>';
  }

  function statusName(version) { return R.statusLabel(version.status); }

  function statusBadge(version) {
    var name = statusName(version);
    return '<span class="badge s-' + name.toLowerCase() + '">' + name + '</span>';
  }

  function getService(id) {
    return services.find(function (s) { return s.id === id; }) || null;
  }

  function getVersion(svc, versionId) {
    if (!svc) return null;
    return svc.versions.find(function (v) { return v.id === versionId; }) || null;
  }

  function enabledVersion(svc) {
    return svc.versions.find(function (v) { return v.status === 2; }) || null;
  }

  function nextVersionName(svc) {
    var max = 0;
    svc.versions.forEach(function (v) {
      var m = /^V(\d+)$/i.exec(v.version);
      if (m) max = Math.max(max, Number(m[1]));
    });
    return 'V' + (max + 1);
  }

  function findVersionOwner(version) { return version ? version.updater : CURRENT_USER; }

  /* ══════════ 路由 ══════════ */

  var PAGES = {
    list: 'page-list', pipeline: 'page-pipeline', router: 'page-router', tracing: 'page-tracing'
  };

  function showPage(view) {
    Object.keys(PAGES).forEach(function (k) { $(PAGES[k]).hidden = true; });
    $(PAGES[view]).hidden = false;
    window.scrollTo(0, 0);
  }

  function navigate(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  function route() {
    var raw = (location.hash || '#/').replace(/^#/, '');
    var parts = raw.split('/').filter(Boolean);

    if (parts[0] !== 'pipeline' && parts[0] !== 'router' && parts[0] !== 'tracing-log') {
      closeSnapshot();
      showPage('list');
      renderList();
      return;
    }

    var svc = getService(parts[1]);
    if (!svc) {
      toast('Service not found', 'error');
      location.hash = '#/';
      return;
    }

    if (parts[0] === 'pipeline') {
      var ver = getVersion(svc, parts[2]) || svc.versions[0];
      openPipeline(svc, ver);
    } else if (parts[0] === 'router') {
      openRouter(svc);
    } else {
      openTracing(svc);
    }
  }

  /* ══════════ 1. 列表页 ══════════ */

  function filteredServices() {
    var f = state.filters;
    return services.filter(function (s) {
      return (!f.name || s.name.toLowerCase().indexOf(f.name.trim().toLowerCase()) >= 0) &&
        (!f.region || s.region === f.region) &&
        (!f.team || s.team === f.team) &&
        (!f.owner || s.owners.indexOf(f.owner) >= 0) &&
        (!state.ownedOnly || s.owners.indexOf(CURRENT_USER) >= 0);
    }).sort(function (a, b) { return b.updated.localeCompare(a.updated); });
  }

  function renderFilterOptions() {
    var map = [['f-region', REGIONS], ['f-team', ALL_TEAMS], ['f-owner', OWNERS]];
    map.forEach(function (pair) {
      var sel = $(pair[0]);
      var cur = sel.value;
      sel.innerHTML = '<option value="">Please select</option>' +
        pair[1].map(function (v) {
          return '<option value="' + escapeHtml(v) + '"' + (v === cur ? ' selected' : '') + '>' + escapeHtml(v) + '</option>';
        }).join('');
    });
  }

  function renderList() {
    renderFilterOptions();
    var list = filteredServices();
    var start = (state.page - 1) * state.pageSize;
    var pageList = list.slice(start, start + state.pageSize);
    var tbody = $('table-body');

    if (!pageList.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No data</td></tr>';
      $('page-total').textContent = '0 items';
      renderPagination(list);
      return;
    }

    tbody.innerHTML = pageList.map(function (svc) {
      var open = !!state.expanded[svc.id];
      var main = '<tr class="svc-row' + (open ? ' expanded' : '') + '" data-sid="' + svc.id + '">' +
        '<td><button class="expand-btn' + (open ? ' open' : '') + '" data-act="expand" data-sid="' + svc.id + '" title="Expand row">' + (open ? '▾' : '▸') + '</button></td>' +
        '<td class="mono">' + escapeHtml(svc.name) + '</td>' +
        '<td>' + regionChip(svc.region) + '</td>' +
        '<td>' + escapeHtml(svc.team) + '</td>' +
        '<td class="multi-owner">' + svc.owners.map(function (o) { return '<div>' + escapeHtml(o) + '</div>'; }).join('') + '</td>' +
        '<td class="time">' + escapeHtml(svc.created) + '</td>' +
        '<td class="time">' + escapeHtml(svc.updated) + '</td>' +
        '<td>' +
          '<button class="link-btn" data-act="add-version" data-sid="' + svc.id + '">Add</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="router" data-sid="' + svc.id + '">Router</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="tracing" data-sid="' + svc.id + '">Tracing</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="permission" data-sid="' + svc.id + '">Permission</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="more" data-sid="' + svc.id + '">More ▾</button>' +
        '</td></tr>';

      return main + (open ? versionRowHTML(svc) : '');
    }).join('');

    var end = Math.min(start + pageList.length, list.length);
    $('page-total').textContent = (start + 1) + '-' + end + ' of ' + list.length + ' items';
    renderPagination(list);
  }

  function versionRowHTML(svc) {
    var rows = svc.versions.map(function (v) {
      var name = statusName(v);
      var editable = R.canEditVersion(name);
      var toggle = R.versionToggleLabel(name);
      return '<tr>' +
        '<td class="mono">' + escapeHtml(v.version) + '</td>' +
        '<td>' + statusBadge(v) + '</td>' +
        '<td>' + (R.routerLabel(v.router) === 'ONLINE'
          ? '<span class="router-online">ONLINE</span>'
          : '<span style="color:#b0b8bc"' +
            (name === 'DISABLED' ? ' title="Router value for a DISABLED version is unverified (spec §1)"' : '') +
            '>-</span>') + '</td>' +
        '<td>' + escapeHtml(v.updater) + '</td>' +
        '<td class="time">' + escapeHtml(v.created) + '</td>' +
        '<td class="time">' + escapeHtml(v.updated) + '</td>' +
        '<td class="desc-cell">' + (v.description ? escapeHtml(v.description) : '-') + '</td>' +
        '<td>' +
          '<button class="link-btn' + (editable ? '' : ' disabled') + '" data-act="edit-version" data-sid="' + svc.id + '" data-vid="' + v.id + '"' +
            (editable ? '' : ' disabled title="Disabled version is read-only. Enable it first."') + '>Edit</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="copy-version" data-sid="' + svc.id + '" data-vid="' + v.id + '">Copy</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="batch-test" data-sid="' + svc.id + '" data-vid="' + v.id + '">Batch Test</button><span class="act-sep">|</span>' +
          '<button class="link-btn' + (name === 'ENABLED' ? ' danger' : '') + '" data-act="toggle-version" data-sid="' + svc.id + '" data-vid="' + v.id + '">' + toggle + '</button>' +
        '</td></tr>';
    }).join('');

    return '<tr class="ver-row"><td colspan="8"><div class="ver-inner">' +
      '<table class="ver-table"><thead><tr>' +
      '<th>Version</th><th>Status</th><th>Router</th><th>Updater</th>' +
      '<th>CreateTime</th><th>Update Time</th><th>Description</th><th>Action</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></td></tr>';
  }

  function renderPagination(list) {
    var totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    var wrap = $('page-buttons');
    wrap.innerHTML = '';
    function mk(label, page, opts) {
      opts = opts || {};
      var b = document.createElement('button');
      b.className = 'page-btn' + (opts.current ? ' current' : '');
      b.textContent = label;
      if (opts.disabled) b.disabled = true;
      else b.addEventListener('click', function () { state.page = page; renderList(); });
      return b;
    }
    wrap.appendChild(mk('<', state.page - 1, { disabled: state.page <= 1 }));
    for (var p = 1; p <= totalPages; p++) wrap.appendChild(mk(String(p), p, { current: p === state.page }));
    wrap.appendChild(mk('>', state.page + 1, { disabled: state.page >= totalPages }));
  }

  /* 行内动作 */

  function toggleVersionStatus(svc, version) {
    var name = statusName(version);
    if (name === 'ENABLED') {
      version.status = 3;
      version.router = null;
      version.updated = nowStr();
      svc.updated = version.updated;
      toast(svc.name + ' ' + version.version + ' disabled');
    } else {
      /* 流量一次只指向一个版本：启用新版本即把旧 ENABLED 降级 */
      svc.versions.forEach(function (v) {
        if (v.status === 2) { v.status = 3; v.router = null; }
      });
      version.status = 2;
      version.router = 'ONLINE';
      version.updated = nowStr();
      svc.updated = version.updated;
      toast(svc.name + ' ' + version.version + ' enabled · Router now points here');
    }
    renderList();
  }

  function copyVersion(svc, version) {
    var nv = {
      id: 'v' + Date.now(),
      version: nextVersionName(svc),
      status: 1,
      router: null,
      description: 'Copy of ' + version.version,
      updater: CURRENT_USER,
      created: nowStr(),
      updated: nowStr()
    };
    svc.versions.push(nv);
    svc.updated = nv.updated;
    state.expanded[svc.id] = true;
    renderList();
    toast('Copied ' + version.version + ' → ' + nv.version + ' (DRAFT)');
  }

  function deleteService(svc) {
    services = services.filter(function (s) { return s.id !== svc.id; });
    renderList();
    toast('Service "' + svc.name + '" deleted with ' + svc.versions.length + ' version(s)');
  }

  /* More 下拉 */

  function openRowMenu(btn, svc) {
    closeRowMenu();
    state.menuService = svc;
    var menu = document.createElement('div');
    menu.className = 'dropdown';
    menu.id = 'row-menu';
    menu.style.position = 'fixed';
    menu.innerHTML =
      '<button class="dropdown-item" data-more="monitor">Monitor</button>' +
      '<button class="dropdown-item" data-more="alert">Alert</button>' +
      '<button class="dropdown-item danger" data-more="delete">Delete</button>';
    document.body.appendChild(menu);
    var rect = btn.getBoundingClientRect();
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
  }

  function closeRowMenu() {
    var m = $('row-menu');
    if (m) m.remove();
    state.menuService = null;
  }

  /* ══════════ 2. 编排画布 ══════════ */

  function openPipeline(svc, version) {
    state.pipe = {
      serviceId: svc.id, versionId: version.id,
      ran: false, runCount: 0, tab: 'RESULT', nodeId: null, dirty: false
    };
    showPage('pipeline');
    renderPipeline();
    closeSnapshot();
  }

  function currentPipe() {
    var svc = getService(state.pipe.serviceId);
    var ver = getVersion(svc, state.pipe.versionId);
    return { svc: svc, ver: ver };
  }

  function renderPipeline() {
    var pair = currentPipe();
    var svc = pair.svc, ver = pair.ver;
    if (!svc || !ver) { location.hash = '#/'; return; }

    $('pipe-title').innerHTML = escapeHtml(svc.name) +
      ' <span class="crumb-sub">/ ' + escapeHtml(svc.region) + ' ' + escapeHtml(ver.version) + '</span>';
    var badge = $('pipe-badge');
    badge.className = 'badge s-' + statusName(ver).toLowerCase();
    badge.textContent = statusName(ver);
    $('run-count').textContent = String(state.pipe.runCount);

    var en = $('btn-pipe-enable');
    var isEnabled = statusName(ver) === 'ENABLED';
    en.disabled = isEnabled;
    en.title = isEnabled ? 'This version is already enabled' : 'Enable this version';

    renderCanvas();
    document.querySelectorAll('#snapshot-tabs .tab').forEach(function (t) {
      t.classList.toggle('current', t.dataset.tab === state.pipe.tab);
    });
    renderSnapshot();
  }

  function nodeDef(id) {
    return pipelineNodes.find(function (n) { return n.id === id; }) || null;
  }

  function portPos(node, port) {
    if (port === 'l') return { x: node.x, y: node.y + NODE_H / 2 };
    if (port === 'r') return { x: node.x + NODE_W, y: node.y + NODE_H / 2 };
    if (port === 'case1') return { x: node.x + NODE_W, y: node.y + NODE_H * 0.24 };
    if (port === 'case2') return { x: node.x + NODE_W, y: node.y + NODE_H * 0.76 };
    return { x: node.x + NODE_W / 2, y: node.y + NODE_H / 2 };
  }

  function edgePath(a, b) {
    var dx = Math.max(40, Math.abs(b.x - a.x) / 2);
    return 'M ' + a.x + ' ' + a.y + ' C ' + (a.x + dx) + ' ' + a.y + ', ' + (b.x - dx) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
  }

  function renderCanvas() {
    var wrap = $('canvas-nodes');
    var svg = $('canvas-edges');
    var p = state.pipe;

    wrap.innerHTML = pipelineNodes.map(function (n) {
      var def = R.NODE_TYPES[n.type];
      var cls = { Start: 'n-start', End: 'n-end', UDFProcessor: 'n-udf', CallModel: 'n-model', IfCondition2: 'n-if' }[n.type];
      var ports = def.ports.map(function (port) {
        return '<span class="port ' + port + '"></span>';
      }).join('');
      var tags = (n.type === 'IfCondition2')
        ? '<span class="port-tag case1">case1</span><span class="port-tag case2">case2</span>'
        : '';
      var ms = (p.ran && NODE_TIMINGS[n.id] != null)
        ? '<span class="node-ms' + (SLOW_NODES.indexOf(n.id) >= 0 ? ' slow' : '') + '">' + NODE_TIMINGS[n.id] + 'ms</span>'
        : '';
      return '<div class="node ' + cls + (p.nodeId === n.id ? ' selected' : '') + '" data-node="' + n.id + '" ' +
        'style="left:' + n.x + 'px;top:' + n.y + 'px">' +
        '<span class="node-typebadge">' + escapeHtml(def.type) + '</span>' +
        '<div class="node-name">' + escapeHtml(n.name) + '</div>' +
        '<div class="node-desc">' + escapeHtml(n.desc) + '</div>' +
        ports + tags + ms + '</div>';
    }).join('');

    svg.innerHTML = pipelineEdges.map(function (e) {
      var from = nodeDef(e.from), to = nodeDef(e.to);
      var a = portPos(from, e.port), b = portPos(to, 'l');
      var cls = 'edge';
      if (p.ran) {
        if (e.port === 'case1') cls += ' slow';
        if (e.port === 'case2') cls += ' active-false';
      }
      return '<path class="' + cls + '" d="' + edgePath(a, b) + '"></path>';
    }).join('');

    var strip = document.getElementById('run-strip');
    if (strip) strip.remove();
    if (p.ran) {
      var total = Object.keys(NODE_TIMINGS).reduce(function (a, k) { return a + NODE_TIMINGS[k]; }, 0);
      var s = document.createElement('div');
      s.className = 'run-strip';
      s.id = 'run-strip';
      s.innerHTML = 'Last run <span class="ok">success</span> · total ' + total + 'ms · ' +
        'slowest <span class="slow">ScoreModel 128ms</span> · case1 taken';
      $('canvas').appendChild(s);
    }
  }

  function openSnapshotForNode(nodeId) {
    state.pipe.nodeId = nodeId;
    renderCanvas();
    var snap = $('snapshot');
    snap.classList.remove('hidden');
    $('snapshot-node').textContent = nodeId ? (nodeDef(nodeId) ? nodeDef(nodeId).name : '') : '';
    document.querySelectorAll('#snapshot-tabs .tab').forEach(function (t) {
      t.classList.toggle('current', t.dataset.tab === state.pipe.tab);
    });
    renderSnapshot();
  }

  function closeSnapshot() {
    $('snapshot').classList.add('hidden');
    state.pipe.nodeId = null;
  }

  function timingRowsHTML(slowIds) {
    var total = Object.keys(NODE_TIMINGS).reduce(function (a, k) { return a + NODE_TIMINGS[k]; }, 0);
    var max = Math.max.apply(null, Object.keys(NODE_TIMINGS).map(function (k) { return NODE_TIMINGS[k]; })) || 1;
    var rows = pipelineNodes.map(function (n) {
      var ms = NODE_TIMINGS[n.id] || 0;
      var slow = (slowIds || []).indexOf(n.id) >= 0;
      return '<div class="timing-row">' +
        '<span class="timing-label">' + escapeHtml(n.name) + '</span>' +
        '<span class="timing-bar"><i class="' + (slow ? 'slow' : '') + '" style="width:' + Math.round(ms / max * 100) + '%"></i></span>' +
        '<span class="timing-ms">' + ms + ' ms</span></div>';
    }).join('');
    return rows + '<div class="kvline" style="margin-top:8px;border-bottom:none"><span class="k">Total</span><span class="v mono">' + total + ' ms</span></div>';
  }

  function renderSnapshot() {
    var body = $('snapshot-body');
    var p = state.pipe;
    var node = p.nodeId ? nodeDef(p.nodeId) : null;

    if (!p.ran) {
      body.innerHTML = '<div class="snap-empty"><div class="snap-icon">◎</div><div><b>Please Click Run firstly!</b></div>' +
        '<div>All three tabs read the latest run. No run, no snapshot.</div></div>';
      return;
    }

    if (p.tab === 'RESULT') {
      var out = node ? (NODE_OUTPUTS[node.id] || {}) : NODE_OUTPUTS.node_end_07;
      body.innerHTML = '<p class="snap-sec">Node result</p>' +
        '<pre class="code">' + hlJson(out) + '</pre>';
    } else if (p.tab === 'DETAIL') {
      var detail = node ? {
        componentName: node.type,
        id: node.id,
        name: node.name,
        props: {
          type: R.NODE_TYPES[node.type].type,
          ports: R.NODE_TYPES[node.type].ports,
          position: { x: node.x, y: node.y }
        }
      } : { componentName: 'Page', note: 'No node selected — click a node on the canvas' };
      body.innerHTML = '<p class="snap-sec">Node detail</p>' +
        '<pre class="code light">' + hlJson(detail) + '</pre>';
    } else {
      body.innerHTML = '<p class="snap-sec">Step timing</p>' +
        timingRowsHTML(SLOW_NODES) +
        '<p class="snap-sec">Branch taken</p>' +
        '<div class="kvline"><span class="k">IfCondition</span><span class="v mono">code == 0 → case1</span></div>' +
        '<div class="kvline"><span class="k">Slow branch</span><span class="v" style="color:#b45309">ScoreModel 128 ms</span></div>';
    }
  }

  function runPipeline() {
    var p = state.pipe;
    p.ran = true;
    p.runCount += 1;
    $('run-count').textContent = String(p.runCount);
    renderCanvas();
    renderSnapshot();
    if ($('snapshot').classList.contains('hidden')) {
      $('snapshot').classList.remove('hidden');
    }
    toast('Run #' + p.runCount + ' finished · 200 ms · case1 → ScoreModel');
  }

  function dslOf() {
    var children = [];
    pipelineNodes.forEach(function (n) {
      var def = R.NODE_TYPES[n.type];
      children.push({
        componentName: n.type,
        id: n.id,
        props: {
          nodeMap: {},
          type: def.type,
          position: { x: n.x, y: n.y },
          ports: def.ports,
          id: n.id,
          input: n.type === 'Start' ? [] : [{ id: n.id + '_in', name: 'payload', type: 'object', source: '', mapTo: '' }],
          output: n.type === 'End' ? [] : [{ id: n.id + '_out', name: 'payload', type: 'object', selected: true }],
          name: n.name
        },
        hidden: false,
        title: n.name,
        isLocked: false,
        condition: n.type === 'IfCondition2' ? { expression: 'code == 0' } : null,
        conditionGroup: null
      });
    });
    pipelineEdges.forEach(function (e, i) {
      children.push({
        componentName: 'Line',
        id: 'line_' + String(i + 1).padStart(4, '0'),
        source: e.from,
        target: e.to,
        sourcePortId: e.port === 'case1' || e.port === 'case2' ? e.from + '_' + e.port : e.from,
        targetPortId: e.to
      });
    });
    return { componentName: 'Page', id: 'node_page_0001', children: children };
  }

  /* ══════════ 3. 流量路由 ══════════ */

  function openRouter(svc) {
    state.router.serviceId = svc.id;
    state.router.tab = 'manage';
    showPage('router');
    renderRouter();
  }

  function currentRouterService() { return getService(state.router.serviceId); }

  function displayLogEnable(v) {
    /* logEnable 在接口侧疑似布尔化：<=1 视为 0/1，否则视为百分比 */
    return v <= 1 ? Math.round(v * 100) : Math.round(v);
  }

  function renderRouter() {
    var svc = currentRouterService();
    if (!svc) { location.hash = '#/'; return; }

    $('router-sub').textContent = svc.name + ' · ' + svc.region;

    var ev = enabledVersion(svc);
    var evEl = $('rt-enabled-version');
    if (ev) {
      evEl.textContent = ev.version;
      evEl.classList.remove('not-set');
    } else {
      evEl.textContent = 'Not configured';
      evEl.classList.add('not-set');
    }

    var cfg = svc.routerConfig || DEFAULT_ROUTER;
    $('rt-qps').value = cfg.rateLimit;
    $('rt-rate').value = Math.round(cfg.dryRunTriggerRate * 100);
    $('rt-logSample').value = cfg.logSample;
    $('rt-logSample-val').textContent = cfg.logSample + '%';
    $('rt-logEnable').value = displayLogEnable(cfg.logEnable);
    $('rt-logEnable-val').textContent = displayLogEnable(cfg.logEnable) + '%';
    setSwitch($('rt-partial'), !!cfg.allowPartialExec);
    setSwitch($('rt-tracingDetail'), !!cfg.tracingDetailSwitch);

    document.querySelectorAll('#router-tabs .tab').forEach(function (t) {
      t.classList.toggle('current', t.dataset.rtab === state.router.tab);
    });
    $('router-manage').hidden = state.router.tab !== 'manage';
    $('router-history').hidden = state.router.tab !== 'history';
    renderRouterHistory();
  }

  function setSwitch(el, on) {
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  function renderRouterHistory() {
    var svc = currentRouterService();
    var rows = (routerHistory[svc.id] || []);
    var body = $('router-history-body');
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="3">No data</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (r) {
      return '<tr><td class="time">' + escapeHtml(r.time) + '</td>' +
        '<td>' + escapeHtml(r.operator) + '</td>' +
        '<td style="white-space:normal">' + escapeHtml(r.detail) + '</td></tr>';
    }).join('');
  }

  function submitRouter() {
    var svc = currentRouterService();
    var prev = svc.routerConfig || JSON.parse(JSON.stringify(DEFAULT_ROUTER));
    var pct = Number($('rt-rate').value) || 0;
    var next = {
      rateLimit: Number($('rt-qps').value) || 0,
      logSample: Number($('rt-logSample').value) || 0,
      logEnable: Number($('rt-logEnable').value) >= 100 ? 1 : (Number($('rt-logEnable').value) || 0) / 100,
      dryRunTriggerRate: pct / 100,
      allowPartialExec: $('rt-partial').classList.contains('on'),
      tracingDetailSwitch: $('rt-tracingDetail').classList.contains('on')
    };

    var diffs = [];
    if (prev.rateLimit !== next.rateLimit) diffs.push('Max QPS ' + prev.rateLimit + ' → ' + next.rateLimit);
    if (Math.round(prev.dryRunTriggerRate * 100) !== pct) diffs.push('Trigger Rate ' + Math.round(prev.dryRunTriggerRate * 100) + '% → ' + pct + '%');
    if (prev.logSample !== next.logSample) diffs.push('Tracing Sampling ' + prev.logSample + '% → ' + next.logSample + '%');
    if (displayLogEnable(prev.logEnable) !== Number($('rt-logEnable').value)) {
      diffs.push('Log Enable Rate ' + displayLogEnable(prev.logEnable) + '% → ' + $('rt-logEnable').value + '%');
    }
    if (prev.allowPartialExec !== next.allowPartialExec) diffs.push('Allow Partial Exec ' + prev.allowPartialExec + ' → ' + next.allowPartialExec);
    if (prev.tracingDetailSwitch !== next.tracingDetailSwitch) diffs.push('Open Tracing Detail ' + prev.tracingDetailSwitch + ' → ' + next.tracingDetailSwitch);

    svc.routerConfig = next;
    if (diffs.length) {
      routerHistory[svc.id] = routerHistory[svc.id] || [];
      routerHistory[svc.id].unshift({ time: nowStr(), operator: CURRENT_USER, detail: diffs.join('；') });
      toast('Traffic Router updated · ' + diffs.length + ' change(s)');
    } else {
      toast('Traffic Router submitted · no changes');
    }
    renderRouter();
  }

  /* ══════════ 4. 链路日志 ══════════ */

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function hex(rnd, n) {
    var s = '';
    for (var i = 0; i < n; i++) s += Math.floor(rnd() * 16).toString(16);
    return s;
  }

  function traceRowsFor(svc) {
    var rnd = mulberry32(svc.id.split('').reduce(function (a, c) { return a + c.charCodeAt(0); }, 7));
    var base = new Date('2026-10-29T09:41:02');
    var rows = [];
    for (var i = 0; i < 18; i++) {
      var d = new Date(base.getTime() - i * (37 + Math.floor(rnd() * 90)) * 1000);
      var p2 = function (n) { return String(n).padStart(2, '0'); };
      var stamp = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' +
        p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
      var status = rnd() > 0.22 ? 'success' : 'failed';
      var ver = svc.versions[Math.floor(rnd() * svc.versions.length)];
      rows.push({
        id: svc.id + '-t' + i,
        reqTime: stamp,
        status: status,
        tag: rnd() > 0.8 ? 'test-run' : '',
        duration: status === 'failed' ? 20 + Math.floor(rnd() * 90) : 60 + Math.floor(rnd() * 380),
        flowNo: 'FL20261029A' + String(100 + i * 3 + Math.floor(rnd() * 3)).padStart(6, '0'),
        version: ver.version,
        traceId: hex(rnd, 32) + ':' + hex(rnd, 16) + ':' + Math.floor(rnd() * 4294967296).toString(16).padStart(16, '0')
      });
    }
    return rows;
  }

  function openTracing(svc) {
    state.trace.serviceId = svc.id;
    state.trace.rows = traceRowsFor(svc);
    state.trace.filters = {};
    state.trace.selected = {};
    $('tracing-title').textContent = svc.name + ' (' + svc.region + ') Tracing Log';

    $('t-version').innerHTML = '<option value="">Please select</option>' +
      svc.versions.map(function (v) { return '<option>' + escapeHtml(v.version) + '</option>'; }).join('');

    ['t-traceid', 't-dur-min', 't-dur-max', 't-flow', 't-time-start', 't-time-end'].forEach(function (id) { $(id).value = ''; });
    $('t-status').value = '';
    $('t-tag').value = '';
    $('t-check-all').checked = false;

    showPage('tracing');
    renderTracing();
  }

  function currentTracingService() { return getService(state.trace.serviceId); }

  function visibleTraceRows() {
    var f = state.trace.filters;
    return state.trace.rows.filter(function (r) {
      if (f.version && r.version !== f.version) return false;
      if (f.traceId && r.traceId.indexOf(f.traceId) < 0) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.tag && r.tag !== f.tag) return false;
      if (f.durMin != null && r.duration < f.durMin) return false;
      if (f.durMax != null && r.duration > f.durMax) return false;
      if (f.flowNo && r.flowNo.indexOf(f.flowNo) < 0) return false;
      if (f.timeStart && r.reqTime < f.timeStart) return false;
      if (f.timeEnd && r.reqTime > f.timeEnd) return false;
      return true;
    });
  }

  function renderTracing() {
    var rows = visibleTraceRows();
    var body = $('trace-body');
    if (!rows.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="9">No data</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td><input type="checkbox" data-check="' + r.id + '"' + (state.trace.selected[r.id] ? ' checked' : '') + '></td>' +
        '<td class="time">' + escapeHtml(r.reqTime) + '</td>' +
        '<td><span class="status-text ' + r.status + '">' + r.status + '</span></td>' +
        '<td>' + (r.tag ? '<span class="tag-chip ' + r.tag + '">' + r.tag + '</span>' : '<span style="color:#b0b8bc">-</span>') + '</td>' +
        '<td class="mono">' + r.duration + '</td>' +
        '<td class="mono">' + escapeHtml(r.flowNo) + '</td>' +
        '<td class="mono">' + escapeHtml(r.version) + '</td>' +
        '<td><span class="trace-id" title="' + escapeHtml(r.traceId) + '">' + escapeHtml(r.traceId) + '</span></td>' +
        '<td>' +
          '<button class="link-btn" data-act="trace-detail" data-tid="' + r.id + '">Detail</button><span class="act-sep">|</span>' +
          '<button class="link-btn" data-act="trace-back" data-tid="' + r.id + '">Traceback</button>' +
        '</td></tr>';
    }).join('');
  }

  function applyTraceFilters() {
    var num = function (v) { var n = Number(v); return v !== '' && !isNaN(n) ? n : null; };
    state.trace.filters = {
      version: $('t-version').value,
      traceId: $('t-traceid').value.trim(),
      status: $('t-status').value,
      tag: $('t-tag').value,
      durMin: num($('t-dur-min').value),
      durMax: num($('t-dur-max').value),
      flowNo: $('t-flow').value.trim(),
      timeStart: $('t-time-start').value.trim(),
      timeEnd: $('t-time-end').value.trim()
    };
    renderTracing();
    toast('Query applied · ' + visibleTraceRows().length + ' row(s)');
  }

  /* Snap Shot 抽屉（全局，Tracing Log / Batch Test 用） */

  function openTraceSnapshot(row) {
    state.snap = { kind: 'trace', tab: state.snap.tab || 'RESULT', nodeId: null, row: row };
    $('snapshot-global-node').textContent = row.flowNo;
    $('snapshot-global').classList.remove('hidden');
    $('drawer-mask').classList.remove('hidden');
    document.querySelectorAll('#snapshot-global-tabs .tab').forEach(function (t) {
      t.classList.toggle('current', t.dataset.tab === state.snap.tab);
    });
    renderGlobalSnapshot();
  }

  function closeGlobalSnapshot() {
    $('snapshot-global').classList.add('hidden');
    $('drawer-mask').classList.add('hidden');
    state.snap.row = null;
  }

  function renderGlobalSnapshot() {
    var body = $('snapshot-global-body');
    var row = state.snap.row;
    if (!row) { body.innerHTML = ''; return; }

    if (state.snap.tab === 'RESULT') {
      body.innerHTML = '<p class="snap-sec">Response</p>' +
        '<pre class="code">' + hlJson(row.status === 'failed'
          ? { success: false, errorCode: 'UDF_EXECUTION_ERROR', message: 'read timeout on upstream', flowNo: row.flowNo }
          : { success: true, decision: 'REVIEW', score: 0.8342, flowNo: row.flowNo }) + '</pre>' +
        '<p class="snap-sec">Request</p>' +
        '<pre class="code light">' + hlJson({ user_id: 'u_88213641', order_id: 'o_20261029_004417', txn_amount: 128.5 }) + '</pre>';
    } else if (state.snap.tab === 'DETAIL') {
      body.innerHTML = '<p class="snap-sec">Trace</p>' +
        '<div class="kvline"><span class="k">TraceId</span><span class="v mono">' + escapeHtml(row.traceId) + '</span></div>' +
        '<div class="kvline"><span class="k">FlowNo</span><span class="v mono">' + escapeHtml(row.flowNo) + '</span></div>' +
        '<div class="kvline"><span class="k">ServiceVersion</span><span class="v mono">' + escapeHtml(row.version) + '</span></div>' +
        '<div class="kvline"><span class="k">ReqTime</span><span class="v mono">' + escapeHtml(row.reqTime) + '</span></div>' +
        '<div class="kvline"><span class="k">Duration</span><span class="v mono">' + row.duration + ' ms</span></div>' +
        '<div class="kvline"><span class="k">Status</span><span class="v">' + row.status + '</span></div>' +
        '<div class="kvline"><span class="k">Tag</span><span class="v">' + (row.tag || '-') + '</span></div>';
    } else {
      body.innerHTML = '<p class="snap-sec">Step timing</p>' + timingRowsHTML(row.status === 'failed' ? ['node_udf_read_02'] : SLOW_NODES);
    }
  }

  /* ══════════ 5. 弹窗：Add Service / Add Version ══════════ */

  function openServiceModal(mode, svc) {
    state.smMode = mode;
    state.smService = svc || null;

    var isVersion = mode === 'version';
    $('sm-title').textContent = isVersion ? 'Add Version' : 'Add FeatureService';
    $('sm-name-label').innerHTML = isVersion ? 'FeatureService：' : '<i>*</i>FeatureService：';

    ['err-sm-name', 'err-sm-region', 'err-sm-team', 'err-sm-version'].forEach(function (id) { $(id).classList.add('hidden'); });

    $('sm-region').innerHTML = '<option value="">Please select</option>' +
      REGIONS.map(function (r) { return '<option>' + r + '</option>'; }).join('');
    $('sm-owner').innerHTML = '<option value="">Please select</option>' +
      OWNERS.map(function (o) { return '<option>' + escapeHtml(o) + '</option>'; }).join('');

    var note = document.getElementById('sm-note');
    if (note) note.remove();

    if (isVersion) {
      $('sm-name').value = svc.name;
      $('sm-name').disabled = true;
      $('sm-region').value = svc.region;
      $('sm-region').disabled = true;
      $('sm-owner').value = svc.owners[0] || '';
      $('sm-owner').disabled = true;
      fillTeamOptions(svc.owners[0], svc.team);
      $('sm-team').disabled = true;
      $('sm-version').value = nextVersionName(svc);
      $('sm-desc').value = '';

      var n = document.createElement('div');
      n.className = 'sm-note';
      n.id = 'sm-note';
      n.textContent = 'Adding a version to an existing FeatureService — service identity is fixed. Only ServiceVersion and Description are editable.';
      $('sm-name-label').parentNode.parentNode.insertBefore(n, $('sm-name-label').parentNode);
    } else {
      $('sm-name').value = '';
      $('sm-name').disabled = false;
      $('sm-region').disabled = false;
      $('sm-region').value = '';
      $('sm-owner').disabled = false;
      $('sm-owner').value = CURRENT_USER;
      fillTeamOptions(CURRENT_USER, '');
      $('sm-version').value = 'V1';
      $('sm-desc').value = '';
    }

    $('service-modal').classList.remove('hidden');
    setTimeout(function () { if (!isVersion) $('sm-name').focus(); }, 30);
  }

  function fillTeamOptions(owner, selected) {
    var sel = $('sm-team');
    if (!owner) {
      sel.innerHTML = '<option value="">Please select owner firstly!</option>';
      sel.disabled = true;
      return;
    }
    var teams = OWNER_TEAMS[owner] || [];
    sel.innerHTML = '<option value="">Please select</option>' +
      teams.map(function (t) {
        return '<option value="' + escapeHtml(t) + '"' + (t === selected ? ' selected' : '') + '>' + escapeHtml(t) + '</option>';
      }).join('');
    sel.disabled = false;
  }

  function submitServiceModal() {
    var isVersion = state.smMode === 'version';
    var name = $('sm-name').value.trim();
    var region = $('sm-region').value;
    var owner = $('sm-owner').value;
    var team = $('sm-team').value;
    var versionName = $('sm-version').value.trim();
    var desc = $('sm-desc').value.trim();

    var ok = true;
    function mark(id, bad) { $(id).classList.toggle('hidden', !bad); if (bad) ok = false; }
    mark('err-sm-name', !isVersion && !name);
    mark('err-sm-region', !region);
    mark('err-sm-team', !team);
    mark('err-sm-version', !versionName);
    if (!ok) return;

    if (isVersion) {
      var svc = state.smService;
      svc.versions.push({
        id: 'v' + Date.now(),
        version: versionName,
        status: 1,
        description: desc,
        updater: CURRENT_USER,
        created: nowStr(),
        updated: nowStr()
      });
      svc.updated = nowStr();
      state.expanded[svc.id] = true;
      $('service-modal').classList.add('hidden');
      renderList();
      toast('Version ' + versionName + ' added to ' + svc.name + ' (DRAFT)');
      return;
    }

    if (services.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) {
      $('err-sm-name').textContent = 'This FeatureService name already exists';
      $('err-sm-name').classList.remove('hidden');
      return;
    }

    var created = nowStr();
    services.unshift({
      id: 's' + Date.now(),
      name: name, region: region, team: team,
      owners: owner ? [owner] : [CURRENT_USER],
      created: created, updated: created,
      routerConfig: null,
      versions: [{
        id: 'v' + Date.now(), version: versionName, status: 1, router: null, description: desc,
        updater: CURRENT_USER, created: created, updated: created
      }]
    });
    $('service-modal').classList.add('hidden');
    state.page = 1;
    state.expanded = {};
    renderList();
    toast('FeatureService "' + name + '" created with version ' + versionName);
  }

  /* ══════════ 6. 弹窗：Permission ══════════ */

  function openPermission(svc) {
    state.permService = svc;
    state.permRows = (permissions[svc.id] || []).slice();
    $('pm-title').textContent = svc.name + ' Permission';
    renderPermSubjectOptions();
    renderPermList();
    $('permission-modal').classList.remove('hidden');
  }

  function renderPermSubjectOptions() {
    var type = $('pm-subject-type').value;
    var list = type === 'Team' ? TEAMS : OWNERS;
    $('pm-subject').innerHTML = '<option value="">Please select</option>' +
      list.map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
  }

  function renderPermList() {
    var wrap = $('pm-list');
    if (!state.permRows.length) {
      wrap.innerHTML = '<div class="perm-empty">No one has been granted access yet</div>';
      return;
    }
    wrap.innerHTML = state.permRows.map(function (row, i) {
      return '<div class="perm-row">' +
        '<span class="type-chip ' + row.type.toLowerCase() + '">' + row.type + '</span>' +
        '<span class="perm-who">' + escapeHtml(row.subject) + '</span>' +
        '<select data-perm-role="' + i + '">' +
          ['Viewer', 'Invoker', 'Editor', 'Owner'].map(function (r) {
            return '<option' + (r === row.role ? ' selected' : '') + '>' + r + '</option>';
          }).join('') +
        '</select>' +
        '<button class="perm-del" data-perm-del="' + i + '" title="Remove">×</button>' +
        '</div>';
    }).join('');
  }

  function addPermission() {
    var subject = $('pm-subject').value;
    var type = $('pm-subject-type').value;
    var role = $('pm-role').value;
    if (!subject) { toast('Please select a ' + type.toLowerCase() + ' to grant', 'error'); return; }
    if (state.permRows.some(function (r) { return r.subject === subject; })) {
      toast(subject + ' already has access', 'error');
      return;
    }
    state.permRows.push({ subject: subject, type: type, role: role });
    renderPermList();
    toast(subject + ' added as ' + role);
  }

  function savePermission() {
    var svc = state.permService;
    permissions[svc.id] = state.permRows.slice();
    $('permission-modal').classList.add('hidden');
    toast('Permission saved for ' + svc.name + ' · ' + state.permRows.length + ' grant(s)');
  }

  /* ══════════ 7. 弹窗：Batch Test ══════════ */

  var START_OUTPUTS = ['user_id', 'order_id', 'txn_amount', 'country', 'event_time'];

  function openBatchTest(svc, version) {
    state.batchVersion = { svc: svc, version: version };
    state.batchFile = null;
    state.batchVerified = false;
    $('bm-title').textContent = svc.name + ' ' + version.version + ' · Batch Test';
    $('bm-type').value = 'CSV';
    $('bm-file').value = '';
    $('bm-file-name').textContent = 'Click to Upload';
    $('bm-upload').classList.remove('filled', 'drag');
    $('err-bm-file').classList.add('hidden');
    $('bm-verify').classList.add('hidden');
    $('bm-verify').className = 'verify-note hidden';
    $('bm-headers').innerHTML = START_OUTPUTS.map(function (h) {
      return '<span class="header-chip">' + escapeHtml(h) + '</span>';
    }).join('');
    $('batch-modal').classList.remove('hidden');
  }

  function onBatchFile(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      $('err-bm-file').textContent = 'Only CSV files are accepted';
      $('err-bm-file').classList.remove('hidden');
      return;
    }
    state.batchFile = file;
    state.batchVerified = false;
    $('bm-file-name').textContent = file.name;
    $('bm-upload').classList.add('filled');
    $('err-bm-file').classList.add('hidden');
    $('bm-verify').className = 'verify-note hidden';

    var reader = new FileReader();
    reader.onload = function () {
      state.batchHeaders = String(reader.result).split(/\r?\n/)[0]
        .split(',').map(function (h) { return h.trim(); }).filter(Boolean);
    };
    reader.readAsText(file.slice(0, 4096));
  }

  function verifyBatch() {
    if (!state.batchFile) {
      $('err-bm-file').textContent = 'Please upload a CSV file first';
      $('err-bm-file').classList.remove('hidden');
      return;
    }
    var headers = state.batchHeaders || null;
    var note = $('bm-verify');
    if (!headers) {
      note.className = 'verify-note bad';
      note.textContent = 'Could not read the header row — check the file encoding and retry.';
      return;
    }
    var missing = START_OUTPUTS.filter(function (h) { return headers.indexOf(h) < 0; });
    if (missing.length) {
      note.className = 'verify-note bad';
      note.textContent = 'Header check failed. Missing column(s): ' + missing.join(', ') +
        '. CSV headers must cover every output parameter of this version\'s Start node.';
      state.batchVerified = false;
    } else {
      note.className = 'verify-note ok';
      note.textContent = 'Header check passed. ' + headers.length + ' column(s), all Start node outputs covered.';
      state.batchVerified = true;
    }
  }

  function submitBatch() {
    if (!state.batchFile) {
      $('err-bm-file').textContent = 'Please upload a CSV file first';
      $('err-bm-file').classList.remove('hidden');
      return;
    }
    if (!state.batchVerified) {
      toast('Please click Verify before Submit', 'error');
      return;
    }
    var pair = state.batchVersion;
    state.trace.rows.unshift({
      id: 't' + Date.now(),
      reqTime: nowStr(),
      status: 'success',
      tag: 'test-run',
      duration: 96 + Math.floor(Math.random() * 120),
      flowNo: 'FL20261029A9' + String(Math.floor(Math.random() * 9000) + 1000),
      version: pair.version.version,
      traceId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90:0f1e2d3c4b5a6978:0000000000000001'    });
    $('batch-modal').classList.add('hidden');
    toast('Batch test submitted · ' + pair.svc.name + ' ' + pair.version.version + ' · result is tagged test-run');
  }

  /* ══════════ 8. 通用确认弹窗 ══════════ */

  function confirmDialog(title, text, okLabel, okClass, onOk) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal" style="width:440px">' +
        '<div class="modal-title"><span>' + escapeHtml(title) + '</span>' +
          '<button class="modal-close" data-cancel>×</button></div>' +
        '<p style="font-size:13.5px;line-height:1.7;color:#555">' + escapeHtml(text) + '</p>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-default" data-cancel>Cancel</button>' +
          '<button class="btn ' + (okClass || 'btn-danger') + '" data-ok>' + escapeHtml(okLabel) + '</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    overlay.querySelectorAll('[data-cancel]').forEach(function (b) { b.addEventListener('click', close); });
    overlay.querySelector('[data-ok]').addEventListener('click', function () { close(); onOk(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
  }

  /* ══════════ 事件绑定 ══════════ */

  function bindEvents() {
    /* ---- 列表筛选 ---- */
    $('btn-query').addEventListener('click', function () {
      state.filters = {
        name: $('f-name').value,
        region: $('f-region').value,
        team: $('f-team').value,
        owner: $('f-owner').value
      };
      state.page = 1;
      renderList();
      toast('Query applied · ' + filteredServices().length + ' service(s)');
    });

    $('btn-reset').addEventListener('click', function () {
      ['f-name', 'f-region', 'f-team', 'f-owner'].forEach(function (id) { $(id).value = ''; });
      state.filters = { name: '', region: '', team: '', owner: '' };
      state.ownedOnly = false;
      $('owned-me').checked = false;
      state.page = 1;
      renderList();
    });

    $('btn-collapse').addEventListener('click', function () {
      state.filtersCollapsed = !state.filtersCollapsed;
      var hide = state.filtersCollapsed;
      ['f-region', 'f-team', 'f-owner'].forEach(function (id) {
        $(id).closest('.filter-item').hidden = hide;
      });
      $('btn-collapse').textContent = hide ? 'Expand ∨' : 'Collapse ∧';
    });

    $('owned-me').addEventListener('change', function () {
      state.ownedOnly = $('owned-me').checked;
      state.page = 1;
      renderList();
    });

    $('page-size').addEventListener('change', function () {
      state.pageSize = Number($('page-size').value);
      state.page = 1;
      renderList();
    });

    $('btn-refresh').addEventListener('click', function () { renderList(); toast('Refreshed'); });
    $('btn-info').addEventListener('click', function () {
      toast('Orches Service：展开行看版本；Edit 进画布；DISABLED 版本不可编辑；Router / Tracing 是服务级页面');
    });

    $('btn-add-service').addEventListener('click', function () { openServiceModal('service', null); });

    /* 表格动作（委托） */
    $('table-body').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn || btn.disabled) return;
      var act = btn.dataset.act;
      var svc = getService(btn.dataset.sid);
      if (!svc) return;
      var ver = btn.dataset.vid ? getVersion(svc, btn.dataset.vid) : null;

      switch (act) {
        case 'expand':
          state.expanded[svc.id] = !state.expanded[svc.id];
          renderList();
          break;
        case 'add-version':
          openServiceModal('version', svc);
          break;
        case 'router':
          navigate('#/router/' + svc.id);
          break;
        case 'tracing':
          navigate('#/tracing-log/' + svc.id);
          break;
        case 'permission':
          openPermission(svc);
          break;
        case 'more':
          openRowMenu(btn, svc);
          break;
        case 'edit-version':
          if (!R.canEditVersion(statusName(ver))) return;
          navigate('#/pipeline/' + svc.id + '/' + ver.id);
          break;
        case 'copy-version':
          copyVersion(svc, ver);
          break;
        case 'batch-test':
          openBatchTest(svc, ver);
          break;
        case 'toggle-version':
          toggleVersionStatus(svc, ver);
          break;
      }
    });

    /* More 下拉（document 级委托，菜单是动态节点） */
    document.addEventListener('click', function (e) {
      var item = e.target.closest('#row-menu [data-more]');
      if (item) {
        var svc = state.menuService;
        var kind = item.dataset.more;
        closeRowMenu();
        if (!svc) return;
        if (kind === 'monitor') toast('Monitor: opens the external monitoring system (mock)');
        else if (kind === 'alert') toast('Alert: entry confirmed upstream, carrier form not yet specified (spec §13)');
        else if (kind === 'delete') {
          confirmDialog('Delete FeatureService',
            'Deleting "' + svc.name + '" also removes all ' + svc.versions.length + ' version(s). This cannot be undone.',
            'Delete', 'btn-danger', function () { deleteService(svc); });
        }
        return;
      }
      if (!e.target.closest('[data-act="more"]')) closeRowMenu();
    });

    /* ---- 画布 ---- */
    $('btn-pipe-back').addEventListener('click', function () { navigate('#/'); });

    $('btn-graph-config').addEventListener('click', function (e) {
      e.stopPropagation();
      $('graph-config-menu').classList.toggle('hidden');
    });

    $('graph-config-menu').addEventListener('click', function (e) {
      var item = e.target.closest('[data-gc]');
      if (!item) return;
      $('graph-config-menu').classList.add('hidden');
      if (item.dataset.gc === 'export') {
        var json = JSON.stringify(dslOf(), null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(function () {
            toast('Export DSL · chartConfig copied to clipboard (' + json.length + ' chars)');
          }).catch(function () { toast('Export DSL · chartConfig ready (' + json.length + ' chars)'); });
        } else {
          toast('Export DSL · chartConfig ready (' + json.length + ' chars)');
        }
        state.pipe.tab = 'DETAIL';
        if (state.pipe.ran) renderSnapshot();
      } else {
        openImportDialog();
      }
    });

    $('btn-run').addEventListener('click', runPipeline);

    $('btn-save').addEventListener('click', function () {
      var pair = currentPipe();
      pair.ver.updated = nowStr();
      pair.svc.updated = pair.ver.updated;
      state.pipe.dirty = false;
      /* 原型只保存画布草稿：不生成 startNode / udfNode / callModelNode 等
       * 平铺镜像（规格 §7.3 要求写路径同时维护两处，本原型未实现该写路径）。 */
      toast('Draft saved for ' + pair.ver.version + ' · canvas only, no execution mirrors emitted');
    });

    $('btn-pipe-enable').addEventListener('click', function () {
      var pair = currentPipe();
      if (statusName(pair.ver) === 'ENABLED') return;
      toggleVersionStatus(pair.svc, pair.ver);
      renderPipeline();
    });

    $('snapshot-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      state.pipe.tab = tab.dataset.tab;
      document.querySelectorAll('#snapshot-tabs .tab').forEach(function (t) {
        t.classList.toggle('current', t === tab);
      });
      renderSnapshot();
    });

    $('btn-drawer-close').addEventListener('click', closeSnapshot);

    /* 节点点击 / 拖动 */
    var drag = null;
    $('canvas-nodes').addEventListener('mousedown', function (e) {
      var nodeEl = e.target.closest('.node');
      if (!nodeEl) return;
      var node = nodeDef(nodeEl.dataset.node);
      if (!node) return;
      drag = { node: node, el: nodeEl, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y, moved: false };
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx;
      var dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      drag.moved = true;
      drag.node.x = Math.max(0, drag.ox + dx);
      drag.node.y = Math.max(0, drag.oy + dy);
      drag.el.style.left = drag.node.x + 'px';
      drag.el.style.top = drag.node.y + 'px';
      var svg = $('canvas-edges');
      var paths = svg.querySelectorAll('path');
      pipelineEdges.forEach(function (edge, i) {
        var a = portPos(nodeDef(edge.from), edge.port);
        var b = portPos(nodeDef(edge.to), 'l');
        if (paths[i]) paths[i].setAttribute('d', edgePath(a, b));
      });
    });

    document.addEventListener('mouseup', function () {
      if (!drag) return;
      var node = drag.node;
      var moved = drag.moved;
      drag = null;
      if (moved) {
        state.pipe.dirty = true;
        return;
      }
      openSnapshotForNode(node.id);
    });

    /* ---- Router ---- */
    $('btn-router-back').addEventListener('click', function () { navigate('#/'); });

    $('router-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      state.router.tab = tab.dataset.rtab;
      renderRouter();
    });

    document.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.dataset.step.split(':');
        var key = parts[0], delta = Number(parts[1]);
        if (key === 'qps') {
          var inp = $('rt-qps');
          inp.value = Math.max(0, (Number(inp.value) || 0) + delta);
        } else {
          var r = $('rt-rate');
          r.value = Math.min(100, Math.max(0, (Number(r.value) || 0) + delta));
        }
      });
    });

    $('rt-logSample').addEventListener('input', function () {
      $('rt-logSample-val').textContent = this.value + '%';
    });
    $('rt-logEnable').addEventListener('input', function () {
      $('rt-logEnable-val').textContent = this.value + '%';
    });

    ['rt-partial', 'rt-tracingDetail'].forEach(function (id) {
      $(id).addEventListener('click', function () {
        setSwitch(this, !this.classList.contains('on'));
      });
    });

    $('btn-router-cancel').addEventListener('click', function () { renderRouter(); toast('Changes discarded'); });
    $('btn-router-submit').addEventListener('click', submitRouter);

    /* ---- Tracing ---- */
    $('btn-tracing-back').addEventListener('click', function () { navigate('#/'); });
    $('btn-trace-query').addEventListener('click', applyTraceFilters);
    $('btn-trace-reset').addEventListener('click', function () {
      ['t-version', 't-status', 't-tag'].forEach(function (id) { $(id).value = ''; });
      ['t-traceid', 't-dur-min', 't-dur-max', 't-flow', 't-time-start', 't-time-end'].forEach(function (id) { $(id).value = ''; });
      state.trace.filters = {};
      state.trace.selected = {};
      $('t-check-all').checked = false;
      renderTracing();
    });

    $('t-check-all').addEventListener('change', function () {
      var on = this.checked;
      visibleTraceRows().forEach(function (r) { state.trace.selected[r.id] = on; });
      renderTracing();
    });

    $('trace-body').addEventListener('change', function (e) {
      var cb = e.target.closest('input[data-check]');
      if (cb) state.trace.selected[cb.dataset.check] = cb.checked;
    });

    $('trace-body').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var row = state.trace.rows.find(function (r) { return r.id === btn.dataset.tid; });
      if (!row) return;
      if (btn.dataset.act === 'trace-detail') openTraceSnapshot(row);
      else toast('Traceback: walks the upstream call chain — carrier form not collected (spec §9)');
    });

    $('snapshot-global-tabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      state.snap.tab = tab.dataset.tab;
      document.querySelectorAll('#snapshot-global-tabs .tab').forEach(function (t) {
        t.classList.toggle('current', t === tab);
      });
      renderGlobalSnapshot();
    });
    $('btn-drawer-global-close').addEventListener('click', closeGlobalSnapshot);
    $('drawer-mask').addEventListener('click', closeGlobalSnapshot);

    /* ---- Add Service / Add Version 弹窗 ---- */
    $('btn-sm-close').addEventListener('click', function () { $('service-modal').classList.add('hidden'); });
    $('btn-sm-cancel').addEventListener('click', function () { $('service-modal').classList.add('hidden'); });
    $('btn-sm-submit').addEventListener('click', submitServiceModal);
    $('sm-owner').addEventListener('change', function () { fillTeamOptions(this.value, ''); });

    /* ---- Permission 弹窗 ---- */
    $('btn-pm-close').addEventListener('click', function () { $('permission-modal').classList.add('hidden'); });
    $('btn-pm-done').addEventListener('click', savePermission);
    $('btn-pm-add').addEventListener('click', addPermission);
    $('pm-subject-type').addEventListener('change', renderPermSubjectOptions);
    $('pm-list').addEventListener('click', function (e) {
      var del = e.target.closest('[data-perm-del]');
      if (!del) return;
      var i = Number(del.dataset.permDel);
      var removed = state.permRows.splice(i, 1)[0];
      renderPermList();
      toast('Removed ' + removed.subject);
    });
    $('pm-list').addEventListener('change', function (e) {
      var sel = e.target.closest('[data-perm-role]');
      if (!sel) return;
      var i = Number(sel.dataset.permRole);
      state.permRows[i].role = sel.value;
      toast(state.permRows[i].subject + ' → ' + sel.value);
    });

    /* ---- Batch Test 弹窗 ---- */
    $('btn-bm-close').addEventListener('click', function () { $('batch-modal').classList.add('hidden'); });
    $('btn-bm-cancel').addEventListener('click', function () { $('batch-modal').classList.add('hidden'); });
    $('btn-bm-verify').addEventListener('click', verifyBatch);
    $('btn-bm-submit').addEventListener('click', submitBatch);
    $('bm-upload').addEventListener('click', function () { $('bm-file').click(); });
    $('bm-file').addEventListener('change', function () { onBatchFile(this.files[0]); });
    $('bm-upload').addEventListener('dragover', function (e) {
      e.preventDefault();
      this.classList.add('drag');
    });
    $('bm-upload').addEventListener('dragleave', function () { this.classList.remove('drag'); });
    $('bm-upload').addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag');
      var f = e.dataTransfer.files[0];
      if (f) onBatchFile(f);
    });

    /* ---- 全局 ---- */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.menu-wrap')) $('graph-config-menu').classList.add('hidden');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      ['service-modal', 'permission-modal', 'batch-modal'].forEach(function (id) { $(id).classList.add('hidden'); });
      $('graph-config-menu').classList.add('hidden');
      closeRowMenu();
      closeGlobalSnapshot();
      closeSnapshot();
    });

    window.addEventListener('hashchange', route);
  }

  /* Import DSL 浮层（动态创建，演示整图导入 = 仅校验） */
  function openImportDialog() {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal modal-wide">' +
        '<div class="modal-title"><span>Import DSL</span><button class="modal-close" data-cancel>×</button></div>' +
        '<p class="form-hint" style="margin:0 0 8px">Paste a <code>chartConfig</code> JSON. Import replaces the whole graph (whether it merges is still unconfirmed, spec §15).</p>' +
        '<textarea id="dsl-text" rows="12" spellcheck="false" style="width:100%;font-family:var(--mono);font-size:12px" placeholder=\'{ "componentName": "Page", "id": "node_page_0001", "children": [] }\'></textarea>' +
        '<div class="form-err hidden" id="dsl-err"></div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-default" data-cancel>Cancel</button>' +
          '<button class="btn btn-primary" data-ok>Import</button>' +
        '</div></div>';
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    overlay.querySelectorAll('[data-cancel]').forEach(function (b) { b.addEventListener('click', close); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('[data-ok]').addEventListener('click', function () {
      var text = overlay.querySelector('#dsl-text').value.trim();
      var err = overlay.querySelector('#dsl-err');
      if (!text) { err.textContent = 'Please paste a chartConfig JSON'; err.classList.remove('hidden'); return; }
      var parsed;
      try { parsed = JSON.parse(text); } catch (ex) {
        err.textContent = 'Invalid JSON: ' + ex.message;
        err.classList.remove('hidden');
        return;
      }
      if (!parsed || parsed.componentName !== 'Page' || !Array.isArray(parsed.children)) {
        err.textContent = 'Root must be { componentName: "Page", children: [...] }';
        err.classList.remove('hidden');
        return;
      }
      close();
      state.pipe.dirty = true;
      toast('DSL imported · ' + parsed.children.length + ' child node(s) parsed (graph not re-laid out in this prototype)');
    });
  }

  /* ══════════ 启动 ══════════ */

  bindEvents();
  if (!location.hash) location.hash = '#/';
  route();
})();
