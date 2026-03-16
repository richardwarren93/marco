"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CollectionCard from "@/components/collections/CollectionCard";
import CreateCollectionForm from "@/components/collections/CreateCollectionForm";
import type { Collection } from "@/types";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  async function fetchCollections() {
    const { data: cols } = await supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false });

    const collections = (cols as Collection[]) || [];

    // Fetch recipe counts for each collection
    const withCounts = await Promise.all(
      collections.map(async (col) => {
        const { count } = await supabase
          .from("collection_recipes")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", col.id);
        return { ...col, recipe_count: count || 0 };
      })
    );

    setCollections(withCounts);
    setLoading(false);
  }

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Collections</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
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
        <p className="text-gray-500">Loading collections...</p>
      ) : collections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No collections yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-orange-600 hover:underline font-medium"
          >
            Create your first collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
