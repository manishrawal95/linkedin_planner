"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Sparkles, Plus, PenTool, CalendarPlus, X, Send, CheckCircle, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import DraftEditor from "../components/DraftEditor";
import { useToast } from "../components/Toast";
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

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors";

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Draft Workshop</h1>
          <p className="text-sm text-gray-500 mt-1">
            {statusCounts.active} active · {drafts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFetchIdeas}
            disabled={loadingIdeas}
            className="flex items-center gap-2 px-4 py-2.5 text-purple-700 text-sm font-medium rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            {loadingIdeas ? "Loading..." : "Get Ideas"}
            {showIdeas && !loadingIdeas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Draft
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        {[
          { key: "active", label: "Active", count: statusCounts.active },
          { key: "draft", label: "Draft", count: statusCounts.draft },
          { key: "revised", label: "Revised", count: statusCounts.revised },
          { key: "posted", label: "Posted", count: statusCounts.posted },
          { key: "discarded", label: "Discarded", count: statusCounts.discarded },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filterStatus === tab.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Ideas panel */}
      {showIdeas && (
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-purple-600" />
            Post Ideas from Your Playbook
          </h3>
          {loadingIdeas ? (
            <div className="flex items-center gap-2 text-sm text-purple-600 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500" />
              Generating ideas...
            </div>
          ) : ideas.length > 0 ? (
            <div className="space-y-2">
              {ideas.map((idea, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 bg-white border border-purple-100 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{idea.topic}</p>
                    {idea.pillar && <p className="text-xs text-gray-400 mt-0.5">{idea.pillar}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {idea.hook_style}
                    </span>
                    <button
                      onClick={() => {
                        setGenForm({ ...genForm, topic: idea.topic, num_variants: 1 });
                        setShowGenerate(true);
                        setShowIdeas(false);
                      }}
                      className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-purple-600">No ideas yet. Add more posts and learnings to generate ideas.</p>
          )}
        </div>
      )}

      {/* Manual draft form */}
      {showManual && (
        <form
          onSubmit={handleManualCreate}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-600" />
              New Draft
            </h3>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={manualForm.topic}
                onChange={(e) =>
                  setManualForm({ ...manualForm, topic: e.target.value })
                }
                className={inputClass}
                placeholder="What's this draft about?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pillar
              </label>
              <select
                value={manualForm.pillar_id}
                onChange={(e) =>
                  setManualForm({ ...manualForm, pillar_id: e.target.value })
                }
                className={inputClass}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={manualForm.content}
              onChange={(e) =>
                setManualForm({ ...manualForm, content: e.target.value })
              }
              rows={6}
              className={inputClass}
              placeholder="Write your draft..."
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Create Draft
            </button>
            <button
              type="button"
              onClick={() => setShowManual(false)}
              className="px-5 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Generate form */}
      {showGenerate && (
        <form
          onSubmit={handleGenerate}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Draft Generation
          </h3>
          {generateError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{generateError}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <input
              type="text"
              value={genForm.topic}
              onChange={(e) =>
                setGenForm({ ...genForm, topic: e.target.value })
              }
              className={inputClass}
              placeholder="e.g., 5 lessons from my first year as a manager"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pillar
              </label>
              <select
                value={genForm.pillar_id}
                onChange={(e) =>
                  setGenForm({ ...genForm, pillar_id: e.target.value })
                }
                className={inputClass}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Style
              </label>
              <input
                type="text"
                value={genForm.style}
                onChange={(e) =>
                  setGenForm({ ...genForm, style: e.target.value })
                }
                className={inputClass}
                placeholder="e.g., conversational, bold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className={inputClass}
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
            <button
              type="submit"
              disabled={generating}
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {generating ? "Generating..." : "Generate Drafts"}
            </button>
            <button
              type="button"
              onClick={() => setShowGenerate(false)}
              className="px-5 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {generating && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
          <span className="text-sm text-indigo-700">
            Generating drafts with AI...
          </span>
        </div>
      )}

      {/* Draft list */}
      <div className="space-y-4">
        {displayedDrafts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <PenTool className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="text-base font-semibold text-gray-800">
              {filterStatus === "active" ? "No active drafts" : filterStatus === "posted" ? "No posted drafts" : "No drafts"}
            </p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              {filterStatus === "active"
                ? "Drop a topic idea and let AI write your next LinkedIn post"
                : filterStatus === "posted"
                  ? "Posts you've published from drafts will appear here"
                  : "Generate drafts with AI or create them manually"}
            </p>
            {filterStatus === "active" && (
              <button
                onClick={() => setShowGenerate(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </button>
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
            className="bg-white rounded-xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md shadow-xl space-y-4 mx-4 sm:mx-0"
          >
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-indigo-600" />
              Schedule Draft
            </h3>
            <p className="text-sm text-gray-500">
              &ldquo;{scheduleModal.topic}&rdquo;
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduleForm.date}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, date: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time (optional)
              </label>
              <input
                type="time"
                value={scheduleForm.time}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, time: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Schedule
              </button>
              <button
                type="button"
                onClick={() => setScheduleModal(null)}
                className="px-5 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Publish Modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
          <form
            onSubmit={handlePublish}
            className="bg-white rounded-xl p-6 w-full max-w-[calc(100vw-2rem)] sm:max-w-md shadow-xl space-y-4 mx-4 sm:mx-0"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Mark as Posted
              </h3>
              <button
                type="button"
                onClick={() => setPublishModal(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              &ldquo;{publishModal.topic}&rdquo;
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post Type
              </label>
              <select
                value={publishForm.post_type}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, post_type: e.target.value })
                }
                className={inputClass}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Posted At
              </label>
              <input
                type="datetime-local"
                value={publishForm.posted_at}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, posted_at: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post URL (optional)
              </label>
              <input
                type="url"
                value={publishForm.post_url}
                onChange={(e) =>
                  setPublishForm({ ...publishForm, post_url: e.target.value })
                }
                className={inputClass}
                placeholder="https://linkedin.com/posts/..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                Create Post & Mark Posted
              </button>
              <button
                type="button"
                onClick={() => setPublishModal(null)}
                className="px-5 py-2.5 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

DraftsPage.displayName = "DraftsPage";
export default DraftsPage;
