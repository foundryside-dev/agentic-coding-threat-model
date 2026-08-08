---
title: "Verification and Conformance"
weight: 7
---

This page consolidates the verification properties (§10) and conformance model (§14) from the wardline framework specification.

## Six verification properties

These properties determine whether a wardline enforcement tool — or enforcement regime — is assessable by an independent evaluator (IRAP or equivalent). In a multi-tool regime, each property applies per tool for the rules and layers that tool implements; the regime satisfies the property when its constituent tools collectively cover the full rule set.

### 1. Golden corpus

A curated set of known-good and known-bad specimens that the tool MUST correctly classify. Minimum smoke test: 3 true positives and 2 true negatives per rule. For meaningful measurement: approximately 30+ per class per rule.

Minimum corpus coverage: one positive and one negative specimen per cell in the severity matrix (rule x taint state). The eight rules across eight taint states yield an effective minimum of 126 specimens (reduced from 128 because SUPPRESS cells require only negative specimens).

**Specimen structure.** Each corpus specimen is a self-contained, labelled test case in YAML format declaring: unique identifier, rule, taint state context, expected severity and exceptionability, verdict (positive or negative), code fragment with wardline annotations, and expected match (line and text).

```yaml
# corpus/WL-001/AUDIT_TRAIL/wl001-audit-get-default.yaml
id: "WL-001-AT-001"
rule: "WL-001"
taint_state: "AUDIT_TRAIL"
expected_severity: "ERROR"
expected_exceptionability: "UNCONDITIONAL"
verdict: "positive"
category: "standard"
description: >
  A .get() call with a default value inside a @tier1_read function.
fragment: |
  from wardline import tier1_read

  @tier1_read
  def get_audit_record(run_id: str) -> dict:
      record = db.fetch(run_id)
      classification = record.get("security_classification", "OFFICIAL")
      return {"run_id": run_id, "classification": classification}
expected_match:
  line: 6
  text: 'record.get("security_classification", "OFFICIAL")'
  function: "get_audit_record"
```

**Adversarial specimens** are required in addition to the minimum:

| Category | Description | Minimum Count |
|----------|-------------|---------------|
| `adversarial_false_positive` | Code that *looks like* a violation but is structurally clean | 1 per rule (8 minimum) |
| `adversarial_false_negative` | Code that *looks clean* but contains a violation | 1 per rule (8 minimum) |
| `taint_flow` | Specimens testing taint propagation correctness across boundaries | See property 6 |

**Corpus independence.** The corpus MUST satisfy: separate publication (versioned artefact independent of the tool), version binding (declares specification version), independent review (reviewed by someone who is not a tool contributor), integrity verification (SHA-256 hashes), and reproducible evaluation (`wardline corpus verify` command).

### 2. Self-hosting gate

Each enforcement tool's own source must pass the rules that tool implements. A linter plugin that detects [WL-001]({{< relref "rules/wl-001" >}}) must not violate WL-001 in its own source. Tools that perform no code analysis (e.g., a pure governance orchestrator) are exempt.

### 3. Measured precision

The false positive rate MUST be measured, tracked, and published per cell (rule x taint state), not merely per rule. Recommended floor: 80% precision per cell. For MIXED_RAW cells: 65% floor permitted. For ISM-assessed systems: 90% for UNCONDITIONAL cells.

**Interaction with UNCONDITIONAL exceptionability.** If an UNCONDITIONAL cell measures below its precision floor, the rule implementation returns to development — the corpus is not adjusted to make the numbers work.

**Precision segmentation by code origin.** Bindings SHOULD track operational precision segmented by code origin (agent-generated vs. human-written code).

### 4. Measured recall

The false negative rate MUST be measured against the golden corpus and published. Recommended floor: 70% recall. A rule that misses more than 30% of known-bad specimens should not ship.

### 5. Deterministic output

Identical input must produce byte-identical output. No randomness, no model inference, no non-deterministic ordering. Determinism is an auditability requirement, not a convenience.

### 6. Taint propagation correctness

The taint propagation engine must correctly assign taint states at merge points and across function boundaries. Minimum taint-flow specimen requirements:

