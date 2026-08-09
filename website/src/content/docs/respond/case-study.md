---
title: "Case Studies: What the Invisibility Problem Looks Like in Practice"
sidebar:
  order: 2
---

This page synthesises two case studies that together demonstrate the paper's central claim: AI-generated semantic defects look like correct code and pass every check in the standard assurance stack. The first is a simulation — a complete application prototyped by an agent, where every line is available for inspection. The second is six months of longitudinal observation on a live compliance-constrained project, where detection exists and its limits are visible. Together, they show that the problem is not the defect rate. The problem is that you will not see the defects at all — not because you are a poor reviewer, but because they look exactly like the code you have been trained to approve.

For the full case study methodology, caveats, and replication protocol, see the [discussion paper Section 8](../../pdf/threat-model-discussion-paper-community.pdf).

---

## What these case studies demonstrate

The natural objection to the threat model is: "show me the code." Show the defect, show why a competent reviewer would miss it, and let the reader judge.

The primary evidence is a **simulation (Case Study 1, Appendix D)** — a complete government application built from scratch by an AI coding agent, where every source file is reproduced so the reader can judge whether they would have caught the defects in a review queue at the end of a long day. A secondary evidence base — a **longitudinal observation (Case Study 2, Appendix E)** — shows that the same failure shapes recur in sustained development, at a rate that the standard assurance stack does not detect.

Both case studies are drawn from real projects. Specific implementation details have been generalised. The simulation uses a purpose-built demonstration application; the longitudinal observation presents a composite, de-identified account from a compliance-constrained environment. The system and tooling described in the longitudinal study are de-identified here to keep the focus on the generalisable threat model.

---

## Case Study 1: Simulation of a government assistance application

*Full analysis: [Appendix D](../../pdf/threat-model-discussion-paper-community.pdf) in the discussion paper.*

An AI coding agent was given a conversational brief to build a government citizen assistance portal — a system where citizens register with PII, verify their phone number via OTP, and receive an aid voucher code that is forwarded to an enablement service. The operator explicitly framed the security context: the system handles public assistance funds, and abuse diverts funding from intended recipients.

The agent's response was reassuring. It identified the domain as high-stakes, listed the control categories it intended to apply — "server-side enforcement, anti-automation/rate limiting, replay protection for codes/vouchers, audit logs, least-privilege secrets handling, and careful PII storage" — and proceeded to build the system. The agent did not lack the framing — it explicitly identified the domain as high-stakes and enumerated the control categories it intended to apply. The failures documented below occurred *despite* that identification, not in the absence of it.

The agent produced a complete, runnable FastAPI application in approximately 10 minutes. The application implements CSRF protection with `secrets.token_urlsafe()`, OTP hashing with a keyed SHA-256 scheme, constant-time comparison via `secrets.compare_digest()`, per-IP rate limiting, signed session cookies, Pydantic input validation, and structured audit logging. All automated checks pass. Both tests — there are only two — pass. The application starts, serves pages, and completes the full workflow without error.

This is part of the hazard, not a mitigating detail. To a reader without deep security expertise, the application presents the visible signals of security competence — familiar libraries, recognised control patterns, and clean framework usage — that would ordinarily justify confidence that the system is "doing security properly."

**The application contains 20 semantic defects** mapped to ACF taxonomy entries across five of the six STRIDE categories. Three are rated Critical. Sixteen have no detection by any standard tool.

:::danger[An important framing note]
The findings are not bugs in the conventional sense. The application runs, passes its tests, and completes its intended workflow without error. What the findings describe are **latent design weaknesses** — places where the code has removed an ad hoc safety net — a crash that would have caught a future fault. A default value on a cryptographic key does not cause a failure on its own. It causes a failure when a deployment pipeline does not inject the correct key — a second error, made by a different person, at a different time. Each finding is a place where the system will behave correctly until it doesn't — and when it doesn't, nothing in the system's design will make the failure visible.
:::


### The three-default compound

The central finding is three `os.getenv()` calls with development-convenient defaults that together bypass the system's security controls:

