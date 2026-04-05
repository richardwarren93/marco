import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractRecipesFromDocument } from "@/lib/claude";

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

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(file.type) && !["pdf", "docx", "doc", "txt"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, Word document, or text file." },
        { status: 400 }
      );
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    // Extract text based on file type
    const isPdf = file.type === "application/pdf" || ext === "pdf";
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx" ||
      ext === "doc";

    if (isPdf) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (isDocx) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString("utf-8");
    }

    if (text.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text from this file. If this is a scanned PDF, try using the photo import instead.",
        },
        { status: 422 }
      );
    }

    // Extract recipes via Claude
    const extractedRecipes = await extractRecipesFromDocument(text);

    if (extractedRecipes.length === 0) {
      return NextResponse.json(
        { error: "No recipes found in this document." },
        { status: 422 }
      );
    }

    // Auto-save all extracted recipes
    const admin = createAdminClient();
    const savedRecipes: { id: string; title: string }[] = [];
    const errors: string[] = [];

    for (const recipe of extractedRecipes) {
      try {
        const { data, error } = await admin
          .from("recipes")
          .insert({
            user_id: user.id,
            title: recipe.title || "Untitled Recipe",
            description: recipe.description || null,
            ingredients: recipe.ingredients || [],
            steps: recipe.steps || [],
            servings: recipe.servings || null,
            prep_time_minutes: recipe.prep_time_minutes || null,
            cook_time_minutes: recipe.cook_time_minutes || null,
            tags: recipe.tags || [],
            meal_type: recipe.meal_type || "dinner",
            source_url: null,
            source_platform: "document",
            image_url: null,
            notes: null,
            calories: recipe.calories || null,
            protein_g: recipe.protein_g || null,
            carbs_g: recipe.carbs_g || null,
            fat_g: recipe.fat_g || null,
            fiber_g: recipe.fiber_g || null,
          })
          .select("id, title")
          .single();

        if (error) throw error;

        savedRecipes.push({ id: data.id, title: data.title });

        // Activity feed entry (non-critical)
        try {
          await admin.from("activity_feed").insert({
            user_id: user.id,
            activity_type: "saved_recipe",
            recipe_id: data.id,
          });
        } catch {
          // Non-critical
        }
      } catch (err) {
        errors.push(recipe.title || "Unknown recipe");
      }
    }

    return NextResponse.json({
      recipes: savedRecipes,
      totalExtracted: extractedRecipes.length,
      totalSaved: savedRecipes.length,
      errors,
    });
  } catch (error) {
    console.error("Extract document error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process document" },
      { status: 500 }
    );
  }
}
