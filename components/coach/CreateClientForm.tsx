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
import { GOAL_LABELS, NUTRITION_GOALS } from "@/lib/nutrition/energy";
import { TRAINEE_LEVEL_LABELS, TRAINEE_LEVELS } from "@/lib/workouts/trainee-level";

const initialState:CreateClientState={status:"idle",message:""};

export default function CreateClientForm(){
  const[state,action,pending]=useActionState(createClientFromCoach,initialState);
  return <form action={action} className="mx-auto max-w-3xl">
    <p className="text-xs font-black tracking-[.2em] text-[#16A34A]">START COACH</p>
    <h1 className="mt-2 text-3xl font-black">לקוח חדש</h1>
    <p className="mt-2 text-[#5B5F5B]">הלקוח יקבל הזמנה מאובטחת להשלמת הכניסה והקליטה.</p>
    {state.status==="error"&&<p role="alert" className="mt-5 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-4 text-sm text-[#DC2626]">{state.message}</p>}

    <section className="mt-6 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
      <h2 className="text-sm font-black text-[#3F433F] sm:col-span-2">פרטי הלקוח</h2>
      <Field label="שם מלא" name="fullName" required/>
      <Field label="אימייל" name="email" type="email" required dir="ltr"/>
      <Field label="טלפון" name="phone"/>
    </section>

    {/* Everything the calorie target is computed from, together and labelled as
        such - so it is obvious why the form asks for each one. */}
    <section className="mt-4 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-sm font-black text-[#3F433F]">נתונים לחישוב הקלוריות</h2>
        <p className="mt-1 text-xs text-[#5B5F5B]">מהם מחושבים BMR, הוצאה יומית ויעד קלורי. שדה שחסר פשוט יסומן כחסר — המערכת לא תנחש.</p>
      </div>
      <Field label="גיל" name="ageYears" type="number" min="12" max="100"/>
      <Select label="מין" name="sex" options={[["male","זכר"],["female","נקבה"]]}/>
      <Field label="משקל נוכחי (ק״ג)" name="weight" type="number" step="0.1"/>
      <Field label="גובה (ס״מ)" name="height" type="number"/>
      <Field label="אימונים בשבוע" name="weeklyWorkouts" type="number" min="1" max="14"/>
      <Field label="ממוצע צעדים יומי" name="dailySteps" type="number" min="0" max="60000" step="100"/>
      <Select label="מטרה" name="nutritionGoal" options={NUTRITION_GOALS.map(goal=>[goal,GOAL_LABELS[goal]])}/>
      <Field label="יעד משקל (ק״ג)" name="targetWeight" type="number" step="0.1"/>
    </section>

    <section className="mt-4 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
      <h2 className="text-sm font-black text-[#3F433F] sm:col-span-2">אימון</h2>
      {/* Sizes the programme, and nothing else. It is not a stand-in for the
          step count or the number of sessions, which is why it sits here rather
          than in the calorie section. */}
      <Select label="רמת מתאמן" name="traineeLevel" options={TRAINEE_LEVELS.map(level=>[level,TRAINEE_LEVEL_LABELS[level]])}/>
      <Field label="סוג אימון" name="trainingType"/>
      <Field
        label="היקף טבור התחלתי (ס״מ)"
        name="navelCircumference"
        type="number"
        min={INITIAL_NAVEL_MIN_CM}
        max={INITIAL_NAVEL_MAX_CM}
        step="0.1"
        inputMode="decimal"
      />
      <label className="block text-sm font-bold sm:col-span-2">מגבלות רפואיות או הערות<textarea name="medicalNotes" className="nutrition-input mt-2 min-h-24"/></label>
    </section>

    <button disabled={pending} className="mt-6 min-h-14 w-full rounded-2xl bg-[#16A34A] px-6 font-black text-[#FFFFFF] disabled:cursor-wait disabled:opacity-50">{pending?"יוצרים לקוח ושולחים הזמנה…":"יצירת לקוח ושליחת הזמנה"}</button>
  </form>;
}

function Field({label,name,type="text",required=false,...props}:{label:string;name:string;type?:string;required?:boolean;[key:string]:unknown}){
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="nutrition-input mt-2" {...props}/></label>;
}

function Select({label,name,options}:{label:string;name:string;options:readonly (readonly [string,string])[]}){
  return <label className="block text-sm font-bold">{label}
    <select name={name} className="nutrition-input mt-2" defaultValue="">
      <option value="">לא נבחר</option>
      {options.map(([value,text])=><option key={value} value={value}>{text}</option>)}
    </select>
  </label>;
}
