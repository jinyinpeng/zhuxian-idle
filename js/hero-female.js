/* =========================================================================
 * 女版立绘 · 按门派绘制   window.HERO_FEMALE
 * -------------------------------------------------------------------------
 * 为什么要有这个文件：
 *   创建角色页选「女」时，五个门派全部回退到同一张 assets/hero_female.png，
 *   于是「出来的形象全都一样」；而门派专属女版图 hero_<sect>_f.png 尚未产出。
 *   这里按门派补上一套女版立绘 —— 与男版同一套设计语言（门派配色、兵器、
 *   头饰全部取自 FIGURE.SECT_LOOK，因此永不与男版跑偏），只把剪影改成女相：
 *   发髻与垂腰长发、窄肩细腰、束腰绦带、宽摆长裙、广袖。
 *
 * 载入顺序：只要在渲染前加载即可（配色是调用时从 FIGURE.SECT_LOOK 取的，
 * 所以即使比 figure.js 先加载也能拿到数据）。
 *
 * 日后若补上门派专属女版插画（assets/hero_<sect>_f.png），会由 figure.js
 * 优先使用，本文件自动退居兜底，无需改代码。
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

  /* 头饰：与男版同一套 key（crown / horn / butterfly / bald / hood），改为女相做法 */
  function headPiece(L, g) {
    if (L.head === 'crown') {
      return '<path d="M52 16l4-9 4 8 4-10 4 9 4-8 4 10z" fill="' + L.trim + '"/>' +
        '<rect x="50" y="15" width="22" height="2.6" rx="1.3" fill="' + L.robeDark + '"/>' +
        '<path d="M44 30l-8 4M76 30l8 4" stroke="' + L.trim + '" stroke-width="1.4" stroke-linecap="round"/>';
    }
    if (L.head === 'horn') {
      return '<path d="M48 22c-7-6-11-15-10-24 7 5 14 12 18 20zM72 22c7-6 11-15 10-24-7 5-14 12-18 20z" fill="' + L.robeDark + '"/>' +
        '<path d="M46 26h28l-3 4H49z" fill="' + L.trim + '" opacity=".85"/>';
    }
    if (L.head === 'butterfly') {
      return '<path d="M60 10c-6-6-14-6-16 0-2 5 4 9 16 9s18-4 16-9c-2-6-10-6-16 0z" fill="' + L.trim + '"/>' +
        '<circle cx="60" cy="17" r="2" fill="#fff" opacity=".8"/>';
    }
    if (L.head === 'bald') {
      return '<circle cx="60" cy="14" r="9" fill="none" stroke="' + L.aura + '" stroke-opacity=".55" stroke-width="1.6"/>' +
        '<path d="M60 6c6 0 10 4 10 9 0 6-4 9-10 9s-10-3-10-9c0-5 4-9 10-9z" fill="' + L.hair + '"/>';
    }
    /* hood */
    return '<path d="M60 12c14 0 23 10 24 24 0 6-2 11-5 14-4-14-10-21-19-21s-15 7-19 21c-3-3-5-8-5-14 1-14 10-24 24-24z" fill="' + L.robeDark + '"/>';
  }

  /* 兵器：与男版同一套 key（sword / claw / fan / staff / orb） */
  function weapon(L, g) {
    if (L.weapon === 'sword') {
      return '<path d="M88 108l5 2-30 66-5-2z" fill="url(#' + g + 'B)"/>' +
        '<path d="M89 106l6 3-3 6-6-3z" fill="#dff3ec"/>' +
        '<path d="M60 168l16 7-3 7-16-7z" fill="' + L.robeDark + '"/>' +
        '<path d="M88 110l4 2-26 60-3-2z" fill="#ffffff" opacity=".45"/>';
    }
    if (L.weapon === 'claw') {
      return '<path d="M28 112c-7 6-11 16-10 26 1 7 5 12 11 14 1-14 2-28 5-38z" fill="' + L.robeDark + '"/>' +
        '<g fill="#f3e6ea"><path d="M20 150l-5 12 6-3 2 6 4-9 3 6v-12zM32 152l-5 12 6-3 2 6 4-9 3 6v-12z"/></g>' +
        '<ellipse cx="26" cy="140" rx="13" ry="16" fill="' + L.aura + '" opacity=".22"/>';
    }
    if (L.weapon === 'fan') {
      return '<path d="M84 118c14-8 28-10 38-6-4 12-12 22-24 28-8 4-16 4-22 0z" fill="' + L.robe + '"/>' +
        '<path d="M84 118c14-8 28-10 38-6-4 12-12 22-24 28-8 4-16 4-22 0z" fill="none" stroke="' + L.trim + '" stroke-width="1.4"/>' +
        '<g stroke="' + L.robeDark + '" stroke-width="1" opacity=".6"><path d="M86 134l36-22M86 134l32-8M86 134l24 6M86 134l14 14"/></g>' +
        '<circle cx="86" cy="136" r="3" fill="' + L.trim + '"/>';
    }
    if (L.weapon === 'staff') {
      return '<path d="M92 40l5 2-14 148-5-2z" fill="' + L.robeDark + '"/>' +
        '<circle cx="95" cy="34" r="12" fill="none" stroke="' + L.trim + '" stroke-width="3"/>' +
        '<circle cx="95" cy="34" r="5" fill="' + L.aura + '" opacity=".9"/>' +
        '<circle cx="95" cy="34" r="16" fill="none" stroke="' + L.trim + '" stroke-opacity=".4" stroke-width="1.4"/>';
    }
    /* orb：焚香谷火珠 + 符纸 */
    return '<circle cx="92" cy="106" r="13" fill="' + L.aura + '" opacity=".28"/>' +
      '<circle cx="92" cy="106" r="7" fill="' + L.trim + '"/>' +
      '<circle cx="89.5" cy="103.5" r="2.6" fill="#fff" opacity=".8"/>' +
      '<path d="M74 128l10 3-4 22-10-3z" fill="' + L.robe + '" opacity=".85"/>' +
      '<path d="M77 134l5 1M76 140l5 1M75 146l5 1" stroke="' + L.robeDark + '" stroke-width="1"/>';
  }

  function female(id) {
    var L = look(id);
    var g = 'hfx' + id;                       /* 渐变 id 前缀：跨门派不撞名 */
    return wrap('0 0 120 200',
      '<defs>' +
        '<linearGradient id="' + g + 'R" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.robe + '"/>' +
          '<stop offset=".52" stop-color="' + L.robe + '"/>' +
          '<stop offset="1" stop-color="' + L.robeDark + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'S" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.robeDark + '"/><stop offset="1" stop-color="#0b0b0e"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'H" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + L.hair + '"/><stop offset="1" stop-color="#05050a"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + g + 'B" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#f2f7fb"/><stop offset=".5" stop-color="' + L.trim + '"/><stop offset="1" stop-color="' + L.robeDark + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="' + g + 'A"><stop offset="0" stop-color="' + L.aura + '" stop-opacity=".38"/><stop offset="1" stop-color="' + L.aura + '" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="' + g + 'D"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
      '</defs>' +

      /* 贴地投影 + 脚下门派灵光 */
      '<ellipse cx="60" cy="192" rx="33" ry="4" fill="#000" opacity=".42"/>' +
      '<ellipse cx="60" cy="184" rx="31" ry="13" fill="url(#' + g + 'A)"/>' +

      /* 后层长发（垂至腰下，先画才在身后） */
      '<path d="M60 24c15 0 26 11 27 27 1 17-2 36-5 54-2 12-4 23-4 32-5-2-9-6-12-6s-6 4-12 6c0-9-2-20-4-32-3-18-6-37-5-54 1-16 12-27 27-27z" fill="url(#' + g + 'H)"/>' +

      /* 长裙：上窄下宽，下摆压暗 */
      '<path d="M60 62c9 0 15 5 17 12 4 13 7 31 10 51 2 14 4 25 6 34-9 5-22 7-33 7s-24-2-33-7c2-9 4-20 6-34 3-20 6-38 10-51 2-7 8-12 17-12z" fill="url(#' + g + 'R)"/>' +
      '<ellipse cx="60" cy="176" rx="34" ry="20" fill="url(#' + g + 'D)"/>' +

      /* 裙褶：随垂坠方向走线 */
      '<g stroke="' + L.robeDark + '" stroke-opacity=".38" stroke-width="1.3" fill="none">' +
        '<path d="M50 74c-3 28-6 62-8 100M60 76v104M70 74c3 28 6 62 8 100"/>' +
      '</g>' +

      /* 束腰绦带 + 佩玉 */
      '<path d="M44 96c11 5 21 5 32 0l2 10c-12 5-24 5-36 0z" fill="' + L.robeDark + '"/>' +
      '<path d="M57 98h6l-3 14z" fill="' + L.trim + '"/>' +
      '<circle cx="60" cy="116" r="3.4" fill="' + L.trim + '" opacity=".9"/>' +

      /* 上襦：交领 + 窄肩 */
      '<path d="M60 54c9 0 15 4 17 11-6 8-11 13-17 13s-11-5-17-13c2-7 8-11 17-11z" fill="' + L.robe + '"/>' +
      '<path d="M60 56c4 0 7 3 7 8s-3 12-7 12-7-7-7-12 3-8 7-8z" fill="' + L.trim + '" opacity=".5"/>' +   /* 交领内衬 */

      /* 广袖：垂坠 + 内里压暗 */
      '<path d="M43 62c-9 10-14 26-13 42 1 9 5 15 12 18 2-20 3-42 6-56z" fill="' + L.robe + '"/>' +
      '<path d="M43 62c-9 10-14 26-13 42 1 9 5 15 12 18 1-12 1-24 2-34-4-8-4-18-1-26z" fill="url(#' + g + 'S)" opacity=".7"/>' +
      '<path d="M77 62c9 10 14 26 13 42-1 9-5 15-12 18-2-20-3-42-6-56z" fill="' + L.robe + '"/>' +
      '<path d="M77 62c9 10 14 26 13 42-1 9-5 15-12 18-1-12-1-24-2-34 4-8 4-18 1-26z" fill="url(#' + g + 'S)" opacity=".55"/>' +

      /* 头：颈 + 脸 + 额发 */
      '<path d="M56 40h8v9h-8z" fill="' + L.skin + '"/>' +
      '<path d="M60 20c11 0 18 8 18 19s-8 19-18 19-18-8-18-19 7-19 18-19z" fill="' + L.skin + '"/>' +
      '<path d="M43 32c3-11 9-16 17-16s14 5 17 16c-3-6-9-9-17-9s-14 3-17 9z" fill="' + L.hair + '"/>' +
      '<path d="M42 34c-2 10-1 20 2 28-6-8-8-20-6-30zM78 34c2 10 1 20-2 28 6-8 8-20 6-30z" fill="' + L.hair + '"/>' +  /* 鬓发 */
      '<path d="M53 40l6 2-6 2zM67 40l-6 2 6 2z" fill="#1b1b22"/>' +                                             /* 眼 */
      '<path d="M55 50c3 2 7 2 10 0" stroke="' + L.trim + '" stroke-opacity=".75" stroke-width="1.2" fill="none"/>' + /* 唇 */

      headPiece(L, g) +

      /* 左肩轮廓光：把人物从背景里"抠"出来 */
      '<path d="M44 58c6-9 26-9 32 0l-4 3c-4-7-20-7-24 0z" fill="#ffffff" opacity=".38"/>' +
      '<path d="M30 96c-3 22-4 48-2 74l-3 1c-3-27-2-53 2-76z" fill="#ffffff" opacity=".2"/>' +

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
