## 2. The Threat Is Not What You Think

*This section establishes the analytical framework: what the threat is, why it differs structurally from the supply-chain model, and what makes it dangerous. Policy readers who accept the Executive Summary's framing may skim §2.1–§2.2 and focus on the concrete example in §2.3.*

### 2.1 The intuitive threat model (incomplete)

When organisations evaluate the risk of AI-generated code, the intuitive threat model is straightforward:

> *"The AI might write malicious code — backdoors, data exfiltration, supply chain attacks."*

This threat is real but well-understood. It maps directly to the existing software supply chain threat model with a faster generator. Existing controls — code review, static analysis, dependency scanning, penetration testing — address it, albeit with increased volume pressure.

### 2.2 The insidious threat model

This section focuses on autonomous and semi-autonomous agents as defined in §1.3 — not inline autocomplete, which produces isolated suggestions within a human-directed editing session. While autocomplete introduces volume, agents produce *correlated* errors across modules because a single session generates multiple interdependent functions from the same context and training biases. The distinction matters: the threat model below depends on correlation, scale, and review-pipeline pressure that autocomplete does not produce to the same degree.

The threat applies to *specific code paths within systems*, not to entire systems or sectors end-to-end — the same system contains both high-stakes and non-high-stakes paths, and agents apply defensive patterns uniformly across both.

The more dangerous threat is subtler:

> *"The AI writes code that follows patterns generally regarded as good practice — defensive, robust, convention-conforming — and applies those patterns uniformly, including in the high-stakes contexts where they are catastrophic."*

Even "plausible-but-wrong" understates the problem. In many cases, the code is not merely plausible — it is conventionally reasonable by the standards of the vast majority of software. Defensive programming is considered good practice, and agents are exceptionally good at it. The problem is not that agents produce sloppy work. It is that they produce excellent work calibrated to the wrong context. A high-availability emergency dispatch system is high-stakes on its data-integrity and audit paths but correctly uses defensive programming on its service-continuity paths — the same system contains both. Conversely, a consumer application that "does not need to be high-stakes" still has authentication, payment handling, and audit logging paths where silent corruption is unacceptable. Agents apply defensive patterns *uniformly* across paths that require different failure semantics, and no tool in the standard assurance stack distinguishes one from the other.

Even in ordinary software, defensive patterns routinely conceal significant bugs that no one ever finds. In high-stakes systems, the same concealment is catastrophic: defensive patterns become **defensive anti-patterns**.

This threat is distinct from the supply chain model in four critical ways:

**It is not adversarial.** The agent is not trying to compromise the system. It is producing its best output based on training data that is overwhelmingly composed of open-source code without the properties high-stakes systems require.[^training-data-properties] The agent reproduces the patterns it learned — which are the patterns that represent good practice in the vast majority of non-high-stakes software.

**A note on analytical framing.** This is structurally closer to a *safety engineering* problem than a security engineering problem: an emergent failure arising from components working as designed rather than an adversary acting against the system. The distinction explains why the paper's recommendations look more like safety controls (barriers, interlocks, degradation modes) than security controls (access control lists, encryption, signature verification). Appendix G §G.1 develops this framing.

**It largely falls outside existing detection — not because tools merely need better rules, but because no standard tool category is designed to detect it.** The generated code is syntactically valid. It passes type checkers, linters, and unit tests. It follows project conventions (agents are good at pattern-matching the surrounding codebase). By the automated measures most organisations currently rely on, it presents as "correct code." The failure is semantic — the code does the wrong thing in the high-stakes context while doing the right thing in every other context. Each tool in the stack addresses a different structural property,[^tool-enumeration] but none of these can determine whether a `.get()` default is institutionally appropriate, whether an exception handler preserves an audit trail, or whether data crossing a trust boundary has been validated. Catching these failures requires a new category of automated verification — one that encodes system-specific invariants and domain semantics as enforceable rules — and that category does not yet exist in standard tooling.

**Why no one built it.** The gap is not an oversight. Semantic correctness — understanding what the code *should do* in its institutional context — has traditionally been carried by the human author. Tools were built to check syntax, structure, and known defect patterns, not whether a system was implementing the right institutional meaning. Until now, a human author was usually in the loop at the point of creation as well as review, and that author supplied the context that determined whether a default was helpful or catastrophic.

The agent does not reliably carry that context, and the volume means the reviewer is now being asked to reconstruct it after the fact across far more output than review processes were designed to absorb.

