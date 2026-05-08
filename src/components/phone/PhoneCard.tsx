"use client";

import { useState } from "react";
import { useProfile } from "@/lib/hooks/use-data";
import type { UserProfile } from "@/types";

type Mode = "view" | "enter_phone" | "enter_code";

export default function PhoneCard() {
  const { data: profileData, mutate: mutateProfile } = useProfile();
  const profile: UserProfile | null = profileData?.profile ?? null;

  const [mode, setMode] = useState<Mode>("view");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [unlinking, setUnlinking] = useState(false);

  const verified = Boolean(profile?.phone_verified_at && profile?.phone);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await fetch("/api/phone/start-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      if (data.devCode) {
        // Dev mode without Twilio configured — surface the code so it can be tested locally.
        setInfo(`Dev mode: code is ${data.devCode}`);
      } else {
        setInfo("Code sent. Check your texts.");
      }
      setMode("enter_code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify");
      await mutateProfile();
      setMode("view");
      setCode("");
      setInfo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    if (!confirm("Unlink this phone number from Marco?")) return;
    setUnlinking(true);
    try {
      const res = await fetch("/api/phone/confirm", { method: "DELETE" });
      if (res.ok) await mutateProfile();
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: "#1C1A17" }}>Text Marco</p>
          <p className="text-xs mt-0.5" style={{ color: "#a09890" }}>
            {verified
              ? `Linked to ${profile!.phone}`
              : "Save & find recipes by text message"}
          </p>
        </div>
        {verified && (
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="text-xs font-semibold text-gray-400 active:scale-95 transition-transform"
          >
            {unlinking ? "…" : "Unlink"}
          </button>
        )}
      </div>

      {!verified && mode === "view" && (
        <button
          onClick={() => { setMode("enter_phone"); setError(""); setInfo(""); }}
          className="mt-3 px-4 py-2 rounded-full text-xs font-bold text-white active:scale-95 transition-all"
          style={{ background: "#e8530a" }}
        >
          Verify your number
        </button>
      )}

      {mode === "enter_phone" && (
        <form onSubmit={handleStart} className="mt-3 space-y-2">
          {error && <div className="bg-red-50 text-red-600 p-2 rounded-xl text-xs">{error}</div>}
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="(555) 123-4567"
            autoFocus
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2 rounded-xl font-bold text-sm text-white active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{ background: "#e8530a" }}
            >
              {busy ? "Sending…" : "Send code"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600"
              style={{ background: "#eeecea" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "enter_code" && (
        <form onSubmit={handleConfirm} className="mt-3 space-y-2">
          {info && <div className="bg-amber-50 text-amber-800 p-2 rounded-xl text-xs">{info}</div>}
          {error && <div className="bg-red-50 text-red-600 p-2 rounded-xl text-xs">{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
            autoFocus
            placeholder="6-digit code"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300 bg-gray-50 focus:bg-white transition-all tracking-widest text-center"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || code.length < 4}
              className="flex-1 py-2 rounded-xl font-bold text-sm text-white active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{ background: "#e8530a" }}
            >
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("enter_phone"); setCode(""); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600"
              style={{ background: "#eeecea" }}
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
