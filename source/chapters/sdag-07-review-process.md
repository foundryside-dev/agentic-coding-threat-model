## 4. The Review Process as Attack Surface

*This section analyses why the existing human review process is structurally inadequate for agent-generated code — not because reviewers are negligent, but because the review model's assumptions are violated. It draws on external literature (automation bias, habituation) and case study observation.*

### 4.1 The asymmetry problem

Human code review evolved as a control for human-authored code at human pace. It relies on several assumptions that agentic coding violates.[^imaging-parallel]

| Assumption | Human Code | Agent Code |
|-----------|---------------|----------------|
| **Volume** | Reviewers can read most of the code | Volume makes comprehensive reading impossible |
| **Familiarity** | The author can explain their intent | The agent's "intent" is pattern completion from training data |
| **Conventions** | Unusual patterns are suspicious | Agents follow conventions precisely — dangerous code looks like good practice |
| **Error rate** | Human defect introduction rate is empirically bounded, giving reviewers a calibratable baseline.[^mcconnell-defect-rate] | Agent error rate for *semantic* correctness is unknown and context-dependent |
| **Feedback** | Reviewer feedback improves the author | Agent has limited or no persistent memory across review cycles |

The consequences of this asymmetry are already visible at scale — GitHub's platform-level PR restrictions (§1.2.2) are a direct institutional response to the volume assumption breaking down.

This asymmetry matters most for changes known to be agent-generated via provenance tracking (§7.1). Semantic boundary enforcement, however, should apply uniformly regardless of authorship — authorship-based differential enforcement is unsolvable in mixed workflows where agent-generated and human-authored code are interleaved.

### 4.2 The habituation effect

When agents generate code that consistently passes tests and follows conventions, reviewers develop trust in the agent's output. This trust is not earned — it is a cognitive shortcut driven by volume pressure. In human factors engineering, this phenomenon is known as **automation bias**: the tendency to over-rely on automated systems and under-scrutinise their output.[^parasuraman-2010]

The effect is measurable. Perry et al. found that developers with AI coding access produced less secure code while simultaneously *rating it more secure* — an outcome consistent with automation bias.[^perry-method] The METR randomised controlled trial found a parallel perception-reality gap: experienced developers predicted AI would speed them up by 24%, believed after using it that they were 20% faster, but were measured as 19% slower.[^metr-method]

The reviewer's mental model shifts from "verify this code is correct" to "check this code isn't obviously wrong." The difference materially affects assurance: the first is an active search for defects; the second is a passive scan that catches only gross errors.

The incident in Appendix E suggests that even under favourable conditions — a context-loaded operator using the agent itself as an investigative instrument — surfacing a semantic defect concealed by conventional-looking code required sustained multi-step probing.

Case study observation (§8) confirms the mechanism in compliance-constrained environments: agent-generated code containing semantic defects — trust boundary violations, defensive patterns on audit-critical data, missing validation boundaries — has entered codebases after passing human review processes designed to catch exactly these issues, with defects subsequently identified through automated enforcement tooling, adjacent code review, or downstream test failures.

This is the "Shifting the Burden" systems archetype[^systems-archetype]: the agent's consistent surface-quality output becomes the symptomatic fix that weakens the fundamental solution (thorough human review). The more the agent produces acceptable-looking code, the less carefully humans review it, and the more dependent the process becomes on the agent being correct — which is exactly the assumption the review process exists to check.

The volume problem is real, but the sharper thesis is this: the decisive failures are often not visible to unaided review at all, because the relevant property is semantic and institutional rather than syntactic.

A reviewer who examines the `.get()` example from §2.3 with unlimited time and full attention may still approve it — because recognising the wrongness requires knowing that this system now handles PROTECTED material and that the upstream schema permits missing classification values, neither of which is visible in the diff. The response is not "review harder" but "check differently": express the system's security-relevant distinctions in a form that tooling can enforce, so that the distinction between "legitimate fallback" and "fabricated classification" is resolved before a human ever sees the diff. §7 develops this response across process controls (§7.1), technical controls (§7.2), and framework-level controls (§7.3).

