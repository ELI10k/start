import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCheck, ChevronLeft } from "lucide-react";
import CoachCheckInCard from "@/components/coach/CoachCheckInCard";
import { StateBlock } from "@/components/client/AppPatterns";
import { listResponseTemplates } from "@/app/actions/response-templates";
import { getAuthContext, listCoachCheckIns } from "@/lib/data/product-repository";

/**
 * The weekly pass over the check-ins, one at a time.
 *
 * The list screen shows everything at once, which is right for looking something
 * up and wrong for the job a coach actually does on a Sunday: answer each new
 * check-in, in turn, until there are none left. There the answered and the
 * unanswered look alike, there is no sense of how many are left, and after each
 * response the coach has to find their place again.
 *
 * This is the same cards and the same actions, filtered to what still needs a
 * reply and shown one per screen with the count in the header.
 */
export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ position?: string; id?: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  const [data, templates] = await Promise.all([
    listCoachCheckIns(auth.id, { status: "all" }),
    listResponseTemplates(),
  ]);

  // Anything not yet marked handled is still work, whether or not a response has
  // been written - a coach who replied but did not close it meant to come back.
  const queue = data.items.filter((item) => !item.handled_at);
  const params = await searchParams;
  // The place in the queue is a check-in, not an index.
  //
  // Marking one handled removes it from the queue, so every later check-in
  // shifts down one - and a coach working straight down the list with a
  // position-based link skipped whoever moved into the slot they had just left.
  // The id is carried instead, and the index is only ever derived from it.
  const byId = params.id ? queue.findIndex((item) => item.id === params.id) : -1;
  const position = byId >= 0
    ? byId
    // A named check-in that is no longer in the queue is one that was just
    // handled: the coach stays where they are, which is now the next one.
    : Math.min(Math.max(0, Number(params.position) || 0), Math.max(0, queue.length - 1));
  const current = queue[position];

  const hrefFor = (target: number) =>
    queue[target] ? `/coach/check-ins/review?id=${queue[target].id}` : `/coach/check-ins/review?position=${target}`;

  return (
    <main className="client-app-content">
      <header className="premium-page-header">
        <div>
          <p>START COACH</p>
          <h1>מעבר על צ׳ק־אינים</h1>
          <span>{queue.length ? `${position + 1} מתוך ${queue.length} שממתינים לטיפול` : "אין צ׳ק־אינים שממתינים"}</span>
        </div>
        <Link href="/coach/check-ins" className="premium-secondary-button">לרשימה המלאה</Link>
      </header>

      {current ? (
        <>
          {/* The progress bar answers "how much longer", which is the question
              that decides whether this gets done now or on Thursday. */}
          <div className="premium-progress" role="img" aria-label={`${position + 1} מתוך ${queue.length}`}>
            <div className="premium-progress__track">
              <span style={{ width: `${((position + 1) / queue.length) * 100}%` }} />
            </div>
          </div>

          <CoachCheckInCard
            item={current}
            photoError={data.photoError}
            templates={templates}
          />

          <nav className="session-actions mt-4" aria-label="מעבר בין צ׳ק־אינים">
            <Link
              href={hrefFor(position - 1)}
              aria-disabled={position === 0}
              className="premium-secondary-button"
              style={position === 0 ? { pointerEvents: "none", opacity: 0.4 } : undefined}
            >
              הקודם
            </Link>
            <Link
              href={hrefFor(position + 1)}
              aria-disabled={position >= queue.length - 1}
              className="premium-primary-button"
              style={position >= queue.length - 1 ? { pointerEvents: "none", opacity: 0.4 } : undefined}
            >
              הבא<ChevronLeft aria-hidden="true" size={17} />
            </Link>
          </nav>
          <p className="mt-2 text-center text-xs text-[#5B5F5B]">
            סימון „טופל” מוציא את הצ׳ק־אין מהתור. אפשר לחזור אליו תמיד מהרשימה המלאה.
          </p>
        </>
      ) : (
        <StateBlock
          tone="success"
          icon={<CheckCheck aria-hidden="true" size={22} />}
          title="עברת על הכול"
          description="אין צ׳ק־אינים שממתינים לטיפול. כשיגיע חדש הוא יופיע כאן."
          action={<Link href="/coach" className="premium-primary-button">חזרה ל־Dashboard</Link>}
        />
      )}
    </main>
  );
}
