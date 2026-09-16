import Link from "next/link";

export default function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7F8F7] px-4 py-8 text-[#0B0B0B] sm:px-6">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-[#E5E7E5] bg-white p-6 shadow-sm sm:p-10">
        <Link href="/login" className="text-sm font-black text-[#15803D]">START LIFE FIT</Link>
        <p className="mt-8 text-xs font-black tracking-[.16em] text-[#16A34A]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#5B5F5B]">עודכן לאחרונה: {updated}</p>
        <div className="mt-8 space-y-7 leading-7 [&_a]:font-bold [&_a]:text-[#15803D] [&_h2]:text-xl [&_h2]:font-black [&_li]:mt-2 [&_ul]:mr-5 [&_ul]:list-disc">
          {children}
        </div>
        <nav aria-label="מסמכים וקשר" className="mt-10 flex flex-wrap gap-4 border-t border-[#E5E7E5] pt-6 text-sm">
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/terms">תנאי שימוש</Link>
          <Link href="/app-support">תמיכה</Link>
        </nav>
      </article>
    </main>
  );
}
