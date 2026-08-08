### Part II-B: Java Language Binding Reference

This section defines the Java language binding for the Wardline classification framework. It maps the 17 abstract annotation groups (Part I §6) to concrete Java annotations, defines the interface contract for conformant scanners, and documents the residual risks specific to Java's language and ecosystem characteristics.

**Normative status.** Section B.3 (interface contract) is normative. All other sections are non-normative — they provide design rationale, implementation guidance, and assessment material.

**Minimum Java version.** This binding targets **Java 17+**. Records (Java 16), sealed classes (Java 17), and pattern matching for instanceof (Java 16) are essential language features for the binding's type-system enforcement and runtime structural model.

---

#### B.1 Design history

The Java binding is the second wardline language binding, developed after the Python binding (Part II-A) with the benefit of knowing which design decisions were framework-dictated versus Python-specific compensations.

**Why Java second.** The case study that motivated the wardline concept is Python-based. Java is the second target because it is the dominant language in Australian government enterprise systems — the ISM's constituency. A specification that addresses only Python reaches the analyst and data-engineering community but misses the enterprise application layer where the bulk of government code lives.

**What transferred.** The annotation vocabulary maps all 17 groups from the parent specification. The scanner uses the same two-pass analysis model (symbol collection, then rule evaluation). The severity matrix, governance model, manifest schema, SARIF output contract, and golden corpus specification are binding-independent.

**What did not transfer.** The Python binding dedicates substantial effort to compensating for language weaknesses: optional type checking, dynamic dispatch blind spots, runtime-only construction discipline, absent ownership semantics. Java eliminates several of these structurally. The Java binding is shorter in some areas (runtime structural enforcement is brief because the language provides it) and longer in others (residual risks address Java-specific concerns — framework proxy blind spots, Lombok-generated code, JPA entity lifecycle — that have no Python equivalent).

**Reference implementation posture.** This binding is a reference implementation design, not a product specification. It demonstrates that the wardline framework is implementable on the Java platform and identifies the design decisions a production implementation must make. A production scanner may use different analysis tools (e.g., CodeQL instead of JavaParser) provided it satisfies the interface contract (B.3).

---

#### B.2 Java language evaluation

The parent specification (§11) defines language evaluation criteria for wardline bindings. This section assesses Java against those criteria, modelling how future binding authors should evaluate their target language.

| Criterion | Assessment | Detail |
|-----------|------------|--------|
| **Annotation expressiveness** | Very strong | Java annotations are first-class language constructs, retained in bytecode (`@Retention(RUNTIME)` or `@Retention(CLASS)`), parameterisable, repeatable (since Java 8), and composable via meta-annotations. All 17 annotation groups are expressible without runtime overhead. |
| **Parse tree access** | Very strong | Multiple mature AST frameworks: JavaParser (standalone), Eclipse JDT (IDE-grade), IntelliJ PSI (IDE-grade), `javac` plugin API (compiler-integrated), and Tree-sitter (language-agnostic). |
| **Type system metadata** | Very strong | Type-use annotations (`@Target(TYPE_USE)`, since Java 8) can annotate any type occurrence. The Checker Framework extends this into a pluggable type system with custom qualifier hierarchies, flow-sensitive refinement, and compile-time enforcement. |
| **Structural typing** | Strong | Sealed interfaces (Java 17) constrain the type hierarchy. Records (Java 16) provide structural data types with compiler-generated accessors. Pattern matching (Java 16+) enables exhaustive deconstruction of sealed hierarchies. Java's type system is nominative, not structural — but sealed hierarchies achieve the same discrimination as Python's Protocols with stronger guarantees. |
| **Runtime object model** | Very strong | Records are immutable by construction — all components are `final`, no setters, canonical constructor requires all components. The access-before-set problem that motivates Python's `AuthoritativeField` descriptor cannot occur with records. |
| **Class hierarchy enforcement** | Very strong | `sealed` classes and interfaces restrict which classes may extend or implement them — enforced at compile time and at the JVM level. `final` classes prevent extension entirely. The module system restricts visibility across package boundaries. |
| **Serialisation boundary control** | Moderate | Jackson `@JsonCreator` and `@JsonProperty` annotations provide structured deserialisation. Records' canonical constructors naturally serve as deserialisation entry points. However, `ObjectInputStream` remains a known attack surface, and JPA entity lifecycle blurs tier boundaries in ORM-heavy applications. |
| **Tooling ecosystem** | Very strong | Error Prone (compile-time, Google-maintained), SpotBugs (bytecode), PMD (source-level), SonarQube (enterprise), Checker Framework (pluggable types), ArchUnit (architectural constraints), NullAway (null safety). |

##### B.2.1 Where Java falls short

**No ownership model.** Like Python, Java lacks ownership semantics. A validated record can be aliased and referenced after the validation context has changed. Records mitigate this partially — immutability means aliases cannot diverge — but the fundamental aliasing problem remains for mutable domain objects.

**Framework runtime magic.** Enterprise Java frameworks (Spring, Jakarta EE, Quarkus) rely on runtime mechanisms invisible to static analysis: AOP proxy generation, CDI interceptor chains, JPA entity state transitions, dependency injection container lifecycle. A method annotated `@ValidatesShape` may be intercepted by a Spring proxy that wraps it in a transaction, exception handler, or caching layer — none visible in the source AST. These blind spots are introduced by *framework conventions*, not by *language dynamism*, distinguishing them from Python's dynamic dispatch issues.

**Lombok-generated code.** Lombok generates bytecode not present in source. A scanner operating on source AST does not see Lombok-generated constructors, getters, or builders. A `@Builder` on a Tier 1 class generates a permissive builder pattern that accepts partial construction — exactly the anti-pattern the wardline exists to prevent.

##### B.2.2 Where Java structurally exceeds Python

1. **Compile-time enforcement is mandatory.** Java's type system is not optional. Checker Framework qualifiers are enforced at compile time. There is no gap between authoring time and CI feedback.

2. **No existence-checking blind spot.** If a field is declared on a class, the compiler guarantees it exists. WL-002 applies only to `Map`-based access patterns and nullable fields — a dramatically narrower surface than Python's `hasattr()` / `"key" in dict` patterns.

3. **Immutability by construction.** Java records are immutable by language guarantee. Every component is `final`, there are no setters, and the canonical constructor requires all components. The Python binding's `AuthoritativeField` descriptor is unnecessary — records make this structurally impossible.

These structural advantages mean the Java binding's assurance ceiling is meaningfully higher than the Python binding's.

##### B.2.3 Ecosystem tool coverage

