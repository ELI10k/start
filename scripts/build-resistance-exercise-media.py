"""Crop generated four-panel exercise sheets into animation frames and posters."""

from __future__ import annotations

import json
from pathlib import Path
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "scripts/data/resistance-generated-images.json"
GENERATED_ROOT = Path.home() / ".codex/generated_images/01a0fd9d-e150-77b1-aace-e24b2bd67716"
FRAMES_ROOT = Path("/private/tmp/start-resistance-frames")
PUBLIC_ROOT = ROOT / "public/exercises/resistance"


def prepare(slug: str, sprite: str) -> None:
    source = GENERATED_ROOT / sprite
    if not source.exists():
        raise FileNotFoundError(source)

    image = Image.open(source).convert("RGB")
    panel_width = image.width // 4
    if panel_width < 240:
        raise RuntimeError(f"Unexpected sprite dimensions for {slug}: {image.size}")

    frames_dir = FRAMES_ROOT / slug
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index in range(4):
        left = index * panel_width
        panel = image.crop((left, 0, left + panel_width, image.height))
        panel = ImageOps.contain(panel, (680, 680), Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (720, 720), (250, 249, 246))
        framed.paste(panel, ((720 - panel.width) // 2, (720 - panel.height) // 2))
        framed.save(frames_dir / f"frame-{index + 1:02d}.png")
        frames.append(framed)

    frames[0].save(PUBLIC_ROOT / f"{slug}.jpg", quality=88, progressive=True)


if __name__ == "__main__":
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    FRAMES_ROOT.mkdir(parents=True, exist_ok=True)
    for exercise in inventory:
        prepare(exercise["slug"], exercise["sprite"])
    print(f"Prepared {len(inventory)} exercise posters and frame sets")
