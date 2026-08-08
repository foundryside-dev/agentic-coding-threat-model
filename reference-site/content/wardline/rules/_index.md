---
title: "Pattern Rules"
weight: 5
bookCollapseSection: true
---

Eight rules in two categories. **Six pattern rules** (WL-001 through WL-006) detect syntactic proxies for semantic violations in declared semantic contexts. Each takes the form: "if the application declares context X, then pattern Y is prohibited." **Two structural verification rules** (WL-007 and WL-008) enforce invariants on declared boundary functions — they verify structural properties of the boundary itself rather than detecting patterns within annotated bodies.

All eight rules are language-agnostic — they describe structural patterns whose danger depends on the declared semantic context, not on syntax alone. The distinction matters for conformance: pattern rules and structural verification rules have different conformance criteria and may be implemented by different tools.

## Rule summary

| Rule | Pattern | Category |
|------|---------|----------|
| [WL-001]({{< relref "wl-001" >}}) | Member access with fallback default | Pattern rule |
| [WL-002]({{< relref "wl-002" >}}) | Existence-checking as structural gate | Pattern rule |
| [WL-003]({{< relref "wl-003" >}}) | Catching all exceptions broadly | Pattern rule |
| [WL-004]({{< relref "wl-004" >}}) | Catching exceptions silently | Pattern rule |
| [WL-005]({{< relref "wl-005" >}}) | Audit-critical writes in broad handlers | Pattern rule |
| [WL-006]({{< relref "wl-006" >}}) | Runtime type-checking internal data | Pattern rule |
| [WL-007]({{< relref "wl-007" >}}) | Validation with no rejection path | Structural verification |
| [WL-008]({{< relref "wl-008" >}}) | Semantic validation without shape validation | Structural verification |

## Severity matrix

Each cell encodes severity / exceptionability as a two-letter code. Severity: **E** = Error (wrong in this context), **W** = Warning (suspicious), **Su** = Suppress (expected). Exceptionability: **U** = Unconditional (never overridable — project invariant), **St** = Standard (overridable with documented rationale, reviewer identity, and expiry), **R** = Relaxed (lighter governance burden), **T** = Transparent (corresponds to SUPPRESS cells — the pattern is expected in this context, no governance required). Suppress severity always pairs with Transparent exceptionability (Su/T). Read across a row to see how a single rule varies by context; read down a column to see how a single context treats all rules.

WL-007 and WL-008 are structural verification rules (not pattern rules) and apply only to declared boundary functions, but are shown in the matrix for completeness. Their severity is unconditional across all contexts because they are framework invariants rather than context-dependent judgements.

| Rule | Audit Trail | Pipeline | Shape Val. | Ext. Raw | Unk. Raw | Unk. Shape V. | Unk. Sem. V. | Mixed Raw |
|------|---|---|---|---|---|---|---|---|
| **WL-001** | E/U | E/St | E/St | E/St | E/St | E/St | E/St | E/St |
| **WL-002** | E/U | E/U | E/U | E/St | E/St | E/St | E/U | E/St |
| **WL-003** | E/U | E/St | W/St | W/R | E/St | W/St | W/St | E/St |
| **WL-004** | E/U | E/St | E/St | E/St | E/St | E/St | E/St | E/St |
| **WL-005** | E/U | E/U | E/St | E/St | E/St | E/St | E/St | E/St |
| **WL-006** | E/St | W/R | W/R | Su/T | Su/T | W/R | W/R | W/St |
| **WL-007** | E/U | E/U | E/U | E/U | E/U | E/U | E/U | E/U |
| **WL-008** | E/U | E/U | E/U | E/U | E/U | E/U | E/U | E/U |

Of the 64 cells, 25 (39%) are UNCONDITIONAL — project invariants that are not configurable. This high ratio is a deliberate design choice: these cells represent patterns that are always wrong in their declared context regardless of justification — the non-negotiable core of the wardline. For teams that encounter a genuinely legitimate use of an UNCONDITIONAL pattern, a structured disagree workflow routes the finding for framework-level review rather than silently suppressing it.

## Validity categories

Three categories of validity underpin the rule vocabulary:

- **Structural validity** — machine-verifiable properties: field presence, type conformance, structural contract adherence. Enforcement tools can check these without human judgement.
- **Semantic validity** — properties requiring human judgement: whether a default is institutionally appropriate, whether an exception translation preserves severity, whether a field mapping captures the intended meaning.
- **Authority restoration** — properties requiring institutional permission: whether a serialised representation may be restored to a tier supported by available evidence, governed through restoration boundary declarations.

Pattern rules operate at the structural-validity layer: they detect structural signals that correlate with semantic violations. They do not verify semantic correctness directly.

## Living pattern catalogue

