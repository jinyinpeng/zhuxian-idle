/* 把 play3d.html 里的 <script type="module"> 抽出来单独做语法检查。
 *
 * 为什么需要它：3D 页的全部逻辑都塞在 HTML 内的一个模块里，任何一个手滑的括号
 * 都会让**整个模块不执行** —— 表现是加载页永远停在"正在构筑洞天…"，
 * 而浏览器控制台之外的任何检查都看不出来。这个脚本让发版前能用 node 查一遍。
 *
 * 用法：node tools/check-3d-module.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'play3d.html');
const tag = '<script type="module">';
const src = fs.readFileSync(file, 'utf8');

/* 注释里也提到过这个标签，所以只认"行首"的那个真标签 */
const m = src.match(new RegExp('\\n' + tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
if (!m) { console.error('未找到 <script type="module"> 标签'); process.exit(2); }
const start = m.index + 1;
const end = src.indexOf('</script>', start);
const js = src.slice(start + tag.length, end);

const out = path.join(os.tmpdir(), 'zx3d-module-check.mjs');
fs.writeFileSync(out, js);
console.log('已抽出模块 ' + js.length + ' 字符 → ' + out);
console.log('接着执行:  node --check "' + out + '"');
