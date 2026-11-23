"use client";

import { useEffect, useState } from "react";
import CollectionCard from "@/components/collections/CollectionCard";
import CreateCollectionForm from "@/components/collections/CreateCollectionForm";
import SubPageShell from "@/components/layout/SubPageShell";
import type { Collection } from "@/types";
import { CollectionsIcon } from "@/components/icons/HandDrawnIcons";
import { DISPLAY, INK, INK_MUTED, INK_SOFT, PAPER, TOMATO } from "@/lib/theme";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function fetchCollections() {
    try {
      const res = await fetch("/api/collections");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (error) {
      console.error("Fetch collections error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <SubPageShell
      title="Collections"
      right={
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-3.5 py-1.5 active:scale-95 transition-transform"
          style={{
            background: showForm ? PAPER : TOMATO,
            color: showForm ? INK : PAPER,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 13,
            border: `2px solid ${INK}`,
            borderRadius: 99,
            boxShadow: `2px 2px 0 ${INK}`,
          }}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      }
    >
      {showForm && <CreateCollectionForm onCreated={() => { setShowForm(false); fetchCollections(); }} />}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 skeleton-warm" style={{ borderRadius: 16, border: `2.5px solid ${INK}` }} />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div
          className="text-center py-14 px-6"
          style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
        >
          <div className="flex justify-center mb-3" style={{ color: INK_MUTED }}>
            <CollectionsIcon className="w-11 h-11" />
          </div>
          <p style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16 }}>No collections yet</p>
          <p className="text-[13px] mt-1.5" style={{ color: INK_SOFT }}>
            Group your saved recipes however you like.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 active:scale-95 transition-transform"
            style={{
              background: TOMATO,
              color: PAPER,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 13.5,
              border: `2.5px solid ${INK}`,
              borderRadius: 99,
              boxShadow: `3px 3px 0 ${INK}`,
            }}
          >
            Create your first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
