# LinkedIn Post Planner

AI-powered content planning and analytics system for LinkedIn. Track post performance, extract insights, generate drafts in your voice, and optimize your content strategy — all running locally.

## What It Does

```
Your Posts → Metrics → AI Analysis → Learnings (with confidence) → Playbook → AI Drafts
```

1. **Log posts** and record performance metrics (impressions, likes, comments, saves, etc.)
2. **AI classifies** each post as hit/average/miss relative to your baseline
3. **Extracts learnings** with confidence scores (e.g., "contrarian hooks work — 95% confidence")
4. **Generates a playbook** of DOs, DON'Ts, and best practices from your data
5. **Drafts new posts** using your playbook, top-performing voice, and hook library
6. **Post directly to LinkedIn** via OAuth integration

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | FastAPI, SQLite (WAL mode), Pydantic |
| AI | Google GenAI (Gemini) or Anthropic (Claude) — configurable |

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
LINKEDIN_LLM_PROVIDER=gemini       # or "claude"
GEMINI_API_KEY=your-key-here        # required if provider is gemini
ANTHROPIC_API_KEY=your-key-here     # required if provider is claude
```

```bash
python -m backend.server
# Runs on http://localhost:8200
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

Open http://localhost:3000/linkedin to access the dashboard.

## Features

### Dashboard
Central hub with stat cards, engagement trend chart, pillar balance donut, posting heatmap (best day/hour with callout), recent posts, playbook view, goal tracker, content queue widget, and action panel.

- **Quick Capture**: Jot down raw post ideas that AI expands into full post concepts
- **Content Queue Widget**: See upcoming scheduled posts at a glance
- **Action Panel**: Surfaces what needs attention — unanalyzed posts, metrics due for logging
- **LinkedIn Auth Status**: Connect your LinkedIn account for direct posting

### Post Library
Add published posts, record metrics at multiple time intervals (12h, 24h, 48h, 1w), filter by author/pillar/type, search content, sort by engagement or saves. Batch analyze all posts with AI.

- **Auto-fill metadata**: AI extracts pillar, type, and topic from post content
- **Extract Hook**: AI identifies the opening hook from post content

### AI Analysis Pipeline
- **Classification**: Each post scored as hit/average/miss against your historical baseline
- **Learning Extraction**: 2-4 insights per post with AI-assessed confidence (0.3–0.95)
- **Confidence Growth**: Re-confirmed insights get boosted over time
- **Playbook Generation**: Auto-generated strategy doc from all learnings, weighted by confidence
- **Safe re-analysis**: Learnings only replaced after new extraction succeeds (no data loss on LLM failure)

### Draft Workshop
Generate AI drafts by specifying topic, pillar, and style. The AI uses your playbook, top 5 performing posts as voice reference, hook library, and pillar-specific hashtags. Generates multiple variants with different hook styles.

- **Inline Draft Improver**: One-click actions to punch up hooks, shorten, make more specific, adjust tone, or apply playbook rules
- **Post to LinkedIn**: Publish drafts directly to LinkedIn with optional image upload
- **LinkedIn Preview**: See how your draft will look on LinkedIn before posting
- **Character Counter**: Live counter with 3,000-character limit and progress bar
- **Copy to Clipboard**: One-click copy for manual posting

### Content Calendar
Monthly calendar view for scheduling posts. Link drafts to dates, track status (planned/ready/posted/skipped). AI suggests next week's content plan based on pillar balance, series schedule, and best posting times.

### Mood Board
Collect inspiration organized by content pillar. Add notes, ideas, quotes, links, or saved posts. Generate AI drafts directly from mood board items.

### Hooks Library
Save and track opening lines by style (question, contrarian, story, stat, cliffhanger, list, statement). Auto-extract hooks from posts. Track usage count and avg engagement per hook.

### Hashtag Sets
Organize hashtags by pillar. Track usage and average reach. Hashtags feed into AI draft generation.

### Content Series
Define recurring content patterns (e.g., weekly series). Set frequency, preferred day/time, and linked pillar.

### Competitors
Track competitor profiles with notes, post counts, and engagement benchmarks.

