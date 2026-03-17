"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-2xl font-bold text-orange-600">
              <Image src="/marco-icon.svg" alt="Marco" width={32} height={32} className="rounded-full" />
              Marco
            </Link>
            {user && (
              <div className="hidden sm:flex items-center gap-6">
                <Link href="/recipes" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Recipes
                </Link>
                <Link href="/collections" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Collections
                </Link>
                <Link href="/eats" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Eats
                </Link>
                <Link href="/pantry" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Pantry
                </Link>
                <Link href="/meal-plan" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Meal Plan
                </Link>
                <Link href="/friends" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Friends
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/recipes/new"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  + Save Recipe
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
