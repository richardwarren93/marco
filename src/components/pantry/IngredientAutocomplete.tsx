"use client";

import { useState, useRef, useEffect } from "react";
import { searchIngredients, type IngredientData } from "@/data/ingredients";

interface IngredientAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect: (ingredient: IngredientData | null, name: string) => void;
  placeholder?: string;
}

export default function IngredientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. chicken breast",
}: IngredientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<IngredientData[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInputChange(val: string) {
    onChange(val);
    const results = searchIngredients(val);
    setSuggestions(results);
    setShowDropdown(results.length > 0 && val.trim().length > 0);
    setHighlightIndex(-1);
  }

  function handleSelectSuggestion(ingredient: IngredientData) {
    onChange(ingredient.name);
    onSelect(ingredient, ingredient.name);
    setShowDropdown(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-[150px]">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Ingredient
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0 && value.trim()) setShowDropdown(true);
        }}
        onKeyDown={handleKeyDown}
        required
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500"
      />

      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((item, i) => (
            <li
              key={item.name}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(item);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${
                i === highlightIndex
                  ? "bg-orange-50 text-orange-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="capitalize">{item.name}</span>
              <span className="text-xs text-gray-400 capitalize">{item.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
