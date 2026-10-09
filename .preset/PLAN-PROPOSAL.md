# VLeaderboard plan proposal

2026-10-09. Proposed for Boss's review. Preset audit passed validation and awaits its human gate. This document is a discussion aid, not a submitted product or architecture artifact, and does not bypass the phase workflow.

## What we are making

A living, top-down pixel-art VOSS headquarters. Boss confirmed spectator mode with click-to-inspect: the world animates on its own; visitors explore information by selecting characters, rooms and projects. GitHub remains the source for work activity. Office animation is presentation, not an online-presence claim.

The art direction follows the supplied kitchen's elevated orthographic perspective: tiled floor visible from above, readable character faces, short front-facing walls and layered furniture. Avoid diagonal isometric diamonds, flat boxes standing in for rooms, and dashboard cards pasted over artwork.

## Spatial design

```text
Projects          Maintainer: Harshal | Co-Maintainer: Kanchan   Leaderboard
panel                        shared corridor                    panel
                     Core team and lead workstations
                           connected corridor
                     Repository room | Repository room
                     Repository room | Repository room
                         Open contributors commons
```

- Maintainer room: Harshal's organizer desk, planning wall, VOSS sign.
- Co-Maintainer room: Kanchan's dedicated room beside the Maintainer, per Boss's approved revision.
- Core room: core developers, Engineering, Community, DevRel and Research leads from the supplied hierarchy. Give each person a recognizable sprite and a readable inspect panel; full names need not crowd the map continuously.
- No faculty or advisor rooms or characters, per Boss's approved revision.
- Project rooms: a room per active configured repository, a lead station and four or five member desks. Add room rows as projects grow, with pan/zoom and a fit-to-office control. The entire GitHub catalog need not become twelve miniature rooms on the first screen.
- Open commons: contributors without a confirmed team assignment still appear and receive their own activity.
- Desktop side panels: opaque pixel-framed project directory left, contribution board right, leaving the office readable.
- Mobile: usable focused viewport with touch pan, accessible project/person lists, and panels opening as drawers. Do not shrink all room text to fit a phone.

## Brand and art

Verified VOSS core colors: orange `#FB7A3C`, ink `#0A0A0A`, paper `#FAFAFA`, muted `#737373`. Website typography is Geist and Geist Mono. Use those for readable interface text, with a carefully selected pixel face for short in-world signs only. Cool gray/green floors and warm desk wood are scene material colors, not replacement brand colors.

Create original reusable wall/floor tiles, furniture, and character sprites at a consistent pixel scale. The concept image is an art target, not a single background to stretch over the app. Room geometry and people must remain independently interactive. Never manufacture facial likenesses from names; initial sprites are clearly stylized avatars.

## Rendering choices for discussion

| Approach | Benefit | Cost | Position |
| --- | --- | --- | --- |
| React + DOM/SVG with sprite images | Small dependency footprint and direct accessibility | More custom coordination for animation, camera and depth ordering | Suitable for a mostly static small map |
| PixiJS scene + React panels | Matches layered sprites, animation and camera interaction | Explicit client lifecycle and accessible parallel controls | Recommended for this brief |
| Phaser scene + React panels | Full game systems available | Adds game machinery spectator mode does not need | Not recommended for current scope |

Preserve the current React Router, React, TypeScript and Tailwind foundation. The recommendation is to add a focused rendering layer rather than migrate frameworks. Final module/data/API design belongs to the architecture agent after product approval.

## Data behavior

- Click a person: role, configured team, assigned issues, authored PRs, requested reviews and timestamped activity, with links to GitHub.
- Click a project: focus its room and show repository details, team, open PRs and issues.
- PR opened: identify the PR author by GitHub ID, show a short bubble, and retain the event in the activity feed after the bubble disappears.
- Reviewed/merged/closed: distinguish states accurately; avoid awarding the merge author credit to the person who clicked merge.
- Activity bursts: queue or group bubbles; never cover the office with dozens at once. Event identity prevents duplicate animations.
- Missing team mapping: show an open contributor, not a guessed project leader or member.
- Unknown work: show that no assignment is known. A typing animation alone does not mean a person is actively working.
- Upstream errors: retain last valid data with a visible age and retry status. Never silently swap in sample counts.

