## Table of Contents


- [Abstract](#abstract)
- [Executive Summary](#executive-summary)

1. [Introduction and Scope](#1-introduction-and-scope) — what this paper covers, what it does not, and the observational base behind it
2. [The Threat Is Not What You Think](#2-the-threat-is-not-what-you-think) — why AI-generated defects are a safety problem, not a security problem, and why they persist despite correction
3. [STRIDE Applied to Agentic Code Output](#3-stride-applied-to-agentic-code-output) — the ACF taxonomy: fifteen failure modes mapped to STRIDE, with risk ratings and detection status
4. [The Review Process as Attack Surface](#4-the-review-process-as-attack-surface) — how volume and plausibility degrade the human review control
5. [Agent Output as a Trust Boundary](#5-agent-output-as-a-trust-boundary) — the four-tier authority model and why agent code starts at zero trust
6. [Current Guidance Gap Analysis](#6-current-guidance-gap-analysis) — where the ISM, NIST SSDF, and Essential Eight leave gaps for this defect class
7. [The Response Landscape](#7-the-response-landscape) — what can be done now, what requires coordination, and what could be built
8. [Case Studies: What the Invisibility Problem Looks Like in Practice](#8-case-studies-what-the-invisibility-problem-looks-like-in-practice) — a simulation and six months of longitudinal observation
9. [Open Questions](#9-open-questions) — unresolved governance, evidence, and design questions for community input


- [Appendix A: Agentic Code Failure Taxonomy](#appendix-a-agentic-code-failure-taxonomy) — the full ACF table with STRIDE mapping, risk ratings, and detection approaches
- [Appendix B: Agent Autonomy Self-Assessment](#appendix-b-agent-autonomy-self-assessment) — a maturity-style rubric for classifying agent deployment posture
- [Appendix C: Extension to Agentic SQL Generation](#appendix-c-extension-to-agentic-sql-generation) — SQL-specific failure modes for non-developer staff producing queries with AI
- [Appendix D: Case Study 1, Controlled Generation](#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) — a greenfield application built by an agent, evaluated against the ACF taxonomy
- [Appendix E: Case Study 2, Agentic Failure in Practice](#appendix-e-case-study-2-agentic-failure-in-practice) — annotated transcripts of three incidents at code, design, and specification layers
- [Appendix F: Cross-Model Defect Chaining](#appendix-f-cross-model-defect-chaining-as-an-emerging-second-order-risk) — a precautionary analysis of how defects from different models might compose
- [Appendix G: A Systems Thinking Primer](#appendix-g-a-systems-thinking-primer-for-this-papers-arguments) — feedback loops, accumulation, and delay applied to this paper's arguments
- [Appendix H: Glossary](#appendix-h-glossary)
- [References](#references)

**Reading paths by audience**

Use the table below to find a sensible starting point for your role. Where the register shifts between audiences, the final column suggests sections you may choose to defer. All readers may also find the case studies in Appendices D and E useful as concrete illustrations of how the failure patterns described in this paper appear in practice.

| Audience | Suggested starting points | Additional depth |
|----------|---------------------------|------------------|
| **SES / CISOs / policy leaders** | Executive Summary, §2 (threat characterisation), §6 (gap analysis), Appendix E §E.7 (cross-cutting observations) | §1.4, §3, §5, §8 |
| **Security practitioners / IRAP assessors** | §7 (response landscape), §9 (open questions — evidence thresholds), Appendix A (taxonomy), §6 (gap analysis), Appendix E | Appendix C (unless SQL is in scope), Appendix B |
| **Technical leads / developers** | §2, §4, §7 (response landscape), Appendix A (taxonomy), Appendix E, companion specification | §9 |
| **Tool builders** | Appendix A (detection approaches per ACF entry), §7.2 (technical controls and validation maturity stages), §5 (authority-tier model), companion specification | §6, §9 |
| **Non-developer staff using agentic tools** | Start with the companion guides: *Governing AI-Generated Code* (~13 pp.) and *Reviewing AI-Generated Code* (~23 pp.). In this paper: Executive Summary, §1.2.7 (governance perimeter), §9.7 (citizen programmer governance), Appendix C §C.4 | Technical sections (§3–§5, §7) |

---
