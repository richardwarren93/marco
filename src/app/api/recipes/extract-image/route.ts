import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractRecipeFromImage, describeDishPhoto } from "@/lib/claude";
import { embedText } from "@/lib/embeddings";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for cookbook photos
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 10MB" },
        { status: 400 }
      );
    }

    // Convert to buffer (reused for both Claude and storage upload)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    // Run extraction and image upload in parallel
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const admin = createAdminClient();

    // Global dish vocabulary — what people actually cook in the app — so
    // identification/naming leans toward real dishes and stays consistent.
    const { data: known } = await admin.from("recipes").select("title").order("created_at", { ascending: false }).limit(60);
    const knownDishes = (known ?? []).map((r: { title: string | null }) => r.title).filter((t): t is string => !!t);

    // Learning loop (best-effort): describe the photo → embed → retrieve the most
    // visually similar human-corrected dishes to hint the extraction.
    let similarDishes: string[] = [];
    let embedding: number[] | null = null;
    let description = "";
    try {
      description = await describeDishPhoto(base64, file.type);
      if (description) {
        embedding = await embedText(description);
        if (embedding) {
          const { data: matches } = await admin.rpc("match_extraction_memory", { query_embedding: embedding, match_count: 5 });
          similarDishes = ((matches ?? []) as { dish_name: string | null; similarity: number }[])
            .filter((m) => m.similarity > 0.62 && m.dish_name)
            .map((m) => m.dish_name as string);
        }
      }
    } catch { /* learning is best-effort — never block extraction */ }

    const [recipe, uploadResult] = await Promise.all([
      extractRecipeFromImage(base64, file.type, knownDishes, similarDishes),
      admin.storage
        .from("recipe-images")
        .upload(filename, buffer, { contentType: file.type, upsert: false }),
    ]);

    let image_url: string | null = null;
    if (!uploadResult.error) {
      const { data: { publicUrl } } = admin.storage
        .from("recipe-images")
        .getPublicUrl(filename);
      image_url = publicUrl;
    } else {
      console.warn("Recipe image upload failed (non-fatal):", uploadResult.error.message);
    }

    // Remember this extraction (provisional label = what the model guessed) so
    // future similar photos can learn from it. The label is upgraded to the
    // human-corrected one via /api/recipes/learn when the user edits it.
    let memoryId: string | null = null;
    try {
      if (embedding) {
        const { data: mem } = await admin.from("extraction_memory").insert({
          user_id: user.id,
          photo_url: image_url,
          description,
          embedding,
          extracted_title: recipe.title ?? null,
          dish_name: recipe.title ?? null,
        }).select("id").single();
        memoryId = mem?.id ?? null;
      }
    } catch { /* extraction_memory table may not exist yet — degrade gracefully */ }

    return NextResponse.json({ recipe: { ...recipe, image_url }, memoryId });
  } catch (error) {
    console.error("Image extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract recipe from image" },
      { status: 500 }
    );
  }
}
