# 《诛仙问道》扩展为完整修仙养成体系 · 系统设计与落地路线

> 本文是**设计文档**，不是代码。所有结论都基于两件事：
> ① 现有代码的真实盘点（见第 1 节，带文件名与行数）；
> ② 修仙品类通行的系统结构（境界/灵根/功法/丹道/宗门/奇遇）。

---

## 0. 先澄清一件必须澄清的事：参考目录

你给的路径 `C:\Program Files\Tencent\Androws\Application\5.10.7400.6506` 我实测了：

```
EXISTS: C:\Program Files\Tencent\Androws\Application\5.10.7400.6506
内容: AndrowsBox / Driver / imageformats / i18n / iconengines / leigod / log / font ...
体积: 937.5 MB
```

**这是「腾讯手游助手」这个模拟器本身的程序目录，不是任何游戏的资源目录。**

- 真正的手游资源在模拟器的 **Android 虚拟磁盘镜像**里（由 `AndrowsBox` 管理的虚拟盘），不是可以直接读取的游戏文件；
- 从模拟器里提取他人商业游戏的资源（美术 / 表结构 / 文案）也**涉及版权**，我不会这么做。

**所以本文的设计路线是：机制层参考品类通行做法（玩法机制不受版权保护），美术与文案一律自制。**
你现在这套立绘、门派、技能名都是自制路线，后续应保持。

---

## 1. 现状盘点（基于真实代码，不是设想）

| 文件 | 体积 | 已具备的能力 | 扩新系统时能复用什么 |
|---|---|---|---|
| `js/core.js` | 46KB | 战斗主循环 `tick`、技能状态机（含举剑）、掉落、装备/强化、寻宝、挂机、存档 | **事件总线 `emit/on`**、`C` 战斗上下文、`tick` 时间轴 |
| `js/data.js` | 22KB | 门派 `SECTS`、技能模板 `SKILL_TEMPLATES`、词条 `AFFIXES`、部位 `SLOTS`、区域 `REGIONS`、潜能 `POTENTIAL` | **所有新表都照它的写法加** |
| `js/render.js` | 55KB | 场景、立绘挂载、伤害数字、技能特效（25 套）、动作编排 | 特效基元、`unitPos`、`floatText` |
| `js/ui.js` | 86KB | 面板框架 `openSheet/openModal`、行囊/技能/社交/设置、面板签名去重 | **面板模板**（每个新系统一个 sheet） |
| `js/figure.js` + `figure-motion.js` + `hero-female.js` + `mob-art.js` + `skeleton.js` | 95KB | 立绘选择、身体/手臂分层、动作系统、门派矢量立绘 | `--arm` 姿态通道、动作模式表 |
| `js/music.js` | 9KB | WebAudio 程序化配乐（无音频素材） | 换曲风 / 加战斗乐段 |
| `js/account.js` + `js/tcb-sdk.js` | 768KB | 账号、云存档（零知识） | **做交易/宗门前必须先补齐服务端** |
| 合计 | **7208 行 JS / 47 个美术资源** | GitHub Pages 零构建部署 | — |

**三条关键结论**

1. 现有架构是「**单页 + 无打包 + 事件驱动**」。扩系统**不需要换技术栈**，换栈的收益远小于代价。
2. 每次发版都要同步改 **三处版本号**（`index.html` 的 `?v=`、`CUR`、`version.json`），新模块必须在 `index.html` 里带 `?v=` 引入 —— 这是本项目最容易漏的一步。
3. 最大的技术债不是框架，而是 **`ui.js` 86KB 单文件** 与 **存档 schema 无迁移机制**。加系统前先解决这两件事。

---

## 2. 技术选型

### 保持现状（推荐）

| 维度 | 选型 | 理由 |
|---|---|---|
| 语言 | 原生 JS（现有 ES5 风格 + 少量 ES6） | 无构建、刷新即生效，改一行的反馈是 1 秒 |
| 构建 | 无（GitHub Pages 直出） | 现网已在跑；引入 Vite 要改部署链路，收益仅限开发体验 |
| 渲染 | DOM + CSS（现状） | 立绘是位图 + 分层 + CSS 变换，已调好；换 Canvas/WebGL 等于重写 |
| 存档 | `localStorage` + 可选云同步 | 现成；云同步走 `tcb-sdk` |
| 数据表 | 独立 `js/data-*.js` | **把新系统的表从 `data.js` 拆出去**，别让单文件继续膨胀 |

