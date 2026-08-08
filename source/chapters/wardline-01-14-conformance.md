### 14. Conformance

#### 14.1 Conformance model

The wardline classification framework is designed to be implemented by existing tooling ecosystems, not only by bespoke enforcement products. A single tool need not — and in most ecosystems will not — satisfy every conformance criterion. A type checker may enforce tier mismatches in signatures. A linter or pattern-matching tool may detect pattern rule violations. A CI orchestrator may handle manifest validation, governance reporting, and SARIF aggregation. The framework's value is realised when these tools collectively cover the enforcement surface, each contributing the slice that matches its capabilities.

To support this, the conformance model distinguishes between **tool-level conformance** (what a single tool implements) and **regime-level conformance** (what the combined tooling achieves for a given language ecosystem).

#### 14.2 Conformance criteria

Ten criteria define the full wardline conformance surface. They are grouped by what they certify: *expressiveness* (can the ecosystem represent the wardline?), *enforcement capability* (can tools detect violations?), and *governance infrastructure* (can exceptions be managed?).

**Expressiveness** (non-negotiable):

1. The ecosystem can express all 17 annotation groups at the function, class, or field level using language-native mechanisms (§6).

**Enforcement capability** (non-negotiable):

2. Pattern rule detection: the six active pattern rules (WL-001 through WL-006) are detected intraprocedurally within annotated bodies (§7, §8.1).
3. Structural verification: WL-007 is enforced on all validation boundary functions (shape, semantic, combined, and restoration) and WL-008 (validation ordering) is enforced on semantic-validation and combined-validation boundaries (§7.2, §8.1).
4. Taint-flow tracking: explicit-flow taint between declared boundaries is traced for at minimum direct flows and two-hop unannotated intermediaries (§8.1). The two-hop scope also applies to WL-007 delegation — a validation function that delegates to a called validator satisfies WL-007 through two-hop call-graph analysis (§8.1).
5. Precision and recall are measured, tracked, and published per rule, per tool (§10).
6. A golden corpus of labelled specimens exists and is maintained (§10).
7. Each enforcement tool passes its own rules where applicable (self-hosting gate) (§10).
8. Enforcement output is deterministic SARIF v2.1.0 with the wardline-specific property bags defined in §10.1.

**Governance infrastructure** (necessary for assessable enforcement):

9. The governance model supports at minimum: protected-file review, temporal separation, and annotation fingerprint baseline (§9).
10. The wardline manifest (§13) — root manifest, overlays, exception register, and fingerprint baseline — is consumed and validated against the framework's JSON Schemas.

#### 14.3 Conformance profiles

**Relationship to the parent paper's maturity stages.** The discussion paper (§7.2) defines three validation maturity stages. This specification's conformance profiles provide the implementation detail behind those stages. The approximate mapping: Stage 1 (achievable with existing tooling) corresponds to Wardline-Core enforcement at Wardline Lite governance. Stage 2 (moderate engineering investment) corresponds to Wardline-Core plus Wardline-Type enforcement at Wardline Lite governance. Stage 3 (comprehensive semantic enforcement with governance model) corresponds to Wardline-Full enforcement at Wardline Assurance governance. The mapping is approximate because the parent paper's stages describe organisational maturity while this specification's profiles describe tool and governance capability — an organisation may operate at Stage 2 maturity while using a Wardline-Core-only regime if their type-system tooling is not yet available.

All-or-nothing conformance deters adoption. The conformance model therefore defines two orthogonal profile dimensions: **enforcement profiles** partition the ten criteria into implementable slices that match existing tool categories; **governance profiles** partition the governance burden into maturity-appropriate levels. A deployment declares both: an enforcement profile (or regime of profiles) and a governance profile. The enforcement profiles tell an assessor *what the tools can do*; the governance profiles tell an assessor *how rigorously the organisation governs the policy surface*.

##### 14.3.1 Enforcement profiles

An open-source type checker maintainer who sees a ten-criterion checklist spanning static analysis, taint tracking, governance registers, and SARIF output will correctly conclude that the specification expects a bespoke product, not a community contribution. Enforcement profiles partition the criteria into implementable slices that match the capabilities of existing tool categories.

Four enforcement profiles are defined. Each profile declares which of the ten criteria it requires. A tool declares which profile(s) it satisfies; an enforcement regime declares which profiles its constituent tools collectively cover.

