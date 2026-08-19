import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, MenuSquare, Plus, Search as SearchIcon } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext, listCoachClients, listCoachMenus } from "@/lib/data/product-repository";
import StoredMenuActions from "@/components/coach/menus/StoredMenuActions";

type Search = { q?: string; status?: string };

// The same three words the editor uses, so a status means one thing across the
// product. "פורסם" said nothing about being unassigned, which is the whole point
// of it - it is the bank.
const statusLabels: Record<string, string> = {
  draft: "טיוטה",
  published: "בבנק",
  active: "פעיל אצל לקוח",
};

const filters = [
  { value: "all", label: "הכול" },
  { value: "active", label: "פעילים" },
  { value: "published", label: "בבנק" },
  { value: "draft", label: "טיוטות" },
] as const;

export default async function MenusPage({ searchParams }: { searchParams: Promise<Search> }) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");

  // The menu rows already carry the assigned client's id - the screen simply
  // never resolved it to a name, so a coach looking for "the menu I built for
  // Dana" had nothing to look for.
  const [menus, clients] = await Promise.all([listCoachMenus(auth.id), listCoachClients(auth.id)]);
  const nameById = new Map(clients.map((client) => [client.id, client.full_name]));

  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = filters.some((item) => item.value === params.status) ? params.status! : "all";

  const visible = menus.filter((menu) => {
    const clientName = menu.client_id ? nameById.get(menu.client_id) ?? "" : "";
    if (query && !`${menu.title} ${menu.description ?? ""} ${clientName}`.includes(query)) return false;
    if (status === "active") return menu.status === "active";
    if (status === "published") return menu.status === "published";
    if (status === "draft") return menu.status === "draft";
    return true;
  });

  const filterHref = (value: string) =>
    `/coach/menus?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(value === "all" ? {} : { status: value }) })}`;

  return <main className="client-app-content">
    <header className="premium-page-header">
      <div>
        <p>START COACH</p>
        <h1>תפריטים</h1>
        <span>תפריטים שמורים במסד הנתונים.</span>
      </div>
      <span className="pill pill--green">{menus.length}</span>
    </header>

    {/* A plain GET form, like the clients screen: it keeps working without JS
        and the result is a link the coach can keep. */}
    <form className="flex gap-2" role="search">
      <div className="food-picker__search flex-1">
        <label className="sr-only" htmlFor="q">חיפוש תפריט</label>
        <SearchIcon aria-hidden="true" size={17}/>
        <input id="q" name="q" defaultValue={query} className="nutrition-input" placeholder="שם תפריט או שם לקוח"/>
      </div>
      {status !== "all" && <input type="hidden" name="status" value={status}/>}
      <button className="premium-secondary-button">חיפוש</button>
    </form>

    <div className="chip-row mt-3">
      {filters.map((item) =>
        <Link key={item.value} href={filterHref(item.value)} className="chip" aria-current={status === item.value ? "page" : undefined}>
          {item.label}
        </Link>)}
    </div>

    {visible.length ?
      <div className="grid gap-3">
        {visible.map((menu) => {
          const clientName = menu.client_id ? nameById.get(menu.client_id) : undefined;
          return <article key={menu.id} className="premium-card">
            <Link href={`/coach/menus/${menu.id}`} className="flex items-center gap-3">
              <span className="app-list__icon"><MenuSquare aria-hidden="true" size={17}/></span>
              <span className="app-list__main">
                <strong>{menu.title}</strong>
                {/* Whose menu this is, before anything else about it. */}
                <span>
                  {menu.is_system_template ? "תבנית משותפת" : clientName ?? "לא משויך ללקוח"}
                  {menu.calorie_target ? ` · ${Math.round(Number(menu.calorie_target))} קל׳` : ""}
                  {" · עודכן "}
                  {new Date(menu.updated_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
                </span>
              </span>
              <span className={`pill${menu.is_system_template?"":menu.status==="active"?" pill--green":""}`}>
                {menu.is_system_template ? "תבנית מערכת" : statusLabels[menu.status] ?? menu.status}
              </span>
              <ChevronLeft aria-hidden="true" size={18}/>
            </Link>
            <StoredMenuActions id={menu.id} title={menu.title} isSystemTemplate={Boolean(menu.is_system_template)}/>
          </article>;
        })}
      </div>
      : menus.length ?
      <StateBlock
        icon={<SearchIcon aria-hidden="true" size={22}/>}
        title="אין תפריטים תואמים"
        description="אפשר לנסות חיפוש אחר, או לאפס את הסינון."
        action={<Link href="/coach/menus" className="premium-secondary-button">איפוס הסינון</Link>}
      />
      : <StateBlock
        icon={<MenuSquare aria-hidden="true" size={22}/>}
        title="עדיין אין תפריטים"
        description="התפריט הראשון שתבנה יופיע כאן, יחד עם תבניות המערכת."
        action={<Link href="/coach/menus/new" className="premium-primary-button">תפריט חדש</Link>}
      />}

    <Link href="/coach/menus/new" className="fab fab--bare" aria-label="תפריט חדש">
      <Plus aria-hidden="true" size={18}/>תפריט חדש
    </Link>
  </main>;
}
