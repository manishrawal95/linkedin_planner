# LinkedIn Planner — Data Flow Map

## Visual Pipeline Overview

```
+-------------------------------------------------------------------------+
|                         USER ACTIONS                                     |
+----------+----------+----------+----------+----------+------------------+
| Add Post | Add      | Import   | Generate | Approve  | Build    Run     |
|          | Metrics  | XLSX     | Ideas    | Idea     | Memory   Strategy|
+----+-----+----+-----+----+-----+----+-----+----+-----+----+-----+------+
     |          |          |          |          |          |     |
     v          v          v          v          v          v     v
+-------------------------------------------------------------------------+
|                         BACKEND MODULES                                  |
+----------+----------+----------+----------+----------+------------------+
| server   | analyzer | importer | ideator  | drafter  | memory  strate- |
| .py      | .py      | .py      | .py      | .py      | .py    gist.py |
|          |          |          |          |          |                  |
|          |          |   scheduler.py      |    context.py (unified)    |
+----+-----+----+-----+----+-----+----+-----+----+-----+----+-----+------+
     |          |          |          |          |          |     |
     v          v          v          v          v          v     v
+-------------------------------------------------------------------------+
|                    SQLite DATABASE (13 tables + 1 view)                  |
|                                                                          |
|  posts <--> metrics_snapshots --> learnings --> playbook                 |
|    |              |                    |              |                   |
|    v              v                    v              v                   |
|  creator_memory   strategy_reviews    goals         drafts               |
|    |              |                    |              |                   |
|    v              v                    v              v                   |
|  ideas          content_pillars    content_series  hooks                 |
|                                                                          |
|  analytics_summary  daily_engagement  follower_daily  audience_demos    |
|  mood_board_items   content_calendar  competitor_profiles (UNUSED)       |
|                                                                          |
|  VIEW: latest_metrics (replaces MAX(snapshot_at) subqueries)            |
+-------------------------------------------------------------------------+
```

---

## Unified Context Builder (context.py)

All LLM pipelines (ideation, drafting, scheduling) get context through ONE path:

```
build_creator_context()
       |
       +-- _format_profile()      <- creator_profile.condensed_context
       +-- _format_strategy()     <- strategy_reviews (health, verdicts, recs)
       +-- _format_goals()        <- goals (active, metric -> target)
       +-- _format_voice()        <- creator_memory.voice_profile -> compact key-value
       +-- _format_dna()          <- creator_memory.content_dna -> tabular format
       +-- _format_playbook()     <- playbook (latest content)
       +-- _format_learnings()    <- learnings (top 15, confirmed, high-confidence)

Format: compact key-value encoding (lossless, 60-70% fewer tokens than JSON)
Truncation: NONE -- all data preserved in full
```

---

## Pipeline 1: Post Analysis

```
User adds metrics
       |
       v
  +---------------+
  | metrics_       |
  | snapshots      |
  | (INSERT)       |
  +-------+-------+
          |
          v
  +--------------------------------------------+
  |  READS for baseline:                        |
  |  * ALL posts by author='me'                |
  |  * latest_metrics view                      |
  |  * Pillar name                             |
  +----------------+---------------------------+
                   |
  +----------------v-------------------+
  |  LLM Call: CLASSIFY_AND_EXTRACT     |
  |  (single merged call)               |
  |                                     |
  |  Context:                           |
  |  * Post content [:500]              |
  |  * Post type, hook, CTA, words      |
  |  * Baseline medians                 |
  |  * Percentiles (imp, saves, rate)   |
  |  * Viral flag, trajectory           |
  |  * Similar posts (3, same pillar)   |
  |  * ALL existing learnings           |
  |                                     |
  |  Output: classification + 2-3       |
  |          learnings in one JSON      |
  +----------------+-------------------+
                   |
  +----------------v-------------------+
  |  Dedup & Merge Learnings            |
  |                                     |
  |  * Jaccard similarity >= 0.35       |
  |    -> increment times_confirmed     |
  |  * Otherwise -> INSERT new          |
  +----------------+-------------------+
                   |
  +----------------v-------------------+
  |  Playbook Regeneration Check        |
  |                                     |
  |  READS: learnings (conf >= 0.6      |
  |         OR confirmed > 1)           |
  |  Hash changed? -> background task   |
  |  via create_task() (not asyncio)    |
  |  WRITES: playbook                   |
  +----------------+-------------------+
                   |
  +----------------v-------------------+
  |  Memory Incremental Update          |
  |                                     |
  |  READS: current memory + new post   |
  |  LLM: compute voice delta           |
  |  SQL: refresh content_dna           |
  |  WRITES: creator_memory update      |
  +------------------------------------+
```

