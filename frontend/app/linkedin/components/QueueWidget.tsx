"use client";

import { memo, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PenTool, Calendar, AlertCircle } from "lucide-react";
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
  const barColor = queue_depth >= target_depth ? "bg-green-500" : queue_depth >= 3 ? "bg-amber-500" : "bg-red-400";

  const daysBadgeColor =
    days_since_last_post == null ? "text-gray-400"
    : days_since_last_post > 7 ? "text-red-600 font-semibold"
    : days_since_last_post > 3 ? "text-amber-600"
    : "text-green-600";

  const daysLabel =
    days_since_last_post == null ? "Never posted"
    : days_since_last_post === 0 ? "Posted today"
    : `Last post ${days_since_last_post}d ago`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <PenTool className="w-4 h-4 text-gray-400" />
          Content Queue
        </h2>
        <Link href="/linkedin/drafts" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
          View all →
        </Link>
      </div>

      {/* Summary + progress */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex-1 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            {queue_depth >= target_depth ? (
              <span className="text-green-600 font-medium">{queue_depth} drafts ready</span>
            ) : (
              <span className="text-gray-500">{queue_depth} / {target_depth} ready</span>
            )}
            <span className={`${daysBadgeColor} text-xs`}>{daysLabel}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {next_scheduled && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-gray-400">Next scheduled</p>
            <p className="text-xs font-medium text-gray-700">
              {new Date(next_scheduled).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>
        )}
      </div>

      {/* Draft list — horizontal on wide, vertical on narrow */}
      {ready_drafts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ready_drafts.map((draft) => (
            <Link
              key={draft.id}
              href="/linkedin/drafts"
              className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
            >
              <span className="text-xs text-gray-700 truncate flex-1 mr-2">{draft.topic}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {draft.scheduled_date && (
                  <span className="text-xs text-indigo-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(draft.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  draft.status === "revised" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {draft.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        queue_depth < 3 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              Queue is low — drop an idea in Quick Capture above to generate a draft.
            </p>
          </div>
        )
      )}

      {/* Low queue warning when drafts exist but still below 3 */}
      {ready_drafts.length > 0 && queue_depth < 3 && (
        <div className="flex items-center gap-2 p-2.5 mt-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">Queue is low. Add more ideas to stay ahead.</p>
        </div>
      )}
    </div>
  );
});

QueueWidget.displayName = "QueueWidget";
export default QueueWidget;