| Profile | What it covers | Criteria (minimum + conditional) | Typical implementer |
|---------|---------------|-------------------|---------------------|
| **Wardline-Core** | Manifest consumption, schema validation, wardline SARIF output, pattern rule detection for a declared rule subset | 2, 5, 6, 8, 10 (+ 3, 4, 7 conditionally) | Linter plugin (ruff, semgrep, CodeQL), custom AST scanner |
| **Wardline-Type** | Tier metadata in the type system, tier mismatch diagnostics in signatures | 1, 5, 6 (+ 7 conditionally) | Type checker (mypy, pyright, mypy plugin) |
| **Wardline-Governance** | Exception register, fingerprint baseline, control-law reporting, retrospective scan markers | 9, 10 | CI orchestrator, thin wardline runner |
| **Wardline-Full** | The complete conformance surface | All ten criteria | An enforcement regime (§14.4 below), or a monolithic tool that covers everything |

Conditional criteria are elaborated in the profile semantics below.

**Profile semantics:**

- **Wardline-Core** requires criteria 2 and 8, but a Wardline-Core tool MAY implement a *declared subset* of the pattern rules rather than all eight. The tool's documentation MUST declare which rules it implements. Criteria 5 and 6 (precision/recall measurement and golden corpus) apply only to the rules the tool claims — a ruff plugin implementing WL-001 and WL-003 maintains corpus specimens and measures precision for those two rules only. Criterion 3 (WL-007 structural verification and WL-008 validation ordering) and criterion 4 (taint-flow tracking) are included in Wardline-Core when the tool's declared rule set includes WL-007, WL-008, or taint-dependent rules; they are not required for a tool that implements only pattern-matching rules (WL-001 through WL-006). Criterion 7 (self-hosting) applies when the tool's own source code can meaningfully be checked against the rules it implements — a scanner written in the same language it analyses should pass its own rules on its own codebase. Tools whose source is not in the analysed language (e.g., a Rust-based scanner that analyses Python) are exempt.
- **Wardline-Type** requires that the type-system layer (§8.2) makes tier mismatches visible at development time. It requires criterion 1 at the type layer — the type system can express tier metadata — but does not require the full 17-group annotation vocabulary, only the core classification groups (1–4, 16–17) to the extent that the type system can represent them. Criterion 5 applies: precision and recall for type-system enforcement are measured against type-system-specific corpus specimens. Criterion 7 (self-hosting) applies conditionally: a type-system plugin written in the same language it analyses (e.g., a mypy plugin written in Python, a Checker Framework plugin written in Java) should apply its own tier qualifiers to its own source code. Plugins whose source is not in the analysed language are exempt, as with Wardline-Core.
- **Wardline-Governance** covers the governance infrastructure that no analysis tool naturally provides: exception register management, fingerprint baseline tracking, manifest validation and ratification enforcement, control-law state reporting, and the expedited governance ratio metric. A governance tool need not perform any code analysis.
- **Wardline-Full** is not a separate profile — it is the assertion that all ten criteria are satisfied. A single tool MAY claim Wardline-Full. More commonly, Wardline-Full conformance is a property of an enforcement regime (§14.4).

##### 14.3.2 Governance profiles

Enforcement profiles partition what the tools implement. Governance profiles partition what the organisation commits to governing. The conformance criteria in §14.2 describe the full governance surface — but the full surface is calibrated for mature teams with dedicated security governance capacity. A five-person team adopting wardline for the first time faces a governance burden designed for a 50-person team with an established IRAP assessment cycle. The conformance profiles partition enforcement but not governance — and governance is where adoption stalls.

Two governance profiles are defined. A deployment MUST declare which governance profile it operates under. The governance profile is recorded in the root wardline manifest (§13.1.1) and reported in SARIF output as `wardline.governanceProfile` with values `"lite"` or `"assurance"`.

**Wardline Lite.** The small-team and early-adopter governance profile. Wardline Lite provides a viable governance baseline for teams that lack the capacity for the full governance surface but need more than ungoverned enforcement. It requires the essential governance mechanisms and defers the governance mechanisms that depend on organisational maturity.

Wardline Lite requirements:

