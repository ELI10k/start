<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Completion and verification policy

- Own implementation tasks through complete verification. Do not stop merely because a failure appears environmental when a safe in-scope retry or alternative verification path is available.
- If a required command fails because network or sandbox access is restricted, request the necessary permission through the available approval mechanism and continue automatically after approval.
- A code change is not complete while a required test, type-check, lint check, production build, migration validation, or relevant smoke test remains unverified.
- Run focused regression tests for the changed behavior and the repository's full relevant verification suite. Do not describe work as fully fixed when only a narrow subset passed.
- When a verification step is genuinely blocked after exhausting safe alternatives, state that the work remains incomplete, identify the exact blocker, and request only the authority or input needed to continue.
- Preserve unrelated user changes and active work. Do not overwrite, reset, or silently resolve overlapping changes without understanding them.
- Report delivery state precisely: distinguish `implemented and verified locally`, `merged into main`, and `deployed to production`. Never say a customer-facing issue is fixed, closed, or available to users while the verified change exists only in a local branch or worktree.
- A request to fix, change, add, remove, or otherwise implement customer-facing behavior authorizes the normal delivery path through pull request, merge, production deployment, and post-deployment verification. Do not wait for a separate conversational instruction such as "deploy" or "publish" unless the user explicitly limits the request to local work, a draft, analysis, or no deployment.
- Do not ask the user to approve ordinary branch creation, commits, pull requests, merging after required checks pass, Vercel deployment triggered from `main`, or safe production smoke tests. Use the environment's approval mechanism when a command itself requires elevated access, then continue automatically.
- An implementation task is not complete until the intended commit is on `main`, the corresponding production deployment is Ready, and the changed customer path has been checked on the live domain. Local verification alone is an intermediate state, not a handoff point.
- If production delivery is genuinely blocked by missing credentials, an external outage, a required destructive operation, billing, or a new product decision, report the exact blocker and request only the missing authority or decision. Do not convert an ordinary deployment step into a product-approval question.

## End-to-end repair policy

- Treat every bug-fix request as ownership of the complete repair loop: reproduce or establish the failure, identify the root cause, implement the smallest durable fix, validate it, and iterate on any validation failure until the relevant checks pass.
- Before editing, inspect the current branch, uncommitted work, recent related changes, and the affected data/API/UI path. Base the repair on the newest intended behavior so an older implementation does not overwrite a newer fix.
- Do not patch only the visible symptom. Check the same root cause across closely related call sites, roles, responsive states, persistence paths, and production configuration when they are materially affected. Keep unrelated improvements out of the change.
- Add or update a regression test that fails for the reported bug and passes after the repair whenever the behavior is testable. Preserve the test so the same defect cannot silently return.
- Verify both the changed path and its important neighboring behavior. Run focused tests first, then the complete relevant repository checks required by the completion policy.
- For database or Supabase changes, inspect applied migration history and production compatibility. Add a new forward-only migration; never rewrite a migration that may already have run. Verify authorization and RLS implications.
- Before declaring completion, review the final diff for accidental deletions, stale conflict resolutions, unrelated files, debug code, generated artifacts, and mismatches between tests and real behavior.
- Do not make the user repeatedly ask to finish normal in-scope steps. Continue autonomously through diagnosis, repair, regression coverage, and verification. Ask only when a genuinely new product decision, unavailable credential, explicit deployment approval, or other required authority blocks progress.
- If another active task overlaps the same files, migrations, or behavior, do not let the fixes overwrite one another. Isolate the work, reconcile both intended outcomes explicitly, and rerun the combined verification suite.

## Merge and production policy

- Never push a task branch directly to `main`. Push the task branch, open a pull request, wait for the required `verify` check, and merge only when the branch is up to date with `main`.
- Treat `main` as the only production source of truth. Work that exists only in another branch or worktree is not delivered and must not be described as fixed for customers.
- Serialize production releases. Do not merge a second pull request while the previous `main` deployment is still building or awaiting post-deployment smoke verification.
- Immediately before merge, refresh `main`, reconcile any new commits, and rerun the required verification on the combined result.
