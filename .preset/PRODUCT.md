# Product Definition: VLeaderboard

2026-10-09. Spectator interaction, the revised hierarchy, the visual direction, and PixiJS + React are confirmed human decisions. Boss's current priority is a working visual app that looks like people are working; simulated activity is authorized when its source is labeled. The count-based leaderboard below is a transparent MVP proposal, with no arbitrary weighted score.

## Problem

VOSS members and visitors need an engaging, trustworthy view of who contributes to which project and what changed, expressed as an inhabited pixel-art office with inspectable people, repositories, and GitHub activity.

## Target user

VOSS contributors who want to discover teammates and ongoing work, and any visitor who wants a fun, explorable view of the organization. The primary flow is observe working characters, explore or follow a person, select a person or project, inspect work, and follow its GitHub link where genuine data exists. Visitors are spectators; characters animate automatically.

## In scope

- Preserve the existing React Router, React, TypeScript, and Tailwind scaffold. Use the selected PixiJS renderer for the animated world and React for readable panels and controls.
- Build an original elevated top-down pixel office matching the approved concept's perspective, layered walls/furniture, readable characters, and connected rooms. Reusable interactive scene pieces are required; a stretched concept image is insufficient.
- Put Maintainer Harshal More and Co-Maintainer Kanchan Chavan in dedicated adjacent top rooms. Below them, the core-team room has exactly three distinct tables: Engineering seats Core Developers Devdatta Talele and Amey Pawar with Engineering Leads Mandar Patil and Shubham Ralkar; Community seats Armash Ansari and Sujal Tiwari; Research seats Shubhan Telang and Manas Deshpande.
- Place DevRel Leads Himanshu Choyal and Parth Indulkar in a separate DevRel room beside Open contributors. Give the room presentation/PPT and marketing-planning animations, such as slide changes, presenting, and planning at its board, under the same simulated-activity labeling and motion controls.
- The main view shows exactly four repository rooms: the four most active repositories under a clearly disclosed activity basis and source. Preview selection is labeled simulated; real selection uses observed GitHub activity without inventing a weighted ranking. An All rooms button lists every repository room and lets a visitor focus/visit any room. Each project room has a lead station and four or five member places. Populate real assignments only from confirmed configuration; keep unassigned contributors in Open contributors and unassigned desks visibly available.
- Place the project directory on the left and leaderboard on the right on desktop. Each panel must independently collapse and reopen, freeing space for the office. On mobile, provide a usable focused world and accessible panels/drawers. Include pan, zoom, fit-to-office, follow-person, and motion pause; manual camera interaction exits follow mode.
- Make characters visibly work through varied typing, screen changes, and desk interactions, with long quiet stretches rather than constant action. Occasionally show brief popup messages such as committed, merged, or next plan. Preview messages are labeled simulated; genuine commit/merge claims require source-backed events.
- Add slow, believable autonomous visits along connected walkable corridors: for example, a person leaves the vroom project room, visits the core-team room, then the maintainer room before returning to their desk. Visits have randomized, long quiet intervals on the order of hours in normal mode, with visible slow walking and pauses. A clearly labeled preview action may demonstrate a visit immediately. This is ambient office storytelling, not a claim of actual location or presence.
- Selecting a character shows name, role, known team, authored PRs, assigned issues, requested reviews, and timestamped activity where available. Selecting a project focuses its room and shows its description, confirmed team, open PRs/issues, and GitHub links. Explicitly distinguish unknown data from an observed empty result.
- Show a short PR-opened bubble above the correct author's character and retain the event in an activity feed after the bubble disappears. Queue/group bursts; preserve distinct opened, merged, closed, and reviewed states. Decorative animation never claims that someone is online or currently working.
- Use verified VOSS ink/paper/orange tokens and Geist/Geist Mono for interface text. Short pixel signs may use a compatible pixel face. Scene material colors and stylized avatars are original artwork, with no invented facial likenesses.
- Deliver a working, animated visual app first, using clearly labeled fixture mode to exercise the whole flow. Simulated work, room visits, popup messages, membership, counts, and preview triggers remain visibly separate from public GitHub reads. Public snapshots may follow in the same build when feasible; external setup does not postpone the visual delivery.
- Connect genuine public GitHub snapshots for configured repositories, then verified webhook ingestion for prompt PR events. Attribute people by stable GitHub user IDs, PRs by repository ID plus number, and deduplicate deliveries. Keep credentials server-only. Preserve the last valid snapshot and show source time, stale/error state, and retry status during upstream failure.
- Provide a transparent board using authored merged-PR counts within an explicit visible period, with factual opened-PR and review counts shown separately where fetched. Display ties equally; exclude bot accounts and duplicates; state covered repositories and history completeness. This is a proposed count view, not an agreed weighted ranking policy. GitHub counts describe observable GitHub work, not total member value.
- Provide keyboard-accessible HTML equivalents for people, projects, activity, and selection. Respect reduced motion and allow motion to be paused without hiding work information.

## Out of scope

- Faculty/advisor rooms, characters, and advisory hierarchy, including founder/alumni advisor representations.
- Multiplayer, visitor-controlled avatars, presence tracking, chat, game physics, or online-time rewards.
- Arbitrary weighted XP, streak incentives, PR-spam scoring, or claims that GitHub ranking measures community, teaching, design, and research contribution comprehensively.
- Guessed GitHub handles, fabricated real activity, inferred project leadership, or inferred membership from contribution volume.
- Auth/admin consoles, private repository access, account creation, speculative analytics, and scaling infrastructure before the public core flow requires them.
- Framework migration, full organization history guarantees, or more than four repository rooms in the main viewport. Every repository remains reachable through All rooms.
- Inventing a deployment destination, production credentials, repository permission grants, or a complete roster to unblock presentation work.

