// One-shot sweep that pulls the last off-palette values in the UI onto the closed
// palette: white surfaces, black text, #16A34A for anything positive, #DC2626 for
// anything wrong. Gradients left over from the dark/gold design collapse to a flat
// surface, because the palette has exactly one background.
//
//   node scripts/normalize-palette.mjs
//
// Idempotent: running it twice changes nothing.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components"];
const EXTENSIONS = [".tsx", ".ts"];

// Ordered: multi-token replacements first, so a gradient is collapsed before its
// individual colour stops are rewritten.
const REPLACEMENTS = [
  // Gradients: the dark design used them to fake depth. One flat surface instead.
  [/bg-\[radial-gradient\([^\]]*\)\]\s?/g, ""],
  [/bg-gradient-to-[a-z]+ from-\[#[0-9A-Fa-f]{3,6}\] to-\[#(?:131313|101010|181818|242424)\]/g, "bg-[#FFFFFF]"],
  [/bg-gradient-to-[a-z]+ from-\[#(?:1B1912|201C11)\] to-\[#[0-9A-Fa-f]{3,6}\]/g, "bg-[#F7F8F7]"],
  [/bg-gradient-to-[a-z]+ from-\[#FFFFFF\] to-\[#FFFFFF\]/g, "bg-[#FFFFFF]"],
  [/bg-gradient-to-[a-z]+ from-\[#16A34A\] to-\[#16A34A\]/g, "bg-[#16A34A]"],

  // Surfaces that were dark.
  [/#131313\b/g, "#FFFFFF"],
  [/#101010\b/g, "#FFFFFF"],
  [/#181818\b/g, "#FFFFFF"],
  [/#1B1912\b/g, "#FFFFFF"],
  [/#201C11\b/g, "#F7F8F7"],
  [/#242424\b/g, "#F7F8F7"],

  // Hairlines and chart gridlines.
  [/#444\b/g, "#E5E7E5"],
  [/#353535\b/g, "#E5E7E5"],
  [/#3f3f46\b/g, "#E5E7E5"],
  [/#27272a\b/g, "#E5E7E5"],

  // Text that was light-on-dark, and the greys between.
  [/#F4F4F4\b/g, "#0B0B0B"],
  [/#D0D0D0\b/g, "#5B5F5B"],
  [/#AFAFAF\b/g, "#5B5F5B"],
  [/#969696\b/g, "#5B5F5B"],
  [/#8B8B8B\b/g, "#5B5F5B"],

  // The one red.
  [/#FF9C9C\b/g, "#DC2626"],

  // White-on-white overlays: they were a lift against a dark surface and are
  // invisible now. The raised neutral does the same job on white.
  [/bg-white\/\[?[.0-9]+\]?/g, "bg-[#F7F8F7]"],
  [/border-white\/\[?[.0-9]+\]?/g, "border-[#E5E7E5]"],
];

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else if (EXTENSIONS.some((extension) => path.endsWith(extension))) {
      yield path;
    }
  }
}

let changed = 0;
for (const root of ROOTS) {
  for (const path of walk(root)) {
    const before = readFileSync(path, "utf8");
    let after = before;
    for (const [pattern, value] of REPLACEMENTS) after = after.replace(pattern, value);
    if (after !== before) {
      writeFileSync(path, after);
      changed += 1;
      console.log(`normalised ${path}`);
    }
  }
}
console.log(changed ? `${changed} file(s) updated.` : "Already on the palette.");
