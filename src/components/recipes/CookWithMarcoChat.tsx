"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Recipe, Ingredient } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string; // local object URL for display
}

interface CookWithMarcoChatProps {
  recipe: Recipe;
  onClose: () => void;
}

const QUICK_CHIPS = [
  "Substitute ingredients",
  "Make it healthier",
  "Make it more delicious",
];

export default function CookWithMarcoChat({
  recipe,
  onClose,
}: CookWithMarcoChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm here to help you cook ${recipe.title}. Ask me anything — substitutions, technique tips, or send a photo and I'll give feedback! \u{1F9D1}\u200D\u{1F373}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // Prevent body scroll when chat is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const buildConversationHistory = useCallback(() => {
    // Skip welcome message and empty assistant placeholders (from failed streams)
    return messages
      .filter((m) => m.id !== "welcome" && !(m.role === "assistant" && !m.content))
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string, image?: { base64: string; mimeType: string; previewUrl: string } | null) => {
      if ((!text.trim() && !image) || isStreaming) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        imageUrl: image?.previewUrl,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setShowChips(false);
      setPendingImage(null);
      setIsStreaming(true);

      // Add placeholder for assistant response
      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const recipeContext = {
          title: recipe.title,
          ingredients: recipe.ingredients as Ingredient[],
          steps: recipe.steps,
          servings: recipe.servings,
          prep_time_minutes: recipe.prep_time_minutes,
          cook_time_minutes: recipe.cook_time_minutes,
          calories: recipe.calories,
          protein_g: recipe.protein_g,
          carbs_g: recipe.carbs_g,
          fat_g: recipe.fat_g,
          tags: recipe.tags,
        };

        const conversationHistory = buildConversationHistory();

        const response = await fetch("/api/chat/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe: recipeContext,
            messages: conversationHistory,
            userMessage: text.trim() || "What do you see in this photo?",
            image: image
              ? { base64: image.base64, mimeType: image.mimeType }
              : null,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                }
              } catch (e) {
                // Skip malformed JSON lines
                if (e instanceof Error && e.message !== "Stream interrupted") {
                  // ignore parse errors on partial chunks
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Sorry, I ran into a problem. Please try again! If the issue persists, check your connection.",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, recipe, buildConversationHistory]
  );

  const handleSend = () => {
    sendMessage(input, pendingImage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (chip: string) => {
    sendMessage(chip);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is like "data:image/jpeg;base64,/9j/..."
      const base64 = result.split(",")[1];
      const mimeType = file.type || "image/jpeg";
      const previewUrl = URL.createObjectURL(file);

      setPendingImage({ base64, mimeType, previewUrl });
      inputRef.current?.focus();
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  const removePendingImage = () => {
    if (pendingImage?.previewUrl) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }
    setPendingImage(null);
  };

  // Learn from conversation when chat closes
  const handleClose = useCallback(() => {
    // Fire and forget — don't block the close
    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (userMsgCount >= 2) {
      fetch("/api/chat/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            id: m.id,
          })),
          recipeName: recipe.title,
        }),
      }).catch(() => {
        // Silent fail — learning is non-critical
      });
    }
    onClose();
  }, [messages, recipe.title, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#faf9f7" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{
          background: "#ffffff",
          borderColor: "#e8e6e3",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{"\u{1F9D1}\u200D\u{1F373}"}</span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              Cook with Marco
            </h2>
            <p className="text-xs text-gray-500 truncate">{recipe.title}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0"
          aria-label="Close chat"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Quick chips */}
        {showChips && (
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                disabled={isStreaming}
                className="px-3.5 py-2 rounded-full text-xs font-medium border transition-all active:scale-95 disabled:opacity-50"
                style={{
                  borderColor: "#e8530a",
                  color: "#e8530a",
                  background: "rgba(232, 83, 10, 0.05)",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm mt-1" style={{ background: "#fff3ed" }}>
                  {"\u{1F9D1}\u200D\u{1F373}"}
                </div>
              )}

              <div className="space-y-1">
                {/* Image attachment */}
                {msg.imageUrl && (
                  <div
                    className={`rounded-2xl overflow-hidden ${msg.role === "user" ? "ml-auto" : ""}`}
                    style={{ maxWidth: 200 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded photo"
                      className="w-full h-auto rounded-2xl"
                    />
                  </div>
                )}

                {/* Text bubble */}
                {(msg.content || msg.role === "assistant") && (
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "rounded-tr-md"
                        : "rounded-tl-md"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "#e8530a", color: "white" }
                        : { background: "#ffffff", color: "#1a1410", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }
                    }
                  >
                    {msg.content || (
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="shrink-0 border-t px-3 py-2"
        style={{
          background: "#ffffff",
          borderColor: "#e8e6e3",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
        }}
      >
        {/* Pending image preview */}
        {pendingImage && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage.previewUrl}
              alt="Pending upload"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <span className="text-xs text-gray-500 flex-1">Photo attached</span>
            <button
              onClick={removePendingImage}
              className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Remove photo"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Camera / photo button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming}
            className="p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-40 shrink-0"
            aria-label="Attach photo"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#a09890"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                // Scroll input into view on mobile keyboard
                setTimeout(() => {
                  inputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }, 300);
              }}
              placeholder="Ask Marco anything..."
              disabled={isStreaming}
              rows={1}
              className="w-full resize-none rounded-2xl border px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50 placeholder:text-gray-400"
              style={{
                borderColor: "#e8e6e3",
                background: "#faf9f7",
                maxHeight: 120,
                lineHeight: "1.4",
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={isStreaming || (!input.trim() && !pendingImage)}
            className="p-2.5 rounded-full transition-all active:scale-90 disabled:opacity-40 shrink-0"
            style={{
              background:
                input.trim() || pendingImage ? "#e8530a" : "#e8e6e3",
            }}
            aria-label="Send message"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke={input.trim() || pendingImage ? "white" : "#a09890"}
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
