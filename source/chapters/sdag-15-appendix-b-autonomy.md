## Appendix B: Agent Autonomy Self-Assessment


This appendix provides an informal diagnostic for organisations to identify where their current agent usage sits on the agent deployment spectrum and whether their controls are proportionate. It is not a maturity model — higher levels are not aspirational targets, and there is no implied progression from lower to higher. Most organisations will find themselves at different levels simultaneously: Level 1 for security-critical components, Level 3 for test scaffolding, Level 2 for general feature work. That is entirely appropriate, provided the controls at each level match the risk profile.

The purpose is self-location. An organisation that discovers it is operating at Level 3 without the controls listed for Level 3 has identified a gap. An organisation operating at Level 1 with controls designed for Level 3 has identified waste. Neither outcome requires changing the level — only aligning controls to reality.

| | **Level 0: Full Human** | **Level 1: Prompted + Copied** | **Level 2: IDE-Integrated** | **Level 3: Autonomous** |
|---|---|---|---|---|
| **What it looks like** | No agent involvement. Human writes all code. | User asks agent specific questions, copies and adapts fragments into codebase manually. | Agent autocompletes functions and classes inline. User accepts or rejects suggestions in-editor. | Agent plans, implements, tests, and commits with minimal human intervention *during generation*; a human reviews the completed changeset before merge. |
| **Who holds architectural context** | Human | Human | Shared — human directs, agent infers from surrounding code | Agent — from project documentation, system prompts, and codebase patterns. Note: architectural context, not the institutional and domain knowledge (§1.3) that determines contextual appropriateness |
| **Error correlation** | Independent (human variation) | Low — fragments are isolated, human integrates | Low to moderate — agent infers patterns from local context and may replicate across completions within a file, but errors are local rather than architectural | High — same patterns applied systematically across features, driven by both training-distribution bias (model-level priors) and context collapse during generation (session-level loss of project-specific distinctions) (§2.4) |
| **Review surface** | Normal | Slightly elevated — more code to review, but each fragment is small | Elevated — easy to accept completions without full evaluation | Very high — entire features arrive at review boundary as finished artefacts (§4.1) |
| **Habituation effect** | Baseline | Low | Moderate — "tab-accept" becomes reflexive (§4.2) | High — output volume degrades review from verification to scanning |
| **Minimum controls** | Existing SDLC | Existing SDLC is likely adequate | Awareness of ACF patterns (Appendix A); SAST augmentation advisable | Validation boundary (§5.3) enforcing authority tier distinctions (§5.1), semantic boundary enforcement at Stage 1 minimum (§7.2) progressing toward Stage 2–3 as proportionate, provenance tracking (§7.1), measured review effectiveness (§9.2) |

### B.1 Using the Self-Assessment

**Who should assess.** The assessment is intended for the team lead, security architect, or IRAP assessor evaluating an organisation's agentic development practices. It is not a self-assessment for individual developers — it is an organisational diagnostic.

**How often.** Teams should reassess when their deployment model changes — not on a fixed schedule. In practice, teams traverse the spectrum naturally as confidence grows, beginning with Level 1 and moving toward Level 3 as tooling and trust mature. Each transition changes the risk profile and should trigger a controls review.

**What evidence to look for.** The table's "minimum controls" row describes the *type* of control required at each level. An assessor should ask for evidence that these controls are *operating*, not just *documented*:

- At Level 1: Confirm that agent output is used as reference material only and is not directly integrated into security-critical components without full human authorship. The key question: does the developer write the code themselves using the agent's output as a starting point, or does the agent's output enter the codebase with only minor edits?
- At Level 2: Can the team demonstrate awareness of ACF patterns? Is SAST augmented to cover the failure modes in Appendix A, or is it standard-only?
- At Level 3: Is the validation boundary enforced at the CI/pre-commit boundary (not advisory)? Is provenance tracked — can the organisation identify which code was agent-generated? Are review effectiveness metrics being collected, and do they show sustained quality under volume?

**What the assessment does NOT cover.** This framework assesses the *development workflow* — how agents are used and what controls surround that use. It does not assess the quality of the agent itself, the model's training data, or the organisation's broader security posture. Those are assessed through existing ISM controls and IRAP processes.

### B.2 Worked Example: Mixed-Level Deployment

A team developing an auditable data processing platform operates at three levels simultaneously:

- **Level 1** for security-critical components (authentication, authority-tier boundary logic, audit trail integrity). Developers consult agents for approaches but write and review all security-sensitive code by hand.
- **Level 2** for general feature work (new data transforms, UI components, configuration). IDE-integrated agents suggest implementations; developers accept, reject, or modify in-editor.
- **Level 3** for test scaffolding, boilerplate generation, and mechanical refactoring. Autonomous agents generate complete test files, plugin structures, and cross-file renames with minimal human direction.

The control implications are:

| Component | Level | Key control requirement |
|-----------|-------|----------------------|
| Auth / trust boundary logic | 1 | Existing SDLC sufficient; agent output is reference material, not integrated code |
| Feature development | 2 | ACF pattern awareness in review; SAST rules for defensive anti-patterns on high-stakes paths |
| Test scaffolding / boilerplate | 3 | CI-enforced validation boundary; provenance tracking; measured review effectiveness. The team should verify that agent-generated tests actually test the intended behaviour, not just pass (ACF-R3) |

The critical control gap in this scenario is not at Level 3 — it is at the **boundary between levels**. When a Level 3 agent generates a new feature that touches a Level 1 component (e.g., a refactoring that modifies an audit trail function), the code crosses from a low-control to a high-control zone. The organisation should define which components are Level 1 and enforce that agent-generated changes to those components receive Level 1 controls regardless of how the change was generated.

This is analogous to the validation boundary concept in §5.3 — the level boundary is itself a control surface.

---