## Success metrics

Acceptance is demonstrated behavior, not an invented traffic target:

1. The office visibly matches the approved pixel-art direction, contains both adjacent maintainer rooms, exactly three core-team tables (Engineering, Community, Research), a separate DevRel room beside Open contributors, and exactly four most-active repository rooms in the main view. Devdatta/Amey sit with Engineering and the named DevRel leads occupy DevRel. No faculty/advisor representation appears.
2. Every visible control works. A visitor can independently collapse/reopen projects and leaderboard, use All rooms to list and visit every repository room, inspect a person, follow them, focus a project, inspect activity, change the contribution period, and pan/zoom the office on desktop and mobile. The same facts and selections are reachable with a keyboard; reduced motion and pause work.
3. The visual slice visibly animates typing, screens, desk interactions, DevRel slides/presentation/marketing planning, occasional popups, and slow corridor visits with hours-scale quiet intervals in normal mode. A labeled preview can demonstrate a visit without waiting hours. All simulated messages, counts, and activity-based room selection remain clearly labeled. Real-data mode shows genuine source links and timestamps and never substitutes fixture counts after an error.
4. A selected real VOSS repository snapshot renders with correct PR/issue states. An actual PR-opened webhook reaches the correct author's character without manual reload, remains in the feed, and is attributed to its author rather than a separate event sender.
5. Duplicate/redelivered events and reloads neither inflate counts nor replay historical events as newly received. Unknown identity/team mappings retain correct GitHub attribution in the commons.
6. Board counts match the fetched PR set for the declared repository/date scope. Ties, bot filtering, time boundaries, and partial history are independently checked. No unsupported weighted score appears.
7. Upstream failure, rate limiting, empty results, malformed/invalid webhook deliveries, and reconnects have tested visible behavior. Typecheck/build and relevant behavior tests pass; independent review and QA accept the delivered slice.
8. Deployment is called live only after a real event works end to end at the selected reachable endpoint. Remaining external setup is reported explicitly.

## Phases

### 1. Product and architecture clarity

- Goal: make the approved visual direction and data truth enforceable implementation contracts.
- In scope: the approved visual scope; renderer lifecycle, autonomous work/visit behavior, module boundaries, scene/data contracts, identity/roster configuration, contribution-period semantics, event recovery, and deployment shape. Record non-trivial choices as XIPs.
- Out of scope: product code, speculative infrastructure, and guessed external setup.
- Success criteria: accepted product/architecture artifacts give implementation agents clear ownership and a single agreed contract.
- Estimated risk: medium; repository selection, complete identity/team mapping, and ranking policy need concrete confirmation before real assignments/ranking are finalized.

### 2. Functional visual slice

- Goal: deliver the immediate priority: an explorable working app that visibly looks like people are working.
- In scope: original modular art, PixiJS world, the approved three core tables and separate DevRel room, exactly four main-view repository rooms plus All rooms navigation, independently collapsible React panels, camera/follow-person, selection, responsive controls, accessible equivalents, motion controls, typing/screen/desk and DevRel presentation/planning animation, occasional labeled simulated messages, slow randomized corridor visits, and labeled PR-event fixtures. Use clearly synthetic project members where real assignments are unavailable.
- Out of scope: live-data claims, production webhook hosting, and unrelated infrastructure.
- Success criteria: acceptance items 1–3 pass in the browser, and the visual result is reviewed against the approved concept.
- Estimated risk: medium; art quality, believable pacing, and readable mobile interaction are the main risks. Backend infrastructure is not a prerequisite for this delivery.

### 3. Genuine public GitHub snapshots

- Goal: add source-backed public repository work while keeping the same UI contract; include this in the visual build when feasible without delaying its delivery.
- In scope: explicit public repository configuration, verified account mapping where known, real PR/issue/review-request reads, source timestamps, transparent board counts, bounded history, server-side upstream access/cache appropriate to the actual host, and stale/error behavior.
- Out of scope: immediate-event claims, private access, admin UI, and guessed project assignments.
- Success criteria: acceptance items 3, 5–7 pass for snapshots; real and fixture modes are unmistakable. Approved repository selection and board policy are recorded.
- Estimated risk: medium; rate limits, incomplete history, and missing rosters constrain coverage rather than justify manufactured data.

### 4. Prompt events and live release

- Goal: make actual PR creation visibly reach the correct character, then ship the verified product.
- In scope: validated webhook delivery, durable acceptance/deduplication, event normalization, browser updates, reconciliation/reconnect behavior, endpoint/environment setup for the chosen host, independent review/QA, and an actual end-to-end PR event.
- Out of scope: multiplayer, broader automation, and unspecified hosting systems.
- Success criteria: acceptance items 4–8 pass; deployment health is demonstrated. Only then describe the integration as live.
- Estimated risk: high until external dependencies are supplied: hosting destination/public webhook endpoint, GitHub App or authorized webhook configuration, secret/credential provisioning, selected repository access, and confirmed roster/team mappings. These dependencies do not block Phase 2; missing mappings use explicit unknown/commons states. Missing production setup prevents claiming live completion.

The parent remains planner and coordinates isolated GPT-6.1-Sol agents with xhigh effort. Product/architecture gates precede implementation; code review and QA use separate agents and artifacts. Frontend/backend parallel work is limited to an agreed contract with disjoint ownership.

Evidence: [human brief](BRIEF.md), [plan proposal](PLAN-PROPOSAL.md), [GitHub and renderer research](research/github-and-rendering.md), and [brand/repository research](research/brand-and-repositories.md). The renderer recommendation in the earlier proposal is superseded by Boss's selection of PixiJS + React.
