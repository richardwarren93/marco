"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import VisitTimeline from "@/components/eats/VisitTimeline";
import RestaurantStats from "@/components/eats/RestaurantStats";
import LogVisitModal from "@/components/eats/LogVisitModal";
import AddRestaurantForm from "@/components/eats/AddRestaurantForm";
import type { Restaurant, RestaurantStatus } from "@/types";

const statusLabels: Record<RestaurantStatus, { text: string; bg: string }> = {
  favorite: { text: "Favorite", bg: "bg-orange-100 text-orange-700" },
  wishlist: { text: "Wishlist", bg: "bg-blue-100 text-blue-700" },
  visited: { text: "Been There", bg: "bg-gray-100 text-gray-600" },
  avoid: { text: "Avoid", bg: "bg-red-100 text-red-600" },
};

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogVisit, setShowLogVisit] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function fetchRestaurant() {
    try {
      const res = await fetch(`/api/restaurants/${params.id}`);
      if (!res.ok) {
        setRestaurant(null);
        return;
      }
      const data = await res.json();
      setRestaurant(data.restaurant);
    } catch {
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRestaurant();
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Delete this restaurant and all its visits?")) return;
    setDeleting(true);
    const res = await fetch(`/api/restaurants/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/eats");
    } else {
      setDeleting(false);
    }
  }

  async function handleDeleteVisit(visitId: string) {
    const res = await fetch(`/api/restaurants/visits/${visitId}`, { method: "DELETE" });
    if (res.ok) {
      fetchRestaurant();
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500 mb-3">Restaurant not found</p>
        <Link href="/eats" className="text-orange-600 hover:underline font-medium">
          Back to Eats
        </Link>
      </div>
    );
  }

  const status = statusLabels[restaurant.status];
  const allDishes = (restaurant.visits || []).flatMap((v) => v.dishes_ordered);
  const uniqueDishes = [...new Set(allDishes)];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/eats" className="text-gray-500 hover:text-gray-700 text-sm mb-4 inline-block">
        &larr; Back to Eats
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg}`}>
                {status.text}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {restaurant.cuisine && (
                <span className="bg-purple-50 text-purple-700 text-sm px-3 py-0.5 rounded-full">
                  {restaurant.cuisine}
                </span>
              )}
              {restaurant.price_range && (
                <span className="text-gray-900 font-medium">
                  {"$".repeat(restaurant.price_range)}
                  <span className="text-gray-300">
                    {"$".repeat(4 - restaurant.price_range)}
                  </span>
                </span>
              )}
              {restaurant.overall_rating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-4 h-4 ${
                        star <= restaurant.overall_rating!
                          ? "text-amber-400"
                          : "text-gray-200"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              )}
            </div>

            {restaurant.neighborhood && (
              <p className="text-gray-500 text-sm mt-2">
                {restaurant.neighborhood}
                {restaurant.city ? `, ${restaurant.city}` : ""}
              </p>
            )}
            {restaurant.address && (
              <p className="text-gray-400 text-sm">{restaurant.address}</p>
            )}

            {restaurant.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {restaurant.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {restaurant.notes && (
              <p className="text-gray-600 text-sm mt-3">{restaurant.notes}</p>
            )}

            {/* Links */}
            <div className="flex items-center gap-4 mt-3">
              {restaurant.google_maps_url && (
                <a
                  href={restaurant.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline text-sm"
                >
                  Google Maps &rarr;
                </a>
              )}
              {restaurant.website_url && (
                <a
                  href={restaurant.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-600 hover:underline text-sm"
                >
                  Website &rarr;
                </a>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="text-orange-600 hover:underline text-sm"
                >
                  {restaurant.phone}
                </a>
              )}
            </div>
          </div>

          {/* Would go back indicator */}
          {restaurant.would_go_back !== null && restaurant.would_go_back !== undefined && (
            <div className="text-3xl flex-shrink-0">
              {restaurant.would_go_back ? "\u{1F44D}" : "\u{1F44E}"}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowEdit(true)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => setShowLogVisit(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
          >
            Log Visit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 ml-auto disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visit Timeline */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Visit History ({restaurant.visits?.length || 0})
          </h2>
          <VisitTimeline
            visits={restaurant.visits || []}
            onDeleteVisit={handleDeleteVisit}
          />
        </div>

        {/* Stats sidebar */}
        <div>
          <RestaurantStats visits={restaurant.visits || []} />
        </div>
      </div>

      {/* Modals */}
      {showLogVisit && (
        <LogVisitModal
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          existingDishes={uniqueDishes}
          onClose={() => setShowLogVisit(false)}
          onSaved={() => {
            setShowLogVisit(false);
            fetchRestaurant();
          }}
        />
      )}

      {showEdit && (
        <AddRestaurantForm
          editId={restaurant.id}
          initial={{
            name: restaurant.name,
            cuisine: restaurant.cuisine || "",
            neighborhood: restaurant.neighborhood || "",
            address: restaurant.address || "",
            city: restaurant.city || "",
            google_maps_url: restaurant.google_maps_url || "",
            website_url: restaurant.website_url || "",
            phone: restaurant.phone || "",
            price_range: restaurant.price_range,
            status: restaurant.status,
            tags: restaurant.tags,
            notes: restaurant.notes || "",
          }}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchRestaurant();
          }}
        />
      )}
    </div>
  );
}
