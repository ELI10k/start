"""Prepare the generated warm-up contact sheets for MP4 encoding.

Image generation returns a 3-by-2 sheet. This script extracts the six frames,
normalizes them to the catalogue's square format, and writes each poster image.
The companion Swift script encodes the frame directories as H.264 videos.
"""

from pathlib import Path
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path.home() / ".codex/generated_images/01a0fd9d-e150-77b1-aace-e24b2bd67716"
FRAMES_ROOT = Path("/private/tmp/start-warmup-frames")
PUBLIC_ROOT = ROOT / "public/exercises/warmup"

SPRITES = {
    "lat-ball-stretch": "exec-92afa0da-2eb8-46da-8ce8-393666c2924f.png",
    "shoulder-circles-ball": "exec-93a9f964-2ae8-497b-b021-11b73a166847.png",
    "bent-arm-shoulder-circles": "exec-d156b61e-80ed-4884-9819-1ba59309966a.png",
    "straight-arm-shoulder-circles": "exec-4ce26138-2901-4192-a82b-b4b0b75de13f.png",
}


def prepare(slug: str, sprite_name: str) -> None:
    source = GENERATED / sprite_name
    if not source.exists():
        raise FileNotFoundError(source)

    image = Image.open(source).convert("RGB")
    if image.width % 3 or image.height % 2:
        raise RuntimeError(f"Unexpected sprite dimensions for {slug}: {image.size}")

    cell_width = image.width // 3
    cell_height = image.height // 2
    if min(cell_width, cell_height) < 300:
        raise RuntimeError(f"Sprite cells are too small for {slug}: {image.size}")

    frames_dir = FRAMES_ROOT / slug
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index in range(6):
        column = index % 3
        row = index // 3
        panel = image.crop(
            (
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            )
        )
        panel = ImageOps.contain(panel, (680, 680), Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (720, 720), (250, 249, 246))
        framed.paste(panel, ((720 - panel.width) // 2, (720 - panel.height) // 2))
        framed.save(frames_dir / f"frame-{index + 1:02d}.png")
        frames.append(framed)

    frames[0].save(PUBLIC_ROOT / f"{slug}.jpg", quality=88, progressive=True)


if __name__ == "__main__":
    FRAMES_ROOT.mkdir(parents=True, exist_ok=True)
    for exercise_slug, exercise_sprite in SPRITES.items():
        prepare(exercise_slug, exercise_sprite)
    print(f"Prepared {len(SPRITES)} warm-up exercises in {FRAMES_ROOT}")
