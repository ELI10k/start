"""Build posters and animation frames for the curated exercise expansion."""

from pathlib import Path
import shutil

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path.home() / ".codex/generated_images/01a0fd9d-e150-77b1-aace-e24b2bd67716"
FRAMES_ROOT = Path("/private/tmp/start-curated-exercise-frames")
PUBLIC_ROOT = ROOT / "public/exercises"

# slug: (public category, immutable ImageGen source)
SPRITES = {
    "jumping-jacks": ("warmup", "exec-a4739999-fecc-4abc-bf88-8cecface9122.png"),
    "high-knees": ("warmup", "exec-724c0e11-2e73-4ea8-af85-9533c381c1e1.png"),
    "inchworm": ("warmup", "exec-fd554bba-afff-47bf-acc3-bb733d8520ae.png"),
    "worlds-greatest-stretch": ("warmup", "exec-c50f6523-6ae7-4d66-b9e0-690c19cbb1a2.png"),
    "cat-cow": ("warmup", "exec-b7eceb07-b061-43eb-907f-d08511d62238.png"),
    "leg-swings": ("warmup", "exec-15eeed9b-27f9-4906-8c9f-ad246b4a483a.png"),
    "hip-circles": ("warmup", "exec-85b6b320-776c-44fb-9c45-d118c0bec91a.png"),
    "thoracic-rotation": ("warmup", "exec-6f5a731c-e57c-4c46-bcb8-b92fbef2128f.png"),
    "dead-bug": ("core", "exec-41b9ad6a-c008-49a7-b648-2ce68c9ec909.png"),
    "hollow-body-hold": ("core", "exec-85ef7db6-a7eb-49ea-a97e-a8929ac8f2fc.png"),
    "pallof-press-cable": ("core", "exec-2643f812-eadc-4ff9-913f-72d49f82aee0.png"),
    "pallof-press-band": ("core", "exec-f61e135b-f1ae-40fc-833e-da36266b189e.png"),
    "hanging-knee-raise": ("core", "exec-4f5044c9-c1be-4d55-acaa-ce70b88d2cfd.png"),
    "plank-shoulder-taps": ("core", "exec-bd1c2e05-721b-4de0-9ff5-44f6df6bd023.png"),
    "floor-russian-twist": ("core", "exec-b2a816dc-378a-4862-90ac-097d1f0b37f8.png"),
    "dumbbell-bulgarian-split-squat": ("legs", "exec-fc95c0a5-27df-40ba-b6b8-a1c782b654ee.png"),
    "dumbbell-step-up": ("legs", "exec-0baffd89-7e40-4a0c-af6c-7cab359f2deb.png"),
    "bodyweight-reverse-lunge": ("legs", "exec-b6163ddf-ed20-4947-810a-62ab035f9e5d.png"),
    "bodyweight-glute-bridge": ("legs", "exec-235c5ad7-2507-47fd-ad9e-48d8c2411ac0.png"),
    "single-leg-glute-bridge": ("legs", "exec-a6e5065b-d205-45b5-8fce-6cce53639cba.png"),
    "single-leg-press-machine": ("legs", "exec-7418de5e-f45b-4a90-94dd-1d857a62fe3d.png"),
    "seated-calf-raise-machine": ("legs", "exec-5ecb9324-4775-4edf-a5c5-f36eb969e303.png"),
    "wall-tibialis-raise": ("legs", "exec-2435e861-5016-47dc-a6cb-954264727e48.png"),
    "box-jump": ("legs", "exec-8dcbe2fd-5d59-4e1b-8f23-0366cb6f6723.png"),
    "dumbbell-floor-press": ("chest", "exec-0fa1506c-e582-4fac-9980-ea374836a138.png"),
    "plyometric-push-up": ("chest", "exec-735c95f5-b2bc-4359-8221-b2933c6e5a27.png"),
    "chest-supported-dumbbell-row": ("back", "exec-727fff58-3570-4015-808e-6e549909f0b5.png"),
    "scapular-pull-up": ("back", "exec-5724b25a-b660-45d1-940b-82f59aca99d9.png"),
    "arnold-press": ("shoulders", "exec-20c185af-9c2b-4fd3-9381-461c37ac5bbf.png"),
    "band-external-rotation": ("shoulders", "exec-95e10248-6e2b-46c2-998e-a3a9511fb63c.png"),
    "standing-barbell-curl": ("arms", "exec-7b46c9c2-126c-4ef3-9c59-d8479094c4b8.png"),
    "dumbbell-concentration-curl": ("arms", "exec-0a23136b-5441-44af-9e67-6b0c8f6c9656.png"),
    "rope-pushdown": ("arms", "exec-a1b0d292-775e-4a37-9fd1-4c7f63cc9182.png"),
    "landmine-press": ("shoulders", "exec-54f9fd1c-f2cd-4139-a7c6-a0a0deee7280.png"),
    "overhead-cable-extension": ("arms", "exec-90c4d7a3-c2db-4b38-b3ca-3f8641123492.png"),
}


def prepare(slug: str, category: str, sprite_name: str) -> None:
    source = GENERATED / sprite_name
    if not source.exists():
        raise FileNotFoundError(source)
    image = Image.open(source).convert("RGB")
    if image.width % 3 or image.height % 2:
        raise RuntimeError(f"Unexpected sprite dimensions for {slug}: {image.size}")
    cell_width, cell_height = image.width // 3, image.height // 2
    if min(cell_width, cell_height) < 300:
        raise RuntimeError(f"Sprite cells are too small for {slug}: {image.size}")

    frames_dir = FRAMES_ROOT / category / slug
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    output_dir = PUBLIC_ROOT / category
    output_dir.mkdir(parents=True, exist_ok=True)

    frames: list[Image.Image] = []
    for index in range(6):
        column, row = index % 3, index // 3
        panel = image.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
        panel = ImageOps.contain(panel, (680, 680), Image.Resampling.LANCZOS)
        framed = Image.new("RGB", (720, 720), (250, 249, 246))
        framed.paste(panel, ((720 - panel.width) // 2, (720 - panel.height) // 2))
        framed.save(frames_dir / f"frame-{index + 1:02d}.png")
        frames.append(framed)
    frames[0].save(output_dir / f"{slug}.jpg", quality=88, progressive=True)


if __name__ == "__main__":
    if FRAMES_ROOT.exists():
        shutil.rmtree(FRAMES_ROOT)
    for exercise_slug, (exercise_category, exercise_sprite) in SPRITES.items():
        prepare(exercise_slug, exercise_category, exercise_sprite)
    print(f"Prepared {len(SPRITES)} exercises in {FRAMES_ROOT}")