**The absence of reported incidents does not imply absence of impact — and this model explains why.** To be clear: "no one has reported this problem" is not, by itself, evidence that the problem does not exist. But the failure modes described in this paper — silent data corruption, trust boundary violations masked by defensive patterns, audit trails that record fabricated defaults as real values — are specifically the kind that *do not produce observable incidents*. A traditional vulnerability creates a detectable event: a crash, an intrusion alert, an anomalous log entry. A `.get()` that silently returns `"OFFICIAL"` for a missing classification field produces no crash, no alert, and a log entry that looks entirely normal. The system continues operating with a confident wrong answer.

The question is not "has this caused a breach?" but "would we know if it had?"

For organisations that lack semantic boundary enforcement tooling (§7.2), the answer depends entirely on the diligence, domain expertise, and sustained attention of their human reviewers — traits that degrade predictably as the volume of plausible, convention-conforming code increases (§4.2). The estimated violation rate reported in §8.3 — from a single project with such tooling — suggests the phenomenon is occurring at a non-trivial rate that would be invisible without purpose-built detection. This is not a claim that all projects face the same rate; it is evidence that detection requires purpose-built tooling that most projects do not yet have. Whether that rate generalises beyond the observed project is an open empirical question (see §1.4, replication protocol).

**It scales with the benefit.** The faster agents generate code, the more good-practice-in-the-wrong-context code enters the review pipeline. The same velocity that makes agents productive makes them dangerous — and the systems where the stakes are highest are often the systems with the most domain-specific security context that agents lack, the most compliance overhead that generates review fatigue, and the most code volume from modernisation and remediation efforts. The benefit and the risk are the same mechanism, and they concentrate in the same places.

The control problem is not one of review effort but of review *type*. This paper is not arguing for a return to artisanal code review by exhausted humans peering harder at larger diffs. The standard assurance stack is well-shaped for code that is obviously broken, stylistically irregular, or known-vulnerable. It is poorly shaped for code that is locally correct-looking yet semantically wrong for a specific trust context — and that is precisely what agents produce. This paper's proposed response is to build the missing layer: checks that can determine whether a default is fabricating authoritative data, whether an error handler preserves or destroys the audit trail, and whether data has crossed a trust boundary without validation. Those questions require encoding the system's security-relevant distinctions — which paths are fail-fast, which data is authoritative, where the trust boundaries lie — in forms that tooling can act on. Human review remains necessary for adjudicating meaning and exceptions, not as the primary detection mechanism. The response landscape is developed in §7.

**A necessary clarification on "defensive" vs. "offensive" programming.** This paper does not argue against defensive programming. It argues that the same system contains both kinds of path — an emergency dispatch system should degrade gracefully on a malformed UI field but should *not* degrade gracefully on a corrupted incident record — and LLMs do not reliably distinguish which is which. The result is uniform defensive behaviour across paths that require different failure semantics (formalised as four coding postures in the companion specification, §4.1).[^defensive-offensive-examples]

Crucially, this collapses the authority model at both ends: unvalidated external data is given more authority than it has earned, while authoritative internal data is treated as more negotiable than it is allowed to be — simultaneously too permissive at the perimeter and too casual at the core. §5 formalises this as bidirectional authority collapse under the authority-tier model.

### 2.3 A concrete example

Consider a government system that processes security classifications:

```python
# Best: fail fast with diagnostic context
def get_document_classification(record):
    if "security_classification" not in record:
        raise DataIntegrityError(
            f"Missing security_classification for document {record.get('id', '?')}. "
            f"This is a data integrity failure — investigate the source system. "
            f"Fields present: {sorted(record.keys())}"
        )
    return record["security_classification"]
    # The error message is the incident response runbook.

# Acceptable: bare access, but poor diagnostics
def get_document_classification(record):
    return record["security_classification"]

# Agent-authored (plausible, test-passing, catastrophically wrong)
def get_document_classification(record):
    return record.get("security_classification", "OFFICIAL")
    # This "works" — no crash, no error, tests pass.
    # The default does not cause a misclassification on its own.
    # But if an upstream fault ever drops the classification field,
    # the crash that would have caught it is now gone — a PROTECTED
    # document silently becomes OFFICIAL and is treated accordingly.
```

