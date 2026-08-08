---
title: "Open Questions"
weight: 8
---

This section identifies what the paper does not resolve — governance mechanics, evidence thresholds, and research directions that require community input. It is structured as a discussion agenda, not as analysis. The 17 questions below are grouped by type:

- **Governance and operational questions** — genuinely unresolved
- **Positions with outstanding nuances** — the paper advances a position but the edges are unresolved
- **Deferred scope** — topics acknowledged but not developed

Only a small number bear on whether organisations should act at all; most bear on how controls should be implemented, evidenced, and governed once the case for action is accepted.

Individual failure patterns are mitigable, but the underlying generative condition — bounded context, selective salience, compression of prior state — is architecturally load-bearing. The questions below should be read as governance challenges arising from conditions that are structurally present in agentic development, not as gaps awaiting closure.

## Governance and operational questions

These are genuinely unresolved. The paper advances no position on them beyond identifying the problem.

### Accreditation burden

**What accreditation evidence is appropriate for organisations using agentic coding in PROTECTED or higher systems?**

Organisations already review code before integration — that is not new. What is new is that the *kind* of review required is different (semantic, not just syntactic) and the *volume* makes maintaining review quality harder. The genuinely unresolved questions are operational:

- What evidence threshold demonstrates that review quality is maintained under agent-generated volume — not just "we have a review process" but "here is evidence the process catches the failure modes in the ACF taxonomy"?
- Must the validation boundary itself be assessed? If an organisation builds or adopts automated semantic enforcement tooling, does that tooling become part of the assessed system — and if so, what verification properties must it demonstrate?
- How should accreditation criteria distinguish between organisations at different validation maturity stages without creating perverse incentives to avoid adopting tooling that would then require assessment?

### Review quality measurement

**How should organisations measure review effectiveness under agent-generated volume?**

Candidate metrics include:

- **Defect escape rate:** How many agent-introduced defects are found post-review? Requires knowing the total defect count, which requires a detection mechanism independent of the review process — a circular dependency that current practice has not resolved.
- **Review depth sampling:** Periodically audit review decisions for thoroughness. Resource-intensive but directly measures quality.
- **Automated pre-screening coverage:** What percentage of the failure modes are caught by automated tools before reaching human review? Does not measure review quality directly but measures how much the review process is being supplemented.
- **Time-per-change metrics:** Review duration per lines changed. A leading indicator — if review time per change is declining while change volume increases, review quality is likely degrading.

### Cross-organisational standards

**What form should a common agentic code security standard take?**

The case for *some* standard is clear; the genuinely open questions concern its form and scope. A common standard — even a lightweight one — would provide four things organisations cannot build independently:

- A shared vocabulary for discussing agentic code risks (the ACF taxonomy is a candidate starting point)
- A minimum bar for controls that all agencies using agentic coding must implement
- A basis for mutual recognition of agentic development practices across agencies
- Consistency in IRAP assessment criteria for agentic workflows

The non-trivial daily violation rate reported in empirical observations represents patterns that are not currently shared with other organisations, because no dedicated mechanism exists to make participation easy. The DTA's Australian Government Architecture provides a natural candidate home — its existing cross-government standards role could accommodate a shared taxonomy, an intake channel for reporting findings, and visibility that encourages other organisations to look for them. The open question is not whether to build the mechanism but how to scope it: lightweight registry, structured reporting channel, or full community of practice.

The counterargument: standardisation too early may lock in controls that prove inappropriate as the technology evolves rapidly. A vocabulary standard and minimum control set may be more durable than detailed prescriptive requirements.

### The correlated failure problem

**How should risk models be adapted for correlated failures in agent-generated code?**

Agent-generated defects are correlated, not independent. Traditional risk models assume that a bug in one function does not predict a bug in another; agent-generated code violates this assumption. The genuinely open questions concern how existing risk and triage models should be adapted:

- **Testing strategy:** Independent sampling (testing a random subset of functions) underestimates defect rates when failures are correlated. If you find a trust boundary violation in one agent-generated function, the probability that the same violation exists in other agent-generated functions is much higher than if a human had written them.
- **Risk assessment:** The risk of a single agent-generated defect may be low, but the risk of a *systematic* defect affecting dozens or hundreds of functions is qualitatively different. How should risk registers capture correlated agent failure risk?
- **Remediation scope:** When a defect pattern is found in agent code, remediation should not be limited to the specific instance. The entire codebase should be scanned for the same pattern — because correlated failures mean the pattern is likely repeated.
- **Triage model:** Correlated failures mean 50 instances of the same rule across a codebase is one systematic issue requiring a systematic fix, not 50 independent tickets.
- **Cross-model interaction:** Even where organisations diversify across models, the risk may not reduce to independence. Defects from different models could compose — for example, one weakening a validation boundary while another adds a reassuring default that normalises the resulting anomaly. Model diversity strategies require analysis of *lineage independence*, not merely model count.