| Requirement | Status | Notes |
|-------------|--------|-------|
| Root wardline manifest (`wardline.yaml`) | MUST | Tier definitions, ratification authority, review interval — the policy surface exists and is declared |
| SARIF output with wardline property bags | MUST | Enforcement output is structured and assessable |
| CODEOWNERS protection for governance artefacts | MUST | Policy artefact changes require designated reviewer approval |
| Exception tracking | MUST | Exception register with reviewer identity, rationale, and expiry. The register exists and is maintained — exceptions are not granted informally |
| Temporal separation | SHOULD | Separate change, different actor, approved before dependent code merges. Teams that cannot sustain temporal separation MUST document their alternative: same-actor approval is permitted for *enforcement artefact* changes (§9.3.1) with mandatory retrospective review within a defined window (recommended: next sprint boundary or 10 business days, whichever is shorter). However, *policy artefact* changes (tier definitions, delegation policy, bounded-context declarations) MUST require different-actor approval even under the Lite profile — the governance risk of same-actor policy changes is categorically higher, since a poisoned policy artefact corrupts all downstream enforcement (§9.3.2). The documented alternative is recorded in the root manifest and is an assessable governance decision, not a silent omission |
| Bootstrap golden corpus | SHOULD | A minimum of 20–30 specimens covering UNCONDITIONAL cells and Tier 1 taint states (AUDIT_TRAIL, PIPELINE). The bootstrap corpus demonstrates that the enforcement tools detect the highest-consequence violations. The full 126+ specimen requirement (§10) is deferred to the Assurance governance profile |
| Annotation change tracking | MUST | Changes to the annotation surface (annotations added, modified, or removed) are flagged for human review. This MAY be implemented through VCS diff review of annotation-bearing files rather than a full fingerprint baseline — the requirement is visibility of annotation changes, not a specific tracking mechanism |
| Expedited governance ratio | RECOMMENDED | The ratio metric (§9.4) SHOULD be computed and reported. Projects that do not yet compute the ratio MUST instead document their expedited exception approval process and review it at each manifest ratification |

Wardline Lite deferred items — these are not omitted, they are explicitly deferred with a graduation path (§14.3.3):

- **Full golden corpus** (126+ specimens with adversarial cases) — deferred until the team has sufficient enforcement experience to curate meaningful adversarial specimens
- **Full fingerprint baseline** (structured data store with canonical hashing per §9.2) — deferred in favour of annotation change tracking through simpler mechanisms. The full baseline is required at Assurance level
- **Expedited ratio threshold enforcement** — the metric is recommended at Lite level; the automated threshold and governance-level finding are required at Assurance level

Wardline Lite is not "Wardline minus the unpleasant bits." It includes a governance checklist (below) that makes the governance posture assessable even without the full artefact set. An assessor evaluating a Lite deployment verifies the checklist, not a reduced version of the Assurance procedure.

> **Policy-layer perspective.** Manifest governance can also be expressed as outcome-stated controls sitting above this specification — semantic policy change authority, adequacy review, exception governance, and tool assurance. Those controls address the same governance surface from the policy framework's perspective: where this section specifies *how* the governance mechanisms work, the policy-layer controls specify *what outcomes* the organisation must demonstrate to an assessor.

**Wardline Lite governance checklist.** An assessor evaluating a Lite deployment verifies the following:

1. Root manifest exists, is schema-valid, and has a current ratification (ratification age < review interval)
2. CODEOWNERS (or equivalent) protects `wardline.yaml`, overlay files, and the exception register
3. Exception register entries have reviewer identity, documented rationale, and expiry date
4. Temporal separation is either implemented or a documented alternative is recorded in the manifest
5. Annotation changes in the most recent assessment window were reviewed (evidence: PR review history, commit review records, or equivalent)
6. If a bootstrap corpus exists: enforcement tools detect the specimens correctly
7. If expedited exceptions were granted: the process is documented and retrospective review occurred

**Wardline Assurance.** The full governance profile as described in §9. Wardline Assurance requires all governance mechanisms defined in §9.2 without relaxation: full temporal separation (MUST, no documented alternatives), full golden corpus (126+ specimens with adversarial cases per §10), full fingerprint baseline with canonical hashing and structured change detection, expedited governance ratio computation with declared threshold and automated governance-level findings when exceeded, and SIEM export of governance events (SHOULD; MUST for ISM-assessed systems). Wardline Assurance is the governance profile expected for systems undergoing IRAP assessment, systems processing data at PROTECTED or above, or any deployment where the organisation's risk appetite requires the full governance surface.

Wardline Assurance requirements add to or strengthen the Lite requirements:

| Requirement | Status at Assurance | Change from Lite |
|-------------|--------------------|------------------|
| Temporal separation | MUST | No documented alternatives — separate change, different actor |
| Golden corpus | MUST — full 126+ specimens | Expanded from bootstrap corpus of 20–30 specimens |
| Fingerprint baseline | MUST — full structured baseline per §9.2 | Replaces annotation change tracking |
| Expedited governance ratio | MUST — computed, threshold declared, automated finding | Strengthened from RECOMMENDED |
| SIEM export of governance events | SHOULD (MUST for ISM-assessed systems) | New requirement |

