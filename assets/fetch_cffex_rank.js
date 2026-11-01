#!/usr/bin/env node
/* 中金所股指期货会员成交持仓排名抓取
 * 数据源（官方，日频，免费）：http://www.cffex.com.cn/sj/ccpm/{yyyyMM}/{dd}/{IF|IH|IC|IM}.xml
 *   也提供 CSV：/{PRODUCT}_1.csv
 * 字段 datatypeid：0=成交量排名 1=持买单量(多头) 2=持卖单量(空头)
 * 披露口径：单边持仓达 1 万手以上的品种，公布前 20 名期货公司会员；名称带"(代客)"表示经纪客户持仓。
 *          这是**席位排行**，不是机构身份识别，不能等同"外资/国家队在多空"。
 * 用法：node fetch_cffex_rank.js <周一日期> <周五日期>     # yyyy-MM-dd，取区间首末做周变化
 * 输出：stdout 打印 JSON（含每品种主力合约的多/空/净持仓与周变化），可直接嵌入周报。
 */
const { execSync } = require("child_process");
const [d1, d2] = process.argv.slice(2);
if (!d1 || !d2) { console.error("用法: node fetch_cffex_rank.js 2026-10-23 2026-10-30"); process.exit(2); }
const PRODUCTS = ["IF", "IH", "IC", "IM"];
const DT = { "0": "成交量", "1": "多头", "2": "空头" };

function get(url) {
  try {
    return execSync(`curl -s --max-time 25 -A "Mozilla/5.0" "${url}"`, { maxBuffer: 1 << 26 }).toString();
  } catch (e) { return ""; }
}
function parse(xml) {
  const out = [];
  if (!xml || xml.indexOf("<positionRank") < 0) return out;
  const re = /<data [^>]*>([\s\S]*?)<\/data>/g; let m;
  while ((m = re.exec(xml))) {
    const g = (t) => { const r = new RegExp("<" + t + ">([^<]*)</" + t + ">").exec(m[1]); return r ? r[1].trim() : ""; };
    out.push({ contract: g("instrumentid"), day: g("tradingday"), dt: g("datatypeid"),
      rank: +g("rank"), member: g("shortname"), vol: +g("volume"), chg: +g("varvolume") });
  }
  return out;
}
function mainOf(rows, product) {
  /* 主力合约 = 该品种当日“多头+空头”持仓量最大的合约（不预设月份） */
  let best = null;
  for (const c of new Set(rows.map(r => r.contract))) {
    if (!c.startsWith(product)) continue;
    const tot = rows.filter(r => r.contract === c && r.dt !== "0").reduce((s, r) => s + r.vol, 0);
    if (!best || tot > best.tot) best = { c, tot };
  }
  return best ? best.c : null;
}
function snapshot(date) {
  const [y, mo, dd] = date.split("-");
  const res = {};
  for (const p of PRODUCTS) {
    const rows = parse(get(`http://www.cffex.com.cn/sj/ccpm/${y}${mo}/${dd}/${p}.xml`));
    if (!rows.length) { res[p] = { 错误: "未取到数据（可能非交易日或接口变更）" }; continue; }
    const near = mainOf(rows, p) || [...new Set(rows.map(r => r.contract))][0];
    const sum = (dt) => rows.filter(r => r.contract === near && r.dt === dt).reduce((s, r) => s + r.vol, 0);
    const top3 = (dt) => rows.filter(r => r.contract === near && r.dt === dt).sort((a, b) => a.rank - b.rank).slice(0, 3).map(r => `${r.member}:${r.vol}`);
    res[p] = { 合约: near, 交易日: rows[0].day, 多头前20: sum("1"), 空头前20: sum("2"), 净持仓: sum("1") - sum("2"),
      多头前三: top3("1"), 空头前三: top3("2"), 成交量合计: sum("0") };
  }
  return res;
}
const a = snapshot(d1), b = snapshot(d2);
const delta = {};
for (const p of PRODUCTS) {
  if (!b[p] || b[p].错误 || !a[p] || a[p].错误) continue;
  delta[p] = {
    合约: b[p].合约,
    多头: { 起: a[p].多头前20, 止: b[p].多头前20, 变化: b[p].多头前20 - a[p].多头前20 },
    空头: { 起: a[p].空头前20, 止: b[p].空头前20, 变化: b[p].空头前20 - a[p].空头前20 },
    净持仓: { 起: a[p].净持仓, 止: b[p].净持仓, 变化: b[p].净持仓 - a[p].净持仓 },
    多头前三: b[p].多头前三, 空头前三: b[p].空头前三
  };
}
console.log(JSON.stringify({ 区间: [d1, d2], 口径: "前20名期货公司会员，(代客)=经纪客户持仓，席位排行非机构身份", 周变化: delta, 期末明细: b }, null, 1));
