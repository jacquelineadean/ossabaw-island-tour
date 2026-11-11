// The "tour" widget: the map hub that opens the other three widgets as scenes.
// Ported from the published Ossabaw page. The code builds its own DOM inside the root it is given.
import { mountHabitat } from "./habitat.js";
import { mountHouse } from "./house.js";
import { mountNest } from "./nest.js";

export default function mountTour(root, data, kit) {
// The map tour. The painted island map is the hub: each stop marker zooms into that stop's
// scene (the field kit, the Main Road, a tabby cabin, the house, the habitat walk, the hogs,
// the donkeys, the nesting beach, the field journal). The page's top bar becomes a trail of
// stop icons that follows the reader through the story, or through the tour in full screen.
var stops = data.stops || [], M = data.map, icons = data.icons || {}, n = stops.length;
var VKEY = "ossabaw-tour-visited", JKEY = data.journal || "ossabaw-journal";
function load(key) { try { return JSON.parse(kit.store.get(key) || "{}") || {}; } catch (e) { return {}; } }
var visited = load(VKEY);
function pct(v, t) { return (100 * v / t).toFixed(3) + "%"; }
function img(src, cls, parent) { var el = kit.html("img", cls, null, parent); el.src = src; el.alt = ""; el.draggable = false; return el; }
function btn(cls, text, parent) { var b = kit.html("button", cls, text, parent); b.type = "button"; return b; }

var app = kit.html("div", "tour-app", null, root);
var fig = root.closest ? root.closest("figure") : null, heroEl = document.querySelector("header.hero");
if (fig && heroEl && data.lead !== false) {
  document.documentElement.classList.add("has-tour");
  heroEl.appendChild(fig);
  fig.classList.add("tour-lead");
}
var head = kit.html("div", "tour-head", null, app);
var mapBtn = btn("tour-btn tour-tomap", null, head);
img(icons.map, "tb-icon", mapBtn); kit.html("span", null, "Map", mapBtn);
var where = kit.html("div", "tour-where", null, head);
var whereIcon = img(icons.map, "tw-icon", where);
var whereText = kit.html("p", "tw-text", null, where);
var nav = kit.html("div", "tour-nav", null, head);
var prevBtn = btn("tour-btn", "‹", nav); prevBtn.setAttribute("aria-label", "Previous stop");
var nextBtn = btn("tour-btn", "›", nav); nextBtn.setAttribute("aria-label", "Next stop");
var fsBtn = btn("tour-btn tour-fs", "Full screen", nav);
var stage = kit.html("div", "tour-stage", null, app);

// ------------------------------------------------------------------ the map hub
var mapView = kit.html("div", "tour-map", null, stage);
var scroller = kit.html("div", "map-scroll", null, mapView);
var sheet = kit.html("div", "map-sheet", null, scroller);
sheet.style.aspectRatio = M.w + " / " + M.h;
img(M.img, "map-base", sheet);
var mapLayers = (M.layers || []).map(function (L) {
  var el = img(L.src, "map-layer" + (L.blend === "normal" ? "" : " mult"), sheet);
  el.style.left = pct(L.box[0], M.w); el.style.top = pct(L.box[1], M.h);
  el.style.width = pct(L.box[2], M.w); el.style.height = pct(L.box[3], M.h);
  return { el: el, motion: L.motion, travel: L.travel || 0 };
});
var ov = kit.svg("svg", { viewBox: "0 0 " + M.w + " " + M.h, "class": "map-ov", preserveAspectRatio: "none", "aria-hidden": "true" }, sheet);
(M.labels || []).forEach(function (lb) {
  var t = kit.text(ov, lb.x, lb.y, lb.text, { "class": "rl rl-" + (lb.style || "hand"), "font-size": lb.size || 26, "text-anchor": lb.anchor || "start" });
  if (lb.color) t.setAttribute("fill", lb.color);
  if (lb.angle) t.setAttribute("transform", "rotate(" + lb.angle + " " + lb.x + " " + lb.y + ")");
});
var routeD = stops.map(function (s, i) { return (i ? "L" : "M") + s.at[0] + " " + s.at[1]; }).join(" ");
kit.svg("path", { d: routeD, "class": "route-shadow" }, ov);
kit.svg("path", { d: routeD, "class": "route" }, ov);
var pinCard = kit.html("div", "pin-card", null, mapView);
pinCard.hidden = true;
(data.pins || []).forEach(function (p) {
  var b = btn("tm-pin", null, sheet);
  b.style.left = pct(p.at[0], M.w); b.style.top = pct(p.at[1], M.h);
  b.setAttribute("aria-label", p.title);
  b.addEventListener("click", function (ev) {
    ev.stopPropagation();
    while (pinCard.firstChild) pinCard.removeChild(pinCard.firstChild);
    kit.html("h4", null, p.title, pinCard);
    kit.html("p", null, p.text, pinCard);
    pinCard.hidden = false;
  });
});
mapView.addEventListener("click", function () { pinCard.hidden = true; });
var markers = stops.map(function (s, i) {
  var b = btn("tm-stop", null, sheet);
  b.style.left = pct(s.at[0], M.w); b.style.top = pct(s.at[1], M.h);
  if (s.at[0] > M.w * 0.7) b.classList.add("lbl-left");
  var badge = kit.html("span", "tm-badge", null, b);
  img(s.icon, "tm-icon", badge);
  kit.html("span", "tm-num", String(i + 1), badge);
  kit.html("span", "tm-lbl", s.short, b);
  b.setAttribute("aria-label", "Stop " + (i + 1) + ": " + s.title);
  b.addEventListener("click", function (ev) { ev.stopPropagation(); show(i); });
  return b;
});
var hintRow = kit.html("div", "map-hint", null, mapView);
kit.html("span", null, data.hint || "Tap a stop to go there.", hintRow);
if (data.readFrom) {
  var readBtn = btn("tour-btn ghost", "Read the field guide ↓", hintRow);
  readBtn.addEventListener("click", function () { toChapter(data.readFrom); });
}
function toChapter(id) {
  if (full) setFull(false);
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: kit.reduceMotion ? "auto" : "smooth", block: "start" });
}

