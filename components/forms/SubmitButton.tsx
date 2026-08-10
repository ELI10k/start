"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export default function SubmitButton({
  idle,
  pending = "שומרים…",
  className = "premium-primary-button",
  icon,
}: {
  idle: string;
  pending?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const status = useFormStatus();
  return (
    <button disabled={status.pending} className={className}>
      {status.pending ? null : icon}
      {status.pending ? pending : idle}
    </button>
  );
}
