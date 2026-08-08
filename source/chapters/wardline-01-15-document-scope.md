### 15. Document scope

This document defines the language-agnostic wardline classification framework. Language-specific enforcement regimes (§14.4) — which implement the framework's requirements using language-native mechanisms and existing tooling ecosystems — are defined in separate companion documents. This document governs; companion documents implement. A companion document describes the enforcement regime for a language ecosystem: which tools implement which conformance profiles (§14.3), how they compose into a regime, and where structural gaps exist.

Two language bindings are currently defined in Part II:

- *Python Language Binding Reference* (Part II-A) describes how Python's ecosystem — type checkers (mypy, pyright), linters (ruff, semgrep), AST analysis, and CI orchestration — can compose a Wardline-Full regime.
- *Java Language Binding Reference* (Part II-B) describes how Java's ecosystem — Error Prone, the Checker Framework's pluggable type system, a reference scanner, and Java's records and module system — can compose a Wardline-Full regime. Java's annotation system provides richer enforcement layer coverage than Python's decorator model, and the Checker Framework enables compile-time tier-flow enforcement that has no Python equivalent.

Future companions for other languages will reference this specification as their normative basis and evaluate their language against the criteria in §11, with particular attention to which conformance profiles existing tools in that ecosystem can implement.

**Candidate language bindings.** The following languages are candidates for future bindings. C# and Go are the next regimes under active consideration; C++ and Rust are listed for completeness based on prevalence across government enterprise and defence software estates:
- **C#/.NET** — widely used in Australian and UK government systems. C# attributes, Roslyn analysers, and the .NET type system provide good coverage across all three enforcement layers.
- **Go** — increasingly adopted for cloud-native government services. Go's structural typing, `go vet`, and `staticcheck` ecosystem provide static analysis coverage, though the minimal annotation system requires different declaration mechanisms.
- **C++** — prevalent in defence, signals intelligence, and safety-critical systems (avionics, weapons systems, real-time platforms). C++ attributes (`[[nodiscard]]`, custom attributes via Clang), clang-tidy, and the ownership model provide enforcement leverage, though the absence of runtime reflection limits the runtime structural layer. C++ bindings are particularly relevant to Five Eyes defence programmes and AUKUS Pillar II software interoperability.
- **Rust** — relevant for new safety-critical and cryptographic systems. Rust's ownership model, trait system, and `clippy` linting provide the strongest structural guarantees of any candidate language — two pattern rules (WL-002, WL-006) may be structurally inapplicable because the type system already prevents the violations they detect.

The binding roadmap is driven by community demand and contribution. Organisations whose software estates are concentrated in languages not yet covered should engage with the consultation process to signal priority — see the project repository's issue tracker or the contact details in the front matter.
