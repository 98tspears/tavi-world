# Colorful Valley UI Edition — QA summary

Checked in headless Linux Chromium using the self-contained HTML (`page.set_content`) and isolated simulated `localStorage` because direct HTTP(S)/localhost browsing is restricted in the build environment.

Passed:
- Game initializes with no JavaScript page errors.
- 12 named districts and 36 interactable activities exist.
- Pathfinding reaches all 36 activity approach positions from the starting location.
- Autonomous decision-making starts a real route and physically moves Tavi.
- Pause/resume controls and manual keyboard movement.
- Full overworld map and touch-friendly mobile UI.
- New three-stat HUD has no hunger meter or survival hunger state.
- Eating remains an optional recreational activity that can improve happiness.
- Grouped Journal navigation, collapse/expand on desktop, slide-up drawer on mobile.
- New sprite portrait, current intention and mood panel.
- Pixel-art biome palettes have brighter greens, ocean blues, warmth and contrast.
- Save normalization removes obsolete hunger fields only after backing up the old raw save.
- Save restoration into a separate browser page with isolated storage shim.
- Legacy Living Valley v1 save migrates without discarding prior journal entries, memories, artworks or explored counts.
- All JavaScript source files pass `node --check`.

Not verified:
- The Windows PowerShell launcher running on a Windows machine.
- A live Ollama model on the player's computer.
- A full multi-hour soak test on an actual iPhone or iPad Safari device.

Save origin remains `http://localhost:8765/`. Export a backup before upgrading.