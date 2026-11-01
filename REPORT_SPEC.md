# 财经周报生成规范（REPORT_SPEC）

> 本文件是每周一定时任务的**唯一权威说明**。定时任务只负责读取并执行本文件，
> 不要在任务提示词里另立规则；如需调整口径/板块/数据源，改这个文件即可。

## 0. 基本信息

- 站点目录（本地工作区）：`E:\financial-weekly`
- 线上地址：`https://wmr-ram.github.io/financial-weekly/`（GitHub Pages，仓库 `WMR-Ram/financial-weekly`，公开）
- 调度：每周一 09:00（Asia/Shanghai）
- 覆盖区间：**上一周** = 上一个自然周（周一 00:00 至周日 24:00）；A股交易周为其中的交易日
- 输出语言：简体中文。数字用阿拉伯数字，百分比保留 2 位小数。

## 1. 文件产物与命名

每周生成/更新：

1. `weeks/<ISO周号>.html` —— 本周详情页，例如 `weeks/2026-W44.html`。
   `<ISO周号>` 用**被覆盖那一周**的 ISO 周编号（不是发布日所在周）。
2. `data/<ISO周号>.json` —— 该周结构化快照（行情条兜底数据、图表数据、来源清单）。
3. `index.html` —— 归档首页，卡片列表按周倒序，含每期一句话结论。**每次重新扫描 `weeks/` 目录重建**，不要追加式改动。
4. 公共资产 `assets/css/theme.css`、`assets/js/ticker.js`、`assets/js/chart.js` 已存在，
   **只在该周需要新组件时追加，禁止重写或改变既有函数签名**（历史周报依赖它们）。

周报 HTML 必须：`<meta name="robots" content="noindex,nofollow">`（页面含持仓信息，避免被搜索引擎收录）。

## 2. 数据源优先级（权威性排序）

A 级（官方原文，必须优先引用）：中国人民银行 `pbc.gov.cn`、财政部 `mof.gov.cn`、国家统计局 `stats.gov.cn`、
证监会 `csrc.gov.cn`、海关总署 `customs.gov.cn`、交易所 `sse.com.cn` / `szse.cn` / `cffex.com.cn`、
美联储 `federalreserve.gov`、美国财政部 `treasury.gov`、BLS `bls.gov`、CME FedWatch。

B 级（本地 MCP `today_investment_financial_data`，287 个工具，数字口径主源）：
指数行情 `get_index_realtime_quotes` / `get_index_range_gains` / `list_index_quote_barch`；
行业 `list_industry_quote` / `get_industry_realtime_quote` / `list_industry_rotation`；
资金 `list_fund_flow` / `list_stock_margin_trade_totals` / `list_econ_china_dr_rates`；
宏观 `list_money_supplies` / `list_economic_cn_cpi` / `list_economic_cn_ppi` / `list_macro_fiscal_exp` / `list_social_financing_sto`；
利率债 `list_gover_bond_yield` / `list_bonds_yield_curve` / `list_money_market_repo_in`；
海外宏观 `list_fred_macro_ind` / `list_bundesbank_yield` / `list_wsts_semiconductor` / `list_macro_exch_rates`；
商品期货 `list_futures_shfe_metal_d` / `list_eia_weekly_stock` / `list_eia_monthly_crude`；
基金 `list_fund_nav_history` / `get_fund_basic_info` / `list_fund_portfolio_stock_holdings` / `list_fund_return_rate`；
研报 `list_report_vector-search` / `list_research_sentiment` / `list_report_stock_forecast_ratings`；
新闻 `list_news` / `list_entity_related_news`。

C 级（头部财经媒体，用于叙事与观点，必须带机构名+日期）：财新、第一财经、证券时报、上海证券报、
经济观察报、每日经济新闻、21世纪经济报道、澎湃、界面、华尔街见闻、智通财经；海外 Reuters、Bloomberg、FT、WSJ。

D 级（券商/外资投行观点）：仅当能定位到**具体机构 + 具体日期 + 具体报告或报道**时使用。

