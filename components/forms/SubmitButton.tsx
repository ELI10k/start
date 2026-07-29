"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ idle, pending = "שומרים…", className = "min-h-12 rounded-2xl bg-[#D4AF37] px-5 font-black text-black disabled:opacity-50" }: { idle: string; pending?: string; className?: string }) { const status = useFormStatus(); return <button disabled={status.pending} className={className}>{status.pending ? pending : idle}</button>; }
