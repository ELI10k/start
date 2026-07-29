import Link from "next/link";
import { redirect } from "next/navigation";
import CoachCheckInCard from "@/components/coach/CoachCheckInCard";
import CheckInComparison from "@/components/coach/CheckInComparison";
import {
  getAuthContext,
  listCoachCheckIns,
  type CoachCheckInFilters,
} from "@/lib/data/product-repository";

type Params = {
  client?: string;
  status?: string;
  from?: string;
  to?: string;
  compareA?: string;
  compareB?: string;
};

export default async function CoachCheckInsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (auth.role !== "coach") redirect("/unauthorized");
  const params = await searchParams;
  const allowedStatuses = new Set(["all", "new", "responded", "handled"]);
  const filters: CoachCheckInFilters = {
    client: params.client,
    status: allowedStatuses.has(params.status ?? "")
      ? (params.status as CoachCheckInFilters["status"])
      : "all",
    from: params.from,
    to: params.to,
  };
  const data = await listCoachCheckIns(auth.id, filters);
  const compareA = data.items.find((item) => item.id === params.compareA);
  const compareB = data.items.find((item) => item.id === params.compareB);
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/5 pb-7">
          <div>
            <p className="text-xs font-black tracking-[.2em] text-[#D4AF37]">
              START COACH
            </p>
            <h1 className="mt-2 text-3xl font-black">צ׳ק־אינים</h1>
            <p className="mt-2 text-sm text-zinc-400">
              כל העדכונים השבועיים, התמונות, התגובות וסטטוס הטיפול.
            </p>
          </div>
          <Link href="/coach" className="text-sm font-bold text-[#D4AF37]">
            חזרה ל־Dashboard
          </Link>
        </header>

        <form className="mt-6 grid gap-3 rounded-[24px] border border-[#292929] bg-[#151515] p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Filter label="לקוח" name="client" defaultValue={filters.client}>
            <option value="">כל הלקוחות</option>
            {data.clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </Filter>
          <Filter label="סטטוס" name="status" defaultValue={filters.status}>
            <option value="all">הכול</option>
            <option value="new">חדש</option>
            <option value="responded">נענתה</option>
            <option value="handled">טופל</option>
          </Filter>
          <DateFilter label="מתאריך" name="from" defaultValue={filters.from} />
          <DateFilter label="עד תאריך" name="to" defaultValue={filters.to} />
          <div className="flex items-end gap-2">
            <button className="min-h-11 flex-1 rounded-xl bg-[#D4AF37] px-4 font-black text-black">
              סינון
            </button>
            <Link href="/coach/check-ins" className="px-2 py-3 text-xs text-zinc-500">
              איפוס
            </Link>
          </div>

          <Filter label="השוואה א׳" name="compareA" defaultValue={params.compareA}>
            <option value="">בחירת צ׳ק־אין</option>
            {data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.client?.full_name} · {new Date(item.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
              </option>
            ))}
          </Filter>
          <Filter label="השוואה ב׳" name="compareB" defaultValue={params.compareB}>
            <option value="">בחירת צ׳ק־אין</option>
            {data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.client?.full_name} · {new Date(item.submitted_at).toLocaleDateString("he-IL",{timeZone:"Asia/Jerusalem"})}
              </option>
            ))}
          </Filter>
          <button className="min-h-11 self-end rounded-xl border border-[#4A3915] px-4 font-bold text-[#D4AF37]">
            השוואה
          </button>
        </form>

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black">השוואת צ׳ק־אינים</h2>
          <CheckInComparison left={compareA} right={compareB} />
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">רשימת צ׳ק־אינים</h2>
            <span className="text-sm text-zinc-500">{data.items.length} תוצאות</span>
          </div>
          {data.items.length ? (
            <div className="space-y-5">
              {data.items.map((item) => (
                <CoachCheckInCard
                  key={item.id}
                  item={item}
                  photoError={data.photoError}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-[24px] border border-dashed border-[#333] p-12 text-center text-zinc-500">
              אין צ׳ק־אינים התואמים לסינון.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Filter({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="text-xs font-bold text-zinc-400">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="nutrition-input mt-2"
      >
        {children}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="text-xs font-bold text-zinc-400">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="nutrition-input mt-2"
      />
    </label>
  );
}