| Conformance Profile | Candidate Tool | Implementation Path | Fit |
|---|---|---|---|
| Advisory fast path (non-conformant) | Error Prone | Custom `BugChecker` — compile-time pattern matching for JV-WL-001 through JV-WL-004. Fires during `javac` | Very strong |
| Wardline-Core (authoritative) | Bespoke scanner (JavaParser-based) or `javac` plugin | Two-pass AST analysis with taint tracking, manifest consumption, SARIF output | Required — no existing tool consumes the wardline manifest |
| Wardline-Type | Checker Framework plugin | Custom qualifier hierarchy with tier-flow analysis | Very strong — designed for pluggable type systems |
| Wardline-Type (baseline) | Standard Java type system | Sealed interfaces, records, generic type constraints | Strong — structural conformance without a plugin |
| Wardline-Governance | Bespoke CLI (shared with Python binding) | Manifest validation, fingerprint baseline, SARIF aggregation | Reusable — governance is language-agnostic |

The "Required — bespoke" surface is smaller than in Python. Error Prone provides compile-time advisory feedback (vs. ruff's pre-commit feedback). The Checker Framework provides mandatory type-system enforcement (vs. mypy's optional enforcement). The Java regime achieves higher assurance with less bespoke tooling.

---

#### B.3 Interface contract (NORMATIVE)

*This section is normative.*

Any tool that implements Wardline-Core rules for the Java regime MUST satisfy the following interface contract (extending the parent specification's conformance criteria):

1. **Manifest consumption.** The tool MUST consume the wardline manifest (`wardline.yaml` and overlays) and validate it against the framework's JSON Schemas before producing findings.

2. **Annotation discovery.** The tool MUST discover wardline annotation syntax from the target codebase — either from source AST or from compiled bytecode — identifying which methods carry which annotations and extracting their parameters. The canonical annotation names and parameter schemas are defined in B.4.

3. **Schema default recognition.** The tool MUST recognise `SchemaDefault.of()` as a JV-WL-001 suppression marker. Calls wrapped in `SchemaDefault.of()` where the default value matches the overlay's declared approved default are governed by the overlay declaration, not by JV-WL-001.

4. **SARIF output.** The tool MUST produce findings in SARIF v2.1.0 with the wardline-specific property bags defined in the parent specification (§10.1). The Java regime requires the following mandatory property bag keys on each `result` object:

    | Key | Type | Description |
    |-----|------|-------------|
    | `wardline.rule` | string | Binding rule ID (e.g., `JV-WL-001`) |
    | `wardline.taintState` | string | Canonical taint state token (e.g., `AUDIT_TRAIL`) |
    | `wardline.enclosingTier` | integer | Tier of the enclosing context (1, 2, 3, or 4) |
    | `wardline.severity` | string | `ERROR`, `WARNING`, or `SUPPRESS` |
    | `wardline.exceptionability` | string | `UNCONDITIONAL`, `STANDARD`, `RELAXED`, or `TRANSPARENT` |
    | `wardline.analysisLevel` | integer | Analysis level that produced the finding (1, 2, or 3) |
    | `wardline.excepted` | boolean | Whether an active exception covers this finding |
    | `wardline.annotationGroups` | integer array | Annotation groups active on the enclosing method |

5. **Rule declaration.** The tool MUST declare which rules it implements and MUST maintain golden corpus specimens for those rules.

6. **Verification mode.** The tool SHOULD support `--verification-mode` for deterministic output against the golden corpus.

A tool that satisfies this contract and implements at least one JV-WL rule is a partial Wardline-Core tool. A tool that implements all eight binding rules (JV-WL-001 through JV-WL-008) with tier-aware severity grading is a complete Wardline-Core tool.

**Rule mapping.** The eight Java binding rules map one-to-one from the eight framework rules (Part I §7). Unlike the Python binding — which splits WL-001 into two rules because Python has two distinct access-with-fallback idioms (`dict.get()` and `getattr()`) — the Java binding maintains a single JV-WL-001 because Java's fallback-default patterns (`Optional.orElse()`, `Map.getOrDefault()`, `Map.computeIfAbsent()`) share a unified AST shape:

| Java Rule | Framework Rule | Pattern |
|---|---|---|
| JV-WL-001 | WL-001 | Access with fallback default (`Optional.orElse()`, `Map.getOrDefault()`, `Map.computeIfAbsent()`) |
| JV-WL-002 | WL-002 | Existence-checking as structural gate (`Map.containsKey()`, `instanceof` as validation proxy) |
| JV-WL-003 | WL-003 | Broad exception handlers (`catch (Exception e)`, `catch (Throwable t)`) |
| JV-WL-004 | WL-004 | Catching exceptions silently — empty catch blocks, catch-and-log-only |
| JV-WL-005 | WL-005 | Audit-critical writes inside broad exception handlers |
| JV-WL-006 | WL-006 | Runtime type-checking internal data (`instanceof` on sealed types — tier-dependent, suppressed at Tier 4) |
| JV-WL-007 | WL-007 | Validation boundary with no rejection path (structural verification) |
| JV-WL-008 | WL-008 | Semantic validation without prior shape validation (validation ordering) |

JV-WL-001 through JV-WL-004 are syntactic patterns detectable by per-file AST analysis (the Error Prone advisory path). JV-WL-005 through JV-WL-008 require semantic context — audit-path awareness, tier classification, structural verification, or validation ordering — and are implemented by the reference scanner.

Tools that detect wardline-relevant patterns without satisfying this contract — e.g., Error Prone rules that match `Optional.orElse()` calls without consuming the manifest — are **advisory tools**, not Wardline-Core tools. Advisory tools provide useful early-warning feedback but their findings are not governance-grade.

---

#### B.4 Annotation vocabulary: design principles, mapping table, and rationale

##### B.4.1 Design principles

**Meta-annotations for composition.** Java's meta-annotation mechanism allows wardline annotations to be composed into project-specific shorthand:

```java
@ValidatesShape
@FailClosed
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.CLASS)
public @interface StrictShapeValidator {
    // Project-specific composed annotation — the scanner resolves
    // meta-annotations transitively and sees both @ValidatesShape
    // and @FailClosed on any method annotated @StrictShapeValidator.
}
```

Scanner implementations MUST resolve meta-annotations transitively. This is the primary mechanism for managing annotation burden — projects define domain-meaningful composed annotations during Phase 1 adoption, before enforcement tooling is active.

**Annotation inheritance.** Scanner implementations MUST resolve annotations transitively through interface implementation and class inheritance. If an interface method carries a wardline annotation and a class implements that interface without repeating the annotation, the scanner treats the implementation as carrying the interface method's annotation. When both the interface and implementation carry wardline annotations and they differ, the implementation takes precedence — consistent with Java's method override semantics. The scanner SHOULD emit an advisory finding recommending that implementations repeat annotations for documentation clarity.

**No runtime behaviour in annotations.** Wardline annotations are declarative metadata. They do not modify behaviour at runtime. There is no aspect-oriented interceptor, no bytecode weaving, no proxy generation. This is a deliberate departure from the Spring/Jakarta convention where annotations trigger runtime behaviour.

**Annotation placement.** All wardline annotations target `ElementType.METHOD` unless otherwise specified. Field-level tier annotations target `ElementType.TYPE_USE` (for use with the Checker Framework). Class-level annotations (e.g., `@TestOnly`) target `ElementType.TYPE`.

**Retention policy.** All wardline annotations use `@Retention(CLASS)` — preserved in bytecode for analysis tools but not requiring runtime reflection. Annotations that activate runtime structural enforcement additionally use `@Retention(RUNTIME)`. The Checker Framework tier qualifiers (`@Tier1` through `@Tier4`, `@TierBottom`) use `@Retention(RUNTIME)` as required by the Checker Framework.

##### B.4.2 Meta-annotation composition model

Where the Python binding uses decorator stacking to compose wardline markers, the Java binding uses meta-annotation composition. The difference is architectural:

- **Python:** `@validates_shape` and `@fail_closed` are stacked on the function definition. The scanner discovers them by inspecting the function's decorator list. Composition is runtime — decorators execute top-to-bottom.
- **Java:** `@ValidatesShape` and `@FailClosed` can be composed into a single meta-annotation (`@StrictShapeValidator`). The scanner discovers them by resolving meta-annotations transitively. Composition is declarative — no runtime execution order.

Meta-annotation composition is Java's native mechanism for annotation reuse and is widely understood in the ecosystem (Spring's `@RestController` is a meta-annotation composing `@Controller` and `@ResponseBody`). Projects SHOULD define their meta-annotation vocabulary during Phase 1 adoption so the vocabulary is stable when enforcement begins.

