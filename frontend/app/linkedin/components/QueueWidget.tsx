"use client";

import { memo, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PenTool, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { QueueStatus } from "@/types/linkedin";

const QueueWidget = memo(function QueueWidget() {
  const [data, setData] = useState<QueueStatus | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/dashboard/queue-status");
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("QueueWidget.fetch_: GET /api/linkedin/dashboard/queue-status failed:", err);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (!data) return null;

  const { queue_depth, target_depth, ready_drafts, days_since_last_post, next_scheduled } = data;
  const pct = Math.min(100, (queue_depth / target_depth) * 100);

  const daysBadgeColor =
    days_since_last_post == null ? "text-stone-400"
    : days_since_last_post > 7 ? "text-red-600 font-semibold"
    : days_since_last_post > 3 ? "text-amber-600"
    : "text-emerald-600";

  const daysLabel =
    days_since_last_post == null ? "Never posted"
    : days_since_last_post === 0 ? "Posted today"
    : `Last post ${days_since_last_post}d ago`;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-stone-400" />
          Content Queue
        </h2>
        <Link href="/linkedin/drafts" className="text-xs text-stone-500 hover:text-stone-700 font-medium transition-colors">
          View all &rarr;
        </Link>
      </div>

      {/* Summary + progress */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            {queue_depth >= target_depth ? (
              <span className="text-emerald-600 font-medium">{queue_depth} drafts ready</span>
            ) : (
              <span className="text-stone-500">{queue_depth} / {target_depth} ready</span>
            )}
            <span className={`${daysBadgeColor} text-xs`}>{daysLabel}</span>
          </div>
          <Progress value={pct} className="h-2 bg-stone-100" />
        </div>
        {next_scheduled && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-stone-400">Next scheduled</p>
            <p className="text-xs font-medium text-stone-700">
              {new Date(next_scheduled).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {/* Draft list */}
      {ready_drafts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ready_drafts.map((draft) => (
            <Link
              key={draft.id}
              href="/linkedin/drafts"
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200/60"
            >
              <span className="text-xs text-stone-700 truncate flex-1 mr-2">{draft.topic}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {draft.scheduled_date && (
                  <span className="text-xs text-stone-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(draft.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 h-5 ${
                    draft.status === "revised"
                      ? "bg-blue-50 text-blue-700 border-blue-200/60"
                      : "bg-amber-50 text-amber-700 border-amber-200/60"
                  } hover:bg-transparent`}
                >
                  {draft.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        queue_depth < 3 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/60 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Queue is low — drop an idea in Quick Capture above to generate a draft.
            </p>
          </div>
        )
      )}

      {ready_drafts.length > 0 && queue_depth < 3 && (
        <div className="flex items-center gap-2 p-2.5 mt-2 bg-amber-50 border border-amber-200/60 rounded-xl">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Queue is low. Add more ideas to stay ahead.</p>
        </div>
      )}
    </div>
  );
});

QueueWidget.displayName = "QueueWidget";
export default QueueWidget;
