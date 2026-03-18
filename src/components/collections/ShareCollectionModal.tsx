"use client";

import { useState } from "react";
import type { Collection } from "@/types";

interface Props {
  collection: Collection;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareCollectionModal({ collection, isOpen, onClose }: Props) {
  const [isPublic, setIsPublic] = useState(collection.is_public);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/collections/shared/${collection.share_token}`
    : "";

  async function handleTogglePublic() {
    setToggling(true);
    try {
      const res = await fetch("/api/collections/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: collection.id, is_public: !isPublic }),
      });

      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Share Collection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Public Link</p>
              <p className="text-xs text-gray-500">Anyone with the link can view this collection</p>
            </div>
            <button
              onClick={handleTogglePublic}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPublic ? "bg-orange-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {isPublic && (
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Share link</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-700"
              />
              <button
                onClick={handleCopy}
                className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
