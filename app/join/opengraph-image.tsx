import { ImageResponse } from "next/og";

export const alt = "LIFE FIT — אימונים, תזונה ומעקב במקום אחד";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      dir="rtl"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 56,
        background: "#0a0c0b",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 54, border: "1px solid #26352a", borderRadius: 44, background: "linear-gradient(135deg, #0b0d0c 45%, #12371f)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#b7ff3c", fontSize: 30, fontWeight: 800 }}>LIFE FIT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", border: "1px solid #3f6a49", borderRadius: 999, color: "#d7e1da", fontSize: 20 }}>הכול במקום אחד</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 900, fontSize: 70, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-2px" }}><span>אימונים, תזונה ומעקב.</span><span style={{ color: "#b7ff3c" }}>דרך ברורה להתקדם.</span></div>
          <div style={{ color: "#b8c0ba", fontSize: 28 }}>תוכנית מסודרת, תמונת התקדמות ונתוני פעילות יומית בקצב שלכם.</div>
        </div>
      </div>
    </div>,
    size,
  );
}
