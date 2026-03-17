"use client";

import { useEffect, useState, useRef } from "react";

interface RecipeNoteData {
  private_note: string;
  personal_rating: number | null;
}

export default function MyNotesCard({ recipeId }: { recipeId: string }) {
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hovering, setHovering] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchNote() {
      try {
        const res = await fetch(`/api/recipe-notes?recipe_id=${recipeId}`);
        const data = await res.json();
        if (data.note) {
          setNote(data.note.private_note || "");
          setRating(data.note.personal_rating || 0);
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    }
    fetchNote();
  }, [recipeId]);

  async function saveNote(noteText: string, ratingVal: number) {
    setSaving(true);
    try {
      await fetch("/api/recipe-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipeId,
          private_note: noteText,
          personal_rating: ratingVal > 0 ? ratingVal : null,
        }),
      });
      setLastSaved("Saved");
      setTimeout(() => setLastSaved(null), 2000);
    } catch {
      setLastSaved("Error saving");
      setTimeout(() => setLastSaved(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function handleNoteChange(value: string) {
    setNote(value);
    // Debounce autosave
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNote(value, rating);
    }, 1000);
  }

  function handleRate(star: number) {
    const newRating = star === rating ? 0 : star; // Toggle off if clicking same star
    setRating(newRating);
    // Clear any pending note save and save both immediately
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNote(note, newRating);
  }

  if (!loaded) return null;

  return (
    <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          My Notes
          <span className="text-[10px] text-gray-400 font-normal">(private)</span>
        </h3>
        {lastSaved && (
          <span className="text-[10px] text-gray-400 animate-pulse">{lastSaved}</span>
        )}
      </div>

      {/* Personal Rating */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500">My rating:</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = hovering ? star <= hovering : star <= rating;
            return (
              <button
                key={star}
                onClick={() => handleRate(star)}
                onMouseEnter={() => setHovering(star)}
                onMouseLeave={() => setHovering(0)}
                disabled={saving}
                className={`text-lg transition-colors ${
                  filled ? "text-amber-400" : "text-gray-300"
                } hover:text-amber-400 disabled:opacity-50`}
              >
                &#9733;
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <span className="text-xs text-gray-400">{rating}/5</span>
        )}
      </div>

      {/* Private Note */}
      <textarea
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        placeholder="Add your private notes, tips, modifications..."
        rows={3}
        className="w-full px-3 py-2 bg-white border border-amber-200/50 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-amber-300 focus:border-transparent outline-none resize-none"
      />
    </div>
  );
}
