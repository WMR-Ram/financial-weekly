/* 抓取东方财富板块历史资金流（daykline），按周区间加总。
 * 接口：push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=90.BKxxxx
 * 口径：klines 字段顺序为 日期,主力净额,小单净额,中单净额,大单净额,超大单净额,…（单位：元）
 *      主力净额＝大单＋超大单，是按单笔成交金额阈值推算的分档，非机构身份。
 * 用法：node fetch_bk_week.js 2026-10-26 2026-10-30 BK0917 BK0891 ...
 *      secid 前缀 90=概念板块，也可传 90.000300 之类指数。
 */
const [BEGIN, END, ...CODES] = process.argv.slice(2);
if (!BEGIN || !END || !CODES.length) { console.error("用法: node fetch_bk_week.js 2026-10-26 2026-10-30 BK0917 BK0891"); process.exit(2); }
const HEAD = { "User-Agent": "Mozilla/5.0", "Referer": "https://data.eastmoney.com/" };

async function fetchText(url) {
  for (const base of ["https://", "http://"]) {
    try {
      const r = await fetch(base + url);
      const t = await r.text();
      if (t && t.trim().length > 10) return t;
    } catch (e) { /* 换协议 */ }
  }
  return null;
}

(async () => {
  const out = [];
  for (const code of CODES) {
    const secid = code.includes(".") ? code : "90." + code;
    /* 必须使用下面这串**升序且止于 f63** 的 fields2：多请求 f64/f65 会改变返回列顺序（2026-11-02 实测）。 */
    const t = await fetchText(`push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=0&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63`);
    if (!t) { out.push({ code: secid, error: "双协议均无响应" }); continue; }
    let j; try { j = JSON.parse(t); } catch (e) { out.push({ code: secid, error: "解析失败 " + t.slice(0, 60) }); continue; }
    const kl = (j.data && j.data.klines) || [];
    const days = [];
    /* 字段含义（2026-11-02 用"点名单列"法逐一确证，勿再凭猜测改动）：
       请求 f51,f52 => -117.82 | f51,f53 => +95.52 | f51,f54 => +21.16 | f51,f55 => -45.54 | f51,f56 => -72.28
       即 f51 日期 | f52 主力净额 | f53 超大单净额 | f54 大单净额 | f55 中单净额 | f56 小单净额
          f57 主力净占比 | f58—f61 各档占比 | f62 收盘价 | f63 涨跌幅
    /* 返回列**严格按 fields2 的给出顺序**（用 f51,f53,f55 与 f51,f54,f56 两组不相交请求交叉验证），
       故请求必须写成 f51..f63 升序，否则列会错位。

       【仍未解决】f53—f56 到底哪两列是超大单/大单：两种对称贴法都能满足
       "某两列之和 ＝ 主力净额"，无法靠恒等式区分；而周度加总给出的符号与"主力＝超大单＋大单"
       的常识定义相矛盾（半导体周主力 -510 亿，f53 列周合计却为 +408 亿）。
       怀疑这两列是**流出额而非净额**，但本期未证实。
       → 结论：**周报只使用 main（主力净额）、逐日 main 与 pct（板块涨跌幅）**，
         分档周度加总一律不采信；ETF 分档改用 MCP list_fund_flow 的具名字段。 */
    for (const line of kl) {
      const f = line.split(",");
      const d = f[0];
      if (d < BEGIN || d > END) continue;
      const main = +f[1], c2 = +f[2], c3 = +f[3], c4 = +f[4], c5 = +f[5];
      const errPairA = +((main + c2 + c3) / 1e8).toFixed(2);
      const errPairB = +((c4 + c5 - main) / 1e8).toFixed(2);
      days.push({ date: d, main, c2, c3, c4, c5, close: f[11], pct: f[12], errPairA, errPairB });
    }
    /* 只校验"有一对列之和等于主力"这一必要事实，不给分档命名。 */
    const bad = days.filter(x => Math.abs(x.errPairA) > Math.max(0.5, 0.03 * (Math.abs(x.c2) + Math.abs(x.c3)) / 1e8) &&
      Math.abs(x.errPairB) > 0.05);
    const sum = (k) => +((days.reduce((s, x) => s + (x[k] || 0), 0) / 1e8).toFixed(2));
    out.push({
      code: secid, name: j.data && j.data.name,
      days: days.map(d => ({ d: d.date, mainYi: +(d.main / 1e8).toFixed(2), colF53Yi: +(d.c2 / 1e8).toFixed(2), colF54Yi: +(d.c3 / 1e8).toFixed(2), colF55Yi: +(d.c4 / 1e8).toFixed(2), colF56Yi: +(d.c5 / 1e8).toFixed(2), pct: d.pct, close: d.close, errPairA: d.errPairA, errPairB: d.errPairB })),
      weekMainYi: days.length ? sum("main") : null,
      weekColF53Yi: days.length ? sum("c2") : null, weekColF54Yi: days.length ? sum("c3") : null,
      weekColF55Yi: days.length ? sum("c4") : null, weekColF56Yi: days.length ? sum("c5") : null,
      tierNote: "f53—f56 未命名（分档语义未证实，见文件头注释）；周报只用 weekMainYi 与 pct",
      identityCheck: bad.length ? ("FAIL " + bad.length + " 天无任一分档列对求和等于主力，列序可能已变") : (days.length ? "ok" : "EMPTY 区间内无数据"),
      lastDay: days.length ? { date: days[days.length - 1].date, mainYi: +(days[days.length - 1].main / 1e8).toFixed(2), pct: days[days.length - 1].pct, close: days[days.length - 1].close } : null,
      rows: days.length
    });
  }
  console.log(JSON.stringify({ interval: [BEGIN, END], note: "主力净额=超大单+大单，分档推算；单位亿元", data: out }, null, 1));
})();
