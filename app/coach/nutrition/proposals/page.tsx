import Link from "next/link";
import { redirect } from "next/navigation";
import { reviewNutritionProposal } from "@/app/actions/nutrition-proposals";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatIsraelDate } from "@/lib/date-time";

/**
 * What the last fortnight is asking the coach to change.
 *
 * The mirror of /coach/workouts/cycles, for the side of the product that
 * collects the most and acted on the least. Every row carries the numbers it was
 * derived from, because a proposal a coach cannot check is a proposal a coach
 * cannot approve - and the number is editable before it is applied.
 */

type Proposal = {
  id: string;
  kind: "portion" | "calorie_target" | "meal_missed";
  title: string;
  current_value: number | null;
  proposed_value: number | null;
  unit: string | null;
  evidence: string[] | null;
  status: "pending" | "approved" | "rejected" | "acknowledged";
  window_start: string;
  window_end: string;
  applied_value: number | null;
  coach_note: string | null;
  profiles: { full_name: string } | null;
};

const decided: Record<Proposal["status"], string> = {
  pending: "",
  approved: "אושרה והוחלה",
  rejected: "נדחתה",
  acknowledged: "נקראה",
};

export default async function NutritionProposalsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("nutrition_adaptation_proposals")
    .select("id,kind,title,current_value,proposed_value,unit,evidence,status,window_start,window_end,applied_value,coach_note,profiles!nutrition_adaptation_proposals_client_id_fkey(full_name)")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);
  const proposals = (data ?? []) as unknown as Proposal[];
  const pending = proposals.filter((item) => item.status === "pending");
  const answered = proposals.filter((item) => item.status !== "pending");

  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/coach" className="text-sm font-bold text-[#16A34A]">חזרה ללוח</Link>
        <h1 className="mt-3 text-3xl font-black">התפריט מבקש עדכון</h1>
        <p className="mt-2 text-[#5B5F5B]">
          נגזר מ־14 הימים האחרונים של הלקוח: כמויות שתוקנו שוב ושוב, ארוחות שלא נאכלות, ומגמת משקל מול היעד.
          ההצעות גלויות למאמן בלבד ולא משנות דבר עד אישור.
        </p>

        {!pending.length ? (
          <section className="mt-6 rounded-[24px] border border-dashed border-[#C9CDC9] bg-white p-10 text-center">
            <h2 className="text-xl font-black">אין כרגע מה לעדכן</h2>
            <p className="mt-2 text-sm text-[#5B5F5B]">
              הצעה נכתבת רק כשיש מספיק ימים שתומכים בה. שבועיים שקטים הם תשובה תקינה.
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-4">
            {pending.map((proposal) => (
              <article key={proposal.id} className="rounded-[24px] border border-[#E5E7E5] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-black">{proposal.profiles?.full_name ?? "לקוח"}</h2>
                    <p className="text-sm text-[#5B5F5B]">
                      {proposal.title} · {formatIsraelDate(`${proposal.window_start}T12:00:00Z`)}–{formatIsraelDate(`${proposal.window_end}T12:00:00Z`)}
                    </p>
                  </div>
                  {proposal.proposed_value !== null && proposal.current_value !== null ? (
                    <strong className="text-[#16A34A]">
                      {proposal.current_value} ← {proposal.proposed_value} {proposal.unit}
                    </strong>
                  ) : (
                    <span className="pill">לשיחה, לא לשינוי</span>
                  )}
                </div>

                <ul className="mt-4 space-y-2 text-sm">
                  {(proposal.evidence ?? []).map((line, index) => (
                    <li key={index} className="rounded-xl bg-[#F7F8F7] p-3">{line}</li>
                  ))}
                </ul>

                <form action={reviewNutritionProposal} className="mt-4">
                  <input type="hidden" name="id" value={proposal.id} />
                  {proposal.proposed_value !== null ? (
                    <label className="block text-sm font-bold">
                      הכמות שתוחל
                      <input
                        name="value"
                        type="number"
                        step="0.5"
                        min="0"
                        defaultValue={String(proposal.proposed_value)}
                        className="nutrition-input mt-1"
                      />
                    </label>
                  ) : null}
                  <textarea name="note" maxLength={500} className="nutrition-input mt-3 min-h-20" placeholder="הערת מאמן (רשות)" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {proposal.proposed_value !== null ? (
                      <button name="decision" value="approve" className="premium-primary-button">אישור והחלה על התפריט</button>
                    ) : (
                      <button name="decision" value="acknowledge" className="premium-primary-button">קראתי, סגור את זה</button>
                    )}
                    <button name="decision" value="reject" className="premium-secondary-button">דחיית ההצעה</button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}

        {answered.length ? (
          <section className="mt-8">
            <h2 className="text-xl font-black">נענו</h2>
            <div className="mt-3 space-y-2">
              {answered.map((proposal) => (
                <article key={proposal.id} className="rounded-2xl border border-[#E5E7E5] bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">{proposal.profiles?.full_name ?? "לקוח"} · {proposal.title}</span>
                    <span className="pill">
                      {decided[proposal.status]}
                      {proposal.status === "approved" && proposal.applied_value !== null
                        ? ` · ${proposal.applied_value} ${proposal.unit ?? ""}`
                        : ""}
                    </span>
                  </div>
                  {proposal.coach_note ? <p className="mt-2 text-[#5B5F5B]">{proposal.coach_note}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