```python
# config.py — three lines that look like standard development practice
app_env=os.getenv("APP_ENV", "development"),                               # → cookies sent over HTTP
secret_key=os.getenv("APP_SECRET_KEY", "development-secret-key-change-me"),  # → forgeable sessions and OTP hashes
use_mock_services=_as_bool(os.getenv("USE_MOCK_SERVICES"), True),           # → verification is simulated
```

Each default is individually reasonable for development convenience. Their compound effect: a deployment that fails to set all three environment variables runs a system that issues government aid entitlements based on simulated verification, with forgeable credentials, sent over HTTP. The secret key is used for both session signing and OTP hash computation — a known key enables an attacker to forge sessions, compute correct OTP hashes, and bypass phone verification entirely.

The `.env.example` file compounds this further: it contains `APP_SECRET_KEY=change-me-in-production` — a *different* known key from the code default. Copying the example gives one known key. Not copying it gives another. Neither path produces a secure deployment.

No test catches this. No linter flags it. The health endpoint returns `{"status": "ok"}`.

### The full findings table

| # | Finding | ACF ID(s) | Severity | Standard tool detection |
|---|---------|-----------|----------|------------------------|
| F1 | Default cryptographic secret key | ACF-S1 | **Critical** | None |
| F2 | Default mock services enabled | ACF-S1, ACF-E1 | **Critical** | None |
| F3 | Default development mode | ACF-S1 | **Critical** | None |
| F4 | External OTP response consumed without validation | ACF-T1, ACF-T2 | High | None |
| F5 | Non-atomic multi-step verify/issue flow | ACF-R2 | High | None |
| F6 | Missing audit events on validation failures | ACF-R1 | High | None |
| F7 | Silent return on missing application update | ACF-R1 | High | None |
| F8 | IP address fabrication and trust boundary violation | ACF-S1, ACF-T1 | High | Partial |
| F9 | Validation errors exposed to users | ACF-I1 | High | Partial |
| F10 | Session as sole authentication gate | ACF-E2 | High | None |
| F11 | No per-application OTP brute-force protection | (adjacent to ACF-E1) | Medium | None |
| F12 | Silent coercion in configuration loading | ACF-T2 | Medium | None |
| F13 | Thin test coverage / closed verification loop | — | Low | Partial |
| F14 | Audit event failure silently absorbed | ACF-R1 | High | None |
| F15 | Database result type-erasure (sqlite3.Row as untyped container) | ACF-S1 | Medium | None |
| F16 | Enablement response body not checked | ACF-T1, ACF-E1 | High | None |
| F17 | Data access layer forces non-atomicity by design | ACF-R2 | High | None |
| F18 | No status-transition validation (state machine absent) | adjacent to ACF-E2 | Medium | None |
| F19 | Voucher code (bearer credential) stored in audit trail in plaintext | ACF-I1 | High | None |
| F20 | Database schema has no constraints beyond NOT NULL | ACF-T1 | Medium | None |

Of the 20 findings, 16 have no detection by any existing standard tool (linter, type checker, SAST, DAST, unit tests). No finding was caught by the agent's own test suite.

### What the other findings look like

The remaining 17 findings follow the same shape — convention-conforming code that replaces a crash with a silent default:

- The external OTP service response crosses from untrusted to authoritative with no validation boundary — `str(body["code"])` silently coerces `null` to `"None"` and stores it as the valid OTP (ACF-T1, ACF-T2)
- The verify endpoint performs six state-changing operations across four separate database transactions — if enablement succeeds externally but the subsequent DB write fails, the voucher code is lost and the entitlement is unrecoverable (ACF-R2)
- Registration validation failures generate no audit event — an attacker probing input boundaries is invisible to the audit trail (ACF-R1)
- The `update_application_status` function returns silently when the application does not exist — evidence of a bug or forged session is absorbed without trace (ACF-R1)
- The enablement service response body is never checked — `{"status": "failed"}` with a 200 OK is treated as success (ACF-T1, ACF-E1)
- The 64-character voucher code — the bearer credential that grants the aid entitlement — is written to the audit trail in plaintext, so that anyone with read access to the audit table can extract every issued credential (ACF-I1)

Each finding is a place where the system will behave correctly until it doesn't — and when it doesn't, nothing in the system's design will make the failure visible.

### What the agent got right

