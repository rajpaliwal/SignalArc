# SignalArc — Project Context Summary

*Written as a handoff brief so another AI assistant (or a new session) can pick up this project with full context. Paste this whole document into a new chat to bring it up to speed.*

---

## 1. What SignalArc is

SignalArc is a **personal world-intelligence application**: it combines a *personal relevance graph* (what a specific user cares about — interests, location, profession, followed entities) with an *evidence-backed world-event graph* (real-world stories, built from news/events, with structured claims, decisions, timelines and sources).

**Product promise:** "Discover what is changing in the world that matters to me, understand how it developed, and keep me updated without forcing me to read twenty versions of the same story."

What makes it different from a normal news feed:
- **Story-centric, not article-centric** — many articles about the same real-world situation get merged into one evolving "Story" with a timeline, not shown as N separate headlines.
- **Evidence-first** — every material claim keeps its source; confirmed/reported/disputed/corrected/unknown are distinct, visible states (never smoothed into one confident-sounding paragraph).
- **Personal but transparent** — the user can always see *why* a story is relevant to them, and can edit or delete any inferred interest.
- **Change-aware** — notifications fire on *material change* to a followed story, not on new articles/publication volume.
- **Temporal** — the system preserves how a story and its claims evolved, including corrections.

**Initial target user / market wedge:** an Indian tech professional living in the UK (persona: "Raj, an AI engineer in London, originally from India") who cares about AI policy, UK-India relations, Indian/UK politics, and sports. This wedge was chosen deliberately to get variety (multiple domains) while keeping the evaluation scope manageable.

**Origin of this project:** built from a detailed product/technical blueprint PDF ("SignalArc Application — Product & Technical Blueprint v0.1") that specifies vision, personas, functional/non-functional requirements, system architecture, database design (Postgres + Neo4j), AI/ranking/evidence model, UI hierarchy, security/privacy, API contracts, delivery roadmap, and a full Jira-style backlog. That blueprint is the north star for scope and design decisions; this document summarizes where implementation actually stands relative to it.

---

## 2. The 10-step user journey (the product's spine)

Everything in the product maps to this flow:

1. **User registers.**
2. **Onboarding questions** — hobbies, interests, location, sports, movies, political interests, profession, anything else.
3. **Everything goes into a graph DB** (personal relevance graph).
4. **GPT-like chat interface** — the user can talk freely; the system decides per-message whether it was a genuine interest or a throwaway/temp remark, with a confidence score, and only saves genuine interest signals to the graph.
5. **World discovery** — based on the user's graph + topics, the system fetches what's going on in the world relevant to them (via news/search APIs — SERP in the current experiments).
6. **Structured extraction** — events, people, organizations, decisions, claims, locations, dates, outcomes are extracted from raw coverage and assembled into one coherent story + timeline + sources.
7. **Follow/unfollow stories**, with an always-visible explanation of *why* a story is being shown ("because you follow X topic").
8. **What-if questions** — the user can ask hypothetical questions about a story and get a scenario-style (never-stated-as-fact) prediction.
9. **Full analysis** of a story (key drivers, risks, outlook) — generated only from validated/structured story data, not raw text.
10. **Notification preferences** — the user can turn on email/other notifications at a chosen frequency for followed stories.

---

## 3. Intended production architecture (per blueprint, not all built yet)

- **Deployment shape:** modular monolith + separate background workers to start (not microservices from day one).
- **Web:** Next.js/React.
- **API:** Python FastAPI.
- **Workers:** Python + a queue (Redis) for collection, deduplication, clustering, extraction, graph writes, monitoring.
- **Canonical data store:** PostgreSQL + pgvector (users, stories, versions, subscriptions, jobs, feedback, audit, embeddings/semantic search).
- **Graph store:** Neo4j — used for structural traversal / relationship reasoning over both the personal graph and the world-event graph. **Decision: Neo4j is the chosen graph DB.** (AWS Neptune was evaluated in early experiments but has since been dropped — the Neptune client/experiment files were removed from the repo.)
- **Object storage:** S3-compatible, for raw permitted article content and evidence artifacts.
- **Hard architectural boundary:** the LLM only *proposes* structured data (entities, events, claims, etc.); it never writes directly to Postgres or Neo4j. Deterministic validation/entity-resolution/persistence code sits between model output and any published state. This is a load-bearing design rule from the blueprint, meant to keep hallucinations out of published story state.
- **Evidence model:** every claim/timeline event carries a status — `observed | reported | corroborated | disputed | corrected | scenario` — and this status is a first-class UI concept, not an afterthought.
- **Ranking:** an explainable weighted score (topic match + entity match + geography + profession + subscription strength + importance + novelty + source diversity − repetition − negative feedback − fatigue), with components stored so the UI can show an honest "why this is relevant."

