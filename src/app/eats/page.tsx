"use client";

import { useEffect, useState, useMemo } from "react";
import RestaurantCard from "@/components/eats/RestaurantCard";
import EatsStatusTabs, { type TabValue } from "@/components/eats/EatsStatusTabs";
import AddRestaurantForm from "@/components/eats/AddRestaurantForm";
import type { Restaurant } from "@/types";

export default function EatsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [showAdd, setShowAdd] = useState(false);

  async function fetchRestaurants() {
    try {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      const res = await fetch(`/api/restaurants?${params}`);
      const data = await res.json();
      if (res.ok) {
        setRestaurants(data.restaurants);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRestaurants();
  }, [sort]);

  const filtered = useMemo(() => {
    let result = restaurants;
    if (activeTab !== "all") {
      result = result.filter((r) => r.status === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisine?.toLowerCase().includes(q) ||
          r.neighborhood?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [restaurants, activeTab, search]);

  const counts = useMemo(() => {
    const c: Record<TabValue, number> = {
      all: restaurants.length,
      wishlist: 0,
      visited: 0,
      favorite: 0,
      avoid: 0,
    };
    restaurants.forEach((r) => {
      c[r.status]++;
    });
    return c;
  }, [restaurants]);

  // Stats
  const totalVisitsThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    // We don't have visit data in list view, so we approximate from visit_count
    // This will be more accurate once we have visits loaded
    return restaurants.filter(
      (r) => r.last_visited && new Date(r.last_visited).getMonth() === month && new Date(r.last_visited).getFullYear() === year
    ).length;
  }, [restaurants]);

  const uniqueCuisines = useMemo(
    () => new Set(restaurants.map((r) => r.cuisine).filter(Boolean)).size,
    [restaurants]
  );

  async function handleToggleGoBack(id: string, value: boolean) {
    const res = await fetch(`/api/restaurants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...restaurants.find((r) => r.id === id),
        would_go_back: value,
      }),
    });
    if (res.ok) {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, would_go_back: value } : r))
      );
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eats</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
        >
          + Add Restaurant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{restaurants.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Restaurants</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalVisitsThisMonth}</p>
          <p className="text-xs text-gray-500 mt-1">Visited This Month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{uniqueCuisines}</p>
          <p className="text-xs text-gray-500 mt-1">Cuisines Explored</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{counts.wishlist}</p>
          <p className="text-xs text-gray-500 mt-1">On Wishlist</p>
        </div>
      </div>

      {/* Tabs */}
      <EatsStatusTabs active={activeTab} onChange={setActiveTab} counts={counts} />

      {/* Search + Sort */}
      <div className="flex gap-3 mt-4 mb-6">
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="updated_at">Recently Updated</option>
          <option value="name">Name A-Z</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 mb-3">
            {restaurants.length === 0
              ? "No restaurants tracked yet"
              : "No restaurants match your filters"}
          </p>
          {restaurants.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-orange-600 hover:underline font-medium"
            >
              Add your first restaurant
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onToggleGoBack={handleToggleGoBack}
            />
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showAdd && (
        <AddRestaurantForm
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            fetchRestaurants();
          }}
        />
      )}
    </div>
  );
}
