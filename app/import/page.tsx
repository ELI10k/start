"use client";

import { ChangeEvent, CSSProperties, useState } from "react";
import type { Food } from "@/lib/foods";
import { parseFoodRows } from "@/lib/food-import";

export default function ImportFoodsPage() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const XLSX = await import("xlsx");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(
        worksheet,
        {
          header: 1,
          defval: "",
        },
      );

      setFoods(parseFoodRows(rawRows));
    } catch (caughtError) {
      setFoods([]);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "קרתה שגיאה בקריאת הקובץ.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function clearImport() {
    setFoods([]);
    setFileName("");
    setError("");
  }

  return (
    <main style={pageStyle}>
      <section style={containerStyle}>
        <div style={headerStyle}>
          <div>
            <span style={eyebrowStyle}>
              START FOOD IMPORT
            </span>

            <h1 style={titleStyle}>
              ייבוא מאגר מזונות
            </h1>

            <p style={descriptionStyle}>
              העלה קובץ Excel כדי לבדוק את מבנה
              הנתונים לפני עדכון המאגר הקבוע.
            </p>
          </div>

          <div style={countCardStyle}>
            <strong style={countNumberStyle}>
              {foods.length}
            </strong>

            <span style={countLabelStyle}>
              מוצרים
            </span>
          </div>
        </div>

        <label style={uploadBoxStyle}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={hiddenInputStyle}
          />

          <span style={uploadIconStyle}>↑</span>

          <strong style={uploadTitleStyle}>
            בחר קובץ Excel
          </strong>

          <span style={uploadDescriptionStyle}>
            לחץ כאן ובחר את מאגר המזונות
          </span>

          {fileName && (
            <span style={fileNameStyle}>
              {fileName}
            </span>
          )}
        </label>

        {isLoading && (
          <div style={messageStyle}>
            קורא את הקובץ...
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {foods.length > 0 && (
          <>
            <div style={actionsStyle}>
              <button
                type="button"
                onClick={clearImport}
                style={secondaryButtonStyle}
              >
                נקה תצוגה
              </button>
            </div>

            <div style={previewHeaderStyle}>
              <h2 style={previewTitleStyle}>
                תצוגה מקדימה
              </h2>

              <span style={previewSubtitleStyle}>
                20 המוצרים הראשונים
              </span>
            </div>

            <div style={tableWrapperStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>מוצר</th>
                    <th style={tableHeaderStyle}>מותג</th>
                    <th style={tableHeaderStyle}>קטגוריה</th>
                    <th style={tableHeaderStyle}>קלוריות</th>
                    <th style={tableHeaderStyle}>חלבון</th>
                  </tr>
                </thead>

                <tbody>
                  {foods.slice(0, 20).map((food) => (
                    <tr key={food.id}>
                      <td style={tableCellStrongStyle}>
                        {food.name}
                      </td>

                      <td style={tableCellStyle}>
                        {food.brand ?? "—"}
                      </td>

                      <td style={tableCellStyle}>
                        {food.category}
                      </td>

                      <td style={tableCellStyle}>
                        {food.calories}
                      </td>

                      <td style={tableCellStyle}>
                        {food.protein === undefined ? "—" : `${food.protein} גרם`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  direction: "rtl",
  background:
    "radial-gradient(circle at top right, rgba(212, 175, 55, 0.08), transparent 32%), #FFFFFF",
  color: "#F4F4F4",
  padding: "32px 20px 100px",
  fontFamily: "Assistant, sans-serif",
};

const containerStyle: CSSProperties = {
  width: "min(100%, 1000px)",
  margin: "0 auto",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "24px",
  marginBottom: "28px",
};

const eyebrowStyle: CSSProperties = {
  display: "block",
  marginBottom: "8px",
  color: "#16A34A",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1.5px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: "40px",
  lineHeight: 1.1,
};

const descriptionStyle: CSSProperties = {
  margin: "10px 0 0",
  color: "#969696",
  fontSize: "15px",
};

const countCardStyle: CSSProperties = {
  minWidth: "100px",
  padding: "14px 18px",
  border: "1px solid #E5E7E5",
  borderRadius: "18px",
  background: "#FFFFFF",
  textAlign: "center",
};

const countNumberStyle: CSSProperties = {
  display: "block",
  color: "#22C55E",
  fontSize: "24px",
};

const countLabelStyle: CSSProperties = {
  color: "#858585",
  fontSize: "12px",
};

const uploadBoxStyle: CSSProperties = {
  display: "flex",
  minHeight: "220px",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px",
  border: "1px dashed #8B6B1F",
  borderRadius: "24px",
  background: "#FFFFFF",
  cursor: "pointer",
  textAlign: "center",
};

const hiddenInputStyle: CSSProperties = {
  display: "none",
};

const uploadIconStyle: CSSProperties = {
  display: "grid",
  width: "54px",
  height: "54px",
  placeItems: "center",
  marginBottom: "16px",
  borderRadius: "50%",
  background: "rgba(212, 175, 55, 0.12)",
  color: "#22C55E",
  fontSize: "30px",
};

const uploadTitleStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: "21px",
};

const uploadDescriptionStyle: CSSProperties = {
  marginTop: "6px",
  color: "#8B8B8B",
  fontSize: "14px",
};

const fileNameStyle: CSSProperties = {
  marginTop: "15px",
  padding: "7px 13px",
  borderRadius: "999px",
  background: "rgba(212, 175, 55, 0.09)",
  color: "#22C55E",
  fontSize: "13px",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  marginTop: "22px",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: "48px",
  padding: "0 24px",
  border: "1px solid #353535",
  borderRadius: "14px",
  background: "#FFFFFF",
  color: "#D0D0D0",
  fontFamily: "inherit",
  fontSize: "15px",
  fontWeight: 700,
  cursor: "pointer",
};

const messageStyle: CSSProperties = {
  marginTop: "18px",
  padding: "15px",
  borderRadius: "14px",
  background: "#FFFFFF",
  color: "#22C55E",
  textAlign: "center",
};

const errorStyle: CSSProperties = {
  marginTop: "18px",
  padding: "15px",
  border: "1px solid rgba(255, 80, 80, 0.35)",
  borderRadius: "14px",
  background: "rgba(255, 80, 80, 0.08)",
  color: "#FF9C9C",
};

const previewHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  margin: "34px 0 14px",
};

const previewTitleStyle: CSSProperties = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: "24px",
};

const previewSubtitleStyle: CSSProperties = {
  color: "#777777",
  fontSize: "13px",
};

const tableWrapperStyle: CSSProperties = {
  overflowX: "auto",
  border: "1px solid #E5E7E5",
  borderRadius: "20px",
  background: "#FFFFFF",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: "720px",
};

const tableHeaderStyle: CSSProperties = {
  padding: "15px",
  borderBottom: "1px solid #303030",
  color: "#16A34A",
  fontSize: "13px",
  textAlign: "right",
};

const tableCellStyle: CSSProperties = {
  padding: "14px 15px",
  borderBottom: "1px solid #242424",
  color: "#AFAFAF",
  fontSize: "14px",
};

const tableCellStrongStyle: CSSProperties = {
  ...tableCellStyle,
  color: "#FFFFFF",
  fontWeight: 700,
};
