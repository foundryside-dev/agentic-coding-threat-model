## Part II — Language Binding Reference

This part provides compressed binding references for each language the Wardline framework currently targets. Each binding maps the framework's 17 abstract annotation groups (Part I §6) to concrete language mechanisms, defines the interface contract for conformant scanners, and documents language-specific residual risks.

**Normative status.** This part uses per-section normative markers. Interface contract sections (A.3, B.3) are normative — they define the boundary between the specification and any implementation. All other sections (mapping tables, regime matrices, worked examples, design rationale, residual risks) are non-normative — they provide implementation guidance and assessment material.

**Relationship to Part I.** Part I defines the framework: tier model, taint algebra, pattern rules, governance model, conformance criteria, and manifest format. This part translates those framework requirements into language-specific enforcement. Where a binding-level statement conflicts with Part I, Part I governs. Section references of the form "§N.N" without a part prefix refer to Part I sections (e.g., "§5.1" means Part I §5.1, the taint lattice definition).

**Current bindings:**

- **A. Python** — targets Python 3.12+. Uses decorator-based annotation, `typing.Annotated` for type-system enforcement, and descriptors for runtime structural enforcement.
- **B. Java** — targets Java 17+. Uses annotation-based vocabulary with meta-annotation composition, Checker Framework pluggable types for type-system enforcement, and sealed classes with records for runtime structural enforcement.

**Future bindings** (not yet specified): C#, Go, C++, Rust. The candidate language list and per-language evaluation rationale are in Part I §15. The evaluation criteria in Part I §11 define how to assess a new target language.

---
