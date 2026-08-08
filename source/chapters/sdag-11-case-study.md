## 8. Case Studies: What the Invisibility Problem Looks Like in Practice

*This section presents two evidence bases for the paper's central claim: that AI-generated semantic defects look like correct code and pass every check in the standard assurance stack. The first is a simulation — a complete application prototyped by an agent, where you can read every line and see what the agent produced. The second is six months of longitudinal observation on a live compliance-constrained project, where you can see what detection looks like when it exists. Together, they demonstrate that the problem is not the defect rate. The problem is that you will not see the defects at all — not because you are a poor reviewer, but because they look exactly like the code you have been trained to approve.*

**De-identification.** Both case studies are drawn from real projects. Specific implementation details have been generalised. The simulation (§8.2) uses a purpose-built demonstration application; the longitudinal observation (§8.3) presents a composite, de-identified account from a compliance-constrained environment. The system and tooling described in the longitudinal study are de-identified here to keep the focus on the generalisable threat model.

### 8.1 What these case studies demonstrate

The natural objection to the threat model is: "show me the code." Show the defect, show why a competent reviewer would miss it, and let the reader judge. That is what this section does.

The primary evidence is a **simulation (§8.2, Appendix D)** — every source file is reproduced so the reader can judge whether they would have caught the defects in a review queue at the end of a long day. A secondary evidence base — a **longitudinal observation (§8.3, Appendix E)** — shows that the same failure shapes recur in sustained development, at a rate that the standard assurance stack does not detect.

### 8.2 Case Study 1: Simulation of a government assistance application

*Full analysis: Appendix D. Source listing: Appendix D §D.2.5 and companion snapshot.*

An AI coding agent was given a conversational brief to build a government citizen assistance portal — a system where citizens register with PII, verify their phone number via OTP, and receive an aid voucher code that is forwarded to an enablement service. The operator explicitly framed the security context: the system handles public assistance funds, and abuse diverts funding from intended recipients.

The agent's response was reassuring. It identified the domain as high-stakes, listed the control categories it intended to apply — "server-side enforcement, anti-automation/rate limiting, replay protection for codes/vouchers, audit logs, least-privilege secrets handling, and careful PII storage" — and proceeded to build the system. The full exchange is in Appendix D §D.2.2; the reader may wish to form their own view of the gap between what was described and what was delivered.

The agent produced a complete, runnable FastAPI application in approximately 10 minutes. The application implements CSRF protection with `secrets.token_urlsafe()`, OTP hashing with a keyed SHA-256 scheme, constant-time comparison via `secrets.compare_digest()`, per-IP rate limiting, signed session cookies, Pydantic input validation, and structured audit logging. All automated checks pass. Both tests — there are only two — pass. The application starts, serves pages, and completes the full workflow without error.

This is part of the hazard, not a mitigating detail. To a reader without deep security expertise, the application presents the visible signals of security competence — familiar libraries, recognised control patterns, and clean framework usage — that would ordinarily justify confidence that the system is "doing security properly."

The application contains 20 semantic defects mapped to ACF taxonomy entries across five of the six STRIDE categories. Three are rated Critical. Sixteen have no detection by any standard tool.

#### The three-default compound

The centrepiece finding is three `os.getenv()` calls with development-convenient defaults that compound into total security bypass:

```python
# config.py — three lines that look like standard development practice
app_env=os.getenv("APP_ENV", "development"),                               # → cookies sent over HTTP
secret_key=os.getenv("APP_SECRET_KEY", "development-secret-key-change-me"),  # → forgeable sessions and OTP hashes
use_mock_services=_as_bool(os.getenv("USE_MOCK_SERVICES"), True),           # → verification is simulated
```

Each default is individually reasonable for development convenience. Their compound effect: a deployment that fails to set all three environment variables runs a system that issues government aid entitlements based on simulated verification, with forgeable credentials, sent over HTTP. The secret key is used for both session signing and OTP hash computation — a known key enables an attacker to forge sessions, compute correct OTP hashes, and bypass phone verification entirely.

The `.env.example` file compounds this further: it contains `APP_SECRET_KEY=change-me-in-production` — a *different* known key from the code default. Copying the example gives one known key. Not copying it gives another. Neither path produces a secure deployment.

No test catches this. No linter flags it. The health endpoint returns `{"status": "ok"}`.

