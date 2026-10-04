"use client";

import { useState } from "react";
import { ChevronLeft, Target } from "lucide-react";
import BottomSheet from "@/components/client/BottomSheet";
import ProfileNutritionGoals, { type ProfileNutritionGoalsProps } from "@/components/client/ProfileNutritionGoals";

export default function ProfileNutritionGoalsSheet(props: ProfileNutritionGoalsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="settings-group__label"><Target aria-hidden="true" size={18} />שינוי מטרה ויעדים</span>
        <ChevronLeft aria-hidden="true" size={18} />
      </button>
      <BottomSheet open={open} title="המטרה והיעדים שלי" onClose={() => setOpen(false)} placement="top">
        <ProfileNutritionGoals {...props} />
      </BottomSheet>
    </>
  );
}