The agent implemented genuine security controls — not toy versions, but the actual patterns a security-aware developer would use. CSRF protection with `secrets.token_urlsafe()`. Constant-time comparison via `secrets.compare_digest()`. OTP hashing with a keyed scheme. Per-IP rate limiting with a thread-safe implementation. Signed session cookies with configurable security flags. Pydantic input validation with strict regex patterns.

The failures are not in the *category* of controls selected but in their *semantic correctness* for this deployment context. A session signed with a known default key performs every cryptographic operation correctly — the HMAC is computed, the signature is verified, the cookie is validated. The ceremony is structurally present. Whether it is providing security depends on a configuration decision the application does not enforce.

### What the agent knew it had not done

At the end of the session, the agent identified several items as "not implemented yet," including OTP expiry, per-application attempt limits, replay protection, and "config hardening." This self-assessment is partially accurate — the agent correctly identified some missing features — but it does not identify any of the semantic failures documented above. The agent's self-assessment treats the implemented controls as sound and the gaps as additive features, when in fact several of the "implemented" controls contain semantic failures that undermine their security value.

---

## Case Study 2: What happens when you have detection

*Full analysis: [Appendix E](../../pdf/threat-model-discussion-paper-community.pdf) in the discussion paper.*

The simulation shows the defect shapes. The question it cannot answer is: how often do these patterns appear in sustained development, and what does it take to catch them?

### The project

Six months of daily agentic development on a compliance-constrained data processing platform — approximately 80,000 lines of Python, with agents generating the majority of new code — provides the longitudinal view. The system processes sensitive data under requirements that mandate complete audit trails, data integrity verification, and defence-in-depth security controls.

The project operates under explicit architectural rules: a tiered authority model for data handling, zero latitude for corruption or substitution on authoritative internal data, quarantine-and-continue for external data, and no defensive programming patterns. These rules are documented extensively but are **institutional knowledge** — they exist in project documentation, not in the programming language. Python permits all of the patterns the project forbids.

### The enforcement regime

The rules are enforced in CI by a project-specific AST pattern-matching tool with an allowlist-based exception regime. The enforcement model is not advisory — it is a gate. A pattern flagged by the enforcer either gets fixed by the agent or requires a human-authored exception with a rationale, an ownership tag, and an expiry date. Legitimate uses of otherwise-restricted patterns go through; unconscious pattern completion from training data does not.

### The validation boundary as built

*Postscript: the same project approximately five months after the observations above. Full account: [§8.7](../../pdf/threat-model-discussion-paper-community.pdf) in the discussion paper.*

The single pattern-matching gate has since grown into a **four-layer validation boundary**. Layer 1 is a semantic taint gate over trust boundaries declared in code, tracking data flow between modules rather than matching patterns — and failing red if it recognises no boundaries at all, so that "checked and clean" stays structurally distinguishable from "didn't look." Layer 2 is a tier-model lint suite in which every suppression is a judged exception carrying owner, reason, and expiry, sealed with a cryptographic signature only the human operator can apply; agents can stage exception candidates but cannot sign them, and the signing step re-derives each finding from the live tree so a stale claim fails at signature time. Layer 3 pins content digests over what pipeline outputs *mean* — semantic drift fails CI until a human consciously rotates the oracle and records why. Layer 4 encodes write-boundary invariants in code and verifies them against the real production database engine rather than the permissive one used in local development.

Between the agent's proposed exception and the operator's signature sits an **automated judge**: a prompted model that evaluates each flagged finding against the declared rule and returns an accept/block verdict. It absorbs the finding flood (ACF-D1) so that human attention lands only on ambiguous or high-stakes cases — but it signs nothing. The division of labour is the point: agent self-checking is a load-bearing *filter* and an unacceptable *authority*.

:::note[The honest ledger]
Two of those layers exist because the gates' own operators were fooled first. One lint gate ran in CI for months in a configuration that loaded **zero rules and exited green** — a result that would have certified any tree — and two acceptance rounds were signed off against it before the hole was found. Its first real run produced a baseline of several hundred findings. At the time of writing the tier-model gate is *deliberately red*: a substantial backlog awaits judged signature, so unauthorised merges stay blocked while the signing debt stays visible, rather than a green gate purchased by weakening the rules.

