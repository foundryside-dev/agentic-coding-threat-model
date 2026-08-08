### 11. Language frontends

Wardline analyses two languages and is implemented in one. It is pure Python; Rust is a *scanned target*, reached through a tree-sitter grammar, not an implementation language. There is no Java binding and no TypeScript binding. The designed specification's parallel Python and Java bindings, each with its own annotation vocabulary and its own severity matrix, do not exist and were never built.

#### 11.1 The frontend registry

Language-specific concerns are isolated behind a single plug-point in `core/frontends.py`. A `LanguageFrontend` is a runtime-checkable `Protocol` with three members:

| Member | Purpose |
|---|---|
| `name` | The canonical registry key, and the value a caller passes as `run_scan(lang=…)` |
| `suffixes` | The file extensions to discover for this language, leading dot included |
| `build_analyzer` | Constructs a fresh `Analyzer` for the scan, given the resolved config and the summary cache |

The registry is a plain dictionary:

```python
FRONTENDS: dict[str, LanguageFrontend] = {
    "python": PythonFrontend(),
    "rust": RustFrontend(),
}
```

`core/run.py` looks the frontend up by name, raising `ConfigError` with the known keys listed when the name is not registered. The CLI exposes the choice as `wardline scan --lang {python,rust}`, defaulting to `python`.

Two properties of this arrangement matter more than the interface itself.

**`run_scan` does not change when a language is added.** The module's own docstring states the contract: write a class implementing the protocol, add it to `FRONTENDS`, and the engine is untouched. A worked `GoFrontend` sketch sits alongside the registry in the module source to make the point concrete.

**Imports are lazy on purpose.** Neither frontend imports its analyser package at module load. Every heavyweight import happens inside `build_analyzer`, so `import wardline.core.frontends` does not pull in the scanner or the Rust package. This preserves the layering the engine already had, and it is why the Rust extra can be absent without breaking a Python scan.

The layering is not merely conventional. It is enforced by import-linter contracts declared in `pyproject.toml` — *"Engine must not import policy, federation, or surface"* and *"Policy must not import federation or surface"* — checked as part of the project's own quality gates. A frontend that reached sideways into the policy or surface layers would fail the build rather than merely offend a reviewer.

#### 11.2 Python — the full frontend

`PythonFrontend` discovers `.py` files and builds the scanner's analyser over a `TrustGrammar`. It starts from `default_grammar()` and extends it with any trust-grammar pack the caller has granted (§5): each granted pack may expose a `grammar` attribute, which must be a `TrustGrammar` instance or the load fails with `ConfigError`, and the frontend folds its boundary types and rules into the grammar the analyser receives. This is the point at which caller-granted trust becomes analysis behaviour — a pack the caller did not grant never reaches this code, because `core/config.py` refused it earlier.

Everything described in §4 through §8 is the Python frontend: the eight-state lattice, the three decorators, the twenty-six `PY-WL-1xx` rules, the taint engine with its callgraph, project resolver, module summariser and summary cache, and the verification machinery. Python is where the tool is finished.

#### 11.3 Rust — the preview frontend

`RustFrontend` discovers `.rs` files and builds a zero-configuration `RustAnalyzer`. It is a preview in the exact sense that it covers one threat slice.

**Scope.** Two rules: `RS-WL-108` fires when untrusted data chooses the executable spawned by `Command::new` — an attacker-chosen program, base severity ERROR — and `RS-WL-112` fires when untrusted data reaches a `sh -c` style shell command line, base severity WARN. The two de-conflict: when the program itself is tainted, `RS-WL-112` stays silent so one boundary yields one finding. Both modulate by the containing function's declared trust tier through the same severity model the Python rules use, and an unmarked function yields `NONE` and is suppressed — the opt-in posture holds across languages.

**How trust is declared.** Rust attributes are compile errors on stable when used as trust markers, so the declared-trust signal rides an outer doc comment instead: `/// @trusted(level=ASSURED)` on a function declares its body trusted at that tier. A marker may only declare a trusted tier — the raw and unknown states are the fail-closed default, not something a declaration can assert. An unmarked function yields no opinion, and the seeder resolves that to `UNKNOWN_RAW`.

**The vocabulary is narrower than Python's.** `rust_taint.yaml` holds two frozen tables keyed by `(crate, path)`: sources, giving the taint of a standard call's returned value, and sinks, classified by kind — where the only kind in this slice is `command`. Legal source states are restricted to a four-member set, deliberately excluding `INTEGRAL` (a source returns data the project did not produce, so full trust is nonsensical) and excluding the trio outside §4.4's reachable set. A version constant folds into the provider fingerprint, so a vocabulary edit invalidates dependent summaries.

