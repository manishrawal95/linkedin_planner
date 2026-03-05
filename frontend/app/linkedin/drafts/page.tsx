"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Sparkles, Plus, PenTool, CalendarPlus, X, Send, CheckCircle, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import DraftEditor from "../components/DraftEditor";
import { useToast } from "../components/Toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Draft, Pillar } from "@/types/linkedin";

const DraftsPage = memo(function DraftsPage() {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [scheduleModal, setScheduleModal] = useState<Draft | null>(null);
  const [showIdeas, setShowIdeas] = useState(false);
  const [ideas, setIdeas] = useState<Array<{ topic: string; hook_style: string; pillar: string | null }>>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    time: "",
  });
  const [publishModal, setPublishModal] = useState<Draft | null>(null);
  const [publishForm, setPublishForm] = useState({
    post_url: "",
    post_type: "text",
    posted_at: "",
  });
  const [genForm, setGenForm] = useState({
    topic: "",
    pillar_id: "",
    style: "",
    num_variants: 3,
  });
  const [manualForm, setManualForm] = useState({
    topic: "",
    content: "",
    pillar_id: "",
  });

  const fetchDrafts = useCallback(async () => {
    const res = await fetch("/api/linkedin/drafts");
    const data = await res.json();
    setDrafts(data.drafts || []);
  }, []);

  const fetchPillars = useCallback(async () => {
    const res = await fetch("/api/linkedin/pillars");
    const data = await res.json();
    setPillars(data.pillars || []);
  }, []);

  useEffect(() => {
    fetchDrafts();
    fetchPillars();
  }, [fetchDrafts, fetchPillars]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/linkedin/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...genForm,
          pillar_id: genForm.pillar_id ? Number(genForm.pillar_id) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Generation failed (${res.status})`);
      }
      setShowGenerate(false);
      setGenForm({ topic: "", pillar_id: "", style: "", num_variants: 3 });
      fetchDrafts();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleFetchIdeas = async () => {
    if (showIdeas && ideas.length > 0) {
      setShowIdeas(!showIdeas);
      return;
    }
    setShowIdeas(true);
    setLoadingIdeas(true);
    try {
      const res = await fetch("/api/linkedin/dashboard/post-ideas", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas || []);
      }
    } catch (err) {
      console.error("DraftsPage.handleFetchIdeas: POST /api/linkedin/dashboard/post-ideas failed:", err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/linkedin/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...manualForm,
        pillar_id: manualForm.pillar_id ? Number(manualForm.pillar_id) : null,
      }),
    });
    setShowManual(false);
    setManualForm({ topic: "", content: "", pillar_id: "" });
    fetchDrafts();
  };

  const handleUpdate = async (id: number, data: Record<string, unknown>) => {
    await fetch(`/api/linkedin/drafts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchDrafts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/linkedin/drafts/${id}`, { method: "DELETE" });
    fetchDrafts();
  };

  const openPublishModal = (draft: Draft) => {
    const now = new Date();
    // Format as datetime-local value (YYYY-MM-DDTHH:mm) in local time
    const pad = (n: number) => String(n).padStart(2, "0");
    const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPublishForm({ post_url: "", post_type: "text", posted_at: localNow });
    setPublishModal(draft);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishModal) return;
    const params = new URLSearchParams();
    if (publishForm.post_url) params.set("post_url", publishForm.post_url);
    if (publishForm.post_type) params.set("post_type", publishForm.post_type);
    if (publishForm.posted_at) params.set("posted_at", publishForm.posted_at);

    const res = await fetch(`/api/linkedin/drafts/${publishModal.id}/publish?${params}`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Failed to mark draft as posted. Please try again.");
      return;
    }
    setPublishModal(null);
    setPublishForm({ post_url: "", post_type: "text", posted_at: "" });
    fetchDrafts();
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModal) return;
    const res = await fetch("/api/linkedin/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduled_date: scheduleForm.date,
        scheduled_time: scheduleForm.time || null,
        draft_id: scheduleModal.id,
        pillar_id: scheduleModal.pillar_id,
        status: "ready",
        notes: scheduleModal.topic,
      }),
    });
    if (!res.ok) {
      toast.error("Failed to schedule draft. Please try again.");
      return;
    }
    setScheduleModal(null);
    setScheduleForm({ date: "", time: "" });
  };

  const selectClass =
    "w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-colors";

  const statusCounts = {
    active: drafts.filter((d) => d.status === "draft" || d.status === "revised").length,
    draft: drafts.filter((d) => d.status === "draft").length,
    revised: drafts.filter((d) => d.status === "revised").length,
    posted: drafts.filter((d) => d.status === "posted").length,
    discarded: drafts.filter((d) => d.status === "discarded").length,
  };

  const displayedDrafts = filterStatus === "active"
    ? drafts.filter((d) => d.status === "draft" || d.status === "revised")
    : filterStatus
      ? drafts.filter((d) => d.status === filterStatus)
      : drafts;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Draft Workshop</h1>
          <p className="text-sm text-stone-500 mt-1">
            {statusCounts.active} active · {drafts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFetchIdeas}
            disabled={loadingIdeas}
            className="rounded-xl active:scale-[0.98] transition-all"
          >
            <Lightbulb className="w-4 h-4" />
            {loadingIdeas ? "Loading..." : "Get Ideas"}
            {showIdeas && !loadingIdeas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowManual(true)}
            className="rounded-xl active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Manual Draft
          </Button>
          <Button
            onClick={() => setShowGenerate(true)}
            className="rounded-xl active:scale-[0.98] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="bg-white rounded-2xl border border-stone-200/60 px-4 py-3">
          <TabsList className="bg-stone-100 rounded-xl">
            {[
              { key: "active", label: "Active", count: statusCounts.active },
              { key: "draft", label: "Draft", count: statusCounts.draft },
              { key: "revised", label: "Revised", count: statusCounts.revised },
              { key: "posted", label: "Posted", count: statusCounts.posted },
              { key: "discarded", label: "Discarded", count: statusCounts.discarded },
            ].map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm">
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1 opacity-75">({tab.count})</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {/* Ideas panel */}
      {showIdeas && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-stone-600" />
            Post Ideas from Your Playbook
          </h3>
          {loadingIdeas ? (
            <div className="flex items-center gap-2 text-sm text-stone-600 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-stone-500" />
              Generating ideas...
            </div>
          ) : ideas.length > 0 ? (
            <div className="space-y-2">
              {ideas.map((idea, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 bg-white border border-stone-200/60 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800">{idea.topic}</p>
                    {idea.pillar && <p className="text-xs text-stone-400 mt-0.5">{idea.pillar}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-stone-100 text-stone-600 rounded-full">
                      {idea.hook_style}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => {
                        setGenForm({ ...genForm, topic: idea.topic, num_variants: 1 });
                        setShowGenerate(true);
                        setShowIdeas(false);
                      }}
                      className="rounded-xl text-xs active:scale-[0.98] transition-all"
                    >
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">No ideas yet. Add more posts and learnings to generate ideas.</p>
          )}
        </div>
      )}

      {/* Manual draft form */}
      {showManual && (
        <form
          onSubmit={handleManualCreate}
          className="bg-white rounded-2xl border border-stone-200/60 p-6 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-stone-600" />
              New Draft
            </h3>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="p-1.5 hover:bg-stone-100 rounded-xl"
            >
              <X className="w-5 h-5 text-stone-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Topic
              </label>
              <Input
                type="text"
                value={manualForm.topic}
                onChange={(e) =>
                  setManualForm({ ...manualForm, topic: e.target.value })
                }
                className="rounded-xl border-stone-200"
                placeholder="What's this draft about?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Pillar
              </label>
              <select
                value={manualForm.pillar_id}
                onChange={(e) =>
                  setManualForm({ ...manualForm, pillar_id: e.target.value })
                }
                className={selectClass}
              >
                <option value="">Any</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Content
            </label>
            <Textarea
              value={manualForm.content}
              onChange={(e) =>
                setManualForm({ ...manualForm, content: e.target.value })
              }
              rows={6}
              className="rounded-xl border-stone-200"
              placeholder="Write your draft..."
              required
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              className="rounded-xl active:scale-[0.98] transition-all"
            >
              Create Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowManual(false)}
              className="rounded-xl active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Generate form */}
      {showGenerate && (
        <form
          onSubmit={handleGenerate}
          className="bg-stone-50 rounded-2xl border border-stone-200/60 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stone-600" />
            AI Draft Generation
          </h3>
          {generateError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Topic
            </label>
            <Input
              type="text"
              value={genForm.topic}
              onChange={(e) =>
                setGenForm({ ...genForm, topic: e.target.value })
              }
              className="rounded-xl border-stone-200"
              placeholder="e.g., 5 lessons from my first year as a manager"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Pillar
              </label>
              <select
                value={genForm.pillar_id}
                onChange={(e) =>
                  setGenForm({ ...genForm, pillar_id: e.target.value })
                }
                className={selectClass}
              >
                <option value="">Any</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Style
              </label>
              <Input
                type="text"
                value={genForm.style}
                onChange={(e) =>
                  setGenForm({ ...genForm, style: e.target.value })
                }
                className="rounded-xl border-stone-200"
                placeholder="e.g., conversational, bold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Variants
              </label>
              <select
                value={genForm.num_variants}
                onChange={(e) =>
                  setGenForm({
                    ...genForm,
                    num_variants: Number(e.target.value),
                  })
                }
                className={selectClass}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={generating}
              className="rounded-xl active:scale-[0.98] transition-all"
            >
              {generating ? "Generating..." : "Generate Drafts"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGenerate(false)}
              className="rounded-xl active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {generating && (
        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/60">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-700" />
          <span className="text-sm text-stone-700">
            Generating drafts with AI...
          </span>
        </div>
      )}

      {/* Draft list */}
      <div className="space-y-4">
        {displayedDrafts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-stone-200/60">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PenTool className="w-7 h-7 text-stone-400" />
            </div>
            <p className="text-base font-semibold text-stone-800">
              {filterStatus === "active" ? "No active drafts" : filterStatus === "posted" ? "No posted drafts" : "No drafts"}
            </p>
            <p className="text-sm text-stone-400 mt-1 max-w-xs mx-auto">
              {filterStatus === "active"
                ? "Drop a topic idea and let AI write your next LinkedIn post"
                : filterStatus === "posted"
                  ? "Posts you've published from drafts will appear here"
                  : "Generate drafts with AI or create them manually"}
            </p>
            {filterStatus === "active" && (
              <Button
                onClick={() => setShowGenerate(true)}
                className="mt-5 rounded-xl active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </Button>
            )}
          </div>
        ) : (
          displayedDrafts.map((draft) => (
            <DraftEditor
              key={draft.id}
              draft={draft}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onSchedule={setScheduleModal}
              onPublish={openPublishModal}
            />
          ))
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <form
            onSubmit={handleSchedule}
            className="bg-white rounded-2xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md shadow-xl space-y-4 mx-4 sm:mx-0"
          >
            <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-stone-600" />
              Schedule Draft
            </h3>
            <p className="text-sm text-stone-500">
              &ldquo;{scheduleModal.topic}&rdquo;
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={scheduleForm.date}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, date: e.target.value })
                }
                className="rounded-xl border-stone-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Time (optional)
              </label>
              <Input
                type="time"
                value={scheduleForm.time}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, time: e.target.value })
                }
                className="rounded-xl border-stone-200"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="rounded-xl active:scale-[0.98] transition-all"
              >
                Schedule
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleModal(null)}
                className="rounded-xl active:scale-[0.98] transition-all"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Publish Modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <form
            onSubmit={handlePublish}
            className="bg-white rounded-2xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md shadow-xl space-y-4 mx-4 sm:mx-0"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Mark as Posted
              </h3>
              <button
                type="button"
                onClick={() => setPublishModal(null)}
                className="p-1.5 hover:bg-stone-100 rounded-xl"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>
            <p className="text-sm text-stone-500">
              &ldquo;{publishModal.topic}&rdquo;
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Post Type
              </label>
              <select
                value={publishForm.post_type}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, post_type: e.target.value })
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
                value={publishForm.posted_at}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, posted_at: e.target.value })
                }
                className="rounded-xl border-stone-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Post URL (optional)
              </label>
              <Input
                type="url"
                value={publishForm.post_url}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, post_url: e.target.value })
                }
                className="rounded-xl border-stone-200"
                placeholder="https://linkedin.com/posts/..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all"
              >
                Create Post & Mark Posted
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPublishModal(null)}
                className="rounded-xl active:scale-[0.98] transition-all"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

DraftsPage.displayName = "DraftsPage";
export default DraftsPage;