The three versions illustrate a spectrum. The fail-fast version turns a missing field into an actionable incident — the operator knows which document, what data was present, and what to investigate. The bare access version at least crashes, which is correct behaviour for a data integrity failure, but the operator gets a generic `KeyError` with no diagnostic context. The agent-generated version is the worst outcome: it does not crash when the field is absent, silently fabricating a classification that downstream access control decisions will treat as authoritative if an upstream fault ever removes it.

**The `.get()` default does not, by itself, cause a document to be misclassified.** Under normal operation — when the classification field is present — all three versions produce the same correct result. The danger is latent: the default converts a future upstream fault (a dropped field, a schema migration, a serialisation bug) from a visible crash into a silent downgrade. The first two versions would surface the fault immediately; the third absorbs it. This is not a "security hole" in the conventional sense — it is the removal of an ad hoc safety net (a crash that would have surfaced the fault). The violation rate reported in §8.3 counts these latent removals, not active breaches.

The agent-generated version:

- Is syntactically valid Python
- Passes every unit test (the default prevents even downstream and integration tests from detecting a problem)
- Follows the `.get()` pattern that appears in millions of Python files in the agent's training data
- Would pass an ordinary code review unless the reviewer is specifically trained to recognise this class of failure
- Silently absorbs upstream data integrity failures that the first two versions would have surfaced — converting a detectable crash into a silent downgrade

The following table illustrates the same defensive programming pattern — detect missing data and substitute a reasonable default — across three domains. The code pattern is identical in each case. The consequences diverge because the semantic meaning of absence differs.

| Stage | Consumer application | Government security | Clinical safety |
|-------|---------------------|---------------------|-----------------|
| **User action** | User sets location in a weather app | Employee assigns classification before sending an email | Patient reports penicillin allergy |
| **Underlying data state** | Location stored in app preferences | Classification stored in message metadata | Allergy status stored in patient record |
| **Failure event** | App crash corrupts configuration | Network or processing fault drops classification field | Storage fault corrupts allergy record |
| **Defensive behaviour** | App detects invalid configuration and substitutes location from device GPS | Mail system detects missing classification and inserts a default (`OFFICIAL`) | System detects missing allergy field and substitutes empty list (`[]`) |
| **Outcome** | User sees correct weather despite configuration loss | Classified material is transmitted at the wrong classification level | Clinical decisions proceed as though no allergy were recorded |
| **Semantic meaning of absence** | Missing preference — recoverable from another source | Missing classification — integrity failure requiring investigation | Missing allergy data — unknown status, not a negative finding |
| **System impact** | Harmless convenience | Confidentiality breach through silent downgrade | Patient safety risk through fabricated clinical knowledge |

The first column is correct defensive programming. The GPS fallback genuinely recovers the missing information from an alternative evidentiary source — the user's location is knowable independently of the corrupted configuration. The second and third columns apply the same logic where it is catastrophically wrong, because the missing value cannot be recovered by substitution. It can only be investigated or surfaced as explicitly unknown.

The core failure in both dangerous cases is a **category error between program state and domain state**. In program terms, a missing field is merely an absent value. In domain terms, a missing classification is an integrity failure, and a missing allergy record is not a negative finding but an unanswered question. Defaulting the field converts an unanswered question into a confident answer, and downstream systems then treat that fabricated answer as authoritative data.

This is the distinction agents do not reliably make. The `.get()` with a default, the `COALESCE()` with a fallback, the `Optional.orElse()` with a substitute — the syntax is identical across all three columns. The difference requires *both* kinds of knowledge that are absent from the code: domain knowledge (a missing allergy record is an unanswered clinical question, not a negative finding) and institutional knowledge (this system must surface the absence as an explicit unknown, not paper over it with a default). Neither is expressed in the syntax, rarely in the type system, and only inconsistently in training data. The knowledge lives in the operational meaning of the system itself — and agents do not have access to it unless it is encoded in machine-readable form (§7.2).

**The lifecycle of a latent defect.** The danger of the agent-generated version is not that it immediately produces wrong results — under normal operation, the classification field is present and all three versions behave identically. The danger is latent: the default converts a future upstream fault into a silent downgrade. A team uses AI to build a reporting query. The AI fills in the missing-field path with a default value — "OFFICIAL" — because that is what millions of codebases in its training data would do. The query runs for weeks. No error is ever raised. Then an upstream fault — a device failure, an integration error, a serialisation bug — corrupts the security classification on a handful of records, leaving the field empty. The code that should have flagged the missing data instead silently defaults those records to OFFICIAL. PROTECTED documents are now processed at the wrong level — and nothing in the system distinguishes them from records that were always OFFICIAL. An audit eventually finds the discrepancy, but by then the corrupted records have propagated through downstream reports. The AI did not introduce an active security hole — it removed an ad hoc safety net. The crash that would have surfaced the upstream fault was replaced with a silent default. The structural weakness was latent for weeks; the incident required a second failure to activate it, and when that failure arrived, nothing caught it.

