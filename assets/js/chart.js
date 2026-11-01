/* 轻量 SVG 图表：零外部依赖，离线与 file:// 均可渲染，深色主题统一。
 * fwBar(el, cfg)   正负柱状图（周涨跌对比）
 * fwGroup(el, cfg) 多期分组柱（近1周/1月/3月/1年）
 * fwLine(el, cfg)  折线（多序列，带图例）
 */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var UP = "#ef4d4d", DOWN = "#17b877", GRID = "#232c3d", TXT = "#8b98ad";

  function s(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, str, attrs) {
    var t = s("text", Object.assign({ x: x, y: y, fill: TXT, "font-size": 11, "font-family": "Consolas, monospace" }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  function host(el, cfg) {
    var w = el.clientWidth || el.parentNode.clientWidth || 900;
    var h = cfg.height || 300;
    el.innerHTML = "";
    var svg = s("svg", { viewBox: "0 0 " + w + " " + h, width: "100%", height: h, "font-family": "sans-serif" });
    el.appendChild(svg);
    return { svg: svg, w: w, h: h, pad: cfg.pad || { t: 18, r: 16, b: 42, l: 46 } };
  }
  function scale(dmin, dmax, rmin, rmax) {
    var span = (dmax - dmin) || 1;
    return function (v) { return rmin + (v - dmin) / span * (rmax - rmin); };
  }
  function nice(a, b) {
    var min = Math.min(a, b), max = Math.max(a, b), pad = (max - min) * 0.12 || 1;
    return [min - pad, max + pad];
  }

  function fwBar(el, cfg) {
    var c = host(el, cfg), P = c.pad;
    var innerW = c.w - P.l - P.r, innerH = c.h - P.t - P.b;
    var vals = cfg.values;
    var range = cfg.zeroBase === false ? nice(Math.min.apply(null, vals), Math.max.apply(null, vals)) : nice(Math.min(0, Math.min.apply(null, vals)), Math.max(0, Math.max.apply(null, vals)));
    var y = scale(range[0], range[1], c.h - P.b, P.t);
    var zero = y(0);
    for (var g = 0; g <= 4; g++) {
      var gv = range[0] + (range[1] - range[0]) * g / 4, gy = y(gv);
      s("line", { x1: P.l, x2: c.w - P.r, y1: gy, y2: gy, stroke: GRID, "stroke-dasharray": gv === 0 ? "" : "3 4" }, c.svg);
      txt(c.svg, 4, gy + 4, gv.toFixed(cfg.digits === undefined ? 1 : cfg.digits), { "font-size": 10 });
    }
    var bw = Math.min(46, innerW / vals.length * 0.62);
    vals.forEach(function (v, i) {
      var cx = P.l + innerW * (i + 0.5) / vals.length;
      var top = v >= 0 ? y(v) : zero, hgt = Math.abs(y(v) - zero);
      var col = cfg.colors ? cfg.colors[i] : (cfg.polarity === "down-good" ? (v > 0 ? DOWN : UP) : (v >= 0 ? UP : DOWN));
      var bar = s("rect", { x: cx - bw / 2, y: top, width: bw, height: Math.max(1.5, hgt), fill: col, rx: 2, opacity: .9 }, c.svg);
      s("title", {}, bar).textContent = cfg.labels[i] + " " + (v > 0 ? "+" : "") + v.toFixed(2) + "%";
      txt(c.svg, cx, (v >= 0 ? top - 5 : top + hgt + 13), (v > 0 ? "+" : "") + v.toFixed(cfg.digits === undefined ? 2 : cfg.digits) + (cfg.suffix || "%"),
        { fill: col, "font-size": 11, "text-anchor": "middle", "font-weight": 700 });
      var lb = txt(c.svg, cx, c.h - P.b + 17, cfg.labels[i], { "text-anchor": "middle", "font-size": 11 });
      if (cfg.labels[i] && cfg.labels[i].length > 6) lb.setAttribute("transform", "rotate(-18 " + cx + " " + (c.h - P.b + 17) + ")");
    });
    return c;
  }

  function fwGroup(el, cfg) {
    var c = host(el, cfg), P = c.pad;
    var innerW = c.w - P.l - P.r, innerH = c.h - P.t - P.b;
    var all = [];
    cfg.series.forEach(function (sr) { sr.values.forEach(function (v) { all.push(v); }); });
    var range = nice(Math.min(0, Math.min.apply(null, all)), Math.max(0, Math.max.apply(null, all)));
    var y = scale(range[0], range[1], c.h - P.b, P.t);
    for (var g = 0; g <= 4; g++) {
      var gv = range[0] + (range[1] - range[0]) * g / 4, gy = y(gv);
      s("line", { x1: P.l, x2: c.w - P.r, y1: gy, y2: gy, stroke: GRID, "stroke-dasharray": gv === 0 ? "" : "3 4" }, c.svg);
      txt(c.svg, 4, gy + 4, gv.toFixed(0) + "%", { "font-size": 10 });
    }
    var groups = cfg.labels.length, sn = cfg.series.length;
    var gw = innerW / groups, bw = Math.min(16, (gw * 0.72) / sn);
    cfg.labels.forEach(function (lb, i) {
      var gx = P.l + gw * (i + 0.5);
      cfg.series.forEach(function (sr, k) {
        var v = sr.values[i], cx = gx + (k - (sn - 1) / 2) * bw;
        s("rect", { x: cx - bw / 2 + 1, y: v >= 0 ? y(v) : y(0), width: bw - 2, height: Math.max(1.2, Math.abs(y(v) - y(0))), fill: sr.color, rx: 1.5 }, c.svg);
      });
      txt(c.svg, gx, c.h - P.b + 17, lb, { "text-anchor": "middle", "font-size": 11 });
    });
    // legend
    var lx = P.l;
    cfg.series.forEach(function (sr) {
      s("rect", { x: lx, y: 4, width: 10, height: 10, fill: sr.color, rx: 2 }, c.svg);
      txt(c.svg, lx + 14, 13, sr.name, { fill: "#d7dee9", "font-size": 11 });
      lx += 24 + sr.name.length * 8;
    });
    return c;
  }

  function fwLine(el, cfg) {
    var c = host(el, cfg), P = cfg.pad || { t: 22, r: 54, b: 34, l: 46 }; c.pad = P;
    var innerW = c.w - P.l - P.r, innerH = c.h - P.t - P.b;
    var all = [];
    cfg.series.forEach(function (sr) { sr.values.forEach(function (v) { all.push(v); }); });
    var range = nice(Math.min.apply(null, all), Math.max.apply(null, all));
    var y = scale(range[0], range[1], c.h - P.b, P.t);
    var n = cfg.series[0].values.length;
    var x = scale(0, Math.max(1, n - 1), P.l, P.l + innerW);
    for (var g = 0; g <= 4; g++) {
      var gv = range[0] + (range[1] - range[0]) * g / 4, gy = y(gv);
      s("line", { x1: P.l, x2: c.w - P.r, y1: gy, y2: gy, stroke: GRID, "stroke-dasharray": "3 4" }, c.svg);
      txt(c.svg, 4, gy + 4, gv.toFixed(cfg.digits === undefined ? 1 : cfg.digits), { "font-size": 10 });
    }
    (cfg.xLabels || []).forEach(function (lb, i) {
      if (lb === undefined) return;
      txt(c.svg, x(i), c.h - P.b + 16, lb, { "text-anchor": "middle", "font-size": 10 });
    });
    if (cfg.baseline !== undefined) {
      var by = y(cfg.baseline);
      s("line", { x1: P.l, x2: c.w - P.r, y1: by, y2: by, stroke: TXT, "stroke-dasharray": "5 3" }, c.svg);
      txt(c.svg, c.w - P.r + 2, by + 4, "基准", { "font-size": 10 });
    }
    cfg.series.forEach(function (sr) {
      var d = sr.values.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
      s("path", { d: d, fill: "none", stroke: sr.color, "stroke-width": sr.width || 2, "stroke-linejoin": "round" }, c.svg);
      sr.values.forEach(function (v, i) {
        s("circle", { cx: x(i), cy: y(v), r: 2.6, fill: sr.color }, c.svg);
      });
      var last = sr.values[n - 1];
      txt(c.svg, x(n - 1) + 6, y(last) + 4, sr.name, { fill: sr.color, "font-size": 10.5, "font-weight": 700 });
    });
    return c;
  }

  window.fwBar = fwBar; window.fwGroup = fwGroup; window.fwLine = fwLine;
})();
