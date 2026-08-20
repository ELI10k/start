"use client";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BottomSheet from "@/components/client/BottomSheet";
import { deleteCoachMealPlan, duplicateCoachMealPlan } from "@/app/actions/product";

type ClientOption = Readonly<{ id: string; full_name: string; calorieTarget: number | null }>;

export default function StoredMenuActions({
  id,
  title,
  isSystemTemplate = false,
  clients = [],
}: {
  id: string;
  title: string;
  isSystemTemplate?: boolean;
  clients?: readonly ClientOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [picking, setPicking] = useState(false);

  const duplicate = async (clientId?: string) => {
    setPending(true);
    const result = await duplicateCoachMealPlan(id, clientId);
    setPending(false);
    setPicking(false);
    if (result.ok && result.id) router.push(`/coach/menus/${result.id}`);
    else setMessage(result.message ?? "השכפול נכשל.");
  };

  const remove = async () => {
    if (!window.confirm(`למחוק את התפריט „${title}”? תפריט שמשויך ללקוח לא יימחק.`)) return;
    setPending(true);
    const result = await deleteCoachMealPlan(id);
    setPending(false);
    if (result.ok) router.refresh();
    else setMessage(result.message ?? "המחיקה נכשלה.");
  };

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {/* The step that turns a bank into something that saves time. Copying a
          menu, opening the copy, choosing the client and then reworking every
          quantity against their target was four steps; naming the client here
          does all four, and the copy arrives already scaled to them. */}
      {clients.length > 0 && (
        <button type="button" disabled={pending} onClick={() => setPicking(true)} className="chip">
          <UserPlus aria-hidden="true" size={15} />שכפול ללקוח
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => duplicate()} className="chip">
        <Copy aria-hidden="true" size={15} />{isSystemTemplate ? "שכפול לעריכה" : "שכפול"}
      </button>
      {!isSystemTemplate && (
        <button type="button" disabled={pending} onClick={remove} className="chip border-[#DC2626] text-[#DC2626]">
          <Trash2 aria-hidden="true" size={15} />מחיקה
        </button>
      )}
      {message && <p role="status" className="basis-full text-xs text-[#DC2626]">{message}</p>}

      <BottomSheet open={picking} title={`שכפול „${title}” ללקוח`} onClose={() => setPicking(false)}>
        <p className="text-sm text-[#5B5F5B]">
          העותק ייפתח כטיוטה על שם הלקוח, והכמויות יכווננו ליעד הקלורי שלו. כדאי לעבור עליהן לפני הפעלה.
        </p>
        <div className="mt-4 grid gap-2">
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              disabled={pending}
              onClick={() => duplicate(client.id)}
              className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#E5E7E5] px-4 text-sm font-bold hover:border-[#16A34A]/60"
            >
              <span>{client.full_name}</span>
              {/* Without a target there is nothing to scale against, and the copy
                  keeps the source quantities - said here rather than discovered. */}
              <span className="text-xs font-normal text-[#5B5F5B]">
                {client.calorieTarget ? `${Math.round(client.calorieTarget)} קל׳` : "אין יעד קלורי"}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
