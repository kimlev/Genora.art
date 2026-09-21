---
name: genora-youtube-agent
description: >-
  Project-scoped YouTube planning and research for Genora.art. Use for channel
  audits, public channel/video data, competitor and outlier research, content
  plans, scripts/hooks, title-thumbnail packaging, SEO, Shorts, retention,
  comments, chapters, quota-aware YouTube API work, and admin-approved publishing.
---

# Genora YouTube Agent

This skill is available only inside the Genora.art repository. It combines
project-specific content workflows with optional, read-only YouTube data
collection. Product automation, OAuth, upload, scheduling, and analytics are
implemented in the Genora admin workspace; this Codex skill remains the
instruction and local-analysis layer.

## Routing

- **Audit / strategy / calendar / ideas**: inspect the Genora context in
  `docs/youtube-genora.md`, then produce a written plan.
- **Script / hook / SEO / title + thumbnail / Shorts**: use the corresponding
  content workflow and run the local helper in `execution/` when applicable.
- **Retention / chapters / edit**: use a user-supplied export or transcript;
  the helpers never modify media or publish anything.
- **Competitors / viral / channel data**: use public data only. Prefer
  `fetch_channel_data.py` for a channel's uploads; `search_competitor_videos.py`
  costs substantially more quota.
- **Private analytics / publishing**: use the Genora admin workspace. OAuth
  secrets remain server-side, and each publication requires an explicit admin
  approval recorded in the database.

## Genora guardrails

1. Treat all repository and channel data as Genora.art work.
2. Do not install globally, alter Codex/Claude user directories, or add an MCP
   server as part of this skill.
3. Do not run OAuth or YouTube write actions from Codex. Use the admin workflow,
   which records approval and audit events before publishing.
4. Do not invent metrics, sources, channel size, or channel voice. Mark missing
   data as unavailable and ask for an export or public URL.
5. API key and OAuth paths are environment-configured only. Runtime state is
   outside git by default; `.env`, tokens, client secrets, and exports do not
   belong in the repository.

## Local helpers

All scripts are dependency-light and are invoked from this directory:

```text
execution/fetch_channel_data.py
execution/search_competitor_videos.py
execution/fetch_video_analytics.py
execution/fetch_transcript.py
execution/hookscore.py
execution/title.py
execution/retention.py
execution/chapters.py
execution/deadair.py
execution/swipe.py
```

The API helpers fail clearly when credentials or optional Python dependencies
are absent. Content helpers work with local files and do not need credentials.

## Project context

Read `docs/youtube-genora.md` before a multi-step workflow. It records the
current Genora positioning, the later secret contract, quota policy, and the
boundary between planning and external side effects.