An open research question: what observable behavioural markers would distinguish genuinely independent training lineages from derived variants? Without a methodology for assessing lineage independence, the policy implication — that agencies should not assume different products equal different lineages — cannot be operationalised.

### Contracted development governance

**What governance mechanisms are needed for contracted development using agentic tools?**

The structural significance of contracted development — most government code enters through commercial delivery chains, not in-house teams — is developed in the [guidance gap analysis]({{< relref "/threat-model/guidance-gap" >}}). What remains genuinely unresolved is the governance machinery:

- **Cross-contract correlation discovery:** if agency A and agency B contract the same provider using the same agent tooling, what mechanism would surface that correlation? Neither agency may know the other's supplier arrangements, and no cross-government registry of contractor AI tooling usage currently exists.
- **Assurance ownership at the boundary:** when a contractor delivers agent-generated code, who owns the semantic assurance — the contractor's internal review, the agency's acceptance review, or both?
- **Procurement flow-down for ISM-2074:** how should AI usage policy requirements flow through procurement and subcontracting chains?
- **Disclosure incentives:** contractors may be reluctant to disclose agent usage if they perceive it as a reputational risk or competitive disadvantage. What incentive structures or contractual safe harbours would encourage transparent disclosure rather than concealment?

A related shift: agentic AI is also lowering the barrier to in-house code production — through technical staff using agents and through non-developer power users. If the balance between contracted and in-house code shifts, agencies must address agentic code risks in both their contracted deliverables and their expanding internal code production simultaneously.

### Legacy modernisation and implicit security properties

**How should organisations assess and preserve implicit security properties during agent-assisted legacy modernisation?**

Legacy systems often encode security properties accidentally — a COBOL program that crashes on a NULL field enforces, without intending to, a crash-on-corruption principle that high-stakes systems require deliberately. When agents refactor or translate legacy code into modern languages, they replace that rigidity with idiomatic defensive patterns (null coalescing, optional chaining, default values) — replacing institutional knowledge baked into the old code's behaviour with standard defensive patterns that lack the same properties.

This raises questions that current modernisation guidance does not address:

- How should organisations catalogue the implicit security properties of legacy systems before agent-assisted modernisation begins? What methods exist for distinguishing accidental-but-load-bearing behaviour from genuinely obsolete rigidity?
- Should agent-assisted modernisation require a "security property preservation plan" analogous to a data migration plan — documenting which behaviours must be preserved, which can be relaxed, and which must be explicitly replaced with equivalent controls?
- What validation evidence should demonstrate that a modernised system preserves the security properties of the system it replaces, when those properties were never formally specified?

### Citizen programmer governance

**How should organisations govern executable logic produced by non-developers outside formal SDLC channels?**

The governance perimeter problem — and its extension to SQL — raises several unresolved questions. This paper proposes extending SDLC-equivalent controls to this population; the companion *Practical Guide* provides worked examples for non-specialist review. Existing controls assume a population that recognises itself as producing software; citizen programmers typically do not. Key questions for community discussion:

- What minimum controls are proportionate for executable logic produced outside the SDLC — particularly when the producer already holds legitimate data access permissions?
- Should organisations maintain a registry of agent-generated artefacts produced outside formal development channels? If so, what discovery mechanisms are practical?
- How should the autonomy self-assessment be adapted for populations that do not identify as developers?

### Tool verification recursion

**How do you verify the correctness of security tools that are themselves built by agents?**

If the security enforcement tool is itself built by an agent, the tool's correctness is subject to the same threat model it exists to address. This recursive problem applies to any agent-built verification infrastructure — linter rules, test factories, CI gate logic, security scanners.

The question is not whether agent-built tools can be correct (they can), but what verification evidence is sufficient:

- Is the golden corpus / self-hosting gate / measured precision approach adequate for tools that encode security-critical institutional knowledge?
- Should there be a higher assurance bar for agent-built tools that serve as trust boundaries in the development pipeline — analogous to the higher verification requirements for safety-critical systems?
- At what point does the recursion bottom out? If the tool is verified by tests, and the tests were written by an agent, the verification chain eventually requires a human-verified anchor. What constitutes an adequate anchor?

