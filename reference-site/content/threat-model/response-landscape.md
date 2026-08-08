---
title: "The Response Landscape"
weight: 7
---

This section shifts from analysis to response — what organisations can build, adopt, and enforce. It covers process controls, technical controls, policy controls, and incident response, ordered from weakest to strongest assurance.

The preceding sections establish that the highest-risk agentic failure modes are semantic and convention-conforming. To understand the gap, consider three levels of automated checking:

- **Syntactic check:** "This code parses, types check, tests pass." — *The core semantic failure modes pass this level.*
- **Conventional security check:** "This code contains no known injection pattern, no obvious secret leak, no flagged dependency vulnerability." — *The same failure modes pass this level too.*
- **Semantic check:** "This code path is not allowed to invent a default for missing classification data; this external payload has not passed a validation boundary; this audit write may not be wrapped in catch-and-continue logic." — *This is the level at which the failure modes become detectable.*

The gap between the second and third levels is the gap this paper identifies. The practical response is not "review harder" but "change what is checked": move the system's security-relevant distinctions — trust boundaries, failure-mode requirements, audit-critical paths — out of prose and into enforceable controls. Human review remains necessary, but after semantic enforcement, not instead of it.

## Control type hierarchy

The responses available to organisations fall into three categories of increasing assurance strength (ordered weakest to strongest):

| Control Type | Mechanism | Strength | Example |
|---------|-------------|----------|-----------------|
| **Behavioural** | Relies on individual compliance | Weakest — requires sustained restraint against incentives | "Developers should not run more than one agent concurrently" |
| **Procedural** | Relies on organisational process | Moderate — requires consistent enforcement and audit | "Parallel agent-generated changes require separate review queues and staged approval" |
| **Technical** | Constrains the environment | Strongest — operates regardless of individual behaviour | "The CI/CD pipeline enforces concurrency limits, sequencing rules, or protected-branch gates for agent-originated changes" |

Most organisations will implement behavioural controls, aspire to procedural controls, and underinvest in technical controls — because technical controls constrain the velocity that motivated adoption. The key insight from security engineering applies here: **controls that shape the environment are stronger than controls that depend on restraint.** A rule that developers must not bypass review is an aspiration; a pipeline that physically prevents unreviewed code from reaching protected branches is a control.

All three control types have a role, but assurance should not rest primarily on behavioural or procedural controls where technical enforcement is feasible. Organisations that rely on behavioural and procedural controls without technical enforcement should understand that their assurance argument rests on sustained human compliance with rules that run directly against the productivity incentive that makes agentic development attractive.

## Process controls

### Enhanced code review protocols

Mandate security-focussed review (not just correctness review) for agent-generated code. Require reviewers to attest that trust boundaries were verified, not just that the code "looks right." This is a process change, not a technology change, but it requires explicit recognition that agent code needs different review criteria than human code. The checklist below is an interim bridge while automated semantic enforcement tooling matures; the long-term goal is to encode as many of these questions as possible in machine-enforceable form, because human checklists do not scale to agent-generated volume.

Review checklists for agent-generated code should include two categories of question — *pattern checks* that are mechanical and can eventually be automated, and *judgement calls* that require human reasoning and will remain with reviewers even after semantic enforcement tooling matures:

**Pattern checks** (mechanical — look for these in the code):

- **Does missing data crash or default?** When a value is absent, does the code stop and report the problem, or does it silently substitute something? On a high-stakes path — a security classification, an audit field, an authorisation decision — a silent default is a silent corruption. (Does every `.get()` or `getattr` with a default represent a legitimate design decision, or a fabrication of missing data?)
- **Are failed operations reported or quietly swallowed?** When something goes wrong, does the error reach the audit trail and the operations team, or does the code catch the error, log it locally, and continue as if nothing happened? (Do `except` blocks propagate to the audit system, or swallow and continue?)
- **Is external data validated before being treated as authoritative?** When data arrives from outside the system — from an API, a user input, a partner feed — does the code check it before passing it to internal functions that assume it is trustworthy? Are external system assertions (permissions, entitlements, access decisions) accepted and acted on without independent verification?
- **Is the code's failure mode correct for the context?** Should this code crash, quarantine, or continue on error?
- **Are error responses appropriately scoped?** Do error messages, exceptions, or API responses expose internal structure, database schemas, file paths, or stack traces that could aid an attacker? ([ACF-I1]({{< relref "/acf/i1-verbose-error-response" >}}))