A deployment declares its governance profile in the root manifest. Assessors evaluate against the declared profile — a Lite deployment is not penalised for lacking Assurance-level artefacts, but it is penalised for lacking Lite-level artefacts. The governance profile is distinct from the enforcement profile: a Wardline-Full enforcement regime operating at the Lite governance level is a valid deployment (full tool coverage, graduated governance). Conversely, a Wardline-Core enforcement regime at the Assurance governance level is also valid (partial tool coverage, full governance) — though unusual, this might apply where a single scanner covers the required rules and the organisation's accreditation demands full governance.

##### 14.3.3 Governance profile graduation

Graduation from Lite to Assurance is tied to team maturity and accreditation requirements. It is not a calendar milestone — it occurs when the organisation's governance capacity and risk context warrant the full governance surface.

**Graduation triggers.** A deployment SHOULD graduate from Lite to Assurance when any of the following apply:

- The system is submitted for IRAP assessment or equivalent accreditation
- The system processes data at PROTECTED classification or above
- The team size exceeds 15 active contributors (governance capacity is no longer the limiting factor)
- The deployment has operated at Lite level for more than two manifest ratification cycles (the team has sufficient enforcement experience)
- The organisation's risk appetite requires the full governance surface (a policy decision, not a technical one)

**Graduation checklist.** Before changing the governance profile declaration from Lite to Assurance, the following MUST be satisfied:

1. **Golden corpus expansion.** The bootstrap corpus has been expanded to the full 126+ specimen requirement (§10), including at least one adversarial false positive and one adversarial false negative per rule.
2. **Fingerprint baseline established.** The full structured fingerprint baseline (§9.2) is in place with canonical hashing, and at least one baseline review cycle has been completed.
3. **Temporal separation operational.** Temporal separation is implemented without documented alternatives — all governance artefact changes are reviewed by a different actor before dependent code merges.
4. **Expedited ratio threshold declared.** The root manifest declares an expedited governance ratio threshold, and the enforcement tool computes and reports the ratio.
5. **Retrospective review.** All Lite-era exceptions have been reviewed under Assurance-level governance: reviewer identity confirmed, rationale validated against current context, expiry dates current.

The graduation is recorded as a manifest change — the `governance_profile` field changes from `"lite"` to `"assurance"` — and is itself a policy artefact change subject to ratification. The first Assurance-level enforcement run establishes the fingerprint baseline as the new governance reference point.

#### 14.4 Enforcement regimes

An **enforcement regime** is the set of tools that collectively enforce a wardline for a given language ecosystem. The regime is Wardline-Full conformant if and only if the union of its constituent tools' profiles covers all ten criteria with no gaps.

**Regime composition rules:**

- **Coverage completeness.** Every criterion must be satisfied by at least one tool in the regime. A regime comprising a Wardline-Core tool (criteria 2, 5, 6, 8, 10) and a Wardline-Governance tool (criteria 9, 10) is missing criteria 1 (full annotation expressiveness), 3 (WL-007), and 4 (taint-flow). Criterion 7 (self-hosting) applies to the Wardline-Core tool conditionally on its implementation language. Adding a Wardline-Type tool and ensuring the Wardline-Core tool covers WL-007 and taint-flow closes the gap.
- **Rule coverage completeness.** The union of all Wardline-Core tools in the regime must cover all eight rules — six pattern rules (WL-001 through WL-006) and two structural verification rules (WL-007 and WL-008). If tool A implements WL-001 through WL-004 and tool B implements WL-005, WL-006, WL-007, and WL-008, the regime's rule coverage is complete. Gaps in rule coverage must be documented.
- **Corpus union.** Each tool maintains corpus specimens for the rules it implements. The regime's corpus is the union of all constituent tools' corpora. Regime-level corpus coverage must satisfy the minimum specimen counts defined in §10 across the full rule set.
- **SARIF aggregation.** Each tool produces its own SARIF run. The regime's combined output is a multi-run SARIF log (§10.1). A regime orchestrator — which may be a Wardline-Governance tool — aggregates runs and computes regime-level metrics (coverage ratio, expedited ratio, control-law state).
- **Self-hosting.** Criterion 7 (self-hosting gate) applies per tool: each enforcement tool in the regime must pass the wardline rules that it itself implements, applied to its own source code. A type checker plugin that enforces tier mismatches must pass tier-mismatch checks on its own source. A linter plugin that detects WL-001 must not violate WL-001 in its own code. Tools that perform no code analysis (e.g., a pure governance orchestrator) are exempt from self-hosting.

**Regime documentation.** A regime MUST be documented: which tools, which profiles, which rules each tool covers, and which criteria remain unmet (if any). This documentation is the artefact an assessor evaluates. The assessor does not need to understand each tool's internals — they need the regime composition table and the combined corpus. The regime composition is documented in the language binding reference — for example, Part II-A §A.6 provides the regime composition matrix for the Python ecosystem, and Part II-B §B.6 for Java. Assessors evaluating a regime consult the binding reference for the composition table and the combined corpus.