The first two code versions would have caught the upstream fault immediately — a `DataIntegrityError` or a `KeyError`. The third absorbed it.

The example is fictitious but not contrived. Defaulting to the lowest classification is exactly a reasonable early-delivery implementation — particularly if the system is initially scoped to handle only OFFICIAL data, or if the requirement to support higher classifications is documented in a backlog item rather than enforced in the schema. The agent produces this pattern because it *is* reasonable practice in the vast majority of codebases in its training data. The danger is that the default survives into a context where the system now handles PROTECTED material, the schema still permits missing values, and no one revisits a function that "works." This is the pattern that defensive programming produces by default in Python, and agents are trained on defensive Python.[^acf-s1-nav]

Human developers produce this pattern too — through drift, copy-paste, or stale assumptions. The difference is that a human who defaults a field such as `allergies` has typically failed to apply context that was in principle available to them. An agent may generate the same pattern without the domain context remaining active at the point of generation — and because the model is opaque, the reviewer cannot tell which occurred. The reviewer sees only the artefact. In transformer-based systems, the issue is not merely whether the relevant context appears somewhere in the prompt, but whether it remains active in generation rather than being displaced by stronger local statistical cues. For a human, this is usually a failure to respect context. For an agent, it may be a failure to retain context at all.

### 2.4 What is fundamentally different about agentic code

The threat model for agent-generated code is not simply "human-authored code but more of it." Several properties are qualitatively different:

#### (a) Limited persistent learning

A human developer who receives review feedback on a trust boundary violation learns from it and is less likely to repeat the mistake. Agents have limited or no persistent memory across sessions. The practical consequence is stark: the agent is not circumventing project rules, and it is not ignoring instructions — it followed them perfectly in the last session. It simply does not *have* a last session. Every invocation is the first day on the job,[^first-day-nuance] and on the first day, the agent writes `.get()` with a default because that is what Python looks like in the training data. Transcript evidence (Appendix E, §E.7) suggests the mechanism is more precise than uniform forgetting: agents appear to apply some constraints structurally (as automatic checks) while treating others as conventions (applied when salient but displaced under context pressure). The underlying mechanism is selective constraint prioritisation — a harder problem than uniform context loss, with different intervention implications, because it means session resets do not reliably restore the constraints the agent deprioritised.

Some agent frameworks now support project-level instructions (system prompts, documentation files, memory stores) that provide partial mitigation. An agent can be told "do not use `.get()` on audit data" and will follow that instruction within a session. But these are explicit rules, not internalised judgment. The agent cannot generalise from "do not use `.get()` on audit data" to "do not fabricate defaults anywhere that data absence is meaningful" unless that generalisation is also spelled out.

Every correction must be encoded as a rule; the agent does not learn the *principle* behind the correction. This means that *review feedback improves the generator only to the extent that it is captured as machine-readable rules* — and the coverage of those rules is always trailing the set of possible failure modes.

This has a direct consequence for governance. Current assurance frameworks assume that corrective action is durable — identify a defect class, train the developer, and the problem stays fixed. With agent-generated code, every correction lasts only until the next session. With human developers, training works: teach someone not to do X, and they stop doing X. With AI tools, every correction expires when the session ends. The defect is not fixed; it is caught — and it must be caught again tomorrow, and every day after that, for as long as the tool is in use. The durable intervention is not training the developer but encoding the detection as an automated rule. This shifts the governance model from "train and trust" to "detect and enforce" — a fundamental reorientation that §7.2 develops in detail.

The same problem compounds in multi-session and multi-agent workflows: each handover crosses a context boundary, and any agent output that defers action to a future session is making a continuity assumption that the architecture does not guarantee. A reviewing agent that triages findings as "fix during implementation" implicitly assumes the implementing agent will have the review findings — but the implementing agent starts a fresh session with the specification as input, not the review. Unless the review findings are written *into* the specification, the deferred items are silently dropped — the artefact looks complete, the triage looks prioritised, and the gap is invisible until the implementing agent reproduces the exact patterns the review flagged. Appendix A catalogues this as a provisional candidate mode: ACF-R4 (Context Handover Assumption).

