# Tavi World — local Ollama integration contract

The browser simulation operates independently of any LLM. Ollama is an optional advisory layer.

**Endpoint:** `POST /api/brain` served by the local Windows `Start-TaviWorld.ps1` launcher. That local-only bridge sends a bounded prompt to `http://127.0.0.1:11434/api/generate` with `stream:false` and JSON-only output. No browser-origin CORS exceptions are needed.

The browser sends only Tavi's game state (simulated needs, moods, interests, recent memory summaries, goal, and a list of known activities). The model is instructed to output only a validated pair of `area` and `obj` integers plus an optional under-180-character thought. No model output is treated as executable code or a permanent world-edit approval.

To connect a local model:
1. Install and start Ollama locally on your PC.
2. Ensure your desired model exists and responds in the Ollama application.
3. Launch Tavi using `START-TAVI-WORLD.bat` (not the offline file preview).
4. Open **Settings** in Tavi World, set the installed model's name (such as `tavi`), choose **Test local connection**, and then **Enable Ollama advice**.

This has **not** yet been end-to-end tested against the user's actual Ollama setup. Failure to connect leaves the autonomous local simulation running; the application should show a connection message in Settings.

Potential future improvements: conversational turn-taking with Tavi, memory retrieval summaries, richer goal planning, per-activity dialogue, a local-only session transcript, and explicit owner approvals for requested permanent creative changes.