import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractRecipeFromImage } from "@/lib/claude";

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

    // Convert to base64 for Claude Vision
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const recipe = await extractRecipeFromImage(base64, file.type);

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Image extraction error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract recipe from image" },
      { status: 500 }
    );
  }
}
