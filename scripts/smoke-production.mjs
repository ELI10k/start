// Read-only smoke test against a deployed START. Checks that every route answers
// the way it should, that the guards still redirect, and that no gold or dark
// surface survives in the served CSS.
//
//   node scripts/smoke-production.mjs [https://host]

const base = process.argv[2] ?? "https://start.elicohenfitness.co.il";

// Anything from the retired dark/gold design. Case-insensitive, because the old
// markup used both #D4AF37 and #d4af37.
const RETIRED = /d4af37|c9a227|a87b17|8b6b1f|#090909|#151515|3a321b|#0a0a0a|#121212/i;

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(46)} ${detail}`);
};

async function head(path, expect) {
  try {
    const response = await fetch(`${base}${path}`, { redirect: "manual" });
    const ok = expect.includes(response.status);
    const location = response.headers.get("location");
    record(path, ok, `${response.status}${location ? ` → ${new URL(location, base).pathname}` : ""}`);
    return response;
  } catch (error) {
    record(path, false, `threw ${error.message}`);
    return null;
  }
}

console.log(`smoke: ${base}\n`);

// Public entry points render.
const login = await fetch(`${base}/login`);
const loginHtml = await login.text();
record("/login renders", login.status === 200, String(login.status));
record("/login is on the new brand", /auth-card/.test(loginHtml) && !RETIRED.test(loginHtml), RETIRED.test(loginHtml) ? "retired palette present" : "auth-card, no retired hex");

// Every stylesheet the page pulls must be free of the old palette too - the
// markup can be clean while the compiled CSS still carries it.
const sheets = [...loginHtml.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
let cssClean = true;
let cssBytes = 0;
for (const href of sheets) {
  const response = await fetch(new URL(href, base));
  const css = await response.text();
  cssBytes += css.length;
  if (RETIRED.test(css)) {
    cssClean = false;
    record(`stylesheet ${href}`, false, `contains ${css.match(RETIRED)?.[0]}`);
  }
}
record("compiled CSS is free of the old palette", cssClean, `${sheets.length} sheet(s), ${cssBytes} bytes`);

// The guards: an unauthenticated visitor is sent to login, never shown content.
await head("/", [200, 302, 307]);
await head("/nutrition", [302, 307]);
await head("/progress", [302, 307]);
await head("/workouts", [302, 307]);
await head("/check-in", [302, 307]);
await head("/coach", [302, 307]);
await head("/coach/clients", [302, 307]);

// A magic link with no token must not consume anything. Next serves this
// redirect as a 200 carrying an RSC payload rather than a 3xx, so the check is
// behavioural: the confirmation form must not be in the response, and the
// response must point at the login error.
for (const [path, marker] of [
  ["/auth/confirm-link", "accept-link"],
  ["/auth/confirm-invite", "accept-invite"],
]) {
  const response = await fetch(`${base}${path}`);
  const body = await response.text();
  const bounced = body.includes("error=") && !body.includes(marker);
  record(`${path} refuses a tokenless visit`, bounced, bounced ? "bounced to login, no form" : "RENDERED THE FORM");
}

// The barcode endpoint exists and refuses an unauthenticated caller.
const barcode = await fetch(`${base}/api/foods/barcode/7290000066318`, { redirect: "manual" });
record("/api/foods/barcode is closed to anonymous", [401, 302, 307].includes(barcode.status), String(barcode.status));

// The cron endpoint stays shut without its secret.
const cron = await fetch(`${base}/api/cron/reminders`, { redirect: "manual" });
record("/api/cron/reminders rejects no token", cron.status === 401, String(cron.status));

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("failed:");
  for (const result of failed) console.log(`  ${result.name} — ${result.detail}`);
  process.exitCode = 1;
}