**`@Retention` choices for composed annotations.** A composed annotation MUST use `@Retention(CLASS)` or `@Retention(RUNTIME)`. If any constituent annotation requires `RUNTIME` (e.g., for Checker Framework integration), the composed annotation MUST also be `RUNTIME`. The scanner resolves meta-annotations from bytecode (`CLASS` retention) or from source (`SOURCE` retention would be invisible to bytecode-level tools — avoid).

##### B.4.3 Annotation mapping table

The following table maps each of the 17 abstract annotation groups (Part I §6) to their concrete Java annotations.

| Group | Abstract Name | Java Annotation(s) | Signature / Parameters | Brief Description |
|---|---|---|---|---|
| **1** | Trust boundary declarations | `@ExternalBoundary` | `@Target(METHOD)` | Marks method returning T4 (EXTERNAL_RAW) data from outside the system boundary |
| | | `@ValidatesShape` | `@Target(METHOD)` | T4 → T3 transition. Body must contain rejection path (JV-WL-007) |
| | | `@ValidatesSemantic` | `@Target(METHOD)` | T3 → T2 transition. Body must contain rejection path. Scanner verifies validation ordering (JV-WL-008) |
| | | `@ValidatesExternal` | `@Target(METHOD)` | Combined T4 → T2. Body must satisfy both shape and semantic validation requirements |
| | | `@Tier1Read` | `@Target(METHOD)` | Returns T1 (AUDIT_TRAIL) data. Body rules at AUDIT_TRAIL severity |
| | | `@AuthoritativeConstruction` | `@Target(METHOD)` | T2 → T1 transition. All return type fields must be explicitly supplied |
| | | `@AuditWriter` | `@Target(METHOD)` | Audit-sensitive write. AUDIT_TRAIL severity. Return tagged AUDIT_TRAIL. Must precede `@EmitsTelemetry`. Fallback paths that bypass the audit call produce a finding |
| **2** | Audit primacy | `@AuditCritical` | `@Target(METHOD)` | All `@AuditWriter` rules plus implicit `@MustPropagate` on exception paths |
| | | `@EmitsTelemetry` | `@Target(METHOD)` | Telemetry emission. Must not precede `@AuditWriter` on shared code paths |
| **3** | Plugin/component contract | `@SystemComponent` | `@Target(METHOD)` | System-owned contract. Crash-not-catch semantics; exceptions must propagate |
| **4** | Internal data provenance | `@IntData` | `@Target(METHOD)` | Declares internal provenance. AUDIT_TRAIL body restrictions. Return tagged UNKNOWN_RAW without `@RestorationBoundary` |
| **5** | Schema contracts | `@AllFieldsMapped` | `@Target(METHOD)` | Every field of return type must be explicitly supplied or wrapped in `SchemaDefault.of()` |
| | | `@OutputSchema(fields = {...})` | `@Target(METHOD)`, `String[] fields` | Returned object must contain all declared fields |
| **6** | Layer boundaries | `@Layer(value)` | `@Target(TYPE)`, `String value` | Enforces import direction constraints between architectural layers |
| **7** | Template/parse safety | `@TemplateRenderer` | `@Target(METHOD)` | Template rendering must use parameterised APIs. Input must be T2+ |
| | | `@ParseAtInit` | `@Target(METHOD)` | Method called only from constructors, static initialisers, or `@PostConstruct` |
| **8** | Secret handling | `@HandlesSecrets` | `@Target(METHOD)` | Return value must not appear in logger calls, string concatenation reaching loggers, or serialisation reaching persistence |
| **9** | Operation semantics | `@Idempotent` | `@Target(METHOD)` | First state-modifying call must be preceded by a guard |
| | | `@Atomic` | `@Target(METHOD)` | Multiple state-modifying calls must be within `@Transactional` or explicit transaction |
| | | `@Compensatable(rollback)` | `@Target(METHOD)`, `String rollback` | Referenced rollback method must exist with compatible signature |
| **10** | Failure mode | `@FailClosed` | `@Target(METHOD)` | No fallback values, no continue-on-error. Must throw on failure |
| | | `@FailOpen` | `@Target(METHOD)` | Graceful degradation permitted. Requires trust classification annotation |
| | | `@EmitsOrExplains` | `@Target(METHOD)` | Every exit path must emit or explain |
| | | `@ExceptionBoundary` | `@Target(METHOD)` | Authorised exception translation point |
| | | `@MustPropagate` | `@Target(METHOD)` | Exceptions must propagate to an `@ExceptionBoundary` |
| | | `@PreserveCause` | `@Target(METHOD)` | Every catch-and-rethrow must chain the cause. *Java-specific extension* |
| **11** | Data sensitivity | `@HandlesPii(fields)` | `@Target(METHOD)`, `String[] fields` | Named fields must not appear in logs, exceptions, or unencrypted persistence |
| | | `@HandlesClassified(level)` | `@Target(METHOD)`, `String level` | No mixing with lower classification levels |
| | | `@Declassifies(fromLevel, toLevel)` | `@Target(METHOD)`, `String fromLevel`, `String toLevel` | Body must contain rejection path. Input must not leak unchanged to output |
| **12** | Determinism | `@Deterministic` | `@Target(METHOD)` | Body must not contain non-deterministic calls (Random, UUID, Instant.now, HashMap iteration) |
| | | `@TimeDependent` | `@Target(METHOD)` | Explicitly declares wall-clock dependency |
| **13** | Concurrency/ordering | `@ThreadSafe` | `@Target(METHOD)` | Shared mutable state access must be synchronised |
| | | `@OrderedAfter(value)` | `@Target(METHOD)`, `String value` | At call sites, named method must be called first |
| | | `@NotReentrant` | `@Target(METHOD)` | Call graph must not lead back to this method |
| **14** | Access/attribution | `@RequiresIdentity` | `@Target(METHOD)` | Identity-typed parameter must be received and passed to audit/persistence |
| | | `@PrivilegedOperation` | `@Target(METHOD)` | Authorisation check must precede state modification |
| **15** | Lifecycle/scope | `@TestOnly` | `@Target(TYPE)` | No production module may import this symbol |
| | | `@DeprecatedBy(date, replacement)` | `@Target(METHOD)`, `String date`, `String replacement` | After expiry: BLOCKING finding. Before: advisory |
| | | `@FeatureGated(flag)` | `@Target(METHOD)`, `String flag` | Tracks flag lifecycle and stale flag detection |
| **16** | Generic trust boundary | `@TrustBoundary(fromTier, toTier)` | `@Target(METHOD)`, `int fromTier`, `int toTier` | Generic tier transition. Valid tiers 1–4. Skip-promotions to T1 are schema-invalid |
| | | `@DataFlow(consumes, produces)` | `@Target(METHOD)`, `int consumes`, `int produces` | Descriptive only — no enforcement |
| **17** | Restoration boundaries | `@RestorationBoundary(...)` | `@Target(METHOD)`, `int restoredTier`, `String institutionalProvenance`, `boolean structuralEvidence`, `boolean semanticEvidence`, `IntegrityMethod integrityEvidence` | Restores serialised internal data to declared tier. Evidence-to-tier mapping per §5.3 |

