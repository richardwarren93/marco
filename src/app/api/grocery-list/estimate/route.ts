import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface EstimateItem {
  name: string;
  amount: string | null;
  unit: string | null;
  category: string | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { items }: { items: EstimateItem[] } = await request.json();
    if (!items?.length) {
      return NextResponse.json({ error: "No items to estimate" }, { status: 400 });
    }

    const itemList = items
      .map((i) => {
        const qty = [i.amount, i.unit].filter(Boolean).join(" ");
        return `- ${i.name}${qty ? ` (${qty})` : ""}`;
      })
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `You are a grocery cost estimator. Given a list of grocery items with quantities, estimate the cost of each item in USD based on typical US grocery store prices (2025). Be practical and realistic.

ALWAYS respond with valid JSON only. No explanations, no markdown fences.

Response format:
{
  "items": [
    { "name": "item name", "estimate_low": 2.50, "estimate_high": 4.00 }
  ],
  "total_low": 25.00,
  "total_high": 40.00,
  "notes": "Brief 1-sentence note about the estimate"
}

Rules:
- Use the quantity/amount to inform pricing (e.g. 2 lbs chicken vs 1 lb)
- Round estimates to nearest $0.50
- Low estimate = budget/sale prices, High estimate = typical retail
- For spices/condiments in small quantities, estimate the cost of what you'd actually need to buy (a whole jar/bottle)
- Keep it simple and practical`,
      messages: [
        {
          role: "user",
          content: `Estimate the grocery cost for these items:\n\n${itemList}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const estimate = JSON.parse(text);

    return NextResponse.json(estimate);
  } catch (error) {
    console.error("Cost estimate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to estimate cost" },
      { status: 500 }
    );
  }
}