#### What the other findings look like

The remaining 17 findings follow the same shape — convention-conforming code that replaces a crash with a silent default:

- The external OTP service response crosses from untrusted to authoritative with no validation boundary — `str(body["code"])` silently coerces `null` to `"None"` and stores it as the valid OTP (ACF-T1, ACF-T2)
- The verify endpoint performs six state-changing operations across four separate database transactions — if enablement succeeds externally but the subsequent DB write fails, the voucher code is lost and the entitlement is unrecoverable (ACF-R2)
- Registration validation failures generate no audit event — an attacker probing input boundaries is invisible to the audit trail (ACF-R1)
- The `update_application_status` function returns silently when the application does not exist — evidence of a bug or forged session is absorbed without trace (ACF-R1)
- The enablement service response body is never checked — `{"status": "failed"}` with a 200 OK is treated as success (ACF-T1, ACF-E1)
- The 64-character voucher code — the bearer credential that grants the aid entitlement — is written to the audit trail in plaintext, so that anyone with read access to the audit table can extract every issued credential (ACF-I1)

Each finding is a place where the system will behave correctly until it doesn't — and when it doesn't, nothing in the system's design will make the failure visible.

#### What the agent got right

The same "policy available, not applied" dynamic documented in the longitudinal project's incidents (Appendix E §E.7) appeared here in a greenfield generation by a different agent from a different vendor. The failure shape is consistent across both case studies — and the consistency is sharpened by what the agent got right.

The agent implemented genuine security controls — not toy versions, but the actual patterns a security-aware developer would use. CSRF protection with `secrets.token_urlsafe()`. Constant-time comparison via `secrets.compare_digest()`. OTP hashing with a keyed scheme. Per-IP rate limiting with a thread-safe implementation. Signed session cookies with configurable security flags. Pydantic input validation with strict regex patterns.

The failures are not in the *category* of controls selected but in their *semantic correctness* for this deployment context. A session signed with a known default key performs every cryptographic operation correctly — the HMAC is computed, the signature is verified, the cookie is validated. The ceremony is structurally present. Whether it is providing security depends on a configuration decision the application does not enforce.

### 8.3 Case Study 2: What happens when you have detection

*Full analysis: Appendix E (annotated transcripts). Related: §8.5 (productivity), §8.6 (redirection insight).*

The simulation shows the defect shapes. The question it cannot answer is: how often do these patterns appear in sustained development, and what does it take to catch them?

A second evidence base — six months of daily agentic development on a compliance-constrained data processing platform, approximately 80,000 lines of Python, with agents generating the majority of new code — provides that longitudinal view. The system processes sensitive data under requirements that mandate complete audit trails, data integrity verification, and defence-in-depth security controls.

#### The enforcement regime

The project operates under explicit architectural rules: a tiered authority model for data handling, zero latitude for corruption or substitution on authoritative internal data, quarantine-and-continue for external data, and no defensive programming patterns. These rules are documented extensively but are **institutional knowledge** — they exist in project documentation, not in the programming language. Python permits all of the patterns the project forbids.

The rules are enforced in CI by a project-specific AST pattern-matching tool with an allowlist-based exception regime. The enforcement model is not advisory — it is a gate. A pattern flagged by the enforcer either gets fixed by the agent or requires a human-authored exception with a rationale, an ownership tag, and an expiry date (companion specification, §9).[^reviewer-field] Legitimate uses of otherwise-restricted patterns go through; unconscious pattern completion from training data does not.

#### What detection observes

In steady-state development, a combination of rigorous review and the enforcement tool regularly catches and blocks semantic boundary violations that would otherwise pass conventional tooling — **none entered the codebase**. Each flags a pattern from the ACF taxonomy (primarily ACF-S1 and ACF-R1, with limited intra-function proxy detection of ACF-T1) that the generating agent introduced. Under specific conditions[^rate-caveats], the detection rate is approximately one to two such patterns per day across approximately 25–30 commits per day (the majority agent-generated).[^prompted-against]