#### 14.5 Supplementary group enforcement scope

Criterion 1 requires that the ecosystem can *express* all 17 annotation groups. Criteria 2–8 require *enforcement* only for the eight rules — six pattern rules (WL-001–WL-006) and two structural verification rules (WL-007–WL-008) — plus taint-flow tracking — all of which operate on core classification annotations (Groups 1–4, 16–17). The framework does not mandate standardised enforcement semantics for supplementary contract annotations (Groups 5–15). Tools define their own enforcement rules for supplementary groups, with their own severity and exceptionability (§9.3), declared in the overlay's supplementary section (§13.1.2). This means a regime can be Wardline-Full conformant while providing rich enforcement for some supplementary groups and minimal enforcement for others. An assessor evaluating a regime SHOULD document which supplementary groups have enforcement rules and which are expressiveness-only — the overlay supplementary section provides the structured location for this documentation, so that adopters understand the regime's actual coverage versus the full annotation vocabulary.

#### 14.6 Assessment procedure

This subsection defines a repeatable verification procedure for assessors evaluating a wardline deployment. The procedure is tool-agnostic — it applies to any conformant regime regardless of language binding.

**Step 1: Regime documentation review.**
- Obtain the regime composition document (Part II-A §A.6 for Python, Part II-B §B.6 for Java)
- Verify that the documented tools collectively cover all 10 conformance criteria
- Identify any documented gaps and their compensating controls

**Step 2: Manifest validation.**
- Run `wardline manifest validate` against the project's `wardline.yaml` and all overlays
- Verify exit code 0 (schema-valid)
- Review manifest content: tier definitions, boundary declarations, delegation policy, ratification date and review interval
- Check that ratification is not overdue (ratification age < review interval)

**Step 2.5: Manifest coherence verification.**
- Run manifest coherence checks (§9.2) against the project's manifest, overlays, and code-level annotations
- Verify that no orphaned annotations exist (code annotations without manifest declarations)
- Verify that no undeclared boundaries exist (manifest boundary declarations without corresponding code annotations)
- Verify that tier assignments are consistent with declared data-flow topology
- Verify that contract declarations match code-level annotations at the declared locations

*For deployments at the Assurance governance level (§14.3.2):* manifest coherence is a MUST gate. All five coherence conditions MUST pass before code-level enforcement findings (Steps 3–4) are considered valid. Coherence failures that are excepted through the standard governance path (STANDARD exceptionability) MUST have documented rationale explaining why the incoherence is acceptable.

*For deployments at the Lite governance level (§14.3.2):* manifest coherence checking is RECOMMENDED. Lite deployments that run coherence checks benefit from early detection of annotation surface drift. Lite deployments that do not yet run coherence checks SHOULD document their approach to maintaining manifest–code alignment (e.g., periodic manual review of annotation coverage against manifest declarations).

**Step 3: Golden corpus verification.**
- Obtain the corpus artefact and verify integrity (specimen hashes against manifest)
- Run `wardline corpus verify` with each tool in the regime against its specimen subset
- Record pass/fail per specimen, per tool
- Compute corpus precision and recall per rule. Verify precision ≥ 80% floor and recall ≥ 70% floor (§10 properties 3–4)
- Check adversarial specimen coverage: ≥1 adversarial false positive and ≥1 adversarial false negative per rule

**Step 4: Enforcement execution.**
- Run the full regime against the project codebase
- Verify SARIF output contains required wardline property bags (§10.1)
- Verify `wardline.controlLaw` reports "normal" for the declared adoption phase
- Verify `wardline.deterministic: true`
- Run the tool twice on the same codebase and verify byte-identical SARIF in verification mode (property 5)

**Step 5: Governance artefact review.**
- Inspect the exception register: verify entries have reviewer identity, rationale, expiry, and provenance
- Check the expedited exception ratio (`wardline.expeditedExceptionRatio` in SARIF) against the project's declared threshold
- Inspect the fingerprint baseline: verify VCS tracking, CODEOWNERS protection, and that baseline age is within the review interval
- Check for direct-law or alternate-law SARIF runs in recent history; verify retrospective scans were performed for any degraded windows

**Step 6: Self-hosting verification.**
- For each tool in the regime that analyses code in its own implementation language: verify that the tool's own source passes the rules it implements
- Tools exempt from self-hosting (different implementation language, governance-only tools): document the exemption

