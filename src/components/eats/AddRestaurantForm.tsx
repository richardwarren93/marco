"use client";

import { useState } from "react";
import type { RestaurantStatus, PriceRange } from "@/types";

interface AddRestaurantFormProps {
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<{
    name: string;
    cuisine: string;
    neighborhood: string;
    address: string;
    city: string;
    google_maps_url: string;
    website_url: string;
    phone: string;
    price_range: PriceRange | null;
    status: RestaurantStatus;
    tags: string[];
    notes: string;
  }>;
  editId?: string;
}

function parseGoogleMapsUrl(url: string): { name?: string; address?: string } {
  try {
    // Pattern: /maps/place/Restaurant+Name+Here/
    const placeMatch = url.match(/\/maps\/place\/([^/@]+)/);
    if (placeMatch) {
      const decoded = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      return { name: decoded };
    }
  } catch {
    // ignore
  }
  return {};
}

export default function AddRestaurantForm({
  onClose,
  onSaved,
  initial,
  editId,
}: AddRestaurantFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [cuisine, setCuisine] = useState(initial?.cuisine || "");
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [city, setCity] = useState(initial?.city || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initial?.google_maps_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.website_url || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [priceRange, setPriceRange] = useState<PriceRange | null>(initial?.price_range || null);
  const [status, setStatus] = useState<RestaurantStatus>(initial?.status || "wishlist");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleGoogleMapsUrlChange(url: string) {
    setGoogleMapsUrl(url);
    if (url.includes("google.com/maps") && !name) {
      const parsed = parseGoogleMapsUrl(url);
      if (parsed.name) setName(parsed.name);
      if (parsed.address) setAddress(parsed.address);
    }
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Restaurant name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const body = {
        name: name.trim(),
        cuisine: cuisine.trim() || null,
        neighborhood: neighborhood.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        google_maps_url: googleMapsUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        phone: phone.trim() || null,
        price_range: priceRange,
        status,
        tags,
        notes: notes.trim() || null,
      };

      const url = editId ? `/api/restaurants/${editId}` : "/api/restaurants";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save restaurant");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editId ? "Edit Restaurant" : "Add Restaurant"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              &times;
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Maps shortcut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Maps Link <span className="text-gray-400 font-normal">(optional — auto-fills name)</span>
              </label>
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                placeholder="Paste a Google Maps URL..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Restaurant name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            {/* Cuisine + Neighborhood */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                <input
                  type="text"
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  placeholder="Italian, Thai, etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="SoHo, Midtown, etc."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Address + City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="New York"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Price + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex gap-1">
                  {([1, 2, 3, 4] as PriceRange[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriceRange(priceRange === p ? null : p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        priceRange === p
                          ? "bg-orange-600 text-white border-orange-600"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {"$".repeat(p)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as RestaurantStatus)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="wishlist">Wishlist</option>
                  <option value="visited">Been There</option>
                  <option value="favorite">Favorite</option>
                  <option value="avoid">Avoid</option>
                </select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="date night, brunch, etc."
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((t) => t !== tag))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any thoughts about this spot..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editId ? "Update" : "Add Restaurant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
