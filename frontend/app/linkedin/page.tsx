"use client";

import { memo, useEffect, useState, useCallback } from "react";
import {
  FileText,
  TrendingUp,
  PenTool,
  Target,
  BarChart3,
  Eye,
  Heart,
  Users,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PlaybookView from "./components/PlaybookView";
import GoalTracker from "./components/GoalTracker";
import QueueWidget from "./components/QueueWidget";
import ActionPanel from "./components/ActionPanel";
import LinkedInAuthStatus from "./components/LinkedInAuthStatus";
import type { DashboardStats, PillarBalance, HeatmapEntry, PostIdea } from "@/types/linkedin";

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Dashboard = memo(function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pillarBalance, setPillarBalance] = useState<PillarBalance[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Capture state
  const [captureIdea, setCaptureIdea] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Post ideas state
  const [showIdeas, setShowIdeas] = useState(false);
  const [ideas, setIdeas] = useState<PostIdea[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [statsRes, pillarRes, heatmapRes] = await Promise.all([
        fetch("/api/linkedin/dashboard/stats"),
        fetch("/api/linkedin/dashboard/pillar-balance"),
        fetch("/api/linkedin/dashboard/heatmap"),
      ]);
      const [statsData, pillarData, heatmapData] = await Promise.all([
        statsRes.json(),
        pillarRes.json(),
        heatmapRes.json(),
      ]);
      setStats(statsData);
      setPillarBalance(pillarData.pillars || []);
      setHeatmap(heatmapData.heatmap || []);
    } catch (err) {
      console.error("Dashboard.fetchAll: dashboard data fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const generateWithTopic = async (topic: string) => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setCapturing(true);
    setCaptureError(null);
    setCaptureSuccess(false);
    try {
      const res = await fetch("/api/linkedin/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed, num_variants: 1 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Generation failed (${res.status})`);
      }
      setCaptureSuccess(true);
      setCaptureIdea("");
      setTimeout(() => setCaptureSuccess(false), 5000);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleGenerate = () => generateWithTopic(captureIdea);

  const handleFetchIdeas = async () => {
    if (showIdeas && ideas.length > 0) {
      setShowIdeas(false);
      return;
    }
    setShowIdeas(true);
    setLoadingIdeas(true);
    try {
      // Pass current textarea content as a topic hint so ideas stay on-topic
      const body = captureIdea.trim() ? { topic_hint: captureIdea.trim() } : {};
      const res = await fetch("/api/linkedin/dashboard/post-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setIdeas(data.ideas || []);
      }
    } catch (err) {
      console.error("Dashboard.handleFetchIdeas: POST /api/linkedin/dashboard/post-ideas failed:", err);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleIdeaClick = (idea: PostIdea) => {
    setShowIdeas(false);
    // Pre-fill and immediately generate — user just needs to review the draft
    generateWithTopic(idea.topic);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // Build engagement trend data from recent posts (reversed for chronological order)
  const engagementTrend = [...(stats?.recent_posts || [])]
    .reverse()
    .filter((post) => post.posted_at)
    .map((post) => ({
      date: new Date(post.posted_at!).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      engagement: post.engagement_score ? +(post.engagement_score * 100).toFixed(2) : 0,
      impressions: post.impressions || 0,
    }));

  const totalPillars = pillarBalance.reduce((sum, p) => sum + p.post_count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your LinkedIn content overview</p>
        </div>
        <LinkedInAuthStatus />
      </div>

      {/* Quick Capture */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Quick Capture
        </h2>
        <div className="space-y-3">
          <textarea
            value={captureIdea}
            onChange={(e) => { setCaptureIdea(e.target.value); setShowIdeas(false); setIdeas([]); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
            rows={3}
            placeholder="Drop a rough idea or note... (Cmd+Enter to generate)"
            className="w-full border border-indigo-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors resize-none leading-relaxed"
          />
          {captureError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{captureError}</span>
            </div>
          )}
          {captureSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              <span className="font-medium">Draft created</span>
              <a href="/linkedin/drafts" className="flex items-center gap-1 underline ml-auto">
                View in Drafts <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={capturing || !captureIdea.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {capturing ? "Generating..." : "Generate Post"}
            </button>
            <button
              onClick={handleFetchIdeas}
              disabled={loadingIdeas}
              className="flex items-center gap-2 px-4 py-2.5 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-300 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              {loadingIdeas ? "Loading..." : captureIdea.trim() ? "See 5 angles" : "See 5 ideas"}
              {showIdeas && !loadingIdeas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Ideas panel */}
        {showIdeas && (
          <div className="space-y-2 pt-1">
            {loadingIdeas ? (
              <div className="flex items-center gap-2 text-sm text-indigo-600 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500" />
                Generating ideas from your playbook...
              </div>
            ) : ideas.length > 0 ? (
              ideas.map((idea, i) => (
                <button
                  key={i}
                  onClick={() => handleIdeaClick(idea)}
                  className="w-full text-left p-3 bg-white border border-indigo-100 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 group-hover:text-gray-900 leading-relaxed">{idea.topic}</p>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mt-0.5">
                      {idea.hook_style}
                    </span>
                  </div>
                  {idea.pillar && (
                    <p className="text-xs text-gray-400 mt-1">{idea.pillar}</p>
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-2">No ideas generated. Make sure your playbook and learnings have data.</p>
            )}
          </div>
        )}
      </div>

      {/* Queue + Actions row */}
      <div className="space-y-4">
        <QueueWidget />
        <ActionPanel />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          label="Total Posts"
          value={stats?.total_posts ?? 0}
          bg="bg-blue-50"
          trendPct={stats?.posts_trend_pct ?? null}
          trendLabel="vs last month"
        />
        <StatCard
          icon={<Eye className="w-5 h-5 text-cyan-600" />}
          label="Total Impressions"
          value={formatNumber(stats?.total_impressions ?? 0)}
          bg="bg-cyan-50"
          trendPct={stats?.impressions_trend_pct ?? null}
          trendLabel="vs last month"
        />
        <StatCard
          icon={<Heart className="w-5 h-5 text-pink-600" />}
          label="Avg Likes"
          value={Math.round(stats?.avg_likes ?? 0)}
          bg="bg-pink-50"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          label="Avg Engagement"
          value={`${((stats?.avg_engagement_score ?? 0) * 100).toFixed(2)}%`}
          bg="bg-green-50"
        />
        <StatCard
          icon={<PenTool className="w-5 h-5 text-amber-600" />}
          label="Active Drafts"
          value={stats?.total_drafts ?? 0}
          bg="bg-amber-50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            Engagement Trend (Recent Posts)
          </h2>
          {engagementTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={engagementTrend}>
                <defs>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#111827" }} stroke="#3949AB" />
                <YAxis tick={{ fontSize: 11, fill: "#111827" }} stroke="#3949AB" unit="%" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value) => [`${value}%`, "Engagement"]}
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#engGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Add at least 2 posts with metrics to see trends
            </div>
          )}
        </div>

        {/* Pillar balance donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            Pillar Balance
          </h2>
          {pillarBalance.length > 0 && totalPillars > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pillarBalance}
                    dataKey="post_count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pillarBalance.map((p) => (
                      <Cell key={p.id} fill={p.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(value, name) => [`${value} posts`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {pillarBalance.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                    <span className="text-gray-400">
                      ({totalPillars > 0 ? Math.round((p.post_count / totalPillars) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              Create pillars and tag posts to see balance
            </div>
          )}
        </div>
      </div>

      {/* Heatmap + Recent Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posting heatmap */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            Best Time to Post
          </h2>
          {heatmap.length > 0 ? (
            <HeatmapGrid data={heatmap} />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              Post at different times to discover your best slots
            </div>
          )}
        </div>

        {/* Recent posts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            Recent Posts
          </h2>
          {stats?.recent_posts?.length ? (
            <div className="space-y-2">
              {stats.recent_posts.map((post) => (
                <a
                  key={post.id}
                  href={`/linkedin/posts/${post.id}`}
                  className="block p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed flex-1">
                      {post.content}
                    </p>
                    {post.classification && (
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                        post.classification === "hit"
                          ? "bg-green-100 text-green-700"
                          : post.classification === "miss"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}>
                        {post.classification}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                    {post.impressions != null && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.impressions.toLocaleString()}
                      </span>
                    )}
                    {post.likes != null && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes}
                      </span>
                    )}
                    {post.saves != null && post.saves > 0 && (
                      <span className="flex items-center gap-1 font-medium text-amber-600">
                        {post.saves} saves
                      </span>
                    )}
                    {post.comments != null && post.comments > 0 && (
                      <span className="flex items-center gap-1">
                        {post.comments} comments
                      </span>
                    )}
                    {post.engagement_score != null && (
                      <span className="ml-auto font-semibold text-indigo-600">
                        {(post.engagement_score * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              No posts yet. Add your first post in the Posts section.
            </div>
          )}
        </div>
      </div>

      {/* Playbook + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlaybookView />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            Goals
          </h2>
          <GoalTracker />
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = "Dashboard";
export default Dashboard;

/* ── Helper Components ─────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  bg,
  trendPct,
  trendLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bg: string;
  trendPct?: number | null;
  trendLabel?: string;
}) {
  const hasTrend = trendPct != null;
  const isUp = hasTrend && trendPct! > 0;
  const isDown = hasTrend && trendPct! < 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${bg}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          {hasTrend && (
            <p className={`text-[11px] font-medium mt-0.5 ${isUp ? "text-green-600" : isDown ? "text-red-500" : "text-gray-400"}`}>
              {isUp ? "↑" : isDown ? "↓" : "—"} {Math.abs(trendPct!)}% {trendLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HeatmapGrid({ data }: { data: HeatmapEntry[] }) {
  // Build a map: day -> hour -> engagement
  const map = new Map<string, Map<number, number>>();
  let maxEng = 0;
  for (const entry of data) {
    if (!map.has(entry.day_of_week)) map.set(entry.day_of_week, new Map());
    map.get(entry.day_of_week)!.set(entry.hour, entry.avg_engagement);
    if (entry.avg_engagement > maxEng) maxEng = entry.avg_engagement;
  }

  // Show hours 6-22
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Find best time slot
  let bestDay = "";
  let bestHour = 0;
  let bestEng = 0;
  for (const entry of data) {
    if (entry.avg_engagement > bestEng) {
      bestEng = entry.avg_engagement;
      bestDay = entry.day_of_week;
      bestHour = entry.hour;
    }
  }

  return (
    <div className="space-y-4">
      {/* Best time callout */}
      {bestEng > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-900">
              {bestDay.charAt(0).toUpperCase() + bestDay.slice(1)}s at {bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour}{bestHour >= 12 ? "pm" : "am"}
            </p>
            <p className="text-xs text-indigo-600">Your highest engagement time slot</p>
          </div>
        </div>
      )}

      {/* Heatmap grid — fills available width */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12" />
              {hours.map((h) => (
                <th key={h} className="text-[11px] text-gray-400 font-normal pb-1 text-center">
                  {h % 3 === 0 ? `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}` : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS_ORDER.map((day, di) => {
              const dayMap = map.get(day) || new Map();
              return (
                <tr key={day}>
                  <td className="text-xs text-gray-500 text-right pr-2 py-0.5 font-medium">{DAYS_SHORT[di]}</td>
                  {hours.map((h) => {
                    const eng = dayMap.get(h) || 0;
                    const intensity = maxEng > 0 ? eng / maxEng : 0;
                    return (
                      <td key={h} className="p-[1.5px]">
                        <div
                          className="w-full aspect-square rounded-sm min-h-[14px]"
                          style={{
                            backgroundColor: intensity > 0
                              ? `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`
                              : "#f3f4f6",
                          }}
                          title={`${DAYS_SHORT[di]} ${h}:00 — ${eng > 0 ? (eng * 100).toFixed(2) + "% eng" : "no data"}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-gray-400">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: v > 0 ? `rgba(99, 102, 241, ${0.15 + v * 0.85})` : "#f3f4f6" }}
          />
        ))}
        <span className="text-[11px] text-gray-400">More</span>
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
