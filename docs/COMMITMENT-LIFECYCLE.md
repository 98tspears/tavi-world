# Tavi World — Request, Permission, and Follow-Through

This release fixes a **general planning error**: the creature could treat an already approved but unfinished task as a fresh request. Permission is not execution. A promise is neither completed nor forgotten merely because Tavi travels away, closes the browser, or receives a new suggestion.

## Explicit lifecycle

`requested → pending → approved/queued → traveling → working → completed (with verifiable evidence)`

Allowed branches:
- **Declined:** no permission; the project cannot run.
- **Interrupted:** the previous approval remains active. The same project returns to **queued** and resumes without asking again.
- **Blocked:** record a clear reason, show it in **Records → Approvals**, and allow an explicit **Retry approved request**. Do not report completion.
- **Cancelled:** a person explicitly cancels the unfinished work with a recorded reason, separate from declining an initial request.
- **Completed:** only after an actual effect is stored. The mural requires an artwork record and a world decoration before its approval changes to the legacy-compatible `executed` state.

## Repeat requests

Identical requests are deduplicated **only while unresolved**. Recurring tasks can be requested again once genuinely completed, subject to a configurable cooldown (default 24 hours). Truly permanent unique effects such as the specific star-and-flower house mural are unique to that exact work; a new artwork/design would use a new `intentKey`, not a duplicate old request.

## Engine behavior

- Approved work is considered before unrelated autonomous activity. Ollama suggestions do not override unfinished commitments in normal planning.
- Human-directed travel can interrupt work, but the permission and explicit queued project remain.
- Save reload, browser restart, and bounded offline catch-up do not fabricate completion.
- New approval types must register an executor (`TASK_EXECUTORS`) before they can be completed; unknown types appear **blocked** rather than silently marked done.
- Conversation and Ollama decision contexts include active commitments and their current stage, reducing repeated verbal permission requests. Model text is still probabilistic; only the engine's ledger is authoritative.
- A short event trail and evidence ID are visible under **Records → Approvals**.

## Where to extend

- `src/commitments.js`: reusable lifecycle state machine, request intent identity, history, transitions, deduplication and retries.
- `src/app.js`: integration with task scheduling, travel, interruptions, actual mural production, cognition, conversation and approval UI.
- `src/cognition.js`: separately modeled attention, appraisal, episodic retrieval, expected value, habits and consolidation. This is a computational analogy to human cognitive functions, **not** a human brain or evidence of consciousness.
- `tests/test_commitments.py`: Playwright regression tests for approval idempotency, interrupts, reloads, evidence, repeatability, unsupported tasks.
- `tests/test_cognition_mural.py`: Playwright regression for the mural and learned outcomes.

## Safety and compatibility

Uses the existing local save key `tavi-world-windows-living-valley-v1` with version `1`. The previous `pending`, `approved`, `declined`, and `executed` statuses are preserved for compatibility. Historical approvals gain safe new fields on load; older murals already placed in the house are reconciled with a legacy artwork record. Do not delete saved data to update.

Ollama remains optional. The Windows bridge has better diagnostics for upstream HTTP 400 errors, but the specific installed local model still needs to be checked on the owner's machine. This release was tested in Chromium, not native Windows or iOS Safari.