/* =========================================================================
 * 仙侠挂机 · 入口
 * 角色创建 / 存档加载 / 主循环
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.Game;
  const D = global.DATA;
  const FIG = global.FIGURE;

  let sectPick = 'qingyun';
  let genderPick = 'male';
  let started = false;
  let last = 0;
  let acc = 0;
  let saveT = 0;
  let ready = false;

  const NAME_A = ['青', '血', '叶', '苏', '白', '玄', '紫', '残', '月', '焚', '孤', '寒', '天', '灵', '墨', '雷', '碧', '无', '赤', '长'];
  const NAME_B = ['云子', '影', '孤鸿', '清月', '凤鸣', '机', '衫', '剑', '无痕', '天', '舟', '山雪', '罡', '虚', '琴心', '九天', '游', '相', '焰', '歌'];

  function $(id) { return document.getElementById(id); }
  function rndName() {
    return NAME_A[Math.floor(Math.random() * NAME_A.length)] + NAME_B[Math.floor(Math.random() * NAME_B.length)];
  }
  function ic(n, c) { return global.Render.ic(n, c); }

  /* ============================ 角色创建页 ============================ */
  function buildCreate() {
    renderSectList();
    renderSectInfo('qingyun');
    $('in-name').value = rndName();

    $('btn-name').addEventListener('click', () => { $('in-name').value = rndName(); });
    $('btn-start').addEventListener('click', () => {
      startGame();
      /* v24：进入游戏即开始背景音乐（这里一定是真实用户手势） */
      try { if (window.Music && window.Game.state.settings.music !== false) window.Music.start(); } catch (e) { }
    });

    /* v14：性别选择 */
    const grow = $('gender-row');
    if (grow) {
      grow.querySelectorAll('[data-gender]').forEach(btn => {
        btn.addEventListener('click', () => {
          genderPick = btn.getAttribute('data-gender');
          grow.querySelectorAll('[data-gender]').forEach(b => {
            b.classList.toggle('on', b.getAttribute('data-gender') === genderPick);
          });
          renderSectList();
        });
      });
    }
    /* 道号随机时按性别取候选名 */
  }

  function renderSectList() {
    $('sect-list').innerHTML = D.SECTS.map(s =>
      '<button class="sect-chip' + (s.id === sectPick ? ' on' : '') + (genderPick === 'female' ? ' gender-female' : '') + '" data-sect="' + s.id + '" style="color:' + s.color + '">' +
        '<span class="sc-fig">' + FIG.hero(s.id, genderPick) + '</span>' +
        '<span class="sc-name">' + s.name + '</span>' +
      '</button>'
    ).join('');
    $('sect-list').querySelectorAll('[data-sect]').forEach(n => {
      n.addEventListener('click', () => {
        sectPick = n.getAttribute('data-sect');
        renderSectList();
        renderSectInfo(sectPick);
      });
    });
  }

  const MULT_LABEL = { hp: '气血', atk: '攻击', def: '防御', crit: '暴击', dodge: '闪避', spd: '攻速' };
  /* 六角星顶点顺序：正上方起顺时针 —— 上(气血) 右上(攻击) 右下(防御) 下(暴击)
     左下(闪避) 左上(攻速)。顺序固定，门派之间才可比。 */
  const RADAR_AXES = ['hp', 'atk', 'def', 'crit', 'dodge', 'spd'];

  /* ---------------------------------------------------------------- 六角星属性面板
     把六项核心属性摊到正六边形的六个顶点上：网格圈 + 辐条 + 数值多边形 + 顶点数值。
     归一化：门派倍率大致在 0.80~1.70 之间，映射到半径的 0.08~1.0，
     这样"最小也看得见一点、最大也不会顶到框"。 */
  function hexRadar(mult, color) {
    const CX = 100, CY = 88, R = 52, LR = 73;
    const pt = (i, r) => {
      const a = (-90 + i * 60) * Math.PI / 180;
      return [CX + Math.cos(a) * r, CY + Math.sin(a) * r];
    };
    const n1 = v => (Math.round(v * 10) / 10).toFixed(1);
    const ratios = RADAR_AXES.map(k => Math.max(0.08, Math.min(1, (mult[k] - 0.80) / 0.90)));
    const top = ratios.indexOf(Math.max.apply(null, ratios));

    /* 网格：4 圈六边形 + 6 条辐条（走 currentColor，跟随日夜主题） */
    let grid = '';
    [0.25, 0.5, 0.75, 1].forEach((f, k) => {
      const pts = RADAR_AXES.map((_, i) => pt(i, R * f).map(n1).join(',')).join(' ');
      grid += '<polygon points="' + pts + '" fill="none" stroke="currentColor" stroke-opacity="' +
        (k === 3 ? '.30' : '.14') + '" stroke-width="' + (k === 3 ? '1.2' : '.8') + '"/>';
    });
    RADAR_AXES.forEach((_, i) => {
      const p = pt(i, R);
      grid += '<line x1="' + CX + '" y1="' + CY + '" x2="' + n1(p[0]) + '" y2="' + n1(p[1]) +
        '" stroke="currentColor" stroke-opacity=".14" stroke-width=".8"/>';
    });

    /* 数值多边形 + 顶点标记 + 顶点标签（名称一行、数值一行） */
    const poly = ratios.map((r, i) => pt(i, R * r).map(n1).join(',')).join(' ');
    let marks = '', labels = '';
    ratios.forEach((r, i) => {
      const p = pt(i, R * r), lp = pt(i, LR), hot = i === top;
      marks += '<circle cx="' + n1(p[0]) + '" cy="' + n1(p[1]) + '" r="' + (hot ? 3.1 : 2.2) + '" fill="' +
        (hot ? '#ffffff' : color) + '"' + (hot ? ' stroke="' + color + '" stroke-width="1.6"' : '') + '/>';
      const anchor = Math.abs(lp[0] - CX) < 6 ? 'middle' : (lp[0] > CX ? 'start' : 'end');
      const dy = lp[1] < CY - 20 ? -4 : (lp[1] > CY + 20 ? 10 : 5);
      labels += '<text x="' + n1(lp[0]) + '" y="' + n1(lp[1] + dy) + '" text-anchor="' + anchor +
        '" font-size="' + (hot ? '10.5' : '10') + '" font-weight="' + (hot ? '700' : '500') +
        '" fill="' + (hot ? color : 'currentColor') + '">' + MULT_LABEL[RADAR_AXES[i]] + '</text>' +
        '<text x="' + n1(lp[0]) + '" y="' + n1(lp[1] + dy + 10) + '" text-anchor="' + anchor +
        '" font-size="9.5" fill="currentColor" opacity=".62">' + mult[RADAR_AXES[i]].toFixed(2) + '</text>';
    });

    return '<div class="si-radar-wrap">' +
      '<svg class="si-radar" viewBox="0 0 200 186" xmlns="http://www.w3.org/2000/svg" aria-label="门派属性六角星">' +
        grid +
        '<polygon points="' + poly + '" fill="' + color + '" fill-opacity=".26" stroke="' + color +
          '" stroke-width="1.8" stroke-linejoin="round"/>' +
        marks + labels +
      '</svg>' +
      '<div class="si-radar-note">六角星外圈为该门派的属性上限，顶点越靠外越强</div>' +
      '</div>';
  }

  function renderSectInfo(id) {
    const s = D.SECTS.find(x => x.id === id);
    $('sect-info').innerHTML =
      '<div class="si-head">' +
        '<span class="si-name" style="color:' + s.color + '">' + s.name + '</span>' +
        '<span class="si-tag">' + s.tag + '</span>' +
      '</div>' +
      '<p class="si-motto">' + s.motto + '</p>' +
      '<p class="si-desc">' + s.desc + '</p>' +
      hexRadar(s.mult, s.color) +
      '<div class="si-passive">【' + s.passive.name + '】' + s.passive.desc + '</div>';
  }

  function startGame() {
    const name = ($('in-name').value || '').trim() || rndName();
    G.createCharacter(name.slice(0, 8), sectPick, genderPick);
    enterGame(false);
  }

  /* ============================ 进入游戏 ============================ */
  function enterGame(fromSave) {
    $('screen-create').classList.add('hidden');
    $('screen-game').classList.remove('hidden');

    if (!ready) {
      global.Render.init();
      global.UI.init();
      ready = true;
    } else {
      global.Render.refreshHeroBase();
      global.UI.renderTop();
    }

    if (fromSave) {
      const rep = G.offlineApply((Date.now() - G.state.lastSave) / 1000);
      global.Render.setRegion(G.regionOf(G.state.region));
      global.Render.refreshHud();
      global.Render.refreshHeroBase();
      global.UI.renderTop();
      if (rep) setTimeout(() => global.UI.openOffline(rep), 420);
    } else {
      global.Render.refreshHeroBase();
    }

    if (!started) {
      started = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  /* ============================ 主循环 ============================ */
  function loop(now) {
    requestAnimationFrame(loop);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;

    // 长时间切出 -> 视作离线
    if (dt > 5) {
      const rep = G.offlineApply(dt - 1.2);
      if (rep) {
        global.Render.refreshHeroBase();
        global.UI.renderTop();
        setTimeout(() => global.UI.openOffline(rep), 260);
      }
      dt = 0.016;
    }

    acc += dt;
    let steps = 0;
    while (acc >= 1 / 60 && steps < 8) { G.tick(1 / 60); acc -= 1 / 60; steps++; }
    if (acc > 1) acc = 0;

    global.Render.frame(dt);
    saveT += dt;
    if (saveT >= 8) { saveT = 0; G.save(); }
  }

  /* ============================ 启动 ============================ */
  function boot() {
    buildCreate();
    const st = G.load();
    if (st) {
      G.attachState(st);
      enterGame(true);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(boot, 0);
  } else {
    document.addEventListener('DOMContentLoaded', boot);
  }
  /* v26：自定义「下拉刷新」—— 下拉后松手即更新到最新版
     （游戏全屏 overflow:hidden，系统自带的下拉刷新不会触发，只能自己实现）

     与旧版（v15）的区别：
       · 旧版只能在屏幕顶部 22% 起手，从画面中间往下拉毫无反应 —— 现在全屏任意处皆可；
       · 旧版是「拖动过程中」就刷新，手指还没松开页面已经跳走 —— 现在改为松手才刷新，
         并实时提示「下拉更新 → 松手更新 → 正在更新…」；
       · 面板 / 弹窗里滚动条已离开顶部时让位给滚动，不会误触。 */
  (function pullToRefresh() {
    const THRESHOLD = 62;      /* 松手触发距离（px） */
    const MAX = 96;            /* 指示器最大跟手位移 */
    let sy = 0, sx = 0, dy = 0;
    let tracking = false, pulling = false, fired = false, firedAt = 0;
    let tip = null, tx = null;

    function build() {
      if (tip) return;
      tip = document.createElement('div');
      tip.className = 'pull-tip';
      tip.innerHTML = '<svg class="ic pull-ic"><use href="#i-refresh-cw"></use></svg>' +
        '<span class="pull-tx">下拉更新</span>';
      document.body.appendChild(tip);
      tx = tip.querySelector('.pull-tx');
    }
    function say(t) { build(); if (tx.textContent !== t) tx.textContent = t; }

    function paint(d) {
      build();
      tip.classList.add('on', 'pulling');
      tip.classList.remove('busy');
      const shift = Math.min(MAX, d * 0.62);
      tip.style.transform = 'translate(-50%,' + Math.round(shift - 46) + 'px)';
      tip.style.opacity = String(Math.min(1, d / 34));
      tip.style.setProperty('--rot', Math.round(Math.min(1, d / THRESHOLD) * 200) + 'deg');
      const ok = d >= THRESHOLD;
      tip.classList.toggle('ready', ok);
      say(ok ? '松手更新' : '下拉更新');
    }
    function reset() {
      tracking = false; pulling = false;
      if (!tip) return;
      tip.classList.remove('pulling', 'ready');
      tip.style.transform = '';
      tip.style.opacity = '';
      tip.style.removeProperty('--rot');
      tip.classList.remove('on');
    }

    /* 起手处若有「已经滚走」的可滚动容器，这次手势归它滚动。
       只看 scrollTop / scrollHeight，不依赖 getComputedStyle —— 个别浏览器会把
       overflow-y 取成空串，那样会把可滚动面板误判成可下拉刷新。 */
    function scrolled(node) {
      for (let n = node; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
        if (n.scrollTop > 2 && n.scrollHeight - n.clientHeight > 4) return true;
      }
      return false;
    }

    /* 松手后吞掉浏览器补发的那一次 click，避免误点到底下的按钮 */
    function eatClick() {
      const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener('click', kill, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', kill, true), 460);
    }

    function refresh() {
      fired = true;
      firedAt = Date.now();
      build();
      tip.classList.add('on', 'ready', 'busy');
      tip.classList.remove('pulling');
      tip.style.transform = 'translate(-50%,0)';
      tip.style.opacity = '1';
      say('正在更新…');
      try { if (G.state) G.save(); } catch (err) { }

      /* 带时间戳重载，强制绕过 CDN 与浏览器缓存拿到最新 HTML；
         顺带读一次 version.json，把「更新到哪个构建」带进新地址 */
      const go = (v) => global.location.replace(global.location.pathname +
        '?u=' + Date.now() + (v ? '&v=' + encodeURIComponent(v) : ''));
      let done = false;
      const fallback = setTimeout(() => { if (!done) { done = true; go(null); } }, 1500);
      if (typeof global.fetch !== 'function') { clearTimeout(fallback); go(null); return; }
      global.fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (done) return; done = true; clearTimeout(fallback); go(j && j.v); })
        .catch(() => { if (done) return; done = true; clearTimeout(fallback); go(null); });
    }

    /* 捕获阶段：顶栏按钮等元素不会把事件吞掉 */
    document.addEventListener('touchstart', function (e) {
      /* 上一次跳转迟迟没发生（被浏览器拦截等）→ 允许再试一次，别把下拉刷新锁死 */
      if (fired && Date.now() - firedAt > 2500) fired = false;
      if (e.touches.length !== 1 || fired) { tracking = false; return; }
      const t = e.touches[0];
      sy = t.clientY; sx = t.clientX; dy = 0;
      pulling = false;
      tracking = !scrolled(e.target);
    }, { passive: true, capture: true });

    document.addEventListener('touchmove', function (e) {
      if (!tracking || e.touches.length !== 1) return;
      const t = e.touches[0];
      dy = t.clientY - sy;
      if (!pulling) {
        /* 必须是明确的向下手势：纵向占优，且越过起手抖动与横滑 */
        if (dy < 8 || Math.abs(t.clientX - sx) > dy) {
          if (dy < 0) tracking = false;
          return;
        }
        pulling = true;
      }
      if (dy <= 0) { reset(); return; }      /* 反向拖动 → 放弃这次下拉 */
      paint(dy);
    }, { passive: true, capture: true });

    document.addEventListener('touchend', function () {
      if (!tracking) return;
      const fire = pulling && dy >= THRESHOLD;
      if (fire) { eatClick(); refresh(); return; }
      reset();
    }, { passive: true, capture: true });

    document.addEventListener('touchcancel', function () { if (!fired) reset(); },
      { passive: true, capture: true });
  })();

  global.addEventListener('beforeunload', () => { if (G.state) G.save(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state) {
      G.save();
      G.state.lastSave = Date.now();
    }
  });
})(window);
