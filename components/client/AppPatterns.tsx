import type { ReactNode } from "react";

// The pieces every remaining screen needs, defined once. Presentation only - none
// of these touch data, so a screen can adopt them without any logic changing.

export function Skeleton({ variant = "text", className = "" }: { variant?: "text" | "title" | "card" | "tile"; className?: string }) {
  return <div aria-hidden="true" className={`skeleton skeleton--${variant} ${className}`} />;
}

// A shaped placeholder that matches the card it stands in for, so nothing jumps
// when the real content arrives.
export function SkeletonCard() {
  return (
    <div className="start-surface p-5" aria-hidden="true">
      <Skeleton variant="title" />
      <div className="mt-4 grid gap-2">
        <Skeleton />
        <Skeleton className="w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-3" role="status" aria-label="טוען…">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="card" />
      ))}
    </div>
  );
}

export function StateBlock({
  tone = "empty",
  icon,
  title,
  description,
  action,
}: {
  tone?: "empty" | "error" | "success";
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`state-block${tone === "empty" ? "" : ` state-block--${tone}`}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {icon ? <span className="state-block__icon">{icon}</span> : null}
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </section>
  );
}
