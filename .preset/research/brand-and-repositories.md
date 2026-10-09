# VOSS Labs brand and public repositories

Researched 2026-10-09 for VLeaderboard. Scope: official site, official website source, public organization repositories, and explicit public contributor identity declarations. Research only; no application changes or inferred role assignments.

## Findings that affect the product

- The official identity is near-black, paper white, and a square orange accent. The precise orange is `#FB7A3C`.
- The website supports light and dark themes. Light is the CSS default; a saved preference or the system preference can select dark before first paint.
- Typography is Geist and Geist Mono. The website itself does not use a pixel font.
- GitHub's fresh public API returns 12 repositories. The website shows a build-time subset of six, and the cached organization webpage showed nine. Neither webpage is a complete current catalog.
- Three names in the supplied team diagram have explicit matching entries in the official contributor roster: Harshal More, Mandar Patil, and Armash Ansari. Other handle mappings and all repository leadership assignments remain unverified.

## Exact brand tokens

Dedicated brand tokens, at website commit `2a7e70a6bddc5b593159d678063cf1f8d1cd54de`:

| Token | Value |
| --- | --- |
| `--voss-ink` | `#0A0A0A` |
| `--voss-paper` | `#FAFAFA` |
| `--voss-accent` | `#FB7A3C` |
| `--voss-muted` | `#737373` |

Primary source: [public/brand/tokens/colors.css](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/public/brand/tokens/colors.css).

The active website theme tokens differ from the four brand primitives. These values were checked against both source and the deployed stylesheet:

| Semantic token | Light theme | Dark theme |
| --- | --- | --- |
| Page background `--bg` | `#FAFAF7` | `#0A0A0A` |
| Elevated/card surface | `#FFFFFF` | `#111111` |
| Card hover / code surface | `#F5F4EF` | `#161616` |
| Border | `#E6E4DD` | `#262626` |
| Border hover | `#C9C5BB` | `#404040` |
| Main text | `#0A0A0A` | `#FAFAFA` |
| Secondary text | `#525252` | `#A3A3A3` |
| Muted text | `#A8A29E` | `#525252` |
| Brand text/accent `--brand` | `#C4421D` | `#FB7A3C` |
| Brand hover `--brand-light` | `#E0541E` | `#FDA774` |
| Pure brand orange | `#FB7A3C` | `#FB7A3C`, inherited |