**Judgement calls** (require thought — step back and assess):

- **Q1. Did AI suggest this pattern — and do I understand why?** If the code came from an AI tool and the reviewer cannot explain why this specific approach was chosen over alternatives, that is a signal to pause. AI tools select patterns based on statistical frequency in training data, not based on fitness for the current context. A pattern the reviewer cannot independently justify is a pattern that has not been reviewed — it has only been accepted.
- **Q2. If this code is wrong, how would I find out?** If the answer is "an audit, months later" or "a data breach," the code lacks adequate observability for the risk it carries. This question reframes review from "is this code correct?" to "would I know if it weren't?" — and the answer determines whether the system has a feedback loop or a silent accumulation path.

The pattern checks are the first candidates for conversion to automated enforcement rules; the judgement calls (Q1–Q2) are intrinsically human and will remain part of the review process regardless of tooling maturity.

### Separation of generation and review

The person (or agent) who generates the code must not be the sole reviewer. This already applies to human-authored code in most compliance-constrained contexts; extending it to agent-generated code means ensuring that agent self-review (e.g., an agent checking its own output) does not count as an independent review. This has a subtlety: multi-agent workflows where one agent generates code and another reviews it using different models are not independent review in the statistical sense — the models share overlapping training corpora and failure modes. However, a more nuanced form of multi-agent review offers meaningful value.

### Structured perspective diversity in agent-assisted review

While model diversity (using different models) provides limited independence, *perspective diversity* — prompting the same model with different analytical frames — can produce meaningfully different coverage. Illustrative functions include an **architectural reviewer**, a **problem-framing reviewer**, an **implementation reviewer**, and a **quality reviewer**. These lenses are not independent, but they surface different classes of issue: a trust boundary violation may be an implementation defect whose *cause* is an architectural misplacement, while the tests may still pass while verifying the wrong thing.

This is *faceted analysis*, not independence — the underlying model's blind spots persist across all frames. But a small set of prompted perspectives may provide broader first-pass coverage than a single undifferentiated review, reducing the volume of issues that reach human review. Organisations should develop *role-specific review prompts* aligned to their threat model and architecture; the prompts themselves become reviewable, version-controlled security artefacts. This is a procedural control achievable now with no tooling investment.

### Volume-aware review capacity planning

If agents materially increase code generation volume, review capacity must be addressed — either through additional reviewers, automated pre-screening that reduces the human review burden, or rate-limiting agent output to match review capacity. Ignoring the volume mismatch means the review control degrades silently.

A practical indicator: if the average time a reviewer spends per agent-generated change request is declining while the volume of agent-generated changes is increasing, the review process is degrading regardless of whether individual reviews are still being approved. Tracking review time per change alongside change volume — and investigating when the ratio drops — provides an early warning before the habituation effect has fully eroded review effectiveness.

### Project-level instructions as a generation-time control

Most agent frameworks support project-level configuration — system prompts, instruction files, memory stores — that shape agent behaviour within a session. These instructions can encode project-specific rules ("never use `.get()` on audit data," "all error handlers for audit-write operations must propagate, not catch-and-continue") and reduce the frequency of failure modes at generation time.

This is a behavioural control (weakest tier): it depends on the agent respecting the instructions, the instructions being comprehensive enough to cover all failure modes, and the agent not generalising incorrectly from specific rules. Instructions that say "don't use `.get()` on audit data" do not teach the agent the underlying principle "don't fabricate defaults where data absence is meaningful" — every specific rule must be spelled out. Nonetheless, project-level instructions are an immediately deployable, zero-cost control that measurably reduces (without eliminating) the volume of semantic violations reaching the review pipeline.

