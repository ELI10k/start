import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const source=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("pull requests must pass the complete verification gate",async()=>{
  const workflow=await source(".github/workflows/verify.yml");
  for(const command of ["npm ci","npm run supabase:migrations:validate","npm run lint","npm test","npx next build --webpack"]){
    assert.match(workflow,new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
  assert.match(workflow,/pull_request:/);
  assert.match(workflow,/branches: \[main\]/);
});

test("repository instructions serialize production and forbid direct main pushes",async()=>{
  const instructions=await source("AGENTS.md");
  assert.match(instructions,/Never push a task branch directly to `main`/);
  assert.match(instructions,/Serialize production releases/);
  assert.match(instructions,/Treat `main` as the only production source of truth/);
});

test("client workout persistence has a disposable production round-trip verifier",async()=>{
  const verifier=await source("scripts/verify-client-workout-save.mjs");
  assert.match(verifier,/is_test_account/);
  assert.match(verifier,/workout-round-trip/);
  assert.match(verifier,/נשמרו ונטענו מחדש/);
  assert.match(verifier,/remove disposable client/);
  assert.match(verifier,/databaseRoundTrip/);
});
