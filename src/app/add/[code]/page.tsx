"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AddFriendPage() {
  const params = useParams();
  const code = params.code as string;

  const [user, setUser] = useState<User | null>(null);
  const [friendName, setFriendName] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Lookup the friend code
    fetch(`/api/friends/lookup?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setFriendName(data.display_name);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSendRequest() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ type: "error", message: data.error });
      } else {
        setResult({
          type: "success",
          message: `Friend request sent to ${data.friend_name}!`,
        });
      }
    } catch {
      setResult({ type: "error", message: "Something went wrong" });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-auto px-4">
          <div className="text-6xl mb-4">🤷</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Code not found
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            The friend code &quot;{code}&quot; doesn&apos;t match any Marco
            user. Double-check the code and try again.
          </p>
          <Link
            href={user ? "/friends" : "/"}
            className="text-orange-600 hover:text-orange-700 font-medium text-sm"
          >
            {user ? "Go to Friends" : "Go to Marco"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm mx-auto px-4">
        <div className="w-20 h-20 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-2xl mx-auto mb-4">
          {friendName
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "?"}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{friendName}</h1>
        <p className="text-sm text-gray-500 mb-6">wants to connect on Marco</p>

        {user ? (
          <>
            {result?.type === "success" ? (
              <div className="space-y-4">
                <p className="text-green-600 font-medium">{result.message}</p>
                <Link
                  href="/friends"
                  className="inline-block px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700"
                >
                  Go to Friends
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleSendRequest}
                  disabled={sending}
                  className="w-full px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {sending ? "Sending..." : "Send Friend Request"}
                </button>
                {result?.type === "error" && (
                  <p className="text-red-600 text-sm">{result.message}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <Link
              href={`/auth/signup?returnTo=/add/${code}`}
              className="block w-full px-6 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
            >
              Sign up to connect
            </Link>
            <Link
              href={`/auth/login?returnTo=/add/${code}`}
              className="block text-sm text-gray-600 hover:text-gray-900"
            >
              Already have an account? Log in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
