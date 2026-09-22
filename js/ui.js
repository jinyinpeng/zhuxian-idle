/* =========================================================================
 * 仙侠挂机 · 界面交互层
 * 顶栏 / 导航 / 面板（背包·技能·任务·社交）/ 弹窗 / 设置
 * ========================================================================= */
(function (global) {
  'use strict';
  const G = global.Game;
  const D = global.DATA;
  const R = global.Render;
  const FIG = global.FIGURE;

  const el = {};
  const UI = {
    sheet: '', tab: { bag: 'equip', quest: 'main', social: 'rank' },
    bagSel: null,
    questSig: '',
    sellQ: 0
  };

  const MAIN_STAT_NAME = { atk: '攻击', hp: '气血', def: '防御' };
  const NAV = [
    { id: 'home', name: '挂机', ic: 'zap' },
    { id: 'bag', name: '行囊', ic: 'package' },
    { id: 'skill', name: '技能', ic: 'sparkles' },
    { id: 'quest', name: '任务', ic: 'scroll-text' },
    { id: 'social', name: '社交', ic: 'users' }
  ];

  function esc(s) { return R.esc(s); }
  function ic(n, c) { return R.ic(n, c); }

  /* ============================ 初始化 ============================ */
  function init() {
    el.topbar = document.getElementById('topbar');
    el.nav = document.getElementById('nav');
    el.sheets = document.getElementById('sheets');
    el.mask = document.getElementById('sheet-mask');
    el.modal = document.getElementById('modal-host');

    buildNav();
    buildSheets();
    renderTop();

    el.mask.addEventListener('click', closeSheet);
    document.addEventListener('click', onDocClick);
    document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });

    /* v24：首次交互后启动背景音乐（浏览器自动播放策略要求有交互） */
    const kickMusic = () => {
      if (G.state && G.state.settings && G.state.settings.music !== false) {
        try { global.Music.start(); } catch (e) { }
      }
      global.removeEventListener('pointerdown', kickMusic);
      global.removeEventListener('touchstart', kickMusic);
    };
    global.addEventListener('pointerdown', kickMusic);
    global.addEventListener('touchstart', kickMusic);
    global.addEventListener('click', kickMusic, true);

    /* v24：已登录时每 60 秒把进度加密上传云端（零知识：密码不上传） */
    setInterval(() => {
      try {
        if (global.Account && global.Account.who() && G.state) global.Account.push(G.state).catch(() => { });
      } catch (e) { }
    }, 60000);
    global.addEventListener('pagehide', () => G.save());
    setInterval(() => { renderTop(); tickBadges(); if (UI.sheet === 'quest') refreshQuestSig(); }, 700);
    setInterval(() => { if (UI.sheet === 'bag' || UI.sheet === 'skill') softRefresh(); }, 1500);
  }

  function onDocClick(e) {
    const t = e.target;
    if (t.closest('#region-tag')) { openRegion(); return; }
    const act = t.closest('[data-act]');
    if (act) { handleAct(act.getAttribute('data-act'), act); return; }
    const nav = t.closest('.nav-btn');
    if (nav) { navTo(nav.getAttribute('data-nav')); return; }
    if (t.closest('.sheet-close')) { closeSheet(); return; }
    if (t.closest('.modal-host') && t === el.modal) closeModal();
  }

  /* ============================ 顶栏 ============================ */
  function renderTop() {
    const s = G.state;
    if (!s) return;
    const sect = G.sectOf(s.sect);
    const st = G.stats();
    el.topbar.innerHTML =
      '<div class="tb-row1">' +
        '<div class="tb-avatar" data-act="lv" role="button" aria-label="角色属性" data-lv="' + s.level + '" style="color:' + sect.color + '">' +
          FIG.hero(sect.id, (s.gender || 'male')) +
        '</div>' +
        '<div class="tb-main">' +
          '<div class="tb-name">' + esc(s.name) + '<span class="tb-guild">' + esc(s.guild) + '</span></div>' +
          '<div class="tb-realm">' + esc(G.realmName(s.level)) + ' · 战力 ' + G.fmt(st.power) + '</div>' +
        '</div>' +
        '<div class="tb-btns">' +
          '<button class="tb-btn" data-act="stats" aria-label="统计">' + ic('trending-up') + '</button>' +
          '<button class="tb-btn" data-act="settings" aria-label="设置">' + ic('settings') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="tb-res">' +
        '<span class="res gold">' + ic('coins') + G.fmt(s.res.gold) + '</span>' +
        '<span class="res yuan">' + ic('gem') + G.fmt(s.res.yuanbao) + '</span>' +
        '<span class="res stone">' + ic('sparkles') + G.fmt(s.res.stone) + '</span>' +
        '<button class="res res-btn' + (s.auto ? ' on' : '') + '" data-act="auto" aria-label="挂机开关">' + ic(s.auto ? 'pause' : 'play') + (s.auto ? '挂机中' : '已暂停') + '</button>' +
      '</div>';
  }
  function hexA(h, a) {
    h = (h || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }

  /* ============================ 导航 ============================ */
  function buildNav() {
    el.nav.innerHTML = NAV.map(n =>
      '<button class="nav-btn" data-nav="' + n.id + '">' + ic(n.ic) + '<span>' + n.name + '</span></button>'
    ).join('');
    tickBadges();
  }
  function tickBadges() {
    const s = G.state;
    if (!s) return;
    const q = G.getQuestList();
    let claimable = 0;
    if (q.main && q.main.done && !q.main.claimed) claimable++;
    q.side.forEach(x => { if (x.done && !x.claimed) claimable++; });
    q.daily.forEach(x => { if (x.done && !x.claimed) claimable++; });
    const news = s.bag.filter(i => i.isNew).length;
    el.nav.querySelectorAll('.nav-btn').forEach(b => {
      const id = b.getAttribute('data-nav');
      let badge = b.querySelector('.badge');
      let n = 0;
      if (id === 'quest') n = claimable;
      if (id === 'bag') n = news;
      if (n > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'badge'; b.appendChild(badge); }
        badge.textContent = n > 99 ? '99+' : n;
      } else if (badge) badge.remove();
      b.classList.toggle('on', (UI.sheet === '' && id === 'home') || UI.sheet === id);
    });
  }
  function navTo(id) {
    if (id === 'home') { closeSheet(); return; }
    openSheet(id);
  }

  /* ============================ 面板容器 ============================ */
  function buildSheets() {
    el.sheets.innerHTML = ['bag', 'skill', 'quest', 'social'].map(id =>
      '<section class="sheet" id="sheet-' + id + '"></section>'
    ).join('');
  }
  function openSheet(id) {
    UI.sheet = id;
    const node = document.getElementById('sheet-' + id);
    renderSheet(id);
    el.sheets.querySelectorAll('.sheet').forEach(s => s.classList.toggle('on', s.id === 'sheet-' + id));
    el.mask.classList.add('on');
    if (id === 'bag') { G.state.bag.forEach(i => i.isNew = false); tickBadges(); }
    if (id === 'quest') UI.questSig = questSig();
  }
  function closeSheet() {
    UI.sheet = '';
    el.sheets.querySelectorAll('.sheet').forEach(s => s.classList.remove('on'));
    el.mask.classList.remove('on');
    tickBadges();
  }
  /* 面板内容签名：只有真正变了才重建（否则会打断用户浏览/滚动） */
  function sheetSig(id) {
    const s = G.state;
    if (!s) return '';
    if (id === 'skill') {
      return [
        s.level,
        Object.keys(s.pot).map(k => s.pot[k]).join(','),
        D.SKILL_TEMPLATES.map(t => s.skills[t.key] || 0).join(','),
        (G.__maxSkillLv ? G.__maxSkillLv() : 1)
      ].join('|');
    }
    if (id === 'bag') {
      return [
        (s.bag || []).length,
        UI.tab.bag,
        (s.bag || []).filter(i => i.isNew).length,
        Object.keys(s.equipped || {}).map(k => (s.equipped[k] && s.equipped[k].uid) || '-').join(','),
        /* 选中项必须参与签名：否则「点选某件装备」时签名不变，
           renderSheet 会在第 199 行直接早退 —— 详情与装备/强化/出售按钮刷不出来，
           连选中高亮都不会出现。 */
        UI.bagSel || '-'
      ].join('|');
    }
    return '';
  }

  function renderSheet(id, force) {
    const node = document.getElementById('sheet-' + id);
    if (!node) return;
    UI.sig = UI.sig || {};
    if (!force) {
      const sig = sheetSig(id);
      if (sig && sig === UI.sig[id]) return;   /* 无变化 → 保持现状（滚动位置也保住） */
      if (sig) UI.sig[id] = sig;
    }
    /* 重建前记住滚动位置 */
    const oldBody = node.querySelector('.sheet-body');
    const keepTop = oldBody ? oldBody.scrollTop : 0;
    if (id === 'bag') node.innerHTML = sheetBag();
    if (id === 'skill') node.innerHTML = sheetSkill();
    if (id === 'quest') node.innerHTML = sheetQuest();
    if (id === 'social') node.innerHTML = sheetSocial();
    /* 重建后还原（下一帧再校正一次，避免布局完成后被浏览器重置） */
    if (keepTop > 0) {
      const nb = node.querySelector('.sheet-body');
      if (nb) nb.scrollTop = keepTop;
      requestAnimationFrame(() => {
        const b2 = node.querySelector('.sheet-body');
        if (b2 && Math.abs(b2.scrollTop - keepTop) > 1) b2.scrollTop = keepTop;
      });
    }
  }
  function softRefresh() {
    /* 技能/背包定时软刷新：签名未变时 renderSheet 内部会直接返回 */
    if (UI.sheet === 'skill' || UI.sheet === 'bag') renderSheet(UI.sheet);
  }
  function refreshQuestSig() {
    const sig = questSig();
    if (sig !== UI.questSig) { UI.questSig = sig; renderSheet('quest'); }
  }
  function questSig() {
    const q = G.getQuestList();
    let s = '';
    if (q.main) s += q.main.idx + ':' + q.main.cur;
    q.side.forEach(x => s += '|' + x.idx + ':' + x.cur + (x.done ? 'D' : ''));
    q.daily.forEach(x => s += '|' + x.idx + ':' + x.cur + (x.done ? 'D' : ''));
    return s;
  }

  function head(title, sub) {
    return '<div class="sheet-head">' +
      '<span class="sheet-title">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</span>' +
      '<button class="sheet-close">' + ic('x') + '</button>' +
      '</div>';
  }

  /* ============================ 行囊面板 ============================ */
  function sheetBag() {
    const s = G.state;
    const tab = UI.tab.bag;
    let body = '';

    if (tab === 'equip') {
      body += '<div class="section-title">' + ic('shield', 'ic-xs') + ' 已着装备</div>';
      body += '<div class="eq-grid">' + D.SLOTS.map(sl => {
        const it = s.equipped[sl.id];
        const q = it ? G.qualityOf(it) : null;
        const on = it && UI.bagSel === it.uid ? ' on' : '';
        return '<div class="eq-slot' + (it ? ' has' : '') + on + '" data-act="sel" data-uid="' + (it ? it.uid : '') + '" data-empty-slot="' + sl.id + '"' +
          (it ? ' style="color:' + q.color + '"' : ' style="color:#57534e"') + '>' +
          (it ? '<span class="q-mark"></span><span class="enh">+' + it.enh + '</span>' + ic(sl.icon) : '<span style="opacity:.35">' + ic(sl.icon) + '</span>') +
          '<span class="slot-lab">' + sl.name + '</span>' +
          '</div>';
      }).join('') + '</div>';
    } else {
      const bag = s.bag;
      if (!bag.length) {
        body += '<div class="empty">' + ic('package') + '行囊空空如也<br/>去挂机打怪，妖物自会掉落装备</div>';
      } else {
        body += '<div class="bag-grid">' + bag.slice().sort((a, b) => b.quality - a.quality || b.ilvl - a.ilvl).map(it => {
          const q = G.qualityOf(it);
          const sl = D.SLOTS.find(x => x.id === it.slot);
          const on = UI.bagSel === it.uid ? ' on' : '';
          return '<div class="bag-cell' + on + '" data-act="sel" data-uid="' + it.uid + '" style="color:' + q.color + '">' +
            '<span class="cg"></span>' +
            (it.isNew ? '<span class="new"></span>' : '') +
            (it.enh > 0 ? '<span class="enh">+' + it.enh + '</span>' : '') +
            ic(sl ? sl.icon : 'package') +
            '</div>';
        }).join('') + '</div>';
      }
    }

    // 详情
    const ref = UI.bagSel ? G.findItem(UI.bagSel) : null;
    if (ref) body += itemDetail(ref);

    return head('行囊', s.bag.length + '/60') +
      '<div class="sheet-tabs seg">' +
        '<button class="tab' + (tab === 'equip' ? ' on' : '') + '" data-act="bagtab" data-v="equip">' + ic('shield', 'ic-xs') + ' 装备</button>' +
        '<button class="tab' + (tab === 'bag' ? ' on' : '') + '" data-act="bagtab" data-v="bag">' + ic('package', 'ic-xs') + ' 行囊</button>' +
      '</div>' +
      '<div class="sheet-body">' + body + '</div>' +
      '<div class="sheet-foot">' +
        '<button class="btn gold sm" data-act="treasure">' + ic('gem', 'ic-xs') + ' 寻宝 60</button>' +
        '<span class="grow" style="flex:1"></span>' +
        '<button class="btn sm" data-act="sellq" data-v="0">出售凡品</button>' +
        '<button class="btn sm" data-act="sellq" data-v="1">出售≤灵品</button>' +
      '</div>';
  }

  function itemDetail(ref) {
    const it = ref.item;
    const q = G.qualityOf(it);
    const sl = D.SLOTS.find(x => x.id === it.slot);
    const cur = ref.where === 'equip' ? it : G.state.equipped[it.slot];
    const power = G.itemPower(it);
    const curPower = ref.where === 'bag' && cur ? G.itemPower(cur) : null;
    const cost = G.enhCost(it);
    const rate = G.enhRate(it);

    let html = '<div class="item-card" style="border-color:' + hexA(q.color, .4) + '">';
    html += '<div class="ic-head">' +
      '<div class="ic-icon" style="color:' + q.color + '">' + ic(sl ? sl.icon : 'package') + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="ic-name" style="color:' + q.color + '">' + esc(it.name) + (it.enh ? ' <span style="color:#facc15">+' + it.enh + '</span>' : '') + '</div>' +
        '<div class="ic-sub">' + q.name + ' · ' + (sl ? sl.name : '') + ' · 等阶 Lv.' + it.ilvl + '</div>' +
      '</div>' +
      '</div>';

    html += '<div style="margin-top:10px">';
    html += '<div class="stat-line"><span class="k">' + MAIN_STAT_NAME[it.main.key] + '</span><span class="v">+' + G.fmt(it.main.value * (1 + it.enh * 0.08)) + '</span></div>';
    it.affixes.forEach(a => {
      const def = D.AFFIXES.find(x => x.key === a.key);
      html += '<div class="affix-line"><span>' + (def ? def.name : a.key) + '</span><span class="v">+' + (a.value * (1 + it.enh * 0.04) * 100).toFixed(1) + '%</span></div>';
    });
    html += '<div class="stat-line"><span class="k">装备评分</span><span class="v">' + G.fmt(power) +
      (curPower !== null && curPower !== undefined ? ' <span class="stat-diff' + (power >= curPower ? '' : ' down') + '">（' + (power >= curPower ? '+' : '') + G.fmt(power - curPower) + '）</span>' : '') +
      '</span></div>';
    html += '</div>';

    // 强化
    html += '<div style="display:flex;gap:7px;margin-top:11px;flex-wrap:wrap">';
    if (it.enh < G.ENH_MAX) {
      html += '<button class="btn gold sm" data-act="enh" data-uid="' + it.uid + '">' + ic('arrow-up', 'ic-xs') + ' 强化 +' + (it.enh + 1) +
        ' （' + G.fmt(cost.gold) + '金/' + cost.stone + '石 · ' + Math.round(rate * 100) + '%）</button>';
    } else {
      html += '<button class="btn sm" disabled>已满强化 +' + G.ENH_MAX + '</button>';
    }
    if (ref.where === 'bag') {
      html += '<button class="btn jade sm" data-act="equip" data-uid="' + it.uid + '">' + ic('check', 'ic-xs') + ' 装备</button>';
    } else {
      html += '<button class="btn sm" data-act="unequip" data-uid="' + it.uid + '">卸下</button>';
    }
    html += '<button class="btn sm danger" data-act="sell" data-uid="' + it.uid + '">出售 ' + G.fmt(G.sellPrice(it)) + '金</button>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  /* ============================ 技能面板 ============================ */
  function sheetSkill() {
    const s = G.state;
    const sect = G.sectOf(s.sect);
    const st = G.stats();
    const usedPot = Object.keys(s.pot).reduce((a, k) => a + s.pot[k], 0);
    const totalPot = s.level - 1;
    const left = Math.max(0, totalPot - usedPot);

    let body = '<div class="section-title">' + ic('user-plus', 'ic-xs') + ' 潜能 · 剩余 ' + left + ' 点</div>';
    body += D.POTENTIAL.map(p =>
      '<div class="pot-item">' +
        '<span class="p-ic" style="color:' + p.color + '">' + ic(p.key === 'power' ? 'flame' : p.key === 'bone' ? 'shield' : p.key === 'insight' ? 'sun' : 'zap') + '</span>' +
        '<div class="p-main">' +
          '<div class="p-name">' + p.name + '<b>' + s.pot[p.key] + '</b></div>' +
          '<div class="p-desc">' + p.desc + '</div>' +
        '</div>' +
        '<div class="stepper">' +
          '<button data-act="pot" data-k="' + p.key + '" data-v="1"' + (left < 1 ? ' disabled style="opacity:.35"' : '') + '>+1</button>' +
          '<button data-act="pot" data-k="' + p.key + '" data-v="10"' + (left < 1 ? ' disabled style="opacity:.35"' : '') + '>+10</button>' +
        '</div>' +
      '</div>'
    ).join('');
    body += '<button class="btn sm" style="width:100%;margin-top:4px" data-act="potauto">自动分配剩余 ' + left + ' 点</button>';

    body += '<div class="section-title" style="margin-top:18px">' + ic('sparkles', 'ic-xs') + ' 门派功法 · ' + esc(sect.name) + '</div>';
    const maxSk = G.__maxSkillLv ? G.__maxSkillLv() : 1;
    D.SKILL_TEMPLATES.forEach((t, i) => {
      const lv = s.skills[t.key] || 0;
      const unlocked = s.level >= t.unlock;
      const nm = sect.skillNames[i];
      const cost = skillCost(lv + 1, i);
      const ratio = t.ratio * (1 + Math.max(0, lv - 1) * 0.20);
      const typeTx = { single: '单体', aoe: '多段', buff: '增益', ult: '绝技' }[t.type] || '单体';
      body += '<div class="skill-item' + (unlocked ? '' : ' locked') + '" style="color:' + sect.color + '">' +
        '<div class="sk-ic">' + ic(['sword', 'flame', 'sun', 'sparkles', 'crown'][i] || 'sparkles') + '</div>' +
        '<div class="sk-main">' +
          '<div class="sk-name" style="color:#e7e5e4">' + esc(nm[0]) + (lv ? '<span class="lv-tag">Lv.' + lv + '</span>' : '') + '</div>' +
          '<div class="sk-desc">' + esc(nm[1]) + '</div>' +
          '<div class="sk-meta">' +
            '<span>' + typeTx + '</span>' +
            (t.ratio ? '<span>倍率 ' + ratio.toFixed(1) + '×</span>' : '<span>' + (t.buff ? '攻击+' + Math.round(t.buff.atkPct * 100) + '%' : '') + '</span>') +
            (t.hits > 1 ? '<span>' + t.hits + ' 段</span>' : '') +
            '<span>冷却 ' + t.cd.toFixed(1) + 's</span>' +
            '<span>耗蓝 ' + t.mp + '</span>' +
          '</div>' +
        '</div>' +
        (unlocked
          ? '<button class="btn ' + (lv >= maxSk ? '' : 'gold') + ' sm" data-act="skup" data-k="' + t.key + '"' + (lv >= maxSk ? ' disabled' : '') + '>' +
              (lv >= maxSk ? '已满' : ic('arrow-up', 'ic-xs') + ' Lv.' + (lv + 1) + '<br/>' + G.fmt(cost.gold) + '金') + '</button>'
          : '<button class="btn sm" disabled>' + ic('lock', 'ic-xs') + ' Lv.' + t.unlock + '</button>') +
        '</div>';
    });
    return head('功法', '战力 ' + G.fmt(st.power)) +
      '<div class="sheet-body">' + body + '</div>';
  }
  function skillCost(nextLv, idx) {
    return {
      gold: Math.floor(220 * Math.pow(nextLv, 1.9) * (1 + idx * 0.55)),
      stone: Math.floor(3 + nextLv * 2.4 + idx * 2)
    };
  }
  function maxSkillLv() { return Math.min(20, 1 + Math.floor(G.state.level / 6)); }

  /* ============================ 任务面板 ============================ */
  function sheetQuest() {
    const list = G.getQuestList();
    const tab = UI.tab.quest;
    let arr = [];
    if (tab === 'main') arr = list.main ? [list.main] : [];
    if (tab === 'side') arr = list.side;
    if (tab === 'daily') arr = list.daily;

    let body = '';
    if (!arr.length) body = '<div class="empty">' + ic('scroll-text') + (tab === 'main' ? '主线已全部完成，仙途圆满' : '暂无可接任务') + '</div>';
    arr.forEach(q => body += questRow(q));

    body += '<div class="section-title" style="margin-top:16px">' + ic('info', 'ic-xs') + ' 任务说明</div>' +
      '<div style="font-size:11.5px;color:#78716c;line-height:1.75">' +
      '· 主线任务随修为推进，完成后自动接取下一环<br/>' +
      '· 支线任务达到对应等级后自动接取<br/>' +
      '· 日常任务每日 0 点刷新，可获得大量元宝与强化石</div>';

    return head('仙缘任务', claimableCount(list) + ' 个可领取') +
      '<div class="sheet-tabs seg">' +
        '<button class="tab' + (tab === 'main' ? ' on' : '') + '" data-act="qtab" data-v="main">主线</button>' +
        '<button class="tab' + (tab === 'side' ? ' on' : '') + '" data-act="qtab" data-v="side">支线</button>' +
        '<button class="tab' + (tab === 'daily' ? ' on' : '') + '" data-act="qtab" data-v="daily">日常</button>' +
      '</div>' +
      '<div class="sheet-body">' + body + '</div>';
  }
  function claimableCount(list) {
    let n = 0;
    if (list.main && list.main.done && !list.main.claimed) n++;
    list.side.forEach(q => { if (q.done && !q.claimed) n++; });
    list.daily.forEach(q => { if (q.done && !q.claimed) n++; });
    return n;
  }
  function questRow(q) {
    const r = Math.min(1, q.cur / q.need);
    const rw = q.def.rw;
    const need = G.expNeed(G.state.level);
    const exp = isFinite(need) ? Math.floor(need * rw.expMul) : 0;   // 满级奖励预览不再溢出
    const gold = Math.floor((60 + G.state.level * 26) * rw.goldMul);
    const kindIc = { main: 'star', side: 'flower', daily: 'clock' }[q.kind] || 'scroll-text';
    const color = { main: '#facc15', side: '#5eead4', daily: '#60a5fa' }[q.kind] || '#a8a29e';
    return '<div class="quest-item' + (q.done && !q.claimed ? ' done' : '') + (q.claimed ? ' claimed' : '') + '">' +
      '<div class="q-ic" style="color:' + color + '">' + ic(kindIc) + '</div>' +
      '<div class="q-main">' +
        '<div class="q-title">' + esc(q.def.t) +
          (q.kind === 'main' ? '<span class="tag-mini">主线 ' + (q.idx + 1) + '/' + D.MAIN_QUESTS.length + '</span>' : '') +
          (q.claimed ? '<span class="tag-mini" style="background:rgba(120,113,108,.2);color:#78716c">已领</span>' : '') +
        '</div>' +
        '<div class="q-desc">' + esc(q.def.d) + '</div>' +
        '<div class="q-bar"><i style="width:' + (r * 100).toFixed(1) + '%"></i></div>' +
        '<div class="q-foot">' +
          '<span class="q-rw">' +
            '<span>' + ic('target', 'ic-xs') + q.label + ' ' + G.fmt(Math.min(q.cur, q.need)) + '/' + G.fmt(q.need) + '</span>' +
            '<span style="color:#facc15">' + ic('zap', 'ic-xs') + G.fmt(exp) + '</span>' +
            '<span style="color:#fde68a">' + ic('coins', 'ic-xs') + G.fmt(gold) + '</span>' +
            (rw.yuanbao ? '<span style="color:#c084fc">' + ic('gem', 'ic-xs') + rw.yuanbao + '</span>' : '') +
            (rw.stone ? '<span style="color:#60a5fa">' + ic('sparkles', 'ic-xs') + rw.stone + '</span>' : '') +
          '</span>' +
          '<button class="btn ' + (q.done && !q.claimed ? 'gold' : '') + ' sm" data-act="qclaim" data-kind="' + q.kind + '" data-idx="' + q.idx + '"' +
            (q.done && !q.claimed ? '' : ' disabled') + '>' + (q.claimed ? '已领取' : q.done ? '领取' : '进行中') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ============================ 社交面板 ============================ */
  function sheetSocial() {
    const s = G.state;
    const tab = UI.tab.social;
    let body = '';
    if (tab === 'rank') {
      const list = G.getRank();
      const myIdx = list.findIndex(x => x.me);
      body += '<div class="section-title">' + ic('trophy', 'ic-xs') + ' 修为榜 · 你的排名 ' + (myIdx + 1) + '</div>';
      body += list.slice(0, 30).map((r, i) => {
        const sect = G.sectOf(r.sect);
        return '<div class="rank-row' + (r.me ? ' me' : '') + '">' +
          '<span class="rank-no' + (i < 3 ? ' n' + (i + 1) : '') + '">' + (i + 1) + '</span>' +
          '<div class="rank-main">' +
            '<div class="rank-name" style="color:' + (r.me ? '#facc15' : '#e7e5e4') + '">' + esc(r.name) + (r.me ? ' （你）' : '') + '</div>' +
            '<div class="rank-sub">' + esc(sect.name) + ' · ' + esc(r.guild) + ' · ' + G.realmName(r.level) + '</div>' +
          '</div>' +
          '<span class="rank-val">Lv.' + r.level + '</span>' +
        '</div>';
      }).join('');
    } else if (tab === 'friend') {
      body += '<div class="section-title">' + ic('users', 'ic-xs') + ' 好友 · ' + s.friends.length + ' 人</div>';
      body += s.friends.map(f =>
        '<div class="friend-row">' +
          '<div class="f-avatar">' + ic('user-plus') + '</div>' +
          '<div class="rank-main">' +
            '<div class="rank-name">' + esc(f.name) + '</div>' +
            '<div class="rank-sub">' + esc(f.guild) + ' · Lv.' + f.level + ' · <span class="' + (f.online ? 'on-line' : 'off-line') + ' f-st">' + (f.online ? '在线' : '离线') + '</span></div>' +
          '</div>' +
          '<button class="btn sm ' + (Date.now() - f.giftAt < 3600000 ? '' : 'jade') + '" data-act="gift" data-n="' + esc(f.name) + '"' +
            (Date.now() - f.giftAt < 3600000 ? ' disabled' : '') + '>' + (Date.now() - f.giftAt < 3600000 ? '已赠' : '赠礼') + '</button>' +
        '</div>'
      ).join('');
      body += '<div class="section-title" style="margin-top:16px">' + ic('gift', 'ic-xs') + ' 说明</div>' +
        '<div style="font-size:11.5px;color:#78716c;line-height:1.75">每位好友每日可赠礼一次，赠礼可获得元宝与金币回馈。好友等级会随修行自行提升。</div>';
    } else {
      /* 修行统计取的是累计计数，来自存档 st.stats；
         此前误写成 G.stats()（战斗属性），导致时长/击杀等全渲染成 NaN 与 0 */
      const st = s.stats;
      body += '<div class="section-title">' + ic('trending-up', 'ic-xs') + ' 修行统计</div>';
      const rows = [
        ['修行时长', G.fmtTime(st.playTime)],
        ['斩杀妖物', G.fmt(st.kills) + ' 只'],
        ['斩杀妖将', G.fmt(st.bossKills) + ' 只'],
        ['击杀速度', (st.killRate * 60).toFixed(1) + ' 只/分'],
        ['修为所得', G.fmt(st.expTotal)],
        ['金币所得', G.fmt(st.goldTotal)],
        ['装备所得', G.fmt(st.itemTotal) + ' 件'],
        ['强化次数', G.fmt(st.enhanceTotal) + ' 次（最高 +' + st.bestEnhance + '）'],
        ['寻宝次数', G.fmt(st.treasure) + ' 次'],
        ['力竭倒地', G.fmt(st.deaths) + ' 次'],
        ['等级提升', G.fmt(st.levelUps) + ' 次'],
        ['突破次数', G.fmt(Math.floor((G.state.level - 1) / D.TIER_SIZE)) + ' 次']
      ];
      body += rows.map(r => '<div class="stat-line"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>').join('');
      body += '<div class="section-title" style="margin-top:16px">' + ic('target', 'ic-xs') + ' 当前属性</div>';
      const stt = G.stats();
      const props = [
        ['攻击', G.fmt(stt.atk)], ['气血', G.fmt(stt.hp)], ['防御', G.fmt(stt.def)],
        ['暴击率', (stt.crit * 100).toFixed(1) + '%'], ['暴击伤害', (stt.critDmg * 100).toFixed(0) + '%'],
        ['闪避率', (stt.dodge * 100).toFixed(1) + '%'], ['攻击速度', (stt.spd * 100).toFixed(0) + '%'],
        ['吸血', (stt.lifesteal * 100).toFixed(1) + '%'], ['气血回复', (stt.hpRegen * 100).toFixed(1) + '%/秒'],
        ['减伤', (stt.damageCut * 100).toFixed(0) + '%'], ['技能增伤', (stt.skillDmg * 100 - 100).toFixed(0) + '%'],
        ['攻速间隔', stt.atkInterval.toFixed(2) + ' 秒']
      ];
      body += props.map(r => '<div class="stat-line"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>').join('');
      body += '<div class="section-title" style="margin-top:16px">' + ic('award', 'ic-xs') + ' 门派</div>';
      const sect = G.sectOf(G.state.sect);
      body += '<div class="si-passive">【' + sect.passive.name + '】' + sect.passive.desc + '</div>';
    }
    return head('江湖', tab === 'stat' ? '修行统计' : tab === 'rank' ? '修为排行榜' : '好友') +
      '<div class="sheet-tabs seg">' +
        '<button class="tab' + (tab === 'rank' ? ' on' : '') + '" data-act="stab" data-v="rank">排行榜</button>' +
        '<button class="tab' + (tab === 'friend' ? ' on' : '') + '" data-act="stab" data-v="friend">好友</button>' +
        '<button class="tab' + (tab === 'stat' ? ' on' : '') + '" data-act="stab" data-v="stat">统计</button>' +
      '</div>' +
      '<div class="sheet-body">' + body + '</div>';
  }

  /* ============================ 动作分发 ============================ */
  function handleAct(act, node) {
    const s = G.state;
    switch (act) {
      case 'bagtab': UI.tab.bag = node.getAttribute('data-v'); renderSheet('bag'); break;
      case 'qtab': UI.tab.quest = node.getAttribute('data-v'); renderSheet('quest'); UI.questSig = questSig(); break;
      case 'stab': UI.tab.social = node.getAttribute('data-v'); renderSheet('social'); break;
      case 'sel': {
        const uid = node.getAttribute('data-uid');
        if (uid) { UI.bagSel = (UI.bagSel === uid ? null : uid); renderSheet('bag'); }
        else {
          UI.tab.bag = 'bag';
          R.toast('该部位尚未装备，穿戴一件试试');
          renderSheet('bag');
        }
        break;
      }
      case 'equip': {
        const ref = G.findItem(node.getAttribute('data-uid'));
        if (ref && ref.where === 'bag') {
          const it = ref.item;
          const cur = s.equipped[it.slot];
          s.bag.splice(ref.index, 1);
          let folded = 0;          /* 行囊没空位时，换下的旧装备折算金币 */
          if (cur) {
            if (s.bag.length < 60) s.bag.push(cur);
            else {
              folded = G.sellPrice(cur);
              s.res.gold += folded; s.stats.goldTotal += folded;
            }
          }
          it.isNew = false;
          s.equipped[it.slot] = it;
          /* 只弹一条：把「折算金币」并进装备提示，不再单独喊「行囊已满」 */
          R.toast('已装备 ' + it.name + (folded ? '（旧装备折算 ' + G.fmt(folded) + ' 金币）' : ''), 'jade');
          UI.bagSel = it.uid;
          R.refreshHeroBase();
          renderSheet('bag'); renderTop();
        }
        break;
      }
      case 'unequip': {
        const ref = G.findItem(node.getAttribute('data-uid'));
        if (ref && ref.where === 'equip') {
          if (s.bag.length >= 60) { R.toast('请先出售或整理行囊，腾出空位', 'bad'); break; }
          const it = ref.item;
          delete s.equipped[ref.slot];
          s.bag.push(it);
          UI.bagSel = null;
          R.toast('已卸下 ' + it.name);
          R.refreshHeroBase();
          renderSheet('bag'); renderTop();
        }
        break;
      }
      case 'sell': {
        const ref = G.findItem(node.getAttribute('data-uid'));
        if (!ref) break;
        if (ref.where === 'equip') { R.toast('已装备的物品需先卸下', 'bad'); break; }
        const it = ref.item;
        const g = G.sellPrice(it);
        s.bag.splice(ref.index, 1);
        s.res.gold += g;
        s.stats.goldTotal += g;
        UI.bagSel = null;
        R.toast('出售 ' + it.name + '，获得 ' + G.fmt(g) + ' 金币', 'gold');
        renderSheet('bag'); renderTop();
        break;
      }
      case 'sellq': {
        const q = parseInt(node.getAttribute('data-v'), 10);
        let gold = 0, n = 0;
        for (let i = s.bag.length - 1; i >= 0; i--) {
          if (s.bag[i].quality <= q) {
            gold += G.sellPrice(s.bag[i]);
            s.bag.splice(i, 1); n++;
          }
        }
        s.res.gold += gold; s.stats.goldTotal += gold;
        UI.bagSel = null;
        R.toast(n ? ('出售 ' + n + ' 件，获得 ' + G.fmt(gold) + ' 金币') : '没有符合条件的装备', n ? 'gold' : '');
        renderSheet('bag'); renderTop();
        break;
      }
      case 'enh': {
        const r = G.enhance(node.getAttribute('data-uid'));
        if (!r.ok) R.toast(r.msg, 'bad');
        else {
          const it = r.item;
          if (r.success) R.toast('强化成功！【' + it.name + '】+ ' + it.enh, 'gold');
          else R.toast('强化失败，材料已消耗', 'bad');
        }
        renderSheet('bag'); renderTop();
        break;
      }
      case 'treasure': {
        const r = G.seekTreasure();
        if (!r.ok) R.toast(r.msg, 'bad');
        else {
          const q = G.qualityOf(r.item);
          R.toast('寻得 ' + q.name + '【' + r.item.name + '】', 'gold');
          UI.bagSel = r.item.uid;
          openModal({
            title: '寻宝所得', sub: q.name,
            body: '<div class="drop-card" style="color:' + q.color + '">' +
              '<div class="dc-ic">' + ic(slotIcon(r.item.slot)) + '</div>' +
              '<div class="dc-main"><div class="dc-name" style="color:' + q.color + '">' + esc(r.item.name) + '</div>' +
              '<div class="dc-sub">等阶 Lv.' + r.item.ilvl + ' · ' + statSummary(r.item) + '</div></div></div>',
            buttons: [{ label: '收下', cls: 'gold' }]
          });
        }
        renderSheet('bag'); renderTop();
        break;
      }
      case 'skup': {
        const k = node.getAttribute('data-k');
        const t = D.SKILL_TEMPLATES.find(x => x.key === k);
        const lv = s.skills[k] || 1;
        const max = maxSkillLv();
        if (lv >= max) { R.toast('已达当前境界上限 Lv.' + max, 'bad'); break; }
        const cost = skillCost(lv + 1, D.SKILL_TEMPLATES.indexOf(t));
        if (s.res.gold < cost.gold) { R.toast('金币不足，需 ' + G.fmt(cost.gold), 'bad'); break; }
        if (s.res.stone < cost.stone) { R.toast('强化石不足，需 ' + cost.stone, 'bad'); break; }
        s.res.gold -= cost.gold; s.res.stone -= cost.stone;
        s.skills[k] = lv + 1;
        R.toast('功法精进 Lv.' + s.skills[k], 'gold');
        renderSheet('skill'); renderTop();
        break;
      }
      case 'pot': {
        const k = node.getAttribute('data-k');
        const v = parseInt(node.getAttribute('data-v'), 10);
        const used = Object.keys(s.pot).reduce((a, kk) => a + s.pot[kk], 0);
        const left = Math.max(0, s.level - 1 - used);
        if (left <= 0) { R.toast('暂无潜能点，提升修为可获得', 'bad'); break; }
        const add = Math.min(v, left);
        s.pot[k] += add;
        R.toast(D.POTENTIAL.find(p => p.key === k).name + ' +' + add, 'gold');
        renderSheet('skill');
        break;
      }
      case 'potauto': {
        const used = Object.keys(s.pot).reduce((a, kk) => a + s.pot[kk], 0);
        let left = Math.max(0, s.level - 1 - used);
        if (left <= 0) { R.toast('暂无潜能点', 'bad'); break; }
        const order = ['power', 'bone', 'insight', 'agility'];
        let i = 0;
        while (left > 0) { s.pot[order[i % order.length]]++; left--; i++; }
        R.toast('已自动分配潜能点', 'gold');
        renderSheet('skill');
        break;
      }
      case 'qclaim': {
        const r = G.claimQuest(node.getAttribute('data-kind'), parseInt(node.getAttribute('data-idx'), 10));
        if (!r.ok) R.toast(r.msg, 'bad');
        renderSheet('quest'); renderTop();
        UI.questSig = questSig();
        break;
      }
      case 'gift': {
        const r = G.giftFriend(node.getAttribute('data-n'));
        if (!r.ok) R.toast(r.msg, 'bad');
        else R.toast('赠礼成功，回赠 ' + r.yuanbao + ' 元宝', 'gold');
        renderSheet('social'); renderTop();
        break;
      }
      case 'stats': openStats(); break;
      case 'settings': openSettings(); break;
      case 'auto': {
        const on = G.toggleAuto();
        R.toast(on ? '继续挂机' : '已暂停挂机', on ? 'jade' : 'bad');
        renderTop();
        if (modalKind === 'char') openCharPanel(charTab);   /* 在角色面板里切换 → 同步刷新 */
        break;
      }
      /* 点击头像：面板已开则收起，否则展开 —— 一触即显示 / 隐藏 */
      case 'lv': {
        if (el.modal.classList.contains('on') && modalKind === 'char') closeModal();
        else openCharPanel(charTab);
        break;
      }
    }
  }

  function slotIcon(slotId) {
    const sl = D.SLOTS.find(x => x.id === slotId);
    return sl ? sl.icon : 'package';
  }
  function statSummary(it) {
    const n = MAIN_STAT_NAME[it.main.key];
    return n + ' +' + G.fmt(it.main.value) + (it.affixes.length ? ' · ' + it.affixes.length + ' 条词条' : '');
  }

  /* ============================ 弹窗 ============================ */
  let modalButtons = [];
  let modalKind = '';        /* 当前弹窗类型：供「再点一次头像即收起」这类切换逻辑判断 */
  function openModal(opt) {
    modalButtons = opt.buttons || [{ label: '知道了', cls: 'gold' }];
    modalKind = opt.kind || '';
    el.modal.innerHTML = '<div class="modal">' +
      '<div class="modal-head">' +
        '<div class="modal-title">' + (opt.title || '') + '</div>' +
        (opt.sub ? '<div class="modal-sub">' + opt.sub + '</div>' : '') +
      '</div>' +
      '<div class="modal-body">' + (opt.body || '') + '</div>' +
      '<div class="modal-foot">' + modalButtons.map((b, i) =>
        '<button class="btn ' + (b.cls || '') + '" data-mbtn="' + i + '">' + b.label + '</button>').join('') + '</div>' +
      '</div>';
    el.modal.querySelectorAll('[data-mbtn]').forEach(b => {
      b.addEventListener('click', () => {
        const i = parseInt(b.getAttribute('data-mbtn'), 10);
        const cfg = modalButtons[i];
        if (cfg && cfg.keep !== true) closeModal();
        if (cfg && cfg.onClick) cfg.onClick();
      });
    });
    el.modal.classList.add('on');
  }
  function closeModal() { el.modal.classList.remove('on'); modalKind = ''; }

  function openStats() {
    UI.tab.social = 'stat';
    openSheet('social');
  }

  function openRegion() {
    const cur = G.state.region;
    const body = D.REGIONS.map(r => {
      const on = r.id === cur;
      const lock = G.state.level < r.range[0] - 6;
      return '<div class="drop-card' + (on ? ' done' : '') + '" style="' + (on ? 'border-color:rgba(250,204,21,.5);background:rgba(250,204,21,.07)' : '') + ';color:' + r.accent + '" data-act="region" data-v="' + r.id + '">' +
        '<div class="dc-ic">' + ic(on ? 'target' : 'map-pin') + '</div>' +
        '<div class="dc-main">' +
          '<div class="dc-name" style="color:' + (on ? '#facc15' : '#e7e5e4') + '">' + r.name + (on ? ' · 所在' : '') + '</div>' +
          '<div class="dc-sub">Lv.' + r.range[0] + ' - ' + r.range[1] + ' · ' + r.monsters.length + ' 种妖物' + (lock ? ' · 危险' : '') + '</div>' +
        '</div>' +
        (on ? ic('check') : ic('chevron-right')) +
      '</div>';
    }).join('');
    openModal({
      title: '择地历练',
      sub: '当前：' + G.regionOf(cur).name,
      body: '<div style="margin-bottom:8px;font-size:11.5px;color:#78716c">切换地图将立即重新寻找妖物；开启「自动择地」时会随修为自动前往更深处。</div>' + body,
      buttons: [
        { label: '自动择地：' + (G.state.settings.autoRegion ? '开' : '关'), cls: G.state.settings.autoRegion ? 'jade' : '', keep: true, onClick: () => { G.state.settings.autoRegion = !G.state.settings.autoRegion; openRegion(); } },
        { label: '关闭', cls: 'gold' }
      ]
    });
    // 绑定 region 按钮
    el.modal.querySelectorAll('[data-act="region"]').forEach(n => {
      n.addEventListener('click', () => {
        const id = n.getAttribute('data-v');
        G.switchRegion(id, true);
        R.toast('前往 ' + G.regionOf(id).name);
        closeModal();
      });
    });
  }

  function openSettings() {
    const st = G.state.settings;
    const row = (key, name, desc) =>
      '<div class="set-row">' +
        '<div class="s-main"><div class="s-name">' + name + '</div><div class="s-desc">' + desc + '</div></div>' +
        '<div class="switch' + (st[key] ? ' on' : '') + '" data-set="' + key + '"></div>' +
      '</div>';
    const body =
      row('autoRegion', '自动择地', '修为提升后自动前往更深地图') +
      row('autoEquip', '自动装备', '获得更高评分装备时自动穿戴') +
      row('autoQuest', '自动交任务', '任务完成后自动领取奖励并接取后续') +
      row('autoEnhance', '自动强化', '资源充足时自动强化身上装备') +
      row('logOn', '战斗日志', '战斗中显示滚动日志') +
      '<div class="set-row">' +
        '<div class="s-main"><div class="s-name">自动出售</div><div class="s-desc">低于所选品质的掉落直接换成金币</div></div>' +
        '<div class="seg" style="flex:none">' +
          ['关', '凡品', '≤灵品', '≤玄品'].map((t, i) => {
            const v = i - 1;
            return '<button class="tab' + (st.autoSellQuality === v ? ' on' : '') + '" data-sell="' + v + '">' + t + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="section-title" style="margin-top:16px">' + ic('info', 'ic-xs') + ' 关于</div>' +
      '<div style="font-size:11.5px;color:#78716c;line-height:1.8">' +
        '· 游戏进度自动保存在本机浏览器中<br/>' +
        '· 离线最多累计 12 小时收益，重新进入时结算<br/>' +
        '· 挂机、战斗、掉落均为全自动，无需值守</div>' +
        '<div class="section-title" style="margin-top:16px">更新</div>' +
        '<div class="set-account" style="background:rgba(94,234,212,.06);border-color:rgba(94,234,212,.22)">' +
          '<div class="sa-main">' +
            '<div class="sa-name">当前版本</div>' +
            '<div class="sa-sub mono" id="ver-line">检查中…</div>' +
          '</div>' +
          '<button class="upd-btn" data-act="refresh">刷新到最新版</button>' +
        '</div>' +
        '<div style="font-size:11px;color:#78716c;line-height:1.7;margin-top:6px">' +
          '拉到最新版后，挂机进度、装备与行囊都会保留；也可在任意页面<b>从屏幕顶部下拉</b>刷新。' +
        '</div>' +
        '<div class="section-title" style="margin-top:16px">画面</div>' +
        '<div class="set-row">' +
          '<div class="s-main"><div class="s-name">游戏音乐</div><div class="s-desc">仙侠背景音乐 · 可一键开关</div></div>' +
          '<div class="switch' + (G.state.settings.music !== false ? ' on' : '') + '" data-music="1"></div>' +
        '</div>' +
        '<div class="set-row">' +
          '<div class="s-main"><div class="s-name">日间模式</div><div class="s-desc">关闭后切换为夜间山景（月光、星空）</div></div>' +
          '<div class="switch' + (G.state.settings.dayMode !== false ? ' on' : '') + '" data-daymode="1"></div>' +
        '</div>' +
        '<div class="section-title" style="margin-top:16px">账号 · 手机号</div>' +
        '<div class="ac-box">' +
          '<input id="ac-phone" class="ac-in" type="tel" inputmode="numeric" maxlength="11" placeholder="手机号" />' +
          '<input id="ac-pwd" class="ac-in" type="password" placeholder="密码（至少 6 位）" />' +
          '<div style="display:flex;gap:8px">' +
            '<button class="btn gold sm" style="flex:1" data-ac="register">注册并上传</button>' +
            '<button class="btn sm" style="flex:1" data-ac="login">登录并恢复</button>' +
          '</div>' +
          '<div class="ac-tip" id="ac-state">未登录 · 进度只存在本机</div>' +
        '</div>' +
        '<div class="section-title" style="margin-top:16px">角色</div>' +
        '<div class="set-account">' +
          '<div class="sa-main">' +
            '<div class="sa-name">当前角色：' + esc(G.state.name) + '</div>' +
            '<div class="sa-sub">' + esc(G.sectOf(G.state.sect).name) + ' · Lv.' + G.state.level +
              ' · ' + esc(G.state.gender === 'female' ? '女' : '男') + '</div>' +
          '</div>' +
          '<div class="sex-switch">' +
            '<button class="sex-btn' + ((G.state.gender === 'female') ? '' : ' on') + '" data-sex="male">男</button>' +
            '<button class="sex-btn' + ((G.state.gender === 'female') ? ' on' : '') + '" data-sex="female">女</button>' +
          '</div>' +
          '<div class="sex-switch" style="margin-top:6px">' +
            '<button class="sex-btn" data-rename="1">改名字</button>' +
            '<button class="sex-btn" data-changesect="1">换门派</button>' +
          '</div>' +
        '</div>';

    openModal({
      title: '设置', sub: '诛仙问道 · 挂机修仙',
      body: body,
      buttons: [{ label: '关闭', cls: 'gold' }]
    });

    /* v19：游戏中直接切换性别（即时换立绘 + 顶栏头像 + 存档） */
    el.modal.querySelectorAll('[data-sex]').forEach(n => {
      n.addEventListener('click', () => {
        const sex = n.getAttribute('data-sex');
        if (G.state.gender === sex) return;
        G.state.gender = sex;
        el.modal.querySelectorAll('[data-sex]').forEach(b => {
          b.classList.toggle('on', b.getAttribute('data-sex') === sex);
        });
        const sub = el.modal.querySelector('.sa-sub');
        if (sub) {
          sub.textContent = G.sectOf(G.state.sect).name + ' · Lv.' + G.state.level +
            ' · ' + (sex === 'female' ? '女' : '男');
        }
        R.rebuildHero();
        renderTop();
        try { G.save(); } catch (e) {}
        R.toast(sex === 'female' ? '已切换为女性形象' : '已切换为男性形象', 'jade');
      });
    });

    /* v18：填入实际构建号，方便确认是否已是最新 */
    (function fillVer() {
      var line = el.modal.querySelector('#ver-line');
      if (!line) return;
      if (typeof fetch !== 'function') { line.textContent = '点右侧按钮检查更新'; return; }
      fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { line.textContent = (j && j.v) ? ('构建 ' + j.v) : '已是最新'; })
        .catch(function () { line.textContent = '点右侧按钮检查更新'; });
    })();

    /* v18：显式刷新按钮 —— 微信内置浏览器会吞下拉手势，这个按钮一定可用 */
    el.modal.querySelectorAll('[data-act="refresh"]').forEach(n => {
      n.addEventListener('click', () => {
        n.disabled = true;
        n.textContent = '正在刷新…';
        try { if (G.state) G.save(); } catch (e) {}
        setTimeout(() => {
          /* 带上时间戳，强制绕过 HTML 缓存拿到最新版 */
          location.replace(location.pathname + '?u=' + Date.now());
        }, 240);
      });
    });

    /* v17：日间模式开关 */
    /* v24：音乐一键开关 */
    el.modal.querySelectorAll('[data-music]').forEach(n => {
      n.addEventListener('click', () => {
        const nowOn = !(G.state.settings.music !== false);
        G.state.settings.music = nowOn;
        if (nowOn) global.Music.start(); else global.Music.stop();
        n.classList.toggle('on', nowOn);
        R.toast(nowOn ? '音乐已开启' : '音乐已关闭');
        G.save();
      });
    });

    /* v24：账号（手机号 + 密码 · 零知识加密云存档） */
    el.modal.querySelectorAll('[data-ac]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tip = el.modal.querySelector('#ac-state');
        const say = t => { if (tip) tip.textContent = t; };
        const phone = (el.modal.querySelector('#ac-phone').value || '').trim();
        const pwd = el.modal.querySelector('#ac-pwd').value || '';
        if (!global.Account) { say('账号模块未加载，请刷新页面'); return; }
        say('连接云端…');
        const okCloud = await global.Account.ready();
        if (!okCloud) { say('云端未就绪：请确认已开启「匿名登录」并创建集合 player_saves'); return; }
        try {
          say('处理中…');
          if (btn.getAttribute('data-ac') === 'register') {
            await global.Account.register(phone, pwd, G.state);
            say('已绑定：' + phone + ' · 进度已上传');
            R.toast('账号已绑定，进度已上传云端');
          } else {
            const r = await global.Account.login(phone, pwd);
            if (r && r.snapshot) {
              Object.assign(G.state, r.snapshot);
              G.save();
              say('已恢复云端进度，正在重载…');
              R.toast('已恢复云端进度');
              setTimeout(() => global.location.reload(), 800);
              return;
            }
            say('已登录：' + phone + '（云端还没有存档，下次自动上传）');
            R.toast('已登录');
            G.save();
          }
          try { global.localStorage.setItem('lx_acct_phone', phone); } catch (e) { }
        } catch (e) { say('失败：' + (e && e.message ? e.message : e)); }
      });
    });

    /* v24：改道号 */
    el.modal.querySelectorAll('[data-rename]').forEach(n => {
      n.addEventListener('click', () => {
        const v = (global.prompt('输入新的道号（2~6 字）', G.state.name) || '').trim();
        if (!v) return;
        if (v.length < 2 || v.length > 6) { R.toast('道号需 2~6 个字'); return; }
        G.state.name = v;
        try { G.save(); } catch (e) { }
        /* 这里必须调本文件内的 renderTop()；写成 UI.renderTop() 会取到上面的
           局部状态对象 UI（只有 tab/bagSel/questSig/sellQ），点一次就抛异常，
           导致改名后顶栏不刷新、提示也不弹。 */
        renderTop();
        const nm = el.modal.querySelector('.sa-name');
        if (nm) nm.textContent = '当前角色：' + v;
        R.toast('道号已改为「' + v + '」');
        closeModal();
      });
    });

    /* v25：换门派（此前只有按钮没有处理器，点了毫无反应） */
    el.modal.querySelectorAll('[data-changesect]').forEach(n => {
      n.addEventListener('click', () => openSectSwitch());
    });

    el.modal.querySelectorAll('[data-daymode]').forEach(n => {
      n.addEventListener('click', () => {
        const on = G.state.settings.dayMode === false;   /* 当前是夜间 → 点后为日间 */
        R.setDayMode(on);
        n.classList.toggle('on', on);
        R.toast(on ? '已切换为日间' : '已切换为夜间', on ? 'gold' : 'jade');
      });
    });

    el.modal.querySelectorAll('[data-set]').forEach(n => {
      n.addEventListener('click', () => {
        const k = n.getAttribute('data-set');
        st[k] = !st[k];
        n.classList.toggle('on', st[k]);
        if (k === 'autoRegion' && st[k]) {
          const r = G.bestRegionFor(G.state.level);
          if (r.id !== G.state.region) G.switchRegion(r.id, false);
        }
      });
    });
    el.modal.querySelectorAll('[data-sell]').forEach(n => {
      n.addEventListener('click', () => {
        st.autoSellQuality = parseInt(n.getAttribute('data-sell'), 10);
        el.modal.querySelectorAll('[data-sell]').forEach(x => x.classList.toggle('on', x === n));
      });
    });
  }

  /* ============================ 换门派 ============================ */
  /* 换门派只改「门派」，不动修为等级 / 装备 / 行囊 / 任务：
     门派属性加成与被动心法立即生效，功法名随门派变化。 */
  function openSectSwitch() {
    const cur = G.state.sect;
    const rows = D.SECTS.map(s => {
      const on = s.id === cur;
      return '<div class="drop-card' + (on ? ' done' : '') + '" data-pick="' + s.id + '" style="' +
        (on ? 'border-color:rgba(250,204,21,.5);background:rgba(250,204,21,.07)' : '') +
        ';color:' + s.color + '">' +
        '<div class="dc-ic">' + ic('swords') + '</div>' +
        '<div class="dc-main">' +
          '<div class="dc-name" style="color:' + (on ? '#facc15' : '#e7e5e4') + '">' + esc(s.name) + (on ? ' · 当前' : '') + '</div>' +
          '<div class="dc-sub">' + esc(s.tag) + ' · 【' + esc(s.passive.name) + '】' + esc(s.passive.desc) + '</div>' +
        '</div>' +
        (on ? ic('check') : ic('chevron-right')) +
      '</div>';
    }).join('');

    openModal({
      title: '换门派',
      sub: '当前：' + esc(G.sectOf(cur).name),
      body: '<div style="margin-bottom:8px;font-size:11.5px;color:#78716c;line-height:1.7">' +
        '换门派后：门派属性加成与被动心法立即生效，功法名随门派变化；' +
        '修为等级、装备、行囊与任务进度全部保留。</div>' + rows,
      buttons: [{ label: '关闭', cls: 'gold' }]
    });

    el.modal.querySelectorAll('[data-pick]').forEach(n => {
      n.addEventListener('click', () => {
        const id = n.getAttribute('data-pick');
        if (id === G.state.sect) { R.toast('已在本门，无需更换'); return; }
        const before = G.sectOf(G.state.sect).name;
        G.state.sect = id;
        try { G.save(); } catch (e) { }
        R.rebuildHero();
        R.refreshHeroBase();
        renderTop();
        closeModal();
        R.toast(before + ' → ' + G.sectOf(id).name + '，已改换门庭', 'gold');
      });
    });
  }

  function openOffline(report) {
    if (!report) return;
    const b = report.best;
    const q = b ? G.qualityOf(b) : null;
    const body =
      '<div style="text-align:center;margin-bottom:10px">闭关修炼 <b style="color:#facc15">' + G.fmtTime(report.seconds) + '</b>' +
      (report.capped ? '<span style="color:#f87171">（已达 12 小时上限）</span>' : '') + '</div>' +
      '<div class="offline-grid">' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(report.kills) + '</div><div class="oc-lab">斩杀妖物</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(report.exp) + '</div><div class="oc-lab">修为</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(report.gold) + '</div><div class="oc-lab">金币</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(report.stone) + '</div><div class="oc-lab">强化石</div></div>' +
      '</div>' +
      (report.itemCount ? '<div style="font-size:12px;color:#a8a29e;margin-bottom:6px">拾取装备 ' + report.itemCount + ' 件：</div>' : '') +
      (b ? '<div class="drop-card" style="color:' + q.color + '">' +
        '<div class="dc-ic">' + ic(slotIcon(b.slot)) + '</div>' +
        '<div class="dc-main"><div class="dc-name" style="color:' + q.color + '">' + esc(b.name) + '</div>' +
        '<div class="dc-sub">' + q.name + ' · Lv.' + b.ilvl + ' · 最佳收获</div></div></div>' : '') +
      (report.itemCount > 1 ? '<div style="font-size:11px;color:#78716c;margin-top:6px">其余装备已放入行囊（部分低品质已自动折算为金币）</div>' : '');

    openModal({
      title: '离线收益',
      sub: report.region + ' · 自动挂机结算',
      body: body,
      buttons: [{ label: '收入囊中', cls: 'gold' }]
    });
  }

  /* ============================ 角色属性面板 ============================
     入口：点击顶栏头像（.tb-avatar[data-act="lv"]）。
     点一次展开、再点一次收起；面板内四个页签切换不关闭弹窗。 */
  let charTab = 'attr';
  const CHAR_TABS = [
    { id: 'attr', name: '属性' },
    { id: 'gear', name: '装备' },
    { id: 'skill', name: '功法' },
    { id: 'state', name: '状态' }
  ];

  /* 一条带进度条的数值（气血 / 内力 / 修为 / 妖物气血） */
  function charBar(label, cur, max, cls) {
    const r = (max > 0 && isFinite(max)) ? Math.max(0, Math.min(1, cur / max)) : 0;
    return '<div class="cp-bar">' +
      '<span class="cp-bar-k">' + label + '</span>' +
      '<span class="cp-bar-t ' + cls + '"><i style="width:' + (r * 100).toFixed(1) + '%"></i></span>' +
      '<span class="cp-bar-v">' + G.fmt(cur) + ' / ' + G.fmt(max) + '</span>' +
      '</div>';
  }

  /* 头部：立绘 + 道号 / 境界 / 门派 + 气血内力条 */
  function charHeadBlock() {
    const s = G.state;
    const sect = G.sectOf(s.sect);
    const st = G.stats();
    return '<div class="char-head">' +
        '<div class="char-portrait" style="color:' + sect.color + '">' +
          FIG.hero(sect.id, s.gender || 'male') +
        '</div>' +
        '<div class="char-info">' +
          '<div class="char-name">' + esc(s.name) + '<span class="tb-guild">' + esc(s.guild) + '</span></div>' +
          '<div class="char-sub">' + esc(G.realmName(s.level)) + ' · Lv.' + s.level +
            ' · ' + esc(sect.name) + ' · ' + (s.gender === 'female' ? '女' : '男') + '</div>' +
          '<div class="char-power">' + ic('zap', 'ic-xs') + ' 战力 ' + G.fmt(st.power) + '</div>' +
        '</div>' +
      '</div>' +
      charBar('气血', st.hp * s.hp, st.hp, 'hp') +
      charBar('内力', st.maxMp * s.mp, st.maxMp, 'mp');
  }

  function charAttrTab() {
    const s = G.state;
    const st = G.stats();
    const sect = G.sectOf(s.sect);
    const need = G.expNeed(s.level);
    const er = (!isFinite(need) || need <= 0) ? 1 : Math.min(1, s.exp / need);
    const usedPot = Object.keys(s.pot).reduce((a, k) => a + s.pot[k], 0);
    const leftPot = Math.max(0, s.level - 1 - usedPot);

    let b = '<div class="section-title">' + ic('scroll-text', 'ic-xs') + ' 基础信息</div>';
    const base = [
      ['道号', esc(s.name)],
      ['等级', 'Lv.' + s.level + ' / ' + D.MAX_LEVEL],
      ['境界', esc(G.realmName(s.level))],
      ['门派', esc(sect.name) + ' · ' + esc(sect.tag)],
      ['性别', s.gender === 'female' ? '女' : '男'],
      ['公会', esc(s.guild)],
      ['可用潜能', G.fmt(leftPot) + ' 点'],
      ['修行时长', G.fmtTime(s.stats.playTime)]
    ];
    b += base.map(r => '<div class="stat-line"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>').join('');

    b += '<div class="section-title" style="margin-top:14px">' + ic('target', 'ic-xs') + ' 战斗属性</div>';
    const props = [
      ['攻击', G.fmt(st.atk)], ['气血上限', G.fmt(st.hp)], ['防御', G.fmt(st.def)],
      ['内力上限', G.fmt(st.maxMp)], ['暴击率', (st.crit * 100).toFixed(1) + '%'],
      ['暴击伤害', (st.critDmg * 100).toFixed(0) + '%'], ['闪避率', (st.dodge * 100).toFixed(1) + '%'],
      ['攻击速度', (st.spd * 100).toFixed(0) + '%'], ['攻速间隔', st.atkInterval.toFixed(2) + ' 秒'],
      ['吸血', (st.lifesteal * 100).toFixed(1) + '%'], ['减伤', (st.damageCut * 100).toFixed(0) + '%'],
      ['技能增伤', (st.skillDmg * 100 - 100).toFixed(0) + '%'],
      ['气血回复', (st.hpRegen * 100).toFixed(1) + '%/秒'], ['内力回复', G.fmt(st.mpRegen) + '/秒']
    ];
    b += props.map(r => '<div class="stat-line"><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></div>').join('');

    b += '<div class="section-title" style="margin-top:14px">' + ic('award', 'ic-xs') + ' 修为进度</div>';
    b += charBar('修为', s.exp, need, 'exp');
    b += '<div class="stat-line"><span class="k">本次境界</span><span class="v">Lv.' +
      (G.tierOf(s.level) * D.TIER_SIZE + 1) + ' - ' + ((G.tierOf(s.level) + 1) * D.TIER_SIZE) + '</span></div>';
    b += '<div class="stat-line"><span class="k">门派被动</span><span class="v">【' + esc(sect.passive.name) + '】' + esc(sect.passive.desc) + '</span></div>';
    b += '<button class="btn sm" style="width:100%;margin-top:8px" data-ctab="level">' +
      ic('award', 'ic-xs') + ' 查看境界阶梯</button>';
    return b;
  }

  function charGearTab() {
    const s = G.state;
    let total = 0, cnt = 0;
    const rows = D.SLOTS.map(sl => {
      const it = s.equipped[sl.id];
      if (!it) {
        return '<div class="cp-eq empty">' +
          '<div class="cp-eq-ic">' + ic(sl.icon) + '</div>' +
          '<div class="cp-eq-main">' +
            '<div class="cp-eq-name">未着装备</div>' +
            '<div class="cp-eq-stat">' + sl.name + '</div>' +
          '</div></div>';
      }
      const q = G.qualityOf(it);
      const affixTx = (it.affixes || []).map(a => {
        const def = D.AFFIXES.find(x => x.key === a.key);
        return (def ? def.name : a.key) + ' +' + (a.value * (1 + it.enh * 0.04) * 100).toFixed(1) + '%';
      }).join(' · ');
      total += G.itemPower(it); cnt++;
      return '<div class="cp-eq">' +
        '<div class="cp-eq-ic" style="color:' + q.color + '">' + ic(sl.icon) +
          (it.enh > 0 ? '<span class="cp-enh">+' + it.enh + '</span>' : '') + '</div>' +
        '<div class="cp-eq-main">' +
          '<div class="cp-eq-name" style="color:' + q.color + '">' + esc(it.name) + '</div>' +
          '<div class="cp-eq-stat">' + q.name + ' · ' + sl.name + ' · 等阶 ' + it.ilvl +
            ' · ' + MAIN_STAT_NAME[it.main.key] + ' +' + G.fmt(it.main.value * (1 + it.enh * 0.08)) + '</div>' +
          (affixTx ? '<div class="cp-eq-affix">' + affixTx + '</div>' : '') +
        '</div>' +
        '<div class="cp-eq-score">' + G.fmt(G.itemPower(it)) + '</div>' +
        '</div>';
    }).join('');

    let b = '<div class="section-title">' + ic('shield', 'ic-xs') + ' 已着装备 · ' + cnt + ' / ' + D.SLOTS.length + '</div>';
    b += '<div class="offline-grid" style="margin-bottom:10px">' +
      '<div class="offline-cell"><div class="oc-val">' + G.fmt(total) + '</div><div class="oc-lab">装备总评分</div></div>' +
      '<div class="offline-cell"><div class="oc-val">' + cnt + ' / ' + D.SLOTS.length + '</div><div class="oc-lab">已着部位</div></div>' +
      '</div>';
    b += rows;
    b += '<div class="cp-hint">在「行囊」面板可更换、卸下、强化与出售装备。</div>';
    return b;
  }

  function charSkillTab() {
    const s = G.state;
    const sect = G.sectOf(s.sect);
    const maxSk = maxSkillLv();
    let b = '<div class="section-title">' + ic('sparkles', 'ic-xs') + ' 门派功法 · ' + esc(sect.name) + '</div>';
    D.SKILL_TEMPLATES.forEach((t, i) => {
      const lv = s.skills[t.key] || 0;
      const unlocked = s.level >= t.unlock;
      const nm = sect.skillNames[i] || ['未知', ''];
      const typeTx = { single: '单体', aoe: '多段', buff: '增益', ult: '绝技' }[t.type] || '单体';
      const ratio = t.ratio * (1 + Math.max(0, lv - 1) * 0.20);
      let meta = '<span>' + typeTx + '</span>';
      if (t.ratio) meta += '<span>倍率 ' + ratio.toFixed(1) + '×</span>';
      else if (t.buff) meta += '<span>攻击 +' + Math.round(t.buff.atkPct * 100) + '%</span>';
      if (t.hits > 1) meta += '<span>' + t.hits + ' 段</span>';
      meta += '<span>冷却 ' + t.cd.toFixed(1) + 's</span><span>耗蓝 ' + t.mp + '</span>';

      b += '<div class="cp-skill' + (unlocked ? '' : ' locked') + '">' +
        '<div class="cp-sk-ic" style="color:' + sect.color + '">' +
          ic(['sword', 'flame', 'sun', 'sparkles', 'crown'][i] || 'sparkles') + '</div>' +
        '<div class="cp-sk-main">' +
          '<div class="cp-sk-name">' + esc(nm[0]) +
            '<span class="lv-tag">' + (lv ? 'Lv.' + lv : '未修') + '</span>' +
            (unlocked ? '' : '<span class="lv-tag lock">Lv.' + t.unlock + ' 解锁</span>') +
          '</div>' +
          '<div class="cp-sk-desc">' + esc(nm[1]) + '</div>' +
          '<div class="cp-sk-meta">' + meta + '</div>' +
        '</div></div>';
    });
    b += '<div class="cp-hint">在「功法」面板可提升功法等级（当前上限 Lv.' + maxSk + '），并分配潜能点。</div>';
    return b;
  }

  function charStateTab() {
    const s = G.state;
    const C = G.combat;
    const reg = G.regionOf(s.region);
    const mob = C && C.mob;
    const sect = G.sectOf(s.sect);
    const usedPot = Object.keys(s.pot).reduce((a, k) => a + s.pot[k], 0);
    const leftPot = Math.max(0, s.level - 1 - usedPot);

    let b = '<div class="section-title">' + ic('activity', 'ic-xs') + ' 当前状态</div>';
    b += '<div class="cp-chips">' +
      '<span class="cp-chip' + (s.auto ? ' on' : ' off') + '">' + ic(s.auto ? 'play' : 'pause') +
        (s.auto ? '挂机中' : '已暂停') + '</span>' +
      '<span class="cp-chip">' + ic('map-pin') + esc(reg.name) + '</span>' +
      (s.autoRegion !== false ? '<span class="cp-chip">' + ic('refresh-cw') + '自动择地</span>' : '') +
      (s.settings && s.settings.autoEquip !== false ? '<span class="cp-chip">' + ic('shield') + '自动装备</span>' : '') +
      '</div>';
    b += '<div class="stat-line"><span class="k">当前妖物</span><span class="v">' +
      (mob ? esc(mob.name) + ' Lv.' + mob.lv + (mob.elite ? ' · 妖将' : '') : '寻觅中…') + '</span></div>';
    if (mob) b += charBar('妖物气血', Math.max(0, C.mobHp), Math.max(1, mob.maxHp), 'mob');

    b += '<div class="section-title" style="margin-top:14px">' + ic('zap', 'ic-xs') + ' 生效中的效果</div>';
    let fx = '';
    if (C && C.buff && C.buff.t > 0) {
      fx += '<div class="cp-fx buff">' + ic('arrow-up') +
        '<span class="cp-fx-main">攻势大涨 · 攻击 +' + Math.round(C.buff.v * 100) + '%</span>' +
        '<span class="cp-fx-t">' + C.buff.t.toFixed(1) + 's</span></div>';
    }
    if (C && C.burn && C.burn.t > 0) {
      fx += '<div class="cp-fx bad">' + ic('flame') +
        '<span class="cp-fx-main">灼烧 · 持续伤害' + (C.burn.dmg ? ' ' + G.fmt(C.burn.dmg) + '/段' : '') + '</span>' +
        '<span class="cp-fx-t">' + C.burn.t.toFixed(1) + 's</span></div>';
    }
    fx += '<div class="cp-fx good">' + ic('sparkles') +
      '<span class="cp-fx-main">【' + esc(sect.passive.name) + '】' + esc(sect.passive.desc) + '</span></div>';
    if (!s.auto) {
      fx += '<div class="cp-fx off">' + ic('pause') +
        '<span class="cp-fx-main">挂机已暂停 · 修为与掉落均不再增长</span></div>';
    }
    if (s.hp <= 0.25) {
      fx += '<div class="cp-fx bad">' + ic('heart') +
        '<span class="cp-fx-main">气血低迷 · 即将力竭倒地</span></div>';
    }
    b += fx;

    b += '<div class="section-title" style="margin-top:14px">' + ic('trending-up', 'ic-xs') + ' 成长进度</div>';
    b += '<div class="offline-grid">' +
      '<div class="offline-cell"><div class="oc-val">' + G.fmt(leftPot) + '</div><div class="oc-lab">可用潜能</div></div>' +
      '<div class="offline-cell"><div class="oc-val">' + G.fmt(s.stats.levelUps) + '</div><div class="oc-lab">等级提升</div></div>' +
      '<div class="offline-cell"><div class="oc-val">' + G.fmt(s.stats.kills) + '</div><div class="oc-lab">累计斩杀</div></div>' +
      '<div class="offline-cell"><div class="oc-val">' + (s.stats.killRate * 60).toFixed(1) + '</div><div class="oc-lab">只 / 分钟</div></div>' +
      '</div>';

    b += '<div class="cp-acts">' +
      '<button class="btn ' + (s.auto ? '' : 'jade') + ' sm" data-act="auto">' +
        ic(s.auto ? 'pause' : 'play') + (s.auto ? '暂停挂机' : '继续挂机') + '</button>' +
      '<button class="btn sm" data-ctab="level">' + ic('award', 'ic-xs') + ' 境界一览</button>' +
      '<button class="btn sm" data-act="settings">' + ic('settings', 'ic-xs') + ' 设置</button>' +
      '</div>';
    return b;
  }

  function openCharPanel(tab) {
    if (CHAR_TABS.some(t => t.id === tab)) charTab = tab;
    const s = G.state;
    const body =
      charHeadBlock() +
      '<div class="seg cp-tabs">' +
        CHAR_TABS.map(t => '<button class="tab' + (t.id === charTab ? ' on' : '') +
          '" data-ctab="' + t.id + '">' + t.name + '</button>').join('') +
      '</div>' +
      '<div class="cp-body">' +
        (charTab === 'gear' ? charGearTab()
          : charTab === 'skill' ? charSkillTab()
            : charTab === 'state' ? charStateTab()
              : charAttrTab()) +
      '</div>';

    openModal({
      kind: 'char',
      title: '角色属性',
      sub: esc(s.name) + ' · ' + esc(G.sectOf(s.sect).name),
      body: body,
      buttons: [{ label: '关闭', cls: 'gold' }]
    });

    /* 页签切换：重绘面板而不关闭弹窗 */
    el.modal.querySelectorAll('[data-ctab]').forEach(n => {
      n.addEventListener('click', () => {
        const v = n.getAttribute('data-ctab');
        if (v === 'level') { openLevelTip(); return; }
        openCharPanel(v);
      });
    });
  }

  /* ============================ 境界一览 ============================ */
  function openLevelTip() {
    const s = G.state;
    const t = G.tierOf(s.level);
    const st = G.stats();
    const tierStart = t * D.TIER_SIZE + 1;
    const tierEnd = (t + 1) * D.TIER_SIZE;
    const inTier = s.level - tierStart + 1;
    const atMax = s.level >= D.MAX_LEVEL;
    const toNext = atMax ? 0 : tierEnd + 1 - s.level;

    const need = G.expNeed(s.level);
    const er = need === Infinity ? 1 : Math.min(1, s.exp / need);
    const expTx = atMax
      ? '已臻化境 · 真仙圆满'
      : G.fmt(s.exp) + ' / ' + G.fmt(need) + ' 修为 · ' + (er * 100).toFixed(1) + '%';

    const usedPot = Object.keys(s.pot).reduce((a, k) => a + s.pot[k], 0);
    const leftPot = Math.max(0, s.level - 1 - usedPot);
    const breaks = Math.floor((s.level - 1) / D.TIER_SIZE);

    let ladder = '';
    D.TIERS.forEach((name, i) => {
      const lo = i * D.TIER_SIZE + 1;
      const hi = (i + 1) * D.TIER_SIZE;
      const on = i === t;
      const locked = !on && s.level < lo;
      const stateTx = on ? '当前' : locked ? '未至' : '已越';
      ladder += '<div class="tier-row' + (on ? ' on' : '') + (locked ? ' locked' : '') + '">' +
        '<span class="t-no">' + (i + 1) + '</span>' +
        '<span class="t-name">' + name + '</span>' +
        '<span class="t-rng">Lv.' + lo + ' - ' + hi + '</span>' +
        '<span class="t-st">' + stateTx + '</span>' +
        '</div>';
    });

    const body =
      '<div class="lv-head">' +
        '<div class="lv-realm">' + esc(G.realmName(s.level)) + '</div>' +
        '<div class="lv-sub">Lv.' + s.level + ' / ' + D.MAX_LEVEL + ' · 战力 ' + G.fmt(st.power) + '</div>' +
      '</div>' +
      '<div class="bar-exp" style="height:14px"><i style="width:' + (er * 100).toFixed(2) + '%"></i><span>' + expTx + '</span></div>' +
      '<div class="offline-grid" style="margin-top:12px">' +
        '<div class="offline-cell"><div class="oc-val">' + inTier + ' / ' + D.TIER_SIZE + '</div><div class="oc-lab">' + esc(D.TIERS[t]) + ' 进度</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + (atMax ? '—' : toNext + ' 级') + '</div><div class="oc-lab">距下一境界</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(leftPot) + '</div><div class="oc-lab">可用潜能</div></div>' +
        '<div class="offline-cell"><div class="oc-val">' + G.fmt(breaks) + ' 次</div><div class="oc-lab">已突破</div></div>' +
      '</div>' +
      '<div class="section-title">' + ic('award', 'ic-xs') + ' 境界阶梯</div>' +
      '<div class="tier-list">' + ladder + '</div>' +
      '<div style="font-size:11px;color:#78716c;margin-top:10px;line-height:1.75">' +
        '· 每 ' + D.TIER_SIZE + ' 级跨越一个境界，共 ' + D.TIERS.length + ' 重天<br/>' +
        '· 提升境界可解锁更高阶功法与更强词条掉落</div>';

    openModal({
      title: '境界一览',
      sub: '诛仙问道 · 修行之路',
      body: body,
      buttons: [{ label: '继续修行', cls: 'gold' }]
    });
  }

  /* ============================ 对外 ============================ */
  global.UI = {
    init, openSheet, closeSheet, openModal, closeModal, openRegion,
    openSettings, openOffline, openStats, openLevelTip, openCharPanel,
    renderSheet, renderTop, softRefresh, maxSkillLv, esc
  };
  G.__maxSkillLv = maxSkillLv;
})(window);
