"use client";

import { useState } from "react";

export default function InlineTagEditor({
  recipeId,
  tags,
  onTagsUpdated,
}: {
  recipeId: string;
  tags: string[];
  onTagsUpdated: (newTags: string[]) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");

  async function saveTags(updated: string[]) {
    setSaving(true);
    try {
      const resp = await fetch("/api/recipes/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipeId, tags: updated }),
      });
      if (resp.ok) {
        onTagsUpdated(updated);
      }
    } catch (err) {
      console.error("Failed to save tags:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(tag: string) {
    const updated = tags.filter((t) => t !== tag);
    saveTags(updated);
  }

  function handleAdd() {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed)) {
      setNewTag("");
      setAdding(false);
      return;
    }
    const updated = [...tags, trimmed];
    setNewTag("");
    setAdding(false);
    saveTags(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    } else if (e.key === "Escape") {
      setNewTag("");
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group bg-orange-50 text-orange-700 text-sm px-3 py-1 rounded-full inline-flex items-center gap-1"
        >
          {tag}
          <button
            onClick={() => handleRemove(tag)}
            disabled={saving}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-400 hover:text-orange-700 ml-0.5"
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}

      {adding ? (
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAdd}
          autoFocus
          placeholder="new tag"
          className="text-sm px-3 py-1 rounded-full border border-orange-400 outline-none w-28 focus:ring-2 focus:ring-orange-300"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          disabled={saving}
          className="text-sm px-3 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-orange-400 hover:text-orange-600 transition-colors"
        >
          + Add tag
        </button>
      )}

      {saving && (
        <span className="text-xs text-gray-400">Saving...</span>
      )}
    </div>
  );
}