### 什么时候才值得换栈

满足**任意两条**再考虑迁 Vite + TypeScript：
- 需要 3 人以上并行改同一批文件；
- 单文件超过 150KB 且改一处总要全局搜索；
- 数值表需要非程序员（策划）直接编辑 → 那时应迁到 **JSON + 校验脚本**，而不是先上框架。

迁移路径（若将来要做）：`data.js` → `data/*.json` + 加载器 → 再上 Vite 打包 → 最后才考虑 TS。**分三步，每步都能独立上线。**

### 现在就该补的两件地基

1. **存档 schema 版本化**：`save.v` 字段 + `MIGRATIONS[v]` 迁移函数链。加新系统的第一件事就是加一条迁移，否则老玩家存档一进新版本就炸。
2. **数据表校验**：一个 `tools/validate-data.js`，发版前跑一遍（字段齐不齐、id 有没有重复、概率和是否为 1）。**修仙游戏 90% 的线上事故来自表里一个手滑的数字。**

---

## 3. 架构设计

### 分层（与现有代码一致，只是把边界写死）

```
输入层  ui.js 的 data-act 事件
          ↓  只发意图，不碰状态
逻辑层  core.js / 各新模块（境界、灵根、功法…）
          ↓  改状态后 emit 事件
事件层  G.on / emit（现有）
          ↓
表现层  render.js（场景/特效） + ui.js（面板）
          ↓  只读状态，不改状态
```

**三条铁律**（现有代码基本遵守，扩系统时别破）：

1. `render.js` **不许改状态**，只能读 + 画；
2. `core.js` 与新逻辑模块 **不许碰 DOM**（唯一例外是 `--hold`/`--arm` 这类姿态 CSS 变量，它属于"表现层的输入"，可以写）；
3. 任何"改数值"的操作都必须经过一个**返回 `{ok, why}` 的函数**（现有 `G.canUse` 就是这个模式），界面只负责把 `why` 翻成人话。**这一条直接决定玩家能不能看懂系统。**

### 每个新系统的统一模板（照抄即可）

```js
// js/<system>.js
(function (global) {
  'use strict';
  // 状态切片挂在 G 上，如 G.realm
  function init()   { /* 建默认值（老存档缺字段时兜底） */ }
  function tick(dt) { /* 挂机推进，由 core.tick 调用 */ }
  function can(k, arg) { return { ok: true, why: '' }; }   // 前置条件判定
  function run(k, arg) { /* 改状态 + emit('realm:break', ...) */ }
  global.Realm = { init, tick, can, break: run };
})(window);
```

---

## 4. 模块划分（新增文件清单）

| 系统 | 新文件 | 依赖 | 面板（ui.js 里加一个 sheet） |
|---|---|---|---|
| 境界突破 | `js/realm.js` | core 的 tick、itemPower | 境界页：修为条 + 突破按钮 + 成功率明细 |
| 灵根属性 | `js/spirit-root.js` | realm | 灵根页：五行盘 + 洗炼 |
| 功法修炼 | `js/technique.js` | data、realm | 功法页：装配槽 + 熟练度 |
| 任务 | `js/quest.js` | core 事件 | 任务页：主线/日常/宗门三栏 |
| 副本 | `js/dungeon.js` | core 战斗、quest | 副本页：层数 + 首通 + 扫荡 |
| 战斗改造 | 改 `core.js`（分段） | — | 无新面板 |
| 宗门/组队 | `js/guild.js` | **服务端** | 宗门页：成员/贡献/申请 |
| 交易 | `js/market.js` | **服务端** | 拍卖行：挂单/竞拍/成交记录 |
| 炼丹 | `js/alchemy.js` | data、market | 丹房页：丹方 + 火候 |
| 地图/奇遇 | `js/worldmap.js` + `js/encounter.js` | data.REGIONS、quest | 地图页：节点图 + 奇遇弹窗 |

**每个文件都遵守第 3 节的模板**，`index.html` 里按依赖顺序引入并带上 `?v=`。

---

## 5. 数据结构（可直接照用的字段）

### 5.1 境界（`data-realm.js`）