### Provenance tracking for agent output

Organisations should maintain records of which code was generated by agents, which was human-authored, and which was agent-generated then human-modified. This metadata is relevant for both security assessment (understanding the trust profile of different code regions) and for incident response (when a defect is found, knowing whether it originated from agent generation helps diagnose the failure mode).

## Technical controls

### Verification-first framing

When evaluating security tooling for agentic code, implementation size is the wrong assurance metric. The relevant question is: **"How do you know it's correct?"** This question applies recursively. If the security enforcement tool is itself built by an agent, the tool's correctness is subject to the same threat model as the code it checks — and its assurance must rest on independent verification rather than on the process used to produce it. A tool that checks for ACF-S1 violations but was itself generated with an ACF-T1 violation in its rule-matching logic is not a mitigation; it is an additional attack surface.

A small tool with rigorous verification is stronger than a large tool lacking it. Accreditation should assess the verification story — golden corpus, self-hosting, measured precision and recall — rather than implementation scope.

### Validation maturity stages

Agent output requires a validation boundary. But "treat all agent code as untrusted" without implementation guidance is like "treat all input as untrusted" — true but inert. The validation boundary must be implementable at a cost proportionate to the organisation's risk profile, or it will not be implemented at all.

This is the ALARP principle (*as low as reasonably practicable*) familiar from safety engineering: controls should be proportionate to the risk, and there is a cost floor below which any organisation using agentic coding should act regardless of its risk appetite. The staging model below is structured around that principle — Stage 1 is the ALARP floor — and each subsequent stage adds assurance without requiring the previous stage to be abandoned. The entry stage is achievable with existing tooling and no specialist engineering.

Controls that are too costly, slow, or specialised for early adoption are likely to drive undeclared agent use outside formal processes. In practice, a weak but visible validation boundary is often safer than an ideal control model that organisations do not adopt — because undeclared use means zero controls, zero provenance, and zero visibility.

These validation maturity stages are orthogonal to the control-type hierarchy above (behavioural, procedural, technical). The control types describe *what kind* of assurance mechanism is used; the stages describe *how much* semantic enforcement is in place. A Stage 1 organisation still needs all three control types — but its technical controls are limited to pattern-matching proxies rather than full semantic enforcement.

Organisations should also assess where their agent deployment sits on the agent deployment spectrum (the [autonomy self-assessment]({{< relref "/appendices/autonomy-assessment" >}})) and whether their validation stage is proportionate — Stage 1 controls may be adequate for Level 1 autonomy (prompted + copied) but are unlikely to be sufficient on their own for Level 3 autonomy (fully autonomous agents).

**Stage 1: Achievable with existing tooling and checklists.** Stage 1 implements all three layers of the validation stack — conventional checks, semantic enforcement, and human review — but the semantic enforcement layer is limited to pattern-matching proxies rather than full authority-tier-aware analysis.

