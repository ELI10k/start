import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ContentCategoryDto = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}>;

export type ContentItemDto = Readonly<{
  id: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  contentType: "article" | "video";
  thumbnailUrl: string | null;
  body: string | null;
  mediaUrl: string | null;
  status: "draft" | "published" | "archived";
  sortOrder: number;
  estimatedMinutes: number | null;
  publishedAt: string | null;
  updatedAt: string;
  tags: readonly string[];
  progressPercent: number;
  lastViewedAt: string | null;
  favorite: boolean;
}>;

export async function listContentCategories(
  includeInactive = false,
): Promise<ContentCategoryDto[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("content_categories")
    .select("id,name,slug,description,sort_order,active")
    .order("sort_order")
    .order("name");
  if (!includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sortOrder: category.sort_order,
    active: category.active,
  }));
}

async function loadContentItems(options: {
  publishedOnly: boolean;
  clientId?: string;
}): Promise<ContentItemDto[]> {
  const supabase = await createSupabaseServerClient();
  let itemQuery = supabase
    .from("content_items")
    .select(
      "id,title,description,category_id,content_type,thumbnail_url,body,media_url,status,sort_order,estimated_minutes,published_at,updated_at",
    )
    .order("sort_order")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (options.publishedOnly) itemQuery = itemQuery.eq("status", "published");
  const [{ data: rows, error: itemError }, categories] = await Promise.all([
    itemQuery,
    listContentCategories(!options.publishedOnly),
  ]);
  if (itemError) throw itemError;
  const ids = (rows ?? []).map((item) => item.id);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const [mappingResult, progressResult, favoriteResult] = await Promise.all([
    ids.length
      ? supabase
          .from("content_item_tags")
          .select("content_item_id,tag_id")
          .in("content_item_id", ids)
      : Promise.resolve({ data: [], error: null }),
    options.clientId && ids.length
      ? supabase
          .from("content_progress")
          .select("content_item_id,progress_percent,last_viewed_at")
          .eq("client_id", options.clientId)
          .in("content_item_id", ids)
      : Promise.resolve({ data: [], error: null }),
    options.clientId && ids.length
      ? supabase
          .from("content_favorites")
          .select("content_item_id")
          .eq("client_id", options.clientId)
          .in("content_item_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (mappingResult.error) throw mappingResult.error;
  if (progressResult.error) throw progressResult.error;
  if (favoriteResult.error) throw favoriteResult.error;
  const tagIds = [
    ...new Set((mappingResult.data ?? []).map((mapping) => mapping.tag_id)),
  ];
  const { data: tags, error: tagError } = tagIds.length
    ? await supabase.from("content_tags").select("id,name").in("id", tagIds)
    : { data: [], error: null };
  if (tagError) throw tagError;
  const tagMap = new Map((tags ?? []).map((tag) => [tag.id, tag.name]));
  const favoriteIds = new Set(
    (favoriteResult.data ?? []).map((favorite) => favorite.content_item_id),
  );

  return (rows ?? []).flatMap((item) => {
    const category = categoryMap.get(item.category_id);
    if (!category) return [];
    const progress = (progressResult.data ?? []).find(
      (entry) => entry.content_item_id === item.id,
    );
    return [
      {
        id: item.id,
        title: item.title,
        description: item.description,
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        contentType: item.content_type,
        thumbnailUrl: item.thumbnail_url,
        body: item.body,
        mediaUrl: item.media_url,
        status: item.status,
        sortOrder: item.sort_order,
        estimatedMinutes: item.estimated_minutes,
        publishedAt: item.published_at,
        updatedAt: item.updated_at,
        tags: (mappingResult.data ?? [])
          .filter((mapping) => mapping.content_item_id === item.id)
          .map((mapping) => tagMap.get(mapping.tag_id))
          .filter((tag): tag is string => Boolean(tag)),
        progressPercent: Number(progress?.progress_percent ?? 0),
        lastViewedAt: progress?.last_viewed_at ?? null,
        favorite: favoriteIds.has(item.id),
      },
    ];
  });
}

export async function listPublishedContent(
  clientId: string,
  categorySlug?: string,
): Promise<ContentItemDto[]> {
  const items = await loadContentItems({ publishedOnly: true, clientId });
  return categorySlug
    ? items.filter((item) => item.categorySlug === categorySlug)
    : items;
}

export async function getPublishedContentItem(
  contentItemId: string,
  clientId: string,
): Promise<ContentItemDto | null> {
  const items = await loadContentItems({ publishedOnly: true, clientId });
  return items.find((item) => item.id === contentItemId) ?? null;
}

export async function listCoachContent(): Promise<ContentItemDto[]> {
  return loadContentItems({ publishedOnly: false });
}

export async function getCoachContentItem(
  contentItemId: string,
): Promise<ContentItemDto | null> {
  const items = await listCoachContent();
  return items.find((item) => item.id === contentItemId) ?? null;
}