##### B.4.4 Non-obvious design rationale

This section covers design decisions specific to the Java binding. Where the rationale follows established precedent from Part II-A (Python binding), the treatment is compressed — readers seeking the full reasoning should consult the corresponding section in Part II-A §A.4.3, which develops the general principles at greater length.

**Why meta-annotation composition, not decorator stacking.** Python decorators are functions — they execute at function definition time, top-to-bottom. Java annotations are metadata — they are discovered by tools, not executed by the runtime. The Python binding stacks decorators because Python has no meta-decorator mechanism. The Java binding uses meta-annotations because they are the idiomatic Java mechanism for annotation composition and are understood by the entire ecosystem (IDE autocompletion, framework documentation, annotation processor resolution).

**`@Retention` choices.** The binding uses `@Retention(CLASS)` as the default, not `@Retention(RUNTIME)`, because wardline annotations are consumed by static analysis tools that read bytecode (Error Prone, reference scanner), not by runtime reflection. `CLASS` retention preserves annotations in `.class` files without the runtime overhead of reflection-accessible metadata. The Checker Framework tier qualifiers require `@Retention(RUNTIME)` because the Checker Framework's annotation processing infrastructure uses runtime reflection during type-checking.

**`@PreserveCause` — parallel to Python's `@preserve_cause`.** Both bindings enforce cause-chain preservation: Python's `@preserve_cause` requires `raise ... from ...` in `except` blocks (Part II-A §A.4, Group 10); Java's `@PreserveCause` requires the caught exception to be passed as the cause parameter. The Java binding emphasises this annotation because Java's checked exception system makes cause-chain loss a particularly common and consequential problem — a `throw new SomeException(message)` inside a `catch` block that drops the caught exception destroys diagnostic information.

**`@ValidatesExternal` — combined T4 → T2.** This annotation combines shape and semantic validation into a single method. It exists because the decomposed `@ValidatesShape` + `@ValidatesSemantic` pair requires two methods and an intermediate T3 type. For simple external data sources where the T3 intermediate adds no value, `@ValidatesExternal` avoids ceremony. The scanner enforces both shape and semantic validation requirements on the method body. The decomposed pair remains available for complex validation pipelines where the T3 intermediate is meaningful.

**Spring-specific considerations.** The annotation vocabulary deliberately avoids runtime behaviour. Spring annotations (`@Transactional`, `@Cacheable`, `@Async`) trigger runtime proxy generation; wardline annotations are pure metadata. This means wardline annotations and Spring annotations can coexist on the same method without interaction — except where the Spring proxy's behaviour contradicts the wardline annotation's intent (see B.7 for residual risks). The safe-composition table in B.7 defines which Spring annotations are known-safe with wardline annotations.

**Checked exception interaction with `@FailClosed`.** A method declared to throw a checked exception forces callers to handle or declare it — compiler-enforced propagation. The scanner treats checked exception declarations as complementary to `@MustPropagate`. For Tier 1 integrity errors, the binding recommends unchecked exceptions — they should halt processing, not be declared in signatures where every caller must decide what to do with them.

**`SchemaDefault.of()` formal semantics.** `SchemaDefault` is a static utility class in the `dev.wardline.annotations` package:

```java
public final class SchemaDefault {
    private SchemaDefault() {}
    public static <T> T of(T value) { return value; }
}
```

The scanner recognises `SchemaDefault.of(...)` syntactically and suppresses JV-WL-001 for the wrapped expression when the overlay declares the field as optional with an approved default matching the code default. Three conditions must all be met for suppression: (1) the field is declared in the overlay's `optional_fields`, (2) the code default matches the overlay's `approved_default` exactly, and (3) the call occurs within a `@ValidatesShape` or `@ValidatesExternal` boundary. `SchemaDefault.of()` inside `@ValidatesSemantic` is a finding — by the time semantic validation runs, field presence should be guaranteed by the T3 contract.

**`@EmitsTelemetry` — Java-specific extension.** `@EmitsTelemetry` has no Python equivalent because Python's telemetry patterns (logging, StatsD, OpenTelemetry) are typically function calls within `@audit_writer` bodies, and the ordering constraint (audit must dominate telemetry) is enforced by the scanner's call-site analysis within the existing `@audit_writer` annotation. Java's annotation-driven framework ecosystem (Micrometer, OpenTelemetry Java agent) makes telemetry emission a method-level declaration rather than a body-level call, requiring an explicit annotation to express the ordering constraint.

**`@TemplateRenderer` — Java-specific extension.** `@TemplateRenderer` has no Python equivalent because Python template rendering (Jinja2, Django templates) is typically performed through function calls that the scanner analyses within validation boundary bodies. Java's annotation-driven template engines (Thymeleaf, Freemarker integrations in Spring MVC) bind template rendering to method-level annotations and return types, requiring an explicit annotation to enforce that template input has reached Tier 2 or higher and that parameterised APIs are used.