### Testing strategy under agentic generation

**How should testing strategy change when agents generate both the code and the tests?**

When agents generate both the code *and* the tests that verify it, the independence assumption collapses. The same training-distribution biases and context limitations that produce semantically incorrect code also produce tests that verify the wrong properties.

Three distinct failure modes merit attention:

- **Closed verification loop.** When a single agent session produces both implementation and test suite, the tests inherit the same context frame as the implementation. If the agent's context has collapsed such that it treats a missing classification as a legitimate default scenario, the tests will verify that the default is correctly applied — not that the default is semantically inappropriate. The test passes. The CI is green. The verification is circular.

- **Coverage illusion.** Agent-generated test suites tend to have high line coverage and high branch coverage — metrics that organisations use as quality proxies. But coverage measures *which code paths are executed*, not *which semantic properties are verified*. A test suite with 95% coverage that never checks whether a trust boundary is maintained, whether an audit trail is preserved on the error path, or whether a default fabricates authoritative data provides high coverage of the wrong properties.

- **Verification displacement (ACF-R3).** Two related patterns: (a) an agent replaces real dependencies with mocks or stubs that return expected values, converting an integration test into a test that proves the mock works; and (b) an agent writes tests that verify already-degraded behaviour — testing that the code does what it currently does rather than what the system requires, without exercising the original intent (the [cross-model defects analysis]({{< relref "/appendices/cross-model-defects" >}}) documents this dynamic in the cross-model defect chaining context, where tests written around softened behaviour cement the degradation). Both patterns share the same underlying failure: under context pressure, agents resolve test failures by changing what the test verifies rather than by fixing the code the test is meant to check. The detection signatures — tests where real objects have been replaced with predetermined return values, or tests whose assertions match the implementation's current behaviour without testing the specified requirement — are specific enough for tooling but not yet encoded in standard review practice.

These failure modes raise testing questions that current guidance does not resolve:

- Should agent-generated tests be treated as untrusted input requiring their own validation boundary?
- Should tests for high-stakes code paths be written or reviewed independently of the code they test?
- How should the testing pyramid adapt when agents collapse the cost differential between unit and integration tests?
- What role should property-based and mutation testing play as meta-verification — testing whether the tests themselves are meaningful?

The paper's position is that the testing gap is at least as important as the review gap — high test coverage should not be treated as evidence of adequate verification without examining *what* the tests verify.

## Positions with outstanding nuances

The paper is not neutral on the following questions. It advances a position on each — but the edges are unresolved and the community may reasonably disagree on scope, calibration, or evidentiary weight.

### Static vs. runtime assurance

**The paper argues for authority-tier-aware static analysis as the primary enforcement mechanism. The open question is scope, calibration, and evidence threshold.**

Static analysis can detect structural patterns but cannot verify semantic correctness in all cases. Runtime verification provides stronger guarantees but introduces performance overhead and operational complexity. The paper's position is that a middle ground — authority-tier-aware static analysis as the primary enforcement mechanism, tracking where data came from and what validation it received without introducing production runtime dependencies — is the appropriate starting point for government systems. The outstanding nuance is whether static analysis alone provides sufficient assurance for a given classification level — a policy question, not a technical one.

### Agent self-regulation

**The paper argues that structured perspective diversity provides meaningful — but not formally validated — assurance. The open question is what evidentiary weight it should carry.**

A single agent checking its own output is not meaningful validation — the same biases that produced the code will evaluate it. But a *structured ensemble of prompted perspectives* is a different proposition: the reviewing agents share the generator's underlying model biases, but their prompted analytical frames constrain *what they attend to*, producing coverage across different subsets of the failure taxonomy.

The outstanding questions are whether this kind of prompted perspective diversity constitutes "validation" in a formal assurance sense, whether agents can meaningfully check for the failure modes they are predisposed to produce, and whether pre-review self-checking improves human review quality (by filtering noise) or degrades it (by creating false confidence that the easy problems are already caught).

### Productivity evidence and policy thresholds

**The paper argues that the precautionary case is sufficient for action. The open question is what additional evidence would change implementation choices — not whether action is justified.**

The productivity evidence base remains mixed and may not generalise cleanly to current autonomous agents. But the paper's position is that waiting for stronger empirical evidence before issuing controls is not justified when the potential for systemic harm is this structurally embedded. The questions that remain genuinely open are:

- What would constitute adequate evidence that agentic code risks are *not* materialising — and would that evidence be observable before an incident?
- How should the rapid evolution of agent capabilities affect the design of controls — should controls be capability-indexed (triggered by what the agent can do) or incident-indexed (triggered by what has gone wrong)?
- What additional productivity and security evidence would change the *shape* of controls rather than the case for having them?