- 3–5 custom static analysis rules (Semgrep or equivalent) targeting high-risk proxies for the highest-risk ACF patterns, scoped to paths the project identifies as high-stakes — applying them codebase-wide produces excessive false positives because the same patterns are correct defensive programming elsewhere. These run in CI and block on failure. A minimum viable detection set, prioritised by risk rating and detection gap:
    1. **Broad `except` on audit-write paths** (proxy for ACF-R1, High). Match `try/except` blocks that wrap audit-critical operations — database writes to audit tables, log-of-record emissions, compliance event recording — where the `except` clause logs and continues rather than propagating. This is the highest-frequency agent-generated pattern after ACF-S1 and the easiest to write a reliable rule for, because audit paths can be identified by function name, decorator, or module location.
    2. **Unvalidated external data entering internal stores** (proxy for ACF-T1, Critical). Match functions that accept data from external sources (`requests.get()`, API handlers, file parsers, message queue consumers) and pass it to internal data store operations (`INSERT`, ORM `.create()`, `.save()`) without an intervening validation call. Full taint tracking is Stage 2; at Stage 1, matching the structural pattern — external source to internal sink with no validation function between them — catches the highest-risk cases.
    3. **Default values on fields in designated high-stakes data classes** (proxy for ACF-S1, High). Match `.get()`, `getattr()`, `or`, and `COALESCE()` patterns on fields belonging to data classes or tables the project has designated as authority-tier or audit-critical. Requires the project to maintain a short list of sensitive field names or annotated classes — this list is the minimum institutional knowledge the rule needs.
    4. **`hasattr()` or type checks used as authorisation gates** (proxy for ACF-E1, Critical). Match `hasattr(obj, "permission")` patterns, or `isinstance()` checks on externally supplied objects, used in conditional branches that control access to privileged operations without independent verification. Structural presence is not identity; these patterns grant privilege based on duck-typing or unverified type claims rather than verified credentials. **Scope note:** `isinstance()` is the *correct* replacement for `hasattr()` in type-identity contexts (ACF-S3) — the concern here is specifically its use as a *sole authorisation gate* for external data without independent verification. Rules implementing this check should target `isinstance()` on objects crossing a trust boundary, not `isinstance()` used for internal type dispatch.
    5. **Silent partial completion without transaction or atomicity** (proxy for ACF-R2, High). Match sequences of related write operations (multiple `INSERT`/`UPDATE`, multiple API calls, multiple file writes) not wrapped in a transaction, context manager, or equivalent atomicity mechanism — particularly where a failure partway through leaves the system in an inconsistent state with no rollback or notification.
- A review checklist of 5–7 questions derived from the ACF taxonomy, used by human reviewers for agent-generated changes.
- A pre-commit hook checking for the most common patterns.
- Achievable for most teams with a CI pipeline and existing tooling. No specialist investment required.

**Stage 2: Moderate engineering investment.**

- Automated semantic boundary enforcement — purpose-built tooling, extended Semgrep/CodeQL/Pysa rulesets, or equivalent — integrated into every commit, covering a broader set of ACF patterns than Stage 1.
- Human review focussed on trust-boundary-crossing code paths rather than line-by-line review of all agent output, because automated pre-screening handles the structural violations.
- Provenance tracking for agent-generated code (which changes were agent-generated, which were human-authored, which were agent-generated then human-modified).
- Often proportionate for systems handling classified, integrity-sensitive, or compliance-constrained data.

**Stage 3: Comprehensive semantic enforcement with governance model.**

- Full semantic boundary enforcement with a governance model covering authority classification, audit primacy, and architectural boundary rules.
- Verification properties (golden corpus, self-hosting gate, measured false positive/negative rates) are independently auditable.
- Substantial engineering effort. Appropriate for organisations with high-assurance requirements or large agent-generated codebases.

Stage 1 is the minimum credible starting position — below it, the organisation has no systematic detection of the failure modes this paper identifies. Stage 3 is the aspirational target for high-assurance environments. Most organisations should aim to reach Stage 2. The stages are additive: Stage 2 extends Stage 1 rather than replacing it, and Stage 3 extends Stage 2.

**False positive management — critical at Stage 1.** Any static analysis that encodes institutional invariants will produce false positives — patterns that match the rule but are correct in context. This is not a theoretical concern; it is the reason most organisations' SAST configurations are weaker than their policies require. If a semantic enforcement tool generates too many false alerts, developers will disable it, route around it, or stop trusting its findings — and the enforcement layer degrades to a nuisance rather than a gate.

Organisations deploying semantic enforcement should track false positive rates from the outset, scope rules to high-stakes paths rather than applying them codebase-wide (the same pattern that is dangerous on an audit path is correct defensive programming on a UI path), and maintain an allowlist regime with human-authored justifications so that legitimate uses of otherwise-restricted patterns are recorded rather than suppressed. Precision-tracking requirements — a golden corpus of known-good and known-bad patterns, plus severity tuning — keep that regime honest. The risk of false-positive fatigue is real, but it is a tuning problem, not a reason to defer enforcement — and the alternative (no automated detection of semantic violations) is not a lower-risk posture.

