"use client";

import { useState, type ReactNode } from "react";

/**
 * One meal, open or closed, and it stays where the client put it.
 *
 * The card was a plain `<details open={isNow}>` rendered on the server. Every
 * save on this screen ends in `revalidatePath`, React re-renders with the same
 * `open` prop, and React 19 writes that prop back onto the element - so a card
 * the client had opened themselves closed again the moment they recorded
 * anything into it. On a phone that is the whole failure: you write down what
 * you ate, you press שמירה, and what you wrote is gone from the screen.
 *
 * The state lives here instead. The server still decides which card starts
 * open - the meal that is due now - and after that it is the client's.
 * `onToggle` keeps this in step with the element, which a person can also open
 * and close without React being involved.
 */
export default function MealCard({
  id,
  defaultOpen,
  className,
  summary,
  children,
}: {
  id?: string;
  defaultOpen: boolean;
  className: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={className}
    >
      <summary className="meal-card__summary">{summary}</summary>
      {children}
    </details>
  );
}