境外指数实时值（MCP 不覆盖）用公开行情接口：东方财富 `push2.eastmoney.com/api/qt/ulist.np/get`（CORS 放行，
NDX 用 `100.NDX`、SPX `100.SPX`、DJIA `100.DJIA`、N225 `100.N225`）与腾讯 `qt.gtimg.cn/q=usNDX,hkHSI`（GBK）。
**这两个接口只用于页面行情条前端轮询**；正文写作的数字以 B/A 级为准，两者不一致时在脚注注明取数口径。

### 已知指数代码

| 名称 | 代码 | 备注 |
|---|---|---|
| 上证指数 | `000001` | |
| 深证成指 | `399001` | |
| 沪深300 | `000300` | |
| **中证A500** | `000510` | 持仓 ETF 对应指数，只分析指数 |
| **科创50** | `000688` | 同上 |
| **中证红利低波** | `H30269` | MCP `get_index_range_gains` 可用；前端行情条可能取不到，取不到时显示"快照" |
| 中证红利 | `000922` | 红利低波的对照 |
| 创业板指 | `399006` | |
| 中证500 | `000905` | |
| 纳斯达克100 | NDX | MCP 不覆盖，用公开接口 + 官方/媒体交叉核对 |

调用 MCP 大输出工具（尤其 `get_fund_basic_info`，会返回全市场基金并被截断落盘）时，
用 Grep/Read 在落盘文件里定位目标代码，不要重复整表调用。

## 3. 板块结构（固定顺序，编号 01–10）

`00 本周核心结论` —— 不超过 5 条，每条一句话，先给判断再给依据。放最前面，让用户 20 秒读完。

`01 上周全球市场速览` —— 指数周涨跌对比柱状图（`fwBar`）+ 表格：A股宽基、风格指数、港股、美股三大、
日经、欧股、美元、人民币、美债 10Y、商品。每张图下方标注取数来源与截止时点。

`02 国内宏观与政策` —— 央行（OMO/MLF/买卖国债/DR007/LPR/货币方针表述）、财政部（特别国债、地方债、
减税降费、化债）、当周实际公布的经济数据（PMI、社融、CPI/PPI、进出口、工业利润），
逐项写"公布值 / 前值 / 市场预期 / 数据来源与发布日"。没公布的不写，禁止用预测冒充实际。

`03 海外宏观与政策` —— 美联储（决议、点阵、Powell 措辞、官员表态、FedWatch 概率）、美国财政部
（再融资计划、发标、赤字）、美国数据（CPI/PPI/GDP/非农）、日欧央行、地缘与关税/出口管制。

`04 上周 A 股市场结构分析` —— 成交额、两融、行业涨跌前 5/后 5（申万一级）、大小盘与价值成长相对强弱、
北向/主力资金（若有口径）、股指期货基差、涨跌停与上涨家数。**必须解释"为什么涨跌"，
把 04 的事实与 02/03 的政策和数据串起来**，不要只罗列数字。

`05 期货与大宗商品` —— 股指 IF/IH/IC/IM、商品（原油、铜、金、螺纹、焦煤、锂等当周主线）、
国内商品指数与海外定价因子的关系。

`06 汇率与债券` —— 美元指数、人民币中间价与在岸/离岸、中美利差、10Y 国债收益率曲线变动及其对权益估值的含义。

`07 我的持仓关联分析` —— 逐个标的（**不按金额加权**，用户未提供仓位金额）：
中证A500 → 指数 `000510`；中证红利低波 → `H30269`；科创50 → `000688`；纳斯达克100 → NDX；
基金 `539002` 建信新兴市场混合(QDII)A —— **主动型新兴市场 QDII，不跟踪纳指**，按重仓市场/个股与季报暴露分析；
基金 `019018` 易方达信息产业混合C —— **主动偏股 TMT 基金**，按信息产业子行业暴露与重仓股分析。
每只给：上周与近一月表现、驱动因素、当前位置（估值分位/技术位）、主要风险信号、需要盯的下一批事件。
只给情景与关注点，**不给具体加减仓比例**。

