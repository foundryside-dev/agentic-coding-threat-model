---
title: "Governance Model"
weight: 6
---

A wardline without governance is an honour system. The governance model defines how designated reviewers manage exceptions to wardline declarations, who may authorise them, and what evidence trail they leave.

> **For governance leads and CISOs:** You own the wardline manifest — you ratify it, set the review interval, and approve tier assignments. Exception grants require a designated reviewer with documented rationale and expiry. You decide the governance profile — Lite or Assurance — and when to graduate. You monitor exception register growth, expedited/standard ratio trends, annotation coverage in Tier 1 modules, and manifest ratification currency.

## Exceptionability classes

Four classes govern how findings may be overridden:

| Class | Meaning | Governance requirement |
|-------|---------|----------------------|
| **UNCONDITIONAL** | No exception permitted. Project invariant. | Hardcoded — cannot be overridden by any actor. Changing an UNCONDITIONAL cell requires modifying the wardline specification itself, not the project's exception register. |
| **STANDARD** | Wrong by default, but overridable. | Requires documented rationale, reviewer identity, and expiry date. The exception must be approved by a designated reviewer and recorded in the project's exception register. |
| **RELAXED** | Lighter governance burden. | Warning-level findings that can be acknowledged with documented rationale. Reviewer approval is recommended but not mandatory. |
| **TRANSPARENT** | No governance required. | Corresponds to SUPPRESS cells in the severity matrix. |

## Governance mechanisms

The following mechanisms apply to the wardline declaration and its exception register, not only to the enforcement tool.

**Protected-file review.** Designated reviewers MUST approve changes to the wardline manifest, the enforcement baseline, and the verification corpus. Changes to these artefacts without designated reviewer approval are structurally prohibited by the version control system (CODEOWNERS or equivalent).

**Temporal separation.** The baseline update and the code change cannot be atomically combined by a single actor. If a developer adds a wardline exception and modifies the code that requires it in the same commit, the exception has no independent review.

*For deployments at the Assurance governance level:* temporal separation is a MUST requirement. Minimum: separate change, different actor, approved before the dependent code merges. No documented alternatives are permitted.

*For deployments at the Lite governance level:* temporal separation is a SHOULD requirement. Teams that cannot sustain full temporal separation MUST document their alternative in the root manifest. The documented alternative MUST include a compensating control — same-actor approval is permitted with mandatory retrospective review within a defined window (recommended: next sprint boundary or 10 business days, whichever is shorter). A Lite deployment that omits temporal separation entirely, without a documented alternative, does not satisfy the Lite governance checklist.

**Branch protection.** CI gates — including wardline enforcement — MUST pass before merge to the protected branch. This prevents bypass through direct push and ensures that wardline findings are resolved before code enters the mainline.

**Annotation fingerprint baseline.** A persistent record of the application's annotation surface — the set of all wardline annotations and their locations. Changes to this surface (annotations added, removed, or modified) are flagged for human review. This includes changes that activate or deactivate SUPPRESS classifications — a trust-classification change that moves a finding from ERROR to SUPPRESS (or vice versa) is a policy change and must be visible in the fingerprint diff.

*For deployments at the Assurance governance level:* the full fingerprint baseline is a MUST requirement — structured data store, canonical hashing, coverage reporting, and three-category change detection (added, modified, removed).

*For deployments at the Lite governance level:* annotation change tracking is required, but the full structured fingerprint baseline is deferred. Lite deployments MUST ensure that annotation changes are visible for human review — this MAY be implemented through VCS diff review of annotation-bearing files, PR-level annotation change summaries, or any mechanism that makes annotation additions, modifications, and removals visible to governance reviewers.

Change detection operates by diff between the current annotation surface and the stored baseline. Three categories of change are flagged:

- **Annotation added** — a previously unannotated function now has wardline declarations. Low risk; increases coverage.
- **Annotation modified** — an existing annotation's group membership, tier assignment, or boundary type has changed. Medium risk; this is a classification policy change that may alter which rules apply and at what severity.
- **Annotation removed** — a previously annotated function no longer has wardline declarations. High risk; the function has left the enforcement surface entirely. Annotation removal in Tier 1 modules MUST be flagged as a priority review item.

**Fingerprint record structure.** Each entry records: the annotated function's fully qualified name, its file location, which of the 17 annotation groups are declared on it, the tier context, whether the function is a boundary (and of what type), the artefact class of any changed declarations (policy or enforcement), a cryptographic hash of the annotation declarations (not the function body — implementation changes do not trigger governance review), and temporal metadata (first appearance date, last change date).

**Hash scope and canonicalisation.** The hash scope is the annotation surface only: the set of wardline decorators, tier assignments, and group memberships declared on the function. A change to a function's implementation that does not alter its annotations does not change its fingerprint. The hash MUST be computed over a canonical serialisation of the annotation surface — a deterministic ordering of annotation groups, tier assignments, and boundary declarations — not over the raw source text.

