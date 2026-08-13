"use client";

import { useActionState, useState } from "react";
import {
  createClientFromCoach,
  type CreateClientState,
} from "@/app/actions/onboarding";
import {
  INITIAL_NAVEL_MAX_CM,
  INITIAL_NAVEL_MIN_CM,
} from "@/lib/progress/measurements";
import { GOAL_LABELS, MISSING_LABELS, NUTRITION_GOALS, calculateEnergy, type NutritionGoal, type Sex } from "@/lib/nutrition/energy";
import { calculateMacroTargetResult } from "@/lib/nutrition/macro-targets";
import { PROGRAMMES_BY_LEVEL, TRAINEE_LEVEL_LABELS, TRAINEE_LEVELS, isTraineeLevel } from "@/lib/workouts/trainee-level";

const initialState:CreateClientState={status:"idle",message:""};

const number=(value?:string)=>{const parsed=Number(value);return value&&Number.isFinite(parsed)&&parsed>0?parsed:undefined};

export default function CreateClientForm(){
  const[state,action,pending]=useActionState(createClientFromCoach,initialState);
  // Read straight off the form on every keystroke rather than controlling each
  // input: the fields stay plain, and the calorie readout and the programme list
  // both work from the same snapshot.
  const[inputs,setInputs]=useState<Record<string,string>>({});
  const level=inputs.traineeLevel??"";

  // The same functions the menu builder and the server use. Nothing is
  // recalculated here - a second copy of the formula is how the two screens
  // start disagreeing about a client's target.
  const energy=calculateEnergy({
    ageYears:number(inputs.ageYears),
    weightKg:number(inputs.weight),
    heightCm:number(inputs.height),
    sex:(inputs.sex as Sex)||undefined,
    weeklyWorkouts:number(inputs.weeklyWorkouts),
    dailySteps:number(inputs.dailySteps),
    goal:(inputs.nutritionGoal as NutritionGoal)||undefined,
  });
  const macros=energy.ok?calculateMacroTargetResult(number(inputs.weight)??0,energy.calorieTarget):null;

  return <form
    action={action}
    onChange={(event)=>setInputs(Object.fromEntries([...new FormData(event.currentTarget).entries()].map(([key,value])=>[key,String(value)])))}
    className="mx-auto max-w-3xl"
  >
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
      <Field label="אימונים בשבוע" name="weeklyWorkouts" type="number" min="0" max="14"/>
      <Field label="ממוצע צעדים יומי" name="dailySteps" type="number" min="0" max="60000" step="100"/>
      <Select label="מטרה" name="nutritionGoal" options={NUTRITION_GOALS.map(goal=>[goal,GOAL_LABELS[goal]])}/>
      <Field label="יעד משקל (ק״ג)" name="targetWeight" type="number" step="0.1"/>

      {/* The target as it stands, while the coach is still typing. It used to be
          invisible until the client existed and a menu was opened, so a typo in
          the height was only caught much later - if at all. */}
      <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#E5E7E5] bg-[#F7F8F7] p-4">
        {energy.ok?<>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><dt className="text-[#5B5F5B]">BMR</dt><dd className="mt-0.5 font-black">{energy.bmr} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">מקדם פעילות</dt><dd className="mt-0.5 font-black">×{energy.activityFactor}</dd></div>
            <div><dt className="text-[#5B5F5B]">הוצאה יומית</dt><dd className="mt-0.5 font-black">{energy.tdee} קל׳</dd></div>
            <div><dt className="text-[#5B5F5B]">יעד קלורי</dt><dd className="mt-0.5 font-black text-[#16A34A]">{energy.calorieTarget} קל׳</dd></div>
          </dl>
          {macros?.ok?<dl className="mt-3 grid grid-cols-3 gap-3 border-t border-[#E5E7E5] pt-3 text-xs">
            <div><dt className="text-[#5B5F5B]">חלבון</dt><dd className="mt-0.5 font-black">{macros.targets.protein} ג׳</dd></div>
            <div><dt className="text-[#5B5F5B]">שומן</dt><dd className="mt-0.5 font-black">{macros.targets.fat} ג׳</dd></div>
            <div><dt className="text-[#5B5F5B]">פחמימות</dt><dd className="mt-0.5 font-black">{macros.targets.carbohydrates} ג׳</dd></div>
          </dl>:macros&&<p className="mt-3 border-t border-[#E5E7E5] pt-3 text-xs text-[#5B5F5B]">{macros.reason==="negative_carbohydrates"?"החלבון והשומן לבדם עוברים את יעד הקלוריות. יש לבדוק את המשקל והמטרה.":"חסר משקל כדי לחשב מאקרו."}</p>}
        </>:<p className="text-xs text-[#5B5F5B]">יעד קלורי יחושב כאן. חסר: {energy.missing.map(field=>MISSING_LABELS[field]).join(", ")}.</p>}
      </div>
    </section>

    <section className="mt-4 grid gap-4 rounded-[28px] border border-[#E5E7E5] bg-[#FFFFFF] p-5 sm:grid-cols-2">
      <h2 className="text-sm font-black text-[#3F433F] sm:col-span-2">אימון</h2>
      {/* Sizes the programme, and nothing else. It is not a stand-in for the
          step count or the number of sessions, which is why it sits here rather
          than in the calorie section. */}
      <Select label="רמת מתאמן" name="traineeLevel" options={TRAINEE_LEVELS.map(item=>[item,TRAINEE_LEVEL_LABELS[item]])}/>
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

      {/* Assignment used to happen silently the moment a level was picked. It is
          a decision on the form now, and the programmes are named before the
          coach submits rather than discovered afterwards. A level with three
          splits is not three programmes a beginner should be handed blindly, so
          each one can be unticked. */}
      {isTraineeLevel(level)&&<div className="sm:col-span-2 rounded-2xl border border-[#E5E7E5] bg-[#F7F8F7] p-4">
        <label className="flex items-start gap-3 text-sm font-bold">
          <input type="checkbox" name="autoAssignProgrammes" defaultChecked className="mt-1 size-5 shrink-0 accent-[#16A34A]"/>
          <span>שייך תוכנית אימונים אוטומטית לפי הרמה
            <span className="mt-1 block text-xs font-normal text-[#5B5F5B]">אפשר לבטל, ולשייך ידנית מאוחר יותר ממסך האימונים.</span>
          </span>
        </label>
        <fieldset className="mt-3 border-0 p-0">
          <legend className="text-xs font-bold text-[#3F433F]">התוכניות שישויכו לרמת {TRAINEE_LEVEL_LABELS[level]}</legend>
          <div className="mt-2 grid gap-2">
            {PROGRAMMES_BY_LEVEL[level].map(name=>
              <label key={name} className="flex items-center gap-2 text-sm font-normal">
                <input type="checkbox" name="levelProgrammes" value={name} defaultChecked className="size-4 shrink-0 accent-[#16A34A]"/>
                <span>{name}</span>
              </label>)}
          </div>
          <p className="mt-2 text-xs text-[#5B5F5B]">שיוך מוסיף בלבד. שינוי רמה בעתיד אינו מוחק שיוך קיים ואינו נוגע בהיסטוריית האימונים.</p>
        </fieldset>
      </div>}
    </section>

    <button disabled={pending} className="mt-6 min-h-14 w-full rounded-2xl bg-[#16A34A] px-6 font-black text-[#FFFFFF] disabled:cursor-wait disabled:opacity-50">{pending?"יוצרים לקוח ושולחים הזמנה…":"יצירת לקוח ושליחת הזמנה"}</button>
  </form>;
}

function Field({label,name,type="text",required=false,...props}:{label:string;name:string;type?:string;required?:boolean;[key:string]:unknown}){
  return <label className="block text-sm font-bold">{label}<input name={name} type={type} required={required} className="nutrition-input mt-2" {...props}/></label>;
}

function Select({label,name,options}:{label:string;name:string;options:readonly (readonly [string,string])[]}){
  return <label className="block text-sm font-bold">{label}
    {/* The select carries its own aria-label. Wrapping a select in a label makes
        its accessible name the label text concatenated with every option, so a
        screen reader announces this as "מטרה לא נבחר שימור חיטוב עדין…" - and
        anything looking the field up by name cannot find it. */}
    <select name={name} aria-label={label} className="nutrition-input mt-2" defaultValue="">
      <option value="">לא נבחר</option>
      {options.map(([item,text])=><option key={item} value={item}>{text}</option>)}
    </select>
  </label>;
}
