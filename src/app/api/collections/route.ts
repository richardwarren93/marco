import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const admin = createAdminClient();

    const { error, data } = await admin
      .from("collections")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase collection insert error:", JSON.stringify(error));
      throw new Error(error.message || error.code || "Supabase insert failed");
    }
    return NextResponse.json({ collection: data });
  } catch (error) {
    console.error("Create collection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create collection" },
      { status: 500 }
    );
  }
}
