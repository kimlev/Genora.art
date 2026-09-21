# YouTube Genora

Project-local architecture for the future Genora.art YouTube channel. This is
planning and tooling only: no real channel is connected, no OAuth flow has
been run, and nothing is published.

## Available skill

Codex discovers `.agents/skills/genora-youtube-agent/SKILL.md` only in this
Genora.art checkout. Ask for natural-language tasks such as:

- “Plan three Genora videos about AI creation tools.”
- “Prepare a script, hooks, title and thumbnail brief.”
- “Audit this pasted YouTube Studio export.”
- “Research public competitor outliers for this topic.”
- “Fetch public data for this channel” (requires a later API key).

The skill routes content work to local helpers and keeps data collection
read-only. It has no publish command by design.

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

## Later runtime contract

No values are committed now. When the channel is ready, configure these in the
private runtime environment or secret manager:

```text
YOUTUBE_API_KEY                  # public Data API v3 reads
GENORA_YOUTUBE_CLIENT_SECRETS   # local path to Google OAuth client JSON
GENORA_YOUTUBE_OAUTH_TOKEN      # private, generated token path
GENORA_YOUTUBE_STATE_DIR        # private cache/quota state directory
```

The default state directory is `~/.cache/genora-youtube-agent`. Keep it outside
the checkout. OAuth scopes should be the smallest required; analytics is
read-only. YouTube Data API does not use a service account for channel-user
authorization, so a real Google user with access to the future Genora channel
will be required.

## Safety and quota policy

- Public competitor analytics such as private retention, CTR, and revenue are
  unavailable through the official API and must not be inferred.
- Prefer uploads-playlist collection over `search.list`; the latter is costly.
- Before any future OAuth action, confirm the target Google account/channel and
  scopes with the user. Do not ask for passwords, OTPs, or client secrets in
  chat.
- Before any future publication action, present the final metadata and obtain
  action-time confirmation. This prepared skill does not implement publication.

## Source and license boundary

This bundle selectively adapts MIT-licensed components from:

- `AgriciDaniel/claude-youtube`, source revision `84c3fa6805200632fadb4fe2795ef265511271c7`.
- `Jakeschincariol/youtube-agent-skill`, source revision `a2feb2104981a375ffd4f87ee04f4f5344ac43c6`.

The full notices are preserved in
`.agents/skills/genora-youtube-agent/licenses/`. Unneeded plugins, installers,
global configuration, and upstream repositories are not included.