For prompt updates, use a GitHub App/webhook ingest path, a small persisted activity/PR model, and a browser update channel appropriate to the chosen deployment. Fetch API snapshots for initial state and reconciliation. GitHub's Events API is delayed and bounded, so it cannot supply real-time or complete historical ranking. Production credentials and a public webhook endpoint are deployment dependencies, not reasons to falsify live data in a local build.

The first local visual build can use a clearly labeled fixture mode to exercise all interactions. Real public-repository snapshots can be connected after the adapter contract exists. A real delivery must be tested before describing the integration as live.

## Leaderboard policy proposal

Start with a transparent merged-PR count within a visible date window, with separate views for opened PRs and reviews. Display ties honestly. Exclude bot identities and duplicate events. Do not introduce weighted XP until Boss agrees on the behavior it should reward. State exactly which repositories and dates are covered, and show incomplete history when backfill is partial.

This is a contribution view, not a comprehensive judgment of member value. Community, design, teaching and research work should not be treated as absence of contribution merely because GitHub cannot observe it.

## Delivery sequence and agent ownership

All specialists use `gpt-6.1-sol` with `xhigh` effort, as requested. Each phase lead runs in an isolated context and receives only its input artifacts. Parent remains planner, integrator of decisions and reviewer of the delivered experience.

1. Discovery and audit: completed source overview and baseline checks; brand and integration research saved. Human audit gate remains pending.
2. Product definition: product agent turns BRIEF and research into scope, acceptance criteria and ordered roadmap. Resolve remaining scope questions one at a time.
3. Architecture: architect and tech lead define renderer lifecycle, data contracts, state ownership, GitHub identity mapping, configuration, persistence and deployment needs; record non-trivial decisions as XIPs. No speculative service layers.
4. Visual vertical slice: frontend specialist owns room scene, original modular art, responsive shell, camera, member/project selection and a labeled PR-event preview. Acceptance is resemblance to the reference plus usable interactions, not simply a compiling page.
5. GitHub integration: backend specialist owns server-only GitHub access, webhook validation, event normalization, deduplication, persistence and reconciliation; frontend specialist connects against the agreed contract. These can run in parallel only after contracts are approved and file ownership is disjoint.
6. Independent review and QA: separate agents inspect architecture compliance, real data correctness, accessibility, mobile controls, network failures, duplicate/late deliveries and ranking boundaries. Parent reviews actual browser screenshots against the reference and returns weak visual work for revision.
7. Deployment: prepare concrete setup, health checks, GitHub App permission list and environment documentation for the selected hosting target. Demonstrate one actual PR event end to end before declaring live completion.

## Definition of done

- An unmistakable game-like office with the supplied hierarchy and confirmed team mappings.
- Every visible control works, including projects, people, leaderboard period/view, pan/zoom and motion pause.
- Correct real data attribution; fixture data explicitly labeled.
- New PR event visibly reaches its author's character, with reconnect and duplicate behavior tested.
- Main flow usable on desktop and mobile, through keyboard and with reduced motion.
- Typecheck/build pass, relevant domain/integration tests pass, and independent review/QA reports are written.
- Deployment and any external setup that remains outstanding are reported honestly.

## Remaining information

Confirm rendering direction before implementation. Later, obtain the active project-to-leader/member mapping and settle ranking, public visibility and hosting. The roster can begin with names from the supplied diagram, but names are not sufficient to bind GitHub identities.

## Research

- [Brand and repository evidence](research/brand-and-repositories.md)
- [GitHub and renderer evidence](research/github-and-rendering.md)
- [Source audit](AUDIT.md)
- [User brief and hierarchy](BRIEF.md)
