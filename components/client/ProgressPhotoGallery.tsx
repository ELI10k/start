"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Images } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import CheckInPhotoGallery, {
  type CheckInPhoto,
} from "@/components/client/CheckInPhotoGallery";

export type ProgressPhotoSession = Readonly<{
  checkInId: string;
  submittedAt: string;
  photos: readonly CheckInPhoto[];
}>;

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function ProgressPhotoGallery({
  sessions,
  error = false,
}: {
  sessions: readonly ProgressPhotoSession[];
  error?: boolean;
}) {
  const [firstId, setFirstId] = useState(sessions.at(1)?.checkInId ?? sessions[0]?.checkInId ?? "");
  const [secondId, setSecondId] = useState(sessions[0]?.checkInId ?? "");
  const byId = useMemo(
    () => new Map(sessions.map((session) => [session.checkInId, session])),
    [sessions],
  );
  if (error)
    return <StateBlock tone="error" icon={<AlertTriangle aria-hidden="true" size={22}/>} title="לא ניתן לטעון את גלריית התמונות כרגע" description="הקישורים לתמונות פגי תוקף. רענון הדף ייצור קישורים חדשים."/>;
  if (!sessions.length)
    return <StateBlock icon={<Images aria-hidden="true" size={22}/>} title="עדיין אין תמונות התקדמות" description="תמונות שתצרף לצ׳ק־אין יופיעו כאן ויהיה אפשר להשוות בין מועדים."/>;
  if (sessions.length === 1) {
    const onlySession = sessions[0];
    return (
      <section className="premium-card" aria-labelledby="progress-photos">
        <h2 id="progress-photos" className="text-xl font-black">תמונות התקדמות</h2>
        <p className="mt-1 text-sm text-[#5B5F5B]">נשמר מועד אחד. לאחר העלאה נוספת יהיה אפשר להשוות בין שני מועדים.</p>
        <article className="mt-5 rounded-2xl border border-[#E5E7E5] p-4">
          <h3 className="font-black">{dateLabel(onlySession.submittedAt)}</h3>
          <CheckInPhotoGallery photos={onlySession.photos}/>
        </article>
      </section>
    );
  }
  const first = byId.get(firstId) ?? sessions[0];
  const second = byId.get(secondId) ?? sessions[0];
  return (
    <section className="premium-card" aria-labelledby="progress-photos">
      <h2 id="progress-photos" className="text-xl font-black">תמונות התקדמות</h2>
      <p className="mt-1 text-sm text-[#5B5F5B]">גלריה והשוואה בין שני מועדים.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DateSelect label="מועד ראשון" value={first.checkInId} sessions={sessions} onChange={setFirstId}/>
        <DateSelect label="מועד שני" value={second.checkInId} sessions={sessions} onChange={setSecondId}/>
      </div>
      {/* The comparison stacks on a phone: two three-photo grids side by side would
          make every photo a thumbnail too small to judge anything by. */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[first, second].map((session, index) => (
          <article key={`${index}-${session.checkInId}`} className="rounded-2xl border border-[#E5E7E5] p-4">
            <h3 className="font-black">{dateLabel(session.submittedAt)}</h3>
            <CheckInPhotoGallery photos={session.photos}/>
          </article>
        ))}
      </div>

      <details className="disclosure mt-5">
        <summary>כל המועדים<span className="pill">{sessions.length}</span></summary>
        <div className="disclosure__body grid gap-4">
          {sessions.map((session) => (
            <article key={session.checkInId}>
              <h3 className="font-black">{dateLabel(session.submittedAt)}</h3>
              <CheckInPhotoGallery photos={session.photos}/>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
}

function DateSelect({
  label,
  value,
  sessions,
  onChange,
}: {
  label: string;
  value: string;
  sessions: readonly ProgressPhotoSession[];
  onChange: (value: string) => void;
}) {
  return <label className="text-sm font-bold">{label}<select className="nutrition-input mt-2" value={value} onChange={(event)=>onChange(event.target.value)}>{sessions.map((session)=><option key={session.checkInId} value={session.checkInId}>{dateLabel(session.submittedAt)}</option>)}</select></label>;
}
