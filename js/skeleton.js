/* =========================================================================
 * 诛仙问道 · 骨骼动画系统（程序化 2.5D 骨骼）
 *
 * 设计要点：
 *   · 真正的层级骨骼：DOM 嵌套 = 父子骨骼，子骨自动继承父骨变换；
 *     每个骨节点 transform-origin 落在「关节」上，旋转的是关节而非整体平移。
 *   · 3D 姿态：同时使用 rotateZ（摆动）/ rotateY（转身、体轴扭转）/ rotateX（前后倾），
 *     父级 perspective + preserve-3d，形成真实的 3D 空间姿态。
 *   · 程序化驱动：正弦步态周期（左右腿反相）、呼吸、重心转移（髋部横移 + 反向倾斜）、
 *     以及姿态关键帧之间的缓动插值，保证动作连贯。
 *   · 零依赖、零素材：造型由骨骼上的「体节」拼出，门派配色自动继承。
 * ========================================================================= */
(function (global) {
  'use strict';

  const D2R = Math.PI / 180;
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;

  /* ------------------------------------------------------------------ 骨架定义
     dx/dy：该关节相对父关节的位移（px，角色高约 150 时的比例）
     w/l  ：体节宽度与长度（从关节向下/向外延伸） */
  const RIG = {
    /* 根：髋 */
    hips:   { dx: 0,   dy: 0 },
    /* 躯干链 */
    spine:  { dx: 0,   dy: -14, parent: 'hips' },
    chest:  { dx: 0,   dy: -16, parent: 'spine' },
    neck:   { dx: 0,   dy: -13, parent: 'chest' },
    head:   { dx: 0,   dy: -2,  parent: 'neck' },
    /* 手臂（上臂→前臂） */
    shoulderL: { dx: -7, dy: -4, parent: 'chest' },
    elbowL:    { dx: 0,  dy: 19, parent: 'shoulderL' },
    handL:     { dx: 0,  dy: 17, parent: 'elbowL' },
    shoulderR: { dx: 7,  dy: -4, parent: 'chest' },
    elbowR:    { dx: 0,  dy: 19, parent: 'shoulderR' },
    handR:     { dx: 0,  dy: 17, parent: 'elbowR' },
    /* 腿（大腿→小腿→足） */
    hipL:  { dx: -6, dy: 2,  parent: 'hips' },
    kneeL: { dx: 0,  dy: 22, parent: 'hipL' },
    footL: { dx: 0,  dy: 21, parent: 'kneeL' },
    hipR:  { dx: 6,  dy: 2,  parent: 'hips' },
    kneeR: { dx: 0,  dy: 22, parent: 'hipR' },
    footR: { dx: 0,  dy: 21, parent: 'kneeR' },
    /* 飘带（挂在胸口，独立摆动，强化"仙气"与运动惯性） */
    sashL: { dx: -9, dy: -2, parent: 'chest' },
    sashR: { dx: 9,  dy: -2, parent: 'chest' },
    /* 武器骨骼：挂在右手，天然继承前臂运动 → 攻击时随臂挥出 */
    blade: { dx: 0,  dy: 6,  parent: 'handR' }
  };
  const ORDER = ['hips', 'spine', 'chest', 'neck', 'head',
    'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR',
    'hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR', 'sashL', 'sashR', 'blade'];

  /* 各体节的肉：宽、长、圆角、颜色角色（robe=袍身 / skin / boot / hair / sash） */
  const FLESH = {
    hips:   { w: 26, l: 14, r: '44% 44% 26% 26%', k: 'robe' },
    spine:  { w: 26, l: 18, r: '32% 32% 20% 20%', k: 'robe' },
    chest:  { w: 30, l: 20, r: '42% 42% 24% 24%', k: 'robe' },
    neck:   { w: 6,  l: 6,  r: '50%', k: 'skin' },
    head:   { w: 16, l: 18, r: '46% 46% 44% 44%', k: 'skin' },
    shoulderL: { w: 12, l: 21, r: '42% 42% 40% 40%', k: 'sleeve' },
    elbowL:    { w: 9,  l: 17, r: '40%', k: 'sleeve' },
    handL:     { w: 6,  l: 7,  r: '50%', k: 'skin' },
    shoulderR: { w: 12, l: 21, r: '42% 42% 40% 40%', k: 'sleeve' },
    elbowR:    { w: 9,  l: 17, r: '40%', k: 'sleeve' },
    handR:     { w: 6,  l: 7,  r: '50%', k: 'skin' },
    hipL:  { w: 11, l: 24, r: '42%', k: 'robe' },
    kneeL: { w: 9,  l: 23, r: '38%', k: 'robe' },
    footL: { w: 9,  l: 9,  r: '30% 30% 40% 40%', k: 'boot' },
    hipR:  { w: 11, l: 24, r: '42%', k: 'robe' },
    kneeR: { w: 9,  l: 23, r: '38%', k: 'robe' },
    footR: { w: 9,  l: 9,  r: '30% 30% 40% 40%', k: 'boot' },
    sashL: { w: 7,  l: 30, r: '40%', k: 'sash' },
    sashR: { w: 7,  l: 30, r: '40%', k: 'sash' },
    blade: { w: 3.4, l: 30, r: '8% 8% 40% 40%', k: 'blade' }
  };

  /* ------------------------------------------------------------ 姿态关键帧
     角度单位：度。约定 0 = 竖直下垂；正 = 顺时针（绕 Z）。
     spine/chest 负值 = 前倾；hip 正 = 抬腿向前。 */
  const POSES = {
    idle: {
      hips: { y: -1, z: 0 }, spine: { z: 3 }, chest: { z: 1 }, head: { z: -2 },
      shoulderL: { z: 9, y: 4 }, elbowL: { z: -13 }, shoulderR: { z: -9, y: -4 }, elbowR: { z: -15 },
      hipL: { z: 2 }, kneeL: { z: 3 }, hipR: { z: -2 }, kneeR: { z: 3 },
      sashL: { z: 6 }, sashR: { z: -6 }, yaw: 0, lift: 0
    },
    walk: {   /* 由 step() 程序化生成，这里只放躯干基准 */
      hips: { y: -2, z: 0 }, spine: { z: 7 }, chest: { z: 2 }, head: { z: -5 },
      sashL: { z: 12 }, sashR: { z: -10 }, yaw: 0, lift: 0
    },
    attack: { /* 挥击：蓄力后摆 → 前挥 → 收势（在 swing() 内插值） */
      spine: { z: 6 }, head: { z: -4 }, yaw: 0, lift: 0
    },
    cast: {   /* 施法：沉腰、双手抬举掐诀、微微后仰 */
      hips: { y: 4, z: 0 }, spine: { z: -4 }, chest: { z: -3 }, head: { z: -9 },
      shoulderL: { z: 108, y: 16 }, elbowL: { z: -74 },
      shoulderR: { z: -114, y: -14 }, elbowR: { z: -66 },
      hipL: { z: 4 }, kneeL: { z: 10 }, hipR: { z: -4 }, kneeR: { z: 12 },
      sashL: { z: 16 }, sashR: { z: -16 }, yaw: 0, lift: -2
    },
    hurt: {   /* 受击：后仰、手臂外张、重心后坐 */
      hips: { y: 3, z: 0 }, spine: { z: -17 }, chest: { z: -8 }, head: { z: -14 },
      shoulderL: { z: 46, y: 12 }, elbowL: { z: -30 },
      shoulderR: { z: -44, y: -12 }, elbowR: { z: -34 },
      hipL: { z: -12 }, kneeL: { z: 20 }, hipR: { z: 8 }, kneeR: { z: 16 },
      sashL: { z: -18 }, sashR: { z: 18 }, yaw: 0, lift: 1
    },
    jumpUp: { /* 腾空：收腿、举臂 */
      hips: { y: -6 }, spine: { z: -4 }, chest: { z: -2 }, head: { z: -6 },
      shoulderL: { z: 56, y: 20 }, elbowL: { z: -46 }, shoulderR: { z: -58, y: -20 }, elbowR: { z: -48 },
      hipL: { z: -26 }, kneeL: { z: 44 }, hipR: { z: -18 }, kneeR: { z: 38 },
      sashL: { z: 30 }, sashR: { z: -30 }, lift: -26
    },
    jumpDown: { /* 落地缓冲：深蹲 */
      hips: { y: 12 }, spine: { z: 14 }, chest: { z: 4 }, head: { z: -10 },
      shoulderL: { z: -14, y: 8 }, elbowL: { z: -34 }, shoulderR: { z: 14, y: -8 }, elbowR: { z: -36 },
      hipL: { z: 22 }, kneeL: { z: 40 }, hipR: { z: 18 }, kneeR: { z: 42 },
      sashL: { z: -22 }, sashR: { z: 22 }, lift: 2
    },
    think: {  /* 站桩打坐：盘坐感（腿内收、手结印） */
      hips: { y: 26 }, spine: { z: 6 }, chest: { z: 2 }, head: { z: -3 },
      shoulderL: { z: 66, y: 22 }, elbowL: { z: -96 }, shoulderR: { z: -66, y: -22 }, elbowR: { z: -96 },
      hipL: { z: 68 }, kneeL: { z: 74 }, hipR: { z: -68 }, kneeR: { z: 74 },
      sashL: { z: 10 }, sashR: { z: -10 }, lift: 0
    }
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); }

  /* 姿态之间的插值（缺失字段按 idle 兜底） */
  function blend(pa, pb, t, out) {
    const base = POSES.idle;
    ORDER.forEach(function (k) {
      const a = (pa && pa[k]) || base[k] || {};
      const b = (pb && pb[k]) || base[k] || {};
      const o = out[k] || (out[k] = { x: 0, y: 0, z: 0 });
      o.x = lerp(a.x || 0, b.x || 0, t);
      o.y = lerp(a.y || 0, b.y || 0, t);
      o.z = lerp(a.z || 0, b.z || 0, t);
    });
    out.yaw = lerp((pa && pa.yaw) || 0, (pb && pb.yaw) || 0, t);
    out.lift = lerp((pa && pa.lift) || 0, (pb && pb.lift) || 0, t);
    return out;
  }

  /* ------------------------------------------------------------------ 工厂 */
  function createSkin(opts) {
    const o = opts || {};
    return {
      scale: o.scale || 1,
      color: o.color || '#5eead4',      /* 门派主色 → 描边/飘带 */
      robe: o.robe || 'rgba(236,238,242,.96)',
      robeDark: o.robeDark || 'rgba(158,166,180,.95)',
      sleeve: o.sleeve || 'rgba(226,230,238,.94)',
      sash: o.sash || null,             /* 默认用 color */
      skin: o.skin || 'rgba(240,214,190,.96)',
      boot: o.boot || 'rgba(52,46,60,.95)',
      hair: o.hair || 'rgba(30,26,34,.95)',
      outline: o.outline || 'rgba(8,10,14,.65)',
      bladeCol: o.bladeCol || 'rgba(228,238,250,.96)',
      legLen: o.legLen || 58,          /* 髋→足 的骨骼总长（决定脚底落点） */
      /* 造型：hero 道袍持剑 / ghost 魂体 / beast 兽形 / demon 魔躯 / boss 妖将 / human 修士 */
      style: o.style || 'hero',
      blade: o.blade !== false,
      /* 造型开关 */
      horns: !!o.horns, tail: !!o.tail, big: o.big || 1, hunch: o.hunch || 0,
      hover: o.hover || 0, wing: !!o.wing
    };
  }

  function buildRig(host, skin) {
    const nodes = {};
    const cs = getComputedStyle(document.documentElement);
    const colOf = {
      robe: skin.robe, sleeve: skin.sleeve, skin: skin.skin, boot: skin.boot,
      sash: skin.sash || skin.color, hair: skin.hair
    };
    ORDER.forEach(function (k) {
      const def = RIG[k];
      const f = FLESH[k];
      const el = document.createElement('div');
      el.className = 'bone b-' + k;
      if (!def.parent) host.appendChild(el);
      else nodes[def.parent].appendChild(el);
      const offsetPx = (v, axis) => (v * skin.scale) + 'px';
      el.style.transform =
        'translate3d(' + (def.dx * skin.scale) + 'px,' + (def.dy * skin.scale) + 'px,0)';
      /* 体节：从关节沿 -Y 方向长出来，transform-origin 在关节 */
      const flesh = document.createElement('i');
      flesh.className = 'flesh';
      const w = f.w * skin.scale * (skin.big || 1);
      const l = f.l * skin.scale * (skin.big || 1);
      flesh.style.width = w + 'px';
      flesh.style.height = l + 'px';
      flesh.style.left = (-w / 2) + 'px';
      flesh.style.top = '0px';
      flesh.style.borderRadius = f.r;
      flesh.style.background = colOf[f.k] || skin.robe;
      /* 体积感：袍身加纵向明暗；袖口做成喇叭状（仙侠宽袖） */
      if (f.k === 'robe') flesh.style.backgroundImage = 'linear-gradient(180deg, rgba(255,255,255,.18), rgba(0,0,0,.16))';
      if (f.k === 'sleeve') flesh.style.clipPath = 'polygon(26% 0, 74% 0, 100% 100%, 0 100%)';
      if (f.k === 'sash') flesh.style.backgroundImage = 'linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,0))';
      el.appendChild(flesh);
      nodes[k] = el;
      nodes[k].__flesh = flesh;
      nodes[k].__def = def;
    });
    /* 头部附加：发髻 + 描边光 + 门派色发带 */
    const head = nodes.head;
    const bun = document.createElement('i');
    bun.className = 'flesh bun';
    bun.style.width = (14 * skin.scale) + 'px';
    bun.style.height = (14 * skin.scale) + 'px';
    bun.style.left = (-7 * skin.scale) + 'px';
    bun.style.top = (-11 * skin.scale) + 'px';
    bun.style.borderRadius = '50%';
    bun.style.background = skin.hair;
    head.appendChild(bun);
    const tie = document.createElement('i');
    tie.className = 'flesh tie';
    tie.style.width = (17 * skin.scale) + 'px';
    tie.style.height = (2.5 * skin.scale) + 'px';
    tie.style.left = (-8.5 * skin.scale) + 'px';
    tie.style.top = (-6 * skin.scale) + 'px';
    tie.style.borderRadius = '2px';
    tie.style.background = skin.color;
    tie.style.boxShadow = '0 0 6px ' + skin.color;
    head.appendChild(tie);
    /* 面部：一道极简眼影，让人形角色有"脸"的指向 */
    const eye = document.createElement('i');
    eye.className = 'flesh eye';
    eye.style.width = (7.5 * skin.scale) + 'px';
    eye.style.height = (1.6 * skin.scale) + 'px';
    eye.style.left = (-3.7 * skin.scale) + 'px';
    eye.style.top = (7.6 * skin.scale) + 'px';
    eye.style.borderRadius = '2px';
    eye.style.background = 'rgba(26,20,26,.6)';
    head.appendChild(eye);
    /* 袍摆：上窄下宽的 A 字（仙侠道袍的关键特征），随髋运动 */
    const skirt = document.createElement('i');
    skirt.className = 'flesh skirt';
    skirt.style.width = (36 * skin.scale) + 'px';
    skirt.style.height = (32 * skin.scale) + 'px';
    skirt.style.left = (-18 * skin.scale) + 'px';
    skirt.style.top = (0 * skin.scale) + 'px';
    skirt.style.borderRadius = '26% 26% 44% 44%';
    skirt.style.background = skin.robeDark;
    skirt.style.clipPath = 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)';
    skirt.style.backgroundImage = 'linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.2))';
    nodes.hips.insertBefore(skirt, nodes.hips.firstChild);
    /* 兽角（怪物用） */
    if (skin.horns) {
      [-1, 1].forEach(function (s) {
        const horn = document.createElement('i');
        horn.className = 'flesh horn';
        horn.style.width = (4 * skin.scale) + 'px';
        horn.style.height = (12 * skin.scale) + 'px';
        horn.style.left = (s * 6 * skin.scale - 2 * skin.scale) + 'px';
        horn.style.top = (-16 * skin.scale) + 'px';
        horn.style.borderRadius = '60% 60% 20% 20%';
        horn.style.background = skin.outline;
        head.appendChild(horn);
      });
    }
    /* 尾巴 */
    if (skin.tail) {
      const tail = document.createElement('div');
      tail.className = 'bone b-tail';
      tail.style.transform = 'translate3d(' + (-6 * skin.scale) + 'px,' + (4 * skin.scale) + 'px,0)';
      const tf = document.createElement('i');
      tf.className = 'flesh';
      const tw = 7 * skin.scale, tl = 26 * skin.scale;
      tf.style.width = tw + 'px'; tf.style.height = tl + 'px';
      tf.style.left = (-tw / 2) + 'px';
      tf.style.borderRadius = '40%';
      tf.style.background = skin.robeDark;
      tail.appendChild(tf);
      nodes.hips.appendChild(tail);
      nodes.tail = tail;
    }

    /* ============ v22 造型层：腰带 / 领口 / 袖口 / 发丝 / 魂体 / 兽甲 / 双翼 / 剑 ============ */
    const st = skin.style;
    const sc = skin.scale;
    function mk(bone, w, h, x, y, bg, br, cls) {
      if (!bone) return null;
      const e = document.createElement('i');
      e.className = 'flesh' + (cls ? ' ' + cls : '');
      e.style.width = (w * sc) + 'px';
      e.style.height = (h * sc) + 'px';
      e.style.left = (x * sc) + 'px';
      e.style.top = (y * sc) + 'px';
      e.style.borderRadius = br;
      e.style.background = bg;
      bone.appendChild(e);
      return e;
    }
    if (st === 'hero' || st === 'human') {
      mk(nodes.spine, 27, 4, -13.5, -5, skin.color, '2px');       /* 腰带 */
      mk(nodes.chest, 13, 3.2, -6.5, 0.5, skin.color, '2px');     /* 领口 */
      mk(nodes.elbowL, 11, 3, -5.5, 14, skin.color, '2px');       /* 左袖口 */
      mk(nodes.elbowR, 11, 3, -5.5, 14, skin.color, '2px');       /* 右袖口 */
      mk(nodes.head, 3.4, 15, -8, 5, skin.hair, '40%');           /* 发丝 */
      mk(nodes.head, 3.4, 15, 4.6, 5, skin.hair, '40%');
    }
    if (st === 'ghost') {
      ['hipL', 'kneeL', 'footL', 'hipR', 'kneeR', 'footR'].forEach(function (k) {
        if (nodes[k] && nodes[k].__flesh) nodes[k].__flesh.style.opacity = '.32';
      });
      mk(nodes.hips, 32, 26, -16, 6, 'rgba(190,232,255,.26)', '50% 50% 44% 44%');
      mk(nodes.chest, 15, 3.2, -7.5, 0.5, skin.color, '2px');
      mk(nodes.spine, 27, 3.4, -13.5, -5, skin.color, '2px');
    }
    if (st === 'beast') {
      mk(nodes.spine, 30, 5, -15, -4, skin.outline, '2px');       /* 腰甲 */
      mk(nodes.chest, 26, 4, -13, 0, 'rgba(0,0,0,.22)', '2px');   /* 鬃毛 */
    }
    if (st === 'demon' || st === 'boss') {
      mk(nodes.spine, 31, 5, -15.5, -4, skin.outline, '2px');
      if (skin.wing) {
        mk(nodes.chest, 22, 8, -32, -6, 'rgba(18,10,24,.72)', '60% 80% 40% 50%', 'wing wing-l');
        mk(nodes.chest, 22, 8, 10, -6, 'rgba(18,10,24,.72)', '80% 60% 50% 40%', 'wing wing-r');
      }
    }
    /* 武器：剑（挂在右手，随前臂运动 → 攻击时自然挥出） */
    if (skin.blade && nodes.blade) {
      mk(nodes.blade, 3.4, 30, -1.7, 0, skin.bladeCol, '8% 8% 40% 40%');
      mk(nodes.blade, 11, 2.6, -5.5, -1.5, skin.color, '2px');
      mk(nodes.blade, 5, 7, -2.5, -8.5, skin.boot, '30%');
    } else if (nodes.blade) {
      nodes.blade.style.display = 'none';
    }
    return nodes;
  }

  /* ------------------------------------------------------- 运动控制器 */
  function createMotion(nodes, skin) {
    const pose = {};
    ORDER.forEach(function (k) { pose[k] = { x: 0, y: 0, z: 0 }; });
    pose.yaw = 0; pose.lift = 0;

    let cycle = 0;           /* 步态相位 0..1 */
    let breathe = 0;
    let mode = 'idle';
    let modeT = 0;           /* 当前动作已进行时间 */
    let yaw = 0;             /* 身体朝向（转身） */
    let lastMode = 'idle';
    let trans = 1;           /* 姿态过渡进度 0..1 */
    const gaitAmp = { walk: 1, idle: 0.12, cast: 0.05, attack: 0.5, hurt: 0.3, jump: 0, think: 0 };

    function setMode(m, force) {
      if (m === mode && !force) return;
      lastMode = mode; mode = m; modeT = 0; trans = 0;
    }

    /* 攻击：蓄力-挥出-收势 三段，返回该时刻的挥击角度 */
    function swing(p) {
      if (p < 0.3) {                       /* 蓄力后摆 */
        const t = easeOut(p / 0.3);
        return { arm: lerp(-4, -74, t), elbow: lerp(-16, -62, t), twist: lerp(0, -20, t), lean: lerp(3, -6, t) };
      }
      if (p < 0.55) {                      /* 爆发前挥 */
        const t = easeOut((p - 0.3) / 0.25);
        return { arm: lerp(-74, 96, t), elbow: lerp(-62, -10, t), twist: lerp(-20, 22, t), lean: lerp(-6, 13, t) };
      }
      const t = easeInOut((p - 0.55) / 0.45); /* 收势 */
      return { arm: lerp(96, -4, t), elbow: lerp(-10, -16, t), twist: lerp(22, 0, t), lean: lerp(13, 3, t) };
    }

    /* 施法：抬臂掐诀 → 送出 → 回落 */
    function castPose(p) {
      if (p < 0.4) { const t = easeOut(p / 0.4); return { up: lerp(0, 1, t), out: 0 }; }
      if (p < 0.7) { const t = easeOut((p - 0.4) / 0.3); return { up: 1, out: t }; }
      const t = easeInOut((p - 0.7) / 0.3); return { up: lerp(1, 0, t), out: lerp(1, 0, t) };
    }

    function update(dt) {
      modeT += dt;
      breathe += dt;
      if (trans < 1) trans = Math.min(1, trans + dt / 0.22);

      /* —— 基础姿态：按模式取关键帧 —— */
      let target = POSES[mode] || POSES.idle;
      blend(POSES[lastMode] || POSES.idle, target, easeInOut(trans), pose);

      /* —— 程序化叠加 —— */
      const amp = gaitAmp[mode] !== undefined ? gaitAmp[mode] : 0.2;
      const speed = mode === 'attack' ? 2.6 : mode === 'walk' ? 1.5 : 1;
      cycle += dt * speed;
      if (cycle > 1) cycle -= 1;
      const ph = cycle * 2 * PI;
      const br = sin(breathe * 1.9) * 0.5 + 0.5;   /* 呼吸 0..1 */

      /* 步态周期：大腿反相摆动 + 膝弯曲（弯曲有相位差 → 自然） */
      const g = amp;
      pose.hipL.z += g * 27 * sin(ph);
      pose.hipR.z += g * 27 * sin(ph + PI);
      pose.kneeL.z += g * -34 * Math.max(0, sin(ph + 1.2));
      pose.kneeR.z += g * -34 * Math.max(0, sin(ph + 1.2 + PI));
      pose.footL.z += g * 12 * sin(ph + 0.7);
      pose.footR.z += g * 12 * sin(ph + 0.7 + PI);

      /* 手臂与对侧腿同相（走路自然），并带一点肘部跟随 */
      pose.shoulderL.z += g * -20 * sin(ph);
      pose.shoulderR.z += g * 20 * sin(ph);
      pose.elbowL.z += g * -12 * Math.max(0, sin(ph));
      pose.elbowR.z += g * -12 * Math.max(0, -sin(ph));

      /* 重心：髋部左右横移 + 上下起伏（每步一次）+ 躯干反向倾斜 */
      pose.hips.x = g * 3.2 * sin(ph);
      pose.hips.y += -g * 2.6 * Math.abs(sin(ph)) + (breathe ? 0 : 0);
      pose.spine.z += g * -3.5 * sin(ph);
      pose.head.z += g * 2 * sin(ph + 0.4);

      /* 呼吸起伏（站立时明显，走路时被步态盖过） */
      const breatheAmp = 1 - Math.min(0.85, g);
      pose.hips.y += -1.4 * breatheAmp * br;
      pose.chest.z += -1.2 * breatheAmp * br;
      pose.shoulderL.z += -2.2 * breatheAmp * br;
      pose.shoulderR.z += 2.2 * breatheAmp * br;
      pose.head.z += -0.8 * breatheAmp * br;

      /* 飘带惯性：滞后于身体，并随风摆动 */
      const wind = sin(breathe * 1.3) * 4 + g * 16 * sin(ph + 1.6);
      pose.sashL.z += wind;
      pose.sashR.z += wind * 0.9;

      /* 3D 细节：站桩时身体朝向缓慢微摆（避免笔直僵硬），
         走动/出招时自动收敛为 0，交给动作本身驱动 */
      const idleYaw = (1 - Math.min(1, g * 3)) * 7.5 * sin(breathe * 0.42);
      pose.yaw += idleYaw;
      pose.head.z += (1 - Math.min(1, g * 3)) * 2.5 * sin(breathe * 0.42 + 0.6);

      /* —— 攻击动作覆盖（右臂 + 扭腰 + 前倾 + 重心前压） —— */
      if (mode === 'attack') {
        const p = Math.min(1, modeT / 0.42);
        const s = swing(p);
        pose.shoulderR.z = s.arm;
        pose.elbowR.z = s.elbow;
        pose.yaw = s.twist;
        pose.spine.z = s.lean;
        pose.hips.x += 4.5 * easeOut(Math.min(1, p / 0.5));
        pose.hips.y += 2 * sin(p * PI);
        if (p >= 1) setMode('idle');
      }

      /* —— 施法动作覆盖 —— */
      if (mode === 'cast') {
        const p = Math.min(1, modeT / 0.66);
        const c = castPose(p);
        pose.shoulderL.z = lerp(pose.shoulderL.z, 108, c.up) + c.out * 16;
        pose.shoulderR.z = lerp(pose.shoulderR.z, -114, c.up) - c.out * 16;
        pose.elbowL.z = lerp(pose.elbowL.z, -74, c.up) + c.out * 54;
        pose.elbowR.z = lerp(pose.elbowR.z, -66, c.up) + c.out * 54;
        pose.hips.y += 3 * c.up;
        pose.spine.z += -3 * c.up;
        if (p >= 1) setMode('idle');
      }

      /* —— 受击：短促后仰 + 踉跄（0.34s） —— */
      if (mode === 'hurt') {
        const p = Math.min(1, modeT / 0.34);
        const k = sin(p * PI);
        pose.spine.z += -16 * k;
        pose.head.z += -12 * k;
        pose.hips.x += -7 * k;
        pose.shoulderL.z += 34 * k;
        pose.shoulderR.z += -34 * k;
        if (p >= 1) setMode('idle');
      }

      /* —— 跳跃：蹲 → 腾空 → 落地缓冲（1.05s） —— */
      if (mode === 'jump') {
        const p = Math.min(1, modeT / 1.05);
        if (p < 0.22) {                 /* 蓄力下蹲 */
          const t = easeOut(p / 0.22);
          pose.hips.y = lerp(0, 13, t);
          pose.kneeL.z = lerp(pose.kneeL.z, 44, t);
          pose.kneeR.z = lerp(pose.kneeR.z, 44, t);
          pose.spine.z = lerp(0, 12, t);
        } else if (p < 0.72) {          /* 腾空 */
          const t = easeOut((p - 0.22) / 0.5);
          const air = Math.sin(((p - 0.22) / 0.5) * PI);
          pose.hips.y = lerp(13, -30, t);
          pose.spine.z = lerp(12, -5, t);
          pose.shoulderL.z = lerp(pose.shoulderL.z, 52, t);
          pose.shoulderR.z = lerp(pose.shoulderR.z, -54, t);
          pose.hipL.z = lerp(pose.hipL.z, -24, t);
          pose.hipR.z = lerp(pose.hipR.z, -16, t);
          pose.kneeL.z = lerp(pose.kneeL.z, 46, t);
          pose.kneeR.z = lerp(pose.kneeR.z, 40, t);
          pose.sashL.z += 26 * air;
          pose.sashR.z += -26 * air;
        } else {                        /* 落地缓冲 */
          const t = easeInOut((p - 0.72) / 0.28);
          pose.hips.y = lerp(-30, 0, t * t);
          pose.kneeL.z = lerp(pose.kneeL.z, 40, t);
          pose.kneeR.z = lerp(pose.kneeR.z, 42, t);
          pose.spine.z = lerp(-5, 14, t);
        }
        if (p >= 1) setMode('idle');
      }

      /* —— 写入 DOM：平移(关节) + Z 摆动 + Y 转身 + X 前后倾 —— */
      ORDER.forEach(function (k) {
        const n = nodes[k];
        if (!n) return;
        const d = RIG[k];
        const q = pose[k];
        let tx = d.dx * skin.scale, ty = d.dy * skin.scale;
        if (k === 'hips') { tx += pose.hips.x; ty += pose.hips.y + (pose.lift || 0); }
        const rz = q.z || 0;
        const ry = (k === 'chest' || k === 'spine') ? pose.yaw * 0.6 : (k === 'hips' ? pose.yaw * 0.25 : (k === 'head' ? pose.yaw * 0.35 : 0));
        const rx = (k === 'spine' || k === 'chest') ? (pose.hunch || 0) * 0.5 : 0;
        n.style.transform =
          'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) ' +
          'rotateZ(' + rz.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateX(' + rx.toFixed(2) + 'deg)';
      });
      if (nodes.tail) {
        nodes.tail.style.transform =
          'translate3d(' + (-6 * skin.scale) + 'px,' + (4 * skin.scale) + 'px,0) rotateZ(' +
          (12 + 14 * sin(ph * 0.5 + breathe)) + 'deg)';
      }
    }

    return {
      setMode: setMode,
      update: update,
      get mode() { return mode; },
      pose: pose,
      setIsWalking(on) { setMode(on ? 'walk' : 'idle'); }
    };
  }

  /* --------------------------------------------------------------- 挂载 */
  function mount(host, opts) {
    const skin = createSkin(opts);
    const wrap = document.createElement('div');
    wrap.className = 'skel';
    const inner = document.createElement('div');
    inner.className = 'skel-inner';
    inner.style.transform = 'scale(' + skin.scale + ')';
    wrap.appendChild(inner);
    /* 怪物站在右侧、面向左：用独立的翻转层（不干扰骨骼自身的 3D 变换） */
    let stage = inner;
    if (opts && opts.flip) {
      const flip = document.createElement('div');
      flip.className = 'skel-flip';
      flip.style.transform = 'scaleX(-1)';
      stage.appendChild(flip);
      stage = flip;
    }
    host.appendChild(wrap);
    /* 把脚底精确落在容器地面线上（光环位于 bottom:-3px 处） */
    wrap.style.bottom = ((skin.legLen - 3) * skin.scale) + 'px';
    const nodes = buildRig(stage, skin);
    const motion = createMotion(nodes, skin);
    return { wrap: wrap, nodes: nodes, motion: motion, skin: skin, destroy() { wrap.remove(); } };
  }

  global.Skeleton = { mount: mount, POSES: POSES, RIG: RIG, createSkin: createSkin };
})(window);
