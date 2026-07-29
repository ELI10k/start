import { notFound, redirect } from "next/navigation";
import {
  getAuthContext,
  getCoachMenu,
  listDatabaseFoods,
} from "@/lib/data/product-repository";
type PreviewDay = { meals: Array<{ id: string; title: string; items: Array<{ id: string; food_id: string; amount: number | string; calculated_calories: number | string }> }> };
export default async function MenuPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params;
  const [menu, foods] = await Promise.all([
    getCoachMenu(auth.id, id),
    listDatabaseFoods(),
  ]);
  if (!menu) notFound();
  const names = new Map(foods.map((food) => [food.id, food.name]));
  return (
    <main className="px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs text-[#D4AF37]">תצוגה מקדימה · {menu.status}</p>
        <h1 className="mt-2 text-3xl font-black">{menu.title}</h1>
        <p className="mt-2 text-zinc-500">{menu.description}</p>
        <div className="mt-6 space-y-4">
          {(menu.days as PreviewDay[])
            .flatMap((day) => day.meals)
            .map((meal) => (
              <article
                key={meal.id}
                className="rounded-[22px] border border-[#292929] bg-[#151515] p-5"
              >
                <h2 className="text-xl font-black">{meal.title}</h2>
                <ul className="mt-3 divide-y divide-white/5">
                  {meal.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between py-3 text-sm"
                    >
                      <span>{names.get(item.food_id) ?? "מזון לא זמין"}</span>
                      <span className="text-zinc-500">
                        {item.amount} גרם · {item.calculated_calories} קל׳
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
      </div>
    </main>
  );
}
