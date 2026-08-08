---
tags:
  - ciso
  - assessment
  - acf
---

# Assess Your Exposure

This section helps you determine whether the semantic defect risk described in the [discussion paper](../understand/index.md) applies to your organisation, project, or team — and where your control gaps are widest. Semantic defects are code that is syntactically correct, passes all automated checks, follows established conventions, and does the wrong thing in your institutional context. They are not bugs in the conventional sense; they are context-inappropriate patterns that look like good practice to every tool in the standard assurance stack.

Start with the quick exposure check below, then use the role-specific assessment tools to evaluate your control gaps in detail.

### Which tool for your role?

| Role | Your tool | What it helps you do |
|------|-----------|---------------------|
| CISO / Security adviser | [CISO Assessment](ciso-assessment.md) | Evaluate control gaps against the ACF taxonomy |
| IRAP assessor | [IRAP Checklist](irap-checklist.md) | Assessment-ready checklist with ISM mapping |
| Developer / Tech lead | [ACF Taxonomy](../understand/taxonomy.md) + [Practical Guide](../respond/practical-guide.md) | Understand failure patterns and detect them in code |
| Team manager | [Autonomy Self-Assessment](autonomy-assessment.md) | Evaluate your AI tool autonomy level (0–3) |
| Architect | [ACF Taxonomy](../understand/taxonomy.md) | Design for semantic enforcement |

## Quick exposure check

Answer these questions to gauge your organisation's exposure. If you answer "yes" to any item in the first group and "yes" to any item in the second or third group, you have exposure that warrants further assessment.

### Are you generating AI code?

- Are your internal development teams using AI coding tools — autocomplete, IDE agents, or autonomous agents?
- Are your contracted suppliers or systems integrators using AI coding tools in deliverables for your organisation?
- Are analysts, data engineers, or operations staff using AI tools to generate SQL, scripts, automations, or workflow logic outside formal development teams?

### Does your context make semantic defects dangerous?

- Does your codebase handle security classifications, access control decisions, or trust boundaries between data sources?
- Does your system maintain audit trails where gaps or fabricated entries would be undetectable after the fact?
- Do you process financial transactions, evidentiary records, health data, or other domains where silent data corruption is worse than a crash?
- Does your system integrate with external data sources where unvalidated input could be treated as internally authoritative?

### Can you detect semantic defects today?

- Do your code review processes include semantic review — not just syntax, style, and known vulnerability patterns, but whether the code does the right thing in your specific institutional context?
- Do your procurement contracts require disclosure of AI tool usage by suppliers?
- Can you distinguish agent-generated code from human-authored code in your repositories?
- Do you have detection capability for the specific failure modes described in the [ACF Taxonomy](../understand/taxonomy.md) — code that fabricates defaults on missing safety-critical data, swallows audit-critical errors, or treats unvalidated external data as trusted?

If you lack detection capability for semantic defects — and most organisations do, because no standard tool category is designed for this — then the question is not "has this caused an incident?" but "would you know if it had?"

## Why the threat is different

The intuitive risk model for AI-generated code focuses on malicious output: backdoors, data exfiltration, supply chain attacks. That threat is real but well-understood — existing controls address it, albeit under increased volume pressure.

The more dangerous threat is subtler. AI agents write code that follows patterns generally regarded as good practice — defensive, robust, convention-conforming — and apply those patterns uniformly, including in contexts where they are unsafe. The code is not merely plausible; it is conventionally reasonable by the standards of the vast majority of software. The problem is that agents produce well-executed work calibrated to the wrong context.

This threat is distinct from conventional supply chain risk in ways that matter for your assessment:

- **It is not adversarial.** The agent is producing its best output based on training data overwhelmingly composed of code without the properties high-stakes systems require.
- **It is not targeted by existing detection.** The generated code passes type checkers, linters, unit tests, and SAST. No standard tool category is designed to detect context-dependent semantic failures.
- **It scales with the benefit.** The faster agents generate code, the more context-inappropriate patterns enter the review pipeline. The systems where the stakes are highest are often the systems with the most domain-specific context that agents lack.
- **Failures are correlated, not independent.** A single training-data bias produces the same failure pattern across every function an agent generates — and across every organisation using the same model family.