**WRITES:** `posts.classification`, `learnings`, `playbook`, `creator_memory`, `memory_updates`, `competitor_profiles` (stats sync)

---

## Pipeline 2: Idea Generation (AI-Scored)

```
User clicks "Generate Ideas"
       |
       v
  +----------------------------------------------+
  |  Gather Sources (non-AI)                      |
  |                                               |
  |  1. Due Series -> content_series              |
  |  2. Unused Mood Board -> mood_board_items     |
  |  3. Hit Repurposing -> posts (hit, me)        |
  |  4. Competitor Inspiration -> posts (hit,     |
  |     author != 'me') -- your take on their     |
  |     winning topics                            |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  Collision Check (avoid duplicates)           |
  |                                               |
  |  recent_topics() checks:                      |
  |  * Published posts (30 days)                  |
  |  * Scheduled drafts (content_calendar)        |
  |  * Pending/approved ideas                     |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  build_creator_context()                      |
  |  (unified, no truncation)                     |
  |                                               |
  |  Includes: profile, strategy, goals,          |
  |  voice, DNA, playbook, learnings              |
  |                                               |
  |  + gap_pillar (most underused)                |
  |  + recent_topics (collision-checked)          |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  LLM Call: IDEATION_ENGINE                    |
  |                                               |
  |  AI-generated ideas include fit_score and     |
  |  fit_reason directly in the LLM response.     |
  |  Topics max 12 words (short headlines).       |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  AI Scoring (non-AI ideas)                    |
  |                                               |
  |  _ai_score_ideas() sends non-AI ideas         |
  |  (series, mood_board, repurpose, competitor)  |
  |  to LLM with creator context for scoring.    |
  |                                               |
  |  LLM returns:                                 |
  |  * fit_score (0.0 - 1.0)                     |
  |  * fit_reason (max 4 words)                  |
  |                                               |
  |  Replaces old heuristic _score_idea() which   |
  |  used hardcoded weights for pillar verdicts,  |
  |  recency, and goal alignment.                 |
  +-----------------------+-----------------------+
                          |
                          v
                 WRITES: ideas table (with fit_score, fit_reason)
```

---

## Pipeline 2b: Idea Approval -> Auto-Draft

```
User clicks "Approve" on an idea
       |
       v
  +----------------------------------------------+
  |  POST /ideas/{id}/approve                     |
  |                                               |
  |  1. Update idea status -> "approved"          |
  |  2. Trigger BackgroundTask: auto-draft        |
  +-----------------------+-----------------------+
                          |
                          v  (background)
  +----------------------------------------------+
  |  generate_drafts()                            |
  |                                               |
  |  * topic from idea                            |
  |  * pillar_id from idea                        |
  |  * num_variants = 2                           |
  |  * Uses full creator context                  |
  +-----------------------+-----------------------+
                          |
                          v
  +----------------------------------------------+
  |  WRITES:                                      |
  |  * drafts (INSERT 2 variations)               |
  |  * ideas (UPDATE status='drafted',            |
  |           draft_id = first draft)             |
  +----------------------------------------------+

  Frontend polls silently every 5s until
  idea.status changes to "drafted", then
  shows toast: "Drafts ready -- check Draft Workshop"
```

---

## Pipeline 3: Draft Generation

