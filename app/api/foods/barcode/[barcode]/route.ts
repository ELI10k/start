import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/data/product-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBarcode, parseOpenFoodFactsProduct } from "@/lib/nutrition/open-food-facts";

// START's own catalogue first, Open Food Facts second. A barcode someone has
// already scanned resolves without leaving the building, which is both faster and
// means a correction made here is not overwritten by the community's version.

const OFF_TIMEOUT_MS = 6_000;
const OFF_FIELDS = "product_name,product_name_he,generic_name,brands,quantity,serving_size,product_quantity,nutriments";

export async function GET(_request: Request, context: { params: Promise<{ barcode: string }> }) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { barcode: raw } = await context.params;
  const barcode = normalizeBarcode(raw);
  if (!barcode) return NextResponse.json({ error: "invalid_barcode" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: known, error } = await supabase
    .from("foods")
    .select("id,name,brand,calories,protein,carbs,fat,serving_label,package_unit,unit_weight_grams,barcode,source")
    .eq("barcode", barcode)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "lookup_failed" }, { status: 500 });

  if (known) {
    return NextResponse.json({
      found: true,
      food: {
        barcode,
        name: known.name,
        brand: known.brand,
        servingLabel: known.serving_label,
        packageUnit: known.package_unit,
        unitWeightGrams: known.unit_weight_grams === null ? null : Number(known.unit_weight_grams),
        calories: Number(known.calories),
        protein: known.protein === null ? null : Number(known.protein),
        carbs: known.carbs === null ? null : Number(known.carbs),
        fat: known.fat === null ? null : Number(known.fat),
        source: known.source ?? "start",
        sourceUrl: null,
      },
    });
  }

  // A slow or unreachable community API must not hang the scanner - it falls
  // through to manual entry, which is the same path a genuinely unknown product
  // takes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`,
      { signal: controller.signal, headers: { "User-Agent": "START/1.0 (coaching app)" } },
    );
    if (!response.ok) return NextResponse.json({ found: false, reason: "not_found" });
    const payload = (await response.json()) as { status?: number; product?: unknown };
    const food = payload.status === 1 ? parseOpenFoodFactsProduct(barcode, payload.product as never) : null;
    if (!food) return NextResponse.json({ found: false, reason: "not_found" });
    // A product that passed barcode and nutrition validation becomes part of
    // START's shared catalogue immediately. The RPC owns de-duplication and
    // provenance: a known curated product is preserved, while a community
    // product is stored once under its normalized barcode. Consequently the
    // next client gets the local result above instead of another external call.
    const {data:foodId,error:saveError}=await supabase.rpc("upsert_scanned_food",{
      p_barcode:food.barcode,
      p_name:food.name,
      p_brand:food.brand??"",
      p_serving_label:food.servingLabel,
      p_package_unit:food.packageUnit??"גרם",
      p_unit_weight_grams:food.unitWeightGrams,
      p_calories:food.calories,
      p_protein:food.protein,
      p_carbs:food.carbs,
      p_fat:food.fat,
      p_source:"openfoodfacts",
      p_source_url:food.sourceUrl??"",
    });
    if(saveError)return NextResponse.json({error:"catalog_save_failed"},{status:500});
    return NextResponse.json({ found: true, food:{...food,id:String(foodId)} });
  } catch {
    return NextResponse.json({ found: false, reason: "lookup_unavailable" });
  } finally {
    clearTimeout(timer);
  }
}
