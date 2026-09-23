/* =========================================================================
 * 女版立绘 · 按门派绘制   window.HERO_FEMALE
 * -------------------------------------------------------------------------
 * 为什么要有这个文件：
 *   创建角色页选「女」时，五个门派原本全部回退到同一张 assets/hero_female.png，
 *   于是「出来的形象全都一样」；而门派专属女版插画 hero_<sect>_f.png 尚未产出。
 *   这里按门派补上一套女版立绘 —— 与男版同一套设计语言（门派配色、兵器、头饰
 *   全部取自 FIGURE.SECT_LOOK，因此永不与男版跑偏），只把剪影改成女相。
 *
 * 向「插画质感」靠拢的做法（显示尺寸只有 60~94px，所以不做细碎刻画，只做读得出来的）：
 *   ① 体块与比例：7.5 头身的女性比例（窄肩、收腰、宽摆长裙），先立剪影再谈细节
 *   ② 三段明暗 + 受光/背光面：每个材质都分亮面 / 中间调 / 暗面，且在暗面另压一层
 *      半透明黑、亮面另提一层半透明白 —— 这是"像画出来"而不是"像色块"的关键
 *   ③ 材质区分：丝绸（竖向渐变 + 横向高光带）、玉（内发光 + 点状高光）、
 *      发（基底渐变 + 十余缕发丝 + 顶光）、肤（暖渐变 + 颊部血色）
 *   ④ 五官刻画：眉、眼（虹膜 + 眼白 + 高光点）、鼻影、唇、耳 —— 60px 下读成"清秀的脸"
 *   ⑤ 服饰层次：交领内衬、束腰绦带与结、袖褶、裙褶、下摆云纹刺绣
 *   ⑥ 点睛：门派专属兵器的刃口高光 / 火珠内焰 / 佛光法环，以及背光轮廓线
 *
 * 载入顺序：只要在渲染前加载即可（配色是调用时从 FIGURE.SECT_LOOK 取的）。
 * 日后若补上门派专属女版插画（assets/hero_<sect>_f.png），figure.js 会优先使用，
 * 本文件自动退居兜底，无需改代码。
 * ========================================================================= */