### Automated semantic boundary enforcement

The gap between the second and third checking levels is fundamentally an **observability problem**: whether code behaviour is correct for its institutional context is not observable through any existing standard instrument. The design principle is straightforward: *if a system property matters, it must be observable.* Semantic enforcement is the observability intervention that makes this property measurable, trackable, and auditable.

Semantic boundary enforcement is not new — specialist high-assurance projects (safety-critical systems, cryptographic implementations, some defence and intelligence platforms) have practised elements of it as bespoke local tooling. The change is that agent-assisted development makes this style of checking a mainstream requirement, because agents are introducing the failure modes that previously only appeared in the systems that already had the tooling. The design space is tractable: one case study demonstrates feasibility, and several implementation paths exist.

### Implementation approaches

Semantic boundary enforcement means static analysis tools that verify authority classification and authority-tier flow — not just type shape — at the code level. Several implementation approaches exist:

| Approach | Strength | Limitation | Best fit |
|----------|----------|------------|----------|
| **Custom Semgrep rules** | Fast to author; pattern-matching with taint analysis; large existing rule ecosystem; low deployment friction | Pattern-based — cannot express authority-classification-aware severity or governance models | Stage 1–2: rapid deployment of ACF-pattern proxies on any codebase with CI |
| **CodeQL dataflow queries** | Powerful dataflow and control-flow analysis over compiled databases; strong for tracing data across function boundaries | Requires database compilation step; project-specific trust topology must be encoded externally | Stage 2: organisations with existing CodeQL infrastructure |
| **Pysa taint tracking** (on Pyre) | Python-specific taint analysis via type inference; can track data flow across call boundaries | Analyses taint flow but not authority classification as orthogonal dimensions; requires Pyre adoption | Stage 2: Python projects already using or willing to adopt Pyre |
| **Purpose-built semantic boundary enforcer** | Can integrate authority classification, governance model, and verification properties into a single tool | Requires dedicated engineering investment; must be verified against the same threat model it enforces | Stage 3: high-assurance environments requiring governance model integration |
| **Prompted agent review** | Context-sensitive semantic analysis; can evaluate whether a pattern is *contextually appropriate*; no tooling investment | Non-deterministic; dependent on prompt design; blind spots correlated with the generating model's | Supplementary: non-blocking pre-screening to surface issues for human review |

Organisations should evaluate which approach fits their existing infrastructure, risk profile, and engineering capacity. The approaches are complementary, not exclusive — Semgrep rules for CI gating and prompted agent review for discovery can operate together effectively.

### Minimum verification properties

Any enforcement tool proposed for high-assurance environments should be assessed against six verification properties:

1. **Golden corpus.** A curated set of known-good and known-bad code samples that the tool must correctly classify. This provides a regression baseline and makes the tool's coverage claims independently testable.
2. **Self-hosting gate.** The tool should be able to analyse its own codebase and find no violations — or explicitly document and justify any exceptions.
3. **Measured precision.** The false positive rate should be measured, tracked, and published. Unmeasured precision is not a verification story.
4. **Measured recall.** The false negative rate should be measured against the golden corpus and tracked independently of precision.
5. **Deterministic output.** Given the same input, the tool should produce the same findings. Non-deterministic enforcement tools cannot be audited, diffed, or used as CI gates.
6. **Taint propagation correctness.** For tools implementing taint-flow tracking: the taint propagation engine must correctly assign taint states to values at merge points and across function boundaries.

These are evaluation criteria, not product features. Any organisation building, procuring, or extending enforcement tooling should verify these properties. The criteria are tool-agnostic.

