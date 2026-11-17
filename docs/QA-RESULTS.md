# Tavi World — Lifelong Learning Sandbox QA

Verified using Linux Chromium/Playwright with the single self-contained HTML build (`page.set_content`) and isolated simulated browser storage. Direct localhost and Windows integration were not available in this test runtime.

## Automated tests passed

**General smoke tests:**
- Startup without JavaScript page exceptions, 12 regions, 36 interactions.
- A* pathfinding to all 36 activities and real autonomous movement.
- Compact simulation HUD, no survival hunger meter, desktop and mobile navigation.
- Legacy save migration preserves memories, journal, art, interests and exploration.
- Same save key retained; local save restoration in an isolated browser session.

**Research sandbox tests:**
- Scenario presets and speed settings; observer-controlled stimuli.
- Active trial state stored separately from the original primary save.
- Autonomous choices, traced rule-based explanations, sampled emotional states and timeline.
- Trial session resumed after a page reload.
- Notebook comparisons, graph rendering and mobile lab drawer.
- Ending a trial **commits** learning, rather than reverting it by default.

**Lifelong development tests:**
- Backward-compatible initialization of six long-term traits.
- Repeated supportive environmental exposures change learned trust and expectations.
- Committing a trial writes evolved disposition and experience history to the primary save.
- Future page loads retain the changed self and the Development profile displays it.
- Completed activities update learned action reward, visit counts and experience history.
- Discarded trials revert to the exact pre-trial developmental profile and remain labeled in the notebook.
- In-progress sessions reload and remain recoverable.
- A pre-commit checkpoint can restore the previous developmental identity.
- All updated source JavaScript passes syntax checking.

## Limitations

- No verified launch in native Windows PowerShell.
- No live Ollama model connection test on the user's machine.
- No physical iPhone/iPad Safari or multi-hour soak test.
- Scores are programmed outputs of the model; this is **not evidence of subjective consciousness, emotion or life**.
- Browser localStorage can be cleared or exhausted; export the Tavi save and experimental notebook for long-term studies.


Independent camera: zoom 60–240%, anchored wheel zoom, pointer drag and touch pinch, one-shot Find Tavi button, viewport rectangle at different zoom levels, preserved simulations and camera preference isolation.

### Wide-overworld zoom update
The observer camera now allows 30% minimum zoom (formerly 60%) across buttons, wheel and pinch. Tests cover camera bounds, clamping and saved preferences.

### Read-only internet research and 30% camera (November 16, 2026)
- Camera regression: 30%–240% zoom; desktop zoom/wheel, pointer pan, touch pinch, Find Tavi, view bounds and saved preferences.
- Browser research regression: rejects disallowed hosts, schemes, credentials, ports, query/fragment and arbitrary paths *before network requests*.
- Approved article request stores a source-attributed, timestamped note while sending only the public URL to the local reader endpoint (no memories or conversation).
- Autonomous research is disabled by default and rate-limited to once per ten minutes when opted in; notes persist across reload.
- Fixed a PowerShell launcher variable-shadowing issue: remote response MIME checking no longer overwrites the server's static file MIME map.
- Browser mocked the local reader response; **the actual Windows PowerShell HTTPS retrieval has not been integration-tested**. Source availability, redirects, and live website restrictions may cause individual reads to fail safely.
- This is a restricted reader, not unrestricted search or independent web browsing.