`08 本周情景推演` —— 每个关键标的给三种情景（乐观/基准/悲观）：触发条件、指数大致区间或方向、
验证信号（哪个数据/哪条消息会证实或证伪）。明确写"这是概率排序，不是预测承诺"。

`09 下周财经日历` —— 按日列出重要事件（数据发布、议息、政策会议、财报、解禁），标北京时间/美东时间，
区分"已排期确定"与"市场预期"。

`10 机构与分析师观点摘编` —— 至少 5 家，每条：机构 + 人名（可得时）+ 核心判断 + 发布日期 + 来源链接。
必须包含多空分歧，不许只挑一边。区分"报告原文"与"媒体转述"。

`11 工具层提醒` —— ETF 折溢价、QDII 额度与大额申购限制、场外基金 T+N 确认与净值滞后、
跨境 ETF 停牌风险等实操信息。

最后：`数据来源与免责` —— 编号列出全部引用（含链接与抓取日期）；待核清单（见下）；免责声明固定文案：
「本页由自动化任务生成，仅作信息整理与研究记录，不构成投资建议。数据可能存在延迟或错漏，请以官方披露为准。」

## 4. 事实核查规则（硬性）

1. 每个数字都要能落到来源。写不准的一律加 `<span class="tag-verify" title="待核">⚠️</span>`，
   并在文末「待核清单」列明该条、已查到的口径、还缺什么。
2. **禁止**：把旧数据当本周数据；用模型记忆里的历史数字；把媒体报道的预测写成已发生事实；
   编造机构观点、报告标题或 URL。
3. 主动核实优先：对可疑数字用双源交叉（官方 + 一家头部媒体），核不到就降级为"待核"而不是删掉。
4. 日期与口径必须显式（"10月官方制造业PMI 49.8，前值 49.6，来源：国家统计局 2026-10-31"）。
5. 若某板块当周确实没有增量信息，写"本周无新增，上期结论仍适用：<一句话>"，不留空白板块。

## 5. 生成流程（每周一执行）

1. 确认今天日期与时区，算出上一周的 ISO 周号与起止日（周一、周五交易日）。
2. 调 MCP 取指数周涨跌、行业表现、资金面、宏观数据；境外指数与商品用公开接口/官方页核对。
3. WebSearch/WebFetch 取政策原文与媒体叙事；至少 3 次不同关键词检索，覆盖国内政策、海外政策、市场结构。
4. 写 `data/<周号>.json` 快照 → 写 `weeks/<周号>.html`（复制既有周报页结构，保持类名与脚本调用一致）→ 重建 `index.html`。
5. 本地校验：确认 HTML 无未闭合标签、`FW_TICK` 与 `FW_DATA` 可被解析、图表容器 id 与脚本一致；
   用 `node -e` 或 `python -c` 做 JSON 合法性检查（pip 被拦，优先 node）。
6. 发布：`git -C E:/financial-weekly add -A && git commit && git push`（见第 6 节）；
   推送后 `curl` 线上 URL 确认 200，并在任务摘要里给出链接与 3–5 条本周核心结论。

## 6. 发布与回退

- 主路径：`gh` CLI（已 `gh auth setup-git`）→ `git push origin main`。
- 网络异常导致 `git push` 失败时：改用 GitHub MCP 的 `create_or_update_file` / `push_files`
  逐文件提交到 `WMR-Ram/financial-weekly` 的 `main` 分支，提交后必须再 `curl` 线上验证。
- 只有全部推送失败才允许只留本地文件，并在任务摘要里明确标出"本周报未发布"。

## 7. 设计约束

- 深色金融终端风（`--bg:#0a0e14`，涨红跌绿，A股习惯）。
- 图表全部走 `assets/js/chart.js` 的 `fwBar/fwGroup/fwLine`（零外部依赖，离线可渲染）；不引 CDN 图表库。
- 行情条走 `assets/js/ticker.js`：页面内置快照 + 前端 30 秒轮询东财/腾讯，双源都失败则显示快照并标"快照"。
- 移动端可用（≤860px 单列）。目录侧栏已内置。
- 单页正文控制在 4000–9000 字，重表格与要点，少长段落。
