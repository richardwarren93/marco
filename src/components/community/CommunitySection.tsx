"use client";

import RatingStars from "@/components/community/RatingStars";
import CommunityNotes from "@/components/community/CommunityNotes";

export default function CommunitySection({ sourceUrl }: { sourceUrl: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-6 mt-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Community</h2>
      <div className="mb-6">
        <RatingStars sourceUrl={sourceUrl} />
      </div>
      <CommunityNotes sourceUrl={sourceUrl} />
    </div>
  );
}