The figure is an estimate from a single project. Actual rates will vary with project complexity, codebase size, language, domain, development arrangements, the balance of planned versus ad hoc work, and tooling. This rate occurs despite the agent being explicitly prompted against these patterns in its project-level instructions — the codebase documentation prohibits `.get()` on typed objects, bare `except`, and silent error swallowing; the agent's system prompt reinforces these rules. The agent still produces the violations because the patterns are deeply embedded in training data and override project-level instructions under context pressure. Without specific prompting, the rate is substantially higher.[^prompted-against]

#### Scope and methodological caveats

Six aspects of the detection rate merit attention:

**What the rate measures:**

- **The rate reflects unplanned work.** Violations occur predominantly during ad-hoc activities — bug fixing, incremental refactoring, small feature additions — where the agent improvises from training data rather than following a reviewed specification. Planned major work is reviewed against the project's trust topology *before* implementation, catching violations at the design stage.
- **The rate is model-specific and likely transient.** As AI companies prioritise these failure modes for remediation, the absolute rate will likely decrease. The structural argument remains valid regardless of the rate.
- **The rate is a floor, not a ceiling.** The tool's coverage of the ACF taxonomy is incomplete (Appendix A). The detection capability is observing routine agent behaviour, not exotic edge cases. Without specific prompting against these patterns, the rate is substantially higher. Appendix E shows that the same failure shape manifests at design and specification layers; those incidents are not counted in the daily code-level figure.[^coercion-gap]

**How to read the evidence:**

- **The detection rate is a property of the tool and its rule set, not only of the code.** Readers should distinguish between "the tool found violations at rate X" and "violations occur at rate X."
- **The rules always trail the failure modes.** Semantically equivalent failures can be achieved through different syntax — each time a rule is encoded, the agent finds an adjacent pattern that achieves the same semantic failure through syntax the tool does not flag. This is not adversarial; the training data contains many ways to silently absorb wrong types.
- **Pattern-level enforcement has a structural ceiling.** The rule set is a finite enumeration of known failure shapes; the space of semantically equivalent failures is open-ended. Enforcement tooling should ultimately work at the *meaning* level, though pattern-level rules remain necessary as a pragmatic first layer.

!!! note "Reading this figure correctly"
    The violation rate is not the finding. **The finding is that detection required conditions most projects do not have** — purpose-built tooling, an operator with deep codebase familiarity, and explicit project-level rules — and that without those conditions, the same violations would have entered the codebase through normal review, because they look like correct, well-written code.

    The term "violation" may invite a mental model of broken code — exceptions, failed tests, visible misbehaviour. The violations observed here are better characterised as **latent structural weaknesses**: the replacement of a crash with a silent default, the weakening of a trust boundary, the introduction of a fabricated value that degrades the system's capacity to detect or recover from a subsequent fault. The analogy is materials that satisfy a specification but are inappropriate for the load the structure was designed to bear. The structure passes inspection, stands, and continues to stand — until the conditions it was built to withstand actually arrive.

    The significant question the figure raises is not "why is this project producing defects?" but "does your project — or your contracted supplier's project — have equivalent detection?" Most projects do not yet have it.

#### What the failure modes look like in a live codebase

The failure modes map directly to the taxonomy in Appendix A. Three examples from the longitudinal project:

**Fabricated default (ACF-S1).** Agent generates `.get()` with a default value on a data structure where a missing field indicates a critical failure in an upstream internal component — absence is evidence of corruption, not a case to handle gracefully. The code is not merely plausible — it is *correct defensive programming*. A reviewer under time pressure sees "handles the missing case" and approves it, because in most software that is exactly the right pattern.

**Audit trail destruction (ACF-R1).** Agent wraps an audit-critical operation in a `try/except` that logs the error and continues. The code appears to handle errors gracefully. The reviewer does not recognise that the caught exception should propagate to the audit system rather than being logged and swallowed.

**Authority tier conflation (ACF-T1).** Agent deserialises data from an external API and passes it directly to an internal processing function. The code appears clean — no obvious security issues. The reviewer does not see the missing validation boundary because both the external data and internal data are the same Python type (`dict`).

In each case, the defect was caught later — by the enforcement tool, by operator challenge during a coding session, by prompted multi-agent specification review, or by a test failure in a downstream component. The initial review process had signed off.

Across the incidents documented in Appendix E, the recurring pattern was not policy absence but **policy non-application**: the governing rules were present in the agent's context, and the agent could quote them accurately when asked, but it had not consulted them as constraints during its initial work.