**Technical feasibility finding:** The case study codebase runs a pattern-matching enforcement gate that catches trust boundary violations in CI, demonstrating that semantic boundary enforcement is tractable with current tooling. The case study and this feasibility observation are Python-specific; the companion specification's Java binding extends the framework to a second language but has not been independently validated against a case study codebase. There are several feasible implementation paths, including extensions of existing static analysis platforms (Semgrep, CodeQL, Pysa) and purpose-built analysers. Organisations with existing static analysis infrastructure should evaluate whether extending their current tools with ACF-targeted rules would be more practical than building a new one.

### Agent-assisted semantic analysis

The prompted perspective diversity described above applies not only to reviewing changes but to *analysing existing code*. An agent prompted with a specific analytical frame can perform a cold read of a source file that may surface context-sensitive issues traditional static analysis misses and that human reviewers cannot practically trace file-by-file at scale.

In case study deployments, periodic full-codebase agent crawls routinely surfaced dozens of findings per pass, the vast majority at P3/P4 severity. These included findings that would not have been caught by conventional static analysis, incremental code review, or unprompted agent review.

This points to a human limitation distinct from time pressure: *cognitive range*. A senior backend engineer cannot practically adopt a security architect's analytical frame, or a data quality auditor's — not because they lack intelligence, but because genuine expertise in each frame takes years to develop. Prompted agents do not have deeper expertise in any single frame than a domain specialist, but they can adopt multiple frames without the switching cost that makes it impractical for any individual human reviewer to cover more than one or two perspectives well. In this sense, prompted agents appear to function as *polymorphic* reviewers — breadth of analytical coverage that no individual human can match regardless of time budget. This characterisation is based on the author's observation in a single project context; broader empirical validation remains an open question.

Most findings are individually low-impact (edge cases in cold paths, minor deviations from stated invariants, inconsistencies that do not currently trigger in testing) but represent legitimate deviations from the codebase's architectural rules. The cost is non-trivial, but the defect yield suggests the economics may favour periodic comprehensive analysis over exclusive reliance on per-change review.

### Architectural principle: parasitic, not parallel

Effective tools for this space must extend existing programming language machinery (annotations, type hints, decorators) rather than creating parallel systems that require adoption of new syntax or tools. Enforcement must live inside the existing CI/CD pipeline — pre-commit hooks, CI gates, pull request checks — not in a separate workflow. If a security tool slows down the very velocity the organisation bought the AI agent to achieve, the tool will be bypassed.

The enforcement mechanism succeeds by being invisible to the fast path and blocking only on genuine violations.

### Declarations as generation constraints

Once institutional knowledge is expressed in machine-readable declarations, the declarations do more than verify output: they constrain generation. An agent operating inside a codebase where trust boundaries, authority tiers, and failure-mode requirements are declared as annotations has those declarations in its generation context — not because anyone explicitly injects them, but because the agent reads the surrounding code before generating new code, and the surrounding code carries the project's semantic rules in a form the agent can parse.

The practical implication is that investment in the declaration layer pays dividends on both sides of the generation boundary: it enables enforcement tooling to catch violations after the fact, and it reduces the frequency of violations in the first place by making the rules visible to the agent during generation.

This effect can be strengthened by active projection — delivering the resolved governance context for a specific file to the agent at the point of modification. The return on converting institutional knowledge into enforceable declarations is higher than verification alone would justify, because the same declarations support both post-generation enforcement and pre-generation context injection.

## Policy controls

The technical controls above describe what organisations can build. The policy controls below describe what does not yet exist at the framework level — vocabulary, classification, and coordination mechanisms that require action beyond individual organisations. The vocabulary and classification controls can be adopted within existing frameworks; accreditation criteria and cross-agency notification mechanisms require formal guidance from ASD/ACSC.

**Standardised vocabulary.** Government cybersecurity guidance needs terminology for agentic code failure modes — "fabricated default," "authority tier conflation," "audit trail destruction through defensive patterns" — that practitioners can use in security assessments, risk registers, and accreditation documentation.

