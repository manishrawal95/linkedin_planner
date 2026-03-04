"use client";

import { memo, useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Trash2,
  FileEdit,
  Eye,
  EyeOff,
  CalendarPlus,
  Send,
  ArrowRight,
  Linkedin,
  ChevronDown,
  X,
  ImagePlus,
} from "lucide-react";
import LinkedInPreview from "./LinkedInPreview";
import type { Draft } from "@/types/linkedin";

interface DraftEditorProps {
  draft: Draft;
  onUpdate: (id: number, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => void;
  onSchedule?: (draft: Draft) => void;
  onPublish?: (draft: Draft) => void;
}

const LINKEDIN_CHAR_LIMIT = 3000;

const IMPROVE_ACTIONS = [
  { key: "punch-hook", label: "Punch the hook" },
  { key: "shorten", label: "Shorten (~30%)" },
  { key: "make-specific", label: "Make specific" },
  { key: "conversational", label: "More conversational" },
  { key: "apply-playbook", label: "Apply playbook" },
] as const;

type ImproveAction = typeof IMPROVE_ACTIONS[number]["key"];

const DraftEditor = memo(function DraftEditor({
  draft,
  onUpdate,
  onDelete,
  onSchedule,
  onPublish,
}: DraftEditorProps) {
  const [content, setContent] = useState(draft.content);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const hasChanges = content !== draft.content;
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const charPct = Math.min(100, (charCount / LINKEDIN_CHAR_LIMIT) * 100);
  const isOverLimit = charCount > LINKEDIN_CHAR_LIMIT;

  // LinkedIn auth state
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrn, setImageUrn] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Improve dropdown state
  const [showImproveMenu, setShowImproveMenu] = useState(false);
  const [improving, setImproving] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const checkLinkedInAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/linkedin/auth/status");
      if (res.ok) {
        const data = await res.json();
        setLinkedInConnected(data.authenticated === true);
      }
    } catch (err) {
      console.error("DraftEditor.checkLinkedInAuth: GET /api/linkedin/auth/status failed:", err);
    }
  }, []);

  useEffect(() => {
    checkLinkedInAuth();
  }, [checkLinkedInAuth]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(draft.id, { content });
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke any existing object URL to avoid memory leaks
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
    setImageUrn(null);
    setPostError(null);
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/linkedin/drafts/${draft.id}/upload-image`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Image upload failed (${res.status})`);
      }
      const data = await res.json();
      setImageUrn(data.image_urn);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Image upload failed.");
      setImageFile(null);
      setImagePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageUrn(null);
  };

  const handlePostToLinkedIn = async () => {
    setPosting(true);
    setPostError(null);
    setPostSuccess(false);
    try {
      const body: Record<string, unknown> = {};
      if (imageUrn) body.image_urn = imageUrn;
      const res = await fetch(`/api/linkedin/drafts/${draft.id}/post-to-linkedin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed to post (${res.status})`);
      }
      setPostSuccess(true);
      setTimeout(() => setPostSuccess(false), 6000);
      // Update local draft status
      await onUpdate(draft.id, { status: "posted" });
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to post to LinkedIn");
    } finally {
      setPosting(false);
    }
  };

  const handleImprove = async (action: ImproveAction) => {
    setShowImproveMenu(false);
    setImproving(true);
    setSuggestion(null);
    try {
      const res = await fetch(`/api/linkedin/drafts/${draft.id}/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Improvement failed");
      }
      const data = await res.json();
      setSuggestion(data.improved_content || null);
    } catch (err) {
      console.error("DraftEditor.handleImprove: POST /api/linkedin/drafts/:id/improve failed:", err);
    } finally {
      setImproving(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestion) {
      setContent(suggestion);
      setSuggestion(null);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    revised: "bg-blue-100 text-blue-700 border-blue-200",
    posted: "bg-green-100 text-green-700 border-green-200",
    discarded: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-5">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{draft.topic}</span>
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-medium border ${statusColors[draft.status] || "bg-gray-100 text-gray-600"}`}
              >
                {draft.status}
              </span>
              {draft.hook_variant && (
                <span className="text-xs text-gray-400">
                  Hook: {draft.hook_variant}
                </span>
              )}
              {draft.ai_model && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  {draft.ai_model}
                </span>
              )}
              <span className="text-xs text-gray-300">
                {new Date(draft.created_at).toLocaleDateString()}
              </span>
              {draft.status === "draft" && (
                <button
                  onClick={() => onUpdate(draft.id, { status: "revised" })}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5 ml-2"
                >
                  <ArrowRight className="w-3 h-3" />
                  Mark Revised
                </button>
              )}
              {(draft.status === "draft" || draft.status === "revised") && onPublish && (
                <button
                  onClick={() => onPublish(draft)}
                  className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-0.5 ml-2"
                >
                  <Send className="w-3 h-3" />
                  Mark Posted
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap shrink-0">
            {/* Improve dropdown */}
            {draft.status !== "posted" && (
              <div className="relative">
                <button
                  onClick={() => setShowImproveMenu(!showImproveMenu)}
                  disabled={improving}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-50 transition-colors border border-purple-200"
                  title="AI improve"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {improving ? "..." : "Improve"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showImproveMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                    {IMPROVE_ACTIONS.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => handleImprove(a.key)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title={showPreview ? "Hide preview" : "LinkedIn preview"}
            >
              {showPreview ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            {onSchedule && draft.status !== "posted" && draft.status !== "discarded" && (
              <button
                onClick={() => onSchedule(draft)}
                className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                title="Schedule to calendar"
              >
                <CalendarPlus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(draft.id)}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Close improve menu on outside click */}
        {showImproveMenu && (
          <div className="fixed inset-0 z-[5]" onClick={() => setShowImproveMenu(false)} />
        )}

        {showPreview ? (
          <LinkedInPreview
            authorName="You"
            authorHeadline="Your headline"
            authorInitials="Y"
            content={content}
            timestamp="Just now"
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors leading-relaxed"
          />
        )}

        {/* AI Suggestion panel */}
        {suggestion && (
          <div className="mt-3 border border-purple-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-purple-50 border-b border-purple-200">
              <span className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggestion
              </span>
              <button onClick={() => setSuggestion(null)} className="p-0.5 hover:bg-purple-100 rounded">
                <X className="w-3.5 h-3.5 text-purple-500" />
              </button>
            </div>
            <div className="p-3 bg-white">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{suggestion}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAcceptSuggestion}
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => setSuggestion(null)}
                  className="px-3 py-1.5 text-gray-600 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image picker (only when LinkedIn connected and not yet posted) */}
        {draft.status !== "posted" && linkedInConnected && (
          <div className="mt-3">
            {imagePreview ? (
              <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Post image" className="w-14 h-14 object-cover rounded-md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{imageFile?.name}</p>
                  {uploadingImage && <p className="text-[10px] text-indigo-500 mt-0.5">Uploading to LinkedIn...</p>}
                  {imageUrn && !uploadingImage && <p className="text-[10px] text-green-600 mt-0.5">Ready to post with image</p>}
                </div>
                <button onClick={handleRemoveImage} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <ImagePlus className="w-3.5 h-3.5" />
                Add image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            )}
          </div>
        )}

        {/* Post to LinkedIn feedback */}
        {postSuccess && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
            Posted to LinkedIn
          </div>
        )}
        {postError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {postError}
          </div>
        )}

        {/* Character counter & stats */}
        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              {wordCount} words
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isOverLimit
                      ? "bg-red-500"
                      : charPct > 80
                        ? "bg-amber-500"
                        : "bg-indigo-500"
                  }`}
                  style={{ width: `${Math.min(100, charPct)}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium ${
                  isOverLimit
                    ? "text-red-600"
                    : charPct > 80
                      ? "text-amber-600"
                      : "text-gray-400"
                }`}
              >
                {charCount}/{LINKEDIN_CHAR_LIMIT}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Post to LinkedIn button */}
            {draft.status !== "posted" && (
              linkedInConnected ? (
                <button
                  onClick={handlePostToLinkedIn}
                  disabled={posting || isOverLimit || uploadingImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  {posting ? "Posting..." : uploadingImage ? "Uploading..." : "Post to LinkedIn"}
                </button>
              ) : (
                <a
                  href="/api/linkedin/auth/start"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-blue-700 text-xs font-medium rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  Connect LinkedIn
                </a>
              )
            )}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DraftEditor.displayName = "DraftEditor";
export default DraftEditor;
