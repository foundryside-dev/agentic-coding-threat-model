---
tags:
  - all-audiences
  - reference
---

# About This Project

| Field | Value |
|---|---|
| **Version** | 0.2.0 |
| **Status** | Draft for Comment |
| **Date** | 8 August 2026 |
| **Prepared by** | John Morrissey |

This site hosts the discussion paper suite *Semantic Defects in AI-Generated Code: Assurance Frameworks for AI-Assisted Development in High-Stakes Code Paths* — a body of work examining how AI coding tools produce code that is syntactically correct and passes automated checks but makes wrong decisions about data that matters in institutional contexts.

## The document suite

The suite comprises the documents below, which present one argument at different depths. PDF versions are available for offline reading and distribution.

| Document | Audience | What it covers | PDF |
|----------|----------|----------------|:---:|
| **[Understanding AI Code Risk](../understand/index.md)** (~13 pp) | Everyone | The problem statement: what the defects are, why they are not targeted by existing checks, why updated assurance is needed. Entry point for all other reading. | [:material-file-pdf-box:](../pdf/governing-ai-generated-code.pdf) |
| **[Reviewing AI-Generated Code: A Practical Guide](../respond/practical-guide.md)** (~23 pp) | Staff using AI to write code | Five review questions, worked code examples, hot-path identification — for people copying code from AI chat windows without CI or developer tooling. | [:material-file-pdf-box:](../pdf/reviewing-ai-generated-code.pdf) |
| **[Discussion Paper](../understand/paper.md)** (~200 pp) | Technical leads, assessors, security architects | Full analysis: failure taxonomy (ACF — 15 core entries, 5 provisional), STRIDE mapping, case studies, annotated agent transcript, cross-model defect chaining, systems thinking primer. v0.2.0. | [:material-file-pdf-box:](../pdf/threat-model-discussion-paper-community.pdf) |
| **[Wardline Companion](../wardline/index.md)** (Parts I–II, ~86 pp) | Tool implementers, assessors, pilot leads | As-built specification of a shipped semantic trust-boundary analyser: the trust lattice, boundary declarations and caller-granted trust, the rule catalogue and tier-modulated severity, gate/suppression/judge semantics, verification properties, and residual risks — plus a Python practitioner reference. Describes wardline v1.5.0. | [:material-file-pdf-box:](../pdf/wardline-companion-community.pdf) |

[:material-map-outline: Document Suite Map (PDF)](../pdf/document-suite-map.pdf){ .md-button .md-button--secondary } — a one-page reading path guide routing nine roles to the right document.

## Key entry points

- **[The accessible argument](../understand/index.md)** — the problem statement in plain language
- **[Practical guide for code authors](../respond/practical-guide.md)** — hands-on review guidance for staff using AI to write code
- **[Full discussion paper](../understand/paper.md)** — complete technical analysis and evidence base
- **[Wardline companion](../wardline/index.md)** — the as-built specification of a semantic trust-boundary enforcement analyser

## Disclaimer

This is an independent draft discussion paper, written and published in a personal capacity. It does not constitute official guidance or policy of any government body. Views and analysis are the author’s own.
