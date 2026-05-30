"use client";

// "Add to your cookbook" — the magic moment. Mirrors the app's "+" import:
// paste recipe links AND/OR add photos. Everything is scraped/extracted and
// saved to the account immediately, and the saved recipes are handed up so the
// next step (the demo) can show what to do with the user's OWN recipes.

import Image from "next/image";
import { useRef, useState } from "react";
import CookbookPage from "./CookbookPage";
import { CookbookButton } from "./CookbookControls";

export interface SavedRecipe {
  id: string;
  title: string;
  image_url: string | null;
}

interface Props {
  pageNumber: number;
  onBack?: () => void;
  onNext: (recipes: SavedRecipe[]) => void;
}

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export default function RecipeImportStep({ pageNumber, onBack, onNext }: Props) {
  const [text, setText] = useState("");
  const [added, setAdded] = useState<SavedRecipe[]>([]);
  const [importing, setImporting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const typedUrls = parseUrls(text);
  const canSubmit = (typedUrls.length > 0 || added.length > 0) && !importing && !photoBusy;

  async function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    setPhotoBusy(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const exRes = await fetch("/api/recipes/extract-image", { method: "POST", body: fd });
        const exData = await exRes.json();
        if (!exRes.ok || !exData?.recipe) continue;
        const saveRes = await fetch("/api/recipes/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exData.recipe),
        });
        const saveData = await saveRes.json();
        if (saveRes.ok && saveData?.recipe) {
          setAdded((prev) => [...prev, { id: saveData.recipe.id, title: saveData.recipe.title, image_url: saveData.recipe.image_url }]);
        }
      } catch {
        /* skip this photo */
      }
    }
    setPhotoBusy(false);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    if (typedUrls.length === 0) {
      onNext(added);
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/import-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: typedUrls.slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Couldn't import those links. Try again or skip for now.");
        setImporting(false);
        return;
      }
      const fromLinks: SavedRecipe[] = (data?.recipes || []).map((r: SavedRecipe) => ({ id: r.id, title: r.title, image_url: r.image_url }));
      onNext([...added, ...fromLinks]);
    } catch {
      setError("Something went wrong. Try again or skip for now.");
      setImporting(false);
    }
  }

  const totalPending = typedUrls.length + added.length;
  const submitLabel = importing
    ? "Filling your book…"
    : totalPending > 0
      ? `Add ${totalPending} to my book`
      : "Add to my book";

  return (
    <CookbookPage
      sectionLabel="Your book"
      questionLabel="Page 1"
      timeLabel="The fun part"
      dropCap="L"
      title={
        <>
          et&apos;s fill your{" "}
          <em style={{ color: "#E5462E", fontStyle: "italic" }}>book.</em>
        </>
      }
      subtitle="Paste recipe links — Instagram, TikTok, YouTube, a blog — or snap a photo of a recipe. We'll read them and copy them in."
      pageNumber={pageNumber}
      onBack={onBack}
      hideBack={!onBack}
      footer={
        <div className="space-y-2.5">
          {error && (
            <p className="text-center" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "13px", color: "#E5462E" }}>
              {error}
            </p>
          )}
          <CookbookButton onClick={handleSubmit} disabled={!canSubmit}>
            {submitLabel}
          </CookbookButton>
        </div>
      }
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={"https://...\nhttps://..."}
        disabled={importing}
        className="w-full px-4 py-3 rounded-xl outline-none resize-none disabled:opacity-60"
        style={{
          background: "rgba(255, 253, 247, 0.7)",
          border: "1px solid rgba(28, 26, 23, 0.18)",
          fontFamily: "var(--font-mono, ui-monospace)",
          fontSize: "13px",
          color: "#1C1A17",
          lineHeight: 1.5,
        }}
      />

      {/* Photo import — mirrors the app's "+" button */}
      <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
      <button
        onClick={() => !photoBusy && photoRef.current?.click()}
        disabled={photoBusy}
        className="w-full mt-3 flex items-center justify-center gap-2.5 py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60"
        style={{ background: "rgba(255, 253, 247, 0.55)", border: "1px dashed rgba(28, 26, 23, 0.3)" }}
      >
        {photoBusy ? (
          <span className="inline-block w-4 h-4 border-2 border-[#1C1A17] border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-lg">📷</span>
        )}
        <span style={{ fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 500', fontSize: "15px", color: "#1C1A17" }}>
          {photoBusy ? "Reading your photo…" : "Snap or upload a recipe photo"}
        </span>
      </button>

      {/* Added-so-far thumbnails */}
      {added.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5" style={{ fontFamily: "var(--font-display, Georgia, serif)", fontStyle: "italic", fontSize: "14px", color: "rgba(28, 26, 23, 0.65)" }}>
            In your book{added.length > 1 ? ` (${added.length})` : ""}:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {added.map((r) => (
              <div key={r.id} className="relative overflow-hidden" style={{ borderRadius: 12, border: "1px solid rgba(28, 26, 23, 0.14)", boxShadow: "0 4px 12px rgba(74, 50, 20, 0.16)" }}>
                <div className="relative w-full" style={{ aspectRatio: "4 / 3", background: "#E5D5B0" }}>
                  {r.image_url ? (
                    <Image src={r.image_url} alt={r.title} fill sizes="200px" style={{ objectFit: "cover" }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                  )}
                  <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ background: "#E5462E", fontSize: 14 }}>✓</span>
                </div>
                <div className="px-2.5 py-2" style={{ background: "rgba(255, 253, 247, 0.85)", fontFamily: "var(--font-display, Georgia, serif)", fontVariationSettings: '"opsz" 14, "wght" 500', fontSize: "13px", color: "#1C1A17", lineHeight: 1.2 }}>
                  {r.title}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </CookbookPage>
  );
}
