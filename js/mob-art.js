/* =========================================================================
 * 怪物立绘 · 写实向矢量美术   window.MOB_ART
 * -------------------------------------------------------------------------
 * 为什么重画：
 *   assets/mob_beast.png 与 mob_demon.png 实测「几乎全透明 + 极淡素描线」
 *   （角像素 A=0；体像素 A=0~33），在深色场景里只剩一点灰痕 ——
 *   挂机画面里的「怪物」其实是一团灰雾，自然谈不上可信。
 *   另外三类（幽魂 / 修士 / 妖将）走的是更早期的扁平 SVG。
 *
 * 写实感靠六件事（显示尺寸只有 110~130px，所以不做细碎刻画，只做能读出来的）：
 *   ① 体块正确 —— 先立剪影骨架，再谈细节；解剖不对，上色再细也不像
 *   ② 三段明暗 —— 受光 / 中间调 / 暗部，一条垂直渐变一次成型
 *   ③ 轮廓光   —— 背脊打一道亮边，这是「有体积 + 有环境光」最省成本的信号
 *   ④ 环境遮蔽 —— 关节、腹下、颌底压暗，物与物之间才有接触关系
 *   ⑤ 材质笔触 —— 兽毛 / 鳞片 / 破布 / 金属各用各的笔法，不能都是同一块色
 *   ⑥ 点睛高光 —— 眼睛与刃口给纯亮色，视线会立刻被抓住
 *
 * 渐变 id 按家族加前缀（bf / gh / dm / hm / bs）：同族多实例共用同一套渐变是
 * 安全的（内容完全相同），跨家族不会撞名，因此不需要运行时生成唯一 id。
 * ========================================================================= */
