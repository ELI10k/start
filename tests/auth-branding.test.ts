import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const source = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

// Every entry point a person meets before they are signed in: the two screens,
// the two confirmation screens, and the two emails. The palette is white, black,
// #16A34A, and #DC2626 for nothing but an error.
const AUTH_SURFACES = [
  "app/login/page.tsx",
  "app/auth/confirm-invite/page.tsx",
  "app/auth/confirm-link/page.tsx",
  "components/auth/LoginForm.tsx",
  "components/auth/ExpiredInviteForm.tsx",
];

// Gold, amber and the old dark surfaces.
const BANNED = /#d4af37|#c9a227|#a87b17|#8B6B1F|#090909|#151515|#3a321b|#0a0a0a|amber-|yellow-|\bgold\b/i;

test("no auth screen carries gold, amber or a dark surface", async () => {
  for (const path of AUTH_SURFACES) {
    const text = await source(path);
    assert.doesNotMatch(text, BANNED, `${path} still carries an off-palette value`);
  }
});

test("the auth screens use the shared card and button rather than one-off styling", async () => {
  for (const path of ["app/login/page.tsx", "app/auth/confirm-invite/page.tsx", "app/auth/confirm-link/page.tsx"]) {
    const text = await source(path);
    assert.match(text, /auth-screen/, `${path} does not use the shared auth screen`);
    assert.match(text, /auth-card/, `${path} does not use the shared auth card`);
  }
  const form = await source("components/auth/LoginForm.tsx");
  assert.match(form, /premium-primary-button/);
  // Red is reserved for the error state, green for the sent state.
  assert.match(form, /state\.status==="error"\?"bg-\[#FEF2F2\] text-\[#DC2626\]"/);
});

test("both email templates are on the palette and declare a light scheme", async () => {
  const directory = new URL("../supabase/templates/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".html"));
  assert.ok(files.length >= 2, "expected the invite and magic-link templates");

  for (const file of files) {
    const html = await readFile(new URL(file, directory), "utf8");
    assert.doesNotMatch(html, BANNED, `${file} still carries an off-palette value`);

    // Apple Mail and Outlook honour these and leave the message alone.
    assert.match(html, /<meta name="color-scheme" content="light">/, `${file} does not declare a light colour scheme`);
    assert.match(html, /<meta name="supported-color-schemes" content="light">/, `${file} does not declare supported schemes`);
    assert.match(html, /color-scheme: light; supported-color-schemes: light;/, `${file} lacks the :root declaration`);

    // Gmail strips <style>, so the palette has to survive on inline attributes
    // alone: a bgcolor on every surface and an explicit colour on every string.
    assert.match(html, /bgcolor="#16A34A"/, `${file} has no explicit CTA background`);
    assert.match(html, /background:#16A34A/, `${file} has no inline CTA background`);
    assert.match(html, /color:#0B0B0B/, `${file} has no inline heading colour`);

    // Gmail's forced inversion hits pure white hardest; the near-white survives.
    assert.doesNotMatch(html, /bgcolor="#FFFFFF"/i, `${file} uses pure white, which Gmail inverts`);

    // A dark-mode block that re-asserts the same palette, never a dark one.
    assert.match(html, /@media \(prefers-color-scheme: dark\)/, `${file} has no dark-mode guard`);
    assert.match(html, /\.start-card \{ background: #FFFFFE !important/, `${file} does not hold its card light`);
  }
});

test("the templates still point at the confirmation screens, not straight at the token", async () => {
  const invite = await readFile(new URL("../supabase/templates/invite.html", import.meta.url), "utf8");
  const magic = await readFile(new URL("../supabase/templates/magic-link.html", import.meta.url), "utf8");
  // The whole point of the confirm screens is that opening a mail client, or a
  // scanner following links in it, must not consume the token.
  assert.match(invite, /\/auth\/confirm-invite\?token_hash=\{\{ \.TokenHash \}\}&amp;type=invite/);
  assert.match(magic, /\/auth\/confirm-link\?token_hash=\{\{ \.TokenHash \}\}&amp;type=magiclink/);
});
