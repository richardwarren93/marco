"use client";

import { useEffect, useState } from "react";
import CollectionCard from "@/components/collections/CollectionCard";
import CreateCollectionForm from "@/components/collections/CreateCollectionForm";
import type { Collection } from "@/types";

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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📁 Collections</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
        >
          {showForm ? "Cancel" : "+ New Collection"}
        </button>
      </div>

      {showForm && (
        <div className="mb-6">
          <CreateCollectionForm
            onCreated={() => {
              setShowForm(false);
              fetchCollections();
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <span className="text-4xl block mb-3">📁</span>
          <p className="text-gray-500 mb-3">No collections yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
          >
            Create your first collection →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
