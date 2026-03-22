import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const recipeId = formData.get("recipe_id") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !recipeId) {
      return NextResponse.json(
        { error: "File and recipe_id are required" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 10MB" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${user.id}/${recipeId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("recipe-photos")
      .upload(storagePath, file, {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("recipe-photos")
      .getPublicUrl(storagePath);

    const { data, error } = await supabase.from("recipe_photos").insert({
      recipe_id: recipeId,
      user_id: user.id,
      photo_url: urlData.publicUrl,
      storage_path: storagePath,
      caption: caption || null,
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ photo: data });
  } catch (error) {
    console.error("Photo upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload" },
      { status: 500 }
    );
  }
}
