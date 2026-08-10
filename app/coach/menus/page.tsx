import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, MenuSquare, Plus } from "lucide-react";
import { StateBlock } from "@/components/client/AppPatterns";
import { getAuthContext, listCoachMenus } from "@/lib/data/product-repository";
import StoredMenuActions from "@/components/coach/menus/StoredMenuActions";

export default async function MenusPage(){
  const auth=await getAuthContext();
  if(!auth)redirect("/login");
  if(auth.role!=="coach")redirect("/unauthorized");
  const menus=await listCoachMenus(auth.id);

  return <main className="client-app-content">
    <header className="premium-page-header">
      <div>
        <p>START COACH</p>
        <h1>תפריטים</h1>
        <span>תפריטים שמורים במסד הנתונים.</span>
      </div>
      <span className="pill pill--green">{menus.length}</span>
    </header>

    {menus.length?
      <div className="grid gap-3">
        {menus.map((menu)=>
          <article key={menu.id} className="premium-card">
            <Link href={`/coach/menus/${menu.id}`} className="flex items-center gap-3">
              <span className="app-list__icon"><MenuSquare aria-hidden="true" size={17}/></span>
              <span className="app-list__main">
                <strong>{menu.title}</strong>
                <span>עודכן {new Date(menu.updated_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}</span>
              </span>
              <span className={`pill${menu.is_system_template?"":" pill--green"}`}>{menu.is_system_template?"תבנית מערכת":menu.status}</span>
              <ChevronLeft aria-hidden="true" size={18}/>
            </Link>
            <StoredMenuActions id={menu.id} title={menu.title} isSystemTemplate={Boolean(menu.is_system_template)}/>
          </article>
        )}
      </div>
      :<StateBlock
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