### Cost-conscious pilot stack (recommended for ~10 users / 3 months, near-$0)
Discussed but **not yet implemented**:
- Frontend: Next.js on Vercel (free tier).
- API + workers: FastAPI, self-hosted on an Oracle Cloud "Always Free" VM (or similar).
- Postgres + pgvector: Supabase or Neon free tier.
- Graph: Neo4j AuraDB Free tier.
- Object storage: Cloudflare R2 free tier (no egress fees).
- Embeddings: local `sentence-transformers` model (zero API cost) instead of a paid embeddings API.
- LLM (extraction/summarization): Claude Haiku or Gemini Flash, pay-as-you-go — the one component that isn't free, but cheap at this scale (single-digit dollars over 3 months for 10 users).
- Email: Resend free tier.

---

## 4. What actually exists in the repo right now

Repo root: `/Users/raj/AI/SignalArc` (single git repo, one commit so far: `d841fce`, plus uncommitted work-in-progress on top of it).

### 4a. Backend experiments (pre-existing, NOT wired to the frontend)
Loose Python scripts at the repo root — exploratory, not a real service:
- `main.py` — ad-hoc Cypher queries run directly against the Neo4j driver (scratch/experimentation, lots of commented-out query variants).
- `neo4j_client.py` — a `get_driver()` helper for connecting to Neo4j Aura (reads `NEO4J_URI`/`NEO4J_USERNAME`/`NEO4J_PASSWORD`/`NEO4J_DATABASE` from `.env`).
- `serp.py` — a one-off script hitting Bright Data's SERP API to test fetching Google search results (for the "discover what's in the world" step, eventually).
- `.env` (gitignored, real secrets) has: `OPENAI_API_KEY`, Neo4j Aura credentials, and (previously) AWS Neptune credentials.
- **AWS Neptune (`neptune_client.py`, `neptune_db.py`) was explored and then removed from the repo** — Neo4j is the sole graph DB going forward.
- None of this is called by the frontend. There is no running API server yet.

### 4b. Frontend — a fully built **static** prototype (`web/`)
Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, `lucide-react` icons, `clsx`. No backend calls anywhere — all data is either hand-authored mock data or lives in the browser's `localStorage`.

**Why static-first:** the plan was to prove out the entire UI/UX and information architecture against realistic mock data before building the real backend, so backend work can slot in later as a data-source swap rather than a UI rewrite.

**Pages (13 routes total):**

| Route | Purpose | Journey step(s) |
|---|---|---|
| `/` | Landing page, dark hero, pitch | — |
| `/sitemap` | Directory of every page in the app, with a one-click "start demo session" for exploring without registering | (meta/dev aid) |
| `/register` | Create profile: name, email, city/country, profession | Step 1 |
| `/onboarding` | 7-step wizard: hobbies → interests/topics → sports → movies → political interests → free text → review | Step 2 |
| `/discover` | Ranked, explainable story feed ("Your horizon") | Steps 5-6 |
| `/following` | Active subscriptions, per-story cadence, pause/resume/unfollow | Step 7 |
| `/chat` | Free-text chat; classifies each message as genuine interest / casual mention / negative, with a confidence %, and only writes "interested" signals to the graph | Step 4 |
| `/story/[id]` (5 mock stories) | Tabs: Timeline · Evidence & sources · What-if · Analysis. Follow button with cadence picker, "why am I seeing this" explainer, correction history | Steps 6-9 |
| `/constellation` | SVG visualization of the user's personal relevance graph (explicit vs. inferred edges, followed stories), with per-edge remove controls and an implicit-learning on/off toggle | Step 3 (visualized) |
| `/settings` | Notification frequency/quiet hours, profile edit, **working** export-to-JSON and delete-everything (real, local, no backend needed) | Step 10 |

