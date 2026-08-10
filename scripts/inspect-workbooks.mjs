// Dumps the header row and a couple of sample rows from every source workbook so
// the columns that actually exist can be seen before anything is imported from
// them. Read-only.
//
//   node scripts/inspect-workbooks.mjs

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = join(root, "data/workouts-source");

for (const file of readdirSync(directory).filter((name) => name.endsWith(".xlsx"))) {
  const book = XLSX.readFile(join(directory, file));
  console.log(`\n=== ${file} ===`);
  for (const sheetName of book.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[sheetName], { header: 1, blankrows: false });
    console.log(`-- sheet "${sheetName}" (${rows.length} rows)`);
    for (const row of rows.slice(0, 6)) {
      const cells = row.map((cell) => String(cell ?? "").replace(/\s+/g, " ").slice(0, 34));
      if (cells.join("").trim()) console.log(`   | ${cells.join(" | ")}`);
    }
  }
}
