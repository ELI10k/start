"use client";

import { useActionState } from "react";
import {
  createClientFromCoach,
  type CreateClientState,
} from "@/app/actions/onboarding";
import {
  INITIAL_NAVEL_MAX_CM,
  INITIAL_NAVEL_MIN_CM,
} from "@/lib/progress/measurements";

const initialState:CreateClientState={status:"idle",message:""};

export default function CreateClientForm(){
  const[state,action,pending]=useActionState(createClientFromCoach,initialState);
  return <form action={action} className="mx-auto max-w-3xl">
    <p className="text-xs font-black tracking-[.2em] text-[#D4AF37]">START COACH</p>
    <h1 className="mt-2 text-3xl font-black">לקוח חדש</h1>
    <p className="mt-2 text-zinc-400">הלקוח יקבל הזמנה מאובטחת להשלמת הכניסה והקליטה.</p>
    {state.status==="error"&&<p role="alert" className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{state.message}</p>}
    <section className="mt-6 grid gap-4 rounded-[28px] border border-[#292929] bg-[#151515] p-5 sm:grid-cols-2">
      <Field label="שם מלא" name="fullName" required/>
      <Field label="אימייל" name="email" type="email" required dir="ltr"/>
      <Field label="טלפון" name="phone"/>
      <Field label="משקל נוכחי" name="weight" type="number" step="0.1"/>
      <Field
        label="היקף טבור התחלתי (ס״מ)"
        name="navelCircumference"
        type="number"
        min={INITIAL_NAVEL_MIN_CM}
        max={INITIAL_NAVEL_MAX_CM}
        step="0.1"
        inputMode="decimal"
      />
      <Field label="גובה" name="height" type="number"/>
      <Field label="תאריך לידה" name="birthDate" type="date"/>
      <Field label="מטרה" name="goal" required/>
      <Field label="יעד משקל" name="targetWeight" type="number" step="0.1"/>
      <Field label="רמת פעילות" name="activityLevel"/>
      <Field label="סוג אימון" name="trainingType"/>
      <Field label="אימונים בשבוע" name="weeklyWorkouts" type="number" min="1" max="14"/>
      <Field label="העדפות תזונה" name="dietaryPreferences"/>
      <Field label="מאכלים שלא אוהב" name="foodDislikes"/>
      <label className="sm:col-span-2">מגבלות רפואיות או הערות<textarea name="medicalNotes" className="nutrition-input mt-2 min-h-24"/></label>
    </section>
    <button disabled={pending} className="mt-6 min-h-14 w-full rounded-2xl bg-[#D4AF37] px-6 font-black text-black disabled:cursor-wait disabled:opacity-50">{pending?"יוצרים לקוח ושולחים הזמנה…":"יצירת לקוח ושליחת הזמנה"}</button>
  </form>;
}

function Field({label,name,type="text",required=false,...props}:{label:string;name:string;type?:string;required?:boolean;[key:string]:unknown}){
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="nutrition-input mt-2" {...props}/></label>;
}
