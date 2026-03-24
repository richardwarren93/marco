import Link from "next/link";
import type { Collection } from "@/types";

const gradients = [
  "from-orange-100 to-amber-50",
  "from-purple-100 to-violet-50",
  "from-sky-100 to-blue-50",
  "from-emerald-100 to-teal-50",
  "from-rose-100 to-pink-50",
  "from-indigo-100 to-violet-50",
];

const accentColors = [
  "bg-orange-500",
  "bg-purple-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-indigo-500",
];

function getIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % gradients.length;
}

export default function CollectionCard({ collection }: { collection: Collection }) {
  const idx = getIndex(collection.name);
  const images = collection.preview_images ?? [];
  const count = collection.recipe_count ?? 0;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block bg-white rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* Image mosaic or gradient placeholder */}
      <div className="relative h-32 sm:h-36 overflow-hidden">
        {images.length >= 4 ? (
          /* 4-image grid */
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-px bg-gray-100">
            {images.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ))}
          </div>
        ) : images.length >= 2 ? (
          /* 2-3 image split */
          <div className="flex h-full gap-px bg-gray-100">
            <img
              src={images[0]}
              alt=""
              className="w-1/2 h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="w-1/2 flex flex-col gap-px">
              {images.slice(1, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className={`w-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                    images.length === 2 ? "h-full" : "h-1/2"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : images.length === 1 ? (
          /* Single image */
          <img
            src={images[0]}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          /* No images — gradient with icon */
          <div className={`h-full bg-gradient-to-br ${gradients[idx]} flex items-center justify-center`}>
            <div className="text-center">
              <span className="text-3xl">📚</span>
            </div>
          </div>
        )}

        {/* Recipe count badge overlay */}
        <div className="absolute bottom-2 right-2">
          <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            {count} {count === 1 ? "recipe" : "recipes"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              {collection.name}
            </h3>
            {collection.description && (
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5 line-clamp-1">
                {collection.description}
              </p>
            )}
          </div>
          {collection.is_public && (
            <span className="flex-shrink-0 bg-green-50 text-green-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-green-100">
              Public
            </span>
          )}
        </div>

        {/* Accent bar */}
        <div className={`h-0.5 w-8 ${accentColors[idx]} rounded-full mt-3 opacity-40`} />
      </div>
    </Link>
  );
}
