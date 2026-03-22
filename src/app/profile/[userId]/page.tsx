"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Profile, Recipe } from "@/types";
import RecipeCard from "@/components/recipes/RecipeCard";
import FollowButton from "@/components/social/FollowButton";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [profileRes, userRes] = await Promise.all([
        fetch(`/api/profile/${userId}`),
        supabase.auth.getUser(),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile);
        setRecipes(data.sharedRecipes || []);
        setFollowerCount(data.followerCount);
        setFollowingCount(data.followingCount);
        setIsOwnProfile(userRes.data.user?.id === userId);
      }
      setLoading(false);
    }
    load();
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-gray-500">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-2xl flex-shrink-0">
          {(profile.display_name || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.display_name || "Anonymous"}
            </h1>
            {!isOwnProfile && <FollowButton userId={userId as string} />}
            {isOwnProfile && (
              <Link
                href="/profile"
                className="text-sm text-orange-600 hover:underline"
              >
                Edit profile
              </Link>
            )}
          </div>
          {profile.bio && (
            <p className="text-gray-600 mt-1">{profile.bio}</p>
          )}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>
              <strong className="text-gray-900">{followerCount}</strong>{" "}
              {followerCount === 1 ? "follower" : "followers"}
            </span>
            <span>
              <strong className="text-gray-900">{followingCount}</strong>{" "}
              following
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Shared Recipes
      </h2>
      {recipes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No shared recipes yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
