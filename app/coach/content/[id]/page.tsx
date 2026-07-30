import { notFound, redirect } from "next/navigation";
import ContentForm from "@/components/coach/content/ContentForm";
import { getAuthContext } from "@/lib/data/product-repository";
import {
  getCoachContentItem,
  listContentCategories,
} from "@/lib/data/content-repository";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const { id } = await params;
  const [item, categories] = await Promise.all([
    getCoachContentItem(id),
    listContentCategories(true),
  ]);
  if (!item) notFound();
  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black tracking-widest text-[#D4AF37]">ניהול תוכן</p>
        <h1 className="mt-2 text-3xl font-black">עריכת תוכן</h1>
        <ContentForm categories={categories} item={item} />
      </div>
    </main>
  );
}
