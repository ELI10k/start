import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("one photo session is rendered once instead of becoming both comparison dates", async () => {
  const source = await readFile(
    new URL("../components/client/ProgressPhotoGallery.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /sessions\.length === 1/);
  assert.match(source, /נשמר מועד אחד/);
  assert.match(source, /לאחר העלאה נוספת יהיה אפשר להשוות/);
});
