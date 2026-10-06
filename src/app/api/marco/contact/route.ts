import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Marco as a contact card (vCard). iOS opens it as "Add to Contacts", which is
// what you need to drop Marco into a group chat you already have.

// vCard TEXT value: backslashes, commas, semicolons and newlines must be
// escaped (RFC 6350 §3.4 / RFC 2426), or readers split the value.
const vText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const number = process.env.MARCO_IMESSAGE;
  if (!number) return NextResponse.json({ error: "Marco's number isn't set up yet." }, { status: 503 });
  const card = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:Marco",
    "N:;Marco;;;",
    "ORG:Marco — your kitchen",
    `TEL;TYPE=CELL:${number}`,
    `NOTE:${vText("Text me a recipe link and I'll save it to your kitchen. In a family or friends chat you start from the Marco app, tell me what you cooked and I'll put it on your table.")}`,
    "END:VCARD",
    "",
  ].join("\r\n");
  return new NextResponse(card, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'inline; filename="Marco.vcf"',
      "Cache-Control": "private, no-store",
    },
  });
}