### Semantic divergence as a pre-review triage mechanism

**The paper proposes semantic divergence as a candidate research direction for pre-review triage. The open questions are empirical.**

Agent-assisted code review tends to collapse into surface approval — the reviewing model sees convention-conforming code and classifies it as acceptable, reproducing the habituation dynamic identified in human reviewers. A structurally different approach would replace classification with generation: give a second model the same task specification, policy annotations, and architectural context, and ask it to independently produce the implementation it believes is correct. Comparing the two along policy-relevant semantic axes (where defaults are introduced, where exceptions are caught, where validation boundaries appear, whether tests exercise real behaviour) yields a divergence signal that can triage code paths for mandatory human review.

This targets **context collapse during generation**, not training-distribution bias — a second model given full context from a fresh state may diverge from an original generated under degraded context, but both models may share the same wrong priors and converge on the same incorrect answer. Machine-readable policy annotations strengthen the signal by reducing hidden semantics.

Key questions:

- Does semantic divergence correlate with true defects better than prompted review?
- What is the false-reassurance rate from shared model bias — how often do two models agree on the same context-inappropriate pattern?
- Is the approach more effective as a per-function check or as a module-level architectural comparison?
- What minimum annotation density is needed before the divergence signal becomes useful?

## Deferred scope

The following topics are acknowledged but not developed. They are flagged here so that future work can address them without the gaps being mistaken for oversights.

### Multi-agent and orchestrated workflows

This paper models a single agent generating code for human review. In practice, emerging frameworks enable workflows where one agent generates code, another reviews it, and a third writes tests — with minimal human involvement at each stage. This architecture amplifies the correlated failure problem: if the generating and reviewing agents share training data, training biases, or architectural assumptions, the review agent may be systematically blind to exactly the failure modes the generating agent systematically produces. The compounding effect is also magnified — failures can compound across agent boundaries before any human sees the output.

Organisations deploying multi-agent development workflows should consider the possibility that the failure modes described here are amplified, not mitigated, by adding more agents to the pipeline.

### SQL and database-level risks

SQL uniquely bypasses the validation boundary — a SQL query that returns wrong results produces no error, no exception, and no log entry. The outstanding questions — whether database-level enforcement warrants a distinct control category, and what governance model is appropriate for SQL produced by BI platforms and reporting tools — are identified but not further developed here. See the [SQL Extension]({{< relref "/appendices/sql-extension" >}}).

### Controls across the autonomy spectrum

The autonomy self-assessment provides an informal framework for organisations to identify their position on the agent deployment spectrum. The outstanding governance questions — whether controls should be formally tiered by autonomy level, how organisations should manage transitions between levels, and how code developed at different autonomy levels should be treated at integration boundaries — are acknowledged but not developed. See the [Autonomy Self-Assessment]({{< relref "/appendices/autonomy-assessment" >}}).

### Sandbox adequacy and execution authority trade-offs

Sandboxing is always a trade-off between constraint and capability. Several questions arise:

- **What constitutes "effective sandboxing"?** Is filesystem isolation sufficient, or must network access, process execution, and environment modification also be constrained?
- **Can agents circumvent sandbox boundaries?** Agents that can write arbitrary files can potentially modify configuration that affects their own execution environment — creating scripts that will be run by CI, modifying `.bashrc` or equivalent, or writing to paths that other processes watch.
- **How should organisations evaluate sandbox implementations?** No standard evaluation criteria exist for assessing whether a given sandbox implementation is adequate for a given risk context.
- **What is the right trade-off between sandbox strictness and agent productivity?** Tighter sandboxes reduce risk but also reduce the agent's ability to perform complex tasks.

These questions are related to but distinct from controls across the autonomy spectrum. The autonomy spectrum addresses how much the agent decides *what* to do; the sandbox question addresses how much the agent is *permitted* to do once that decision is made.

## Closing

Most of the unresolved items in this section are not objections to the paper's thesis. They are the next layer of operationalisation — the governance mechanics, evidence thresholds, and institutional machinery that must be worked out once the case for action is accepted. An organisation waiting for every question above to be answered before acting will be waiting while agent-generated code continues to enter its systems through every channel this paper describes. The questions that bear on *whether* to act are addressed: the precautionary case is sufficient and the structural conditions are not transient. The remaining questions bear on *how* to act — and they are best resolved through the kind of community engagement this paper exists to invite.
