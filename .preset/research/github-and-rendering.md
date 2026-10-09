# VLeaderboard: GitHub and rendering research

Researched 2026-10-09 against primary documentation. These findings inform a proposal; they are not an approved architecture.

## GitHub data freshness

GitHub documents its Events API as unsuitable for real-time use, with latency from 30 seconds to six hours. Its timeline is capped at 300 events within the last 30 days. Pollers must respect the returned polling interval and conditional-request headers. Consequently it cannot be the authoritative complete leaderboard history or the mechanism for immediate PR bubbles. Source: [GitHub Events API](https://docs.github.com/en/rest/activity/events).

Use REST snapshots for repository and pull-request state, and a webhook subscription for prompt changes. GitHub supports pull-request and review events for repository, organization, and GitHub App subscriptions; a GitHub App needs read access to pull requests. Keep the PR author distinct from the event sender: an actor closing or merging a PR can differ from its author. Source: [GitHub webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request).

Unauthenticated REST access has a 60-request/hour primary limit per originating IP. Authenticated access and GitHub App installations have different budgets. A server cache prevents each browser independently consuming upstream calls. Observe response rate-limit headers and back off on 403/429. Source: [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

## Ingestion safeguards

Verify each delivery against its unmodified request body with the webhook secret and HMAC-SHA256; use a timing-safe comparison. Secrets remain server-only. Source: [Validating deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).

Check event type and action, respond within ten seconds, and deduplicate on the delivery ID. Redelivery retains that ID. Persist accepted events before claiming success, and plan recovery/reconciliation for missed deliveries. Source: [Webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks).

Proposed domain rule: unique PR state belongs to repository ID plus PR number; contributor identity belongs to GitHub's stable numeric user ID. An unknown contributor goes into the open-contributors area until assigned, rather than being attributed by display-name similarity. Repository leadership and membership are explicit organization configuration, not inferred from commit count. These are design recommendations.

## Rendering approaches

| Approach | Useful properties | Trade-off for this brief |
| --- | --- | --- |
| React DOM/SVG and sprite images | SVG integrates with CSS and the DOM, is scriptable, and scales cleanly. | Few moving parts for a small office. A growing, layered, animated world needs custom camera/sprite coordination. |
| PixiJS world plus React interface | 2D rendering engine with a scene graph, textures, interaction, and GPU rendering. | Requires a client-only scene lifecycle and explicit accessible HTML equivalents, but matches animated rooms/sprites well. |
| Phaser plus React interface | Full game framework with scenes, animation and game systems. | Most justified if the product later requires player control and game simulation. Spectator mode does not currently require those systems. |

Sources: [SVG reference](https://developer.mozilla.org/en-US/docs/Web/SVG), [PixiJS introduction](https://pixijs.com/8.x/guides/getting-started/intro), [Phaser overview](https://docs.phaser.io/phaser/getting-started/what-is-phaser).

Recommendation for discussion: PixiJS for the office, React for readable interactive panels, preserving the existing React Router SSR application. This is a judgment about the visual brief, not a benchmark result. Do not choose a rendering engine to compensate for weak artwork; original modular pixel-art assets, consistent perspective, and spacing determine visual quality.

## Factual versus decorative state

The user confirmed spectator mode with click-to-inspect. Idle animation communicates an inhabited office; it is not evidence of online status or current work. Show actual assigned issues, authored PRs and review requests with source links and timestamps. Use explicit unknown/empty states when none is known.

Proposed first ranking: merged pull requests within a visible date window, with separate counts for authored/open PRs and reviews. No arbitrary weighted XP, no online-time score, and no claim that a GitHub count measures total contribution across community/design/research work. The final policy needs user discussion.

## Evidence needed before calling the result live

- A real selected VOSS repository snapshot renders with a source timestamp.
- One real webhook opens the correct author's bubble in the correct room.
- Duplicate deliveries and page reloads do not inflate counts or replay old activity as new.
- Rate limits and upstream failures preserve the last valid snapshot and display its age.
- Only approved public repositories are exposed by a public viewer.
- Keyboard users can reach equivalent people/project/activity details outside the canvas; motion can be paused.
