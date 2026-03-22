"use client";

import { useState, useRef } from "react";

interface PhotoUploadProps {
  recipeId: string;
  onUploaded: () => void;
}

export default function PhotoUpload({ recipeId, onUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB");
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("recipe_id", recipeId);
      if (caption.trim()) formData.append("caption", caption.trim());

      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      setSelectedFile(null);
      setPreview(null);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleCancel() {
    setSelectedFile(null);
    setPreview(null);
    setCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      {!preview ? (
        <label className="block border-2 border-dashed border-orange-300 bg-orange-50 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 transition-colors">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-orange-600 font-medium">+ Add a photo</div>
          <p className="text-sm text-gray-500 mt-1">
            JPEG, PNG, or WebP up to 10MB
          </p>
        </label>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-64 object-cover"
          />
          <div className="p-3 space-y-3">
            <input
              type="text"
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={handleCancel}
                disabled={uploading}
                className="text-gray-600 hover:text-gray-900 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