```
User clicks "Generate Draft" (from idea or direct)
       |
       v
  +----------------------------------------------+
  |  gather_context() -- draft-specific only       |
  |                                               |
  |  1. Voice Reference [:1500]                   |
  |     <- TOP 5 posts (hit > avg)                |
  |     <- each post content [:400]               |
  |     <- latest_metrics view                    |
  |                                               |
  |  2. Hooks (top 10 by engagement)              |
  |     <- hooks table                            |
  |                                               |
  |  3. Hashtags (pillar-specific)                |
  |     <- hashtag_sets table                     |
  |                                               |
  |  4. Pillar name + description                 |
  |     <- content_pillars table                  |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  build_creator_context()                      |
  |  (unified, no truncation)                     |
  |                                               |
  |  Includes: profile, strategy, goals,          |
  |  voice, DNA, playbook, learnings              |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  LLM Call: GENERATE_DRAFT                     |
  |  Output: 2-3 variants with hook, content,     |
  |          hashtags                              |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  Draft Confidence Scoring                     |
  |                                               |
  |  _score_draft_confidence() checks:            |
  |  * Strategy pillar alignment (+0.15/-0.2)     |
  |  * Word count in DNA sweet spot (+0.1)        |
  |  * Goal keyword alignment (+0.1)              |
  |  * Has CTA signal (+0.05)                     |
  |  * Has punchy hook line (+0.05)               |
  |  -> Populates drafts.confidence field         |
  +-----------------------+-----------------------+
                          |
                          v
                 WRITES: drafts table (with confidence)
```

---

## Pipeline 3b: Auto-Schedule (LLM-Powered)

```
User clicks schedule icon on a draft
       |
       v
  +----------------------------------------------+
  |  POST /drafts/{id}/auto-schedule              |
  |                                               |
  |  Gathers context for LLM:                     |
  |  * Last 30 posts with engagement metrics      |
  |  * Already-occupied calendar slots (next 14d) |
  |  * Pillar balance (last 30 days)              |
  |  * Draft topic + pillar                       |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  LLM Call: OPTIMAL_SCHEDULE                   |
  |                                               |
  |  AI analyzes:                                 |
  |  * Which day+hour historically got best       |
  |    engagement for this pillar                 |
  |  * Pillar spacing (avoid back-to-back)        |
  |  * Calendar conflicts                         |
  |  * Posting frequency patterns                 |
  |                                               |
  |  Returns:                                     |
  |  * date (YYYY-MM-DD)                          |
  |  * time (HH:MM)                               |
  |  * reason (max 12 words)                      |
  |                                               |
  |  Fallback: next weekday at 08:30 if LLM fails |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  WRITES:                                      |
  |  * content_calendar (INSERT entry)            |
  |  * drafts (UPDATE status='scheduled')         |
  +-----------------------+-----------------------+
                          |
                          v
  Toast: "Scheduled for Wed, Mar 11 at 11:30"
         "Wednesday mornings perform best for this pillar"
         [Change] button -> opens date/time picker
```

---

## Pipeline 4: Strategy Review

```
User clicks "Run Strategy" or imports metrics
       |
       v
  +----------------------------------------------+
  |  Compute Metrics (Pure SQL, no LLM)           |
  |  (uses latest_metrics view throughout)        |
  |                                               |
  |  READS:                                       |
  |  * analytics_summary (account stats)          |
  |  * posts + latest_metrics (all, joined)       |
  |  * content_pillars (pillar performance)       |
  |  * follower_daily (growth rate)               |
  |  * audience_demographics (top segments)       |
  |                                               |
  |  COMPUTES:                                    |
  |  * Classification dist (hits/avg/miss)        |
  |  * Per-pillar: avg engagement, impressions    |
  |  * Per-hook: avg engagement, hit count        |
  |  * Per-CTA: avg engagement, comments          |
  |  * Audience depth score                       |
  |  * Posting frequency (posts/week)             |
  |  * Hit formula (dominant hook+CTA+format)     |
  |  * Competitor benchmarks (author != 'me',     |
  |    avg engagement, impressions, hit count)    |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  LLM Call: GENERATE_STRATEGY_REVIEW           |
  |                                               |
  |  Input: Full metrics dict (JSON)              |
  |                                               |
  |  Output:                                      |
  |  * health_score (1-10)                        |
  |  * diagnosis (text)                           |
  |  * whats_working[] / whats_not_working[]      |
  |  * hit_formula (text)                         |
  |  * recommendations[] (action + impact)        |
  |  * experiments[] (name + hypothesis)          |
  |  * pillar_verdicts[] (Invest/Maintain/        |
  |    Retire + score)                            |
  +-----------------------+-----------------------+
                          |
  +-----------------------v-----------------------+
  |  Auto-Generate Goals                          |
  |                                               |
  |  DELETE old auto goals                        |
  |  INSERT 5 new goals:                          |
  |  * Hit rate %  -> current + 10%               |
  |  * Posts/week  -> current + 1                 |
  |  * Avg engagement -> current x 1.2            |
  |  * Daily followers -> current x 1.2           |
  |  * Audience depth -> next level               |
  +-----------------------+-----------------------+
                          |
                          v
           WRITES: strategy_reviews, goals
```