Primary sources: [global.css](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/styles/global.css), [deployed CSS](https://vosslabs.org/_astro/index@_@astro.BshJsaun.css).

The README mentions light accent `#D94A1F`, but that is stale: both current CSS sources use `#C4421D`. Several CSS comments also mention a logo gradient; current logo source contains solid text and a solid orange square. Use executable tokens and assets as the evidence. [Website README](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/README.md).

Syntax colors in the website's code blocks are separate from the brand palette. Purple, blue, green, and yellow syntax tokens should not be mistaken for additional primary brand colors.

## Typography and visual theme

- Sans stack: `Geist`, `Inter`, `system-ui`, `-apple-system`, `sans-serif`.
- Mono stack: `Geist Mono`, `JetBrains Mono`, `ui-monospace`, `monospace`.
- The layout requests Geist weights 400/500/600/700/800/900 and Geist Mono 400/500/600 from Google Fonts.
- The wordmark uses font weight 900, tight letter spacing, and a square orange punctuation mark.
- The site uses restrained monochrome surfaces, thin separators, numbered sections, and monospace labels. Its light theme has no card shadows or grain; dark uses a slight grain overlay. The existing site is an editorial developer aesthetic, rather than an existing pixel game asset library.

Primary sources: [Layout.astro](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/layouts/Layout.astro), [Nav.astro](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/components/Nav.astro), [global.css](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/styles/global.css).

Geist and Geist Mono are licensed under SIL Open Font License 1.1. Vercel's current official font page also offers Geist Pixel; that is a possible same-family extension for pixel signage, not an existing VOSS brand choice. [Official font page](https://vercel.com/font), [font license](https://github.com/vercel/geist-font/blob/main/OFL.txt).

Design implication, explicitly an inference: the pixel office can preserve VOSS identity through its ink/paper/orange palette and square orange mark, while retaining Geist/Geist Mono for readable inspection panels. The sprite, furniture, and floor palettes will require new art choices; the website does not prescribe them.

## Existing logo and asset options

The website source contains these public asset groups:

| Asset group | Existing options | Verified details |
| --- | --- | --- |
| Mark | `voss-mark.svg`, `voss-mark-light.svg`, monochrome dark/light | `voss-mark.svg` is an 80×80 viewBox with white heavy `V` and an orange square |
| Monogram | `voss-monogram-dark.svg`, `voss-monogram-light.svg` | Dark variant is an 80×80 `V` plus square |
| Wordmark | `voss-lockup-dark/light.svg`, horizontal dark/light, stacked dark/light | Horizontal variants have a 160×56 viewBox, `VOSS` text, and orange square |
| Social | `github-avatar.svg/.png`, `og-default.svg/.png` | Avatar SVG is a 460×460 black rounded square with white `VOSS` and orange square |
| Favicons | SVG, 16px SVG, 32px PNG, Apple touch, 192/512px icons, manifest | Existing small-mark assets; no need to invent a new logo |

Primary sources: [brand asset folder](https://github.com/voss-labs/vosslabs.org/tree/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/public/brand), [dark horizontal wordmark](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/public/brand/logo/voss-lockup-horizontal-dark.svg), [light horizontal wordmark](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/public/brand/logo/voss-lockup-horizontal-light.svg), [avatar SVG](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/public/brand/social/github-avatar.svg).

The inspected SVGs use live `<text>` elements with Geist and system font fallbacks. They do not embed fonts or outline glyphs, so standalone SVG rendering may produce a fallback wordmark unless fonts are available. Dark/light filenames describe the intended background: dark uses white text; light uses near-black text.

Licensing evidence is incomplete for website code and brand assets. The website README declares MIT and points to a LICENSE file “when added,” but the captured repository tree has no LICENSE file and GitHub reports `license: null`. The site footer describes projects as MIT unless otherwise specified. This establishes declared intent, not a complete per-asset license record. No separate logo/trademark usage policy was found in this bounded source review. [Website README](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/README.md), [repository metadata](https://api.github.com/repos/voss-labs/vosslabs.org), [official site](https://vosslabs.org/).

## Public repository catalog

Bounded scope: one unauthenticated public organization-list request with `per_page=100`, plus one README request for each returned repository. The response contained 12 repositories, all public, unarchived, and not forks. Default branch is `main` for all 12. GitHub organization numeric ID: `274015167`.

Primary catalog: [public organization API](https://api.github.com/orgs/voss-labs/repos?per_page=100&type=public), [organization page](https://github.com/voss-labs).

| Repository | GitHub repository ID | Language | README-backed purpose | Detected license |
| --- | ---: | --- | --- | --- |
| [verp](https://github.com/voss-labs/verp) | 1178834519 | TypeScript | Academic ERP: students, faculty, courses, marks, attendance, departments | MIT |
| [.github](https://github.com/voss-labs/.github) | 1202930379 | Unspecified | Organization profile and shared organizational material | None detected |
| [vosslabs.org](https://github.com/voss-labs/vosslabs.org) | 1207607031 | Astro | VOSS public website | None detected; README declares MIT |
| [vask](https://github.com/voss-labs/vask) | 1225029115 | Go | Anonymous campus question-and-answer forum accessed through SSH | MIT |
| [vboard](https://github.com/voss-labs/vboard) | 1234547360 | TypeScript | Campus events and communities; event publishing and registration | MIT |
| [vauth](https://github.com/voss-labs/vauth) | 1300559153 | TypeScript | Shared VOSS identity provider for product sign-in | MIT |
| [first-contributions](https://github.com/voss-labs/first-contributions) | 1319131874 | JavaScript | Contribution onboarding with one contributor-file PR and automated checks/merge | MIT |
| [vprep](https://github.com/voss-labs/vprep) | 1323750919 | TypeScript | Study papers, notes, syllabus, and resources | MIT |
| [vroom](https://github.com/voss-labs/vroom) | 1332389317 | TypeScript | Pseudonymous real-time conversation for verified VIT students | MIT |
| [vcanteen](https://github.com/voss-labs/vcanteen) | 1399780818 | TypeScript | Unspecified; README is the React Router starter template | None detected |
| [vmaps](https://github.com/voss-labs/vmaps) | 1402050360 | TypeScript | Browser-based interactive 3D campus map and walkthrough | MIT |
| [vshow](https://github.com/voss-labs/vshow) | 1409153476 | TypeScript | Unspecified; README is the React Router starter template | None detected |

Purpose sources are each repository's README, captured with blob SHA and source URL in `brand-sources/repo-*-README-metadata.json`. No purpose was inferred from repository names. A template README is insufficient evidence that a repository contains no implementation.

The website's `Projects.astro` fetches public, non-fork, unarchived repositories at build time, excludes `.github`, and takes at most six. That marketing selection is not a VLeaderboard room assignment or activity policy. [Projects.astro](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/components/Projects.astro).

No project leader or four-to-five-person member roster is published in these repository metadata/README sources. No repository was assigned a leader based on contributors, commits, issue activity, or authorship.

## Public identity evidence and hierarchy limits

The public organization-member endpoint returned an empty array. GitHub's public page also states that the organization has no public members. This does not mean it has no members; public GitHub membership is not a usable complete team roster. [Public members API](https://api.github.com/orgs/voss-labs/members?per_page=100), [organization page](https://github.com/voss-labs).

The official `first-contributions` repository contains eight non-template contributor files. Three explicitly match names in the supplied team diagram:

| Team-diagram name | Repository-declared GitHub login | Public GitHub user ID | Evidence and limitation |
| --- | --- | ---: | --- |
| Harshal More | `harshalmore31` | 86048671 | [Roster file](https://github.com/voss-labs/first-contributions/blob/4020c5863b1f4e664bd8e0597add84fbed21159a/contributors/harshalmore31.md) declares both full name and login; public API profile has no display name |
| Mandar Patil | `Mandar885` | 205825698 | [Roster file](https://github.com/voss-labs/first-contributions/blob/4020c5863b1f4e664bd8e0597add84fbed21159a/contributors/Mandar885.md) declares both; profile display name is also Mandar Patil |
| Armash Ansari | `armash66` | 172116296 | [Roster file](https://github.com/voss-labs/first-contributions/blob/4020c5863b1f4e664bd8e0597add84fbed21159a/contributors/armash66.md) declares both; profile display name is Armash |

Public account existence and IDs were verified through [Harshal's public API profile](https://api.github.com/users/harshalmore31), [Mandar's public API profile](https://api.github.com/users/Mandar885), and [Armash's public API profile](https://api.github.com/users/armash66). These are explicit repository declarations, not verification of legal identity or organization permissions. Role names still come solely from the user-supplied diagram.

No matching name/login declaration was found in that bounded roster for Kanchan Chavan, Devdatta Talele, Amey Pawar, Shubham Ralkar, Sujal Tiwari, Himanshu Choyal, Parth Indulkar, Shubhan Telang, Manas Deshpande, Dr. Akhil Masurkar, or Dr. Akshata Bhatt. Founder/alumni advisor and open contributors are unnamed in the supplied diagram. Do not populate these mappings by guessing handles or assuming similar names refer to the same person.

The website's generic structure is Founder, Core Maintainers, Maintainers, Contributors, and Community. It supplies no named officeholders and differs from the detailed roles in the user-supplied diagram. The diagram remains the product's authority. [Team.astro](https://github.com/voss-labs/vosslabs.org/blob/2a7e70a6bddc5b593159d678063cf1f8d1cd54de/src/components/Team.astro).

## Source snapshots and remaining uncertainty

All source snapshots live in `.preset/research/brand-sources/` and are evidence only. `manifest.json` records original URLs, capture time, byte size, and SHA-256 for every captured file.

- Website source tree SHA: `2a7e70a6bddc5b593159d678063cf1f8d1cd54de`.
- Contributor-roster source tree SHA: `4020c5863b1f4e664bd8e0597add84fbed21159a`.
- Deployed HTML and CSS were captured separately; the deployment's exact source commit is not publicly established. Its palette matches the inspected current source.
- Repository availability and public identities can change. Refresh the organization catalog when connecting real GitHub data.
- Room selection, repo leadership, member assignment, complete named GitHub mapping, and ranking policy are product decisions still requiring explicit evidence or user direction.
- Website asset license completeness remains uncertain; the font license is explicit.

