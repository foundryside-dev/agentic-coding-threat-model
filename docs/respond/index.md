---
tags:
  - ciso
  - framework
  - recommendations
---

# Controls and Actions

Having understood the threat landscape ([Understand](../understand/index.md)) and assessed your organisation's exposure ([Assess](../assess/index.md)), this section covers what to do about it. The response spans process controls, technical controls, policy controls, and incident response — ordered from weakest to strongest assurance. The controls described here are drawn from the discussion paper's analysis (primarily [Section 7](../understand/paper.md#7-the-response-landscape)) and distilled for practitioners who need to act.

## The response framework

The highest-risk agentic failure modes are semantic and convention-conforming. To understand the control gap, consider three levels of automated checking:

- **Syntactic check:** "This code parses, types check, tests pass." The core semantic failure modes in the [ACF taxonomy](../understand/taxonomy.md) pass this level.
- **Conventional security check:** "No known injection pattern, no obvious secret leak, no flagged dependency vulnerability." The same failure modes pass this level too.
- **Semantic check:** "This code path is not allowed to invent a default for missing classification data; this external payload has not passed a validation boundary; this audit write may not be wrapped in catch-and-continue logic." This is the level at which the failure modes become detectable.

The gap between the second and third levels is the gap this paper identifies. The practical response is not "review harder" but "change what is checked" — move the system's security-relevant distinctions — trust boundaries, failure-mode requirements, audit-critical paths — into enforceable controls. Human review remains necessary, but after semantic enforcement, not instead of it.

Responses fall into three categories of increasing assurance strength:

| Control type | Mechanism | Strength | Example |
|---|---|---|---|
| **Behavioural** | Relies on individual compliance | Weakest — requires sustained restraint against incentives | "Developers should not run more than one agent concurrently" |
| **Procedural** | Relies on organisational process | Moderate — requires consistent enforcement and audit | "Parallel agent-generated changes require separate review queues and staged approval" |
| **Technical** | Constrains the environment | Strongest — operates regardless of individual behaviour | "The CI/CD pipeline enforces concurrency limits, sequencing rules, or protected-branch gates for agent-originated changes" |

Most organisations will implement behavioural controls, aspire to procedural controls, and underinvest in technical controls — because technical controls constrain the velocity that motivated adoption. The key insight from security engineering: **controls that shape the environment are stronger than controls that depend on restraint.** A rule that developers must not bypass review is an aspiration; a pipeline that physically prevents unreviewed code from reaching protected branches is a control.

All three control types have a role, but assurance should not rest primarily on behavioural or procedural controls where technical enforcement is feasible. Organisations that rely on behavioural and procedural controls without technical enforcement should understand that their assurance argument rests on sustained human compliance with rules that run directly against the productivity incentive that makes agentic development attractive.

### Process controls

Process controls are the fastest to deploy and the weakest in assurance. They adapt existing review practices for agentic velocity.

**Enhanced code review.** Mandate security-focussed review for agent-generated code — not just correctness review. Require reviewers to attest that trust boundaries were verified, not just that the code "looks right." The review criteria concern questions the current standard assurance stack does not answer. The checklist below is an interim bridge while automated semantic enforcement tooling matures; the long-term goal is to encode as many of these questions as possible in machine-enforceable form, because human checklists do not scale to agent-generated volume.

Review checklists for agent-generated code should include two categories of question — *pattern checks* that are mechanical and can eventually be automated, and *judgement calls* that require human reasoning and will remain with reviewers even after tooling matures:

**Pattern checks** (mechanical — look for these in the code):

- **Does missing data crash or default?** When a value is absent, does the code stop and report the problem, or does it silently substitute something? On a high-stakes path — a security classification, an audit field, an authorisation decision — a silent default is a silent corruption. (Does every `.get()` or `getattr` with a default represent a legitimate design decision, or a fabrication of missing data?)
- **Are failed operations reported or quietly swallowed?** When something goes wrong, does the error reach the audit trail and the operations team, or does the code catch the error, log it locally, and continue as if nothing happened? (Do `except` blocks propagate to the audit system, or swallow and continue?)
- **Is external data validated before being treated as authoritative?** When data arrives from outside the system — from an API, a user input, a partner feed — does the code check it before passing it to internal functions that assume it is trustworthy? Are external system assertions (permissions, entitlements, access decisions) accepted and acted on without independent verification?
- **Is the code's failure mode correct for the context?** Should this code crash, quarantine, or continue on error?
- **Are error responses appropriately scoped?** Do error messages, exceptions, or API responses expose internal structure, database schemas, file paths, or stack traces that could aid an attacker? (ACF-I1)

**Judgement calls** (require thought — step back and assess):

- **Q1. Did AI suggest this pattern — and do I understand why?** If the code came from an AI tool and the reviewer cannot explain why this specific approach was chosen over alternatives, that is a signal to pause. AI tools select patterns based on statistical frequency in training data, not based on fitness for the current context. A pattern the reviewer cannot independently justify is a pattern that has not been reviewed — it has only been accepted.
- **Q2. If this code is wrong, how would I find out?** If the answer is "an audit, months later" or "a data breach," the code lacks adequate observability for the risk it carries. This question reframes review from "is this code correct?" to "would I know if it weren't?" — and the answer determines whether the system has a feedback loop or a silent accumulation path.

The pattern checks are the first candidates for conversion to automated enforcement rules; the judgement calls (Q1–Q2) are intrinsically human and will remain part of the review process regardless of tooling maturity. The distinction matters because it tells organisations where to invest: automation for the pattern checks, training and review time for the judgement calls.

!!! tip "Five quick-reference review questions"
    The [Practical Guide](practical-guide.md) distils these into five questions any reviewer can apply immediately, without specialised security training:

    1. **Q1.** If this value is missing, does the code crash or silently invent an answer?
    2. **Q2.** If this operation fails, does someone find out, or is it logged and ignored?
    3. **Q3.** Where did this data come from? Is it validated before use, or trusted on arrival?
    4. **Q4.** Do I understand why the AI chose this approach?
    5. **Q5.** If this code is wrong, how would I find out?

    Q1–Q3 are pattern checks that automation can eventually enforce. Q4–Q5 are judgement calls that remain with human reviewers.

**Separation of generation and review.** The person or agent that generates the code must not be the sole reviewer. Agent self-review does not count as independent review. Multi-agent workflows where one agent generates and another reviews using different models are not independent in the statistical sense — the models share overlapping training corpora and failure modes. However, a more nuanced form of multi-agent review offers meaningful value.

**Structured perspective diversity in agent-assisted review.** While model diversity (using different models) provides limited independence, *perspective diversity* — prompting the same model with different analytical frames — can produce meaningfully different coverage. Illustrative functions include an architectural reviewer ("Is the shape right?"), a problem-framing reviewer ("Is this solving the right problem at the right location?"), an implementation reviewer ("Was it implemented correctly?"), and a quality reviewer ("Are the tests and verification strategy adequate?"). These lenses are not independent, but they surface different classes of issue: a trust boundary violation (ACF-T1) may be an implementation defect whose *cause* is an architectural misplacement, while the tests may still pass while verifying the wrong thing.

This is *faceted analysis*, not independence — the underlying model's blind spots persist across all frames. But a small set of prompted perspectives may provide broader first-pass coverage than a single undifferentiated review, reducing the volume of issues that reach human review. Organisations should develop *role-specific review prompts* aligned to their threat model and architecture; the prompts themselves become reviewable, version-controlled security artefacts. This is still a procedural control, not a technical one — but it is achievable now with no tooling investment, making it a useful bridge while automated enforcement matures.

**Volume-aware capacity planning.** If agents materially increase code generation volume, review capacity must be addressed — either through additional reviewers, automated pre-screening, or rate-limiting agent output to match review capacity. If the average time a reviewer spends per agent-generated change is declining while the volume is increasing, the review process is degrading regardless of whether reviews are still being approved. Tracking review time per change alongside change volume — and investigating when the ratio drops — provides an early warning before the habituation effect has fully eroded review effectiveness.

**Project-level instructions.** Most agent frameworks support project-level configuration that can encode rules like "never use `.get()` on audit data" or "all error handlers for audit-write operations must propagate." This is a behavioural control (weakest tier) — it depends on the agent respecting the instructions, the instructions being comprehensive, and the agent not generalising incorrectly from specific rules. Instructions that say "don't use `.get()` on audit data" do not teach the agent the underlying principle "don't fabricate defaults where data absence is meaningful" — every specific rule must be spelled out. But it is immediately deployable, zero-cost, and measurably reduces the volume of semantic violations reaching the review pipeline. It does not eliminate them: the [case studies](case-study.md) report that violations occur despite explicit project-level instructions prohibiting them, because the patterns are deeply embedded in training data.

**Provenance tracking.** Organisations should maintain records of which code was generated by agents, which was human-authored, and which was agent-generated then human-modified. This metadata is relevant for both security assessment (understanding the trust profile of different code regions) and for incident response (when a defect is found, knowing whether it originated from agent generation helps diagnose the failure mode and scope the blast radius).

### Technical controls

Technical controls constrain the environment and operate regardless of individual behaviour. They are the strongest assurance layer and the most underinvested. Both Critical-rated entries in the ACF taxonomy — ACF-T1 (authority tier conflation) and ACF-E1 (implicit privilege grant) — have zero detection in standard tooling, which is why custom rules targeting these patterns are the highest-priority investment.

**Verification-first framing.** When evaluating security tooling for agentic code, the relevant question is not implementation size but: **"How do you know it's correct?"** This question applies recursively. If the security enforcement tool is itself built by an agent, the tool's correctness is subject to the same threat model as the code it checks. A tool that checks for ACF-S1 violations but was itself generated with an ACF-T1 violation in its rule-matching logic is not a mitigation; it is an additional attack surface. Accreditation should assess the verification story — golden corpus, self-hosting, measured precision and recall — rather than implementation scope. A small tool with rigorous verification is stronger than a large tool lacking it.

**The five highest-priority custom detection rules.** Organisations should deploy a minimum of 3–5 custom static analysis rules (Semgrep or equivalent) targeting high-risk proxies for the highest-risk ACF patterns, scoped to paths the project identifies as high-stakes:

1. **Broad `except` on audit-write paths** (proxy for ACF-R1, High). Match `try/except` blocks wrapping audit-critical operations where the `except` clause logs and continues rather than propagating. This is the highest-frequency agent-generated pattern after ACF-S1 and the easiest to write a reliable rule for.
2. **Unvalidated external data entering internal stores** (proxy for ACF-T1, Critical). Match functions that accept data from external sources and pass it to internal data store operations without an intervening validation call.
3. **Default values on high-stakes data fields** (proxy for ACF-S1, High). Match `.get()`, `getattr()`, `or`, and `COALESCE()` patterns on fields the project has designated as authority-tier or audit-critical.
4. **`hasattr()` or type checks as authorisation gates** (proxy for ACF-E1, Critical). Match `hasattr(obj, "permission")` patterns or `isinstance()` checks on externally supplied objects used as authorisation gates without independent verification. (Scope note: `isinstance()` is the *correct* replacement for `hasattr()` in type-identity contexts — the concern is specifically its use as a *sole authorisation gate* for external data without independent verification.)
5. **Silent partial completion without transaction or atomicity** (proxy for ACF-R2, High). Match sequences of related write operations (multiple `INSERT`/`UPDATE`, multiple API calls, multiple file writes) not wrapped in a transaction, context manager, or equivalent atomicity mechanism — particularly where failure partway through leaves the system in an inconsistent state with no rollback or notification.

These rules run in CI and block on failure. A pre-commit hook checking for the most common patterns (`.get()` with defaults on classified fields, broad exception handlers on audit paths) provides an additional layer. See the [Practical Guide](practical-guide.md) for worked examples of what these patterns look like in practice.

**Validation maturity stages.** The paper defines three maturity stages for semantic enforcement:

- **Stage 1** (achievable now): 3–5 custom rules in CI, a review checklist, pre-commit hooks. No specialist investment required. This is the minimum credible starting position — below it, the organisation has no systematic detection of the failure modes this paper identifies. Stage 1 implements all three layers of the validation stack (conventional checks, semantic enforcement, and human review) but the semantic enforcement layer is limited to pattern-matching proxies.
- **Stage 2** (moderate investment): Automated semantic boundary enforcement integrated into every commit, broader ACF coverage, human review focussed on trust-boundary-crossing code paths, provenance tracking for agent-generated code. Often proportionate for government systems handling classified or integrity-sensitive data.
- **Stage 3** (comprehensive): Full semantic enforcement with a governance model covering authority classification, audit primacy, and architectural boundary rules — including graduated governance profiles (lighter for small teams and early adopters, full assurance for mature teams and ISM-assessed systems), manifest change authority, and temporal separation between policy changes and the code that benefits from them. Verification properties independently auditable.

Most organisations should aim for Stage 2, where automated enforcement handles structural violations and human reviewers focus on semantic issues requiring institutional knowledge. The stages are additive: Stage 2 extends Stage 1 rather than replacing it. Stage 1 is the ALARP floor (as low as reasonably practicable) — below it, there is no cost argument that justifies zero systematic detection of these failure modes.

!!! warning "Controls that are too costly drive undeclared use"
    Controls that are too costly, slow, or specialised for early adoption are likely to drive undeclared agent use outside formal processes. In practice, a weak but visible validation boundary is often safer than an ideal control model that organisations do not adopt — because undeclared use means zero controls, zero provenance, and zero visibility.

**Implementation approaches.** Semantic boundary enforcement means static analysis tools that verify authority classification and authority-tier flow at the code level. Several implementation approaches exist, and they are complementary, not exclusive:

| Approach | Strength | Best fit |
|----------|----------|----------|
| **Custom Semgrep rules** | Fast to author; low deployment friction | Stage 1–2: rapid deployment of ACF-pattern proxies |
| **CodeQL dataflow queries** | Powerful dataflow and control-flow analysis | Stage 2: organisations with existing CodeQL infrastructure |
| **Pysa taint tracking** (on Pyre) | Python-specific taint analysis via type inference | Stage 2: Python projects already using Pyre |
| **Purpose-built semantic boundary enforcer** | Integrates authority classification, governance model, and verification properties | Stage 3: high-assurance environments |
| **Prompted agent review** | Context-sensitive semantic analysis; no tooling investment | Supplementary: non-blocking pre-screening |

**Minimum verification properties.** Regardless of implementation approach, any enforcement tool proposed for high-assurance environments should be assessed against six properties:

1. **Golden corpus** — a curated set of known-good and known-bad code samples the tool must correctly classify
2. **Self-hosting gate** — the tool should analyse its own codebase and find no violations (or explicitly document exceptions)
3. **Measured precision** — the false positive rate should be measured, tracked, and published
4. **Measured recall** — the false negative rate should be measured against the golden corpus independently of precision
5. **Deterministic output** — given the same input, the tool should produce the same findings
6. **Taint propagation correctness** — the taint engine must correctly assign taint states at merge points and across function boundaries

**False positive management.** Any static analysis encoding institutional invariants will produce false positives. If a semantic enforcement tool generates too many false alerts, developers will disable it. Organisations should scope rules to high-stakes paths rather than applying them codebase-wide (the same pattern that is dangerous on an audit path is correct defensive programming on a UI path) and maintain an allowlist regime with human-authored justifications for legitimate exceptions. The risk of false-positive fatigue is real, but it is a tuning problem, not a reason to defer enforcement.

**Agent-assisted semantic analysis.** Prompted agent review — agents given specific analytical frames (architectural review, problem-framing review, security boundary review) — can perform context-sensitive semantic analysis that traditional static analysis misses and that human reviewers cannot practically trace file-by-file at scale. In case study deployments, periodic full-codebase agent crawls routinely surfaced findings that would not have been caught by conventional static analysis or unprompted review. This points to a human limitation distinct from time pressure: *cognitive range* — a senior backend engineer cannot practically adopt a security architect's analytical frame, or a data quality auditor's, not because they lack intelligence but because genuine expertise in each frame takes years to develop. Prompted agents can adopt multiple frames without the switching cost that makes it impractical for any individual human reviewer to cover more than one or two perspectives well. This is a discovery control, not a gate — non-deterministic and dependent on prompt design, but occupying a previously sparse middle ground between static analysis and human review.

**Declarations as generation constraints.** Once institutional knowledge is expressed in machine-readable declarations, the declarations do more than verify output — they constrain generation. An agent operating inside a codebase where trust boundaries, authority tiers, and failure-mode requirements are declared as annotations has those declarations in its generation context, because the agent reads surrounding code before generating new code. Investment in the declaration layer pays dividends on both sides of the generation boundary: it enables enforcement tooling to catch violations after the fact, and it reduces the frequency of violations in the first place. This effect can be strengthened by active projection — delivering the resolved governance context for a specific file to the agent at the point of modification.

**Architectural principle: extend existing development workflows rather than creating parallel ones.** Effective tools for this space must extend existing programming language machinery (annotations, type hints, decorators) rather than creating parallel systems. Tools that require developers to learn a new language or framework face adoption resistance that undermines their security value. Enforcement must live inside the existing CI/CD pipeline — pre-commit hooks, CI gates, pull request checks — not in a separate workflow.

### Policy controls

Several policy responses do not yet exist in Australian Government cybersecurity frameworks:

- **Standardised vocabulary** for agentic code failure modes — "fabricated default," "authority tier conflation," "audit trail destruction through defensive patterns" — that practitioners can use in security assessments and risk registers.
- **Accreditation criteria** for evaluating whether an organisation's use of AI coding agents maintains the security posture required by the system's classification, including how agent output is validated, how review effectiveness is maintained under volume pressure, and what attestation is required from human reviewers.
- **Agent output classification** — a formal determination of what validation is required before agent-generated code may enter a codebase, and what provenance metadata should be retained.
- **Model monoculture risk mitigation** — cross-organisational sharing of agent-introduced defect patterns, periodic scanning for correlated failure signatures across codebases, and awareness that independent testing assumptions may not hold when the generating model is shared.
- **SDLC extension to non-developer logic** — agent-generated plugins, automations, BI extensions, workflow scripts, low-code components, SQL queries, and similar artefacts produced by analysts, operators, and other non-developer staff should be catalogued and governed alongside application-layer code. Where such artefacts affect trust boundaries, access control, audit trails, or data integrity, they should be subject to provenance, review, and validation controls proportionate to their impact — even when the producers do not consider themselves developers.

### Incident response

Traditional incident response treats each vulnerability as an independent finding. Agent-generated defects violate this model because they are correlated — finding one instance of a pattern is strong evidence the same pattern exists in other agent-generated code, potentially across the entire codebase. Treating fifty instances of the same correlated pattern as fifty independent tickets overwhelms remediation capacity on what is, operationally, a single systematic defect pattern.

**Triage model.** When a semantic violation is discovered, the first step is pattern characterisation, not instance remediation:

- What is the defect pattern? (e.g., broad `except` on audit-write paths, fabricated defaults on fields in a specific semantic category, external data entering internal stores without validation)
- Is the pattern specific to a single agent session, or a training-distribution bias that would recur across sessions? The answer determines remediation scope.
- What is the blast radius — how many functions, modules, or code paths could plausibly contain the same pattern?

**Scanning protocol.** Once the pattern is characterised, scan the entire codebase for all instances — not just the file or module where the defect was found. If provenance tracking is in place, scanning can be targeted to agent-generated regions while spot-checking human-authored code as a control.

The scan should also look for *related* patterns, not just identical ones. A broad `except` that swallows an audit-write failure (ACF-R1) may co-occur with fabricated defaults on related fields (ACF-S1) and missing trust boundary validation on the same data path (ACF-T1), because the same training-distribution bias that produces one context-inappropriate defensive pattern tends to produce others in adjacent code. The ACF taxonomy provides a starting vocabulary for pattern families, and the compounding effect means these patterns tend to co-occur.

**Remediation scope.** Remediation of a correlated defect is a single systematic fix:

1. Add a detection rule to enforcement tooling — stop the inflow
2. Run the new rule against the existing codebase — find all current instances
3. Remediate instances, prioritised by code path criticality
4. Investigate why existing review processes missed the pattern — was it a checklist gap, habituation, or a pattern structurally undetectable without tooling?

Step 4 is the learning step that closes the loop.

**Cross-agency notification.** A systematic defect found in one organisation's agent-generated code is a leading indicator for other organisations using the same model. No cross-agency notification mechanism currently exists for this class of finding. Organisations that discover a model-specific pattern should consider broader disclosure.

## Detection approaches

Detecting semantic defects is fundamentally harder than detecting syntactic or conventional security defects, because the failures are context-dependent — the same pattern can be correct in one context and dangerous in another.

**What existing tools can catch.** Static analysis, type checkers, and standard SAST tools catch syntactic defects and known vulnerability patterns. They do not catch semantic defects because the code is syntactically correct, follows conventions, and contains no known vulnerability signature. The failure modes in the [ACF taxonomy](../understand/taxonomy.md) are specifically characterised by their ability to pass conventional tooling.

**What custom rules can catch.** The five highest-priority patterns described above (broad `except` on audit paths, unvalidated external data entering internal stores, defaults on high-stakes fields, type checks as authorisation gates, silent partial completion) can be detected by custom static analysis rules scoped to designated high-stakes paths. These are pattern-matching proxies — they catch the structural signature of a semantic violation without understanding the full semantic context. They are imperfect but immediately deployable.

**What agent-assisted analysis can catch.** Prompted agent review — agents given specific analytical frames (architectural review, problem-framing review, security boundary review) — can perform context-sensitive semantic analysis that traditional static analysis misses and that human reviewers cannot practically trace file-by-file at scale. In case study deployments, periodic full-codebase agent crawls routinely surfaced findings that would not have been caught by conventional static analysis or unprompted review. This is a discovery control, not a gate — non-deterministic and dependent on prompt design, but occupying a previously sparse middle ground between static analysis and human review.

**What requires human review.** Two of the five review questions — Q4 ("Do I understand why the AI chose this approach?") and Q5 ("If this code is wrong, how would I find out?") — are irreducibly human judgement calls. They require institutional context that no automated tool currently possesses: whether the trust topology is correctly declared, whether validation logic is actually correct (not just structurally present), whether the audit trail captures the right information.

**What semantic enforcement tooling could catch.** Purpose-built enforcement tooling that understands authority classification and trust-tier flow can detect violations that pattern-matching proxies miss — for example, tracing data from a lower authority tier to a higher-tier sink without passing through a validation boundary. Several implementation approaches exist, including extensions to existing platforms (Semgrep, CodeQL, Pysa) and purpose-built analysers.

The detection gap is real but tractable. The significant finding from the case studies is not that detection is impossible but that it requires specific conditions most projects do not currently have: an operator with deep codebase familiarity, explicit semantic rules, and purpose-built enforcement tooling.

## Code review at scale

AI generates code at a rate that overwhelms human review capacity. The review process itself becomes an attack surface — not because reviewers are negligent, but because the review model's assumptions are violated.

**Review fatigue under volume.** Human code review evolved for human-authored code at human pace. It relies on assumptions that agentic coding violates: that reviewers can read most of the code, that the author can explain their intent, that unusual patterns are suspicious, and that the error rate is empirically bounded. When agents generate code that consistently passes tests and follows conventions, reviewers develop trust in the agent's output. This trust is not earned — it is a cognitive shortcut driven by volume pressure. In human factors engineering, this is **automation bias**: the tendency to over-rely on automated systems and under-scrutinise their output.

**The approval-bias feedback loop.** The agent's consistent surface-quality output becomes a symptomatic fix that weakens thorough human review. The more the agent produces acceptable-looking code, the less carefully humans review it, and the more dependent the process becomes on the agent being correct — which is exactly the assumption the review process exists to check. The reviewer's mental model shifts from "verify this code is correct" to "check this code is not obviously wrong." The difference is enormous: the first is an active search for defects; the second is a passive scan that catches only gross errors.

**Restructuring review for semantic focus.** The response is not "review harder" but "check differently." With automated semantic enforcement handling structural violations, human attention shifts from low-value pattern scanning to high-value semantic evaluation:

| Review focus | Without automation | With automation |
|---|---|---|
| "Is `.get()` used on typed objects?" | Human scans for pattern (error-prone) | Machine catches structurally (reliable) |
| "Does this error handler preserve the audit trail?" | Human evaluates (moderate difficulty) | Machine flags broad `except` blocks; human evaluates specific cases |
| "Is the trust topology correctly declared?" | Human evaluates (requires institutional knowledge) | Human evaluates (no change — irreducibly human) |

The total review burden may be similar, but the distribution of human attention shifts from low-value pattern scanning to high-value semantic evaluation. The compliance tax is the same; the assurance yield is higher.

## Procurement and contracted development

The procurement boundary is where the largest volume of uncontrolled AI-generated code enters government systems. Most government code is contracted, not developed in-house, and contractors face the same agentic development incentives as internal teams — with less visibility into the receiving organisation's trust architecture. Contracted developers' agents produce the same correlated, context-inappropriate patterns as in-house agents, but with additional governance challenges — reduced visibility, ambiguous review ownership, and cross-agency correlated risk through shared suppliers.

**Why procurement controls matter.** A contractor using AI coding agents to deliver a government system is subject to the same failure modes described in this paper. The difference is that the government agency receiving the deliverable has no visibility into whether agents were used, what review process was applied, or whether semantic boundary enforcement was in place during development. The procurement boundary is a trust boundary — and the current procurement framework does not address AI-generated code.

**What to include in procurement clauses:**

- **AI tool disclosure** — require contractors to declare whether AI coding agents were used during development, which models were used, and what proportion of delivered code is agent-generated.
- **Detection requirements** — require contractors to demonstrate that delivered code has been scanned for the failure modes in the ACF taxonomy, or to provide evidence of semantic enforcement tooling in their development pipeline.
- **Provenance metadata** — require contractors to maintain and deliver provenance records identifying which code is agent-generated, human-authored, or agent-generated then human-modified.
- **Review attestation** — require contractors to attest that security-focussed review (not just correctness review) was applied to agent-generated code, including verification of trust boundaries, audit trail preservation, and appropriate error handling.
- **Acceptance testing extension** — standard acceptance criteria should be extended to verify semantic correctness properties relevant to the system's trust topology, not just functional requirements and test coverage.
- **Cross-agency correlation awareness** — agencies should assess whether their contracted suppliers serve other government clients with the same tooling stack, enabling correlated risk assessment across their supplier base.
- **Pattern-wide remediation** — where a systematic agent-induced defect is discovered in one engagement, the contractor should assess and remediate the same pattern across other deliverables. Notification of other affected clients may require a structured disclosure framework analogous to coordinated vulnerability disclosure.

The [full discussion paper](../understand/paper.md#67-contracted-development-as-the-primary-delivery-context) examines the procurement dimension in detail, including contracted development controls and the cross-border dimension of training-data bias.

## Specialised contexts

### Cross-model defect chaining

Model diversity is the natural mitigation to monoculture risk — if everyone uses the same model, a systematic defect affects everyone. But diversity may not buy independence. Even different models trained on similar public corpora may reproduce the same patterns, because those patterns represent the statistical majority of their training data.

More concerning is the chaining mechanism: in a multi-model environment, distinct defect tendencies may interact rather than cancel out. Consider: Model A, used by one team, tends to omit validation boundaries on external data (ACF-T1). Model B, used by a different team on the same codebase, tends to add reassuring defaults when fields are missing (ACF-S1). Separately, each is a recognised failure mode. Together, A weakens the authority-tier boundary and B ensures the resulting anomaly is normalised instead of surfaced — the composed outcome (silently authoritative unvalidated data) is worse than either defect alone.

Or consider a modernisation chain — particularly plausible in contracted development where different vendors use different models. Model A removes accidental fail-closed rigidity from legacy code. Model B later adds "resilience" handling on the newly live edge path. Model C writes passing tests around the softened behaviour. The end state is not a single shared defect but a system in which several model-specific behaviours have jointly erased an old safety property — and each step passed review independently.

The policy implication: agencies conducting cross-agency scanning should watch for co-occurring defect chains — patterns from different models that are individually unremarkable but jointly collapse a trust boundary. "Different agencies use different models, so we are safe" is not a defensible position if the models' distinct failure tendencies are composable.

### SQL extension

The ACF taxonomy uses Python for its primary examples, but SQL warrants explicit treatment because SQL is the language most affected by the citizen programmer problem, operates directly on the authoritative data store (bypassing application-layer validation), and fails silently — a query that returns wrong results produces results, not errors.

**`COALESCE` as fabricated default (ACF-S1).** The SQL equivalent of Python's `.get()` with a default is `COALESCE()`. Agents use it reflexively:

```sql
-- Agent-generated — looks defensive and robust
SELECT document_id,
    COALESCE(security_classification, 'OFFICIAL') AS classification
FROM documents WHERE ...
```

This fabricates a classification for documents where the classification is missing. In a reporting context, the fabricated value propagates into materialised views and downstream reports where its provenance as a `COALESCE` default is invisible — consumers see "OFFICIAL" as a data value, not an absence marker.

**`INSERT ... SELECT` as authority tier conflation (ACF-T1).** When agents write SQL integrating data from external sources, they treat all tables as equally trustworthy:

```sql
-- Agent-generated — clean, readable, wrong for this context
INSERT INTO internal_records (name, status, clearance_level)
SELECT name, status, clearance_level
FROM partner_staging_table;
-- No validation. External data enters the authoritative store directly.
```

The SQL case is more dangerous than the Python equivalent because `INSERT ... SELECT` is a single statement that reads from one authority tier and writes to another with no syntactic position where a validation step can be expressed. The correct version requires domain validation, allowlists, boundary checks, and a quarantine log for rejected rows — substantially more verbose, which is the pattern agents omit.

**Database-level enforcement** (`CHECK` constraints, foreign keys, `NOT NULL`, domain types) is the strongest control for SQL because it is environmental — the database rejects invalid data regardless of how the SQL was generated. Organisations should audit whether their database schemas enforce the same trust boundary rules that their application code does.

!!! tip "You might also need"
    - **Understand the threat** — [Governing AI-Generated Code](../understand/index.md) for the problem statement
    - **Assess your exposure** — [Your Exposure](../assess/index.md) for role-specific assessment tools

## Where to go next

- [**Practical Guide**](practical-guide.md) — the five review questions with worked code examples, for people writing or reviewing AI-generated code
- [**Case Studies**](case-study.md) — two case studies illustrating what semantic defects look like in practice
- [**ACF Taxonomy**](../understand/taxonomy.md) — the full failure mode taxonomy with detection approaches for each entry