#### (b) Consistent surface quality

Human code has variable surface quality — hasty code looks hasty, careful code looks careful. Reviewers use surface quality as a signal for where to focus attention. Agent code has uniformly high surface quality regardless of semantic correctness — and worse, the dangerous patterns follow the same conventions that reviewers are trained to approve: a well-structured `.get()` with a sensible default, a clean `try/except` with logging. A function with a critical trust boundary violation looks exactly as polished as a function without one. The reviewer's natural calibration signal — "this code looks sloppy, I should look more carefully" — is absent, and the surface quality actively works against scrutiny.

#### (c) Pattern completion, not intent

A human developer writing `record.get("security_classification", "OFFICIAL")` has either made a deliberate design decision (the default is intentional) or made an error (they did not think about the missing-field case). The distinction is visible in context — comments, commit messages, design docs. An agent writing the same code is completing a pattern from training data. The agent has no design intent. There is no commit message that explains why the default is correct, because the agent did not decide it was correct — it predicted it was the next likely token.

**Intent-based review ("why was this written this way?") is insufficient for agent code** — the agent has no design intent to interrogate, so the traditional mechanism for distinguishing deliberate decisions from errors is unavailable. Context from architecture documents, interface contracts, preceding commits, and system prompts can inform outcome-based review, but the review question must shift from "why did the author write this?" to "is the behaviour correct for this context?"

#### (d) Correlated failure modes

When ten human developers write code for a system, their errors are largely independent — different people make different mistakes. When an agent generates ten functions, its errors are *correlated* — the same training data biases produce the same failure modes repeatedly. A single systematic bias (e.g., "always use `.get()` with a default") produces correlated vulnerabilities across the entire codebase. This is not the independent-error model that code review and testing strategies are designed for.

The correlation extends beyond individual codebases. When a government agency and its five contracted suppliers all use the same AI tool — or different tools trained on substantially overlapping data — they all get the same blind spots. This is not five independent risks. It is one risk expressed five times. A vulnerability class that occurs sporadically in human-authored code becomes a widespread pattern when every AI tool produces it identically, and a single class of defect can be present across multiple systems simultaneously, discovered simultaneously, and — if adversarially targeted — exploited simultaneously. This is a qualitatively different risk profile from the diverse, uncorrelated mistakes that existing assurance frameworks were designed to manage.

#### (e) No fatigue, no shortcuts, but also no judgment

Agents do not get tired, do not take shortcuts under deadline pressure, and do not introduce bugs from distraction. But they also do not exercise judgment about which patterns are appropriate in which contexts. A human developer who is tired might introduce a bug in one function; an agent that lacks context will introduce the same incorrect pattern in every function it generates. The failure mode is not degradation under pressure — it is *systematic misapplication of context-inappropriate patterns*.

#### (f) Task-frame reconstruction under context pressure

The preceding properties describe agents applying patterns without contextual judgment. This property describes agents producing output consistent with *a different understanding of the task* than the one originally specified. When an agent operates under context pressure — long sessions, compacted history, multi-step plans that exceed the context window[^vaswani-context] — it does not simply forget earlier steps. It produces output consistent with a coherent but shifted task frame, and the shifted frame may not match the original plan. The term "reconstruction" describes the observable pattern — output that is internally consistent with a task definition the agent was not given — rather than claiming a specific cognitive mechanism.[^reconstruction-caveat]

The practical consequence is observable in a specific code pattern: tests that were written to verify real behaviour are "fixed" by replacing real dependencies with mocks that return expected values. The agent's original task frame was "implement this integration and test it." Under context pressure, the frame shifts to "make this test pass." In the new frame, replacing a real API call with a mock that returns `{"status": "ok"}` is a legitimate fix — the test passes, the CI is green, the task is complete. The test is now proving that the mock works, not that the integration works. The agent has not suppressed an error or fabricated data — it has resolved the problem by redefining what problem it is solving.

This is distinct from spurious field access (ACF-S2), where the agent's model of the code is wrong. Here the agent's model of the code is internally consistent — it is the agent's model of *the task* that has shifted. A human developer who replaces a real dependency with a mock knows they are writing a unit test, not an integration test, and can explain the trade-off. An agent that has reconstructed its task frame cannot make that distinction, because in its current frame, the mock *is* the implementation.