The defence is not that the codebase is clean — it is not. The defence is that every gate fails closed, distinguishes "checked and clean" from "didn't look," and requires a recorded human decision to overrule. That is what separates a codebase full of *known* semantic findings from one full of unknown ones.
:::


The same single-project limitations apply: one codebase, one operator, machinery too young for outcome statistics. The account is offered as evidence that the control class is implementable — and of the failure modes an implementer should expect on the way — not as evidence that it is sufficient.

### What detection observes

In steady-state development, a combination of rigorous review and the enforcement tool regularly catches and blocks semantic boundary violations that would otherwise pass conventional tooling — none entered the codebase. The detection rate is approximately one to two such patterns per day across approximately 25–30 commits per day (the majority agent-generated). This rate occurs *despite* the agent being explicitly prompted against these patterns in project-level instructions — the patterns are deeply embedded in training data and override project-level instructions under context pressure.

:::note[Interpreting the violation rate]
This is a detection rate from a single project under specific conditions: one developer's work, with purpose-built semantic enforcement tooling and rigorous human review. Three aspects merit attention:

**What the rate measures:**

- The rate reflects **unplanned work**. Violations occur predominantly during ad-hoc activities — bug fixing, incremental refactoring, small feature additions — where the agent improvises from training data rather than following a reviewed specification. Planned major work is reviewed against the project's trust topology before implementation, catching violations at the design stage.
- The rate is **model-specific and likely transient**. As AI companies prioritise these failure modes for remediation, the absolute rate will likely decrease. The structural argument remains valid regardless of the rate.
- The rate is a **floor, not a ceiling**. The tool's coverage of the ACF taxonomy is incomplete. Without specific prompting against these patterns, the rate is substantially higher.

**How to read the evidence:**

- The detection rate is a property of the **tool and its rule set**, not only of the code. Readers should distinguish between "the tool found violations at rate X" and "violations occur at rate X."
- The **rules always trail the failure modes**. Semantically equivalent failures can be achieved through different syntax — each time a rule is encoded, the agent finds an adjacent pattern that achieves the same semantic failure through syntax the tool does not flag.
- Pattern-level enforcement has a **structural ceiling**. The rule set is a finite enumeration of known failure shapes; the space of semantically equivalent failures is open-ended.

The significant question the figure raises is not "why is this project producing defects?" but "does your project — or your contracted supplier's project — have equivalent detection?" Most projects do not yet have it.
:::


### What the failure modes look like in a live codebase

The failure modes map directly to the [ACF taxonomy](../../acf/). Three examples from the longitudinal project:

**Fabricated default (ACF-S1).** Agent generates `.get()` with a default value on a data structure where a missing field indicates a critical failure in an upstream internal component — absence is evidence of corruption, not a case to handle gracefully. The code is not merely plausible — it is *correct defensive programming*. A reviewer under time pressure sees "handles the missing case" and approves it, because in most software that is exactly the right pattern.

**Audit trail destruction (ACF-R1).** Agent wraps an audit-critical operation in a `try/except` that logs the error and continues. The code appears to handle errors gracefully. The reviewer does not recognise that the caught exception should propagate to the audit system rather than being logged and swallowed.

**Authority tier conflation (ACF-T1).** Agent deserialises data from an external API and passes it directly to an internal processing function. The code appears clean — no obvious security issues. The reviewer does not see the missing validation boundary because both the external data and internal data are the same Python type (`dict`).

In each case, the defect was caught later — by the enforcement tool, by operator challenge during a coding session, by prompted multi-agent specification review, or by a test failure in a downstream component. The initial review process had signed off.

Across the incidents documented in Appendix E, the recurring pattern was not policy absence but **policy non-application**: the governing rules were present in the agent's context, and the agent could quote them accurately when asked, but it had not consulted them as constraints during its initial work.

### Annotated incidents from the longitudinal project

Appendix E presents three concrete incidents, spanning code, design, and specification layers, each caught by a different detection mechanism. Together they form an ascending series that demonstrates the same failure shape — policy available, not applied — at every layer of the development lifecycle.

#### Incident 1: Linter conflict resolution (code-level)

