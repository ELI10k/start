# START Claude Code Handoff - Start Here

1. Copy this entire folder's contents into the root of the existing START repository.
2. Do not replace the application code.
3. Confirm the repository is committed/backed up.
4. Open Terminal in the repository root.
5. Install Claude Code if needed:
   `npm install -g @anthropic-ai/claude-code`
6. Run:
   `./start-claude.sh`
7. Log in in the browser when requested.
8. Paste this first instruction:

```text
קרא את CLAUDE.md, START_MASTER.md, HANDOFF_CHECKLIST.md ו-PROJECT_STATUS.md. בצע עכשיו את פרוטוקול הסריקה הראשוני בלבד. אל תשנה קוד. בדוק את ה-Repository, ה-Git, ה-Supabase, המסכים, המיגרציות והבדיקות. בסיום שלח לי בעברית: מה עובד, מה חלקי, מה שבור, פערים מול מסמך המעבר, טבלת התקדמות אמיתית והמשימה הראשונה שאתה ממליץ לבצע.
```

After the audit, Claude Code can continue directly as the project's primary engineer.
