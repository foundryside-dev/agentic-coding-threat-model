---
title: "Residual Risks"
weight: 9
---

Fourteen risks are inherent to the wardline model regardless of language, tooling, or governance maturity. They are structural limitations, not implementation defects.

| # | Risk | Compensating control |
|---|------|---------------------|
| 1 | **Declaration correctness** — the wardline itself could be wrong. If the wrong tier is declared for a data source, enforcement is structurally correct but semantically meaningless. The tool faithfully enforces the wrong policy. | [Governance model]({{< relref "governance" >}}), baseline ratification with classification confirmation, and independent review of trust-escalation declarations. |
| 2 | **Governance decay** — every governance gate is a human activity. Under sustained pressure, each becomes a candidate for rubber-stamping. The wardline cannot verify the quality of the human judgement that governs it. | Annotation fingerprint baseline, which makes governance erosion detectable even if it cannot prevent it. |
| 3 | **Serialisation boundary blindness** — static analysis cannot cross the serialisation boundary to verify that bytes on disk were written by a trusted code path. Trust-escalation declarations at serialisation boundaries are governance-verified only. This converges with risk 9 at restoration boundaries. | Restoration boundaries with provenance evidence requirements. |
| 4 | **Annotation coverage gaps** — unannotated code is invisible to the enforcement system. A function without annotations is not checked and its data flow is not traced. | Coverage metrics in the fingerprint baseline. Coverage below 100% means the wardline has blind spots — those blind spots must be visible. |
| 5 | **Semantic downgrade** — a function authorised as an exception translation boundary could translate high-severity errors into generic warnings, defeating the original function's intent. Static analysis can enforce *structural* authorisation but not *semantic* appropriateness. | Golden corpus specimens for exception translation boundaries, and governance review of functions granted translation authority. |
| 6 | **Expedited governance path normalisation** — every expedited path becomes the default under sustained delivery pressure. The ratio of expedited to standard approvals is a leading indicator. | Expedited governance ratio metric with project-defined threshold. |
| 7 | **Implicit-flow taint bypass** — the framework scopes taint analysis to explicit flows only. An implicit flow (branch taken leaks tier-classified value) launders taint through control flow. Deliberately accepted because implicit-flow analysis is computationally expensive and a prolific source of false positives. | Prompted review and code inspection at tier boundaries. |
| 8 | **SHOULD-layer verification gap** — the six verification properties apply to the static analysis layer. There is no equivalent verification mechanism for the type system layer or runtime structural layer. | Bindings MAY extend the golden corpus to cover type system and runtime enforcement — a tool quality target, not a framework invariant. |
| 9 | **Adversarial annotation injection** — deliberate or agent-generated misannotation. Distinct from risk 1 (honest error). An agent may produce structurally valid but semantically dishonest declarations. The highest-risk combination is adversarial injection at restoration boundaries, where this risk and risk 3 converge. | Code review of annotation correctness, structural checks ([WL-007]({{< relref "rules/wl-007" >}})), fingerprint baseline. The fingerprint baseline's hash scope (annotation declarations only, not function bodies) is a deliberate trade-off creating a documented gap. |
| 10 | **Contract adequacy** — the `bounded_context.contracts` declaration makes the scope of a Tier 2 claim explicit, but the enforcement tool cannot verify that it is *adequate*. A validator that declares a contract but only checks half the constraints passes all structural checks. | Contract declarations are reviewable and auditable. The separation of contracts from contract bindings means governance review focuses on semantic adequacy rather than function-name bookkeeping. |
| 11 | **MIXED state coarseness** (partially addressed) — the `join_fuse`/`join_product` distinction and `MIXED_TRACKED` extension state reduce false-positive volume on container types. The risk is reduced but not eliminated: bindings may implement `MIXED_TRACKED` inconsistently. | Bindings declare tracked product types, demonstrate precision through golden corpus, and inherit MIXED_RAW severity unless they explicitly narrow it. |
| 12 | **Evasion surface trajectory** — the evasion surface grows as model capability grows, but partially reverses in codebases with high annotation coverage. As models improve at producing *structurally clean but semantically wrong* code, they route around syntactic tripwires. But annotations constrain the generation space, reducing violations. The net effect: coding-level risk falls with annotation coverage; governance risk rises. | Version-tracked semantic equivalent lists, adversarial golden corpus specimens, and governance mechanisms addressing the manifest as a policy surface. |
| 13 | **Governance-layer attack surface** — manifest poisoning, governance fatigue exploitation, and boundary declaration manipulation target the governance mechanisms themselves. These are harder to detect than code-level evasion because they exploit the guardrails. The irreducible residual: governance quality depends on human attention, and human attention is the resource the governance model is designed to economise. | Two-person review for tier changes and boundary widenings, anomaly detection for change patterns, mandatory human ratification for agent-originated policy changes. See the [governance model]({{< relref "governance" >}}) manifest threat model. |
| 14 | **Third-party library boundary taint** — government applications depend on third-party libraries outside the wardline's annotation surface and governance perimeter. The enforcement tool cannot verify a library's internal validation logic. | `dependency_taint` declarations in the [manifest]({{< relref "portability" >}}) with version-pinned package constraints, fingerprint baseline flagging when dependency versions change, and the application's own validation boundaries as the terminal control. |