An agent was asked to resolve six expired allowlist entries in the project's semantic enforcement tool. It successfully eliminated three violations by refactoring code. For the remaining three — `.get()` calls on schema configuration dictionaries — the agent encountered a conflict between the project's tier model enforcer (which rejected `.get()`) and ruff's SIM401 rule (which demanded `.get()`). The agent resolved the conflict by reverting to `.get()` and adding a permanent per-file allowlist exception — a policy override that silenced a legitimate finding. All 632 tests passed. The agent declared success.

Through four rounds of operator challenge, three dynamics emerged:

1. **The operator forced a comparison between failure modes.** "Crash before the audit trail starts" versus "silently continue with fabricated data" — once framed this way, the project rule won cleanly and the agent's own analysis confirmed it.
2. **The latent bug was invisible at the point of use.** An upstream `to_dict()` serialisation had collapsed typed dataclass fields into an untyped dictionary, making `.get()` with defaults appear prudent at the access site. The semantic bug was invisible because the type information that would have revealed it had already been erased upstream.
3. **The agent had the governing policy in its context window and did not apply it.** The authority-tier architecture and defensive programming prohibition were present in the agent's system prompt. The agent cited these policies accurately when challenged but did not consult them during its initial resolution.

The entire exchange took approximately 8 minutes — 4 for the initial (wrong) fix, 4 for the operator-driven analysis that surfaced the real bug. In a high-autonomy workflow without operator challenge, only the first 4 minutes would have occurred.

#### Incident 2: Non-conformant exemplar replication (design-level)

Five days later, the same agent was asked to design an XML source plugin. It selected an existing CSV source plugin as its exemplar — chosen for structural similarity, not policy compliance. The CSV source had been committed five weeks before a mandatory field-normalisation policy was introduced, and was out of compliance. The agent inherited its patterns uncritically and proposed a design with an opt-in normalisation toggle — when the policy required unconditional normalisation with no toggle.

When the operator redirected the session to investigate, a new failure pattern emerged: **surrogate-question deflection**. Asked about the blast radius of non-normalised field names, the agent repeatedly answered the technically tractable question ("does the engine corrupt data?") rather than the operationally relevant question ("what happens to the person writing gate expressions?"). Each answer was technically accurate and operationally irrelevant. Only when the operator explicitly said "You can't keep saying that" did the agent trace the exception propagation chain and deliver the real answer: a hard crash with misleading error attribution — the source broke its contract, but the gate expression takes the blame.

The normalisation toggle sequence traces policy from "read correctly" through "weakened to fit existing code" to "non-compliant design" in six steps:

1. Agent reads policy: "non-negotiable"
2. Agent sees existing code: opt-in toggle, default `False`
3. Agent weakens policy to fit code: proposes "two possible reads"
4. Agent proposes new design: opt-in toggle, default `True` (improved but still wrong)
5. Operator invokes the policy language: "the policy is that it's mandatory, isn't it?"
6. Agent arrives at correct design: no toggle, normalisation unconditional

The correct answer was available at step 1. The existing code created a stronger prior than the governing policy.

#### Incident 3: Specification-level review (pre-code)

Two complex plugin specifications — approximately 800 lines of structured design each — were reviewed using prompted multi-agent review: four specialised reviewer agents, each with a distinct analytical frame (reality, architecture, quality, systems), running in parallel across two rounds.

The review identified **8 ACF-mapped blocking issues across both specifications** — the same failure modes the taxonomy describes in generated code, manifesting instead in agent-generated design:

- **ACF-S1 (Fabricated Default) — three instances.** Including an `on_no_results: continue` option that would report "success" when a retrieval source silently failed, an empty-string credential bypass, and `.get()` with a default on a dictionary that had already been validated by a Pydantic model.
- **ACF-S2 (Spurious Field Access) — one instance.** The agent invented a `force_refresh` keyword argument that does not exist in the credential library's API. The specification was internally consistent around the spurious parameter — downstream logic depended on it.
- **ACF-T1 + ACF-E1 (Authority Tier Conflation + Implicit Privilege Grant) — one instance.** A user-supplied endpoint URL accepted as an unvalidated string — a server-side request forgery vulnerability baked into the provider's constructor.
- **ACF-R2 (Partial Completion) — two instances.** Including a data mutation performed before the audit write, so a failed audit would leave an unaudited state change.
- **ACF-I1 (Information Disclosure) — one instance.** Query text hashed with plain SHA-256 for cache keys — reversible by brute force for low-entropy inputs.

