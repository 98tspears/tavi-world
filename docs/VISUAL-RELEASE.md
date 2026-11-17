# Continuous pixel-art visual revision — verification

- Source baseline: Tavi-World-Detailed-Art-Preview (last continuous renderer before illustrated scenic plates); inherits the cognitive commitment release.
- Visual source changed: `src/visuals.js`; new `src/detail-art.js`; updated self-contained build template and tool.
- No changes to `src/world.js`, `src/app.js`, `src/cognition.js`, `src/commitments.js`, the world collision grid, save keys, or Ollama settings.
- Renderer assets are procedural and cached; there are no world-space illustrated images and no independent scene transitions.
- Native 32px terrain with 24 variants per type; 8 tree sprites; seeded nonblocking scenic sprites.
- Tested in headless Chromium at normal and wide zoom. Tests can be rerun with `python tests/test_overworld_detail.py` and the existing test scripts (Playwright required).
- Browser regression passes: smoke, camera, commitments, cognition/mural, grounded dialogue, Ollama 400, conversation/book/video, visual detail and new continuous-detail tests.
- Limitations: native Windows launcher, Safari, user Ollama not verified; some scenery is intentionally visual-only; this is a procedural pixel-art upgrade, not a full hand-authored tileset rebuild.