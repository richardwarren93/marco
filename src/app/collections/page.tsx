"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CollectionCard from "@/components/collections/CollectionCard";
import CreateCollectionForm from "@/components/collections/CreateCollectionForm";
import type { Collection } from "@/types";
import { CollectionsIcon } from "@/components/icons/HandDrawnIcons";

export default function CollectionsPage() {
  const router = useRouter();
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
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-5 animate-fade-slide-up" style={{ background: "#faf9f7", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors -ml-1"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <svg className="w-4 h-4" style={{ color: "#1a1410" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "#1a1410" }}>
              <CollectionsIcon className="w-6 h-6 text-orange-600" /> Collections
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Organize your saved recipes</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <div>
          <CreateCollectionForm
            onCreated={() => {
              setShowForm(false);
              fetchCollections();
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton-warm rounded-3xl" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 rounded-3xl" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <div className="flex justify-center mb-3" style={{ color: "#d4c9be" }}><CollectionsIcon className="w-12 h-12" /></div>
          <p style={{ color: "#a09890" }}>No collections yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-orange-600 hover:text-orange-700 font-medium text-sm mt-2"
          >
            Create your first collection →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
