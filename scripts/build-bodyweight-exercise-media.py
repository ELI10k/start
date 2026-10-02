"""Prepare generated bodyweight sprite sheets for MP4 encoding.

The image-generation step produces one six-panel horizontal sheet per exercise.
This script crops those panels into square frames and writes the catalogue poster.
The companion Swift script encodes the frames with macOS AVFoundation.
"""

from pathlib import Path
import re
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "scripts/data/bodyweight-instructor-exercises.mjs"
GENERATED = Path.home() / ".codex/generated_images/01a0fd9d-e150-77b1-aace-e24b2bd67716"
FRAMES_ROOT = Path("/private/tmp/start-bodyweight-frames")
PUBLIC_ROOT = ROOT / "public/exercises/bodyweight"


def inventory() -> list[tuple[str, str]]:
    source = DATA.read_text(encoding="utf-8")
    matches = re.findall(
        r'item\("([^\"]+)".*?,\s*"(exec-[^\"]+\.png)"\),',
        source,
        flags=re.DOTALL,
    )
    if len(matches) != 31:
        raise RuntimeError(f"Expected 31 generated exercises, found {len(matches)}")
    return matches


def prepare(slug: str, sprite_name: str) -> None:
    source = GENERATED / sprite_name
    if not source.exists():
        raise FileNotFoundError(source)

    image = Image.open(source).convert("RGB")
    panel_width = image.width // 6
    if panel_width < 250 or image.height < panel_width:
        raise RuntimeError(f"Unexpected sprite dimensions for {slug}: {image.size}")

    frames_dir = FRAMES_ROOT / slug
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index in range(6):
        left = index * panel_width
        panel = image.crop((left, 0, left + panel_width, image.height))
        panel = ImageOps.contain(panel, (680, 680), Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (720, 720), (250, 249, 246))
        framed.paste(panel, ((720 - panel.width) // 2, (720 - panel.height) // 2))
        panel = framed
        panel.save(frames_dir / f"frame-{index + 1:02d}.png")
        frames.append(panel)

    frames[0].save(PUBLIC_ROOT / f"{slug}.jpg", quality=88, progressive=True)


if __name__ == "__main__":
    FRAMES_ROOT.mkdir(parents=True, exist_ok=True)
    for exercise_slug, exercise_sprite in inventory():
        prepare(exercise_slug, exercise_sprite)
    print(f"Prepared {len(inventory())} exercises in {FRAMES_ROOT}")
