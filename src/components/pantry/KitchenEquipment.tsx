"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { KITCHEN_EQUIPMENT } from "@/data/equipment";

export default function KitchenEquipment() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEquipment = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_equipment")
      .select("equipment_name")
      .eq("user_id", user.id);

    if (data) {
      setSelected(new Set(data.map((d) => d.equipment_name)));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  async function handleToggle(equipmentId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSelected = new Set(selected);

    if (selected.has(equipmentId)) {
      // Optimistic remove
      newSelected.delete(equipmentId);
      setSelected(newSelected);

      await supabase
        .from("user_equipment")
        .delete()
        .eq("user_id", user.id)
        .eq("equipment_name", equipmentId);
    } else {
      // Optimistic add
      newSelected.add(equipmentId);
      setSelected(newSelected);

      await supabase.from("user_equipment").insert({
        user_id: user.id,
        equipment_name: equipmentId,
      });
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {KITCHEN_EQUIPMENT.map((item) => {
        const isSelected = selected.has(item.id);
        return (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
              isSelected
                ? "bg-orange-50 border-orange-300 text-orange-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "border-orange-500 bg-orange-500"
                    : "border-gray-300"
                }`}
              >
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {item.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
