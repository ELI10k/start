/* The library is a dark screen, so its loading state has to be one too: the
   daylight skeleton flashed white for as long as the first query took and then
   dropped to black. */
export default function Loading() {
  return (
    <main className="cinema-skeleton" role="status" aria-label="טוענים את ספריית הקורסים…">
      <div className="cinema-skeleton__block" style={{ height: "min(74svh, 34rem)", borderRadius: 0 }} />
      <div style={{ marginTop: "-3.5rem", position: "relative" }}>
        {[0, 1].map((row) => (
          <div key={row} style={{ marginTop: "1.9rem", paddingInline: "clamp(1rem, 4.2vw, 3.75rem)" }}>
            <div className="cinema-skeleton__block" style={{ height: "1.35rem", width: "9rem" }} />
            <div style={{ display: "flex", gap: ".7rem", marginTop: ".8rem", overflow: "hidden" }}>
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="cinema-skeleton__block"
                  style={{ flex: "0 0 min(72vw, 16rem)", aspectRatio: "16 / 9" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">טוענים את ספריית הקורסים…</span>
    </main>
  );
}
