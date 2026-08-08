---
title: "Annotation Vocabulary"
weight: 3
---

A wardline MUST be able to express the following categories of institutional knowledge. Each category represents a class of semantic constraint that is not addressed by standard tooling but routinely violated by agent-generated code. The categories are stated here as declaration requirements — what an application MUST be able to express — not as syntax in any particular language.

These 17 groups are the minimum practical declaration surface required for this framework's threat model. They are empirically derived (groups 1–8 from case study, 9–17 from generic extension) and expected to evolve as the framework is applied to additional codebases and domains.

The groups fall into two categories:

- **Core classification annotations** (groups 1–4, 16–17) declare the application's trust topology — which data belongs to which authority tier, where trust boundaries lie, and how data may cross them. These are the annotations that define the wardline's classification function.
- **Supplementary contract annotations** (groups 5–15) declare code-behaviour contracts — failure modes, sensitivity handling, lifecycle constraints — that the enforcement tool can verify but that are not classification decisions in themselves.

Both categories are part of the wardline vocabulary and REQUIRED for conformance, but the distinction clarifies what the wardline *classifies* (trust topology) versus what it additionally *enforces* (code contracts). Organisations adopting the framework incrementally may deploy core classification annotations first and add supplementary contract annotations as annotation investment grows.

## Core classification annotations

| # | Group | Institutional Knowledge | Key Declarations | Enforcement Consequences |
|---|-------|------------------------|------------------|--------------------------|
| **1** | **Authority Tier Flow** | Where the system's trust boundaries are — which functions receive external data, shape-validate it, semantically validate it, read authoritative records, or write to the audit trail | `@external_boundary`; `@validates_shape` (T4 to T3); `@validates_semantic` (T3 to T2); `@validates_external` (combined T4 to T2); `@tier1_read`; `@audit_writer`; `@authoritative_construction` | Taint analysis between declared boundaries. Pattern rules activate per enclosing tier. Data reaching a sink without the validation required by its target tier produces a finding. |
| **2** | **Audit Primacy** | Which operations constitute the legal record and their ordering constraints relative to telemetry and logging | Audit-critical operation; audit ordering | No catch-and-continue around audit calls. On any execution path where both audit and telemetry calls occur, the audit call must dominate the telemetry call. Fallback paths that skip the audit call produce a finding. |
| **3** | **Plugin/Component Contract** | Which components are system-owned and what failure semantics apply | System-owned component | Crash-not-catch on internal failures. Broad exception handling within system components produces a finding. |
| **4** | **Data Provenance** | Which data sources are provenance-sensitive — internal data that carries authority distinct from external input. Group 4 declares the *sources*; Group 17 declares the *restoration act* by which serialised representations regain their tier | Internal data source | AUDIT_TRAIL body restrictions — no fallback defaults, no broad exception handling. Parse failure on internal data is an integrity failure, not a data quality issue. |
| **16** | **Generic Trust Boundary** | Parameterised tier transitions for non-standard trust models. Two declaration types: **trust boundary** (enforcement-bearing tier transition) and **data flow** (descriptive documentation marker — no enforcement activated) | Trust boundary (from-tier, to-tier): tier values 1, 2, 3, 4. Constraint: to-tier=1 is valid only when from-tier=2. Data flow (consumes, produces): descriptive-only | Trust boundary: parameterised tier flow validation. Declared transitions must be structurally supported. Skip-promotions to Tier 1 (e.g., T4 to T1, T3 to T1) are schema-invalid. Data flow: no enforcement consequences — the declaration documents the function's tier role for humans and tooling but does not activate pattern rules. |
| **17** | **Restoration Boundaries** | The governed restoration act by which raw representations may be restored to a tier supported by available evidence — distinct from Group 4, which declares provenance-sensitive data sources | Trusted restoration boundary; provenance evidence categories | Structural verification applies. Four evidence categories (structural, semantic, integrity, provenance-institutional) govern the restoration. Institutional evidence is the gate between known-provenance tiers (T1–T3) and unknown-provenance states (UNKNOWN_*). See [Enforcement specification]({{< relref "enforcement" >}}). |

