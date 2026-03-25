import { NextRequest, NextResponse } from "next/server";
import { extractRecipe } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });
    const recipe = await extractRecipe(text, "manual");
    return NextResponse.json({ recipe });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to extract recipe" }, { status: 500 });
  }
}
