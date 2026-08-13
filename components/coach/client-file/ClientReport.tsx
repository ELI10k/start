import type { ClientReport } from "@/lib/coach-intelligence/client-report";

// Eight sections, and a visual line between the three kinds of statement.
//
// A number the database holds, a direction derived from two of them, and a
// suggestion are not the same thing, and a coach reading quickly must not have to
// work out which is which. Facts are plain, trends carry their two points, and
// every recommendation shows the figures underneath it in smaller grey type.

const TONE = {
  fact: "border-[#E5E7E5] bg-[#FFFFFF]",
  positive: "border-[#16A34A]/30 bg-[#ECFDF3]",
  attention: "border-[#DC2626]/30 bg-[#FEF2F2]",
} as const;

function Block({ title, kind = "fact", children }: { title: string; kind?: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border p-4 ${TONE[kind]}`}>
      <h3 className="text-sm font-black text-[#0B0B0B]">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Points({ points, empty }: { points: readonly { text: string; basis: string }[]; empty: string }) {
  if (!points.length) return <p className="text-sm text-[#5B5F5B]">{empty}</p>;
  return (
    <ul className="grid gap-3">
      {points.map((point) => (
        <li key={`${point.text}${point.basis}`}>
          <p className="text-sm">{point.text}</p>
          {/* The figures the line came from. A recommendation without them is an
              opinion, and this report does not carry opinions. */}
          <p className="mt-0.5 text-xs text-[#5B5F5B]">מבוסס על: {point.basis}</p>
        </li>
      ))}
    </ul>
  );
}

export default function ClientReportView({ report }: { report: ClientReport }) {
  return (
    <div className="grid gap-3">
      {report.referral && (
        <p role="alert" className="rounded-2xl border border-[#DC2626] bg-[#FEF2F2] p-4 text-sm font-bold text-[#DC2626]">
          {report.referral}
        </p>
      )}

      <Block title="1 · נתונים שנאספו">
        <dl className="compact-data-list">
          {report.facts.map((fact) => (
            <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>
          ))}
        </dl>
        {report.missing.length > 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-[#E5E7E5] p-3">
            <p className="text-xs font-bold text-[#3F433F]">מה חסר</p>
            <ul className="mt-1 grid gap-1 text-xs text-[#5B5F5B]">
              {report.missing.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </div>
        )}
      </Block>

      <Block title="2 · מגמות לעומת התקופה הקודמת">
        {report.trends.length ? (
          <ul className="grid gap-2">
            {report.trends.map((trend) => (
              <li key={trend.label} className="text-sm">
                <strong>{trend.label}:</strong> {trend.detail}
                <span className="mt-0.5 block text-xs text-[#5B5F5B]">{trend.basis}</span>
              </li>
            ))}
          </ul>
        ) : (
          // Never a line drawn through one dot.
          <p className="text-sm text-[#5B5F5B]">אין עדיין שתי נקודות זמן להשוואה, ולכן לא מוצגת מגמה.</p>
        )}
      </Block>

      <Block title="3 · נקודות חיוביות" kind="positive">
        <Points points={report.positives} empty="אין עדיין נתונים שמצדיקים ציון חיובי."/>
      </Block>

      <Block title="4 · דורש תשומת לב" kind="attention">
        <Points points={report.attention} empty="לא נמצאו סימנים שדורשים תשומת לב בנתונים הקיימים."/>
      </Block>

      <Block title="5 · המלצות תזונה">
        <Points points={report.nutrition} empty="אין מספיק נתונים להמלצת תזונה."/>
      </Block>

      <Block title="6 · המלצות אימונים">
        <Points points={report.workouts} empty="אין מספיק נתונים להמלצת אימון."/>
      </Block>

      <Block title="7 · שאלות ללקוח">
        {report.questions.length ? (
          <ul className="grid gap-1 text-sm">{report.questions.map((question) => <li key={question}>· {question}</li>)}</ul>
        ) : <p className="text-sm text-[#5B5F5B]">אין שאלות שעולות מהנתונים הקיימים.</p>}
      </Block>

      <Block title="8 · פעולות מוצעות לשבוע הבא">
        <Points points={report.actions} empty="אין פעולות מוצעות בהיעדר נתונים."/>
      </Block>
    </div>
  );
}
