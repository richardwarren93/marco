import Link from "next/link";
import type { Collection } from "@/types";
import { CollectionsIcon } from "@/components/icons/HandDrawnIcons";
import { BUTTER, COBALT, DISPLAY, INK, INK_SOFT, LAV, LIME, MUSTARD, PAPER, PINK } from "@/lib/theme";

/* A collection in the grid. The "every collection gets its own colour" idea is
 * kept — it was the one good thing about the old card — but drawn from the
 * brand stickers instead of Tailwind's orange/purple/sky/emerald/rose/indigo
 * pastels, none of which were ever in this app's palette. */

const STICKERS = [BUTTER, LIME, LAV, COBALT, PINK, MUSTARD];

function getIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % STICKERS.length;
}

export default function CollectionCard({ collection }: { collection: Collection }) {
  const sticker = STICKERS[getIndex(collection.name)];
  const images = collection.preview_images ?? [];
  const count = collection.recipe_count ?? 0;

  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group block overflow-hidden active:scale-[0.98] transition-transform"
      style={{ background: PAPER, borderRadius: 16, border: `2.5px solid ${INK}`, boxShadow: `4px 5px 0 ${INK}` }}
    >
      {/* Image mosaic, or a sticker-coloured placeholder */}
      <div className="relative h-32 sm:h-36 overflow-hidden" style={{ borderBottom: `2.5px solid ${INK}` }}>
        {images.length >= 4 ? (
          <div className="grid grid-cols-2 grid-rows-2 h-full gap-px" style={{ background: INK }}>
            {images.slice(0, 4).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ))}
          </div>
        ) : images.length >= 2 ? (
          <div className="flex h-full gap-px" style={{ background: INK }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[0]} alt="" referrerPolicy="no-referrer" className="w-1/2 h-full object-cover" />
            <div className="w-1/2 flex flex-col gap-px">
              {images.slice(1, 3).map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt=""
                  referrerPolicy="no-referrer"
                  className={`w-full object-cover ${images.length === 2 ? "h-full" : "h-1/2"}`}
                />
              ))}
            </div>
          </div>
        ) : images.length === 1 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ background: sticker }}>
            {/* The app's own hand-drawn icon in ink, not an emoji: it reads on
                every sticker colour, where the emoji's own palette fought
                cobalt and pink. */}
            <span style={{ color: INK, transform: "rotate(-6deg)", display: "inline-flex" }}>
              <CollectionsIcon className="w-10 h-10" />
            </span>
          </div>
        )}

        {/* Public lives on the art, so the title gets the card's full width —
            at 375px in a two-up grid, sharing that row truncated "Weeknight
            wins" to "Weekni…". */}
        {collection.is_public && (
          <span
            className="absolute top-1.5 left-1.5 px-1.5"
            style={{
              background: LIME,
              color: INK,
              fontSize: 9.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              border: `1.5px solid ${INK}`,
              borderRadius: 99,
              paddingTop: 1,
              paddingBottom: 1,
              transform: "rotate(-3deg)",
            }}
          >
            Public
          </span>
        )}

        {/* Count, as a stuck-on tag rather than a blurred glass pill */}
        <span
          className="absolute bottom-1.5 right-1.5 px-2 py-0.5"
          style={{
            background: INK,
            color: PAPER,
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 11,
            borderRadius: 99,
            transform: "rotate(-2deg)",
          }}
        >
          {count} {count === 1 ? "recipe" : "recipes"}
        </span>
      </div>

      <div className="p-3">
        <h3
          className="line-clamp-2"
          style={{ color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, lineHeight: 1.15, letterSpacing: "-0.01em" }}
        >
          {collection.name}
        </h3>
        {collection.description && (
          <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: INK_SOFT }}>
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}
