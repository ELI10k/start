"use client";

import { useState } from "react";
import { ChevronLeft, Utensils } from "lucide-react";
import AteSomethingElse, { type PickableFood } from "@/components/client/AteSomethingElse";

export default function OutsideMenuFood({date,foods}:{date:string;foods:readonly PickableFood[]}){
  const[open,setOpen]=useState(false);
  return <>
    <button type="button" onClick={()=>setOpen(true)} className="outside-menu-card">
      <span className="app-list__icon"><Utensils aria-hidden="true" size={18}/></span>
      <span className="app-list__main">
        <strong>נאכל מחוץ לתפריט</strong>
        <span>תיעוד חטיף, ארוחה או כל דבר שלא הופיע בתוכנית</span>
      </span>
      <ChevronLeft aria-hidden="true" size={20}/>
    </button>
    <AteSomethingElse
      mealId=""
      date={date}
      foods={foods}
      open={open}
      onClose={()=>setOpen(false)}
      title="מה אכלת מחוץ לתפריט?"
      unmeasuredNote="תיאור או תמונה יישמרו למעקב המאמן ולא יתווספו אוטומטית לקלוריות. פריט מהמאגר או ברקוד ייספרו לפי הכמות שהזנת."
    />
  </>;
}
