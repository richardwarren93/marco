import Link from "next/link";
import type { Collection } from "@/types";
import { RECENTLY_MADE_COLLECTION_NAME } from "@/lib/collections";

const cardGradients = [
  "from-orange-50 to-amber-50",
  "from-purple-50 to-violet-50",
  "from-sky-50 to-blue-50",
  "from-emerald-50 to-teal-50",
  "from-rose-50 to-pink-50",
  "from-indigo-50 to-violet-50",
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cardGradients[Math.abs(hash) % cardGradients.length];
}

export default function CollectionCard({ collection }: { collection: Collection }) {
  const isRecentlyMade = collection.name === RECENTLY_MADE_COLLECTION_NAME;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="block bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Colored header strip */}
      <div
        className={`h-2 bg-gradient-to-r ${
          isRecentlyMade ? "from-green-400 to-emerald-400" : getGradient(collection.name)
        }`}
      />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900">
            {isRecentlyMade && <span className="mr-1.5">🍳</span>}
            {collection.name}
          </h3>
          <div className="flex items-center gap-1.5">
            {collection.is_public && (
              <span className="bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Public
              </span>
            )}
            {collection.recipe_count !== undefined && (
              <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {collection.recipe_count} 📖
              </span>
            )}
          </div>
        </div>
        {collection.description && (
          <p className="text-gray-400 text-sm mt-1.5 line-clamp-2">
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}