```js
const REALMS = [
  { id:'lianqi', name:'炼气期', layers:13, need:(l)=>Math.floor(120*Math.pow(1.17,l)),
    power:0.06, cap:{atk:1.0,hp:1.0}, trial:null },
  { id:'zhuji',  name:'筑基期', layers:3,  need:(l)=>Math.floor(2400*Math.pow(1.45,l)),
    power:0.12, cap:{atk:1.3,hp:1.3}, trial:{ lv:20, mob:'trial_zhuji', rate:0.55 } },
  { id:'jindan', name:'金丹期', layers:9,  need:(l)=>Math.floor(15000*Math.pow(1.5,l)),
    power:0.2,  cap:{atk:1.7,hp:1.6}, trial:{ lv:45, mob:'trial_jindan', rate:0.45 } }
  // 元婴 / 化神 / 炼虚 … 先做 3 个大境界，够玩 200 小时
];
```

**要点**：`need` 用**指数**而非线性；`power` 是大境界的**乘区**（不是加算）；`trial` 让"大境界"有仪式感 —— 小境界点一下，大境界要打一场。

### 5.2 灵根（`data-root.js`）

```js
const ROOTS = [
  { id:'jin',  name:'金', hue:45,  bonus:{atk:0.08},    techMul:{jin:1.25, mu:0.85} },
  { id:'mu',   name:'木', hue:135, bonus:{hp:0.10},     techMul:{mu:1.25,  tu:0.85} },
  { id:'shui', name:'水', hue:200, bonus:{mpRegen:0.2}, techMul:{shui:1.25,huo:0.85} },
  { id:'huo',  name:'火', hue:15,  bonus:{crit:0.03},   techMul:{huo:1.25, jin:0.85} },
  { id:'tu',   name:'土', hue:35,  bonus:{def:0.10},    techMul:{tu:1.25,  shui:0.85} },
  { id:'lei',  name:'雷(变异)', hue:270, bonus:{critDmg:0.2}, techMul:{}, rare:0.02 }
];
// 玩家: G.roots = [{ id:'huo', grade:0.72 }, { id:'mu', grade:0.31 }]
```

**要点**：灵根**必须能改变 build**（`techMul` 让同门功法在不同灵根下效率差 2~3 倍），不能只是"火灵根 +3% 攻击"。`grade` 是品阶，决定洗炼上限。

### 5.3 功法（`data-technique.js`）

```js
const TECHNIQUES = [
  { id:'qingyun_jianjue', name:'青云剑诀', element:'jin', from:'qingyun',
    type:'passive', req:{ realm:'zhuji' },
    eff:[{k:'atkPct',v:0.18}], prof:{ per:0.012, max:1.6 } },   // 熟练度每级 +1.2%
  { id:'fentian_jue', name:'焚天诀', element:'huo', from:'fenxiang',
    type:'active', req:{ realm:'jindan', root:'huo' },
    mp:38, cd:9, dmg:{ ratio:4.2, hits:1, burn:{ratio:0.4,dur:4} }, raise:true }
];
// 玩家: G.tech = { slots:['qingyun_jianjue','',''], prof:{ qingyun_jianjue:38 } }
```

**与现有技能的关系**：`SKILL_TEMPLATES`（s1~s5）保留为**门派基础招式**，功法是**可装配的上位选择**。`active` 功法**直接复用现成技能管线**（举剑 / 冷却 / 内力三段判定一行不用改）—— 这是这套数据设计最大的复用红利。

### 5.4 丹方与炼丹（`data-alchemy.js`）

```js
const RECIPES = [
  { id:'huiling_dan', name:'回灵丹', tier:1, need:{ herb_ling:3, herb_yun:1 },
    fire:[0.40,0.70], time:8, out:{ item:'huiling_dan', n:[1,3] },
    effects:[{k:'mpRestore',v:0.3}] },
  { id:'zhuji_dan', name:'筑基丹', tier:3, need:{ herb_zhuji:1, core_jindan:2, herb_ling:9 },
    fire:[0.62,0.74], time:30, out:{ item:'zhuji_dan', n:[1,1] },
    breakthrough:{ rate:0.25 } }
];
// 玩家: G.alchemy = { learned:['huiling_dan'], fireSkill:0.61, mats:{} }
```

**火候**是炼丹的核心手感：`fire` 是**区间**，`fireSkill` 落在区间内成功；越接近区间中心出丹越多。**这与现有强化系统同构，写一套概率模型就够。**

