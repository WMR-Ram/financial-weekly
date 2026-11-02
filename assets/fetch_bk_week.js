/* 抓取东方财富板块历史资金流（daykline），按周区间加总。
 * 接口：push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=90.BKxxxx
 * 口径：klines 字段顺序为 日期,主力净额,超大单净额,大单净额,中单净额,小单净额,...（单位：元）
 *      主力净额＝超大单＋大单，是按单笔金额阈值推算的分档，非机构身份。
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
    const t = await fetchText(`push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=0&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65`);
    if (!t) { out.push({ code: secid, error: "双协议均无响应" }); continue; }
    let j; try { j = JSON.parse(t); } catch (e) { out.push({ code: secid, error: "解析失败 " + t.slice(0, 60) }); continue; }
    const kl = (j.data && j.data.klines) || [];
    const days = [];
    /* 15 字段模式下的固定顺序（已用 BK0917 逐日恒等式核验）：
       0 日期 1 主力净额 2 超大单净额 3 大单净额 4 中单净额 5 小单净额
       6 主力净占比 7 超大单占比 8 大单占比 9 中单占比 10 小单占比 11 收盘价 12 涨跌幅
       恒等式：主力净额 ≈ 超大单净额＋大单净额，且 中单净额＋小单净额 ＝ −主力净额。
       若请求的 fields2 子集变化，服务端返回顺序会变，因此必须保留校验。 */
    for (const line of kl) {
      const f = line.split(",");
      const d = f[0];
      if (d < BEGIN || d > END) continue;
      const main = +f[1], sup = +f[2], lar = +f[3], med = +f[4], sml = +f[5];
      /* 可靠恒等式（每日实测成立）：中单＋小单 ＝ −主力净额。
         超大单/大单两列在不同协议下顺序与正负号不一致，属 API 侧歧义，只作参考不作周度加总结论。 */
      const errTier = +(((med + sml) + main) / 1e8).toFixed(2);
      days.push({ date: d, main, sup, lar, med, sml, close: f[11], pct: f[12], errTier });
    }
    const bad = days.filter(x => Math.abs(x.errTier) > 0.05);
    const sum = (k) => +((days.reduce((s, x) => s + (x[k] || 0), 0) / 1e8).toFixed(2));
    out.push({
      code: secid, name: j.data && j.data.name,
      days: days.map(d => ({ d: d.date, mainYi: +(d.main / 1e8).toFixed(2), medYi: +(d.med / 1e8).toFixed(2), smallYi: +(d.sml / 1e8).toFixed(2), pct: d.pct, close: d.close, errTier: d.errTier })),
      weekMainYi: days.length ? sum("main") : null, weekMediumYi: days.length ? sum("med") : null, weekSmallYi: days.length ? sum("sml") : null,
      tierNote: "超大单/大单列顺序与符号存在 API 歧义，不输出周度加总",
      identityCheck: bad.length ? ("FAIL " + bad.length + " 天 中单+小单≠-主力") : "ok",
      lastDay: days.length ? { date: days[days.length - 1].date, mainYi: +(days[days.length - 1].main / 1e8).toFixed(2), pct: days[days.length - 1].pct, close: days[days.length - 1].close } : null,
      rows: days.length
    });
  }
  console.log(JSON.stringify({ interval: [BEGIN, END], note: "主力净额=超大单+大单，分档推算；单位亿元", data: out }, null, 1));
})();
