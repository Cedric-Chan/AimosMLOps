/* Aimos — Agent Service 原型：领域规则（纯逻辑，不碰 DOM）
 *
 * 口径来源：docs/agent-service/spec.md
 * - §3    onlineStatus：0 = UnDeployed，1 = Online；API Debug 仅 Online 可点
 * - §7.1  Deploy 的前置是 Space 资源，不是 onlineStatus
 * - §5.2  "A prompt is required to save or publish." → 空 Prompt 不可保存/发布
 * - §11.2 Agent 接口时间是毫秒时间戳，Orches 是 ISO 字符串，展示层统一格式化
 *
 * 本文件同时被浏览器 <script> 与 node 直接引入：末尾的断言在 node 下运行。
 */
(function (root) {
  'use strict';

  /* 应用级在线状态（spec §3）。UAT 实测只有这两个取值。 */
  var ONLINE_STATUS = { 0: 'UnDeployed', 1: 'Online' };

  /* 未知输入返回 Unknown，而不是猜一个标签（例如把 undefined 当 UnDeployed）。 */
  function onlineLabel(n) {
    var key = Number(n);
    return Object.prototype.hasOwnProperty.call(ONLINE_STATUS, key) ? ONLINE_STATUS[key] : 'Unknown';
  }

  /* 唯一一条由 onlineStatus 直接决定的门控（spec §9 硬门控 1）。 */
  function canApiDebug(onlineStatus) {
    return Number(onlineStatus) === 1;
  }

  /* 部署记录的状态标签（spec §7.3）。只做标签枚举与颜色映射，
   * 不表达先后顺序或终态——状态机未被实测确认。 */
  var DEPLOY_STATUSES = ['Pending', 'Building', 'Deploying', 'Success', 'Offline', 'Failed'];

  /* Deploy ⇐ Space 资源已就绪（spec §7.1 / §9 硬门控 2），与 onlineStatus 无关。 */
  function canDeploy(hasSpaceResource) {
    return hasSpaceResource === true;
  }

  /* 空 Prompt 不可保存、不可发布（spec §5.2 提示语定义的一条硬规则）。 */
  function canPublish(promptText) {
    return typeof promptText === 'string' && promptText.trim().length > 0;
  }

  /* 毫秒时间戳 → 'YYYY-MM-DD HH:mm:ss'（本地时区，spec §11.2）。
   * 兼容数字字符串与 ISO 字符串（后者来自 Orches），无法解析时返回 '—'。 */
  function formatTs(ms) {
    var d;
    if (ms instanceof Date) d = ms;
    else if (typeof ms === 'string' && /^\d+$/.test(ms.trim())) d = new Date(Number(ms.trim()));
    else d = new Date(ms);
    if (isNaN(d.getTime())) return '—';
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
      ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  var API = {
    ONLINE_STATUS: ONLINE_STATUS,
    onlineLabel: onlineLabel,
    canApiDebug: canApiDebug,
    DEPLOY_STATUSES: DEPLOY_STATUSES,
    canDeploy: canDeploy,
    canPublish: canPublish,
    formatTs: formatTs,
  };

  /* 浏览器：挂 window；node：挂 module.exports 并跑自检 */
  if (root) {
    for (var k in API) root[k] = API[k];
    root.AGENT_RULES = API;
  }

  if (typeof module !== 'undefined') {
    module.exports = API;

    var results = [];
    var check = function (name, cond) { results.push([name, !!cond]); };

    check('onlineLabel(0) === "UnDeployed"', API.onlineLabel(0) === 'UnDeployed');
    check('onlineLabel(1) === "Online"', API.onlineLabel(1) === 'Online');
    check('onlineLabel(1) !== "UnDeployed"', API.onlineLabel(1) !== 'UnDeployed');

    check('canApiDebug(1) === true  (Online)', API.canApiDebug(1) === true);
    check('canApiDebug(0) === false (UnDeployed 置灰)', API.canApiDebug(0) === false);
    check('canApiDebug(undefined) === false', API.canApiDebug(undefined) === false);

    check('canDeploy(true) === true  (已有 Space 资源)', API.canDeploy(true) === true);
    check('canDeploy(false) === false (未申请 Space 资源)', API.canDeploy(false) === false);
    check('canDeploy(undefined) === false', API.canDeploy(undefined) === false);

    check('canPublish("") === false', API.canPublish('') === false);
    check('canPublish("   \\n ") === false (纯空白也算空)', API.canPublish('   \n ') === false);
    check('canPublish(null) === false', API.canPublish(null) === false);
    check('canPublish("You are a KYC reviewer.") === true', API.canPublish('You are a KYC reviewer.') === true);

    check('DEPLOY_STATUSES 为 6 个实测标签',
      API.DEPLOY_STATUSES.length === 6 &&
      ['Pending', 'Building', 'Deploying', 'Success', 'Offline', 'Failed']
        .every(function (s) { return API.DEPLOY_STATUSES.indexOf(s) !== -1; }));

    /* 固定时间戳：用本地时间分量构造，断言精确输出（含零填充） */
    var fixed = new Date(2025, 2, 5, 4, 6, 7).getTime();
    check('formatTs(fixed) === "2025-03-05 04:06:07"',
      API.formatTs(fixed) === '2025-03-05 04:06:07');
    check('formatTs(NaN) === "—"', API.formatTs(NaN) === '—');

    var failed = results.filter(function (r) { return !r[1]; });
    results.forEach(function (r) { console.log((r[1] ? 'PASS  ' : 'FAIL  ') + r[0]); });
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
    if (failed.length) process.exitCode = 1;
  }
})(typeof window !== 'undefined' ? window : null);
