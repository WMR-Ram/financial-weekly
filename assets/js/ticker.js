/* 财经周报 · 实时行情条
 * 三层数据：1) 页面内置快照（生成时写入，离线/失败兜底）
 *          2) 东方财富 push2 接口（浏览器直连，CORS *）
 *          3) 腾讯 qt.gtimg.cn 接口（GBK 文本，CORS *）作为备源
 * 任一接口失败都静默回退，页面永不空白；每条标注 live / snap 状态。
 */
(function () {
  "use strict";
  var CONF = [];            /* 在 boot() 时从 window.FW_TICK 读取，避免脚本顺序问题 */
  var INTERVAL_MS = 30000;
  var emHosts = ["https://push2.eastmoney.com", "https://push2delay.eastmoney.com"];
  var box, seq = 0, busy = false;

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }

  function fmt(v, d) {
    if (v === null || v === undefined || isNaN(v)) return "--";
    var n = Number(v);
    return n >= 10000 ? n.toLocaleString("en-US", { maximumFractionDigits: d }) : n.toFixed(d === undefined ? 2 : d);
  }
  function pct(v) {
    var n = Number(v);
    if (isNaN(n)) return { txt: "--", cls: "flat" };
    return { txt: (n > 0 ? "+" : "") + n.toFixed(2) + "%", cls: n > 0.005 ? "up" : n < -0.005 ? "down" : "flat" };
  }

  /* ---------- 东方财富 ---------- */
  function fromEastmoney(secids) {
    var host = emHosts[(seq++) % emHosts.length];
    var url = host + "/api/qt/ulist.np/get?fltt=2&invt=2&secids=" + encodeURIComponent(secids.join(",")) +
      "&fields=f2,f3,f12,f14,f124&_=" + Date.now();
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("em " + r.status);
      return r.json();
    }).then(function (j) {
      var out = {};
      ((j && j.data && j.data.diff) || []).forEach(function (d) {
        out[d.f12] = { price: Number(d.f2), pct: Number(d.f3), ts: d.f124 };
      });
      return out;
    });
  }

  /* ---------- 腾讯（GBK） ---------- */
  function fromTencent(codes) {
    var url = "https://qt.gtimg.cn/q=" + codes.join(",") + "&_=" + Date.now();
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("tc " + r.status);
      return r.arrayBuffer();
    }).then(function (buf) {
      var txt;
      try { txt = new TextDecoder("gbk").decode(buf); }
      catch (e) { txt = new TextDecoder("utf-8").decode(buf); }
      var out = {};
      txt.split(";").forEach(function (line) {
        var m = line.match(/v_([a-zA-Z0-9]+)="([^"]*)"/);
        if (!m) return;
        var f = m[2].split("~");
        if (f.length < 33) return;
        var p = parseFloat(f[3]), prev = parseFloat(f[4]);
        if (isNaN(p) || isNaN(prev) || prev === 0) return;
        var pc = f[32] !== undefined ? parseFloat(f[32]) : (p / prev - 1) * 100;
        out[m[1].replace(/^(sh|sz|hk|us)/, "")] = { price: p, pct: isNaN(pc) ? (p / prev - 1) * 100 : pc, ts: f[30] };
      });
      return out;
    });
  }

  /* ---------- 渲染 ---------- */
  function render() {
    if (!box) return;
    box.innerHTML = "";
    CONF.forEach(function (item) {
      var d = item._live || item.snapshot || {};
      var p = pct(d.pct);
      var q = el("div", "q");
      q.appendChild(el("span", "n", item.name));
      q.appendChild(el("span", "v", fmt(d.price, item.dec)));
      q.appendChild(el("span", "c " + p.cls, " " + p.txt));
      var mode = el("span", "mode" + (item._live ? " live" : ""), item._live ? "实时" : "快照");
      q.appendChild(mode);
      box.appendChild(q);
    });
  }

  function apply(maps) {
    CONF.forEach(function (item) {
      var keyEm = item.em && String(item.em).split(".")[1];
      var got = (maps.em && keyEm && maps.em[keyEm]) || (maps.tc && item.tc && maps.tc[item.tc.replace(/^(sh|sz|hk|us)/, "")]);
      if (got && !isNaN(got.price)) {
        item._live = { price: got.price, pct: got.pct };
      } else {
        item._live = null;
      }
    });
    render();
  }

  function poll() {
    if (busy || !CONF.length) return;
    busy = true;
    var emIds = CONF.map(function (i) { return i.em; }).filter(Boolean);
    var tcIds = CONF.map(function (i) { return i.tc; }).filter(Boolean);
    var jobs = [];
    if (emIds.length) jobs.push(fromEastmoney(emIds).then(function (m) { return { em: m }; }, function () { return {}; }));
    if (tcIds.length) jobs.push(fromTencent(tcIds).then(function (m) { return { tc: m }; }, function () { return {}; }));
    Promise.all(jobs).then(function (res) {
      var merged = {};
      res.forEach(function (r) { if (r.em) merged.em = r.em; if (r.tc) merged.tc = r.tc; });
      apply(merged);
    }).catch(function () { render(); })
      .then(function () { busy = false; });
  }

  function boot() {
    box = document.getElementById("ticker-strip");
    if (!box) return;
    CONF = window.FW_TICK || [];
    if (!CONF.length) { var bar = box.closest(".ticker"); if (bar) bar.style.display = "none"; return; }
    render();
    poll();
    setInterval(function () { if (!document.hidden) poll(); }, INTERVAL_MS);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
