/* =========================================================================
 * 仙侠挂机 · 形象绘制层（诛仙风格立绘）
 * 五门派人物立绘 / 妖物形象（妖兽 · 幽魂 · 魔物 · 修士 · 妖将）
 * 全部为内联 SVG，零外部资源，随色彩变量自动适配
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------ 门派外观 */
  /* 参照诛仙门派气质提炼：青云青白道袍、鬼王黑红鬼纹、合欢粉紫纱衣、
     天音金红袈裟、焚香赤红符衣 */
  const SECT_LOOK = {
    qingyun: {
      robe: '#e9f5f3', robeDark: '#0f766e', trim: '#5eead4', skin: '#f2d8bf',
      hair: '#22222e', boot: '#134e4a', aura: '#5eead4', head: 'crown', weapon: 'sword'
    },
    guiwang: {
      robe: '#2c1320', robeDark: '#14070f', trim: '#dc2626', skin: '#e3c8b6',
      hair: '#120a10', boot: '#1b0a12', aura: '#c084fc', head: 'horn', weapon: 'claw'
    },
    hehuan: {
      robe: '#fbe1ef', robeDark: '#9d174d', trim: '#f472b6', skin: '#fbe2d0',
      hair: '#3a1f2c', boot: '#831843', aura: '#f472b6', head: 'butterfly', weapon: 'fan'
    },
    tianyin: {
      robe: '#f7c948', robeDark: '#7c2d12', trim: '#fbbf24', skin: '#e9cba4',
      hair: '#2a1a12', boot: '#78350f', aura: '#fbbf24', head: 'bald', weapon: 'staff'
    },
    fenxiang: {
      robe: '#f6bdb2', robeDark: '#7f1d1d', trim: '#fb7185', skin: '#f4d7c3',
      hair: '#2b1520', boot: '#7f1d1d', aura: '#fb7185', head: 'hood', weapon: 'orb'
    }
  };

  /* ------------------------------------------------------------ 妖物外观 */
  const MOB_LOOK = {
    beast: { skin: '#c2823c', dark: '#8a5622', hair: '#4a2b10', eye: '#ffd166', claw: '#f6ead0' },
    ghost: { skin: '#9db6dc', dark: '#3f5476', hair: '#22304a', eye: '#7dd3fc', claw: '#dceaff' },
    demon: { skin: '#b4563c', dark: '#6b2a1f', hair: '#2a0f0c', eye: '#fca5a5', claw: '#fbe0d3' },
    human: { skin: '#d9b795', dark: '#4b5563', hair: '#1f2937', eye: '#93c5fd', claw: '#e5e7eb' },
    boss: { skin: '#9d2f4a', dark: '#4c1526', hair: '#1a0508', eye: '#fde047', claw: '#fde68a' }
  };

  /* ------------------------------------------------------------ 基础工具 */
  /* 同时写出 width/height 属性：让 SVG 具备确定的内在尺寸，
     CSS 只给 height + width:auto 时也能按比例算出宽度（老浏览器同样可靠） */
  function wrap(vb, body, elite) {
    var p = String(vb).trim().split(/[\s,]+/);
    var dim = (p.length === 4) ? (' width="' + p[2] + '" height="' + p[3] + '"') : '';
    return '<svg class="fig' + (elite ? ' elite' : '') + '" viewBox="' + vb + '"' + dim + ' ' +
      'xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      body + '</svg>';
  }
  function ell(cx, cy, rx, ry, color, op) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + color + '" opacity="' + op + '"/>';
  }

  /* ============================================================ 人物立绘 */
  function heroSvg(sectId) {
    const s = SECT_LOOK[sectId] || SECT_LOOK.qingyun;
    let b = '';

    /* 灵光 */
    b += ell(50, 123, 36, 10, s.aura, 0.22);
    b += ell(50, 62, 32, 56, s.aura, 0.09);

    /* 披风 */
    b += `<path d="M36 46C26 57 21 88 20 116c9-5 19-3 30-1 11-2 21-4 30 1-1-28-6-59-16-70Z" fill="${s.robeDark}" opacity=".92"/>`;

    /* 背剑（剑柄越肩） */
    if (s.weapon === 'sword') {
      b += `<path d="M37.5 49 30 24" stroke="#cbd5e1" stroke-width="3.4" stroke-linecap="round"/>`;
      b += `<path d="M28.5 29 35 26" stroke="${s.trim}" stroke-width="3" stroke-linecap="round"/>`;
    }

    /* 靴 */
    b += `<rect x="41" y="113" width="8.5" height="15" rx="3.6" fill="${s.boot}"/>`;
    b += `<rect x="50.5" y="113" width="8.5" height="15" rx="3.6" fill="${s.boot}"/>`;

    /* 脖颈 */
    b += `<rect x="46" y="35" width="8" height="11" rx="3.4" fill="${s.skin}"/>`;

    /* 道袍 */
    b += `<path d="M50 43c-8 0-14 4-16 11L27 100c-1 10 4 16 13 16h20c9 0 14-6 13-16L66 54c-2-7-8-11-16-11Z" fill="${s.robe}"/>`;
    b += `<path d="M43 44c4-1 10-1 14 0l-7 16Z" fill="${s.robeDark}"/>`;

    /* 腰带与绦带 */
    b += `<rect x="30" y="72.5" width="40" height="7" rx="3.5" fill="${s.trim}"/>`;
    b += `<circle cx="50" cy="76" r="3.2" fill="${s.robeDark}"/>`;
    b += `<path d="M47.5 79 45.5 95M52.5 79 54.5 95" stroke="${s.trim}" stroke-width="2.2" stroke-linecap="round"/>`;

    /* 广袖 */
    b += `<path d="M36 49c-6 2-11 9-13 19-1.5 7 2 11 6.5 9 3.5-1.5 6-11 8-19Z" fill="${s.robe}"/>`;
    b += `<path d="M64 49c6 2 11 9 13 19 1.5 7-2 11-6.5 9-3.5-1.5-6-11-8-19Z" fill="${s.robe}"/>`;
    b += `<circle cx="28.5" cy="75.5" r="3.6" fill="${s.skin}"/>`;
    b += `<circle cx="71.5" cy="75.5" r="3.6" fill="${s.skin}"/>`;

    /* 头部 */
    b += `<ellipse cx="50" cy="27.5" rx="10.5" ry="12" fill="${s.skin}"/>`;
    b += `<ellipse cx="39.8" cy="28.5" rx="1.7" ry="2.6" fill="${s.skin}"/>`;
    b += `<ellipse cx="60.2" cy="28.5" rx="1.7" ry="2.6" fill="${s.skin}"/>`;

    /* 发式 */
    if (s.head !== 'bald') {
      b += `<path d="M39.5 27c-.8-9 3.6-12.5 10.5-12.5S61.3 18 60.5 27c-.6-4.5-3.6-6.5-10.5-6.5S40.1 22.5 39.5 27Z" fill="${s.hair}"/>`;
      b += `<circle cx="50" cy="13.6" r="4.1" fill="${s.hair}"/>`;
    }

    /* 头饰 */
    b += headwear(s);

    /* 兵器 */
    b += weapon(s);

    /* 眉目 */
    b += `<path d="M45.8 24.4c1-.7 2-.7 3 0" stroke="${s.hair}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".7"/>`;
    b += `<path d="M51.2 24.4c1-.7 2-.7 3 0" stroke="${s.hair}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".7"/>`;
    b += `<path d="M45.6 27.8c1 .9 2.1.9 3.1 0" stroke="#3b2a21" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M51.3 27.8c1 .9 2.1.9 3.1 0" stroke="#3b2a21" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M48.8 33.4c.9.7 1.5.7 2.4 0" stroke="#b3715f" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
    b += `<circle cx="44.6" cy="31.4" r="2.1" fill="#e59a86" opacity=".38"/>`;
    b += `<circle cx="55.4" cy="31.4" r="2.1" fill="#e59a86" opacity=".38"/>`;

    return wrap('0 0 100 132', b, false);
  }

  /* ---------------------------------------------------------------- 头饰 */
  function headwear(s) {
    let h = '';
    if (s.head === 'crown') {
      /* 玉冠 · 束发 */
      h += `<path d="M41.5 18.4c5-4.6 12-4.6 17 0v3.4h-17Z" fill="${s.trim}"/>`;
      h += `<rect x="37.6" y="19.3" width="24.8" height="2.4" rx="1.2" fill="${s.aura}"/>`;
      h += `<circle cx="50" cy="17.8" r="1.9" fill="#ffffff" opacity=".95"/>`;
    } else if (s.head === 'horn') {
      /* 鬼角 */
      h += `<path d="M41 17C36 8 38 2.5 43.5 1c-2.5 4.5-2 10 1.5 15Z" fill="#e2e8f0"/>`;
      h += `<path d="M59 17c5-9 3-14.5-2.5-16 2.5 4.5 2 10-1.5 15Z" fill="#e2e8f0"/>`;
      h += `<path d="M42.6 8.6 46 12" stroke="${s.trim}" stroke-width="1.2" stroke-linecap="round"/>`;
      h += `<path d="M57.4 8.6 54 12" stroke="${s.trim}" stroke-width="1.2" stroke-linecap="round"/>`;
    } else if (s.head === 'butterfly') {
      /* 蝶形发饰 */
      h += `<g transform="translate(64 12.5) rotate(16)">` +
        `<ellipse cx="-3.7" cy="0" rx="3.7" ry="2.6" fill="${s.trim}"/>` +
        `<ellipse cx="3.7" cy="0" rx="3.7" ry="2.6" fill="${s.trim}"/>` +
        `<ellipse cx="-2.6" cy="3.3" rx="2.6" ry="2" fill="${s.aura}" opacity=".9"/>` +
        `<ellipse cx="2.6" cy="3.3" rx="2.6" ry="2" fill="${s.aura}" opacity=".9"/>` +
        `<rect x="-.6" y="-1.6" width="1.2" height="4.6" rx=".6" fill="${s.robeDark}"/>` +
        `</g>`;
      h += `<circle cx="45.6" cy="14.4" r="1.7" fill="${s.aura}"/>`;
      h += `<circle cx="54.4" cy="14.4" r="1.7" fill="${s.aura}"/>`;
    } else if (s.head === 'bald') {
      /* 戒疤 · 佛光 */
      h += `<circle cx="47.3" cy="20.6" r="1.15" fill="#c9906a" opacity=".85"/>`;
      h += `<circle cx="50" cy="19.4" r="1.15" fill="#c9906a" opacity=".85"/>`;
      h += `<circle cx="52.7" cy="20.6" r="1.15" fill="#c9906a" opacity=".85"/>`;
      h += `<circle cx="50" cy="27.5" r="17.5" fill="none" stroke="${s.aura}" stroke-width="1.2" opacity=".45"/>`;
      h += `<circle cx="50" cy="27.5" r="21" fill="none" stroke="${s.aura}" stroke-width=".7" opacity=".22"/>`;
    } else if (s.head === 'hood') {
      /* 兜帽 */
      h += `<path d="M36.6 34C35 16 42 7.5 50 7.5s15 8.5 13.4 26.5c-1.9-10.4-6-14.6-13.4-14.6S38.5 23.6 36.6 34Z" fill="${s.robeDark}"/>`;
      h += `<path d="M39.6 27.4c.8-7.4 4.6-11 10.4-11s9.6 3.6 10.4 11" stroke="${s.trim}" stroke-width="1.3" fill="none" opacity=".75"/>`;
    }
    return h;
  }

  /* ---------------------------------------------------------------- 兵器 */
  function weapon(s) {
    let w = '';
    if (s.weapon === 'sword') {
      w += `<path d="M71 76 92 40" stroke="#cbd5e1" stroke-width="4.6" stroke-linecap="round"/>`;
      w += `<path d="M71 76 92 40" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>`;
      w += `<path d="M67.5 81 75 71.5" stroke="${s.trim}" stroke-width="3.6" stroke-linecap="round"/>`;
      w += `<path d="M65.4 74.6 76.6 77.6" stroke="#b08d3f" stroke-width="2.4" stroke-linecap="round"/>`;
      w += `<circle cx="92" cy="40" r="2.8" fill="${s.aura}" opacity=".85"/>`;
    } else if (s.weapon === 'claw') {
      w += `<circle cx="28.5" cy="75.5" r="4.6" fill="${s.trim}" opacity=".5"/>`;
      w += `<circle cx="71.5" cy="75.5" r="4.6" fill="${s.trim}" opacity=".5"/>`;
      w += `<g stroke="${s.aura}" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".95">` +
        `<path d="M26 73 19 65M27.5 76 18.5 73.4M25 71 21.5 62"/></g>`;
      w += `<g stroke="${s.aura}" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".95">` +
        `<path d="M74 73 81 65M72.5 76 81.5 73.4M75 71 78.5 62"/></g>`;
    } else if (s.weapon === 'fan') {
      w += `<path d="M72 77A22 22 0 0 1 93.4 55.4L88 77Z" fill="${s.trim}" opacity=".92"/>`;
      w += `<g stroke="${s.robeDark}" stroke-width=".9" opacity=".55">` +
        `<path d="M72 77 93.4 55.4M72 77 90.4 60.4M72 77 86 65.6M72 77 80.6 71.4"/></g>`;
      w += `<circle cx="93.4" cy="55.4" r="2.2" fill="${s.aura}"/>`;
      w += `<circle cx="80" cy="60" r="1.5" fill="${s.aura}" opacity=".8"/>`;
      w += `<circle cx="86.5" cy="70" r="1.2" fill="${s.aura}" opacity=".7"/>`;
    } else if (s.weapon === 'staff') {
      w += `<rect x="76.4" y="30" width="4.2" height="94" rx="2.1" fill="#8a5a2b"/>`;
      w += `<path d="M78.5 31v92" stroke="#ab7c48" stroke-width="1.1"/>`;
      w += `<circle cx="78.5" cy="25" r="7.4" fill="none" stroke="${s.trim}" stroke-width="3"/>`;
      w += `<circle cx="78.5" cy="25" r="3.2" fill="${s.aura}"/>`;
      w += `<circle cx="78.5" cy="41" r="4.4" fill="none" stroke="${s.trim}" stroke-width="1.6"/>`;
      w += `<circle cx="78.5" cy="55" r="3.6" fill="none" stroke="${s.trim}" stroke-width="1.3"/>`;
    } else if (s.weapon === 'orb') {
      w += `<circle cx="77" cy="58" r="13" fill="${s.aura}" opacity=".18"/>`;
      w += `<circle cx="77" cy="58" r="8" fill="${s.aura}" opacity=".85"/>`;
      w += `<circle cx="77" cy="58" r="3.4" fill="#ffffff"/>`;
      w += `<g fill="${s.trim}" opacity=".85">` +
        `<circle cx="68" cy="47" r="1.7"/><circle cx="86" cy="44" r="1.3"/>` +
        `<circle cx="64" cy="64" r="1.2"/><circle cx="89" cy="64" r="1.6"/></g>`;
      w += `<path d="M73 87 71 96M81 87 83 96" stroke="${s.trim}" stroke-width="1.4" stroke-linecap="round" opacity=".6"/>`;
    }
    return w;
  }

  /* ============================================================ 妖兽形象 */
  function beastFig(elite) {
    const c = MOB_LOOK.beast;
    let b = '';
    b += ell(50, 98, 34, 8, c.eye, 0.1);

    /* 尾 */
    b += `<path d="M74 56C88 50 90 36 85 27" stroke="${c.dark}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    b += `<circle cx="85" cy="26" r="5" fill="${c.hair}"/>`;

    /* 后腿 */
    b += `<rect x="60" y="68" width="9" height="30" rx="4.5" fill="${c.dark}"/>`;
    b += `<rect x="70" y="70" width="9" height="28" rx="4.5" fill="${c.dark}"/>`;

    /* 身躯 */
    b += `<ellipse cx="50" cy="60" rx="26" ry="17" fill="${c.skin}"/>`;
    b += `<ellipse cx="50" cy="68" rx="18" ry="9" fill="${c.dark}" opacity=".42"/>`;

    /* 背鬃 */
    b += `<path d="M28 50 34 39 39 49 45 36 50 48 56 36 61 48 67 39 72 50" stroke="${c.hair}" stroke-width="3.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;

    /* 前腿 */
    b += `<rect x="26" y="66" width="9" height="32" rx="4.5" fill="${c.dark}"/>`;
    b += `<rect x="38" y="68" width="9" height="30" rx="4.5" fill="${c.dark}"/>`;

    /* 爪 */
    b += `<ellipse cx="30.5" cy="99" rx="6.4" ry="3.6" fill="${c.hair}"/>`;
    b += `<ellipse cx="42.5" cy="99" rx="6.4" ry="3.6" fill="${c.hair}"/>`;
    b += `<ellipse cx="64.5" cy="99" rx="6.4" ry="3.6" fill="${c.hair}"/>`;
    b += `<ellipse cx="74.5" cy="99" rx="6.4" ry="3.6" fill="${c.hair}"/>`;

    /* 头 */
    b += `<ellipse cx="25" cy="54" rx="14" ry="11.5" fill="${c.skin}"/>`;
    b += `<path d="M20 44 14 33.5 24.5 39Z" fill="${c.dark}"/>`;
    b += `<path d="M31.5 43 36.5 32.5 38.5 43Z" fill="${c.dark}"/>`;
    b += `<path d="M21 45 17 38 23 41Z" fill="${c.claw}" opacity=".45"/>`;

    /* 口鼻 */
    b += `<ellipse cx="12.5" cy="58" rx="8.4" ry="6.2" fill="${c.dark}"/>`;
    b += `<circle cx="6.6" cy="56.4" r="1.9" fill="#241408"/>`;
    b += `<path d="M10 62 12.2 68.2 15.4 62Z" fill="${c.claw}"/>`;
    b += `<path d="M16.4 63 18.6 68.6 21.6 62.6Z" fill="${c.claw}"/>`;

    /* 眼 */
    b += `<ellipse cx="21.5" cy="50" rx="2.9" ry="3.1" fill="${c.eye}"/>`;
    b += `<ellipse cx="30.5" cy="50" rx="2.9" ry="3.1" fill="${c.eye}"/>`;
    b += `<ellipse cx="21.5" cy="50" rx="1.1" ry="2.5" fill="#1c1006"/>`;
    b += `<ellipse cx="30.5" cy="50" rx="1.1" ry="2.5" fill="#1c1006"/>`;
    b += `<path d="M17.5 45.6 24.5 44M34.5 44.2 27 45.8" stroke="${c.hair}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;

    if (elite) b += crownFx(c);
    return wrap('0 0 100 112', b, elite);
  }

  /* ============================================================ 幽魂形象 */
  function ghostFig(elite) {
    const c = MOB_LOOK.ghost;
    let b = '';
    b += ell(50, 66, 34, 52, c.eye, 0.1);

    /* 破布下摆 */
    b += `<path d="M28 68c-3 14 1 22-3 34 7-7 9 0 16 7 5-11 7-3 12 4 5-8 7-15 12-4 7-7 9-14 16-7-4-12 0-20-3-34Z" fill="${c.skin}" opacity=".6"/>`;

    /* 身躯 */
    b += `<path d="M50 40c-9 0-15 5-17 12l-3 18c6 3 12 4 20 4s14-1 20-4l-3-18c-2-7-8-12-17-12Z" fill="${c.skin}" opacity=".82"/>`;
    b += `<path d="M50 46c-5 0-9 3-10 8h20c-1-5-5-8-10-8Z" fill="${c.dark}" opacity=".5"/>`;

    /* 双臂 */
    b += `<path d="M35 48C25 54 21 64 23 75" stroke="${c.skin}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>`;
    b += `<path d="M65 48c10 6 14 16 12 27" stroke="${c.skin}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>`;
    b += `<circle cx="23" cy="76" r="4.2" fill="${c.dark}"/>`;
    b += `<circle cx="77" cy="76" r="4.2" fill="${c.dark}"/>`;
    b += `<g stroke="${c.claw}" stroke-width="1.4" stroke-linecap="round" opacity=".8">` +
      `<path d="M21 79 17 84M24 80 21 86M27 79 26 86"/></g>`;
    b += `<g stroke="${c.claw}" stroke-width="1.4" stroke-linecap="round" opacity=".8">` +
      `<path d="M79 79 83 84M76 80 79 86M73 79 74 86"/></g>`;

    /* 头与兜帽 */
    b += `<ellipse cx="50" cy="27" rx="15" ry="15.5" fill="${c.skin}" opacity=".92"/>`;
    b += `<path d="M34.5 30C33 12 40 5 50 5s17 7 15.5 25C63 19 58 15 50 15s-13 4-15.5 15Z" fill="${c.hair}"/>`;

    /* 空洞双目 */
    b += `<ellipse cx="43.5" cy="27" rx="3.7" ry="4.5" fill="${c.eye}"/>`;
    b += `<ellipse cx="56.5" cy="27" rx="3.7" ry="4.5" fill="${c.eye}"/>`;
    b += `<ellipse cx="43.5" cy="27" rx="1.5" ry="2.3" fill="#08101f"/>`;
    b += `<ellipse cx="56.5" cy="27" rx="1.5" ry="2.3" fill="#08101f"/>`;
    b += `<ellipse cx="50" cy="37" rx="4.3" ry="3.1" fill="#08101f" opacity=".9"/>`;

    /* 幽点 */
    b += `<circle cx="20" cy="44" r="1.6" fill="${c.eye}" opacity=".7"/>`;
    b += `<circle cx="82" cy="52" r="1.2" fill="${c.eye}" opacity=".6"/>`;
    b += `<circle cx="76" cy="98" r="1.5" fill="${c.eye}" opacity=".5"/>`;

    if (elite) b += crownFx(c);
    return wrap('0 0 100 120', b, elite);
  }

  /* ============================================================ 魔物形象 */
  function demonFig(elite) {
    const c = MOB_LOOK.demon;
    let b = '';
    b += ell(50, 112, 32, 8, c.eye, 0.1);

    /* 翼影 */
    b += `<path d="M28 54 13 39 26 37 18 23 33 32Z" fill="${c.dark}" opacity=".85"/>`;
    b += `<path d="M72 54 87 39 74 37 82 23 67 32Z" fill="${c.dark}" opacity=".85"/>`;

    /* 腿 */
    b += `<rect x="37" y="103" width="10" height="15" rx="4" fill="${c.dark}"/>`;
    b += `<rect x="53" y="103" width="10" height="15" rx="4" fill="${c.dark}"/>`;
    b += `<ellipse cx="42" cy="118" rx="7.4" ry="3.6" fill="${c.hair}"/>`;
    b += `<ellipse cx="58" cy="118" rx="7.4" ry="3.6" fill="${c.hair}"/>`;

    /* 躯干 */
    b += `<path d="M50 38c-13 0-21 9-23 24l-3 34c-1 8 5 12 13 12h26c8 0 14-4 13-12l-3-34c-2-15-10-24-23-24Z" fill="${c.skin}"/>`;
    b += `<path d="M50 44c-9 0-15 6-16 17h32c-1-11-7-17-16-17Z" fill="${c.dark}" opacity=".5"/>`;
    b += `<path d="M50 62 45 72h6l-4 11" stroke="${c.eye}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>`;

    /* 臂与爪 */
    b += `<path d="M30 54C21 60 17 72 19 85" stroke="${c.skin}" stroke-width="8.5" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M70 54c9 6 13 18 11 31" stroke="${c.skin}" stroke-width="8.5" fill="none" stroke-linecap="round"/>`;
    b += `<g stroke="${c.claw}" stroke-width="1.9" stroke-linecap="round" fill="none">` +
      `<path d="M19 86 12 92M22 88 17 96M25 87 23 96"/></g>`;
    b += `<g stroke="${c.claw}" stroke-width="1.9" stroke-linecap="round" fill="none">` +
      `<path d="M81 86 88 92M78 88 83 96M75 87 77 96"/></g>`;

    /* 头 */
    b += `<ellipse cx="50" cy="26" rx="13.5" ry="13" fill="${c.skin}"/>`;
    b += `<path d="M39 18C33 8 34 1 41 0c-2 5-1 11 4 16Z" fill="#64748b"/>`;
    b += `<path d="M61 18c6-10 5-17-2-18 2 5 1 11-4 16Z" fill="#64748b"/>`;

    /* 眼 */
    b += `<ellipse cx="44" cy="25.5" rx="3.3" ry="2.7" fill="${c.eye}"/>`;
    b += `<ellipse cx="56" cy="25.5" rx="3.3" ry="2.7" fill="${c.eye}"/>`;
    b += `<ellipse cx="44" cy="25.5" rx="1" ry="2.1" fill="#2a0d08"/>`;
    b += `<ellipse cx="56" cy="25.5" rx="1" ry="2.1" fill="#2a0d08"/>`;

    /* 口与獠牙 */
    b += `<path d="M43 33h14l-3 3H46Z" fill="#2a0d08"/>`;
    b += `<path d="M45 34 46.5 39.4 48.5 34Z" fill="${c.claw}"/>`;
    b += `<path d="M51.5 34 53.5 39.4 55 34Z" fill="${c.claw}"/>`;

    if (elite) b += crownFx(c);
    return wrap('0 -4 100 130', b, elite);
  }

  /* ============================================================ 修士形象 */
  function humanFig(elite) {
    const c = MOB_LOOK.human;
    let b = '';
    b += ell(50, 116, 30, 8, c.eye, 0.09);

    /* 剑 */
    b += `<path d="M74 80 93 46" stroke="#cbd5e1" stroke-width="4.2" stroke-linecap="round"/>`;
    b += `<path d="M70 85 77 75" stroke="#94a3b8" stroke-width="3.4" stroke-linecap="round"/>`;
    b += `<path d="M68 78 78 81" stroke="#b08d3f" stroke-width="2.2" stroke-linecap="round"/>`;

    /* 靴 */
    b += `<rect x="41" y="110" width="8.5" height="13" rx="3.6" fill="#1f2937"/>`;
    b += `<rect x="50.5" y="110" width="8.5" height="13" rx="3.6" fill="#1f2937"/>`;

    /* 道袍 */
    b += `<path d="M50 43c-8 0-14 4-16 11l-7 45c-1 9 4 14 13 14h20c9 0 14-5 13-14l-7-45c-2-7-8-11-16-11Z" fill="${c.dark}"/>`;
    b += `<path d="M43 44c4-1 10-1 14 0l-7 16Z" fill="#374151"/>`;
    b += `<rect x="30" y="71.5" width="40" height="6.5" rx="3.2" fill="#6b7280"/>`;

    /* 广袖 */
    b += `<path d="M36 49c-6 2-11 9-13 19-1.5 7 2 11 6.5 9 3.5-1.5 6-11 8-19Z" fill="${c.dark}"/>`;
    b += `<path d="M64 49c6 2 11 9 13 19 1.5 7-2 11-6.5 9-3.5-1.5-6-11-8-19Z" fill="${c.dark}"/>`;
    b += `<circle cx="28.5" cy="74.5" r="3.5" fill="${c.skin}"/>`;
    b += `<circle cx="71.5" cy="74.5" r="3.5" fill="${c.skin}"/>`;

    /* 头 */
    b += `<rect x="46" y="35" width="8" height="10" rx="3.4" fill="${c.skin}"/>`;
    b += `<ellipse cx="50" cy="27" rx="10" ry="11.5" fill="${c.skin}"/>`;
    b += `<path d="M40 26.5C39.2 18 43.4 14.5 50 14.5s10.8 3.5 10 12c-.6-4.4-3.5-6.2-10-6.2s-9.4 1.8-10 6.2Z" fill="${c.hair}"/>`;
    b += `<circle cx="50" cy="14" r="3.8" fill="${c.hair}"/>`;
    b += `<rect x="45" y="10.4" width="10" height="2.4" rx="1.2" fill="#9ca3af"/>`;
    b += `<path d="M45.4 27c1 .9 2.1.9 3.1 0" stroke="#2f2118" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M51.5 27c1 .9 2.1.9 3.1 0" stroke="#2f2118" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M48.9 32.6c.9.6 1.4.6 2.2 0" stroke="#a4705c" stroke-width=".8" fill="none" stroke-linecap="round"/>`;

    if (elite) b += crownFx(c);
    return wrap('0 0 100 120', b, elite);
  }

  /* ============================================================ 妖将形象 */
  function bossFig() {
    const c = MOB_LOOK.boss;
    let b = '';
    b += ell(50, 124, 40, 13, c.eye, 0.16);
    b += ell(50, 66, 34, 58, c.eye, 0.07);

    /* 大氅 */
    b += `<path d="M34 44C22 56 16 84 15 116c10-6 22-4 35-1 13-3 25-5 35 1-1-32-7-60-19-72Z" fill="${c.dark}"/>`;

    /* 腿 */
    b += `<rect x="37" y="105" width="11" height="16" rx="4.5" fill="${c.dark}"/>`;
    b += `<rect x="52" y="105" width="11" height="16" rx="4.5" fill="${c.dark}"/>`;
    b += `<ellipse cx="42.5" cy="121" rx="8" ry="3.6" fill="${c.hair}"/>`;
    b += `<ellipse cx="57.5" cy="121" rx="8" ry="3.6" fill="${c.hair}"/>`;

    /* 躯干 */
    b += `<path d="M50 36c-14 0-22 10-24 26l-3 38c-1 9 6 13 14 13h26c8 0 15-4 14-13l-3-38c-2-16-10-26-24-26Z" fill="${c.skin}"/>`;
    b += `<path d="M32 46 20 42 30 56Z" fill="${c.hair}"/>`;
    b += `<path d="M68 46 80 42 70 56Z" fill="${c.hair}"/>`;
    b += `<circle cx="50" cy="70" r="8" fill="#facc15" opacity=".9"/>`;
    b += `<circle cx="50" cy="70" r="4" fill="#7f1d1d"/>`;

    /* 臂 */
    b += `<path d="M29 54C20 61 17 74 19 88" stroke="${c.skin}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
    b += `<path d="M71 54c9 7 12 20 10 34" stroke="${c.skin}" stroke-width="9" fill="none" stroke-linecap="round"/>`;

    /* 巨剑 */
    b += `<path d="M85 96 68 34" stroke="#e2e8f0" stroke-width="5.4" stroke-linecap="round"/>`;
    b += `<path d="M85 96 68 34" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity=".7"/>`;
    b += `<path d="M64 36.5 74 30.5" stroke="#facc15" stroke-width="3.2" stroke-linecap="round"/>`;

    /* 头 */
    b += `<ellipse cx="50" cy="25" rx="14" ry="13.5" fill="${c.skin}"/>`;

    /* 巨角 · 王冠 */
    b += `<path d="M38 17C29 5 31-3 41-4c-3 6-1 13 5 19Z" fill="#94a3b8"/>`;
    b += `<path d="M62 17c9-12 7-20-3-21 3 6 1 13-5 19Z" fill="#94a3b8"/>`;
    b += `<path d="M38.6 12 41.6 4 45.6 10 50 2 54.4 10 58.4 4 61.4 12Z" fill="#facc15"/>`;
    b += `<rect x="37.6" y="11.4" width="24.8" height="3" rx="1.5" fill="#ca8a04"/>`;
    b += `<circle cx="50" cy="4.6" r="1.8" fill="#fef9c3"/>`;

    /* 眼 */
    b += `<ellipse cx="44" cy="24" rx="3.7" ry="2.9" fill="${c.eye}"/>`;
    b += `<ellipse cx="56" cy="24" rx="3.7" ry="2.9" fill="${c.eye}"/>`;
    b += `<ellipse cx="44" cy="24" rx="1.1" ry="2.2" fill="#2a0a0a"/>`;
    b += `<ellipse cx="56" cy="24" rx="1.1" ry="2.2" fill="#2a0a0a"/>`;

    /* 口与獠牙 */
    b += `<path d="M42 33h16l-4 3.6H46Z" fill="#2a0a0a"/>`;
    b += `<path d="M44 34 46 40 48 34Z" fill="${c.claw}"/>`;
    b += `<path d="M52 34 54 40 56 34Z" fill="${c.claw}"/>`;

    return wrap('-6 -8 112 142', b, true);
  }

  /* ------------------------------------------------- 精英标记（金冠浮光） */
  function crownFx(c) {
    return `<g opacity=".95">` +
      `<path d="M40 6 43-1 46.5 4.5 50-3 53.5 4.5 57-1 60 6Z" fill="#facc15"/>` +
      `<rect x="39.4" y="5.6" width="21.2" height="2.4" rx="1.2" fill="#ca8a04"/>` +
      `</g>`;
  }

  /* ============================================================ 对外 API */
  function monsterSvg(family, elite) {
    /* v28：优先用 mob-art.js 的写实向矢量立绘（体块 + 三段明暗 + 轮廓光 + 遮蔽） */
    var A = global.MOB_ART;
    if (A && A[family]) return A[family](elite);
    /* 旧版扁平 SVG：仅在 mob-art.js 未加载时兜底 */
    if (family === 'ghost') return ghostFig(elite);
    if (family === 'demon') return demonFig(elite);
    if (family === 'human') return humanFig(elite);
    if (family === 'boss') return bossFig();
    return beastFig(elite);
  }

  /* ---------------------------------------------------------------- v10：AI 立绘
     优先使用 assets 下由 AI 生成的立绘（纯黑底，靠 CSS mix-blend-mode:screen 去底）。
     尚未生成的类型回退到内置 SVG，保证任何情况下都有形象可用。 */
  var HERO_IMG = {
    qingyun: 'assets/hero_qingyun.png',
    guiwang: 'assets/hero_guiwang.png',
    hehuan: 'assets/hero_hehuan.png',
    tianyin: 'assets/hero_tianyin.png',
    fenxiang: 'assets/hero_fenxiang.png'
  };
  /* v28：mob_beast.png / mob_demon.png 实测是「几乎全透明、极淡的素描线」
     （角像素 A=0，体像素 A≈0~33）—— 在深色场景里只剩一点灰痕，撑不起"怪物"的
     可信度，已改用 mob-art.js 的矢量立绘。
     日后若换上真正的写实立绘（透明底或纯黑底都行，纯黑底由 CSS 的 screen 混合去底），
     把下面两行取消注释即可重新优先使用图片。 */
  /* v29：怪物立绘改用 AI 写实图（此前是因为旧图几乎全透明才退回矢量）。
     文件缺失时由 imgFig 的 onerror 自动回退到 mob-art.js 的矢量立绘 ✓ */
  var MOB_IMG = {
    beast: 'assets/mob_beast_art.png',
    /* 鬼物：最终改用「骷髅鬼卒」—— 实色骨架 + 破烂斗篷，绿幕抠图干净；
       之前的半透明幽蓝幽灵与背景同色系，三版都抠不净，是设定与抠图天然冲突。 */
    ghost: 'assets/mob_ghost_art.png',
    demon: 'assets/mob_demon_art.png',
    human: 'assets/mob_human_art.png',
    /* 妖将：AI 图是「胯部以上」的半身立绘，配合精英位放大显示反而更有压迫感 ✓ */
    boss: 'assets/mob_boss_art.png'
  };
  /* 女版立绘（放在 assets 下即自动生效，例如 hero_qingyun_f.png；缺失则回退到通用图） */
  /* 女版立绘：现有通用女性形象 hero_female.png；
     日后若要门派专属女版，把 hero_<sect>_f.png 放进 assets 即可自动优先使用。 */
  var HERO_IMG_F = {
    qingyun: 'assets/hero_qingyun_f.png',
    guiwang: 'assets/hero_guiwang_f.png',
    /* v28：这里原本指向 hero_hehuan.png —— 那是男版合欢的图，女角色会被套上男相。
       改为同一套命名 hero_hehuan_f.png（尚未产出则由门派女版 SVG 兜底）。 */
    hehuan: 'assets/hero_hehuan_f.png',
    tianyin: 'assets/hero_tianyin_f.png',
    fenxiang: 'assets/hero_fenxiang_f.png'
  };
  var HERO_IMG_FALLBACK = 'assets/hero_female.png';   /* 各门派女版的通用回退图 */

  /* ---------------- 立绘兜底：图片取不到时回退内置 SVG ----------------
     之前只有「女版」带 onerror，男版与怪物没有 ——
     一旦 assets 未能随包发布（部署漏传 / 路径变更 / 离线缓存），
     <img> 便会渲染成一片空白，表现就是「角色与头像都看不到了」。
     现在：备用图链 → 内置 SVG，任何环境都保证有形象可见。 */
  var FB = {};        /* 回退键 → 内置 SVG（键固定，数量有界） */
  var IMG_BAD = {};   /* src → true：已确认加载失败 */
  var IMG_OK = {};    /* src → true：已确认可用 */
  var SVG_CACHE = {}; /* 内置 SVG 只生成一次 */

  function heroSvgCached(id) {
    var k = 'h:' + id;
    return SVG_CACHE[k] || (SVG_CACHE[k] = heroSvg(id));
  }
  function monsterSvgCached(family, elite) {
    var k = 'm:' + family + (elite ? ':e' : '');
    return SVG_CACHE[k] || (SVG_CACHE[k] = monsterSvg(family, elite));
  }
  function htmlToNode(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    return box.firstChild;
  }

  /* 生成图片立绘；src 已知失败时直接返回内置 SVG */
  function imgFig(src, opt) {
    opt = opt || {};
    var fbSvg = opt.svg || '';
    var key = opt.key || '';
    if (!src || IMG_BAD[src]) return fbSvg;
    if (key) FB[key] = fbSvg;
    return '<img class="fig' + (opt.cls ? ' ' + opt.cls : '') + '" src="' + src + '"' +
      (opt.gender ? ' data-gender="' + opt.gender + '"' : '') +
      (opt.chain && opt.chain.length ? ' data-next="' + opt.chain.join('|') + '"' : '') +
      (key ? ' data-fb="' + key + '" onerror="window.FIGURE.__fail(this)"' : '') +
      ' alt="" draggable="false">';
  }

  /* 图片失败：先沿备用图链换源，链尽则整体替换为内置 SVG */
  function __fail(img) {
    if (!img) return;
    var src = img.getAttribute('src') || '';
    if (src) IMG_BAD[src] = true;

    var chain = (img.getAttribute('data-next') || '').split('|').filter(Boolean);
    while (chain.length) {
      var next = chain.shift();
      if (next && !IMG_BAD[next]) {
        img.setAttribute('data-next', chain.join('|'));
        img.setAttribute('src', next);
        return;
      }
    }

    var key = img.getAttribute('data-fb');
    var host = img.parentNode;
    var svg = key && FB[key] ? htmlToNode(FB[key]) : null;
    if (!svg || !host) return;
    host.replaceChild(svg, img);

    /* 动作层里是同一张图的「副本」，图挂了副本一样是坏的 —— 一并换掉 */
    var unit = host.closest ? host.closest('.unit') : null;
    if (unit) {
      var clone = unit.querySelector('.fm .fig-view');
      if (clone && clone.parentNode && clone.tagName === 'IMG') {
        var c = svg.cloneNode(true);
        c.classList.add('fig-view');
        clone.parentNode.replaceChild(c, clone);
      }
    }
  }

  /* 启动即探测「应当存在」的立绘，已确认失败的后续直接走内置 SVG，不再产生空白 <img>。
     门派专属女版（hero_<sect>_f.png）多数尚未产出，故不主动探测，避免每次加载都产生 404。 */
  function probe() {
    if (typeof Image !== 'function') return;
    var all = [];
    [HERO_IMG, MOB_IMG].forEach(function (m) {
      for (var k in m) if (m[k]) all.push(ver(m[k]));
    });
    if (HERO_IMG_FALLBACK) all.push(ver(HERO_IMG_FALLBACK));
    all.forEach(function (src) {
      if (IMG_OK[src] || IMG_BAD[src]) return;
      var im = new Image();
      im.onload = function () { IMG_OK[src] = true; };
      im.onerror = function () { IMG_BAD[src] = true; };
      im.src = src;
    });
  }

  /* 立绘资源统一挂构建号查询串
     换图时文件名不变，浏览器会继续用旧缓存 —— 表现就是「后台明明换了图，
     手机上还是老样子（人物不在格子里）」。挂上 window.CUR（index.html 的
     构建号）后，每次发版 URL 自动变化，强制取新图。 */
  function buildVer() {
    /* 构建号取自本文件自己的 <script src="js/figure.js?v=xxx">：
       index.html 的 CUR 在 IIFE 里、取不到，读自身 URL 最稳。 */
    try {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        var s = all[i].getAttribute('src') || '';
        if (s.indexOf('figure.js') >= 0) {
          var m = s.match(/[?&]v=([^&]+)/);
          return m ? decodeURIComponent(m[1]) : '';
        }
      }
    } catch (e) { }
    return '';
  }
  var BUILD = buildVer();

  function ver(src) {
    return src ? (src + (BUILD ? '?v=' + BUILD : '')) : '';
  }

  function hero(sectId, gender) {
    if (gender === 'female') {
      /* v28：门派专属女版图 → 门派专属女版立绘（SVG）→（不再退回通用女图）。
         原来是「门派专属女版图 → 通用女版图」，而 5 张门派女版图都尚未产出，
         于是五个门派的女相全部是同一张通用图 —— 也就是「选女之后形象全都一样」。
         现在中间补一层「按门派绘制的女版 SVG」（hero-female.js）：
         五个门派各有其形，且与男版共用同一套门派配色与兵器。 */
      var want = ver(HERO_IMG_F[sectId]);
      var svgF = (global.HERO_FEMALE && global.HERO_FEMALE[sectId])
        ? global.HERO_FEMALE[sectId]()
        : heroSvgCached(sectId);
      if (!want || IMG_BAD[want]) return svgF;      /* 门派女版图缺失 → 用门派女版 SVG */
      return imgFig(want, { key: 'hf:' + sectId, gender: 'female', svg: svgF });
    }
    var src = ver(HERO_IMG[sectId]);
    if (!src) return heroSvgCached(sectId);
    return imgFig(src, { key: 'hm:' + sectId, svg: heroSvgCached(sectId) });
  }
  function monster(family, elite) {
    var src = ver(MOB_IMG[family]);
    if (!src) return monsterSvgCached(family, elite);
    return imgFig(src, {
      cls: elite ? 'elite' : '',
      key: 'mb:' + family + (elite ? ':e' : ''),
      svg: monsterSvgCached(family, elite)
    });
  }

  probe();

  global.FIGURE = {
    hero: hero, monster: monster, heroSvg: heroSvg, monsterSvg: monsterSvg,
    __fail: __fail, probe: probe, ver: ver,
    isBad: function (src) { return !!IMG_BAD[src]; },
    HERO_IMG: HERO_IMG, MOB_IMG: MOB_IMG, HERO_IMG_F: HERO_IMG_F,
    HERO_IMG_FALLBACK: HERO_IMG_FALLBACK, SECT_LOOK: SECT_LOOK, MOB_LOOK: MOB_LOOK
  };
})(window);
