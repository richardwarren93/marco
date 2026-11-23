"use client";

import { useState } from "react";
import { DISPLAY, INK, PAPER, TOMATO, TOMATO_DARK } from "@/lib/theme";

/* New-collection form. Besides the reskin this fixes a layout bug: the inputs
 * carried no width class, so in the stacked mobile layout they sized to the
 * browser default instead of the column. */

const FIELD = {
  background: PAPER,
  color: INK,
  border: `2px solid ${INK}`,
  borderRadius: 12,
} as const;

export default function CreateCollectionForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create collection");
      }

      setName("");
      setDescription("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 space-y-2"
      style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
    >
      <input
        type="text"
        placeholder="Collection name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2.5 outline-none text-sm"
        style={FIELD}
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-2.5 outline-none text-sm"
        style={FIELD}
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full py-2.5 active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          background: TOMATO,
          color: PAPER,
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 14,
          border: `2.5px solid ${INK}`,
          borderRadius: 12,
          boxShadow: `3px 4px 0 ${INK}`,
        }}
      >
        {saving ? "Creating…" : "Create"}
      </button>
      {error && (
        <p className="text-[12px] px-1" style={{ color: TOMATO_DARK, fontWeight: 600 }}>
          {error}
        </p>
      )}
    </form>
  );
}
