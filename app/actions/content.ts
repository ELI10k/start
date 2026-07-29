"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set(["draft", "published", "archived"]);
const contentTypes = new Set(["article", "video"]);

async function requireRole(role: "coach" | "client") {
  const auth = await getAuthContext();
  if (!auth || auth.role !== role) throw new Error("not_authorized");
  return { auth, supabase: await createSupabaseServerClient() };
}

export async function saveContentItem(form: FormData): Promise<void> {
  const { supabase } = await requireRole("coach");
  const id = String(form.get("id") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const status = String(form.get("status") ?? "draft");
  const contentType = String(form.get("contentType") ?? "article");
  const body = String(form.get("body") ?? "").trim();
  const mediaUrl = String(form.get("mediaUrl") ?? "").trim();
  const sortOrder = Number(form.get("sortOrder") ?? 0);
  const estimatedMinutesRaw = String(form.get("estimatedMinutes") ?? "").trim();
  const estimatedMinutes = estimatedMinutesRaw
    ? Number(estimatedMinutesRaw)
    : null;
  if (
    (id && !uuidPattern.test(id)) ||
    !title ||
    !uuidPattern.test(categoryId) ||
    !statuses.has(status) ||
    !contentTypes.has(contentType) ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    (estimatedMinutes !== null &&
      (!Number.isInteger(estimatedMinutes) ||
        estimatedMinutes < 1 ||
        estimatedMinutes > 1440)) ||
    (status === "published" && !body && !mediaUrl)
  )
    throw new Error("invalid_content_item");
  const tags = [
    ...new Set(
      String(form.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  ];
  const { data, error } = await supabase.rpc("save_content_item", {
    p_item: {
      id,
      title,
      description: String(form.get("description") ?? "").trim(),
      categoryId,
      status,
      contentType,
      thumbnailUrl: String(form.get("thumbnailUrl") ?? "").trim(),
      body,
      mediaUrl,
      sortOrder,
      estimatedMinutes: estimatedMinutes ?? "",
      tags,
    },
  });
  if (error) throw error;
  revalidatePath("/coach/content");
  revalidatePath("/content");
  redirect(`/coach/content/${data}`);
}

export async function setContentItemStatus(form: FormData): Promise<void> {
  const { supabase } = await requireRole("coach");
  const contentItemId = String(form.get("contentItemId") ?? "");
  const status = String(form.get("status") ?? "");
  if (!uuidPattern.test(contentItemId) || !statuses.has(status))
    throw new Error("invalid_content_status");
  const { error } = await supabase.rpc("set_content_item_status", {
    p_content_item_id: contentItemId,
    p_status: status,
  });
  if (error) throw error;
  revalidatePath("/coach/content");
  revalidatePath(`/coach/content/${contentItemId}`);
  revalidatePath("/content");
  revalidatePath(`/content/${contentItemId}`);
}

export async function recordContentView(contentItemId: string): Promise<void> {
  const { supabase } = await requireRole("client");
  if (!uuidPattern.test(contentItemId)) throw new Error("invalid_content_id");
  const { error } = await supabase.rpc("record_content_view", {
    p_content_item_id: contentItemId,
  });
  if (error) throw error;
}

export async function saveContentProgress(form: FormData): Promise<void> {
  const { supabase } = await requireRole("client");
  const contentItemId = String(form.get("contentItemId") ?? "");
  const progress = Number(form.get("progress") ?? 0);
  if (
    !uuidPattern.test(contentItemId) ||
    !Number.isInteger(progress) ||
    progress < 0 ||
    progress > 100
  )
    throw new Error("invalid_content_progress");
  const { error } = await supabase.rpc("save_content_progress", {
    p_content_item_id: contentItemId,
    p_progress_percent: progress,
    p_last_position_seconds: 0,
  });
  if (error) throw error;
  revalidatePath("/content");
  revalidatePath(`/content/${contentItemId}`);
}

export async function setContentFavorite(form: FormData): Promise<void> {
  const { supabase } = await requireRole("client");
  const contentItemId = String(form.get("contentItemId") ?? "");
  const favorite = form.get("favorite") === "true";
  if (!uuidPattern.test(contentItemId)) throw new Error("invalid_content_id");
  const { error } = await supabase.rpc("set_content_favorite", {
    p_content_item_id: contentItemId,
    p_favorite: favorite,
  });
  if (error) throw error;
  revalidatePath("/content");
  revalidatePath(`/content/${contentItemId}`);
}
