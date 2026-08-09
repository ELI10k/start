"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({ idle, pending = "שומרים…", className = "min-h-12 rounded-2xl bg-[#16A34A] px-5 font-black text-[#FFFFFF] disabled:opacity-50" }: { idle: string; pending?: string; className?: string }) { const status = useFormStatus(); return <button disabled={status.pending} className={className}>{status.pending ? pending : idle}</button>; }
