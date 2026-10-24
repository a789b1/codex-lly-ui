# Changelog

## 0.5.0 — 2026-10-24

- Add a content-first design method and task-specific layout reasoning; no additional inspection tools.
- Redesign Xujian as a creative handoff workspace: dynamic next delivery, restrained project preview, horizontal navigation, compact project records and role-based typography.
- Preserve the prior demo and provide actual same-viewport comparisons.
- Verify desktop/mobile creation, persistence, empty recovery and next-delivery selection after project completion.


## 0.4.0 — 2026-10-24

Based on building and accepting the real Xujian workbench:

- Design briefs accept project-specific quality criteria and direction task-fit, tradeoff and mobile strategy. A new visual review guide requires concrete observations and revision evidence, without invented aesthetic scores.
- Capture adds reload, Shift+Tab and explicit visible/hidden/exact-text/value/focus/count assertions. Failed steps stop the flow and preserve screenshots, observations and error details. Flows without assertions are marked review.
- Audit adds a review state for unresolved axe results, lower-severity violations and small-target observations. Incomplete checks now retain selectors and HTML rather than only a count.
- Reports embed interaction evidence alongside multi-viewport audits and hash every included capture and screenshot.
- Real-browser regression tests cover persistence, deliberate assertion failure, unverified captures and combined reports.

Limits: isolated sessions do not share state across calls. Count checks include hidden DOM nodes. Fault injection, subjective visual review and arbitrary backend verification remain separate. Review findings are not automatically waived.
