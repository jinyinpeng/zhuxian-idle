/* =========================================================================
 * 轻量 Render 垫片 —— 仅 3D 页（play3d.html）使用
 * -------------------------------------------------------------------------
 * 背景：3D 页要复用 2D 的面板体系 js/ui.js（行囊 / 技能 / 任务 / 社交 / 设置 /
 *       全部弹窗）。ui.js 对 Render 的依赖只有 6 个方法：
 *         esc / ic / toast / rebuildHero / refreshHeroBase / setDayMode
 *       2D 的 render.js 负责 canvas、立绘舞台、场景分层、挂机演出，在 3D 页
 *       既用不上、又会与 Three.js 抢 DOM 与帧循环，因此不引入它，
 *       这里只补 ui.js 真正需要的那部分。
 *
 * 必须在 js/ui.js 之前加载（ui.js 在 IIFE 顶部就取 global.Render）。
 * ========================================================================= */
(function (global) {
  'use strict';

  /* 与 render.js 的 esc 保持一致（ui.js 全程用它拼 HTML） */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Lucide SVG sprite 图标（sprite 由 js/icons.js 提供，图标一律不用 emoji） */
  function ic(name, cls) {
    return '<svg class="ic ' + (cls || '') + '"><use href="#i-' + name + '"></use></svg>';
  }

  /* 吐司：直接写 3D 页自己的 #toast（play3d 的 toast 在模块作用域里，外部取不到，
     所以这里按同一套表现自己实现一份，颜色沿用游戏内的语义色） */
  var toastT = 0;
  var TOAST_COLOR = { gold: '#facc15', jade: '#5eead4', bad: '#f87171', info: '#e7e5e4' };
  function toast(msg, cls) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.color = TOAST_COLOR[cls] || '#e7e5e4';
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('on'); }, 1500);
  }

  global.Render = {
    esc: esc,
    ic: ic,
    toast: toast,
    /* 以下三个在 2D 里负责立绘/昼夜场景。3D 页的角色与光照由 Three.js 管，
       做成空实现即可满足 ui.js 的调用，不会产生副作用。 */
    rebuildHero: function () { },
    refreshHeroBase: function () { },
    setDayMode: function () { }
  };
})(window);