The absence of reported incidents does not imply absence of impact. The failure modes described here — silent data corruption, trust boundary violations masked by defensive patterns, audit trails that record fabricated defaults as real values — are specifically the kind that do not produce observable incidents. A `.get()` that silently returns `"OFFICIAL"` for a missing classification field produces no crash, no alert, and a log entry that looks entirely normal.

**The same pattern, three domains, three consequences.** A weather app that defaults a missing location to the device's GPS is correct defensive programming — the fallback genuinely recovers the information. A mail system that defaults a missing classification to `OFFICIAL` silently downgrades a PROTECTED document. A clinical system that defaults a missing allergy field to an empty list converts an unanswered question into a confident negative finding. The code pattern is identical in each case; the semantic meaning of absence diverges. Agents do not distinguish between these contexts — and the syntax, type system, and standard tooling cannot tell them apart either.

## Framework gap analysis

The [discussion paper's gap analysis](../understand/paper.md#6-current-guidance-gap-analysis) reviews the ISM, Essential Eight, OWASP, and NIST SSDF against the agentic code threat model. The findings below summarise the gap analysis for each framework.

!!! info "ISM version"
    The analysis references the December 2025 revision of the ISM, which includes approximately 24 new controls added to the Software Development guidelines in June 2025. Organisations using earlier versions should verify control numbers against the current release.

### ISM coverage and gaps

The ISM provides controls for software development security. Several controls provide **partial coverage** of agentic threats — they address the right areas but their assumptions break down when applied to agent-generated code:

- **ISM-0401** (Secure by Design) — assumes a human development team that can *internalise* security principles. Agents do not internalise principles; they reproduce training data patterns. A Secure by Design practice is unenforceable against an agent unless encoded as a machine-checkable rule.
- **ISM-2060/2061** (Code review and security-focussed peer review) — assume the reviewer can meaningfully evaluate code at the rate it is produced. At agent-scale volume, this assumption fails. ISM-2061 requires the organisation to correctly identify which agent-generated code touches security-critical paths — but agents generate code across the entire codebase.
- **ISM-0402** (SAST, DAST, and SCA) — catches known vulnerability patterns and dependency risks but does not answer whether data flows preserve authority tiers or whether trust boundaries are maintained. Semantic boundary testing is a distinct control category not addressed by existing SAST tooling.
- **ISM-2026/2027/2028** (Software artefact integrity) — agent-generated code fits neither established category cleanly: it is not human-authored in-house code, but neither is it a third-party component. The artefact integrity controls have no category for first-party code generated by a third-party system.

Five gap areas have **no ISM control coverage at all**: agent output as trust boundary (ACF-T1, ACF-E1), review capacity scaling (ACF-D1, ACF-D2), semantic boundary enforcement (ACF-S1, ACF-S3, ACF-T1, ACF-T2), correlated failure detection, and code provenance tracking.

!!! tip "Candidate ISM extensions"
    The discussion paper proposes illustrative extensions within the ISM's existing structure — not formal proposals, but demonstrations that the gaps are addressable:

    - **Extension to ISM-0401:** Secure by Design practices should include machine-enforceable rules for trust boundary maintenance when AI agents generate code. Human-readable documentation alone is an insufficient control against code generators that do not read documentation.
    - **Extension to ISM-2060/2061:** Organisations should demonstrate that review remains effective at detecting *semantic* defects under agent-generated volume — through measured defect escape rates, review depth audits, or automated semantic pre-screening.
    - **New control (Agent Output Trust Boundary):** Agent-generated code should be treated as untrusted input requiring validation at the boundary, with documented validation properties and effectiveness evidence.
    - **New control (Code Provenance):** Organisations should maintain records of which code was agent-generated, human-authored, or agent-generated then human-modified — supporting risk assessment, incident response, and targeted remediation.

### NIST SSDF

The NIST Secure Software Development Framework (SP 800-218) partially applies but assumes trainable human developers, learning from feedback, and largely independent error distributions — none of which hold for agents. The most relevant practice group (Produce Well-Secured Software) recommends risk-based analysis per-component, but agent-generated code introduces *systematic* risk across many components from a single source.

NIST published SP 800-218A (July 2024) as a supplement specifically for generative AI contexts, acknowledging the original framework's human-centred assumptions need AI-specific augmentation. However, SP 800-218A's focus is on secure practices for AI *model* development — not on assurance of source code *generated by* AI systems. This is the gap: substantial guidance now exists for building AI safely, but almost none for securing what AI builds. SP 800-218A explicitly does not distinguish between human-written and AI-generated source code, on the basis that all source code should be evaluated before use. The discussion paper's central contention is that this assumption — that uniform evaluation suffices — does not hold for the failure modes described here, because the *nature* of agent-generated defects (correlated, semantically plausible, context-insensitive) demands different evaluation, not just equal evaluation.

### Essential Eight

The Essential Eight is an operational security framework, not an SDLC framework — it does not directly address software development practices. Two strategies offer indirect relevance: **Application Control** provides a conceptual precedent for graduated trust in code generation sources, and **Restrict Administrative Privileges** supports the principle that agents should not modify security-critical configuration without human approval. These analogies are directional rather than prescriptive — the Essential Eight's value is as evidence that the *principles* of graduated trust and least privilege are already embedded in Australian government security posture.

### OWASP and industry guidance

**OWASP Top 10 for LLM Applications (2025)** primarily addresses threats *to* LLM systems. The closest entry (LLM05, Improper Output Handling) explicitly includes LLM-generated code introducing vulnerabilities, but frames it as an application-level output-handling problem rather than addressing the distinct failure characteristics of AI-assisted code generation. The broader **OWASP GenAI Security Project** covers LLM applications and agentic AI systems but no OWASP project specifically targets assurance of AI-generated source code in government systems.

**MITRE ATT&CK and CWE** provide taxonomies for attack techniques and code weaknesses, but the agentic code failure modes do not map cleanly to existing CWE entries. They are not individual weaknesses — they are *patterns* correct in most contexts and dangerous in specific ones. A `try/except` that logs and continues is not a weakness; it is a weakness *when it wraps an audit-critical write and prevents the failure from reaching the audit system*. Context-free taxonomies do not serve context-dependent weaknesses.

!!! danger "The gap between 'securing AI' and 'securing what AI builds'"
    The gap is consistent across all frameworks reviewed: substantial guidance for securing AI systems themselves, almost none for securing what AI builds. The gap is widening faster than it is closing — agent adoption is accelerating, the highest-risk failure modes pass all existing automated checks, the vocabulary for discussing these failures does not yet exist in policy contexts, and guidance development cycles are inherently slower than technology adoption cycles.

## The structural gaps

The source analysis identifies nine structural gaps — categories of control and analytical vocabulary that no current framework provides. Gaps 1 through 3 are foundational; the remaining gaps are difficult to address without a shared taxonomy, a semantic verification layer, and review controls that account for agent-generated volume.

| # | Gap | What current frameworks do not address | What this means for your assessment |
|---|-----|----------------------------------------|-------------------------------------|
| 1 | **Taxonomy of agentic code failure modes** | No shared vocabulary for the distinct failure patterns that AI agents produce — patterns that are correct in most contexts and dangerous in specific ones. Existing taxonomies (CWE, MITRE ATT&CK) catalogue context-free weaknesses; these failures are context-dependent. | Without a shared taxonomy, your organisation cannot systematically name, detect, or communicate about these risks. The [ACF Taxonomy](../understand/taxonomy.md) provides a candidate starting point. |
| 2 | **Semantic verification layer** | Existing SAST answers "does the code match known vulnerability patterns?" Nothing answers "does the code preserve the system's trust boundaries, audit integrity, and failure-mode requirements?" This is a category gap — the missing layer between syntactic correctness and semantic correctness. | Your current automated checks (linters, type checkers, SAST, DAST, SCA) provide no coverage for the highest-risk failure modes. Both Critical-rated ACF entries have zero detection in standard tooling. |
| 3 | **Review effectiveness at scale** | ISM-2060/2061 mandate code review and security-focussed peer review, but neither addresses what happens when code generation velocity exceeds review capacity. No control requires demonstration that review remains effective under volume pressure. | If your teams are generating code with AI agents, your review process may be degrading without anyone measuring it. The question is not "is code reviewed?" but "does the review process remain effective at the volume being produced?" |
| 4 | **Authority classification for agent output** | No framework explicitly addresses how agent-generated code should be treated in the system's authority model. ISM-2074 requires an AI usage policy but not a technical trust boundary control. | Agent-generated code may be inheriting the trust level of the engineer who directed the agent, rather than being treated as untrusted input requiring validation. |
| 5 | **Accreditation criteria for agentic workflows** | No framework defines what evidence organisations must provide to demonstrate that agentic coding maintains the required security posture. | IRAP assessments may not be evaluating the controls that matter for this risk class. The [IRAP Assessor Checklist](irap-checklist.md) provides candidate assessment criteria. |
| 6 | **Vocabulary for context-dependent code weaknesses** | Patterns correct in general but dangerous in specific security contexts, encoded in machine-readable form. | Without machine-readable context encoding, semantic enforcement remains a manual-review-only control — which does not scale with agent output volume. |
| 7 | **Correlated failure risk models** | Testing and remediation strategies that account for the non-independent failure distribution of agent-generated code. Standard vulnerability response treats each finding independently; agent defects may require pattern-wide remediation. | Your test and remediation strategies may be designed for independent failure distributions and miss systematic patterns that affect every function an agent generated. |
| 8 | **Governance perimeter expansion** | Controls for executable logic produced by non-developers using agentic tools outside traditional SDLC channels — analysts, data engineers, and operations staff generating SQL, scripts, automations, and workflow logic. | Current frameworks scope software development controls to recognised development teams and established code repositories. Agent-generated automations produced outside these channels are not addressed by any current guidance. |
| 9 | **Cross-model defect chaining** (emerging) | Defects from different models may compose, where one model's failure creates preconditions for another's. A candidate gap warranting attention as multi-model environments become common. | Second-order risk: even if each model's output is individually reviewed, the combination may introduce failures that neither review catches. |

### Detection coverage is worst where risk is highest

The ACF taxonomy catalogues fifteen core agentic code failure modes. Of those fifteen:

| Detection level | Count | Implication |
|-----------------|-------|-------------|
| **None** — no existing tool detects it | 4 | Requires new tooling or new review practices |
| **Partial** — some tools catch some cases | 9 | Existing tools provide incomplete coverage |
| **N/A** — process threat, not code pattern | 2 | Requires process controls, not technical controls |

Thirteen of the fifteen core failure modes are undetected or only partially detected by existing tools — including both Critical-rated entries (ACF-T1 authority tier conflation, ACF-E1 implicit privilege grant) and the High-rated ACF-R2 (partial completion) and ACF-R5 (remediation-induced violation), all four of which have zero tool coverage. The highest-risk failures fall outside the detection scope of current tooling.

### Contracted development compounds the exposure

For most Australian Government software, contracted service providers (consultancies, systems integrators, and specialist vendors) are the dominant delivery channel. Any threat model that addresses only in-house development addresses the minority case.

**The structural risk.** When multiple agencies contract the same provider, and that provider uses the same agent tooling and prompts across engagements, the correlated failure problem extends across agency boundaries through the contractor — even if the agencies have no direct relationship. This is concentration risk through interconnected delivery chains: the topology alone is sufficient to identify the vulnerability, in the same way that interconnected counterparties create systemic risk in financial networks regardless of their individual creditworthiness. A systematic defect introduced by a contractor's agent may propagate to every agency that contractor serves, producing cross-agency correlated exposure from a single tooling decision the agencies had no visibility into.

**The control gap.** Current acceptance criteria for contracted software development focus on functional requirements, test coverage, and compliance with coding standards. They do not address the semantic correctness properties this threat model identifies — trust boundary maintenance, audit trail integrity, context-appropriate error handling. A contractor could deliver code that meets every contractual requirement while containing systematic ACF-pattern violations. Existing assessment frameworks (IRAP, SOC 2, Essential Eight compliance) evaluate the contractor's security posture and process maturity, but none evaluate whether the contractor's development workflow detects agentic failure modes or whether acceptance testing covers semantic boundary properties.

**The visibility problem.** Contracting agencies may have limited visibility into whether a contractor is using agentic tools, what proportion of deliverables are agent-generated, and whether the contractor's review processes address the failure modes in the [ACF Taxonomy](../understand/taxonomy.md). ISM-2074's AI usage policy requirement applies to the agency's own use; how it flows down to contracted development is unclear. When a contractor delivers agent-generated code, the review responsibility is ambiguous — the contractor's internal review, the agency's acceptance review, or both? If the agency relies on the contractor's review, the agency inherits the contractor's review capacity constraints and habituation dynamics.

!!! warning "Principles for contract requirements"
    The discussion paper proposes principles — not draft contract clauses — that contracted development should address:

    - **Agent tool disclosure:** contracts should require disclosure of AI code generation tool usage (which tools, which models, what configuration) so that agencies can assess correlated risk across their supplier base.
    - **Provenance tracking:** contractors should maintain and provide provenance records for agent-generated code in deliverables, enabling targeted review and remediation.
    - **Semantic correctness acceptance criteria:** acceptance testing should include verification of trust boundary maintenance, classification handling, and audit trail integrity — not just functional correctness and test coverage.
    - **Right to inspect validation controls:** agencies should be able to request evidence that agent-generated code was subject to validation controls addressing ACF failure modes.
    - **Pattern-wide remediation obligations:** where a systematic agent-induced defect is discovered in one engagement, the contractor should assess and remediate the same pattern across other deliverables. Notification of other affected clients is the logical extension, though this crosses commercial confidentiality boundaries and may require a structured disclosure framework — analogous to coordinated vulnerability disclosure — rather than a blanket contractual obligation.
    - **Cross-agency correlation awareness:** agencies should assess whether their contracted suppliers serve other government clients with the same tooling stack, and consider the correlated risk this creates.

## Assessment by role

### CISOs and security advisors

The [CISO Assessment](ciso-assessment.md) provides a control-gap assessment with ISM mapping. It translates the paper's threat model into the language of control gaps, residual risk, and remediation priorities — structured so you can complete the assessment without reading the full paper.

### IRAP assessors

The [IRAP Assessor Checklist](irap-checklist.md) provides an assessment-ready checklist for evaluating systems that may include AI-generated code. It covers pre-assessment questions, ISM-mapped assessment items, verification properties for systems claiming semantic enforcement capability, and evidence requirements.

### Developers and technical leads

Start with the [ACF Taxonomy](../understand/taxonomy.md) to understand the fifteen core failure modes and their detection characteristics. The [Practical Guide for Code Authors](../respond/practical-guide.md) provides detection techniques and review strategies you can apply immediately. To evaluate your team's AI tool autonomy level and whether your controls are proportionate, use the [Autonomy Self-Assessment](autonomy-assessment.md).

### Policy and procurement

The [full discussion paper’s gap analysis](../understand/paper.md#6-current-guidance-gap-analysis) identifies the structural gaps in current frameworks (ISM, Essential Eight, OWASP, NIST SSDF), including the contracted development boundary — disclosure requirements, acceptance criteria, and cross-agency correlated risk.

### Managers of AI-using teams

Share the [Practical Guide for Code Authors](../respond/practical-guide.md) with your team. Use the [Autonomy Self-Assessment](autonomy-assessment.md) to evaluate where your team sits on the deployment spectrum (Level 0 through Level 3) and whether your controls match the risk at each level. The key question is not which level your team operates at, but whether your controls are proportionate to that level.

## These gaps require cross-government action

The structural gaps listed above are not addressable through individual organisational practice alone. They require shared vocabulary, common assessment criteria, cross-organisational detection mechanisms, and agent output classification standards at the whole-of-government level.

Your organisation's assessment should distinguish between gaps you can address locally (review practices, provenance tracking, acceptance criteria in your own contracts) and gaps that require the shared infrastructure only whole-of-government action can provide (a common taxonomy, semantic verification standards, accreditation criteria for agentic workflows).

!!! tip "You might also need"
    - **Understand the problem first** — [Governing AI-Generated Code](../understand/index.md) establishes the threat model
    - **Take action** — [How to Respond](../respond/index.md) for controls and actions