WL-001 through WL-006 are a starting vocabulary, not a closed set. Each pattern rule detects a syntactic proxy for a semantic violation, and models that learn to avoid flagged patterns will produce semantic equivalents — helper wrappers, conditional assignments, schema-level defaults, language-specific suppression idioms — that carry the same risk but do not match the original AST pattern. Language bindings MUST maintain version-tracked lists of semantic equivalents for each pattern rule, extending detection coverage as new evasion variants are identified. The precision/recall corpus SHOULD include evasion-variant specimens alongside standard specimens, so that detection of semantic equivalents is measured under the same precision floors as the base patterns. The rule set evolves as model capability evolves: patterns that current models produce clumsily will be produced cleanly by future models, and the enforcement surface must track that trajectory deliberately rather than assuming a fixed pattern vocabulary.

## Worked examples

Six pressure-point cells illustrate the matrix's reasoning:

**(a) WL-001 is always ERROR in EXTERNAL_RAW.** A fallback default on external data fabricates evidence of input shape that was never observed. The fabricated value propagates forward through the T4-to-T3 shape-validation step and then through the T3-to-T2 semantic-validation step into the Tier 2 record. The two-step validation pipeline makes this *more* dangerous: a fabricated default will typically survive shape validation (it has the right type) and may also survive semantic validation (it has a plausible value).

**(b) WL-002 is UNCONDITIONAL in SHAPE_VALIDATED but STANDARD in EXTERNAL_RAW.** Shape-validated data has passed structural validation — field presence and type correctness are guaranteed. An `if "field" in record:` check on shape-validated data is unconditionally wrong. In EXTERNAL_RAW, the same check may be legitimate — field presence is genuinely uncertain.

**(c) WL-003 is WARNING/STANDARD in SHAPE_VALIDATED but WARNING/RELAXED in EXTERNAL_RAW.** Shape-validated data has known structure, so broad exception catching is more suspicious. In EXTERNAL_RAW, broad exception catching during parsing is tolerable (external data is expected to be malformed).

**(d) WL-006 is WARNING/RELAXED in SHAPE_VALIDATED but SUPPRESS in EXTERNAL_RAW.** The structural contract has confirmed types at Tier 3, so runtime type-checking is partially redundant. In EXTERNAL_RAW, type-checking is expected and appropriate.

**(e) WL-005 is UNCONDITIONAL in PIPELINE.** Audit-critical writes inside broad exception handlers in pipeline contexts destroy diagnostic context for data transformation errors. Because pipeline data feeds downstream consumers, lost audit context is an integrity failure regardless of justification.

**(f) WL-003 in UNKNOWN_RAW vs EXTERNAL_RAW.** Broad exception catching in UNKNOWN_RAW is ERROR/STANDARD — more severe than EXTERNAL_RAW's WARNING/RELAXED. In unknown-origin data, the code does not know whether the data is malformed external input or corrupted internal state, and the broad catch prevents the distinction from surfacing.

## Derivation principles

Three principles govern the matrix:

**Severity** answers "is this pattern correct in this context?" ERROR means the pattern is wrong regardless of intent — the wardline has declared that this context prohibits it. WARNING means the pattern is suspicious and should be reviewed. SUPPRESS means the pattern is expected or harmless in this context (e.g., type-checking external data at runtime is expected, not suspicious).

**Exceptionability** answers "can a human override this finding?" UNCONDITIONAL means the finding cannot be overridden — it is a project invariant, hardcoded in the wardline. STANDARD means the finding is wrong by default but overridable through the governance model with documented rationale, reviewer identity, and expiry. RELAXED means lighter governance burden — warning-level findings that can be acknowledged with less ceremony.

**Distribution.** Of the 64 cells, 25 (39%) are UNCONDITIONAL. This ratio is high by industry standards for static analysis. The high UNCONDITIONAL proportion is a deliberate design choice: these cells represent patterns that are always wrong in their declared context regardless of justification. The remaining cells are governable, with the governance burden proportional to severity.

## Taint analysis scope

Taint analysis for tier-flow enforcement is scoped to explicit flows (data dependencies) only. An explicit flow occurs when data from one tier is directly assigned, passed, or returned to a sink expecting a different tier. Implicit flows (control dependencies — where the mere fact that a branch was taken leaks information about a tier-classified value) are identified as a tool quality target for future enforcement but are not required by this framework.

### Implicit-flow evasion heuristic

Full implicit-flow analysis is not required, but the dominant implicit-flow evasion pattern is detectable with a simple heuristic. Enforcement tools SHOULD flag functions that contain both (a) a conditional branch whose predicate depends on a tier-classified value and (b) an assignment in both branches to the same target variable. This pattern launders tier-classified information into an untracked variable without any explicit data flow. Findings from this heuristic SHOULD be classified as WARNING/STANDARD.

**Field sensitivity as a binding capability.** The `join_fuse` / `join_product` distinction enables bindings to implement field-level taint tracking for named product types — dataclasses, records, POJOs, and equivalent structures where field membership is statically resolvable. When a binding implements the `MIXED_TRACKED` extension state, taint analysis operates at field granularity within product-type composites. Bindings that do not implement field sensitivity apply `join_fuse` semantics uniformly — the conservative fallback.

---

## See also

- [Python language binding]({{< relref "wardline/python-binding" >}}) — Python-specific rule implementations
- [Java language binding]({{< relref "wardline/java-binding" >}}) — Java-specific rule implementations
