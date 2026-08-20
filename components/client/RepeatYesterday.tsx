"use client";

import { CopyCheck } from "lucide-react";
import { repeatYesterdaySelections } from "@/app/actions/product";
import SubmitButton from "@/components/forms/SubmitButton";

/**
 * One tap for "the same as yesterday".
 *
 * A five-meal menu with four groups is twenty taps to say something the client
 * says most days. It only appears while there is something for it to do - once
 * every group has a choice, the button has no work and is not offered.
 *
 * It never overwrites: the database skips any group already chosen today, so a
 * client who picked two meals by hand and then pressed this gets the other three
 * filled and keeps their two.
 */
export default function RepeatYesterday({ date, remaining }: { date: string; remaining: number }) {
  if (remaining <= 0) return null;
  return (
    <form action={repeatYesterdaySelections} className="mb-3">
      <input type="hidden" name="date" value={date} />
      <SubmitButton
        idle={`כמו אתמול · השלמת ${remaining} בחירות`}
        pending="ממלאים…"
        className="chip"
        icon={<CopyCheck aria-hidden="true" size={15} />}
        event="selections_repeated"
      />
    </form>
  );
}
