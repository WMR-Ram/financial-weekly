/* 抓取东方财富概念板块资金流快照（clist）与板块历史资金流（daykline）。
 * 用途：周报 §04 科技链条。fs=m:90+t:3 为概念板块，单页上限 100，需 pn=1..6 合并。
 * 注意：主力净额＝超大单＋大单，是按单笔金额阈值推算的分档，不是机构身份。
 */
const fs = require("fs");
const PAGES = 6, SIZE = 100;
const HEAD = { "User-Agent": "Mozilla/5.0", "Referer": "https://quote.eastmoney.com/" };

async function get(url) {
  for (const scheme of ["https", "http"]) {
    try {
      const r = await fetch(scheme + "://" + url.replace(/^https?:\/\//, ""), { headers: HEAD });
      const t = await r.text();
      if (t && t.trim().length > 10) return JSON.parse(t);
    } catch (e) { /* 换协议重试 */ }
  }
  return null;
}

(async () => {
  const all = new Map();
  for (let pn = 1; pn <= PAGES; pn++) {
    const u = `push2.eastmoney.com/api/qt/clist/get?pn=${pn}&pz=${SIZE}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:3&fields=f12,f14,f2,f3,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87`;
    const d = await get(u);
    const rows = d && d.data && d.data.diff;
    if (!rows) { console.error(`pn=${pn} 无数据`); continue; }
    for (const r of rows) if (r && r.f12) all.set(r.f12, { code: r.f12, name: r.f14, price: r.f2, pct: r.f3, main: r.f62, mainPct: r.f184, superLarge: r.f66, large: r.f72, medium: r.f78, small: r.f84 });
    console.error(`pn=${pn} rows=${rows.length} total=${d.data.total} cum=${all.size}`);
  }
  const OUT = require("path").join(require("os").tmpdir(), "em_concepts.json");
  fs.writeFileSync(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), total: all.size, list: [...all.values()] }, null, 1));
  console.log("已保存 " + OUT + "，条目 " + all.size);
})();
