"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CommunityNote } from "@/types";

export default function CommunityNotes({ sourceUrl }: { sourceUrl: string }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data } = await supabase
        .from("community_notes")
        .select("*")
        .eq("source_url", sourceUrl)
        .order("created_at", { ascending: false });
      setNotes((data as CommunityNote[]) || []);
    }
    fetchData();
  }, [sourceUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/community-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: sourceUrl, content: content.trim() }),
      });

      if (res.ok) {
        const { note } = await res.json();
        setNotes([note as CommunityNote, ...notes]);
        setContent("");
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId);
    try {
      const res = await fetch("/api/community-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: noteId }),
      });

      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
      }
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
    }
  }

  function relativeTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Add a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        />
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "..." : "Add Note"}
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No community notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-gray-700">{note.content}</p>
                <p className="text-xs text-gray-400 mt-0.5">{relativeTime(note.created_at)}</p>
              </div>
              {note.user_id === userId && (
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  className="text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                >
                  {deletingId === note.id ? "..." : "Delete"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
