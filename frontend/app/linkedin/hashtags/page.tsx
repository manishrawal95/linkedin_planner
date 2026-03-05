"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Hash, Copy, Check, Filter, TrendingUp, RotateCw } from "lucide-react";
import type { Pillar, HashtagSet } from "@/types/linkedin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

function parseHashtags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

const HashtagSetsPage = memo(function HashtagSetsPage() {
  const [hashtagSets, setHashtagSets] = useState<HashtagSet[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterPillar, setFilterPillar] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    hashtags: "",
    pillar_id: "",
  });

  const fetchPillars = useCallback(async () => {
    const res = await fetch("/api/linkedin/pillars");
    const data = await res.json();
    setPillars(data.pillars || []);
  }, []);

  const fetchHashtagSets = useCallback(async () => {
    const params = filterPillar ? `?pillar_id=${filterPillar}` : "";
    try {
      const res = await fetch(`/api/linkedin/hashtags${params}`);
      const data = await res.json();
      setHashtagSets(data.hashtag_sets || []);
    } finally {
      setLoading(false);
    }
  }, [filterPillar]);

  useEffect(() => {
    fetchPillars();
  }, [fetchPillars]);

  useEffect(() => {
    fetchHashtagSets();
  }, [fetchHashtagSets]);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      // Parse hashtags from textarea: support one per line or comma-separated
      const raw = form.hashtags
        .split(/[\n,]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await fetch("/api/linkedin/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          hashtags: raw,
          pillar_id: form.pillar_id ? Number(form.pillar_id) : null,
        }),
      });
      setShowForm(false);
      setForm({ name: "", hashtags: "", pillar_id: "" });
      fetchHashtagSets();
    },
    [form, fetchHashtagSets]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("Delete this hashtag set?")) return;
      await fetch(`/api/linkedin/hashtags/${id}`, { method: "DELETE" });
      fetchHashtagSets();
    },
    [fetchHashtagSets]
  );

  const handleCopyAll = useCallback(
    async (id: number, tags: string[]) => {
      const text = tags.map((t) => `#${t}`).join(" ");
      try {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        // Track usage
        fetch(`/api/linkedin/hashtags/${id}/use`, { method: "POST" }).then(() => fetchHashtagSets());
      } catch {
        // fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        // Track usage
        fetch(`/api/linkedin/hashtags/${id}/use`, { method: "POST" }).then(() => fetchHashtagSets());
      }
    },
    [fetchHashtagSets]
  );

  const pillarMap = Object.fromEntries(pillars.map((p) => [p.id, p]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Hashtag Sets</h1>
          <p className="text-sm text-stone-500 mt-1">
            {hashtagSets.length} set{hashtagSets.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Set
        </Button>
      </div>

      {/* Filter by pillar */}
      <div className="flex gap-3 items-center bg-white rounded-2xl border border-stone-200/60 px-4 py-3">
        <Filter className="w-4 h-4 text-stone-400" />
        <select
          value={filterPillar}
          onChange={(e) => setFilterPillar(e.target.value)}
          className="border border-stone-200/60 rounded-lg px-3 py-1.5 text-sm bg-stone-50 focus:bg-white transition-colors"
        >
          <option value="">All pillars</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add hashtag set form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-stone-900">
            New Hashtag Set
          </h3>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Set Name
            </label>
            <Input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Leadership Hashtags"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Hashtags
            </label>
            <Textarea
              value={form.hashtags}
              onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              rows={4}
              placeholder={"One per line or comma-separated:\nleadership\nmanagement, teamwork\ncareergrowth"}
              required
            />
            <p className="text-xs text-stone-400 mt-1">
              Enter hashtags one per line or comma-separated. The # symbol is
              optional.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Content Pillar
            </label>
            <select
              value={form.pillar_id}
              onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}
              className="w-full border border-stone-200/60 rounded-lg px-3 py-2 text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-stone-400 focus:border-stone-400 transition-colors"
            >
              <option value="">No pillar</option>
              {pillars.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <Button type="submit">
              Add Set
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Hashtag set cards */}
      <div className="space-y-4">
        {hashtagSets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/60">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Hash className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-sm font-medium text-stone-600">
              No hashtag sets yet
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Create reusable hashtag groups for your LinkedIn posts
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Set
            </Button>
          </div>
        ) : (
          hashtagSets.map((set) => {
            const tags = parseHashtags(set.hashtags);
            const pillar = set.pillar_id
              ? pillarMap[set.pillar_id]
              : undefined;

            return (
              <div
                key={set.id}
                className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Pillar color bar */}
                {pillar?.color && (
                  <div
                    className="h-1"
                    style={{ backgroundColor: pillar.color }}
                  />
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name and pillar badge */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h3 className="text-sm font-semibold text-stone-900">
                          {set.name}
                        </h3>
                        {pillar && (
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium"
                            style={{
                              backgroundColor: `${pillar.color}15`,
                              color: pillar.color,
                            }}
                          >
                            {pillar.name}
                          </Badge>
                        )}
                      </div>

                      {/* Hashtag pills */}
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full border border-stone-200/60 font-medium cursor-default hover:bg-stone-200/70 transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                        {tags.length === 0 && (
                          <span className="text-xs text-stone-400 italic">
                            No hashtags
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs text-stone-400">
                        {set.avg_reach != null && set.avg_reach > 0 && (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="font-semibold text-stone-600">
                              {set.avg_reach.toLocaleString()}
                            </span>{" "}
                            avg reach
                          </span>
                        )}
                        {set.times_used > 0 && (
                          <span className="flex items-center gap-1">
                            <RotateCw className="w-3.5 h-3.5" />
                            Used{" "}
                            <span className="font-semibold text-stone-600">
                              {set.times_used}
                            </span>
                            x
                          </span>
                        )}
                        <span>
                          {tags.length} tag{tags.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyAll(set.id, tags)}
                        className="text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        title="Copy all hashtags"
                      >
                        {copiedId === set.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(set.id)}
                        className="text-stone-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete set"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

HashtagSetsPage.displayName = "HashtagSetsPage";
export default HashtagSetsPage;