### 5.5 副本 / 地图 / 奇遇

```js
const DUNGEONS = [
  { id:'moyuan', name:'魔渊古洞', layers:30, lv:[20,60], cost:{ stam:6 },
    rewards:[{k:'gold',v:[1200,2600]},{k:'item',pool:'t3_equip',roll:2}],
    firstClear:{ item:'moyuan_chest' }, sweep:{ need:1 } }   // 通关该层后可扫荡
];
const MAP_NODES = [
  { id:'qingshi', name:'青石镇', x:12, y:70, unlock:{ lv:1 }, links:['houshan'],
    enc:[{ id:'old_man', w:8 }, { id:'bandit', w:5, fight:true }] }
];
const ENCOUNTERS = [
  { id:'old_man', once:true, text:'老者拦路…',
    choices:[ { t:'给他灵石', cost:{gold:500}, gain:{ item:'map_frag', n:1 } },
              { t:'不理会',   gain:{ exp:120 } } ] }
];
```

**奇遇的本质是"选择 + 权重"**：`enc` 是**加权表**（`w` 越大越常见）；`once` 保证剧情只出一次；选项要有**代价**，否则玩家永远点最赚的那个，奇遇就失去意义。

### 5.6 存档 schema 分片

```js
G.save = {
  v: 31,                       // ← schema 版本，加字段必须 +1
  level, exp, hp, mp, gold, yuanbao,
  sect, gender, equipped, bag, skills, pot, stats,
  realm:   { id:'lianqi', layer:7, exp:320, fails:1 },
  roots:   [ { id:'huo', grade:0.72 } ],
  tech:    { slots:['qingyun_jianjue','',''], prof:{} },
  quest:   { main:3, daily:{ day:26, list:[] }, guild:0 },
  dungeon: { cleared:{ moyuan:18 }, sweepCd:0 },
  alchemy: { learned:[], fireSkill:0.6, mats:{} },
  map:     { at:'qingshi', found:['houshan'], enc:{} },
  guild:   null, market: { orders:[] }
};
```

---

## 6. 核心玩法逻辑

### 6.1 境界突破：瓶颈要有代价

```
小境界（1→2→…→13）：消耗修为 → 直接成功（进度感，不该卡人）
大境界（炼气→筑基）：消耗修为 + 丹药 → 进入突破试炼
   成功率 = 基础(0.55) + 丹药(0.25) + 灵根契合(0~0.15) + 功法(0~0.10)
   失败：修为清零 + "道伤"debuff（恢复期内属性 -15%），**境界不掉**
```

**关键判断**：失败**不掉境界**。掉境界会让玩家不敢点，而修仙的爽点在"我敢冲"。惩罚要是**机会成本**，不是**剥夺**。

### 6.2 灵根：影响"能不能用"而不是"强多少"

灵根决定三件事：功法效率倍率、突破成功率修正、**部分功法的装配资格**（火灵根才能装焚天诀）。这样洗灵根才真的纠结 —— **有取舍才有养成**。

### 6.3 功法修炼：装配槽 + 熟练度

- 3 个装配槽（随境界解锁到 5 个）；
- `passive` 常驻加属性，`active` 进技能栏；
- 熟练度靠**使用**生长（挂机自动涨），收益递减 —— 让"挂机"直接产出成长，与现有定位一致。

### 6.4 任务与副本：给挂机装"目标"

| 类型 | 产出 | 说明 |
|---|---|---|
| 主线 | 功能解锁（灵根/功法/炼丹） | 主线不发数值，发**系统** |
| 日常 | 灵石 / 丹药材料 | 每天 5 条，挂机自动完成 2~3 条 |
| 宗门 | 贡献 | 兑换宗门专属功法 |
| 副本 | 装备 / 材料 | 相同战斗，加**层数推进 + 首通奖励 + 扫荡** |

**扫荡是必需的**：玩家讨厌重复劳动，但喜欢"我打得过"。扫荡把"重复"换成"决策"（先扫哪层）。

### 6.5 战斗：**挂机即时 + BOSS 回合制**混合

- **挂机 / 小怪：保持即时制**（`tick` 驱动）—— 这是本项目定位，不要动；
- **大境界试炼 / 副本 BOSS：切回合制**（每回合从 4~5 个技能里选一个）。

