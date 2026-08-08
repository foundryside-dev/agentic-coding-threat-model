# Semantic Defects in AI-Generated Code: Assurance Frameworks for AI-Assisted Development in High-Stakes Code Paths

**Discussion Paper, Draft for Comment**
**Version:** 0.3.0
**Date:** 9 August 2026
**Prepared by:** John Morrissey

| Version | Date | Summary |
|---------|------|---------|
| 0.1.0 | 24 March 2026 | Initial draft |
| 0.2.0 | 8 August 2026 | First consultation feedback incorporated: enforcement-perimeter scoping heuristic, golden-corpus bootstrapping, automated pattern-wide remediation and baseline-and-ratchet controls, sandboxed baseline for non-SDLC environments, an update on the longitudinal case study's enforcement pipeline (§8.7), and a remediation-phase postscript (Appendix E.8) |
| 0.3.0 | 9 August 2026 | Companion-specification references reconciled to the as-built Wardline specification (v1.0.0-draft): detection attribution split between the case study's bespoke enforcement and the portable reference implementation; designed-but-unbuilt features (WL-rules, annotation groups, governance model, restoration boundaries, Java binding) marked as such throughout; Appendix A gains a portable-coverage column; as-built evidence (join-operator falsification, enforcement-honesty progression, byte-identity determinism, shipped judge) incorporated into §7.2, §9.8, and §9.11 |

*This version incorporates the first round of external consultation feedback. The taxonomy and recommendations remain under community consultation and should be read as candidates for validation, not settled outputs.*

## Reading guide

This paper is the full evidence base. Shorter companion documents may be sufficient for your purpose:

- **Governing AI-Generated Code: Semantic Risk in High-Stakes Code Paths** (~13 pp) — the argument and recommendations in accessible form, for executives, policy advisors, and a broad audience.
- **Reviewing AI-Generated Code: A Practical Guide for Code Authors** (~23 pp) — practical review guidance for people working with AI-generated code, without the technical framework.
- **Wardline: An As-Built Specification** (~60 pp) — the companion specification of the shipped reference scanner, for tool implementers and assessors.


For role-based reading paths across the document suite, see the *Document Suite Map* (~3 pp).

---