**Coverage reporting.** The baseline MUST also report annotation coverage: the count and ratio of annotated functions to total functions, with specific enumeration of unannotated functions in Tier 1 modules. This directly addresses [residual risk 4]({{< relref "residual-risks" >}}) (annotation coverage gaps).

**Restoration boundary declarations.** Declarations that serialised representations may be restored with their original tier are subject to the same governance as trust-escalation declarations. The provenance justification must address the four evidence categories defined in the enforcement specification.

**Manifest coherence checks.** Before code-level enforcement runs, the manifest itself SHOULD pass a static coherence analysis that verifies internal consistency and completeness of the annotation surface. Five coherence conditions are checked:

1. **Tier-topology consistency.** Tier assignments compared against declared data-flow topology.
2. **Orphaned annotations.** Code-level annotations with no corresponding manifest declaration.
3. **Undeclared boundaries.** Manifest boundary declarations without corresponding code annotations.
4. **Unmatched contracts.** Contract declarations that do not match any code-level annotation at the declared location.
5. **Stale contract bindings.** A `contract_bindings` entry whose declared function path does not resolve to an existing function.

Coherence check findings appear in the SARIF output with `ruleId` prefixed `COHERENCE-` (e.g., `COHERENCE-ORPHAN`, `COHERENCE-UNDECLARED`) and are subject to standard governance (STANDARD exceptionability).

**Policy and enforcement change presentation.** Fingerprint baseline diffs SHOULD distinguish policy artefact changes from enforcement artefact changes. Changes to tier assignments, boundary declarations, bounded-context consumer lists, restoration boundary provenance claims, and optional-field declarations are policy changes — they alter the trust topology and require security-policy-grade review. Changes to rule severity overrides, precision thresholds, and tool configuration are enforcement changes — they alter detection behaviour and require standard configuration management review. Presenting these as distinct categories in the diff output allows governance reviewers to prioritise policy changes and delegate enforcement changes to standard CM processes.

**Provenance justification.** For high-risk trust-escalation declarations — particularly declarations that data from an external source should be treated as internal (Tier 1) — the governance model requires documented rationale of the actual data source, the trust basis, and the institutional authority for the escalation. "We trust this because we always have" is not a sufficient rationale.

### Governance audit logging

Governance events MUST produce an auditable trail.

| Event | What is recorded | Source |
|---|---|---|
| Exception granted | Exception ID, rule, location, exceptionability class, reviewer identity, rationale, expiry, governance path, agent-originated flag | Exception register |
| Exception expired or lapsed | Exception ID, expiry date, whether re-review occurred | Exception register + enforcement tool |
| Fingerprint baseline change | Change category, affected function, old and new annotation hash | Fingerprint baseline diff |
| Manifest modification | Changed section, old and new values, commit reference | VCS diff on `wardline.yaml` |
| Overlay modification | Changed overlay path, changed fields, commit reference | VCS diff on overlay files |
| Control-law transition | Previous state, new state, missing component, timestamp | SARIF run properties |
| Retrospective scan completed | Scan date, commit range covered, finding count | SARIF run properties |
| Phase change | Previous phase, new phase, commit reference | `wardline.toml` VCS diff |

**Storage and integrity.** Governance events are recorded in the wardline governance artefacts themselves and the SARIF output from each enforcement run. VCS history provides tamper-evident logging. For environments requiring stronger tamper evidence (e.g., ISM-1228), the wardline CLI SHOULD support exporting governance events to an external append-only log.

**Retention.** Governance artefacts SHOULD be retained for the duration of the system's accreditation period (typically 3 years from the last IRAP assessment for ISM-assessed systems).

## Artefact classification: policy and enforcement

Not all wardline artefacts carry the same governance weight.

**Policy artefacts** encode institutional decisions about trust, evidence, and permitted behaviour. Changes alter what the wardline *means*:

- Tier assignments — which data sources are classified at which authority tier
- Boundary declarations — where tier transitions occur, including bounded-context consumer lists
- Restoration boundary provenance claims
- Exception rationale — the documented justification for governance overrides
- Optional-field declarations — which fields are optional-by-contract

Policy artefacts are governed under security policy procedures: changes require ratification by a designated authority, mandatory impact assessment, and scheduled adequacy review.

**Enforcement artefacts** encode how policy is operationalised by tooling. Changes alter how the wardline *works*:

- Pattern rule severity configuration
- Scanner operational settings
- Precision and recall thresholds
- Expedited governance ratio threshold
- Tool configuration

Enforcement artefacts are governed under configuration management: version control, CI integration, standard code review.

**The manifest contains both types.** The distinction is per-field, not per-file. Enforcement tools SHOULD present policy artefact changes and enforcement artefact changes as distinct categories in the fingerprint baseline diff.

