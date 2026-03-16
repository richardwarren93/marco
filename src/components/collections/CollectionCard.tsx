import Link from "next/link";
import type { Collection } from "@/types";

export default function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow p-4"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 text-lg">{collection.name}</h3>
        {collection.is_public && (
          <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
            Public
          </span>
        )}
      </div>
      {collection.description && (
        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
          {collection.description}
        </p>
      )}
      <div className="mt-3 text-xs text-gray-400">
        {collection.recipe_count !== undefined && (
          <span>
            {collection.recipe_count} {collection.recipe_count === 1 ? "recipe" : "recipes"}
          </span>
        )}
      </div>
    </Link>
  );
}
