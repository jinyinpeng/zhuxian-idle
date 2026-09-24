/* 诛仙问道 · 仙侠背景音乐（WebAudio 程序化生成，无需音频素材）

   目标不是"好听的仙侠氛围"，而是**挂机时能一直听下去、还想把音量调大** ——
   这是两种不同的写法：氛围靠长音与留白，挂机靠**记忆点 + 律动 + 循环里的变化**。
   所以这一版做了三件事：

   ① 记忆点：一个 8 音的五声短句当主旋律，每轮都回来（repeat 是"上瘾"的第一原理），
      但第二遍换尾音、第三遍转高八度，听 20 分钟也不会腻；
   ② 律动：加了底鼓 + 沙锤 + 琶音跑动，从"飘"变成"走"，挂机时才有推进感；
   ③ 循环变化：4 段结构 A A' B A''，每 8 小节一次上行经过句（fill），
      正好卡在玩家每次收完一波怪的节奏上。

   音色仍是仙侠那套（古筝拨弦 / 洞箫铺底 / 远处战鼓），和声用 D 调五声，
   一键开关：Music.toggle() —— 对外接口与旧版完全一致。 */
(function (global) {
  'use strict';
  let ac = null, master = null, wet = null, dryGain = null, timer = null;
  let on = false, step = 0, nextTime = 0, vol = 0.5;

  /* D 调五声音阶（宫商角徵羽）三个八度 */
  const SCALE = [146.83, 164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00,
    440.00, 493.88, 587.33, 659.25, 783.99, 880.00];
  /* 主旋律：8 音记忆点，第二句换尾音（这就是"上口"的地方） */
  const HOOK = [7, 9, 8, 7, 5, 7, 8, -1];
  const HOOK_B = [7, 9, 10, 9, 8, 7, 5, -1];
  const HOOK_HI = [11, 12, 11, 9, 8, 9, 11, -1];
  /* 低音走向：i - VI - III - VII（五声里的 0/5/2/6），一句四小节 */
  const PROG = [0, 0, 5, 5, 2, 2, 6, 6];
  /* 琶音跑动用的音级（相对当前和弦） */
  const ARP = [0, 2, 4, 2];

  function init() {
    if (ac) return ac;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = vol;
    const conv = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.0);
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
    }
    conv.buffer = buf;
    wet = ac.createGain(); wet.gain.value = 0.26;
    dryGain = ac.createGain(); dryGain.gain.value = 0.82;
    dryGain.connect(master);
    wet.connect(conv); conv.connect(master);
    master.connect(ac.destination);
    return ac;
  }

  /* 古筝拨弦 */
  function pluck(freq, when, dur, gain) {
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o1.type = 'triangle'; o1.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g2 = ac.createGain(); g2.gain.value = 0.26;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    g.connect(dryGain); g.connect(wet);
    o1.start(when); o2.start(when);
    o1.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
  }

  /* 短促的"木鱼/琵琶"颗粒，用来打拍子（比沙锤更有仙侠味） */
  function ticktock(freq, when, gain) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'square'; o.frequency.value = freq;
    f.type = 'bandpass'; f.frequency.value = freq * 2; f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    o.connect(f); f.connect(g); g.connect(dryGain);
    o.start(when); o.stop(when + 0.08);
  }

  /* 洞箫铺底 */
  function pad(freq, when, dur, gain) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    const f = ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 1.005;
    f.type = 'lowpass'; f.frequency.value = 560;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.7);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(dryGain); g.connect(wet);
    o.start(when); o.stop(when + dur + 0.05); o2.start(when); o2.stop(when + dur + 0.05);
  }

  /* 底鼓：让挂机有推进感的关键 */
  function kick(when, gain) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(138, when);
    o.frequency.exponentialRampToValueAtTime(46, when + 0.16);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.26);
    o.connect(g); g.connect(dryGain);
    o.start(when); o.stop(when + 0.3);
  }

  /* 远处战鼓（旧版保留，用在乐句转折处） */
  function drum(when, gain) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, when);
    o.frequency.exponentialRampToValueAtTime(48, when + 0.22);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.34);
    o.connect(g); g.connect(dryGain); g.connect(wet);
    o.start(when); o.stop(when + 0.4);
  }

  const BEAT = 0.536;           /* ≈112BPM：比旧版快一档，挂机才有"走起来"的感觉 */
  const BAR = BEAT * 4;

  /* 排一个十六分步。一个小节 = 16 步，step 一直递增，取模决定落点。 */
  function scheduleStep(st, t0) {
    const b = Math.floor(st / 16);                 /* 第几小节 */
    const s = st % 16;                             /* 小节内第几步 */
    const ph = b % 4;                              /* A A' B A'' 四段循环 */
    const chord = PROG[b % PROG.length];
    const DEG = [0, 1, 2, 3, 4, 5, 6];             /* 音级 → 半音错位用的近似表 */

    /* ① 记忆点：每两拍一个音，落在 0/4/8/12 步上；第三拍留空（留白才记得住） */
    if (s % 4 === 0) {
      const n = Math.floor(s / 4);
      const line = ph === 2 ? HOOK_B : (ph === 3 ? HOOK_HI : HOOK);
      const v = line[n];
      if (v >= 0) pluck(SCALE[v], t0, 1.45, 0.17);
    }
    /* ② 琶音跑动：每个"和拍"补一个八度和音，像筝的扫弦，给出持续推力 */
    if (s % 2 === 1) {
      pluck(SCALE[chord + 7 + ARP[(s >> 1) % ARP.length]], t0 + 0.02, 0.5, 0.05);
    }
    /* ③ 低音 + 底鼓：每拍一记，落在拍头上（律动的骨架） */
    if (s % 4 === 0) {
      pad(SCALE[chord] / 2, t0, BEAT * 0.94, 0.075);
      kick(t0, s === 0 ? 0.2 : 0.13);
    }
    /* ④ 打点：二四拍的反拍加"木鱼"，给出摇摆感 */
    if (s === 6 || s === 14) ticktock(880, t0, 0.05);
    if (s === 2 || s === 10) ticktock(660, t0 + BEAT * 0.5, 0.035);
    /* ⑤ 和弦铺底：每小节一次 */
    if (s === 0) pad(SCALE[chord + 7], t0, BAR * 1.02, 0.028);
    /* ⑥ 经过句：每 8 小节末尾来一记战鼓 + 上行五音，卡在"刚收完一波怪"的节奏上 */
    if (b % 8 === 7) {
      if (s === 0) drum(t0, 0.18);
      if (s >= 12 && s < 16) pluck(SCALE[chord + DEG[s - 12] + 7], t0, 0.42, 0.1);
    }
    /* ⑦ 亮点：每 16 小节一次高音泛音，给长时间挂机一个"奖励" */
    if (s === 0 && b % 16 === 15) pluck(SCALE[13], t0 + BEAT * 2, 2.2, 0.085);
  }

  /* 用 AudioContext 的时钟提前排（比 setInterval 现算稳，不会抖） */
  function pump() {
    if (!on || !ac) return;
    const now = ac.currentTime;
    if (nextTime < now) nextTime = now + 0.1;
    while (nextTime < now + 0.7) {
      scheduleStep(step, nextTime);
      step++;
      nextTime += BAR / 16;
    }
  }

  function start() {
    if (!init()) return false;
    if (ac.state === 'suspended') ac.resume();
    if (timer) return true;
    on = true; step = 0;
    nextTime = ac.currentTime + 0.1;
    pump();
    timer = setInterval(pump, 180);
    return true;
  }
  function stop() {
    on = false;
    if (timer) { clearInterval(timer); timer = null; }
  }
  function toggle() { return isOn() ? (stop(), false) : start(); }
  function isOn() { return !!on; }
  function setVol(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol; }
  function unlock() { if (isOn() && ac && ac.state === 'suspended') ac.resume(); }

  global.Music = { start, stop, toggle, isOn, setVol, unlock, get vol() { return vol; }, get ready() { return !!ac; } };
})(window);
