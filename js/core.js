/* =========================================================================
 * 仙侠挂机 · 核心逻辑层
 * 角色成长 / 自动战斗 / 掉落 / 强化 / 技能 / 任务 / 离线收益
 * ========================================================================= */
(function (global) {
  'use strict';
  const D = global.DATA;

  /* ============================ 基础工具 ============================ */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function fmt(n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    if (!isFinite(n)) return '∞';
    n = Math.floor(n);
    const neg = n < 0;
    const abs = Math.abs(n);
    let s;
    if (abs < 10000) s = String(abs);
    else if (abs < 100000000) s = trimNum(abs / 10000) + '万';
    else s = trimNum(abs / 100000000) + '亿';
    return (neg ? '-' : '') + s;
  }
  function trimNum(v) {
    const d = v < 10 ? 2 : v < 100 ? 1 : 0;
    return v.toFixed(d).replace(/\.?0+$/, '');
  }
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return h + '时' + m + '分';
    if (m > 0) return m + '分' + s + '秒';
    return s + '秒';
  }
  function pct(v, d) { return (v * 100).toFixed(d === undefined ? 1 : d) + '%'; }

  /* ============================ 事件总线 ============================ */
  const H = {};
  function on(ev, fn) { (H[ev] || (H[ev] = [])).push(fn); return () => off(ev, fn); }
  function off(ev, fn) {
    const l = H[ev]; if (!l) return;
    const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1);
  }
  function emit(ev, a, b, c) { const l = H[ev]; if (l) for (let i = 0; i < l.length; i++) l[i](a, b, c); }

  /* ============================ 境界换算 ============================ */
  function tierOf(level) { return Math.min(D.TIERS.length - 1, Math.floor((level - 1) / D.TIER_SIZE)); }
  function realmName(level) {
    if (level >= D.MAX_LEVEL) return '真仙 · 圆满';
    const t = tierOf(level);
    const local = (level - 1) % D.TIER_SIZE;
    const li = Math.min(8, Math.floor(local * 9 / D.TIER_SIZE));
    return D.TIERS[t] + D.LAYERS[li];
  }
  function tierName(level) { return D.TIERS[tierOf(level)]; }

  /* ============================ 数值公式 ============================ */
  function expNeed(level) {
    if (level >= D.MAX_LEVEL) return Infinity;
    return Math.floor(70 * (10 + Math.pow(level, 1.95)) + 180);
  }
  function sectOf(id) { return D.SECTS.find(s => s.id === id) || D.SECTS[0]; }

  function mobBase(lv) {
    return {
      maxHp: Math.floor(3.4 * (20 + Math.pow(lv, 1.9))),
      atk: Math.floor(2 + 0.35 * Math.pow(lv, 1.8)),
      def: Math.floor(2 + 0.8 * Math.pow(lv, 1.5)),
      exp: Math.floor(10 + Math.pow(lv, 1.95)),
      gold: Math.floor(4 + 0.9 * Math.pow(lv, 1.6))
    };
  }
  function mobStats(m) {
    const b = mobBase(m.lv);
    const hk = m.elite ? 6.0 : 1;
    const ak = m.elite ? 1.65 : 1;
    return {
      maxHp: Math.floor(b.maxHp * hk),
      atk: Math.floor(b.atk * ak),
      def: b.def,
      exp: Math.floor(b.exp * (m.elite ? 6 : 1)),
      gold: Math.floor(b.gold * (m.elite ? 5 : 1)),
      dodge: m.elite ? 0.06 : 0.03,
      crit: m.elite ? 0.10 : 0.05
    };
  }
  function mitigation(defVal, lv) { return defVal / (defVal + 60 + lv * 16); }

  /* ============================ 状态 ============================ */
  let G = null;
  const SAVE_KEY = 'zhuxian_idle_save_v1';
  let uidSeq = 1;

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function newState(name, sectId, gender) {
    const st = {
      v: 1,
      name: (name || '无名散修').slice(0, 8),
      sect: sectId || 'qingyun',
      gender: gender === 'female' ? 'female' : 'male',
      guild: pick(D.GUILDS),
      born: Date.now(),
      level: 1,
      exp: 0,
      hp: 1, mp: 1,
      pot: { power: 0, bone: 0, insight: 0, agility: 0 },
      res: { gold: 800, yuanbao: 80, stone: 120 },
      skills: { s1: 1, s2: 0, s3: 0, s4: 0, s5: 0 },
      equipped: {},
      bag: [],
      region: 'r01',
      auto: true,
      settings: {
        autoRegion: true,
      dayMode: true,
        autoEquip: true,
        autoQuest: true,
        autoEnhance: true,
        autoSellQuality: -1,
        logOn: true
      },
      stats: {
        kills: 0, bossKills: 0, enhanceTotal: 0, levelUps: 0, deaths: 0,
        expTotal: 0, goldTotal: 0, itemTotal: 0, bestEnhance: 0,
        playTime: 0, killRate: 0, dps: 0, treasure: 0
      },
      quests: { main: { idx: 0, base: 0 }, side: [], daily: { date: '', items: [] } },
      friends: [],
      rank: [],
      log: [],
      lastSave: Date.now(),
      version: 1
    };
    st.quests.side = D.SIDE_QUESTS.map(() => ({ base: null, claimed: false }));
    st.quests.daily = { date: dayKey(), items: D.DAILY_QUESTS.map(q => ({ base: questCounter(st, q.k), claimed: false })) };
    return st;
  }

  /* 战斗临时态（不存档） */
  let C = null;
  function newCombat() {
    return {
      mob: null, mobs: [], mobHp: 0, spawn: 0.9,
      pTimer: 0.4, mTimer: 0, cds: { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0 },
      burn: null, buff: { t: 0, v: 0 }, sinceElite: 0, dying: 0,
      windowKills: 0, windowT: 0, dmgWindow: 0, windowDmgT: 0
    };
  }

  /* ============================ 日志 ============================ */
  function log(text, type) {
    const e = { t: Date.now(), text: text, type: type || 'info' };
    G.log.push(e);
    if (G.log.length > 30) G.log.shift();
    if (G.settings.logOn) emit('log', e);
  }

  /* ============================ 属性计算 ============================ */
  function emptyBonus() {
    return {
      atkFlat: 0, hpFlat: 0, defFlat: 0,
      atkPct: 0, hpPct: 0, defPct: 0,
      crit: 0, critDmg: 0, dodge: 0, lifesteal: 0, spd: 0, hpRegen: 0
    };
  }
  function itemBonus(b, it) {
    if (!it) return;
    const gMain = 1 + it.enh * 0.08;
    const v = it.main.value * gMain;
    if (it.main.key === 'atk') b.atkFlat += v;
    else if (it.main.key === 'hp') b.hpFlat += v;
    else b.defFlat += v;
    const gA = 1 + it.enh * 0.04;
    for (let i = 0; i < it.affixes.length; i++) {
      const a = it.affixes[i];
      b[a.key] = (b[a.key] || 0) + a.value * gA;
    }
  }
  function equipBonus() {
    const b = emptyBonus();
    for (const k in G.equipped) itemBonus(b, G.equipped[k]);
    return b;
  }

  function stats(lvOnly) {
    const L = lvOnly || G.level;
    const sect = sectOf(G.sect);
    const eb = equipBonus();
    const p = G.pot;
    const pas = {};
    const pk = sect.passive.key;
    pas[pk] = (pas[pk] || 0) + sect.passive.value;
    const m = sect.mult;

    let atk = (30 + 3.0 * Math.pow(L, 1.9)) * (1 + p.power * 0.016) * m.atk;
    let hp = (260 + 26 * Math.pow(L, 1.6)) * (1 + p.bone * 0.018) * m.hp;
    let def = (4 + 1.5 * Math.pow(L, 1.5)) * m.def;

    atk += eb.atkFlat; hp += eb.hpFlat; def += eb.defFlat;
    atk *= (1 + eb.atkPct); hp *= (1 + eb.hpPct); def *= (1 + eb.defPct);

    const crit = clamp(0.05 + p.insight * 0.0025 + eb.crit + (pas.crit || 0), 0, 0.75);
    const critDmg = 1.5 + p.insight * 0.006 + eb.critDmg + (pas.critDmg || 0);
    const dodge = clamp(0.03 + p.agility * 0.0018 + eb.dodge + (pas.dodge || 0), 0, 0.60);
    const spd = clamp(p.agility * 0.0035 + eb.spd + (pas.spd || 0), 0, 2.0);
    const lifesteal = clamp(eb.lifesteal + (pas.lifesteal || 0), 0, 0.5);
    const damageCut = clamp(pas.damageCut || 0, 0, 0.6);
    const skillDmg = 1 + (pas.skillDmg || 0);
    const hpRegen = 0.025 + eb.hpRegen;
    const atkInterval = clamp(1.0 / (0.9 + spd), 0.35, 1.6);

    return {
      level: L, atk: Math.floor(atk), hp: Math.floor(hp), def: Math.floor(def),
      crit: crit, critDmg: critDmg, dodge: dodge, spd: spd,
      lifesteal: lifesteal, damageCut: damageCut, skillDmg: skillDmg,
      hpRegen: hpRegen, atkInterval: atkInterval,
      maxMp: Math.floor(100 + L * 8), mpRegen: 6 + L * 0.35,
      power: powerScore(atk, hp, def, crit, critDmg, dodge, lifesteal, spd, hpRegen)
    };
  }
  function powerScore(atk, hp, def, crit, critDmg, dodge, ls, spd, regen) {
    return Math.floor(
      atk * 2.2 + hp * 0.32 + def * 1.5 +
      (crit + dodge) * 14000 + critDmg * 4200 + ls * 9000 + spd * 9000 + regen * 18000
    );
  }
  function combatPower() { return stats().power; }

  /* ============================ 自动战斗 ============================ */
  function regionOf(id) { return D.REGIONS.find(r => r.id === id) || D.REGIONS[0]; }
  function bestRegionFor(level) {
    let best = D.REGIONS[0];
    for (let i = 0; i < D.REGIONS.length; i++) {
      if (level >= D.REGIONS[i].range[0] - 2) best = D.REGIONS[i];
    }
    return best;
  }

  function spawnMob() {
    const region = regionOf(G.region);
    const list = region.monsters;
    const normals = list.slice(0, list.length - 1);
    let elite = false;
    if (C.sinceElite >= 24) elite = true;
    else if (Math.random() < 0.10) elite = true;

    /* v7 妖将率众：妖将带 1~2 名手下；普通怪 1~3 只成群 */
    const minions = elite ? rndInt(1, 2) : 0;
    const groupSize = elite ? 1 + minions : rndInt(1, 3);
    const group = [];
    for (let gi = 0; gi < groupSize; gi++) {
      const isBoss = elite && gi === 0;
      let md;
      if (isBoss) { md = list[list.length - 1]; C.sinceElite = 0; }
      else { md = pick(normals); if (!elite) C.sinceElite++; }
      const ms = mobStats(md);
      /* 手下：血更薄（42%）、攻击 75%、经验 60%；普通成群时单体 60% */
      const hpMul = isBoss ? 1 : (elite ? 0.42 : 0.6);
      const maxHp = Math.max(1, Math.round(ms.maxHp * hpMul));
      group.push({
        idx: gi, name: md.name, lv: md.lv, family: md.family, elite: isBoss,
        maxHp: maxHp, hp: maxHp,
        atk: Math.round(ms.atk * (isBoss ? 1 : (elite ? 0.75 : 1))),
        def: ms.def,
        exp: Math.round(ms.exp * (isBoss ? 1 : (elite ? 0.6 : 1))),
        gold: ms.gold, dodge: ms.dodge, crit: ms.crit
      });
    }
    C.mobs = group;
    C.mob = group[0];
    C.mobHp = group[0].hp;
    C.dying = 0;
    C.mTimer = 1.2;
    C.burn = null;
    emit('spawn', group);
    if (elite) {
      log('★ 妖将现身：' + group[0].name + '（Lv.' + group[0].lv + '）' +
        (minions ? '，率 ' + minions + ' 名手下' : ''), 'boss');
    } else if (groupSize > 1) {
      log('一群妖物围了上来（' + groupSize + ' 只）', 'info');
    }
  }

  function addDamage(n) { C.dmgWindow += n; }

  function playerHit(target) {
    const st = stats();
    if (Math.random() < target.dodge) {
      emit('damage', { side: 'mob', idx: target.idx, amount: 0, dodge: true, crit: false });
      return 0;
    }
    const mit = mitigation(target.def, target.lv);
    const isCrit = Math.random() < st.crit;
    let dmg = st.atk * (1 - mit) * rnd(0.94, 1.06);
    if (isCrit) dmg *= st.critDmg;
    dmg = Math.max(1, dmg);
    target.hp -= dmg;
    C.mobHp = Math.max(0, target.hp);
    addDamage(dmg);
    emit('damage', { side: 'mob', idx: target.idx, amount: Math.floor(dmg), dodge: false, crit: isCrit });

    // 吸血
    if (st.lifesteal > 0) {
      const heal = dmg * st.lifesteal;
      G.hp = clamp(G.hp + heal / st.hp, 0, 1);
    }
    return dmg;
  }

  function useSkill(key) {
    const t = D.SKILL_TEMPLATES.find(s => s.key === key);
    if (!t) return;
    const slv = G.skills[key] || 1;
    const st = stats();
    const mpCost = t.mp * (1 + (slv - 1) * 0.08);
    if (G.mp * st.maxMp < mpCost) return false;
    if (!C.mob) return false;
    G.mp = clamp(G.mp - mpCost / st.maxMp, 0, 1);

    const name = sectOf(G.sect).skillNames[D.SKILL_TEMPLATES.indexOf(t)][0];
    emit('skill', { key: key, name: name, type: t.type });

    if (t.type === 'buff') {
      C.buff = { t: t.buff.dur, v: t.buff.atkPct };
      log('施展【' + name + '】，攻势大涨', 'buff');
      return true;
    }
    const ratio = t.ratio * (1 + (slv - 1) * 0.20) * st.skillDmg;
    const hits = t.hits || 1;
    let total = 0;
    /* v5 群怪：技能为群体攻击 —— 每段都命中场上所有存活妖物 */
    const targets = C.mobs.filter(m => m.hp > 0);
    for (let h = 0; h < hits; h++) {
      for (let ti = 0; ti < targets.length; ti++) {
        const m = targets[ti];
        if (m.hp <= 0) continue;
        const dmg = st.atk * ratio / hits;
        const mit = mitigation(m.def, m.lv);
        const dd = Math.max(1, dmg * (1 - mit));
        m.hp -= dd;
        total += dd;
        emit('damage', { side: 'mob', idx: m.idx, amount: Math.floor(dd), skill: true, crit: false, delay: h * 0.12 + ti * 0.05 });
      }
    }
    if (C.mob) C.mobHp = Math.max(0, C.mob.hp);
    addDamage(total);
    if (t.burn) {
      C.burn = { dps: st.atk * t.burn.ratio * st.skillDmg, t: t.burn.dur };
    }
    if (t.heal) {
      const heal = st.hp * t.heal;
      G.hp = clamp(G.hp + t.heal, 0, 1);
      emit('damage', { side: 'hero', amount: Math.floor(heal), heal: true });
    }
    log('施展【' + name + '】，造成 ' + fmt(total) + ' 伤害', 'skill');
    return true;
  }

  function skillCastOrder() { return ['s5', 's3', 's4', 's2', 's1']; }
  function skillUnlocked(key) {
    const t = D.SKILL_TEMPLATES.find(s => s.key === key);
    if (!t) return false;
    if (!G.skills[key]) return false;
    return G.level >= t.unlock;
  }
  function skillCd(key) {
    const t = D.SKILL_TEMPLATES.find(s => s.key === key);
    const slv = G.skills[key] || 1;
    return t.cd * Math.max(0.6, 1 - (slv - 1) * 0.012);
  }

  function mobAttack(attacker) {
    const st = stats();
    const m = attacker || C.mob;
    if (!m) return;
    if (Math.random() < st.dodge) {
      emit('damage', { side: 'hero', amount: 0, dodge: true });
      return;
    }
    const mit = mitigation(st.def, G.level);
    const isCrit = Math.random() < m.crit;
    let dmg = m.atk * (1 - mit) * (1 - st.damageCut) * rnd(0.9, 1.1);
    if (isCrit) dmg *= 1.5;
    dmg = Math.max(1, dmg);
    G.hp = clamp(G.hp - dmg / st.hp, 0, 1);
    emit('damage', { side: 'hero', amount: Math.floor(dmg), crit: isCrit });
  }

  function onMobKilled(m) {
    m = m || C.mob;
    if (!m) return;
    G.stats.kills++;
    if (m.elite) G.stats.bossKills++;
    C.windowKills++;
    G.stats.expTotal += m.exp;
    G.stats.goldTotal += m.gold;

    emit('exp', { amount: m.exp, gold: m.gold });

    // 经验
    G.exp += m.exp;
    checkLevelUp();

    // 金币
    G.res.gold += m.gold;

    // 灵石
    if (Math.random() < 0.4) {
      const s = rndInt(1, m.elite ? 8 : 3);
      G.res.stone += s;
      emit('res', { stone: s });
    }

    // 掉落
    const drops = [];
    let n = 0;
    if (m.elite) n = rndInt(2, 3);
    else if (Math.random() < 0.30) n = 1;
    if (n > 0) { for (let i = 0; i < n; i++) drops.push(makeItem(m.lv, m.elite)); }
    for (let i = 0; i < drops.length; i++) grantItem(drops[i]);

    emit('kill', m);
    if (m.elite) log('击杀妖将【' + m.name + '】，获得 ' + fmt(m.exp) + ' 修为', 'boss');
    else emit('killQuiet', m);
  }

  function checkLevelUp() {
    let up = 0;
    while (G.level < D.MAX_LEVEL && G.exp >= expNeed(G.level)) {
      G.exp -= expNeed(G.level);
      G.level++;
      up++;
      G.stats.levelUps++;
    }
    if (G.level >= D.MAX_LEVEL) G.exp = 0;
    if (up > 0) {
      G.hp = 1; G.mp = 1;
      log('修为精进，突破至 ' + realmName(G.level) + '（Lv.' + G.level + '）', 'gold');
      emit('levelup', { level: G.level, realm: realmName(G.level), up: up });
      if (G.settings.autoRegion) {
        const r = bestRegionFor(G.level);
        if (r.id !== G.region) switchRegion(r.id, false);
      }
      syncSkillUnlocks(true);
    }
  }
  function syncSkillUnlocks(silent) {
    D.SKILL_TEMPLATES.forEach(t => {
      if (G.level >= t.unlock && !G.skills[t.key]) {
        G.skills[t.key] = 1;
        const nm = sectOf(G.sect).skillNames[D.SKILL_TEMPLATES.indexOf(t)][0];
        if (!silent) log('习得新技能【' + nm + '】', 'gold');
      }
    });
  }

  /* ============================ 物品 ============================ */
  function rollQuality(ilvl, elite) {
    const boost = 1 + ilvl / 55;
    const extra = elite ? 1.55 : 1;
    let total = 0;
    const ws = D.QUALITIES.map(q => {
      const w = q.weight * Math.pow(boost, q.id) * Math.pow(extra, q.id);
      total += w; return w;
    });
    let r = Math.random() * total;
    for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; }
    return 0;
  }
  function makeItem(ilvl, elite, opts) {
    opts = opts || {};
    ilvl = clamp(Math.floor(ilvl + rndInt(-1, 2)), 1, D.MAX_LEVEL);
    const qId = opts.quality !== undefined ? opts.quality : rollQuality(ilvl, elite);
    const q = D.QUALITIES[qId];
    const slot = opts.slot ? D.SLOTS.find(s => s.id === opts.slot) : pick(D.SLOTS);
    const mainValue = slot.coef * (8 + ilvl * 5.2) * q.mult;
    const affixes = [];
    const pool = D.AFFIXES.slice();
    for (let i = 0; i < q.affix && pool.length; i++) {
      const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      affixes.push({ key: a.key, value: rnd(a.min, a.max) * (1 + ilvl * 0.010) });
    }
    return {
      uid: 'i' + (uidSeq++) + '_' + Date.now().toString(36),
      slot: slot.id, quality: qId, ilvl: ilvl, enh: 0,
      name: D.makeItemName(qId, slot.id),
      main: { key: slot.main, value: mainValue },
      affixes: affixes,
      isNew: true
    };
  }
  function qualityOf(it) { return D.QUALITIES[it.quality]; }
  function itemPower(it) {
    const b = emptyBonus();
    itemBonus(b, it);
    return powerScore(
      b.atkFlat * (1 + b.atkPct), b.hpFlat * (1 + b.hpPct), b.defFlat * (1 + b.defPct),
      b.crit, b.critDmg, b.dodge, b.lifesteal, b.spd, b.hpRegen
    );
  }

  function findItem(uid) {
    for (const k in G.equipped) {
      if (G.equipped[k] && G.equipped[k].uid === uid) return { item: G.equipped[k], where: 'equip', slot: k };
    }
    const i = G.bag.findIndex(x => x.uid === uid);
    if (i >= 0) return { item: G.bag[i], where: 'bag', index: i };
    return null;
  }

  function sellPrice(it) {
    const q = qualityOf(it);
    return Math.floor((14 + it.ilvl * 9) * q.mult * (1 + it.enh * 0.25));
  }

  /* 行囊满时的提示节流：只在「刚满」那一刻说一次，避免每次掉落都刷屏 */
  let bagFullLogged = false;

  function grantItem(it) {
    G.stats.itemTotal++;
    // 自动出售
    const th = G.settings.autoSellQuality;
    if (th >= 0 && it.quality <= th) {
      const g = sellPrice(it);
      G.res.gold += g;
      G.stats.goldTotal += g;
      emit('autosell', { item: it, gold: g });
      return;
    }
    // 自动装备
    if (G.settings.autoEquip) {
      const cur = G.equipped[it.slot];
      if (!cur || itemPower(it) > itemPower(cur)) {
        if (cur) {
          cur.isNew = false;
          // 换下的旧装备：品质尚可且行囊有空位则保留，否则折算金币
          if (cur.quality >= 3 && G.bag.length < 60) G.bag.push(cur);
          else {
            const g = sellPrice(cur);
            G.res.gold += g;
            G.stats.goldTotal += g;
          }
        }
        it.isNew = true;
        G.equipped[it.slot] = it;
        emit('equip', it);
        if (it.quality >= 3) log('装备【' + it.name + '】', 'drop');
        return;
      }
    }
    if (G.bag.length >= 60) {
      const g = sellPrice(it);
      G.res.gold += g;
      G.stats.goldTotal += g;
      emit('autosell', { item: it, gold: g, full: true });
      /* 界面不再为此弹提示；日志也只在「刚满」那一刻记一条 ——
         行囊满着挂机时每次掉落都提示，只会把战斗日志整个冲掉。
         腾出空位后重新满上，才会再提示一次。 */
      if (!bagFullLogged) {
        bagFullLogged = true;
        log('行囊已满，多余掉落自动折算金币', 'info');
      }
      return;
    }
    bagFullLogged = false;
    G.bag.push(it);
    emit('drop', it);
  }
  /* ============================ 强化 ============================ */
  const ENH_MAX = 15;
  const ENH_RATE = [1, 1, 1, 0.95, 0.90, 0.85, 0.78, 0.70, 0.62, 0.54, 0.46, 0.38, 0.30, 0.23, 0.17];
  function enhCost(it) {
    const e = it.enh;
    return {
      gold: Math.floor(120 * Math.pow(e + 1, 1.65) * (1 + it.ilvl / 22)),
      stone: Math.floor(2 + e * 1.5 + it.ilvl / 30)
    };
  }
  function enhRate(it) { return it.enh >= ENH_MAX ? 0 : ENH_RATE[it.enh]; }

  function enhance(uid, quiet) {
    const ref = findItem(uid);
    if (!ref) return { ok: false, msg: '未找到装备' };
    const it = ref.item;
    if (it.enh >= ENH_MAX) return { ok: false, msg: '已达强化上限 +' + ENH_MAX };
    const cost = enhCost(it);
    if (G.res.gold < cost.gold) return { ok: false, msg: '金币不足，需 ' + fmt(cost.gold) };
    if (G.res.stone < cost.stone) return { ok: false, msg: '强化石不足，需 ' + fmt(cost.stone) };
    G.res.gold -= cost.gold;
    G.res.stone -= cost.stone;
    G.stats.enhanceTotal++;
    const rate = enhRate(it);
    const ok = Math.random() < rate;
    if (ok) {
      it.enh++;
      if (it.enh > G.stats.bestEnhance) G.stats.bestEnhance = it.enh;
      if (!quiet) log('强化成功！【' + it.name + '】提升至 +' + it.enh, 'gold');
    }
    emit('enhance', { item: it, ok: ok, cost: cost, quiet: !!quiet });
    if (quiet && ok && it.enh % 3 === 0) log('【' + it.name + '】已强化至 +' + it.enh, 'gold');
    return { ok: true, success: ok, item: it, cost: cost, rate: rate };
  }

  let enhT = 0;
  function autoEnhanceTick(dt) {
    if (!G.settings.autoEnhance) return;
    enhT -= dt;
    if (enhT > 0) return;
    enhT = 3;
    let best = null;
    for (const k in G.equipped) {
      const it = G.equipped[k];
      if (!it || it.enh >= ENH_MAX || it.enh >= 12) continue;
      const c = enhCost(it);
      if (G.res.gold > c.gold * 3 && G.res.stone > c.stone * 2) {
        if (!best || it.enh < best.enh) best = it;
      }
    }
    if (best) enhance(best.uid, true);
  }

  function seekTreasure() {
    const cost = 60;
    if (G.res.yuanbao < cost) return { ok: false, msg: '元宝不足，需 ' + cost + ' 元宝' };
    G.res.yuanbao -= cost;
    G.stats.treasure++;
    const qId = clamp(rollQuality(G.level, true) + 1, 0, 5);
    const it = makeItem(G.level + 4, true, { quality: qId });
    grantItem(it);
    log('寻宝所得：【' + it.name + '】', 'gold');
    return { ok: true, item: it };
  }

  /* ============================ 任务 ============================ */
  function questCounter(st, k) {
    const s = (st || G).stats;
    switch (k) {
      case 'kill': return s.kills;
      case 'boss': return s.bossKills;
      case 'enhance': return s.bestEnhance;
      case 'enhanceTotal': return s.enhanceTotal;
      case 'level': return (st || G).level;
      case 'levelUp': return s.levelUps;
    }
    return 0;
  }
  const QUEST_ABS = { level: 1, enhance: 1 };

  function questState(def, qs, kind) {
    const counter = questCounter(G, def.k);
    const base = QUEST_ABS[def.k] ? 0 : (qs.base || 0);
    let cur = counter - base;
    const need = def.n;
    const done = cur >= need;
    const label = questLabel(def);
    return {
      kind: kind, def: def, base: base, cur: Math.max(0, cur), need: need,
      done: done, claimed: !!qs.claimed, label: label
    };
  }
  function questLabel(def) {
    switch (def.k) {
      case 'kill': return '斩杀妖物';
      case 'boss': return '斩杀妖将';
      case 'enhance': return '装备强化等级';
      case 'enhanceTotal': return '累计强化次数';
      case 'level': return '修为等级';
      case 'levelUp': return '等级提升次数';
    }
    return '进度';
  }

  function getQuestList() {
    const out = { main: null, side: [], daily: [] };
    // 主线
    if (G.quests.main.idx < D.MAIN_QUESTS.length) {
      out.main = questState(D.MAIN_QUESTS[G.quests.main.idx], G.quests.main, 'main');
      out.main.idx = G.quests.main.idx;
    }
    // 支线
    D.SIDE_QUESTS.forEach((def, i) => {
      const qs = G.quests.side[i];
      if (qs.base === null) {
        if (G.level >= (def.lv || 1)) {
          qs.base = QUEST_ABS[def.k] ? 0 : questCounter(G, def.k);
        } else return;
      }
      const st = questState(def, qs, 'side');
      st.idx = i;
      out.side.push(st);
    });
    // 日常
    if (G.quests.daily.date !== dayKey()) resetDaily();
    D.DAILY_QUESTS.forEach((def, i) => {
      const qs = G.quests.daily.items[i];
      const st = questState(def, qs, 'daily');
      st.idx = i;
      out.daily.push(st);
    });
    return out;
  }
  function resetDaily() {
    G.quests.daily = {
      date: dayKey(),
      items: D.DAILY_QUESTS.map(q => ({ base: QUEST_ABS[q.k] ? 0 : questCounter(G, q.k), claimed: false }))
    };
    log('日常任务已刷新', 'info');
  }

  function claimQuest(kind, idx) {
    const list = getQuestList();
    let q = null;
    if (kind === 'main') q = list.main;
    else if (kind === 'side') q = list.side.find(x => x.idx === idx);
    else q = list.daily.find(x => x.idx === idx);
    if (!q) return { ok: false, msg: '任务不存在' };
    if (!q.done) return { ok: false, msg: '任务尚未完成' };
    if (q.claimed) return { ok: false, msg: '奖励已领取' };

    const rw = q.def.rw;
    const need = expNeed(G.level);
    // 满级后 expNeed 为 Infinity，不可写入数值域，避免污染统计与存档
    const exp = isFinite(need) ? Math.floor(need * rw.expMul) : 0;
    const gold = Math.floor((60 + G.level * 26) * rw.goldMul);
    G.exp += exp;
    G.res.gold += gold;
    G.stats.expTotal += exp;
    G.stats.goldTotal += gold;
    if (rw.yuanbao) G.res.yuanbao += rw.yuanbao;
    if (rw.stone) G.res.stone += rw.stone;

    if (kind === 'main') {
      G.quests.main.idx++;
      const nx = D.MAIN_QUESTS[G.quests.main.idx];
      G.quests.main.base = nx ? (QUEST_ABS[nx.k] ? 0 : questCounter(G, nx.k)) : 0;
    } else if (kind === 'side') {
      G.quests.side[idx].claimed = true;
    } else {
      G.quests.daily.items[idx].claimed = true;
    }
    log('完成任务【' + q.def.t + '】，获得 ' + fmt(exp) + ' 修为', 'gold');
    emit('quest', { kind: kind, q: q, exp: exp, gold: gold });
    checkLevelUp();
    return { ok: true, exp: exp, gold: gold, rw: rw };
  }

  function autoQuestTick() {
    if (!G.settings.autoQuest) return;
    const list = getQuestList();
    const tryClaim = (kind, q) => {
      if (q && q.done && !q.claimed) {
        const r = claimQuest(kind, q.idx);
        if (r.ok) emit('questAuto', { kind: kind, q: q, exp: r.exp, gold: r.gold });
      }
    };
    tryClaim('main', list.main);
    list.side.forEach(q => tryClaim('side', q));
    list.daily.forEach(q => tryClaim('daily', q));
  }

  /* ============================ 朋友 / 排行 ============================ */
  function initSocial() {
    if (!G.friends.length) {
      const n = 6;
      for (let i = 0; i < n; i++) {
        G.friends.push({
          name: D.FRIEND_NAMES[i % D.FRIEND_NAMES.length],
          level: clamp(G.level + rndInt(-6, 9), 1, D.MAX_LEVEL),
          online: Math.random() < 0.55,
          guild: pick(D.GUILDS),
          giftAt: 0
        });
      }
    }
    initRank();
  }

  /* ---------- 排行榜 ----------
     原来每次调用 getRank() 都要用 rndInt(-4, 26) 把全部 30 人的等级重掷一遍，
     名册又不存档 —— 于是每打开一次面板，名次与等级整体变一遍，
     玩起来就是「这榜单的数据是编的」。
     改为：名册只在建档时生成一次并写进存档，每人只存「相对修为差 gap」，
     绝对等级 = 玩家等级 + gap。这样：
       · 每次打开都是同一张榜（梯队形状固定，不再重掷）
       · 榜上的人跟着玩家一起成长，不会出现「你 Lv.60、榜上全是 Lv.20」
       · 玩家的名次稳定可预期 —— 超越谁就是超越谁 */
  function initRank() {
    if (!G.rank) G.rank = [];
    if (G.rank.length) return;
    const n = D.RANK_NAMES.length;
    for (let i = 0; i < n; i++) {
      /* 榜首领先玩家约 26 级，榜尾落后约 8 级，中间均匀铺开 */
      const span = n > 1 ? Math.round(i * 34 / (n - 1)) : 0;
      G.rank.push({
        name: D.RANK_NAMES[i],
        gap: 26 - span + rndInt(-2, 2),
        guild: D.GUILDS[i % D.GUILDS.length],
        sect: D.SECTS[i % D.SECTS.length].id
      });
    }
  }
  function getRank() {
    const list = G.rank.map(r => ({
      name: r.name,
      level: clamp(G.level + (r.gap || 0), 1, D.MAX_LEVEL),
      guild: r.guild,
      sect: r.sect,
      me: false
    }));
    list.push({ name: G.name, level: G.level, guild: G.guild, sect: G.sect, me: true });
    /* 同级时玩家排前面，名次才不会在同级之间来回跳 */
    list.sort((a, b) => (b.level - a.level) || (a.me ? -1 : b.me ? 1 : 0));
    return list;
  }
  function giftFriend(name) {
    const f = G.friends.find(x => x.name === name);
    if (!f) return { ok: false, msg: '对方不在好友列表' };
    const now = Date.now();
    if (now - f.giftAt < 3600000) {
      return { ok: false, msg: '今日已赠予过' };
    }
    f.giftAt = now;
    G.res.yuanbao += 5;
    G.res.gold += 200 + G.level * 20;
    return { ok: true, yuanbao: 5, gold: 200 + G.level * 20 };
  }

  /* ============================ 区域切换 ============================ */
  function switchRegion(id, manual) {
    const r = regionOf(id);
    if (manual) G.settings.autoRegion = false;
    if (G.region === id && !manual) return;
    G.region = id;
    C.mobs = []; C.mob = null; C.spawn = 0.7; C.sinceElite = 0;
    G.hp = Math.max(G.hp, 0.5);
    emit('region', r);
    log('踏入 ' + r.name + '（Lv.' + r.range[0] + '-' + r.range[1] + '）', 'info');
    if (G.auto) spawnMob();
  }
  function toggleAuto() {
    G.auto = !G.auto;
    if (G.auto && !C.mob) C.spawn = 0.3;
    emit('auto', G.auto);
    log(G.auto ? '开始自动挂机' : '已暂停挂机', 'info');
    return G.auto;
  }

  /* ============================ 主循环 ============================ */
  function tick(dt) {
    if (!G) return;
    dt = Math.min(dt, 0.5);
    G.stats.playTime += dt;
    const st = stats();

    // 回复
    G.hp = clamp(G.hp + st.hpRegen * dt, 0, 1);
    G.mp = clamp(G.mp + (st.mpRegen / st.maxMp) * dt, 0, 1);

    // buff
    if (C.buff.t > 0) C.buff.t -= dt;

    if (!G.auto) {
      socialTimer(dt);
      return;
    }

    // 统计窗口
    C.windowT += dt;
    if (C.windowT >= 8) {
      G.stats.killRate = C.windowKills / C.windowT;
      C.windowKills = 0; C.windowT = 0;
    }
    C.windowDmgT += dt;
    if (C.windowDmgT >= 2) {
      G.stats.dps = C.dmgWindow / C.windowDmgT;
      C.dmgWindow = 0; C.windowDmgT = 0;
    }

    if (!C.mobs.length) {
      C.spawn -= dt;
      if (C.spawn <= 0) spawnMob();
      socialTimer(dt);
      return;
    }
    /* 主目标 = 第一只存活妖物（沿用旧逻辑，其余怪各自独立结算） */
    C.mob = null;
    for (let mi = 0; mi < C.mobs.length; mi++) {
      if (C.mobs[mi].hp > 0) { C.mob = C.mobs[mi]; break; }
    }
    if (!C.mob) {
      /* 全灭：等待下一波 */
      C.dying -= dt;
      if (C.dying <= 0) { C.mobs = []; C.spawn = 0.5; }
      socialTimer(dt);
      return;
    }

    // 灼烧
    if (C.burn && C.burn.t > 0) {
      C.burn.t -= dt;
      const bd = C.burn.dps * dt;
      /* 灼烧对场上所有存活妖物生效 */
      let bn = 0;
      for (let bi = 0; bi < C.mobs.length; bi++) {
        const bm = C.mobs[bi];
        if (bm.hp > 0) { bm.hp -= bd; bn++; }
      }
      addDamage(bd * Math.max(1, bn));
    }

    // 玩家普攻
    C.pTimer -= dt;
    if (C.pTimer <= 0) {
      C.pTimer = st.atkInterval;
      emit('heroAttack', { idx: C.mob.idx });
      playerHit(C.mob);
      if (C.mob.hp <= 0) { killOne(C.mob); socialTimer(dt); return; }
    }

    // 怪物攻击
    C.mTimer -= dt;
    if (C.mTimer <= 0) {
      const alive = C.mobs.filter(m => m.hp > 0);
      /* 怪多时出手略频繁，但每次仍只有一只出手（避免围殴瞬秒） */
      C.mTimer = 1.5 / (1 + Math.max(0, alive.length - 1) * 0.4);
      const attacker = alive.length ? alive[rndInt(0, alive.length - 1)] : C.mob;
      emit('mobAttack', { idx: attacker ? attacker.idx : 0 });
      mobAttack(attacker);
      if (G.hp <= 0.001) { onDeath(); socialTimer(dt); return; }
    }

    // 技能
    const order = skillCastOrder();
    for (let i = 0; i < order.length; i++) {
      const k = order[i];
      if (!skillUnlocked(k)) { C.cds[k] = 0; continue; }
      C.cds[k] -= dt;
      if (C.cds[k] <= 0) {
        if (useSkill(k)) {
          C.cds[k] = skillCd(k);
          /* 群攻可能一次打死多只，逐只结算 */
          let killedAny = false;
          for (let qi = 0; qi < C.mobs.length; qi++) {
            if (C.mobs[qi].hp <= 0) { killOne(C.mobs[qi]); killedAny = true; }
          }
          if (killedAny) break;
        } else if (G.mp * st.maxMp < 12) {
          C.cds[k] = 0.6;
        } else {
          C.cds[k] = 0.4;
        }
      }
    }

    socialTimer(dt);
  }

  /* v5 群怪：击杀单只（全部死光后进入刷新等待） */
  function killOne(m) {
    if (!m || m.hp > 0) return;
    onMobKilled(m);
    if (!C.mobs.some(x => x.hp > 0)) C.dying = 0.35;
  }

  function onDeath() {
    G.stats.deaths++;
    G.hp = 0.55; G.mp = 1;
    C.mobs = []; C.mob = null; C.spawn = 2.2;
    log('气血耗尽，原地调息……', 'bad');
    emit('death', null);
  }

  let socialT = 0;
  function socialTimer(dt) {
    autoEnhanceTick(dt);
    socialT += dt;
    if (socialT >= 2) {
      socialT = 0;
      autoQuestTick();
      /* 好友各在修行：既会自己突破，也整体跟住玩家的水位 ——
         只按「+1 / 2% 每 2 秒」慢慢爬（约 36 级/小时）的话，
         挂机一天就成了「你 Lv.60、好友全停在 Lv.8」，同样是失真画面。 */
      G.friends.forEach(f => {
        const want = G.level - rndInt(2, 12);
        if (f.level < want) f.level += Math.max(1, Math.round((want - f.level) * 0.25));
        else if (f.level < D.MAX_LEVEL && Math.random() < 0.02) f.level++;
        f.level = clamp(f.level, 1, D.MAX_LEVEL);
        if (Math.random() < 0.25) f.online = Math.random() < 0.55;
      });
    }
  }

  /* ============================ 离线收益 ============================ */
  function estimateKillRate() {
    /* 用实测击杀速度（tick 里滚动 8 秒统计的那个）比理论估算准得多。
       注意要取 G.state.stats；写成 G.stats 会取到 stats 这个函数本身，
       属性永远 undefined，于是永远走估算分支 —— 以前离线收益就是这么算歪的。 */
    if (G.state && G.state.stats && G.state.stats.killRate > 0.02) return G.state.stats.killRate;
    const region = regionOf(G.region);
    const m = region.monsters[2];
    const ms = mobStats(m);
    const st = stats();
    const mit = mitigation(ms.def, m.lv);
    const dmg = st.atk * (1 - mit) * (1 + st.crit * (st.critDmg - 1));
    const ttk = Math.max(0.6, ms.maxHp / Math.max(1, dmg)) * st.atkInterval;
    const rate = 1 / (ttk + 0.7);
    return isFinite(rate) && rate > 0 ? rate : 0;
  }

  function offlineApply(seconds) {
    const cap = 12 * 3600;
    const real = Math.max(0, seconds);
    const dt = Math.min(real, cap);
    if (dt < 60) return null;
    const rate = estimateKillRate() * 0.8;
    if (!isFinite(rate) || rate <= 0) return null;
    const kills = Math.floor(dt * rate);
    if (kills <= 0) return null;
    const region = regionOf(G.region);
    const avgLv = Math.round(region.monsters.reduce((a, m) => a + m.lv, 0) / region.monsters.length);

    const bonusK = 1 + Math.min(0.6, dt / 7200);
    let exp = 0, gold = 0, stone = 0, items = [];
    const per = 400;
    const groups = Math.max(1, Math.ceil(kills / per));
    for (let g = 0; g < groups; g++) {
      const k = Math.min(per, kills - g * per);
      if (k <= 0) break;
      const mm = region.monsters[Math.min(3, g % 4)];
      const ms = mobStats(mm);
      exp += ms.exp * k;
      gold += ms.gold * k;
      stone += Math.floor(k * 0.40 * 1.6);
      if (g === 0) {
        const n = Math.min(25, Math.floor(k * 0.30));
        for (let i = 0; i < n; i++) items.push(makeItem(avgLv, false));
      }
    }
    exp = Math.floor(exp * bonusK);
    gold = Math.floor(gold * bonusK);

    G.stats.kills += kills;
    G.stats.expTotal += exp;
    G.stats.goldTotal += gold;
    G.exp += exp;
    G.res.gold += gold;
    G.res.stone += stone;
    checkLevelUp();

    let best = null;
    for (let i = 0; i < items.length; i++) {
      grantItem(items[i]);
      if (!best || items[i].quality > best.quality) best = items[i];
    }

    // 任务推进亦随之
    autoQuestTick();

    return {
      seconds: real, capped: real > cap, kills: kills, exp: exp, gold: gold,
      stone: stone, itemCount: items.length, best: best, region: region.name
    };
  }

  /* ============================ 存档 ============================ */
  /* v16：注销中标记 —— 注销后页面还会触发 beforeunload/visibilitychange 的自动保存，
     若不拦住会把刚清掉的存档又写回去（此前"注销无效"就是这个原因）。 */
  let resetting = false;
  function save() {
    if (!G || resetting) return;
    G.lastSave = Date.now();
    try {
      const data = JSON.stringify(G);
      localStorage.setItem(SAVE_KEY, data);
    } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || !st.sect) return null;
      // 兼容补全
      const def = newState(st.name, st.sect);
      for (const k in def) if (st[k] === undefined) st[k] = def[k];
      for (const k in def.settings) if (st.settings[k] === undefined) st.settings[k] = def.settings[k];
      for (const k in def.stats) if (st.stats[k] === undefined) st.stats[k] = def.stats[k];
      // 数值净化：旧版离线结算缺陷曾写入 NaN（JSON 化后为 null），须逐项纠回
      const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
      st.level = clamp(Math.round(num(st.level, def.level)), 1, D.MAX_LEVEL);
      st.exp = Math.max(0, num(st.exp, def.exp));
      st.hp = clamp(num(st.hp, 1), 0, 1);
      st.mp = clamp(num(st.mp, 1), 0, 1);
      for (const k in def.stats) st.stats[k] = Math.max(0, num(st.stats[k], def.stats[k]));
      for (const k in def.res) st.res[k] = Math.max(0, num(st.res[k], def.res[k]));
      if (!st.pot) st.pot = def.pot;
      for (const k in def.pot) st.pot[k] = Math.max(0, Math.round(num(st.pot[k], 0)));
      if (Array.isArray(st.bag)) st.bag = st.bag.filter(i => i && typeof i.uid === 'string' && num(i.ilvl, 0) > 0);
      if (!st.quests || !st.quests.side || !st.quests.side.length) st.quests = def.quests;
      if (!st.quests.daily || !st.quests.daily.items || !st.quests.daily.items.length) st.quests.daily = def.quests.daily;
      return st;
    } catch (e) { return null; }
  }
  function reset() {
    resetting = true;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  /* ============================ 对外 API ============================ */
  function createCharacter(name, sectId, gender) {
    G = newState(name, sectId, gender);
    C = newCombat();
    uidSeq = 1;
    // 初始小礼：一件凡品兵器
    const w = makeItem(1, false, { slot: 'weapon' });
    G.equipped.weapon = w;
    syncSkillUnlocks(true);
    initSocial();
    emit('region', regionOf(G.region));
    log('拜入 ' + sectOf(G.sect).name + '，仙途自此始。', 'gold');
    save();
    return G;
  }
  function attachState(st) {
    G = st;
    C = newCombat();
    uidSeq = Math.max(1, Date.now() % 100000);
    syncSkillUnlocks(true);
    initSocial();
    // 保证日常
    if (G.quests.daily.date !== dayKey()) resetDaily();
    // 装备 uid 修复
    for (const k in G.equipped) { if (G.equipped[k] && !G.equipped[k].uid) G.equipped[k].uid = 'i' + (uidSeq++); }
    emit('region', regionOf(G.region));
    return G;
  }

  const Game = {
    on, off, emit,
    fmt, fmtTime, pct, clamp, rndInt, pick,
    realmName, tierName, tierOf, expNeed, sectOf, stats, combatPower,
    regionOf, bestRegionFor, mobStats, mobBase, mitigation,
    qualityOf, itemPower, sellPrice, findItem, enhCost, enhRate, ENH_MAX,
    getQuestList, claimQuest, questLabel,
    getRank, giftFriend,
    switchRegion, toggleAuto, seekTreasure, enhance,
    makeItem, grantItem,
    tick, createCharacter, attachState, offlineApply, estimateKillRate,
    save, load, reset, dayKey,
    get state() { return G; },
    get combat() { return C; },
    get arena() { return C; },
    get hasSave() { return !!load(); }
  };

  global.Game = Game;
})(window);