**Accreditation criteria for agentic development workflows.** IRAP assessments and similar accreditation processes need criteria for evaluating whether an organisation's use of AI coding agents maintains the security posture required by the system's classification. This includes how agent output is validated before integration, how review effectiveness is maintained under volume pressure, how trust boundaries are verified in agent-generated code, and what attestation is required from human reviewers.

**Agent output classification.** A formal determination of how agent-generated code should be treated in security assessments — what validation is required before it may enter the codebase, what provenance metadata should be retained, and whether the classification should be binary (untrusted/validated) or graduated.

**Model monoculture risk mitigation.** The correlated failure risk from shared models requires community-level coordination: cross-organisational sharing of agent-introduced defect patterns, periodic scanning for correlated failure signatures across codebases, and awareness that independent testing and review assumptions may not hold when the generating model is shared.

**Extend SDLC-equivalent controls to executable logic produced outside formal development teams.** Organisations should catalogue and govern agent-generated plugins, automations, BI extensions, workflow scripts, low-code components, and similar artefacts produced by analysts, operators, and other non-developer staff. Where such artefacts affect trust boundaries, access control, audit trails, or data integrity, they should be subject to provenance, review, and validation controls proportionate to their impact — even when the producers do not consider themselves developers and the artefacts do not live in a formal version control system.

This is the policy response to the governance perimeter problem: the SDLC boundary has expanded, and controls must follow it.

## Incident response for systematic agent defects

Traditional incident response treats each vulnerability as an independent finding: triage, assess severity, remediate, close. Agent-generated defects violate this model because they are correlated — finding one instance of a pattern is strong evidence that the same pattern exists in other agent-generated code, potentially across the entire codebase.

### Triage model

When a semantic violation is discovered in agent-generated code, the first step is pattern characterisation, not instance remediation:

- What is the defect pattern? (e.g., broad `except` on audit-write paths that swallows failures, fabricated defaults on fields in a specific semantic category, external data entering internal stores without validation)
- Is the pattern specific to a single agent session, or is it a training-distribution bias that would recur across sessions?
- What is the blast radius? How many functions, modules, or code paths could plausibly contain the same pattern?

### Scanning protocol

Once the pattern is characterised, the codebase should be scanned for all instances — not just the file or module where the defect was found. If the defect is a training-distribution bias (rather than a session-specific context collapse), the scan should cover the entire agent-generated code population. This is where provenance tracking pays its dividend: without provenance metadata, the scan must cover *all* code; with it, scanning can be targeted to agent-generated regions.

The scan should also look for *related* patterns, not just identical ones. A broad `except` that swallows an audit-write failure (ACF-R1) in one function may co-occur with fabricated defaults on related fields (ACF-S1) and missing trust boundary validation on the same data path (ACF-T1). The same training-distribution bias that produces one context-inappropriate defensive pattern tends to produce others in adjacent code.

### Cross-agency notification

The monoculture argument means that a systematic defect found in one organisation's agent-generated code is a leading indicator for other organisations using the same model. No cross-agency notification mechanism currently exists for this class of finding. Until one does, organisations that discover a systematic agent-introduced defect pattern should consider whether the pattern is model-specific (likely to affect other users of the same model) or project-specific (arising from the interaction between the model and the project's particular context). Model-specific patterns warrant broader disclosure.

### Remediation scope

Remediation of a correlated defect is a single systematic fix, not a collection of independent patches:

1. Add a detection rule to the semantic enforcement tooling that catches the pattern going forward — this stops the inflow
2. Run the new rule against the existing codebase to find all current instances
3. Remediate the instances, prioritised by code path criticality (high-stakes paths first)
4. If the pattern was not caught by existing review processes, investigate why — was it a gap in the review checklist, a habituation effect, or a pattern that the review process is structurally unable to detect without tooling?

Step 4 is the learning step that closes the loop. Without it, the next correlated defect pattern will enter through the same gap.

## See also

- [Open Questions]({{< relref "/threat-model/open-questions" >}}) — unresolved questions for community validation
- [ACF Taxonomy]({{< relref "acf" >}}) — the full catalogue of agentic code failure modes
