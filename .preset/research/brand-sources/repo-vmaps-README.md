# vmaps

An interactive 3D map of VIT (Vidyalankar Institute of Technology, Mumbai), by [voss-labs](https://github.com/voss-labs).

Walk Level 1 of the main campus in first person, past blocks A to G around the main hall, switch to a rotatable overview and jump between viewpoints. It runs entirely in the browser: no accounts, no backend, no API keys.

## Stack

| Layer     | Choice                                      |
| --------- | ------------------------------------------- |
| Framework | Vite 8, React 19                            |
| Language  | TypeScript (strict)                         |
| 3D        | Three.js                                    |
| Styling   | Tailwind CSS 4, Radix UI primitives, Lucide |
| Quality   | ESLint, Prettier                            |
| CI        | GitHub Actions                              |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 and press Start walking. Node 22.13 or newer.

## Scripts

| Script            | What it does                                |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Dev server on port 5173                     |
| `npm run build`   | Typecheck and production build into `dist/` |
| `npm run preview` | Serve the production build on port 4173     |
| `npm run check`   | Typecheck, lint and format check            |
| `npm run fix`     | Autofix lint and formatting                 |

## Controls

| Action                   | Control                                 |
| ------------------------ | --------------------------------------- |
| Begin walking            | Start walking                           |
| Move                     | W, A, S, D or arrow keys                |
| Move faster              | Hold Shift                              |
| Look                     | Mouse after starting, or drag the scene |
| Release mouse / pause    | Escape                                  |
| Switch walk / overview   | M or the bottom toolbar                 |
| Orbit / zoom in overview | Drag / scroll or pinch                  |
| Jump to a viewpoint      | Place list or numbered map point        |
| Reset                    | Reset button in the bottom toolbar      |

## What is in the draft

- Level 1 of the main building at an estimated scale (about 110 by 36 m): blocks A to G with their feature volumes and signs, the exam department, the stair tower and blue recess, the C block canteen, Nescafe, the glass box on its platform, the main gate and Gate 2
- Four openings in the floor down to the ground-floor labs, two with stairs, each with a low parapet, a handrail and benches
- Two canteens to walk into: Cafeteria C-101 in C block, and the M block canteen down the steps at the east end
- First-person keyboard navigation and mouse look on Level 1, with collisions and drag-to-look as the fallback
- Rotatable 3D overview with block letters and place names, and a live position marker on the floor plan
- Seven viewpoint shortcuts and four reference frames from an earlier video
- Touch direction buttons and drag-to-look on mobile
- Optional, feature-detected WebMCP viewpoint navigation

## Project structure

```text
src/
  App.tsx                explorer interface, place list, floor plan, reference gallery
  main.tsx               React entry point
  styles.css             theme tokens and app styling
  components/
    campus-viewer.tsx    Three.js rendering, movement and inputs
    floor-plan.tsx       floor plan card drawn from the layout data
    info-dialogs.tsx     reference frames and help dialogs
    ui/                  button, dialog and tabs primitives
  lib/
    campus/
      layout.ts          hall size, floor openings, glass box (start here to correct the model)
      blocks/            one file per block or court
      north-row.ts       order of A, chess court, exam department, B, common area, C, Nescafe, D
      south-row.ts       order of main gate, G, stair tower, blue recess, F, Gate 2, E
      places.ts          viewpoints
      navigation.ts      walkable area, obstacles, level names
      kit.ts, pieces.ts, segments.ts, openings.ts, structure.ts, hall.ts, materials.ts   turn the layout into meshes
    dev-view.ts          keeps the camera in place across edits in dev
    webmcp.ts            optional WebMCP viewpoint tool
    utils.ts             class-name helper
public/reference/        four frames from the source video
docs/                    model notes and the development guide
```

## Deploying

`npm run build` writes a static site to `dist/`. Serve it from any static host; asset paths are relative, so it also works under a subdirectory. Opening `index.html` straight from the filesystem does not work because the app uses JavaScript modules.

## Model accuracy

This draft models Level 1 of the main building from photos of the floor, a hand-drawn block sketch and a satellite view of the roof. It is not a measured scan or a complete campus model: block sizes, positions and the upper floors are estimates, and the rest of M block and the ground-floor labs are not modelled yet. Read [docs/MODEL_NOTES.md](./docs/MODEL_NOTES.md) before expanding it or presenting it as an accurate map.

## Docs

- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — editing the campus, adding viewpoints, validating changes
- [docs/MODEL_NOTES.md](./docs/MODEL_NOTES.md) — source coverage and geometric assumptions
- [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

[MIT](./LICENSE)