---

## Pipeline 5: Creator Memory Build

```
User clicks "Build Memory" (requires >= 10 posts)
       |
       v
  +----------------------------------------------+
  |  READS: ALL posts + latest_metrics view       |
  +---------------------+------------------------+
                        |
         +--------------+--------------+
         v              v              v
  +--------------+ +-----------+ +-------------+
  | LLM Call 1   | | Pure SQL  | | LLM Call 2  |
  | Voice        | | Content   | | Audience    |
  | Profile      | | DNA       | | Model       |
  |              | |           | |             |
  | Top 20       | | Grouped   | | Top 15      |
  | posts by     | | by pillar,| | posts with  |
  | engagement   | | hook,     | | classif +   |
  | [:600 each]  | | CTA, type,| | metrics     |
  |              | | word count| |             |
  +------+------+ +-----+-----+ +------+------+
         |              |              |
         |              |     +--------+
         |              |     |
         |              |     v
         |              |  +-------------+
         |              |  | LLM Call 3  |
         |              |  | Growth      |
         |              |  | Trajectory  |
         |              |  |             |
         |              |  | Chrono      |
         |              |  | posts +     |
         |              |  | metrics     |
         |              |  +------+------+
         |              |         |
         v              v         v
  +----------------------------------------------+
  |  WRITES: creator_memory                       |
  |  (voice_profile, content_dna,                 |
  |   audience_model, growth_trajectory)          |
  |                                               |
  |  WRITES: memory_updates (audit)               |
  +----------------------------------------------+
```

---

## Pipeline 6: XLSX Import

```
User uploads LinkedIn Analytics XLSX
       |
       v
  +----------------------------------------------+
  |  Parse 5 Sheets (no LLM)                     |
  |                                               |
  |  DISCOVERY --> analytics_summary (upsert)     |
  |                                               |
  |  ENGAGEMENT --> daily_engagement               |
  |                 (INSERT OR REPLACE by date)    |
  |                                               |
  |  TOP POSTS --> Match by URL/activity ID        |
  |                |                               |
  |                +- Existing post + manual       |
  |                |  breakdown? Keep breakdown,   |
  |                |  update impressions if higher  |
  |                |                               |
  |                +- Existing post, no manual?    |
  |                |  Update likes + impressions   |
  |                |                               |
  |                +- New URL? Create post stub    |
  |                   + new snapshot                |
  |                                               |
  |  FOLLOWERS --> analytics_summary               |
  |                (total_followers)                |
  |                follower_daily                   |
  |                                               |
  |  DEMOGRAPHICS --> audience_demographics        |
  |                   (DELETE old -> INSERT new)    |
  +----------------------------------------------+
```

---

## Pipeline 7: Draft -> Publish

```
User clicks "Publish" on a draft
       |
       v
  +----------------------------------------------+
  |  LLM Call: AUTO_FILL                          |
  |  * Extract hook_line, hook_style, cta_type,   |
  |    post_type, topic_tags from content         |
  |  * Match pillar name -> pillar ID             |
  +-----------------------+-----------------------+
                          |
                          v
  +----------------------------------------------+
  |  WRITES:                                      |
  |  * posts (INSERT new post)                    |
  |  * drafts (UPDATE status='posted')            |
  |  * ideas (UPDATE status='posted' if linked)   |
  |  * hooks (INSERT/sync hook_line)              |
  |                                               |
  |  Returns needs_metrics=true to prompt user    |
  |  -> adding metrics triggers full analysis     |
  +----------------------------------------------+
```

---

## What Feeds Into LLM Prompts (Cross-Reference)

