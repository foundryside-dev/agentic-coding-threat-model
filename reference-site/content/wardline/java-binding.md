---
title: "Java Language Binding"
weight: 13
---

The Java binding (Part II-B) provides the Java-specific enforcement reference for the Wardline framework. Section B.3 (interface contract) is normative; all other sections are non-normative. Minimum Java version: **Java 17+** (records, sealed classes, pattern matching for instanceof are essential).

## Design history

Java is the second wardline target because it is the dominant language in Australian government enterprise systems — the ISM's constituency. A specification that addresses only Python reaches the analyst and data-engineering community but misses the enterprise application layer where the bulk of government code lives.

**What transferred from Python.** The annotation vocabulary maps all 17 groups. The scanner uses the same two-pass analysis model. The severity matrix, governance model, manifest schema, SARIF output contract, and golden corpus specification are binding-independent.

**What did not transfer.** Python dedicates substantial effort to compensating for language weaknesses (optional type checking, dynamic dispatch, absent ownership semantics). Java eliminates several of these structurally. The Java binding is shorter in some areas (runtime structural enforcement — the language provides it) and longer in others (framework proxy blind spots, Lombok, JPA entity lifecycle have no Python equivalent).

**Reference implementation posture.** This binding demonstrates that the wardline framework is implementable on the Java platform. A production scanner may use different analysis tools (e.g., CodeQL instead of JavaParser) provided it satisfies the interface contract.

## Java language evaluation

| Criterion | Assessment | Detail |
|-----------|------------|--------|
| **Annotation expressiveness** | Very strong | First-class language constructs, retained in bytecode, parameterisable, repeatable, composable via meta-annotations |
| **Parse tree access** | Very strong | JavaParser, Eclipse JDT, IntelliJ PSI, `javac` plugin API, Tree-sitter |
| **Type system metadata** | Very strong | Type-use annotations (Java 8+), Checker Framework pluggable types |
| **Structural typing** | Strong | Sealed interfaces (Java 17), records (Java 16), pattern matching |
| **Runtime object model** | Very strong | Records are immutable by construction — all components `final`, no setters |
| **Class hierarchy enforcement** | Very strong | `sealed` classes enforce at compile time and JVM level. `final` prevents extension |
| **Serialisation boundary control** | Moderate | Jackson annotations provide structured deserialisation, but `ObjectInputStream` and JPA entity lifecycle are blind spots |
| **Tooling ecosystem** | Very strong | Error Prone, SpotBugs, PMD, SonarQube, Checker Framework, ArchUnit, NullAway |

### Where Java structurally exceeds Python

1. **Compile-time enforcement is mandatory.** Checker Framework qualifiers are enforced at compile time. There is no gap between authoring time and CI feedback.
2. **No existence-checking blind spot.** If a field is declared on a class, the compiler guarantees it exists. [WL-002]({{< relref "rules/wl-002" >}}) applies only to `Map`-based access patterns and nullable fields.
3. **Immutability by construction.** Records are immutable by language guarantee. Every component is `final`, no setters, canonical constructor requires all components. The Python binding's `AuthoritativeField` descriptor is unnecessary.

These structural advantages mean the Java binding's assurance ceiling is meaningfully higher than the Python binding's.

### Where Java falls short

- **No ownership model** — validated records can be aliased.
- **Framework runtime magic** — Spring AOP proxies, CDI interceptor chains, JPA entity state transitions, dependency injection lifecycle are invisible to static analysis. These blind spots are introduced by *framework conventions*, not *language dynamism*.
- **Lombok-generated code** — bytecode not present in source. A `@Builder` on a Tier 1 class generates a permissive builder accepting partial construction.

### Ecosystem tool coverage

| Conformance Profile | Candidate Tool | Implementation Path | Fit |
|---|---|---|---|
| Advisory fast path | Error Prone | Custom `BugChecker` — compile-time pattern matching for JV-WL-001 through JV-WL-004 | Very strong — fires during `javac` |
| Wardline-Core (authoritative) | Bespoke scanner (JavaParser-based) or `javac` plugin | Two-pass AST analysis with taint tracking, manifest consumption, SARIF output | Required |
| Wardline-Type | Checker Framework plugin | Custom qualifier hierarchy with tier-flow analysis | Very strong — designed for pluggable type systems |
| Wardline-Type (baseline) | Standard Java type system | Sealed interfaces, records, generic type constraints | Strong |
| Wardline-Governance | Bespoke CLI (shared with Python) | Manifest validation, fingerprint baseline, SARIF aggregation | Reusable — governance is language-agnostic |

