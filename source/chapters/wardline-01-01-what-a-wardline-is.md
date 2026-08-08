### 1. What a Wardline is

**Normative language.** This specification uses MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY, REQUIRED, RECOMMENDED, and OPTIONAL as defined in RFC 2119 and clarified in RFC 8174. When these words appear in uppercase, they carry normative force. Lowercase equivalents (must, should, required) describe expected behaviour of user code under scanner enforcement, not implementation requirements.

#### 1.1 Terms and definitions

The following terms carry specific meaning in this specification. Where a term is used in its everyday sense, it appears in lowercase without emphasis; where it carries its defined meaning, the surrounding tier, boundary, or annotation context makes this clear.

| Term | Definition |
|---|---|
| **Authority tier** | One of four hierarchical classifications (Tier 1 through Tier 4) that describe the level of trust a system is entitled to assume about a data value. See §4.1. |
| **Boundary contract** | A named, stable semantic identifier declaring what data crosses a boundary and at what tier, replacing the previous function-name consumer list. Each contract specifies a contract name (e.g., `"landscape_recording"`, `"partner_reporting"`), the data tier expected, and the direction of flow. Contracts survive refactoring — the contract is stable; the function-level binding updates. See §5.2, §13.1.2. |
| **Bounded context** | The declared set of boundary contracts for which a semantic validation boundary establishes domain-constraint satisfaction. A validation is comprehensive within its bounded context — it establishes that data satisfies every domain constraint for every intended use within the declared scope. See §5.2, §13.1.2. |
| **Coding posture** | The programming style appropriate to a given tier: offensive (T1), confident (T2), guarded (T3), or sceptical (T4). The shorthand T1–T4 is used interchangeably with Tier 1–Tier 4 throughout. See §4.1. |
| **Effective state** | One of eight enforcement contexts produced by combining trust classification and validation status. The severity matrix (§7.3) maps pattern rules to effective states. |
| **Enforcement perimeter** | The set of source files, modules, or packages that a wardline declaration covers. Code outside the enforcement perimeter is not analysed; data crossing the perimeter boundary is treated as UNKNOWN. |
| **Exception** (governance) | A documented, time-limited override of a scanner finding, managed through the exception register (§9, §13.1.3). Distinct from a programming-language exception. |
| **Fingerprint baseline** | A cryptographic record of the annotation surface at a governance checkpoint. Baseline diffs surface all wardline-relevant changes for review. See §9.2. |
| **Non-normative** | Content that advises or recommends but does not impose requirements on implementations. In Part II, sections not marked "This section is normative" are non-normative. Non-normative sections use "recommended", "preferred", "avoid" — never uppercase RFC 2119 keywords. |
| **Normalisation boundary** | A declared boundary that collapses MIXED-taint inputs into a new Tier 2 artefact. Normalisation is semantically a new construction, not a passthrough. See §5.1. |
| **Overlay** | A YAML file (`wardline.overlay.yaml`) that narrows or extends the root manifest for a specific module, boundary, or data source. See §13.1.2. |
| **Rejection path** | A control-flow path within a validation boundary function that terminates without producing the function's normal return value (e.g., `throw`, guarded early return). See §7.2. |
| **Restoration boundary** | A declared function that reconstitutes a previously serialised artefact, reinstating a tier classification supported by evidence categories. See §5.3. |
| **Semantic boundary** | A point in the codebase where data crosses between authority tiers or where institutional meaning is assigned. Wardline annotations make semantic boundaries explicit and machine-readable. |
| **Structural contract** | The set of structural guarantees that a data representation provides after shape validation — field presence, type correctness, schema conformance. |
| **Taint state** | The effective state assigned to a data value by the taint analysis engine. Determined by the value's trust classification and validation status. See §5.1. |
| **Trust topology** | The complete set of tier assignments, boundary declarations, and data-flow constraints declared in a project's wardline manifest and overlays. |
| **Validation boundary** | A declared function that transitions data from one tier to another through structural (shape) or domain-constraint (semantic) verification. |
| **Wardline manifest** | The root YAML file (`wardline.yaml`) that declares a project's trust topology, enforcement configuration, and governance policy. See §13. |

A wardline is the set of declarations an application makes about how it classifies and protects the semantic boundaries of its data and code paths. It declares:

- Which data belongs to which authority tier
- Which code paths must fail in which ways
- Which patterns are prohibited in which contexts
- What governance surrounds exceptions to those rules
- Where serialised artefacts may be restored to a tier, and on what evidence (restoration boundaries)

An application that has declared a wardline has made its institutional knowledge machine-readable. An application without one has that knowledge in prose, in people's heads, or nowhere.

The wardline is the *classification*, not the enforcement tool. A wardline declares that deserialised audit records carry Tier 1 authority and that accessing their fields with fallback defaults is prohibited. An enforcement tool reads that declaration and produces findings when the codebase violates it. The relationship is analogous to a security classification guide and the systems that enforce it: the guide defines the policy; the systems implement it. Replacing the enforcement tool does not change the classification. Changing the classification changes what every enforcement tool must check.

This distinction matters because institutional knowledge outlives any particular toolchain. A wardline expressed as a machine-readable manifest can be consumed by static analysers, type checkers, runtime enforcement layers, prompted review systems, or assessment tooling — serially or in parallel, in any language. The manifest is the stable artefact. The tools are disposable.

A wardline is therefore a normative document: it describes what the application *commits to*, not what it currently achieves. The gap between declaration and enforcement is measurable, auditable, and — critically — visible to assessors who have no access to the development team's tacit knowledge.
