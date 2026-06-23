import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Turns a Marco grocery list into a shoppable Instacart page via the Instacart
 * Developer Platform "Create Shopping List Page" endpoint. Returns the hosted
 * URL ({ url }); the client opens it so the user picks a store and checks out on
 * Instacart (no payments touch Marco). When INSTACART_API_KEY is unset we reply
 * 501 so the caller can fall back to its copy-list behaviour.
 *
 * Docs: https://docs.instacart.com/developer_platform_api/api/products/create_shopping_list_page
 */

interface IncomingItem {
  name: string;
  amount?: string | null;
  unit?: string | null;
}

// A grocery amount we can pass to Instacart as a real quantity (e.g. "2", "1.5").
// Anything fuzzy ("1-2", "a pinch") is left out — display_text still carries it.
const NUMERIC = /^\d*\.?\d+$/;

function toLineItem(it: IncomingItem) {
  const name = (it.name || "").trim();
  const amount = (it.amount || "").trim();
  const unit = (it.unit || "").trim();
  const human = [amount, unit].filter(Boolean).join(" ");
  const line: Record<string, unknown> = {
    name,
    // Always send a human-readable label so the row reads right even when we
    // can't map Marco's free-form unit onto Instacart's vocabulary.
    display_text: human ? `${human} ${name}` : name,
  };
  if (NUMERIC.test(amount)) {
    const qty = parseFloat(amount);
    if (qty > 0) line.quantity = qty;
  }
  return line;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    // Not configured yet — caller falls back to copy + open store.
    return NextResponse.json({ error: "Instacart not configured" }, { status: 501 });
  }

  let body: { items?: IncomingItem[]; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = (body.items || []).filter((i) => i && typeof i.name === "string" && i.name.trim());
  if (items.length === 0) {
    return NextResponse.json({ error: "No items to order" }, { status: 400 });
  }

  const base =
    process.env.INSTACART_ENV === "development"
      ? "https://connect.dev.instacart.tools"
      : "https://connect.instacart.com";

  const linkback = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/grocery`
    : (() => { try { return `${new URL(request.url).origin}/grocery`; } catch { return undefined; } })();

  const payload = {
    title: body.title?.trim() || "Marco grocery list",
    link_type: "shopping_list",
    // Instacart caps a single list; 500 is well above any real grocery week.
    line_items: items.slice(0, 500).map(toLineItem),
    ...(linkback ? { landing_page_configuration: { partner_linkback_url: linkback } } : {}),
  };

  try {
    const res = await fetch(`${base}/idp/v1/products/products_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Instacart API error:", res.status, detail);
      return NextResponse.json({ error: "Instacart request failed" }, { status: 502 });
    }

    const data = await res.json();
    const url = data?.products_link_url;
    if (!url) {
      return NextResponse.json({ error: "No link returned" }, { status: 502 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Instacart fetch failed:", err);
    return NextResponse.json({ error: "Instacart request failed" }, { status: 502 });
  }
}
