"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ idle, pending = "שומרים…", className = "premium-primary-button" }: { idle: string; pending?: string; className?: string }) { const status = useFormStatus(); return <button disabled={status.pending} className={className}>{status.pending ? pending : idle}</button>; }
