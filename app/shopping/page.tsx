import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import ClientShell from "@/components/client/ClientShell";
import ShoppingList from "@/components/client/ShoppingList";
import { StateBlock } from "@/components/client/AppPatterns";
import { getActiveClientMenu, getAuthContext } from "@/lib/data/product-repository";
import { israelDateKey } from "@/lib/date-time";

// The shopping list on its own screen.
//
// It was a button on the nutrition screen, which is where the menu is read, not
// where the shopping happens - the client is in a supermarket holding a phone,
// and the list was two taps behind the meals of a day they are not eating yet.
// One tab, one screen, nothing above it.
export default async function ShoppingPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");

  const menu = await getActiveClientMenu(auth.id, israelDateKey());

  return (
    <ClientShell>
      <h1 className="text-2xl font-black">רשימת קניות</h1>
      {menu ? (
        <>
          <p className="mb-4 mt-1 text-sm text-[#5B5F5B]">{menu.title}</p>
          <ShoppingList
            inline
            title={menu.title}
            items={menu.meals.flatMap((meal) => meal.groups.flatMap((group) => group.items.map((item) => ({
              name: item.name,
              displayQuantity: Number(item.displayQuantity),
              measurementUnit: item.measurementUnit,
              itemRole: item.itemRole,
              groupType: group.type,
            }))))}
          />
        </>
      ) : (
        <StateBlock
          icon={<ShoppingBasket aria-hidden="true" size={22} />}
          title="אין תפריט פעיל"
          description="הרשימה נבנית מהתפריט שהמאמן משייך אליך. ברגע שיש תפריט, המזונות והכמויות יופיעו כאן."
          action={<Link href="/nutrition" className="premium-primary-button">לארוחות שלי</Link>}
        />
      )}
    </ClientShell>
  );
}
