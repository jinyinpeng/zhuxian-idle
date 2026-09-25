/* =========================================================================
 * 仙侠挂机 · 数据层
 * 门派 / 境界 / 技能 / 装备 / 词条 / 地图 / 怪物 / 任务 / NPC
 * ========================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- 境界 */
  const TIERS = ['炼气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '散仙', '真仙'];
  const LAYERS = ['一层', '二层', '三层', '四层', '五层', '六层', '七层', '八层', '九层'];
  const TIER_SIZE = 15;
  /* 等级与境界不设上限：MAX_LEVEL 只是「实际上到不了」的存档兜底边界，
     真正的边界是浮点精度（1e6 级的修为需求约 3e13，远未溢出）。
     具名的 11 个境界走完之后，按「转」继续生成 —— 九转之上再九转，
     理论上没有尽头。 */
  const MAX_LEVEL = 999999;
  const BEYOND = ['仙君', '仙王', '仙帝', '仙尊', '太乙金仙', '大罗金仙',
    '准圣', '圣人', '混元', '鸿蒙', '太初', '无极'];
  function tierNameOf(t) {
    if (t < TIERS.length) return TIERS[t];
    const n = t - TIERS.length;                        /* 真仙之后的第 n 重 */
    const name = BEYOND[n % BEYOND.length];
    const cycle = Math.floor(n / BEYOND.length);
    return cycle ? (name + '·' + (cycle + 1) + '转') : name;
  }

  /* ---------------------------------------------------------------- 门派 */
  const SECTS = [
    {
      id: 'qingyun',
      name: '青云门',
      motto: '正道之首 · 御剑诛邪',
      tag: '剑修 · 高暴击',
      desc: '以太极玄清道御剑千里，出手凌厉，暴击冠绝天下。',
      color: '#5eead4',
      color2: '#0d9488',
      weaponStyle: 'sword',
      mult: { hp: 1.00, atk: 1.22, def: 1.00, crit: 1.35, dodge: 1.00, spd: 1.05 },
      passive: { name: '御剑诀', desc: '暴击伤害 +30%', key: 'critDmg', value: 0.30 },
      skillNames: [
        ['御剑术', '凝聚灵力御剑直取敌首'],
        ['破剑式', '剑气纵横，撕裂敌躯使其流血'],
        ['太极玄清', '引太极玄清之力，攻伐之力大涨'],
        ['万剑归宗', '万剑齐发，将敌笼罩于剑雨之中'],
        ['诛仙剑诀', '引动诛仙剑意，一剑破灭万法']
      ]
    },
    {
      id: 'guiwang',
      name: '鬼王宗',
      motto: '魔道巨擘 · 血祭苍生',
      tag: '祭血 · 吸血续航',
      desc: '修血炼之术，以敌之血肉养己之躯，缠斗不竭。',
      color: '#c084fc',
      color2: '#7c3aed',
      weaponStyle: 'claw',
      mult: { hp: 1.28, atk: 1.06, def: 1.12, crit: 0.90, dodge: 0.95, spd: 0.95 },
      passive: { name: '血炼之躯', desc: '吸血 +10%', key: 'lifesteal', value: 0.10 },
      skillNames: [
        ['幽冥爪', '幽冥之力凝于爪尖，撕裂血肉'],
        ['噬魂咒', '咒杀目标魂魄，造成持续腐蚀'],
        ['血魔附体', '血魔降临，攻伐大增'],
        ['万鬼噬心', '召万鬼撕咬，三轮噬咬'],
        ['天鬼降世', '天鬼降临，血洗八荒']
      ]
    },
    {
      id: 'hehuan',
      name: '合欢派',
      motto: '媚术双修 · 身法通玄',
      tag: '身法 · 闪避连击',
      desc: '身法诡谲莫测，身影如烟，敌人难触其身。',
      color: '#f472b6',
      color2: '#be185d',
      weaponStyle: 'fan',
      mult: { hp: 0.92, atk: 1.12, def: 0.90, crit: 1.10, dodge: 1.65, spd: 1.28 },
      passive: { name: '魅影身法', desc: '闪避率 +12%', key: 'dodge', value: 0.12 },
      skillNames: [
        ['合欢指', '轻描淡写一指，却含千钧之力'],
        ['迷魂香', '香雾入体，令敌血流不止'],
        ['媚影分身', '幻化分身，攻势倍增'],
        ['千幻蝶舞', '身化千蝶，三度穿花'],
        ['合欢散', '柔情化劫，一舞倾城']
      ]
    },
    {
      id: 'tianyin',
      name: '天音寺',
      motto: '普度众生 · 金刚不坏',
      tag: '护体 · 高生存',
      desc: '佛法护体，岿然不动，越是久战越显神通。',
      color: '#fbbf24',
      color2: '#b45309',
      weaponStyle: 'staff',
      mult: { hp: 1.36, atk: 0.90, def: 1.38, crit: 0.85, dodge: 0.90, spd: 0.90 },
      passive: { name: '金刚不坏', desc: '受到伤害 -14%', key: 'damageCut', value: 0.14 },
      skillNames: [
        ['佛光普照', '佛光加身，一击渡厄'],
        ['金刚杵', '金刚杵重击，破除邪祟'],
        ['大梵般若', '梵音灌顶，攻守皆强'],
        ['狮子吼', '佛音震荡，三度冲击'],
        ['无量寿佛', '我佛慈悲，众生皆渡']
      ]
    },
    {
      id: 'fenxiang',
      name: '焚香谷',
      motto: '南疆秘术 · 烈焰焚天',
      tag: '法术 · 灼烧群攻',
      desc: '南疆秘传术法，符火交织，焚尽一切邪魔。',
      color: '#fb7185',
      color2: '#b91c1c',
      weaponStyle: 'orb',
      mult: { hp: 1.00, atk: 1.16, def: 0.95, crit: 1.05, dodge: 1.00, spd: 1.00 },
      passive: { name: '烈焰真诀', desc: '技能伤害 +22%', key: 'skillDmg', value: 0.22 },
      skillNames: [
        ['焚香咒', '香火化符，一符灼魂'],
        ['火灵符', '火灵缠身，烈焰不熄'],
        ['玄火鉴', '玄火鉴开，法力暴涨'],
        ['星火燎原', '星火坠落，连绵三击'],
        ['焚天诀', '焚天烈焰，荡尽乾坤']
      ]
    }
  ];

  /* ---------------------------------------------------------- 技能模板 */
  /* raise: true = 该招式必须**先举剑**才能释放（见 core.js 的举剑状态机）。
     只给 s2 重击与 s5 绝技这两记"重手"加前置：轻招仍可随手打出，
     否则每个技能都要先举剑，挂机节奏会被拖垮。 */
  const SKILL_TEMPLATES = [
    { key: 's1', unlock: 1, cd: 5.0, mp: 8, type: 'single', ratio: 3.0, hits: 1 },
    { key: 's2', unlock: 8, cd: 9.0, mp: 14, type: 'single', ratio: 5.2, hits: 1, burn: { ratio: 0.45, dur: 4 }, raise: true },
    { key: 's3', unlock: 18, cd: 18.0, mp: 20, type: 'buff', ratio: 0, hits: 0, buff: { atkPct: 0.35, dur: 10 } },
    { key: 's4', unlock: 34, cd: 13.0, mp: 26, type: 'aoe', ratio: 2.4, hits: 3 },
    { key: 's5', unlock: 55, cd: 26.0, mp: 42, type: 'ult', ratio: 9.5, hits: 1, heal: 0.16, raise: true }
  ];

  /* --------------------------------------------------------- 潜能加点 */
  const POTENTIAL = [
    { key: 'power', name: '力量', desc: '每点 +1.6% 攻击', color: '#fb7185' },
    { key: 'bone', name: '根骨', desc: '每点 +1.8% 气血上限', color: '#4ade80' },
    { key: 'insight', name: '悟性', desc: '每点 +0.25% 暴击 / +0.6% 暴击伤害', color: '#c084fc' },
    { key: 'agility', name: '身法', desc: '每点 +0.18% 闪避 / +0.35% 攻速', color: '#5eead4' }
  ];

  /* --------------------------------------------------------- 装备部位 */
  const SLOTS = [
    { id: 'weapon', name: '兵器', icon: 'sword', main: 'atk', coef: 0.34, bases: ['青锋剑', '斩月刀', '赤霄枪', '流云剑', '碎星锤', '太乙拂尘'] },
    { id: 'head', name: '头冠', icon: 'crown', main: 'hp', coef: 0.20, bases: ['凌云冠', '紫金巾', '青玉笠', '玄铁盔'] },
    { id: 'body', name: '战甲', icon: 'shield', main: 'def', coef: 0.32, bases: ['云纹袍', '锁子甲', '玄龟铠', '霓裳羽衣'] },
    { id: 'belt', name: '腰带', icon: 'minus', main: 'hp', coef: 0.16, bases: ['束云带', '蛟筋绦', '蟠龙带'] },
    { id: 'boots', name: '战靴', icon: 'activity', main: 'def', coef: 0.18, bases: ['踏云靴', '疾风履', '玄鳞靴'] },
    { id: 'necklace', name: '项链', icon: 'gem', main: 'hp', coef: 0.13, bases: ['凝神链', '璎珞环', '星辰链'] },
    { id: 'ring', name: '戒指', icon: 'sparkles', main: 'atk', coef: 0.15, bases: ['碧玉戒', '乾坤环', '紫金指环'] },
    { id: 'talisman', name: '法宝', icon: 'wand-sparkles', main: 'atk', coef: 0.17, bases: ['镇魂印', '聚灵珠', '招魂幡', '照妖镜', '八卦盘'] }
  ];

  /* ------------------------------------------------------------- 品质 */
  const QUALITIES = [
    { id: 0, name: '凡品', color: '#9ca3af', weight: 1000, mult: 1.00, affix: 0, prefix: ['粗制的', '寻常的', '旧损的'] },
    { id: 1, name: '灵品', color: '#4ade80', weight: 480, mult: 1.35, affix: 1, prefix: ['精制的', '灵纹的', '轻灵的'] },
    { id: 2, name: '玄品', color: '#60a5fa', weight: 190, mult: 1.82, affix: 2, prefix: ['玄妙的', '秘银的', '幽光的'] },
    { id: 3, name: '地品', color: '#c084fc', weight: 68, mult: 2.45, affix: 3, prefix: ['地煞的', '裂空的', '龙纹的'] },
    { id: 4, name: '天品', color: '#fb923c', weight: 19, mult: 3.25, affix: 4, prefix: ['天罡的', '九霄的', '焚天的'] },
    { id: 5, name: '仙品', color: '#f87171', weight: 4, mult: 4.40, affix: 5, prefix: ['太虚的', '诛仙的', '混沌的'] }
  ];

  /* ------------------------------------------------------------- 词条 */
  const AFFIXES = [
    { key: 'atkPct', name: '攻击加成', min: 0.030, max: 0.070, pct: true },
    { key: 'hpPct', name: '气血加成', min: 0.035, max: 0.080, pct: true },
    { key: 'defPct', name: '防御加成', min: 0.030, max: 0.075, pct: true },
    { key: 'crit', name: '暴击率', min: 0.008, max: 0.020, pct: true },
    { key: 'critDmg', name: '暴击伤害', min: 0.050, max: 0.130, pct: true },
    { key: 'dodge', name: '闪避率', min: 0.006, max: 0.016, pct: true },
    { key: 'lifesteal', name: '吸血', min: 0.008, max: 0.022, pct: true },
    { key: 'spd', name: '攻击速度', min: 0.020, max: 0.055, pct: true },
    { key: 'hpRegen', name: '气血回复', min: 0.002, max: 0.005, pct: true }
  ];

  /* ------------------------------------------------------------- 地图 */
  const REGIONS = [
    {
      id: 'r01', name: '青云山脚', range: [1, 10], family: 'beast',
      sky: ['#16233f', '#0a0f1c'], ground: '#1a2436', accent: '#5eead4',
      monsters: [
        { name: '山野灵猴', lv: 2, family: 'beast', elite: false },
        { name: '青云野狼', lv: 4, family: 'beast', elite: false },
        { name: '落石精', lv: 7, family: 'demon', elite: false },
        { name: '噬草灵虫', lv: 9, family: 'beast', elite: false },
        { name: '守山石灵', lv: 10, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r02', name: '幽泉谷', range: [10, 22], family: 'ghost',
      sky: ['#101c2e', '#060a14'], ground: '#12202e', accent: '#38bdf8',
      monsters: [
        { name: '幽泉鬼卒', lv: 13, family: 'ghost', elite: false },
        { name: '噬魂蛛', lv: 16, family: 'beast', elite: false },
        { name: '幽泉水鬼', lv: 19, family: 'ghost', elite: false },
        { name: '寒潭尸傀', lv: 21, family: 'demon', elite: false },
        { name: '幽泉老鬼', lv: 22, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r03', name: '万蝠古窟', range: [22, 36], family: 'ghost',
      sky: ['#1c1030', '#08040f'], ground: '#1d1430', accent: '#a78bfa',
      monsters: [
        { name: '血蝠妖', lv: 25, family: 'demon', elite: false },
        { name: '石窟阴尸', lv: 28, family: 'ghost', elite: false },
        { name: '噬血蝠将', lv: 31, family: 'demon', elite: false },
        { name: '万蝠头目', lv: 34, family: 'demon', elite: false },
        { name: '蝙蝠妖王', lv: 36, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r04', name: '焚香谷外', range: [36, 50], family: 'demon',
      sky: ['#3a1410', '#120404'], ground: '#2b1310', accent: '#fb923c',
      monsters: [
        { name: '焚香火魅', lv: 39, family: 'demon', elite: false },
        { name: '熔岩兽', lv: 43, family: 'beast', elite: false },
        { name: '赤炎妖将', lv: 46, family: 'demon', elite: false },
        { name: '焚谷巫祝', lv: 48, family: 'human', elite: false },
        { name: '赤炎魔君', lv: 50, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r05', name: '死亡沼泽', range: [50, 66], family: 'beast',
      sky: ['#12261d', '#040c08'], ground: '#13251c', accent: '#4ade80',
      monsters: [
        { name: '沼泽毒蜥', lv: 53, family: 'beast', elite: false },
        { name: '腐尸鬼', lv: 57, family: 'ghost', elite: false },
        { name: '毒瘴妖藤', lv: 60, family: 'demon', elite: false },
        { name: '沼泽巫尸', lv: 63, family: 'ghost', elite: false },
        { name: '沼泽魔影', lv: 66, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r06', name: '女娲神庙', range: [66, 84], family: 'human',
      sky: ['#2a2338', '#0b0913'], ground: '#241f33', accent: '#e879f9',
      monsters: [
        { name: '神殿石卫', lv: 69, family: 'human', elite: false },
        { name: '女娲残念', lv: 74, family: 'ghost', elite: false },
        { name: '上古妖傀', lv: 78, family: 'demon', elite: false },
        { name: '神庙祭司', lv: 81, family: 'human', elite: false },
        { name: '神殿守护者', lv: 84, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r07', name: '通天峰', range: [84, 104], family: 'human',
      sky: ['#0d2038', '#03080f'], ground: '#0f1c2c', accent: '#60a5fa',
      monsters: [
        { name: '通天剑奴', lv: 88, family: 'human', elite: false },
        { name: '剑气残魂', lv: 93, family: 'ghost', elite: false },
        { name: '镇峰石兽', lv: 98, family: 'beast', elite: false },
        { name: '通天执法者', lv: 101, family: 'human', elite: false },
        { name: '通天剑灵', lv: 104, family: 'boss', elite: true }
      ]
    },
    {
      id: 'r08', name: '诛仙剑阵', range: [104, 165], family: 'human',
      sky: ['#301020', '#0a0208'], ground: '#2a0f1c', accent: '#f87171',
      monsters: [
        { name: '诛仙剑魄', lv: 110, family: 'human', elite: false },
        { name: '剑阵凶灵', lv: 118, family: 'ghost', elite: false },
        { name: '血煞魔将', lv: 126, family: 'demon', elite: false },
        { name: '诛仙剑卫', lv: 135, family: 'human', elite: false },
        { name: '诛仙剑主', lv: 150, family: 'boss', elite: true }
      ]
    }
  ];

  /* ----------------------------------------------------- 主线 · 支线 */
  const MAIN_QUESTS = [
    { t: '初入仙门', d: '师尊有言：先斩十只妖物，方知剑为何物。', k: 'kill', n: 10, rw: { expMul: 0.55, goldMul: 8, yuanbao: 8, stone: 40 } },
    { t: '剑试锋芒', d: '连斩三十只妖物，磨砺手中兵刃。', k: 'kill', n: 30, rw: { expMul: 0.60, goldMul: 10, yuanbao: 10, stone: 60 } },
    { t: '淬体炼骨', d: '将任意一件装备强化至 +2。', k: 'enhance', n: 2, rw: { expMul: 0.70, goldMul: 12, yuanbao: 12, stone: 100 } },
    { t: '秘境磨砺', d: '修为达到筑基期（Lv.13）。', k: 'level', n: 13, rw: { expMul: 0.80, goldMul: 14, yuanbao: 15, stone: 150 } },
    { t: '初斩妖将', d: '斩杀 3 只地图精英。', k: 'boss', n: 3, rw: { expMul: 0.90, goldMul: 16, yuanbao: 18, stone: 200 } },
    { t: '万蝠之祸', d: '在万蝠古窟斩杀 120 只妖物。', k: 'kill', n: 120, rw: { expMul: 1.00, goldMul: 18, yuanbao: 20, stone: 260 } },
    { t: '灵宝加身', d: '累计强化装备 10 次。', k: 'enhanceTotal', n: 10, rw: { expMul: 1.10, goldMul: 20, yuanbao: 22, stone: 320 } },
    { t: '金丹大道', d: '修为突破至金丹期（Lv.26）。', k: 'level', n: 26, rw: { expMul: 1.20, goldMul: 22, yuanbao: 25, stone: 400 } },
    { t: '妖王授首', d: '斩杀 10 只地图精英。', k: 'boss', n: 10, rw: { expMul: 1.30, goldMul: 24, yuanbao: 28, stone: 480 } },
    { t: '血战沼泽', d: '在死亡沼泽斩杀 240 只妖物。', k: 'kill', n: 240, rw: { expMul: 1.40, goldMul: 26, yuanbao: 30, stone: 560 } },
    { t: '神兵初成', d: '将任意装备强化至 +6。', k: 'enhance', n: 6, rw: { expMul: 1.50, goldMul: 28, yuanbao: 34, stone: 660 } },
    { t: '元婴初现', d: '修为突破至元婴期（Lv.41）。', k: 'level', n: 41, rw: { expMul: 1.60, goldMul: 30, yuanbao: 38, stone: 780 } },
    { t: '元神出窍', d: '斩杀 20 只地图精英。', k: 'boss', n: 20, rw: { expMul: 1.75, goldMul: 34, yuanbao: 42, stone: 900 } },
    { t: '女娲遗秘', d: '在女娲神庙斩杀 420 只妖物。', k: 'kill', n: 420, rw: { expMul: 1.90, goldMul: 38, yuanbao: 48, stone: 1100 } },
    { t: '化神之境', d: '修为突破至化神期（Lv.56）。', k: 'level', n: 56, rw: { expMul: 2.05, goldMul: 42, yuanbao: 54, stone: 1300 } },
    { t: '通天问道', d: '在通天峰斩杀 600 只妖物。', k: 'kill', n: 600, rw: { expMul: 2.20, goldMul: 46, yuanbao: 60, stone: 1600 } },
    { t: '神器淬炼', d: '将任意装备强化至 +10。', k: 'enhance', n: 10, rw: { expMul: 2.40, goldMul: 52, yuanbao: 70, stone: 2000 } },
    { t: '血战剑阵', d: '斩杀 40 只地图精英。', k: 'boss', n: 40, rw: { expMul: 2.60, goldMul: 58, yuanbao: 80, stone: 2400 } },
    { t: '大乘之姿', d: '修为突破至大乘期（Lv.101）。', k: 'level', n: 101, rw: { expMul: 2.90, goldMul: 66, yuanbao: 95, stone: 3000 } },
    { t: '诛仙之巅', d: '斩杀诛仙剑主，登临仙道之巅。', k: 'boss', n: 80, rw: { expMul: 3.40, goldMul: 80, yuanbao: 150, stone: 4200 } }
  ];

  const SIDE_QUESTS = [
    { t: '寻药济世', d: '为山下药庐寻回灵草，斩杀 60 只妖兽即可。', k: 'kill', n: 60, lv: 5, rw: { expMul: 0.40, goldMul: 6, yuanbao: 5, stone: 50 } },
    { t: '除妖安民', d: '村镇受妖物侵扰，斩杀 150 只妖物。', k: 'kill', n: 150, lv: 15, rw: { expMul: 0.55, goldMul: 9, yuanbao: 8, stone: 110 } },
    { t: '兵器谱残卷', d: '收集兵器谱，强化装备 6 次。', k: 'enhanceTotal', n: 6, lv: 20, rw: { expMul: 0.60, goldMul: 10, yuanbao: 10, stone: 150 } },
    { t: '幽冥探秘', d: '深入幽冥，斩杀 320 只妖物。', k: 'kill', n: 320, lv: 30, rw: { expMul: 0.80, goldMul: 14, yuanbao: 14, stone: 260 } },
    { t: '斩妖除魔', d: '斩杀 15 只地图精英以证己身。', k: 'boss', n: 15, lv: 40, rw: { expMul: 0.95, goldMul: 18, yuanbao: 18, stone: 360 } },
    { t: '问剑长生', d: '修为达到合体期（Lv.86）。', k: 'level', n: 86, lv: 60, rw: { expMul: 1.30, goldMul: 26, yuanbao: 30, stone: 700 } },
    { t: '仙道无涯', d: '将任意装备强化至 +12。', k: 'enhance', n: 12, lv: 80, rw: { expMul: 1.70, goldMul: 34, yuanbao: 45, stone: 1200 } }
  ];

  const DAILY_QUESTS = [
    { t: '每日修行', d: '斩杀 300 只妖物。', k: 'kill', n: 300, rw: { expMul: 0.35, goldMul: 12, yuanbao: 12, stone: 180 } },
    { t: '每日历练', d: '斩杀 8 只地图精英。', k: 'boss', n: 8, rw: { expMul: 0.30, goldMul: 14, yuanbao: 14, stone: 200 } },
    { t: '每日淬炼', d: '进行 5 次装备强化。', k: 'enhanceTotal', n: 5, rw: { expMul: 0.25, goldMul: 10, yuanbao: 10, stone: 260 } },
    { t: '每日顿悟', d: '获得 5 次等级提升。', k: 'levelUp', n: 5, rw: { expMul: 0.45, goldMul: 16, yuanbao: 15, stone: 240 } }
  ];

  /* --------------------------------------------------------- NPC 数据 */
  const RANK_NAMES = [
    '青云子', '血影老祖', '叶孤鸿', '苏清月', '剑无尘', '幽冥鬼煞', '白凤鸣', '玄机真人',
    '紫衫龙王', '残剑孤星', '月宫仙子', '踏雪无痕', '焚天老魔', '千机老人', '蝶舞轻扬',
    '孤舟蓑笠', '寒山雪', '九幽魔君', '天罡剑客', '灵虚道长', '墨染琴心', '雷动九天',
    '碧游仙子', '无相尊者', '赤焰真人', '听雨轩主', '万毒魔尊', '踏云追月', '一念成魔', '长歌当行'
  ];

  const FRIEND_NAMES = [
    '云中鹤', '柳含烟', '醉青衫', '沈墨白', '花解语', '风无涯', '阿箬', '陆青冥', '浮生若梦', '南山采薇'
  ];

  const GUILDS = ['天音阁', '焚香谷', '青云门', '鬼王宗', '合欢派', '诛仙殿', '幽冥府'];

  /* --------------------------------------------------------- 钻石宝阁 */
  /* 用钻石直接购买的高阶装备：不走掉落的随机权重，买到的必是高品相、自带强化，
     且等阶 = 当前修为 + 偏移 —— 越到后期买到的东西越强，不会因等级成长被淘汰。
     这就是「更华丽的装备」的来源。 */
  const SHOP = [
    { id: 'sp1', name: '天品灵装', desc: '天品一件 · 随机部位 · 等阶 +3 · 自带强化 +3', quality: 4, ilvlOff: 3, enh: 3, price: 68 },
    { id: 'sp2', name: '仙品灵宝', desc: '仙品一件 · 随机部位 · 等阶 +5 · 自带强化 +5', quality: 5, ilvlOff: 5, enh: 5, price: 168 },
    { id: 'sp3', name: '本命法宝', desc: '仙品法宝 · 等阶 +8 · 自带强化 +8 · 满词条', quality: 5, ilvlOff: 8, enh: 8, slot: 'talisman', price: 328 },
    { id: 'sp4', name: '护道战甲', desc: '仙品战甲 · 等阶 +8 · 自带强化 +8 · 满词条', quality: 5, ilvlOff: 8, enh: 8, slot: 'body', price: 328 },
    { id: 'sp5', name: '诛仙至宝', desc: '仙品一件 · 随机部位 · 等阶 +12 · 自带强化 +12（强化上限）', quality: 5, ilvlOff: 12, enh: 12, price: 888 }
  ];

  /* ------------------------------------------------------- 装备名生成 */
  function makeItemName(qualityId, slotId) {
    const q = QUALITIES[qualityId];
    const slot = SLOTS.find(s => s.id === slotId);
    const prefix = q.prefix[Math.floor(Math.random() * q.prefix.length)];
    const base = slot.bases[Math.floor(Math.random() * slot.bases.length)];
    const suffix = qualityId >= 4 ? ['·诛仙', '·九霄', '·太虚', '·焚天'][Math.floor(Math.random() * 4)] : '';
    return prefix + base + suffix;
  }

  global.DATA = {
    TIERS, LAYERS, BEYOND, tierNameOf, TIER_SIZE, MAX_LEVEL,
    SHOP,
    SECTS, SKILL_TEMPLATES, POTENTIAL,
    SLOTS, QUALITIES, AFFIXES,
    REGIONS, MAIN_QUESTS, SIDE_QUESTS, DAILY_QUESTS,
    RANK_NAMES, FRIEND_NAMES, GUILDS,
    makeItemName
  };
})(window);
