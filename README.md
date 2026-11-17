# Ollama Windows Bridge Repair (HTTP 500 empty response)

This version repairs the local PowerShell bridge which could report a blank HTTP 500 and fail to explain why. The bridge now logs unexpected exceptions in the launcher, returns a JSON error body, creates the request stream reader explicitly, disables separate reasoning output for Qwen3-like models (`think: false`), and allows first-load latency. The **Test local connection** button now uses a small non-mutating request.

**Try it:** extract the ZIP, close old launchers, run `START-TAVI-WORLD.bat`, check `ollama list`, set that model name in **Profile → Settings**, then click **Test local connection**. If it fails, open the launcher window and copy its `[TAVI BRIDGE ERROR]` or `[Tavi Ollama connection]` line. You can also run `powershell -ExecutionPolicy Bypass -File .\TEST-OLLAMA-BRIDGE.ps1 -Model tavi` (replace `tavi` with an installed model). See `OLLAMA-BRIDGE-REPAIR.txt`.

**Status:** JavaScript and mocked-browser tests can run here. A live Ollama on Windows has not been verified. The save key and persistent profile are unchanged.

---

# Tavi World — Ollama JSON Connection Repair

This edition keeps the existing continuous overworld, autonomous learning, conversations, book/video learning, read-only web research, and 30% wide zoom. It fixes the local Ollama bridge error often shown as `Unexpected token u, "undefined" is not valid JSON`.

**Windows startup:** Extract the ZIP completely, close previous launcher windows, run `START-TAVI-WORLD.bat`, and open `http://localhost:8765/` in the same browser as your prior save. In **Profile → Settings**, set the exact Ollama model name from `ollama list`, click **Test local connection**, then enable Ollama advice.

**Validation:** New browser tests cover empty and malformed model replies, valid replies, and local conversation fallback. Existing automated browser tests were also exercised. A live Windows launcher/Ollama test is still required. The save format and key were not changed.

---

# Tavi World — Lifelong Learning Sandbox

**A local-first simulation of an autonomous fictional creature whose experiences can permanently influence later behavior.**

Tavi World is not a survival game or an achievement-driven RPG. The original continuous pixel-art world is a simulation environment: Tavi independently navigates, selects activities, makes art, forms goals, remembers events, and now **changes his learned dispositions and action preferences over time**. The research panel lets the observer introduce environmental conditions, compare simulated responses and either retain or discard a controlled trial.

> The system implements a **rule-based model of artificial life**, not a conscious or biologically living organism. Emotions are numerical model states, and logged decision rationales summarize the model's programmed factors. No test in this build proves subjective awareness, real feelings, or human-like understanding.

## What's different from the isolated sandbox

- **Long-term learned traits:** openness, resilience, trust, agency, focus, sensory tolerance. These evolve slowly under environmental conditions and repeated activities.
- **Expectations and habituation:** Tavi acquires expectations about safety, novelty, social contact, noise, difficulty and choice. Unexpected drops in safety can affect responses differently based on prior experience.
- **Learned action preferences:** activities gain modeled reward values based on prior experiences and current conditions. Tavi's future decisions use these values in addition to interests, needs, novelty, goals and travel distance.
- **Episodic learning history:** significant experiences are recorded in a durable profile with cumulative experience counts. Ordinary autonomous activities also contribute to development.
- **Commit by default, with control:** controlled experiences run in a recoverable checkpointed session. Press **Keep experience & finish** to merge the evolved self, including memories and learned preferences, into Tavi's original save. **Discard without learning** resets the trial to the original snapshot for controlled comparisons.
- **Recoverable checkpoint:** before each committed trial, the previous self is copied to a separate local save. Restore it under **Profile → Settings → Restore pre-experience checkpoint**.
- **Development dashboard:** **Profile → Development** displays lasting traits, emerging activity preferences, expectations, and experience history.

## Start on Windows

1. Extract the ZIP fully outside the Windows compressed-folder preview.
2. Close any older `START-TAVI-WORLD.bat` or PowerShell Tavi launcher windows.
3. Run **`START-TAVI-WORLD.bat`** and keep the launcher window open.
4. Open **http://localhost:8765/** if your browser does not open automatically.
5. Export a full Tavi save under **Profile → Settings** before experimenting.

The built game in `game/index.html` is a self-contained HTML app; it does not load separate JavaScript files from the server. The fallback `OPEN-TAVI-WITHOUT-SERVER.bat` can show the game offline, but its browser storage is **separate** from `localhost:8765`, and it cannot talk to Ollama.

## A controlled learning experience

1. Open **Research → Conditions** (or **Research Lab** on mobile).
2. Name the experience and choose a situation preset or adjust **safety, novelty, social warmth, sensory noise, difficulty, and freedom of choice**. Optional custom variables must map explicitly to one of these six mechanisms. There is no automatic interpretation of arbitrary labels.
3. Select **1×, 3×, or 6×** speed. Press **Start experience**. The current self is checkpointed and the experiment is saved separately until finalized.
4. Watch **Research → Observations** for emotions, decisions, event timeline, and trend chart. Adjust conditions during the run to test responses. Temporary emotional changes and slow permanent disposition changes occur concurrently inside the staged run.
5. Press **Keep experience & finish** to retain his learned personality, expectations, memories, action preferences, and observations in the primary Tavi save. Later experiences start from that changed Tavi.
6. Alternatively, press **Discard without learning** to restore the starting state. Either way, the trial's measurements are archived in **Research → Compare** with a committed/discarded label.