**Parsing and failure behaviour.** The analyser parses once per file, mints one node-identity map, and threads it through entity indexing, trust seeding, dataflow and rules, so every pass shares one keying authority. It discovers the tree's Cargo crate roots in a single whole-tree pass and routes each file to its crate-prefixed module. A file tree-sitter cannot fully parse produces a gate-eligible `WLN-ENGINE-PARSE-ERROR` defect and contributes no findings — the frontend never half-analyses a file.

**Installation.** Rust support is behind the `wardline[rust]` extra, which pulls the scanner extra plus pinned `tree-sitter>=0.25,<0.26` and `tree-sitter-rust==0.24.2`. Both ship stable-ABI wheels, so no compiler is needed at install time.

The honest reading of the Rust frontend is that it demonstrates the registry is real — a second language plugged in without the engine changing — and simultaneously demonstrates what a second language costs. Two rules against twenty-six is the distance between a proof that the plug-point works and a frontend a team could rely on.

#### 11.4 Evaluating a candidate language

The designed specification supplied a rubric for assessing how well a language ecosystem could support enforcement. Most of it survives, with the annotation-expressiveness criterion narrowed: the implementation needs three declaration markers, not seventeen annotation groups, and the Rust frontend has already shown that the marker channel need not be a first-class language feature.

| Criterion | What to assess |
|---|---|
| **Declaration channel** | Can the language carry the three trust declarations at function level, without runtime overhead and without a compile error? Native attributes or decorators are ideal; a structured comment convention is workable, as the Rust doc-comment marker shows. |
| **Parse-tree access** | Is there an AST or equivalent available to a Python process — a stdlib parser, or a maintained tree-sitter grammar? Is the parse tree stable across language versions? |
| **Callable resolution** | Can call targets be resolved to stable qualified names across modules and compilation units? This determines whether interprocedural taint is possible at all, and it is the hardest requirement on this list. |
| **Type-system metadata** | Can type annotations carry trust state, and does the type checker propagate it through assignments, calls and returns? Relevant to the unbuilt type layer (§10.3). |
| **Structural typing** | Can the type system distinguish raw, guarded and assured records with identical field structures? |
| **Runtime object model** | Can the language make invalid access structurally impossible — raising on an unset authoritative field rather than defaulting? Relevant to the unbuilt runtime layer (§10.3). |
| **Serialisation boundary control** | Can trust violations be detected at serialisation and deserialisation boundaries? |
| **Sink enumerability** | Are the dangerous calls — process execution, deserialisation, dynamic evaluation, SQL, path handling — reachable through a stable, enumerable set of standard-library and common-framework entry points? Roughly half the Python rule set depends on this, and it is what makes a useful first slice cheap. |
| **Tooling ecosystem** | Does mature static-analysis infrastructure already exist, and would a Wardline frontend duplicate or complement it? |

**The advisory-to-structural spectrum.** Frontends sit somewhere between advisory and structural. At the advisory end, declarations are metadata that the analyser reads and the language ignores: a decorator marks a function `@trusted`, and nothing in Python prevents that function from violating the claim. At the structural end, trust would be encoded in types, and mismatches would be unrepresentable rather than reportable. Both current frontends are advisory. A more structural binding would reduce *generation* risk — an agent coding against a language that rejects non-compliant code gets tighter feedback than one waiting for a scan — but it would not reduce *declaration* risk, which is §9's first entry: type-level trust definitions that are wrong produce code structurally compliant with a wrong policy, in the same way that a wrong decorator does.

**Rules that do not port.** Some rules are structurally inapplicable in some languages. A language whose type system already prevents a class of violation does not need the rule that detects it, and the correct outcome is to mark it not applicable with a documented reason rather than to implement a rule that can never fire. The Rust slice is an instance of the reverse case: it implements the two rules where Rust's own guarantees do not help, because `Command::new` with attacker-chosen input is dangerous regardless of how sound the borrow checker is.

#### 11.5 Adding a frontend

The registry entry is the small part. In full, a new frontend needs:

1. **A parser** the analyser can drive from Python — a stdlib parser for the target language is rare, so in practice a maintained tree-sitter grammar, pinned behind its own extra so the base package stays zero-dependency.
2. **A trust provider** that recognises the language's declaration channel and maps it to lattice states, refusing to let a declaration assert a raw or unknown state.
3. **A vocabulary table** of sources and sinks, keyed by whatever identity the language's module system supplies, carrying a version constant that folds into the provider fingerprint so table edits invalidate cached summaries.
4. **Dataflow and rule modules**, one module per rule, reusing the shared severity model so that tier modulation and the suppression of unmarked functions behave identically across languages.
5. **Corpus specimens and sentinels**, because a frontend without labelled true and false positives cannot be held to the false-positive gate described in §8, and an ungated frontend is a preview by definition.
6. **The registry entry** — a class with `name`, `suffixes` and `build_analyzer`, added to `FRONTENDS`.

The project's own scope statement declares broad multi-language coverage out of scope for now, beyond the Python core and the Rust preview. The plug-point exists so that the decision stays reversible, not because a queue of languages is waiting behind it.
