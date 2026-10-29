/* Aimos — Orches Service 原型领域规则（纯逻辑，不碰 DOM）
 *
 * 依据：docs/orches-service/spec.md
 * - 版本状态三值（§1）：1 DRAFT / 2 ENABLED / 3 DISABLED
 * - Router 列是独立信号（§1）：只认版本自身的路由标志，不从 status 推导
 * - DISABLED 版本不可编辑（§4.2、§12.1，实测）
 * - 版本行第 4 个动作位随状态换文案（§4.2）：ENABLED → Disable，其余 → Enable
 * - 六种画布组件及其 props.type 与端口规则（§7.2，实测）
 *
 * 浏览器 <script> 直接引；node 直接 `node rules.js` 跑末尾断言。
 */
(function (root) {
  'use strict';

  /* 版本生命周期：接口给整数，展示层映射为枚举名 */
  var VERSION_STATUS = { 1: 'DRAFT', 2: 'ENABLED', 3: 'DISABLED' };

  function statusLabel(n) {
    return VERSION_STATUS[n] || '-';
  }

  /* Router 列描述「该版本是否在流量路由中」，与版本状态是两个独立维度（spec §1）。
   * 数据源是版本自身的路由标志（接口 routerTag），不从 status 推导 ——
   * 实测只确证 ENABLED 版本显示 ONLINE，DISABLED 版本的 Router 值未采集，
   * 所以「非 ONLINE 即 -」是唯一可以不带假设写出的规则。 */
  function routerLabel(routing) {
    return routing === 'ONLINE' ? 'ONLINE' : '-';
  }

  /* DISABLED 版本只读（实测：Edit 置灰） */
  function canEditVersion(status) {
    return status !== 'DISABLED';
  }

  /* 第 4 个动作位：ENABLED 时可停用，其余状态是「启用」入口 */
  function versionToggleLabel(status) {
    return status === 'ENABLED' ? 'Disable' : 'Enable';
  }

  /* 六种 componentName → props.type + 端口规则。Line 是边，没有端口。 */
  var NODE_TYPES = {
    Start: {
      componentName: 'Start',
      type: 'START',
      ports: ['r'],
      label: 'Start',
      desc: 'Entry point · declares output variables'
    },
    UDFProcessor: {
      componentName: 'UDFProcessor',
      type: 'INVOKE_UDF',
      ports: ['l', 'r'],
      label: 'UDF Processor',
      desc: 'Invoke a UDF (groovy / python)'
    },
    CallModel: {
      componentName: 'CallModel',
      type: 'CALL_MODEL',
      ports: ['l', 'r'],
      label: 'Call Model',
      desc: 'Call a deployed model build'
    },
    IfCondition2: {
      componentName: 'IfCondition2',
      type: 'CONDITION',
      ports: ['l', 'case1', 'case2'],
      label: 'If Condition',
      desc: 'Two-way condition split (case1 / case2)'
    },
    End: {
      componentName: 'End',
      type: 'END',
      ports: ['l'],
      label: 'End',
      desc: 'Exit · declares dependency and output mapping'
    },
    Line: {
      componentName: 'Line',
      type: null,
      ports: [],
      label: 'Line',
      desc: 'Edge between two nodes'
    }
  };

  function portsOf(componentName) {
    var def = NODE_TYPES[componentName];
    return def ? def.ports.slice() : [];
  }

  /* ---------- 导出（window + module.exports 两处） ---------- */

  var api = {
    VERSION_STATUS: VERSION_STATUS,
    statusLabel: statusLabel,
    routerLabel: routerLabel,
    canEditVersion: canEditVersion,
    versionToggleLabel: versionToggleLabel,
    NODE_TYPES: NODE_TYPES,
    portsOf: portsOf
  };

  if (root) {
    root.OrchesRules = api;
    root.VERSION_STATUS = VERSION_STATUS;
    root.statusLabel = statusLabel;
    root.routerLabel = routerLabel;
    root.canEditVersion = canEditVersion;
    root.versionToggleLabel = versionToggleLabel;
    root.NODE_TYPES = NODE_TYPES;
    root.portsOf = portsOf;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  /* ---------- 可运行自检（node rules.js） ---------- */

  if (typeof module !== 'undefined' && typeof window === 'undefined') {
    runAssertions();
  }

  function runAssertions() {
    var passed = 0;
    var failed = [];

    function check(name, cond) {
      if (cond) {
        passed++;
        console.log('PASS  ' + name);
      } else {
        failed.push(name);
        console.log('FAIL  ' + name);
      }
    }

    // 三个状态标签
    check("statusLabel(1) === 'DRAFT'", statusLabel(1) === 'DRAFT');
    check("statusLabel(2) === 'ENABLED'", statusLabel(2) === 'ENABLED');
    check("statusLabel(3) === 'DISABLED'", statusLabel(3) === 'DISABLED');

    // Router 列：只认显式的路由标志，不从 status 推导
    check("routerLabel('ONLINE') === 'ONLINE'", routerLabel('ONLINE') === 'ONLINE');
    check("routerLabel('-') === '-'", routerLabel('-') === '-');
    check('routerLabel(undefined) === "-"', routerLabel(undefined) === '-');
    check('routerLabel(ENABLED) 不因状态推出 ONLINE', routerLabel('ENABLED') === '-');

    // DISABLED 不可编辑，其余可编辑
    check('canEditVersion(DISABLED) === false', canEditVersion('DISABLED') === false);
    check('canEditVersion(DRAFT) === true', canEditVersion('DRAFT') === true);
    check('canEditVersion(ENABLED) === true', canEditVersion('ENABLED') === true);

    // 版本切换按钮文案
    check("versionToggleLabel('ENABLED') === 'Disable'", versionToggleLabel('ENABLED') === 'Disable');
    check("versionToggleLabel('DISABLED') === 'Enable'", versionToggleLabel('DISABLED') === 'Enable');
    check("versionToggleLabel('DRAFT') === 'Enable'", versionToggleLabel('DRAFT') === 'Enable');

    // 六种节点端口数
    check('portsOf(Start).length === 1', portsOf('Start').length === 1);
    check('portsOf(UDFProcessor).length === 2', portsOf('UDFProcessor').length === 2);
    check('portsOf(CallModel).length === 2', portsOf('CallModel').length === 2);
    check('portsOf(IfCondition2).length === 3', portsOf('IfCondition2').length === 3);
    check('portsOf(End).length === 1', portsOf('End').length === 1);
    check('portsOf(Line).length === 0', portsOf('Line').length === 0);

    // 端口方向细节
    check("Start only has 'r'", portsOf('Start').join() === 'r');
    check("End only has 'l'", portsOf('End').join() === 'l');
    check("IfCondition2 ports are l,case1,case2", portsOf('IfCondition2').join() === 'l,case1,case2');

    // props.type 映射
    check("Start.type === 'START'", NODE_TYPES.Start.type === 'START');
    check("UDFProcessor.type === 'INVOKE_UDF'", NODE_TYPES.UDFProcessor.type === 'INVOKE_UDF');
    check("CallModel.type === 'CALL_MODEL'", NODE_TYPES.CallModel.type === 'CALL_MODEL');
    check("IfCondition2.type === 'CONDITION'", NODE_TYPES.IfCondition2.type === 'CONDITION');
    check("End.type === 'END'", NODE_TYPES.End.type === 'END');
    check('Line.type === null', NODE_TYPES.Line.type === null);

    // 未知组件退化为无端口，不抛异常
    check('portsOf(unknown) === []', portsOf('FeatureGroup2').length === 0);

    if (failed.length) {
      console.log('\n' + failed.length + ' failed / ' + (passed + failed.length) + ' total');
      if (typeof process !== 'undefined') process.exitCode = 1;
    } else {
      console.log('\nAll ' + passed + ' assertions passed.');
    }
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
