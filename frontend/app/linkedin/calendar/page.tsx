"use client";

import { memo, useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle,
  FileText,
  X,
  CalendarDays,
} from "lucide-react";
import type { CalendarEntry, Pillar, Draft, Series } from "@/types/linkedin";
import { useToast } from "../components/Toast";
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-50 border-blue-200/60 text-blue-700",
  ready: "bg-emerald-50 border-emerald-200/60 text-emerald-700",
  posted: "bg-stone-100 border-stone-200/60 text-stone-500",
  skipped: "bg-red-50 border-red-200/60 text-red-400",
};

interface AISuggestion {
  date?: string;
  topic?: string;
  title?: string;
  pillar?: string;
  notes?: string;
  raw?: string;
  [key: string]: unknown;
}

const selectClass =
  "w-full rounded-xl border border-stone-200 bg-white text-stone-700 text-sm h-9 px-3 outline-none focus:ring-2 focus:ring-stone-400/30 focus:border-stone-300 transition-colors";

const selectCompactClass =
  "w-full rounded-lg border border-stone-200 bg-white text-stone-700 text-sm px-1 py-0.5 outline-none focus:ring-2 focus:ring-stone-400/30 focus:border-stone-300 transition-colors";

const CalendarPage = memo(function CalendarPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [markPostModal, setMarkPostModal] = useState<CalendarEntry | null>(null);
  const [postForm, setPostForm] = useState({
    content: "",
    post_url: "",
    post_type: "text",
    posted_at: "",
  });
  const [addForm, setAddForm] = useState({
    scheduled_time: "",
    pillar_id: "",
    draft_id: "",
    series_id: "",
    notes: "",
    status: "planned",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchData = useCallback(async () => {
    const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    const [eRes, pRes, dRes, sRes] = await Promise.all([
      fetch(
        `/api/linkedin/calendar?date_from=${dateFrom}&date_to=${dateTo}`
      ),
      fetch("/api/linkedin/pillars"),
      fetch("/api/linkedin/drafts?status=draft"),
      fetch("/api/linkedin/series"),
    ]);
    const eData = await eRes.json();
    const pData = await pRes.json();
    const dData = await dRes.json();
    const sData = await sRes.json();
    setEntries(eData.entries || []);
    setPillars(pData.pillars || []);
    setDrafts(dData.drafts || []);
    setSeriesList(sData.series || []);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleAddEntry = async (e: React.FormEvent, date: string) => {
    e.preventDefault();
    await fetch("/api/linkedin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduled_date: date,
        scheduled_time: addForm.scheduled_time || null,
        pillar_id: addForm.pillar_id ? Number(addForm.pillar_id) : null,
        draft_id: addForm.draft_id ? Number(addForm.draft_id) : null,
        series_id: addForm.series_id ? Number(addForm.series_id) : null,
        notes: addForm.notes || null,
        status: addForm.status,
      }),
    });
    setShowAdd(null);
    setAddForm({
      scheduled_time: "",
      pillar_id: "",
      draft_id: "",
      series_id: "",
      notes: "",
      status: "planned",
    });
    fetchData();
  };

  const handleDeleteEntry = async (id: number) => {
    await fetch(`/api/linkedin/calendar/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleUpdateStatus = async (entryId: number, status: string) => {
    await fetch(`/api/linkedin/calendar/${entryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleMarkPosted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markPostModal) return;

    // Create the post
    const postRes = await fetch("/api/linkedin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "me",
        content: postForm.content,
        post_url: postForm.post_url || null,
        post_type: postForm.post_type,
        posted_at: postForm.posted_at || new Date().toISOString(),
        pillar_id: markPostModal.pillar_id,
        series_id: markPostModal.series_id || null,
        topic_tags: [],
        cta_type: "none",
      }),
    });
    if (!postRes.ok) {
      toast.error("Failed to create post record — please try again.");
      return;
    }
    const postData = await postRes.json();

    // Update calendar entry to posted
    await fetch(`/api/linkedin/calendar/${markPostModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "posted",
        post_id: postData.post?.id,
      }),
    });

    // If linked to a draft, mark it as posted
    if (markPostModal.draft_id && postData.post?.id) {
      await fetch(
        `/api/linkedin/drafts/${markPostModal.draft_id}/mark-posted?post_id=${postData.post.id}`,
        { method: "POST" }
      );
    }

    setMarkPostModal(null);
    setPostForm({ content: "", post_url: "", post_type: "text", posted_at: "" });
    fetchData();
  };

  const handleGetSuggestions = async () => {
    setLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const res = await fetch("/api/linkedin/calendar/suggestions");
      if (!res.ok) throw new Error("Server error — try again later");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setSuggestionsError(err instanceof Error ? err.message : "Failed to load suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pillarMap = Object.fromEntries(pillars.map((p) => [p.id, p]));
  const draftMap = Object.fromEntries(drafts.map((d) => [d.id, d]));

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const today = new Date();
  const todayStr =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Content Calendar
        </h1>
        <Button
          onClick={handleGetSuggestions}
          disabled={loadingSuggestions}
          className="bg-stone-900 text-white hover:bg-stone-800"
        >
          <Sparkles className="w-4 h-4" />
          {loadingSuggestions ? "Loading..." : "AI Suggestions"}
        </Button>
      </div>

      {/* Suggestions error */}
      {suggestionsError && (
        <div className="bg-red-50 rounded-2xl border border-red-200/60 p-4 flex items-center justify-between">
          <p className="text-sm text-red-700">{suggestionsError}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuggestionsError(null)}
            className="text-xs text-red-500 hover:text-red-700 ml-4"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-900">
              AI Content Suggestions for Next Week
            </h3>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSuggestions(null)}
              className="hover:bg-stone-200/60"
              aria-label="Dismiss suggestions"
            >
              <X className="w-4 h-4 text-stone-500" />
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
                <CalendarDays className="w-7 h-7 text-stone-400" />
              </div>
              <p className="text-sm text-stone-500">No suggestions available.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-stone-200/60 p-3 space-y-1.5"
                >
                  {s.raw ? (
                    <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                      {s.raw}
                    </p>
                  ) : (
                    <>
                      {(s.date) && (
                        <p className="text-xs font-semibold text-stone-600">{s.date}</p>
                      )}
                      {(s.topic || s.title) && (
                        <p className="text-sm font-medium text-stone-900 leading-snug">
                          {s.topic ?? s.title}
                        </p>
                      )}
                      {s.pillar && (
                        <Badge
                          variant="secondary"
                          className="bg-stone-100 text-stone-700 border-none"
                        >
                          {s.pillar}
                        </Badge>
                      )}
                      {s.notes && (
                        <p className="text-xs text-stone-500 leading-relaxed">{s.notes}</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevMonth}
          className="hover:bg-stone-100"
        >
          <ChevronLeft className="w-5 h-5 text-stone-600" />
        </Button>
        <h2 className="text-lg font-semibold text-stone-900 min-w-[200px] text-center">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="hover:bg-stone-100"
        >
          <ChevronRight className="w-5 h-5 text-stone-600" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stone-200/60">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-stone-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[120px] border-b border-r border-stone-100 bg-stone-50/50"
                />
              );
            }

            const dateStr = getDateStr(day);
            const dayEntries = entries.filter(
              (e) => e.scheduled_date === dateStr
            );
            const isToday = day === todayStr;

            return (
              <div
                key={day}
                className={`min-h-[120px] border-b border-r border-stone-100 p-1.5 ${isToday ? "bg-stone-50/80" : ""}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`text-xs font-medium ${isToday ? "bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center" : "text-stone-500"}`}
                  >
                    {day}
                  </span>
                  <button
                    onClick={() => setShowAdd(dateStr)}
                    className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded hover:bg-stone-100 text-stone-400 hover:text-stone-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Entries */}
                {dayEntries.map((entry) => {
                  const pillar = entry.pillar_id
                    ? pillarMap[entry.pillar_id]
                    : null;
                  const linkedDraft = entry.draft_id
                    ? draftMap[entry.draft_id]
                    : null;
                  return (
                    <div
                      key={entry.id}
                      className={`group text-xs px-1.5 py-1 rounded-lg border mb-0.5 ${STATUS_COLORS[entry.status] || ""}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          {entry.scheduled_time && (
                            <span className="font-medium">
                              {entry.scheduled_time}{" "}
                            </span>
                          )}
                          {pillar && (
                            <span
                              className="font-medium"
                              style={{ color: pillar.color }}
                            >
                              {pillar.name}
                            </span>
                          )}
                          {linkedDraft && (
                            <div className="flex items-center gap-0.5 text-stone-600">
                              <FileText className="w-3 h-3" />
                              <span className="truncate">{linkedDraft.topic}</span>
                            </div>
                          )}
                          {entry.notes && (
                            <p className="truncate">{entry.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-0.5 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                          {entry.status !== "posted" && (
                            <button
                              onClick={() => {
                                setMarkPostModal(entry);
                                // Pre-fill content from linked draft
                                if (linkedDraft) {
                                  setPostForm({
                                    content: linkedDraft.content,
                                    post_url: "",
                                    post_type: "text",
                                    posted_at: `${entry.scheduled_date}T${entry.scheduled_time || "09:00"}`,
                                  });
                                }
                              }}
                              className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-emerald-100 rounded"
                              title="Mark as posted"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 min-w-[28px] min-h-[28px] flex items-center justify-center hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Quick status toggle */}
                      {entry.status === "planned" && (
                        <button
                          onClick={() => handleUpdateStatus(entry.id, "ready")}
                          className="text-xs text-stone-600 hover:text-stone-900 hover:underline mt-0.5"
                        >
                          Mark ready
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add form for this date */}
                {showAdd === dateStr && (
                  <form
                    onSubmit={(e) => handleAddEntry(e, dateStr)}
                    className="mt-1 p-1.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-1"
                  >
                    <Input
                      type="time"
                      value={addForm.scheduled_time}
                      onChange={(e) =>
                        setAddForm({
                          ...addForm,
                          scheduled_time: e.target.value,
                        })
                      }
                      className="h-7 text-sm px-1 rounded-lg border-stone-200"
                    />
                    <select
                      value={addForm.pillar_id}
                      onChange={(e) =>
                        setAddForm({ ...addForm, pillar_id: e.target.value })
                      }
                      className={selectCompactClass}
                    >
                      <option value="">Pillar</option>
                      {pillars.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {drafts.length > 0 && (
                      <select
                        value={addForm.draft_id}
                        onChange={(e) =>
                          setAddForm({ ...addForm, draft_id: e.target.value })
                        }
                        className={selectCompactClass}
                      >
                        <option value="">Link draft...</option>
                        {drafts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.topic}
                          </option>
                        ))}
                      </select>
                    )}
                    {seriesList.length > 0 && (
                      <select
                        value={addForm.series_id}
                        onChange={(e) =>
                          setAddForm({ ...addForm, series_id: e.target.value })
                        }
                        className={selectCompactClass}
                      >
                        <option value="">Series...</option>
                        {seriesList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <Input
                      type="text"
                      value={addForm.notes}
                      onChange={(e) =>
                        setAddForm({ ...addForm, notes: e.target.value })
                      }
                      className="h-7 text-sm px-1 rounded-lg border-stone-200"
                      placeholder="Notes..."
                    />
                    <div className="flex gap-1">
                      <Button
                        type="submit"
                        size="xs"
                        className="bg-stone-900 text-white hover:bg-stone-800"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => setShowAdd(null)}
                        className="border-stone-200 text-stone-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mark as Posted Modal */}
      <Dialog
        open={markPostModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMarkPostModal(null);
            setPostForm({ content: "", post_url: "", post_type: "text", posted_at: "" });
          }
        }}
      >
        <DialogContent className="rounded-2xl border-stone-200/60">
          <form onSubmit={handleMarkPosted} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-stone-900">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Mark as Posted
              </DialogTitle>
              <DialogDescription className="text-stone-500">
                Create a post record for this calendar entry.
                {markPostModal?.notes && (
                  <span className="block mt-1 font-medium text-stone-700">
                    {markPostModal.notes}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Post Content
              </label>
              <Textarea
                value={postForm.content}
                onChange={(e) =>
                  setPostForm({ ...postForm, content: e.target.value })
                }
                rows={6}
                className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white text-sm"
                placeholder="Paste the published post content..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Post Type
                </label>
                <select
                  value={postForm.post_type}
                  onChange={(e) =>
                    setPostForm({ ...postForm, post_type: e.target.value })
                  }
                  className={selectClass}
                >
                  <option value="text">Text</option>
                  <option value="carousel">Carousel</option>
                  <option value="personal image">Personal Image</option>
                  <option value="social proof image">Social Proof Image</option>
                  <option value="poll">Poll</option>
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Posted At
                </label>
                <Input
                  type="datetime-local"
                  value={postForm.posted_at}
                  onChange={(e) =>
                    setPostForm({ ...postForm, posted_at: e.target.value })
                  }
                  className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Post URL
              </label>
              <Input
                type="url"
                value={postForm.post_url}
                onChange={(e) =>
                  setPostForm({ ...postForm, post_url: e.target.value })
                }
                className="rounded-xl border-stone-200 bg-stone-50/50 focus:bg-white text-sm"
                placeholder="https://linkedin.com/posts/..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMarkPostModal(null)}
                className="border-stone-200 text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              >
                Create Post & Mark Posted
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});

CalendarPage.displayName = "CalendarPage";
export default CalendarPage;