**Pass/fail criteria:**
| Criterion | Pass | Fail |
|---|---|---|
| Regime covers all 10 criteria | All criteria mapped to a tool | Any criterion unmapped without documented compensating control |
| Manifest schema-valid | Exit code 0 | Schema validation error |
| Manifest coherence (Assurance) | No orphaned annotations, undeclared boundaries, tier–topology contradictions, unmatched contracts, or stale contract bindings | Any coherence failure without documented exception |
| Corpus precision per rule | ≥ 80% (or project-declared threshold) | Below threshold |
| Corpus recall per rule | ≥ 70% (or project-declared threshold) | Below threshold |
| SARIF property bags present | All required properties on results and runs | Missing properties |
| Control law normal | Normal for declared phase | Alternate or direct without governance acknowledgement |
| Deterministic output | Byte-identical SARIF on repeated runs (verification mode) | Non-deterministic output |
| Exception register well-formed | All entries have reviewer, rationale, expiry | Missing required fields |
| Self-hosting passes | Tool passes own rules | Tool violates own rules |

A deployment that fails any criterion is not conformant at the corresponding profile level. The assessor documents which criteria pass, which fail, and the overall conformance determination (Wardline-Full, partial, or non-conformant).

#### 14.6.1 Worked example: conformant Phase 3 deployment (Java)

This example shows the governance artefacts and CI configuration for a synthetic government Java project ("partner-landscape") at Phase 3 (Wardline-Core) conformance. It is not a real project — it demonstrates the minimum artefact set an assessor should expect.

**Project structure:**

```
partner-landscape/
├── wardline.yaml                    # Root manifest
├── wardline.fingerprint.json        # Annotation fingerprint baseline
├── wardline.exceptions.json         # Exception register
├── wardline.toml                    # Scanner configuration
├── CODEOWNERS                       # Protected-file reviewers
├── .github/workflows/ci.yml         # CI pipeline
├── adapters/
│   ├── wardline.overlay.yaml        # Module overlay — shape validation boundaries
│   └── src/main/java/...
├── domain/
│   ├── wardline.overlay.yaml        # Module overlay — semantic validation
│   └── src/main/java/...
├── audit/
│   ├── wardline.overlay.yaml        # Module overlay — T1 construction + restoration
│   └── src/main/java/...
└── corpus/                          # Golden corpus
    ├── WL-001/AUDIT_TRAIL/...
    ├── WL-001/EXTERNAL_RAW/...
    └── ...
```

**Root manifest (`wardline.yaml`):**

```yaml
wardline:
  version: "0.2.0"

  ratification:
    authority: "Jane Smith, Chief Information Security Officer"
    date: "2026-02-01"
    review_interval_days: 180

  tier_definitions:
    - name: "partner-api"
      tier: 4
      description: "External partner data from Partner Gateway API"
    - name: "internal-database"
      tier: 1
      description: "Authoritative audit records in PostgreSQL"

  rule_configuration:
    # No overrides — framework defaults apply
    expedited_ratio_threshold: 0.10

  delegation:
    default_authority: RELAXED
    grants:
      - path: "audit/"
        authority: NONE  # All audit exceptions require root-level approval

  module_tier_mappings:
    - module: "adapters"
      default_taint: EXTERNAL_RAW
    - module: "domain"
      default_taint: PIPELINE
    - module: "audit"
      default_taint: AUDIT_TRAIL
```

**CI pipeline (relevant steps from `.github/workflows/ci.yml`):**

```yaml
- name: Compile with Error Prone advisory
  run: mvn compile  # Error Prone fires during javac (Phase 2 advisory)

- name: Wardline scanner (Phase 3 authoritative)
  run: |
    wardline-scanner \
      --config wardline.toml \
      --manifest wardline.yaml \
      --output sarif/wardline-scanner.sarif

- name: Wardline governance
  run: |
    wardline manifest validate
    wardline regime status --phase 3
    wardline regime verify

- name: Gate on findings
  run: |
    # Exit code 0 = no ERROR findings; 1 = ERROR findings; 2 = config error
    wardline-scanner --check sarif/wardline-scanner.sarif
```

**CODEOWNERS (governance artefact protection):**

```
wardline.yaml               @security-team
wardline.exceptions.json     @security-team
wardline.fingerprint.json    @security-team
*/wardline.overlay.yaml      @security-team @domain-leads
corpus/                      @security-team
```

**Exception register excerpt (`wardline.exceptions.json`):**

