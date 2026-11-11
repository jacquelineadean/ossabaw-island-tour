// The "nest" widget.
// Ported from the published Ossabaw page. The code builds its own DOM inside the root it is given.
export function mountNest(root, data, kit) {
// One loggerhead nest through a summer, in seven steps: the female crawls up, digs, lays and
// leaves; monitors screen the nest; the eggs incubate; the hatchlings dig up and run for the sea.
var S = data.scene, steps = data.steps || [], surf = data.surface || [], nestX = data.nestX || 620;
var stage = kit.html("div", "nest-stage", null, root);
stage.style.aspectRatio = S.w + " / " + S.h;
function img(src, cls, parent) {
  var el = kit.html("img", cls, null, parent);
  el.src = src; el.alt = ""; el.draggable = false;
  return el;
}
function pct(v, t) { return (100 * v / t).toFixed(3) + "%"; }
function place(el, x, y, w, h) { el.style.left = pct(x, S.w); el.style.top = pct(y, S.h); el.style.width = pct(w, S.w); el.style.height = pct(h, S.h); }
img(S.img, "bg", stage).setAttribute("aria-hidden", "true");
var lay = {};
(S.overlays || []).forEach(function (o) {
  var el = img(o.img, "ov" + (o.blend === "normal" ? "" : " mult"), stage);
  place(el, o.box[0], o.box[1], o.box[2], o.box[3]);
  lay[o.role] = el;
});
var glow = kit.html("div", "dayglow", null, stage);
var day = kit.html("p", "day", null, stage);
day.setAttribute("aria-hidden", "true");

function rig(def, scale) {
  var box = kit.html("span", "rig", null, stage);
  var flip = kit.html("span", "nb-flip", null, box);
  var body = kit.html("span", "nb-body", null, flip);
  var parts = def.parts.map(function (p) {
    var el = img(p.src, "part", body);
    el.style.left = (100 * p.box[0] / def.w) + "%"; el.style.top = (100 * p.box[1] / def.h) + "%";
    el.style.width = (100 * p.box[2] / def.w) + "%"; el.style.height = (100 * p.box[3] / def.h) + "%";
    var pv = p.pivot || [p.box[0] + p.box[2] / 2, p.box[1] + p.box[3] / 2];
    el.style.transformOrigin = (100 * (pv[0] - p.box[0]) / p.box[2]) + "% " + (100 * (pv[1] - p.box[1]) / p.box[3]) + "%";
    return { el: el, p: p };
  });
  var w = def.w * scale, h = def.h * scale;
  box.style.width = pct(w, S.w); box.style.height = pct(h, S.h);
  return { box: box, flip: flip, body: body, parts: parts, def: def, s: scale, w: w, h: h };
}
function groundY(x) {
  for (var i = 1; i < surf.length; i++) {
    if (x <= surf[i][0]) {
      var a = surf[i - 1], b = surf[i], k = (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * k;
    }
  }
  return surf.length ? surf[surf.length - 1][1] : S.h * 0.6;
}
function pose(r, x, y, face, cycle, fast, vis, tilt) {
  r.box.style.left = pct(x - r.def.anchor * r.s, S.w);
  r.box.style.top = pct(y - r.def.ground * r.s, S.h);
  r.box.style.opacity = vis.toFixed(2);
  r.box.style.visibility = vis < 0.02 ? "hidden" : "visible";
  r.flip.style.transform = (face < 0 ? "scaleX(-1) " : "") + "rotate(" + (tilt || 0).toFixed(1) + "deg)";
  var c = cycle * Math.PI * 2;
  r.parts.forEach(function (pt) {
    var p = pt.p, a = 0;
    if (p.role === "flipper") {
      var rear = /^rl/.test(p.src.split("--").pop());
      a = (fast && rear ? 1.6 : 1) * (p.amp || 20) * Math.sin(c * (fast && rear ? 2.4 : 1) + (p.phase || 0) * Math.PI * 2);
    }
    pt.el.style.transform = "rotate(" + a.toFixed(1) + "deg)";
  });
  r.body.style.transform = "translateY(" + (-Math.abs(Math.sin(c)) * 2).toFixed(1) + "%)";
}
var mother = rig(data.rigs.mother, data.motherScale || 0.56);
var babies = [];
for (var i = 0; i < 7; i++) babies.push({ r: rig(data.rigs.hatchling, data.babyScale || 0.2), seed: Math.random(), dx: (i - 3) * 14 });

// controls
var bar = kit.html("div", "bar", null, root);
var prev = kit.html("button", "nest-btn", "‹ Back", bar); prev.type = "button";
var dots = kit.html("div", "dots", null, bar);
var next = kit.html("button", "nest-btn", "Next ›", bar); next.type = "button";
var play = kit.html("button", "nest-btn play", "Play", bar); play.type = "button";
var cap = kit.html("div", "cap", null, root);
cap.setAttribute("aria-live", "polite");
var dotBtns = steps.map(function (s, i) {
  var b = kit.html("button", "dot", String(i + 1), dots);
  b.type = "button";
  b.setAttribute("aria-label", "Step " + (i + 1) + ": " + s.title);
  b.addEventListener("click", function () { auto = false; play.textContent = "Play"; go(i); });
  return b;
});
var cur = 0, t0 = 0, auto = false;
function go(i) {
  cur = kit.clamp(i, 0, steps.length - 1);
  t0 = -1;
  dotBtns.forEach(function (b, k) { b.setAttribute("aria-current", k === cur ? "step" : "false"); });
  while (cap.firstChild) cap.removeChild(cap.firstChild);
  kit.html("p", "cap-kicker", "Step " + (cur + 1) + " of " + steps.length, cap);
  kit.html("h4", "cap-title", steps[cur].title, cap);
  kit.html("p", "cap-text", steps[cur].text, cap);
  prev.disabled = cur === 0; next.disabled = cur === steps.length - 1;
  if (kit.reduceMotion) render(9);
}
prev.addEventListener("click", function () { auto = false; play.textContent = "Play"; go(cur - 1); });
next.addEventListener("click", function () { auto = false; play.textContent = "Play"; go(cur + 1); });
play.addEventListener("click", function () {
  auto = !auto; play.textContent = auto ? "Pause" : "Play";
  if (auto && cur === steps.length - 1) go(0);
});

function show(name, v) { if (lay[name]) lay[name].style.opacity = kit.clamp(v, 0, 1).toFixed(2); }
var restX = nestX - 98, seaX = 1330;
function render(t) {
  var s = cur;
  show("chamber", s > 1 ? 1 : s === 1 ? t / 4 : 0);
  show("eggs", s > 2 && s < 5 ? 1 : s === 2 ? t / 2 : s === 5 ? 1 - t / 5 : s === 6 ? 0 : 0);
  show("stake", s > 3 ? 1 : s === 3 ? t / 0.8 : 0);
  if (lay.moonpath) lay.moonpath.style.transform = "translateX(" + (Math.sin(t * 1.3) * 0.6).toFixed(2) + "%)";
  // the female
  var mx = restX, face = -1, fast = false, vis = 1, cyc = 0;
  if (s === 0) { mx = seaX - Math.min(1, t / 9) * (seaX - restX); cyc = (seaX - mx) / 70; vis = Math.min(1, t / 1.2); }
  else if (s === 1) { fast = true; cyc = t * 0.9; }
  else if (s === 2) {
    if (t > 4) { face = 1; mx = restX + Math.min(1, (t - 4) / 8) * (seaX + 80 - restX); cyc = (mx - restX) / 70; vis = 1 - kit.clamp((t - 10) / 2, 0, 1); }
  } else vis = 0;
  var gy = groundY(mx);
  var slope = Math.atan2(groundY(mx + 40) - groundY(mx - 40), 80) * 180 / Math.PI;
  pose(mother, mx, gy + 6, face, cyc, fast, vis, face < 0 ? -slope : slope);
  // incubation clock
  if (s === 4) {
    var d = Math.min(data.days || 56, Math.floor(1 + t * 9));
    day.textContent = "Day " + d;
    day.style.opacity = "1";
    glow.style.opacity = (0.5 + 0.5 * Math.sin(t * 6)).toFixed(2) * 0.55;
  } else { day.style.opacity = "0"; glow.style.opacity = "0"; }
  // hatchlings
  babies.forEach(function (b, k) {
    var bx = nestX + b.dx, by, bv = 0, bf = 1, bc = 0, tilt = 0;
    if (s === 5) {
      var rise = kit.clamp((t - 1 - k * 0.3) / 6, 0, 1);
      by = 640 - k % 3 * 22 - rise * (210 - k % 3 * 22);
      bx = nestX + b.dx * 0.6 + Math.sin(t * 5 + k) * 4;
      bv = kit.clamp((t - k * 0.3) / 1, 0, 1);
      tilt = -70 + Math.sin(t * 7 + k) * 20;
      bc = t * 1.5 + k;
    } else if (s === 6) {
      var span = seaX - 60 - nestX, period = 9;
      var q = ((t + b.seed * period + k * 1.1) % period) / period;
      bx = nestX + b.dx * 0.3 + q * span;
      by = groundY(bx) + 2;
      bv = Math.min(1, q * 12, (1 - q) * 10);
      bc = q * span / 22;
      tilt = Math.atan2(groundY(bx + 20) - groundY(bx - 20), 40) * 180 / Math.PI;
    }
    pose(b.r, bx, by || 0, bf, bc, false, bv, tilt);
  });
}
kit.onFrame(function (vh, now) {
  if (!root.isConnected || !root.getClientRects().length) { t0 = -1; return; }
  var rect = stage.getBoundingClientRect();
  if (rect.bottom < -50 || rect.top > vh + 50) return;
  if (t0 < 0) t0 = now;
  var t = (now - t0) / 1000;
  render(kit.reduceMotion ? 9 : t);
  if (auto && t > (steps[cur].dur || 10)) { if (cur < steps.length - 1) go(cur + 1); else { auto = false; play.textContent = "Play"; } }
});
go(0);
render(0);
return { go: go };
}

export default mountNest;
