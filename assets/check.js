#!/usr/bin/env node
/* 发布前自检：JS 语法、JSON 合法性、HTML 标签闭合与图表容器/脚本一致性 */
const fs = require("fs");
const path = require("path");
const root = process.argv[2] || "E:/financial-weekly";
let fail = 0;
const bad = (m) => { console.log("FAIL  " + m); fail++; };
const ok = (m) => console.log("ok    " + m);

/* 1. JS 语法 */
for (const f of ["assets/js/ticker.js", "assets/js/chart.js", "assets/fetch_cffex_rank.js"]) {
  try {
    let src = fs.readFileSync(path.join(root, f), "utf8");
    if (src.startsWith("#!")) src = src.slice(src.indexOf("\n") + 1);   /* shebang 不是合法 JS 表达式 */
    new Function(src);
    ok("JS 语法 " + f);
  } catch (e) { bad("JS 语法 " + f + " : " + e.message); }
}

/* 2. JSON */
for (const f of fs.readdirSync(path.join(root, "data")).filter(x => x.endsWith(".json"))) {
  try { JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8")); ok("JSON " + f); }
  catch (e) { bad("JSON " + f + " : " + e.message); }
}

/* 3. HTML */
const htmls = ["index.html", ...fs.readdirSync(path.join(root, "weeks")).filter(x => x.endsWith(".html")).map(x => "weeks/" + x)];
for (const h of htmls) {
  const src = fs.readFileSync(path.join(root, h), "utf8");
  for (const t of ["div", "section", "table", "tr", "td", "th", "ul", "li", "script", "html", "body", "head"]) {
    const o = (src.match(new RegExp("<" + t + "(\\s|>)", "g")) || []).length;
    const c = (src.match(new RegExp("</" + t + ">", "g")) || []).length;
    if (o !== c) bad(`${h} <${t}> 开 ${o} / 闭 ${c} 不匹配`);
  }
  if (!/noindex/.test(src)) bad(h + " 缺少 robots noindex");
  if (!/charset\s*=\s*"?\s*utf-8/i.test(src)) bad(h + " 缺少 UTF-8 声明");
  /* 图表容器与脚本调用一致 */
  const calls = [...src.matchAll(/fw(Bar|Group|Line)\(document\.getElementById\("([^"]+)"\)/g)].map(m => m[2]);
  for (const id of calls) if (!new RegExp('id="' + id + '"').test(src)) bad(h + " 脚本引用了不存在的容器 #" + id);
  /* 快照数据 */
  const tick = src.match(/window\.FW_TICK\s*=\s*(\[[\s\S]*?\]);/);
  if (tick) {
    try { const arr = new Function("return " + tick[1])();
      const noSnap = arr.filter(i => !i.snapshot || i.snapshot.price === undefined);
      if (noSnap.length) bad(h + " 行情条缺快照: " + noSnap.map(i => i.name).join(","));
      else ok(h + " 行情条 " + arr.length + " 项快照完整，图表 " + calls.length + " 张");
    } catch (e) { bad(h + " FW_TICK 解析失败: " + e.message); }
  } else if (/ticker\.js/.test(src)) bad(h + " 引入了 ticker.js 但未定义 FW_TICK");

  /* 编号引用与来源表必须对得上（正文只用 [n]，来源在文末） */
  const refs = new Set([...src.matchAll(/<sup>\[(\d+)\]<\/sup>/g)].map(m => +m[1]));
  const body = src.slice(0, src.indexOf('<section id="src"') < 0 ? src.length : src.indexOf('<section id="src"'));
  if (/<source|（来源：|来源：/.test(body)) bad(h + " 正文出现括号式来源，应改为文末编号引用");
  let n = 0, listed = new Set(), anyList = false;
  for (const m of src.matchAll(/<ol(?:(\s+start="(\d+)"))?>([\s\S]*?)<\/ol>/g)) {
    anyList = true;
    let i = m[2] ? +m[2] : 1;
    for (const li of m[3].matchAll(/<li[\s>]/g)) { listed.add(i); i++; }
    n = i - 1;
  }
  if (refs.size) {
    const missing = [...refs].filter(x => !listed.has(x)).sort((a, b) => a - b);
    if (missing.length) bad(h + " 引用了来源表中不存在的编号: [" + missing.join("],[") + "]");
    else ok(h + " 编号引用 " + refs.size + " 处均可在文末来源表（1—" + n + "）中找到");
    const unused = [...listed].filter(x => !refs.has(x));
    if (unused.length > 12) console.log("note   " + h + " 有 " + unused.length + " 条来源未被正文编号引用（允许，但可检查是否漏引）");
  } else if (anyList && /<section id="src"/.test(src)) bad(h + " 有来源表但正文没有任何 [n] 编号引用");
}
console.log(fail ? `\n${fail} 项需修复` : "\n全部检查通过");
process.exit(fail ? 1 : 0);