## Scope of governance

The governance model applies to the wardline *declaration*, not only to the enforcement tool's findings. A change to the wardline manifest — adding a new trust boundary, reclassifying a data source, modifying an authority tier assignment, or declaring a restoration boundary — is a policy change with potential security implications. It receives the same governance treatment as a change to the application's security controls, because that is what it is.

### Agent-authored governance changes

In workflows where AI agents generate code, agents may also generate wardline governance artefacts — adding exception register entries, modifying allowlist configurations, or applying annotations that change the trust topology. These are policy edits, not merely code edits — in one documented incident, an agent resolved a linter conflict by adding a permanent per-file allowlist exception, bypassing the governance model entirely. Agent-authored changes to the wardline manifest, the exception register, the allowlist, or any governance artefact MUST be flagged as agent-originated and require human review as a distinct governance step. The fingerprint baseline flags the *change*; the governance model must additionally distinguish *who authored it*. An agent that produces a plausible-sounding rationale for a trust-escalation exception is exercising the same mechanism as the "fabricated default" failure mode ([ACF-S1]({{< relref "/acf/s1-competence-spoofing" >}})) — substituting a plausible fabrication where genuine evidence should be required, applied to a governance artefact rather than a data field.

The detection mechanism for agent authorship is a binding-level requirement. Language bindings MUST specify at least one of: a metadata field in the exception register recording authorship origin (human vs. agent), integration with VCS-level provenance tracking (e.g., commit-level author metadata distinguishing human and agent contributions), or a convention by which agents mark governance artefacts they generate (e.g., structured commit message tags). The specific mechanism varies by toolchain; the requirement is that agent-originated governance changes are distinguishable from human-originated ones. This is a framework invariant, not a binding convenience — the governance model's integrity depends on distinguishing human from agent authorship of policy artefacts.

The temporal separation requirement provides partial protection — the agent cannot atomically combine the governance change with the code that requires it — but "different actor" in temporal separation MUST mean a different *human* actor for the governance change when the dependent code change is agent-originated. An agent that generates both the governance exception and the code that requires it in separate commits satisfies temporal separation in form but not in spirit — the two artefacts share the same generative context. The human reviewer must understand that agent-authored rationales warrant the same scepticism as agent-authored code.

**Governance of supplementary contract annotations (Groups 5-15).** The severity matrix and its UNCONDITIONAL/STANDARD/RELAXED exceptionability classes govern findings from the eight rules — six pattern rules (WL-001 through WL-006) and two structural verification rules (WL-007 through WL-008). These rules apply to code annotated with core classification groups (1-4, 16-17). Findings generated by supplementary contract annotations (Groups 5-15 — operation semantics, failure mode, data sensitivity, determinism, concurrency, access/attribution, lifecycle) are subject to the same governance mechanisms (protected-file review, temporal separation, fingerprint baseline) but their exceptionability is binding-defined. Language bindings SHOULD classify supplementary findings as STANDARD by default, allowing governance override with documented rationale, unless the binding explicitly designates specific supplementary findings as UNCONDITIONAL.

## Manifest threat model

Three governance-layer attack vectors are harder to detect than code-level evasion because they operate on policy artefacts rather than code:

### 1. Manifest poisoning

Corrupting tier assignments so that agents generate code compliant with the wrong policy. A tier assignment that classifies external API data as Tier 1 causes downstream code to treat unvalidated input as authoritative — and the code will be structurally correct against the declared wardline.

*Integrity control:* Tier assignment changes (particularly downgrades or upgrades) MUST require two-person review. Tier changes MUST be tracked as a distinct change category in the fingerprint baseline. A tier change on a data source that feeds Tier 1 consumers SHOULD trigger an impact assessment. Tier definitions SHOULD include a `rationale` field documenting *why* the data source is assigned to that tier.

### 2. Governance fatigue exploitation

Submitting high volumes of annotation change requests that overwhelm review capacity, smuggling consequential changes in noise.

*Integrity control:* Enforcement tools SHOULD detect and flag anomalous annotation change patterns: volume spikes, clustered tier changes, and boundary widenings without corresponding code changes.

### 3. Boundary declaration manipulation

Subtly widening bounded-context declarations so that prohibited data flows become policy-permitted.

*Integrity control:* Bounded-context changes MUST require two-person review when the boundary claims Tier 2 semantics. New consumers added to a bounded-context declaration SHOULD be flagged for explicit review.

### Anomaly detection requirements

