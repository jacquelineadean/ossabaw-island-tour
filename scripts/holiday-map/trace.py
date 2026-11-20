"""Trace the holiday card's map into a drawing for the watercolor painter.

Reads the card's own map (the 3500 by 2500 painting the holiday card was made from), finds its
water, land, beach and forest, and writes holiday-map.svg: the same island drawn in the painted
map's manner, with ink outlines, grass ticks in the marsh, treetops in the forest, waves on the
sea, the Main Road dashed, Christmas trees, the houses at Torrey Landing, the boat, and the painted
map's compass rose. Place names are <text>, which the painter hands back as live labels.

The card's area keeps its pixels (1750 by 1250) at x offset OX; west of it the salt marsh runs on
for OX more pixels, with creeks that continue the card's own channels, so the map reaches behind
the departure panel. Also writes road.json: the Main Road in the new map's pixels, for the lights.

The card's map was public/holiday/map-3500.webp until the repaint; get it from git history:
    git show 607b049:public/holiday/map-3500.webp > /tmp/card-map.webp
    python3 scripts/holiday-map/trace.py /tmp/card-map.webp /tmp/holiday-map
Then paint the drawing with scripts/holiday-map/paint.py.
"""
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

SRC = sys.argv[1]
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else '.')
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1750, 1250  # the card's map
OX = 700  # marsh painted west of the card
W2 = W + OX
M = 40  # the card's vignette: rows and columns this close to its edge are made again
rng = np.random.default_rng(11)

big = cv2.imread(SRC)
im = cv2.resize(big, (W, H), interpolation=cv2.INTER_AREA)
lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB).astype(np.float32)
L, A, B = lab[..., 0] * 100 / 255, lab[..., 1] - 128, lab[..., 2] - 128