| Scenario | Description | Minimum |
|----------|-------------|---------|
| Direct boundary-to-boundary | Tier 4 return reaching Tier 1 sink without validation | 1 positive |
| Direct boundary-to-boundary (clean) | Tier 4 return reaching Tier 1 sink *with* validation | 1 negative |
| Two-hop indirection | Tier 4 data through undecorated helpers to Tier 1 sink | 1 positive |
| Shape-only reaching T2 sink | Tier 3 data reaching Tier 2 sink without semantic validation | 1 positive |
| Container contamination | Cross-tier container merge reaching a consumer at a different tier | 1 positive |
| Join semantics | Merge of two different-tier values produces MIXED_RAW | 1 positive |
| Declared-domain-default interaction | Correctly declared domain-default marker does not fire WL-001 | 1 negative |
| Declared-domain-default without overlay | Domain-default marker with no overlay declaration fires WL-001 | 1 positive |

## Findings interchange format

Enforcement tools MUST produce findings in SARIF v2.1.0. Wardline-specific metadata is carried in SARIF property bags.

**Normative SARIF example:**

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "wardline-scanner",
        "version": "0.1.0",
        "rules": [{
          "id": "WL-001",
          "shortDescription": { "text": "Member access with fallback default" },
          "defaultConfiguration": { "level": "error" }
        }]
      }
    },
    "results": [{
      "ruleId": "WL-001",
      "level": "error",
      "message": {
        "text": "Fabricated default on tier-sensitive path: .get(\"security_classification\", \"OFFICIAL\")"
      },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "src/adapters/partner_adapter.py" },
          "region": {
            "startLine": 42,
            "snippet": { "text": "record.get(\"security_classification\", \"OFFICIAL\")" }
          }
        },
        "logicalLocations": [{
          "fullyQualifiedName": "adapters.partner_adapter.parse_partner_record",
          "kind": "function"
        }]
      }],
      "properties": {
        "wardline.taintState": "AUDIT_TRAIL",
        "wardline.enclosingTier": 1,
        "wardline.annotationGroups": [1, 5],
        "wardline.exceptionability": "UNCONDITIONAL",
        "wardline.excepted": false,
        "wardline.dataSource": "partner-api",
        "wardline.retroactiveScan": false
      }
    }],
    "properties": {
      "wardline.manifestHash": "sha256:a1b2c3d4e5f6...",
      "wardline.overlayHashes": ["sha256:f6e5d4c3b2a1..."],
      "wardline.expeditedExceptionRatio": 0.05,
      "wardline.coverageRatio": 0.73,
      "wardline.controlLaw": "normal",
      "wardline.deterministic": true,
      "wardline.inputHash": "sha256:7a8b9c0d1e2f...",
      "wardline.governanceProfile": "assurance"
    }
  }]
}
```

**Required result-level properties:**

- `wardline.rule` — binding rule ID (e.g., `PY-WL-001`, `JV-WL-001`)
- `wardline.taintState` — canonical taint state token
- `wardline.enclosingTier` — authority tier (1, 2, 3, 4)
- `wardline.severity` — `ERROR`, `WARNING`, or `SUPPRESS`
- `wardline.exceptionability` — UNCONDITIONAL, STANDARD, RELAXED, or TRANSPARENT
- `wardline.analysisLevel` — analysis level (1 = AST, 2 = variable-level taint, 3 = transitive call-graph)
- `wardline.annotationGroups` — which of the 17 groups are active on the enclosing function
- `wardline.excepted` — boolean; excepted findings are still emitted (visible, not suppressed)
- `wardline.retroactiveScan` — boolean; finding arose from retrospective review of a degraded window
- `wardline.exceptionRecurrence` *(SHOULD)* — recurrence count for renewed exceptions
- `wardline.tierLabel` *(SHOULD)* — human-readable label for the taint state

**Required run-level properties:**

- `wardline.manifestHash` — cryptographic hash of the root manifest
- `wardline.overlayHashes` — hashes of all overlay manifests consumed
- `wardline.expeditedExceptionRatio` — proportion of active exceptions granted through expedited path
- `wardline.coverageRatio` — annotation coverage from the fingerprint baseline
- `wardline.controlLaw` — `"normal"`, `"alternate"`, or `"direct"`
- `wardline.controlLawDegradations` — when alternate, lists specific degradation conditions
- `wardline.retroactiveScan` — boolean; run includes retrospective findings
- `wardline.deterministic` — boolean self-report
- `wardline.governanceProfile` — `"lite"` or `"assurance"`
- `wardline.inputHash` — hash of analysed source for determinism verification

**Annotation change impact preview.** Enforcement tooling SHOULD support a cascade view through optional `relatedLocations` on each result and a run-level `wardline.impactPreview` property showing new findings, resolved findings, severity changes, and affected modules.

**Multi-tool SARIF aggregation.** In an enforcement regime, each tool produces its own SARIF `run`. A regime orchestrator aggregates runs and carries regime-level metrics on a dedicated aggregation run.

### Finding presentation guidance

Bindings SHOULD present findings in three layers, progressively disclosing detail:

**Primary line** (always visible): consequence and offending code — no taint state token, no tier number.

```
error[WL-001]: Fabricated default masks missing field
  --> src/adapters/partner.py:42:5
   |
