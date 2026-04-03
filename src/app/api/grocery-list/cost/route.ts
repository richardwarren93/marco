import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface GroceryItem {
  name: string;
  amount?: string;
  unit?: string;
  category?: string;
}

interface PricedItem {
  name: string;
  amount?: string;
  unit?: string;
  price_low: number;
  price_high: number;
  source: "cache" | "estimated";
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Convert amount + unit into a multiplier relative to the cached unit price.
 *  e.g., if cache says $3/lb and item is "2 lbs", multiplier = 2. */
function quantityMultiplier(amount?: string): number {
  if (!amount) return 1;
  const num = parseFloat(amount);
  return isNaN(num) || num <= 0 ? 1 : num;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { items }: { items: GroceryItem[] } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Step 1: Look up all items in the price cache
    const normalizedNames = items.map((i) => normalize(i.name));
    const { data: cachedPrices } = await admin
      .from("ingredient_prices")
      .select("name_normalized, price_low, price_high")
      .in("name_normalized", normalizedNames);

    const priceMap = new Map<string, { price_low: number; price_high: number }>();
    for (const p of cachedPrices || []) {
      priceMap.set(p.name_normalized, { price_low: p.price_low, price_high: p.price_high });
    }

    // Step 2: Split into cached and uncached
    const pricedItems: PricedItem[] = [];
    const uncachedItems: GroceryItem[] = [];

    for (const item of items) {
      const cached = priceMap.get(normalize(item.name));
      if (cached) {
        const mult = quantityMultiplier(item.amount);
        pricedItems.push({
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          price_low: Math.round(cached.price_low * mult * 100) / 100,
          price_high: Math.round(cached.price_high * mult * 100) / 100,
          source: "cache",
        });
      } else {
        uncachedItems.push(item);
      }
    }

    // Step 3: If there are uncached items, ask Claude (Haiku for speed + cost)
    if (uncachedItems.length > 0) {
      const itemList = uncachedItems
        .map((i) => `- ${i.amount || ""} ${i.unit || ""} ${i.name}`.trim())
        .join("\n");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `You are a grocery pricing expert. Estimate prices in USD for typical US grocery stores (2025 prices).
Return ONLY valid JSON with this structure:
{
  "items": [
    { "name": "ingredient name", "unit_price_low": 1.50, "unit_price_high": 2.50, "per_unit": "lb" }
  ]
}
unit_price_low = budget/sale price per standard unit
unit_price_high = typical retail price per standard unit
per_unit = the standard purchasing unit (lb, oz, each, bunch, etc.)
Round to nearest $0.25.`,
        messages: [
          {
            role: "user",
            content: `Estimate per-unit prices for these grocery items:\n${itemList}`,
          },
        ],
      });

      try {
        const text = response.content[0].type === "text" ? response.content[0].text : "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const estimatedItems: { name: string; unit_price_low: number; unit_price_high: number; per_unit: string }[] = parsed.items || [];

          // Cache the new prices and add to results
          const rowsToInsert = [];
          for (let i = 0; i < uncachedItems.length; i++) {
            const original = uncachedItems[i];
            const estimated = estimatedItems[i];
            if (!estimated) continue;

            const mult = quantityMultiplier(original.amount);
            pricedItems.push({
              name: original.name,
              amount: original.amount,
              unit: original.unit,
              price_low: Math.round(estimated.unit_price_low * mult * 100) / 100,
              price_high: Math.round(estimated.unit_price_high * mult * 100) / 100,
              source: "estimated",
            });

            rowsToInsert.push({
              name: original.name,
              name_normalized: normalize(original.name),
              unit: estimated.per_unit || original.unit || null,
              price_low: estimated.unit_price_low,
              price_high: estimated.unit_price_high,
              category: original.category || null,
              source: "claude",
            });
          }

          // Batch insert into cache (ignore conflicts for duplicates)
          if (rowsToInsert.length > 0) {
            await admin
              .from("ingredient_prices")
              .upsert(rowsToInsert, { onConflict: "name_normalized,unit", ignoreDuplicates: true });
          }
        }
      } catch {
        // If Claude parsing fails, add items without prices
        for (const item of uncachedItems) {
          pricedItems.push({
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            price_low: 0,
            price_high: 0,
            source: "estimated",
          });
        }
      }
    }

    // Step 4: Calculate totals
    const totalLow = pricedItems.reduce((sum, i) => sum + i.price_low, 0);
    const totalHigh = pricedItems.reduce((sum, i) => sum + i.price_high, 0);
    const avgCost = (totalLow + totalHigh) / 2;
    const annualCashback = Math.round(avgCost * 0.02 * 52 * 100) / 100;

    return NextResponse.json({
      items: pricedItems,
      total_low: Math.round(totalLow * 100) / 100,
      total_high: Math.round(totalHigh * 100) / 100,
      annual_cashback: annualCashback,
      cached_count: pricedItems.filter((i) => i.source === "cache").length,
      estimated_count: pricedItems.filter((i) => i.source === "estimated").length,
    });
  } catch (error) {
    console.error("Cost estimation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to estimate cost" },
      { status: 500 }
    );
  }
}
