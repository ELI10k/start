import SubmitButton from "@/components/forms/SubmitButton";
import { saveContentItem } from "@/app/actions/content";
import type {
  ContentCategoryDto,
  ContentItemDto,
} from "@/lib/data/content-repository";

export default function ContentForm({
  categories,
  item,
}: {
  categories: readonly ContentCategoryDto[];
  item?: ContentItemDto;
}) {
  return (
    <form action={saveContentItem} className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="space-y-5">
        <section className="grid gap-4 rounded-[24px] border border-[#292929] bg-[#151515] p-5 sm:grid-cols-2">
          <Field name="title" label="כותרת" defaultValue={item?.title} required />
          <Field
            name="description"
            label="תיאור קצר"
            defaultValue={item?.description ?? ""}
          />
          <label className="text-sm font-bold">
            קטגוריה
            <select
              name="categoryId"
              required
              defaultValue={item?.categoryId ?? categories[0]?.id}
              className="nutrition-input mt-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            סוג תוכן
            <select
              name="contentType"
              defaultValue={item?.contentType ?? "article"}
              className="nutrition-input mt-2"
            >
              <option value="article">מאמר</option>
              <option value="video">וידאו</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            סטטוס
            <select
              name="status"
              defaultValue={item?.status ?? "draft"}
              className="nutrition-input mt-2"
            >
              <option value="draft">טיוטה</option>
              <option value="published">פורסם</option>
              <option value="archived">הוסר מהספרייה</option>
            </select>
          </label>
          <Field
            name="estimatedMinutes"
            label="משך משוער בדקות"
            type="number"
            min="1"
            max="1440"
            defaultValue={item?.estimatedMinutes ?? ""}
          />
          <Field
            name="sortOrder"
            label="סדר הצגה"
            type="number"
            min="0"
            defaultValue={item?.sortOrder ?? 0}
          />
          <Field
            name="tags"
            label="תגיות, מופרדות בפסיק"
            defaultValue={item?.tags.join(", ") ?? ""}
          />
          <Field
            name="thumbnailUrl"
            label="קישור לתמונה"
            type="url"
            defaultValue={item?.thumbnailUrl ?? ""}
          />
          <Field
            name="mediaUrl"
            label="קישור למדיה"
            type="url"
            defaultValue={item?.mediaUrl ?? ""}
          />
        </section>
        <label className="block rounded-[24px] border border-[#292929] bg-[#151515] p-5 text-sm font-bold">
          גוף התוכן
          <textarea
            name="body"
            rows={14}
            defaultValue={item?.body ?? ""}
            className="nutrition-input mt-2 min-h-72 resize-y leading-7"
          />
        </label>
      </div>
      <aside className="rounded-[24px] border border-[#3A321B] bg-[#17150F] p-5 lg:sticky lg:top-20">
        <h2 className="text-xl font-black">שמירה ב־Supabase</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          טיוטות והסרות זמינות למאמן בלבד. רק תוכן בסטטוס “פורסם” מופיע ללקוחות.
        </p>
        <SubmitButton
          idle={item ? "שמירת שינויים" : "יצירת תוכן"}
          pending="שומרים…"
          className="mt-5 min-h-12 w-full rounded-2xl bg-[#D4AF37] px-5 font-black text-black disabled:opacity-50"
        />
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        defaultValue={defaultValue}
        className="nutrition-input mt-2"
      />
    </label>
  );
}
