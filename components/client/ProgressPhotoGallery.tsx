"use client";

import { useMemo, useState } from "react";
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
    return <p role="alert" className="rounded-[24px] border border-red-900/50 p-5 text-red-300">לא ניתן לטעון את גלריית התמונות כרגע.</p>;
  if (!sessions.length)
    return <p className="rounded-[24px] border border-dashed border-[#E5E7E5] p-8 text-center text-[#5B5F5B]">עדיין אין תמונות התקדמות.</p>;
  const first = byId.get(firstId) ?? sessions[0];
  const second = byId.get(secondId) ?? sessions[0];
  return (
    <section className="rounded-[24px] border border-[#E5E7E5] bg-[#FFFFFF] p-5">
      <h2 className="text-xl font-black">תמונות התקדמות</h2>
      <p className="mt-1 text-sm text-[#5B5F5B]">גלריה והשוואה בין שני מועדים.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DateSelect label="מועד ראשון" value={first.checkInId} sessions={sessions} onChange={setFirstId}/>
        <DateSelect label="מועד שני" value={second.checkInId} sessions={sessions} onChange={setSecondId}/>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {[first, second].map((session, index) => (
          <article key={`${index}-${session.checkInId}`} className="rounded-2xl border border-[#E5E7E5] p-4">
            <h3 className="font-black">{dateLabel(session.submittedAt)}</h3>
            <CheckInPhotoGallery photos={session.photos}/>
          </article>
        ))}
      </div>
      <div className="mt-6 space-y-5">
        {sessions.map((session) => (
          <article key={session.checkInId}>
            <h3 className="font-black">{dateLabel(session.submittedAt)}</h3>
            <CheckInPhotoGallery photos={session.photos}/>
          </article>
        ))}
      </div>
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