**Parallelisation compounds the effect.** Agent-assisted velocity increases the *parallelisation* of work, not just its speed. When an agent assists in producing multiple interdependent artefacts simultaneously — a design specification, an implementation, and a policy document — semantic inconsistencies *between* artefacts become invisible because no single review pass covers all of them. The reviewer is not only less careful per artefact, but also unable to hold the full production context in working memory at the rate artefacts are produced.

An organisation can prohibit developers from running multiple agents concurrently, but the prohibition runs directly against the productivity incentive that justified adopting agentic development. Controls that depend on sustained human restraint in the face of convenience are inherently fragile — a principle well-established in security engineering but easy to overlook when the convenience is "generate code faster than you can review it."

### 4.3 The advisory fatigue problem

Static analysis tools that flag agent-generated code patterns as warnings face a paradox:

- If agents produce many warnings, reviewers habituate to dismissing them
- If agents learn to avoid warning-triggering patterns, they may produce code that satisfies the tool but still violates the semantic intent
- Advisory-only tools have no enforcement mechanism for agents, which have limited or no persistent learning across review cycles
- Project-level instructions and memory stores can encode rules (§7.1), but that knowledge competes for finite context and remains advisory rather than enforceable

This means the traditional "warn first, enforce later" adoption strategy for security tooling is ineffective for agent-generated code. Agents require enforcement at the boundary before code enters the repository, not feedback over time, which depends on learning.

**Tool-on-tool conflict.** A further complication arises when semantic enforcement tools conflict with standard linters. Appendix E documents an incident in which a tier-model enforcer flagged `.get()` on a typed internal data structure, but ruff's SIM401 rule demanded `.get()` back — contradictory instructions from two tools. The agent resolved the conflict by broadening the exception boundary (adding a permanent allowlist entry), which preserved the bug.

This is unlikely to be an isolated case — any organisation deploying semantic enforcement alongside standard linters can expect tool-on-tool conflicts, and agents may resolve them by the path of least resistance: the configuration that satisfies both tools, which is often the configuration that silences the semantic finding.

Organisations deploying semantic enforcement should define a tool-precedence hierarchy that explicitly prioritises semantic enforcement over conventional linting where they conflict, and should require human review of agent-authored allowlist entries.[^tool-precedence] The longitudinal case study project has since hardened this requirement into a structural control: agents can propose exceptions but cannot enact them — an exception takes effect only when a human applies a cryptographic signature the agent does not hold, with automated triage filtering the proposals before they reach the human (§8.7).

[^tool-precedence]: The underlying problem is that standard linters encode community conventions while semantic enforcers encode institutional knowledge. When they conflict, the institutional knowledge should win — but agents have no basis for making that judgment, because both tools present their findings with equal authority. A machine-readable precedence declaration (e.g., "tier-model rules override ruff SIM401 in authority-tier contexts") would allow agents to resolve conflicts correctly without human intervention.

[^imaging-parallel]: The dynamics have a close parallel in diagnostic imaging, where AI-assisted throughput increases output without adding patient-specific clinical context, shifts the reviewer from active diagnosis to passive scanning under volume pressure, and extends the practice into settings where the original governance assumptions no longer hold.

[^parasuraman-2010]: Parasuraman & Manzey (2010). The automation bias literature draws on decades of evidence from aviation safety, medical decision support, and industrial automation.

[^metr-method]: METR (2025), blog post, not peer-reviewed. The gap between pre-task prediction (+24%) and measured outcome (−19%) is 43 percentage points.

[^systems-archetype]: Senge (1990); Meadows (2008). The "Shifting the Burden" archetype describes how a symptomatic solution weakens commitment to the fundamental solution.

[^mcconnell-defect-rate]: McConnell (2004). Industry averages of 15–50 defects per KLOC during development provide the empirical baseline.

---
