import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function LinkedInNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div
        className="w-full max-w-md text-center"
        style={{ animation: "scaleIn 300ms var(--ease-default) both" }}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 border border-gray-200">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Page not found
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6 max-w-sm mx-auto">
          The page you are looking for does not exist or may have been moved.
          Check the URL or head back to the dashboard.
        </p>

        <Link
          href="/linkedin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
