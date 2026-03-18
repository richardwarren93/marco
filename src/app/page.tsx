import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Save recipes from
          <br />
          <span className="text-orange-600">Instagram & TikTok</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Paste a link, and Marco extracts the recipe with AI. Manage your
          pantry and get smart meal suggestions.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-medium text-lg hover:bg-orange-700"
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium text-lg hover:bg-gray-100"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
