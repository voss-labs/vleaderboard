# VLIP-2: Keep source truth and a bounded four-room floor

**Status:** Accepted
**Date:** 2026-10-09
**Author:** Phoenix

## Context

Boss asked for four active project rooms on the main floor, a way to visit every repository, working animations and very slow natural visits. Public GitHub snapshots have bounded coverage and do not prove presence, team membership or complete work volume. The current build has no chosen public webhook host.

## Decision

Keep exactly four main repository slots and visit every other catalog repository in a dedicated room scene through All rooms. Choose genuine main rooms by disclosed GitHub pushed-at recency, while fixtures carry explicit simulated selection/count/activity labels; source-backed work and synthetic office storytelling never share ranking inputs or implied presence.

## Consequences

- The default office remains readable as the repository catalog grows, and every repo remains reachable.
- Room ordering is reproducible with a cheap complete-catalog snapshot and does not misuse capped Events history.
- Recency is a limited proxy for activity, so the UI must name it explicitly rather than imply an exhaustive work measure.
- Off-floor visits change scenes instead of extending the same contiguous map; Back to office must restore the main camera.
- Real board coverage can be partial/unknown, and unavailable genuine data cannot silently fall back to fixtures.
- Slow visits use visible simulation time and stop in hidden tabs; no real physical location or online status is implied.

## Alternatives considered

- Rendering the whole catalog on one floor makes the initial office unreadable and violates the four-room request.
- Weighted Events API activity ranking depends on capped/delayed history and adds an unsupported policy.
- Webhooks/database before the visual slice block the immediate approved build on unspecified infrastructure.

## Implementation notes

The initial genuine board counts fetched authored merged PRs with explicit period, coverage, ties, bot filtering and deduplication. Verified webhook delivery/durable ingestion remains a later host-specific design. Source and coverage strings are contract fields, not incidental presentation copy.
