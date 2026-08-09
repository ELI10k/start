import { redirect } from "next/navigation";
import ContentForm from "@/components/coach/content/ContentForm";
import { getAuthContext } from "@/lib/data/product-repository";
import { listContentCategories } from "@/lib/data/content-repository";

export default async function NewContentPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const categories = await listContentCategories();
  return (
    <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black tracking-widest text-[#16A34A]">ניהול תוכן</p>
        <h1 className="mt-2 text-3xl font-black">יצירת תוכן</h1>
        <ContentForm categories={categories} />
      </div>
    </main>
  );
}
