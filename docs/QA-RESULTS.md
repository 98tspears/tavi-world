# Overworld Edition — QA summary

Checked in headless Linux Chromium using the self-contained HTML (`page.set_content`) because direct file or localhost browsing is restricted in the build environment.

Passed:
- Game initializes with no JavaScript page errors.
- 12 named districts and 36 interactable activities exist.
- Pathfinding reaches all 36 activity approach positions from the starting location.
- Autonomous decision-making starts a real route and physically moves Tavi.
- Pause/resume controls and manual keyboard movement.
- Full overworld map and touch-friendly mobile UI.
- Legacy Living Valley v1 save migrates without discarding prior journal entries, memories, artworks or explored counts.
- All JavaScript source files pass `node --check`.

Not verified:
- The Windows PowerShell launcher running on a Windows machine.
- A live Ollama model on the player's computer.
- A full multi-hour soak test on an actual iPhone or iPad Safari device.

Save origin remains `http://localhost:8765/`. Export a backup before upgrading.