The Java regime achieves higher assurance with less bespoke tooling than Python.

## Interface contract (normative)

Any tool that implements Wardline-Core rules for the Java regime MUST satisfy:

1. **Manifest consumption.** Consume `wardline.yaml` and overlays; validate against JSON Schemas before producing findings.
2. **Annotation discovery.** Discover wardline annotation syntax from source AST or compiled bytecode.
3. **Schema default recognition.** Recognise `SchemaDefault.of()` as a JV-WL-001 suppression marker (three conditions: overlay declares field as optional, code default matches approved default, call is within a validation boundary).
4. **SARIF output.** SARIF v2.1.0 with required property bags: `wardline.rule`, `wardline.taintState`, `wardline.enclosingTier`, `wardline.severity`, `wardline.exceptionability`, `wardline.analysisLevel`, `wardline.excepted`, `wardline.annotationGroups`.
5. **Rule declaration.** Declare implemented rules and maintain golden corpus specimens.
6. **Verification mode.** SHOULD support `--verification-mode` for deterministic output.

### Rule mapping

One-to-one from framework rules (unlike Python's WL-001 split):

| Java Rule | Framework Rule | Pattern |
|---|---|---|
| JV-WL-001 | WL-001 | Access with fallback default (`Optional.orElse()`, `Map.getOrDefault()`, `Map.computeIfAbsent()`) |
| JV-WL-002 | WL-002 | Existence-checking as structural gate (`Map.containsKey()`, `instanceof` as validation proxy) |
| JV-WL-003 | WL-003 | Broad exception handlers (`catch (Exception e)`, `catch (Throwable t)`) |
| JV-WL-004 | WL-004 | Catching exceptions silently — empty catch blocks, catch-and-log-only |
| JV-WL-005 | WL-005 | Audit-critical writes inside broad exception handlers |
| JV-WL-006 | WL-006 | Runtime type-checking internal data (`instanceof` on sealed types — suppressed at Tier 4) |
| JV-WL-007 | WL-007 | Validation boundary with no rejection path |
| JV-WL-008 | WL-008 | Semantic validation without prior shape validation |

JV-WL-001 through JV-WL-004 are syntactic patterns detectable by Error Prone (advisory path). JV-WL-005 through JV-WL-008 require semantic context (reference scanner).

### Java-specific severity matrix changes

| Cell | Parent Spec | Java Binding | Rationale |
|---|---|---|---|
| JV-WL-002 x SHAPE_VALIDATED | E/U | S/T | Records guarantee complete construction — `Map.containsKey()` patterns do not arise on record types |
| JV-WL-006 x SHAPE_VALIDATED | W/R | S/T | Sealed interfaces with pattern matching provide compile-time exhaustive type dispatch |

The Java matrix has 4 SUPPRESS cells (vs. 2 in the framework), 24 UNCONDITIONAL cells (vs. 25), and a corpus minimum of 120 effective specimens.

## Annotation vocabulary

### Design principles

**Meta-annotations for composition.** Java's meta-annotation mechanism allows wardline annotations to be composed into project-specific shorthand:

```java
@ValidatesShape
@FailClosed
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.CLASS)
public @interface StrictShapeValidator {
    // Scanner resolves meta-annotations transitively
}
```

Scanner implementations MUST resolve meta-annotations transitively and annotation inheritance through interfaces and class hierarchies.

**No runtime behaviour in annotations.** Wardline annotations are declarative metadata — no aspect-oriented interceptor, no bytecode weaving, no proxy generation. This deliberately departs from the Spring/Jakarta convention.

**Retention policy.** `@Retention(CLASS)` by default — preserved in bytecode for analysis tools without runtime overhead. Checker Framework tier qualifiers use `@Retention(RUNTIME)`.

### Annotation mapping (key groups)

| Group | Java Annotation | Brief Description |
|---|---|---|
| **1** | `@ExternalBoundary` | T4 source |
| **1** | `@ValidatesShape` | T4→T3, rejection path required |
| **1** | `@ValidatesSemantic` | T3→T2, rejection path and ordering required |
| **1** | `@ValidatesExternal` | Combined T4→T2 |
| **1** | `@Tier1Read` | Returns T1 data |
| **1** | `@AuthoritativeConstruction` | T2→T1 construction |
| **1** | `@AuditWriter` | Audit-sensitive write |
| **2** | `@AuditCritical` | Superset of `@AuditWriter` |
| **3** | `@SystemComponent` | Crash-not-catch semantics |
| **4** | `@IntData` | Internal data provenance |
| **5** | `@AllFieldsMapped` | Every field of return type must be supplied |
| **10** | `@FailClosed` | Must throw on failure |
| **10** | `@FailOpen` | Graceful degradation permitted |
| **10** | `@ExceptionBoundary` | Authorised exception translation point |
| **10** | `@MustPropagate` | Exceptions must propagate |
| **10** | `@PreserveCause` | Caught exception must chain as cause |
| **16** | `@TrustBoundary(fromTier, toTier)` | Generic tier transition |
| **17** | `@RestorationBoundary(...)` | Restores serialised internal data |

`SchemaDefault.of()` is a static utility for marking approved defaults:

```java
public final class SchemaDefault {
    private SchemaDefault() {}
    public static <T> T of(T value) { return value; }
}
```

## Type system and runtime enforcement

### Type system enforcement

The Checker Framework extends Java's type-use annotations into a qualifier hierarchy: `@Tier1 <: @Tier2 <: @Tier3 <: @Tier4` (top = least trusted). Unannotated types default to `@Tier4`. Records with tier-qualified components enforce tier-flow at construction: `new AuditRecord(@Tier4 rawValue, ...)` produces a compile error.

**Coverage gap.** UNKNOWN and MIXED taint states are not modelled in the Checker Framework qualifier hierarchy. The reference scanner handles these independently.

### Runtime structural enforcement

Java's runtime structural enforcement is **substantially thinner** than Python's because the language provides most enforcement structurally:

- **Access-before-set is impossible.** Records require all components in the constructor.
- **Subclass enforcement is compile-time.** `sealed` and `final` classes.
- **Type discrimination is compile-time.** Sealed interface pattern matching.

Two areas benefit from runtime enforcement: **record compact constructors** (validate component values at construction) and the **module system** (`module-info.java` restricts package accessibility).

## Regime composition matrix

| Capability | Best Home | Profile |
|---|---|---|
| Syntactic pattern detection (JV-WL-001-004) | Error Prone `BugChecker` | Advisory |
| Tier-aware severity grading (all WL rules) | Reference scanner | Wardline-Core |
| Taint-flow tracking | Reference scanner | Wardline-Core |
| Tier-flow type checking | Checker Framework plugin | Wardline-Type |
| Runtime structural enforcement | Records + module system | Foundation |
| Manifest validation, governance | wardline CLI | Wardline-Governance |

**Temporal layering:**

```
Compile time:  Error Prone (advisory) + Checker Framework (tier-flow)
CI time:       Reference scanner (authoritative, tier-graded)
Governance:    wardline CLI (manifest, baseline, SARIF aggregation)
```

In the Python regime, advisory feedback (ruff) requires a separate pre-commit step. In Java, advisory feedback fires during `javac` — developers receive advisory and type-system feedback simultaneously during compilation.

**Anti-recommendations:** Do not force taint analysis into Error Prone (lacks cross-method propagation). Do not use SpotBugs as the normative scanner (bytecode analysis loses source-level annotation context). Do not duplicate governance tooling — `wardline-cli` is shared across regimes.

## Residual risks (Java-specific)

These supplement the framework-level [residual risks]({{< relref "residual-risks" >}}):

### Framework proxy blind spots

Enterprise Java frameworks generate runtime proxies invisible to source analysis:

- **`@Retryable` + `@Recover`:** `@Recover` provides an implicit `@FailOpen` — scanner SHOULD emit a BLOCKING finding.
- **`@Cacheable`:** Returns a cached value, bypassing method body including validation.
- **`@Async void`:** Exceptions dispatched to `AsyncUncaughtExceptionHandler` which by default logs and discards — a severe `@FailClosed` violation.
- **Checked exception rollback:** `@Transactional` rolls back only on unchecked exceptions by default.

**Safe proxy compositions** (closed set):

| Spring Annotation | Safe With | Rationale |
|---|---|---|
| `@Transactional` (default) | `@FailClosed`, `@ValidatesShape`, `@ValidatesSemantic`, `@AuthoritativeConstruction` | Unchecked exceptions → rollback |
| `@Validated` / `@Valid` | All wardline annotations | Bean Validation runs before body |
| `@PreAuthorize` / `@PostAuthorize` | All wardline annotations | Security checks before/after |

### JPA entity lifecycle

JPA entities transition through managed → detached → merged states. `entityManager.merge()` is a restoration boundary in disguise. **Compensating controls:** Do not use JPA entities as T1 data models. Use records for T1 artefacts. Annotate repository methods with `@IntData` and `@RestorationBoundary`.

### Lombok-generated code

- `@Builder` on tier-sensitive classes: generates permissive `build()` accepting partial construction (ERROR at T1/T2)
- `@Data`: generates mutable setters (WARNING at T1/T2)
- `@SneakyThrows`: silently converts checked exceptions, undermining `@MustPropagate`

Recommended migration target: Java records.

### Other Java-specific risks

- **Reflection bypass** — `setAccessible(true)` can bypass access controls. Module system restricts this.
- **Serialisation attacks** — `ObjectInputStream.readObject()` provides no evidence. Never use Java serialisation for tier-sensitive data.
- **Annotation retention and injection** — obfuscators may strip annotations; malicious processors could inject annotations.
- **Reactive pipelines** — lambda chains with error operators may introduce implicit `@FailOpen` paths.

## Worked example

**Data flow:** T4 → T3 → T2 → T1

```java
@ExternalBoundary
public Map<String, Object> fetchPartnerData(String partnerId) {
    // ... HTTP request, returns raw Map ...
}

@ValidatesShape
public PartnerDTO parsePartnerResponse(Map<String, Object> raw) {
    var partnerId = requireString(raw, "partner_id");
    // ... validation with SchemaDefault.of() for optional fields ...
    return new PartnerDTO(partnerId, name, countryCode, classification, indicators);
}

@ValidatesSemantic
public ValidatedPartner validatePartnerSemantics(PartnerDTO dto) {
    if (!VALID_COUNTRY_CODES.contains(dto.countryCode()))
        throw new DomainValidationException("Unrecognised country code");
    // ... domain checks ...
    return new ValidatedPartner(...);
}

@AuthoritativeConstruction
public RiskAssessment createRiskAssessment(ValidatedPartner partner, AuditContext context) {
    return new RiskAssessment(
        generateAssessmentId(), partner.partnerId(), partner.name(),
        computeRiskLevel(partner), partner.classification(),
        context.identity(), context.timestamp());
}
```

Each method has one annotation declaring one transition. The types in the signatures tell the tier story even without the annotations.

## Adoption strategy

| Phase | What You Add | What You Get |
|---|---|---|
| **1** | `wardline-annotations` (compileOnly) | Documentation value. Annotations visible in code review |
| **2** | `wardline-errorprone` | Compile-time warnings for JV-WL-001-004 during `javac` |
| **3** | `wardline-scanner` in CI | Tier-aware severity, taint-flow, governance-grade SARIF |
| **4** | `wardline-checker` | Compile-time tier-flow enforcement via Checker Framework |

**Phase 2 is the adoption accelerator** — Error Prone fires during `javac` with no additional configuration. **Phase 2 is not conformant** — advisory only. **Phase 3 is a legitimate end state** — Wardline-Core with meaningful assurance. Governance tooling (`wardline-cli`) is cross-cutting, entering at Phase 1.

**Realistic timeline:** 6-12 months from initial interest to Phase 4 when accounting for dependency approval, security assessment, and platform onboarding. Phase 1 can proceed immediately.

## Error handling and control law

**Exit codes:** 0 (no ERROR findings), 1 (at least one ERROR), 2 (internal error), 3 (direct law).

**Phase-parameterised control law:**

| Phase | Normal | Alternate | Direct |
|---|---|---|---|
| **1** | wardline CLI validates manifest | — | CLI absent |
| **2** | Error Prone + wardline CLI | CLI absent | Error Prone absent |
| **3** | Reference scanner + wardline CLI | Error Prone absent (advisory) | Scanner absent OR CLI absent |
| **4** | Error Prone + Scanner + Checker + CLI | Error Prone absent OR Checker absent | Scanner absent OR CLI absent |

---

## See also

- [Python language binding]({{< relref "python-binding" >}}) — the Python-specific enforcement reference
- [Pattern rules]({{< relref "rules" >}}) — the framework rules these bindings implement
- [Annotation vocabulary]({{< relref "annotation-vocabulary" >}}) — full annotation group definitions
- [Enforcement specification]({{< relref "enforcement" >}}) — the three enforcement layers
