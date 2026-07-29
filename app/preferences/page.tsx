import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";

export default async function PreferencesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "client") redirect("/unauthorized");
  redirect("/profile");
}
