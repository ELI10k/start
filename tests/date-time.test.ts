import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
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

// Scans with Node instead of shelling out to ripgrep, which is not guaranteed to
// be installed. When it was missing, spawnSync returned status null and this test
// failed without ever inspecting a single file.
async function sourceFiles(directory:URL):Promise<URL[]>{
  const entries=await readdir(directory,{withFileTypes:true});
  const found=await Promise.all(entries.map(async(entry)=>{
    const child=new URL(`${entry.name}${entry.isDirectory()?"/":""}`,directory);
    if(entry.isDirectory())return sourceFiles(child);
    return /\.tsx?$/.test(entry.name)?[child]:[];
  }));
  return found.flat();
}

test("date and time displays declare the Israel timezone",async()=>{
  const pattern=/toLocale(?:Date|Time)String\("he-IL"\)|toLocaleDateString\("he-IL",\{(?!timeZone)|toLocaleTimeString\("he-IL",\{(?!timeZone)|new Date\([^)]*\)\.toLocaleString\("he-IL"\)/;
  const roots=["../app/","../components/"].map((path)=>new URL(path,import.meta.url));
  const files=(await Promise.all(roots.map(sourceFiles))).flat();
  assert.ok(files.length>0,"no source files were scanned");
  const offenders:string[]=[];
  for(const file of files){
    const source=await readFile(file,"utf8");
    source.split("\n").forEach((line,index)=>{
      if(pattern.test(line))offenders.push(`${file.pathname}:${index+1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders,[],offenders.join("\n"));
});
