"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { BookOpen, RefreshCw } from "lucide-react";

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
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          Playbook
        </h2>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          Regenerate
        </button>
      </div>

      {playbook ? (
        <div className="space-y-1 text-sm text-gray-700 max-h-96 overflow-y-auto pr-1">
          {playbook.split("\n").map((line, i) => renderLine(line, i))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
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
  // Split on **bold** and *italic* tokens
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
  // h1: #
  if (/^# /.test(line)) {
    return (
      <h2 key={i} className="text-base font-bold text-gray-900 mt-5 mb-1 first:mt-0">
        {renderInline(line.slice(2))}
      </h2>
    );
  }
  // h2: ##
  if (/^## /.test(line)) {
    return (
      <h3 key={i} className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mt-4 mb-1.5 first:mt-0">
        {renderInline(line.slice(3))}
      </h3>
    );
  }
  // h3: ###
  if (/^### /.test(line)) {
    return (
      <p key={i} className="text-xs font-semibold text-gray-500 italic mt-3 mb-1">
        {renderInline(line.slice(4))}
      </p>
    );
  }
  // bullet: - or *
  if (/^[-*] /.test(line)) {
    return (
      <div key={i} className="flex gap-2 ml-1">
        <span className="text-gray-400 shrink-0 mt-0.5">·</span>
        <p className="text-sm text-gray-700 leading-relaxed">{renderInline(line.slice(2))}</p>
      </div>
    );
  }
  // blank line
  if (!line.trim()) return <div key={i} className="h-1.5" />;
  // paragraph
  return (
    <p key={i} className="text-sm text-gray-700 leading-relaxed">
      {renderInline(line)}
    </p>
  );
}

PlaybookView.displayName = "PlaybookView";
export default PlaybookView;
