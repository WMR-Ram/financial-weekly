# 财经周报（financial-weekly）

每周一 09:00 自动生成的中文财经周报，静态页面部署在 GitHub Pages，覆盖**上一个自然周**（ISO 周号，周一 00:00 至周日 24:00）。
一份周报 16 节，从全球行情、资金与筹码、期指多空持仓，一路写到科技链拆解、情景推演与财经日历。

- 线上地址：<https://wmr-ram.github.io/financial-weekly/>
- 生成方式：Qoder 定时任务，无人工干预；作者维护的是[规范文件](./REPORT_SPEC.md)，页面由任务按规范产出
- 内容含个人持仓相关指数的分析，仅作研究记录，**不构成投资建议**，也不给加减仓比例
- 姊妹站：[财经早报 · financial-morning-post](https://github.com/WMR-Ram/financial-morning-post)（每交易日 09:20 盘前 + 15:30 收盘验证）

## 更新与覆盖规则

| | |
|---|---|
| 调度 | cron `0 9 * * 1`（Asia/Shanghai），每周一一次 |
| 文件名 | `weeks/<被覆盖那一周的 ISO 周号>.html`，例如 11-09 发布的是 `2026-W45.html` |
| 幂等 | 无论该周文件在不在，每次运行都**重新取数、重新生成并覆盖**，摘要写明"新建还是覆盖" |
| 归档 | `index.html` 每次扫描 `weeks/` 整体重建，按周倒序，每期带一句话结论 |
| 补跑 | 手工触发也覆盖同一周文件，不另建文件名 |

## 页面结构

固定 16 节，顺序不随行情变化（`id` 与编号一致）：

```
00 核心结论            ≤5 条，先判断后依据，20 秒读完
01 上周全球市场速览    行情条 + 周内轨迹 + 资产全景表（商品期货保留在这里，不单独成节）
02 资金与筹码          成交额、两融、宽基 ETF 资金探针、涨跌分布、行业换手率分位
03 股指期货多空持仓    IF/IH/IC/IM 主力合约前 20 会员多/空总量与周变化，配基差
04 科技细分链条拆解    CPO/半导体/存储/消费电子逐条链条的资金、价、量与拥挤度
05 国内宏观与政策      开头先给一句话总结，再逐条给主体、生效日期与市场作用点
06 海外宏观与政策      同上口径
07 政策与数据变动雷达  表格化四态追踪：已公布 → 已解读 → 细则/生效 → 落地承接
08 A股市场结构分析     风格、行业、大小盘、拥挤度与估值分位
09 汇率与债券          在岸/离岸、国债收益率曲线、股债性价比 1/PE − 10Y
10 我的持仓关联分析    逐个标的：表现、驱动、当前位置、风险信号、下一批事件（不按金额加权）
11 本周情景推演        每个关键标的乐观/基准/悲观三情景 + 触发条件 + 证伪信号（标题带本周日期区间）
12 本周财经日历        按日排事件，区分"已排期确定"与"市场预期"
13 机构与分析师观点摘编 只摘编可核验的公开观点，标机构与日期
14 工具层提醒          数据口径、接口可用性、本期取数失败项
15 数据来源、待核清单与本期纠错  全局连续编号 1—N
```

正文与图注不写括号式来源，一律 `<sup>[n]</sup>` 指向文末来源表；核不准的数字打 ⚠️ 并进待核清单。

## 目录

```
index.html                 归档首页，每次运行整体重建
weeks/<YYYY-Wnn>.html      单期周报详情页
data/<YYYY-Wnn>.json       该周结构化快照（行情条兜底、图表数据、来源清单）
REPORT_SPEC.md             唯一权威规范：口径、板块、数据源、硬约束都改这里
assets/css/theme.css       深色金融终端风（涨红跌绿）
assets/js/ticker.js        顶部行情条，双源轮询
assets/js/chart.js         零依赖内联 SVG 图表（fwBar / fwGroup / fwLine）
assets/fetch_bk_week.js    东财板块周度涨跌、成交额与逐日资金流
assets/fetch_cffex_rank.js 中金所期指会员多空持仓排名
assets/fetch_concept_flows.js 概念板块资金流
assets/fetch_etf_anchor.js 各宽基指数锚 ETF 的规模与跟踪指数
assets/check.js            发布前自检，不通过不发布
_qa/                       本地取数草稿与探针脚本，已 .gitignore 排除，不会进仓库
```

`REPORT_SPEC.md` 与定时任务提示词的关系是：提示词只把运行指回规范。调口径、换板块、改数据源都改规范文件，不用改任务。

## 数据源优先级

分三层，每次运行从上层往下退：

1. **A 级官方原文**：人民银行、财政部、统计局、证监会、海关总署、上交所/深交所/中金所、Fed 与美债数据页。政策与法规只引原文页。
2. **B 级结构化数据**：`today_investment_financial_data` MCP。它自 2026-11-02 起资源包失效（连接在，返回 `40001 您无可用的资源包`），每次运行先探一次，不通就整批走第 3 层。
3. **公开接口**（现在的默认路线，字段口径全部实测过，写在规范 §2.5 / §2.5.1）：
   - 指数与板块日线、逐日资金流：`push2his.eastmoney.com`
   - 涨停/跌停池：`push2ex.eastmoney.com`
   - 两融：`datacenter-web.eastmoney.com`（`RPTA_RZRQ_LSHJ`）
   - ETF 规模与跟踪指数：`fundmobapi.eastmoney.com`（定期报告期末净资产，非实时）
   - 基金净值与重仓：`fund.eastmoney.com/pingzhongdata`
   - SHIBOR/中间价：中国货币网；国债收益率：东财 `171.*`
   - 指数估值分位：蛋卷 `djapi`；境外指数：腾讯 `qt.gtimg.cn`；A50 期指：新浪 `hq.sinajs.cn`（无 CORS，只能生成时抓取）
   - 期指会员持仓：中金所官网（走 `assets/fetch_cffex_rank.js`）
   - 政策、叙事、机构观点：WebSearch / WebFetch，每期至少 3 组关键词，官方 + 一家头部媒体交叉

**禁止因为取不到就用模型记忆补数**；取不到就标 ⚠️、写进待核清单，下期继续追。

### 已付过学费的口径陷阱

- 东财 `100.NDX` 是**纳斯达克综合**，纳指 100 要用 `100.NDX100`；`124.HSI` 返回空，恒指是 `100.HSI`。
- 两融 `RZRQYE` 原值单位是**元**，除以 `1e8` 得亿元——W44 曾错一个数量级，公开纠错记在 W45。
- 涨停池/跌停池**忽略 `date` 参数**，且周一早间当日池还没生成（实测返回 `rc:102`、`data:null`），上周逐日家数只能靠媒体复盘并标"口径＝快照"。
- 东财行业分类 `BKxxxx` **与申万一级不等价**，引用必须写明是东财口径。
- 蛋卷的估值分位窗口**不等于中证五年分位**；它也没有 000510 中证A500 和标普红利低波50。
- 涨跌家数分布原先走 MCP 的 `get_market_change_ratio_status`，**该接口只能取实时、无历史回溯**；停用后上周收盘分布只能用媒体收评与涨跌停历史表交叉核实。
- 美国财政部日度收益率 CSV 在本机 fetch failed，改用东财 `171.*`。
- IC／IM 无连续合约代码，期指基差属固定缺口，每期直接标 ⚠️，不再反复试。
- 标普红利低波50（`SPCLLHCP`）没有公开的日频指数行情页（官网 403），用跟踪 ETF `1.515450` 的二级收盘价作**代理**，必须写明含费用与折溢价、非指数原值。

## 本地跑一遍

```bash
cd E:/financial-weekly
node assets/fetch_bk_week.js 2026-11-02 2026-11-06 BK0917 BK1036   # 板块周度资金流（必须给板块代码，自带恒等式校验）
node assets/fetch_cffex_rank.js 2026-11-05 2026-11-06     # 期指会员多空持仓排名
node assets/fetch_etf_anchor.js                           # 锚 ETF 规模与跟踪指数
node assets/check.js E:/financial-weekly                  # 全站自检，FAIL 就不该发布
```

`check.js` 卡的是：JS 语法、JSON 合法性、HTML 标签闭合、图表容器与脚本调用 id 一致、行情条快照齐全、
`noindex` 存在、编号引用能在文末来源表里找到、相对链接指向的文件真的存在、全站资源版本号一致。
（每张表的 `<thead>` 是窄屏堆叠渲染的前提，周报的 `check.js` 没把它写成硬检查项；姊妹仓早报的 `check.js` 已经卡这条。）

## 已知设计约束

- **图表不许出现滚动条**：`chart.js` 让 SVG 宽度等于容器宽度、容器 `overflow:hidden`、高度由图表自算；
  类目挤了就自动换成横向条形图（标签在左完整显示、数值写在条端），折线按宽度抽稀 x 轴刻度。
  旧的"放大 + 横滚"方案里 `overflow-x:auto` 会连带把 `overflow-y` 变成 auto，手机上必须上下滑才看得全，2026-11-02 被否掉。
- 表格不统一设 `min-width`；`ticker.js` 给每张表包滚动容器、从表头写 `data-label`、列数 ≥3 标 `data-stack="1"`，
  窄屏渲染成"一行一卡"。所以每张表必须有 `<thead>` 且表头文字要短。
- 改过 `assets/` 下任何文件，全站 `?v=YYYY-MM-DDx` 必须递增一位且各页一致，否则缓存让修复看起来没生效。
- 行情条自适应轮询：盘中约 8 秒、非盘中约 90 秒、失败指数退避至多 8 倍，页面隐藏时暂停；单次请求 ≤15 条 secid。
- 每页带 `<meta name="robots" content="noindex,nofollow">`，因为页面含持仓信息；仓库是公开的，git 历史删不干净，链接别外传。

## 发布与回退

1. `git push`（走 github.com）。本机到 `github.com:443` 时常 TLS 超时或连接被重置，失败间隔 5—10 秒重试至多 3 次。
2. 仍失败 → **GitHub Data API**（`api.github.com` 通常可用）逐文件提交：
   blob（base64 且**必须显式带 `encoding:"base64"`**，缺省时 GitHub 把编码串当正文入库）→ tree（`base_tree` 取远端 head）→
   commit → `PATCH /git/refs/heads/main`，`force` 必须传真布尔 `false`（`-f force=false` 会被 gh 传成字符串并返回 422，须用 `--input`）。
   注意 `--input` 会整体替换请求体，之后再 `--field` 会被忽略。
3. **不 force push**；API 提交造成同内容不同 sha 的分叉，恢复连通后 `git pull --no-rebase` 合并即可。
4. **禁止用关闭证书校验绕过 TLS 错误**（`sslVerify=false`、`schannelCheckRevoke=false` 都不行）——那是 CRL 取不到，不是证书无效。
5. 提交后 `curl` 验证首页 200（Pages 构建 1—3 分钟，404 就等）。

git 提交身份配置在本仓库 local config 里，不动全局配置。本 README 不参与站点渲染，Pages 用的是根目录 `index.html`。