def disk(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def drop_small(mask, min_area):
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[lbl].astype(np.uint8)


def fill_unknown(mask, unknown):
    """Give each unknown pixel the value of the nearest known pixel."""
    d1 = cv2.distanceTransform(((mask == 0) | (unknown == 1)).astype(np.uint8), cv2.DIST_L2, 5)
    d0 = cv2.distanceTransform(((mask == 1) | (unknown == 1)).astype(np.uint8), cv2.DIST_L2, 5)
    out = mask.copy()
    u = unknown == 1
    out[u] = (d1[u] < d0[u]).astype(np.uint8)
    return out


def fix_margins(mask):
    """The card fades to white near its edges: carry the rows and columns just inside over them."""
    m = mask.copy()
    m[:M, :] = m[2 * M - 1:M - 1:-1, :]
    m[H - M:, :] = m[H - M - 1:H - 2 * M - 1:-1, :]
    m[:, W - M:] = m[:, W - M - 1:W - 2 * M - 1:-1]
    return m


def runs(line, val=0, min_len=3):
    out, s = [], None
    for i, v in enumerate(line):
        if v == val and s is None:
            s = i
        if v != val and s is not None:
            if i - s >= min_len:
                out.append((s, i - 1))
            s = None
    if s is not None and len(line) - s >= min_len:
        out.append((s, len(line) - 1))
    return out


# ------------------------------------------------------------------ the card: water and land
Bm = cv2.medianBlur(np.clip(B + 128, 0, 255).astype(np.uint8), 7).astype(np.float32) - 128
land = (Bm > 9).astype(np.uint8)
unknown = np.zeros_like(land)
for x0, y0, x1, y1 in [
    (552, 206, 780, 244),   # Torrey Landing
    (322, 318, 476, 356),   # North End
    (296, 500, 484, 542),   # Middle Place
    (248, 740, 414, 780),   # Goose Pond
    (420, 165, 575, 315),   # buildings and the Christmas tree at the landing
    (300, 860, 420, 960),   # the hogs and lights at the south end
    (300, 420, 480, 500),   # the donkeys
    (140, 400, 200, 460),   # an egret
    (225, 600, 270, 640),   # an egret
]:
    unknown[y0:y1, x0:x1] = 1
# The string of lights along the Main Road: its blue bulbs read as water.
ROAD = [(512, 252), (497, 268), (482, 286), (468, 304), (457, 322), (450, 341), (446, 361),
        (442, 383), (437, 406), (432, 429), (426, 452), (420, 476), (414, 500), (408, 524),
        (402, 548), (396, 572), (390, 596), (384, 621), (378, 647), (372, 673), (366, 698),
        (360, 722), (354, 746), (347, 770), (340, 795), (337, 820), (342, 846), (351, 870),
        (354, 893), (345, 916), (332, 938), (318, 956)]
cv2.polylines(unknown, [np.array(ROAD, np.int32)], False, 1, 30)
land = cv2.morphologyEx(land, cv2.MORPH_OPEN, disk(2))
land = cv2.morphologyEx(land, cv2.MORPH_CLOSE, disk(2))
land = fill_unknown(land, unknown)
# Filled boxes keep straight edges; round them off.
soft = (cv2.GaussianBlur(land.astype(np.float32), (0, 0), 6) > 0.5).astype(np.uint8)
near = cv2.dilate(unknown, disk(10)) == 1
land[near] = soft[near]
land[850:1085, 1490:1710] = 0  # the card's own compass rose and scale bar: open sea
land[1130:1190, 1490:1625] = 0
land = fix_margins(land)
land = drop_small(land, 150)
land = 1 - drop_small(1 - land, 70)
land = (cv2.GaussianBlur(land.astype(np.float32), (0, 0), 1.6) > 0.5).astype(np.uint8)

# ------------------------------------------------------------------ the card: forest
canopy = ((L < 66) & (A < -14) & (B > 10)).astype(np.uint8) & land
canopy = cv2.morphologyEx(canopy, cv2.MORPH_OPEN, disk(2))
forest = cv2.morphologyEx(canopy, cv2.MORPH_CLOSE, disk(13))
forest = fix_margins(forest)
forest = drop_small(forest, 500)
forest = 1 - drop_small(1 - forest, 1400)
forest = cv2.morphologyEx(forest, cv2.MORPH_OPEN, disk(4))
forest = cv2.GaussianBlur(forest.astype(np.float32), (0, 0), 3.0) > 0.5
forest = (forest & (cv2.erode(land, disk(3)) > 0)).astype(np.uint8)

# ------------------------------------------------------------------ the card: beach
coast_zone = np.zeros_like(land)
cv2.fillPoly(coast_zone, [np.array([[790, 300], [880, 330], [860, 420], [640, 700], [430, 920],
                                    [300, 1040], [230, 1010], [380, 860], [600, 640], [760, 400]], np.int32)], 1)
water_d = cv2.distanceTransform(land, cv2.DIST_L2, 5)
beach = ((water_d > 0) & (water_d <= 8.5) & (coast_zone == 1)).astype(np.uint8)
beach = cv2.morphologyEx(beach, cv2.MORPH_OPEN, disk(1))
beach = cv2.GaussianBlur(beach.astype(np.float32), (0, 0), 1.2) > 0.5
beach = (beach & (forest == 0)).astype(np.uint8)

# ------------------------------------------------------------------ the marsh west of the card
SEAM = OX + M  # the extension is x < SEAM; the card's own pixels start there
ext = np.ones((H, SEAM), np.uint8)
water = np.zeros((H, SEAM), np.uint8)
edge_runs = runs(land[:, M])
sound = [r for r in edge_runs if r[1] >= H - 2]
creek_runs = [r for r in edge_runs if r[1] < H - 2 and r[0] > 2]

# St. Catherines Sound runs on west, narrowing a little, its north shore wandering.
shore = np.full(SEAM + 1, float(H + 10))
if sound:
    y0 = sound[0][0]
    n = SEAM + 1
    walk = np.cumsum(rng.normal(0, 1, n)[::-1])[::-1]  # 0 at the seam side after the shift below
    walk = cv2.GaussianBlur(walk.reshape(1, -1).astype(np.float32), (0, 0), 28).ravel()
    walk = walk - walk[-1]
    walk *= 34 / max(1e-6, np.abs(walk).max())
    xs = np.arange(n)
    trend = (SEAM - xs) / SEAM * 75
    shore = y0 + trend + walk
    for x in range(SEAM):
        water[int(max(0, shore[x])):, x] = 1


def angdiff(a, b):
    return (a - b + math.pi) % (2 * math.pi) - math.pi


creeks = []  # each a list of (x, y, width)
stack = []
for a, b in creek_runs:
    stack.append((SEAM + 1.0, (a + b) / 2, math.pi, min(110.0, b - a + 1.0), 0, math.pi))
# Creeks running north out of the sound's shore.
for x in (95, 260, 430, 610):
    xx = x + rng.uniform(-30, 30)
    stack.append((xx, shore[int(xx)] + 6, -math.pi / 2 + rng.uniform(-0.35, 0.35), rng.uniform(9, 16), 0,
                  -math.pi / 2))
# Creeks that come in from the west edge and die out in the marsh.
for y in (170, 520, 800):
    yy = y + rng.uniform(-50, 50)
    stack.append((-20.0, yy, rng.uniform(-0.3, 0.3), rng.uniform(10, 18), 1, 0.0))

while stack:
    x, y, h, w, depth, main = stack.pop()
    pts = []
    dh = 0.0
    since, nxt = 0.0, rng.uniform(60, 150)
    decay = 0.997 if depth == 0 else (0.991 if depth == 1 else 0.985)
    for _ in range(1600):
        pts.append((x, y, w))
        dh = 0.94 * dh + rng.normal(0, 0.02)
        h += dh + (0.018 if depth == 0 else 0.008) * angdiff(main, h)
        x += 2 * math.cos(h)
        y += 2 * math.sin(h)
        w *= decay
        since += 2
        if w > 3.2 and since > nxt and depth < 2:
            side = 1 if rng.random() < 0.5 else -1
            bh = h + side * rng.uniform(0.6, 1.15)
            stack.append((x, y, bh, w * rng.uniform(0.35, 0.6), depth + 1, bh))
            since, nxt = 0.0, rng.uniform(90, 210)
        if w < 0.9 or x < -40 or y < -40 or y > H + 40 or x > SEAM + 1.5:
            break
        if 0 <= int(x) < SEAM and 0 <= int(y) < H and water[int(y), int(x)] and len(pts) > 30:
            break  # it has run into the sound or another creek
    creeks.append(pts)
    for px, py, pw in pts:
        if pw >= 4.0:
            cv2.circle(water, (int(round(px)), int(round(py))), int(round(pw / 2)), 1, -1, lineType=cv2.LINE_AA)

ext[water == 1] = 0
ext = (cv2.GaussianBlur(ext.astype(np.float32), (0, 0), 1.4) > 0.5).astype(np.uint8)

# Thin creeks are drawn as lines, as on the original painted map.
thin = []  # (width bucket, polyline)
for pts in creeks:
    run, bucket = [], None
    for px, py, pw in pts:
        if pw >= 4.0:
            if len(run) > 1:
                thin.append((bucket, run))
            run, bucket = [], None
            continue
        bk = 3.0 if pw >= 3 else (2.2 if pw >= 2 else (1.5 if pw >= 1.4 else 1.0))
        if bucket is not None and bk != bucket:
            run.append((px, py))
            if len(run) > 1:
                thin.append((bucket, run))
            run = [(px, py)]
        else:
            run.append((px, py))
        bucket = bk
    if len(run) > 1:
        thin.append((bucket, run))

# Hammocks: small islands of trees in the marsh, as the original map has.
hammocks = np.zeros((H, SEAM), np.uint8)
dist = cv2.distanceTransform(ext, cv2.DIST_L2, 5)
placed = []
for _ in range(400):
    if len(placed) >= 4:
        break
    x = rng.uniform(60, SEAM - 120)
    y = rng.uniform(120, 900)
    r = rng.uniform(26, 46)
    if dist[int(y), int(x)] < r + 22 or any(math.hypot(x - a, y - b) < 230 for a, b in placed):
        continue
    placed.append((x, y))
    t = np.linspace(0, 2 * math.pi, 40, endpoint=False)
    k = 1 + 0.12 * np.sin(3 * t + rng.uniform(0, 6)) + 0.08 * np.sin(5 * t + rng.uniform(0, 6))
    poly = np.stack([x + r * 1.25 * k * np.cos(t), y + r * k * np.sin(t)], -1).astype(np.int32)
    cv2.fillPoly(hammocks, [poly], 1)

# ------------------------------------------------------------------ the whole map
LAND = np.zeros((H, W2), np.uint8)
LAND[:, OX:] = land
LAND[:, :SEAM] = ext
FOREST = np.zeros((H, W2), np.uint8)
FOREST[:, OX:] = forest
FOREST[:, :SEAM] = hammocks & ext
FOREST[:, OX:SEAM] |= forest[:, :M]
FOREST &= LAND
BEACH = np.zeros((H, W2), np.uint8)
BEACH[:, OX:] = beach

land_d = cv2.distanceTransform(1 - LAND, cv2.DIST_L2, 5)
xs = np.arange(W2)[None, :]
# Deep water lies off the Atlantic shore; the sounds and the rivers stay pale.
eff = land_d - np.clip(OX + 520 - xs, 0, None) * 0.35
deep = (eff > 60).astype(np.uint8)
deep = (cv2.GaussianBlur(deep.astype(np.float32), (0, 0), 16) > 0.5).astype(np.uint8)
deep = drop_small(deep, 4000)



# ------------------------------------------------------------------ outlines to paths
def chaikin(pts, n=2):
    for _ in range(n):
        q = 0.75 * pts + 0.25 * np.roll(pts, -1, 0)
        r = 0.25 * pts + 0.75 * np.roll(pts, -1, 0)
        pts = np.empty((len(pts) * 2, 2))
        pts[0::2], pts[1::2] = q, r
    return pts


def rings(mask, min_area=40, eps=0.9, pad_edges=True):
    """Outer rings and their holes, smoothed, as lists of points."""
    m = mask.copy()
    if pad_edges:
        m = cv2.copyMakeBorder(m, 12, 12, 12, 12, cv2.BORDER_REPLICATE)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None:
        return out
    hier = hier[0]
    for i, c in enumerate(cs):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_area:
            continue
        group = [c]
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) >= min_area:
                group.append(cs[j])
            j = hier[j][0]
        ring_pts = []
        for g in group:
            a = cv2.approxPolyDP(g, eps, True)[:, 0, :].astype(np.float64)
            if len(a) < 3:
                continue
            a = chaikin(a, 2)
            if pad_edges:
                a -= 12
            ring_pts.append(a)
        if ring_pts:
            out.append(ring_pts)
    return out


