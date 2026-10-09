# vosslabs.org

The marketing site and front door for **VOSS** — Vidyalankar Open Source Software Labs. A student-run open-source lab at Vidyalankar Institute of Technology, Mumbai.

Live: [vosslabs.org](https://vosslabs.org)
Brief: not a club, not a committee. A lab where students build things that actually get used.

## Stack

- [Astro 6](https://astro.build) (static output)
- TypeScript (strict)
- [Geist + Geist Mono](https://vercel.com/font) via Google Fonts
- Plain CSS — design tokens in `src/styles/global.css`, scoped `<style>` blocks per component
- No build-time framework beyond Astro
- Posthog

## Quick start

Requires Node `>=22.12.0`.

```sh
git clone https://github.com/voss-labs/vosslabs.org.git
cd vosslabs.org
npm install
npm run dev
```

Dev server runs on `http://localhost:4321`.

## Commands

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start dev server with HMR                        |
| `npm run build`   | Build production site to `./dist/`               |
| `npm run preview` | Preview the production build locally             |
| `npm run astro`   | Run any Astro CLI command (`astro add`, `check`) |

## Project structure

```text
voss-website/
├── public/
│   └── voss-logo.png          # logo asset (favicon + nav + footer)
├── src/
│   ├── components/            # one .astro file per section, scoped <style>
│   │   ├── Nav.astro          # scroll-morphing pill nav with scrollspy
│   │   ├── Hero.astro         # asymmetric 2-col hero + code block
│   │   ├── Manifesto.astro    # big-type pull quote
│   │   ├── FocusAreas.astro   # what we build (3 hairline rows)
│   │   ├── Contribute.astro   # 4 steps + git terminal block
│   │   ├── Standards.astro    # 6-cell repo baseline grid
│   │   ├── Team.astro         # 3 hierarchy tiers
│   │   ├── Values.astro       # 4 manifesto-style rows
│   │   ├── GettingStarted.astro
│   │   ├── Footer.astro
│   │   └── BackgroundFx.astro # decorative grain overlay
│   ├── layouts/Layout.astro   # head, fonts, theme bootstrap, slot
│   ├── pages/index.astro      # composes the page
│   ├── scripts/site.ts        # theme toggle, mobile menu, scrollspy, smooth scroll
│   └── styles/global.css      # design tokens + light/dark themes + utilities
├── astro.config.mjs
├── tsconfig.json
└── package.json
```

Each section component owns its own scoped CSS. Shared concerns (tokens, typography, `.btn`, `.container`, `.section` primitives, syntax token vars) live in `global.css`.

## Theming

- Light is the default theme (warm cream `#fafaf7` / near-black text).
- Dark theme lives behind `[data-theme='dark']` on `<html>`.
- An inline script in `<head>` reads `localStorage['voss-theme']` (or system preference) before first paint, so there's no FOUC on reload.
- Single brand accent: warm vermillion (`#d94a1f` light / `#fb7a3c` dark), used sparingly on logo, section eyebrows, hero number, link arrows, focus rings, and selection.
- Code blocks use VS Code Light / Dark+ syntax token colors.

## Contributing

This site itself is open source under the same rules as every VOSS project.

1. Browse open issues — look for `good-first-issue` if you're new.
2. Fork, create a feature branch, build your change.
3. Open a PR with a clear description. Maintainers review within 48 hours.

Coding conventions:

- TypeScript strict mode is on. Don't disable it.
- Keep components self-contained: markup + scoped styles in the same `.astro` file.
- Add new sections by creating a new component in `src/components/` and importing it from `src/pages/index.astro`.
- No emojis in code, comments, or docs.
- Run `npm run build` before opening a PR — TypeScript and Astro errors must be clean.

## License

MIT. See [LICENSE](./LICENSE) when added.
