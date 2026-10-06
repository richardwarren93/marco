// Names and titles people type (table names, display names, recipe titles)
// are free text. Marco speaks from a trusted number, so never echo one raw:
// one line, no links, short.
export function safeName(name: string, fallback = "your table", max = 40): string {
  const clean = name.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\S*(?:https?:\/\/|www\.|\.[a-z]{2,}\/)\S*/gi, "").replace(/\s+/g, " ").trim();
  const chars = Array.from(clean || fallback);
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : chars.join("");
}