42 |     classification = record.get("security_classification", "OFFICIAL")
   |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

**Context line** (on expand): tier context, plain-language explanation, annotation provenance.

```
   note: taint context established here
  --> src/adapters/partner.py:38:1
   |
38 | @tier1_read
   | ^^^^^^^^^^^ this annotation declares audit-trail context
   |
   = help: in audit-trail data, member absence is an integrity failure
   = note: this finding is UNCONDITIONAL and cannot be excepted
   = see: wardline explain WL-001 AUDIT_TRAIL
```

**Properties bag** (SARIF): full metadata for assessors and automation.

For developer-facing output, bindings SHOULD collapse the eight effective states into three groups:

| Presentation group | Effective states | Label |
|---|---|---|
| **Trusted** | AUDIT_TRAIL, PIPELINE | "trusted data" |
| **Validated** | SHAPE_VALIDATED, UNKNOWN_SHAPE_VALIDATED, UNKNOWN_SEM_VALIDATED | "validated data" |
| **Untrusted** | EXTERNAL_RAW, UNKNOWN_RAW, MIXED_RAW | "untrusted data" |

Bindings SHOULD implement a `wardline explain` subcommand and a "disagree" workflow for UNCONDITIONAL findings (a feedback channel, not an exception mechanism).

## Conformance model

### Ten conformance criteria

**Expressiveness:**

1. The ecosystem can express all 17 annotation groups at function, class, or field level.

**Enforcement capability:**

2. Pattern rule detection: [WL-001]({{< relref "rules/wl-001" >}}) through [WL-006]({{< relref "rules/wl-006" >}}) detected intraprocedurally.
3. Structural verification: [WL-007]({{< relref "rules/wl-007" >}}) and [WL-008]({{< relref "rules/wl-008" >}}) enforced.
4. Taint-flow tracking: explicit-flow taint between declared boundaries.
5. Precision and recall measured, tracked, and published per rule.
6. A golden corpus of labelled specimens exists and is maintained.
7. Each enforcement tool passes its own rules (self-hosting gate).
8. Deterministic SARIF v2.1.0 output with wardline property bags.

**Governance infrastructure:**

9. Protected-file review, temporal separation, and annotation fingerprint baseline.
10. Wardline manifest consumed and validated against JSON Schemas.

### Enforcement profiles

| Profile | What it covers | Criteria | Typical implementer |
|---------|---------------|----------|---------------------|
| **Wardline-Core** | Manifest consumption, pattern rule detection, SARIF output | 2, 5, 6, 8, 10 (+ 3, 4, 7 conditionally) | Linter plugin (ruff, semgrep, CodeQL), custom scanner |
| **Wardline-Type** | Tier metadata in the type system, tier mismatch diagnostics | 1, 5, 6 (+ 7 conditionally) | Type checker (mypy, pyright, Checker Framework) |
| **Wardline-Governance** | Exception register, fingerprint baseline, control-law reporting | 9, 10 | CI orchestrator, thin wardline runner |
| **Wardline-Full** | The complete conformance surface | All ten | An enforcement regime, or a monolithic tool |

**Wardline-Core** requires criteria 2 and 8, but may implement a *declared subset* of the pattern rules. Criteria 3 and 4 are included when the tool's rule set includes WL-007, WL-008, or taint-dependent rules. Criterion 7 (self-hosting) applies when the tool's source can meaningfully be checked against its own rules.

**Wardline-Type** requires criterion 1 at the type layer — the type system can express tier metadata — but does not require the full 17-group vocabulary, only core classification groups (1-4, 16-17).

**Wardline-Governance** covers governance infrastructure that no analysis tool naturally provides: exception register management, fingerprint baseline tracking, manifest validation, control-law state reporting, and expedited governance ratio.

### Governance profiles

| Profile | Description | Key requirements |
|---------|-------------|-----------------|
| **Wardline Lite** | Small-team and early-adopter governance | Root manifest, SARIF output, CODEOWNERS, exception tracking, annotation change tracking |
| **Wardline Assurance** | Full governance for IRAP-assessed systems | All Lite requirements plus full temporal separation, 126+ specimen corpus, full fingerprint baseline, expedited ratio enforcement, SIEM export |

