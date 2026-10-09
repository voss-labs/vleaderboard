# VLeaderboard: user brief

Captured 2026-10-09. This document records the user's request, not approved implementation decisions.

## Product intent

Create a fun, game-like view of the VOSS Labs organization that shows who opens pull requests, who is contributing to which project, and a leaderboard. The primary experience is an animated office viewed from above, inspired by the supplied pixel-art kitchen screenshot. Rooms, characters, furniture, and interface panels should share that visual language. This is more than a conventional dashboard with game decoration.

## Required visual structure

- Harshal More occupies the top organizer/maintainer room.
- A core-team room contains the leads and other core roles.
- Each project repository has a separate room for its leader and four or five active members, with capacity to grow.
- A projects panel and leaderboard flank the central world, styled like the game.
- Opening a PR triggers an activity bubble above its author's character, tied to actual VOSS repository data.
- Use the VOSS website's real colors and theme: https://vosslabs.org/ and source https://github.com/voss-labs/vosslabs.org.

## Hierarchy transcribed from the supplied diagram

| Role | People | Relationship / function |
| --- | --- | --- |
| Maintainer | Harshal More | Organization coordination |
| Co-Maintainer | Kanchan Chavan | Core coordination below maintainer |
| Core Developer | Devdatta Talele; Amey Pawar | Core implementation |
| Engineering Lead | Mandar Patil; Shubham Ralkar | Repo maintainers and active contributors |
| Community Lead | Armash Ansari; Sujal Tiwari | Onboarding, mentorship, workshops, build sessions |
| DevRel Lead | Himanshu Choyal; Parth Indulkar | Content, design, campus outreach, partnerships |
| Research Lead | Shubhan Telang; Manas Deshpande | Research contributors, experiments, benchmarks, prototypes |
| Faculty Advisors | Dr. Akhil Masurkar; Dr. Akshata Bhatt | College coordination; guidance rather than operational reporting |
| Founder / Alumni Advisor | Unnamed in supplied diagram | Continuity and guidance |
| Open Contributors | Unnamed | Open community across code, design, documentation, teaching, outreach, research |

The diagram is evidence for roles/names only. Do not infer GitHub handles or repository leadership from these names. Public website rosters may differ; preserve discrepancies for clarification.

## References

1. `/var/folders/db/0yxwzmjx5ss3dh6vsdsq1pqh0000gn/T/codex-clipboard-36e2c03a-de62-41f2-8246-2f707d1b4d09.png`: elevated top-down pixel kitchen, visible character fronts, layered walls and furniture; this is the visual reference, not artwork to copy into the app.
2. `/var/folders/db/0yxwzmjx5ss3dh6vsdsq1pqh0000gn/T/codex-clipboard-a23ddde7-278e-4460-8fd1-0aecf49bb6a8.png`: team hierarchy.
3. `/var/folders/db/0yxwzmjx5ss3dh6vsdsq1pqh0000gn/T/codex-clipboard-8d19533d-be32-4e29-8124-6e1dc36f5ed3.png`: rough projects-left / leaderboard-right layout over the game scene. The large rounded overlays are layout guidance, not finished styling.

## Workflow constraints

- Parent acts as planner/orchestrator. Delegate specialist work to GPT-6.1-Sol with xhigh reasoning effort.
- Explore existing code first, research unknowns, save findings, discuss the architecture before coding.
- Respect the Preset phase workflow and human gates. Do not approve on the human's behalf.
- No emojis; keep implementation modular and files under 400 lines.

## Confirmed direction

- Boss confirmed spectator office with click-to-inspect on 2026-10-09. Characters animate automatically; visitors do not drive an avatar.
- Boss selected PixiJS + React for the animated office on 2026-10-09. Preserve the current React Router application; PixiJS renders the world and React owns accessible interface panels.
- Boss requires independently collapsible Projects and Leaderboard panels.
- Main view shows only the four most active repository rooms. An All rooms button lists all repository rooms and lets visitors explore them.
- The Core team room contains three distinct tables: Engineering, Community, Research. Core developers sit with Engineering. A separate DevRel room sits beside Open Contributors, with presentation/PPT and marketing-planning animations. This overrides earlier placement of DevRel leads at the shared core table.
- Boss prioritizes a working, animated office now: typing, work actions, occasional commit/merge/planning bubbles, slow believable autonomous visits between project rooms, core team and maintainer with long quiet intervals. The office should be fun and explorable to any visitor. Initial sample activity is authorized for demonstrating animation; sample events must remain identifiable as preview activity.
- Boss approved the generated pixel-office concept on 2026-10-09, with a required revision: remove faculty and advisor rooms/characters from the product; give Co-Maintainer Kanchan Chavan a dedicated place. The proposed top row is Maintainer Harshal More and Co-Maintainer Kanchan Chavan side by side. Core and project rooms remain below. This overrides the original diagram's advisory roles for the displayed office.

## Open decisions

- Initial visible repositories, confirmed project leaders/member assignments, and stable GitHub user IDs are not provided.
- Exact leaderboard policy is not supplied. Avoid rewarding raw PR spam or inventing performance scores.
- Public vs restricted visibility and GitHub App/webhook setup need to be settled before connecting non-public data.
- Deployment destination is not supplied.
