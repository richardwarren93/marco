"use client";

import { useState, useRef } from "react";

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
    <div className="mt-3 bg-gray-50 rounded-xl p-3 animate-slide-up">
      {!preview ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 text-sm hover:border-orange-300 hover:text-orange-500 transition-colors"
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
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 resize-none"
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
            className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {uploading ? "Posting..." : "Post to Feed"}
          </button>
        )}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
