"use client";

import { useState, useRef } from "react";
import { CREAM_WARM, DISPLAY, INK, INK_MUTED, INK_SOFT, PAPER, TOMATO } from "@/lib/theme";

interface PhotoUploadProps {
  onUploaded: (imageUrl: string, caption: string) => void;
  onCancel: () => void;
}

export default function PhotoUpload({ onUploaded, onCancel }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB");
      return;
    }

    setSelectedFile(file);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onUploaded(data.url, caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 p-3 animate-slide-up" style={{ background: CREAM_WARM, borderRadius: 12, border: `2px solid ${INK}` }}>
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-6 text-sm active:scale-[0.99] transition-transform" style={{ background: PAPER, color: INK_SOFT, border: `2px dashed ${INK}`, borderRadius: 12 }}
        >
          📸 Tap to add a photo
        </button>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-full aspect-video object-cover rounded-xl"
            />
            <button
              onClick={() => {
                setPreview(null);
                setSelectedFile(null);
              }}
              className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            rows={2}
            className="w-full px-3 py-2 text-sm outline-none resize-none" style={{ background: PAPER, color: INK, border: `2px solid ${INK}`, borderRadius: 10 }}
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      <div className="flex gap-2 mt-2">
        {preview && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 py-2 text-sm active:scale-[0.98] transition-transform disabled:opacity-50" style={{ background: TOMATO, color: PAPER, fontFamily: DISPLAY, fontWeight: 700, border: `2px solid ${INK}`, borderRadius: 10, boxShadow: `2px 2px 0 ${INK}` }}
          >
            {uploading ? "Saving..." : "Save Photo"}
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm" style={{ color: INK_MUTED }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
