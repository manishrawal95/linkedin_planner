"""
Pydantic request/response schemas for all API endpoints.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ── Enums ────────────────────────────────────────────────────────

class PostType(str, Enum):
    text = "text"
    carousel = "carousel"
    personal_image = "personal image"
    social_proof_image = "social proof image"
    poll = "poll"
    video = "video"
    article = "article"


class HookStyle(str, Enum):
    question = "question"
    contrarian = "contrarian"
    story = "story"
    stat = "stat"
    cliffhanger = "cliffhanger"
    list_ = "list"
    statement = "statement"


class CtaType(str, Enum):
    none = "none"
    question = "question"
    link = "link"
    engagement_bait = "engagement-bait"
    advice = "advice"


class DraftStatus(str, Enum):
    draft = "draft"
    revised = "revised"
    ready = "ready"
    scheduled = "scheduled"
    posted = "posted"


class GoalStatus(str, Enum):
    active = "active"
    completed = "completed"
    paused = "paused"


class CalendarStatus(str, Enum):
    planned = "planned"
    ready = "ready"
    posted = "posted"
    skipped = "skipped"


class Frequency(str, Enum):
    daily = "daily"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


# ── Posts ─────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    author: str = "me"
    content: str = Field(..., min_length=1, max_length=5000)
    post_url: str | None = None
    post_type: str = "text"
    topic_tags: list[str] = []
    hook_line: str | None = Field(default=None, max_length=500)
    hook_style: str | None = None
    cta_type: str = "none"
    posted_at: str | None = None
    pillar_id: int | None = None
    series_id: int | None = None


class PostUpdate(BaseModel):
    author: str | None = None
    content: str | None = Field(default=None, max_length=5000)
    post_url: str | None = None
    post_type: str | None = None
    topic_tags: list[str] | None = None
    hook_line: str | None = Field(default=None, max_length=500)
    hook_style: str | None = None
    cta_type: str | None = None
    posted_at: str | None = None
    pillar_id: int | None = None
    series_id: int | None = None


# ── Metrics ──────────────────────────────────────────────────────

class MetricsCreate(BaseModel):
    impressions: int = Field(default=0, ge=0)
    members_reached: int = Field(default=0, ge=0)
    profile_viewers: int = Field(default=0, ge=0)
    followers_gained: int = Field(default=0, ge=0)
    likes: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    reposts: int = Field(default=0, ge=0)
    saves: int = Field(default=0, ge=0)
    sends: int = Field(default=0, ge=0)


# ── Drafts ───────────────────────────────────────────────────────

class DraftCreate(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1, max_length=5000)
    hook_variant: str | None = None
    pillar_id: int | None = None
    inspiration_post_ids: list[int] = []
    ai_model: str | None = None
    mood_board_item_id: int | None = None


class DraftUpdate(BaseModel):
    topic: str | None = Field(default=None, max_length=500)
    content: str | None = Field(default=None, max_length=5000)
    hook_variant: str | None = None
    pillar_id: int | None = None
    status: str | None = None


class DraftGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    pillar_id: int | None = None
    style: str | None = None
    num_variants: int = Field(default=3, ge=1, le=10)


# ── Content Pillars ──────────────────────────────────────────────

class PillarCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = "#6366f1"
    description: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class PillarUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    color: str | None = None
    description: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None


# ── Mood Board ───────────────────────────────────────────────────

class MoodBoardItemCreate(BaseModel):
    pillar_id: int
    type: str = "note"
    content: str = Field(..., min_length=1, max_length=3000)
    source_post_id: int | None = None
    source_url: str | None = None
    sort_order: int = 0


class MoodBoardItemUpdate(BaseModel):
    pillar_id: int | None = None
    type: str | None = None
    content: str | None = Field(default=None, max_length=3000)
    source_url: str | None = None
    sort_order: int | None = None


class MoodBoardReorder(BaseModel):
    item_ids: list[int]


# ── Hooks ────────────────────────────────────────────────────────

class HookCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    style: str = "statement"
    source_post_id: int | None = None


class HookUpdate(BaseModel):
    text: str | None = Field(default=None, max_length=1000)
    style: str | None = None


# ── Hashtag Sets ─────────────────────────────────────────────────

class HashtagSetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    hashtags: list[str]
    pillar_id: int | None = None


class HashtagSetUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    hashtags: list[str] | None = None
    pillar_id: int | None = None


# ── Goals ────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    metric: str = Field(..., min_length=1, max_length=100)
    target_value: float = Field(..., gt=0)
    current_value: float = Field(default=0, ge=0)
    deadline: str | None = None


class GoalUpdate(BaseModel):
    metric: str | None = Field(default=None, max_length=100)
    target_value: float | None = Field(default=None, gt=0)
    current_value: float | None = Field(default=None, ge=0)
    deadline: str | None = None
    status: str | None = None


# ── Content Calendar ─────────────────────────────────────────────

class CalendarEntryCreate(BaseModel):
    scheduled_date: str = Field(..., min_length=1)
    scheduled_time: str | None = None
    draft_id: int | None = None
    pillar_id: int | None = None
    series_id: int | None = None
    status: str = "planned"
    notes: str | None = Field(default=None, max_length=1000)


class CalendarEntryUpdate(BaseModel):
    scheduled_date: str | None = None
    scheduled_time: str | None = None
    draft_id: int | None = None
    pillar_id: int | None = None
    series_id: int | None = None
    status: str | None = None
    notes: str | None = Field(default=None, max_length=1000)
    post_id: int | None = None


# ── Content Series ───────────────────────────────────────────────

class SeriesCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    pillar_id: int | None = None
    frequency: str = "weekly"
    preferred_day: str | None = None
    preferred_time: str | None = None


class SeriesUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    pillar_id: int | None = None
    frequency: str | None = None
    preferred_day: str | None = None
    preferred_time: str | None = None
    is_active: int | None = None


# ── Competitors ──────────────────────────────────────────────────

class CompetitorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    linkedin_url: str | None = None
    niche: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)


class CompetitorUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    linkedin_url: str | None = None
    niche: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)
    avg_impressions: float | None = None
    avg_engagement_score: float | None = None


# ── Typed request bodies for endpoints that used raw dicts ───────

class PostIdeasRequest(BaseModel):
    topic_hint: str = Field(default="", max_length=2000)


class ImproveDraftRequest(BaseModel):
    action: Literal["punch-hook", "shorten", "make-specific", "conversational", "apply-playbook"]


class ExtractHookRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class PostToLinkedInRequest(BaseModel):
    image_urn: str | None = None
