# Tavi World — The Living Overworld

**An original local-first, continuous pixel-art creature simulation.**

Tavi lives in one connected overworld with paths between **12 named places**, 36 activities and an independently operating behavior system. The game is retro monster-adventure-inspired, but uses original art, names, world objects, and mechanics; it has no Pokémon or Nintendo assets.

## Quick start (Windows)

1. **Extract the entire ZIP**; do not launch from inside the ZIP viewer.
2. Close previously running Tavi World launcher/PowerShell windows.
3. Double-click `START-TAVI-WORLD.bat` in the extracted folder.
4. The game opens in your browser at **http://localhost:8765/**. Keep the launcher window open while playing.
5. Export your backup in **Settings** before experimenting with older versions.

If the launcher cannot open, `OPEN-TAVI-WITHOUT-SERVER.bat` offers an offline preview. Offline `file://` browser storage uses a different save origin; the offline preview will not show a save made via localhost. The offline preview cannot call Ollama.

## What changed in the Overworld Edition

- **One seamless world** with a following camera and a full-map overview. The previous area-by-area scene buttons are no longer used.
- **Original pixel art** for roads, sand, rivers, forest, meadow, cutaway interiors, tools, furniture and sprite animation.
- **36 integrated landmarks** are actual world entities with activity metadata. No random objects obscure the map.
- **A* route planning**, walkability/collision checks, optional WASD movement, tap/click to travel, and interactive minimap.
- **Autonomous needs and activities**: Tavi chooses goals from energy, hunger, curiosity, interests, novelty, time of day, recent activity and distance, then travels, works and reflects. Tavi can draw artwork, create goals, make discoveries, ask questions and request approval for permanent world changes.
- **Persistent save compatibility** with the existing `tavi-world-windows-living-valley-v1` key. The first migration writes a raw copy of the old save into `tavi-world-legacy-save-before-overworld-v1` as a precaution.
- **Optional local Ollama bridge** via `POST /api/brain` proxied only to `127.0.0.1:11434`. The model suggests only a known activity and a short thought; it cannot run commands or approve changes.
- The distributed `game/index.html` is **self-contained**: its scripts, stylesheet and Tavi sprite are embedded, eliminating missing-script requests that affected previous versions.

## Limits and current work

- This is a substantial **first continuous-overworld release**, not a claim of AAA/Pokémon production polish. All graphics are original and can be expanded with authored animation cycles, dynamic shadows, encounter systems, weather, interiors and much denser environmental detail.
- Tavi is a **simulated autonomous agent**, not a conscious entity. Live simulation runs while the page is open; when reopened, up to six hours of events are reconstructed approximately. Closing the browser does **not** run a background process.
- The Windows BAT/PowerShell launcher has not been tested on an actual Windows PC from the build environment.
- Ollama is prepared, but a live local Ollama session has not yet been verified.

## Source and build

Editable source lives in `src/`:

- `src/world.js`: map layout, 36 world POIs, walkability, A* pathfinding.
- `src/visuals.js`: original pixel-art renderer, sprite layering, mini-map.
- `src/app.js`: persistent state, autonomy, user interactions and local Ollama advisory requests.
- `src/style.css` and `src/index.template.html`: responsive layout.
- `src/tavi-sprite-base64.txt`: original Tavi pixel sprite as text for portable builds.

Build a standalone game page using **Python 3**:

```sh
python tools/build.py
```

Run smoke tests if Playwright and Chromium are available:

```sh
python tests/test_smoke.py
```

The `legacy/` folder in the ZIP keeps the prior game and its art as a source reference, without replacing old player memories. The distributed game itself has no external image requests.

## Controls

Tap/click a landmark to suggest an activity; tap/click ground to ask Tavi to walk there. WASD or arrow keys briefly take manual control, and **M** opens the full-map view. The **Following Tavi** button toggles a free camera that you can drag. Autonomy is active by default and can be paused.

© Tavi World — original project. For development and testing.