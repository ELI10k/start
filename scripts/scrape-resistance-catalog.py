#!/usr/bin/env python3
"""Extract the resistance exercise inventory from Gym Instructor archive HTML."""

from __future__ import annotations

import argparse
import html
import json
import re
import urllib.request


SOURCE_URL = "https://www.instructor.co.il/training-type/resistance/"

MUSCLES = {
    "core-muscles": "שרירי ליבה",
    "scapula": "שכמה",
    "shoulder": "כתף",
    "back": "גב",
    "chest": "חזה",
    "forearm": "יד קדמית",
    "back-arms": "יד אחורית",
    "leg": "רגליים",
}

EQUIPMENT = {
    "dumbells": "משקולות יד",
    "bar": "מוט",
    "workout-machine": "מכונה ייעודית",
    "smith": "מכונת סמית",
    "pulley": "כבל פולי",
    "kettlebells": "קטלבל",
    "suspension": "רצועות תלייה",
    "resistance-band": "גומיית התנגדות",
    "body-weight": "משקל גוף",
    "battle-rope": "חבל קרב",
    "stability-ball": "כדור פיזיו",
    "still-mace": "סטיל מייס",
}

CARD = re.compile(
    r'<div class="col-sm-4 col-xs-12 grid-item (?P<classes>[^"]+)">'
    r'.*?<a class="ihoverlay" href="(?P<href>[^"]+)".*?'
    r'<h3 class="entry-title">(?P<name>.*?)</h3>',
    re.S,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--html", help="Read a saved archive page instead of downloading it")
    args = parser.parse_args()

    if args.html:
        with open(args.html, encoding="utf-8") as handle:
            source = handle.read()
    else:
        with urllib.request.urlopen(SOURCE_URL, timeout=30) as response:
            source = response.read().decode("utf-8")

    exercises = []
    for match in CARD.finditer(source):
        classes = set(match.group("classes").split())
        muscles = [label for slug, label in MUSCLES.items() if slug in classes]
        equipment = [label for slug, label in EQUIPMENT.items() if slug in classes]
        exercises.append({
            "name": html.unescape(re.sub(r"<[^>]+>", "", match.group("name"))).strip(),
            "href": html.unescape(match.group("href")),
            "muscles": muscles,
            "equipment": equipment,
            "movementType": "מורכב" if "compound" in classes else "מבודד" if "isolated" in classes else None,
        })

    if len(exercises) < 200:
        raise SystemExit(f"Expected at least 200 exercises, found {len(exercises)}")
    print(json.dumps(exercises, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
