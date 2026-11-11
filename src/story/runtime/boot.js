// The page engine: charts, figures, tooltips, the progress bar, theme switch and scroll loop.
// Ported from the published Ossabaw page. boot() reads the rendered DOM once and wires every [data-fig].
export function boot(DATA, WIDGETS) {
/* chronicle runtime, part 1: helpers, tooltips and chart frames. The build joins every
   js/ file in name order inside one function; all text from the data goes in through
   textContent. */
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  root.classList.add("js");
  var FIGS = DATA.figs || {};
  var SOURCES = DATA.sources || {};
  var SVGNS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ------------------------------------------------------------ helpers */
  function svg(tag, attrs, parent) {
    var node = doc.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function html(tag, cls, text, parent) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    if (parent) parent.appendChild(node);
    return node;
  }
  function txt(parent, x, y, s, attrs) {
    var a = attrs || {};
    a.x = x; a.y = y;
    var t = svg("text", a, parent);
    t.textContent = String(s);
    return t;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function linear(d0, d1, r0, r1) {
    var span = d1 - d0 || 1;
    var f = function (v) { return r0 + (v - d0) / span * (r1 - r0); };
    f.invert = function (px) { return d0 + (px - r0) / (r1 - r0) * span; };
    return f;
  }
  function niceStep(span, count) {
    var raw = span / Math.max(count, 1);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return step * mag;
  }
  function ticks(lo, hi, count) {
    var step = niceStep(hi - lo, count);
    var out = [];
    var start = Math.ceil(lo / step - 1e-9) * step;
    for (var v = start; v <= hi + step * 1e-6; v += step) out.push(Math.round(v / step) * step || 0);
    return out;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var step = niceStep(v, 4);
    return Math.ceil(v / step) * step;
  }
  var ROLES = { accent: "var(--s1)", legacy: "var(--legacy)", muted: "var(--muted)", bad: "var(--bad)", good: "var(--good)", warn: "var(--warn)", ink: "var(--ink)", surface: "var(--surface)", rule: "var(--rule)" };
  /* A color name from a story: a role, s1 to s6, a theme color (kraft or c-kraft) or a hex. */
  function colorOf(name, fallback) {
    var c = String(name || "");
    if (ROLES[c]) return ROLES[c];
    if (/^s[1-6]$/.test(c)) return "var(--" + c + ")";
    if (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^var\(--[a-z0-9-]+\)$/.test(c)) return c;
    if (/^c-[a-z][a-z0-9-]*$/.test(c)) return "var(--" + c + ")";
    if (/^[a-z][a-z0-9-]*$/.test(c)) return "var(--c-" + c + ", " + (fallback || "var(--muted)") + ")";
    return fallback || "var(--muted)";
  }
  function seriesColor(i, s) {
    if (s && s.color) return colorOf(s.color, "var(--s" + ((i % 6) + 1) + ")");
    return "var(--s" + ((i % 6) + 1) + ")";
  }
  function fmt(v, kind) {
    if (v === null || v === undefined || isNaN(v)) return "n/a";
    var n = Number(v);
    switch (kind) {
      case "pct": return (Math.abs(n) >= 10 || Number.isInteger(n) ? Math.round(n) : n.toFixed(1)) + "%";
      case "pct1": return n.toFixed(1) + "%";
      case "pct2": return n.toFixed(2) + "%";
      case "pct3": return n.toFixed(3) + "%";
      case "int": return Math.round(n).toLocaleString("en-US");
      case "dec1": return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      case "dec2": return n.toFixed(2);
      case "money_k": return n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "M" : "$" + Math.round(n) + "K";
      case "money": return compactMoney(n);
      case "ms": return Math.round(n).toLocaleString("en-US") + " ms";
      case "compact": return compact(n);
      default:
        if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString("en-US");
        return Number.isInteger(n) ? String(n) : n.toFixed(1);
    }
  }
  function compact(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }
  function compactMoney(n) { return (n < 0 ? "−$" : "$") + compact(Math.abs(n)); }
  function parseDate(s) {
    var p = String(s).split("-").map(Number);
    return new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
  }
  function isoDay(d) { return d.toISOString().slice(0, 10); }
  function fmtDate(d, style) {
    var m = MONTHS[d.getUTCMonth()], y = d.getUTCFullYear();
    if (style === "month") return m + " " + y;
    if (style === "short") return d.getUTCDate() + " " + m;
    return d.getUTCDate() + " " + m + " " + y;
  }
  function labelX(x) {
    var s = String(x);
    if (/^\d{4}-\d{2}$/.test(s)) { var d = parseDate(s); return MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return fmtDate(parseDate(s));
    return s;
  }
  function tickX(x, withYear) {
    var s = String(x);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      var day = parseDate(s);
      return day.getUTCDate() + " " + MONTHS[day.getUTCMonth()] + (withYear ? " " + day.getUTCFullYear() : "");
    }
    if (/^\d{4}-\d{2}/.test(s)) {
      var d = parseDate(s), m = d.getUTCMonth();
      return withYear ? MONTHS[m] + " " + d.getUTCFullYear() : MONTHS[m];
    }
    return s;
  }
  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
  function monthsBetween(a, b) { return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth(); }

  /* -------------------------------------------------------------- tooltip */
  var tip = html("div", "tip", null, doc.body);
  tip.setAttribute("role", "status");
  function showTip(build, x, y) {
    while (tip.firstChild) tip.removeChild(tip.firstChild);
    build(tip);
    tip.classList.add("on");
    var r = tip.getBoundingClientRect();
    var left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = Math.max(8, top) + "px";
  }
  function hideTip() { tip.classList.remove("on"); }
  function tipRow(parent, color, value, label) {
    var row = html("div", "tip-row", null, parent);
    if (color) { var k = html("span", "tip-key", null, row); k.style.background = color; }
    html("b", null, value, row);
    if (label) html("span", null, label, row);
  }
  function pointerXY(ev) {
    if (ev.touches && ev.touches[0]) return [ev.touches[0].clientX, ev.touches[0].clientY];
    return [ev.clientX, ev.clientY];
  }

  /* ---------------------------------------------------------- fact chips */
  function factTip(node) {
    var src = SOURCES[node.getAttribute("data-src") || ""];
    var note = node.getAttribute("data-note");
    var r = node.getBoundingClientRect();
    showTip(function (t) {
      html("div", "tip-h", src ? src.label : "Fact", t);
      if (note) html("div", null, note, t);
      if (src && src.asOf) html("div", "tip-src", "As of " + src.asOf, t);
      if (!src) html("div", "tip-src", "No source recorded", t);
    }, r.left, r.bottom);
  }
  doc.querySelectorAll(".fact").forEach(function (node) {
    node.addEventListener("mouseenter", function () { factTip(node); });
    node.addEventListener("focus", function () { factTip(node); });
    node.addEventListener("mouseleave", hideTip);
    node.addEventListener("blur", hideTip);
  });

  /* ------------------------------------------------------------ chart frame */
  function frame(mount, opts) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var width = Math.max(260, mount.clientWidth || 600);
    var narrow = width < 560;
    var height = opts.height || (narrow ? 250 : 320);
    var m = { top: opts.top !== undefined ? opts.top : 26, right: opts.right !== undefined ? opts.right : (narrow ? 12 : 24), bottom: 30, left: opts.left !== undefined ? opts.left : 8 };
    var s = svg("svg", { width: width, height: height, viewBox: "0 0 " + width + " " + height }, mount);
    return { svg: s, width: width, height: height, m: m, narrow: narrow, iw: width - m.left - m.right, ih: height - m.top - m.bottom };
  }
  function yAxis(f, y, vals, format, unit, outside) {
    var g = svg("g", { "class": "grid" }, f.svg);
    var labels = svg("g", { "class": "axis" }, f.svg);
    vals.forEach(function (v, i) {
      var py = y(v);
      svg("line", { x1: f.m.left, x2: f.width - f.m.right, y1: py, y2: py, "class": i === 0 ? "baseline" : "" }, g);
      var label = fmt(v, format) + (i === vals.length - 1 && unit ? " " + unit : "");
      if (outside) txt(labels, f.m.left - 6, py + 4, label, { "text-anchor": "end" });
      else txt(labels, f.m.left, py - 5, label);
    });
  }
  function xAxis(f, xs, xpos, minGap) {
    var g = svg("g", { "class": "axis" }, f.svg);
    var gap = minGap || (f.narrow ? 64 : 72);
    var every = Math.max(1, Math.ceil(gap / Math.max(1, f.iw / Math.max(1, xs.length - 1))));
    var last = -1e9, lastYear = null;
    xs.forEach(function (x, i) {
      if (i % every !== 0 && i !== xs.length - 1) return;
      var px = xpos(i);
      if (px - last < gap * (lastYear === null ? 1.1 : 0.8)) return;
      last = px;
      var year = /^\d{4}/.test(String(x)) ? String(x).slice(0, 4) : null;
      var anchor = i === 0 ? "start" : (i === xs.length - 1 ? "end" : "middle");
      txt(g, px, f.height - 8, tickX(x, year !== null && year !== lastYear), { "text-anchor": anchor });
      lastYear = year;
      svg("line", { x1: px, x2: px, y1: f.height - f.m.bottom, y2: f.height - f.m.bottom + 4, stroke: "var(--ink-2)" }, g);
    });
  }
  function pathFrom(points) {
    var d = "", pen = false;
    points.forEach(function (p) {
      if (!p || p[1] === null || isNaN(p[1])) { pen = false; return; }
      d += (pen ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1);
      pen = true;
    });
    return d;
  }
  function indexRange(xs, focus) {
    if (!focus) return null;
    var lo = -1, hi = -1;
    for (var i = 0; i < xs.length; i++) {
      var s = String(xs[i]);
      if (lo < 0 && s >= String(focus.from)) lo = i;
      if (s <= String(focus.to || focus.from)) hi = i;
    }
    if (lo < 0 || hi < lo) return null;
    return [lo, hi];
  }
  function legend(parent, items, kind) {
    var ul = html("ul", "legend", null, null);
    items.forEach(function (it, i) {
      var li = html("li", null, null, ul);
      var key = html("span", "key" + (kind === "line" ? " line" : ""), null, li);
      key.style.background = seriesColor(i, it);
      if (it.opacity !== undefined) key.style.opacity = it.opacity;
      li.appendChild(doc.createTextNode(it.name));
    });
    parent.insertBefore(ul, parent.firstChild);
  }
  function hoverLayer(f, n, xpos, onMove, onLeave) {
    var hit = svg("rect", { x: f.m.left, y: f.m.top, width: f.iw, height: f.ih, fill: "transparent", tabindex: 0, "aria-label": "Chart, use arrow keys to read values" }, f.svg);
    var cross = svg("line", { "class": "crosshair", y1: f.m.top - 6, y2: f.height - f.m.bottom, visibility: "hidden" }, f.svg);
    var current = n - 1;
    function at(i, cx, cy) {
      current = clamp(i, 0, n - 1);
      var px = xpos(current);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
      onMove(current, cx, cy);
    }
    function move(ev) {
      var xy = pointerXY(ev);
      var r = f.svg.getBoundingClientRect();
      var local = (xy[0] - r.left) * (f.width / r.width);
      var best = 0, bd = 1e9;
      for (var i = 0; i < n; i++) { var dd = Math.abs(xpos(i) - local); if (dd < bd) { bd = dd; best = i; } }
      at(best, xy[0], xy[1]);
    }
    function leave() { cross.setAttribute("visibility", "hidden"); hideTip(); if (onLeave) onLeave(); }
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", leave);
    hit.addEventListener("blur", leave);
    hit.addEventListener("keydown", function (ev) {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      var r = hit.getBoundingClientRect();
      var ni = current + (ev.key === "ArrowRight" ? 1 : -1);
      var svgR = f.svg.getBoundingClientRect();
      at(ni, svgR.left + xpos(clamp(ni, 0, n - 1)) * (svgR.width / f.width), r.top + 20);
    });
    hit.addEventListener("focus", function () { var svgR = f.svg.getBoundingClientRect(); at(current, svgR.left + xpos(current) * (svgR.width / f.width), svgR.top + 30); });
    return hit;
  }


  /* --------------------------------------------------------- line and area */
  function drawLine(mount, spec, state) {
    var data = spec.data, xs = data.x, series = data.series;
    var format = (spec.format && spec.format.y) || "auto";
    var stacked = spec.chart === "stacked";
    var area = spec.chart === "area";
    var n = xs.length;
    var narrow = (mount.clientWidth || 600) < 560;
    var labelRoom = stacked ? 8 : (narrow ? 64 : 120);
    var f = frame(mount, { right: labelRoom, top: spec.notes && spec.notes.length ? 46 : 26, left: stacked ? 40 : 8 });
    var tops = [];
    if (stacked) {
      var acc = new Array(n).fill(0);
      series.forEach(function (s) {
        var lower = acc.slice();
        acc = acc.map(function (v, i) { return v + (Number(s.values[i]) || 0); });
        tops.push({ lower: lower, upper: acc.slice() });
      });
    }
    var maxV = stacked ? (spec.normalize ? 100 : Math.max.apply(null, tops[tops.length - 1].upper)) : Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.values.filter(function (v) { return v !== null; })); }));
    var minV = spec.y_min !== undefined ? spec.y_min : 0;
    var top = spec.y_max !== undefined ? spec.y_max : (stacked && spec.normalize ? 100 : niceMax(maxV));
    var y = linear(minV, top, f.height - f.m.bottom, f.m.top);
    var xpos = function (i) { return f.m.left + (n === 1 ? f.iw / 2 : i / (n - 1) * f.iw); };
    yAxis(f, y, ticks(minV, top, f.narrow ? 3 : 4), format, spec.unit, stacked);
    var range = indexRange(xs, state.focus);
    if (range) {
      var x0 = xpos(range[0]) - (range[0] === range[1] ? 6 : 0), x1 = xpos(range[1]) + (range[0] === range[1] ? 6 : 0);
      svg("rect", { "class": "focus-band", x: x0, y: f.m.top - 6, width: Math.max(2, x1 - x0), height: f.ih + 6 }, f.svg);
    }
    var layer = svg("g", null, f.svg);
    if (stacked) {
      series.forEach(function (s, si) {
        var t = tops[si];
        var d = "";
        for (var i = 0; i < n; i++) d += (i ? "L" : "M") + xpos(i).toFixed(1) + "," + y(t.upper[i]).toFixed(1);
        for (var j = n - 1; j >= 0; j--) d += "L" + xpos(j).toFixed(1) + "," + y(t.lower[j]).toFixed(1);
        var p = svg("path", { d: d + "Z" }, layer);
        p.style.fill = seriesColor(si, s);
        p.style.opacity = si === 0 ? 0.85 : 0.32;
        if (si > 0) {
          var edge = svg("path", { d: pathFrom(t.lower.map(function (v, i) { return [xpos(i), y(v)]; })), fill: "none", "stroke-width": 2 }, layer);
          edge.style.stroke = "var(--paper)";
        }
      });
      series.forEach(function (s, si) {
        var t = tops[si];
        var mid = (t.upper[n - 1] + t.lower[n - 1]) / 2;
        var band = y(t.lower[n - 1]) - y(t.upper[n - 1]);
        if (band < 28) return;
        var lx = xpos(n - 1) - 8;
        var a = txt(layer, lx, y(mid) - 2, s.name, { "text-anchor": "end", "class": "label-strong" });
        a.style.fill = si === 0 ? "#FFFFFF" : "var(--ink)";
        var b = txt(layer, lx, y(mid) + 14, fmt(s.values[n - 1], format), { "text-anchor": "end" });
        b.style.fill = si === 0 ? "#FFFFFF" : "var(--ink)";
      });
      if (range) {
        var t0 = tops[0];
        var seg = [];
        for (var k = range[0]; k <= range[1]; k++) seg.push([xpos(k), y(t0.upper[k])]);
        var hl = svg("path", { d: pathFrom(seg), fill: "none", "stroke-width": 3, "stroke-linecap": "round" }, layer);
        hl.style.stroke = "var(--ink)";
        var endI = range[1];
        svg("circle", { cx: xpos(endI), cy: y(t0.upper[endI]), r: 4.5, "stroke-width": 2 }, layer).style.cssText = "fill:var(--ink);stroke:var(--paper)";
        if (endI < n - 1) {
          var lab = txt(layer, xpos(endI), y(t0.upper[endI]) - 10, fmt(series[0].values[endI], format), { "text-anchor": endI > n * 0.8 ? "end" : "middle", "class": "label-strong" });
          lab.style.fontSize = "13px";
        }
      }
      legend(mount, series.map(function (s, si) { return { name: s.name, color: s.color, opacity: si === 0 ? 0.85 : 0.32 }; }), "area");
    } else {
      series.forEach(function (s, si) {
        var pts = s.values.map(function (v, i) { return [xpos(i), v === null ? null : y(v)]; });
        if (area || series.length === 1) {
          var d = pathFrom(pts);
          if (d) {
            var first = pts.findIndex(function (p) { return p[1] !== null; });
            var lastI = pts.length - 1;
            var ad = d + "L" + xpos(lastI).toFixed(1) + "," + y(minV).toFixed(1) + "L" + xpos(first).toFixed(1) + "," + y(minV).toFixed(1) + "Z";
            var ap = svg("path", { d: ad }, layer);
            ap.style.fill = seriesColor(si, s); ap.style.opacity = 0.1;
          }
        }
        var line = svg("path", { d: pathFrom(pts), fill: "none", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", "class": range ? "dimmed" : "" }, layer);
        line.style.stroke = seriesColor(si, s);
        if (range) {
          var seg2 = pts.slice(range[0], range[1] + 1);
          var hl2 = svg("path", { d: pathFrom(seg2), fill: "none", "stroke-width": 3, "stroke-linecap": "round" }, layer);
          hl2.style.stroke = seriesColor(si, s);
          var peak = range[0];
          for (var q = range[0]; q <= range[1]; q++) if ((s.values[q] || 0) > (s.values[peak] || 0)) peak = q;
          var showI = state.focus && state.focus.at === "end" ? range[1] : peak;
          if (s.values[showI] !== null) {
            svg("circle", { cx: xpos(showI), cy: y(s.values[showI]), r: 4.5, "stroke-width": 2 }, layer).style.cssText = "fill:" + seriesColor(si, s) + ";stroke:var(--paper)";
            txt(layer, xpos(showI), y(s.values[showI]) - 11, fmt(s.values[showI], format), { "text-anchor": showI > n * 0.85 ? "end" : (showI < n * 0.1 ? "start" : "middle"), "class": "label-strong" });
          }
        }
        var lastIdx = s.values.length - 1;
        while (lastIdx > 0 && s.values[lastIdx] === null) lastIdx--;
        var ly = y(s.values[lastIdx]);
        var dot = svg("circle", { cx: xpos(lastIdx), cy: ly, r: 4, "stroke-width": 2 }, layer);
        dot.style.cssText = "fill:" + seriesColor(si, s) + ";stroke:var(--paper)";
        if (!range) {
          var tx = xpos(lastIdx) + 8;
          txt(layer, tx, ly + 4, fmt(s.values[lastIdx], format) + (spec.unit && !f.narrow ? " " + spec.unit : ""), { "class": "label-strong" });
          if (!f.narrow && series.length > 1) txt(layer, tx, ly + 19, s.name);
        }
      });
      if (series.length > 1) legend(mount, series, "line");
    }
    var noteEnds = [];
    (spec.notes || []).forEach(function (note, k) {
      var i = xs.indexOf(note.x);
      if (i < 0) return;
      var px = xpos(i);
      var v = series[0].values[i];
      var py = y(stacked ? tops[0].upper[i] : v);
      var half = String(note.text).length * 3.3 + 8;
      var row = 0;
      while (noteEnds[row] !== undefined && noteEnds[row] > px - half) row++;
      noteEnds[row] = px + half;
      var ty = 14 + row * 15;
      svg("line", { "class": "note-line", x1: px, x2: px, y1: ty + 6, y2: py - 7 }, f.svg);
      var anchor = px > f.width * 0.7 ? "end" : (px < f.width * 0.15 ? "start" : "middle");
      txt(f.svg, px, ty, note.text, { "class": "note-text", "text-anchor": anchor });
    });
    xAxis(f, xs, xpos);
    hoverLayer(f, n, xpos, function (i, cx, cy) {
      showTip(function (t) {
        html("div", "tip-h", labelX(xs[i]), t);
        series.forEach(function (s, si) { tipRow(t, seriesColor(si, s), fmt(s.values[i], format), s.name); });
      }, cx, cy);
    });
    return {
      table: function () {
        return { cols: ["", ].concat(series.map(function (s) { return s.name; })), rows: xs.map(function (x, i) { return [labelX(x)].concat(series.map(function (s) { return fmt(s.values[i], format); })); }) };
      }
    };
  }

  /* ---------------------------------------------------------------- bars */
  function barPath(x, y0, w, y1, r) {
    var top = Math.min(y0, y1), h = Math.abs(y1 - y0);
    var rr = Math.min(r, w / 2, h);
    return "M" + x + "," + (top + h) + "V" + (top + rr) + "Q" + x + "," + top + " " + (x + rr) + "," + top + "H" + (x + w - rr) + "Q" + (x + w) + "," + top + " " + (x + w) + "," + (top + rr) + "V" + (top + h) + "Z";
  }
  function drawBars(mount, spec) {
    var data = spec.data, cats = data.categories, series = data.series;
    var format = (spec.format && spec.format.y) || "auto";
    var stacked = !!spec.stacked;
    var f = frame(mount, { right: 8, left: 46 });
    var n = cats.length;
    var totals = cats.map(function (_, i) { return series.reduce(function (a, s) { return a + (Number(s.values[i]) || 0); }, 0); });
    var maxV = stacked ? Math.max.apply(null, totals) : Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.values); }));
    var top = niceMax(maxV);
    var y = linear(0, top, f.height - f.m.bottom, f.m.top);
    yAxis(f, y, ticks(0, top, f.narrow ? 3 : 4), format, "", true);
    var slot = f.iw / n;
    var groupW = stacked ? Math.min(24, slot - 4) : Math.min(24 * series.length + 2 * (series.length - 1), slot - 4);
    var barW = stacked ? groupW : (groupW - 2 * (series.length - 1)) / series.length;
    var xpos = function (i) { return f.m.left + slot * i + slot / 2; };
    var layer = svg("g", null, f.svg);
    cats.forEach(function (c, i) {
      var base = 0;
      series.forEach(function (s, si) {
        var v = Number(s.values[i]) || 0;
        if (!v) return;
        var x = stacked ? xpos(i) - barW / 2 : xpos(i) - groupW / 2 + si * (barW + 2);
        var y0 = stacked ? y(base) : y(0);
        var y1 = stacked ? y(base + v) : y(v);
        var isTop = !stacked || si === series.length - 1 || series.slice(si + 1).every(function (o) { return !(Number(o.values[i]) || 0); });
        var gap = stacked && base > 0 ? 2 : 0;
        var d = isTop ? barPath(x, y0 - gap, barW, y1, 4) : "M" + x + "," + (y0 - gap) + "V" + y1 + "H" + (x + barW) + "V" + (y0 - gap) + "Z";
        var p = svg("path", { d: d, tabindex: -1 }, layer);
        p.style.fill = seriesColor(si, s);
        p.addEventListener("pointermove", function (ev) {
          var xy = pointerXY(ev);
          p.style.opacity = 0.8;
          showTip(function (t) {
            html("div", "tip-h", labelX(c), t);
            series.forEach(function (o, oi) { tipRow(t, seriesColor(oi, o), fmt(o.values[i], format), o.name); });
            if (stacked) tipRow(t, null, fmt(totals[i], format), "total");
          }, xy[0], xy[1]);
        });
        p.addEventListener("pointerleave", function () { p.style.opacity = 1; hideTip(); });
        base += v;
      });
    });
    var lastI = n - 1;
    txt(layer, xpos(lastI), y(stacked ? totals[lastI] : series[0].values[lastI]) - 8, fmt(stacked ? totals[lastI] : series[0].values[lastI], format), { "text-anchor": "end", "class": "label-strong" });
    xAxis(f, cats, xpos);
    if (series.length > 1) legend(mount, series, "bar");
    return {
      table: function () {
        var cols = [""].concat(series.map(function (s) { return s.name; }));
        if (stacked) cols.push("Total");
        return { cols: cols, rows: cats.map(function (c, i) { var r = [labelX(c)].concat(series.map(function (s) { return fmt(s.values[i], format); })); if (stacked) r.push(fmt(totals[i], format)); return r; }) };
      }
    };
  }

  /* -------------------------------------------------------------- burnup */
  function project(done, scope, velocity, growth, maxSprints) {
    var d = done, s = scope, out = [];
    for (var k = 1; k <= maxSprints; k++) {
      d += velocity; s += growth;
      out.push([d, s]);
      if (d >= s) break;
    }
    return out;
  }
  function drawBurnup(mount, spec, state) {
    var data = spec.data;
    var xs = data.x, scope = data.scope, done = data.done;
    var v = state.velocity !== undefined ? state.velocity : Number(data.velocity);
    var g = state.growth !== undefined ? state.growth : Number(data.growth);
    var n = xs.length;
    var horizon = 30;
    var mid = project(done[n - 1], scope[n - 1], v, g, horizon);
    var fast = project(done[n - 1], scope[n - 1], v * 1.15, g, horizon);
    var slow = project(done[n - 1], scope[n - 1], v * 0.85, g, horizon);
    var extra = Math.min(horizon, Math.max(mid.length, Math.min(slow.length, mid.length + 6)) + 1);
    var total = n + extra;
    var f = frame(mount, { right: f2narrow(mount) ? 10 : 132, height: spec.height });
    var maxV = Math.max(scope[n - 1] + g * extra, done[n - 1] + v * extra * 0.5);
    var top = niceMax(Math.max.apply(null, scope.concat([maxV])));
    var y = linear(0, top, f.height - f.m.bottom, f.m.top);
    var xpos = function (i) { return f.m.left + i / (total - 1) * f.iw; };
    yAxis(f, y, ticks(0, top, f.narrow ? 3 : 4), "int", "pts");
    var layer = svg("g", null, f.svg);
    var last = n - 1;
    var start = parseDate(xs[last]);
    var dateAt = function (i) { return i <= last ? parseDate(xs[i]) : addDays(start, 14 * (i - last)); };
    if (state.target) {
      var tgt = parseDate(state.target);
      var ti = last + (tgt - start) / (14 * 86400000);
      if (ti > 0 && ti < total) {
        var tx = xpos(ti);
        svg("line", { x1: tx, x2: tx, y1: f.m.top - 4, y2: f.height - f.m.bottom, "stroke-dasharray": "4 3", "class": "note-line" }, layer);
        if (!f.narrow) txt(layer, tx - 4, f.m.top + 6, "Target", { "text-anchor": "end", "class": "note-text sub" });
      }
    }
    var cone = "M" + xpos(last) + "," + y(done[last]);
    fast.forEach(function (p, k) { cone += "L" + xpos(last + k + 1) + "," + y(Math.min(p[0], top)); });
    for (var k2 = slow.length - 1; k2 >= 0; k2--) cone += "L" + xpos(last + k2 + 1) + "," + y(slow[k2][0]);
    var cp = svg("path", { d: cone + "Z" }, layer);
    cp.style.fill = "var(--s1)"; cp.style.opacity = 0.12;
    var donePts = done.map(function (d, i) { return [xpos(i), y(d)]; });
    var area = pathFrom(donePts) + "L" + xpos(last) + "," + y(0) + "L" + xpos(0) + "," + y(0) + "Z";
    var ap = svg("path", { d: area }, layer); ap.style.fill = "var(--s1)"; ap.style.opacity = 0.1;
    var sl = svg("path", { d: pathFrom(scope.map(function (s, i) { return [xpos(i), y(s)]; })), fill: "none", "stroke-width": 2 }, layer);
    sl.style.stroke = "var(--ink-2)";
    var dl = svg("path", { d: pathFrom(donePts), fill: "none", "stroke-width": 2.2 }, layer);
    dl.style.stroke = "var(--s1)";
    var projS = [[xpos(last), y(scope[last])]].concat(mid.map(function (p, k) { return [xpos(last + k + 1), y(p[1])]; }));
    var projD = [[xpos(last), y(done[last])]].concat(mid.map(function (p, k) { return [xpos(last + k + 1), y(p[0])]; }));
    var ps = svg("path", { d: pathFrom(projS), fill: "none", "stroke-width": 1.6, "stroke-dasharray": "5 4" }, layer); ps.style.stroke = "var(--ink-2)";
    var pd = svg("path", { d: pathFrom(projD), fill: "none", "stroke-width": 1.8, "stroke-dasharray": "5 4" }, layer); pd.style.stroke = "var(--s1)";
    var finishes = mid.length && mid[mid.length - 1][0] >= mid[mid.length - 1][1];
    var narrow = f.narrow;
    var labX = xpos(last) + 6;
    txt(layer, xpos(last) - 6, y(scope[last]) + (f.narrow ? 18 : -9), "Scope " + fmt(scope[last], "int"), { "text-anchor": "end", "class": "label-strong" });
    txt(layer, xpos(last) - 8, y(done[last]) + 40, "Done " + fmt(done[last], "int"), { "text-anchor": "end", "class": "label-strong" });
    svg("circle", { cx: xpos(last), cy: y(done[last]), r: 4, "stroke-width": 2 }, layer).style.cssText = "fill:var(--s1);stroke:var(--paper)";
    var finishInfo = null;
    if (finishes) {
      var fi = last + mid.length;
      var fd = dateAt(fi);
      var fx = xpos(fi), fy = y(mid[mid.length - 1][1]);
      svg("circle", { cx: fx, cy: fy, r: 5.5, "stroke-width": 2 }, layer).style.cssText = "fill:var(--ink);stroke:var(--paper)";
      if (narrow) {
        txt(layer, fx, fy - 12, "Finish " + fmtDate(fd), { "text-anchor": "end", "class": "label-strong" });
      } else {
        txt(layer, fx + 10, fy - 6, "Projected finish", { "class": "note-text sub" });
        txt(layer, fx + 10, fy + 10, fmtDate(fd), { "class": "label-strong" });
      }
      finishInfo = { date: fd, sprints: mid.length };
    } else {
      txt(layer, labX, y(done[last]) - 30, "No finish at this pace", { "class": "label-strong" });
    }
    var dates = []; for (var i = 0; i < total; i++) dates.push(isoDay(dateAt(i)).slice(0, 7));
    xAxis(f, dates, xpos);
    hoverLayer(f, total, xpos, function (i, cx, cy) {
      showTip(function (t) {
        var dd = dateAt(i);
        html("div", "tip-h", (i <= last ? "Sprint " + (i + 1) + ", ended " : "Projected, ") + fmtDate(dd), t);
        if (i <= last) {
          tipRow(t, "var(--s1)", fmt(done[i], "int"), "points done");
          tipRow(t, "var(--ink-2)", fmt(scope[i], "int"), "points in scope");
        } else if (mid[i - last - 1]) {
          tipRow(t, "var(--s1)", fmt(Math.min(mid[i - last - 1][0], mid[i - last - 1][1]), "int"), "done, projected");
          tipRow(t, "var(--ink-2)", fmt(mid[i - last - 1][1], "int"), "scope, projected");
        }
      }, cx, cy);
    });
    return {
      finish: finishInfo,
      table: function () { return { cols: ["Sprint end", "Done", "Scope"], rows: xs.map(function (x, i) { return [labelX(x), fmt(done[i], "int"), fmt(scope[i], "int")]; }) }; }
    };
  }
  function f2narrow(mount) { return (mount.clientWidth || 600) < 560; }

  /* ------------------------------------------------------------ calendar */
  function drawCalendar(mount, spec) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var vals = spec.data.values, start = parseDate(spec.data.start);
    var weeks = Math.ceil(vals.length / 7);
    var avail = Math.max(240, mount.clientWidth || 600) - 30;
    var gap = avail / weeks < 9 ? 1 : 2;
    var cell = clamp(Math.floor(avail / weeks) - gap, 3, 16);
    var step = cell + gap;
    var width = 30 + weeks * step, height = 22 + 7 * step + 30;
    var s = svg("svg", { width: width, height: height, viewBox: "0 0 " + width + " " + height }, mount);
    var max = Math.max.apply(null, vals);
    var bins = [0, 1, 3, 5, 8];
    function cls(v) { if (!v) return 0; for (var b = bins.length - 1; b >= 1; b--) if (v >= bins[b]) return b; return 1; }
    var g = svg("g", { "class": "axis" }, s);
    ["Mon", "Wed", "Fri"].forEach(function (d, k) { txt(g, 0, 22 + (k * 2) * step + cell - 1, d); });
    var lastMonth = -1, lastLabelX = -1e9;
    var unit = spec.unit || "";
    for (var i = 0; i < vals.length; i++) {
      var d = addDays(start, i);
      var w = Math.floor(i / 7), dow = (d.getUTCDay() + 6) % 7;
      var x = 30 + w * step, yy = 22 + dow * step;
      if (d.getUTCDate() <= 7 && d.getUTCMonth() !== lastMonth && dow === 0) {
        lastMonth = d.getUTCMonth();
        var mlabel = d.getUTCMonth() === 0 ? MONTHS[0] + " " + d.getUTCFullYear() : MONTHS[d.getUTCMonth()];
        if (x - lastLabelX > (d.getUTCMonth() === 0 ? 30 : 26)) { txt(g, x, 12, mlabel); lastLabelX = x + (mlabel.length > 3 ? 26 : 0); }
      }
      var r = svg("rect", { x: x, y: yy, width: cell, height: cell, rx: 2 }, s);
      r.style.fill = "var(--seq-" + cls(vals[i]) + ")";
      (function (date, v, rect) {
        rect.addEventListener("pointermove", function (ev) {
          var xy = pointerXY(ev);
          rect.style.stroke = "var(--ink)"; rect.style.strokeWidth = "1.5";
          showTip(function (t) { html("div", "tip-h", DAYS[date.getUTCDay()] + " " + fmtDate(date), t); tipRow(t, null, String(v), unit); }, xy[0], xy[1]);
        });
        rect.addEventListener("pointerleave", function () { rect.style.stroke = ""; hideTip(); });
      })(d, vals[i], r);
    }
    var ly = 22 + 7 * step + 18;
    var lx = Math.max(64, width - (bins.length * (cell + 3)) - 70);
    txt(g, lx - 6, ly + cell - 2, "Fewer", { "text-anchor": "end" });
    bins.forEach(function (b, k) { var rr = svg("rect", { x: lx + k * (cell + 3), y: ly, width: cell, height: cell, rx: 2 }, s); rr.style.fill = "var(--seq-" + k + ")"; });
    txt(g, lx + bins.length * (cell + 3) + 4, ly + cell - 2, "More (" + max + ")");
    var weeklyTotals = [];
    return {
      table: function () {
        var rows = [];
        for (var w2 = 0; w2 < weeks; w2++) {
          var sum = 0; for (var k = 0; k < 7; k++) sum += vals[w2 * 7 + k] || 0;
          rows.push(["Week of " + fmtDate(addDays(start, w2 * 7)), String(sum)]);
        }
        weeklyTotals = rows;
        return { cols: ["Week", unit || "Count"], rows: weeklyTotals };
      }
    };
  }

  /* -------------------------------------------------------- small multiples */
  function drawMultiples(mount, spec) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var items = spec.data.items, xs = spec.data.x;
    var format = (spec.format && spec.format.y) || "auto";
    var width = Math.max(260, mount.clientWidth || 600);
    var cols = width < 520 ? 1 : width < 900 ? 2 : items.length >= 4 ? 4 : items.length;
    var grid = html("div", null, null, mount);
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(" + cols + ", minmax(0, 1fr))";
    grid.style.gap = "1.4rem 1.6rem";
    var lo = spec.y_min !== undefined ? spec.y_min : Math.min.apply(null, items.map(function (it) { return Math.min.apply(null, it.values.filter(function (v) { return v !== null; })); }));
    var hi = spec.y_max !== undefined ? spec.y_max : Math.max.apply(null, items.map(function (it) { return Math.max.apply(null, it.values.filter(function (v) { return v !== null; })); }));
    items.forEach(function (it) {
      var cell = html("div", null, null, grid);
      var head = html("div", null, null, cell);
      head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;font:600 .86rem/1.3 var(--f-ui);margin-bottom:.2rem";
      html("span", null, it.name, head);
      var lastI = it.values.length - 1; while (lastI > 0 && it.values[lastI] === null) lastI--;
      var lv = html("span", null, fmt(it.values[lastI], format), head);
      lv.style.color = "var(--ink-2)"; lv.style.fontWeight = "500";
      var w = Math.floor((width - (cols - 1) * 26) / cols);
      var h = 120;
      var m = { l: 4, r: 6, t: 14, b: 20 };
      var s = svg("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h }, cell);
      var n = xs.length;
      var xpos = function (i) { return m.l + i / (n - 1) * (w - m.l - m.r); };
      var y = linear(lo, hi, h - m.b, m.t);
      var gg = svg("g", { "class": "grid" }, s);
      svg("line", { x1: m.l, x2: w - m.r, y1: y(lo), y2: y(lo), "class": "baseline" }, gg);
      svg("line", { x1: m.l, x2: w - m.r, y1: y(hi), y2: y(hi) }, gg);
      if (spec.target !== undefined) {
        var ty = y(Number(spec.target));
        var tl = svg("line", { x1: m.l, x2: w - m.r, y1: ty, y2: ty, "stroke-dasharray": "4 3", "stroke-width": 1.2 }, s);
        tl.style.stroke = "var(--bad)";
        txt(s, w - m.r, ty + 12, "Target " + fmt(spec.target, format), { "class": "note-text sub", "text-anchor": "end" }).style.fontSize = "10.5px";
      }
      var pts = it.values.map(function (v, i) { return [xpos(i), v === null ? null : y(clamp(v, lo, hi))]; });
      var firstI = pts.findIndex(function (p) { return p[1] !== null; });
      if (firstI >= 0) {
        var ad = pathFrom(pts) + "L" + xpos(lastI) + "," + y(lo) + "L" + xpos(firstI) + "," + y(lo) + "Z";
        var ap = svg("path", { d: ad }, s); ap.style.fill = "var(--s1)"; ap.style.opacity = 0.1;
      }
      var ln = svg("path", { d: pathFrom(pts), fill: "none", "stroke-width": 2, "stroke-linejoin": "round" }, s);
      ln.style.stroke = "var(--s1)";
      var minI = -1; it.values.forEach(function (v, i) { if (v !== null && (minI < 0 || v < it.values[minI])) minI = i; });
      if (minI >= 0 && it.values[minI] < Number(spec.target)) {
        var c = svg("circle", { cx: xpos(minI), cy: y(it.values[minI]), r: 3.5, "stroke-width": 2 }, s);
        c.style.cssText = "fill:var(--bad);stroke:var(--paper)";
        txt(s, xpos(minI) + 6, y(it.values[minI]) + 3, fmt(it.values[minI], format), { "class": "note-text" }).style.fontSize = "10.5px";
      }
      var ax = svg("g", { "class": "axis" }, s);
      if (firstI >= 0) txt(ax, xpos(firstI), h - 5, tickX(xs[firstI], true), { "text-anchor": firstI > n * 0.6 ? "end" : "start" }).style.fontSize = "10.5px";
      txt(ax, xpos(n - 1), h - 5, tickX(xs[n - 1], true), { "text-anchor": "end" }).style.fontSize = "10.5px";
      var cross = svg("line", { "class": "crosshair", y1: m.t, y2: h - m.b, visibility: "hidden" }, s);
      var hit = svg("rect", { x: m.l, y: 0, width: w - m.l - m.r, height: h, fill: "transparent" }, s);
      hit.addEventListener("pointermove", function (ev) {
        var xy = pointerXY(ev), r = s.getBoundingClientRect();
        var i = clamp(Math.round(((xy[0] - r.left) * (w / r.width) - m.l) / (w - m.l - m.r) * (n - 1)), 0, n - 1);
        cross.setAttribute("x1", xpos(i)); cross.setAttribute("x2", xpos(i)); cross.setAttribute("visibility", "visible");
        showTip(function (t) { html("div", "tip-h", it.name + ", " + labelX(xs[i]), t); tipRow(t, "var(--s1)", it.values[i] === null ? "Not live" : fmt(it.values[i], format), ""); }, xy[0], xy[1]);
      });
      hit.addEventListener("pointerleave", function () { cross.setAttribute("visibility", "hidden"); hideTip(); });
    });
    return {
      table: function () { return { cols: [""].concat(items.map(function (it) { return it.name; })), rows: xs.map(function (x, i) { return [labelX(x)].concat(items.map(function (it) { return it.values[i] === null ? "" : fmt(it.values[i], format); })); }) }; }
    };
  }

  /* ----------------------------------------------------------------- slope */
  function drawSlope(mount, spec) {
    while (mount.firstChild) mount.removeChild(mount.firstChild);
    var items = spec.data.items, labels = spec.data.labels || ["Before", "After"];
    var width = Math.max(260, mount.clientWidth || 600);
    var cols = width < 520 ? 2 : 4;
    var grid = html("div", null, null, mount);
    grid.style.cssText = "display:grid;grid-template-columns:repeat(" + cols + ",minmax(0,1fr));gap:1.2rem 1.4rem";
    items.forEach(function (it) {
      var cell = html("div", null, null, grid);
      cell.style.borderTop = "1px solid var(--rule)";
      cell.style.paddingTop = ".5rem";
      var title = html("div", null, it.name, cell);
      title.style.cssText = "font:600 .84rem/1.3 var(--f-ui);min-height:2.3em";
      var w = Math.floor((width - (cols - 1) * 22) / cols), h = 170;
      var s = svg("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h }, cell);
      var before = Number(it.before), after = Number(it.after);
      var top = Math.max(before, after) * 1.08;
      var y = linear(0, top, h - 34, 22);
      var x0 = 46, x1 = w - 46;
      svg("line", { x1: x0, x2: x0, y1: y(0), y2: y(top), stroke: "var(--grid)" }, s);
      svg("line", { x1: x1, x2: x1, y1: y(0), y2: y(top), stroke: "var(--grid)" }, s);
      var better = (it.better === "up") === (after > before);
      var ln = svg("line", { x1: x0, y1: y(before), x2: x1, y2: y(after), "stroke-width": 2 }, s);
      ln.style.stroke = "var(--ink-2)";
      var c0 = svg("circle", { cx: x0, cy: y(before), r: 5, "stroke-width": 2 }, s); c0.style.cssText = "fill:var(--legacy);stroke:var(--paper)";
      var c1 = svg("circle", { cx: x1, cy: y(after), r: 5, "stroke-width": 2 }, s); c1.style.cssText = "fill:var(--s1);stroke:var(--paper)";
      var f0 = fmt(before, it.format), f1 = fmt(after, it.format);
      txt(s, x0 - 10, y(before) + 5, f0, { "class": "label-strong", "text-anchor": "end" }).style.fontSize = "14px";
      txt(s, x1 + 10, y(after) + 5, f1, { "class": "label-strong" }).style.fontSize = "14px";
      var ax = svg("g", { "class": "axis" }, s);
      var short = w < 240;
      var la = short ? String(labels[0]).slice(-4) : labels[0], lb = short ? String(labels[1]).slice(-4) : labels[1];
      txt(ax, x0, h - 16, la, { "text-anchor": "middle" }).style.fontSize = "10.5px";
      txt(ax, x1, h - 16, lb, { "text-anchor": "middle" }).style.fontSize = "10.5px";
      var ratio = before && after ? (after > before ? after / before : before / after) : 0;
      var verdict = html("div", null, (better ? "Better" : "Worse") + (ratio ? ", " + (ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)) + "×" : ""), cell);
      verdict.style.cssText = "font:600 .74rem/1.3 var(--f-ui);letter-spacing:.04em;color:" + (better ? "var(--good)" : "var(--bad)");
    });
    return { table: function () { return { cols: ["Measure", labels[0], labels[1]], rows: items.map(function (it) { return [it.name, fmt(it.before, it.format), fmt(it.after, it.format)]; }) }; } };
  }

  var CHARTS = { line: drawLine, area: drawLine, stacked: drawLine, bars: drawBars, burnup: drawBurnup, calendar: drawCalendar, multiples: drawMultiples, slope: drawSlope };

  /* ------------------------------------------------------- chart wrapper */
  function mountChart(fig, spec, mount, state) {
    var draw = CHARTS[spec.chart];
    if (!draw || !mount) return null;
    var ctl = { state: state || {}, api: null };
    function render() {
      try { ctl.api = draw(mount, spec, ctl.state); }
      catch (err) {
        while (mount.firstChild) mount.removeChild(mount.firstChild);
        html("p", "fig-note", "This chart could not be drawn: " + err.message, mount);
      }
    }
    ctl.render = render;
    ctl.update = function (patch) { for (var k in patch) ctl.state[k] = patch[k]; render(); };
    render();
    var lastW = mount.clientWidth;
    if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(mount.clientWidth - lastW) > 8) { lastW = mount.clientWidth; render(); } }).observe(mount);
    var btn = fig && fig.querySelector(".show-table");
    var slot = fig && fig.querySelector(".table-slot");
    if (btn && slot) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        btn.textContent = open ? "Show the numbers" : "Hide the numbers";
        slot.hidden = open;
        if (!open && ctl.api && ctl.api.table) {
          while (slot.firstChild) slot.removeChild(slot.firstChild);
          var t = ctl.api.table();
          var table = html("table", "data-table", null, slot);
          var tr = html("tr", null, null, html("thead", null, null, table));
          t.cols.forEach(function (c) { html("th", null, c, tr).setAttribute("scope", "col"); });
          var tb = html("tbody", null, null, table);
          t.rows.forEach(function (r) { var row = html("tr", null, null, tb); r.forEach(function (c) { html("td", null, c, row); }); });
        }
      });
    }
    return ctl;
  }


  /* -------------------------------------------------------------- figures */
  var scrollers = [];
  var plates = [];

  function initStats(node, spec) {
    var sparks = spec.sparks || {};
    Object.keys(sparks).forEach(function (k) {
      var stat = node.querySelector('.stat[data-i="' + k + '"] .spark');
      var vals = (sparks[k] || []).filter(function (v) { return v !== null; });
      if (!stat || vals.length < 2) return;
      function draw() {
        while (stat.firstChild) stat.removeChild(stat.firstChild);
        var w = stat.clientWidth || 160, h = 30;
        stat.setAttribute("viewBox", "0 0 " + w + " " + h);
        var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
        var y = linear(lo, hi, h - 4, 4);
        var pts = vals.map(function (v, i) { return [2 + i / (vals.length - 1) * (w - 8), y(v)]; });
        var p = svg("path", { d: pathFrom(pts), fill: "none", "stroke-width": 1.6, "stroke-linejoin": "round" }, stat);
        p.style.stroke = "var(--muted)";
        var e = pts[pts.length - 1];
        svg("circle", { cx: e[0], cy: e[1], r: 3.2, "stroke-width": 1.5 }, stat).style.cssText = "fill:var(--accent);stroke:var(--paper)";
      }
      draw();
      if (window.ResizeObserver) new ResizeObserver(draw).observe(stat);
    });
  }

  function initScrolly(node, spec) {
    var mount = node.querySelector(".mount");
    var ctl = mountChart(node, spec.chart, mount, {});
    var steps = Array.prototype.slice.call(node.querySelectorAll(".step"));
    var active = -1;
    scrollers.push(function (vh) {
      var idx = -1;
      steps.forEach(function (s, i) { if (s.getBoundingClientRect().top < vh * 0.62) idx = i; });
      if (idx === active) return;
      active = idx;
      steps.forEach(function (s, i) { s.classList.toggle("on", i === idx); });
      if (ctl) ctl.update({ focus: idx >= 0 ? (spec.steps[idx].focus || null) : null });
    });
  }

  function initTimeline(node, spec) {
    var mount = node.querySelector(".mount");
    var list = Array.prototype.slice.call(node.querySelectorAll(".ev"));
    var events = spec.events || [];
    var eras = spec.eras || [];
    var selected = 0;
    var todayStr = spec.today;
    events.forEach(function (ev, i) { if (!todayStr || ev.date <= todayStr) selected = i; });
    function select(i) {
      selected = i;
      list.forEach(function (li, k) { li.classList.toggle("on", k === i); });
      draw();
    }
    function draw() {
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      var width = Math.max(280, mount.clientWidth || 600), narrow = width < 600;
      var height = narrow ? 120 : 150;
      var s = svg("svg", { width: width, height: height, viewBox: "0 0 " + width + " " + height }, mount);
      var dates = events.map(function (e) { return parseDate(e.date); });
      eras.forEach(function (e) { dates.push(parseDate(e.from)); dates.push(parseDate(e.to)); });
      var t0 = Math.min.apply(null, dates), t1 = Math.max.apply(null, dates);
      var x = linear(t0, t1, 10, width - 10);
      var trackY = narrow ? 70 : 88;
      eras.forEach(function (e, k) {
        var a = x(parseDate(e.from)), b = x(parseDate(e.to));
        svg("rect", { x: a, y: 18, width: Math.max(1, b - a - 2), height: trackY - 8, "class": "tl-era" + (k % 2 ? " alt" : "") }, s);
        if (e.label.length * 7 + 12 < b - a) txt(s, a + 6, 32, e.label, { "class": "tl-era-label" });
      });
      svg("line", { x1: 10, x2: width - 10, y1: trackY, y2: trackY, stroke: "var(--ink-2)", "stroke-width": 1.2 }, s);
      var year = new Date(t0).getUTCFullYear();
      var ax = svg("g", { "class": "axis" }, s);
      for (var yr = year; yr <= new Date(t1).getUTCFullYear(); yr++) {
        for (var mo = 0; mo < 12; mo += 3) {
          var td = Date.UTC(yr, mo, 1);
          if (td < t0 || td > t1) continue;
          var px = x(td);
          svg("line", { x1: px, x2: px, y1: trackY, y2: trackY + 5, stroke: "var(--ink-2)" }, ax);
          txt(ax, px, trackY + 19, mo === 0 ? String(yr) : MONTHS[mo], { "text-anchor": "middle" });
        }
      }
      if (todayStr) {
        var tx = x(parseDate(todayStr));
        svg("line", { x1: tx, x2: tx, y1: 14, y2: trackY + 6, "class": "tl-today" }, s);
        txt(s, tx + 4, 14, "Today", { "class": "tl-today-label" });
      }
      events.forEach(function (ev, i) {
        var g = svg("g", { "class": "tl-ev" + (i === selected ? " on" : ""), tabindex: 0, role: "button", "aria-label": ev.title }, s);
        var px = x(parseDate(ev.date));
        svg("circle", { cx: px, cy: trackY, r: 12, fill: "transparent" }, g);
        svg("circle", { cx: px, cy: trackY, r: i === selected ? 7 : 5.5, "class": "tl-dot " + (ev.kind || "milestone") }, g);
        if (i === selected) {
          var anchor = px > width * 0.75 ? "end" : (px < width * 0.2 ? "start" : "middle");
          txt(g, px, trackY - 14, ev.title, { "text-anchor": anchor });
        }
        g.addEventListener("click", function () { select(i); });
        g.addEventListener("keydown", function (e2) {
          if (e2.key === "Enter" || e2.key === " ") { e2.preventDefault(); select(i); }
          if (e2.key === "ArrowRight" || e2.key === "ArrowLeft") {
            e2.preventDefault();
            var ni = clamp(i + (e2.key === "ArrowRight" ? 1 : -1), 0, events.length - 1);
            select(ni);
            var nodes = mount.querySelectorAll(".tl-ev"); if (nodes[ni]) nodes[ni].focus();
          }
        });
        g.addEventListener("pointerenter", function (e3) {
          var xy = pointerXY(e3);
          showTip(function (t) { html("div", "tip-h", ev.title, t); html("div", null, fmtDate(parseDate(ev.date)), t); }, xy[0], xy[1]);
        });
        g.addEventListener("pointerleave", hideTip);
      });
    }
    select(selected);
    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(mount);
  }

  function initStepper(node, spec) {
    var items = Array.prototype.slice.call(node.querySelectorAll(".st"));
    var controls = node.querySelector(".st-controls");
    var prev = node.querySelector(".st-prev"), next = node.querySelector(".st-next"), count = node.querySelector(".st-count");
    var ctl = spec.chart ? mountChart(node, spec.chart, node.querySelector(".mount"), {}) : null;
    var at = 0;
    controls.hidden = false;
    function go(i) {
      at = clamp(i, 0, items.length - 1);
      items.forEach(function (it, k) { it.classList.toggle("on", k === at); });
      prev.disabled = at === 0; next.disabled = at === items.length - 1;
      count.textContent = "Step " + (at + 1) + " of " + items.length;
      if (ctl) ctl.update({ focus: spec.steps[at].focus || null });
    }
    prev.addEventListener("click", function () { go(at - 1); });
    next.addEventListener("click", function () { go(at + 1); });
    node.addEventListener("keydown", function (ev) {
      if (ev.target.closest && ev.target.closest(".mount")) return;
      if (ev.key === "ArrowRight") go(at + 1);
      if (ev.key === "ArrowLeft") go(at - 1);
    });
    go(0);
  }

  function initCompare(node) {
    var flips = Array.prototype.slice.call(node.querySelectorAll(".flip"));
    var seg = Array.prototype.slice.call(node.querySelectorAll(".seg button"));
    flips.forEach(function (b) { b.addEventListener("click", function () { b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); }); });
    seg.forEach(function (b) {
      b.addEventListener("click", function () {
        var side = b.getAttribute("data-side") === "1";
        seg.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        flips.forEach(function (f, k) { setTimeout(function () { f.setAttribute("aria-pressed", side ? "true" : "false"); }, reduceMotion ? 0 : k * 90); });
      });
    });
  }

  function initMatrix(node, spec) {
    var mount = node.querySelector(".mount");
    var rows = Array.prototype.slice.call(node.querySelectorAll(".risk"));
    var items = spec.items || [];
    var selected = -1;
    function select(i) {
      selected = selected === i ? -1 : i;
      rows.forEach(function (r, k) { r.classList.toggle("on", k === selected); r.querySelector(".risk-btn").setAttribute("aria-expanded", k === selected ? "true" : "false"); });
      draw();
    }
    rows.forEach(function (r, k) { r.querySelector(".risk-btn").addEventListener("click", function () { select(k); }); });
    function draw() {
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      var width = Math.max(260, Math.min(mount.clientWidth || 400, 460));
      var pad = 34, size = width - pad - 6, cell = size / 5;
      var s = svg("svg", { width: width, height: size + pad + 6, viewBox: "0 0 " + width + " " + (size + pad + 6) }, mount);
      for (var li = 1; li <= 5; li++) for (var im = 1; im <= 5; im++) {
        var score = li * im;
        var r = svg("rect", { x: pad + (li - 1) * cell + 1, y: (5 - im) * cell + 1, width: cell - 2, height: cell - 2, "class": "mx-cell" }, s);
        if (score >= 12) { var hot = svg("rect", { x: pad + (li - 1) * cell + 1, y: (5 - im) * cell + 1, width: cell - 2, height: cell - 2, "class": "mx-hot" }, s); hot.style.opacity = String(0.06 + (score - 12) / 13 * 0.22); }
        r.setAttribute("rx", 2);
      }
      var ax = svg("g", { "class": "axis" }, s);
      txt(ax, pad, size + 22, "Likelihood →", {});
      var tl = txt(ax, 12, size, "Impact →", { transform: "rotate(-90 12 " + size + ")" });
      tl.setAttribute("x", 12);
      var buckets = {};
      items.forEach(function (it, i) {
        var key = it.likelihood + "-" + it.impact;
        var k = buckets[key] = (buckets[key] || 0) + 1;
        var cx = pad + (it.likelihood - 0.5) * cell + (k - 1) * 20 - 8;
        var cy = (5 - it.impact + 0.5) * cell;
        var g = svg("g", { "class": "mx-dot" + (i === selected ? " on" : ""), tabindex: 0, role: "button", "aria-label": String(it.id || i + 1) + ": " + (it.title || "") }, s);
        svg("circle", { cx: cx, cy: cy, r: 11 }, g);
        txt(g, cx, cy + 3.5, it.id || String(i + 1), {});
        g.addEventListener("click", function () { select(i); });
        g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(i); } });
        g.addEventListener("pointerenter", function (ev) { var xy = pointerXY(ev); showTip(function (t) { html("div", "tip-h", (it.id || "") + " " + (it.title || ""), t); html("div", null, "Likelihood " + it.likelihood + " of 5, impact " + it.impact + " of 5", t); }, xy[0], xy[1]); });
        g.addEventListener("pointerleave", hideTip);
      });
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(mount);
  }

  function initRoadmap(node, spec) {
    var mount = node.querySelector(".mount");
    var rows = Array.prototype.slice.call(node.querySelectorAll(".rm"));
    var items = spec.items || [];
    var lanes = spec.lanes || items.map(function (i) { return i.lane; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var selected = 0;
    function select(i) { selected = i; rows.forEach(function (r, k) { r.classList.toggle("on", k === i); }); draw(); }
    function draw() {
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      var width = Math.max(300, mount.clientWidth || 600);
      var narrow = width < 600;
      var labelW = narrow ? 0 : 108, rowH = narrow ? 34 : 30, lanePad = narrow ? 16 : 7, top = 26;
      var rowOf = [], laneRows = lanes.map(function () { return []; });
      items.map(function (it, i) { return i; }).sort(function (a, b) { return items[a].start < items[b].start ? -1 : 1; }).forEach(function (i) {
        var it = items[i], rows = laneRows[lanes.indexOf(it.lane)] || [];
        var r = 0;
        while (r < rows.length && rows[r] > it.start) r++;
        rows[r] = it.end;
        rowOf[i] = r;
      });
      var laneTop = [], acc = top;
      lanes.forEach(function (_, k) { laneTop.push(acc); acc += lanePad + Math.max(1, laneRows[k].length) * rowH + 4; });
      var height = acc + 8;
      var wrap = width;
      var s = svg("svg", { width: wrap, height: height, viewBox: "0 0 " + wrap + " " + height }, mount);
      var defs = svg("defs", null, s);
      var pat = svg("pattern", { id: "rm-hatch", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      svg("rect", { width: 6, height: 6, fill: "var(--accent-wash)" }, pat);
      svg("line", { x1: 0, y1: 0, x2: 0, y2: 6, "class": "rm-hatch-line" }, pat);
      var t0 = parseDate(spec.start || items[0].start), t1 = parseDate(spec.end || items[items.length - 1].end);
      var x = linear(t0.getTime(), t1.getTime(), labelW + 4, wrap - 8);
      var ax = svg("g", { "class": "axis" }, s);
      var cur = new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth(), 1));
      while (cur <= t1) {
        var px = x(cur.getTime());
        var mo = cur.getUTCMonth();
        if (mo % 3 === 0) {
          svg("line", { x1: px, x2: px, y1: top - 6, y2: height - 4, stroke: "var(--grid)" }, ax);
          txt(ax, px + 3, top - 10, mo === 0 ? MONTHS[0] + " " + cur.getUTCFullYear() : MONTHS[mo], {});
        }
        cur = new Date(Date.UTC(cur.getUTCFullYear(), mo + 1, 1));
      }
      lanes.forEach(function (lane, k) {
        var ly = laneTop[k], lh = lanePad + Math.max(1, laneRows[k].length) * rowH;
        svg("rect", { x: labelW, y: ly + 2, width: wrap - labelW, height: lh, "class": "rm-lane" }, s).style.opacity = k % 2 ? 0.5 : 1;
        if (!narrow) txt(s, 0, ly + lh / 2 + 6, lane, { "class": "rm-lane-label" });
        else txt(s, labelW + 6, ly + 13, lane, { "class": "rm-lane-label" }).style.fontSize = "10px";
      });
      if (spec.today) {
        var tx = x(parseDate(spec.today).getTime());
        svg("line", { x1: tx, x2: tx, y1: top - 4, y2: height - 4, "class": "tl-today" }, s);
        txt(s, tx + 4, height - 8, "Today", { "class": "tl-today-label" });
      }
      items.forEach(function (it, i) {
        var lane = lanes.indexOf(it.lane);
        var a = x(parseDate(it.start).getTime()), b = x(parseDate(it.end).getTime());
        var ly = laneTop[lane] + lanePad + rowOf[i] * rowH;
        var bh = rowH - 8;
        var g = svg("g", { "class": "rm-bar " + (it.confidence || "committed") + (i === selected ? " on" : ""), tabindex: 0, role: "button", "aria-label": it.title }, s);
        svg("rect", { x: a, y: ly, width: Math.max(6, b - a), height: bh, rx: 2 }, g);
        var label = it.title, charW = narrow ? 5.6 : 6.6;
        var inside = (b - a) > label.length * charW + 14;
        var tlab = txt(g, inside ? a + 7 : b + 6, ly + bh / 2 + 4, label, { "class": inside ? "in" : "" });
        if (narrow) tlab.style.fontSize = "10.5px";
        if (!inside && b + 6 + label.length * charW > wrap) { tlab.setAttribute("x", a - 6); tlab.setAttribute("text-anchor", "end"); }
        if (!(inside && (it.confidence || "committed") === "committed") && tlab.getBBox) {
          // A chip under the label keeps it readable over hatching and grid lines.
          var bb = tlab.getBBox();
          g.insertBefore(svg("rect", { x: bb.x - 3, y: bb.y - 1, width: bb.width + 6, height: bb.height + 2, rx: 2, "class": "rm-chip" }), tlab);
        }
        g.addEventListener("click", function () { select(i); });
        g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(i); } });
      });
    }
    select(0);
    if (window.ResizeObserver) new ResizeObserver(draw).observe(mount);
  }

  function initTeam(node) {
    var squads = Array.prototype.slice.call(node.querySelectorAll(".squad"));
    squads.forEach(function (s) {
      s.setAttribute("tabindex", "0");
      s.addEventListener("click", function () { squads.forEach(function (o) { o.classList.toggle("on", o === s && !s.classList.contains("on")); }); });
    });
  }

  function initModel(node, spec) {
    var controls = node.querySelector(".controls");
    var mount = node.querySelector(".mount");
    var readout = node.querySelector(".readout");
    var d = spec.data || {};
    function slider(id, label, min, max, step, value, show, hint) {
      var wrap = html("div", "ctl", null, controls);
      var lab = html("label", null, null, wrap);
      lab.setAttribute("for", id);
      html("span", null, label, lab);
      var out = html("output", null, show(value), lab);
      out.setAttribute("for", id);
      var input = html("input", null, null, wrap);
      input.type = "range"; input.id = id; input.min = min; input.max = max; input.step = step; input.value = value;
      if (hint) html("p", "hint", hint, wrap);
      return { input: input, out: out, show: show };
    }
    function tiles(list) {
      var t = controls.querySelector(".tiles") || html("div", "tiles", null, controls);
      while (t.firstChild) t.removeChild(t.firstChild);
      list.forEach(function (it) { var tile = html("div", "tile", null, t); html("p", "t-label", it[0], tile); html("p", "t-value" + (it[2] ? " " + it[2] : ""), it[1], tile); });
    }
    function sentence(parts) {
      while (readout.firstChild) readout.removeChild(readout.firstChild);
      parts.forEach(function (p) { if (typeof p === "string") readout.appendChild(doc.createTextNode(p)); else html("b", null, p[0], readout); });
    }
    var uid = node.getAttribute("data-fig");
    if (spec.kind === "forecast") {
      var v0 = Number(d.velocity), g0 = Number(d.growth);
      var vs = slider(uid + "-v", "Points finished per sprint", Math.round(v0 * 0.5), Math.round(v0 * 1.6), 1, v0, function (v) { return String(v); }, "Recent average: " + v0);
      var gs = slider(uid + "-g", "Points added per sprint", 0, Math.max(60, g0 * 2), 1, g0, function (v) { return String(v); }, "Recent average: " + g0);
      var spec2 = { chart: "burnup", data: { x: d.x, scope: d.scope, done: d.done, velocity: v0, growth: g0 } };
      var ctl = mountChart(node, spec2, mount, { velocity: v0, growth: g0, target: d.target });
      var update = function () {
        var v = Number(vs.input.value), g = Number(gs.input.value);
        vs.out.textContent = vs.show(v); gs.out.textContent = gs.show(g);
        ctl.update({ velocity: v, growth: g });
        var fin = ctl.api && ctl.api.finish;
        var target = parseDate(d.target);
        if (!fin) {
          tiles([["Projected finish", "Never", "bad"], ["Net progress", (v - g) + " pts a sprint", "bad"]]);
          sentence(["At ", [v + " points a sprint"], " with ", [g + " added"], ", the backlog grows as fast as the team clears it. The last arch never lands."]);
          return;
        }
        var weeks = Math.round((fin.date - target) / (7 * 86400000));
        var late = weeks > 0;
        tiles([["Projected finish", fmtDate(fin.date), late ? "bad" : "good"], ["Against target", weeks === 0 ? "On target" : Math.abs(weeks) + (Math.abs(weeks) === 1 ? " week " : " weeks ") + (late ? "late" : "early"), late ? "bad" : "good"], ["Sprints left", String(fin.sprints), ""], ["Net progress", (v - g) + " pts a sprint", ""]]);
        sentence(["At ", [v + " points a sprint"], " with ", [g + " points added"], " each sprint, the remaining " + fmt(d.remaining, "int") + " points take ", [fin.sprints + " sprints"], ", landing about ", [fmtDate(fin.date)], late ? ", " + Math.abs(weeks) + " weeks after the " + fmtDate(target) + " target." : (weeks === 0 ? ", on the " + fmtDate(target) + " target." : ", " + Math.abs(weeks) + " weeks before the " + fmtDate(target) + " target.")]);
      };
      vs.input.addEventListener("input", update); gs.input.addEventListener("input", update);
      update();
    } else if (spec.kind === "savings") {
      var first = parseDate(d.first), last = parseDate(d.last), plan = parseDate(d.plan_month), renewal = parseDate(d.renewal_month);
      var span = monthsBetween(first, last);
      var planIdx = monthsBetween(first, plan);
      var ms = slider(uid + "-m", "Monolith switched off at the end of", 0, span, 1, planIdx, function (i) { return fmtDate(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + Number(i), 1)), "month"); }, "Plan: " + fmtDate(plan, "month"));
      var year = Number(d.year) || first.getUTCFullYear();
      var costFor = function (offIdx) {
        var off = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offIdx, 1));
        var months = [], total = 0;
        for (var mo = 0; mo < 12; mo++) {
          var dt = new Date(Date.UTC(year, mo, 1));
          var running = dt <= off;
          var c = running ? Number(d.now) : Number(d.after);
          var renew = running && dt.getTime() === renewal.getTime() && off > renewal ? Number(d.renewal) : 0;
          if (off > renewal && dt.getTime() === renewal.getTime()) renew = Number(d.renewal);
          months.push({ date: dt, base: c, renew: renew });
          total += c + renew;
        }
        return { months: months, total: total, off: off };
      };
      var planCost = costFor(planIdx);
      var updateS = function () {
        var idx = Number(ms.input.value);
        ms.out.textContent = ms.show(idx);
        var r = costFor(idx);
        var delta = r.total - planCost.total;
        var renewed = r.off > renewal;
        tiles([[year + " run cost", compactMoney(r.total), ""], ["Against plan", (delta === 0 ? "On plan" : (delta > 0 ? "+" : "−") + compactMoney(Math.abs(delta)).replace(/^−/, "")), delta > 0 ? "bad" : (delta < 0 ? "good" : "")], ["License renewal", renewed ? compactMoney(Number(d.renewal)) : "Avoided", renewed ? "bad" : "good"], ["Saving once off", compactMoney(Number(d.now) - Number(d.after)) + "/mo", "good"]]);
        sentence(["Switching the monolith off at the end of ", [fmtDate(r.off, "month")], " puts " + year + " run cost at ", [compactMoney(r.total)], delta === 0 ? ", the plan." : (delta > 0 ? ", " + compactMoney(delta) + " more than plan" : ", " + compactMoney(-delta) + " less than plan"), renewed ? ", including the " + compactMoney(Number(d.renewal)) + " license renewal." : (delta === 0 ? "" : ".")]);
        drawSavings(r);
      };
      var drawSavings = function (r) {
        while (mount.firstChild) mount.removeChild(mount.firstChild);
        var f = frame(mount, { right: 8, height: 260, left: 46 });
        var maxV = niceMax(Math.max.apply(null, r.months.map(function (m) { return m.base + m.renew; })));
        var y = linear(0, maxV, f.height - f.m.bottom, f.m.top);
        yAxis(f, y, ticks(0, maxV, 3), "money", "", true);
        var slot = f.iw / 12, bw = Math.min(24, slot - 6);
        r.months.forEach(function (m, i) {
          var x = f.m.left + slot * i + slot / 2 - bw / 2;
          var running = m.date <= r.off;
          var p = svg("path", { d: barPath(x, y(0), bw, y(m.base), 4) }, f.svg);
          p.style.fill = running ? "var(--legacy)" : "var(--s1)";
          if (m.renew) {
            var p2 = svg("path", { d: barPath(x, y(m.base) - 2, bw, y(m.base + m.renew), 4) }, f.svg);
            p2.style.fill = "var(--bad)";
            txt(f.svg, x + bw / 2, y(m.base + m.renew) - 6, "Renewal", { "text-anchor": "middle", "class": "note-text" });
          }
          txt(f.svg, x + bw / 2, f.height - 8, MONTHS[m.date.getUTCMonth()].slice(0, f.narrow ? 1 : 3), { "text-anchor": "middle", "class": "axis" }).style.fill = "var(--muted)";
        });
        legend(mount, [{ name: "Both platforms running", color: "var(--legacy)" }, { name: "Keystone only", color: "var(--s1)" }, { name: "License renewal", color: "var(--bad)" }], "bar");
      };
      ms.input.addEventListener("input", updateS);
      updateS();
    }
  }


  /* ---------------------------------------------------------------- plates */
  function initPlate(node, spec) {
    var stage = node.querySelector(".stage");
    var overlay = node.querySelector(".overlay");
    var layers = Array.prototype.slice.call(node.querySelectorAll(".layer"));
    var anchors = spec.anchors || {};
    var cable = null;
    var descend = layers.filter(function (l) { return l.getAttribute("data-motion") === "descend"; })[0];
    if (descend && anchors.hook && anchors.load) {
      cable = svg("line", { "class": "cable", x1: anchors.hook[0], y1: anchors.hook[1], x2: anchors.load[0], y2: anchors.load[1] }, overlay);
    }
    if (!reduceMotion) stage.classList.add("pre");
    // On a phone a wide painting fills a taller frame and pans as the reader scrolls, so
    // its labels and hotspots stay big enough to read and tap.
    var phone = window.matchMedia ? window.matchMedia("(max-width: 700px)") : null;
    var pan = false;
    function setPan() {
      pan = !!(phone && phone.matches) && node.classList.contains("wide") && (spec.width || 1) / (spec.height || 1) > 1.3;
      node.classList.toggle("pan", pan);
      if (!pan) stage.style.transform = "";
    }
    setPan();
    if (phone && phone.addEventListener) phone.addEventListener("change", setPan);
    var developed = reduceMotion;
    var spots = Array.prototype.slice.call(node.querySelectorAll(".spot"));
    var cards = Array.prototype.slice.call(node.querySelectorAll(".spot-card"));
    spots.forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-spot");
        var on = b.getAttribute("aria-pressed") !== "true";
        spots.forEach(function (o) { o.setAttribute("aria-pressed", o === b && on ? "true" : "false"); });
        cards.forEach(function (c) { c.hidden = !(on && c.getAttribute("data-spot") === k); });
      });
    });
    plates.push(function (vh, now) {
      var r = stage.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      if (!developed && r.top < vh * 0.82) {
        developed = true;
        stage.classList.add("go");
        requestAnimationFrame(function () { stage.classList.remove("pre"); });
      }
      var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      if (pan) {
        var frameEl = stage.parentNode;
        var spare = r.width - frameEl.clientWidth;
        var q = reduceMotion ? 0.5 : clamp((p - 0.2) / 0.6, 0, 1);
        stage.style.transform = "translateX(" + (-spare * q).toFixed(1) + "px)";
      }
      layers.forEach(function (l, k) {
        var motion = l.getAttribute("data-motion");
        var travel = Number(l.getAttribute("data-travel")) / 100 * r.height;
        var phase = k * 1.7;
        if (motion === "pop") {
          if (developed && !l.classList.contains("popped")) l.classList.add("popped");
          return;
        }
        if (motion === "rise") {
          var tr = reduceMotion ? 1 : ease(clamp((p - 0.15) / 0.45, 0, 1));
          l.style.transform = "translateY(" + (-travel * tr).toFixed(1) + "px)";
          return;
        }
        if (motion === "descend") {
          var t = reduceMotion ? 1 : ease(clamp((p - 0.18) / 0.42, 0, 1));
          l.style.transform = "translateY(" + (travel * t).toFixed(1) + "px)";
          if (cable) {
            var h = spec.height || 1;
            cable.setAttribute("y2", (anchors.load[1] + travel * t / r.height * h).toFixed(1));
          }
        } else if (reduceMotion) {
          return;
        } else if (motion === "drift") {
          l.style.transform = "translate(" + (Math.sin(now / 3800) * travel * 1.6).toFixed(1) + "px," + (Math.cos(now / 2900) * travel * 0.25).toFixed(1) + "px)";
        } else if (motion === "fall") {
          var span = travel || 40;
          l.style.transform = "translateY(" + ((now / 9) % span - span / 2).toFixed(1) + "px)";
        } else if (motion === "cross") {
          var dist = Math.max(1, travel);
          var px = (now / 22 + phase * 97) % dist;
          l.style.transform = "translateX(" + px.toFixed(1) + "px)";
          l.style.opacity = String(clamp(Math.min(px / 40, (dist - px) / 40), 0, 1));
        } else if (motion === "sway") {
          l.style.transformOrigin = "50% 100%";
          l.style.transform = "rotate(" + (Math.sin(now / 1300 + phase) * 2.2).toFixed(2) + "deg)";
        } else if (motion === "bob") {
          l.style.transform = "translateY(" + (Math.sin(now / 850 + phase) * (travel || 4)).toFixed(1) + "px)";
        } else if (motion === "spin") {
          l.style.transformOrigin = "50% 50%";
          l.style.transform = "rotate(" + ((now / 18) % 360).toFixed(1) + "deg)";
        }
      });
    });
  }

  /* --------------------------------------------------------- progress bar */
  /* The sticky bar maps reading position onto a device chosen by the theme: bridge
     arches, a parcel on a conveyor, a tape measure, flags on a course, an interview
     clock or numbered steps. Every device shares the same chapter geometry. */
  var ICON_PATHS = {
    parcel: "M-9,-7 L9,-7 L9,7 L-9,7 Z M-9,-2 L9,-2 M-2,-7 L-2,7",
    van: "M-11,5 L-11,-5 Q-11,-7 -9,-7 L3,-7 L7,-2 L11,-1 L11,5 Z M3,-6 L3,-2 L7,-2",
    truck: "M-12,5 L-12,-7 L3,-7 L3,5 Z M3,-3 L8,-3 L11,1 L11,5 L3,5",
    cart: "M-11,-7 L-7,-7 L-4,4 L8,4 L10,-4 L-6,-4",
    plane: "M-11,0 L11,0 M2,0 L-4,-8 M2,0 L-4,8 M-9,0 L-11,-4 M-9,0 L-11,4",
    train: "M-10,5 L-10,-5 Q-10,-8 -6,-8 L6,-8 Q10,-8 10,-5 L10,5 Z M-10,-1 L10,-1",
    ship: "M-11,1 L11,1 L7,7 L-8,7 Z M-4,1 L-4,-6 L5,-1 L-4,-1",
    pin: "M0,8 C-6,1 -7,-2 -7,-4 A7,7 0 1 1 7,-4 C7,-2 6,1 0,8 Z",
    ball: "M-6,0 A6,6 0 1 0 6,0 A6,6 0 1 0 -6,0 Z",
    boot: "M-8,7 L-8,-8 L-1,-8 L-1,0 Q6,1 9,4 L9,7 Z",
    rocket: "M-10,0 Q-4,-6 8,0 Q-4,6 -10,0 Z M-6,-3 L-10,-7 M-6,3 L-10,7",
    cup: "M-9,-6 L7,-6 L5,7 L-7,7 Z M7,-3 C12,-3 12,3 6,3",
    book: "M-10,-7 L0,-5 L10,-7 L10,6 L0,8 L-10,6 Z M0,-5 L0,8",
    dot: "M-5,0 A5,5 0 1 0 5,0 A5,5 0 1 0 -5,0 Z"
  };
  var WHEELS = { van: [[-6, 6], [6, 6]], truck: [[-8, 6], [7, 6]], cart: [[-3, 7], [6, 7]], train: [[-6, 6], [6, 6]] };

  function drawIcon(parent, name, x, y, scale) {
    var g = svg("g", { "class": "pb-icon", transform: "translate(" + x + "," + y + ") scale(" + (scale || 1) + ")" }, parent);
    svg("path", { d: ICON_PATHS[name] || ICON_PATHS.dot, "class": "pb-icon-body" }, g);
    (WHEELS[name] || []).forEach(function (w) { svg("circle", { cx: w[0], cy: w[1], r: 2.4, "class": "pb-icon-wheel" }, g); });
    return g;
  }

  function initProgress() {
    var track = doc.querySelector(".spanbar-track");
    var now = doc.querySelector(".spanbar-now");
    var nav = DATA.nav || [];
    var cfg = DATA.progress || { kind: "arches" };
    var sections = nav.map(function (n) { return doc.getElementById(n.id); });
    if (!track || !nav.length) return function () {};
    doc.documentElement.setAttribute("data-progress", cfg.kind);
    var total = cfg.total || 0;
    var starts = nav.map(function (n, i) {
      return total && typeof n.at === "number" ? clamp(n.at / total, 0, 1) : i / nav.length;
    });
    function spanOf(i) { return [starts[i], i + 1 < starts.length ? starts[i + 1] : 1]; }
    var device = null;

    function go(i) { if (sections[i]) sections[i].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }
    function hook(g, i) {
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "listitem");
      g.setAttribute("aria-label", nav[i].no + ". " + nav[i].title);
      g.addEventListener("click", function () { go(i); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(i); } });
      g.addEventListener("pointerenter", function (ev) { var xy = pointerXY(ev); showTip(function (t) { html("div", "tip-h", nav[i].no + "  " + nav[i].title, t); }, xy[0], xy[1] + 10); });
      g.addEventListener("pointerleave", hideTip);
    }

    var DEVICES = {
      arches: function (s, w, h) {
        var deckY = 6, spring = 30, parts = [];
        svg("line", { x1: 0, x2: w, y1: deckY, y2: deckY, "class": "deck" }, s);
        svg("line", { x1: 0, x2: w, y1: spring + 3, y2: spring + 3, "class": "water" }, s);
        var defs = svg("defs", null, s);
        nav.forEach(function (n, i) {
          var sp = spanOf(i), pier = Math.min(6, (sp[1] - sp[0]) * w * 0.08);
          var x0 = sp[0] * w + pier, x1 = sp[1] * w - pier;
          var cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = Math.min(spring - deckY - 5, rx), ring = 4;
          var outer = "M" + x0 + "," + spring + " A" + rx + "," + ry + " 0 0 1 " + x1 + "," + spring;
          var band = outer + " L" + (x1 - ring) + "," + spring + " A" + (rx - ring) + "," + (ry - ring) + " 0 0 0 " + (x0 + ring) + "," + spring + " Z";
          var g = svg("g", { "class": "arch pb-part" }, s);
          var clip = svg("clipPath", { id: "arch-clip-" + i }, defs);
          var clipRect = svg("rect", { x: x0, y: 0, width: 0, height: h }, clip);
          svg("path", { d: band, "class": "arch-fill", "clip-path": "url(#arch-clip-" + i + ")" }, g);
          svg("path", { d: outer, "class": "arch-ring" }, g);
          svg("path", { d: "M" + (x0 + ring) + "," + spring + " A" + (rx - ring) + "," + (ry - ring) + " 0 0 1 " + (x1 - ring) + "," + spring, "class": "arch-ring" }, g);
          svg("line", { x1: x0, x2: x0, y1: deckY, y2: spring + 3, "class": "deck" }, g);
          svg("line", { x1: x1, x2: x1, y1: deckY, y2: spring + 3, "class": "deck" }, g);
          var keyY = spring - ry;
          var key = svg("rect", { x: cx - 3, y: keyY - 3, width: 6, height: 6, transform: "rotate(45 " + cx + " " + keyY + ")", "class": "arch-key" }, g);
          svg("rect", { x: sp[0] * w, y: 0, width: (sp[1] - sp[0]) * w, height: h, "class": "pb-hit" }, g);
          hook(g, i);
          parts.push({ g: g, clip: clipRect, key: key, x0: x0, width: x1 - x0 });
        });
        return function (fracs, current) {
          parts.forEach(function (pt, i) {
            pt.clip.setAttribute("width", (pt.width * fracs[i]).toFixed(1));
            pt.key.classList.toggle("on", fracs[i] >= 0.97);
            pt.g.classList.toggle("current", i === current);
          });
        };
      },

      track: function (s, w, h) {
        var pad = 14, y = h / 2 + 3, x = linear(0, 1, pad, w - pad), line = cfg.line || "solid";
        var base = svg("g", { "class": "pb-line pb-" + line }, s);
        if (line === "belt") {
          svg("rect", { x: pad - 7, y: y - 5, width: w - 2 * pad + 14, height: 10, rx: 5, "class": "pb-belt" }, base);
          for (var r = pad; r <= w - pad; r += 24) svg("line", { x1: r, x2: r, y1: y - 3, y2: y + 3, "class": "pb-roller" }, base);
        } else if (line === "road") {
          svg("rect", { x: pad - 6, y: y - 4, width: w - 2 * pad + 12, height: 8, rx: 2, "class": "pb-road" }, base);
          svg("line", { x1: pad, x2: w - pad, y1: y, y2: y, "class": "pb-lane" }, base);
        } else if (line === "rail") {
          for (var t = pad; t <= w - pad; t += 7) svg("line", { x1: t, x2: t, y1: y - 4, y2: y + 4, "class": "pb-sleeper" }, base);
          svg("line", { x1: pad, x2: w - pad, y1: y - 2.5, y2: y - 2.5, "class": "pb-rail" }, base);
          svg("line", { x1: pad, x2: w - pad, y1: y + 2.5, y2: y + 2.5, "class": "pb-rail" }, base);
        } else {
          svg("line", { x1: pad, x2: w - pad, y1: y, y2: y, "class": "pb-base" + (line === "dashed" ? " dashed" : "") }, base);
        }
        var done = svg("line", { x1: pad, x2: pad, y1: y, y2: y, "class": "pb-done pb-done-" + line }, s);
        var stops = nav.map(function (n, i) {
          var g = svg("g", { "class": "pb-stop pb-part" }, s);
          var px = x(starts[i]);
          svg("circle", { cx: px, cy: y, r: 4.5, "class": "pb-dot" }, g);
          svg("rect", { x: px - 9, y: 0, width: 18, height: h, "class": "pb-hit" }, g);
          hook(g, i);
          return g;
        });
        svg("circle", { cx: x(1), cy: y, r: 3, "class": "pb-end" }, s);
        var icon = drawIcon(s, cfg.icon || "parcel", pad, y - 9, 0.9);
        return function (fracs, current, pos) {
          var px = x(pos);
          done.setAttribute("x2", px.toFixed(1));
          icon.setAttribute("transform", "translate(" + px.toFixed(1) + "," + (y - 10) + ") scale(0.9)");
          stops.forEach(function (g, i) {
            g.classList.toggle("passed", fracs[i] > 0);
            g.classList.toggle("current", i === current);
          });
        };
      },

      tape: function (s, w, h) {
        var caseW = 30, y = h / 2 - 7, tapeH = 16, x0 = caseW - 4, len = w - x0 - 4;
        var reel = svg("g", { "class": "pb-reel" }, s);
        var tape = svg("g", { "class": "pb-tape" }, s);
        var clip = svg("clipPath", { id: "pb-tape-clip" }, svg("defs", null, s));
        var clipRect = svg("rect", { x: x0, y: 0, width: 0, height: h }, clip);
        tape.setAttribute("clip-path", "url(#pb-tape-clip)");
        svg("rect", { x: x0, y: y, width: len, height: tapeH, rx: 1.5, "class": "pb-tape-body" }, tape);
        var unit = cfg.total ? len / cfg.total : len / (nav.length * 10);
        var count = cfg.total ? cfg.total : nav.length * 10;
        var every = Math.max(1, Math.ceil(count / (len / 6)));
        for (var k = 0; k <= count; k += every) {
          var tx = x0 + k * unit, major = k % (every * 5) === 0;
          svg("line", { x1: tx, x2: tx, y1: y, y2: y + (major ? 9 : 5), "class": "pb-tick" }, tape);
        }
        var parts = nav.map(function (n, i) {
          var px = x0 + starts[i] * len;
          var g = svg("g", { "class": "pb-part pb-mark" }, tape);
          svg("line", { x1: px, x2: px, y1: y, y2: y + tapeH, "class": "pb-chapter" }, g);
          txt(g, px + 2.5, y + tapeH - 2.5, n.no, { "class": "pb-num" });
          return g;
        });
        svg("rect", { x: 1, y: y - 6, width: caseW, height: tapeH + 12, rx: 6, "class": "pb-case" }, reel);
        svg("circle", { cx: caseW / 2 + 1, cy: y + tapeH / 2, r: 6, "class": "pb-case-hub" }, reel);
        var hook2 = svg("rect", { x: x0, y: y - 3, width: 3, height: tapeH + 6, "class": "pb-hook" }, s);
        var hits = svg("g", null, s);
        nav.forEach(function (n, i) {
          var sp = spanOf(i);
          var g = svg("rect", { x: x0 + sp[0] * len, y: 0, width: (sp[1] - sp[0]) * len, height: h, "class": "pb-hit" }, hits);
          hook(g, i);
        });
        return function (fracs, current, pos) {
          var px = Math.max(10, pos * len);
          clipRect.setAttribute("width", px.toFixed(1));
          hook2.setAttribute("x", (x0 + px - 1).toFixed(1));
          parts.forEach(function (g, i) { g.classList.toggle("current", i === current); });
        };
      },

      flags: function (s, w, h) {
        var parts = [];
        var ball = svg("circle", { r: 3.2, cy: h - 6, cx: 0, "class": "pb-ball" }, s);
        svg("line", { x1: 0, x2: w, y1: h - 2.5, y2: h - 2.5, "class": "pb-ground" }, s);
        nav.forEach(function (n, i) {
          var sp = spanOf(i), px = (sp[0] + (sp[1] - sp[0]) * 0.72) * w;
          var g = svg("g", { "class": "pb-flag pb-part" }, s);
          svg("line", { x1: px, x2: px, y1: 4, y2: h - 3, "class": "pb-pole" }, g);
          svg("path", { d: "M" + px + ",4 L" + (px + 11) + ",8 L" + px + ",12 Z", "class": "pb-cloth" }, g);
          svg("ellipse", { cx: px, cy: h - 3, rx: 3, ry: 1.2, "class": "pb-cup" }, g);
          svg("rect", { x: sp[0] * w, y: 0, width: (sp[1] - sp[0]) * w, height: h, "class": "pb-hit" }, g);
          hook(g, i);
          parts.push({ g: g, x: px });
        });
        return function (fracs, current, pos) {
          var bx = pos * w;
          ball.setAttribute("cx", clamp(bx, 4, w - 4).toFixed(1));
          parts.forEach(function (pt, i) {
            pt.g.classList.toggle("played", fracs[i] >= 0.97);
            pt.g.classList.toggle("started", fracs[i] > 0 && fracs[i] < 0.97);
            pt.g.classList.toggle("current", i === current);
          });
        };
      },

      clock: function (s, w, h) {
        var r = h / 2 - 3, cx = r + 3, cy = h / 2, bx = cx + r + 12, bw = w - bx - 2;
        svg("circle", { cx: cx, cy: cy, r: r, "class": "pb-rim" }, s);
        var wedge = svg("path", { d: "", "class": "pb-elapsed" }, s);
        for (var k = 0; k < 12; k++) {
          var a = k / 12 * Math.PI * 2;
          svg("line", { x1: cx + Math.sin(a) * (r - 3), y1: cy - Math.cos(a) * (r - 3), x2: cx + Math.sin(a) * (r - 1), y2: cy - Math.cos(a) * (r - 1), "class": "pb-tick" }, s);
        }
        var hand = svg("line", { x1: cx, y1: cy, x2: cx, y2: cy - r + 3, "class": "pb-hand" }, s);
        svg("circle", { cx: cx, cy: cy, r: 1.8, "class": "pb-hub" }, s);
        var parts = nav.map(function (n, i) {
          var sp = spanOf(i);
          var g = svg("g", { "class": "pb-phase pb-part" }, s);
          var x0 = bx + sp[0] * bw, ww = Math.max(2, (sp[1] - sp[0]) * bw - 2);
          svg("rect", { x: x0, y: cy - 7, width: ww, height: 14, rx: 2, "class": "pb-phase-bg" }, g);
          var fill = svg("rect", { x: x0, y: cy - 7, width: 0, height: 14, rx: 2, "class": "pb-phase-fill" }, g);
          if (ww > 26) txt(g, x0 + 5, cy + 4, n.no, { "class": "pb-num" });
          hook(g, i);
          return { g: g, fill: fill, w: ww };
        });
        return function (fracs, current, pos) {
          var a = pos * Math.PI * 2;
          var large = pos > 0.5 ? 1 : 0;
          var ex = cx + Math.sin(a) * (r - 1), ey = cy - Math.cos(a) * (r - 1);
          wedge.setAttribute("d", pos <= 0 ? "" : "M" + cx + "," + cy + " L" + cx + "," + (cy - r + 1) + " A" + (r - 1) + "," + (r - 1) + " 0 " + large + " 1 " + ex.toFixed(2) + "," + ey.toFixed(2) + " Z");
          hand.setAttribute("x2", (cx + Math.sin(a) * (r - 4)).toFixed(2));
          hand.setAttribute("y2", (cy - Math.cos(a) * (r - 4)).toFixed(2));
          parts.forEach(function (pt, i) {
            pt.fill.setAttribute("width", (pt.w * fracs[i]).toFixed(1));
            pt.g.classList.toggle("current", i === current);
          });
        };
      },

      steps: function (s, w, h) {
        var pad = 12, y = h / 2, x = linear(0, nav.length - 1 || 1, pad, w - pad);
        svg("line", { x1: pad, x2: w - pad, y1: y, y2: y, "class": "pb-base" }, s);
        var done = svg("line", { x1: pad, x2: pad, y1: y, y2: y, "class": "pb-done" }, s);
        var parts = nav.map(function (n, i) {
          var g = svg("g", { "class": "pb-step pb-part" }, s);
          svg("circle", { cx: x(i), cy: y, r: 9, "class": "pb-step-dot" }, g);
          txt(g, x(i), y + 3.6, String(i + 1), { "class": "pb-step-n", "text-anchor": "middle" });
          hook(g, i);
          return g;
        });
        return function (fracs, current) {
          var reached = current < 0 ? 0 : current + fracs[current];
          done.setAttribute("x2", x(Math.min(reached, nav.length - 1)).toFixed(1));
          parts.forEach(function (g, i) {
            g.classList.toggle("passed", fracs[i] >= 0.97);
            g.classList.toggle("current", i === current);
          });
        };
      }
    };

    function draw() {
      while (track.firstChild) track.removeChild(track.firstChild);
      var w = Math.max(120, track.clientWidth), h = 34;
      var s = svg("svg", { width: w, height: h, viewBox: "0 0 " + w + " " + h, "class": "pb pb-" + cfg.kind }, track);
      device = (DEVICES[cfg.kind] || DEVICES.arches)(s, w, h);
    }
    draw();
    if (window.ResizeObserver) new ResizeObserver(draw).observe(track);
    return function (vh) {
      var current = -1, fracs = [];
      sections.forEach(function (sec, i) {
        if (!sec) { fracs.push(0); return; }
        var r = sec.getBoundingClientRect();
        fracs.push(clamp((vh * 0.35 - r.top) / Math.max(1, r.height), 0, 1));
        if (r.top < vh * 0.35) current = i;
      });
      var pos = 0;
      if (current >= 0) {
        var sp = spanOf(current);
        pos = sp[0] + (sp[1] - sp[0]) * fracs[current];
      }
      if (device) device(fracs, current, pos);
      if (now) {
        while (now.firstChild) now.removeChild(now.firstChild);
        if (current >= 0) { html("b", null, nav[current].no + "  ", now); now.appendChild(doc.createTextNode(nav[current].title)); }
        else now.appendChild(doc.createTextNode(cfg.start_label || "Overview"));
      }
    };
  }

  /* ------------------------------------------------------------- tile map */
  /* Equal squares for regions, colored by a value or a category; with frames, a
     slider and a play button walk the map through time. */
  function initTilemap(node, spec) {
    var mount = node.querySelector(".mount");
    var tiles = spec.tiles || [];
    var frames = spec.frames || null;
    var values = spec.values || {};
    var scale = spec.scale || {};
    var kind = scale.kind || (scale.categories ? "category" : "sequential");
    var format = (spec.format && spec.format.value) || spec.format || "int";
    if (typeof format !== "string") format = "int";
    var idx = frames ? clamp(spec.start == null ? frames.length - 1 : spec.start, 0, frames.length - 1) : 0;
    var cats = {};
    (scale.categories || []).forEach(function (c, i) { cats[String(c.value)] = { label: c.label || c.value, color: colorOf(c.color, "var(--s" + (i + 1) + ")"), on: !!c.dark }; });
    var byId = {};
    tiles.forEach(function (t) { byId[t.id] = t; });
    function valueOf(id, i) {
      var v = values[id];
      if (Array.isArray(v)) return v[Math.min(i, v.length - 1)];
      return v;
    }
    var nums = [];
    Object.keys(values).forEach(function (k) { var v = values[k]; (Array.isArray(v) ? v : [v]).forEach(function (x) { if (typeof x === "number") nums.push(x); }); });
    var lo = scale.min != null ? scale.min : Math.min.apply(null, nums.concat([0]));
    var hi = scale.max != null ? scale.max : Math.max.apply(null, nums.concat([1]));
    var STEPS = 6;
    function bucket(v) { return clamp(Math.floor((v - lo) / Math.max(hi - lo, 1e-9) * STEPS), 0, STEPS - 1); }
    function paint(v) {
      if (v === null || v === undefined || v === "") return { fill: "var(--surface)", dark: false, empty: true };
      if (kind === "category") { var c = cats[String(v)]; return { fill: c ? c.color : "var(--muted)", dark: c ? c.on : true }; }
      var b = bucket(Number(v));
      return { fill: "var(--seq-" + b + ")", dark: b >= 3 };
    }
    function show(v) {
      if (v === null || v === undefined || v === "") return "no data";
      if (kind === "category") return (cats[String(v)] || { label: String(v) }).label;
      return fmt(v, format) + (spec.unit ? " " + spec.unit : "");
    }
    var ctrl = node.querySelector(".tm-ctrl"), range = node.querySelector(".tm-range");
    var play = node.querySelector(".tm-play"), frameOut = node.querySelector(".tm-frame");
    var readout = node.querySelector(".tm-readout");
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } if (play) play.textContent = "Play"; }
    if (ctrl && frames) {
      ctrl.hidden = false;
      range.max = String(frames.length - 1);
      range.value = String(idx);
      range.addEventListener("input", function () { stop(); idx = Number(range.value); draw(); });
      play.addEventListener("click", function () {
        if (timer) { stop(); return; }
        if (idx >= frames.length - 1) idx = 0;
        play.textContent = "Pause";
        draw();
        timer = setInterval(function () {
          if (idx >= frames.length - 1) { stop(); return; }
          idx += 1; range.value = String(idx); draw();
        }, reduceMotion ? 1200 : 650);
      });
    }
    function sentence() {
      if (!readout) return;
      var r = spec.readout;
      if (!r) { readout.textContent = ""; return; }
      var text = typeof r === "string" ? r : (r.text || "");
      var rule = (typeof r === "object" && r.count) || {};
      var count = 0, sum = 0, n = 0, top = null;
      tiles.forEach(function (t) {
        var v = valueOf(t.id, idx);
        if (v === null || v === undefined) return;
        if (typeof v === "number") { sum += v; n += 1; if (!top || v > valueOf(top.id, idx)) top = t; }
        var hit = rule.in ? rule.in.indexOf(v) >= 0 : rule.gte != null ? v >= rule.gte : rule.lte != null ? v <= rule.lte : rule.eq != null ? v === rule.eq : false;
        if (hit) count += 1;
      });
      var vars = {
        frame: frames ? labelX(frames[idx]) : "", count: String(count), total: String(tiles.length),
        sum: fmt(sum, format), mean: n ? fmt(sum / n, format) : "n/a",
        max_label: top ? top.label : "", max: top ? show(valueOf(top.id, idx)) : ""
      };
      readout.textContent = text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; });
    }
    function history(id) { return frames ? frames.map(function (f, i) { return valueOf(id, i); }) : [valueOf(id, 0)]; }
    function draw() {
      while (mount.firstChild) mount.removeChild(mount.firstChild);
      var rows = 0, cols = 0;
      tiles.forEach(function (t) { rows = Math.max(rows, t.row + 1); cols = Math.max(cols, t.col + 1); });
      var W = Math.max(260, mount.clientWidth || 600), gap = 3;
      var s = Math.min(58, (W - gap * (cols - 1)) / cols);
      var gw = s * cols + gap * (cols - 1), ox = (W - gw) / 2;
      var H = s * rows + gap * (rows - 1) + 4;
      var root = svg("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, "class": "tm-svg" }, mount);
      // Small tiles on phones fit about 0.6 em per character: when any value overflows,
      // every tile switches to the short form (11.8K) so the map reads one way.
      var vs = Math.min(15, s * 0.28), valueFormat = format;
      tiles.forEach(function (t) {
        var v = valueOf(t.id, idx);
        if (typeof v === "number" && fmt(v, format).length * vs * 0.6 > s - 4) valueFormat = "compact";
      });
      tiles.forEach(function (t) {
        var v = valueOf(t.id, idx), p = paint(v);
        var gx = ox + t.col * (s + gap), gy = t.row * (s + gap);
        var g = svg("g", { "class": "tm-tile" + (p.empty ? " empty" : "") + (p.dark ? " dark" : ""), tabindex: 0, role: "img", "aria-label": t.label + ": " + show(v) }, root);
        svg("rect", { x: gx, y: gy, width: s, height: s, rx: 3, fill: p.fill }, g);
        var fs = Math.max(8, Math.min(12.5, s * 0.23));
        txt(g, gx + 4, gy + fs + 2, t.id, { "class": "tm-id", "font-size": fs });
        if (s > 34 && kind !== "category" && typeof v === "number") {
          var vt = fmt(v, valueFormat);
          if (vt.length * vs * 0.6 <= s - 4) txt(g, gx + s / 2, gy + s * 0.8, vt, { "class": "tm-val", "text-anchor": "middle", "font-size": vs });
        }
        (spec.markers || []).forEach(function (m) {
          if (m.tile !== t.id) return;
          var k2 = Math.max(0.45, Math.min(0.75, s / 70));
          var mk = svg("g", { "class": "tm-marker", transform: "translate(" + (gx + s - 12 * k2 - 3) + "," + (gy + 10 * k2 + 3) + ")" }, g);
          svg("path", { d: ICON_PATHS[m.icon] || ICON_PATHS.parcel, transform: "scale(" + k2.toFixed(2) + ")" }, mk);
        });
        function build(tip) {
          html("div", "tip-h", t.label, tip);
          html("div", null, show(v) + (frames ? ", " + labelX(frames[idx]) : ""), tip);
          (spec.markers || []).forEach(function (m) { if (m.tile === t.id && m.label) html("div", "tip-src", m.label, tip); });
          var hist = history(t.id).filter(function (x) { return typeof x === "number"; });
          if (frames && hist.length > 2 && kind !== "category") {
            var sw = 150, sh = 30, mx = Math.max.apply(null, hist.concat([hi])) || 1;
            var sp = svg("svg", { width: sw, height: sh + 4, viewBox: "0 0 " + sw + " " + (sh + 4) }, tip);
            sp.style.display = "block"; sp.style.marginTop = "6px";
            var bw = sw / hist.length;
            hist.forEach(function (x, i) {
              var hh = Math.max(1, x / mx * sh);
              var bar = svg("rect", { x: i * bw + 0.5, y: sh - hh, width: Math.max(1, bw - 1), height: hh }, sp);
              bar.style.fill = i === idx ? "var(--tip-ink)" : "color-mix(in srgb, var(--tip-ink) 45%, transparent)";
            });
          }
        }
        g.addEventListener("pointerenter", function (ev) { var xy = pointerXY(ev); showTip(build, xy[0], xy[1]); });
        g.addEventListener("pointermove", function (ev) { var xy = pointerXY(ev); showTip(build, xy[0], xy[1]); });
        g.addEventListener("pointerleave", hideTip);
        g.addEventListener("focus", function () { var r = g.getBoundingClientRect(); showTip(build, r.left + r.width / 2, r.bottom); });
        g.addEventListener("blur", hideTip);
      });
      if (frameOut && frames) frameOut.textContent = labelX(frames[idx]);
      sentence();
    }
    var legend = node.querySelector(".tm-legend");
    if (legend) {
      if (kind === "category") {
        legend.className = "tm-legend legend";
        (scale.categories || []).forEach(function (c, i) {
          var li = html("span", "tm-key", null, legend);
          html("i", null, null, li).style.background = colorOf(c.color, "var(--s" + (i + 1) + ")");
          li.appendChild(doc.createTextNode(c.label || c.value));
        });
      } else {
        var bar = html("div", "tm-ramp", null, legend);
        for (var k = 0; k < STEPS; k++) html("i", null, null, bar).style.background = "var(--seq-" + k + ")";
        var lab = html("div", "tm-ramp-labels", null, legend);
        html("span", null, fmt(lo, format), lab);
        html("span", null, (scale.label || "") , lab);
        html("span", null, fmt(hi, format), lab);
      }
    }
    var btn = node.querySelector(".show-table"), slot = node.querySelector(".table-slot");
    if (btn && slot) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        btn.textContent = open ? "Show the numbers" : "Hide the numbers";
        slot.hidden = open;
        if (open) return;
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        var table = html("table", "data-table", null, slot);
        var tr = html("tr", null, null, html("thead", null, null, table));
        html("th", null, "Region", tr);
        html("th", null, frames ? labelX(frames[idx]) : "Value", tr);
        var tb = html("tbody", null, null, table);
        tiles.slice().sort(function (a, b) { return a.label < b.label ? -1 : 1; }).forEach(function (t) {
          var row = html("tr", null, null, tb);
          html("td", null, t.label, row);
          html("td", null, show(valueOf(t.id, idx)), row);
        });
      });
    }
    draw();
    var lastW = mount.clientWidth;
    if (window.ResizeObserver) new ResizeObserver(function () { if (Math.abs(mount.clientWidth - lastW) > 8) { lastW = mount.clientWidth; draw(); } }).observe(mount);
  }

  /* ----------------------------------------------------------------- flow */
  /* A process as a row of steps. Each step shows its state in the selected scenario;
     selecting a step opens its story below, and a token can travel the path. */
  var FLOW_STATUS = {
    live: { label: "Live", color: "accent" },
    legacy: { label: "Legacy", color: "legacy" },
    cutover: { label: "In progress", color: "s4" },
    planned: { label: "Planned", color: "muted" }
  };
  function initFlow(node, spec) {
    var items = Array.prototype.slice.call(node.querySelectorAll(".fl-node"));
    var detail = node.querySelector(".fl-detail");
    var seg = node.querySelector(".seg");
    var statuses = spec.statuses || FLOW_STATUS;
    var labels = spec.labels || [];
    var side = Math.max(0, labels.length - 1);
    var selected = -1;
    node.classList.add("live");
    function val(n, key) {
      var v = n[key];
      if (Array.isArray(v)) return v[Math.min(side, v.length - 1)];
      return v;
    }
    function update() {
      items.forEach(function (li, i) {
        var n = spec.nodes[i];
        var st = val(n, "status");
        li.className = "fl-node" + (st ? " st-" + st : "") + (i === selected ? " on" : "");
        var color = statuses[st] ? colorOf(statuses[st].color) : "var(--rule)";
        li.style.setProperty("--fl", color);
        var v = li.querySelector(".fl-val");
        if (v && n.values) v.textContent = val(n, "values");
        var b = li.querySelector(".fl-btn");
        b.setAttribute("aria-pressed", i === selected ? "true" : "false");
        if (statuses[st]) b.setAttribute("aria-label", (n.label || "") + ", " + statuses[st].label + (n.values ? ", " + val(n, "values") : ""));
      });
      if (detail) {
        while (detail.firstChild) detail.removeChild(detail.firstChild);
        if (selected >= 0) {
          var n = spec.nodes[selected];
          var st = val(n, "status");
          html("p", "fl-detail-k", (selected + 1) + " · " + (statuses[st] ? statuses[st].label : ""), detail);
          html("h4", "fl-detail-h", n.label || "", detail);
          var src = items[selected].querySelector(".fl-text");
          if (src) Array.prototype.forEach.call(src.childNodes, function (c) { detail.appendChild(c.cloneNode(true)); });
        }
      }
    }
    items.forEach(function (li, i) {
      li.querySelector(".fl-btn").addEventListener("click", function () { selected = selected === i ? -1 : i; update(); });
    });
    if (seg) {
      seg.hidden = false;
      var buttons = Array.prototype.slice.call(seg.querySelectorAll("button"));
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          side = Number(b.getAttribute("data-side"));
          buttons.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
          update();
        });
      });
    }
    var legend = node.querySelector(".fl-legend");
    if (legend) {
      var used = {};
      spec.nodes.forEach(function (n) { (Array.isArray(n.status) ? n.status : [n.status]).forEach(function (s) { if (s) used[s] = true; }); });
      legend.className = "fl-legend legend";
      Object.keys(statuses).forEach(function (k) {
        if (!used[k]) return;
        var li = html("span", "tm-key", null, legend);
        html("i", null, null, li).style.background = colorOf(statuses[k].color);
        li.appendChild(doc.createTextNode(statuses[k].label));
      });
    }
    if (spec.token && !reduceMotion) {
      var trackEl = node.querySelector(".fl-track");
      var token = html("span", "fl-token", null, trackEl);
      token.setAttribute("aria-hidden", "true");
      var ts = svg("svg", { width: 26, height: 22, viewBox: "-13 -11 26 22" }, token);
      drawIcon(ts, spec.token, 0, 0, 1);
      var t0 = null;
      plates.push(function (vh, now) {
        var r = trackEl.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        if (t0 === null) t0 = now;
        var buttons2 = items.map(function (li) { return li.querySelector(".fl-btn"); });
        var per = 1300, n = buttons2.length;
        var tt = ((now - t0) / per) % (n + 0.6);
        var a = Math.min(Math.floor(tt), n - 1), f = clamp(tt - a, 0, 1);
        var b = Math.min(a + 1, n - 1);
        var ra = buttons2[a].getBoundingClientRect(), rb = buttons2[b].getBoundingClientRect();
        var ease2 = f < 0.55 ? 0 : ease((f - 0.55) / 0.45);
        var x = ra.left + ra.width / 2 + (rb.left - ra.left + (rb.width - ra.width) / 2) * ease2 - r.left;
        var y = ra.top - r.top + (rb.top - ra.top) * ease2 - 14;
        token.style.transform = "translate(" + (x - 13).toFixed(1) + "px," + y.toFixed(1) + "px)";
        token.style.opacity = tt > n - 0.2 ? "0" : "1";
      });
    }
    update();
  }

  /* -------------------------------------------------------------- diagram */
  /* Claude's sanitized SVG. Parts with data-tip explain themselves on hover or focus;
     steps dim every part but the ones a step is about. */
  function initDiagram(node, spec) {
    var root = node.querySelector(".dg-svg");
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-tip]"), function (el) {
      function build(t) { html("div", null, el.getAttribute("data-tip"), t); }
      el.addEventListener("pointerenter", function (ev) { var xy = pointerXY(ev); showTip(build, xy[0], xy[1]); });
      el.addEventListener("pointerleave", hideTip);
      el.addEventListener("focus", function () { var r = el.getBoundingClientRect(); showTip(build, r.left + r.width / 2, r.bottom); });
      el.addEventListener("blur", hideTip);
    });
    var steps = spec.steps || [];
    var items = Array.prototype.slice.call(node.querySelectorAll(".st"));
    var controls = node.querySelector(".st-controls");
    if (!steps.length || !controls) return;
    var units = Array.prototype.filter.call(root.querySelectorAll("[id]"), function (el) {
      var up = el.parentNode;
      while (up && up !== root) { if (up.getAttribute && up.getAttribute("id")) return false; up = up.parentNode; }
      return el.tagName.toLowerCase() !== "marker" && !(el.closest && el.closest("defs"));
    });
    var prev = node.querySelector(".st-prev"), next = node.querySelector(".st-next"), count = node.querySelector(".st-count");
    var at = 0;
    controls.hidden = false;
    function go(i) {
      at = clamp(i, 0, items.length - 1);
      items.forEach(function (it, k) { it.classList.toggle("on", k === at); });
      prev.disabled = at === 0; next.disabled = at === items.length - 1;
      count.textContent = "Step " + (at + 1) + " of " + items.length;
      var focus = (steps[at] && steps[at].focus) || [];
      var targets = focus.map(function (id) { return doc.getElementById(id); }).filter(Boolean);
      units.forEach(function (u) {
        var hit = !targets.length || targets.some(function (t) { return t === u || u.contains(t) || t.contains(u); });
        u.classList.toggle("dg-dim", !hit);
        u.classList.toggle("dg-on", hit && targets.length > 0);
      });
    }
    prev.addEventListener("click", function () { go(at - 1); });
    next.addEventListener("click", function () { go(at + 1); });
    go(0);
  }

  /* ------------------------------------------------------------------ quiz */
  /* One question at a time. A choice locks the question, marks the right answer and
     shows why; the last question gives a score and a line for that score. */
  var STORE = {
    get: function (key) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set: function (key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked: the state lasts this visit */ } }
  };

  function initQuiz(node, spec) {
    var qs = Array.prototype.slice.call(node.querySelectorAll(".qz-q"));
    var result = node.querySelector(".qz-result");
    var answers = spec.answers || [];
    var at = 0, score = 0, answered = [];
    node.classList.add("live");
    var bar = html("div", "qz-progress", null, null);
    node.insertBefore(bar, node.querySelector(".qz-list"));
    var count = html("p", "qz-count", null, bar);
    var pips = html("div", "qz-pips", null, bar);
    qs.forEach(function () { html("i", null, null, pips); });
    function pipState() {
      Array.prototype.forEach.call(pips.children, function (p, i) {
        p.className = answered[i] === undefined ? (i === at ? "now" : "") : (answered[i] ? "hit" : "miss");
      });
    }
    function show(i) {
      at = i;
      qs.forEach(function (q, k) { q.classList.toggle("on", k === i); });
      count.textContent = "Question " + (i + 1) + " of " + qs.length;
      bar.hidden = false;
      result.hidden = true;
      pipState();
    }
    qs.forEach(function (q, qi) {
      var opts = Array.prototype.slice.call(q.querySelectorAll(".qz-opt"));
      var explain = q.querySelector(".qz-explain");
      var nextBtn = html("button", "qz-next btn", qi === qs.length - 1 ? "See your score" : "Next question", null);
      nextBtn.type = "button";
      nextBtn.hidden = true;
      q.appendChild(nextBtn);
      opts.forEach(function (o) {
        o.addEventListener("click", function () {
          if (answered[qi] !== undefined) return;
          var k = Number(o.getAttribute("data-k"));
          var right = k === answers[qi];
          answered[qi] = right;
          if (right) score += 1;
          opts.forEach(function (x) {
            var xk = Number(x.getAttribute("data-k"));
            x.disabled = true;
            if (xk === answers[qi]) x.classList.add("hit");
            else if (x === o) x.classList.add("miss");
          });
          if (!right && !reduceMotion) { o.classList.add("shake"); setTimeout(function () { o.classList.remove("shake"); }, 400); }
          q.classList.add(right ? "got" : "missed");
          if (explain) explain.classList.add("on");
          nextBtn.hidden = false;
          nextBtn.focus({ preventScroll: true });
          pipState();
        });
      });
      nextBtn.addEventListener("click", function () {
        if (qi < qs.length - 1) { show(qi + 1); qs[qi + 1].querySelector(".qz-opt").focus({ preventScroll: true }); }
        else finish();
      });
    });
    function finish() {
      qs.forEach(function (q) { q.classList.remove("on"); });
      bar.hidden = true;
      while (result.firstChild) result.removeChild(result.firstChild);
      var share = qs.length ? score / qs.length : 0;
      var pick = null;
      (spec.results || []).forEach(function (r) { if (share >= r.min && (!pick || r.min >= pick.min)) pick = r; });
      var stamp = html("div", "qz-stamp", null, result);
      html("b", null, score + "/" + qs.length, stamp);
      html("span", null, pick ? pick.label : "Score", stamp);
      var body = html("div", "qz-result-body", null, result);
      html("p", "qz-result-h", pick ? pick.label : "Done", body);
      if (pick && pick.text) html("p", "qz-result-text", pick.text, body);
      var again = html("button", "btn ghost", "Try again", body);
      again.type = "button";
      again.addEventListener("click", reset);
      result.hidden = false;
      result.classList.toggle("perfect", score === qs.length);
    }
    function reset() {
      score = 0; answered = [];
      qs.forEach(function (q) {
        q.classList.remove("got", "missed");
        var ex = q.querySelector(".qz-explain"); if (ex) ex.classList.remove("on");
        q.querySelector(".qz-next").hidden = true;
        Array.prototype.forEach.call(q.querySelectorAll(".qz-opt"), function (x) { x.disabled = false; x.classList.remove("hit", "miss"); });
      });
      show(0);
    }
    show(0);
  }

  /* ------------------------------------------------------------- checklist */
  function initChecklist(node, spec) {
    var boxes = Array.prototype.slice.call(node.querySelectorAll('input[type="checkbox"]'));
    var count = node.querySelector(".ck-count"), fill = node.querySelector(".ck-fill");
    var key = "chronicle-checklist:" + (doc.title || "") + ":" + (spec.key || "");
    var saved = STORE.get(key) || [];
    boxes.forEach(function (b) { b.checked = saved.indexOf(Number(b.getAttribute("data-k"))) >= 0; });
    function update() {
      var done = boxes.filter(function (b) { return b.checked; });
      if (count) count.textContent = done.length + " of " + boxes.length + " done";
      if (fill) fill.style.width = (boxes.length ? done.length / boxes.length * 100 : 0) + "%";
      node.classList.toggle("complete", done.length === boxes.length && boxes.length > 0);
      boxes.forEach(function (b) { b.closest("li").classList.toggle("done", b.checked); });
      STORE.set(key, done.map(function (b) { return Number(b.getAttribute("data-k")); }));
    }
    boxes.forEach(function (b) { b.addEventListener("change", update); });
    update();
  }

  /* ---------------------------------------------------------------- widgets */
  /* A widget is a script written for one page. It gets its root element, its data and
     this kit, so it draws in the page's style without reaching outside the page. */
  var KIT = {
    svg: svg, html: html, text: txt, clamp: clamp, ease: ease, linear: linear, ticks: ticks,
    fmt: fmt, fmtDate: fmtDate, parseDate: parseDate, label: labelX, color: colorOf,
    icon: drawIcon, reduceMotion: reduceMotion, store: STORE,
    tip: { show: showTip, hide: hideTip, at: pointerXY },
    onScroll: function (fn) { scrollers.push(fn); },
    onFrame: function (fn) { plates.push(fn); },
    chart: function (mountNode, chartSpec) { return mountChart(null, chartSpec, mountNode, {}); }
  };
  function initWidget(node, spec) {
    var registry = WIDGETS || {};
    var fn = registry[spec.name];
    var root = node.querySelector(".widget-root");
    if (typeof fn !== "function" || !root) return;
    if (spec.height) root.style.minHeight = Number(spec.height) + "px";
    fn(root, spec.data || {}, KIT);
    var fallback = node.querySelector(".widget-fallback");
    if (fallback) fallback.hidden = true;
  }

  /* ----------------------------------------------------------------- theme */
  (function theme() {
    var btn = doc.querySelector(".theme-btn");
    if (!btn) return;
    try { var saved = localStorage.getItem("chronicle-theme"); if (saved) root.setAttribute("data-theme", saved); } catch (e) { /* storage blocked: keep the viewer's theme */ }
    btn.addEventListener("click", function () {
      var explicit = root.getAttribute("data-theme");
      var dark = explicit ? explicit === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("chronicle-theme", next); } catch (e) { /* storage blocked: the choice lasts this visit */ }
    });
  })();

  /* ------------------------------------------------------------------ boot */
  doc.querySelectorAll("[data-fig]").forEach(function (node) {
    var spec = FIGS[node.getAttribute("data-fig")];
    if (!spec) return;
    var type = spec.type;
    try {
      if (type === "chart") mountChart(node, spec, node.querySelector(".mount"), {});
      else if (type === "stats") initStats(node, spec);
      else if (type === "scrolly") initScrolly(node, spec);
      else if (type === "timeline") initTimeline(node, spec);
      else if (type === "stepper") initStepper(node, spec);
      else if (type === "compare") initCompare(node, spec);
      else if (type === "matrix") initMatrix(node, spec);
      else if (type === "roadmap") initRoadmap(node, spec);
      else if (type === "team") initTeam(node, spec);
      else if (type === "model") initModel(node, spec);
      else if (type === "plate") initPlate(node, spec);
      else if (type === "tilemap") initTilemap(node, spec);
      else if (type === "flow") initFlow(node, spec);
      else if (type === "diagram") initDiagram(node, spec);
      else if (type === "quiz") initQuiz(node, spec);
      else if (type === "checklist") initChecklist(node, spec);
      else if (type === "widget") initWidget(node, spec);
    } catch (err) {
      var note = html("p", "fig-note", "This figure could not start: " + err.message, null);
      node.appendChild(note);
    }
  });
  var spanUpdate = initProgress();
  var ticking = false;
  function frameLoop(now) {
    ticking = false;
    var vh = window.innerHeight || 800;
    spanUpdate(vh);
    scrollers.forEach(function (f) { f(vh); });
    plates.forEach(function (f) { f(vh, now || performance.now()); });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frameLoop); } }
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  frameLoop(performance.now());
  if (!reduceMotion) {
    (function loop(t) { plates.forEach(function (f) { f(window.innerHeight || 800, t); }); requestAnimationFrame(loop); })(performance.now());
  }

}