### Analytics
Deep-dive dashboards: monthly trends, pillar performance, post type comparison, hook style effectiveness (radar chart), content length sweet spot (scatter plot), top/bottom performers with suggestions.

### Goals
Set and track performance targets (e.g., "reach 50K impressions by March").

## Project Structure

```
├── backend/
│   ├── server.py        # FastAPI endpoints (posts, drafts, analysis, OAuth, dashboard)
│   ├── analyzer.py      # AI classification + learning extraction
│   ├── drafter.py       # AI draft generation with context gathering
│   ├── prompts.py       # All LLM prompt templates
│   ├── llm.py           # LLM provider abstraction (Gemini/Claude) with retry logic
│   ├── db.py            # SQLite schema (13 tables) + performance indexes
│   ├── models.py        # Pydantic request/response models with validation
│   ├── config.py        # Environment configuration
│   ├── utils.py         # Shared utilities (LLM JSON parsing)
│   └── .env.example     # All environment variables documented
│
├── frontend/
│   ├── types/
│   │   └── linkedin.ts          # Shared TypeScript interfaces (31 types)
│   ├── components/ui/           # shadcn/ui components (Button, Dialog, Badge, etc.)
│   ├── lib/
│   │   ├── utils.ts             # cn() helper (clsx + tailwind-merge)
│   │   └── chart-theme.ts       # Shared Recharts theme (warm stone palette)
│   ├── app/globals.css          # Design tokens (warm stone palette) + animations
│   ├── app/linkedin/
│   │   ├── layout.tsx           # App shell with responsive sidebar
│   │   ├── page.tsx             # Dashboard
│   │   ├── error.tsx            # Error boundary
│   │   ├── loading.tsx          # Skeleton loading state
│   │   ├── not-found.tsx        # 404 page
│   │   ├── posts/page.tsx       # Post library
│   │   ├── drafts/page.tsx      # Draft workshop
│   │   ├── calendar/page.tsx    # Content calendar
│   │   ├── series/page.tsx      # Content series
│   │   ├── mood-board/page.tsx  # Mood board
│   │   ├── hooks-library/page.tsx # Hooks library
│   │   ├── hashtags/page.tsx    # Hashtag sets
│   │   ├── competitors/page.tsx # Competitor tracking
│   │   ├── analytics/page.tsx   # Deep analytics
│   │   └── components/          # Shared UI components
│   │       ├── LinkedInNav.tsx       # Responsive nav with mobile hamburger menu
│   │       ├── DraftEditor.tsx       # Full-featured draft editor
│   │       ├── PostCard.tsx          # Post display card
│   │       ├── PostForm.tsx          # Post creation form
│   │       ├── MetricsForm.tsx       # Metrics entry form
│   │       ├── GoalTracker.tsx       # Goal progress tracker
│   │       ├── PlaybookView.tsx      # Playbook display
│   │       ├── Toast.tsx             # Toast notification system
│   │       ├── ActionPanel.tsx       # Dashboard action items
│   │       ├── QueueWidget.tsx       # Content queue preview
│   │       └── LinkedInAuthStatus.tsx # OAuth connection status
│   └── app/api/linkedin/        # API route proxies to backend
│
└── .gitignore
```

## API Endpoints

### Posts & Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/posts` | List posts (filter by author, pillar, type, date) |
| POST | `/posts` | Create post |
| GET | `/posts/{id}` | Get post with metrics |
| PUT | `/posts/{id}` | Update post |
| DELETE | `/posts/{id}` | Delete post |
| POST | `/posts/{id}/metrics` | Add metrics snapshot |
| GET | `/posts/batch-metrics` | Batch fetch latest metrics |
| POST | `/posts/auto-fill` | AI auto-fill post metadata from content |

### AI & Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze/{id}` | Classify + extract learnings for one post |
| POST | `/analyze/batch` | Batch analyze multiple posts |
| GET | `/learnings` | List all learnings (filter by category, impact) |
| GET | `/playbook` | Get latest playbook |
| POST | `/playbook/regenerate` | Force regenerate playbook |

