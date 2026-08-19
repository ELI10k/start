import { readdir, readFile } from "node:fs/promises";
const directory=new URL("../supabase/migrations/",import.meta.url);const files=(await readdir(directory)).filter((name)=>name.endsWith(".sql")).sort();if(!files.length)throw new Error("No migrations found");const sql=(await Promise.all(files.map((name)=>readFile(new URL(name,directory),"utf8")))).join("\n");const tables=["profiles","user_roles","coach_client_relationships","client_profiles","foods","menus","menu_days","meals","meal_items","meal_completion_logs","progress_entries","check_ins","content_items","device_sessions"];const missing=tables.filter((table)=>!sql.includes(`create table public.${table}`));const rls=tables.filter((table)=>!sql.includes(`alter table public.${table} enable row level security`));const required=["activate_current_device","deactivate_current_device","reset_client_device","handle_new_auth_user","save_menu_tree","set_meal_completion","menus_one_active_per_client","content_published_read","profile_authority_fields_are_server_managed","coach_may_only_review_check_in","device_sessions_one_enforced_active_idx"];const missingRules=required.filter((item)=>!sql.includes(item));for(const file of files){const text=await readFile(new URL(file,directory),"utf8");
// A migration is transaction-wrapped when its first statement is `begin;` and its
// last statement is `commit;`. Both may share a line with other statements, so
// anchor on statement boundaries rather than on line starts.
//
// The header comment is not a statement. Every migration here opens with one
// explaining impact and rollback, and testing the raw text meant the rule was
// really "no comment before begin;" - which is not the rule anyone intended, and
// which the migrations added on 2026-08-18 tripped over.
const body=text.replace(/^(?:\s*--[^\n]*\n)*/,"").trim();
if(!/^begin\s*;/i.test(body))throw new Error(`${file} does not open with begin;`);
if(!/(^|;)\s*commit\s*;$/i.test(body))throw new Error(`${file} does not close with commit;`);}const result={files,tables:tables.length,missingTables:missing,missingRls:rls,missingRules};console.log(JSON.stringify(result,null,2));if(missing.length||rls.length||missingRules.length)process.exitCode=1;