**Contradictory combination detection.** The scanner detects mutually exclusive annotation combinations as ERROR findings, paralleling the Python binding's SCN-021 (Part II-A §A.4.3). The Java binding's combinations mirror the Python binding's 29-entry table with annotation name translations. Key Java-specific differences: `@PreserveCause` + `@ExceptionBoundary` is contradictory (preserve-cause implies propagation; exception boundaries terminate); `@TemplateRenderer` + `@ExternalBoundary` is contradictory (template input must be T2+; external boundaries produce T4). The full contradictory combination table is derived from Part II-A §A.4.3 by substituting annotation names per the B.4.2 mapping table — implementers should consult both tables. Stacking `@ValidatesShape` + `@ValidatesSemantic` on the same method is contradictory — use `@ValidatesExternal` for combined T4→T2.

**Java-specific severity matrix changes.** The Java binding's 8-rule × 8-state severity matrix reproduces the parent specification's framework matrix with two cell changes, both moving toward SUPPRESS (less severe):

| Cell | Parent Spec | Java Binding | Rationale |
|---|---|---|---|
| JV-WL-002 × SHAPE_VALIDATED | E/U | S/T | Records guarantee complete construction — `Map.containsKey()` patterns do not arise on record types |
| JV-WL-006 × SHAPE_VALIDATED | W/R | S/T | Sealed interfaces with pattern matching provide compile-time exhaustive type dispatch, making runtime `instanceof` redundant |