| Signal | Trigger | Severity |
|--------|---------|----------|
| Tier reassignment volume | More than 2 tier changes in a single PR/commit | WARNING |
| Tier downgrade | Any change that lowers a data source's tier | ERROR — requires two-person review |
| Tier upgrade without evidence | Tier 4 → Tier 1 or Tier 4 → Tier 2 without corresponding boundary declarations | ERROR |
| Boundary widening | Bounded-context consumer list grows | WARNING — requires explicit review |
| Boundary widening without code | Consumer added to bounded-context but no new function at that path | ERROR |
| Annotation volume spike | More than N annotation changes in a single review window | WARNING |
| Agent-originated policy change | Any policy artefact change authored by an agent | ERROR — requires human ratification |
| New dependency taint above UNKNOWN_RAW | A `dependency_taint` entry added with `returns_taint` above UNKNOWN_RAW | WARNING |
| Dependency taint finding suppression | Adding a `dependency_taint` entry suppresses more than a project-defined threshold of findings | WARNING |

## Governance capacity

Governance capacity is finite. Three mechanisms regulate governance load:

- **Finding rate scales with annotation coverage.** Unannotated code produces no findings. Governance load is controllable through annotation investment.
- **Precision floor as implicit load limiter.** The 80% precision floor ensures no more than 20% of findings are false positives.
- **Exception boundary dynamics.** Bindings SHOULD implement age-based exception management: STANDARD exceptions carry a maximum age (recommended: 180 days), RELAXED exceptions carry a longer maximum age (recommended: 365 days). If re-review does not occur within a defined grace period, the exception lapses and the underlying finding reverts to its default severity.

**Exception recurrence tracking.** The exception register MUST track recurrence: when an exception for the same rule at the same code location is renewed after expiry, the renewal MUST be flagged. A second or subsequent renewal MUST trigger automatic governance escalation to a higher authority than the original granting reviewer. This prevents temporal gaming where agents regenerate the same violation with a fresh exception after each expiry.

**Expedited governance paths.** For time-critical exceptions, an expedited path MAY be defined at the binding level. The expedited path MUST still require documented rationale and reviewer identity, but MAY compress the temporal separation requirement.

**Expedited governance ratio.** Each exception register entry carries a provenance field indicating standard or expedited governance path. The enforcement tool MUST compute and report the expedited/standard ratio in its findings output. This ratio is a leading indicator of governance decay. Projects SHOULD declare a threshold in their root wardline manifest.

*For Assurance governance:* the expedited governance ratio MUST be computed and reported. Projects MUST declare a threshold.

*For Lite governance:* the expedited governance ratio is RECOMMENDED. Projects that do not compute the ratio MUST document their expedited exception approval process in the root manifest.

## Enforcement availability (control law)

The enforcement tool is itself a system that can fail. The framework adopts a three-state control law model:

| State | Description | Merge policy |
|-------|-------------|-------------|
| **Normal law** | Full capability, all rules active, manifest current | Merge requires enforcement pass |
| **Alternate law** | Degraded state (stale corpus, disabled rules, ratification overdue, advisory-only mode) | Merge with documented acknowledgment; bindings SHOULD classify degradations into governance bands |
| **Direct law** | Tool cannot run at all — governance incident | Enforcement-unavailable governance with mandatory retrospective scan |

**Enforcement-unavailable governance** (direct law) requires:

- **Authorisation record** — who authorised the bypass, why the tool was unavailable, affected commit range, and duration window.
- **Scoped duration** — the authorisation covers a specific time window or commit set. The root manifest SHOULD declare a maximum direct-law duration (recommended: 48 hours).
- **Governance artefact exclusion** — direct-law bypass MUST NOT cover changes to wardline policy artefacts (`wardline.yaml`, overlay files, exception registers, or fingerprint baselines).
- **Mandatory retrospective scan** — the first successful enforcement run under normal law MUST scan all code merged during the degraded or direct-law window. Retrospective findings are tagged with `wardline.retroactiveScan: true`.

**Control law in SARIF output.** The current enforcement state is reported as `wardline.controlLaw` with values `"normal"`, `"alternate"`, or `"direct"`. When alternate, `wardline.controlLawDegradations` lists the specific conditions.

**Retrospective scan verification.** The mandatory retrospective scan must be independently verifiable:

1. Every SARIF run under alternate or direct law records the commit range affected.
2. The first normal-law run MUST include `wardline.retroactiveScan: true` and declare the commit range covered.
3. If the first normal-law run does NOT include the retrospective scan marker, the wardline CLI produces a governance finding.
4. The finding persists until the scan is performed or excepted through STANDARD governance.

---

## See also

- [Portability and manifest format]({{< relref "portability" >}}) — how wardline declarations are serialised and exchanged
- [Verification and conformance]({{< relref "verification" >}}) — verification properties and conformance profiles
- [Pattern rules]({{< relref "rules" >}}) — the rules governed by these exceptionability classes
- [Residual risks]({{< relref "residual-risks" >}}) — structural limitations including governance decay
- [Enforcement specification]({{< relref "enforcement" >}}) — the three enforcement layers
