#!/usr/bin/env python3
"""Paint the soft surround that continues a map past its edges.

The tour's island view fills the whole stage. Where a screen is wider than the painting, the map
stage shows this image around the painting: the painting's own edge colors, carried outward and
smoothed, with a faint watercolor mottle. The painting fades into it (see .ms-fade in tour.css),
so the sea runs on to the edge of the screen instead of stopping at white paper.

The image covers the map's box grown by EX map widths left and right and EY map heights above and
below, at 1/SCALE of the map's pixels. data.ts places it with the same numbers.

Needs Python 3 with numpy and Pillow:
    python3 scripts/map-surround.py
"""

import hashlib
import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SCALE = 8
EX = 1.0
EY = 0.75

# Map image, its width in map pixels, the border that is not painting (a vignette or torn
# paper) in map pixels, and the output file. A {hash} in the name becomes the first 10 hex digits
# of the file's SHA-256, like the other files in ossabaw-art/.
MAPS = [
    ("public/holiday/map-3500.webp", 1750, 100, "public/holiday/map-surround.webp"),
    ("public/ossabaw-art/map.d96b639d7a.webp", 1600, 56, "public/ossabaw-art/map--surround.{hash}.webp"),
]


def blur(a, radius):
    """Gaussian blur of a float image along its first two axes; edges repeat."""
    r = max(1, int(3 * radius))
    taps = np.exp(-np.arange(-r, r + 1) ** 2 / (2 * radius**2))
    taps /= taps.sum()
    for axis in (0, 1):
        if a.shape[axis] == 1:
            continue
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r, r)
        p = np.pad(a, pad, mode="edge")
        out = np.zeros_like(a)
        for i, t in enumerate(taps):
            out += t * np.take(p, np.arange(i, i + a.shape[axis]), axis=axis)
        a = out
    return a


def rim(colors, radius=2.5, wide=12, limit=18):
    """One edge's colors, from the band just inside it, with small features taken out: a run
    that differs from its wide neighborhood by more than `limit` (a compass arm, a wave mark,
    the tip of a sandbar) is filled in from either side, then the edge is smoothed."""
    c = colors.copy()
    keep = np.ones(len(c), bool)
    for _ in range(3):
        idx = np.flatnonzero(keep)
        base = np.stack([np.interp(np.arange(len(c)), idx, c[idx, ch]) for ch in range(3)], -1)
        base = blur(base[:, None, :], wide)[:, 0, :]
        keep = np.abs(colors - base).max(1) <= limit
    idx = np.flatnonzero(keep)
    c = np.stack([np.interp(np.arange(len(c)), idx, colors[idx, ch]) for ch in range(3)], -1)
    return blur(c[:, None, :], radius)[:, 0, :]


def smooth_rim(inner, band=4):
    """The inner picture with its outermost rows and columns replaced by its edge colors, so that
    edge padding carries them outward without stripes."""
    out = inner.copy()
    out[:, 0] = rim(inner[:, :band].mean(1))
    out[:, -1] = rim(inner[:, -band:].mean(1))
    out[0, :] = rim(inner[:band].mean(0))
    out[-1, :] = rim(inner[-band:].mean(0))
    for y, x in ((0, 0), (0, -1), (-1, 0), (-1, -1)):
        out[y, x] = (out[y, 1 if x == 0 else -2] + out[1 if y == 0 else -2, x]) / 2
    return out


def mottle(h, w, seed):
    """Soft blotches, about -1 to 1, like an uneven watercolor wash."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    for radius, weight in ((10, 0.6), (4, 0.3), (1.5, 0.1)):
        n = Image.fromarray((rng.standard_normal((h, w)) * 40 + 128).clip(0, 255).astype(np.uint8))
        b = np.asarray(n.filter(ImageFilter.GaussianBlur(radius)), np.float32) - 128
        out += weight * b / (b.std() + 1e-6)
    return out / 2.2


def build(src, map_w, border, dst, seed):
    img = Image.open(ROOT / src).convert("RGB")
    k = map_w / img.width
    small_w = round(map_w / SCALE)
    small_h = round(img.height * k / SCALE)
    small = np.asarray(img.resize((small_w, small_h), Image.LANCZOS), np.float32)
    # Wave marks and grass tufts blur away, so none of them streaks into the surround.
    small = np.asarray(Image.fromarray(small.astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32)

    b = round(border / SCALE)
    pad_x = round(small_w * EX)
    pad_y = round(small_h * EY)
    H = small_h + 2 * pad_y
    W = small_w + 2 * pad_x
    inner = smooth_rim(small[b:small_h - b, b:small_w - b])
    # Each edge's colors run straight out from it: sea stays sea and marsh stays marsh.
    filled = np.pad(inner, ((pad_y + b, pad_y + b), (pad_x + b, pad_x + b), (0, 0)), mode="edge")
    ys = slice(pad_y + b, pad_y + small_h - b)
    xs = slice(pad_x + b, pad_x + small_w - b)

    # Farther out, the runs blur together, and a soft mottle grows like an uneven wash.
    yy, xx = np.mgrid[0:H, 0:W]
    dx = np.maximum(0, np.maximum(xs.start - xx, xx - (xs.stop - 1)))
    dy = np.maximum(0, np.maximum(ys.start - yy, yy - (ys.stop - 1)))
    reach = np.clip(np.hypot(dx, dy) / 14, 0, 1)[..., None]
    filled = (1 - reach) * filled + reach * blur(filled, 7)
    filled *= 1 + 0.04 * reach * mottle(H, W, seed)[..., None]

    buf = io.BytesIO()
    Image.fromarray(filled.clip(0, 255).astype(np.uint8)).save(buf, "WEBP", quality=82, method=6)
    data = buf.getvalue()
    name = dst.format(hash=hashlib.sha256(data).hexdigest()[:10])
    if "{hash}" in dst:
        for old in (ROOT / dst).parent.glob(Path(dst).name.replace("{hash}", "*")):
            old.unlink()
    (ROOT / name).write_bytes(data)
    # The stage shows this color past the image, on screens wider than it reaches.
    east = filled[H // 4:3 * H // 4, -1].mean(0)
    print(f"{name}: {W} x {H}, east edge #{''.join(f'{round(v):02X}' for v in east)}")


if __name__ == "__main__":
    for i, (src, map_w, border, dst) in enumerate(MAPS):
        build(src, map_w, border, dst, seed=7 + i)
