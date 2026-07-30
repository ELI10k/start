# START - Claude Code Handoff Checklist

## Before opening Claude Code
- [ ] Confirm the START project folder exists locally.
- [ ] Confirm it is the latest repository used by Codex.
- [ ] Make a backup or ensure all current work is committed and pushed.
- [ ] Obtain the complete food Excel file.
- [ ] Know which Vercel project is Production.
- [ ] Keep Supabase/Vercel credentials private.

## Put these files in the repository root
- [ ] `CLAUDE.md`
- [ ] `START_MASTER.md`
- [ ] `HANDOFF_CHECKLIST.md`
- [ ] `PROJECT_STATUS.md`
- [ ] `.claude/settings.json`

## Install and start Claude Code on macOS
Recommended official options change over time. Current supported npm path:

```bash
npm install -g @anthropic-ai/claude-code
claude --version
```

Do not use `sudo npm install -g`.

Then:

```bash
cd /path/to/START
claude
```

Follow the browser login.

Inside Claude Code, paste:

```text
קרא את CLAUDE.md, START_MASTER.md ו-HANDOFF_CHECKLIST.md. בצע את פרוטוקול הסריקה הראשוני בלבד. אל תשנה קוד עדיין. בסיום שלח לי בעברית טבלת מצב אמיתית והמלצה למשימה הראשונה.
```

## Safe automatic terminal permissions
The supplied `.claude/settings.json` allows common read-only and validation commands. It intentionally does not allow Production deploys, destructive database commands, force pushes or secret reads.

Claude can work autonomously within those boundaries. When it asks for a new permission, read the command before approving.

## First audit must verify
- [ ] Git branch/status/recent commits
- [ ] Package scripts
- [ ] Next.js architecture
- [ ] Supabase schema/migrations/generated types
- [ ] Auth and role routing
- [ ] RLS and Storage policies
- [ ] Coach routes
- [ ] Client routes
- [ ] Food import count and full Excel mapping
- [ ] Nutrition macro calculations
- [ ] Master foods
- [ ] Alternatives
- [ ] Workout flow
- [ ] Check-in/photos
- [ ] Notifications
- [ ] Tests and coverage
- [ ] Preview vs Production deployment

## Immediate product acceptance tests
- [ ] Search `גבינה`, `חזה עוף`, `פרגית`, `טונה`, `יוגורט`, `פיתה`, `טורטייה`, `בטטה`.
- [ ] Master foods appear first.
- [ ] Select client + calories and macro targets fill automatically.
- [ ] Selected foods update calories/protein/carbs/fat totals.
- [ ] Alternatives receive different calculated quantities.
- [ ] Correct natural units appear where source data supports them.
- [ ] Free calories are counted.
- [ ] Save, refresh, edit, clone and client view all work.
- [ ] Full menu can be built in under two minutes.

## Production rule
Claude must receive this exact approval before Production deployment:

```text
אשר העלאה לפרודקשן
```

Anything else means Preview only.