**Core simulated-intelligence modules** (deterministic heuristics standing in for future backend/LLM logic — same output *shape* as the real thing will need, so swapping in a real API later is additive, not a rewrite):
- `lib/relevance.ts` — client-side relevance scoring engine implementing the blueprint's ranking expression (topic/geography/profession/subscription/importance/novelty/source-diversity, minus negative feedback), with stored per-component contributions for an honest "why" explanation.
- `lib/chat-engine.ts` — keyword/phrase-based NLU: detects topic(s) in a chat message, classifies as `interested | temporary | negative`, with a confidence score, and decides whether to write to the graph.
- `lib/predict.ts` — the "What-If" predictor: matches a free-text question against pre-authored scenario seeds per story, or falls back to a generic low-confidence extrapolation; always labeled as a scenario, never as fact (mirrors the blueprint's evidence model).
- `lib/mock-data.ts` — 5 fully detailed hand-authored stories (India AI governance framework, UK skilled-worker visa rules, UK-India FTA, BCCI/ICC cricket governance dispute, Bengaluru AI-hub GCC trend) each with timeline, entities, decisions, claims, outcomes, disputed positions, unknowns, sources, and analysis — standing in for the real ingestion → clustering → extraction pipeline.
- `lib/store.tsx` — a React Context + `localStorage`-backed store holding: profile, interest edges (explicit/inferred/negative, with weights/confidence/reasons), chat history, subscriptions, feedback records, notification settings, what-if history. Includes a "guest exploration" path that seeds a demo profile so the app is explorable with zero registration.

**Design language:** indigo/teal accent colors, dark-navy hero sections (matching the blueprint's cover art concept of a constellation), light content pages. Evidence status pills (confirmed/reported/disputed/corrected/scenario) are a recurring, consistent visual primitive across the app.

### 4c. Verification approach used
The frontend was actually driven end-to-end in a real headless browser (Playwright, installed temporarily for testing and removed afterward) rather than just type-checked/linted — this caught and fixed several real bugs:
- A decorative hero SVG that visually blew up over the title text (`preserveAspectRatio` misuse).
- A duplicated chat greeting message.
- The chat NLU under-classifying a natural "I've been really into X" phrasing as casual.
- A Tailwind class-override bug that broke the Constellation graph's dark background.
- Next.js dev server 403s / infinite loading spinner caused by opening the app via the printed LAN network URL instead of `localhost` (Next blocks cross-origin dev asset requests by default) — fixed with `allowedDevOrigins` in `next.config.ts`, but `localhost:3000` remains the recommended URL.
- "Explore without an account" not actually working (the auth guard bounced straight back to `/register`) — fixed by seeding a demo "Guest Explorer" profile instead.

---

## 5. What is NOT built yet

- No real backend/API service (no FastAPI app running).
- No real Neo4j writes from the product (the existing `neo4j_client.py`/`main.py` are disconnected experiments, not wired to the frontend).
- No LLM integration for extraction/summarization/what-if/relevance — all of that is currently simulated with deterministic client-side heuristics over mock data.
- No real news/SERP ingestion feeding the app (the `serp.py` Bright Data experiment is standalone).
- No PostgreSQL, no pgvector, no Redis queue, no object storage — none of the canonical-data-store layer exists yet.
- No authentication (registration is a local-only form; nothing is verified or persisted server-side).
- No deployment — everything runs locally via `npm run dev` in `web/`.

## 6. Immediate next step (as of this writing)

The user was about to decide how to reconcile a couple of local, uncommitted edits to the Python experiment files (`main.py`, `neo4j_client.py`) made outside of this AI session, before starting real backend work. The natural next phase is: stand up the FastAPI service, wire real Neo4j writes for the personal graph (profile/onboarding → graph), and begin replacing the frontend's mock-data/heuristic modules (`mock-data.ts`, `relevance.ts`, `chat-engine.ts`, `predict.ts`) one at a time with real API calls — without needing to change the page components themselves, since they were deliberately built against those modules' interfaces.

---

## 7. Where to look in the repo

```
SignalArc/
├── main.py, neo4j_client.py, serp.py, .env   ← backend experiments (not integrated)
├── PROJECT_SUMMARY.md                         ← this file
└── web/                                       ← the Next.js frontend prototype
    ├── app/                                   ← pages (see route table above)
    ├── components/                            ← UI primitives + feature components
    └── lib/
        ├── types.ts        ← shared domain types (Story, InterestEdge, UserProfile, etc.)
        ├── mock-data.ts     ← the 5 fixture stories
        ├── relevance.ts     ← ranking/explanation engine
        ├── chat-engine.ts   ← chat NLU simulator
        ├── predict.ts       ← what-if predictor
        └── store.tsx        ← global app state (localStorage-backed)
```

To run the frontend: `cd web && npm run dev`, then open **`http://localhost:3000`** (not the network/LAN URL).
