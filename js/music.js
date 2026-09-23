/* 诛仙问道 · 仙侠背景音乐（WebAudio 程序化生成，无需音频素材）
   风格：五声音阶 + 古筝拨弦音色 + 空灵铺底 + 简易混响，循环不断。
   一键开关：Music.toggle() */
(function (global) {
  'use strict';
  let ac = null, master = null, wet = null, dryGain = null, timer = null;
  let on = false, step = 0, vol = 0.5;

  /* D 调五声音阶（宫商角徵羽）两个八度，筝/笛常用 */
  const SCALE = [146.83, 164.81, 196.00, 220.00, 246.94, 293.66, 329.63, 392.00, 440.00, 493.88, 587.33];
  /* 主旋律（音阶下标，-1 = 休止）——循环，婉转不重复感 */
  const MEL = [5, 7, 6, 5, 4, 5, -1, 3, 4, 6, 7, 9, 8, 7, 6, -1,
    4, 5, 7, 8, 9, 10, 9, 7, 6, 5, 4, 5, 3, -1, 2, -1];
  const MELB = [7, 8, 9, 7, 6, 5, 4, -1, 5, 6, 7, 5, 4, 3, 2, -1,
    4, 6, 8, 9, 10, 9, 8, 7, 6, 5, 7, 6, 5, 4, 3, -1];
  const BASS = [0, 0, 3, 3, 4, 4, 0, 0];

  function init() {
    if (ac) return ac;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = vol;
    /* 混响：噪声脉冲 + 反馈延迟，营造洞天回响 */
    const conv = ac.createConvolver();
    const len = ac.sampleRate * 2.2;
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    conv.buffer = buf;
    wet = ac.createGain(); wet.gain.value = 0.34;
    dryGain = ac.createGain(); dryGain.gain.value = 0.76;
    dryGain.connect(master);
    wet.connect(conv); conv.connect(master);
    master.connect(ac.destination);
    return ac;
  }

  /* 拨弦：古筝/古琴音色（三角波主体 + 正弦泛音，快速起音 + 指数衰减） */
  function pluck(freq, when, dur, gain) {
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    o1.type = 'triangle'; o1.frequency.value = freq;
    o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    const g2 = ac.createGain(); g2.gain.value = 0.28;
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    g.connect(dryGain); g.connect(wet);
    o1.start(when); o2.start(when);
    o1.stop(when + dur + 0.05); o2.stop(when + dur + 0.05);
  }

  /* 铺底：低频长音（洞箫感），让空间不空 */
  function drone(freq, when, dur) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = 'sine'; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = 620;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(0.055, when + 0.9);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(f); f.connect(g); g.connect(dryGain); g.connect(wet);
    o.start(when); o.stop(when + dur + 0.05);
  }

  /* 鼓点：低频正弦下滑，模拟远处战鼓 */
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

  const BEAT = 0.62;            /* 每拍时长（秒） */
  /* 排下一拍：旋律 + 每 4 拍低音 + 偶尔的高音点缀 */
  function tick() {
    if (!on || !ac) return;
    const t0 = ac.currentTime + 0.08;
    const ph = Math.floor(step / 32) % 2;          /* A/B 两段交替 */
    const line = ph ? MELB : MEL;
    const idx = line[step % line.length];
    if (idx >= 0) pluck(SCALE[idx], t0, 1.9 + Math.random() * 0.5, 0.16 + Math.random() * 0.05);
    /* 琶音织体：奇数拍补一个高八度和音，像古筝扫弦 */
    if (step % 2 === 1) pluck(SCALE[(idx >= 0 ? idx : 4) + 0] * 1.5, t0 + 0.09, 1.1, 0.05);
    if (step % 4 === 0) {
      const b = BASS[(step / 4) % BASS.length];
      drone(SCALE[b] / 2, t0, BEAT * 4 + 1.2);
    }
    if (step % 16 === 0) drum(t0, 0.16);            /* 每 16 拍一记远鼓 */
    if (step % 8 === 6 && Math.random() < 0.7) pluck(SCALE[10] * 2, t0 + 0.16, 1.2, 0.07);
    step++;
  }

  function start() {
    if (!init()) return false;
    if (ac.state === 'suspended') ac.resume();
    if (timer) return true;
    on = true;
    tick();
    timer = setInterval(tick, BEAT * 1000);
    return true;
  }
  function stop() {
    on = false;
    if (timer) { clearInterval(timer); timer = null; }
  }
  function toggle() { return isOn() ? (stop(), false) : start(); }
  function isOn() { return !!on; }
  function setVol(v) { vol = Math.max(0, Math.min(1, v)); if (master) master.gain.value = vol; }
  /* 浏览器要求首次用户交互后才能出声 */
  function unlock() { if (isOn() && ac && ac.state === 'suspended') ac.resume(); }

  global.Music = { start, stop, toggle, isOn, setVol, unlock, get vol() { return vol; }, get ready() { return !!ac; } };
})(window);