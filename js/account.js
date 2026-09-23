/* 诛仙问道 · 账号系统（手机号 + 密码，零知识加密存档）
   设计：密码永不外传。手机号只存哈希；存档用「密码派生密钥」AES-GCM 加密后上传。
        换设备用同一手机号 + 密码登录 → 解密还原全部进度。 */
(function (global) {
  'use strict';
  const SALT = 'lingxu-zhuxian-v1';
  const ITER = 150000;
  const enc = new TextEncoder();

  function b64(buf) {
    const b = new Uint8Array(buf); let s = '';
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return global.btoa(s);
  }
  function unb64(str) {
    const s = global.atob(str); const b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  async function sha256(text) {
    const h = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return b64(h).replace(/[+/=]/g, '').slice(0, 32);
  }
  async function deriveKey(phone, pwd, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pwd), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decrypt(obj, key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(obj.iv) }, key, unb64(obj.ct));
    return new TextDecoder().decode(pt);
  }
  function checkPhone(p) { return /^1[3-9]\d{9}$/.test(String(p || '').trim()); }
  /* ---------------------------------------------------------------- 云端适配
     Supabase（anon key 可公开、前端直连，官方设计）：Auth 用「手机号@zhuxian.game」作邮箱，
     存档存 saves 表；存档内容是密码派生密钥加密后的密文（零知识）。未配置时保持纯本地。 */
  const CFG = 'lx_cloud_cfg', SES = 'lx_cloud_ses';
  function cfg() { try { return JSON.parse(global.localStorage.getItem(CFG) || 'null'); } catch (e) { return null; } }
  function setCfg(c) { try { global.localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) { } }
  function ses() { try { return JSON.parse(global.localStorage.getItem(SES) || 'null'); } catch (e) { return null; } }
  function setSes(s) { try { global.localStorage.setItem(SES, JSON.stringify(s)); } catch (e) { } }
  /* CloudBase（环境自带的数据库 + 匿名登录）：不需要任何密码学以外的服务端逻辑 */
  let cbApp = null, cbDb = null, cbUid = null, cbTry = false;
  async function cbInit() {
    if (cbApp) return cbApp;
    if (!global.cloudbase || !global.LX_TCB_ENV) return null;
    try {
      const cb = global.cloudbase.default || global.cloudbase;   /* esbuild 打包后导出在 default 上 */
      cbApp = cb.init({ env: global.LX_TCB_ENV });
      const auth = cbApp.auth();
      if (auth.signInAnonymously) { try { await auth.signInAnonymously(); } catch (e) { } }
      const st = await auth.getLoginState();
      cbUid = (st && st.user && st.user.uid) || null;
      cbDb = cbApp.database();
      return cbApp;
    } catch (e) { cbApp = null; return null; }
  }
  /* 读写统一走云函数 zxsvc（服务端管理员权限，不受集合 ACL 限制；服务端只见密文） */
  async function cbCall(action, id, blob) {
    if (!cbApp) throw new Error('云端未就绪');
    const data = { action: action, id: id };
    if (blob !== undefined) data.blob = blob;
    const r = await cbApp.callFunction({ name: 'zxsvc', data: data });
    const res = (r && r.result) || null;
    if (!res || !res.ok) throw new Error('云存档服务错误：' + ((res && res.msg) || '无法连接'));
    return res;
  }
  async function cbPut(id, blob) {
    await cbCall('save', id, JSON.stringify(blob));
    return true;
  }
  async function cbGet(id) {
    const res = await cbCall('load', id);
    if (!res.blob) return null;
    return JSON.parse(res.blob);
  }
  async function ready() {
    if (cbTry) return !!cbDb;
    cbTry = true;
    await cbInit();
    return !!cbDb;
  }
  function readySync() { return !!cbDb; }
  const mail = p => String(p).trim() + '@zhuxian.game';

  async function req(path, opt) {
    const c = cfg(); if (!c) throw new Error('云端未配置');
    const o = opt || {}; const h = { apikey: c.key, 'Content-Type': 'application/json' };
    if (o.token) h.Authorization = 'Bearer ' + o.token;
    if (o.headers) { for (const k in o.headers) h[k] = o.headers[k]; }
    const r = await fetch(c.url.replace(/\/+$/, '') + path, { method: o.method || 'GET', headers: h, body: o.body });
    const t = await r.text(); let j = null;
    try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
    if (!r.ok) throw new Error((j && (j.error_description || j.msg || j.message)) || ('HTTP ' + r.status));
    return j;
  }
  async function signUp(phone, pwd) { return req('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: mail(phone), password: pwd }) }); }
  async function signIn(phone, pwd) { return req('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: mail(phone), password: pwd }) }); }

  /* ---------------------------------------------------------------- 账号流程
     密钥只存在内存里（刷新后需重新登录，或凭已存 token 重新派生：
     因此本地保留手机号，用「记住密码」开关决定是否自动登录）。 */
  let K = null, TOKEN = null, UID = null, PHONE = null;

  /* 账号 id = 手机号哈希（云端不存明文手机号）；密钥 = 密码派生（从不上传，零知识） */
  async function acctId(phone) { return 'game_p_' + await sha256(String(phone).trim() + '|' + SALT); }

  async function push(snapshot) {
    if (!K || !PHONE) throw new Error('未登录');
    if (!(await ready())) throw new Error('云端未就绪');
    const box = await encrypt(JSON.stringify(snapshot), K);
    await cbPut(await acctId(PHONE), box);
    return true;
  }
  async function pull() {
    if (!K || !PHONE) throw new Error('未登录');
    if (!(await ready())) throw new Error('云端未就绪');
    const box = await cbGet(await acctId(PHONE));
    if (!box) return null;
    try { return JSON.parse(await decrypt(box, K)); }
    catch (e) { throw new Error('密码不正确'); }
  }
  async function register(phone, pwd, snapshot) {
    if (!checkPhone(phone)) throw new Error('手机号格式不正确');
    if (String(pwd || '').length < 6) throw new Error('密码至少 6 位');
    if (!(await ready())) throw new Error('云端未就绪，请稍后重试');
    if (await cbGet(await acctId(phone))) throw new Error('该手机号已绑定过，请直接用「登录并恢复」');
    PHONE = String(phone).trim();
    K = await deriveKey(PHONE, pwd, SALT);
    await push(snapshot || {});
    setSes({ phone: PHONE, at: Date.now() });
    return { snapshot: null };
  }
  async function login(phone, pwd) {
    if (!checkPhone(phone)) throw new Error('手机号格式不正确');
    if (!(await ready())) throw new Error('云端未就绪，请稍后重试');
    const box = await cbGet(await acctId(phone));
    if (!box) throw new Error('该手机号还没有绑定账号');
    PHONE = String(phone).trim();
    K = await deriveKey(PHONE, pwd, SALT);
    let snap = null;
    try { snap = JSON.parse(await decrypt(box, K)); }
    catch (e) { K = null; PHONE = null; throw new Error('密码不正确'); }
    setSes({ phone: PHONE, at: Date.now() });
    return { snapshot: snap };
  }
  function logout() { K = null; PHONE = null; setSes(null); }
  function who() { if (PHONE) return PHONE; const s = ses(); return (s && s.phone) || null; }
  function synced() { return !!(K && PHONE); }

  /* 存档码：把进度用「手机号 + 口令」派生密钥加密成一段文本，
     可在任意设备导入 —— 不依赖云端，换手机/清缓存也能救回进度。 */
  async function exportCode(snapshot, phone, pwd) {
    if (!checkPhone(phone)) throw new Error('手机号格式不正确');
    if (String(pwd || '').length < 6) throw new Error('口令至少 6 位');
    const key = await deriveKey(String(phone).trim(), pwd, SALT);
    const box = await encrypt(JSON.stringify(snapshot), key);
    const raw = JSON.stringify({ p: String(phone).trim(), iv: box.iv, ct: box.ct });
    return 'ZX1' + b64(enc.encode(raw));
  }
  async function importCode(code, phone, pwd) {
    const s = String(code || '').trim().replace(/\s+/g, '');
    if (s.slice(0, 3) !== 'ZX1') throw new Error('存档码格式不对（应以 ZX1 开头）');
    let obj = null;
    try { obj = JSON.parse(new TextDecoder().decode(unb64(s.slice(3)))); } catch (e) { throw new Error('存档码已损坏'); }
    const key = await deriveKey(String(phone || obj.p).trim(), pwd, SALT);
    try { return JSON.parse(await decrypt({ iv: obj.iv, ct: obj.ct }, key)); }
    catch (e) { throw new Error('口令不正确'); }
  }

  global.AccountCrypto = { sha256, deriveKey, encrypt, decrypt, checkPhone, SALT };
  global.Cloud = { cfg, setCfg, ses, setSes, ready, req, signUp, signIn, mail, cbInit, cbGet, cbPut, uid: () => cbUid };
  global.Account = { register, login, logout, push, pull, who, synced, ready, acctId, exportCode, importCode };
})(window);
