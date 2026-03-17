"use client";

import { useEffect, useState, useMemo } from "react";
import RestaurantCard from "@/components/eats/RestaurantCard";
import EatsStatusTabs, { type TabValue } from "@/components/eats/EatsStatusTabs";
import AddRestaurantForm from "@/components/eats/AddRestaurantForm";
import type { Restaurant } from "@/types";

const statCards = [
  { key: "total", label: "Total Places", emoji: "🍽️", gradient: "from-orange-500 to-amber-500" },
  { key: "visited", label: "Visited This Month", emoji: "📍", gradient: "from-purple-500 to-violet-500" },
  { key: "cuisines", label: "Cuisines Explored", emoji: "🌎", gradient: "from-emerald-500 to-teal-500" },
  { key: "wishlist", label: "On Wishlist", emoji: "⭐", gradient: "from-sky-500 to-blue-500" },
] as const;

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

  const totalVisitsThisMonth = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return restaurants.filter(
      (r) => r.last_visited && new Date(r.last_visited).getMonth() === month && new Date(r.last_visited).getFullYear() === year
    ).length;
  }, [restaurants]);

  const uniqueCuisines = useMemo(
    () => new Set(restaurants.map((r) => r.cuisine).filter(Boolean)).size,
    [restaurants]
  );

  const statValues: Record<string, number> = {
    total: restaurants.length,
    visited: totalVisitsThisMonth,
    cuisines: uniqueCuisines,
    wishlist: counts.wishlist,
  };

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🍽️ Eats</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Add Restaurant
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat) => (
            <div
              key={stat.key}
              className={`bg-gradient-to-br ${stat.gradient} rounded-2xl p-4 text-white shadow-sm`}
            >
              <span className="text-2xl block mb-1">{stat.emoji}</span>
              <p className="text-2xl font-bold">{statValues[stat.key]}</p>
              <p className="text-white/80 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <EatsStatusTabs active={activeTab} onChange={setActiveTab} counts={counts} />

      {/* Search + Sort */}
      <div className="flex gap-3 mt-4 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-full shadow-sm border-0 focus:ring-2 focus:ring-orange-500 outline-none text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-white rounded-full shadow-sm px-4 py-2.5 text-sm border-0 focus:ring-2 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
        >
          <option value="updated_at">Recently Updated</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <span className="text-4xl block mb-3">
            {restaurants.length === 0 ? "🍕" : "🔍"}
          </span>
          <p className="text-gray-500 mb-3">
            {restaurants.length === 0
              ? "No restaurants tracked yet"
              : "No restaurants match your filters"}
          </p>
          {restaurants.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-orange-600 hover:text-orange-700 font-medium text-sm"
            >
              Add your first restaurant →
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