def d_of(group):
    return ' '.join('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in ring) + ' Z' for ring in group)


def open_d(polylines):
    return ' '.join('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pl) for pl in polylines)


# ------------------------------------------------------------------ texture marks
def scatter(mask, step, jitter, margin):
    inner = cv2.erode(mask, disk(margin)) if margin else mask
    hh, ww = mask.shape
    pts = []
    for y in range(step // 2, hh, step):
        for x in range(step // 2 + (step // 2 if (y // step) % 2 else 0), ww, step):
            px = x + rng.uniform(-jitter, jitter)
            py = y + rng.uniform(-jitter, jitter)
            ix, iy = int(px), int(py)
            if 0 <= ix < ww and 0 <= iy < hh and inner[iy, ix]:
                pts.append((px, py))
    return pts


marsh = (LAND & (FOREST == 0) & (BEACH == 0)).astype(np.uint8)
ticks = []
for x, y in scatter(marsh, 17, 6, 4):
    s = rng.uniform(2.6, 3.8)
    lean = rng.uniform(-0.5, 0.5)
    ticks.append([(x - s * 0.7 + lean, y - s), (x, y)])
    ticks.append([(x, y), (x + s * 0.7 + lean, y - s * 1.05)])
scallops = []
for x, y in scatter(FOREST, 15, 5, 5):
    r = rng.uniform(3.4, 5.0)
    bumps = int(rng.integers(2, 4))
    pts = []
    x0 = x - r * bumps
    for k in range(bumps):
        cx = x0 + r + 2 * r * k
        for t in np.linspace(math.pi, 2 * math.pi, 7):
            pts.append((cx + r * math.cos(t), y + r * 0.85 * math.sin(t)))
    scallops.append(pts)

# Waves on open water, kept off the lettering, the compass and the shore.
sea_ok = cv2.erode((1 - LAND).astype(np.uint8), disk(26))
for x0, y0, x1, y1 in [(720, 100, 1000, 162), (690, 960, 1030, 1030), (990, 830, 1230, 1180),
                       (1130, 122, 1340, 166), (-150, 1010, 190, 1060), (20, 560, 140, 760),
                       (680, 205, 900, 255)]:
    sea_ok[y0:y1, max(0, x0 + OX):x1 + OX] = 0
waves = []
for x, y in scatter(sea_ok, 74, 26, 0):
    s = rng.uniform(5.5, 8)
    waves.append([(x + s * t, y + 1.8 * math.sin(t * math.pi * 2)) for t in np.linspace(-1, 1, 11)])

# ------------------------------------------------------------------ the Main Road (card pixels)

def smooth_open(pts, n=3):
    p = np.asarray(pts, float)
    for _ in range(n):
        q = 0.75 * p[:-1] + 0.25 * p[1:]
        r = 0.25 * p[:-1] + 0.75 * p[1:]
        mid = np.empty((len(q) * 2, 2))
        mid[0::2], mid[1::2] = q, r
        p = np.vstack([p[:1], mid, p[-1:]])
    return p


road = smooth_open(ROAD)
seg = np.hypot(*np.diff(road, axis=0).T)
cum = np.concatenate([[0], np.cumsum(seg)])


def along(s):
    i = max(0, min(np.searchsorted(cum, s) - 1, len(seg) - 1))
    f = (s - cum[i]) / max(seg[i], 1e-6)
    return road[i] + f * (road[i + 1] - road[i])


dashes = []
s = 0.0
while s < cum[-1] - 4:
    a, b = s, min(s + 9.0, cum[-1])
    dashes.append([tuple(along(t)) for t in np.linspace(a, b, 4)])
    s += 15.0

# ------------------------------------------------------------------ the drawing
land_groups = rings(LAND, 60)
forest_groups = rings(FOREST, 300, eps=1.2)
beach_groups = rings(BEACH, 40, eps=0.8, pad_edges=False)
deep_groups = rings(deep, 4000, eps=2.0)


def house(x, y, w, h, wall, roof, roof_h=None, door=None, windows=0):
    roof_h = roof_h or h * 0.55
    parts = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{wall}" data-shade="0.3"/>',
        f'<path d="M{x - 2.5} {y} L{x + w / 2} {y - roof_h} L{x + w + 2.5} {y} Z" fill="{roof}" data-shade="0.3"/>',
    ]
    for k in range(windows):
        wx = x + w * (k + 1) / (windows + 1) - 2
        parts.append(f'<rect x="{wx:.1f}" y="{y + h * 0.28:.1f}" width="4" height="4.5" fill="#3d4a55" stroke="none"/>')
    if door:
        parts.append(f'<rect x="{x + w * door - 2.5:.1f}" y="{y + h - 8}" width="5" height="8" fill="#3e6b45" stroke="none"/>')
    return '\n'.join(parts)


def xmas_tree(x, y, s=1.0):
    t = [f'<rect x="{x - 2.2 * s:.1f}" y="{y - 5 * s:.1f}" width="{4.4 * s:.1f}" height="{6 * s:.1f}" fill="burnt-umber"/>']
    for wd, top, bot in [(17, 30, 4), (13, 42, 18), (9, 52, 31)]:
        t.append(f'<path d="M{x - wd * s:.1f} {y - bot * s:.1f} L{x:.1f} {y - top * s - 4 * s:.1f} '
                 f'L{x + wd * s:.1f} {y - bot * s:.1f} Z" fill="hookers-green" data-shade="0.35"/>')
    for ox, oy, col in [(-6, 10, 'vermilion'), (5, 16, 'gamboge'), (-3, 24, 'cerulean'), (4, 33, 'vermilion'), (-2, 40, 'gamboge')]:
        t.append(f'<circle cx="{x + ox * s:.1f}" cy="{y - oy * s:.1f}" r="{1.9 * s:.1f}" fill="{col}" stroke="none" data-loose="0"/>')
    sx, sy = x, y - 60 * s
    star = ' L'.join(f'{sx + (6 if i % 2 == 0 else 2.6) * s * math.sin(i * math.pi / 5):.1f} '
                     f'{sy - (6 if i % 2 == 0 else 2.6) * s * math.cos(i * math.pi / 5):.1f}' for i in range(10))
    t.append(f'<path d="M{star} Z" fill="gamboge" stroke="#7a5a1e" stroke-width="0.8" data-loose="0"/>')
    return '\n'.join(t)


def compass(cx, cy, r):
    """The original map's compass rose: four long points, red on one side and cream on the
    other, a thin ring, and four short points between them."""
    out = [f'<circle cx="{cx}" cy="{cy}" r="{r * 0.56:.1f}" fill="none" stroke="#2b231d" stroke-width="1.2"/>']
    for k in range(4):
        a = math.radians(45 + 90 * k)
        tip = (cx + math.sin(a) * r * 0.5, cy - math.cos(a) * r * 0.5)
        left = (cx + math.sin(a - math.pi / 2) * r * 0.08, cy - math.cos(a - math.pi / 2) * r * 0.08)
        right = (cx + math.sin(a + math.pi / 2) * r * 0.08, cy - math.cos(a + math.pi / 2) * r * 0.08)
        out.append(f'<path d="M{cx} {cy} L{left[0]:.1f} {left[1]:.1f} L{tip[0]:.1f} {tip[1]:.1f} L{right[0]:.1f} {right[1]:.1f} Z" '
                   f'fill="#cdbfa3" stroke="#2b231d" stroke-width="0.9" data-shade="0"/>')
    for k in range(4):
        a = math.radians(90 * k)
        tip = (cx + math.sin(a) * r, cy - math.cos(a) * r)
        side_l = (cx + math.sin(a - math.pi / 2) * r * 0.16, cy - math.cos(a - math.pi / 2) * r * 0.16)
        side_r = (cx + math.sin(a + math.pi / 2) * r * 0.16, cy - math.cos(a + math.pi / 2) * r * 0.16)
        out.append(f'<path d="M{cx} {cy} L{side_l[0]:.1f} {side_l[1]:.1f} L{tip[0]:.1f} {tip[1]:.1f} Z" '
                   f'fill="#b9473a" stroke="#2b231d" stroke-width="1.1" data-shade="0" data-loose="0.4"/>')
        out.append(f'<path d="M{cx} {cy} L{side_r[0]:.1f} {side_r[1]:.1f} L{tip[0]:.1f} {tip[1]:.1f} Z" '
                   f'fill="#f4e7cc" stroke="#2b231d" stroke-width="1.1" data-shade="0" data-loose="0.4"/>')
    return '\n'.join(out)


SEA = '#9fbfca'
DEEP = '#5d93b5'
MARSH = '#d6cd93'
FOREST_C = '#7f9f55'
CREEK = '#5f8fa6'

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W2} {H}" width="{W2}" height="{H}">']
svg.append(f'<rect x="-30" y="-30" width="{W2 + 60}" height="{H + 60}" fill="{SEA}" data-paint="wet" data-wet="0.45" data-shade="0"/>')
for g in deep_groups:
    svg.append(f'<path d="{d_of(g)}" fill="{DEEP}" fill-opacity="0.5" data-paint="glaze" data-wet="0.8" data-edge="0.05" data-shade="0"/>')
svg.append(f'<path d="{open_d(waves)}" fill="none" stroke="#3d6f8c" stroke-width="1.1" stroke-opacity="0.55" data-overshoot="0"/>')
for g in land_groups:
    svg.append(f'<path d="{d_of(g)}" fill="{MARSH}" stroke="#3a3428" stroke-width="1.3" stroke-opacity="0.85" data-shade="0"/>')
for g in beach_groups:
    svg.append(f'<path d="{d_of(g)}" fill="#f3e6bd" stroke="none" data-shade="0" data-loose="0.3"/>')
for bucket in (3.0, 2.2, 1.5, 1.0):
    lines = [pl for bk, pl in thin if bk == bucket]
    if lines:
        svg.append(f'<path d="{open_d(lines)}" fill="none" stroke="{CREEK}" stroke-width="{bucket}" stroke-opacity="0.9" data-overshoot="0"/>')
svg.append(f'<path d="{open_d(ticks)}" fill="none" stroke="#77744a" stroke-width="0.9" stroke-opacity="0.5" data-overshoot="0"/>')
for g in forest_groups:
    svg.append(f'<path d="{d_of(g)}" fill="{FOREST_C}" stroke="#3d5230" stroke-width="1.0" stroke-opacity="0.7" data-shade="0.12"/>')
svg.append(f'<path d="{open_d(scallops)}" fill="none" stroke="#3f5a33" stroke-width="0.95" stroke-opacity="0.62" data-overshoot="0"/>')

# Everything below is placed in the card's own pixels.
svg.append(f'<g transform="translate({OX} 0)">')
svg.append(f'<path d="{open_d(dashes)}" fill="none" stroke="#5a3d28" stroke-width="2.0" data-overshoot="0"/>')
svg.append('<path d="M560 214 L600 207" fill="none" stroke="#5a3d28" stroke-width="3"/>')
svg.append(xmas_tree(441, 232, 1.0))
svg.append(house(467, 222, 42, 22, '#f4efe2', '#7d8a96', 12, windows=3))
svg.append(house(512, 250, 34, 22, '#e2a69b', '#b04a3c', 11, windows=2, door=0.75))
svg.append(house(546, 241, 19, 31, '#e2a69b', '#b04a3c', 9, windows=1))
for cx, cy in [(456, 287), (483, 298), (510, 309)]:
    svg.append(house(cx, cy - 12, 22, 13, '#b8ada0', '#5d5852', 8, windows=1))
svg.append(xmas_tree(632, 180, 0.8))
svg.append('<path d="M586 196 L664 196 L652 214 L598 214 Z" fill="#f2ede0" stroke="#2b231d" stroke-width="1.4" data-shade="0.3"/>')
svg.append('<path d="M610 196 L612 182 L640 182 L642 196 Z" fill="#e9e1cf" stroke="#2b231d" stroke-width="1.1"/>')
svg.append(xmas_tree(625, 182, 0.55))
svg.append('<path d="M664 205 C690 199 712 210 738 203" fill="none" stroke="#fbfaf6" stroke-width="2.4" data-line="lift"/>')
# The compass sits at the bottom right of the island view, beside the last stop, as on the painted
# map; the card had it in its own corner, off the edge of that view.
svg.append(compass(1100, 975, 92))
svg.append('<path d="M1012 1151 L1108 1151 M1012 1145 L1012 1157 M1060 1147 L1060 1155 M1108 1145 L1108 1157" '
           'fill="none" stroke="#2b231d" stroke-width="1.4" data-overshoot="0"/>')

# Live labels, set in the original map's fonts by the page.
WATER, LAND_INK = '#2f5d73', '#2b231d'
LABELS = [
    ('Ossabaw Sound', 860, 148, 34, 'middle', -4, 'hand', WATER),
    ('Wassaw Island', 1226, 152, 26, 'middle', 0, 'hand', '#33452f'),
    ('Atlantic Ocean', 860, 1012, 44, 'middle', -3, 'hand', WATER),
    ('St. Catherines Sound', 20, 1050, 30, 'middle', -2, 'hand', WATER),
    ('Bear River', 92, 652, 28, 'middle', -78, 'hand', WATER),
    ('Torrey Landing', 706, 240, 19, 'start', 0, 'label', LAND_INK),
    ('North End', 410, 352, 17, 'middle', 0, 'label', LAND_INK),
    ('Middle Place', 306, 529, 17, 'start', 0, 'label', LAND_INK),
    ('Goose Pond', 257, 768, 17, 'start', 0, 'label', '#2b3a5a'),
    ('South End', 298, 1000, 19, 'start', 0, 'label', LAND_INK),
    ('N', 1100, 869, 30, 'middle', 0, 'display', LAND_INK),
    ('0', 1012, 1139, 13, 'middle', 0, 'label', LAND_INK),
    ('1 mile', 1108, 1139, 13, 'middle', 0, 'label', LAND_INK),
]
for text, x, y, size, anchor, angle, kind, color in LABELS:
    rot = f' transform="rotate({angle} {x} {y})"' if angle else ''
    svg.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" data-label="{kind}" fill="{color}"{rot}>{text}</text>')
svg.append('</g>')
svg.append('</svg>')
(OUT / 'holiday-map.svg').write_text('\n'.join(svg))

json.dump({'ox': OX, 'road': [[round(x + OX, 1), round(y, 1)] for x, y in road.tolist()]}, open(OUT / 'road.json', 'w'))
vis = np.full((H, W2, 3), (210, 190, 160), np.uint8)
vis[LAND == 1] = (140, 200, 215)
vis[BEACH == 1] = (190, 230, 240)
vis[FOREST == 1] = (90, 150, 90)
vis[deep == 1] = (180, 140, 90)
for bk, pl in thin:
    cv2.polylines(vis, [np.round(np.array(pl)).astype(np.int32)], False, (150, 120, 60), max(1, int(bk)))
cv2.polylines(vis, [np.round(road + [OX, 0]).astype(np.int32)], False, (40, 40, 160), 2)
cv2.line(vis, (SEAM, 0), (SEAM, H), (0, 0, 255), 1)
cv2.imwrite(str(OUT / 'trace.png'), vis)  # the masks, to check the tracing
print('land groups', len(land_groups), 'forest', len(forest_groups), 'beach', len(beach_groups),
      'ticks', len(ticks) // 2, 'scallops', len(scallops), 'waves', len(waves), 'dashes', len(dashes),
      'creeks', len(creeks), 'thin', len(thin), 'edge runs', edge_runs)
