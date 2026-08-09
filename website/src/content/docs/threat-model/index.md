---
title: Threat Model
sidebar:
  order: 0
---

This section presents the threat model for agent-generated code: why plausible, convention-conforming output can be unsafe on high-stakes code paths; how authority and validation boundaries should constrain it; why ordinary review is structurally insufficient; and what organisations can do in response.

- [Introduction and Scope](./introduction/) — what the discussion paper addresses, why the issue is urgent, and the status of its claims
- [The Threat Landscape](./threat-landscape/) — the intuitive threat, the subtler semantic threat, and the training-distribution dynamics behind it
- [Trust Boundaries](./trust-boundaries/) — the authority-tier model, bidirectional authority collapse, and agent output as untrusted input
- [The Review Problem](./review-problem/) — review asymmetry, habituation, automation bias, and the limits of unaided human review
- [STRIDE Applied to Agentic Code](./stride/) — systematic analysis across the six STRIDE categories
- [The Guidance Gap](./guidance-gap/) — where established security and software-development frameworks do not cover agentic failure modes
- [The Response Landscape](./response-landscape/) — process, technical, and framework-level controls, including semantic enforcement
- [Open Questions](./open-questions/) — unresolved governance, operational, and research questions