### Drafts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/drafts/generate` | AI-generate draft variants |
| GET | `/drafts` | List drafts (filter by status) |
| POST | `/drafts` | Create manual draft |
| PUT | `/drafts/{id}` | Update draft |
| POST | `/drafts/{id}/publish` | Convert draft to post |
| POST | `/drafts/{id}/improve` | AI-improve draft (punch hook, shorten, etc.) |
| POST | `/drafts/{id}/upload-image` | Upload image for draft |
| POST | `/drafts/{id}/post-to-linkedin` | Publish draft to LinkedIn |

### Content Organization
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/pillars` | Content pillars |
| CRUD | `/series` | Content series |
| CRUD | `/mood-board` | Mood board items |
| CRUD | `/hooks` | Hook lines |
| POST | `/hooks/extract` | AI-extract hook from post content |
| CRUD | `/hashtags` | Hashtag sets |
| CRUD | `/calendar` | Calendar entries |
| CRUD | `/goals` | Performance goals |
| CRUD | `/competitors` | Competitor profiles |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Summary stats |
| GET | `/dashboard/heatmap` | Best posting times |
| GET | `/dashboard/pillar-balance` | Post distribution |
| GET | `/dashboard/analytics` | Full analytics breakdown |
| GET | `/dashboard/actions` | Action items (unanalyzed posts, metrics due) |
| GET | `/dashboard/queue-status` | Upcoming scheduled posts |
| POST | `/dashboard/post-ideas` | AI-generate post ideas from raw thoughts |
| GET | `/calendar/suggestions` | AI content plan for next week |

### LinkedIn OAuth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/linkedin/start` | Begin OAuth flow |
| GET | `/auth/linkedin/callback` | OAuth callback handler |
| GET | `/auth/linkedin/status` | Check connection status |
| GET | `/health` | Server health check |

## How AI Analysis Works

1. **Baseline**: Calculated from your own posts — average engagement score + median impressions
2. **Classification**: Post engagement compared to baseline (hit >1.5x avg, miss <0.5x avg, average in between). Saves weighted higher than likes. AI confirms with full context.
3. **Learnings**: AI extracts 2-4 insights per post with confidence scores based on evidence strength
4. **Confidence**: Starts at AI-assessed value (0.3–0.95). Grows when the same insight is re-confirmed from another post analysis.
5. **Playbook**: All learnings fed to AI (sorted by confidence), generates DO/DON'T/Best Practices. Only regenerates when learnings actually change (hash-based caching).

## How AI Drafts Work

The draft generator gathers 6 inputs:
1. **Your playbook** — the rules to follow
2. **Voice reference** — your top 5 posts by engagement (so it writes like you)
3. **Hook library** — your best-performing opening lines
4. **Hashtag sets** — pillar-specific hashtags
5. **Pillar context** — name and description of the content pillar
6. **Style preference** — tone you specify (or default "professional, engaging")

Outputs multiple variants, each with a different hook style, full body, CTA, and hashtags.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKEDIN_LLM_PROVIDER` | Yes | `gemini` (default) or `claude` |
| `GEMINI_API_KEY` | If gemini | Google GenAI API key |
| `ANTHROPIC_API_KEY` | If claude | Anthropic API key |
| `LINKEDIN_GEMINI_MODEL` | No | Gemini model override (default: `gemini-2.5-pro`) |
| `LINKEDIN_CLAUDE_MODEL` | No | Claude model override (default: `claude-sonnet-4-5-20250929`) |
| `LINKEDIN_LLM_TEMPERATURE` | No | LLM temperature (default: `0.7`) |
| `LINKEDIN_SQLITE_PATH` | No | Database path (default: `backend/linkedin_data.db`) |
| `LINKEDIN_HOST` | No | Server host (default: `127.0.0.1`) |
| `LINKEDIN_PORT` | No | Server port (default: `8200`) |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth app client ID |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth app client secret |

### LinkedIn OAuth Setup (Optional)

To enable the "Post to LinkedIn" feature:

1. Create an app at [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Set redirect URI to `http://localhost:8200/auth/linkedin/callback`
3. Request scopes: `openid`, `profile`, `w_member_social`
4. Add `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` to `backend/.env`