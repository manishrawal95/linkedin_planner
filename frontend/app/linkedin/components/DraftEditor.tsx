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
  X,
  ImagePlus,
} from "lucide-react";
import LinkedInPreview from "./LinkedInPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrn, setImageUrn] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      await onUpdate(draft.id, { status: "posted" });
    } catch (err) {
      setPostError(err instanceof Error ? err.message : "Failed to post to LinkedIn");
    } finally {
      setPosting(false);
    }
  };

  const handleImprove = async (action: ImproveAction) => {
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
    draft: "bg-amber-50 text-amber-700 border-amber-200/60",
    revised: "bg-blue-50 text-blue-700 border-blue-200/60",
    posted: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    discarded: "bg-stone-100 text-stone-500 border-stone-200/60",
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/60 overflow-hidden hover:shadow-[var(--shadow-card-hover)] transition-all duration-200">
      <div className="p-5">
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="truncate">{draft.topic}</span>
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`${statusColors[draft.status] || "bg-stone-100 text-stone-600"} hover:bg-transparent`}
              >
                {draft.status}
              </Badge>
              {draft.hook_variant && (
                <span className="text-xs text-stone-400">
                  Hook: {draft.hook_variant}
                </span>
              )}
              {draft.ai_model && (
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-stone-400" />
                  {draft.ai_model}
                </span>
              )}
              <span className="text-xs text-stone-300">
                {new Date(draft.created_at).toLocaleDateString()}
              </span>
              {draft.status === "draft" && (
                <button
                  onClick={() => onUpdate(draft.id, { status: "revised" })}
                  className="text-xs text-stone-600 hover:text-stone-900 font-medium flex items-center gap-0.5 ml-2 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                  Mark Revised
                </button>
              )}
              {(draft.status === "draft" || draft.status === "revised") && onPublish && (
                <button
                  onClick={() => onPublish(draft)}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5 ml-2 transition-colors"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={improving}
                    className="gap-1 rounded-xl border-stone-200 text-stone-600 hover:bg-stone-50 h-8 text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {improving ? "..." : "Improve"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {IMPROVE_ACTIONS.map((a) => (
                    <DropdownMenuItem
                      key={a.key}
                      onClick={() => handleImprove(a.key)}
                      className="text-xs rounded-lg"
                    >
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 w-8 rounded-xl text-stone-400 hover:text-stone-700"
              title={showPreview ? "Hide preview" : "LinkedIn preview"}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="h-8 w-8 rounded-xl text-stone-400 hover:text-stone-700"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            {onSchedule && draft.status !== "posted" && draft.status !== "discarded" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSchedule(draft)}
                className="h-8 w-8 rounded-xl text-stone-400 hover:text-stone-700"
                title="Schedule to calendar"
              >
                <CalendarPlus className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(draft.id)}
              className="h-8 w-8 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50"
              title="Delete draft"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showPreview ? (
          <LinkedInPreview
            authorName="You"
            authorHeadline="Your headline"
            authorInitials="Y"
            content={content}
            timestamp="Just now"
          />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus-visible:ring-stone-400 leading-relaxed"
          />
        )}

        {/* AI Suggestion panel */}
        {suggestion && (
          <div className="mt-3 border border-stone-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-stone-50 border-b border-stone-200">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Suggestion
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSuggestion(null)}
                className="h-6 w-6 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-3 bg-white">
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{suggestion}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleAcceptSuggestion} className="rounded-xl text-xs h-7">
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSuggestion(null)} className="rounded-xl text-xs h-7 border-stone-200">
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Image picker */}
        {draft.status !== "posted" && linkedInConnected && (
          <div className="mt-3">
            {imagePreview ? (
              <div className="flex items-center gap-3 p-2 bg-stone-50 border border-stone-200/60 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Post image" className="w-14 h-14 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-700 truncate">{imageFile?.name}</p>
                  {uploadingImage && <p className="text-[10px] text-stone-500 mt-0.5">Uploading to LinkedIn...</p>}
                  {imageUrn && !uploadingImage && <p className="text-[10px] text-emerald-600 mt-0.5">Ready to post with image</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveImage} className="h-7 w-7 rounded-lg text-stone-400 hover:text-stone-700">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-500 border border-stone-200 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors">
                <ImagePlus className="w-3.5 h-3.5" />
                Add image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            )}
          </div>
        )}

        {/* Post to LinkedIn feedback */}
        {postSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs text-emerald-700 font-medium">
            Posted to LinkedIn
          </div>
        )}
        {postError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200/60 rounded-xl text-xs text-red-700">
            {postError}
          </div>
        )}

        {/* Character counter & stats */}
        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="text-xs text-stone-400">{wordCount} words</span>
            <div className="flex items-center gap-2">
              <Progress
                value={charPct}
                className="w-24 h-1.5 bg-stone-100"
              />
              <span
                className={`text-xs font-medium ${
                  isOverLimit
                    ? "text-red-600"
                    : charPct > 80
                      ? "text-amber-600"
                      : "text-stone-400"
                }`}
              >
                {charCount}/{LINKEDIN_CHAR_LIMIT}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draft.status !== "posted" && (
              linkedInConnected ? (
                <Button
                  size="sm"
                  onClick={handlePostToLinkedIn}
                  disabled={posting || isOverLimit || uploadingImage}
                  className="gap-1.5 rounded-xl bg-[#0a66c2] hover:bg-[#004182] text-xs h-7"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  {posting ? "Posting..." : uploadingImage ? "Uploading..." : "Post to LinkedIn"}
                </Button>
              ) : (
                <a
                  href="/api/linkedin/auth/start"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#0a66c2] text-xs font-medium rounded-xl border border-[#0a66c2]/30 hover:bg-blue-50 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                  Connect LinkedIn
                </a>
              )
            )}
            {hasChanges && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl text-xs h-7 active:scale-[0.98] transition-all"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DraftEditor.displayName = "DraftEditor";
export default DraftEditor;
