### 3. Non-goals

The following are explicitly outside the scope of the implementation. They are stated early and stated flatly, because most of the ways a wardline deployment can produce false assurance begin with someone assuming one of them is in scope.

1. **Wardline does not prove semantic correctness.** It detects structural proxies for semantic violations in declared contexts — signals that correlate with semantic errors, not the errors themselves. It can decide whether a validating boundary is *capable of rejecting anything*; it cannot decide whether it rejects the *right* thing. A validator that has a rejection path but checks the wrong predicate passes every rule in §6. This limit is a property of the model, not a defect in it, and it is restated in §9.

2. **Wardline does not replace human judgement.** It structures what judgement must address: where the boundaries are, which of them are load-bearing, and which findings are worth a waiver. It does not resolve those questions and does not record who resolved them (§7).

3. **Wardline does not establish provenance across storage boundaries.** The designed specification (archived) proposed trusted restoration boundaries with four categories of provenance evidence, one of which was explicitly institutional and unverifiable by any tool. None of it was built (§10). What exists is `PY-WL-120`, which flags stored or persisted taint reaching a trusted state — a conservative rule, not a provenance model.

4. **Wardline does not eliminate the need for ordinary assurance controls.** It supplements them. Linters, type checkers, general-purpose SAST, DAST, tests, and peer review all remain necessary. Roughly half of wardline's rule set overlaps with what a mature SAST product already covers (§2); the half that does not is the trust-declaration layer, and that layer assumes the rest of the stack is doing its job.

5. **Wardline is static only.** There is no type-system enforcement layer and no runtime structural layer; both were designed and neither was built (§10). Nothing wardline says is enforced at runtime. The decorators are runtime no-ops by design — they mark, they do not check.

6. **Wardline does not guarantee coverage of risky code paths, and by design it does not try to.** Coverage is a function of declaration investment, and undeclared code is outside the enforcement perimeter as a matter of definition, not oversight.

7. **Wardline does not replace software design.** It constrains part of the search space — where data is validated, what a function may assume, how failures propagate through trusted code. It says nothing about performance trade-offs, library choices, concurrency models, deployment constraints, or operational assumptions.

#### 3.1 The opt-in corollary

Non-goal 6 deserves its own statement, because it is the deliberate design position that most distinguishes the implementation from the designed specification, and because it is the one most easily mistaken for a weakness.

Wardline is silent until you opt in. The README states it directly: "Wardline is silent until you opt in. Undecorated code sits in the developer-freedom zone." Mechanically, undecorated code resolves to `UNKNOWN_RAW`, and the tier-modulated severity model treats that state as the freedom zone and suppresses to `NONE` (§6). This applies to the sink rules as well as the boundary rules — the sink family runs the same modulation, and its own source describes the path as "undecorated → `UNKNOWN_RAW` → modulate → `NONE`". A scan over a large untouched codebase therefore produces no policy findings at all; the severity model's docstring names freedom-zone suppression as what keeps wardline self-host clean, and its CI scans its own source on every run (§8). You declare trust on the functions that matter, and only then does anything get enforced.

This is the opposite of the usual static-analysis posture, which is to fire on everything plausible and let the team suppress the noise. It buys two things: adoption without a suppression bankruptcy on day one, and findings that are about a claim someone actually made rather than about a pattern someone might not have intended. A separate and independently enforced control — a labelled-corpus false-positive rate gate of ≤ 5% (§8) — constrains precision on the code that *has* opted in.

It costs one thing, and the cost is severe: **a project that declares nothing gets a green gate that is enforcing nothing.** `wardline scan . --fail-on ERROR` over an unannotated codebase exits 0. That is not a bug — there are no declarations to violate — but it is indistinguishable, from the outside, from a codebase that passes because it is clean. The designed specification never confronted this, because its manifest-first model assumed a manifest would always exist.

The implementation's answer is the inertness trip: a scan that recognises no trust boundaries over a non-trivial amount of code is *inert*, and `--fail-on-inert` turns that verdict into a gate failure that no suppression can clear. §7.2 owns the mechanics, the released-versus-branch status of the flag, and the reason nothing can clear the trip. What matters to the non-goal is the default. The flag is off, alongside its sibling `--fail-on-unanalyzed`, so the compensating control is a switch a deploying team throws rather than a posture the tool ships with.

The non-goal and the compensating control belong together. Wardline declines to guess what should be enforced, and in exchange it offers a way to fail loudly when nothing is being enforced at all. A deployment that adopts the first half without the second has bought a green light and nothing else.