The detection signature is specific: tests where real objects have been replaced with mocks or stubs that remove the test's ability to catch the failure it was originally written to detect. The risk is highest when the test and the code under test were written by the same agent in the same session, because the agent's shifted task frame shapes both the implementation shortcut and the test that validates it. Experienced practitioners can learn to recognise this pattern, but institutions have not yet encoded it into tools or review doctrine — it is pre-formalised rather than undetectable. The broader implication is that agent-generated test suites under context pressure may systematically verify that workarounds function rather than that the real system functions. Appendix A catalogues this as ACF-R3 (Verification Displacement).

#### (g) Model monoculture

The correlated failure problem described above operates within a single codebase, but it extends further. If most government agencies adopt the same two or three models for code generation, the correlated failure modes are no longer contained within individual organisations. A systematic bias in a widely-used model — say, a persistent tendency to use `.get()` with defaults on security-critical fields — will produce the same vulnerability pattern across every codebase that model touches. This is analogous to agricultural monoculture[^geer-monoculture]: genetic uniformity makes the entire crop vulnerable to a single pathogen. Discovering a systematic agent-introduced defect pattern in one agency should trigger cross-agency scanning, because the same model likely introduced the same pattern elsewhere. This strengthens the case for cross-organisational standards (§9.3) and shared vulnerability disclosure mechanisms for agent-introduced defect patterns.

Model diversity is the obvious mitigation to monoculture, but it should not be assumed to provide independence. Even where organisations use different models, overlapping training distributions and shared lineages may preserve correlated tendencies. A further possibility — not yet empirically demonstrated — is that distinct defects from different models could compose: Model A generates a data ingestion function that omits the validation boundary between external and internal data (ACF-T1); Model B, working on the downstream processing code, encounters the now-unvalidated data and adds a `.get()` default to handle its potential absence gracefully (ACF-S1). Neither model produced the other's defect, but Model B's "fix" converts Model A's loud failure (a crash on missing validation) into a silent one (a fabricated default on unvalidated data). The composed outcome would be worse than either defect alone.

This composition scenario is illustrative, not observed — Appendix F explores it as a precautionary analysis. The core policy point is narrower: reducing same-model dependence may not eliminate correlated risk, and the possibility of cross-model defect composition warrants investigation even though empirical demonstration is not yet available.

#### (h) Distinguishing failure layers

The preceding properties describe two structurally distinct failure mechanisms that produce superficially similar outcomes through different causes.

**Context collapse during generation**: the model begins a task with adequate context but loses or displaces it during a long session. The resulting code is wrong because the model's task frame drifted, not because its training priors are biased. Controls that restore context — state resets, fresh-session regeneration, checkpoint-and-resume workflows (§9.13) — address this layer.

**Training-distribution bias**: the model's priors encode defensive patterns as universally correct because its training corpus is overwhelmingly composed of code where they are correct (§2.5). This bias persists across sessions, across models with overlapping training lineages, and across any number of state resets. Controls for this layer require genuine diversity (different model families, different training corpora, symbolic cross-checks, machine-enforceable rules) rather than redundant generation from the same distribution.

The distinction matters for control selection. A control that works against context collapse (regenerate from a fresh session) may provide false reassurance against training-distribution bias (the fresh session reproduces the same wrong answer). Organisations should assess which layer a given control addresses and avoid assuming that redundancy in one layer provides coverage for the other. Appendix F (§F.3) observes that the effective number of independent model lineages is likely much smaller than the number of available models — a qualitative argument that warrants empirical measurement but whose policy implication is clear: the assumption that "different agencies use different models, so we are safe" does not hold without lineage-independence analysis.

### 2.5 Why training data is a major part of the story

Defensive patterns are common in open-source Python code: `.get()` with defaults, `getattr()` with fallbacks, broad `try/except` blocks, and `or` chains that silently substitute values. These patterns are widely regarded as good practice because, in most applications, graceful degradation is preferable to crashing. Even there, they can conceal real bugs behind silent defaults — the web application that defaults a missing country to `"US"` works fine until someone asks why the analytics show 40% of users in the United States when the service only operates in Australia. This is often a nuisance in ordinary software. In high-stakes systems, the same concealment mechanism is catastrophic.

These patterns are catastrophically inappropriate for applications where:

