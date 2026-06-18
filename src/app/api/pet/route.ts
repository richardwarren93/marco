import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computePetMood, computeEffectiveHunger, TOMATO_REWARDS } from "@/lib/gamification";
import { awardTomatoes } from "@/lib/tomatoes";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch or auto-create pet
  let { data: pet } = await admin
    .from("user_pets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!pet) {
    const { data: newPet, error } = await admin
      .from("user_pets")
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error("Pet creation error:", error);
      return NextResponse.json({ error: "Failed to create pet" }, { status: 500 });
    }
    pet = newPet;
  }

  // Compute effective mood with decay
  const mood = computePetMood(pet.hunger_level, pet.last_fed_at);

  // Get balance
  const { data: profile } = await admin
    .from("user_profiles")
    .select("tomato_balance")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    pet: { ...pet, mood },
    tomatoBalance: profile?.tomato_balance || 0,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Check balance
  const { data: profile } = await admin
    .from("user_profiles")
    .select("tomato_balance")
    .eq("user_id", user.id)
    .single();

  const balance = profile?.tomato_balance || 0;
  if (balance < TOMATO_REWARDS.FEED_PET_COST) {
    return NextResponse.json(
      { error: "Not enough tomatoes", needed: TOMATO_REWARDS.FEED_PET_COST, have: balance },
      { status: 400 }
    );
  }

  // Get current pet
  const { data: pet } = await admin
    .from("user_pets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!pet) {
    return NextResponse.json({ error: "No pet found" }, { status: 404 });
  }

  // Compute effective hunger then add feeding bonus
  const effectiveHunger = computeEffectiveHunger(pet.hunger_level, pet.last_fed_at);
  const newHunger = Math.min(4, effectiveHunger + 2);

  // Deduct tomatoes through the shared ledger (atomic decrement; repeatable, so no dedupe).
  const spend = await awardTomatoes({
    userId: user.id,
    amount: -TOMATO_REWARDS.FEED_PET_COST,
    reason: "feed_pet",
    referenceId: pet.id,
  });
  const newBalance = spend.newBalance;

  // Update pet
  const { data: updatedPet } = await admin
    .from("user_pets")
    .update({
      hunger_level: newHunger,
      last_fed_at: new Date().toISOString(),
      total_feedings: pet.total_feedings + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single();

  const mood = computePetMood(updatedPet!.hunger_level, updatedPet!.last_fed_at);

  return NextResponse.json({
    pet: { ...updatedPet, mood },
    tomatoBalance: newBalance,
  });
}
