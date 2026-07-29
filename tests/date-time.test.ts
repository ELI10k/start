import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import {
  formatIsraelDateTime,
  formatIsraelTime,
  ISRAEL_TIME_ZONE,
} from "../lib/date-time.ts";

test("Israel date formatting uses Asia/Jerusalem in winter and summer",()=>{
  assert.equal(ISRAEL_TIME_ZONE,"Asia/Jerusalem");
  assert.match(formatIsraelDateTime("2026-01-15T11:01:00.000Z"),/13:01/);
  assert.match(formatIsraelDateTime("2026-07-29T11:01:00.000Z"),/14:01/);
  assert.match(formatIsraelTime("2026-07-29T09:01:00.000Z"),/12:01/);
});

test("invitation status uses the shared Israel formatter",async()=>{
  const source=await readFile(new URL("../app/coach/clients/[id]/page.tsx",import.meta.url),"utf8");
  assert.match(source,/formatIsraelDateTime/);
  assert.doesNotMatch(source,/Intl\.DateTimeFormat/);
});

test("date and time displays declare the Israel timezone",()=>{
  const result=spawnSync("rg",[
    "-n",
    "--pcre2",
    String.raw`toLocale(Date|Time)String\("he-IL"\)|toLocaleDateString\("he-IL",\{(?!timeZone)|toLocaleTimeString\("he-IL",\{(?!timeZone)|new Date\([^)]*\)\.toLocaleString\("he-IL"\)`,
    "app",
    "components",
    "--glob",
    "*.{ts,tsx}",
  ],{encoding:"utf8"});
  assert.equal(result.status,1,result.stdout);
});
