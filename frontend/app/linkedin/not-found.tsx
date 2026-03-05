import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LinkedInNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div
        className="w-full max-w-md text-center"
        style={{ animation: "scaleIn 300ms var(--ease-default) both" }}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 border border-stone-200/60">
          <FileQuestion className="h-8 w-8 text-stone-400" />
        </div>

        <h2 className="text-xl font-semibold text-stone-900 mb-2 tracking-tight">
          Page not found
        </h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-sm mx-auto">
          The page you are looking for does not exist or may have been moved.
          Check the URL or head back to the dashboard.
        </p>

        <Button asChild className="gap-2 rounded-xl">
          <Link href="/linkedin">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
