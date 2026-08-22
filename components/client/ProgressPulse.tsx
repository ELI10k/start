import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { motivationLine, progressChanges, type ProgressReading } from "@/lib/progress/changes";

// The two numbers off the measurements screen, on the screen the client opens
// every day - and a sentence that says what they mean.
//
// Not a move: the measurements screen keeps them, along with the charts and the
// history that give them context. This is the reflection. A client who is three
// kilos down and does not know it is a client who is about to stop.
export default function ProgressPulse({ entries }: { entries: readonly ProgressReading[] }) {
  const changes = progressChanges(entries);
  const { weightChange, navelChange } = changes;

  return (
    <Link href="/progress" className="progress-pulse">
      <span className="progress-pulse__line">{motivationLine(changes)}</span>
      {weightChange !== null || navelChange !== null ? (
        <span className="progress-pulse__figures">
          {weightChange !== null ? (
            <Figure label="משקל" value={`${weightChange > 0 ? "+" : ""}${weightChange} ק״ג`} rising={weightChange > 0} />
          ) : null}
          {navelChange !== null ? (
            <Figure label="היקף טבור" value={`${navelChange > 0 ? "+" : ""}${navelChange} ס״מ`} rising={navelChange > 0} />
          ) : null}
        </span>
      ) : null}
    </Link>
  );
}

// Down is green and up is red for both of these, which is the direction the
// measurements screen already reads them in.
function Figure({ label, value, rising }: { label: string; value: string; rising: boolean }) {
  return (
    <span className="progress-pulse__figure" data-rising={rising || undefined}>
      {rising ? <TrendingUp aria-hidden="true" size={14} /> : <TrendingDown aria-hidden="true" size={14} />}
      <span className="progress-pulse__figure-label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}