The question for organisations without enforcement is not whether these patterns exist in their agent-generated code — it is whether anything is catching them.

### 8.4 Cross-validation: two agents, two projects, same failure shapes

The simulation (§8.2) and the longitudinal observation (§8.3) were conducted on different projects, with different agents from different vendors, in different domains, under different constraints. The same failure modes appeared in both — ACF-S1, ACF-R1, ACF-R2, ACF-T1, ACF-E1, ACF-I1 — because they arise from the same structural cause: the generating agent reaches for the most common pattern in its training data when it lacks the institutional context to know that the common pattern is the dangerous one. The taxonomy was developed from the longitudinal project; the simulation validated it against a codebase and agent the taxonomy was not designed for.

### 8.5 Productivity and the compliance tax (longitudinal observation)

The longitudinal project reports substantial productivity gains from agentic development despite the compliance overhead described above.

**Where agents excel:** Mechanical refactoring (renaming, restructuring, pattern application across files) is handled almost entirely by agents. Boilerplate generation (new plugins, test scaffolding, configuration structures) is dramatically accelerated. Bug investigation and test writing benefit from agents' ability to rapidly explore code paths. The pattern is clear: **agents excel at tasks where correctness is structurally verifiable** (tests pass, types check, linter is clean) and struggle where **correctness requires institutional knowledge** (trust boundary maintenance, audit trail completeness, appropriate error handling in compliance contexts). Appendix E adds an important nuance: agents can be highly effective investigative instruments once directed, but they do not reliably initiate the semantic question that matters.

**The compliance tax.** Governance controls impose a real overhead — the project's retrospective estimate places it at 15–25% of total development time (an informed estimate based on commit-message tagging, not formal time tracking). The distribution is uneven: on large changes, compliance overhead is trivially small relative to the work. On small changes — a one-line bug fix — the agent spends 30 seconds on the fix and 60 seconds grappling with the CI pipeline, rediscovering the enforcement workflow it has never seen in training data. This skew toward small-change cases is where the bulk of the overhead concentrates.

This is not new overhead introduced by agentic coding. It is the same compliance overhead redistributed. Before agents, humans spent that time writing compliant code slowly. With agents, humans spend it reviewing agent output for compliance quickly. The total compliance cost is similar; the development velocity is higher.

### 8.6 The redirection insight (longitudinal observation)

The team's experience reveals that automated semantic enforcement does not *add* tedium — it **redirects existing tedium** toward higher-value activities.

Without automated enforcement, humans manually review every agent output for trust boundary violations. This is:

- **Error-prone:** The failure modes look like correct code (§2.2–2.3)
- **Fatigue-inducing:** Reviewing dozens of agent-generated functions per day for subtle semantic violations degrades review quality (§4.2)
- **Unscalable:** As agent velocity increases, review capacity does not

With automated enforcement, the machine catches structural trust boundary violations (defensive anti-patterns on data in authority-tier contexts, missing validation boundaries)[^taint-paths]. Humans focus on **semantic issues that require institutional knowledge** — whether the trust topology is correctly declared, whether the validation logic is actually correct (not just structurally present), whether the audit trail captures the right information.

This is a genuine improvement in security posture, not just efficiency:

| Reviewer Task | Without Automation | With Automation |
|-------------|-------------------|-----------------|
| "Is `.get()` used on typed objects?" | Human scans for pattern (error-prone) | Machine catches structurally (reliable) |
| "Does this error handler preserve the audit trail?" | Human evaluates (moderate difficulty) | Machine flags broad `except` blocks; human evaluates the specific cases |
| "Is the trust topology correctly declared for this new module?" | Human evaluates (requires institutional knowledge) | Human evaluates (no change — this is irreducibly human) |
| "Is this validation function actually validating?" | Human evaluates (requires domain knowledge) | Machine checks structural presence of control flow; human evaluates semantic adequacy |

The total review burden may be similar, but the **distribution of human attention shifts** from low-value pattern scanning to high-value semantic evaluation. The compliance tax is the same; the assurance yield is higher. Appendix E.6 suggests that this redirection can also occur upstream: specification-level review catches the same failure shapes earlier and at lower remediation cost than code-level challenge after implementation.

**Velocity inverts for remediation.** The paper's core argument (§4) is that agents generate correlated defects faster than humans can detect them. But the same property that makes correlated defects dangerous — the same pattern repeated across many files — makes them tractable to fix at scale once the detection rule exists.