```
                    Classify+  Generate  Ideation  Strategy  Memory   Schedule
                    Extract    Draft     Engine    Review    Build    Optimal
                    ---------- --------- --------- -------- ------   --------
posts (content)      [:500]     [:400]                       [:600]
                               (voice)            via
metrics (view)       Y          Y(voice)          metrics    Y        Y(30 posts)
learnings            Y(all)     via ctx   via ctx
playbook                        via ctx   via ctx
creator_profile                 via ctx   via ctx
creator_memory                  via ctx   via ctx
  voice_profile                 compact   compact
  content_dna                   tabular   tabular
strategy_reviews                via ctx   via ctx
goals                           via ctx   via ctx
content_pillars      Y(name)   Y(desc)   Y(gap)    Y(perf)           Y(balance)
hooks                           Y(top10)
audience_demographics                               Y
follower_daily                                      Y
similar posts        Y(3)
baseline (computed)  Y
content_calendar                                                      Y(occupied)
draft (topic+pillar)                                                  Y

"via ctx" = provided by build_creator_context() -- no truncation, compact format
```

---

## Draft Lifecycle

```
                     +-- Manual create
                     |
  Idea approved --+--+-> draft (active)
                          |
                          +-- User edits -> revised (active)
                          |
                          +-- Auto-schedule -> scheduled
                          |       |
                          |       +-- User clicks "Change" -> reschedule modal
                          |
                          +-- Publish -> posted
                          |       |
                          |       +-- Add metrics -> triggers Pipeline 1
                          |
                          +-- Discard -> discarded (soft delete)
```

---

## Resolved Issues

| Issue | Resolution |
|-------|------------|
| Truncation risks (profile, memory, strategy) | Eliminated -- `context.py` preserves all data in compact format |
| Voice profile sent as raw JSON | Fixed -- `_format_voice()` converts to key-value pairs |
| Voice reference truncated to 1500 chars | Fixed -- full reference passed to draft prompt |
| Playbook regen fire-and-forget | Fixed -- uses `create_task()` from `backend.tasks` |
| Strategy not reaching ideas | Fixed -- unified context includes strategy with no truncation |
| Idea scoring hardcoded heuristics | Fixed -- replaced with LLM-based scoring using creator context |
| Idea scoring ignores goals | Fixed -- LLM considers goals, strategy, and voice when scoring |
| Duplicate LLM calls (classify + extract) | Fixed -- merged into single `classify_and_extract()` |
| MAX(snapshot_at) repeated subqueries | Fixed -- `latest_metrics` SQLite view used everywhere |
| No post-publish feedback | Fixed -- returns `needs_metrics=true`, links idea->draft->post |
| No auto-drafting on approve | Fixed -- BackgroundTasks generates 2 draft variants automatically |
| Manual date/time scheduling | Fixed -- LLM picks optimal slot based on posting history |
| `content_calendar` isolated from ideation | Fixed -- `get_recent_topics()` checks scheduled drafts + pending ideas |
| Draft `confidence` unpopulated | Fixed -- `_score_draft_confidence()` scores strategy/goals/DNA alignment |
| Draft generation not using background tasks | Fixed -- uses `useBackgroundTask` hook with polling |
| Calendar suggestions not useful | Removed -- replaced with LLM auto-scheduling on demand |
| Sparkles icon overused everywhere | Fixed -- contextual icons (Lightbulb, PenTool, Wand2, Brain, etc.) |

## Self-Reinforcing Feedback Loop

```
                    +-- Competitor Posts --+
                    |                      |
                    v                      v
Posts -> Metrics -> Analysis -> Learnings -> Playbook -+
  ^                  |                                  |
  |                  +-> competitor_profiles (stats)    |
  |                                                     |
  |    +-- Ideas (AI-scored with creator context) <-- Strategy <-+
  |    |       ^                              ^
  |    |       |                              |
  |    |   competitor hits              competitor benchmarks
  |    |   + scheduled drafts
  |    |   + pending ideas (collision check)
  |    |
  |    v
  |  Approve -> Auto-Draft (2 variations)
  |    |
  |    v
  +- Drafts (confidence-scored) <-- build_creator_context()
       |
       v
  Auto-Schedule (LLM picks optimal slot)
       |
       v
  Calendar -> Publish -> Metrics -> (loop restarts)
```