(function (global) {
  'use strict';

  function wrap(vb, body, elite) {
    return '<svg class="fig' + (elite ? ' elite' : '') + '" viewBox="' + vb + '"' +
      ' xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      body + '</svg>';
  }

  /* ======================================================== 妖兽（四足猛兽） */
  function beast(elite) {
    return wrap('0 0 220 150',
      '<defs>' +
        '<linearGradient id="bfB" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#b3813f"/><stop offset=".42" stop-color="#71461d"/><stop offset="1" stop-color="#241407"/>' +
        '</linearGradient>' +
        '<linearGradient id="bfD" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#5c3a18"/><stop offset="1" stop-color="#180d05"/>' +
        '</linearGradient>' +
        '<linearGradient id="bfR" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffe6b0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="bfAO"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="bfEye"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffc32e"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      /* 贴地投影：先给"重量" */
      '<ellipse cx="116" cy="144" rx="88" ry="6.5" fill="#000" opacity=".4"/>' +
      /* 远侧后腿（压暗后退，制造纵深） */
      '<path d="M152 84c9 16 11 34 6 54h-17c4-19 3-35-3-48z" fill="#2c1a0c"/>' +
      /* 尾巴：上挑的曲线，末端带毛簇 */
      '<path d="M166 78c18-8 33-22 43-40 5 12 2 27-8 40-9 12-19 19-30 22z" fill="url(#bfB)"/>' +
      '<path d="M204 38c6 3 10 8 12 14-6-1-12-4-17-9z" fill="#8d5c25"/>' +
      /* 躯干：弓背 + 收腹 */
      '<path d="M62 74c12-16 34-24 58-22 26 2 44 12 54 30 6 12 2 22-8 26-16 6-38 8-58 6-22-2-40-8-48-18-6-8-4-16 2-22z" fill="url(#bfB)"/>' +
      /* 腹下环境遮蔽 */
      '<ellipse cx="118" cy="112" rx="52" ry="14" fill="url(#bfAO)"/>' +
      /* 近侧后腿 */
      '<path d="M164 88c11 16 14 34 10 54h-20c4-20 2-36-6-48z" fill="url(#bfD)"/>' +
      /* 前腿一对 */
      '<path d="M86 96c8 14 10 30 7 46H74c3-17 2-32-4-44z" fill="url(#bfD)"/>' +
      '<path d="M70 94c7 15 9 31 6 48H58c3-18 2-33-3-45z" fill="#3a220f"/>' +
      /* 头：低伏前伸的楔形，咬合线清晰 */
      '<path d="M28 86c-4-10 2-20 14-26 12-7 27-9 40-5 11 4 17 12 16 21-1 10-12 17-27 19-14 2-31 1-43-9z" fill="url(#bfB)"/>' +
      '<path d="M30 92c10 6 24 7 36 4l-3 7c-12 3-25 1-33-5z" fill="#180d05"/>' +   /* 下颌暗部 */
      '<path d="M52 74l6 5 6-5 5 5 6-4" stroke="#ffe6b0" stroke-opacity=".5" stroke-width="1.4" fill="none"/>' +
      /* 上颌獠牙 + 下颚獠牙 */
      '<path d="M42 92l3 9 3-9zM54 94l3 10 3-10zM66 93l3 8 3-8z" fill="#fff4dc"/>' +
      '<path d="M45 103l2.5-8 2.5 8zM58 105l2.5-8 2.5 8z" fill="#f2e4c8"/>' +
      /* 耳 / 角 */
      '<path d="M44 60l-6-16 11 8zM62 56l-2-18 9 11z" fill="url(#bfD)"/>' +
      /* 鬃毛：背脊上的笔触，越接近头部越密 */
      '<g stroke="#d8a55f" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round" fill="none">' +
        '<path d="M48 58l-4-9M56 54l-3-11M66 52l-2-12M78 50l-1-12M90 50l1-12M102 52l2-12M114 56l3-11M126 62l4-10M138 70l5-9"/>' +
      '</g>' +
      '<g stroke="#7a4d1e" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round" fill="none">' +
        '<path d="M52 66l-6-6M62 62l-5-8M74 60l-4-9M86 60l-3-9M98 62l-2-9M110 66l-1-9M122 72l1-8M134 80l2-7"/>' +
      '</g>' +
      /* 背部轮廓光 */
      '<path d="M44 62c14-15 36-22 60-20 26 2 44 12 54 30l-7-2C142 56 126 49 104 47 82 45 62 51 50 64z" fill="url(#bfR)"/>' +
      /* 利爪 */
      '<g fill="#efe2c6"><path d="M58 141l-2 7 3-2 1 4 2-5 2 3v-7zM74 141l-2 7 3-2 1 4 2-5 2 3v-7zM154 143l-2 6 3-2 1 4 2-5 2 3v-6zM168 143l-2 6 3-2 1 4 2-5 2 3v-6z"/></g>' +
      /* 眼睛：先一层辉光再点瞳 */
      '<circle cx="45" cy="76" r="7" fill="url(#bfEye)" opacity=".55"/>' +
      '<circle cx="60" cy="72" r="7" fill="url(#bfEye)" opacity=".5"/>' +
      '<circle cx="45" cy="76" r="2.1" fill="#fff8cd"/><circle cx="60" cy="72" r="2.1" fill="#fff8cd"/>' +
      (elite ? '<path d="M32 52l6-14 7 11 6-13 7 12 7-11 5 14z" fill="#facc15" opacity=".92"/>' : '')
,
      elite
    );
  }

  /* ============================================================ 幽魂（飘浮） */
  function ghost(elite) {
    return wrap('0 0 150 196',
      '<defs>' +
        '<linearGradient id="ghB" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#a8f2e6" stop-opacity=".5"/><stop offset=".5" stop-color="#3aa79c" stop-opacity=".32"/><stop offset="1" stop-color="#0d3a42" stop-opacity=".16"/>' +
        '</linearGradient>' +
        '<linearGradient id="ghH" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#7fe8dc"/><stop offset="1" stop-color="#155e63"/>' +
        '</linearGradient>' +
        '<radialGradient id="ghAO"><stop offset="0" stop-color="#04222a" stop-opacity=".6"/><stop offset="1" stop-color="#04222a" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="ghEye"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#7dfbea"/><stop offset="1" stop-color="#12c4b4" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse cx="75" cy="186" rx="40" ry="4.5" fill="#0a2a30" opacity=".45"/>' +
      /* 幽气：身后两缕飘带 */
      '<g fill="none" stroke="#6fe6d6" stroke-opacity=".3" stroke-linecap="round">' +
        '<path d="M40 70c-14 14-22 32-22 52" stroke-width="5"/>' +
        '<path d="M110 76c14 12 20 28 18 46" stroke-width="4"/>' +
      '</g>' +
      /* 主体：无腿，下摆化开成破布 */
      '<path d="M75 22c26 0 44 20 46 46 2 22-4 42-8 58-3 13-6 24-4 34-8-6-14-16-20-14-7 3-8 16-15 18-7-3-8-14-15-17-6-2-12 7-20 13 2-11-1-22-4-35-5-17-11-37-9-59 2-26 21-44 49-44z" fill="url(#ghB)"/>' +
      /* 兜帽 / 头骨 */
      '<path d="M75 26c16 0 27 12 28 27 1 13-8 23-28 23s-29-10-28-23c1-15 12-27 28-27z" fill="url(#ghH)" opacity=".92"/>' +
      '<path d="M75 30c12 0 20 8 21 19 .5 9-6 15-21 15s-21-6-21-15c1-11 9-19 21-19z" fill="#0c3340" opacity=".55"/>' +
      /* 空洞眼窝 + 幽光 */
      '<ellipse cx="64" cy="48" rx="7.5" ry="9" fill="#04161c"/>' +
      '<ellipse cx="88" cy="48" rx="7.5" ry="9" fill="#04161c"/>' +
      '<circle cx="64" cy="49" r="9" fill="url(#ghEye)" opacity=".5"/>' +
      '<circle cx="88" cy="49" r="9" fill="url(#ghEye)" opacity=".5"/>' +
      '<circle cx="64" cy="49" r="2.6" fill="#eafffb"/><circle cx="88" cy="49" r="2.6" fill="#eafffb"/>' +
      /* 鼻腔与齿列 */
      '<path d="M76 58l-3 7h6z" fill="#04161c"/>' +
      '<path d="M66 68h19l-2 3H68z" fill="#04161c" opacity=".8"/>' +
      '<g stroke="#dffff9" stroke-opacity=".7" stroke-width="1.1">' +
        '<path d="M67 68v4M71 68v4.5M75 68v4.8M79 68v4.5M83 68v4"/>' +
      '</g>' +
      /* 胸口幽火 + 轮廓光 */
      '<ellipse cx="75" cy="104" rx="16" ry="20" fill="url(#ghAO)"/>' +
      '<path d="M75 92c5 8 8 14 8 20 0 6-4 10-8 10s-8-4-8-10c0-6 3-12 8-20z" fill="#b6fff2" opacity=".32"/>' +
      '<path d="M46 32c-8 10-11 24-11 38 0 16 4 30 8 44" stroke="#d6fff8" stroke-opacity=".5" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      /* 腰间破布 */
      '<path d="M44 126c8 6 18 8 30 8s22-2 30-8c-2 16-6 30-10 42-8 4-16 6-24 6s-16-2-22-6c-4-12-6-26-4-42z" fill="#0b3238" opacity=".5"/>' +
      (elite ? '<path d="M75 118c4 6 6 11 6 15 0 5-3 8-6 8s-6-3-6-8c0-4 2-9 6-15z" fill="#f43f5e" opacity=".55"/>' : '')
,
      elite
    );
  }

  /* =============================================================== 魔物（人形） */
  function demon(elite) {
    return wrap('0 0 180 200',
      '<defs>' +
        '<linearGradient id="dmB" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#c2483a"/><stop offset=".45" stop-color="#6d1d18"/><stop offset="1" stop-color="#200a08"/>' +
        '</linearGradient>' +
        '<linearGradient id="dmD" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#5a1a16"/><stop offset="1" stop-color="#160607"/>' +
        '</linearGradient>' +
        '<linearGradient id="dmH" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff0dc"/><stop offset="1" stop-color="#8a7154"/>' +
        '</linearGradient>' +
        '<radialGradient id="dmAO"><stop offset="0" stop-color="#0a0303" stop-opacity=".62"/><stop offset="1" stop-color="#0a0303" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="dmEye"><stop offset="0" stop-color="#fff3d0"/><stop offset=".38" stop-color="#ff5a2e"/><stop offset="1" stop-color="#e01b00" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse cx="90" cy="192" rx="52" ry="6" fill="#000" opacity=".42"/>' +
      /* 翼影：张开但半透明，只做剪影暗示 */
      '<path d="M60 74c-22-6-40-18-50-34 16 4 30 4 42 12 10 7 16 15 18 24z" fill="#3a0f0c" opacity=".75"/>' +
      '<path d="M120 74c22-6 40-18 50-34-16 4-30 4-42 12-10 7-16 15-18 24z" fill="#3a0f0c" opacity=".75"/>' +
      /* 腿：反关节 */
      '<path d="M70 128c-6 16-10 32-8 48h16c-1-16 2-30 8-42z" fill="url(#dmD)"/>' +
      '<path d="M110 128c6 16 10 32 8 48h-16c1-16-2-30-8-42z" fill="url(#dmD)"/>' +
      '<path d="M62 172h18l4 12H58c-3-5-1-9 4-12z" fill="#2a0d0a"/>' +
      '<path d="M100 172h18c5 3 7 7 4 12h-26z" fill="#2a0d0a"/>' +
      /* 躯干 + 胸腹肌理 */
      '<path d="M90 44c22 0 36 14 38 34 2 20-2 40-10 56-8 8-18 12-28 12s-20-4-28-12c-8-16-12-36-10-56 2-20 16-34 38-34z" fill="url(#dmB)"/>' +
      '<ellipse cx="90" cy="118" rx="30" ry="18" fill="url(#dmAO)"/>' +
      '<g stroke="#2a0b09" stroke-opacity=".55" stroke-width="1.6" fill="none">' +
        '<path d="M74 72c8 4 24 4 32 0M72 86c10 5 26 5 36 0M70 100c11 4 29 4 40 0"/>' +
      '</g>' +
      /* 肩甲尖刺 */
      '<path d="M52 62l-14-14 18 2 4 14zM128 62l14-14-18 2-4 14z" fill="#40110d"/>' +
      /* 手臂 + 血爪 */
      '<path d="M54 66c-10 12-14 28-12 44 2 8 6 14 12 18 4-16 6-32 6-46z" fill="url(#dmD)"/>' +
      '<path d="M126 66c10 12 14 28 12 44-2 8-6 14-12 18-4-16-6-32-6-46z" fill="url(#dmD)"/>' +
      '<g fill="url(#dmH)"><path d="M44 128l-6 14 6-3 2 6 4-9 4 6-2-14zM136 128l6 14-6-3-2 6-4-9-4 6 2-14z"/></g>' +
      /* 头 + 双角 */
      '<path d="M90 20c16 0 26 10 27 24 1 12-8 22-27 22s-28-10-27-22c1-14 11-24 27-24z" fill="url(#dmB)"/>' +
      '<path d="M74 34c-8-8-12-20-10-32 8 6 16 14 22 24zM106 34c8-8 12-20 10-32-8 6-16 14-22 24z" fill="url(#dmH)"/>' +
      '<path d="M76 40c6-3 22-3 28 0-2 6-6 9-14 9s-12-3-14-9z" fill="#1c0705"/>' +
      '<g stroke="#ffe9d2" stroke-opacity=".85" stroke-width="1.4">' +
        '<path d="M80 47l1 5M86 48v5M94 48v5M100 47l-1 5"/>' +
      '</g>' +
      /* 胸符（暗红辉光 = 力量来源） */
      '<path d="M90 84l10 6-4 11-12 0-4-11z" fill="#ff6a3d" opacity=".35"/>' +
      '<path d="M90 86l7 4-3 8h-8l-3-8z" fill="none" stroke="#ffb08a" stroke-opacity=".7" stroke-width="1.2"/>' +
      /* 眼睛 */
      '<circle cx="80" cy="42" r="9" fill="url(#dmEye)" opacity=".6"/>' +
      '<circle cx="100" cy="42" r="9" fill="url(#dmEye)" opacity=".6"/>' +
      '<path d="M74 40l9 4-9 3zM106 40l-9 4 9 3z" fill="#fff6e2"/>' +
      /* 背脊轮廓光 */
      '<path d="M60 50c14-16 46-16 60 0l-6 3c-11-13-37-13-48 0z" fill="#ffcbb4" opacity=".45"/>' +
      (elite ? '<path d="M90 6l7 12 12-4-6 12 12 5-13 3 3 12-11-7-8 10-6-12-13 2 8-10-9-9 13 1z" fill="#f43f5e" opacity=".8"/>' : '')
,
      elite
    );
  }

  /* ============================================================ 修士（人形） */
  function human(elite) {
    return wrap('0 0 140 196',
      '<defs>' +
        '<linearGradient id="hmB" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#7d9cc0"/><stop offset=".45" stop-color="#33506f"/><stop offset="1" stop-color="#121c28"/>' +
        '</linearGradient>' +
        '<linearGradient id="hmD" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#3d5a78"/><stop offset="1" stop-color="#0d151d"/>' +
        '</linearGradient>' +
        '<linearGradient id="hmS" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#f4f8fb"/><stop offset=".5" stop-color="#a9bccb"/><stop offset="1" stop-color="#5c6c7a"/>' +
        '</linearGradient>' +
        '<linearGradient id="hmF" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#f2d3b0"/><stop offset="1" stop-color="#a9774f"/>' +
        '</linearGradient>' +
        '<radialGradient id="hmAO"><stop offset="0" stop-color="#04080d" stop-opacity=".55"/><stop offset="1" stop-color="#04080d" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse cx="70" cy="190" rx="34" ry="5" fill="#000" opacity=".4"/>' +
      /* 剑：斜持于身侧，刃口高光成一条线 */
      '<path d="M104 44l6 3-30 96-6-2z" fill="url(#hmS)"/>' +
      '<path d="M105 42l7 4-3 6-6-4z" fill="#cfe0ea"/>' +
      '<path d="M74 140l20 8-3 8-20-8z" fill="#5b4a2c"/>' +
      /* 袍身：宽袖、束腰、下摆渐暗 */
      '<path d="M70 58c14 0 24 8 27 20 4 16 6 34 8 52 2 16 4 30 6 42-14 6-46 6-62 0 2-12 4-26 6-42 2-18 4-36 8-52 3-12 12-20 27-20z" fill="url(#hmB)"/>' +
      '<ellipse cx="70" cy="150" rx="30" ry="26" fill="url(#hmAO)"/>' +
      /* 衣纹 */
      '<g stroke="#0c161f" stroke-opacity=".5" stroke-width="1.4" fill="none">' +
        '<path d="M58 82c-3 18-5 38-6 58M82 82c3 18 5 38 6 58M62 108c6 4 10 4 16 0"/>' +
      '</g>' +
      /* 腰带 */
      '<path d="M50 106c12 5 28 5 40 0l2 9c-14 5-30 5-44 0z" fill="#26384a"/>' +
      '<path d="M68 108h6l-3 12z" fill="#c9a227"/>' +
      /* 大袖（垂坠感靠明暗分层） */
      '<path d="M44 68c-12 12-18 30-16 48 2 10 8 16 18 18 2-22 4-44 8-60z" fill="url(#hmD)"/>' +
      '<path d="M96 68c12 12 18 30 16 48-2 10-8 16-18 18-2-22-4-44-8-60z" fill="url(#hmD)"/>' +
      /* 手 */
      '<path d="M40 132c6-2 10 2 10 7s-4 8-9 7-6-11-1-14z" fill="url(#hmF)"/>' +
      '<path d="M100 130c6 2 8 8 5 12s-9 3-11-2 0-9 6-10z" fill="url(#hmF)"/>' +
      /* 颈与头 */
      '<path d="M64 48h12v12H64z" fill="#8a5f3c"/>' +
      '<path d="M70 20c11 0 18 8 18 19s-8 18-18 18-18-7-18-18 7-19 18-19z" fill="url(#hmF)"/>' +
      '<path d="M52 30c4-12 12-18 18-18s14 6 18 18c-3-6-9-9-18-9s-15 3-18 9z" fill="#1b2530"/>' +
      '<path d="M56 22c6-6 22-6 28 0l-2 5c-6-5-18-5-24 0z" fill="#2c3a49"/>' +   /* 束发 */
      /* 眼 */
      '<path d="M62 38l6 2-6 2zM78 38l-6 2 6 2z" fill="#12191f"/>' +
      /* 肩部轮廓光 + 剑刃反光 */
      '<path d="M52 62c6-14 30-14 36 0l-5 2c-5-11-21-11-26 0z" fill="#dfeaf5" opacity=".5"/>' +
      '<path d="M104 50l4 2-26 84-3-2z" fill="#ffffff" opacity=".5"/>' +
      (elite ? '<circle cx="70" cy="10" r="6" fill="none" stroke="#facc15" stroke-opacity=".8" stroke-width="1.6"/>' +
        '<circle cx="70" cy="10" r="2.4" fill="#facc15"/>' : '')
,
      elite
    );
  }

  /* ============================================================ 妖将（首领） */
  function boss(elite) {
    return wrap('0 0 200 214',
      '<defs>' +
        '<linearGradient id="bsB" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#d15a68"/><stop offset=".42" stop-color="#7a2230"/><stop offset="1" stop-color="#1c0609"/>' +
        '</linearGradient>' +
        '<linearGradient id="bsD" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#4a5058"/><stop offset="1" stop-color="#14181d"/>' +
        '</linearGradient>' +
        '<linearGradient id="bsG" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#d3a52c"/><stop offset="1" stop-color="#7a5406"/>' +
        '</linearGradient>' +
        '<radialGradient id="bsAO"><stop offset="0" stop-color="#080204" stop-opacity=".66"/><stop offset="1" stop-color="#080204" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="bsEye"><stop offset="0" stop-color="#fff0d6"/><stop offset=".38" stop-color="#ff4d4d"/><stop offset="1" stop-color="#c90000" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse cx="100" cy="206" rx="66" ry="7" fill="#000" opacity=".45"/>' +
      /* 大氅：身后的披风，边缘破损 */
      '<path d="M62 78c-22 26-32 62-30 100 14 8 32 12 52 12-8-40-4-78 12-112z" fill="#2a0d13" opacity=".92"/>' +
      '<path d="M138 78c22 26 32 62 30 100-14 8-32 12-52 12 8-40 4-78-12-112z" fill="#2a0d13" opacity=".92"/>' +
      /* 腿甲 */
      '<path d="M76 140c-6 18-9 36-7 54h20c-1-18 2-34 8-48z" fill="url(#bsD)"/>' +
      '<path d="M124 140c6 18 9 36 7 54h-20c1-18-2-34-8-48z" fill="url(#bsD)"/>' +
      '<path d="M68 190h22l5 14H63c-4-6-1-11 5-14zM110 190h22c6 3 9 8 5 14h-32z" fill="#0f1216"/>' +
      /* 躯干 + 重甲 */
      '<path d="M100 44c24 0 40 16 42 38 2 22-2 44-10 62-9 9-20 13-32 13s-23-4-32-13c-8-18-12-40-10-62 2-22 18-38 42-38z" fill="url(#bsB)"/>' +
      '<ellipse cx="100" cy="128" rx="34" ry="20" fill="url(#bsAO)"/>' +
      /* 护心镜（金属，带高光） */
      '<path d="M100 76c10 0 17 6 18 15 1 10-6 17-18 17s-19-7-18-17c1-9 8-15 18-15z" fill="url(#bsG)"/>' +
      '<path d="M100 80c7 0 12 4 13 11-6-5-20-5-26 0 1-7 6-11 13-11z" fill="#fff6d2" opacity=".55"/>' +
      /* 肩甲（带尖刺） */
      '<path d="M58 62c-6-10-4-20 6-26 10-5 20 0 24 10-8-2-16 0-20 6-3 4-6 7-10 10z" fill="url(#bsD)"/>' +
      '<path d="M142 62c6-10 4-20-6-26-10-5-20 0-24 10 8-2 16 0 20 6 3 4 6 7 10 10z" fill="url(#bsD)"/>' +
      '<path d="M52 42l-10-14 16 4 4 12zM148 42l10-14-16 4-4 12z" fill="#8f1e2b"/>' +
      /* 臂与巨刃 */
      '<path d="M58 70c-10 14-14 32-11 50 2 8 6 14 12 18 4-18 6-36 6-52z" fill="#5d1a24"/>' +
      '<path d="M142 70c10 14 14 32 11 50-2 8-6 14-12 18-4-18-6-36-6-52z" fill="#5d1a24"/>' +
      '<path d="M28 96l10 2-9 74-9-2z" fill="url(#bsD)"/>' +
      '<path d="M30 92l7 2-2 10-7-2z" fill="url(#bsG)"/>' +
      '<path d="M27 118l16 4-1 6-16-4z" fill="#6b747f"/>' +
      '<g fill="#e8dcc0"><path d="M40 168l4 12-7-4-4 7-2-12zM156 168l-4 12 7-4 4 7 2-12z"/></g>' +
      /* 头 + 王冠角 */
      '<path d="M100 18c17 0 28 11 29 25 1 13-9 23-29 23s-30-10-29-23c1-14 12-25 29-25z" fill="url(#bsB)"/>' +
      '<path d="M84 30c-10-8-16-20-14-32 10 6 20 14 26 24zM116 30c10-8 16-20 14-32-10 6-20 14-26 24z" fill="url(#bsG)"/>' +
      '<path d="M100 6l5 12 8-10-1 14 12-6-7 13 14-2-11 10 13 3-14 3 9 9-14-3 3 12-10-9-6 11-4-12-9 8 3-12-13 2 10-8-13-2 13-4-9-8 13 2-6-12 11 7-1-13z" fill="url(#bsG)" opacity=".9"/>' +
      '<path d="M86 46c8-4 20-4 28 0-2 7-7 11-14 11s-12-4-14-11z" fill="#240608"/>' +
      '<g stroke="#ffe9c8" stroke-opacity=".9" stroke-width="1.5">' +
        '<path d="M90 54v6M96 55v7M104 55v7M110 54v6"/>' +
      '</g>' +
      /* 眼 */
      '<circle cx="89" cy="42" r="10" fill="url(#bsEye)" opacity=".62"/>' +
      '<circle cx="111" cy="42" r="10" fill="url(#bsEye)" opacity=".62"/>' +
      '<path d="M82 40l10 4-10 3zM118 40l-10 4 10 3z" fill="#fff6e6"/>' +
      /* 轮廓光 */
      '<path d="M68 52c16-20 48-20 64 0l-7 3c-12-16-38-16-50 0z" fill="#ffd3c8" opacity=".5"/>' +
      '<path d="M70 92c-14 26-20 58-18 88l-6-2c-4-32 2-64 18-90z" fill="#ffd3c8" opacity=".22"/>'
,
      elite
    );
  }

  global.MOB_ART = { beast: beast, ghost: ghost, demon: demon, human: human, boss: boss };
})(window);
