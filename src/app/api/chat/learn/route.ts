import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { messages, recipeName } = await request.json();

    // Only extract if there were actual user messages (not just welcome)
    const userMessages = messages.filter((m: { role: string }) => m.role === "user");
    if (userMessages.length < 2) {
      return new Response(JSON.stringify({ learned: false, reason: "Not enough conversation" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build conversation summary for extraction
    const convoSummary = messages
      .filter((m: { role: string; id?: string }) => m.id !== "welcome")
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    // Extract preferences using Haiku
    const extraction = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: `You extract food preferences and cooking insights from conversations. Return ONLY valid JSON with these optional fields:
{
  "likes": ["ingredient or flavor they expressed liking"],
  "dislikes": ["ingredient or flavor they expressed disliking"],
  "dietary_notes": ["any dietary preference mentioned e.g. 'trying to eat more protein'"],
  "cookware": ["tools/appliances they mentioned having or not having"],
  "skill_signals": ["any signal about their cooking skill level"],
  "flavor_preferences": ["flavor preferences e.g. 'likes extra spicy', 'prefers less sweet'"],
  "cooking_style_notes": ["e.g. 'prefers one-pot meals', 'likes to meal prep'"]
}
Only include fields where you found clear signals. If no preferences were expressed, return {}. Be conservative — only extract explicit preferences, not assumptions.`,
      messages: [
        {
          role: "user",
          content: `Extract any food preferences from this cooking conversation about "${recipeName}":\n\n${convoSummary}`,
        },
      ],
    });

    const extractedText = extraction.content[0].type === "text" ? extraction.content[0].text : "{}";

    // Parse the extracted preferences
    let extracted: Record<string, string[]>;
    try {
      extracted = JSON.parse(extractedText);
    } catch {
      extracted = {};
    }

    // Check if anything was actually extracted
    const hasInsights = Object.values(extracted).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );

    if (!hasInsights) {
      return new Response(JSON.stringify({ learned: false, reason: "No new preferences found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch current taste profile
    const { data: currentPrefs } = await supabase
      .from("user_preferences")
      .select("taste_profile")
      .eq("user_id", user.id)
      .single();

    const currentProfile = currentPrefs?.taste_profile || {};
    const learnedInsights = currentProfile.learned_insights || {};

    // Merge new insights (additive, never overwrite)
    for (const [key, values] of Object.entries(extracted)) {
      if (Array.isArray(values) && values.length > 0) {
        const existing = learnedInsights[key] || [];
        // Deduplicate while adding new values
        const merged = [...new Set([...existing, ...values])];
        learnedInsights[key] = merged;
      }
    }

    // Update the taste profile
    const updatedProfile = {
      ...currentProfile,
      learned_insights: learnedInsights,
      last_learned_at: new Date().toISOString(),
      learn_session_count: (currentProfile.learn_session_count || 0) + 1,
    };

    await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, taste_profile: updatedProfile },
        { onConflict: "user_id" }
      );

    return new Response(
      JSON.stringify({ learned: true, insights: extracted }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Learn API error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to extract preferences" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
