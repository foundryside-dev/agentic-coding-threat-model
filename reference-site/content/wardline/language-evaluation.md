---
title: "Language Evaluation Criteria"
weight: 8
---

The wardline classification framework is language-agnostic; language-specific enforcement regimes implement its requirements using language-native mechanisms. Not all languages provide equal support across the three enforcement layers. The following rubric assesses how well a given language ecosystem supports wardline enforcement across the three enforcement layers and the conformance profiles defined in the [verification and conformance]({{< relref "verification" >}}) section.

## Evaluation rubric

| Criterion | What to assess |
|-----------|---------------|
| **Annotation expressiveness** | Can the language express all 17 annotation groups at function, class, and field level without runtime overhead? |
| **Parse tree access** | Does the language provide AST or equivalent for static analysis? Is the parse tree stable across versions? |
| **Type system metadata** | Can type annotations carry tier/trust metadata? Does the type checker propagate this metadata through assignments, calls, and returns? |
| **Structural typing** | Can the type system distinguish raw, shape-validated, and semantically validated data with identical field structures? |
| **Runtime object model** | Can the language prevent invalid access patterns structurally (raising on access, not defaulting)? |
| **Class hierarchy enforcement** | Can base classes constrain what subclasses may do — preventing unannotated method addition? |
| **Serialisation boundary control** | Can the language detect or prevent tier violations at serialisation/deserialisation boundaries? |
| **Tooling ecosystem** | Does the language have mature static analysis infrastructure (custom lint rules, AST analysis frameworks)? |
| **Existing tool coverage** | Can existing tools in this ecosystem implement wardline conformance profiles without requiring a bespoke product? Which profiles are achievable through plugins or extensions to existing tools, and which require new tooling? |

## Advisory-to-structural spectrum

Language bindings exist on a spectrum from advisory to structural:

- **Advisory end** (e.g., Python decorators) — annotations are metadata that enforcement tools read but the language itself does not enforce. A decorator marks a function as `@tier1_read`, but nothing in the language prevents the function from violating Tier 1 constraints.
- **Structural end** (e.g., Rust phantom types encoding tier as a zero-sized type parameter) — annotations are type constraints that make non-compliant code unrepresentable. Tier mismatches are compile errors, not lint findings.

Stronger bindings reduce *generation risk*: an agent coding against a structural binding receives tighter feedback and produces fewer violations, because the language itself rejects non-compliant code before any wardline tool runs. However, stronger bindings do not reduce *governance risk*: the type definitions that encode tier semantics still need human ratification, periodic review, and change authority. A Rust binding where tier assignments are wrong at the type level produces code that is structurally compliant with the wrong policy — the same manifest poisoning risk as any other binding, expressed through the type system rather than through decorator metadata.

## Per-language characteristics

Languages with stronger type systems (Rust, Haskell) may provide better type-system-layer coverage while requiring less runtime enforcement. Languages with rich object models but weaker types (Python, Ruby) may rely more heavily on runtime structural enforcement. Languages with minimal runtime introspection (C, Go) place greater burden on static analysis. The criteria identify where each language's enforcement regime will be strong and where it will have structural gaps requiring compensating controls.

The "existing tool coverage" criterion is particularly important for adoption: a language where an existing type checker can implement Wardline-Type and an existing linter can implement Wardline-Core has a lower adoption barrier than a language requiring entirely new tooling for every profile.

Some pattern rules may be structurally inapplicable in certain languages. In statically typed languages, [WL-002]({{< relref "rules/wl-002" >}}) (existence-checking as a structural gate) and [WL-006]({{< relref "rules/wl-006" >}}) (runtime type-checking) may be partially or wholly addressed by the type system itself — the patterns they detect cannot occur or are caught at compile time. The evaluation criteria are the mechanism for identifying these per-language structural gaps: where a language's type system already prevents a class of violation, the corresponding pattern rule is marked N/A in that binding's severity matrix, with documented rationale.

## Detailed language evaluations

For detailed language evaluations against these criteria, see:

- [Python binding]({{< relref "python-binding" >}}) — Python's evaluation and enforcement regime
- [Java binding]({{< relref "java-binding" >}}) — Java's evaluation and enforcement regime