Replaying from the same seed is not guaranteed bit-for-bit deterministic because the simulation uses real browser time and frame scheduling for some behaviors. Run repeated trials and compare baselines. Avoid assuming model outputs are evidence of biological or psychological causation.

## Persistence and recovery

The primary browser save retains the key **`tavi-world-windows-living-valley-v1`**. This preserves saved memories, artwork, goals, world visits, previous personality state, and optional Ollama settings. Older saves automatically gain a compatible development profile. Existing hunger state is retired without reintroducing survival mechanics.

- Active experience: `tavi-world-isolated-trial-v1` (resumable on reload, not yet committed).
- Observation notebook: `tavi-world-observation-notebook-v1` (bounded run archive and CSV/JSON export).
- Last pre-commit recovery snapshot: `tavi-world-pre-lifelong-learning-v1`.

**Important:** Browser data can be cleared. Export backups regularly and before long-term studies. Offline simulations are reconstructed only in bounded steps when a game window is reopened; Tavi does not literally run while the page is closed.

## Optional Ollama integration

The engine remains fully autonomous without an LLM. The local Ollama bridge is prepared for an installed model named `tavi`, and a validated model response may suggest a destination and a short reflection during ordinary simulation. During controlled experiments, Ollama suggestions are suspended for reproducibility. The model cannot execute commands, write files, change world geometry or approve irreversible world changes. Updated advisory context can include learned traits and past experience summaries. **Live Ollama operation has not yet been verified on your machine.**

## Source and verification

- `src/world.js`: connected overworld, 12 regions, 36 activities, collision and A* pathfinding.
- `src/visuals.js`: pixel-art renderer, creature sprite and minimap.
- `src/app.js`: learned identity, activity reinforcement, persistent state, simulation conditions, experiment lifecycle and audit log.
- `src/index.template.html`, `src/style.css`: research-focused UI.
- `tools/build.py`: generates standalone `game/index.html` with embedded scripts/assets.
- `tests/test_smoke.py`: startup, migration, movement and mobile UI tests.
- `tests/test_sandbox.py`: experimental input effects, graph, persistence, and comparison tests.
- `tests/test_lifelong.py`: **commit/discard, continued learning, reload, checkpoint recovery and activity-value tests**.

Run `python tools/build.py`, then `python tests/test_smoke.py && python tests/test_sandbox.py && python tests/test_lifelong.py && python tests/test_connect_learning.py && python tests/test_camera.py` with Chromium/Playwright installed. Video test uses the included sample MP4 or generates one with `ffmpeg` if available. See [Learning Model](docs/LEARNING-MODEL.md) and [QA results](docs/QA-RESULTS.md).

**Not yet verified:** native Windows launch on a real PC, live local Ollama integration, or long-duration physical iPhone/iPad Safari testing.



## Connect: conversation, classic literature, and video references

- **Talk to Tavi:** use **✉ Talk to Tavi** or **Connect → Talk** to converse with the locally simulated agent. Conversation entries persist in his history. Specific activity suggestions are scored against his goals, energy and learned preferences; Tavi may decline. Scripted replies are available offline. Optional Ollama conversational refinement requires a running local model and is not yet tested on a real Windows machine.
- **Library:** **Connect → Library** offers four curated, original study-note selections from public-domain works by Michael Faraday, Charles Darwin, Aesop and Lewis Carroll. They link to complete original texts at Project Gutenberg; **the full book contents are not bundled**. Tavi's study notes retain provenance, genre and caveats about historical/fictional claims.
- **Learning Studio:** import a local MP4/WebM painting reference. The browser decodes and samples six frames, deriving palettes and simple contrast/temperature descriptors which can influence later artworks. This does **not** give Tavi semantic understanding of brushwork, speech or the painting process, and the videos themselves are not sent or retained. A separate vision-capable model would be needed for richer audiovisual learning.

All of these operate within Tavi's local persistent-learning simulation. In an isolated trial, keeping the experience makes it permanent; discarding the trial discards that staged learning.

## Independent map camera and zoom

The zoom-out limit is now **30%** (previously 60%), revealing twice the width and twice the height of the map at the widest view.

The observer camera does **not** follow Tavi. Drag the overworld with a mouse or one finger, zoom using the `+` and `−` buttons, mouse/trackpad wheel, or a two-finger pinch on touchscreens (30%–240%). Select **⌖ Find Tavi** or press `F` to center the viewport on Tavi once, without enabling follow mode. `+`/`−` keys adjust zoom; `M` opens the overview map. The overview and minimap show a correctly scaled viewport box. Camera position and zoom are stored separately from Tavi’s personality and save data.


## Internet learning (optional, read-only)

Open **Connect → Internet**. Tavi can read allowlisted HTTPS Wikipedia, Wikisource and Project Gutenberg text pages through a local GET-only proxy (no credentials, uploads, writes, redirects, or executable downloads). Sources are recorded as attributed notes, not unquestioned truths. Independent research is opt-in, off by default, throttled to one curated source every 10 minutes and paused during controlled experiments. The feature requires the Windows launcher, a live internet connection and a browser tab kept open. See [Internet Reading](docs/INTERNET-READING.md).