为什么混合：全即时会让 BOSS 战变成数值比拼，全回合会砍掉挂机玩法。**代价只是 `core.js` 里多一个 `C.mode` 分支**，两种玩法都保住。

### 6.6 社交：先做能异步做的

| 玩法 | 只靠现有云存档 | 建议 |
|---|---|---|
| 好友 / 赠礼 | ✅ 已有 | 保持 |
| 组队协战 | ⚠️ 可"异步"：借好友角色当助战 | **先做这个** |
| 宗门 | ❌ 需要服务端权威 | 二期 |
| 交易 / 拍卖 | ❌ 需要服务端校验 | 最后做 |

**"异步组队"是无服务端情况下性价比最高的社交玩法**：从好友里选一个"助战真灵"，进副本时出场若干回合 —— 不需要实时同步，不需要防作弊。

### 6.7 装备与炼丹：复用比新建更划算

- 装备：沿用 `SLOTS` + `AFFIXES` + `quality`，只加**套装**（2/4 件套效果）与**灵纹**（可拆镶嵌）；
- 炼丹：`RECIPES` + 火候 + 材料产出链（材料来自副本与地图），与强化同构。

### 6.8 地图探索与奇遇：给"看画面"一个理由

现在是纯挂机（玩家只看数字）。地图加进来后：节点解锁 → 移动 → 触发奇遇 → 做选择 → 拿东西。**这是让美术与场景重新产生价值的地方**（现在场景只是背景板）。

---

## 7. 开发步骤（六期，每期都能独立上线）

| 期 | 内容 | 主要改动 | 验收标准 |
|---|---|---|---|
| **P0 地基** | 存档 schema + 迁移链；数据表校验脚本；拆 `data-*.js` | core/data/tools | 老存档升级无报错；校验脚本进发版流程 |
| **P1 境界** | `realm.js` + 境界页 + 突破试炼（沿用现有战斗） | 新文件 + 1 sheet | 炼气→筑基完整走通，失败有道伤 |
| **P2 灵根+功法** | `spirit-root.js` + `technique.js` + 装配界面 | 新文件 + 2 sheet | 同门功法在不同灵根下效率差 ≥2 倍 |
| **P3 炼丹** | `alchemy.js` + 丹房 + 材料产出 | 新文件 + 1 sheet | 丹药能影响突破成功率（闭环） |
| **P4 任务+副本** | `quest.js` + `dungeon.js` + 扫荡 | 新文件 + 2 sheet | 挂机 1 小时能完成日常并推进副本层数 |
| **P5 地图+奇遇** | `worldmap.js` + `encounter.js` | 新文件 + 1 sheet | ≥12 节点、≥20 奇遇事件 |
| **P6 社交** | 组队助战 → 宗门 → 交易 | 需要服务端 | 见第 8 节 |

**每期的固定动作**（照做不翻车）：
1. 先在 `data-*.js` 里把表定下来；
2. `index.html` 引入新文件 + **三处版本号同步**；
3. 面板照 `ui.js` 现有 sheet 模板写，别新造框架；
4. 发版前跑数据校验 + 离线把主要流程点一遍。

---

## 8. 风险与不可做的事

### 必须承认的技术边界

1. **交易与宗门需要服务端权威**。现在 `tcb-sdk.js` 只做**零知识云存档**（存加密后的存档 blob），**不能用来做交易校验**。要上拍卖行，必须先补：服务端物品表校验、事务性扣减、防复制（否则改本地存档就能刷装备）。
2. **内容量才是修仙游戏的真成本**。代码占 20%，剩下 80% 是表：境界、功法、丹方、副本、奇遇文本。**每期只上"够玩 10 小时"的表量**，别一次铺 200 个功法然后全是占位名。
3. **不复制他人资源**。机制可以参考，美术、文案、表结构照搬不行。
4. **性能**。已踩过：面板打开时的毛玻璃 + 立绘多层阴影会明显掉帧（已用 `html.ui-busy` 降载修掉）。新面板要沿用同一套降载开关，别新开一个不受控的重面板。

### 一句话总结

**不要换技术栈，先补地基（存档迁移 + 数据校验），再按「境界 → 灵根功法 → 炼丹 → 任务副本 → 地图奇遇 → 社交」推进；每期以"玩家能立刻感知到变强"为验收标准。**
