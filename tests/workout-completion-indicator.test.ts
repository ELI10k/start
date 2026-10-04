import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("a completed exercise stays visibly marked when revisited", async () => {
  const session = await readFile(new URL("../components/workouts/client/WorkoutSession.tsx", import.meta.url), "utf8");

  assert.match(session, /result\.completed&&<span role="status"/);
  assert.match(session, /justify-center gap-1\.5 text-sm font-black text-\[#15803D\]/);
  assert.match(session, /<CheckCircle2 aria-hidden="true" size=\{20\} strokeWidth=\{2\.5\}\/?>הושלם/);
  assert.doesNotMatch(session, /result\.completed&&<span role="status" className="[^"]*(?:rounded|bg-\[)/);
  assert.match(session, /disabled=\{result\.completed\}/);
  assert.match(session, /<CheckCircle2 aria-hidden="true" size=\{18\}\/>הושלם/);
});