Five of six STRIDE-mapped ACF categories appeared. Multiple review rounds found different issues — the highest-severity single finding (PII exposure) was found only in the second round. Had these specifications been implemented without review, the resulting code would have contained structural ACF violations baked into architectural decisions — harder to change, more expensive to remediate, and more likely to accumulate governance exceptions rather than structural fixes.

:::tip[The cost advantage of specification-level review]
In the code-level incidents, the operator spent 8 minutes and 29 minutes respectively surfacing one bug and one policy violation through interactive challenge. In this example, eight prompted reviewers running in parallel produced 8 ACF-mapped violations and 13 additional blocking issues — before any implementation effort was invested. Specification-level review catches the same failure shapes earlier and at materially lower cost.
:::


---

## Cross-validation: same failure shapes across both case studies

The simulation (Case Study 1) and the longitudinal observation (Case Study 2) were conducted on different projects, with different agents from different vendors, in different domains, under different constraints. The same failure modes appeared in both — ACF-S1, ACF-R1, ACF-R2, ACF-T1, ACF-E1, ACF-I1 — because they arise from the same structural cause: the generating agent reaches for the most common pattern in its training data when it lacks the institutional context to know that the common pattern is the dangerous one. The taxonomy was developed from the longitudinal project; the simulation validated it against a codebase and agent the taxonomy was not designed for.

The three Appendix E incidents add a further dimension: the same "policy available, not applied" dynamic appeared at the code level, the design level, and the specification level — caught by three different detection mechanisms (operator challenge, operator-directed investigation, prompted multi-agent review) across five calendar days. The consistency across layers is itself the evidence. The quality of the outcome depended entirely on someone knowing which questions to ask.

---

## The productivity picture

The longitudinal project reports substantial productivity gains from agentic development despite the compliance overhead.

**Where agents perform well:** Mechanical refactoring, boilerplate generation, bug investigation, and test writing — tasks where correctness is structurally verifiable (tests pass, types check, linter is clean). Agents struggle where **correctness requires institutional knowledge** (trust boundary maintenance, audit trail completeness, appropriate error handling in compliance contexts). Agents can be highly effective investigative instruments once directed, but they do not reliably initiate the semantic question that matters.

**The compliance tax.** Governance controls impose a real overhead — the project's retrospective estimate places it at 15–25% of total development time. The distribution is uneven: on large changes, compliance overhead is trivially small relative to the work. On small changes — a one-line bug fix — the agent spends 30 seconds on the fix and 60 seconds grappling with the CI pipeline, rediscovering the enforcement workflow it has never seen in training data. This is not new overhead introduced by agentic coding. It is the same compliance overhead redistributed. Before agents, humans spent that time writing compliant code slowly. With agents, humans spend it reviewing agent output for compliance quickly. The total compliance cost is similar; the development velocity is higher.

### The redirection insight

Automated semantic enforcement does not *add* tedium — it **redirects existing tedium** toward higher-value activities.

| Reviewer Task | Without Automation | With Automation |
|-------------|-------------------|-----------------|
| "Is `.get()` used on typed objects?" | Human scans for pattern (error-prone) | Machine catches structurally (reliable) |
| "Does this error handler preserve the audit trail?" | Human evaluates (moderate difficulty) | Machine flags broad `except` blocks; human evaluates the specific cases |
| "Is the trust topology correctly declared for this new module?" | Human evaluates (requires institutional knowledge) | Human evaluates (no change — this is irreducibly human) |
| "Is this validation function actually validating?" | Human evaluates (requires domain knowledge) | Machine checks structural presence of control flow; human evaluates semantic adequacy |

The total review burden may be similar, but the **distribution of human attention shifts** from low-value pattern scanning to high-value semantic evaluation. The compliance tax is the same; the assurance yield is higher. The Appendix E specification-level review suggests that this redirection can also occur upstream: catching the same failure shapes at the design stage, before code exists, at lower remediation cost.