```json
[
  {
    "id": "EXC-2026-0003",
    "rule": "WL-001",
    "taint_state": "EXTERNAL_RAW",
    "location": {
      "file": "adapters/src/main/java/com/myorg/adapters/LegacyAdapter.java",
      "function": "parseLegacyRecord",
      "line": 47
    },
    "exceptionability": "STANDARD",
    "severity_at_grant": "ERROR",
    "rationale": "Legacy partner API v1 omits 'status' field on inactive partners. Default 'INACTIVE' approved by data owner (JIRA-4521).",
    "reviewer": {
      "identity": "jane.smith@myorg.gov.au",
      "role": "CISO",
      "date": "2026-02-15"
    },
    "expires": "2026-08-15",
    "provenance": {
      "governance_path": "standard",
      "agent_originated": false
    },
    "elimination_path": "Migrate to Partner API v2 which includes 'status' on all records",
    "elimination_cost": "1 sprint — requires partner team coordination"
  }
]
```

**What the assessor verifies against this deployment** (mapped to §14.6 steps):

1. `wardline manifest validate` → exit code 0 ✓
2. Ratification date (2026-02-01) within review interval (180 days) ✓
3. Scanner runs in CI and gates on exit code ✓
4. `wardline regime status --phase 3` → "normal" ✓
5. SARIF output contains wardline property bags (§10.1) ✓
6. Exception register entries have reviewer, rationale, expiry ✓
7. CODEOWNERS protects all governance artefacts ✓
8. Golden corpus present with specimens covering non-SUPPRESS cells ✓

This is a Phase 3 deployment at the Assurance governance level — the Checker Framework is not present, and `wardline regime status --phase 3` correctly reports "normal" because Phase 3 does not expect it (Part II-B §B.10; this worked example uses the Java binding — Python equivalent: Part II-A §A.10).

**Phase-to-profile mapping.** Language bindings define numbered adoption phases that map to the framework's conformance profiles. The phase numbers differ between bindings because each language's tooling ecosystem has different entry points and capabilities. The mapping is:

| Adoption Phase | Python Binding (Part II-A §A.9) | Java Binding (Part II-B §B.9) | Conformance Profile |
|---|---|---|---|
| **1** | Decorators + advisory ruff rules | Annotations only | None (documentation value only) |
| **2** | Manifest + reference scanner | Advisory Error Prone checks | Python: Wardline-Core / Java: None (advisory) |
| **3** | Type-system enforcement (mypy) | Authoritative scanner in CI | Python: Wardline-Type / Java: Wardline-Core |
| **4** | Runtime structural enforcement | Type-system enforcement (Checker Framework) | Python: (structural complement) / Java: Wardline-Type |
| **5** | Full regime governance | *(not applicable)* | Wardline-Governance |

Python has five phases because its tooling ecosystem layers differently — the reference scanner (Phase 2) precedes type-system integration (Phase 3), and governance tooling is a distinct Phase 5. Java has four phases because the advisory Error Prone path (Phase 2) is integrated into compilation, and governance tooling ships alongside the authoritative scanner at Phase 3. Both bindings reach Wardline-Full conformance through a regime (§14.4) that combines all constituent tools, not through any single phase.

#### 14.6.2 Worked example: Lite governance deployment

This example shows a five-person team ("health-notifications") adopting wardline at the Lite governance level. The team builds a Python service that processes health notification records from an external API and stores summaries in an internal database. They have no dedicated security team — governance is handled by the tech lead and one senior developer.

**Project structure:**

```
health-notifications/
├── wardline.yaml                    # Root manifest (Lite governance)
├── wardline.exceptions.json         # Exception register
├── wardline.toml                    # Scanner configuration
├── CODEOWNERS                       # Protected-file reviewers
├── .github/workflows/ci.yml         # CI pipeline
├── ingest/
│   ├── wardline.overlay.yaml        # Module overlay — external API boundary
│   └── src/...
├── store/
│   ├── wardline.overlay.yaml        # Module overlay — internal DB writes
│   └── src/...
└── corpus/                          # Bootstrap corpus (24 specimens)
    ├── WL-001/AUDIT_TRAIL/...
    ├── WL-001/EXTERNAL_RAW/...
    ├── WL-003/AUDIT_TRAIL/...
    └── ...
```

**Root manifest (`wardline.yaml`):**

```yaml
wardline:
  version: "0.2.0"

  governance_profile: "lite"

  ratification:
    authority: "Alex Chen, Tech Lead"
    date: "2026-03-01"
    review_interval_days: 90

  tier_definitions:
    - name: "health-api"
      tier: 4
      description: "External health notification records from partner API"
    - name: "notification-db"
      tier: 1
      description: "Authoritative notification summaries in PostgreSQL"

  rule_configuration:
    # Framework defaults apply

  temporal_separation:
    alternative: "same-actor-with-retrospective"
    retrospective_window_days: 10
    rationale: >
      Team of five — only two members have governance authority.
      Same-actor approval permitted with mandatory retrospective review
      within 10 business days. Retrospective reviews are tracked as
      PR comments on the original governance change.

  delegation:
    default_authority: RELAXED
    grants:
      - path: "store/"
        authority: NONE  # Tier 1 writes — all exceptions require tech lead approval
```

