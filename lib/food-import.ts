import type { Food } from "./foods.ts";

type ExcelRow = Record<string, unknown>;

export function parseFoodRows(
  rawRows: readonly (readonly unknown[])[],
): Food[] {
  const headerRowIndex = rawRows.findIndex((row) =>
    row.some((cell) => String(cell).trim() === "שם המוצר"),
  );

  if (headerRowIndex === -1) {
    throw new Error(
      'לא נמצאה באקסל עמודה בשם "שם המוצר".',
    );
  }

  const headers = rawRows[headerRowIndex].map((header) =>
    String(header).trim(),
  );

  const dataRows = rawRows
    .slice(headerRowIndex + 1)
    .filter((row) =>
      row.some((cell) => String(cell).trim() !== ""),
    );

  const rows = dataRows.map((row) =>
    headers.reduce<ExcelRow>((result, header, index) => {
      result[header] = row[index] ?? "";
      return result;
    }, {}),
  );

  const seenIds = new Set<string>();
  const importedFoods = rows
    .map((row, index): Food | null => {
      const name = readText(row["שם המוצר"]);
      const id = readText(row["מס׳"]) || `imported-${index + 1}`;
      const category = readText(row["קטגוריה"]);
      const calories = readOptionalNumber(row["קלוריות"]);

      if (!name || !category || calories === undefined || seenIds.has(id)) {
        return null;
      }
      seenIds.add(id);

      return {
        id,
        name,
        brand: readText(row["מותג"]) || undefined,
        category,
        calories,
        protein: readOptionalNumber(row["חלבון (ג׳)"]),
        carbs: readOptionalNumber(row["פחמימות (ג׳)"]),
        fat: readOptionalNumber(row["שומן (ג׳)"]),
        sugars: readOptionalNumber(row["סוכרים (ג׳)"]),
        sodiumMg: readOptionalNumber(row["נתרן (מ״ג)"]),
        calciumMg: readOptionalNumber(row["סידן (מ״ג)"]),
        packageQuantity: readOptionalNumber(row["כמות באריזה"]),
        packageUnit: readText(row["יחידה"]) || undefined,
        barcode: readText(row["ברקוד"]) || undefined,
        servingLabel:
          readText(row["בסיס הערכים"]),
        verificationStatus: readText(row["סטטוס בדיקה"]) || undefined,
        notes: readText(row["הערות פליקס"]) || undefined,
        sourceUrl: readText(row["מקור"]) || undefined,
        unitWeightGrams: readOptionalNumber(row["משקל יחידה (גרם)"]),
        caloriesPerUnit: readOptionalNumber(row["קלוריות ליחידה"]),
        unitsPerPackage: readOptionalNumber(row["יחידות במנה/אריזה"]),
      };
    })
    .filter((food): food is Food => food !== null);

  if (importedFoods.length === 0) {
    throw new Error("לא נמצאו מוצרים תקינים בקובץ.");
  }

  return importedFoods;
}

function readText(value: unknown): string {
  return String(value ?? "").trim();
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || String(value).trim() === "") return undefined;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  }

  const normalizedValue = String(value ?? "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : undefined;
}