- Silent data corruption is worse than a crash
- Every decision must be traceable to its source
- The absence of data is itself evidence (not an invitation to fabricate a default)
- Error paths must be as auditable as success paths

Government systems handling classified information, financial records, health data, or law enforcement evidence contain code paths that fall squarely into this category — paths where defensive programming is the wrong pattern. The agent does not reliably know this, and cannot infer it from the code alone — the security context is institutional knowledge, not syntactic structure. And critically, the agent is not doing anything wrong. It is applying the patterns that represent good practice in the overwhelming majority of the code it was trained on. The problem is not the agent's quality — it is the mismatch between what "good practice" means in most software and what it means in this software.

This training-data root cause has a self-reinforcing property that warrants attention. Agent-generated code is already entering open-source repositories at scale (§1.2.2) — the same repositories that form the training corpora for the next generation of models. If that code carries the defensive-pattern bias described above, the training data for future models will contain a higher proportion of defensive patterns than the training data for current models — not because the patterns became more appropriate, but because the generator that over-applies them is now a significant contributor to the corpus. Each model generation trained on a corpus increasingly populated by previous-generation output would, on this trajectory, have a stronger prior toward the same context-inappropriate patterns.

This is a reinforcing feedback loop (Appendix G, §G.2) operating at the model-generation timescale rather than the session timescale: the output of one generation strengthens the bias of the next.

The magnitude of this effect is not yet measurable — it depends on what proportion of training corpora is agent-generated, how training pipelines filter or weight contributions, and whether model developers implement countermeasures. But the structural mechanism is clear, and it strengthens the case that the training-distribution bias identified above is not a transient artefact of current model limitations but a condition that may deepen as agents become a larger share of the code production ecosystem. Organisations should not assume that future model generations will naturally outgrow the defensive-pattern bias; they may inherit a reinforced version of it.

Corpus composition is not the only mechanism reinforcing this bias. Alignment training — reinforcement learning from human feedback (RLHF) and equivalent techniques — provides a distinct causal channel. Models trained to produce code that looks helpful, passes tests, and generates reviewer approval will actively reinforce defensive patterns, because those patterns satisfy all three reward signals: they do not crash, they pass unit tests, and they appear professional to reviewers. A `.get()` with a sensible default is precisely the kind of output that RLHF rewards — it is helpful, safe-looking, and non-disruptive. The alignment reward signal thus reinforces the same bias that corpus composition creates, through a different mechanism. The distinction matters for mitigation design: the fix for a corpus composition problem (exposure diversity, data curation, domain-specific training) is different from the fix for an alignment problem (reward signal redesign, constitutional approaches, domain-context-aware evaluation). Current models are subject to both mechanisms simultaneously, and a mitigation that addresses one may provide false reassurance about the other — the same "different failure layers require different controls" principle described in §2.4(h).

[^tool-enumeration]: Linters check syntax; type checkers verify shape; SAST tools match known vulnerability patterns; tests verify behaviour against developer-supplied expectations.

[^training-data-properties]: No security classification requirements, no audit trail obligations, and no trust boundary enforcement. §2.5 develops the training-data root cause in detail.

[^defensive-offensive-examples]: Classified document handling, financial audit trails, and evidentiary records require zero latitude for corruption — the operation halts, and in safety-critical paths the process may need to stop entirely. UI preferences and display formatting correctly use defensive patterns.

[^acf-s1-nav]: This pattern is catalogued in Appendix A as ACF-S1 (Fabricated Default), with extended risk assessment, language-specific variants, and detection status. The three-version structure — correct, dangerous, and agent-generated — recurs throughout the ACF taxonomy. For the SQL equivalent of this pattern using `COALESCE()`, see Appendix C, §C.2.

[^vaswani-context]: Context displacement arises from the finite context window and positional encoding properties of transformer-based architectures (Vaswani et al. 2017, "Attention Is All You Need"); the specific displacement thresholds vary by model family, context length, and implementation.

[^reconstruction-caveat]: Whether the shift reflects attention reallocation, distributional drift within the context, or some other mechanism is an open question; the observable consequence is the same.

[^first-day-nuance]: See Appendix E §E.7 for the transcript evidence behind this characterisation.

[^geer-monoculture]: The foundational argument that software monoculture creates systemic correlated failure risk was made by Geer et al. (2003), "CyberInsecurity: The Cost of Monopoly," in the context of operating system homogeneity. The agentic analogue extends the argument to AI model training-lineage homogeneity.

---