(function (global) {
  'use strict';

  function look(id) {
    var L = (global.FIGURE && global.FIGURE.SECT_LOOK) || {};
    return L[id] || L.qingyun || {
      robe: '#eef3f2', robeDark: '#14532d', trim: '#34d399',
      skin: '#f4d7c3', hair: '#1f2937', boot: '#065f46',
      aura: '#34d399', head: 'crown', weapon: 'sword'
    };
  }

  function wrap(vb, body) {
    var p = String(vb).trim().split(/[\s,]+/);
    var dim = (p.length === 4) ? (' width="' + p[2] + '" height="' + p[3] + '"') : '';
    return '<svg class="fig" viewBox="' + vb + '"' + dim +
      ' xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      body + '</svg>';
  }

  /* 云纹刺绣：袖口与裙摆的复现母题 */
  function cloud(x, y, s, color, op) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="none" stroke="' + color +
      '" stroke-opacity="' + op + '" stroke-width="1.5" stroke-linecap="round">' +
      '<path d="M0 0c3-3 7-1 7 2 2-2 5 0 5 2H-2c-3 0-3-3 0-4z"/>' +
      '<path d="M2 6c2-2 5 0 5 2"/></g>';
  }

  /* 头饰：与男版同一套 key（crown / horn / butterfly / bald / hood），改为女相做法 */
  function headPiece(L) {
    if (L.head === 'crown') {              /* 玉冠 + 步摇 */
      return '<path d="M86 18l5-11 5 10 5-12 5 11 5-10 5 12z" fill="' + L.trim + '"/>' +
        '<rect x="84" y="17" width="33" height="3" rx="1.5" fill="' + L.robeDark + '"/>' +
        '<circle cx="100" cy="12" r="2.6" fill="#ffffff" opacity=".85"/>' +
        '<path d="M74 34l-9 5M126 34l9 5" stroke="' + L.trim + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="63" cy="40" r="2.2" fill="' + L.trim + '"/><circle cx="137" cy="40" r="2.2" fill="' + L.trim + '"/>';
    }
    if (L.head === 'horn') {               /* 鬼角 + 红绶 */
      return '<path d="M84 26c-9-7-14-18-13-30 9 6 18 15 23 25z" fill="' + L.robeDark + '"/>' +
        '<path d="M116 26c9-7 14-18 13-30-9 6-18 15-23 25z" fill="' + L.robeDark + '"/>' +
        '<path d="M84 30h32l-4 5H88z" fill="' + L.trim + '" opacity=".9"/>' +
        '<path d="M100 22c4 6 7 11 7 15 0 4-3 6-7 6s-7-2-7-6c0-4 3-9 7-15z" fill="' + L.trim + '" opacity=".5"/>';
    }
    if (L.head === 'butterfly') {          /* 蝶形发饰 */
      return '<path d="M100 10c-8-8-18-7-20 1-2 7 6 11 20 11s22-4 20-11c-2-8-12-9-20-1z" fill="' + L.trim + '"/>' +
        '<path d="M100 12c-6-4-12-4-14 1" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.4" fill="none"/>' +
        '<circle cx="100" cy="20" r="2.4" fill="#ffffff" opacity=".85"/>';
    }
    if (L.head === 'bald') {               /* 发髻 + 佛光 */
      return '<circle cx="100" cy="20" r="20" fill="none" stroke="' + L.aura + '" stroke-opacity=".42" stroke-width="2"/>' +
        '<path d="M100 -2c9 0 15 7 15 14s-6 12-15 12-15-5-15-12 6-14 15-14z" fill="' + L.hair + '"/>' +
        '<path d="M88 8c4-6 20-6 24 0l-3 4c-4-5-14-5-18 0z" fill="' + L.trim + '" opacity=".7"/>';
    }
    return '<path d="M100 8c18 0 30 13 31 31 0 8-3 14-7 18-5-18-13-27-24-27s-19 9-24 27c-4-4-7-10-7-18 1-18 13-31 31-31z" fill="' + L.robeDark + '"/>';   /* hood */
  }

  /* 兵器：与男版同一套 key（sword / claw / fan / staff / orb） */
  function weapon(L, g) {
    if (L.weapon === 'sword') {            /* 玉质长剑：剑身半透、刃口一线高光 */
      return '<path d="M150 150l7 3-46 116-7-3z" fill="url(#' + g + 'J)"/>' +
        '<path d="M151 148l9 4-4 8-8-4z" fill="#e6fbf4"/>' +
        '<path d="M150 154l4 2-42 104-3-2z" fill="#ffffff" opacity=".55"/>' +
        '<path d="M107 262l22 10-4 9-22-10z" fill="' + L.robeDark + '"/>' +
        '<circle cx="113" cy="256" r="4" fill="' + L.trim + '"/>';
    }
    if (L.weapon === 'claw') {             /* 鬼爪护手 + 血芒 */
      return '<path d="M46 150c-10 9-15 23-13 37 2 9 7 15 15 18 2-19 3-38 7-51z" fill="' + L.robeDark + '"/>' +
        '<g fill="#f6e9ee"><path d="M36 202l-6 16 8-4 2 8 5-12 4 8v-16zM52 205l-6 16 8-4 2 8 5-12 4 8v-16z"/></g>' +
        '<ellipse cx="45" cy="190" rx="18" ry="22" fill="' + L.aura + '" opacity=".26"/>' +
        '<path d="M38 168c6 4 12 4 18 0" stroke="' + L.trim + '" stroke-opacity=".7" stroke-width="1.6" fill="none"/>';
    }
    if (L.weapon === 'fan') {              /* 折扇：扇面 + 扇骨 + 粉蝶纹 */
      return '<path d="M146 168c19-11 38-13 51-8-5 16-16 30-32 38-11 5-22 5-30 0z" fill="' + L.robe + '"/>' +
        '<path d="M146 168c19-11 38-13 51-8-5 16-16 30-32 38-11 5-22 5-30 0z" fill="none" stroke="' + L.trim + '" stroke-width="1.6"/>' +
        '<g stroke="' + L.robeDark + '" stroke-width="1" opacity=".55">' +
          '<path d="M148 190l49-30M148 190l44-11M148 190l33 8M148 190l19 19"/></g>' +
        '<path d="M170 180c-5-5-12-4-13 1-1 5 4 8 13 8s14-3 13-8c-1-5-8-6-13-1z" fill="' + L.trim + '" opacity=".7"/>' +
        '<circle cx="148" cy="192" r="4" fill="' + L.trim + '"/>';
    }
    if (L.weapon === 'staff') {            /* 禅杖：长杆 + 法环 + 内焰 */
      return '<path d="M150 52l7 3-24 208-7-3z" fill="' + L.robeDark + '"/>' +
        '<circle cx="155" cy="44" r="16" fill="none" stroke="' + L.trim + '" stroke-width="3.4"/>' +
        '<circle cx="155" cy="44" r="24" fill="none" stroke="' + L.trim + '" stroke-opacity=".34" stroke-width="1.6"/>' +
        '<circle cx="155" cy="44" r="7" fill="' + L.aura + '"/>' +
        '<circle cx="152.5" cy="41" r="2.6" fill="#ffffff" opacity=".85"/>' +
        '<path d="M147 120l18 5-1.6 9-18-5z" fill="' + L.trim + '" opacity=".8"/>';
    }
    /* orb：焚香谷火珠 + 符纸 */
    return '<circle cx="154" cy="152" r="20" fill="' + L.aura + '" opacity=".26"/>' +
      '<circle cx="154" cy="152" r="11" fill="' + L.trim + '"/>' +
      '<circle cx="154" cy="152" r="6" fill="' + L.aura + '" opacity=".9"/>' +
      '<circle cx="150.5" cy="148.5" r="3.4" fill="#ffffff" opacity=".85"/>' +
      '<path d="M126 182l15 5-6 34-15-5z" fill="' + L.robe + '" opacity=".9"/>' +
      '<path d="M130 190l8 2M129 197l8 2M128 204l8 2" stroke="' + L.robeDark + '" stroke-width="1.2"/>';
  }

  /* 脸：眉、眼（虹膜 + 眼白 + 高光）、鼻影、唇、颊红 */
  function face(L) {
    return '<path d="M78 44c2-13 10-19 22-19s20 6 22 19c-3-8-11-12-22-12s-19 4-22 12z" fill="' + L.hair + '"/>' +   /* 额发 */
      '<path d="M74 46c-3 13-1 25 3 35-8-10-11-25-9-37zM126 46c3 13 1 25-3 35 8-10 11-25 9-37z" fill="' + L.hair + '"/>' +  /* 鬓发 */
      '<path d="M84 52c4-2 8-2 12 0" stroke="' + L.hair + '" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path d="M104 52c4-2 8-2 12 0" stroke="' + L.hair + '" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      /* 眼：眼白 → 虹膜 → 瞳 → 高光 */
      '<path d="M85 60c4-4 8-4 11 0-3 4-8 4-11 0z" fill="#ffffff" opacity=".92"/>' +
      '<path d="M104 60c4-4 8-4 11 0-3 4-8 4-11 0z" fill="#ffffff" opacity=".92"/>' +
      '<circle cx="90.5" cy="60" r="2.5" fill="' + L.hair + '"/><circle cx="109.5" cy="60" r="2.5" fill="' + L.hair + '"/>' +
      '<circle cx="90" cy="59" r="1" fill="#ffffff"/><circle cx="109" cy="59" r="1" fill="#ffffff"/>' +
      '<path d="M85 56c4-2 8-2 11 0M104 56c4-2 8-2 11 0" stroke="' + L.hair + '" stroke-width="1.3" stroke-linecap="round" fill="none"/>' +
      /* 鼻影 + 唇 + 颊红 */
      '<path d="M100 62v7l-2 2" stroke="' + L.hair + '" stroke-opacity=".22" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M95 76c3 2 7 2 10 0-3 3-7 3-10 0z" fill="' + L.trim + '" fill-opacity=".62"/>' +
      '<ellipse cx="86" cy="68" rx="5" ry="3" fill="' + L.trim + '" opacity=".16"/>' +
      '<ellipse cx="114" cy="68" rx="5" ry="3" fill="' + L.trim + '" opacity=".16"/>';
  }

  function female(id) {
    var L = look(id);
    var g = 'hfx' + id;                     /* 渐变 id 前缀：跨门派不撞名 */
    return wrap('0 0 200 280',
      '<defs>' +
        /* 丝绸：竖向三段 + 一条横向高光带（叠在袍身上） */
        '<linearGradient id="' + g + 'R" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.robe + '"/>' +
          '<stop offset=".44" stop-color="' + L.robe + '"/>' +
          '<stop offset=".72" stop-color="' + L.robe + '" stop-opacity=".92"/>' +
          '<stop offset="1" stop-color="' + L.robeDark + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'D" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.robeDark + '"/><stop offset="1" stop-color="#08080b"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'H" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.hair + '"/><stop offset=".55" stop-color="' + L.hair + '"/><stop offset="1" stop-color="#05050a"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'S" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.skin + '"/><stop offset=".72" stop-color="' + L.skin + '"/><stop offset="1" stop-color="' + L.hair + '" stop-opacity=".34"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'J" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#f4fffb"/><stop offset=".42" stop-color="' + L.trim + '"/><stop offset="1" stop-color="' + L.robeDark + '"/>' +
        '</linearGradient>' +
        /* 布料高光带：横向，制造丝绸的"柔光反照" */
        '<linearGradient id="' + g + 'L" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#ffffff" stop-opacity=".34"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="' + g + 'A"><stop offset="0" stop-color="' + L.aura + '" stop-opacity=".40"/><stop offset="1" stop-color="' + L.aura + '" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="' + g + 'O"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="' + g + 'G"><stop offset="0" stop-color="' + L.aura + '" stop-opacity=".55"/><stop offset="1" stop-color="' + L.aura + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +

      /* 贴地投影 + 门派灵光 */
      '<ellipse cx="100" cy="268" rx="46" ry="6" fill="#000" opacity=".44"/>' +
      '<ellipse cx="100" cy="256" rx="44" ry="18" fill="url(#' + g + 'A)"/>' +

      /* 后层长发：垂至腰下，末端收窄 */
      '<path d="M100 28c22 0 38 16 40 40 2 24-3 52-7 78-3 18-6 34-6 46-7-3-13-9-18-9s-9 5-17 8c0-12-3-28-6-45-4-26-9-54-7-78 2-24 18-40 21-40z" fill="url(#' + g + 'H)"/>' +
      '<g stroke="' + L.trim + '" stroke-opacity=".16" stroke-width="1.1" fill="none">' +
        '<path d="M74 60c-2 30-4 62-3 96M84 58c-1 32-2 66-1 100M116 58c1 32 2 66 1 100M126 60c2 30 4 62 3 96"/>' +
      '</g>' +

      /* 长裙：上收下放，下摆压暗 */
      '<path d="M100 140c13 0 22 6 25 16 6 20 12 48 17 74 3 15 6 26 9 34-13 6-33 9-51 9s-38-3-51-9c3-8 6-19 9-34 5-26 11-54 17-74 3-10 12-16 25-16z" fill="url(#' + g + 'R)"/>' +
      '<ellipse cx="100" cy="248" rx="52" ry="28" fill="url(#' + g + 'O)"/>' +
      '<path d="M100 142c13 0 22 6 25 16 6 20 12 48 17 74 3 15 6 26 9 34-6 3-13 5-21 6-2-40-4-84-9-118-1-6-3-11-6-14z" fill="#ffffff" opacity=".10"/>' +   /* 裙身受光面 */
      /* 裙褶 */
      '<g stroke="' + L.robeDark + '" stroke-opacity=".34" stroke-width="1.5" fill="none">' +
        '<path d="M82 158c-5 40-9 80-11 112M92 156c-2 42-4 84-5 116M108 156c2 42 4 84 5 116M118 158c5 40 9 80 11 112"/>' +
      '</g>' +
      /* 下摆云纹刺绣 */
      cloud(66, 232, 1.5, L.trim, '.5') + cloud(112, 240, 1.5, L.trim, '.5') +
      '<path d="M54 250c14 6 32 9 46 9s32-3 46-9" stroke="' + L.trim + '" stroke-opacity=".55" stroke-width="1.6" fill="none"/>' +

      /* 束腰绦带 + 结 + 垂坠 */
      '<path d="M72 128c17 7 39 7 56 0l3 15c-20 8-42 8-62 0z" fill="' + L.robeDark + '"/>' +
      '<path d="M72 128c17 7 39 7 56 0l1 5c-19 7-39 7-58 0z" fill="' + L.trim + '" opacity=".55"/>' +
      '<path d="M96 140l8 0-4 20z" fill="' + L.trim + '"/>' +
      '<circle cx="100" cy="166" r="5" fill="' + L.trim + '"/><circle cx="100" cy="166" r="2" fill="#ffffff" opacity=".7"/>' +
      '<path d="M100 172c-3 12-6 20-9 26M100 172c3 12 6 20 9 26" stroke="' + L.trim + '" stroke-opacity=".7" stroke-width="1.6" fill="none"/>' +

      /* 上襦：交领 + 内衬 + 束胸 */
      '<path d="M100 116c14 0 24 6 26 16-8 12-17 19-26 19s-18-7-26-19c2-10 12-16 26-16z" fill="url(#' + g + 'R)"/>' +
      '<path d="M100 118c7 0 12 5 12 12s-5 18-12 18-12-11-12-18 5-12 12-12z" fill="' + L.trim + '" opacity=".46"/>' +
      '<path d="M100 120c4 0 7 3 7 8" stroke="#ffffff" stroke-opacity=".4" stroke-width="1.4" fill="none"/>' +
      '<path d="M74 118c8-14 44-14 52 0l-5 4c-6-11-36-11-42 0z" fill="url(#' + g + 'L)"/>' +   /* 肩部高光 */

      /* 广袖：外轮廓 + 内里压暗 + 袖褶 */
      '<path d="M70 118c-16 16-25 42-23 68 1 14 8 24 19 29 3-32 5-68 10-91z" fill="url(#' + g + 'R)"/>' +
      '<path d="M70 118c-16 16-25 42-23 68 1 14 8 24 19 29 1-20 2-40 3-56-7-13-7-30 1-41z" fill="url(#' + g + 'D)" opacity=".62"/>' +
      '<path d="M130 118c16 16 25 42 23 68-1 14-8 24-19 29-3-32-5-68-10-91z" fill="url(#' + g + 'R)"/>' +
      '<path d="M130 118c16 16 25 42 23 68-1 14-8 24-19 29-1-20-2-40-3-56 7-13 7-30-1-41z" fill="url(#' + g + 'D)" opacity=".42"/>' +
      '<g stroke="' + L.robeDark + '" stroke-opacity=".3" stroke-width="1.4" fill="none">' +
        '<path d="M64 146c-4 20-6 42-4 62M75 142c-3 22-4 46-3 64M136 146c4 20 6 42 4 62M125 142c3 22 4 46 3 64"/>' +
      '</g>' +
      cloud(52, 196, 1.1, L.trim, '.45') + cloud(134, 200, 1.1, L.trim, '.45') +
      /* 袖口 */
      '<path d="M54 206c5 5 14 7 22 5l1 7c-9 3-19 1-25-5z" fill="' + L.trim + '" opacity=".6"/>' +
      '<path d="M146 208c-5 5-14 7-22 5l-1 7c9 3 19 1 25-5z" fill="' + L.trim + '" opacity=".6"/>' +

      /* 手 */
      '<path d="M50 212c8-3 13 2 13 9s-6 11-12 9-8-15-1-18z" fill="url(#' + g + 'S)"/>' +
      '<path d="M150 210c8 3 10 11 6 16s-12 4-15-2 2-12 9-14z" fill="url(#' + g + 'S)"/>' +

      /* 颈 + 脸 + 耳 */
      '<path d="M93 84h14v15H93z" fill="' + L.skin + '"/>' +
      '<path d="M93 96c5 4 9 4 14 0v5H93z" fill="' + L.hair + '" opacity=".3"/>' +
      '<path d="M100 32c19 0 30 14 30 32s-13 34-30 34-30-16-30-34 11-32 30-32z" fill="url(#' + g + 'S)"/>' +
      '<ellipse cx="72" cy="62" rx="4" ry="6" fill="' + L.skin + '"/><ellipse cx="128" cy="62" rx="4" ry="6" fill="' + L.skin + '"/>' +
      face(L) +

      headPiece(L) +

      /* 背光轮廓：把人物从背景里"抠"出来，插画感的一半靠这条边 */
      '<path d="M74 116c10-15 42-15 52 0l-6 4c-7-11-33-11-40 0z" fill="#ffffff" opacity=".34"/>' +
      '<path d="M132 120c16 18 24 44 22 70l-6 2c1-24-6-48-21-66z" fill="#ffffff" opacity=".20"/>' +
      '<path d="M136 156c7 30 12 62 15 92l-6 1c-3-30-8-61-14-91z" fill="#ffffff" opacity=".14"/>' +
      '<circle cx="100" cy="128" r="26" fill="url(#' + g + 'G)" opacity=".5"/>' +   /* 胸口灵光 */

      weapon(L, g)
    );
  }

  global.HERO_FEMALE = {
    qingyun: function () { return female('qingyun'); },
    guiwang: function () { return female('guiwang'); },
    hehuan: function () { return female('hehuan'); },
    tianyin: function () { return female('tianyin'); },
    fenxiang: function () { return female('fenxiang'); }
  };
})(window);
