# Pixel asset production notes

Generated with the built-in imagegen tool for the approved VLeaderboard concept. Both sheets have true alpha transparency and a regular 4 by 4 grid. Source sheet dimensions are 1254 by 1254; slice with integer boundaries derived from image width/4 and height/4, keeping each entire cell. Transparent cell padding provides room for anchors. Inspect rendered frames at runtime.

## characters.png

Four rows of original fictional developer avatars, four columns of facing directions. Columns: front, right, back, left. Rows: orange overshirt/dark hair; teal sweater/shoulder-length hair; blue overshirt/glasses; cream sweatshirt/ponytail. These are stylized avatars, not claims of actual appearance.

Production prompt: create a square transparent character atlas with exactly four rows and four columns, equal cells, no text/grid/backdrop, elevated orthographic pixel-art viewpoint, crisp nearest-neighbor-style pixels, dark outlines, compact expressive human sprites. Each row depicts one person consistently from front/right/back/left. Warm medium skin tones and casual student/developer clothes. Each figure stands with relaxed arms; runtime supplies subtle animation. Keep sprites inside cells with feet near the lower cell edge and ample padding.

## furniture.png

Row-major frame order:

1. Dual-monitor developer desk, front
2. Meeting table with papers/laptops
3. Bookshelf
4. Potted plant
5. Orange sofa
6. Swivel chair
7. Water cooler
8. Noticeboard
9. Presentation screen/chart
10. Podium/laptop
11. Server cabinet
12. Coffee table
13. Dual-monitor desk, back
14. Window
15. Coffee cabinet
16. Sleeping office cat

Production prompt: create an original detailed pixel-art office furniture atlas, square transparent PNG, exactly four columns and four rows of equal cells. One listed object per cell with padding. No text, grid, characters, floor patches or backgrounds. Elevated orthographic perspective, visible tops and short front faces, horizontal/vertical edges rather than diagonal isometric. Warm wood, charcoal monitors, ivory, sage/blue, orange #FB7A3C. Rich hand-clustered pixel shading and dark outlines. Close object shadows only, with true alpha outside objects.

Generated source images remain under the Codex generated_images directory. These workspace copies are the authoritative project inputs. Production implementation should copy them to public/assets/office/ and load modular texture frames; it must not render the entire concept screenshot as the office.