An organisation that discovers unwrapped `record_call` sites across its codebase can dispatch parallel agents to remediate all instances simultaneously; the walltime is independent of the file count.

The bottleneck is not remediation capacity but **detection and specification** — the human semantic work of recognising that a pattern is wrong, understanding why, and encoding that understanding as a rule precise enough to act on. This further strengthens the investment case for semantic enforcement tooling (§7.2): the scarce resource is the detection rule, not the ability to push fixes once the rule exists.

This also refines the "corrections don't stick" argument (§2.4(a)). That argument remains true for *prevention* — the agent will reproduce the same pattern tomorrow regardless of how many times it has been caught. But for *retroactive remediation* — sweeping the codebase for all instances of a newly recognised pattern — agentic velocity is an asset, not a liability. The lifecycle is: (1) human recognises the failure shape, (2) human encodes the detection rule, (3) machine finds all instances, (4) agents fix them in parallel, (5) CI gate prevents recurrence. Each step plays to a different strength: human semantic understanding for detection and specification, machine scale for discovery and remediation, environmental enforcement for prevention.

**Agents as compliant enforcement subjects.** A less obvious but equally important effect: **in the longitudinal project, more compliance work was executed in the agentic workflow than would typically be executed in a purely human one.**

The evidence is indirect but consistent: every commit that touches an enforcement-gated path must satisfy the CI gate before merging, and the commit history shows that agents routinely complete the full compliance cycle on changes where a human developer under deadline pressure would plausibly have deferred the governance step or sought an exception.

The same property that makes agents dangerous — no persistent learning, no internalised shortcuts — makes them unusually compliant enforcement subjects. The agent does not learn the organisation's security rules (§2.4), but it also does not learn which rules it can get away with skipping. It pays the governance tax that humans under deadline pressure quietly defer. For anyone who has audited a development team and found the gap between "documented process" and "what actually happens under delivery pressure," this is a significant finding: agents are simultaneously high-risk authors and unusually compliant subjects of technical control.

This adds nuance to the control-strength hierarchy in §7. Behavioural controls are weak for agents not because the agent will choose to skip them, but because it will not remember them next session. Technical controls (CI gates, pre-commit hooks) are strong for agents for the same reason they are strong for humans — environmental, not volitional — with an additional benefit: the agent will not resent the gate or lobby to have it removed.

A practical consequence: if the CI gate is the primary mechanism catching semantic violations that pass conventional tooling,[^rate-caveats] CI availability becomes mission-critical in a way it typically is not. Every hour the enforcement pipeline is degraded or unavailable is an hour in which those violations may pass through normal review undetected — because they look like correct code.

Teams working at agentic velocity need continuous awareness of enforcement state and predefined procedures for operating without it, analogous to the control law model introduced in §1.3.

This awareness must be team-wide. The current control law — normal, degraded, or offline — is not a background infrastructure metric but operational context that determines what work is reasonable to undertake. Under direct law (no machine enforcement active), high-risk changes such as security-sensitive code, trust-boundary crossings, and authority-tier logic should not proceed, because the controls that would catch semantic violations in those areas are the ones that are offline.

The lesson from these case studies is that **agentic development is viable precisely because the agent will execute governance that humans under pressure quietly defer — but it requires governance designed for the agent's actual failure modes, not the human's.** Agent governance must be environmental (CI gates, not documentation), boundary-enforced (pre-commit, not post-review), and stateless (every session is the first session). Organisations that apply human-shaped governance to agents will get the agent's compliance without catching the agent's mistakes.

### 8.7 Operational tests and replication protocol

Two practical tests would meaningfully challenge the thesis:

- **Practitioner deployment test:** Deploy a small set of ACF-pattern detection rules (targeting, e.g., fabricated defaults on security-classified fields, broad exception handlers on audit paths, and authority-tier boundary violations) on agent-assisted codebases and measure the violation rate over a sustained period. If such rules consistently find zero or near-zero violations across multiple independent projects with active agent use, the threat model's generalisability claim would be substantially weakened.
- **Reviewer catch-rate test:** In a controlled evaluation, present experienced reviewers with agent-generated code containing known ACF-pattern violations at normal review pace and without purpose-built tooling. If reviewers reliably detect the overwhelming majority of violations under these conditions, the review-degradation thesis would be substantially weakened.