**CODEOWNERS:**

```
wardline.yaml               @alex-chen @sam-kumar
wardline.exceptions.json     @alex-chen @sam-kumar
*/wardline.overlay.yaml      @alex-chen @sam-kumar
```

**Bootstrap corpus (`corpus/`):**

The team maintains 24 specimens covering UNCONDITIONAL cells and Tier 1 taint states:

| Rule | Taint states covered | Specimen count |
|------|---------------------|----------------|
| WL-001 | AUDIT_TRAIL, EXTERNAL_RAW, PIPELINE | 6 (2 per state: 1 true positive, 1 true negative) |
| WL-002 | AUDIT_TRAIL, EXTERNAL_RAW | 4 |
| WL-003 | AUDIT_TRAIL, PIPELINE | 4 |
| WL-004 | AUDIT_TRAIL, EXTERNAL_RAW | 4 |
| WL-005 | AUDIT_TRAIL | 2 |
| WL-006 | AUDIT_TRAIL, EXTERNAL_RAW | 4 |

The bootstrap corpus focuses on the cells where findings are UNCONDITIONAL or ERROR at Tier 1. Full coverage of all 126+ cells is deferred to governance graduation.

**CI pipeline (relevant steps):**

```yaml
- name: Wardline scanner
  run: |
    wardline-scanner \
      --config wardline.toml \
      --manifest wardline.yaml \
      --output sarif/wardline-scanner.sarif

- name: Wardline manifest validation
  run: wardline manifest validate

- name: Gate on findings
  run: wardline-scanner --check sarif/wardline-scanner.sarif
```

**What the assessor verifies against this deployment** (Lite governance checklist — §14.3.2):

1. `wardline manifest validate` → exit code 0 ✓
2. Ratification date (2026-03-01) within review interval (90 days) ✓
3. CODEOWNERS protects `wardline.yaml`, overlays, and exception register ✓
4. Exception register entries have reviewer identity, rationale, and expiry ✓
5. Temporal separation alternative is documented in the manifest (`same-actor-with-retrospective`, 10-day window) ✓
6. PR review history shows annotation changes were reviewed in the assessment window ✓
7. Bootstrap corpus present: 24 specimens covering UNCONDITIONAL/Tier 1 cells; scanner detects all specimens correctly ✓

**What the assessor does not verify at Lite level** (deferred to Assurance graduation):

- Full 126+ specimen golden corpus with adversarial cases
- Structured fingerprint baseline with canonical hashing
- Expedited governance ratio threshold and automated findings
- SIEM export of governance events

**Graduation notes.** This team would graduate to Assurance when they submit for IRAP assessment, or when the service begins processing PROTECTED data. The 90-day ratification cycle means they would have completed at least two review cycles within 180 days — sufficient enforcement experience to expand the corpus and establish the full fingerprint baseline.

#### 14.6.3 Navigating to Part II

Part I defines the framework; Part II translates it to language-specific enforcement. The Python binding (Part II-A) and Java binding (Part II-B) show how the tiers, patterns, and governance model are expressed in each language. They do not modify the framework — where a binding statement conflicts with Part I, Part I governs. Start with Part II-A if you are implementing or evaluating a Python regime; start with Part II-B for Java. Both bindings follow the same structure: design history, language evaluation, normative interface contract, non-normative annotation vocabulary and worked examples, regime composition matrix, and residual risks.

#### 14.7 Partial conformance

Tool quality targets (MAY) are not conformance criteria — they represent maturity targets that improve enforcement quality.

A tool that satisfies some but not all criteria for a profile is a partial implementation of that profile. A regime that covers some but not all ten criteria is a partial regime. In both cases, the assessor documents which criteria are met, which are unmet, and what compensating controls (if any) address the gaps. Partial conformance is expected during adoption — few ecosystems will achieve Wardline-Full on day one. The profiles exist precisely to make partial conformance legible: a project that deploys a Wardline-Core linter plugin and a Wardline-Governance orchestrator has assessable, documented coverage even without type-system enforcement.

The conformance profiles also serve an adoption function beyond assessment. By defining implementable slices that match existing tool categories, they answer the question that deters community participation: "how much of this do I have to build?" A mypy plugin author can target Wardline-Type without understanding exception registers. A ruff rule author can target Wardline-Core without understanding taint analysis. A CI platform can target Wardline-Governance without understanding AST pattern matching. The profiles make wardline something tools can implement, not something they must become.