The Java matrix has 4 SUPPRESS cells (vs. the framework's 2), 24 UNCONDITIONAL cells (vs. 25), and a corpus minimum of 120 effective specimens (60 active cells × 2).

---

#### B.5 Type system and runtime enforcement

##### Type system enforcement

Java uses the Checker Framework for pluggable type-system enforcement. The Checker Framework extends Java's type-use annotations (`@Target(TYPE_USE)`) into a qualifier hierarchy with flow-sensitive type refinement. A wardline Checker plugin implements the Wardline-Type conformance profile.

**Tier qualifiers** follow a subtype lattice: `@Tier1 <: @Tier2 <: @Tier3 <: @Tier4` (top = least trusted). Unannotated types default to `@Tier4` — the conservative choice. The plugin ships with stub files for common libraries (`ObjectMapper.readValue()` returns `@Tier4`; `ResultSet` getters return `@Tier4`).

**Key design decisions:**

- Records with tier-qualified components enforce tier-flow at construction: `new AuditRecord(@Tier4 rawValue, ...)` produces a compile error
- Sealed interfaces with pattern matching provide exhaustive type dispatch — the compiler enforces tier discrimination
- Standard Java type system (records, sealed interfaces, `final`) provides substantial wardline benefit without any plugin — the Checker Framework adds mandatory compile-time tier-flow enforcement on top

**Coverage gap.** The UNKNOWN and MIXED taint states are not modelled in the Checker Framework qualifier hierarchy. The reference scanner handles these states independently.

**No reference implementation exists** at the time of writing. The Checker Framework design is specified to implementation-ready detail but has not been validated against a production codebase.

##### Runtime structural enforcement

Java's runtime structural enforcement layer is **substantially thinner** than Python's because the language provides most enforcement structurally:

- **Access-before-set is impossible.** Records require all components in the constructor. `final` fields require initialisation by the end of the constructor — the compiler enforces this.
- **Subclass enforcement is compile-time.** `sealed` classes restrict extension. `final` classes prevent it entirely.
- **Type discrimination is compile-time.** Sealed interface pattern matching replaces Protocol-based `isinstance()` checks.

Two areas benefit from runtime enforcement: **record compact constructors** (validate component values at construction time — runs on every construction path including deserialisation), and the **module system** (`module-info.java` restricts which packages are accessible, providing module-level access control over authoritative construction paths, enforced by the JVM).

---

#### B.6 Regime composition matrix

| Capability | Best Home | Profile | Why |
|---|---|---|---|
| Syntactic pattern detection (JV-WL-001–004) | Error Prone `BugChecker` rules | Advisory (not conformant) | Fires during `javac` — integrated into compilation. Advisory only: no manifest, no tier grading |
| Tier-aware severity grading (all WL rules) | Reference scanner | Wardline-Core (authoritative) | Requires manifest consumption and annotation metadata |
| Taint-flow tracking | Reference scanner | Wardline-Core | No existing tool consumes the manifest's trust topology |
| Context-dependent rules (JV-WL-005–008) | Reference scanner | Wardline-Core | Requires audit-path annotation awareness, tier classification, structural verification |
| Tier-flow type checking | Checker Framework plugin | Wardline-Type | Compile-time enforcement — mandatory, not optional |
| Runtime structural enforcement | Records + module system | Foundation | Language-native; no additional library |
| Manifest validation, fingerprint baseline, SARIF aggregation, control-law reporting | wardline CLI | Wardline-Governance | Shared with Python regime |

**Temporal layering:**

```
Compile time:  Error Prone (advisory) + Checker Framework (tier-flow)
CI time:       Reference scanner (authoritative, tier-graded)
Governance:    wardline CLI (manifest, baseline, SARIF aggregation)
```

In the Python regime, advisory feedback (ruff) requires a separate pre-commit step. In the Java regime, advisory feedback fires during `javac` — developers receive advisory and type-system feedback simultaneously during compilation, before any separate analysis step.

**Profile coverage by tool:**

| Tool | Criteria Covered | Profile |
|---|---|---|
| `wardline-annotations` | 1 | Foundation |
| Error Prone rules | (advisory — not conformant) | — |
| Reference scanner | 2, 3, 4, 5, 6, 7, 8, 10 | Wardline-Core |
| Checker Framework plugin | 1, 5, 6, 7 | Wardline-Type |
| `wardline-cli` | 9, 10 | Wardline-Governance |
| **Full regime** | **All 10** | **Wardline-Full** |

**What does not fit existing tools:**

- Do not force tier-aware taint analysis into Error Prone — it lacks cross-method taint propagation
- Do not use SpotBugs as the normative scanner — bytecode analysis loses source-level annotation context. Use as supplementary for Lombok-affected classes
- Do not build an IntelliJ plugin until Checker Framework integration is proven
- Do not duplicate governance tooling — `wardline-cli` is shared across regimes

**Ecosystem migration candidates.** SonarQube (enterprise analysis — SARIF import available since 9.4+), PMD (alternative advisory), SpotBugs (supplementary bytecode), ArchUnit (architectural constraints), CodeQL (deep call-graph analysis). All optional — the core regime provides Wardline-Full conformance.

---

#### B.7 Residual risks

The following residual risks are specific to the Java language binding. The parent specification (§12) documents binding-independent residual risks — particularly risk 12 (evasion surface trajectory), which applies to both bindings: as annotation coverage grows, coding-level risk falls but governance risk rises.

**Scope clarification: tiers are not security classifications.** The wardline's four-tier authority model classifies data by provenance and validation status. It does NOT classify data by PSPF security classification. Assessors SHOULD NOT equate "Tier 1" with "SECRET" or "Tier 4" with "OFFICIAL" — the dimensions are orthogonal.

##### Framework proxy blind spots

Enterprise Java frameworks generate runtime proxies that wrap annotated methods in interceptor chains. The scanner analyses source code and does not see the proxy's behaviour.

**Spring AOP proxies.** In the normal case, `@Transactional` is compatible with wardline semantics. The proxy becomes dangerous in specific edge scenarios:

- **`@Retryable` + `@Recover`:** A `@Recover` method provides a fallback value after retry exhaustion — an implicit `@FailOpen` invisible to source analysis of the `@FailClosed` method. The scanner SHOULD emit a BLOCKING finding.
- **`@Cacheable`:** Returns a cached value, bypassing the method body. If the method carries `@ValidatesShape`, the validation is skipped on subsequent calls.
- **`@Async void`:** Changes execution context. Exceptions in `@Async void` methods are dispatched to an `AsyncUncaughtExceptionHandler`, which by default logs and discards them — a severe `@FailClosed` violation.
- **Checked exception rollback:** `@Transactional` rolls back only on unchecked exceptions by default. Checked exceptions cause commit — the opposite of fail-closed. Either use unchecked exceptions for tier-sensitive failures or configure `@Transactional(rollbackFor = Exception.class)`.

**Safe proxy compositions** (closed set — everything else presumed unsafe and flagged for review):

| Spring Annotation | Safe With | Rationale |
|---|---|---|
| `@Transactional` (default propagation) | `@FailClosed`, `@ValidatesShape`, `@ValidatesSemantic`, `@AuthoritativeConstruction` | Unchecked exceptions → rollback, normal return → commit. Does not alter exception or return semantics |
| `@Validated` / `@Valid` | All wardline annotations | Bean Validation runs before method body |
| `@PreAuthorize` / `@PostAuthorize` | All wardline annotations | Security checks before/after method. Rejection is an exception, compatible with `@FailClosed` |

**`@Transactional` no-op scenarios.** Self-invocation (`this.method()`) bypasses the proxy. No active `PlatformTransactionManager` causes silent no-op. `protected`/package-private methods are not proxied by CGLIB. `final` methods cannot be overridden. All are dangerous when the method also carries `@Atomic` or `@FailClosed`.

**Self-invocation proxy bypass.** The scanner SHOULD emit an advisory finding when a class contains both wardline annotations and Spring AOP annotations and contains intra-class method calls targeting those annotated methods.

##### JPA entity lifecycle

JPA entities transition through managed → detached → merged states. A managed entity is live — field changes are automatically persisted. `entityManager.merge()` is a restoration boundary in disguise — it reinstitutes a detached representation as managed without explicit provenance evidence.

**Compensating controls:** Do not use JPA entities as T1 data models. Use records or immutable domain objects for T1 artefacts. Annotate repository methods with `@IntData` and `@RestorationBoundary`. Prefer DTO projection queries (`SELECT new PartnerDTO(...)`) or Spring Data interface projections over entity fetching for read-only paths. Teams with existing JPA-heavy codebases should consider a phased migration: annotate entity repository methods with `@RestorationBoundary` immediately (Phase 2), then migrate T1 entity classes to records or immutable domain objects as the codebase evolves (Phase 3+). The immediate annotation gives the scanner visibility into the restoration boundary; the structural migration eliminates the mutable-state risk.

##### Lombok-generated code

**`@Builder` on tier-sensitive classes** generates a permissive `build()` that accepts partial construction — an unconditional finding. **`@Data`** generates mutable setters violating immutability expectations for T1/T2. **`@With`** creates modified copies without governed construction paths. **`@SneakyThrows`** silently converts checked exceptions, undermining `@MustPropagate` and `@FailClosed`.

**Graduated Lombok posture:**

| Phase | Posture |
|---|---|
| **1–2** | Lombok permitted. Enable bytecode analysis pass as recommended |
| **3** | Scanner flags specific patterns on tier-sensitive classes: `@Builder` on T1/T2 (ERROR), `@Data` on T1/T2 (WARNING), `@With` on T1 (WARNING). Lombok on T3/T4 produces no findings |
| **4** | Same as Phase 3. Checker Framework analyses source-level annotations; bytecode pass compensates |

Migration is remediation, not prerequisite. The recommended migration target for flagged classes is Java records.

##### Reflection bypass

Java reflection (`setAccessible(true)`, `Field.set()`) can bypass access controls and modify final fields. The module system restricts reflection access: if the package is not `opens`-ed in `module-info.java`, external modules cannot use reflection. The fingerprint baseline tracks classes in tier-sensitive modules.

##### Serialisation attacks

`ObjectInputStream.readObject()` is a restoration boundary that provides no evidence — an object deserialised from untrusted bytes is T4 regardless of class type. Jackson/Gson deserialisation is safer but still creates objects without validation boundaries. Never use Java serialisation for tier-sensitive data. Annotate Jackson deserialisation entry points with `@ExternalBoundary` or `@RestorationBoundary`.

##### Annotation retention and injection

A build tool or obfuscator (ProGuard, R8) may strip annotations from bytecode. A malicious annotation processor could inject annotations not present in source. The reference scanner compensates: it operates on source files (JavaParser), so processor-injected annotations are invisible. The Checker Framework does see processor-injected annotations — this vector is covered by the supply chain threat model.

##### Spring-specific residual risks

**`@Async void` exception swallowing.** Exceptions are dispatched to `AsyncUncaughtExceptionHandler`, which by default logs and discards. Scanner SHOULD emit BLOCKING when `@Async` (without `CompletableFuture` return) appears with `@FailClosed`, `@MustPropagate`, or `@AuditCritical`. The same applies to `@Scheduled` and `@EventListener` / `@TransactionalEventListener` methods.

**`@Retryable` + `@Recover`.** `@Retryable` alone is compatible with `@FailClosed`. `@Recover` provides an implicit `@FailOpen`. Scanner SHOULD emit BLOCKING when a `@FailClosed` method's class contains a `@Recover` with compatible return type.

**Dependency injection container resolution.** `@Profile`, `@ConditionalOnProperty`, and `@Qualifier` cause different implementations to be injected at deployment time. The scanner sees each implementation individually but cannot determine which is active at runtime. Annotate each implementation with its actual tier, not the interface's declared tier.

##### Reactive and asynchronous pipelines

Reactive pipelines (Spring WebFlux, Project Reactor) express data flow as lambda chains connected by operators. The scanner analyses each method individually but cannot verify that the pipeline composition respects tier ordering or that error operators (`onErrorResume`, `onErrorReturn`) do not introduce implicit `@FailOpen` paths.

**Compensating controls:** Perform tier transitions imperatively at module boundaries, then pass validated data into the reactive pipeline. Annotate terminal operations with the expected output tier. Document reactive pipeline tier flows in governance.

##### Combined false-negative surface

Java's stronger type system narrows the false-negative surface compared to Python, but virtual method dispatch on non-sealed, non-final classes introduces an additional false-negative source proportional to the codebase's use of non-sealed hierarchies.

---

#### B.8 Worked example with SARIF output

This example traces data through the full tier lifecycle — from raw external input to authoritative artefact — demonstrating annotations in context.

**Scenario.** A government risk assessment system receives partner data from an external API, validates it, and produces an authoritative risk assessment record.

**Data flow:**

```
External API response (T4)
    → parsePartnerResponse() → PartnerDTO (T3)
        → validatePartnerSemantics() → ValidatedPartner (T2)
            → createRiskAssessment() → RiskAssessment (T1)
```

**Step 1: External boundary — receiving raw data (T4)**

```java
@ExternalBoundary
public Map<String, Object> fetchPartnerData(String partnerId) {
    try {
        var request = HttpRequest.newBuilder()
            .uri(URI.create(partnerApiUrl + "/" + partnerId))
            .GET().build();
        var response = httpClient.send(request, BodyHandlers.ofString());
        return objectMapper.readValue(response.body(), MAP_TYPE);
    } catch (IOException | InterruptedException e) {
        throw new ExternalDataException(
            "Failed to fetch partner data: " + partnerId, e);
    }
}
```

**Step 2: Shape validation (T4 → T3)**

```java
public record PartnerDTO(
    String partnerId, String name,
    String countryCode, String classification,
    List<String> riskIndicators
) {
    public PartnerDTO {
        Objects.requireNonNull(partnerId);
        Objects.requireNonNull(name);
        Objects.requireNonNull(countryCode);
        Objects.requireNonNull(classification);
        Objects.requireNonNull(riskIndicators);
        riskIndicators = List.copyOf(riskIndicators);
    }
}

@ValidatesShape
public PartnerDTO parsePartnerResponse(Map<String, Object> raw) {
    var partnerId = requireString(raw, "partner_id");
    var name = requireString(raw, "name");
    var countryCode = requireString(raw, "country_code");
    var classification = requireString(raw, "security_classification");

    // risk_indicators is optional-by-contract — declared in overlay
    List<String> indicators;
    var rawIndicators = raw.get("risk_indicators");
    if (rawIndicators == null) {
        indicators = SchemaDefault.of(List.of());
    } else if (rawIndicators instanceof List<?> list) {
        indicators = list.stream()
            .map(item -> {
                if (!(item instanceof String s)) {
                    throw new SchemaException(
                        "risk_indicators item: expected String, got "
                        + item.getClass().getSimpleName());
                }
                return s;
            })
            .toList();
    } else {
        throw new SchemaException(
            "risk_indicators: expected List, got "
            + rawIndicators.getClass().getSimpleName());
    }

    return new PartnerDTO(partnerId, name, countryCode,
        classification, indicators);
}
```

**Step 3: Semantic validation (T3 → T2)**

```java
public record ValidatedPartner(
    String partnerId, String name,
    String countryCode, String classification,
    List<String> riskIndicators
) {
    public ValidatedPartner {
        riskIndicators = List.copyOf(riskIndicators);
    }
}

// bounded_context in overlay:
//   consumers: ["recordToLandscape", "generatePartnerReport"]
@ValidatesSemantic
public ValidatedPartner validatePartnerSemantics(PartnerDTO dto) {
    if (!VALID_COUNTRY_CODES.contains(dto.countryCode())) {
        throw new DomainValidationException(
            "Unrecognised country code: " + dto.countryCode());
    }
    if (!VALID_CLASSIFICATION_LEVELS.contains(dto.classification())) {
        throw new DomainValidationException(
            "Invalid classification: " + dto.classification());
    }
    if (dto.name().isBlank()) {
        throw new DomainValidationException("Partner name is empty");
    }
    for (var indicator : dto.riskIndicators()) {
        if (!KNOWN_RISK_INDICATORS.contains(indicator)) {
            throw new DomainValidationException(
                "Unknown risk indicator: " + indicator);
        }
    }
    return new ValidatedPartner(
        dto.partnerId(), dto.name().strip(),
        dto.countryCode(), dto.classification(),
        dto.riskIndicators());
}
```

**Step 4: Trusted construction (T2 → T1)**

```java
public record RiskAssessment(
    String assessmentId, String partnerId,
    String partnerName, String riskLevel,
    String classification, String assessedBy,
    Instant assessedAt
) {
    public RiskAssessment {
        Objects.requireNonNull(assessmentId);
        Objects.requireNonNull(partnerId);
        Objects.requireNonNull(partnerName);
        Objects.requireNonNull(riskLevel);
        Objects.requireNonNull(classification);
        Objects.requireNonNull(assessedBy);
        Objects.requireNonNull(assessedAt);
    }
}

@AuthoritativeConstruction
public RiskAssessment createRiskAssessment(
        ValidatedPartner partner, AuditContext context) {
    return new RiskAssessment(
        generateAssessmentId(),
        partner.partnerId(),
        partner.name(),
        computeRiskLevel(partner),
        partner.classification(),
        context.identity(),
        context.timestamp());
}
```

**The complete call chain:**

```java
public RiskAssessment assessPartner(String partnerId, AuditContext context) {
    var raw = fetchPartnerData(partnerId);                    // T4
    var dto = parsePartnerResponse(raw);                      // T3
    var validated = validatePartnerSemantics(dto);             // T2
    var assessment = createRiskAssessment(validated, context); // T1
    return assessment;
}
```

Each line is a tier transition. Each method has one annotation declaring one transition. The types in the signatures tell the tier story even without the annotations.

**SARIF output for a violation.** If the monolithic version of this code used `getOrDefault()` on the T1 construction path, the scanner would produce:

```json
{
  "version": "2.1.0",
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
  "runs": [{
    "tool": {
      "driver": {
        "name": "wardline-scanner",
        "version": "0.2.0",
        "rules": [{
          "id": "JV-WL-001",
          "shortDescription": {
            "text": "Member access with fallback default"
          }
        }]
      }
    },
    "results": [{
      "ruleId": "JV-WL-001",
      "level": "error",
      "message": {
        "text": "Map.getOrDefault() provides fabricated default on AUDIT_TRAIL path"
      },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": {
            "uri": "src/main/java/com/myorg/service/PartnerService.java"
          },
          "region": {
            "startLine": 47,
            "startColumn": 29
          }
        }
      }],
      "properties": {
        "wardline.rule": "JV-WL-001",
        "wardline.taintState": "AUDIT_TRAIL",
        "wardline.enclosingTier": 1,
        "wardline.severity": "ERROR",
        "wardline.exceptionability": "UNCONDITIONAL",
        "wardline.analysisLevel": 1,
        "wardline.excepted": false,
        "wardline.annotationGroups": [1, 16],
        "wardline.enclosingAnnotation": "@AuthoritativeConstruction",
        "wardline.boundaryFunction": "com.myorg.service.PartnerService.createRiskAssessment"
      }
    }],
    "properties": {
      "wardline.manifestHash": "sha256:a1b2c3d4e5f6...",
      "wardline.coverageRatio": 0.68,
      "wardline.controlLaw": "normal",
      "wardline.deterministic": true
    }
  }]
}
```

The mandatory property bags (`wardline.rule`, `wardline.taintState`, `wardline.enclosingTier`, `wardline.severity`, `wardline.exceptionability`, `wardline.excepted`, `wardline.annotationGroups`) follow the parent specification's SARIF contract (Part I §10.1). The additional properties (`wardline.enclosingAnnotation`, `wardline.boundaryFunction`) are binding-specific extensions that provide Java-specific diagnostic context — they are not required by the interface contract but are recommended for implementers.

**Agent guidance note.** For agents working in wardline-annotated Java codebases, the scanner finding-to-remediation mapping provides specific actions for each JV-WL rule. Key patterns: replace `.orElse(default)` with `.orElseThrow()` for JV-WL-001; narrow `catch (Exception e)` to specific types for JV-WL-003; add rejection paths for JV-WL-007; verify validation ordering for JV-WL-008. Multi-agent workflows should treat wardline annotations and governance artefacts as requiring the same human review as single-agent output.

**Annotation change impact preview.** Java binding implementations SHOULD support annotation change impact preview using the SARIF metadata defined in Part I §10.1. When a developer modifies a tier assignment or annotation — e.g., adding `@ValidatesExternal` to replace a `@ValidatesShape` + `@ValidatesSemantic` pair, or changing a module's tier declaration in the manifest — the tool shows the cascade: newly applicable pattern rules, resolved findings, severity changes, and affected modules. The primary span is the changed annotation; secondary spans (carried in SARIF `relatedLocations`) are code locations whose compliance status changes. Because Error Prone fires during `javac`, Phase 2 advisory implementations MAY surface a simplified cascade view at compile time; the full SARIF-based impact preview is a Phase 3 (Wardline-Core) capability.

---

#### B.9 Adoption strategy

The Java regime supports four incremental adoption phases:

| Phase | What You Add | What You Get | Build Integration |
|---|---|---|---|
| **1. Annotations only** | `wardline-annotations` (`compileOnly`, zero transitive dependencies) | Documentation value. Annotations visible in code review and IDE navigation | None |
| **2. Advisory checks** | `wardline-errorprone` | Compile-time warnings for JV-WL-001–004. Immediate developer feedback during `javac` | `javac` plugin (integrated into compilation) |
| **3. Authoritative scanner** | `wardline-scanner` in CI | Tier-aware severity grading, taint-flow analysis, governance-grade SARIF | CI step |
| **4. Type system enforcement** | `wardline-checker` | Compile-time tier-flow enforcement via Checker Framework. No reference implementation exists at time of writing | `javac` annotation processor |

**Phase 2 is the adoption accelerator.** Error Prone fires during `javac` — advisory findings appear in the IDE as developers type, with no additional configuration. This makes Phase 2 nearly frictionless.

**Phase 2 is not conformant.** A project at Phase 2 does not achieve any wardline conformance profile. It provides advisory warnings that help developers learn the pattern language but does not consume the manifest, produce tier-graded SARIF, or enforce pattern rules authoritatively.

**Phase 3 is a legitimate end state.** Wardline-Core achieves meaningful assurance: authoritative tier-graded findings, taint-flow analysis, governance-grade SARIF. Phase 4 adds compile-time enforcement but is not required for conformance.

**Governance tooling is cross-cutting, not a separate phase.** The `wardline-cli` tool (manifest validation, fingerprint baseline, SARIF aggregation, control-law reporting) enters at Phase 1 and remains through all subsequent phases. The Python binding's five-phase model includes a dedicated Phase 5 ("full governance") because Python's governance tooling matures separately from its scanner. In the Java regime, `wardline-cli` is shared across bindings and integrates naturally at each phase boundary — it does not require a separate adoption step.

**Java version requirement.** Java 17+ is a hard minimum. Records, sealed classes, and pattern matching are essential. Projects on earlier versions should plan a Java 17 migration before adopting this binding. A Java 11 project receives more value from the Python binding on its Python services than from a degraded Java binding.

**The adoption bottleneck is organisational, not technical.** Annotating code (Phase 1) is immediate. Phase 2 requires platform team approval for Error Prone. Phase 3 requires a new CI step. Phase 4 requires Checker Framework — a GPL-licensed dependency that government legal may flag. Each transition crosses an organisational boundary.

**Realistic timeline.** Plan for 6–12 months from initial interest to Phase 4 deployment when accounting for dependency approval, security assessment, platform team onboarding, and pilot validation. Phase 1 can proceed immediately while remaining dependencies are in the approval pipeline.

---

#### B.10 Error handling and control law

The Java regime's scanner error handling follows the same principles as the Python binding, with Java-specific adaptations.

**Exit codes** are consistent across all wardline regimes:

| Code | Meaning | Action |
|---|---|---|
| 0 | All files scanned, no ERROR-severity findings | CI pass |
| 1 | At least one ERROR-severity finding | CI fail |
| 2 | Scanner internal error | CI fail — fix configuration |
| 3 | Direct law — authoritative scanner did not run | Governance policy determines CI behaviour |

**Phase-parameterised control law.** The control law is parameterised by the project's declared adoption phase. Each phase defines its own normal/alternate/direct thresholds:

| Phase | Normal Operation | Alternate | Direct |
|---|---|---|---|
| **1** | wardline CLI validates manifest | — | CLI absent |
| **2** | Error Prone + wardline CLI | CLI absent | Error Prone absent |
| **3** | Reference scanner + wardline CLI | Error Prone absent (advisory) | Scanner absent OR CLI absent |
| **4** | Error Prone + Scanner + Checker + CLI | Error Prone absent OR Checker absent | Scanner absent OR CLI absent |

The declared phase is set in `wardline.toml` (`[regime] phase = 3`). Phase transitions are governance events requiring review. Regressing from Phase 4 to Phase 3 reduces assurance and should be documented.

**Control-law transition governance:**

- Transitions from normal to alternate/direct SHOULD require acknowledgement from the governance authority
- Every state change MUST be recorded in SARIF output (`wardline.controlLaw.transition`)
- Recommended maximum alternate-law duration: 14 days. Direct-law: 48 hours
- When returning from degraded operation, a retrospective scan of all code committed during the period SHOULD be performed

---
