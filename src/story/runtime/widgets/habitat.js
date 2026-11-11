// The "habitat" widget.
// Ported from the published Ossabaw page. The code builds its own DOM inside the root it is given.
export function mountHabitat(root, data, kit) {
// A painted habitat the reader can pan across, with animals painted as jointed sprites
// that walk, graze, root, swim and crawl. Tapping an animal opens its field-guide card and
// stamps it in the reader's field journal. An optional tide slider floods the marsh.
var S = data.scene, rigs = data.rigs || {}, actors = data.actors || [];
var zones = data.zones || [];
var key = data.journal || "";
var seen = {};
try { seen = JSON.parse(kit.store.get(key) || "{}") || {}; } catch (e) { seen = {}; }

var bar = zones.length ? kit.html("div", "zone-bar", null, root) : null;
var view = kit.html("div", "view", null, root);
view.tabIndex = 0;
view.setAttribute("role", "region");
view.setAttribute("aria-label", data.label || "Painted habitat; drag or use the arrow keys to look around");
var world = kit.html("div", "world", null, view);
world.style.width = S.w + "px";
world.style.height = S.h + "px";
function img(src, cls, parent) {
  var el = kit.html("img", cls, null, parent);
  el.src = src; el.alt = ""; el.draggable = false; el.decoding = "async";
  return el;
}
function place(el, box) {
  el.style.left = box[0] + "px"; el.style.top = box[1] + "px";
  el.style.width = box[2] + "px"; el.style.height = box[3] + "px";
}
img(S.img, "bg", world).style.width = S.w + "px";
var tideEls = [], surfEls = [];
(data.overlays || []).forEach(function (o) {
  var el = img(o.img, "ov ov-" + o.role + (o.blend === "normal" ? " ov-normal" : ""), world);
  place(el, o.box);
  el.style.zIndex = String(o.z || (o.role === "front" ? 2000 : 5));
  if (o.role === "tide") tideEls.push(el);
  if (o.role === "surf") surfEls.push({ el: el, shift: o.shift || [0, 0] });
});
var spot = zones.length ? kit.html("div", "zone-spot", null, world) : null;

// ------------------------------------------------------------------ actors
var cast = actors.map(function (a, i) {
  var rig = rigs[a.rig];
  var s = a.scale || 1;
  var btn = kit.html("button", "actor", null, world);
  btn.type = "button";
  btn.setAttribute("aria-label", a.name);
  btn.style.width = rig.w * s + "px";
  btn.style.height = rig.h * s + "px";
  var flip = kit.html("span", "hb-flip", null, btn);
  var body = kit.html("span", "hb-body", null, flip);
  var parts = rig.parts.map(function (p) {
    var el = img(p.src, "part", body);
    el.style.left = 100 * p.box[0] / rig.w + "%";
    el.style.top = 100 * p.box[1] / rig.h + "%";
    el.style.width = 100 * p.box[2] / rig.w + "%";
    el.style.height = 100 * p.box[3] / rig.h + "%";
    var pv = p.pivot || [p.box[0] + p.box[2] / 2, p.box[1] + p.box[3] / 2];
    el.style.transformOrigin = (100 * (pv[0] - p.box[0]) / p.box[2]).toFixed(1) + "% " + (100 * (pv[1] - p.box[1]) / p.box[3]).toFixed(1) + "%";
    return { el: el, p: p, ang: 0 };
  });
  var st = {
    a: a, rig: rig, s: s, btn: btn, flip: flip, body: body, parts: parts,
    x: a.x, y: a.y, face: a.face || 1, mode: "idle", timer: 1 + (i % 5) * 0.7,
    target: a.x, cycle: Math.random(), act: 0, vis: 1, t0: Math.random() * 10, path: 0
  };
  btn.addEventListener("click", function () { pick(st); });
  return st;
});

function locate(st) {
  var r = st.rig, s = st.s;
  st.btn.style.left = (st.x - r.anchor * s) + "px";
  st.btn.style.top = (st.y - r.ground * s) + "px";
  st.btn.style.zIndex = String(Math.round(st.y) + (st.a.z || 0));
  st.flip.style.transform = st.face < 0 ? "scaleX(-1)" : "";
}
cast.forEach(locate);

function rnd(lo, hi) { return lo + Math.random() * (hi - lo); }
var tide = data.tide ? Number(data.tide.start || 0.2) : 0;

function step(st, dt, now) {
  var a = st.a, b = a.behavior || "idle", spd = a.speed || 30;
  var range = a.range || [st.x, st.x];
  var moving = false, act = 0;
  st.timer -= dt;
  if (b === "wander" || b === "wade" || b === "scuttle") {
    if (st.mode === "walk") {
      var dir = st.target > st.x ? 1 : -1;
      var stepx = Math.min(Math.abs(st.target - st.x), spd * dt);
      st.x += dir * stepx;
      st.face = dir * (a.face || 1) * (b === "scuttle" ? 0 : 1) || st.face;
      st.cycle += stepx / (a.stride || 60);
      moving = true;
      if (Math.abs(st.target - st.x) < 1) { st.mode = "idle"; st.timer = rnd(a.rest ? a.rest[0] : 2, a.rest ? a.rest[1] : 6); }
    } else if (st.timer <= 0) {
      st.mode = "walk";
      st.target = rnd(range[0], range[1]);
    } else {
      act = 1;
    }
    if (a.dy) st.y = a.y + Math.sin((st.x - range[0]) / 90) * a.dy;
  } else if (b === "swim") {
    st.path += dt * spd;
    var span = range[1] - range[0];
    var u = (st.path % (2 * span)) / span;
    var nx = range[0] + (u < 1 ? u : 2 - u) * span;
    st.face = (u < 1 ? 1 : -1) * (a.face || 1);
    st.cycle += Math.abs(nx - st.x) / (a.stride || 80);
    st.x = nx;
    moving = true;
  } else if (b === "arc") {
    var period = a.period || 7, tt = ((now / 1000 + st.t0) % period) / period;
    var leap = a.leap || 0.28;
    if (tt < leap) {
      var k = tt / leap;
      st.x = range[0] + (range[1] - range[0]) * k;
      st.y = a.y - Math.sin(Math.PI * k) * (a.height || 80);
      st.vis = 1;
      st.body.style.transform = "rotate(" + (-40 + 80 * k) * (a.face || 1) + "deg)";
    } else st.vis = 0;
  } else if (b === "crawl") {
    st.path += dt * spd;
    var len = range[1] - range[0];
    var q = (st.path + (a.offset || 0)) % (len + 120);
    st.x = range[0] + Math.min(q, len);
    st.y = a.y + Math.sin(q / 37 + st.t0) * 6;
    st.vis = q > len ? 0 : Math.min(1, q / 30, (len - q) / 40);
    st.cycle += dt * 2.2;
    moving = true;
  } else if (b === "glide") {
    st.path += dt * spd;
    var w = range[1] - range[0];
    st.x = range[0] + (st.path + (a.offset || 0)) % w;
    st.y = a.y + Math.sin(now / 1700 + st.t0) * 12;
    st.vis = Math.min(1, (st.x - range[0]) / 80, (range[1] - st.x) / 80);
    st.cycle += dt * 0.8;
    moving = true;
  } else if (b === "hop") {
    if (st.mode === "hop") {
      var hk = 1 - st.timer / 0.45;
      st.x = st.hx + (st.target - st.hx) * Math.min(1, hk);
      st.y = a.y - Math.sin(Math.PI * Math.min(1, hk)) * 26;
      if (st.timer <= 0) { st.mode = "idle"; st.y = a.y; st.timer = rnd(1.5, 4); }
    } else if (st.timer <= 0) {
      st.mode = "hop"; st.hx = st.x; st.target = rnd(range[0], range[1]); st.timer = 0.45;
      st.face = (st.target > st.x ? 1 : -1) * (a.face || 1);
    } else act = 1;
  } else {
    act = 1;
  }
  if (a.tide === "low") st.vis = Math.max(0, Math.min(1, (0.62 - tide) * 4));
  if (a.tide === "high") st.vis = st.vis * Math.max(0, Math.min(1, (tide - 0.45) * 4));
  // joints
  st.act += ((act ? 1 : 0) - st.act) * Math.min(1, dt * 2.5);
  var c = st.cycle * Math.PI * 2, t = now / 1000 + st.t0;
  st.parts.forEach(function (pt) {
    var p = pt.p, ang = 0, amp = p.amp || 0;
    if (p.role === "leg" || p.role === "flipper") ang = moving ? amp * Math.sin(c + (p.phase || 0) * Math.PI * 2) : 0;
    else if (p.role === "head") ang = (moving ? (p.nod || 3) * Math.sin(c * 2) : 0) + st.act * (p.down || 0) * (0.75 + 0.25 * Math.sin(t * 1.3)) + (p.look || 0) * Math.sin(t * 0.4);
    else if (p.role === "tail") ang = amp * Math.sin(t * (p.speed || 3) + (p.phase || 0));
    else if (p.role === "ear") ang = Math.pow(Math.max(0, Math.sin(t * 0.9 + (p.phase || 0))), 30) * amp;
    else if (p.role === "wing") ang = amp * Math.sin(t * (p.speed || 6));
    else if (p.role === "claw") ang = st.act * amp * Math.max(0, Math.sin(t * (p.speed || 4)));
    else if (p.role === "sway") ang = amp * Math.sin(t * (p.speed || 1.2) + (p.phase || 0));
    if (Math.abs(ang - pt.ang) > 0.05) { pt.ang = ang; pt.el.style.transform = "rotate(" + ang.toFixed(2) + "deg)"; }
  });
  if (b !== "arc") {
    var bob = (moving ? Math.abs(Math.sin(c)) * (st.rig.bob || 3) : Math.sin(t * 1.6) * (st.rig.breathe || 0.8)) * st.s;
    st.body.style.transform = "translateY(" + (-bob).toFixed(1) + "px)";
  }
  st.btn.style.opacity = st.vis.toFixed(2);
  st.btn.style.visibility = st.vis < 0.02 ? "hidden" : "visible";
  locate(st);
}

// ------------------------------------------------------------------ pan and zoom
var k = 1, pan = 0, maxPan = 0, panTarget = null;
function layout() {
  var vw = view.clientWidth || 600;
  var phone = vw < 640;
  var vh = phone ? (data.view && data.view.phone || 360) : (data.view && data.view.desktop || 520);
  if (data.view && data.view.fill) vh = kit.clamp((window.innerHeight || 800) * (phone ? 0.5 : 0.6), 260, phone ? 460 : 640);
  k = vh / S.h;
  if (S.w * k < vw) { k = vw / S.w; vh = S.h * k; }
  view.style.height = Math.round(vh) + "px";
  maxPan = Math.max(0, S.w * k - vw);
  if (pan > maxPan) pan = maxPan;
  apply();
}
function apply() {
  world.style.transform = "translateX(" + (-pan).toFixed(1) + "px) scale(" + k.toFixed(4) + ")";
  if (bar) {
    var vw = view.clientWidth || 600, a0 = pan / k, a1 = (pan + vw) / k, mid = (a0 + a1) / 2;
    var shown = zones.map(function (z) { return Math.max(0, Math.min(a1, z.x1) - Math.max(a0, z.x0)) / (z.x1 - z.x0) >= 0.55; });
    if (shown.indexOf(true) < 0) shown = zones.map(function (z) { return mid >= z.x0 && mid < z.x1; });
    zoneBtns.forEach(function (b, i) { b.setAttribute("aria-current", (focusZone != null ? i === focusZone : shown[i]) ? "true" : "false"); });
  }
  if (left) { left.disabled = pan <= 1; right.disabled = pan >= maxPan - 1; }
}
var focusZone = null;
var zoneBtns = zones.map(function (z, i) {
  var b = kit.html("button", "zone", z.label, bar);
  b.type = "button";
  b.addEventListener("click", function () {
    focusZone = i;
    panTarget = kit.clamp(((z.x0 + z.x1) / 2) * k - view.clientWidth / 2, 0, maxPan); kick();
    if (spot) {
      spot.style.left = z.x0 + "px"; spot.style.width = (z.x1 - z.x0) + "px";
      spot.classList.remove("on"); void spot.offsetWidth; spot.classList.add("on");
    }
    zoneCard(z);
    apply();
  });
  return b;
});
var left = null, right = null;
if (S.w > 1800) {
  left = kit.html("button", "nav nav-l", "‹", view);
  right = kit.html("button", "nav nav-r", "›", view);
  left.type = right.type = "button";
  left.setAttribute("aria-label", "Look west");
  right.setAttribute("aria-label", "Look east");
  left.addEventListener("click", function () { focusZone = null; panTarget = kit.clamp(pan - view.clientWidth * 0.6, 0, maxPan); kick(); });
  right.addEventListener("click", function () { focusZone = null; panTarget = kit.clamp(pan + view.clientWidth * 0.6, 0, maxPan); kick(); });
}
var drag = null;
view.addEventListener("pointerdown", function (ev) {
  if (ev.target.closest && ev.target.closest("button")) return;
  drag = { x: ev.clientX, pan: pan, id: ev.pointerId, moved: false }; panTarget = null;
});
view.addEventListener("pointermove", function (ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  if (Math.abs(ev.clientX - drag.x) > 4) { drag.moved = true; focusZone = null; }
  pan = kit.clamp(drag.pan - (ev.clientX - drag.x), 0, maxPan); apply();
});
["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { view.addEventListener(n, function () { drag = null; }); });
view.addEventListener("keydown", function (ev) {
  if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
    ev.preventDefault();
    focusZone = null;
    panTarget = kit.clamp(pan + (ev.key === "ArrowRight" ? 1 : -1) * view.clientWidth * 0.35, 0, maxPan); kick();
  }
});
window.addEventListener("resize", function () { if (root.getClientRects().length) layout(); });

// ------------------------------------------------------------------ tide
if (data.tide) {
  var row = kit.html("div", "tide-row", null, root);
  var lab = kit.html("label", "tide-label", data.tide.label || "Tide", row);
  kit.html("span", "tide-end", data.tide.low || "Low", row);
  var inp = kit.html("input", "tide-range", null, row);
  inp.type = "range"; inp.min = "0"; inp.max = "100"; inp.value = String(Math.round(tide * 100));
  inp.id = "tide-" + (data.id || "habitat");
  lab.setAttribute("for", inp.id);
  kit.html("span", "tide-end", data.tide.high || "High", row);
  var tideNote = kit.html("p", "tide-note", null, root);
  tideNote.setAttribute("aria-live", "polite");
  var setTide = function () {
    tide = Number(inp.value) / 100;
    tideEls.forEach(function (el) { el.style.opacity = tide.toFixed(2); });
    surfEls.forEach(function (s) {
      s.el.style.transform = "translate(" + (s.shift[0] * (1 - tide)).toFixed(1) + "px," + (s.shift[1] * (1 - tide)).toFixed(1) + "px)";
      s.el.style.opacity = (0.6 + 0.4 * tide).toFixed(2);
    });
    var notes = data.tide.notes || [];
    var n = notes.filter(function (x) { return tide >= x.min; }).pop();
    tideNote.textContent = n ? n.text : "";
  };
  // Moving the slider while neither the marsh nor the beach is in view pans to the nearer one,
  // so the reader sees the water move.
  var looked = false;
  inp.addEventListener("input", function () {
    setTide();
    if (looked || !data.tide.watch) return;
    looked = true;
    var vw = view.clientWidth || 600, a0 = pan / k, a1 = (pan + vw) / k, mid = (a0 + a1) / 2;
    var seen = data.tide.watch.some(function (w) { return Math.min(a1, w[1]) - Math.max(a0, w[0]) >= 0.3 * (w[1] - w[0]); });
    if (seen) return;
    var best = data.tide.watch.slice().sort(function (a, b) { return Math.abs((a[0] + a[1]) / 2 - mid) - Math.abs((b[0] + b[1]) / 2 - mid); })[0];
    focusZone = null;
    panTarget = kit.clamp(((best[0] + best[1]) / 2) * k - vw / 2, 0, maxPan); kick();
  });
  inp.addEventListener("change", function () { looked = false; });
  setTide();
}

// ------------------------------------------------------------------ field guide
var card = kit.html("div", "hb-card", null, root);
card.setAttribute("aria-live", "polite");
var journalRow = null, chips = {};
var species = [];
actors.forEach(function (a) { if (a.id && species.indexOf(a.id) < 0) species.push(a.id); });
if (key && species.length > 1) {
  journalRow = kit.html("div", "journal", null, root);
  var head = kit.html("p", "journal-head", null, journalRow);
  var list = kit.html("div", "journal-list", null, journalRow);
  species.forEach(function (id) {
    var a = actors.filter(function (x) { return x.id === id; })[0];
    var chip = kit.html("button", "chip", a.name, list);
    chip.type = "button";
    chip.addEventListener("click", function () {
      var st = cast.filter(function (c) { return c.a.id === id; })[0];
      if (!st) return;
      if (st.a.tide === "high" && tide < 0.5 && data.tide) { inp.value = "85"; setTide(); }
      if (st.a.tide === "low" && tide > 0.6 && data.tide) { inp.value = "15"; setTide(); }
      panTarget = kit.clamp(st.x * k - view.clientWidth / 2, 0, maxPan); kick();
      pick(st, true);
    });
    chips[id] = chip;
  });
  var tally = function () {
    var n = species.filter(function (id) { return seen[id]; }).length;
    head.textContent = (data.journalTitle || "Field journal") + ": " + n + " of " + species.length + " spotted" + (n === species.length ? ". Every one found." : ". Tap an animal in the painting, or a name below.");
    species.forEach(function (id) { chips[id].setAttribute("aria-pressed", seen[id] ? "true" : "false"); });
  };
  tally();
}
function pick(st, quiet) {
  var a = st.a;
  while (card.firstChild) card.removeChild(card.firstChild);
  card.classList.add("on");
  kit.html("p", "card-kicker", a.where || "", card);
  var h = kit.html("h4", "card-name", a.name, card);
  if (a.latin) kit.html("em", "card-latin", " " + a.latin, h);
  kit.html("p", "card-text", a.fact || "", card);
  cast.forEach(function (c) { c.btn.classList.toggle("picked", c.a.id === a.id); });
  if (a.id && journalRow) { seen[a.id] = 1; kit.store.set(key, JSON.stringify(seen)); tally(); }
  if (!quiet) card.scrollIntoView({ block: "nearest", behavior: kit.reduceMotion ? "auto" : "smooth" });
}
function zoneCard(z) {
  while (card.firstChild) card.removeChild(card.firstChild);
  card.classList.add("on");
  kit.html("p", "card-kicker", "Habitat", card);
  kit.html("h4", "card-name", z.label, card);
  if (z.text) kit.html("p", "card-text", z.text, card);
  cast.forEach(function (c) { c.btn.classList.remove("picked"); });
}
if (data.intro) kit.html("p", "card-text intro", data.intro, card);

// ------------------------------------------------------------------ loop
var last = 0, alive = true;
function kick() { if (kit.reduceMotion && panTarget !== null) { pan = panTarget; panTarget = null; apply(); } }
layout();
if (data.view && data.view.start) { pan = maxPan * data.view.start; apply(); }
cast.forEach(function (st) { step(st, 0, 0); });
kit.onFrame(function (vh, now) {
  if (!root.isConnected || !root.getClientRects().length) { last = 0; return; }
  var r = view.getBoundingClientRect();
  if (r.bottom < -100 || r.top > vh + 100) { last = 0; return; }
  var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
  last = now;
  if (panTarget !== null) {
    pan += (panTarget - pan) * Math.min(1, dt * 6);
    if (Math.abs(panTarget - pan) < 0.5) { pan = panTarget; panTarget = null; }
    apply();
  }
  if (!alive || kit.reduceMotion) return;
  cast.forEach(function (st) { step(st, dt, now); });
});
return { layout: layout };
}

export default mountHabitat;
