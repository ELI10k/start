import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a completed exercise stays visibly marked when revisited", async () => {
  const session = await readFile(new URL("../components/workouts/client/WorkoutSession.tsx", import.meta.url), "utf8");

  assert.match(session, /result\.completed&&<span role="status"/);
  assert.match(session, /<CheckCircle2 aria-hidden="true" size=\{15\}\/>הושלם/);
  assert.match(session, /disabled=\{result\.completed\}/);
  assert.match(session, /<CheckCircle2 aria-hidden="true" size=\{18\}\/>הושלם/);
});