The first test is accessible to any team with a CI pipeline and can be run without a formal study. The second requires a controlled evaluation but would provide stronger evidence on the review-capacity question specifically. Together, they offer a credible path from the paper's current pre-empirical status toward empirical validation or refutation.

**Replication protocol.** An independent team seeking to confirm or challenge the reported violation rates would need:

- **A codebase with active agent use in a compliance-constrained or integrity-sensitive context** — the threat model's claims are specific to high-stakes code paths, so replication on a consumer web application without authority-tier distinctions would not test the relevant conditions. Government systems, healthcare, financial audit, or critical infrastructure projects would provide appropriate contexts.
- **A detection mechanism for ACF-pattern violations** — at minimum, a small set of static analysis rules targeting the patterns in Appendix A (fabricated defaults on security-classified or integrity-sensitive fields, broad exception handlers on audit paths, authority-tier boundary crossings without validation). The practitioner deployment test described above provides a starting point. The detection mechanism should be implemented and evaluated independently of the paper's author, even if it draws on the same conceptual categories, to reduce the confirmation bias structure acknowledged in §1.4.
- **A measurement period of sufficient duration** — the case study reports an estimated rate of approximately one to two semantic boundary violations per day, but this estimate reflects one developer's work on a specific codebase with a particular agent configuration, compliance burden, and balance of planned versus ad hoc work. Replication should measure over weeks rather than days, and should report both the absolute violation count and a denominator (violations per N agent-generated functions, per K lines changed, or per M commits) to enable meaningful comparison. Caveats on the observed rate appear in §8.3.
- **Controlled comparison where feasible** — the strongest replication design would compare violation rates in agent-generated code against a baseline of human-authored code in the same codebase under the same detection rules, to distinguish agent-specific failure patterns from general coding errors that any developer might produce.

Even a partial replication — deploying detection rules on one agent-assisted project for 30 days and reporting the violation rate with denominator context — would materially advance the evidence base beyond this paper's single-project observation.

[^taint-paths]: The current enforcement tool operates at the AST pattern-matching level — detecting defensive anti-patterns (`.get()` with defaults, `hasattr()` gates, broad `except` blocks) in authority-tier contexts. Full taint path analysis (tracking data flow across function boundaries) is a capability of the companion specification's design (see companion specification, Part II-A §A.3), not the current tool.

[^reviewer-field]: The current implementation uses category-level ownership tags (e.g., "architecture", "bugfix") rather than individual reviewer names. The companion specification (§9.1, §13.1.3) requires reviewer identity as part of the exception governance model — the specific field format is a v0.1 implementation decision.

[^prompted-against]: The underlying behaviour is trivially reproducible by any practitioner prompting a general-purpose coding agent to write error handling or data access code.

[^rate-caveats]: The specific conditions: a single ~80,000-line Python codebase, one developer's work, with purpose-built semantic enforcement tooling and rigorous human review — conditions most projects do not currently have. Three further caveats. (1) This rate occurs predominantly during unplanned work — bug fixing, ad-hoc refactoring, small feature additions — where the agent improvises from training data rather than following a reviewed specification. Planned major refactors and new components are reviewed against the project's trust topology before implementation, catching violations at the design stage. (2) The rate is model-specific, reflecting models available during the observation period; as AI companies prioritise these failure modes for remediation, the absolute rate will likely decrease. (3) The structural argument — that these patterns are embedded in training data and that agents lack persistent learning — remains valid regardless of the specific rate. The "one to two" framing reflects that the tool's taxonomy coverage is incomplete and that incidental discovery during non-development work corroborates the daily rate as a floor.

[^coercion-gap]: In a concrete example from the longitudinal project, peer checkpoint modules established a rigorous deserialisation pattern: set-based required-field checks, `isinstance` type guards, and `AuditIntegrityError` on any anomaly. A later addition used `int()` and `str()` coercion instead — a semantically equivalent trust boundary violation that the enforcement tool did not flag because its rule set targeted defensive access patterns (`.get()`, `getattr()`), not coercion functions. The agent defaulted to the statistically common coercion pattern from training data rather than following the established project convention, despite having access to the peer modules as examples.

---
