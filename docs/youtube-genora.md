# YouTube Genora

Project-local architecture for the Genora.art YouTube product. The dev admin
contains the complete staged workspace; a real channel remains disconnected
until OAuth is configured and approved by an administrator.

## Available skill

Codex discovers `.agents/skills/genora-youtube-agent/SKILL.md` only in this
Genora.art checkout. Ask for natural-language tasks such as:

- “Plan three Genora videos about AI creation tools.”
- “Prepare a script, hooks, title and thumbnail brief.”
- “Audit this pasted YouTube Studio export.”
- “Research public competitor outliers for this topic.”
- “Fetch public data for this channel” (requires a later API key).

The skill routes Codex work to local helpers. Product execution lives in the
admin workspace and supports approval-gated upload and scheduling.

## Adapted capabilities

| Area | Project-local implementation |
|---|---|
| Public channel/video data | Data API v3 helpers, channel uploads path, transcript fallback |
| OAuth/Analytics preparation | Read-only analytics client and explicit missing-secret errors |
| Quota | Daily unit tracker with search cost warnings |
| Content planning | Genora-oriented audit, strategy, calendar and idea workflow |
| Scripts and hooks | Hook scoring plus retention beats and on-screen directions |
| Packaging and SEO | Title/thumbnail linting, descriptions, tags and chapters workflow |
| Shorts and retention | Transcript-based Shorts selection and retention export reader |
| Comments and audit | Draft/triage only; user remains the publisher |
| Competitor research | Public search, uploads, channel-relative outlier scoring |

## Runtime contract

No values are committed now. When the channel is ready, configure these in the
private runtime environment or secret manager:

```text
YOUTUBE_API_KEY                  # public Data API v3 reads
YOUTUBE_OAUTH_CLIENT_ID          # Google OAuth web client
YOUTUBE_OAUTH_CLIENT_SECRET      # server secret
YOUTUBE_TOKEN_ENCRYPTION_KEY     # encrypts tokens at rest with AES-256-GCM
YOUTUBE_OAUTH_REDIRECT_URI       # optional if ADMIN_PUBLIC_ORIGIN is correct
INTEGRATOR_BASE_URL              # Genora AI workflow runtime
INTEGRATOR_API_KEY               # IntegratorAI server credential
SUPPORT_WORKER_SECRET            # internal worker authentication
```

Runtime tokens are encrypted in PostgreSQL and never returned to the browser.
YouTube Data API does not use a service account for channel-user authorization,
so a real Google user with access to the Genora channel is required.

## Safety and quota policy

- Public competitor analytics such as private retention, CTR, and revenue are
  unavailable through the official API and must not be inferred.
- Prefer uploads-playlist collection over `search.list`; the latter is costly.
- OAuth is initiated only from the authenticated admin section. Passwords,
  OTPs and client secrets never pass through chat.
- Publication requires a recorded admin approval. Scheduled uploads are picked
  up by the isolated YouTube worker.

## Admin stages

`Подключение → Исследование → Контент-план → Сценарий → Упаковка → Производство → Публикация → Аналитика`

Each completion is stored as an immutable stage run. The next stage stays
locked until all preceding stages have a successful run. The publish stage
also requires a selected Genora video asset and explicit approval.

## Source and license boundary

This bundle selectively adapts MIT-licensed components from:

- `AgriciDaniel/claude-youtube`, source revision `84c3fa6805200632fadb4fe2795ef265511271c7`.
- `Jakeschincariol/youtube-agent-skill`, source revision `a2feb2104981a375ffd4f87ee04f4f5344ac43c6`.

The full notices are preserved in
`.agents/skills/genora-youtube-agent/licenses/`. Unneeded plugins, installers,
global configuration, and upstream repositories are not included.
