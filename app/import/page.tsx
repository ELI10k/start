import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import ImportFoodsTool from "./ImportFoodsTool";

// The food-import previewer had no guard of any kind: it is a client component
// exported straight as the route, so anyone who knew the path could open it. It
// reads a spreadsheet in the browser and writes nothing, so nothing leaked - but
// it is a tool for the person who curates the catalogue, and it now says so.
export default async function ImportFoodsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  return <ImportFoodsTool />;
}
