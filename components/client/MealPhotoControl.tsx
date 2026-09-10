"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { Camera, Images, Trash2 } from "lucide-react";
import { deleteMealPhoto, saveMealPhoto, type SaveState } from "@/app/actions/product";
import { replaceInputFile, shrinkImage } from "@/lib/images/shrink";
import SubmitButton from "@/components/forms/SubmitButton";

const initial: SaveState = { ok: false };

export default function MealPhotoControl({ mealId, date, photoUrl }: { mealId: string; date: string; photoUrl?: string | null }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const cameraForm = useRef<HTMLFormElement>(null);
  const galleryForm = useRef<HTMLFormElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [saveState, saveAction] = useActionState(saveMealPhoto, initial);
  const [deleteState, deleteAction] = useActionState(deleteMealPhoto, initial);

  const chosen = async (input: HTMLInputElement, form: HTMLFormElement | null) => {
    const file = input.files?.[0];
    if (!file) return;
    setPreparing(true);
    const prepared = await shrinkImage(file);
    if (prepared !== file) replaceInputFile(input, prepared);
    setPreparing(false);
    form?.requestSubmit();
  };

  return <div className="w-full rounded-2xl border border-[#DCE3DC] bg-white p-3 sm:w-auto sm:min-w-[290px]">
    <div className="flex flex-wrap items-center gap-2">
      <strong className="ml-auto text-sm">תמונה של הארוחה</strong>
      <form ref={cameraForm} action={saveAction}>
        <input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="date" value={date}/>
        <input ref={camera} className="sr-only" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event)=>void chosen(event.currentTarget, cameraForm.current)}/>
      </form>
      <form ref={galleryForm} action={saveAction}>
        <input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="date" value={date}/>
        <input ref={gallery} className="sr-only" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>void chosen(event.currentTarget, galleryForm.current)}/>
      </form>
      <button type="button" className="chip" disabled={preparing} onClick={()=>camera.current?.click()}><Camera size={15}/>{preparing ? "מכינים…" : "צילום"}</button>
      <button type="button" className="chip" disabled={preparing} onClick={()=>gallery.current?.click()}><Images size={15}/>גלריה</button>
    </div>
    {photoUrl ? <div className="mt-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#F3F5F3]"><Image src={photoUrl} alt="תמונת הארוחה" fill sizes="(max-width: 640px) 90vw, 300px" className="object-cover" unoptimized/></div>
      <form action={deleteAction} className="mt-2"><input type="hidden" name="mealId" value={mealId}/><input type="hidden" name="date" value={date}/><SubmitButton idle="מחיקת התמונה" pending="מוחקים…" className="chip border-[#DC2626] text-[#DC2626]" icon={<Trash2 size={15}/>}/></form>
    </div> : null}
    {(saveState.message || deleteState.message) ? <p aria-live="polite" className={`mt-2 text-xs ${(saveState.ok || deleteState.ok) ? "text-[#168A46]" : "text-[#DC2626]"}`}>{deleteState.message ?? saveState.message}</p> : null}
  </div>;
}
