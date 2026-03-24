"use client";

import React, { useEffect, useState, useMemo } from "react";
import RestaurantCard from "@/components/eats/RestaurantCard";
import EatsStatusTabs, { type TabValue } from "@/components/eats/EatsStatusTabs";
import AddRestaurantForm from "@/components/eats/AddRestaurantForm";
import type { Restaurant } from "@/types";
import { EatsIcon, LocationIcon, GlobeIcon, StarIcon, SearchIcon } from "@/components/icons/HandDrawnIcons";
import type { ComponentType } from "react";

const statCards: { key: string; label: string; Icon: ComponentType<{className?: string}>; gradient: string }[] = [
  { key: "total", label: "Total Places", Icon: EatsIcon, gradient: "from-orange-500 to-amber-500" },
  { key: "visited", label: "Visited This Month", Icon: LocationIcon, gradient: "from-purple-500 to-violet-500" },
  { key: "cuisines", label: "Cuisines Explored", Icon: GlobeIcon, gradient: "from-emerald-500 to-teal-500" },
  { key: "wishlist", label: "On Wishlist", Icon: StarIcon, gradient: "from-sky-500 to-blue-500" },
];

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
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 animate-fade-slide-up" style={{ background: "#faf9f7", minHeight: "100vh" }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: "#1a1410" }}>Eats</h1>
          <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>Your restaurant diary</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-2xl text-sm font-bold text-white active:scale-95 transition-transform shadow-sm"
          style={{ background: "#1a1410" }}
        >
          + Add
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton-warm rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map((stat, i) => (
            <div
              key={stat.key}
              className="rounded-3xl p-4"
              style={{
                background: "white",
                boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                animation: `cardPop 0.4s ease ${i * 60}ms both`,
              }}
            >
              <div className="text-orange-500 mb-1"><stat.Icon className="w-5 h-5" /></div>
              <p className="text-2xl font-black" style={{ color: "#1a1410" }}>{statValues[stat.key]}</p>
              <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <EatsStatusTabs active={activeTab} onChange={setActiveTab} counts={counts} />

      {/* Search + Sort */}
      <div className="flex gap-3 mt-4 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#a09890" }}><SearchIcon className="w-4 h-4" /></span>
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl border-0 outline-none text-sm"
            style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", color: "#1a1410" }}
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-2xl px-4 py-2.5 text-sm border-0 outline-none appearance-none cursor-pointer"
          style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", color: "#1a1410" }}
        >
          <option value="updated_at">Recent</option>
          <option value="name">A–Z</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 skeleton-warm rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl" style={{ background: "white", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
          <div className="flex justify-center mb-3" style={{ color: "#d4c9be" }}>
            {restaurants.length === 0
              ? <EatsIcon className="w-12 h-12" />
              : <SearchIcon className="w-12 h-12" />}
          </div>
          <p className="mb-3" style={{ color: "#a09890" }}>
            {restaurants.length === 0
              ? "No restaurants tracked yet"
              : "No restaurants match your filters"}
          </p>
          {restaurants.length === 0 && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm font-semibold"
              style={{ color: "#f97316" }}
            >
              Add your first restaurant →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((restaurant, i) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onToggleGoBack={handleToggleGoBack}
              index={i}
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