## Supplementary contract annotations

| # | Group | Institutional Knowledge | Key Declarations | Enforcement Consequences |
|---|-------|------------------------|------------------|--------------------------|
| **5** | **Schema Contracts** | That transformations must map all fields from a source type, that outputs conform to declared schemas, that field coverage is complete, that optional fields with approved defaults are declared as such, and that schema-level defaults on tier-classified fields are governed — partial mappings and unmapped output fields risk silent data loss; undeclared defaults on external data risk silent data fabrication; defaults declared in schema definitions on fields that participate in tier-classified flows are semantically equivalent to optional-field declarations and SHOULD be scanned and governed as such | Complete field mapping from declared source type; output schema; field completeness; optional field with approved default; schema-level default governance | All fields of the source type must be accessed. Unmapped fields produce a finding. Multiple functions declaring the same output field produce a collision finding. Schema-level defaults on fields that participate in tier-classified data flows SHOULD be treated as implicit optional-field declarations. |
| **6** | **Layer Boundaries** | The application's architectural layering and permitted dependency direction | Layer membership (level or name) | Import/dependency direction enforcement. Reverse-direction imports produce a finding. |
| **7** | **Template/Parse Safety** | That certain operations (template compilation, schema parsing) should occur at initialisation, not per-record | Initialisation-only operation | Call-site context analysis. Initialisation-only functions called from per-record processing paths produce a finding. |
| **8** | **Secret Handling** | Which functions handle sensitive credentials and what restrictions apply to their outputs | Secret handler | Return values must not be persisted in plaintext or logged. Taint tracking follows the return value to output paths. |
| **9** | **Operation Semantics** | Whether a function is idempotent, atomic, or compensatable | Idempotent; atomic; compensatable | Guard-before-side-effect for idempotent functions. Transaction context for atomic functions. Declared compensation for compensatable functions. |
| **10** | **Failure Mode** | How a function is required to fail and which functions may make terminal exception policy decisions | Fail-closed; fail-open; emit-or-explain; exception translation boundary | Declared vs actual failure behaviour comparison. Fail-closed functions with fallback paths produce a finding. Only authorised functions may translate exceptions from high-stakes paths. |
| **11** | **Data Sensitivity** | Which functions handle PII or classified data, and which are authorised to downgrade classification level | PII handler; classified data handler; classification downgrade authority | Sensitive data must not appear in logs, error messages, or unprotected output. Taint tracking follows sensitive data through callers. Classification downgrade requires explicit declaration; undeclared downgrades are findings. |
| **12** | **Determinism** | Whether a function must produce identical output for identical input | Deterministic; time-dependent | Deterministic functions must not call non-deterministic operations (RNG, wall-clock, unordered iteration). |
| **13** | **Concurrency/Ordering** | Thread safety, ordering constraints, reentrancy restrictions | Thread-safe; ordered-after; not-reentrant | Ordering verified at call sites. Invoking B without prior invocation of declared predecessor A produces a finding. |
| **14** | **Access/Attribution** | Which operations require authenticated identity or elevated authorisation | Requires identity; privileged operation | Authorisation check must precede privileged action. Identity must be propagated to the function. |
| **15** | **Lifecycle/Scope** | Whether code is test-only, deprecated, or feature-gated | Test-only; deprecated-by; feature-gated | Test-only imports from production produce a finding. Post-expiry use of deprecated functions produces a finding. |

## Language bindings

The annotation vocabulary is language-agnostic. Language bindings map these groups to concrete syntax:

- **Python binding** — decorators (e.g., `@tier1_read`, `@validates_shape`). See [Python binding]({{< relref "python-binding" >}}).
- **Java binding** — annotations (e.g., `@Tier1Read`, `@ValidatesShape`). See [Java binding]({{< relref "java-binding" >}}).

---

## See also

- [Authority tier model]({{< relref "wardline/authority-tier-model" >}}) — the four-tier foundation these annotations classify
- [Enforcement specification]({{< relref "wardline/enforcement" >}}) — how annotations drive taint analysis and enforcement
- [Pattern rules]({{< relref "rules" >}}) — the rules these annotations enable
