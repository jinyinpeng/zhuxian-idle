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

  function renderSectInfo(id) {
    const s = D.SECTS.find(x => x.id === id);
    let bars = '';
    Object.keys(MULT_LABEL).forEach(k => {
      const v = s.mult[k];
      const r = Math.max(0.06, Math.min(1, (v - 0.80) / 0.90));
      bars += '<div class="si-bar" style="color:' + s.color + '">' +
        '<span class="lab">' + MULT_LABEL[k] + '</span>' +
        '<span class="track"><span class="fill" style="width:' + (r * 100).toFixed(0) + '%"></span></span>' +
        '<span class="mono" style="width:34px;text-align:right">' + v.toFixed(2) + '</span>' +
      '</div>';
    });
    $('sect-info').innerHTML =
      '<div class="si-head">' +
        '<span class="si-name" style="color:' + s.color + '">' + s.name + '</span>' +
        '<span class="si-tag">' + s.tag + '</span>' +
      '</div>' +
      '<p class="si-motto">' + s.motto + '</p>' +
      '<p class="si-desc">' + s.desc + '</p>' +
      '<div class="si-bars">' + bars + '</div>' +
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
  /* v15：自定义「下拉刷新」—— 从屏幕顶部下拉即可拉到最新版
     （游戏全屏 overflow:hidden，系统自带的下拉刷新不会触发） */
  (function pullToRefresh() {
    let sy = 0, armed = false, fired = false, tip = null;
    function showTip(ok) {
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'pull-tip';
        document.body.appendChild(tip);
      }
      tip.textContent = ok ? '松手刷新' : '下拉刷新';
      tip.classList.add('on');
      tip.classList.toggle('ready', !!ok);
    }
    function hideTip() { if (tip) tip.classList.remove('on', 'ready'); }
    /* 用捕获阶段：顶栏按钮等元素不会把事件吞掉 */
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { armed = false; return; }
      sy = e.touches[0].clientY;
      /* 顶部区域起手，且不在面板/弹窗内（面板顶部正好压在起手区，必须排除） */
      var inside = !!(e.target && e.target.closest && e.target.closest('.sheet, .modal-host, .create-inner'));
      armed = !inside && sy < global.innerHeight * 0.22;
      fired = false;
    }, { passive: true, capture: true });
    document.addEventListener('touchmove', function (e) {
      if (!armed || fired || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - sy;
      if (dy > 18) showTip(dy > 58);
      if (dy > 58) {                            /* 阈值降到 58px，更易触发 */
        fired = true;
        if (G.state) { try { G.save(); } catch (err) {} }
        location.replace(location.pathname + '?u=' + Date.now());
      }
    }, { passive: true, capture: true });
    document.addEventListener('touchend', function () { armed = false; setTimeout(hideTip, 120); }, { passive: true, capture: true });
    document.addEventListener('touchcancel', function () { armed = false; hideTip(); }, { passive: true, capture: true });
  })();

  global.addEventListener('beforeunload', () => { if (G.state) G.save(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state) {
      G.save();
      G.state.lastSave = Date.now();
    }
  });
})(window);
