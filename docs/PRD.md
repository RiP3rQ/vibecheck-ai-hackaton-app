# Product Requirements Document (PRD)

## 1) Project Overview

Build a web application that helps users:

1. Optimize draft tweets ("Post Improver")
2. Generate context-aware replies ("Post Responder")

The app must support real-time streaming responses from LLMs, secure user authentication, and persistent per-user system instructions.

## 2) Goals and Success Criteria

### Primary Goals

- Provide a fast, reliable workflow for improving tweet drafts and generating replies.
- Persist user-specific default system instructions across sessions.
- Ensure secure access and data linking using authenticated user identity.
- Deliver real-time streamed output for both core features.

### Success Criteria (MVP)

- Authenticated users can save and retrieve default system instructions.
- System instructions autosave after inactivity (2-second debounce).
- Both "Post Improver" and "Post Responder" stream output in real time.
- Users can copy generated outputs with one click.
- App runs locally with PostgreSQL via `docker-compose.yml`.

## 3) Technical Stack

- Framework: Next.js (recommended/assumed for compatibility)
- UI Components: shadcn/ui
- AI Integration:
  - Vercel AI SDK (core streaming + model orchestration)
  - `ai-sdk/elements` for chat/output UI primitives
- Authentication: Clerk
- Database: PostgreSQL
- Local Infrastructure: Docker Compose

## 4) User Personas and Core Use Cases

### Persona A: Content Creator / Marketer

- Wants to improve clarity, tone, and impact of tweet drafts.
- Needs quick iteration with custom guidance.

### Persona B: Social Media Operator

- Needs fast, on-brand replies to tweets.
- Sometimes wants provocative/sarcastic responses quickly.

### Core Use Cases

- Improve a draft tweet using instructions + context.
- Generate a custom-angle reply to a target tweet.
- Generate an instant "edgy" response from a preset prompt.
- Save personal system behavior preferences once and reuse automatically.

## 5) Information Architecture and Layout

### App Shell

- Fixed sidebar (shadcn sidebar pattern).
- Dynamic main content area switches views.

### Sidebar Requirements

#### Top Section

- View selector (dropdown or toggle):
  - Post Improver
  - Edgy Responder (Post Responder)

#### Middle Section

- Textarea labeled "Default System Instructions".
- Auto-save behavior:
  - Trigger save 2 seconds after last keystroke.
  - Debounced update to database.
  - Save tied to authenticated user ID.

#### Bottom Section

- Authenticated user snippet using Clerk:
  - `<UserButton />` preferred, or
  - custom profile display.

## 6) Functional Requirements

### Feature 1: Post Improver

#### Inputs

1. Draft post textarea (required)
2. Specific instructions text input (optional but recommended)
3. Additional context text input (optional)

#### Prompt Construction

The request to the LLM must combine:

1. Global System Instructions (from sidebar)
2. Additional Context (Input 3)
3. Specific Instructions (Input 2)
4. Draft Post Content (Input 1)

The merged prompt should clearly instruct the model to revise the draft while respecting tone/context constraints.

#### Output Behavior

- Revised post streams into UI in real time.
- Output area should visibly update incrementally during generation.

#### Actions

- "Copy to Clipboard" button attached to final output.

### Feature 2: Post Responder

#### Inputs

1. Target tweet input (text input or textarea)
2. Option A: Custom angle/tone input

#### Generation Modes

- Option A: Custom reply generation
  - Uses target tweet + custom angle/tone (and user global system instructions, if applicable).
- Option B: Quick action "Edgy Response"
  - Ignores custom input fields.
  - Uses predefined edgy/sarcastic/controversial prompt template.

#### Output Behavior

- Generated reply streams into UI in real time.

#### Actions

- "Copy to Clipboard" button attached to generated reply.

## 7) Authentication and Data Requirements

### Authentication

- Clerk handles login/session and user identity.
- Feature access and settings persistence are tied to authenticated user context.

### Data Linking

- Persist and retrieve default system instructions by Clerk unique user ID.
- System instructions are user-scoped and isolated (no cross-user leakage).

### Suggested Data Model (MVP)

Table: `user_preferences`

- `id` (primary key)
- `clerk_user_id` (unique, indexed)
- `default_system_instructions` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## 8) Local Development Requirements

- Provide `docker-compose.yml` with PostgreSQL service.
- Use default PostgreSQL port (`5432`) and define default user/password/database for local development.
- Application must connect successfully to local Postgres instance.

## 9) Non-Functional Requirements

- Streaming latency should feel responsive (incremental token updates).
- Autosave should be resilient to rapid typing via debounce.
- Authentication and DB access must be secure and user-scoped.
- UI must remain functional on common desktop and mobile viewport sizes.

## 10) UX Requirements

- Clear separation between views (Improver vs Responder).
- Input labels must be explicit and non-ambiguous.
- Loading/streaming state should be visible.
- Copy action should provide immediate feedback (e.g., toast or state text).

## 11) Acceptance Criteria

### Global Layout

- Sidebar is fixed and includes:
  - view selector at top,
  - autosaving system instruction textarea in middle,
  - Clerk user display at bottom.

### Autosave

- Editing system instructions triggers exactly one save after 2 seconds of inactivity.
- Reloading app restores saved value for authenticated user.

### Post Improver

- User can enter draft + instructions + context and trigger generation.
- Output streams in real time.
- Copy button copies final generated text.

### Post Responder

- User can generate reply using custom tone/angle.
- User can trigger "Edgy Response" that ignores custom inputs.
- Output streams in real time.
- Copy button copies final generated text.

### Auth and Data

- Unauthenticated user cannot access user-scoped preference data.
- Authenticated user sees only their own saved instructions.

### Local Infra

- `docker-compose up` starts PostgreSQL successfully with configured defaults.

## 12) Out of Scope (MVP)

- Multi-platform social publishing integrations.
- Team workspaces and shared prompt profiles.
- Prompt/version history UI.
- Analytics dashboard.

## 13) Risks and Mitigations

- Risk: Prompt quality inconsistency.
  - Mitigation: Structured prompt templates per feature.
- Risk: Overly aggressive edgy output.
  - Mitigation: Guardrails in predefined edgy template and optional moderation pass.
- Risk: Autosave race conditions.
  - Mitigation: Debounce + last-write-wins strategy + update timestamp checks.

## 14) Future Enhancements

- Multiple saved system instruction profiles.
- Tone presets (professional, witty, concise, bold).
- Regenerate variants and side-by-side comparison.
- History of generated posts/replies.