**Wardline Lite requirements:**

| Requirement | Status | Notes |
|-------------|--------|-------|
| Root wardline manifest | MUST | Tier definitions, ratification authority, review interval |
| SARIF output with wardline property bags | MUST | Structured and assessable |
| CODEOWNERS protection | MUST | Policy artefact changes require designated reviewer |
| Exception tracking | MUST | Register with reviewer identity, rationale, expiry |
| Temporal separation | SHOULD | Documented alternative permitted for enforcement artefacts; policy artefacts MUST require different-actor approval |
| Bootstrap golden corpus | SHOULD | 20-30 specimens covering UNCONDITIONAL cells and Tier 1 states |
| Annotation change tracking | MUST | Visibility of annotation changes (VCS diff review acceptable) |
| Expedited governance ratio | RECOMMENDED | Document process if not computing the ratio |

**Wardline Assurance** adds:

| Requirement | Status at Assurance | Change from Lite |
|-------------|---------------------|------------------|
| Temporal separation | MUST | No documented alternatives |
| Golden corpus | MUST — full 126+ specimens | Expanded from bootstrap |
| Fingerprint baseline | MUST — full structured baseline | Replaces annotation change tracking |
| Expedited governance ratio | MUST — computed, threshold declared, automated finding | Strengthened from RECOMMENDED |
| SIEM export of governance events | SHOULD (MUST for ISM-assessed) | New requirement |

### Governance profile graduation

Graduation from Lite to Assurance is tied to maturity, not a calendar milestone. Triggers include: IRAP assessment, PROTECTED classification or above, team exceeding 15 contributors, two manifest ratification cycles at Lite, or organisational risk appetite.

**Graduation checklist:**

1. Golden corpus expanded to 126+ specimens with adversarial cases
2. Full structured fingerprint baseline established with at least one review cycle
3. Temporal separation operational without documented alternatives
4. Expedited ratio threshold declared with automated governance-level findings
5. All Lite-era exceptions reviewed under Assurance-level governance

### Enforcement regimes

An **enforcement regime** is the set of tools that collectively enforce a wardline for a given language ecosystem. Regime composition rules:

- **Coverage completeness.** Every criterion satisfied by at least one tool.
- **Rule coverage completeness.** The union of all Wardline-Core tools covers all eight rules.
- **Corpus union.** Regime-level corpus satisfies minimum specimen counts across the full rule set.
- **SARIF aggregation.** Each tool produces its own SARIF run; a regime orchestrator aggregates.
- **Self-hosting.** Each tool passes the rules it implements on its own source.

### Assessment procedure

1. **Regime documentation review** — verify collective coverage of all 10 criteria
2. **Manifest validation** — schema-valid, ratification current
3. **Manifest coherence** (Assurance: MUST gate) — no orphaned annotations, undeclared boundaries, tier-topology contradictions, unmatched contracts, or stale contract bindings
4. **Golden corpus verification** — precision >= 80%, recall >= 70%, adversarial specimens present
5. **Enforcement execution** — SARIF output valid, control law normal, deterministic (byte-identical on repeated runs)
6. **Governance artefact review** — exception register, expedited ratio, fingerprint baseline
7. **Self-hosting verification** — each tool passes its own rules

**Pass/fail criteria:**

| Criterion | Pass | Fail |
|---|---|---|
| Regime covers all 10 criteria | All mapped | Any unmapped without compensating control |
| Manifest schema-valid | Exit code 0 | Schema validation error |
| Manifest coherence (Assurance) | All five conditions pass | Coherence failure without documented exception |
| Corpus precision per rule | >= 80% (or declared threshold) | Below threshold |
| Corpus recall per rule | >= 70% (or declared threshold) | Below threshold |
| SARIF property bags present | All required properties | Missing properties |
| Control law normal | Normal for declared phase | Alternate/direct without acknowledgement |
| Deterministic output | Byte-identical on repeated runs | Non-deterministic |
| Exception register well-formed | All entries have reviewer, rationale, expiry | Missing required fields |
| Self-hosting passes | Tool passes own rules | Tool violates own rules |

### Supplementary group enforcement scope

Criterion 1 requires *expression* of all 17 groups. Criteria 2-8 require *enforcement* only for the eight rules operating on core classification annotations (Groups 1-4, 16-17). Tools define their own enforcement rules for supplementary groups (Groups 5-15), declared in the overlay's supplementary section.

