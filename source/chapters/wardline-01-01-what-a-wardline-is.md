### 1. What a Wardline is

A wardline is the set of declarations an application makes about where its trust boundaries are — which functions take untrusted data in, which functions raise trust by validating it, and which functions are entitled to assume they are working on trusted data. Everything else in this specification follows from those declarations: the lattice (§4) is what a declaration assigns, the rules (§6) are what a declaration makes checkable, and the gate (§7) is what a declaration makes enforceable.

The declarations live in the source, on the functions they describe, as three decorators (§5). There is no manifest. The implementation requires no project-level policy file to scan a codebase; configuration under `weft.toml [wardline]` is optional and, where it names trust-extending packs, is subordinate to what the caller grants at the command line (§5). This is a deliberate reversal of the designed specification (archived), which made a root `wardline.yaml` manifest the primary artefact and the annotations a secondary binding. A `wardline.yaml` does exist in the implementation's own repository root, and it is worth knowing what it is not: roughly a hundred bytes of federation endpoint URLs for the surrounding tool suite, carrying no policy, no boundary declarations, and no trust topology. (Early releases did use a `wardline.yaml` as the tool's own configuration file before that moved to `weft.toml [wardline]`; a reader who finds it in the changelog should not mistake it for the designed manifest either. It configured the scanner. It never declared a trust topology.) The designed manifest schema was never built.

The consequence of putting the declarations in the source is that a wardline is not a document about a codebase; it is a property of one. It cannot drift from the code it describes without the drift being a code change, visible in the same diff and reviewed by the same reviewer.

**Normative language.** This specification uses MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, and OPTIONAL as defined in RFC 2119 and clarified in RFC 8174. Because this is an as-built document, most of it is indicative: it describes what the implementation does, in the present tense, and those passages carry no normative force. Uppercase keywords appear only where the text states a contract the implementation is committed to holding — an invariant a frontend, a pack, or a downstream consumer may rely on. Lowercase equivalents describe expected behaviour of user code under enforcement, not requirements on implementations.

#### 1.1 Terms and definitions

The following terms carry specific meaning in this document. Where a term is used in its everyday sense it appears in lowercase without emphasis.

| Term | Definition |
|---|---|
| **Taint state** | The trust level the engine assigns to a value or to a function's return. One of the eight members of `TaintState`. See §4. |
| **Trust lattice** | The eight taint states together with their trust ranking (`TRUST_RANK`) and combination operators. See §4.1–§4.3. |
| **Reachable set** | The five taint states any source can introduce into the live pipeline: `INTEGRAL`, `ASSURED`, `GUARDED`, `EXTERNAL_RAW`, `UNKNOWN_RAW`. The remaining three states are declared but not produced: two have no producer under any configuration, and `MIXED_RAW` becomes producible only under a non-default configuration key. See §4.3–§4.4. |
| **Boundary** | A function carrying one of the three trust decorators. An *external boundary* introduces untrusted data; a *trust boundary* raises trust by validating; a *trusted producer* asserts that it both works on and returns trusted data. See §5. |
| **Anchored function** | A function whose taint is fixed by its own declaration rather than inferred from its callees. Anchored functions are authoritative and are not refined by the project-level fixed point. See §4.3. |
| **Developer-freedom zone** | Undecorated code. It resolves to `UNKNOWN_RAW`, and the tier-modulated rules suppress on it. Wardline is silent until a declaration opts a function in. See §3 and §6. |
| **Inert scan** | A scan that recognised zero trust boundaries over at least five analysed functions — a gate that passes green while enforcing nothing. Detected by `core/resolution_posture.py`. See §7. |
| **Trust-grammar pack** | An installable Python package that extends the recognised declaration vocabulary beyond the three built-in decorators. A repository may *declare* which packs it uses; only the caller may *grant* them. See §5. |
| **Trust grant** | A caller-supplied authorisation (`--trust-pack`, `--allow-custom-packs`) that permits a declared pack to take effect. Absent the grant, configuration that names the pack is a hard configuration error, not a warning. See §5. |
| **Finding** | One record emitted by a scan. Every finding carries a rule identifier, a location, a fingerprint, a kind, a severity, and a suppression state. |
| **Kind** | What a finding *is*: `defect`, `fact`, `classification`, `metric`, or `suggestion`. Only defects can trip the gate; facts and metrics are engine observations and carry severity `NONE`. |
| **Severity** | `CRITICAL`, `ERROR`, `WARN`, `INFO`, or `NONE`, in that order. A rule declares a base severity which is then modulated by the resolved taint tier of the function it fired in. See §6. |
| **Gate** | The pass/fail decision a scan renders, controlled by `--fail-on` (a severity threshold) and by the inertness and unanalysed trips. Exit 0 is clean, 1 is a tripped gate, 2 is a wardline error. See §7. |
| **Fingerprint** | The stable identity of a finding, and the join key for all three suppression stores. A single join predicate (`core/finding_identity.py`) resolves a fingerprint against waivers, judged records, and the baseline, in that precedence. See §7. |
| **Suppression state** | `active`, `baselined`, `waived`, or `judged`. Only `active` findings can trip the gate. |
| **Baseline** | A fingerprint snapshot of the findings present at a point in time, stored under `.weft/wardline/`, used to adopt the tool on an existing codebase without an immediate gate failure. See §7. |
| **Waiver** | An explicit, human-authored suppression carrying a mandatory reason and an optional expiry date. Expired waivers resurface. See §7. |
| **Judged record** | A suppression written by the opt-in LLM triage command when it labels a finding a false positive. Judging is never automatic; its effect on later scans is. See §7. |
| **Attestation** | A signed posture bundle produced by `wardline attest`, using HMAC-SHA256 under a shared project key. Tamper-evidence within a key-holding trust domain, not non-repudiable proof. See §7. |
| **Frontend** | A language plug-point implementing the `LanguageFrontend` Protocol — a name, a set of file suffixes, and an analyser constructor. Currently `python` and `rust`. See §11. |
| **Enforcement perimeter** | The set of functions the engine analysed *and* that carry, or transitively derive from, a recognised declaration. Code outside it resolves to `UNKNOWN_RAW`, which the severity model treats as the freedom zone and suppresses to `NONE` — including for the sink rules, which are tier-modulated on the containing function's resolved tier like every other rule family (§6). |

#### 1.2 What a wardline declares, and what it does not

A wardline declares four things, all of them local to a function:

- that a function's return is raw and untrusted, because the data crosses into the system there;
- that a function validates, and what trust level its output has earned;
- that a function is entitled to assume trusted data, and at what level;
- by omission, that a function is in the developer-freedom zone and is not being asserted about at all.

It does not declare what the data *means*. The designed specification (archived) attempted this: named boundary contracts, bounded contexts, declared domain defaults, institutional evidence categories for restoring serialised artefacts. None of it was built, and §10 records why the ideas remain interesting. The implemented model is narrower and correspondingly more defensible — it decides whether a function's actual trust matches its declared trust, and whether untrusted data reaches a dangerous sink. It cannot decide whether a validator checks the *right* predicate; that limit is stated explicitly in §9.

The distinction that survived from the designed specification is the one between the declaration and the tool that enforces it. The declarations are three decorators from a tiny marker package (`weft-markers`) whose runtime behaviour is to do nothing. They survive uninstalling wardline. What they cost the application is three import lines; what they buy is that the institutional knowledge of where the trust boundaries are stops living in reviewers' heads.
