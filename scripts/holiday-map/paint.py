#!/usr/bin/env python3
"""Paint the holiday map and its animals with the chronicle watercolor painter.

The painter is the chronicle plugin's (chronicle.core.watercolor), the one that painted the tour's
own map; put its src folder on PYTHONPATH. Needs numpy, opencv-python and Pillow.

    PYTHONPATH=<chronicle>/src python3 scripts/holiday-map/paint.py map <dir>/holiday-map.svg
        paints the drawing from trace.py at twice its size and writes public/holiday/map-4900.webp
        and map-2450.webp; prints the place names for cardMap.labels in src/tour/tour.json.
    PYTHONPATH=<chronicle>/src python3 scripts/holiday-map/paint.py animals
        paints scripts/holiday-map/animals.svg (a right whale and two Santa hats) and writes each
        part to public/holiday/animals/map-*.webp; prints each part's box for cardMap.cast.

After a new map, run scripts/map-surround.py for its surround.
"""

import io
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import chronicle.core.watercolor.canvas as cvs
from chronicle.core.watercolor.svg.paint import paint_scene

ROOT = Path(__file__).resolve().parents[2]
# The painter's seeds for the committed art: they set every bloom, wobble and grain.
MAP_SEED = 7
ANIMAL_SEED = 5


def ink(self, points, *, width=1.4, pigment="ink", opacity=0.85, jitter=0.7, taper=0.18,
        breaks=0.0, closed=False, lift=False):
    """The painter's pen, with its dots laid 1.2 output pixels apart at any scale.

    The painter spaces them 1.2 drawing pixels apart, so at scale 2 a thin line shows as dots. The
    noise that wavers and swells the line is stretched to match, so a line at scale 2 is the scale 1
    line twice as large.
    """
    pts = cvs.as_points(points) * self.scale
    if closed:
        pts = np.vstack([pts, pts[:1]])
    k = self.scale
    pts = cvs.resample(pts, 1.2, closed=False)
    if jitter > 0:
        pts = cvs.wobble(pts, jitter * self.scale, 40.0 * k, self.rng, closed=False)
        pts = cvs.wobble(pts, jitter * 0.3 * self.scale, 6.0 * k, self.rng, closed=False)
    n = len(pts)
    swell = 0.78 + 0.22 * cvs.noise1d(n, 30.0 * k, self.rng)
    t = np.linspace(0.0, 1.0, n)
    if taper > 0:
        envelope = np.minimum(1.0, np.minimum(t, 1.0 - t) / taper)
        swell *= 0.35 + 0.65 * np.sqrt(np.clip(envelope, 0.0, 1.0))
    keep = np.ones(n, dtype=bool)
    if breaks > 0:
        keep = cvs.noise1d(n, 25.0 * k, self.rng) > (breaks * 2.0 - 1.0)
    radii = np.maximum(width * self.scale * swell * 0.5, 0.35)
    box = self._box([pts], float(radii.max()) + 3.0)
    if box is None:
        return
    factor = 3
    layer = np.zeros((box.height * factor, box.width * factor), dtype=np.uint8)
    for (x, y), r, on in zip(pts, radii, keep, strict=True):
        if on:
            center = (int(round((x - box.x0) * factor * 16)), int(round((y - box.y0) * factor * 16)))
            cv2.circle(layer, center, max(int(r * factor * 16), 8), 255, -1, cv2.LINE_AA, 4)
    stroke = cv2.resize(layer, (box.width, box.height), interpolation=cv2.INTER_AREA)
    tooth = self.paper.height[box.y0:box.y1, box.x0:box.x1]
    density = np.clip(stroke.astype(np.float32) / 255.0 * opacity * (0.8 + 0.35 * tooth), 0.0, 1.0)
    if lift:
        region = self.rgb[box.y0:box.y1, box.x0:box.x1]
        region += density[..., None] * (np.array(cvs.PAPER_WHITE, np.float32) - region)
        return
    self._glaze(box, density.astype(np.float32), np.array(cvs.pigment_rgb(pigment), np.float32).reshape(1, 1, 3))


cvs.Canvas.ink = ink


def webp(image, path, quality):
    buf = io.BytesIO()
    image.save(buf, "WEBP", quality=quality, method=6)
    path.write_bytes(buf.getvalue())
    print(f"{path.relative_to(ROOT)}: {image.width} x {image.height}, {len(buf.getvalue()) // 1024} KB")


def paint(svg_path, scale, seed):
    text = Path(svg_path).read_text()
    width = int(text.split('width="', 1)[1].split('"', 1)[0])
    return paint_scene({"seed": seed, "vignette": "none", "width": width, "style": {}}, text, scale=scale)


def paint_map(svg_path):
    p = paint(svg_path, 2.0, MAP_SEED)
    big = Image.fromarray(cv2.cvtColor(p.base, cv2.COLOR_BGR2RGB))
    out = ROOT / "public/holiday"
    webp(big, out / f"map-{big.width}.webp", 72)
    small = big.resize((big.width // 2, big.height // 2), Image.LANCZOS)
    webp(small, out / f"map-{small.width}.webp", 82)
    print(json.dumps(p.labels, indent=1))


# Painted layer name -> file name in public/holiday/animals.
ANIMALS = {
    "whale--tail-fluke": "map-whale-fluke",
    "whale--flipper-far": "map-whale-flipper-far",
    "whale--body": "map-whale-body",
    "whale--flipper-near": "map-whale-flipper-near",
    "whale--hat": "map-whale-hat",
    "spout": "map-whale-spout",
    "hat": "map-hat",
}


def paint_animals():
    p = paint(ROOT / "scripts/holiday-map/animals.svg", 1.0, ANIMAL_SEED)
    out = ROOT / "public/holiday/animals"
    for layer in p.layers:
        name = ANIMALS.get(layer.name)
        if not name:
            continue
        rgba = Image.fromarray(cv2.cvtColor(layer.image, cv2.COLOR_BGRA2RGBA))
        webp(rgba, out / f"{name}.webp", 86)
        print(f"  box {list(layer.box)} pivot {layer.pivot}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "map":
        paint_map(sys.argv[2])
    elif len(sys.argv) == 2 and sys.argv[1] == "animals":
        paint_animals()
    else:
        sys.exit(__doc__)
