/* ============================================================================
 * three.js 本地化脚本
 * ----------------------------------------------------------------------------
 * 作用：把 three 包里「play3d.html 真正用到」的文件拷进 assets/three/，
 *       让 3D 页不再依赖 unpkg CDN（断网也能打开）。
 *
 * 为什么不是整目录拷贝：three 的 examples/jsm 有 20.5MB；
 *   从入口递归解析相对 import 后只剩 13 个文件、0.83MB。
 *
 * 用法（升级 three 时重跑）：
 *   npm install three@0.160.0 --no-save
 *   node tools/localize-three.cjs
 *   然后按输出确认「裸名 import」只有 three 一项，再发布。
 *
 * 注意：assets/three/ 下的文件由本脚本生成，不要手改。
 * ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const THREE = path.join(ROOT, 'node_modules', 'three');
const JSM = path.join(THREE, 'examples', 'jsm');
const OUT = path.join(ROOT, 'assets', 'three');

/* play3d.html 里 import 的 addon 入口（改 play3d.html 的 import 时同步这里） */
const ENTRIES = [
  'controls/OrbitControls.js',
  'environments/RoomEnvironment.js',
  'loaders/GLTFLoader.js',
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js'
];

if (!fs.existsSync(THREE)) {
  console.error('✗ 找不到 node_modules/three，请先：npm install three@0.160.0 --no-save');
  process.exit(1);
}

/* ---------- 1. 递归收集可达文件（相对 import 才需要拷） ---------- */
const seen = new Set();
const queue = [...ENTRIES];
const missing = [];
const bare = new Set();

while (queue.length) {
  const rel = queue.shift();
  if (seen.has(rel)) continue;
  seen.add(rel);
  const src = path.join(JSM, rel);
  if (!fs.existsSync(src)) { missing.push(rel); continue; }
  const code = fs.readFileSync(src, 'utf8');

  const relRe = /(?:from|import)\s*['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = relRe.exec(code))) {
    const dep = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1]));
    if (!seen.has(dep)) queue.push(dep);
  }
  /* 只看可执行的 import/export 语句，避开注释里的示例 URL */
  const bareRe = /^\s*(?:import|export)[\s\S]{0,400}?from\s*['"]([^'".][^'"]*)['"]/gm;
  while ((m = bareRe.exec(code))) bare.add(m[1]);
}

/* ---------- 2. 拷贝（three 本体用压缩版） ---------- */
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const coreName = 'three.module.min.js';
fs.copyFileSync(path.join(THREE, 'build', coreName), path.join(OUT, coreName));
let total = fs.statSync(path.join(OUT, coreName)).size;

for (const rel of seen) {
  const src = path.join(JSM, rel);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(OUT, 'addons', rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  total += fs.statSync(dst).size;
}

/* ---------- 3. 报告 ---------- */
const unexpected = [...bare].filter(b => b !== 'three');
console.log('=== three.js 本地化完成 ===');
console.log('  输出 = assets/three/');
console.log('  文件数 = ' + (seen.size + 1) + '（含 three 本体）');
console.log('  合计 = ' + (total / 1024 / 1024).toFixed(2) + ' MB');
console.log('  third-party 裸名 import = ' + (unexpected.length ? '⚠ ' + unexpected.join(', ') : '无（只有 three，已由 importmap 覆盖）'));
if (missing.length) console.log('  ⚠ 缺失文件 = ' + missing.join(', '));
console.log('\n  importmap 应写成：');
console.log('    { "imports": { "three": "assets/three/three.module.min.js",');
console.log('                   "three/addons/": "assets/three/addons/" } }');
process.exit(unexpected.length || missing.length ? 1 : 0);
