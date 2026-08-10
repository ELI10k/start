// Reports what nothing references any more: components no file imports, CSS
// classes no file uses, and exported helpers with no consumer.
//
//   node scripts/report-dead-code.mjs
//
// It only reports. Deleting is a separate, deliberate decision - a component can
// be referenced by a test, a route convention or a dynamic import that a grep
// cannot see.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const SOURCE_ROOTS = ["app", "components", "lib"];
const CONSUMER_ROOTS = ["app", "components", "lib", "e2e", "tests", "scripts"];
const CODE = [".ts", ".tsx", ".mjs"];

function* walk(directory, extensions) {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules") continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path, extensions);
    else if (extensions.some((extension) => path.endsWith(extension))) yield path;
  }
}

const consumers = new Map();
for (const root of CONSUMER_ROOTS) {
  for (const path of walk(root, CODE)) consumers.set(path, readFileSync(path, "utf8"));
}
const allCode = [...consumers.values()].join("\n");

// A file under app/ whose name is a Next convention is reached by the router,
// never by an import.
const ROUTED = /^(page|layout|loading|error|not-found|route|template|default|global-error)\.tsx?$/;

const orphanComponents = [];
for (const root of SOURCE_ROOTS) {
  for (const path of walk(root, [".ts", ".tsx"])) {
    const name = basename(path).replace(/\.tsx?$/, "");
    if (path.startsWith("app/") && ROUTED.test(basename(path))) continue;
    const importable = path.replace(/\.tsx?$/, "");
    // Specifiers seen in this repo: "@/lib/x", "./X", "../lib/x.ts" (the unit
    // tests import with the extension, which a bare-name check would miss).
    const specifiers = [
      `@/${importable}`,
      `/${name}"`, `/${name}'`,
      `/${name}.ts"`, `/${name}.ts'`,
      `/${name}.tsx"`, `/${name}.tsx'`,
    ];
    const referenced = [...consumers.entries()].some(([consumer, source]) =>
      consumer !== path && specifiers.some((specifier) => source.includes(specifier)),
    );
    if (!referenced) orphanComponents.push(path);
  }
}

// CSS classes declared in globals.css that no source file names.
const css = readFileSync("app/globals.css", "utf8");
const declared = new Set(
  [...css.matchAll(/\.([a-z][a-z0-9-]*(?:__[a-z0-9-]+)?(?:--[a-z0-9-]+)?)\b/g)].map((match) => match[1]),
);
// Modifier classes are usually built from a template - `skeleton--${variant}`,
// `metric-tile--${accent}` - so a literal search never finds them. Treat a
// modifier as used when its base is interpolated anywhere.
const interpolated = (name) => {
  const base = name.includes("--") ? name.slice(0, name.indexOf("--")) : null;
  return Boolean(base) && allCode.includes(`${base}--$`);
};
const unusedClasses = [...declared]
  .filter((name) => !allCode.includes(name) && !interpolated(name))
  .sort();

console.log("── Components nothing imports ──");
console.log(orphanComponents.length ? orphanComponents.map((path) => `  ${path}`).join("\n") : "  none");
console.log("\n── CSS classes nothing uses ──");
console.log(unusedClasses.length ? `  ${unusedClasses.join(", ")}` : "  none");