// ------------------------------------------------------------------ scenes
var scenesEl = kit.html("div", "tour-scenes", null, stage);
var cache = {};
function scene(i) {
  if (cache[i]) return cache[i];
  var s = stops[i];
  var el = kit.html("section", "tour-scene", null, scenesEl);
  el.hidden = true;
  var intro = kit.html("div", "scene-intro", null, el);
  kit.html("p", "si-kicker", "Stop " + (i + 1) + " of " + n, intro);
  kit.html("h3", "si-title", s.title, intro);
  if (s.intro) kit.html("p", "si-text", s.intro, intro);
  var cls = s.kind === "habitat" ? "w-habitat" : s.kind === "nest" ? "w-nest" : s.kind === "passport" ? "passport" : "w-house";
  var mount = kit.html("div", "scene-mount " + cls, null, el);
  if (s.strip && s.strip.length) {
    var strip = kit.html("ol", "scene-strip", null, el);
    s.strip.forEach(function (f) {
      var li = kit.html("li", null, null, strip);
      kit.html("b", null, f.k, li);
      kit.html("span", null, f.v, li);
    });
  }
  var foot = kit.html("div", "scene-foot", null, el);
  var left = kit.html("div", "sf-left", null, foot);
  var back = btn("tour-btn ghost", "Back to the map", left);
  back.addEventListener("click", function () { show(-1); });
  if (s.chapter && s.kind !== "passport") {
    var more = btn("tour-btn ghost", "Read this stop in the field guide ↓", left);
    more.addEventListener("click", function () { toChapter(s.chapter); });
  }
  if (i < n - 1) {
    var nx = btn("tour-btn next", null, foot);
    img(stops[i + 1].icon, "tb-icon", nx);
    kit.html("span", null, "Next stop: " + stops[i + 1].short + " ›", nx);
    nx.addEventListener("click", function () { show(i + 1); });
  }
  cache[i] = { el: el, mount: mount, s: s, api: null };
  return cache[i];
}
function mountScene(sc) {
  if (sc.s.kind === "passport") { passport(sc); return; }
  if (sc.api) { if (sc.api.layout) sc.api.layout(); return; }
  if (sc.s.kind === "habitat") sc.api = mountHabitat(sc.mount, sc.s.scene, kit);
  else if (sc.s.kind === "nest") sc.api = mountNest(sc.mount, sc.s.scene, kit);
  else sc.api = mountHouse(sc.mount, sc.s.scene, kit);
  if (sc.api && sc.api.layout) sc.api.layout();
}
function passport(sc) {
  var box = sc.mount, seen = load(JKEY);
  while (box.firstChild) box.removeChild(box.firstChild);
  var stamps = kit.html("div", "stamps", null, box);
  stops.forEach(function (s, i) {
    var b = btn("stamp" + (visited[s.id] ? " on" : ""), null, stamps);
    img(s.icon, "stamp-icon", b);
    kit.html("span", "stamp-lbl", s.short, b);
    b.style.setProperty("--tilt", ((i * 37) % 11 - 5) + "deg");
    b.setAttribute("aria-label", s.title + (visited[s.id] ? ", visited" : ", not visited yet"));
    b.addEventListener("click", function () { show(i); });
  });
  var species = data.species || [];
  var got = species.filter(function (sp) { return seen[sp.id]; });
  var nv = stops.filter(function (s) { return visited[s.id]; }).length;
  kit.html("p", "pp-count", nv + " of " + n + " stops visited · " + got.length + " of " + species.length + " animals spotted", box);
  var list = kit.html("div", "pp-species", null, box);
  species.forEach(function (sp) { kit.html("span", "pp-sp" + (seen[sp.id] ? " on" : ""), sp.name, list); });
  if (data.quizChapter) {
    var q = btn("tour-btn next", "Take the quiz in the story ›", box);
    q.addEventListener("click", function () {
      setFull(false);
      var el = document.getElementById(data.quizChapter);
      if (el) el.scrollIntoView({ behavior: kit.reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }
}

// ------------------------------------------------------------------ navigation
var cur = -1, busy = false, full = false, holder = null;
function markVisited(i) {
  visited[stops[i].id] = 1;
  kit.store.set(VKEY, JSON.stringify(visited));
}
function paintState() {
  var onMap = cur < 0;
  mapBtn.hidden = onMap;
  prevBtn.disabled = onMap;
  nextBtn.disabled = cur >= n - 1;
  whereIcon.src = onMap ? icons.map : stops[cur].icon;
  whereText.textContent = onMap ? (data.mapTitle || "The island map") + " · " + n + " stops" : "Stop " + (cur + 1) + " · " + stops[cur].title;
  markers.forEach(function (m, i) {
    m.classList.toggle("visited", !!visited[stops[i].id]);
    m.classList.toggle("current", i === cur);
  });
  trailSync();
}
function topOf() {
  if (full) app.scrollTop = 0;
  else {
    var r = app.getBoundingClientRect();
    if (r.top < 0 || r.top > (window.innerHeight || 800) * 0.6) app.scrollIntoView({ block: "start", behavior: kit.reduceMotion ? "auto" : "smooth" });
  }
}
function origin(i) { return pct(stops[i].at[0], M.w) + " " + pct(stops[i].at[1], M.h); }
function show(i) {
  if (busy || i === cur || i < -1 || i >= n) return;
  pinCard.hidden = true;
  var from = cur;
  cur = i;
  if (i >= 0) markVisited(i);
  paintState();
  var fast = kit.reduceMotion;
  if (from < 0 && i >= 0) {
    var sc = scene(i);
    var go2 = function () {
      mapView.hidden = true;
      sheet.classList.remove("zoom");
      sc.el.hidden = false;
      mountScene(sc);
      if (!fast) { sc.el.classList.add("enter"); requestAnimationFrame(function () { requestAnimationFrame(function () { sc.el.classList.remove("enter"); }); }); }
      topOf();
      busy = false;
    };
    if (fast) { go2(); return; }
    busy = true;
    sheet.style.transformOrigin = origin(i);
    sheet.classList.add("zoom");
    setTimeout(go2, 620);
  } else if (from >= 0 && i < 0) {
    var old = cache[from];
    old.el.hidden = true;
    mapView.hidden = false;
    if (!fast) {
      sheet.style.transformOrigin = origin(from);
      sheet.classList.add("zoom", "instant");
      requestAnimationFrame(function () { requestAnimationFrame(function () { sheet.classList.remove("instant"); sheet.classList.remove("zoom"); }); });
    }
    centerMap(from);
    topOf();
  } else if (from >= 0 && i >= 0) {
    var a = cache[from], b = scene(i), dir = i > from ? "l" : "r";
    var swap = function () {
      a.el.hidden = true; a.el.classList.remove("leave-l", "leave-r");
      b.el.hidden = false;
      mountScene(b);
      if (!fast) { b.el.classList.add("enter-" + dir); requestAnimationFrame(function () { requestAnimationFrame(function () { b.el.classList.remove("enter-" + dir); }); }); }
      topOf();
      busy = false;
    };
    if (fast) { swap(); return; }
    busy = true;
    a.el.classList.add("leave-" + dir);
    setTimeout(swap, 280);
  }
}
prevBtn.addEventListener("click", function () { show(cur - 1); });
nextBtn.addEventListener("click", function () { show(cur + 1); });
mapBtn.addEventListener("click", function () { show(-1); });
function centerMap(i) {
  if (scroller.scrollWidth <= scroller.clientWidth + 2 && scroller.scrollHeight <= scroller.clientHeight + 2) return;
  var x = i >= 0 ? stops[i].at[0] / M.w : 0.42, y = i >= 0 ? stops[i].at[1] / M.h : 0.45;
  scroller.scrollLeft = Math.max(0, x * scroller.scrollWidth - scroller.clientWidth / 2);
  scroller.scrollTop = Math.max(0, y * scroller.scrollHeight - scroller.clientHeight / 2);
}

// ------------------------------------------------------------------ full screen
function setFull(on) {
  if (on === full) return;
  full = on;
  if (on) {
    holder = kit.html("div", "tour-holder", null, null);
    holder.style.height = app.offsetHeight + "px";
    root.insertBefore(holder, app);
    document.body.appendChild(app);
    app.classList.add("fs");
    document.documentElement.classList.add("tour-locked");
    fsBtn.textContent = "Close";
  } else {
    app.classList.remove("fs");
    if (holder) { root.insertBefore(app, holder); holder.parentNode.removeChild(holder); holder = null; }
    document.documentElement.classList.remove("tour-locked");
    fsBtn.textContent = "Full screen";
    window.dispatchEvent(new Event("scroll"));
  }
  if (cur >= 0 && cache[cur]) mountScene(cache[cur]);
  centerMap(cur);
  trailSync();
}
fsBtn.addEventListener("click", function () { setFull(!full); });
document.addEventListener("keydown", function (ev) {
  if (!full) return;
  if (ev.key === "Escape") setFull(false);
  else if (ev.key === "ArrowRight" && ev.target === document.body) show(Math.min(n - 1, cur + 1));
  else if (ev.key === "ArrowLeft" && ev.target === document.body) show(cur - 1);
});

// ------------------------------------------------------------------ the trail in the top bar
var trail = null, walker = null, trailStops = [], chapters = [];
// The page builds its own progress device after the figures start, so the trail waits a tick.
function buildTrail() {
  var track = document.querySelector(".spanbar-track");
  if (!track || data.trail === false) return;
  document.documentElement.classList.add("has-trail");
  trail = kit.html("div", "trail", null, null);
  track.parentNode.insertBefore(trail, track.nextSibling);
  trail.setAttribute("aria-label", "Stops on the tour");
  kit.html("span", "trail-road", null, trail);
  walker = img(icons.boot, "trail-walker", trail);
  walker.setAttribute("aria-hidden", "true");
  trailStops = stops.map(function (s, i) {
    var b = btn("trail-stop", null, trail);
    b.style.left = (n > 1 ? 100 * i / (n - 1) : 0) + "%";
    img(s.icon, "ts-icon", b);
    b.setAttribute("aria-label", "Stop " + (i + 1) + ": " + s.title);
    b.addEventListener("pointerenter", function (ev) {
      var xy = kit.tip.at(ev);
      kit.tip.show(function (t) { kit.html("div", "tip-h", (i + 1) + "  " + s.title, t); }, xy[0], xy[1] + 16);
    });
    b.addEventListener("pointerleave", function () { kit.tip.hide(); });
    b.addEventListener("click", function () {
      kit.tip.hide();
      if (!full && !tourInView()) app.scrollIntoView({ behavior: kit.reduceMotion ? "auto" : "smooth", block: "start" });
      if (i === cur) return;
      show(i);
    });
    return b;
  });
  chapters = stops.map(function (s) { return document.getElementById(s.chapter); });
  var bar = document.querySelector(".spanbar-in"), theme = bar && bar.querySelector(".theme-btn");
  if (bar) {
    var tb = btn("trail-tour", null, null);
    img(icons.map, "tt-icon", tb);
    kit.html("span", "tt-lbl", "Map tour", tb);
    tb.setAttribute("aria-label", "Open the map tour full screen");
    tb.addEventListener("click", function () { if (full) setFull(false); else { setFull(true); if (cur >= 0) show(-1); } });
    if (theme) bar.insertBefore(tb, theme); else bar.appendChild(tb);
  }
  kit.onScroll(function () { if (!full) trailSync(); });
  window.addEventListener("scroll", function () { if (!full) trailSync(); }, { passive: true });
  trailSync();
}
setTimeout(buildTrail, 0);

function tourInView() {
  var r = app.getBoundingClientRect(), vh = window.innerHeight || 800;
  return r.bottom > vh * 0.35 && r.top < vh * 0.65;
}
function storyPos() {
  var y = (window.scrollY || 0) + (window.innerHeight || 800) * 0.35, p = -0.4;
  for (var i = 0; i < chapters.length; i++) {
    if (!chapters[i]) continue;
    var top = chapters[i].getBoundingClientRect().top + (window.scrollY || 0);
    if (y >= top) {
      var nextTop = chapters[i + 1] ? chapters[i + 1].getBoundingClientRect().top + (window.scrollY || 0) : document.body.scrollHeight;
      p = i + kit.clamp((y - top) / Math.max(1, nextTop - top), 0, 0.999);
    }
  }
  return p;
}
function trailSync() {
  if (!trail) return;
  var nowEl = document.querySelector(".spanbar-now");
  if (nowEl && full) nowEl.textContent = cur < 0 ? "Island map" : "Tour · " + String(cur + 1).padStart(2, "0") + " " + stops[cur].short;
  var tourMode = full || tourInView();
  var p = tourMode ? Math.max(0, cur) : storyPos(), at = Math.round(Math.max(0, Math.floor(p)));
  walker.style.left = (100 * kit.clamp(p, 0, n - 1) / Math.max(1, n - 1)) + "%";
  trailStops.forEach(function (b, i) {
    var on = tourMode ? (cur >= 0 && i === cur) : (p >= 0 && i === at);
    b.classList.toggle("passed", tourMode ? !!visited[stops[i].id] || i === cur : i <= p);
    b.classList.toggle("current", on);
    if (on) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
  });
}

// ------------------------------------------------------------------ map motion and start
var t0 = 0;
kit.onFrame(function (vh, now) {
  if (kit.reduceMotion || mapView.hidden || !app.getClientRects().length) return;
  if (!t0) t0 = now;
  var t = (now - t0) / 1000;
  mapLayers.forEach(function (L, k) {
    if (L.motion === "cross") {
      var dist = Math.max(1, L.travel), q = (t * 22 + k * 70) % dist;
      L.el.style.transform = "translateX(" + (q / M.w * sheet.clientWidth).toFixed(1) + "px)";
      L.el.style.opacity = String(kit.clamp(Math.min(q / 40, (dist - q) / 40), 0, 1));
    } else if (L.motion === "drift") {
      L.el.style.transform = "translate(" + (Math.sin(t / 3.8) * 10).toFixed(1) + "px," + (Math.cos(t / 2.9) * 3).toFixed(1) + "px)";
    }
  });
});
paintState();
requestAnimationFrame(function () { centerMap(-1); trailSync(); });
}
