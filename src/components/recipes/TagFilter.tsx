"use client";

interface TagFilterProps {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export default function TagFilter({ tags, selected, onToggle, onClear }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onToggle(tag)}
          className={`text-sm px-3 py-1 rounded-full transition-colors ${
            selected.includes(tag)
              ? "bg-orange-600 text-white"
              : "bg-orange-50 text-orange-700"
          }`}
        >
          {tag}
        </button>
      ))}
      {selected.length > 0 && (
        <button
          onClick={onClear}
          className="text-sm px-3 py-1 rounded-full text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}
