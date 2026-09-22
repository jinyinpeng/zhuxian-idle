/* =========================================================================
 * 诛仙问道 · 视口适配
 *
 * 解决两件事：
 *   1. 老 iOS 没有 dvh，地址栏会吃掉底部导航 —— 写入 --vh（视口高度的 1%），
 *      CSS 在 @supports not (height:100dvh) 时用它兜底。
 *   2. 提供 --app-w（当前可用宽度），供需要按屏幕宽度取值的场景使用。
 *
 * 取 clientHeight（布局视口）而非 visualViewport：软键盘弹出时后者会变小，
 * 会把整个界面压扁。
 * ========================================================================= */
(function (global) {
  'use strict';
  const doc = global.document;
  const root = doc.documentElement;

  function syncViewport() {
    const h = root.clientHeight || global.innerHeight || 0;
    if (h) root.style.setProperty('--vh', (h / 100).toFixed(3) + 'px');
    const w = root.clientWidth || global.innerWidth || 0;
    if (w) root.style.setProperty('--app-w', Math.min(w, 520) + 'px');
  }

  syncViewport();
  global.addEventListener('resize', syncViewport);
  global.addEventListener('pageshow', syncViewport);
  global.addEventListener('orientationchange', function () { setTimeout(syncViewport, 220); });
  /* 地址栏收放只改布局视口，不触发 resize 的情形也覆盖一下 */
  doc.addEventListener('DOMContentLoaded', syncViewport);
  if (global.visualViewport) {
    global.visualViewport.addEventListener('resize', syncViewport);
  }
})(window);