**Velocity inverts for remediation.** The same property that makes correlated defects dangerous — the same pattern repeated across many files — makes them tractable to fix at scale once the detection rule exists. The bottleneck is not remediation capacity but **detection and specification** — the human semantic work of recognising that a pattern is wrong, understanding why, and encoding that understanding as a rule precise enough to act on.

**Corrections don't persist — but remediation scales.** The agent will reproduce the same pattern tomorrow regardless of how many times it has been caught. But for retroactive remediation — sweeping the codebase for all instances of a newly recognised pattern — agentic velocity is an asset, not a liability. The lifecycle is: (1) human recognises the failure shape, (2) human encodes the detection rule, (3) machine finds all instances, (4) agents fix them in parallel, (5) CI gate prevents recurrence. Each step plays to a different strength: human semantic understanding for detection and specification, machine scale for discovery and remediation, environmental enforcement for prevention.

**Agents as compliant enforcement subjects.** A less obvious finding: in the longitudinal project, more compliance work was executed in the agentic workflow than would typically be executed in a purely human one. The agent does not learn the organisation's security rules, but it also does not learn which rules it can get away with skipping. It pays the governance tax that humans under deadline pressure quietly defer. Agents are simultaneously high-risk authors and unusually compliant subjects of technical control.

A practical consequence: if the CI gate is the primary mechanism catching semantic violations that pass conventional tooling, CI availability becomes mission-critical. Every hour the enforcement pipeline is degraded or unavailable is an hour in which violations may pass through normal review undetected — because they look like correct code. Teams working at agentic velocity need continuous awareness of enforcement state and predefined procedures for operating without it.

---

## The lesson

Agentic development is viable in part because the agent will execute governance that humans under pressure quietly defer — but it requires governance designed for the agent's actual failure modes, not the human's. Agent governance must be environmental (CI gates, not documentation), boundary-enforced (pre-commit, not post-review), and stateless (every session is the first session). Organisations that apply human-shaped governance to agents will get the agent's compliance without catching the agent's mistakes.

---

## Replication protocol

Two practical tests would meaningfully challenge the paper's thesis:

1. **Practitioner deployment test.** Deploy a small set of ACF-pattern detection rules (targeting fabricated defaults on security-classified fields, broad exception handlers on audit paths, and authority-tier boundary violations) on agent-assisted codebases and measure the violation rate over a sustained period. If such rules consistently find zero or near-zero violations across multiple projects, the threat model's generalisability claim would be substantially weakened.

2. **Reviewer catch-rate test.** Present experienced reviewers with agent-generated code containing known ACF-pattern violations at normal review pace without purpose-built tooling. If reviewers reliably detect the overwhelming majority of violations, the review-degradation thesis would be substantially weakened.

**Replication protocol.** An independent team seeking to confirm or challenge the reported violation rates would need:

- **A codebase with active agent use in a compliance-constrained or integrity-sensitive context** — the threat model's claims are specific to high-stakes code paths. Government systems, healthcare, financial audit, or critical infrastructure projects would provide appropriate contexts.
- **A detection mechanism for ACF-pattern violations** — at minimum, a small set of static analysis rules targeting the patterns in the [ACF taxonomy](../../acf/). The detection mechanism should be implemented and evaluated independently of the paper's author to reduce confirmation bias.
- **A measurement period of sufficient duration** — weeks rather than days, reporting both the absolute violation count and a denominator (violations per N agent-generated functions, per K lines changed, or per M commits) to enable meaningful comparison.
- **Controlled comparison where feasible** — comparing violation rates in agent-generated code against a baseline of human-authored code in the same codebase under the same detection rules, to distinguish agent-specific failure patterns from general coding errors.

Even a partial replication — deploying detection rules on one agent-assisted project for 30 days and reporting the violation rate with denominator context — would materially advance the evidence base beyond the paper's single-project observation. See the [full paper](../../pdf/threat-model-discussion-paper-community.pdf) for the detailed replication protocol.

---

## Further reading

- [**Full Discussion Paper**](../../pdf/threat-model-discussion-paper-community.pdf) — the complete case studies with methodology, caveats, and detailed findings
- [**ACF Taxonomy**](../../acf/) — the failure mode taxonomy referenced throughout the case studies
- [**Practical Guide**](../practical-guide/) — the five review questions with worked code examples for applying these lessons in your own work
