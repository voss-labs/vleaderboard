# VLIP-1: Separate the pixel world from semantic UI and factual data

**Status:** Accepted
**Date:** 2026-10-09
**Author:** Phoenix

## Context

Boss selected PixiJS + React for an animated spectator office on an existing React Router SSR starter. Canvas interaction needs browser-only lifecycle handling, while contributor facts and controls must remain accessible and testable without a rendering context.

## Decision

Use client-initialized Pixi v8 for a modular textured scene and ephemeral simulation, React for semantic selection/panels/camera controls, and pure serializable snapshots for data. Share the exact `SceneProps`/`OfficeSnapshot` contracts in ARCHITECTURE; do not fetch or calculate ranking in the renderer.

## Consequences

- Frame updates avoid React rerender churn, while HTML lists expose equivalent selections to keyboard users.
- Separate owners can implement data, shell and world against one contract.
- Canvas requires deliberate pause, resize, async cancellation and cleanup handling; it does not supply accessibility automatically.
- Original modular sprite/furniture artwork is required, so a concept-image background or flat geometric prototype cannot replace the approved scene.

## Alternatives considered

- Entire scene in React/SVG: viable for smaller static maps but rejected after Boss explicitly chose PixiJS.
- Full game framework: adds player/physics systems that the confirmed spectator product does not require.

## Implementation notes

`app/office/*` owns Pixi and browser scene state. `app/data/*` owns contract/normalization. Existing SSR remains intact. All process decisions live in `.preset/vlips/` per project instruction.
