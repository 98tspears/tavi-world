# Learning Model — Lifelong Tavi v1

## Scientific scope

The simulation is an **experimental computational model**. It is not a validated model of animal emotion, human psychology, machine consciousness, or a measurement of sentience. Numerical emotions, learned traits and expressed first-person reflections are generated from programmed mechanisms. The model's explanations are **reported score factors**, not hidden private reasoning.

## Three timescales of change

1. **Momentary state:** joy, calm, frustration, confidence, nervousness, excitement, curiosity, energy and happiness. Scenario inputs alter these continuously; they may change quickly and are recorded every five simulated seconds.
2. **Long-term dispositions:** `openness`, `resilience`, `trust`, `agency`, `focus`, `sensoryTolerance` take values 0–100. They approach targets defined by environmental factors slowly, with rate `min(0.02, dt × 0.00095)` where `dt` is simulated seconds. Training situations are designed to produce gradual, bounded change instead of random trait jumps.
3. **Memory and preference:** Tavi logs discrete significant experiences every 30 simulated seconds of an active trial, and at completion of ordinary world activities. Activity rewards are updated with a fixed learning rate (21% new simulated reward, 79% previous value), and influence later action scoring.

## Long-term trait targets

For factors `safety`, `novelty`, `social`, `noise`, `difficulty`, `choice` in [0,100], the following transparent heuristic targets are computed around neutral score 50:

- openness = 50 + 0.36(novelty−50) + 0.12(safety−50) + 0.12(choice−50)
- resilience = 50 + 0.20(safety−50) + 0.17(choice−50) + 0.07(difficulty−50) − 0.14(noise−50)
- trust = 50 + 0.42(social−50) + 0.11(safety−50)
- agency = 50 + 0.45(choice−50) − 0.08(difficulty−50)
- focus = 50 + 0.25(difficulty−50) + 0.13(safety−50) − 0.31(noise−50)
- sensory tolerance = 50 + 0.21(safety−50) + 0.12(noise−50) − 0.08(difficulty−50)

Targets are clipped to [12,88], and traits to [0,100]. The model intentionally avoids permanent world destruction or self-injury; it has no biological survival needs. **These equations are hypotheses about how a fictional creature might adapt, not empirical research findings.**

## Expectations, adaptation and decisions

Each environmental factor also has a learned expectation value, updated by exponential smoothing (`rate=min(0.015, dt×0.00065)`). A sudden drop in safety compared with expected safety can influence modeled nervousness, and resilience moderates this response. Openness can amplify novelty-related excitement. These effects make identical conditions capable of producing different reactions depending on prior history.

The autonomy engine ranks the original 36 interactions using existing interests, current modeled needs and emotion values, goal progress, exploration novelty, travel distance and limited day/night rhythms. This version adds bonuses for learned traits and activity-specific reward estimates. Learning can therefore alter **future choices**, not just a dashboard label.

Activity completion also produces a bounded adjustment to relevant traits and stores a description in the experience history. The reward model is intentionally inspectable and can be replaced by explicit experimental hypotheses in future revisions.

## Trial state management

- Before a trial, a full copy of Tavi's primary state is staged as its baseline. The primary state is not rewritten during the trial.
- Active state and observations are stored separately, allowing reload and resumption.
- **Keep experience & finish** commits the staged evolved self and preserves a separate pre-commit checkpoint; only then does the primary saved identity change.
- **Discard without learning** restores the baseline but preserves a labeled observation record.
- Last pre-commit recovery can be restored under Profile → Settings; users should export backups for longer-term version history.
- Irreversible **world geometry and decorations** still require explicit owner approval. A learning commitment does not authorize arbitrary file writes or external actions.

## Known limitations and next research stages

- The model does not learn arbitrary new world concepts, new action definitions, or new policies from raw text. Custom variables must map to defined mechanisms.
- It does not infer genuine emotion or consciousness. Its first-person text is simulated narrative.
- Browser storage is finite, so notebook history is bounded; export CSV/JSON regularly.
- Controlled trials pause Ollama advice for reproducibility; later versions could add an explicitly labeled model-assisted comparison mode with structured output validation.
- A future architecture could add explicit causal belief models, predictive world models, uncertainty estimates, autonomous hypothesis formation, social continuity and safer multi-session memory retrieval, evaluated using falsifiable tests.