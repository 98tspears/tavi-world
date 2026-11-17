# Tavi World — Grounded Autonomy & Natural Conversation Edition

This revision responds to a real problem in the previous build: when "Local Ollama" replied, the game often showed a prewritten response first and included that exact prewritten response in the Ollama prompt. The model could parrot it, while model-generated travel reasons were immediately overwritten by scripted lines.

## What changed

- **No scripted answer in the model prompt.** With Ollama enabled, the reply is visibly **Considering your question…** until the model completes. It is never included in the model's conversation history. A rule-based reply appears only when Ollama is disabled/unavailable, and it is labeled accurately.
- **Real Tavi context.** The prompt includes an explicit user message, current location/action, active personal goal, evolving dispositions, synthetic emotion values, ranked interests, relevant saved memories, experiment history, journal entries, book selections, recent research, visual-art studies, and recent dialogue. Retrieval is bounded to stay under the Windows bridge request limit.
- **Natural responses.** Ollama can answer in a few sentences, acknowledge uncertainty, disagree or wonder, without forced generic greetings and repeated disclaimers. Nothing encourages inventing memories or claiming biological life or verified consciousness.
- **Inspectable inputs.** Expand **Context supplied to the model** under a model-generated reply to see a short list of grounding anchors. These indicate what was supplied; they are not proof the model used every fact.
- **Persistent conversational experience.** Model-generated conversation is saved, a dialogue-experience entry is recorded, and a validated topic focus may slowly influence Tavi's later choices.
- **More independent initiative.** Ollama can propose a landmark, explain the reason, and occasionally initiate a grounded question (at most one per 20 minutes). The simulation validates all actions and continues autonomously if Ollama is unavailable. His generated reason is no longer overwritten by a stock navigation line.
- **Manual test control.** **Profile → Settings → Invite Tavi to choose independently** triggers a local Ollama activity proposal without waiting for the periodic cycle.

## Install / use on Windows

1. Close previous `START-TAVI-WORLD.bat` PowerShell windows.
2. Extract this release to a new folder; do not overwrite an old folder before backing it up.
3. Run `START-TAVI-WORLD.bat` and use the same browser address: `http://localhost:8765/`.
4. In **Profile → Settings**, keep the exact installed Ollama model name and turn on **Enable Ollama advice** (if it is off).
5. In **Connect → Talk**, ask Tavi about a **specific** past experience or goal. After the model responds, expand **Context supplied to the model** under the answer.
6. If you want to see Ollama influence autonomous choices immediately, choose **Invite Tavi to choose independently** in Settings. The simulation still checks the proposed landmark and may keep a current task until it is complete.

## Safeguards and limitations

- Existing saves are retained under `tavi-world-windows-living-valley-v1`. The Windows bridge, localhost port and Ollama installation are unchanged. The browser save remains local, and the model is run locally through the localhost bridge.
- During isolated experimental trials, Ollama advice remains disabled to keep the experiment conditions comparable; responses there come from explicitly labeled rule-based local dialogue.
- Ollama can improve language and propose activities, but **Tavi is not proven conscious or alive**, and his simulated emotions remain programmed state variables. Model-generated text is not evidence of awareness.
- A model may still respond formulaically or hallucinate. The prompt prohibits invented facts but cannot guarantee correctness; the evidence list is supplied context, not a verified provenance citation from Ollama.
- Model requests are still non-streaming. Longer responses may take time on CPU or small VRAM. The existing Ollama test and diagnostic scripts still work.
- Tests use mocked Ollama responses inside Chromium. **Native Windows Ollama performance and subjective conversation quality require testing on your PC.**

## Verification

Run `python tools/build.py`, then `python tests/test_grounded_voice.py`, `python tests/test_ollama_json.py` and the existing browser tests. `tests/test_grounded_voice.py` specifically checks the missing-scripted-feedback fix, real memory/goal/trait context, saved dialogue, suggestion decisions, and autonomous grounded questions.