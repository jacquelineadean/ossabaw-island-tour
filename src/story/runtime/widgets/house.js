// The "house" widget.
// Ported from the published Ossabaw page. The code builds its own DOM inside the root it is given.
export function mountHouse(root, data, kit) {
// A walk through the Torrey West House: each room is a painting with numbered details and
// doorways. Choosing a doorway zooms toward it and the next room develops in its place.
var rooms = data.rooms || [];
var byId = {};
rooms.forEach(function (r) { byId[r.id] = r; });
var tabs = kit.html("div", "rooms", null, root);
if (rooms.length < 2) tabs.hidden = true;
tabs.setAttribute("role", "tablist");
var stage = kit.html("div", "house-stage", null, root);
var frame = kit.html("div", "house-frame", null, stage);
var cap = kit.html("div", "cap", null, root);
cap.setAttribute("aria-live", "polite");
var current = null, busy = false, layers = [];
var tabBtns = rooms.map(function (r) {
  var b = kit.html("button", "tab", r.short || r.title, tabs);
  b.type = "button";
  b.setAttribute("role", "tab");
  b.addEventListener("click", function () { go(r.id, null); });
  return b;
});

function pct(v, total) { return (100 * v / total).toFixed(2) + "%"; }

function build(r) {
  var sheet = kit.html("div", "sheet", null, null);
  sheet.style.aspectRatio = r.w + " / " + r.h;
  var img = kit.html("img", "room-img", null, sheet);
  img.src = r.img; img.alt = r.alt || r.title; img.draggable = false;
  layers = (r.layers || []).map(function (L) {
    var el = kit.html("img", "room-layer" + (L.blend === "normal" ? "" : " mult"), null, sheet);
    el.src = L.src; el.alt = ""; el.setAttribute("aria-hidden", "true");
    el.style.left = pct(L.box[0], r.w); el.style.top = pct(L.box[1], r.h);
    el.style.width = pct(L.box[2], r.w); el.style.height = pct(L.box[3], r.h);
    return { el: el, phase: Math.random() * 6 };
  });
  if (r.labels && r.labels.length) {
    var ov = kit.svg("svg", { viewBox: "0 0 " + r.w + " " + r.h, "class": "room-labels", "aria-hidden": "true", preserveAspectRatio: "none" }, sheet);
    r.labels.forEach(function (lb) {
      var t = kit.text(ov, lb.x, lb.y, lb.text, { "class": "rl rl-" + (lb.style || "hand"), "font-size": lb.size || 26, "text-anchor": lb.anchor || "start" });
      if (lb.color) t.setAttribute("fill", lb.color);
      if (lb.angle) t.setAttribute("transform", "rotate(" + lb.angle + " " + lb.x + " " + lb.y + ")");
    });
  }
  (r.spots || []).forEach(function (s, i) {
    var b = kit.html("button", "dot", String(i + 1), sheet);
    b.type = "button";
    b.style.left = pct(s.x, r.w); b.style.top = pct(s.y, r.h);
    b.setAttribute("aria-label", s.title);
    b.addEventListener("click", function () { show(r, s, b); });
  });
  (r.exits || []).forEach(function (e) {
    var b = kit.html("button", "exit", null, sheet);
    b.type = "button";
    b.style.left = pct(e.x, r.w); b.style.top = pct(e.y, r.h);
    if (e.x / r.w > 0.8) b.classList.add("edge-r");
    if (e.x / r.w < 0.2) b.classList.add("edge-l");
    kit.html("span", "exit-arrow", e.arrow || "→", b);
    kit.html("span", "exit-label", e.label, b);
    b.addEventListener("click", function () { go(e.to, [e.x / r.w, e.y / r.h]); });
  });
  return sheet;
}

function describe(r) {
  while (cap.firstChild) cap.removeChild(cap.firstChild);
  kit.html("p", "cap-kicker", r.kicker || "", cap);
  kit.html("h4", "cap-title", r.title, cap);
  kit.html("p", "cap-text", r.text || "", cap);
  if (r.spots && r.spots.length) kit.html("p", "cap-hint", (r.exits && r.exits.length) ? "Tap a numbered dot for a closer look, or a doorway to move on." : "Tap a numbered dot for a closer look.", cap);
}

function show(r, s, btn) {
  Array.prototype.forEach.call(frame.querySelectorAll(".dot"), function (d) { d.classList.toggle("on", d === btn); });
  while (cap.firstChild) cap.removeChild(cap.firstChild);
  kit.html("p", "cap-kicker", r.title, cap);
  kit.html("h4", "cap-title", s.title, cap);
  kit.html("p", "cap-text", s.text || "", cap);
  var back = kit.html("button", "cap-back", "Back to the room", cap);
  back.type = "button";
  back.addEventListener("click", function () { btn.classList.remove("on"); describe(r); });
}

function go(id, at) {
  var r = byId[id];
  if (!r || busy || (current && current.id === id)) return;
  var old = frame.firstChild;
  var next = build(r);
  var fast = kit.reduceMotion || !old;
  tabBtns.forEach(function (b, i) { b.setAttribute("aria-selected", rooms[i].id === id ? "true" : "false"); });
  current = r;
  describe(r);
  var phone = (frame.clientWidth || 600) < 640;
  next.style.width = phone ? "175%" : "100%";
  next.setAttribute("data-focus", String(r.focus || 0.5));
  if (fast) {
    if (old) frame.removeChild(old);
    frame.appendChild(next);
    if (phone) frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) * (r.focus || 0.5);
    return;
  }
  busy = true;
  if (at) old.style.transformOrigin = (at[0] * 100).toFixed(1) + "% " + (at[1] * 100).toFixed(1) + "%";
  old.classList.add("leave");
  next.classList.add("enter");
  frame.appendChild(next);
  setTimeout(function () { next.classList.remove("enter"); }, 30);
  if (phone) setTimeout(function () { frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) * (r.focus || 0.5); }, 40);
  setTimeout(function () {
    if (old.parentNode) frame.removeChild(old);
    busy = false;
  }, 900);
}

kit.onFrame(function (vh, now) {
  if (kit.reduceMotion || !root.isConnected || !root.getClientRects().length) return;
  var rect = stage.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > vh) return;
  layers.forEach(function (L) {
    var t = now / 1000 + L.phase;
    L.el.style.transform = "translate(" + (Math.sin(t / 3.2) * 18).toFixed(1) + "px," + (Math.cos(t / 2.1) * 4).toFixed(1) + "px)";
  });
});
function fit() {
  var phone = (frame.clientWidth || 600) < 640;
  Array.prototype.forEach.call(frame.children, function (sh) {
    sh.style.width = phone ? "175%" : "100%";
    if (phone) frame.scrollLeft = (frame.scrollWidth - frame.clientWidth) * Number(sh.getAttribute("data-focus") || 0.5);
  });
}
window.addEventListener("resize", function () { if (root.getClientRects().length) fit(); });
go(rooms.length ? rooms[0].id : "", null);
return { go: go, layout: fit };
}

export default mountHouse;
