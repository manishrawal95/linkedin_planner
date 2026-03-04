"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { CheckCircle2, Link2 } from "lucide-react";
import type { AuthStatus } from "@/types/linkedin";

const LinkedInAuthStatus = memo(function LinkedInAuthStatus() {
  const [status, setStatus] = useState<AuthStatus | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/auth/status");
      if (res.ok) setStatus(await res.json());
    } catch (err) {
      console.error("LinkedInAuthStatus.fetch_: GET /api/linkedin/auth/status failed:", err);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (!status) return null;

  if (status.authenticated) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">LinkedIn connected</span>
      </div>
    );
  }

  return (
    <a
      href="/api/linkedin/auth/start"
      className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-100 transition-colors font-medium"
    >
      <Link2 className="w-3.5 h-3.5 shrink-0" />
      Connect LinkedIn
    </a>
  );
});

LinkedInAuthStatus.displayName = "LinkedInAuthStatus";
export default LinkedInAuthStatus;
