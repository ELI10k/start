import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reviewWorkoutCycle } from "@/app/actions/workout-cycles";
type Change = { from?: string; to?: string; reason?: string };
type Proposal = {
  id: string;
  cycle_start: string;
  cycle_end: string;
  completed_workouts: number;
  expected_workouts: number;
  completion_percent: number;
  status: string;
  changes: Change[] | null;
  profiles: { full_name: string | null } | null;
  workout_programs: { name: string | null } | null;
};
const formatDate=(value:string)=>value.split("-").reverse().join(".");
function groupedChanges(changes:Change[]|null){
  const groups=new Map<string,{from:string;to:string;reason:string;count:number}>();
  for(const change of changes??[]){
    const from=change.from??"לא הוגדר",to=change.to??"לא הוגדר",reason=change.reason??"התאמת המחזור הבא";
    const key=`${from}|${to}|${reason}`;const current=groups.get(key);
    groups.set(key,current?{...current,count:current.count+1}:{from,to,reason,count:1});
  }
  return [...groups.values()];
}
export default async function Page() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const s = await createSupabaseServerClient();
  const { data } = await s
    .from("workout_cycle_proposals")
    .select(
      "id,client_id,cycle_start,cycle_end,completed_workouts,expected_workouts,completion_percent,status,changes,created_at,profiles!workout_cycle_proposals_client_id_fkey(full_name),workout_programs!workout_cycle_proposals_current_program_id_fkey(name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const proposals = (data ?? []) as unknown as Proposal[];
  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/coach/workouts"
          className="text-sm font-bold text-[#16A34A]"
        >
          חזרה לתוכניות
        </Link>
        <h1 className="mt-3 text-3xl font-black">הצעות למחזור האימונים הבא</h1>
        <p className="mt-2 text-[#5B5F5B]">
          לאחר ארבעה שבועות המערכת בודקת התמדה ומציעה התאמה למחזור הבא. שום דבר לא משתנה אצל הלקוח לפני האישור שלך.
        </p>
        {!proposals.length ? (
          <section className="mt-6 rounded-[24px] border border-dashed border-[#C9CDC9] bg-white p-10 text-center">
            <h2 className="text-xl font-black">
              אין כרגע לקוחות שהשלימו מחזור
            </h2>
            <p className="mt-2 text-sm text-[#5B5F5B]">
              הצעה תופיע לאחר ארבעה שבועות ולפחות 80% מהאימונים.
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-4">
            {proposals.map((p) => (
              <article
                key={p.id}
                className="rounded-[24px] border border-[#E5E7E5] bg-white p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">
                      {p.profiles?.full_name ?? "לקוח"}
                    </h2>
                    <p className="text-sm text-[#5B5F5B]">
                      {p.workout_programs?.name} · המחזור שנבדק: {formatDate(p.cycle_start)}–{formatDate(p.cycle_end)}
                    </p>
                  </div>
                  <strong className="text-[#16A34A]">
                    {p.completed_workouts}/{p.expected_workouts} ·{" "}
                    {p.completion_percent}%
                  </strong>
                </div>
                <div className="mt-4 rounded-xl bg-[#ECFDF3] p-4 text-sm">
                  <strong>למה נוצרה ההצעה?</strong>
                  <p className="mt-1">הלקוח השלים {p.completed_workouts} מתוך {p.expected_workouts} אימונים במחזור — {p.completion_percent}% התמדה.</p>
                </div>
                <div className="mt-3 rounded-xl bg-[#F7F8F7] p-4 text-sm">
                  <strong>מה יישאר כפי שהוא?</strong>
                  <p className="mt-1 text-[#5B5F5B]">אותה תוכנית, אותם ימי אימון ואותם תרגילים. רק טווחי החזרות המפורטים כאן משתנים.</p>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <strong>מה מוצע לשנות?</strong>
                  {groupedChanges(p.changes).map((change) => (
                    <div key={`${change.from}-${change.to}-${change.reason}`} className="rounded-xl border border-[#E5E7E5] p-4">
                      <p><strong>{change.count} {change.count===1?"תרגיל":"תרגילים"}:</strong> מעבר מ־{change.from} חזרות ל־{change.to} חזרות בכל סט.</p>
                      <p className="mt-1 text-[#5B5F5B]">בפועל: פחות חזרות בטווח החדש ובחירת משקל עבודה מתאים, תוך שמירה על טכניקה טובה.</p>
                    </div>
                  ))}
                </div>
                {p.status === "pending" ? (
                  <form action={reviewWorkoutCycle} className="mt-4">
                    <input type="hidden" name="id" value={p.id} />
                    <textarea
                      name="note"
                      className="nutrition-input min-h-20"
                      placeholder="הערת מאמן (רשות)"
                    />
                    <label className="mt-3 flex items-start gap-2 rounded-xl border border-[#E5E7E5] p-3 text-sm"><input type="checkbox" name="confirmed" value="yes" required className="mt-1"/><span><strong className="block">בדקתי את השינויים ואת מועד המחזור</strong><span className="text-xs text-[#5B5F5B]">באישור תיווצר התוכנית המוצעת והיא תישלח ללקוח.</span></span></label>
                    <div className="mt-3 flex gap-2">
                      <button
                        name="decision"
                        value="approve"
                        className="premium-primary-button"
                      >
                        אישור ופתיחת המחזור הבא
                      </button>
                      <button
                        name="decision"
                        value="reject"
                        formNoValidate
                        className="premium-secondary-button"
                      >
                        דחיית ההצעה
                      </button>
                    </div>
                  </form>
                ) : (
                  <span className="mt-4 inline-flex rounded-full border px-3 py-1 text-xs">
                    {p.status === "approved" ? "אושרה ונשלחה" : "נדחתה"}
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