### Phase-to-profile mapping

Language bindings define numbered adoption phases that map to the framework's conformance profiles. The phase numbers differ between bindings because each language's tooling ecosystem has different entry points and capabilities.

| Adoption Phase | Python Binding | Java Binding | Conformance Profile |
|---|---|---|---|
| **1** | Decorators + advisory ruff rules | Annotations only | None (documentation value only) |
| **2** | Manifest + reference scanner | Advisory Error Prone checks | Python: Wardline-Core / Java: None (advisory) |
| **3** | Type-system enforcement (mypy) | Authoritative scanner in CI | Python: Wardline-Type / Java: Wardline-Core |
| **4** | Runtime structural enforcement | Type-system enforcement (Checker Framework) | Python: (structural complement) / Java: Wardline-Type |
| **5** | Full regime governance | *(not applicable)* | Wardline-Governance |

Python has five phases because its tooling ecosystem layers differently — the reference scanner (Phase 2) precedes type-system integration (Phase 3), and governance tooling is a distinct Phase 5. Java has four phases because the advisory Error Prone path (Phase 2) is integrated into compilation, and governance tooling ships alongside the authoritative scanner at Phase 3. Both bindings reach Wardline-Full conformance through a regime that combines all constituent tools, not through any single phase.

### Worked example: conformant Phase 3 deployment (Java)

This example shows the governance artefacts and CI configuration for a synthetic government Java project ("partner-landscape") at Phase 3 (Wardline-Core) conformance.

**Project structure:**

```
partner-landscape/
+-- wardline.yaml                    # Root manifest
+-- wardline.fingerprint.json        # Annotation fingerprint baseline
+-- wardline.exceptions.json         # Exception register
+-- wardline.toml                    # Scanner configuration
+-- CODEOWNERS                       # Protected-file reviewers
+-- .github/workflows/ci.yml         # CI pipeline
+-- adapters/
|   +-- wardline.overlay.yaml        # Module overlay -- shape validation boundaries
|   +-- src/main/java/...
+-- domain/
|   +-- wardline.overlay.yaml        # Module overlay -- semantic validation
|   +-- src/main/java/...
+-- audit/
|   +-- wardline.overlay.yaml        # Module overlay -- T1 construction + restoration
|   +-- src/main/java/...
+-- corpus/                          # Golden corpus
    +-- WL-001/AUDIT_TRAIL/...
    +-- WL-001/EXTERNAL_RAW/...
    +-- ...
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
    expedited_ratio_threshold: 0.10

  delegation:
    default_authority: RELAXED
    grants:
      - path: "audit/"
        authority: NONE

  module_tier_mappings:
    - module: "adapters"
      default_taint: EXTERNAL_RAW
    - module: "domain"
      default_taint: PIPELINE
    - module: "audit"
      default_taint: AUDIT_TRAIL
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
    "elimination_cost": "1 sprint -- requires partner team coordination"
  }
]
```

### Worked example: Lite governance deployment

This example shows a five-person team ("health-notifications") adopting wardline at the Lite governance level. The team builds a Python service that processes health notification records from an external API and stores summaries in an internal database. They have no dedicated security team.

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

  temporal_separation:
    alternative: "same-actor-with-retrospective"
    retrospective_window_days: 10
    rationale: >
      Team of five -- only two members have governance authority.
      Same-actor approval permitted with mandatory retrospective review
      within 10 business days.

  delegation:
    default_authority: RELAXED
    grants:
      - path: "store/"
        authority: NONE
```

**Bootstrap corpus:** 24 specimens covering UNCONDITIONAL cells and Tier 1 taint states.

**What the assessor verifies** (Lite governance checklist):

1. `wardline manifest validate` exits 0
2. Ratification date within review interval
3. CODEOWNERS protects governance artefacts
4. Exception register entries have reviewer identity, rationale, and expiry
5. Temporal separation alternative is documented in the manifest
6. PR review history shows annotation changes were reviewed
7. Bootstrap corpus present and scanner detects all specimens correctly

---

## See also

- [Governance model]({{< relref "governance" >}}) — governance profiles and enforcement availability
- [Enforcement specification]({{< relref "enforcement" >}}) — the three enforcement layers
- [Pattern rules]({{< relref "rules" >}}) — the rules that enforcement tools must implement
- [Language evaluation criteria]({{< relref "language-evaluation" >}}) — assessing language ecosystem support
