import type { ReactNode } from "react";

export function PremiumCard({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Tag className={`premium-card ${className}`}>{children}</Tag>;
}

export function MetricTile({
  label,
  value,
  detail,
  icon,
  accent = "green",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  // "down" is the only tile that ever leaves the green: a number moving the
  // wrong way is the one thing the palette says in red.
  accent?: "green" | "neutral" | "down";
}) {
  return (
    <div className={`metric-tile metric-tile--${accent}`}>
      <div className="metric-tile__head">
        <span>{label}</span>
        {icon ? <span className="metric-tile__icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  unit = "",
}: {
  value: number;
  max?: number | null;
  label: string;
  unit?: string;
}) {
  const target = max && max > 0 ? max : 0;
  const percent = target ? Math.min(100, Math.max(0, (value / target) * 100)) : 0;
  return (
    <div className="premium-progress">
      <div className="premium-progress__meta">
        <span>{label}</span>
        <strong>
          {Math.round(value).toLocaleString("he-IL")}
          {unit}
          <small> / {target ? Math.round(target).toLocaleString("he-IL") : "—"}{unit}</small>
        </strong>
      </div>
      <div
        className="premium-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target || 100}
        aria-valuenow={Math.round(value)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  const percent = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div
      className="progress-ring"
      style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div className="progress-ring__inner">
        <span>{label}</span>
        <strong>{percent}%</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

