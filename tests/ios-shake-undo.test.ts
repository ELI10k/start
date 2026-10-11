import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("moving the phone cannot open the iOS Shake to Undo alert", async () => {
  const delegate = await readFile(
    new URL("../ios/App/App/AppDelegate.swift", import.meta.url),
    "utf8",
  );

  assert.match(
    delegate,
    /didFinishLaunchingWithOptions[\s\S]*application\.applicationSupportsShakeToEdit\s*=\s*false[\s\S]*return true/,
  );
});
