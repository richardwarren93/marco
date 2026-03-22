"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ShareButtonProps {
  recipeId: string;
}

export default function ShareButton({ recipeId }: ShareButtonProps) {
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function checkShareStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("recipe_shares")
        .select("id")
        .eq("user_id", user.id)
        .eq("recipe_id", recipeId)
        .single();

      setIsShared(!!data);
      setLoading(false);
    }
    checkShareStatus();
  }, [recipeId, supabase]);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/recipes/share", {
        method: isShared ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id: recipeId }),
      });

      if (res.ok) {
        setIsShared(!isShared);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-sm font-medium transition-colors ${
        isShared
          ? "text-orange-600 hover:text-orange-700"
          : "text-gray-600 hover:text-gray-900"
      }`}
      title={isShared ? "Shared with followers" : "Share with followers"}
    >
      {isShared ? "Shared" : "Share"}
    </button>
  );
}
