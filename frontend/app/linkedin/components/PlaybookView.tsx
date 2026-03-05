"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PlaybookView = memo(function PlaybookView() {
  const [playbook, setPlaybook] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPlaybook = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/playbook");
      const data = await res.json();
      setPlaybook(data.playbook?.content || null);
    } catch (err) {
      console.error("PlaybookView.fetchPlaybook: GET /api/linkedin/playbook failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaybook();
  }, [fetchPlaybook]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch("/api/linkedin/playbook", { method: "POST" });
      await fetchPlaybook();
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200/60 p-5 space-y-4">
        <Skeleton className="h-4 w-1/3 rounded-lg" />
        <Skeleton className="h-3 w-full rounded-lg" />
        <Skeleton className="h-3 w-2/3 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-stone-400" />
          Playbook
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="gap-1.5 rounded-xl border-stone-200 text-stone-600 hover:bg-stone-50 text-xs h-7"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {playbook ? (
        <div className="space-y-1 text-sm text-stone-700 max-h-96 overflow-y-auto pr-1">
          {playbook.split("\n").map((line, i) => renderLine(line, i))}
        </div>
      ) : (
        <p className="text-sm text-stone-500">
          No playbook generated yet. Add posts with metrics and the playbook
          will auto-generate from your learnings.
        </p>
      )}
    </div>
  );
});

/** Render inline markdown: **bold** and *italic* */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={idx++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={idx++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

function renderLine(line: string, i: number): React.ReactNode {
  if (/^# /.test(line)) {
    return (
      <h2 key={i} className="text-base font-semibold text-stone-900 mt-5 mb-1 first:mt-0 tracking-tight">
        {renderInline(line.slice(2))}
      </h2>
    );
  }
  if (/^## /.test(line)) {
    return (
      <h3 key={i} className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-4 mb-1.5 first:mt-0">
        {renderInline(line.slice(3))}
      </h3>
    );
  }
  if (/^### /.test(line)) {
    return (
      <p key={i} className="text-xs font-semibold text-stone-500 italic mt-3 mb-1">
        {renderInline(line.slice(4))}
      </p>
    );
  }
  if (/^[-*] /.test(line)) {
    return (
      <div key={i} className="flex gap-2 ml-1">
        <span className="text-stone-400 shrink-0 mt-0.5">·</span>
        <p className="text-sm text-stone-700 leading-relaxed">{renderInline(line.slice(2))}</p>
      </div>
    );
  }
  if (!line.trim()) return <div key={i} className="h-1.5" />;
  return (
    <p key={i} className="text-sm text-stone-700 leading-relaxed">
      {renderInline(line)}
    </p>
  );
}

PlaybookView.displayName = "PlaybookView";
export default PlaybookView;
