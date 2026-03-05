"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Layers, ToggleLeft, ToggleRight, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Series, Pillar } from "@/types/linkedin";

const FREQUENCIES = ["daily", "weekly", "biweekly", "monthly"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const selectClass =
  "w-full border border-stone-200/60 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-colors";

const SeriesPage = memo(function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [seriesStats, setSeriesStats] = useState<Record<number, { post_count: number; last_posted: string | null }>>({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    pillar_id: "",
    frequency: "weekly",
    preferred_day: "",
    preferred_time: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [sRes, pRes] = await Promise.all([
        fetch("/api/linkedin/series"),
        fetch("/api/linkedin/pillars"),
      ]);
      const sData = await sRes.json();
      const pData = await pRes.json();
      const seriesList = sData.series || [];
      setSeries(seriesList);
      setPillars(pData.pillars || []);

      // Fetch stats for each series
      const stats: Record<number, { post_count: number; last_posted: string | null }> = {};
      await Promise.all(
        seriesList.map(async (s: Series) => {
          try {
            const res = await fetch(`/api/linkedin/series/${s.id}/stats`);
            const data = await res.json();
            stats[s.id] = { post_count: data.post_count || 0, last_posted: data.last_posted || null };
          } catch {
            stats[s.id] = { post_count: 0, last_posted: null };
          }
        })
      );
      setSeriesStats(stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = useCallback(() => {
    setForm({
      name: "",
      description: "",
      pillar_id: "",
      frequency: "weekly",
      preferred_day: "",
      preferred_time: "",
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/linkedin/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        pillar_id: form.pillar_id ? Number(form.pillar_id) : null,
        preferred_day: form.preferred_day || null,
        preferred_time: form.preferred_time || null,
      }),
    });
    setShowForm(false);
    resetForm();
    fetchData();
  };

  const handleToggleActive = async (s: Series) => {
    await fetch(`/api/linkedin/series/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: s.is_active ? 0 : 1 }),
    });
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this series?")) return;
    await fetch(`/api/linkedin/series/${id}`, { method: "DELETE" });
    fetchData();
  };

  const pillarMap = Object.fromEntries(pillars.map((p) => [p.id, p]));

  const freqColors: Record<string, string> = {
    daily: "bg-stone-200/60 text-stone-700",
    weekly: "bg-stone-100 text-stone-600",
    biweekly: "bg-stone-150 text-stone-600",
    monthly: "bg-stone-100/80 text-stone-500",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Content Series</h1>
          <p className="text-sm text-stone-500 mt-1">
            {series.length} series, {series.filter((s) => s.is_active).length} active
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Series
        </Button>
      </div>

      {/* New Series Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Series</DialogTitle>
            <DialogDescription>
              Create a recurring content series for consistency.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Monday Motivation"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Pillar</label>
                <select
                  value={form.pillar_id}
                  onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Any pillar</option>
                  {pillars.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="What's this series about?"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className={selectClass}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Preferred Day</label>
                <select
                  value={form.preferred_day}
                  onChange={(e) => setForm({ ...form, preferred_day: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Any day</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Preferred Time</label>
                <Input
                  type="time"
                  value={form.preferred_time}
                  onChange={(e) => setForm({ ...form, preferred_time: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Series
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {series.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/60">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-stone-400" />
          </div>
          <p className="text-sm font-medium text-stone-600">No content series yet</p>
          <p className="text-xs text-stone-400 mt-1">
            Create recurring content series for consistency
          </p>
          <Button
            onClick={() => setShowForm(true)}
            className="mt-4"
          >
            <Plus className="w-4 h-4" />
            Add Series
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {series.map((s) => {
            const pillar = s.pillar_id ? pillarMap[s.pillar_id] : null;
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border border-stone-200/60 p-5 hover:shadow-sm transition-shadow ${!s.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={freqColors[s.frequency] || "bg-stone-100 text-stone-600"}
                      >
                        {s.frequency}
                      </Badge>
                      {pillar && (
                        <Badge
                          variant="secondary"
                          className="font-medium"
                          style={{
                            backgroundColor: `${pillar.color}15`,
                            color: pillar.color,
                          }}
                        >
                          {pillar.name}
                        </Badge>
                      )}
                      {s.preferred_day && (
                        <span className="text-xs text-stone-400">
                          {s.preferred_day}
                        </span>
                      )}
                      {s.preferred_time && (
                        <span className="text-xs text-stone-400">
                          at {s.preferred_time}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleToggleActive(s)}
                      title={s.is_active ? "Deactivate" : "Activate"}
                    >
                      {s.is_active ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-stone-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(s.id)}
                      className="hover:bg-red-50 hover:text-red-600 text-stone-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {s.description && (
                  <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                    {s.description}
                  </p>
                )}
                {/* Stats */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100">
                  <span className="flex items-center gap-1.5 text-xs text-stone-500">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-semibold text-stone-700">{seriesStats[s.id]?.post_count || 0}</span> posts
                  </span>
                  {seriesStats[s.id]?.last_posted && (
                    <span className="flex items-center gap-1.5 text-xs text-stone-500">
                      <Clock className="w-3.5 h-3.5" />
                      Last: {new Date(seriesStats[s.id].last_posted!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {!seriesStats[s.id]?.last_posted && seriesStats[s.id]?.post_count === 0 && (
                    <span className="text-xs text-amber-500 font-medium">No posts yet</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

SeriesPage.displayName = "SeriesPage";
export default SeriesPage;
