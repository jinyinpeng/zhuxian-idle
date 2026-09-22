/* =========================================================================
 * 仙侠挂机 · 渲染层
 * 场景背景 / 粒子特效 / 战斗单位 / 飘字 / 战斗日志 / 横幅
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.Game;
  const D = global.DATA;
  const FIG = global.FIGURE;

  const FAMILY = {
    beast: { ic: 'bone', color: '#fbbf24', label: '妖兽' },
    ghost: { ic: 'ghost', color: '#a78bfa', label: '幽魂' },
    demon: { ic: 'flame', color: '#f87171', label: '魔物' },
    human: { ic: 'swords', color: '#60a5fa', label: '修士' },
    boss: { ic: 'skull', color: '#f43f5e', label: '妖将' }
  };

  const el = {};
  let cvs, ctx, dpr = 1, W = 0, H = 0;
  let motes = [], sparks = [];
  let stageRect = null;
  let ui = {};   // 缓存：hero/mob 节点

  function ic(name, cls) {
    return '<svg class="ic ' + (cls || '') + '"><use href="#i-' + name + '"></use></svg>';
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function $(id) { return document.getElementById(id); }

  /* ============================ 初始化 ============================ */
  function init() {
    el.stage = $('stage');
    el.sky = $('sky');
    el.ridgeFar = $('ridge-far');
    el.ridgeMid = $('ridge-mid');
    el.ridgeNear = $('ridge-near');
    el.hud = $('hud-top');
    el.arena = $('arena');
    el.cast = $('cast-layer');
    el.float = $('float-layer');
    el.log = $('log-box');
    el.dash = $('dash');
    cvs = $('fx');
    ctx = cvs.getContext('2d');

    buildHud();
    buildArena();
    buildDash();
    resize();
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', () => setTimeout(resize, 220));
    global.addEventListener('resize', () => setTimeout(alignGround, 260));   /* v22 */

    bindGame();
    applyMode();
    mountHeroSkeleton();   /* v22：骨骼角色（默认关闭） */
    mountHeroFig();        /* v23：立绘动作（默认启用，形象不变） */
    setRegion(G.regionOf(G.state.region));
    G.state.log.forEach(e => pushLog(e, true));
  }

  function resize() {
    if (!cvs) return;
    /* v15 性能：DPR 从 2.5 降到 1.75 —— 像素量约减半，肉眼几乎无差 */
    dpr = Math.min(1.75, global.devicePixelRatio || 1);
    const r = el.stage.getBoundingClientRect();
    W = r.width; H = r.height;
    cvs.width = Math.floor(W * dpr);
    cvs.height = Math.floor(H * dpr);
    cvs.style.width = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stageRect = null;
    seedMotes();
  }

  function seedMotes() {
    motes = [];
    const n = Math.round(Math.min(22, Math.max(10, W / 16)));
    for (let i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.7 + Math.random() * 1.9,
        vy: -6 - Math.random() * 18,
        vx: (Math.random() - 0.5) * 8,
        a: 0.15 + Math.random() * 0.5,
        p: Math.random() * Math.PI * 2
      });
    }
  }

  /* ============================ 场景 ============================ */
  /* v17：日间模式 —— 把夜空配色向"晨光白青"提亮，山峦随之变亮（无需手改 8 张地图） */
  function isDay() { return !(G.state && G.state.settings && G.state.settings.dayMode === false); }
  function dayMix(hex, t) { return mix(hex, '#e6f4f8', t); }

  function setRegion(r) {
    if (!r) return;
    /* v4：切换地图专属地形（.stage[data-region] 控制 .scenery 里显示哪一组） */
    if (el.stage) {
      el.stage.setAttribute('data-region', r.id);
      applyMode(el.stage);
    }
    const day = isDay();
    if (day) {
      /* 日间：天空接近天青，远山淡青、近山青绿，整体明亮通透 */
      el.sky.style.background =
        'radial-gradient(circle at 74% 12%, ' + hexA('#fff6d8', .5) + ', transparent 52%),' +
        'radial-gradient(circle at 22% 72%, ' + hexA(r.accent, .12) + ', transparent 46%),' +
        'linear-gradient(180deg, ' + dayMix(r.sky[0], .78) + ' 0%, ' + dayMix(r.sky[1], .62) + ' 100%)';
      el.sky.style.setProperty('--sky-glow', hexA('#ffeec2', .3));
      el.ridgeFar.style.background = 'linear-gradient(180deg,' + dayMix(r.sky[0], .62) + ',' + dayMix(mix(r.sky[1], r.accent, .3), .34) + ')';
      el.ridgeMid.style.background = 'linear-gradient(180deg,' + dayMix(r.sky[0], .40) + ',' + dayMix(r.ground, .34) + ')';
      el.ridgeNear.style.background = 'linear-gradient(180deg,' + dayMix(r.ground, .24) + ',' + dayMix(r.ground, .05) + ')';
      refreshHud();
      return;
    }
    el.sky.style.background =
      'radial-gradient(circle at 76% 16%, ' + hexA(r.accent, .16) + ', transparent 46%),' +
      'linear-gradient(180deg, ' + r.sky[0] + ' 0%, ' + r.sky[1] + ' 100%)';
    el.sky.style.setProperty('--sky-glow', hexA(r.accent, .18));
    el.ridgeFar.style.background = 'linear-gradient(180deg,' + mix(r.sky[0], r.accent, .18) + ',' + mix(r.sky[1], '#000', .35) + ')';
    el.ridgeMid.style.background = 'linear-gradient(180deg,' + mix(r.sky[0], r.accent, .10) + ',' + r.ground + ')';
    el.ridgeNear.style.background = 'linear-gradient(180deg,' + r.ground + ',' + mix(r.ground, '#000', .45) + ')';
    refreshHud();
    pulse(0.35);
  }

  function hexA(hex, a) {
    const c = hx(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function mix(a, b, t) {
    const A = hx(a), B = hx(b);
    const r = Math.round(A[0] + (B[0] - A[0]) * t);
    const g = Math.round(A[1] + (B[1] - A[1]) * t);
    const bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function hx(h) {
    h = (h || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  /* v17：把日/夜写到 <html data-mode>，CSS 据此隐藏月亮星空、调整透光与暗角 */
  function applyMode(node) {
    const mode = isDay() ? 'day' : 'night';
    document.documentElement.setAttribute('data-mode', mode);
    if (node || el.stage) (node || el.stage).setAttribute('data-scene-mode', mode);
  }
  function setDayMode(on) {
    if (!G.state) return;
    if (!G.state.settings) G.state.settings = {};
    G.state.settings.dayMode = !!on;
    applyMode();
    setRegion(G.regionOf(G.state.region));
  }

  function pulse(a) {
    el.stage.style.transition = 'box-shadow .4s';
    el.stage.style.boxShadow = 'inset 0 0 90px ' + (a > 0.5 ? 'rgba(250,204,21,.35)' : 'rgba(0,0,0,0)');
    setTimeout(() => { el.stage.style.boxShadow = 'none'; }, 420);
  }

  /* ============================ HUD ============================ */
  function buildHud() {
    el.hud.innerHTML =
      '<button class="region-tag" id="region-tag">' +
        '<span class="dot"></span><span id="region-name"></span>' +
        ic('chevron-right', 'ic-xs') +
      '</button>' +
      '<div class="hud-right">' +
        '<div class="hud-pill" id="hud-rate">' + ic('coins', 'ic-xs') + '<span>--</span></div>' +
        '<div class="hud-pill" id="hud-drop">' + ic('package', 'ic-xs') + '<span>0</span></div>' +
      '</div>';
    refreshHud();
  }
  let lastRegionId = '';
  function refreshHud() {
    const r = G.regionOf(G.state.region);
    const n = $('region-name');
    if (n) n.textContent = r.name + ' Lv.' + r.range[0] + '-' + r.range[1];
    /* v22：换地图时主角走一段（首次进入不播） */
    if (lastRegionId && lastRegionId !== r.id) walkBriefly(1700);
    lastRegionId = r.id;
  }

  /* ============================ 战斗单位 ============================ */
  /* ===================== v22：骨骼角色（程序化 2.5D 骨骼） =====================
     立绘是整张静态图、没有骨架，所以这里用骨骼链重建：
     每根骨头是继承了父骨变换的节点，旋转发生在关节（transform-origin），
     配合 rotateY / rotateX 形成 3D 姿态，并由步态周期与姿态关键帧驱动。 */
  let heroSkel = null;
  let mobSkels = [];
  let groundT = 0;
  let heroFig = null;      /* v23：立绘动作控制器（形象不变） */
  let mobFigs = [];

  /* 5 类怪物的骨骼形态（体型 / 姿态 / 配色 / 武器 / 角尾翼） */
  const MOB_SKEL = {
    beast: {
      scale: 1.0, style: 'beast', hunch: 15, big: 1.08, horns: true, tail: true, blade: false,
      robe: 'rgba(158,98,54,.96)', robeDark: 'rgba(104,62,32,.95)', sleeve: 'rgba(146,90,50,.95)',
      skin: 'rgba(202,148,98,.96)', boot: 'rgba(58,36,20,.95)', hair: 'rgba(60,38,22,.95)'
    },
    ghost: {
      scale: 1.02, style: 'ghost', hover: 1, blade: false, big: 1.0,
      robe: 'rgba(186,222,244,.62)', robeDark: 'rgba(126,170,202,.55)', sleeve: 'rgba(172,212,238,.55)',
      skin: 'rgba(216,238,250,.66)', boot: 'rgba(126,158,188,.42)', hair: 'rgba(40,44,60,.7)'
    },
    demon: {
      scale: 1.14, style: 'demon', hunch: 8, big: 1.06, horns: true, tail: true, wing: true, blade: false,
      robe: 'rgba(92,32,54,.96)', robeDark: 'rgba(58,20,38,.95)', sleeve: 'rgba(84,28,50,.95)',
      skin: 'rgba(146,70,88,.96)', boot: 'rgba(38,14,24,.95)', hair: 'rgba(28,10,18,.95)'
    },
    human: {
      scale: 1.02, style: 'human', hunch: 3, blade: true,
      robe: 'rgba(208,208,216,.95)', robeDark: 'rgba(140,142,154,.95)', sleeve: 'rgba(198,200,210,.94)',
      skin: 'rgba(232,204,180,.96)', boot: 'rgba(46,42,54,.95)', hair: 'rgba(34,30,40,.95)'
    },
    boss: {
      scale: 1.3, style: 'boss', hunch: 10, big: 1.14, horns: true, tail: true, wing: true, blade: false,
      robe: 'rgba(70,24,44,.97)', robeDark: 'rgba(44,14,30,.96)', sleeve: 'rgba(64,22,42,.96)',
      skin: 'rgba(128,58,76,.97)', boot: 'rgba(30,10,18,.96)', hair: 'rgba(24,8,14,.96)'
    }
  };
  function mountMobSkeletons(list) {
    mobSkels.forEach(function (s) { if (s) { try { s.destroy(); } catch (e) { } } });
    mobSkels = [];
    if (!skelOn()) return;
    (ui.mobs || []).forEach(function (m, i) {
      if (!m || !m.node) { mobSkels.push(null); return; }
      const host = m.node.querySelector('.avatar');
      if (!host) { mobSkels.push(null); return; }
      const stale = host.querySelector('.skel');
      if (stale) stale.remove();
      const info = list[i] || {};
      const f = FAMILY[info.family] || FAMILY.beast;
      const look = MOB_SKEL[info.family] || MOB_SKEL.beast;
      const opt = {};
      for (const k in look) opt[k] = look[k];
      opt.color = info.elite ? FAMILY.boss.color : f.color;
      opt.flip = true;                       /* 怪物面向左 */
      const sk = global.Skeleton.mount(host, opt);
      m.node.classList.add('use-skeleton');
      mobSkels.push(sk);
    });
  }
  /* 让主角与怪物踩在同一条地面线上（骨骼模式下才需要：
     两者所在容器的底边并不一致，靠布局对齐会把单位压进日志区） */
  function alignGround() {
    if (!heroSkel || !heroSkel.nodes || !heroSkel.nodes.footR) return;
    const base = (heroSkel.skin.legLen - 3) * heroSkel.skin.scale;
    /* 以「主目标」为准（其余怪是错落站位，底边本就不同）；
       出场/死亡动画期间位置不准，跳过 */
    const mobFootLow = function () {
      const s = mobSkels[0];
      if (!s || !s.nodes || !s.nodes.footR) return null;
      const unit = s.wrap.parentNode && s.wrap.parentNode.closest ? s.wrap.parentNode.closest('.unit') : null;
      if (unit && (unit.classList.contains('spawning') || unit.classList.contains('dying'))) return null;
      return s.nodes.footR.getBoundingClientRect().bottom;
    };
    /* 迭代两次收敛（bottom 越大越高，所以要减去差值） */
    for (let pass = 0; pass < 2; pass++) {
      const target = mobFootLow();
      if (target === null) break;
      const heroFoot = heroSkel.nodes.footR.getBoundingClientRect().bottom;
      const diff = target - heroFoot;
      if (Math.abs(diff) < 1.5) break;
      const cur = parseFloat(heroSkel.wrap.style.bottom);
      heroSkel.wrap.style.bottom = ((isNaN(cur) ? base : cur) - diff) + 'px';
    }
  }
  /* 短暂走一段（换地图时用：步态周期真正跑起来，而不只是站桩） */
  let walkTimer = null;
  function walkBriefly(ms) {
    if (heroFig) heroFig.setMode('walk');   /* v23：立绘走一段 */
    if (!heroSkel) return;
    heroSkel.motion.setMode('walk');
    if (walkTimer) clearTimeout(walkTimer);
    walkTimer = setTimeout(function () {
      if (heroSkel && heroSkel.motion.mode === 'walk') heroSkel.motion.setMode('idle');
    }, ms || 1700);
  }
  function setMobPose(idx, mode) {
    const s = mobSkels[idx || 0];
    if (s) s.motion.setMode(mode);
  }

  /* ===================== v23：立绘动作（形象不变，只加动作） =====================
     把原立绘放进「地面→腰→转身→体」的关节层级里，由 FigureMotion 驱动：
     呼吸起伏、重心转移、前倾后仰、扭腰、3D 转身、起跳与落地缓冲。 */
  function figMotionOn() {
    if (skelOn()) return false;                       /* 换成骨骼小人时不重复驱动 */
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !(G.state && G.state.settings && G.state.settings.figureMotion === false);
  }
  function mountFigMotion(node) {
    if (!figMotionOn() || !global.FigureMotion) return null;
    try { return global.FigureMotion.mount(node, {}); } catch (e) { return null; }
  }
  function mountHeroFig() {
    if (!ui.hero) return;
    heroFig = mountFigMotion(ui.hero);
  }
  function mountMobFigs() {
    mobFigs = [];
    (ui.mobs || []).forEach(function (m) {
      mobFigs.push(m && m.node ? mountFigMotion(m.node) : null);
    });
  }
  function setFigPose(mode) {
    if (heroFig) heroFig.setMode(mode);
  }
  function setMobFigPose(idx, mode) {
    const f = mobFigs[idx || 0];
    if (f) f.setMode(mode);
  }

  function skelOn() {
    /* 默认关闭：保留仙侠立绘形象。只有显式开启才换成骨骼小人 */
    return !!(G.state && G.state.settings && G.state.settings.skeleton === true);
  }
  function mountHeroSkeleton() {
    if (!skelOn() || !ui.hero) return;
    const host = ui.hero.querySelector('.avatar');
    if (!host) return;
    if (heroSkel) { heroSkel.destroy(); heroSkel = null; }
    const stale = host.querySelector('.skel');
    if (stale) stale.remove();
    const sect = G.sectOf(G.state.sect);
    const sk = global.Skeleton.mount(host, {
      scale: 1.14,
      color: sect.color,
      robe: 'rgba(238,240,246,.97)',
      robeDark: 'rgba(150,158,174,.95)',
      sleeve: 'rgba(228,232,240,.95)',
      skin: 'rgba(242,216,192,.97)',
      boot: 'rgba(48,44,58,.95)',
      outline: 'rgba(8,10,14,.6)'
    });
    heroSkel = sk;
    ui.hero.classList.add('use-skeleton');
    if (el.arena) el.arena.classList.add('skel-mode');   /* 底部对齐：双方同踩一条地面线 */
  }
  function setHeroPose(mode) {
    if (heroSkel) heroSkel.motion.setMode(mode);
  }

  function buildArena() {
    const st = G.stats();
    const sect = G.sectOf(G.state.sect);
    el.arena.innerHTML =
      '<div class="unit hero ' + ((G.state.gender === 'female') ? 'gender-female' : 'gender-male') + '" id="u-hero">' +
        '<div class="avatar" style="color:' + sect.color + '">' + FIG.hero(sect.id, (G.state.gender || 'male')) +
          '<div class="flight" aria-hidden="true">' + treasureSvg(sect.id, sect.color) + '</div>' +
          '<div class="orbs" aria-hidden="true"><i></i><i></i><i></i></div>' +
        '</div>' +
        '<div class="hero-bars">' +
          '<div class="bar-hp" id="hero-hp"><b style="width:100%"></b><i style="width:100%"></i><span></span></div>' +
          '<div class="bar-mp" id="hero-mp"><i style="width:100%"></i></div>' +
        '</div>' +
        '<div class="name-plate"><span class="lv" id="hero-lv">Lv.' + G.state.level + '</span>' + esc(G.state.name) + '</div>' +
      '</div>' +
      '<div class="mob-row" id="mob-row"></div>';
    ui.hero = $('u-hero');
    ui.heroLv = $('hero-lv');
    ui.heroHp = $('hero-hp');
    ui.heroHpG = ui.heroHp.querySelector('b');
    ui.heroHpI = ui.heroHp.querySelector('i');
    ui.heroHpS = ui.heroHp.querySelector('span');
    ui.heroMp = $('hero-mp');
    ui.heroMpI = ui.heroMp.querySelector('i');
    ui.mob = $('u-mob');
    refreshHeroBase();
  }

  /* v19：切换性别后重建主角立绘（若 assets 里有女版图则换成女版，否则靠镜像区分） */
  function rebuildHero() {
    if (!ui.hero) return;
    const sect = G.sectOf(G.state.sect);
    if (!sect) return;
    const av = ui.hero.querySelector('.avatar');
    if (!av) return;
    const old = av.querySelector('.fig');
    const holder = document.createElement('div');
    holder.innerHTML = FIG.hero(sect.id, (G.state.gender || 'male'));
    const next = holder.firstChild;
    if (old && next) av.replaceChild(next, old);
    refreshHeroBase();
  }

  function refreshHeroBase() {
    const st = G.stats();
    /* v14：同步性别类（镜像由 CSS 变量 --fx 控制，不需要重建立绘） */
    if (ui.hero) {
      const isF = (G.state.gender === 'female');
      ui.hero.classList.toggle('gender-female', isF);
      ui.hero.classList.toggle('gender-male', !isF);
    }
    if (ui.heroLv) ui.heroLv.textContent = 'Lv.' + G.state.level;
    if (ui.heroHpS) ui.heroHpS.textContent = G.fmt(st.hp * G.state.hp) + ' / ' + G.fmt(st.hp);
    updateBars();
  }

  /* v5 群怪：一次渲染一整群，每只独立节点/血条 */
  function renderMobs(list) {
    const row = $('mob-row');
    if (!row) return;
    if (!list || !list.length) {
      row.innerHTML = ''; ui.mobs = []; ui.mob = null;
      ui.mobHp = ui.mobHpI = ui.mobHpG = ui.mobHpS = null;
      return;
    }
    row.innerHTML = list.map(function (m, i) {
      const f = FAMILY[m.family] || FAMILY.beast;
      const col = m.elite ? FAMILY.boss.color : f.color;
      /* 第 1 只沿用旧 id（u-mob / mob-hp），保证既有测试与旧引用可用 */
      const idAttr = i === 0 ? ' id="u-mob"' : '';
      const barId = i === 0 ? ' id="mob-hp"' : '';
      return '<div class="unit mob spawning' + (m.elite ? ' elite' : '') + '" data-idx="' + i + '"' + idAttr + '>' +
        '<div class="name-plate">' +
          (m.elite ? ic('crown', 'ic-xs') : '') +
          '<span class="lv">Lv.' + m.lv + '</span>' + esc(m.name) +
        '</div>' +
        '<div class="bar-hp mob"' + barId + '><b style="width:100%"></b><i style="width:100%"></i><span></span></div>' +
        '<div class="avatar" style="color:' + col + '">' + FIG.monster(m.family, m.elite) + '</div>' +
      '</div>';
    }).join('');
    ui.mobs = [];
    for (let i = 0; i < list.length; i++) {
      const node = row.querySelector('[data-idx="' + i + '"]');
      if (!node) { ui.mobs.push(null); continue; }
      ui.mobs.push({
        node: node,
        hpI: node.querySelector('.bar-hp > i'),
        hpG: node.querySelector('.bar-hp > b'),
        hpS: node.querySelector('.bar-hp > span')
      });
    }
    mountMobSkeletons(list);   /* v22：为每只怪物挂骨骼角色 */
    setTimeout(alignGround, 640);  /* 等出场动画（0.5s）结束再量，避免量到缩放中的位置 */
    mountMobFigs();   /* v23：怪物立绘动作 */
    const first = ui.mobs[0];
    ui.mob = first ? first.node : null;
    ui.mobHpI = first ? first.hpI : null;
    ui.mobHpG = first ? first.hpG : null;
    ui.mobHpS = first ? first.hpS : null;
    setTimeout(function () {
      if (row) row.querySelectorAll('.spawning').forEach(function (n) { n.classList.remove('spawning'); });
    }, 420);
    updateBars();
  }

  function mobNode(idx) {
    if (ui.mobs && ui.mobs[idx] && ui.mobs[idx].node) return ui.mobs[idx].node;
    return ui.mob;
  }

  function updateBars() {
    const st = G.stats();
    if (ui.heroHpI) ui.heroHpI.style.width = (G.state.hp * 100).toFixed(1) + '%';
    if (ui.heroMpI) ui.heroMpI.style.width = (G.state.mp * 100).toFixed(1) + '%';
    /* v2：残影层（CSS 里带 0.1s 延迟 + 0.42s 收缩）→ 掉血时先留一道白影再收回 */
    if (ui.heroHpG) ui.heroHpG.style.width = (G.state.hp * 100).toFixed(1) + '%';
    /* v5：逐只同步血条（满血不显示百分比，避免拥挤） */
    const mobs = (G.combat && G.combat.mobs) || [];
    if (ui.mobs) {
      for (let i = 0; i < ui.mobs.length; i++) {
        const u = ui.mobs[i], m = mobs[i];
        if (!u || !m) continue;
        const r = Math.max(0, m.hp / m.maxHp);
        if (u.hpI) u.hpI.style.width = (r * 100).toFixed(1) + '%';
        if (u.hpG) u.hpG.style.width = (r * 100).toFixed(1) + '%';
        if (u.hpS) u.hpS.textContent = Math.round(r * 100) + '%';
      }
    }
    refreshExp();
  }

  let expCache = '';
  function refreshExp() {
    const s = G.state;
    const need = G.expNeed(s.level);
    const r = need === Infinity ? 1 : Math.min(1, s.exp / need);
    if (ui.expFill) {
      ui.expFill.style.width = (r * 100).toFixed(2) + '%';
      const txt = need === Infinity
        ? '真仙圆满 · 已臻化境'
        : G.fmt(s.exp) + ' / ' + G.fmt(need) + '  （' + (r * 100).toFixed(1) + '%）';
      if (txt !== expCache) { expCache = txt; ui.expTxt.textContent = txt; }
    }
    refreshHeroBaseLite();
  }
  function refreshHeroBaseLite() {
    const st = G.stats();
    if (ui.heroHpS && G.combat && G.combat.mob) ui.heroHpS.textContent = G.fmt(st.hp * G.state.hp) + ' / ' + G.fmt(st.hp);
  }

  /* ============================ 仪表盘 ============================ */
  function buildDash() {
    el.dash.innerHTML =
      '<div class="dash-row">' +
        '<span class="dash-state" id="dash-state"><span class="dot"></span><span id="dash-state-tx">自动寻怪中</span></span>' +
        '<span class="grow"></span>' +
        '<span id="dash-kr" class="mono">0.0 只/分</span>' +
      '</div>' +
      '<div class="bar-exp" id="dash-exp"><i></i><span></span></div>' +
      '<div class="dash-row">' +
        '<span id="dash-power" class="mono">战力 0</span>' +
        '<span class="grow"></span>' +
        '<span id="dash-dps" class="mono">DPS 0</span>' +
      '</div>' +
      '<div class="bar-atk"><i></i></div>';
    ui.expFill = el.dash.querySelector('#dash-exp > i');
    ui.expTxt = el.dash.querySelector('#dash-exp > span');
    ui.dashState = $('dash-state');
    ui.dashStateTx = $('dash-state-tx');
    ui.dashKr = $('dash-kr');
    ui.dashPower = $('dash-power');
    ui.dashDps = $('dash-dps');
    ui.atkFill = el.dash.querySelector('.bar-atk > i');
  }

  let dashT = 0;
  function refreshDash(dt) {
    dashT += dt;
    if (dashT < 0.25) return;
    dashT = 0;
    const s = G.state;
    const C = G.combat;
    const st = G.stats();
    if (ui.dashKr) ui.dashKr.textContent = (s.stats.killRate * 60).toFixed(1) + ' 只/分';
    if (ui.dashPower) ui.dashPower.textContent = '战力 ' + G.fmt(st.power);
    if (ui.dashDps) ui.dashDps.textContent = 'DPS ' + G.fmt(s.stats.dps);
    if (ui.dashState) {
      let tx = '自动寻怪中', cls = '';
      if (!s.auto) { tx = '挂机已暂停'; cls = 'paused'; }
      else if (!C || !C.mob) tx = '寻找妖物…';
      else if (C.mob.hp <= 0) tx = '妖物伏诛';
      else tx = '激战中 · ' + C.mob.name;
      ui.dashState.className = 'dash-state ' + cls;
      ui.dashStateTx.textContent = tx;
    }
    const dropEl = $('hud-drop');
    if (dropEl) dropEl.querySelector('span').textContent = G.fmt(s.stats.itemTotal);
    const rateEl = $('hud-rate');
    if (rateEl) rateEl.querySelector('span').textContent = G.fmt(s.stats.goldTotal);
  }

  let barT = 0;
  function frame(dt) {
    if (heroSkel) heroSkel.motion.update(dt);   /* v22：骨骼每帧驱动 */
    for (let si = 0; si < mobSkels.length; si++) { if (mobSkels[si]) mobSkels[si].motion.update(dt); }
    if (heroFig) heroFig.update(dt);                   /* v23：立绘动作每帧驱动 */
    for (let fi = 0; fi < mobFigs.length; fi++) { if (mobFigs[fi]) mobFigs[fi].update(dt); }
    groundT += dt;
    if (groundT > 1) { groundT = 0; alignGround(); }   /* v22：地面线每秒自愈校验 */
    refreshDash(dt);
    barT += dt;
    if (barT >= 0.1) { barT = 0; updateBars(); }
    const st = G.stats();
    const C = G.combat;
    if (ui.atkFill) {
      const r = C && C.mob ? 1 - Math.max(0, C.pTimer) / st.atkInterval : 0;
      ui.atkFill.style.width = (Math.max(0, Math.min(1, r)) * 100).toFixed(1) + '%';
    }
    // 粒子
    ctx.clearRect(0, 0, W, H);
    const accent = G.regionOf(G.state.region).accent;
    ctx.save();
    for (let i = 0; i < motes.length; i++) {
      const p = motes[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.p += dt;
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      if (p.x < -6) p.x = W + 6; else if (p.x > W + 6) p.x = -6;
      const a = p.a * (0.6 + 0.4 * Math.sin(p.p * 1.6));
      ctx.beginPath();
      ctx.fillStyle = hexA(accent, a);
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt;
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * (0.4 + s.life / s.max), 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ============================ 坐标工具 ============================ */
  function stageBox() {
    return el.stage.getBoundingClientRect();
  }
  function unitPos(side, idx) {
    const box = stageBox();
    const node = side === 'hero' ? ui.hero : mobNode(idx || 0);
    if (!node) return { x: box.width / 2, y: box.height / 2 };
    const av = node.querySelector('.avatar') || node;
    const r = av.getBoundingClientRect();
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
  }

  function burst(side, color, n, idx) {
    const p = unitPos(side, idx);
    n = n || 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832;
      const sp = 60 + Math.random() * 190;
      sparks.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.35 + Math.random() * 0.35, max: 0.7,
        r: 1.2 + Math.random() * 2.4, color: color
      });
    }
  }

  /* ==================== v2 表现层：屏震 / 冲击环 / 白闪 / 光柱 ==================== */
  let shakeTimer = 0;
  /* 屏幕震动：level 1 轻 / 2 中 / 3 重 */
  function shakeStage(level) {
    if (!el.stage) return;
    level = Math.max(1, Math.min(3, level || 1));
    el.stage.style.setProperty('--sk', level >= 3 ? 2.1 : level === 2 ? 1.45 : 1);
    el.stage.classList.remove('shake-1', 'shake-2', 'shake-3');
    void el.stage.offsetWidth;
    el.stage.classList.add('shake-' + level);
    clearTimeout(shakeTimer);
    shakeTimer = setTimeout(function () {
      if (el.stage) el.stage.classList.remove('shake-1', 'shake-2', 'shake-3');
    }, 470);
  }

  /* 命中点冲击环；big=true 时改为击杀冲击波 */
  function impactRingAt(side, color, big, idx) {
    if (!el.cast) return;
    const p = unitPos(side, idx);
    const d = document.createElement('div');
    d.className = big ? 'kill-wave' : 'impact-ring';
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    d.style.color = color || '#fff';
    el.cast.appendChild(d);
    setTimeout(function () { d.remove(); }, big ? 660 : 470);
  }

  /* 命中白闪 */
  function hitFlash(node) {
    if (!node) return;
    node.classList.remove('flash');
    void node.offsetWidth;
    node.classList.add('flash');
    setTimeout(function () { if (node) node.classList.remove('flash'); }, 200);
  }

  /* 突破：主角身上升起金光柱 + 全屏泛光 */
  function levelFx() {
    const host = $('screen-game');
    if (!host) return;
    const p = unitPos('hero');
    const beam = document.createElement('div');
    beam.className = 'lv-beam';
    beam.style.left = p.x + 'px';
    const glow = document.createElement('div');
    glow.className = 'lv-glow';
    host.appendChild(glow);
    host.appendChild(beam);
    setTimeout(function () { beam.remove(); glow.remove(); }, 1260);
  }

  /* 掉落物光柱 */
  function dropBeam(color) {
    if (!el.cast) return;
    const p = unitPos('mob');
    const d = document.createElement('div');
    d.className = 'drop-beam';
    d.style.left = p.x + 'px';
    if (color) {
      d.style.background = 'linear-gradient(0deg, rgba(255,255,255,0) 0%, ' + color + ' 46%, rgba(255,255,255,0) 100%)';
    }
    el.cast.appendChild(d);
    setTimeout(function () { d.remove(); }, 960);
  }

  /* -------------------- v3：门派法宝（原创 SVG，悬于主角脚下） -------------------- */
  function treasureSvg(sectId, color) {
    const c = color || '#5eead4';
    const gid = 'tg_' + sectId;
    const head = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="' + c + '" stop-opacity=".2"/>' +
      '<stop offset=".5" stop-color="#ffffff" stop-opacity=".95"/>' +
      '<stop offset="1" stop-color="' + c + '" stop-opacity=".2"/></linearGradient></defs>';
    const open = '<svg viewBox="0 0 120 26" xmlns="http://www.w3.org/2000/svg">' + head;
    if (sectId === 'qingyun') {
      return open +
        '<path d="M8 13 L96 11.4 L112 13 L96 14.6 Z" fill="url(#' + gid + ')"/>' +
        '<path d="M8 13 L96 11.4 L112 13 L96 14.6 Z" fill="none" stroke="' + c + '" stroke-width=".7" opacity=".8"/>' +
        '<rect x="12" y="6.4" width="3" height="13.2" rx="1.5" fill="' + c + '" opacity=".85"/>' +
        '<rect x="4" y="11.2" width="9" height="3.6" rx="1.8" fill="' + c + '" opacity=".55"/>' +
        '<path d="M4 13 C0 15 2 19 5 21" stroke="' + c + '" stroke-width="1.1" fill="none" opacity=".6"/>' +
        '</svg>';
    }
    if (sectId === 'guiwang') {
      return open +
        '<rect x="6" y="12.4" width="106" height="1.4" rx=".7" fill="' + c + '" opacity=".65"/>' +
        '<path d="M22 6 L74 5 C82 9 82 17 74 21 L22 20 Z" fill="url(#' + gid + ')" opacity=".92"/>' +
        '<path d="M30 9 L64 8.4 M30 13 L70 12.6 M30 17 L62 16.6" stroke="#0b0a14" stroke-width="1" opacity=".32"/>' +
        '</svg>';
    }
    if (sectId === 'hehuan') {
      return open +
        '<path d="M14 13 A30 11 0 0 1 74 13 A30 11 0 0 1 14 13 Z" fill="url(#' + gid + ')" opacity=".9"/>' +
        '<path d="M20 13 A24 8 0 0 1 68 13" stroke="' + c + '" stroke-width=".9" fill="none" opacity=".7"/>' +
        '<rect x="74" y="12" width="34" height="2" rx="1" fill="' + c + '" opacity=".6"/>' +
        '</svg>';
    }
    if (sectId === 'tianyin') {
      return open +
        '<rect x="10" y="12.4" width="98" height="1.6" rx=".8" fill="' + c + '" opacity=".72"/>' +
        '<circle cx="22" cy="13" r="7.4" fill="none" stroke="' + c + '" stroke-width="1.6" opacity=".9"/>' +
        '<circle cx="22" cy="13" r="3.2" fill="url(#' + gid + ')" opacity=".9"/>' +
        '<circle cx="40" cy="10" r="2" fill="' + c + '" opacity=".7"/>' +
        '<circle cx="40" cy="16.5" r="2" fill="' + c + '" opacity=".7"/>' +
        '</svg>';
    }
    return open +
      '<rect x="8" y="12.5" width="98" height="1.2" rx=".6" fill="' + c + '" opacity=".5"/>' +
      '<circle cx="30" cy="13" r="9" fill="url(#' + gid + ')" opacity=".95"/>' +
      '<circle cx="30" cy="13" r="12.6" fill="none" stroke="' + c + '" stroke-width=".8" opacity=".5"/>' +
      '<rect x="58" y="6" width="16" height="14" rx="2" fill="none" stroke="' + c + '" stroke-width="1" opacity=".75"/>' +
      '<path d="M62 10 h8 M62 13 h8 M62 16 h5" stroke="' + c + '" stroke-width=".9" opacity=".7"/>' +
      '</svg>';
  }

  /* 御剑出击：飞剑由主角激射至妖物，命中后折返（带拖尾） */
  function swordFly(idx) {
    if (!el.cast || !ui.hero) return;
    const sect = G.sectOf(G.state.sect) || {};
    const a = unitPos('hero'), b = unitPos('mob', idx || 0);
    const d = document.createElement('div');
    d.className = 'fly-sword';
    d.style.color = sect.color || '#5eead4';
    d.style.left = a.x + 'px';
    d.style.top = a.y + 'px';
    d.innerHTML = '<svg viewBox="0 0 60 12" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M2 6 L44 4.7 L58 6 L44 7.3 Z" fill="currentColor" opacity=".96"/>' +
      '<path d="M2 6 L44 4.7 L58 6 L44 7.3 Z" fill="none" stroke="#fff" stroke-width=".6" opacity=".7"/>' +
      '</svg>';
    el.cast.appendChild(d);
    setTimeout(function () { d.style.left = b.x + 'px'; d.style.top = b.y + 'px'; }, 16);
    setTimeout(function () {
      d.style.left = a.x + 'px';
      d.style.top = a.y + 'px';
      d.classList.add('no-return');
    }, 235);
    setTimeout(function () { d.remove(); }, 480);
  }

  /* ============================ 飘字 / 特效 ============================ */
  function floatText(side, text, cls, color, idx) {
    const p = unitPos(side, idx);
    const d = document.createElement('div');
    d.className = 'float-num ' + (cls || '');
    d.textContent = text;
    if (color) d.style.color = color;
    d.style.left = (p.x + (Math.random() - 0.5) * 46) + 'px';
    d.style.top = (p.y - 6) + 'px';
    el.float.appendChild(d);
    setTimeout(() => d.remove(), 1050);
  }

  function slash(side, idx) {
    const p = unitPos(side, idx);
    const d = document.createElement('div');
    d.className = 'slash';
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    const col = (G.sectOf(G.state.sect) || {}).color || '#facc15';
    d.innerHTML = '<svg viewBox="0 0 100 100" width="84" height="84">' +
      '<path d="M8 78 L84 16" stroke="' + col + '" stroke-width="4" stroke-linecap="round" fill="none" opacity=".95"/>' +
      '<path d="M16 88 L78 30" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".7"/>' +
      '</svg>';
    el.cast.appendChild(d);
    setTimeout(() => d.remove(), 400);
  }

  /* v6：门派群攻特效 —— 对每个命中目标按门派生成不同表现 */
  function skillBurst(sectId, list) {
    if (!el.cast || !list || !list.length) return;
    const color = (G.sectOf(G.state.sect) || {}).color || '#5eead4';
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      if (!m) continue;
      const p = unitPos('mob', m.idx);
      const mk = function (cls, vars, life) {
        const d = document.createElement('div');
        d.className = 'sk-fx ' + cls;
        d.style.left = p.x + 'px';
        d.style.top = p.y + 'px';
        if (vars) { for (const k in vars) d.style.setProperty(k, vars[k]); }
        el.cast.appendChild(d);
        setTimeout(function () { d.remove(); }, life || 1000);
      };
      if (sectId === 'qingyun') {
        mk('sk-sword', { '--a': '17deg' });
        mk('sk-sword', { '--a': '-19deg' });
        burst('mob', color, 12, m.idx);
      } else if (sectId === 'guiwang') {
        mk('sk-claw');
        mk('sk-claw', { width: '34px', height: '34px' });
        burst('mob', '#c084fc', 12, m.idx);
      } else if (sectId === 'hehuan') {
        for (let k = 0; k < 5; k++) {
          mk('sk-petal', {
            '--dx': (Math.round((Math.random() - 0.5) * 74)) + 'px',
            '--dy': (Math.round(-28 - Math.random() * 52)) + 'px'
          });
        }
        burst('mob', '#f472b6', 8, m.idx);
      } else if (sectId === 'tianyin') {
        mk('sk-ring');
        setTimeout(function () {
          mk('sk-ring', { width: '30px', height: '30px' });
        }, 90);
        burst('mob', '#fbbf24', 10, m.idx);
      } else {
        mk('sk-flame');
        burst('mob', '#fb923c', 14, m.idx);
      }
    }
  }

  /* v15：施法表现 —— 立绘无法单独动手，用「姿态 + 手心法球」表达施法动作 */
  function castPose(color) {
    if (!ui.hero || !el.cast) return;
    const col = color || '#facc15';
    /* 姿态 */
    ui.hero.classList.remove('casting');
    void ui.hero.offsetWidth;
    ui.hero.classList.add('casting');
    setTimeout(function () { if (ui.hero) ui.hero.classList.remove('casting'); }, 700);

    const p = unitPos('hero');
    const mk = function (cls, life, vars) {
      const d = document.createElement('div');
      d.className = cls;
      d.style.left = p.x + 'px';
      d.style.top = p.y + 'px';
      d.style.color = col;
      if (vars) { for (const k in vars) d.style.setProperty(k, vars[k]); }
      el.cast.appendChild(d);
      setTimeout(function () { d.remove(); }, life);
    };
    mk('cast-ring-layer l3', 800);
    mk('cast-ring-layer', 800);
    mk('cast-ring-layer l2', 800);
    mk('cast-pillar', 760);
    mk('cast-flash', 440);
    /* 手心法球与符纹（贴在角色身上，跟随 avatar 布局） */
    const palm = document.createElement('div');
    palm.className = 'palm-orb';
    palm.style.color = col;
    const rune = document.createElement('div');
    rune.className = 'palm-rune';
    rune.style.color = col;
    const av = ui.hero.querySelector('.avatar');
    if (av) {
      av.appendChild(palm);
      av.appendChild(rune);
      setTimeout(function () { palm.remove(); rune.remove(); }, 760);
    }
  }

  function castFx(side, name, color) {
    const p = unitPos(side);
    const ring = document.createElement('div');
    ring.className = 'cast-ring';
    ring.style.left = p.x + 'px';
    ring.style.top = p.y + 'px';
    ring.style.color = color || '#facc15';
    el.cast.appendChild(ring);
    setTimeout(() => ring.remove(), 750);

    const lab = document.createElement('div');
    lab.className = 'cast-label';
    lab.textContent = name;
    lab.style.color = color || '#facc15';
    lab.style.left = p.x + 'px';
    lab.style.top = (p.y - 52) + 'px';
    el.cast.appendChild(lab);
    setTimeout(() => lab.remove(), 950);
  }

  function pushLog(e, quiet) {
    if (!el.log) return;
    const d = document.createElement('div');
    d.className = 'log-line t-' + (e.type || 'info');
    d.textContent = e.text;
    el.log.appendChild(d);
    while (el.log.children.length > 5) el.log.removeChild(el.log.firstChild);
    if (quiet) { /* 静默回填 */ }
  }

  function toast(text, kind) {
    const host = $('toast-host');
    if (!host) return;
    const d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.textContent = text;
    host.appendChild(d);
    while (host.children.length > 4) host.removeChild(host.firstChild);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 320); }, 1900);
  }

  function levelBanner(level, realm) {
    const host = $('screen-game');
    const d = document.createElement('div');
    d.className = 'levelup-banner';
    d.innerHTML = '<div class="lv-big">Lv.' + level + '</div><div class="lv-sub">' + esc(realm) + '</div>';
    host.appendChild(d);
    setTimeout(() => d.remove(), 2000);
  }

  /* ============================ 事件绑定 ============================ */
  function bindGame() {
    G.on('region', r => { setRegion(r); refreshHud(); });
    G.on('spawn', list => renderMobs(list));
    G.on('log', e => pushLog(e));

    G.on('heroAttack', e => {
      if (!ui.hero) return;
      ui.hero.classList.remove('act');
      void ui.hero.offsetWidth;
      ui.hero.classList.add('act');
      setTimeout(() => ui.hero && ui.hero.classList.remove('act'), 360);
      swordFly(e && e.idx);
      setHeroPose('attack');          /* v22：挥击骨骼动作 */
      setFigPose('attack');           /* v23：立绘挥击（前压送出） */
    });
    /* v2 修复：原先怪物攻击时做动作的是主角（看起来像主角自己往前冲）。
       现在：怪物向左扑击，主角同时做出受击踉跄。 */
    G.on('mobAttack', e => {
      setMobPose(e && e.idx, 'attack');      /* v22：怪物挥击骨骼动作 */
      setMobFigPose(e && e.idx, 'attack');   /* v23：怪物立绘扑击 */
      const attacker = mobNode(e && e.idx);
      if (attacker) {
        attacker.classList.remove('act');
        void attacker.offsetWidth;
        attacker.classList.add('act');
        setTimeout(() => attacker.classList.remove('act'), 490);
      }
      if (ui.hero) {
        ui.hero.classList.remove('hurt');
        void ui.hero.offsetWidth;
        ui.hero.classList.add('hurt');
        setTimeout(() => ui.hero && ui.hero.classList.remove('hurt'), 470);
      }
    });

    G.on('damage', d => {
      if (!d) return;
      if (d.dodge) {
        floatText(d.side, '闪避', 'dodge');
        return;
      }
      if (d.heal) {
        floatText('hero', '+' + G.fmt(d.amount), 'heal', '#4ade80');
        burst('hero', '#4ade80', 8);
        return;
      }
      const color = d.crit ? '#fde047' : d.skill ? '#f0abfc' : '#fff3c4';
      const txt = (d.crit ? '暴击 ' : '') + '-' + G.fmt(d.amount);
      const mi = d.idx || 0;
      floatText(d.side, txt, d.crit ? 'crit' : '', color, mi);
      if (d.side === 'mob') {
        const node = mobNode(mi);
        if (d.skill) slash('mob', mi);
        burst('mob', d.crit ? '#fde047' : '#fca5a5', d.crit ? 20 : 11, mi);
        hitFlash(node);
        setMobPose(mi, 'hurt');              /* v22：怪物受击骨骼动作 */
        setMobFigPose(mi, 'hurt');           /* v23：怪物立绘受击 */
        impactRingAt('mob', d.crit ? '#fde047' : '#fca5a5', false, mi);
        if (!d.skill && node) {
          node.classList.remove('hit');
          void node.offsetWidth;
          node.classList.add('hit');
          setTimeout(() => node.classList.remove('hit'), 290);
        }
        shakeStage(d.crit ? 2 : 1);
      } else {
        burst('hero', '#f87171', 9);
        impactRingAt('hero', '#f87171', false);
        if (d.crit) shakeStage(2);
        setHeroPose('hurt');         /* v22：受击后仰（骨骼） */
        setFigPose('hurt');          /* v23：立绘受击（后仰踉跄） */
      }
    });

    G.on('skill', s => {
      const color = (G.sectOf(G.state.sect) || {}).color || '#facc15';
      castFx('hero', s.name, color);
      burst('hero', color, 14);
      /* v6：群攻 —— 每个被命中的目标身上给出门派专属特效 */
      skillBurst(G.state.sect, (G.combat && G.combat.mobs) || []);
      /* v15：施法表现（姿态 + 手心法球 + 多层法阵 + 灵光 + 微闪） */
      castPose(color);
      setHeroPose('cast');            /* v22：抬臂掐诀的骨骼动作 */
      setFigPose('cast');             /* v23：立绘施法（上浮后仰） */
    });

    G.on('exp', e => {
      floatText('mob', '+' + G.fmt(e.amount) + ' 修为 · +' + G.fmt(e.gold) + ' 金', 'exp', '#a7f3d0');
    });

    G.on('drop', it => {
      const q = G.qualityOf(it);
      burst('mob', q.color, 13);
      dropBeam(q.color);
      if (it.quality >= 3) toast('拾取 ' + q.name + '【' + it.name + '】', 'gold');
    });
    G.on('equip', it => {
      const q = G.qualityOf(it);
      if (it.quality >= 3) toast('自动装备 ' + q.name + '【' + it.name + '】', 'jade');
      refreshHeroBaseLite();
    });
    G.on('autosell', e => {
      if (e.full) toast('行囊已满，自动售出获取 ' + G.fmt(e.gold) + ' 金币', 'bad');
    });

    G.on('kill', m => {
      const node = mobNode(m && m.idx);
      if (node) {
        node.classList.remove('hit');
        node.classList.add('dying');
        impactRingAt('mob', '#ffffff', true, m && m.idx);
        burst('mob', '#fde68a', 24, m && m.idx);
      }
      shakeStage(3);
    });

    G.on('levelup', e => {
      levelBanner(e.level, e.realm);
      burst('hero', '#facc15', 32);
      levelFx();
      shakeStage(2);
      setHeroPose('jump');           /* v22：突破时跃起 */
      setFigPose('jump');            /* v23：立绘跃起（squash & stretch） */
      if (ui.hero) {
        ui.hero.classList.remove('levelup');
        void ui.hero.offsetWidth;
        ui.hero.classList.add('levelup');
        setTimeout(() => ui.hero && ui.hero.classList.remove('levelup'), 990);
      }
      toast('突破 · ' + e.realm, 'gold');
    });

    G.on('death', () => {
      toast('力竭倒地，正在调息…', 'bad');
      if (ui.hero) {
        ui.hero.classList.remove('act');
        ui.hero.style.opacity = '.4';
        setTimeout(() => { if (ui.hero) ui.hero.style.opacity = '1'; }, 1800);
      }
    });

    G.on('quest', e => {
      toast('完成【' + e.q.def.t + '】 +' + G.fmt(e.exp) + ' 修为', 'gold');
    });

    G.on('enhance', e => {
      if (e.quiet) return;
      if (e.ok) toast('强化成功 +' + e.item.enh, 'gold');
      else toast('强化失败，材料消耗', 'bad');
    });
  }

  global.Render = {
    init, frame, toast, setRegion, refreshHud, refreshHeroBase,
    ic, esc, floatText, burst, pushLog, unitPos, renderMobs, mobNode, skillBurst,
    shakeStage, impactRingAt, hitFlash, levelFx, dropBeam, castPose,
    setDayMode, applyMode, isDay, rebuildHero,
    mountHeroSkeleton, setHeroPose, mountMobSkeletons, setMobPose, alignGround, walkBriefly,
    mountHeroFig, mountMobFigs, setFigPose, setMobFigPose,
    treasureSvg, swordFly
  };
})(window);
