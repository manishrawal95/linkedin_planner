"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LinkedInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[linkedin] Unhandled error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div
        className="w-full max-w-md text-center"
        style={{ animation: "scaleIn 300ms var(--ease-default) both" }}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h2 className="text-xl font-semibold text-stone-900 mb-2 tracking-tight">
          Something went wrong
        </h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-6 max-w-sm mx-auto">
          An unexpected error occurred while loading this page. This has been
          logged and we will look into it.
        </p>

        {error.digest && (
          <p className="text-xs text-stone-400 mb-6 font-mono">
            Reference: {error.digest}
          </p>
        )}

        <Button onClick={reset} className="gap-2 rounded-xl">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