## Third-party library boundary taint — extended discussion

The framework addresses third-party library boundaries through `dependency_taint` declarations — overlay entries that assign taint states to third-party function return values with governance rationale and version pinning. These are taint source declarations, not boundary declarations: the library function's return value is classified, but the library itself is not treated as a wardline validation boundary.

Three residual risks remain:

1. The taint declaration may be inaccurate — a library function declared as returning SHAPE_VALIDATED may not actually guarantee structural properties.
2. Library updates may silently change the function's validation behaviour, invalidating the taint assumption. Version pinning and fingerprint baseline flagging provide a leading indicator.
3. The default conservative treatment (UNKNOWN_RAW) may generate governance noise, creating pressure to over-declare taint states.

### Signed boundary declarations for co-governed systems

In multi-system projects where the same governance authority controls both sides, the producing system MAY publish a signed boundary declaration attesting to the taint state of data it emits. This is intra-organisational trust, not external trust.

### Upstream advisories for external libraries

Third-party maintainers MAY publish a `wardline-upstream.yaml` advisory describing their functions' behaviour in wardline-relevant terms. These are strictly informational — they help agencies write better `dependency_taint` entries but do not change the trust model. Data from a third-party library enters the application as UNKNOWN_RAW regardless.

```yaml
# wardline-upstream.yaml — shipped at the package root
package: "my-library"
advisory_version: "1"
version_range: ">=2.0,<3.0"
functions:
  - function: "my_library.process"
    advisory_taint: "UNKNOWN_RAW"
    validation_claim: "none"
    failure_mode: "raises"
    description: "Parses input; performs no validation. Raises ValueError on malformed input."
  - function: "my_library.validate_record"
    advisory_taint: "UNKNOWN_SHAPE_VALIDATED"
    validation_claim: "structural"
    failure_mode: "raises"
    description: "Validates structural shape against schema. Does not check value constraints or domain rules."
  - function: "my_library.load_raw"
    advisory_taint: "UNKNOWN_RAW"
    validation_claim: "none"
    failure_mode: "returns_default"
    description: "Loads data from file. Returns empty dict on missing file — callers should treat absence as an error, not a default."
```

Per-function fields: `function` (fully qualified path), `advisory_taint` (one of the canonical taint tokens — the maintainer's recommendation, not a trust assertion), `validation_claim` ("none", "structural", "semantic", or "both" — what the function claims to validate), `failure_mode` ("raises", "returns_none", "returns_default", or "silent" — how the function handles invalid input), `description` (free text). The `version_range` field specifies which package versions the advisory covers; enforcement tools SHOULD warn when the installed version falls outside the advisory's declared range.

Enforcement tools that discover upstream advisories SHOULD present them to governance reviewers but MUST NOT auto-generate `dependency_taint` entries without governance review — the advisory informs the reviewer's decision; it does not replace it.

---

## See also

- [Governance model]({{< relref "governance" >}}) — governance mechanisms that address these risks
- [Verification and conformance]({{< relref "verification" >}}) — golden corpus and precision/recall requirements
- [Portability and manifest format]({{< relref "portability" >}}) — dependency taint declarations
- [Python binding]({{< relref "python-binding" >}}) — Python-specific residual risks
- [Java binding]({{< relref "java-binding" >}}) — Java-specific residual risks
