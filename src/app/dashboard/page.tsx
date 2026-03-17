"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RecipeCard from "@/components/recipes/RecipeCard";
import Link from "next/link";
import type { Recipe, UserPet, ActivityFeedItem } from "@/types";
import {
  SaveRecipeIcon,
  RecipesIcon,
  CollectionsIcon,
  PantryIcon,
  EatsIcon,
  MealPlanIcon,
  FriendsIcon,
} from "@/components/icons/HandDrawnIcons";
import PetWidget from "@/components/gamification/PetWidget";
import WeeklyGoalCard from "@/components/gamification/WeeklyGoalCard";
import ActivityFeed from "@/components/social/ActivityFeed";

const quickActions = [
  { href: "/recipes/new", label: "Save a Recipe", desc: "Paste a link", Icon: SaveRecipeIcon, gradient: "from-orange-500 to-amber-500" },
  { href: "/collections", label: "Collections", desc: "Organize recipes", Icon: CollectionsIcon, gradient: "from-purple-500 to-violet-500" },
  { href: "/pantry", label: "Pantry", desc: "Track ingredients", Icon: PantryIcon, gradient: "from-emerald-500 to-teal-500" },
  { href: "/eats", label: "Eats", desc: "Restaurant log", Icon: EatsIcon, gradient: "from-rose-500 to-pink-500" },
  { href: "/meal-plan", label: "Meal Plan", desc: "AI suggestions", Icon: MealPlanIcon, gradient: "from-blue-500 to-indigo-500" },
  { href: "/friends", label: "Friends", desc: "Connect & share", Icon: FriendsIcon, gradient: "from-amber-500 to-yellow-500" },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Gamification state
  const [pet, setPet] = useState<UserPet | null>(null);
  const [tomatoBalance, setTomatoBalance] = useState(0);
  const [weeklyTarget, setWeeklyTarget] = useState<number | null>(null);
  const [weekProgress, setWeekProgress] = useState(0);
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [feedHasMore, setFeedHasMore] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [recipesRes, userRes, profileRes, petRes, goalRes, logRes, feedRes] = await Promise.all([
        supabase.from("recipes").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.auth.getUser(),
        fetch("/api/profile").then((r) => r.json()).catch(() => null),
        fetch("/api/pet").then((r) => r.json()).catch(() => null),
        fetch("/api/cooking-goal").then((r) => r.json()).catch(() => null),
        fetch("/api/cooking-log").then((r) => r.json()).catch(() => null),
        fetch("/api/activity-feed?limit=10").then((r) => r.json()).catch(() => null),
      ]);

      setRecipes((recipesRes.data as Recipe[]) || []);
      const name = profileRes?.profile?.display_name || userRes.data.user?.email?.split("@")[0] || "";
      setUserName(name);

      // Gamification data
      if (petRes?.pet) {
        setPet(petRes.pet);
        setTomatoBalance(petRes.tomatoBalance || 0);
      }
      if (goalRes?.goal) {
        setWeeklyTarget(goalRes.goal.weekly_target);
      }
      if (logRes) {
        setWeekProgress(logRes.count || 0);
      }
      if (feedRes) {
        setFeedItems(feedRes.items || []);
        setFeedHasMore(feedRes.hasMore || false);
      }

      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded-xl w-48" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Greeting */}
      <div className="animate-slide-up">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {getGreeting()}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-gray-500 text-sm mt-1">What are we cooking today?</p>
      </div>

      {/* Pet Widget */}
      {pet && (
        <div className="animate-pop-in">
          <PetWidget
            pet={pet}
            tomatoBalance={tomatoBalance}
            onFed={(newPet, newBalance) => {
              setPet(newPet);
              setTomatoBalance(newBalance);
            }}
          />
        </div>
      )}

      {/* Weekly Goal Progress */}
      <div className="animate-pop-in" style={{ animationDelay: "50ms", animationFillMode: "both" }}>
        <WeeklyGoalCard weeklyTarget={weeklyTarget} weekProgress={weekProgress} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickActions.map((action, i) => (
          <Link
            key={action.href}
            href={action.href}
            className="animate-pop-in"
            style={{ animationDelay: `${(i + 2) * 50}ms`, animationFillMode: "both" }}
          >
            <div className={`bg-gradient-to-br ${action.gradient} rounded-2xl p-4 sm:p-5 text-white hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 relative overflow-hidden`}>
              <div className="absolute top-3 right-3 opacity-30">
                <action.Icon className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base">{action.label}</h3>
              <p className="text-white/70 text-xs mt-0.5">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Friend Activity Feed */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FriendsIcon className="w-5 h-5 text-orange-600" />
          Friend Activity
        </h2>
        <ActivityFeed initialItems={feedItems} hasMore={feedHasMore} />
      </div>

      {/* Recent Recipes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Recipes</h2>
          {recipes.length > 0 && (
            <Link href="/recipes" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
              View all →
            </Link>
          )}
        </div>
        {recipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
            <div className="text-gray-300 flex justify-center mb-3">
              <RecipesIcon className="w-12 h-12" />
            </div>
            <p className="text-gray-500 mb-3">No recipes saved yet</p>
            <Link href="/recipes/new" className="text-orange-600 hover:text-orange-700 font-medium text-sm">
              Save your first recipe →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
