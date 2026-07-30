import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const sourcePath = path.resolve("data/source/foods.xlsx");
const outputPath = path.resolve("data/foods.json");
const reportPath = path.resolve("data/foods.import-report.json");
const workbook = XLSX.readFile(sourcePath, { cellDates: true });

const text = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const optionalText = (value) => text(value) || undefined;
const number = (value) => {
  if (value === null || value === undefined || text(value) === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(text(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const issues = [];
const foods = [];
const seenIds = new Set();
const seenIdentity = new Set();
let sourceRows = 0;

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const headerIndex = rawRows.findIndex((row) => row.some((cell) => text(cell) === "שם המוצר"));
  if (headerIndex < 0) { issues.push({ sheet: sheetName, reason: "missing-header" }); continue; }
  const headers = rawRows[headerIndex].map(text);
  for (const [offset, cells] of rawRows.slice(headerIndex + 1).entries()) {
    if (!cells.some((cell) => text(cell))) continue;
    sourceRows += 1;
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    const rowNumber = headerIndex + offset + 2;
    const id = text(row["מס׳"]);
    const name = text(row["שם המוצר"]);
    const category = text(row["קטגוריה"]);
    const calories = number(row["קלוריות"]);
    if (!id || !name || !category || calories === undefined) {
      issues.push({ sheet: sheetName, row: rowNumber, id: id || undefined, reason: "invalid-required-field" });
      continue;
    }
    if (seenIds.has(id)) { issues.push({ sheet: sheetName, row: rowNumber, id, reason: "duplicate-id" }); continue; }
    const identity = `${name.toLocaleLowerCase("he")}|${optionalText(row["מותג"]) ?? ""}|${category}`;
    if (seenIdentity.has(identity)) { issues.push({ sheet: sheetName, row: rowNumber, id, reason: "duplicate-product-identity" }); continue; }
    seenIds.add(id); seenIdentity.add(identity);
    foods.push({
      id, name, brand: optionalText(row["מותג"]), category,
      calories, protein: number(row["חלבון (ג׳)"]), carbs: number(row["פחמימות (ג׳)"]), fat: number(row["שומן (ג׳)"]),
      sugars: number(row["סוכרים (ג׳)"]), sodiumMg: number(row["נתרן (מ״ג)"]), calciumMg: number(row["סידן (מ״ג)"]),
      packageQuantity: number(row["כמות באריזה"]), packageUnit: optionalText(row["יחידה"]), barcode: optionalText(row["ברקוד"]),
      servingLabel: text(row["בסיס הערכים"]), verificationStatus: optionalText(row["סטטוס בדיקה"]), notes: optionalText(row["הערות פליקס"]), sourceUrl: optionalText(row["מקור"]),
      unitWeightGrams: number(row["משקל יחידה (גרם)"]), caloriesPerUnit: number(row["קלוריות ליחידה"]), unitsPerPackage: number(row["יחידות במנה/אריזה"]),
    });
  }
}

const clean = (value) => JSON.parse(JSON.stringify(value));
const duplicateNames = [...foods.reduce((map, food) => { const key = food.name.toLocaleLowerCase("he"); map.set(key, [...(map.get(key) ?? []), food.id]); return map; }, new Map()).entries()].filter(([, ids]) => ids.length > 1).map(([name, ids]) => ({ name, ids }));
const missingOptionalNutrition = Object.fromEntries(["protein", "carbs", "fat", "sugars", "sodiumMg", "calciumMg"].map((field) => [field, foods.filter((food) => food[field] === undefined).length]));
const categoryCount = new Set(foods.map((food) => food.category)).size;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(clean(foods), null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ source: "data/source/foods.xlsx", sheets: workbook.SheetNames, sourceRows, importedFoods: foods.length, ignoredRows: sourceRows - foods.length, categoryCount, duplicateNames, missingOptionalNutrition, issues }, null, 2)}\n`);
console.log(`Imported ${foods.length}/${sourceRows} foods; ${issues.length} issue(s).`);
