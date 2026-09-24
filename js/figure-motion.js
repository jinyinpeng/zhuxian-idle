/* =========================================================================
 * 诛仙问道 · 立绘动作引擎（保留原立绘形象，只给它装"骨骼"）
 *
 * 思路：不换形象、不切片，而是给整张立绘套上「骨骼层级」——
 *   地面层(hips) → 腰层(spine) → 转身层(spin) → 体层(body) → 原立绘
 * 每层 transform-origin 落在真实关节位置（脚底 / 腰 / 体轴），
 * 因此旋转与倾斜都发生在「关节」上：
 *   · 地面层：重心左右转移、起跳、整体倾斜（脚底不动 → 像真人在转移重心）
 *   · 腰层  ：前倾/后仰/扭腰（施法后仰、受击踉跄、挥击前压）
 *   · 转身层：绕体轴 rotateY（3D 转身，带透视）
 *   · 体层  ：squash & stretch（呼吸起伏、起跳蓄力、落地缓冲）
 * 全部程序化驱动（正弦呼吸 / 重心周期）+ 姿态关键帧缓动插值。
 * ========================================================================= */
(function (global) {
  'use strict';
  const sin = Math.sin, PI = Math.PI;

  /* 姿态基准表。
     注意：动作（walk/attack/cast/hurt/jump）的幅度一律为 0 ——
     它们由下面的动作曲线逐帧给出，避免「姿态值 + 曲线」把同一个角度算两遍
     （会把立绘歪到 20° 以上）。这里只保留静态姿势差异（如打坐）。 */
  const POSES = {
    idle:   { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    walk:   { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    attack: { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    cast:   { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    hurt:   { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    jump:   { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1,    sx: 1,    skew: 0 },
    think:  { lean: 4, rot: 0, yaw: 0, x: 0, y: 6, sy: 0.98, sx: 1.02, skew: 0 }
  };
  const KEYS = ['lean', 'rot', 'yaw', 'x', 'y', 'sy', 'sx', 'skew'];

  function lerp(a, b, t) { return a + (b - a) * t; }
  /* 技能动作风格表：一套曲线上按技能类型缩放幅度与节奏 ——
     http:// 一次写成四段：蓄力(windup) → 发劲(cast) → 送出(release) → 收势(recover)。
     dash=前冲量、rise=上浮量、spin=体轴扭转、power=整体幅度、dur=总时长(秒)。
     近战往前压、远程/范围往上浮并转体、绝技两者都拉满 —— 这样同一条曲线能演五种气质。 */
  const STYLES = {
    melee:  { dash: 1.15, rise: 0.55, spin: 1.0, power: 1.15, dur: 0.50 },
    ranged: { dash: 0.15, rise: 1.00, spin: 0.7, power: 0.95, dur: 0.68 },
    aoe:    { dash: 0.00, rise: 1.35, spin: 1.3, power: 1.10, dur: 0.86 },
    buff:   { dash: 0.00, rise: 1.15, spin: 0.5, power: 0.85, dur: 0.72 },
    ult:    { dash: 0.60, rise: 2.20, spin: 2.4, power: 1.50, dur: 1.30 }
  };

  /* 五个技能位各自的动作气质：与上表的「类型风格」相乘，
     于是 5 类型 × 5 技能位 = 25 套不重样的施法身段，但底层仍是一条曲线。 */
  const ACTIONS = [
    { dash: 0.90, rise: 1.00, spin: 0.60, power: 1.00, sway: 0 },     /* s1 御剑术：单手前指，干脆 */
    { dash: 1.25, rise: 0.80, spin: 1.20, power: 1.15, sway: 1 },     /* s2 破剑式：侧身连斩 */
    { dash: 0.00, rise: 1.10, spin: 0.40, power: 0.90, sway: 0 },     /* s3 增益：结印抱圆，稳 */
    { dash: 0.45, rise: 1.60, spin: 1.00, power: 1.20, sway: -1 },    /* s4 中技：双手高举召回 */
    { dash: 0.70, rise: 2.40, spin: 2.60, power: 1.50, sway: 0 }      /* s5 绝技：腾空大转身 */
  ];

  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t); }

  function blend(pa, pb, t, out) {
    const base = POSES.idle;
    KEYS.forEach(function (k) {
      const a = (pa && pa[k] !== undefined) ? pa[k] : base[k];
      const b = (pb && pb[k] !== undefined) ? pb[k] : base[k];
      out[k] = lerp(a, b, t);
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  function mount(unitNode, opts) {
    if (!unitNode) return null;
    const o = opts || {};
    const avatar = unitNode.querySelector('.avatar');
    if (!avatar) return null;
    const fig = avatar.querySelector('.fig');
    if (!fig) return null;

    /* 骨骼层级： hips(地面) → spine(腰) → spin(转身) → body(体) → 立绘
       注意：原立绘节点「不移动」——只隐藏，层级里放它的克隆层。
       这样既有代码对 .fig 的任何引用/操作都不受影响（避免破坏 DOM 假设）。 */
    const hips = document.createElement('div');
    hips.className = 'fm fm-hips';
    const spine = document.createElement('div');
    spine.className = 'fm fm-spine';
    const spin = document.createElement('div');
    spin.className = 'fm fm-spin';
    const body = document.createElement('div');
    body.className = 'fm fm-body';
    hips.appendChild(spine); spine.appendChild(spin); spin.appendChild(body);
    const view = fig.cloneNode(true);          /* 同一张立绘，形象完全一致 */
    view.removeAttribute('id');
    /* 关键：副本不能带 fig-src-hidden —— 重复挂载时会把副本自己也隐藏掉 */
    view.classList.remove('fig-src-hidden');
    view.classList.add('fig-view');
    body.appendChild(view);
    avatar.appendChild(hips);
    fig.classList.add('fig-src-hidden');       /* 原节点留在 DOM 里，只隐藏 */
    unitNode.classList.add('fig-motion');
    const figLive = view;

    const pose = { lean: 0, rot: 0, yaw: 0, x: 0, y: 0, sy: 1, sx: 1, skew: 0 };
    let mode = 'idle', lastMode = 'idle', modeT = 0, trans = 1;
    let t = Math.random() * 6;          /* 相位错开，多只单位不同步呼吸 */
    let gait = 0;
    let style = 'melee', slot = 0, releaseCb = null, releaseFired = false;
    /* 类型风格 × 技能位气质，合成这一击的实际幅度与节奏 */
    function st() {
      const b = STYLES[style] || STYLES.melee;
      const a = ACTIONS[slot] || ACTIONS[0];
      return {
        dur: b.dur, dash: b.dash * a.dash, rise: b.rise * a.rise,
        spin: b.spin * a.spin, power: b.power * a.power, sway: a.sway
      };
    }
    /* 「送出」那一瞬：特效与动作同拍 —— 关键帧只报一次 */
    function fireRelease(p, at) {
      if (releaseFired || p < at) return;
      releaseFired = true;
      if (releaseCb) { try { releaseCb(); } catch (e) { } }
    }

    function setMode(m) {
      if (m === mode) return;
      lastMode = mode; mode = m; modeT = 0; trans = 0;
      releaseFired = false;              /* 新动作重新计关键帧 */
      if (m !== 'attack' && m !== 'cast') style = 'melee';
    }

    function update(dt) {
      if (!figLive.isConnected) return;  /* 单位被移除后自动停止 */
      modeT += dt; t += dt;
      if (trans < 1) trans = Math.min(1, trans + dt / 0.2);

      blend(POSES[lastMode], POSES[mode], easeInOut(trans), pose);

      const br = sin(t * 1.9) * 0.5 + 0.5;      /* 呼吸 0..1 */
      const calm = mode === 'idle' || mode === 'think';

      /* —— 待机：呼吸起伏 + 重心微移 + 缓慢转体（脚底不动） ——
         幅度按「110px 立绘」标定：呼吸约 3px 起伏、重心约 2px、体轴 ±5°（肉眼可见但不夸张） */
      if (calm) {
        pose.sy *= 1 + 0.028 * br;
        pose.sx *= 1 - 0.014 * br;
        pose.y -= 1.8 * br;
        pose.x += 1.7 * sin(t * 0.62);
        pose.rot += 1.8 * sin(t * 1.05);
        pose.yaw += 5.5 * sin(t * 0.36);        /* 3D 转身微摆 */
        pose.lean += 1.2 * sin(t * 0.5 + 0.8);
      } else {
        pose.sy *= 1 + 0.013 * br;
      }

      /* —— 走：重心周期（左右交替下沉 + 起伏） —— */
      if (mode === 'walk') {
        gait += dt * 2.2;
        const ph = gait * 2 * PI;
        pose.x += 3.4 * sin(ph);
        pose.y += -3.0 * Math.abs(sin(ph));
        pose.rot += 4.0 * sin(ph);
        pose.yaw += 7.5 * sin(ph * 0.5);
        pose.lean += 2.2 * Math.abs(sin(ph * 0.5));
      }

      /* —— 挥击：后撤蓄力 → 前压送出 → 收势 —— */
      if (mode === 'attack') {
        const S = st(), kp = S.power, kd = S.dash;
        const p = Math.min(1, modeT / S.dur);
        if (p < 0.3) {                       /* ① 蓄力：后撤、沉肩、体轴反拧 */
          const k = easeOut(p / 0.3) * kp;
          pose.x -= 4 * k * kd; pose.lean -= 4 * k; pose.yaw -= 7 * k;
        } else if (p < 0.58) {               /* ② 发劲 → ③ 送出：前压刺出，重心的冲量最大 */
          const k = easeOut((p - 0.3) / 0.28);
          pose.x += lerp(-4 * kp * kd, 7 * kp * kd, k);
          pose.lean += lerp(-4 * kp, 7 * kp, k);
          pose.yaw += lerp(-7 * kp, 9 * kp, k);
          pose.y -= 2.2 * kp * sin(k * PI);
          pose.x += 3.0 * kp * S.sway;       /* 连斩：侧身换位 */
          fireRelease(p, 0.5);
        } else {                             /* ④ 收势：卸力回位 */
          const k = easeInOut((p - 0.58) / 0.42);
          pose.x += lerp(7 * kp * kd, 0, k);
          pose.lean += lerp(7 * kp, 0, k);
          pose.yaw += lerp(9 * kp, 0, k);
        }
        if (p >= 1) setMode('idle');
      }

      /* —— 施法：上浮、后仰、体轴微转 —— */
      if (mode === 'cast') {
        const S = st(), kp = S.power;
        const p = Math.min(1, modeT / S.dur);
        /* ① 蓄力上浮（起手）→ ② 掐诀保持（发劲）→ ④ 收势回落 */
        const c = p < 0.4 ? easeOut(p / 0.4) : (p < 0.72 ? 1 : 1 - easeInOut((p - 0.72) / 0.28));
        pose.y -= 4.5 * c * S.rise * (kp / 1.15);
        pose.lean -= 3.5 * c * kp;
        pose.sy *= 1 + 0.016 * c * S.rise;
        pose.yaw += 6 * sin(p * PI) * S.spin;
        pose.x += 3.6 * c * S.sway;          /* 侧身位：起手先侧让再出面 */
        fireRelease(p, 0.62);
        if (p >= 1) setMode('idle');
      }

      /* —— 受击：后仰 + 被击退 + 稳住 —— */
      if (mode === 'hurt') {
        const p = Math.min(1, modeT / 0.34);
        const k = sin(p * PI);
        pose.lean -= 9 * k;
        pose.x -= 6 * k;
        pose.y += 1.5 * k;
        pose.yaw -= 5 * k;
        if (p >= 1) setMode('idle');
      }

      /* —— 跳跃：下蹲蓄力 → 腾空 → 落地缓冲（squash & stretch） —— */
      if (mode === 'jump') {
        const p = Math.min(1, modeT / 1.05);
        if (p < 0.2) { const k = easeOut(p / 0.2); pose.y += 7 * k; pose.sy *= 1 - 0.06 * k; pose.sx *= 1 + 0.05 * k; pose.lean += 5 * k; }
        else if (p < 0.7) {
          const k = (p - 0.2) / 0.5;
          const up = 1 - Math.pow(1 - Math.min(1, k * 1.5), 2);
          pose.y += lerp(7, -30, up);
          pose.sy *= 1 + 0.06 * Math.sin(k * PI);
          pose.sx *= 1 - 0.04 * Math.sin(k * PI);
          pose.lean += lerp(5, -4, up);
        } else {
          const k = easeInOut((p - 0.7) / 0.3);
          pose.y += lerp(-30, 0, k * k);
          pose.sy *= 1 - 0.07 * (1 - Math.abs(k - 0.25) * 2 > 0 ? (1 - Math.abs(k - 0.25) * 2) : 0);
          pose.sx *= 1 + 0.05 * (1 - Math.abs(k - 0.25) * 2 > 0 ? (1 - Math.abs(k - 0.25) * 2) : 0);
        }
        if (p >= 1) setMode('idle');
      }

      /* —— 写入各层（关节在该层原点上） —— */
      hips.style.transform =
        'translate3d(' + pose.x.toFixed(2) + 'px,' + pose.y.toFixed(2) + 'px,0) ' +
        'rotate(' + pose.rot.toFixed(2) + 'deg)';
      spine.style.transform =
        'rotate(' + pose.lean.toFixed(2) + 'deg) skewX(' + pose.skew.toFixed(2) + 'deg)';
      spin.style.transform =
        'perspective(420px) rotateY(' + pose.yaw.toFixed(2) + 'deg)';
      body.style.transform =
        'scale(' + pose.sx.toFixed(4) + ',' + pose.sy.toFixed(4) + ')';
    }

    return {
      setMode: setMode,
      update: update,
      /* 技能动作系统接口：设风格、挂「送出」回调、查关键帧状态 */
      setStyle: function (s, mode2, slot2) {
        if (STYLES[s]) style = s;
        if (slot2 != null) slot = Math.max(0, Math.min(ACTIONS.length - 1, slot2 | 0));
        if (mode2) { setMode('idle'); setMode(mode2); }
      },
      onRelease: function (cb) { releaseCb = cb; releaseFired = false; },
      clearRelease: function () { releaseCb = null; releaseFired = false; },
      get style() { return style; },
      get released() { return releaseFired; },
      get mode() { return mode; },
      destroy: function () {
        /* 类挂在「单位」节点上，卸载时两个都要清掉，否则残留的 .fig-motion
           会继续命中 .fig-src-hidden 规则，把后换上的新立绘一起隐藏 */
        unitNode.classList.remove('fig-motion');
        avatar.classList.remove('fig-motion');
        fig.classList.remove('fig-src-hidden');
        if (hips.parentNode) hips.parentNode.removeChild(hips);
      }
    };
  }

  global.FigureMotion = { mount: mount, POSES: POSES, STYLES: STYLES };
})(window);
