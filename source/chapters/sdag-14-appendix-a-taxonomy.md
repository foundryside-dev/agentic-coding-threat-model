## Appendix A: Agentic Code Failure Taxonomy

A structured catalogue of failure modes observed in compliance-constrained agentic development, mapped to STRIDE categories, with detection characteristics, code examples, and risk ratings. The entries below are the modes observed to date; the taxonomy is designed to be extended as the community reports additional patterns (see Taxonomy Extension Mechanism at the end of this appendix). Each entry includes the *reason agents produce this pattern* — understanding why helps calibrate both detection tools and review processes.

*A note on spurious code references.* Raw confabulation — a call to a non-existent function, a reference to an absent field[^spurious-reference-example] — is among the most detectable classes of agent failure: it crashes, fails type checking, or fails tests. This taxonomy catalogues failures that pass those checks. The dangerous form of hallucination is the *concealment*: an agent that checks `hasattr()` before accessing a spurious field, or supplies a `.get()` default when the field does not exist, converts a detectable crash into an invisible semantic failure (catalogued as ACF-S2 and ACF-S1 respectively). The failure modes below concern broader structural shapes — training-distribution bias, context displacement, correlated failure — whose generative conditions are not eliminated by model capability improvements alone (§2.4, §2.5).

[^spurious-reference-example]: Appendix E.6 documents a case in point: an agent drafting an implementation specification referenced `get_token(force_refresh=True)` on an Azure Identity credential object — a plausible API that does not exist. The spurious parameter was internally consistent within the specification, with downstream logic depending on forced refresh succeeding. Had the specification been implemented, the resulting `TypeError` would have been caught by tests. The dangerous scenario is the one where the implementing agent, encountering the crash, "fixes" it with a `getattr()` fallback or a `try/except` that silently skips the refresh — converting an ACF-S2 (detectable spurious reference) into an ACF-S1 (invisible fabricated default).

*Policy readers: the Summary Table below and the Detection Capability Summary at the end of this appendix provide a complete overview without requiring code fluency. The detailed entries between them are provided for technical practitioners and tool builders.*

*Risk rating calibration.* Risk ratings in this taxonomy are qualitative assessments (Critical, High, Medium, Low) based on the observed severity of the failure mode in the case study context and the authors' assessment of potential impact in high-stakes government systems. They are not calibrated against CVSS Base Score ranges or any other quantitative scale. Organisations adopting these ratings for their own risk frameworks should map them to their institutional risk scales; international partners developing joint guidance should establish a shared calibration before co-endorsement.

### Summary Table

| ID | Name | STRIDE | Failure Layer[^failure-layers] | Type | Relation[^relation-categories] | Risk | Detection |
|----------|----------------------|------------|----------------|----------------|---------------|----------|-------------------|
| ACF-S1 | Fabricated Default | S | Training bias | Code Pattern | Agent-specific | High | Partial |
| ACF-S2 | Spurious Field Access | S | Training bias | Code Pattern | Agent-specific | High | Partial |
| ACF-S3 | Structural Identity Spoofing | S[^s3-stride] | Training bias | Code Pattern | Agent-specific | High | Partial |
| ACF-T1 | Authority Tier Conflation | T | Training bias | Code Pattern | Agent-specific | Critical | None[^t1-detection] |
| ACF-T2 | Silent Coercion | T | Training bias | Code Pattern | Agent-specific | Medium | Partial |
| ACF-T3 | Unstructured Signal Parsing | T | Training bias | Code Pattern | Agent-specific | High | Partial |
| ACF-R1 | Audit Trail Destruction | R | Training bias | Code Pattern | Known class, agent-amplified | High | Partial |
| ACF-R2 | Partial Completion | R | Training bias | Code Pattern | Known class, agent-amplified | High | None |
| ACF-R3 | Verification Displacement | R | Context collapse | Code Pattern | Agent-specific | High | Partial (R3a) / None (R3b)[^r3b-detection] |
| | — R3a: Verification Substitution | | | | | | |
| | — R3b: Compensating Control Dependency | | | | | | |
| ACF-R5 | Remediation-Induced Violation | R | Training bias | Code Pattern | Agent-specific | High | None |
| ACF-I1 | Verbose Error Response | I | Training bias | Code Pattern | Known class, agent-amplified | Medium | Partial |
| ACF-D1 | Finding Flood | D | Process volume | Process Threat | Agent-specific | High | N/A |
| ACF-D2 | Review Capacity Exhaustion | D | Process volume | Process Threat | Agent-specific | High | N/A |
| ACF-E1 | Implicit Privilege Grant | E | Training bias | Code Pattern | Agent-specific | Critical | None |
| ACF-E2 | Unvalidated Delegation | E | Training bias | Code Pattern | Known class, agent-amplified | High | Partial |
| | **Provisional candidates below** — observed but not yet validated for core classification. Not compliance requirements. | | | | | | |
| *ACF-S4* | *Type Annotation Erosion* | *S* | *Training bias* | *Code Pattern* | *Agent-specific* | *High* | *Partial* |
| *ACF-S5* | *Type Structure Avoidance* | *S* | *Training bias* | *Code Pattern* | *Agent-specific* | *High* | *Partial* |
| *ACF-T4* | *Safety Guard Erosion* | *T* | *Training bias* | *Code Pattern* | *Agent-specific* | *Medium* | *None* |
| *ACF-R4* | *Context Handover Assumption* | *R* | *Context collapse* | *Workflow Pattern* | *Agent-specific* | *Medium* | *Partial* |
| *ACF-R6* | *Scope-Limited Triage* | *R* | *Context collapse* | *Workflow Pattern* | *Agent-specific* | *Medium* | *None* |

!!! warning "Provisional candidates — not core taxonomy entries"
    ACF-S4, ACF-S5, ACF-R4, ACF-T4, and ACF-R6 are **provisional candidates** — failure modes observed in practice but not yet sufficiently validated for core classification. They are included in the detailed entries below for completeness and community feedback, but they are **not counted in the paper's "15 core failure modes" statistics** and should **not be treated as established compliance requirements**. Promotion to core requires additional independent observation, validated detection approaches, or broader community confirmation of the failure pattern. ACF-S4 (Type Annotation Erosion) and ACF-S5 (Type Structure Avoidance) were identified through external consultation feedback and describe complementary meta-failures that degrade the detection capability for other taxonomy entries. ACF-R4's generative mechanism is described in §2.4(a). ACF-T4 and ACF-R6 were identified through a structured audit of agent-generated commits against project-specific semantic rules; they describe failures that occur during maintenance-phase work (refactoring, remediation, auditing, triage) rather than during initial code generation. All five entries appear at the end of this appendix.

[^failure-layers]: The primary generative mechanism for each entry, mapped to the failure-layer distinction in §2.4(h). *Training bias* — the model's priors encode the pattern as universally correct; persists across sessions and models with shared lineages. *Context collapse* — the model loses or displaces project-specific context during generation; addressable through session management and checkpoint controls. *Process volume* — the failure is in the review process, not the code; addressable through capacity planning and automated pre-screening. Some entries involve multiple layers; the column reflects the primary mechanism. The distinction matters for control selection: a control that addresses one layer may provide false reassurance against another (§2.4(h)).

[^r3b-detection]: The "Partial" rating reflects R3a (Verification Substitution), which has identifiable detection signatures. R3b (Compensating Control Dependency) has no practical detection method — the fragility is invisible until the compensating control is removed. The composite "Partial" understates the R3b gap.

[^t1-detection]: No widely deployed tool detects this. Project-specific pattern matching (§8.3) provides limited intra-function proxy coverage — sufficient to catch some instances but not the cross-function taint flows that characterise the full failure mode. The "None" rating reflects the absence of generally available detection, not the impossibility of detection.

[^s3-stride]: Primary STRIDE category is Spoofing. The detailed entry below notes an Elevation of Privilege consequence — the structural impersonation that S3 enables can result in implicit privilege grants — but the entry is classified under S because the mechanism (false structural identity) is spoofing, not elevation.

[^relation-categories]: Three categories: *Agent-specific* — a failure mode that arises from the generative properties of agentic coding, not observed (or observed only rarely) in human-authored code. *Known class, agent-amplified* — a failure class already catalogued in human-authored code, but produced at higher frequency, greater consistency, or harder-to-detect form by agents. *Workflow Pattern* entries (provisional) describe failures in multi-session or multi-agent coordination rather than in generated code.

**Type** indicates whether the entry describes a code-level pattern (addressable with technical controls), a process-level threat (addressable with management controls), or both. This taxonomy intentionally includes both because the threat model's compounding mechanism (§3.3) depends on their interaction — code-level failures and process-level degradation reinforce each other through feedback loops that a split taxonomy would obscure.

**Relation to known classes** distinguishes entries that describe failure modes specific to agent-generated code ("Agent-specific") from entries that describe well-known vulnerability classes produced at systematically higher rates or with different characteristics by agents ("Known class, agent-amplified"). The inclusion criterion is not novelty — it is whether a failure mode requires *systematic* rather than *ad hoc* management in an agentic development context. Some entries describe genuinely new failure modes (ACF-T1, ACF-S1). Others describe well-known classes that were manageable through periodic review at human rates but are now produced routinely — every error handler, every data access path, every exception block — at a volume where ad hoc detection no longer provides adequate coverage.

A "known" vulnerability class produced identically across every codebase using the same agent is not the same risk as the same class produced sporadically by individual developers with diverse training and experience. The correlation changes the risk calculus even when the individual pattern is well understood. This may be further compounded if cross-model interaction produces composable defects across organisations — an emerging concern explored as a precautionary analysis in Appendix F. The taxonomy is designed to be extended with additional agent-amplified entries as organisations discover further known classes whose management burden changes under agentic volume.

**Risk ratings** are qualitative assessments based on the failure mode's potential impact in systems handling sensitive data, combined with the likelihood of agent generation and the difficulty of detection. Four levels are used: Critical, High, Medium, and Low.[^risk-rating-scale]

**Closely related entries.** Several pairs of entries describe adjacent failure modes. The distinguishing criteria appear in the *Related Entries and Distinguishing Criteria* subsection at the end of this appendix.

### Detailed Entries

*As noted above: the Summary Table and Detection Capability Summary provide a complete overview without code fluency. Non-Python readers may rely on the Description, Why it's dangerous, and Detection approach fields in the detailed entries below.*

**Language specificity.** The code examples throughout this appendix use Python, reflecting the case study environment. The failure modes vary in language-generality:

- **Language-general** (applicable across Python, Java, C#, TypeScript, Go, etc.): ACF-T1 (authority tier conflation), ACF-T2 (silent coercion), ACF-R1 (audit trail destruction), ACF-R2 (partial completion), ACF-I1 (verbose error response), ACF-D1 (finding flood), ACF-D2 (review capacity exhaustion), ACF-E1 (implicit privilege grant), ACF-E2 (unvalidated delegation). The failure *patterns* differ by language (e.g., `catch (Exception e)` in Java, `catch` in C++, `recover()` in Go), but the failure *mode* is the same.
- **Python-specific surface form** (same underlying failure, different manifestation in other languages): ACF-S1, ACF-S2, ACF-S3, and ACF-S4.[^cross-language-analogues]

Organisations working in other languages should read the *Description* and *Why it's dangerous* fields as language-general, and treat the *Example* and *Detection approach* fields as Python-specific reference implementations. **For SQL-specific treatment** — including `COALESCE` as fabricated default, `INSERT ... SELECT` as authority tier conflation, silent overwrites as audit trail destruction, and SQL-specific risks not covered by the Python taxonomy — see Appendix C.

#### ACF-S1: Fabricated Default

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

**Description:** Default values fabricate data where the absence of data should be surfaced as a failure, error, or explicit "unknown." The code presents a confident result that is actually based on fabricated input.

**Why agents produce this:** The `.get(key, default)` pattern appears in millions of Python files. In most contexts, providing a default for missing keys is genuinely good practice — a web application displaying "Unknown" for a missing user name is fine. Agents learn this as a universal pattern and apply it in contexts where the default fabricates safety-critical data.

**Example:**

```python
# Agent-generated — looks defensive and robust
def assess_risk_level(record):
    classification = record.get("security_classification", "OFFICIAL")
    clearance = record.get("required_clearance", "baseline")
    return classification, clearance

# Correct for high-stakes context — absence is a failure
def assess_risk_level(record):
    if "security_classification" not in record:
        raise MissingSecurityClassification(
            f"Record {record['id']}: security_classification absent — "
            f"upstream data integrity failure, cannot assess risk"
        )
    if "required_clearance" not in record:
        raise MissingSecurityClearance(
            f"Record {record['id']}: required_clearance absent — "
            f"cannot determine access level, refusing to default"
        )
    return record["security_classification"], record["required_clearance"]
```

**Why it's dangerous:** The first version silently downgrades security classifications when data is missing. A PROTECTED document with a corrupted or missing `security_classification` field is treated as OFFICIAL. Downstream access control decisions are based on the fabricated classification.

**Scope: internal state fabrication.** S1 applies not only to business data received from external sources but to the system's own operational data — telemetry, run identifiers, latency measurements, and audit metadata. When `self._run_id or ""` replaces a `None` run ID with an empty string, the system fabricates a value for data it should have produced correctly. A `None` run ID means "something is broken in our initialisation"; an empty string looks like normal operation. Similarly, `error.latency_ms or 0.0` fabricates a zero latency where measurement failed — operators cannot distinguish "instantaneous" from "unmeasured." The mechanism is identical to business data fabrication (`or default` on data where absence is meaningful), but internal state fabrication corrupts *observability* rather than *business logic* — incidents become harder to diagnose because the system's own diagnostic data has been normalised away.

**Detection approach:** Flag `.get()` and `getattr()` with defaults on objects whose type is annotated with an authority tier of Tier 1 (authoritative internal), Tier 2 (semantically validated), or Tier 3 (shape-validated). Requires authority tier annotations (not available in existing tools). Note: Semgrep custom rules can flag the structural pattern (`.get()` with non-None defaults) without provenance context, but with significantly lower precision — many legitimate uses of `.get()` with defaults exist, so the rule would require extensive per-project tuning or triaging. For internal state fabrication, flag `or ""`, `or 0.0`, `or 0`, and similar `or` fallbacks on fields that feed telemetry, metrics, or audit metadata. The companion specification maps ACF-S1 to pattern rule WL-001 (member access with fallback default), which is ERROR/UNCONDITIONAL in AUDIT_TRAIL contexts and ERROR/STANDARD in EXTERNAL_RAW contexts (see companion documents). The `or` fallback on Tier 1 data is also an ERROR under WL-001, because Tier 1 data is authored by the system itself and should never need fabricated defaults.

The S1 pattern also extends to governance artefacts: an agent that fabricates a plausible-sounding rationale for a trust-escalation exception is substituting a plausible fabrication where genuine evidence should be required — the same mechanism as a fabricated default on a data field, applied to a governance decision rather than code. The companion specification's §9 addresses this through temporal separation, reviewer identity requirements, and recurrence tracking on exception rationales.

!!! info "Compounding: upstream representational looseness"
    The risk of this pattern is amplified when upstream code has already erased the type information that would distinguish legitimate optionality from contract violation. When a typed dataclass is serialised to `dict[str, Any]`, the downstream `.get()` ceases to look anomalous — the type system no longer signals that the key should always be present. Appendix E documents an incident in which a CI enforcer correctly flagged `.get()` on an internal path, but the agent could not determine why the flag was correct because the upstream serialisation had destroyed the evidence. The agent broadened the exception policy instead.

---

#### ACF-S2: Spurious Field Access

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

**Description:** Agent accesses a field name that does not exist on the target object, masked by `getattr()` with a default. The code operates on fabricated data while appearing to access a real field.

**Why agents produce this:** Agents occasionally reference nonexistent field names — predicting a plausible field name that does not exist in the actual schema. Without `getattr`, this produces an immediate `AttributeError`. With `getattr(obj, "spurious_field", None)`, the error is silently suppressed and the code operates on `None` (or whatever default is provided).

**Example:**

```python
# Agent referenced nonexistent "risk_score" — actual field is "risk_rating"
threshold = getattr(assessment, "risk_score", 0)
if threshold > 5:
    escalate(assessment)
# risk_score is always 0 (the default), so nothing is ever escalated.
# The code looks correct. Tests pass (they test the escalation path with explicit values).
# The bug is invisible until someone notices that escalation never triggers.

# Correct — access the real field directly, crash if it doesn't exist
threshold = assessment.risk_rating
if threshold > 5:
    escalate(assessment)
# If the field name is wrong, AttributeError fires immediately.
# No silent suppression, no fabricated zero threshold.
```

**Why it's dangerous:** The code silently does nothing instead of crashing. In a security context, "nothing happens" can mean "threats are not escalated" or "alerts are not raised" — failures of omission that are harder to detect than failures of commission.

**Detection approach:** Type checkers (mypy, pyright) catch this *if the object is fully annotated*. If the object is `Any` or untyped, type checkers are silent. The companion specification's design (see companion document) specifies a complementary rule: `getattr` with a default on any object that has a declared type annotation is flagged, because the annotation means the field set is known and access should be direct. At the specification layer, a distinct detection path exists: "reality review" — checking whether referenced APIs, parameters, and field names actually exist in the target library or codebase. Appendix E.6 demonstrates this catching a spurious `force_refresh` parameter that was internally consistent within a specification but did not exist in the actual API. This verification is automatable through symbol resolution against dependency metadata.

---

#### ACF-S3: Structural Identity Spoofing

**STRIDE:** Spoofing (+ Elevation of Privilege consequence) | **Risk:** High | **Detection:** Partial

**Description:** A `hasattr()` check is used as a capability or privilege gate, allowing any object that declares the expected attribute to pass — regardless of whether the object is of the correct type. The gate accepts structural presence as proof of identity.

**Why agents produce this:** `hasattr()` is the idiomatic Python pattern for duck-typing capability checks. Training data is saturated with it — agents building plugin systems, authorisation checks, or capability dispatchers will reach for `hasattr` by default because it is the "Pythonic" way to test whether an object supports an operation. The concept that structural presence is not ontological identity — that *having* an attribute is not the same as *being* the right type — is a security distinction that the language actively discourages.

**Example:**

```python
# Agent-generated — "Pythonic" duck-typing capability check
def process_classified(obj):
    if hasattr(obj, "security_clearance"):
        handle_classified(obj)  # Any object with this attr gets in

# Trivial bypass — no type hierarchy modification needed
class Impersonator:
    security_clearance = "TOP_SECRET"  # Just declare the attribute

process_classified(Impersonator())  # Gate opens

# Correct — requires actual type membership
def process_classified(obj):
    if isinstance(obj, ClearedPersonnel):
        handle_classified(obj)  # Must inherit from ClearedPersonnel
    # Cannot bypass without modifying the class hierarchy itself
```

**Why it's dangerous:** Unlike ACF-S1 (data fabrication via defaults) where the fabricated value is visible at the call site, the exploit surface for `hasattr` gates is anywhere an object is constructed — potentially far from the gate. The gate looks secure in isolation. Worse, Python's `__getattr__` protocol means a single class can dynamically claim to possess *any* attribute:

```python
class UniversalImpersonator:
    def __getattr__(self, name):
        return True  # "Yes, I have that. And everything else."

# This object passes EVERY hasattr check in the entire codebase.
# An isinstance check is immune to this.
```

This is the capability-based equivalent of ACF-S1's fabricated default pattern: ACF-S1 fabricates *data* where absence should be a failure; ACF-S3 fabricates *identity* where type membership should be required. The object claims to be something it isn't, and the gate believes it because the check is structural (has the attribute) rather than ontological (is the type). The elevation of privilege consequence follows directly — the impersonator passes through a privilege gate that should have rejected it.

**Detection approach:** An unconditional lint rule banning `hasattr()` catches all instances (the case study codebase in §8 enforces this). General-purpose linters do not flag `hasattr` because it is considered idiomatic Python. The companion specification's design (see companion documents) treats `hasattr` as prohibited in contexts where structural guarantees are declared (ERROR/UNCONDITIONAL in AUDIT_TRAIL, PIPELINE, SHAPE_VALIDATED, UNKNOWN_SHAPE_VALIDATED, and UNKNOWN_SEM_VALIDATED contexts; ERROR/STANDARD and governable in EXTERNAL_RAW, UNKNOWN_RAW, and MIXED_RAW) — unlike `.get()` or `getattr()`, which are context-dependent: in high-stakes contexts there is no legitimate use of `hasattr` that cannot be expressed more safely as `isinstance()`, explicit `try`/`except AttributeError`, or an allowlist check. WL-006 (runtime type-checking of internal data) provides secondary coverage: runtime type-checking on data the wardline classifies as internal suggests the code does not trust the type system's guarantees, which may signal an S3-adjacent structural identity problem (see companion specification §2 coverage table). Detection is rated Partial because the rule is simple to implement but not present in any widely-deployed tool.

---

#### ACF-T1: Authority Tier Conflation

**STRIDE:** Tampering | **Risk:** Critical | **Detection:** None

**Description:** Data from an external (untrusted) source is used in an internal (trusted) context without passing through a validation boundary. The data's effective authority tier is silently elevated.

**Why agents produce this:** Python's type system does not distinguish between data from different sources. A `dict` from `requests.get().json()` and a `dict` from a validated internal query are the same type. Agents see both as "a dict" and treat them interchangeably because nothing in the language tells them otherwise.

**Example:**

```python
# Agent-generated — clean, readable, catastrophically wrong
def sync_partner_records(partner_api_url):
    response = requests.get(f"{partner_api_url}/records")
    records = response.json()
    for record in records:
        db.execute(
            insert(internal_records).values(**record)
        )
    # External data inserted directly into internal database.
    # No schema validation, no field allowlisting, no type checking.
    # Partner could send arbitrary fields, wrong types, injection payloads.

# Correct — validate at the boundary
def sync_partner_records(partner_api_url):
    response = requests.get(f"{partner_api_url}/records")
    raw_records = response.json()
    for raw in raw_records:
        try:
            validated = PartnerRecordSchema.validate(raw)
        except ValidationError as e:
            quarantine(raw, reason=str(e))
            continue
        db.execute(
            insert(internal_records).values(
                name=validated.name,
                status=validated.status,
            )
        )
```

**Why it's dangerous:** This is one of the two Critical-rated failure modes because it compromises the integrity of the internal data store — the system's source of truth. Once external data enters the internal store without validation, every downstream consumer trusts it as internal data. The failure shape is not a breach but a contamination: the data looks legitimate, the system processes it correctly, and the corruption spreads through every downstream report, decision, and audit record that reads from the internal store.

Consider a workforce management system that ingests contractor records from a partner HR platform via nightly sync. The sync code does `INSERT INTO contractors VALUES(**record)` — external fields flow directly into the internal database with no schema enforcement. The internal access control system reads a `clearance_tier` field from the contractors table when routing contractors to sensitive projects.

Three months after deployment, the partner platform undergoes a schema migration. A developer at the partner organisation makes a configuration error: a new internal field called `clearance_tier` — used by the partner's own workflow engine to flag records for manual review — is accidentally set to `"elevated"` for all active contractors during the migration. The partner notices the error within hours and corrects it. From the partner's perspective, it is a brief internal data quality incident, resolved before end of day.

From the internal system's perspective: the nightly sync ran during the error window. 1,847 contractor records now have `clearance_tier = "elevated"` in the internal database. The access control system, reading `clearance_tier` as an authoritative internal field, routes those contractors to sensitive project queues they should not be able to reach. For 36 hours — until the next nightly sync restores the correct values — elevated routing applies to 1,847 contractors.

The investigation that follows is confused at every level. Operations sees anomalous routing decisions, but the access control logs show the rule was correctly applied: `clearance_tier = "elevated"` did produce elevated routing. The rule is not wrong. Security traces the elevated values to the partner sync, contacts the partner, and confirms the data quality incident. The internal database is corrected with a re-sync.

But the investigation cannot answer the question that matters: during the 36-hour window, which elevated-routing sessions were legitimate and which were not? The access logs are internally consistent — the rule was correctly applied to the data as it existed. The data was wrong. The audit trail is forensically useless for the window in question, because it records what the system did, not what the system *should have known* about the provenance of the field it was acting on.

There was no attack. No one was negligent. The partner developer who made the configuration error fixed it within hours. The internal system worked exactly as designed. The exposure was a property of the architecture: a field arrived from an external source, shared a name with an internal field, and was inserted directly into the internal database where it was treated as authoritative. The validation boundary that would have caught this — that would have treated `clearance_tier` from an external source as an untrusted claim requiring field allowlisting and independent corroboration — was never built.

**The contamination property distinguishes T1 from other failure modes.** A traditional vulnerability produces an event: a crash, an alert, an anomalous log entry. Authority tier conflation produces no event. The data enters the store silently, is processed correctly by every downstream system, and corrupts every downstream decision, report, and audit record that depends on it. By the time the contamination is discovered, it may have propagated through months of records — reports generated from the internal store, decisions made on the basis of those reports, downstream systems that ingested the internal store's output as their own authoritative input. Correcting the source data does not retroactively correct the decisions made on the basis of it.

**Detection approach:** Taint analysis — trace the return values of functions marked `@external_boundary` (or matched by the known external call heuristic list) and flag if they reach data store operations without passing through a function marked `@validates_external` (or, in the decomposed two-step validation case, `@validates_shape` followed by `@validates_semantic`). This is the core capability of the enforcement tool specified in the companion documents.

---

#### ACF-T2: Silent Coercion

**STRIDE:** Tampering | **Risk:** Medium | **Detection:** Partial

**Description:** Type coercion across trust boundaries hides data quality issues. Values are silently converted to a compatible type rather than being flagged as invalid.

**Why agents produce this:** Python's `or` operator and conditional expressions make coercion easy and idiomatic. `value = input_value or "default"` is a common pattern. Agents apply it broadly without distinguishing between contexts where coercion is appropriate (Tier 4 → Tier 3 at a validation boundary) and contexts where it is dangerous (Tier 1 internal data that should never need coercion).

**Example:**

```python
# Silent coercion hides data quality problem
amount = float(row.get("transaction_amount", 0))
# Two failures compounded: .get() fabricates a default (ACF-S1),
# then float() coerces it to a numeric type.
# Missing transaction amount is silently zero — not "unknown" or "error."
# A zero-value transaction passes every downstream check.
# An audit query for "transactions over $1000" won't find it,
# but neither will "transactions with missing amounts."

# Locale coercion is equally dangerous
amount = float(row["measurement"].replace(",", "."))
# "3,14159" silently becomes 3.14159 — the original locale context
# is lost with no record that a transformation occurred.


# Correct — validate presence, validate type, preserve precision
from decimal import Decimal, InvalidOperation

if "transaction_amount" not in row:
    return TransformResult.error({"reason": "missing_amount", "row_id": row_id})
raw_amount = row["transaction_amount"]
try:
    amount = Decimal(raw_amount)  # Preserve precision; float would silently lose it
except (InvalidOperation, TypeError) as e:
    return TransformResult.error(
        {"reason": "invalid_amount", "raw": raw_amount, "error": str(e)}
    )
```

**Why it's dangerous:** Silent coercion converts "unknown" into a concrete value that passes all downstream checks. The distinction between "this transaction was for $0" and "we do not know the transaction amount" is lost permanently. Audit queries cannot distinguish real data from fabricated defaults, compromising the integrity of any analysis or compliance report built on the data.

**Detection approach:** Two tiers of coverage. *Default-based coercion* (`.get()` with non-None defaults, `or` chains with fallback values, ternary expressions with defaults) is partially detected: WL-001 covers the `.get()` surface; `or` chains and ternary defaults are structurally detectable by custom Semgrep rules but with lower precision without authority tier annotations. *Type-casting coercion* (`float()` hiding precision loss, locale-dependent string operations, date parsing with assumed timezone) is not covered by the current rule set — no existing pattern rule targets type conversion on tier-classified data. The distinction from ACF-S1 is that T2 involves type conversion compounded with default substitution, not just default substitution alone. The companion specification maps ACF-T2 to WL-001 for the default-based surface only (see companion documents, footnote on ACF-T2 coverage scope).

---

#### ACF-T3: Unstructured Signal Parsing

**STRIDE:** Tampering | **Risk:** High | **Detection:** Partial

**Description:** Control-flow or classification decisions are made by substring matching on unstructured text — error messages, log output, human-readable descriptions — rather than on typed, structured fields. The code treats a prose string as if it were an enum and builds control flow on the fabricated structure. The data is not crossing a trust boundary or changing type — it is being parsed as something it is not.

**Why agents produce this:** Training data is saturated with `if "error" in str(e)` patterns. The correct pattern — a typed category field set at the raise site and read at the catch site — requires coordinating the exception class definition with every raise site, which is architecturally demanding work that agents rarely undertake spontaneously.

**Example:**

```python
# Agent-generated — looks like careful error classification
except DataverseClientError as e:
    error_msg = str(e)
    if "domain allowlist" in error_msg or "SSRF" in error_msg:
        reason = "ssrf_rejected"
    elif "consecutive empty pages" in error_msg:
        reason = "empty_page_guard"
    elif e.status_code == 401:
        reason = "auth_failure"
    else:
        reason = "pagination_error"
    record_audit_event(reason=reason, error=error_msg)

# Correct — typed classification set at the raise site
class DataverseClientError(Exception):
    def __init__(self, message, *, error_category: str, retryable: bool, ...):
        self.error_category = error_category
        ...

raise DataverseClientError(
    f"URL hostname {hostname!r} rejected by domain allowlist.",
    error_category="ssrf_rejected", retryable=False,
)

except DataverseClientError as e:
    record_audit_event(reason=e.error_category, error=str(e))
```

**Why it's dangerous:** The failure mode is silent reclassification. When a developer or agent later changes the wording of an error message, the substring match stops matching, the condition falls through to a default branch, and the event is silently reclassified. In audit-critical contexts, an SSRF rejection recorded as a generic "pagination_error" destroys the forensic value of the audit trail without any error or test failure. The reclassification is worse than an audit gap (ACF-R1), because a gap is visible — the record is absent — while a misclassification is invisible: the record is present, with the wrong category.

**Detection approach:** Flag `in str(e)`, `in e.message`, `in error_msg`, and similar substring-match-on-exception-text constructs inside exception handlers that feed audit, telemetry, or control-flow decisions. This is a structural pattern that custom lint rules can flag without semantic knowledge. Detection is rated Partial because the surface pattern is identifiable but distinguishing audit-critical classification from benign logging requires context.

---

#### ACF-R1: Audit Trail Destruction

**STRIDE:** Repudiation | **Risk:** High | **Detection:** Partial

**Description:** Exception handling around audit-critical operations compromises audit trail integrity. Two surface forms produce the same consequence through opposite mechanisms: (a) broad exception handlers catch errors and log-and-continue rather than propagating the failure to the audit system; (b) audit-critical operations propagate failures as untyped exceptions that bypass the structured handling path, so the failure is either caught by a generic handler that does not recognise it as an audit integrity violation, or crashes the process without the diagnostic context and incident routing that the typed handler would have provided.

**Why agents produce this:** Both forms arise from the same training-data gap. Form (a): "catch exceptions and log them" is a pervasive pattern — a web server should log errors and keep serving. Agents apply this to audit-critical operations without recognising that some failures must propagate rather than be absorbed. Form (b): agents told to avoid form (a) — "let audit failures propagate, don't swallow them" — produce the correct action (propagation) with the wrong type (generic `Exception` rather than the domain-specific type that routes to the audit integrity handler). The *routing semantics* of exceptions — which handlers catch which types, and what each handler does differently — are institutional knowledge encoded in the exception hierarchy, not in the language syntax. Training data overwhelmingly uses generic exception types; domain-specific exception hierarchies are project-specific and rarely appear in public repositories.

**Example (form a — canonical):**

```python
# Agent-generated — looks like responsible error handling
try:
    record_decision(case_id, decision, rationale, evidence)
except Exception as e:
    logger.error(f"Failed to record decision for {case_id}: {e}")
    # Decision was made. Decision was not recorded.
    # The audit trail now has a gap that cannot be reconstructed.
    # The log message may be rotated away. The decision stands, unrecorded.

# Correct — audit failures must propagate
record_decision(case_id, decision, rationale, evidence)
# If this fails, the exception propagates up.
# The caller must handle it — either retry or abort the operation.
# The decision is NOT made unless it is recorded.
```

**Example (form b — untyped propagation):**

```python
# Agent-generated — correctly avoids swallowing, but propagates untyped
def upload_and_record(blob_data, ctx):
    upload_blob(blob_data)            # Upload succeeds
    ctx.record_call(status=SUCCESS)   # Audit DB is down — raises Exception
    # The naked Exception propagates. If a generic handler upstream
    # catches Exception and logs it, the audit failure is absorbed
    # without triggering incident response. If nothing catches it,
    # the process crashes with a stack trace that says "Exception"
    # rather than "AuditIntegrityError" — the operator sees a crash,
    # not an audit integrity violation requiring investigation.

# Correct — type the exception for routing
def upload_and_record(blob_data, ctx):
    upload_blob(blob_data)
    try:
        ctx.record_call(status=SUCCESS)
    except Exception as exc:
        raise AuditIntegrityError(
            f"Upload completed but audit record failed. "
            f"Blob exists without audit trail entry."
        ) from exc
    # AuditIntegrityError is caught by the dedicated audit handler,
    # which triggers incident response, not by a generic handler
    # that logs and continues.
```

**Why it's dangerous:** In regulatory contexts, the audit trail is the legal record. A gap in the audit trail is not just a logging failure — it is a compliance failure that may have legal consequences. "We made a decision but cannot prove what it was based on" is an unacceptable answer in a formal inquiry. Form (b) is particularly insidious because the agent has followed the project's explicit rule ("don't swallow audit failures") and the code *does* propagate — the failure is in the exception's *type*, not its *handling*. A codebase audit looking for catch-and-swallow patterns (form a) will not find form (b), because there is no `except` block to flag. In one observed project, correcting form (a) across a codebase revealed twelve instances of form (b) across six plugins — the correlated failure property in action, with the same untyped-propagation pattern repeated identically at every `record_call` site.

The two forms also compose. An agent producing form (b) — an untyped `Exception` propagating from an audit-critical operation — creates an exception that has no guaranteed destination. A different agent, or the same agent in a different session, may independently add a catch-all `except Exception` handler further up the call stack, because the application "keeps crashing" on certain code paths and broad exception handling is the training-data default for making crashes stop. The untyped audit exception lands in the catch-all, is logged as a generic error, and the operation continues — form (a) and form (b) working together, neither introduced by the same agent or in the same session, composing into a silent audit trail gap that neither detection rule in isolation would flag.

The catch-all handler is not wrapping the audit operation (which form (a) detection targets); the audit operation is not swallowed at its call site (which form (b) detection targets). The gap exists in the *space between* two independently reasonable patterns — an instance of the composable-defect mechanism described in Appendix F (there as a precautionary cross-model analysis; here operating within a single ACF entry).

!!! example "Extended scenario: middleware security control bypass through exception routing"

    **Scope: exception routing as a cross-cutting mechanism.** The untyped-propagation mechanism in form (b) is not specific to audit operations. The same mechanism — correct action, wrong exception type, bypassed structured handler — produces different consequences depending on which handler is bypassed. The following scenario illustrates a cascade from operational nuisance to security compromise.

    Consider a web application with middleware-based security controls — a standard pattern in Django, Starlette, and WSGI applications:

    ```python
    # Security middleware — keys on exception type for SIEM and rate limiting
    class SecurityAuditMiddleware:
        def __call__(self, request):
            try:
                return self.app(request)
            except AuthenticationError as exc:
                self.siem.record_auth_failure(request.ip, exc.reason)
                self.rate_limiter.increment(request.ip)
                return Response(401)
            except Exception:
                logger.exception("Unhandled error")
                return Response(500)
    ```

    The `except AuthenticationError` clause is the security control: SIEM events, rate limiter, 401 response. The `except Exception` clause is the safety net — log, return 500, keep running.

    An agent refactoring the authentication internals replaces `raise AuthenticationError(reason="incorrect_password")` with `raise Exception("Authentication failed")`. The middleware's `except AuthenticationError` no longer catches the failure. The application returns 500 on every incorrect password.

    A second agent fixes the visible symptom: catch the exception in the login view, return 401. Every automated check passes. What the fix does not restore is the SIEM event and rate limiter increment — the middleware still exists, unchanged, but no `AuthenticationError` reaches it.

    **The attack chain:** (1) exception type eroded from specific to generic during refactoring (form (b)); (2) generic exception bypasses middleware security controls; (3) second agent fixes the visible symptom by catching the exception in the view (form (a), applied to a different handler); (4) SIEM integration, rate limiting, and account lockout silently disabled.

    **Operational conclusion.** The changes ship on a Thursday. That evening, monitoring alerts on elevated 500 error rates. An on-call engineer is paged at 11pm Friday. They test the site — everything works. The 500s stopped (because the second agent's fix deployed between the errors and the investigation). The engineer silences the alert until Monday. By Monday morning, the window has been open for over 60 hours — sufficient time for a credential stuffing run without rate limiting, account lockout, or SIEM alerts.

    **Whether the attack occurred is unknowable.** The audit trail that would have recorded it — the SIEM events — is the thing that broke. The incident response team cannot distinguish "no attacks happened" from "attacks happened and we have no record." The on-call engineer is in exactly the same position as the code reviewer described in §4.2: looking at something that appears correct, making a reasonable decision based on what they can observe, and unknowingly removing the last line of defence. Neither is negligent. The security consequence is invisible because it is a property of the middleware routing path — an architectural relationship between exception type and security control that is not visible in the diff, the error logs, or any test that does not specifically check whether the SIEM received the events it should have.

    Middleware-based security controls are particularly vulnerable to this pattern because the controls are architecturally separated from the code that triggers them, connected only by exception type — institutional knowledge that lives in deployment configuration, not in the code being modified.

This example illustrates why the category is defined by its *consequence* (structured handling bypassed through exception mistyping) rather than its *mechanism* (swallowing or untyped propagation). The category encompasses audit trail gaps, middleware security control bypass, and validation handler bypass — all produced by the same training-data gap. Every instance involves either a catch-and-continue on a path that should propagate (form a), or an operation that should raise a domain-specific exception type but raises a generic one (form b).

**Detection approach:** Form (a): existing linters flag bare `except:` (no exception type) but not `except Exception:` (which is considered acceptable practice). Semantic detection requires understanding which operations are audit-critical — this is project-specific knowledge encoded in the trust topology (e.g., functions annotated as audit-write operations should not be inside broad exception handlers that continue on failure). Form (b): flag audit-critical call sites (e.g., functions annotated as `@audit_writer` or matching a known audit-operation list) where the call is not wrapped in a handler that raises a domain-specific exception type. The detection signature is the *absence* of a typed wrapper, not the *presence* of a catch block — a structurally different rule from form (a). The companion specification maps ACF-R1 form (a) to pattern rules WL-003 (broad exception catching), WL-004 (silent exception handling), and WL-005 (audit writes in broad handlers), with Group 1 (`@audit_writer`) and Group 2 (`@audit_critical`) audit primacy enforcement providing the declaration mechanism (see companion documents). Form (b) is not yet covered by the companion specification's rule set — it requires a new detection category targeting untyped propagation from declared audit-critical operations.

---

#### ACF-R2: Partial Completion

**STRIDE:** Repudiation | **Risk:** High | **Detection:** None

**Description:** A sequence of operations that should be atomic (all-or-nothing) is implemented without rollback, so partial failure leaves the system in an inconsistent state.

**Why agents produce this:** Agents implement operations sequentially and add error handling per-step. They do not naturally recognise that a group of operations should be treated as a transaction unless explicitly prompted. The concept of "these three operations must all succeed or all fail" is a design decision, not a language feature.

**Example:**

```python
# Bad — agent-generated, each step has error handling, but no atomicity
def reclassify_document(doc_id, new_classification):
    old_classification = get_classification(doc_id)
    update_classification(doc_id, new_classification)                # Step 1: succeeds
    notify_stakeholders(doc_id, new_classification)                  # Step 2: fails (network error)
    record_reclassification(doc_id, old_classification, new_classification)  # Step 3: never runs
    # Document is reclassified, stakeholders don't know, audit trail is incomplete.
    # If step 2 is wrapped in try/except and continues, step 3 records a
    # reclassification that stakeholders were never notified about.

# Better — transaction structure, but rollback failure is unhandled
def reclassify_document(doc_id, new_classification):
    old_classification = get_classification(doc_id)
    try:
        update_classification(doc_id, new_classification)
        notify_stakeholders(doc_id, new_classification)
        record_reclassification(doc_id, old_classification, new_classification)
    except Exception:
        rollback_classification(doc_id, old_classification)  # What if this fails?
        raise
    # If rollback_classification fails, the original exception is replaced
    # by the rollback exception. The caller sees a rollback error, not the
    # original failure. The document is reclassified, the rollback didn't
    # work, and the audit trail records neither the original failure nor
    # the failed rollback.

# Best — compensating actions with rollback failure handling
class ReclassificationFailed(Exception):
    """The operation failed and was successfully rolled back."""

class ReclassificationInconsistent(Exception):
    """The operation failed AND rollback failed — manual intervention required."""

def reclassify_document(doc_id, new_classification):
    old_classification = get_classification(doc_id)
    steps_completed = []
    try:
        update_classification(doc_id, new_classification)
        steps_completed.append("classification_updated")
        notify_stakeholders(doc_id, new_classification)
        steps_completed.append("stakeholders_notified")
        record_reclassification(doc_id, old_classification, new_classification)
        steps_completed.append("audit_recorded")
    except Exception as original_error:
        # Compensate in reverse order
        try:
            if "stakeholders_notified" in steps_completed:
                retract_notification(doc_id, reason="reclassification_rolled_back")
            if "classification_updated" in steps_completed:
                rollback_classification(doc_id, old_classification)
        except Exception as rollback_error:
            # Both the operation AND the rollback failed.
            # This is the worst case — system is in an inconsistent state.
            # Surface BOTH errors so the operator can intervene.
            raise ReclassificationInconsistent(
                f"Reclassification of {doc_id} failed AND rollback failed. "
                f"Original error: {original_error}. "
                f"Rollback error: {rollback_error}. "
                f"Steps completed before failure: {steps_completed}. "
                f"Manual intervention required."
            ) from original_error
        raise ReclassificationFailed(
            f"Reclassification of {doc_id} failed and was rolled back. "
            f"Original error: {original_error}. "
            f"Steps rolled back: {steps_completed}."
        ) from original_error
```

*The three layers illustrate a progression:* the bad version has no atomicity. The better version attempts rollback but loses information when rollback itself fails — the original exception is replaced by the rollback exception, and the caller cannot distinguish "failed and rolled back" from "failed and now inconsistent." The best version uses custom exceptions to surface both failure modes distinctly: `ReclassificationFailed` (safe — rolled back) vs `ReclassificationInconsistent` (unsafe — manual intervention required). This distinction is institutional knowledge — the system's policy for handling inconsistent state cannot be inferred from the code structure, and agents have no basis for generating it without explicit instruction.

**Why it's dangerous:** Partial completion creates inconsistent system state that is difficult to detect and correct. The system appears to have completed an operation, but some side effects are missing. In audit-critical contexts, this means the audit trail records an incomplete picture of what actually happened — some operations were performed but not all were recorded, or vice versa.

**Detection approach:** No existing tool detects this — it requires understanding which operations form a logical transaction. The companion specification maps ACF-R2 to WL-005 and Group 2 audit primacy enforcement, with Group 9 operation semantics (`@atomic`, `@compensatable`) addressing the transaction-context requirement (see companion documents).

WL-005's relevance to R2 is distinct from its R1 role: WL-005 fires on each individual audit-critical write inside a broad exception handler. For R1, this catches the single audit failure being swallowed. For R2, WL-005 provides a partial signal — when multiple audit-critical writes exist in the same broad handler, each individual write triggers WL-005 independently, and the collective pattern indicates a partial-completion risk. WL-005 alone does not detect the atomicity gap; Group 9's `@atomic` and `@compensatable` annotations address the broader requirement that multiple state-modifying operations occur within a transaction context. A semantic boundary enforcer could flag functions that contain multiple audit-write operations without a transaction context, but this requires project-specific annotation of which operations are audit-critical.

---

#### ACF-R3: Verification Displacement

**STRIDE:** Repudiation | **Risk:** High | **Detection:** Partial

**Description:** Agent-generated code displaces assurance — the system appears verified when the critical properties are unverified. The shared mechanism is task-frame reconstruction under context pressure (§2.4): the agent's task frame shifts from "implement and verify the real property" to "make the artefact look correct," and the displacement is visible only to someone who knows what the artefact was supposed to verify. Two sub-entries distinguish the variants by where the displacement hides and how it can be detected.

**Why agents produce this:** When agents operate under context pressure — long sessions, compacted history, multi-step plans — the task frame can shift from "implement and verify" to "make the tests pass" or "make the fix work." In the shifted frame, the agent resolves the problem by changing what problem it thinks it's solving. The agent is not suppressing an error — it has produced a locally reasonable solution to the wrong problem. Model providers are introducing mitigations that may reduce the incidence of this pattern — improved context-management tooling, checkpointing, plan persistence, context editing, and resumed runs that preserve transcript history. Individual manifestations of this failure may become less common, but the underlying mechanism — finite context under unbounded task complexity — is architectural rather than fully eliminable under current agentic architectures and workflows.

**Why it's dangerous:** Unlike ACF-R2 (partial completion), which leaves observable traces — inconsistent database state, missing audit records, downstream failures — verification displacement produces an artefact that looks complete and correct. Tests pass. Coverage is reported. The highest-impact instances are not the ones that look obviously artificial, but the ones that pass visual inspection because the names, structure, and local flow all look legitimate. Active supervision of the agent during generation would reduce the risk of verification displacement — but the core thesis of this paper is that as trust in agentic output increases, scrutiny decreases (§4.2). The teams most likely to catch verification displacement are those that already distrust agent-generated code; the teams most vulnerable are those whose experience with agents has been positive enough to stop checking. In high-stakes systems, displaced verification provides false assurance — the system appears verified when the critical properties are unverified. Of the failure modes in this taxonomy, verification displacement is the most direct observable manifestation of the generative mechanism described in §3.1 — context displaced by local statistical cues.

##### ACF-R3a: Verification Substitution

Tests that should verify real system behaviour are rewritten to verify mock or stub behaviour, displacing assurance from the actual integration to a simulation of it. The test suite reports full coverage and all tests pass, but the critical paths are no longer tested. A related sub-pattern: tests written against code already degraded by another ACF failure mode (e.g., a `.get()` default that fabricates data) verify the degraded behaviour as correct — the test passes because it asserts the fabricated default, not because the system works. Tests are particularly vulnerable because they are typically written or fixed last in a plan, precisely when context compression is most acute.

**Example:**

```python
# Original test — verifies real integration
def test_partner_sync():
    partner_api = PartnerAPI(url=TEST_PARTNER_URL)
    result = sync_partner_records(partner_api)
    assert result.synced_count > 0
    assert all(r.validated for r in result.records)

# After agent "fixes" failing test under context pressure.
# Note: every name is correct. The call site reads identically
# to a real integration test. The displacement is visible only
# by scrolling up to see how partner_api was constructed.
def test_partner_sync():
    partner_api = Mock()
    partner_api.get_records.return_value = [
        {"name": "Test Corp", "status": "active", "clearance": "baseline"}
    ]
    result = sync_partner_records(partner_api)
    assert result.synced_count == 1
    assert result.records[0].clearance == "baseline"
    # At the call site, this looks like a real integration test.
    # partner_api.get_records(...) reads the same whether partner_api
    # is a PartnerAPI or a Mock. The validation logic inside
    # sync_partner_records is never exercised because the mock
    # returns pre-validated data — but that is only apparent if
    # you inspect the type of partner_api, 8 lines above.
```

The displaced test is visually indistinguishable from a real test at the call site. The agent names everything correctly — `partner_api`, not `mock_partner_api` — because in its reconstructed task frame, the mock *is* the partner API. The call `partner_api.get_records()` reads identically whether `partner_api` is a `PartnerAPI` or a `Mock()`. The displacement is visible only by inspecting the provenance of the object: scrolling up to the constructor, checking a `setUp` method, or tracing a fixture in another file. This is precisely the kind of active verification that review volume pressure eliminates (§4.2).

**Detection approach:** The key detection problem is provenance, not surface syntax. At the call site, well-named mocks are visually indistinguishable from real objects: `partner_api.sync_records(validated_records)` reads like a genuine integration call unless the reviewer traces `partner_api` and `validated_records` back to their declarations and discovers that one or both are mocks, mock-wrapped fixtures, or ad hoc test objects that bypass the project's normal construction helpers. Review volume pressure specifically degrades this kind of provenance inspection.

On a large codebase, the failure is particularly insidious. Mature projects typically centralise test object construction in factories or shared helpers — not as convenience boilerplate, but because the factory encodes institutional knowledge about how to build a valid object with all the hard parts wired correctly. When an agent bypasses the factory and mocks the component it cannot reconstruct from first principles — say, a cryptographically signed packet — the test still reads like a test of signed-packet behaviour in a ten-line diff. The reviewer would need to stop and ask a second-order question — *why is this test not using the normal construction path?* — and that question is easy to skip when the diff is small, the names are right, and the assertions look plausible.

Heuristic indicators include: tests whose central objects are constructed outside the project's standard test helpers or factories; tests where the mock setup mirrors the code under test so closely that the test is effectively tautological (asserting that a function returns what you told it to return); tests that assert on mock return values rather than on system behaviour; and tests that exercise only the fallback path of code that should primarily exercise the real path. In extreme cases of context collapse, the entire test body may reduce to mock construction and assertions over mock attributes. Those cases are easier to spot, but they are diagnostically useful mainly because they reveal the same underlying mechanism in a less disguised form. Review practices that compare test coverage against the original implementation plan (rather than against the code as implemented) would catch this, but require the plan to be preserved and accessible.

##### ACF-R3b: Compensating Control Dependency

An upstream normalisation layer (e.g., a `deep_thaw()` call that converts frozen containers to plain dicts) masks downstream type-narrowness. The downstream code uses `isinstance(data, dict)` instead of `isinstance(data, Mapping)`, but passes all tests because the upstream layer guarantees the precondition. The code is *incidentally correct* — not because the type check is well-written, but because the compensating control ensures it never encounters the type it cannot handle. This fragility is invisible under normal operation and only surfaces when the compensating control is correctly removed during a structural improvement, at which point the downstream checks silently produce wrong results rather than failing loudly.

This variant only manifests under structural improvement — it actively punishes correctness. The characteristic user experience is delayed: a team removes a compensating control as part of a well-planned structural fix, the fix passes all tests, ships, and operates correctly — until weeks or months later, when a code path that previously ran through the removed normalisation encounters the type it can no longer handle. The failure presents as a regression in code that was not touched by the fix, producing the reaction "I thought we fixed all those." The fix *was* correct; the downstream code that silently depended on the compensator was not, and the dependency was invisible until the compensator was removed.

**Example:**

```python
# Before: deep_thaw() masks downstream type-narrowness.
# The isinstance(data, dict) check WORKS — but only because
# deep_thaw converts MappingProxyType to dict before this
# code ever sees it. The check is incidentally correct.
def record_call(self, frozen_payload):
    thawed = deep_thaw(frozen_payload)        # compensating control
    raw = RawCallPayload(data=thawed)         # re-freezes immediately
    usage = TokenUsage.from_dict(thawed.get("usage", {}))
    # ...

# In TokenUsage:
@classmethod
def from_dict(cls, data) -> "TokenUsage":
    if not isinstance(data, dict):            # narrow: misses MappingProxyType
        return cls.unknown()                  # silent wrong result
    # ... parse fields ...

# After: structural fix removes the compensating control.
# The isinstance(data, dict) check now FAILS silently —
# MappingProxyType is not dict, so from_dict returns unknown()
# for valid data. Tests still pass because test fixtures use
# plain dicts. The fragility was invisible while the thaw
# existed and only surfaced when it was correctly removed.
def record_call(self, frozen_payload):
    raw = RawCallPayload(data=frozen_payload)  # no thaw needed
    usage = TokenUsage.from_dict(frozen_payload.get("usage", {}))
    # TokenUsage.from_dict silently returns unknown() because
    # frozen_payload["usage"] is MappingProxyType, not dict.
```

**Detection approach:** The detection surface for R3b is different from and narrower than R3a. R3a leaves a visible smell — `Mock()` constructors, return-value setup, assertions on mock attributes — that an attentive reviewer can spot. R3b leaves no smell at all: `isinstance(data, dict)` is a reasonable-looking check, the tests pass legitimately because test fixtures use plain dicts, and the fragility is only visible to someone who knows the upstream normalisation existed and is tracking whether it was truly eliminated rather than relocated.

The fragility is only detectable by someone who (a) knows the upstream compensating control existed, (b) is tracking whether removing it exposed downstream assumptions, and (c) verifies the task against the specification rather than the test suite. In a multi-agent workflow, this means the orchestrating agent must hold the full plan in context and perform spec review rather than relying on CI green as a proxy for task completion. A standard CI pipeline would see passing tests and move on. In the observed incident (§8), the compensating control was a `deep_thaw()` call that converted frozen containers to plain dicts; the implementing agent caught the downstream `isinstance(dict)` dependency because the orchestrating agent's spec review compared the implementation against the plan rather than against the test results.

Detection is rated Partial for R3 overall because heuristic indicators exist and experienced practitioners can apply them, but no widely-deployed tool implements them. R3a is Partial in the conventional sense — heuristics exist (mock provenance inspection, factory bypass detection, tautological assertion patterns) and experienced practitioners can apply them. R3b arguably warrants a harder rating: the only reliable detection mechanism observed to date is an orchestrating agent or human reviewer comparing the implementation against the specification rather than the test results. Without that spec review gate, R3b has no detection surface — the code is syntactically reasonable, the tests pass legitimately, and the fragility is invisible until a future structural change exposes it.[^r3b-detection]

[^r3b-detection]: The R3b detection gap merits attention during framework review. "Partial" for R3 overall reflects R3a's heuristic detectability. R3b in isolation may be closer to "None (without spec review gate)" — the only reliable catch is a reviewer who holds the full plan in context and can recognise that "tests pass" does not mean "task complete." This is a meaningful distinction for organisations designing review processes: R3a can be caught by pattern-matching review tools; R3b requires a reviewer who understands the *intent* of the change, not just its *effect* on the test suite.

---

#### ACF-R5: Remediation-Induced Violation

**STRIDE:** Repudiation | **Risk:** High | **Detection:** None

**Description:** An agent tasked with fixing a known violation introduces a *different* violation in the fix itself. The remediation commit claims to resolve the original problem — and may genuinely do so — while introducing a new failure mode that the review process is structurally less likely to catch, because the reviewer's attention is anchored on the original violation. This is distinct from the "corrections don't stick" observation (§3, §8.3), which describes the *same* pattern recurring in new code. R5 describes a violation *in the fix itself*.

**Why agents produce this:** Remediation is a constrained task: "fix this specific violation." The agent focuses on eliminating the flagged pattern and does not step back to evaluate whether the replacement code preserves all properties the original code had — including properties not subject to the violation. The fix passes the check that caught the original violation, and the new violation is in a different category.

**Example (tautological assertion — pure R5):**

```python
# Before — flagged for using hasattr() (ACF-S3 violation)
assert hasattr(PluginRetryableError, 'retryable'), \
    "PluginRetryableError missing retryable attribute"

# Agent's "fix" — eliminated hasattr, introduced a tautology
assert PluginRetryableError.retryable is not None or True, \
    "PluginRetryableError missing retryable attribute"
# `X is not None or True` is ALWAYS true: when X is None,
# `None is not None` is False, but `False or True` is True.
# The assertion can never fail. The safety check is now decorative.
```

**Example (exception handler collapse — R5 introducing R1):**

```python
# Before — flagged for overly broad `except Exception` (ACF-R1)
try:
    query = template.render(query=extracted, row=row_data)
except UndefinedError as e:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})
except SecurityError as e:
    return QueryResult(error={"reason": "template_rendering_failed",
                              "error": f"Sandbox violation: {e}"})
except Exception as e:  # ← the flagged violation
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})

# Agent's "fix" — three new problems
try:
    query = template.render(query=extracted, row=row_data)
except (UndefinedError, SecurityError, OverflowError,
        ZeroDivisionError, ArithmeticError,  # parent of the previous two
        TypeError, ValueError) as e:
    return QueryResult(error={"reason": "template_rendering_failed", "error": str(e)})
# Problem 1: TypeError/ValueError are likely code bugs, not user errors.
#   Catching them softens a crash into "template rendering failed."
# Problem 2: SecurityError lost its "Sandbox violation:" prefix.
#   Audit trail classification signal destroyed.
# Problem 3: ArithmeticError is parent of OverflowError and ZeroDivisionError.
#   Listing all three is redundant — shallow hierarchy knowledge.
```

**Why it's dangerous:** Remediation carries an implicit assurance signal. A commit titled "fix: address tier model violations" tells the reviewer that this code has already been through one round of critical evaluation. The reviewer applies less scrutiny. The new violation is in a different cognitive frame. At organisational scale, the effect is that violation counts go down, assurance metrics improve, and the codebase accumulates a different class of debt that no metric is tracking.

**Detection approach:** No existing tool detects this. Detection requires comparing the properties of the replacement code against the properties of the original code — not just checking whether the flagged pattern is gone. A simpler process control: treat remediation commits with the same or higher scrutiny as new code, not lower.

---

#### ACF-I1: Verbose Error Response

**STRIDE:** Information Disclosure | **Risk:** Medium | **Detection:** Partial

**Description:** Error handlers expose internal system details (database schemas, file paths, query parameters, library versions) in error responses.

**Why agents produce this:** Agents produce "helpful" error messages that include full context. During development, this is valuable. In production, it's reconnaissance information. Agents don't distinguish between development and production error handling because the distinction is contextual, not syntactic. While verbose error responses are a known vulnerability class, agents produce them at a qualitatively different rate — every error handler the agent writes defaults to maximum context, across every service, in every project, on every commit. What was a sporadic review finding in human-authored code becomes a systematic pattern requiring explicit detection at scale.

**Example:**

```python
# Agent-generated — "helpful" error response with full context
except DatabaseError as e:
    return {
        "error": str(e),
        "query": sql,
        "connection": str(db_url),
    }
# Exposes database schema details, the exact query that failed,
# and the database connection string — all useful for an attacker.

# Correct — log internally, return opaque error to caller
except DatabaseError as e:
    logger.error(
        "Database query failed",
        extra={"query": sql, "connection": db_url, "error": str(e)},
    )
    return {"error": "Internal error", "reference": error_id}
# Details logged where operators can see them.
# Caller gets an opaque reference they can report for investigation.
```

**Why it's dangerous:** Verbose error responses provide attackers with reconnaissance information: database schemas reveal table and column names, file paths reveal deployment structure, query parameters reveal business logic, and library versions reveal known vulnerabilities. This information reduces the effort required to craft targeted attacks.

**Detection approach:** Existing scanners detect some cases (credential patterns, known sensitive variable names). Comprehensive detection requires understanding which variables contain sensitive information — a context-dependent judgement. AST-based rules can flag common patterns like `str(e)` in return values from exception handlers, but false positive rates vary by codebase. The companion specification maps ACF-I1 to Group 8 (secret handling) and Group 11 (data sensitivity), which trace sensitive data through function bodies to detect logging, error-message, and unprotected-persistence exposure (see companion documents).

---

*The two Denial of Service entries below are process threats rather than code patterns. They follow a different structure: "Process failure mode" replaces the code example, "Mitigation" replaces detection approach, and "Why this happens" replaces "Why agents produce this" — because the threat is the aggregate volume and review dynamics, not a pattern any single agent generates.*

#### ACF-D1: Finding Flood

**STRIDE:** Denial of Service | **Risk:** High | **Detection:** N/A (process threat)

**Description:** The volume of static analysis findings on agent-generated code overwhelms reviewers, causing them to rubber-stamp findings without evaluation.

**Why it's dangerous:** A review process that rubber-stamps findings rather than evaluating them provides false assurance — the organisation believes its security posture is maintained while real issues pass through undetected.

**Why this happens:** Agents produce code at volume, and if that code triggers many findings, the review queue grows faster than the review capacity. Reviewers under volume pressure shift from evaluating each finding to batch-dismissing them. The DoS is against the *review process*, not the system.

**Process failure mode:** The finding flood creates a vicious cycle:

1. Agent generates code that triggers many static analysis findings
2. Review queue grows faster than reviewers can process it
3. Reviewers shift from careful evaluation to batch dismissal
4. Suppression rates rise, but the metric is treated as "findings resolved" rather than "findings ignored"
5. Real security issues are dismissed alongside false positives
6. The review process provides a false sense of security — it appears functional but has lost its filtering capability

This is distinct from a code pattern because the individual findings may each be legitimate. The threat is the aggregate volume, not any single finding.

**Mitigation:**

- Finding caps per rule per file to prevent any single rule from flooding the queue
- Prioritised finding presentation (critical findings first, low-severity findings batched)
- Measured suppression rates as a health metric — rising suppression rates signal review degradation
- Periodic audit of suppressed findings to verify they were genuinely false positives

---

#### ACF-D2: Review Capacity Exhaustion

**STRIDE:** Denial of Service | **Risk:** High | **Detection:** N/A (process threat)

**Description:** Agent code generation velocity exceeds the organisation's capacity for security-focussed review, degrading review from active verification to passive scanning.

**Why it's dangerous:** The organisation believes it has code review coverage, but the review has lost its security assurance value — subtle issues that require careful analysis pass through undetected, and the gap between perceived and actual assurance widens silently.

**Why this happens:** Agents can generate plausible, convention-conforming code faster than review processes were designed to absorb (§1.2.1). Review capacity does not scale at the same rate. The review process becomes a bottleneck, and the organisational response is often to lower the review bar rather than reduce the generation rate.

**Process failure mode:** Review capacity exhaustion manifests as a gradual degradation:

1. Code generation velocity increases as agents are adopted more broadly
2. Review queue depth grows — reviewers fall behind
3. Organisational pressure to "keep up" leads to shorter review times per change
4. Review shifts from active verification ("is this correct and secure?") to passive scanning ("does this look roughly right?")
5. Subtle security issues that require careful analysis pass through undetected
6. The organisation believes it has code review coverage, but the review has lost its security assurance value

Unlike ACF-D1 (finding flood), which overwhelms the static analysis review process, ACF-D2 overwhelms the human code review process itself. Both are process threats, but ACF-D2 is broader — it affects all review, not just finding triage.

**Mitigation:**

- Automated pre-screening to reduce the human review burden — automated checks handle the mechanical verification, freeing reviewers for semantic analysis
- Volume-aware capacity planning — track the ratio of generated code to review capacity and flag when it exceeds sustainable levels (§1.2.1)
- Measured review effectiveness metrics — track not just "reviews completed" but "issues found per review" as a quality indicator (§9.2)
- Review scope boundaries — define which generated code requires full security review vs. which can be covered by automated checks alone

---

#### ACF-E1: Implicit Privilege Grant

**STRIDE:** Elevation of Privilege | **Risk:** Critical | **Detection:** None

**Description:** External system assertions are accepted without independent verification, granting privileges based on unvalidated claims.

**Why agents produce this:** Agents implement integration patterns by calling external APIs and acting on the response. The concept that the external system's response must be independently verified — that the response itself is untrusted — is not visible in the code structure. The code looks like a normal API call and response handling.

**Example:**

```python
# Bad — .get() with default silently handles missing field
partner_verification = partner_api.verify_identity(applicant_id)
if partner_verification.get("verified", False):
    grant_system_access(applicant_id, level="standard")
# Partner says "verified" → access granted.
# No independent check. No recording of the basis for the decision.
# If the partner system is compromised, every applicant is "verified."
# If the response is malformed and "verified" is missing, access is
# silently denied — but the malformation is never surfaced.

# Better — direct access; missing field raises KeyError
partner_verification = partner_api.verify_identity(applicant_id)
if not partner_verification["verified"]:
    raise VerificationFailed(
        f"Partner verification failed for {applicant_id}"
    )
# Missing "verified" field now crashes instead of silently defaulting.
# But still no independent check, no audit record, and KeyError is
# a poor diagnostic — it doesn't distinguish "malformed response"
# from "partner said no," and it can't be caught by policy-level
# exception handlers without also catching unrelated KeyErrors.

# Best — explicit validation, independent corroboration, audit record
partner_verification = partner_api.verify_identity(applicant_id)
try:
    partner_verified = partner_verification["verified"]
except KeyError:
    raise MalformedPartnerResponse(
        f"Partner response missing 'verified' field for {applicant_id} — "
        f"cannot determine verification status"
    )  # Custom exception: callers can catch MalformedPartnerResponse
    # specifically and apply a defined policy (quarantine, retry,
    # fall back to manual verification) without catching unrelated errors.
if not partner_verified:
    raise VerificationFailed(
        f"Partner verification failed for {applicant_id}"
    )
# Independent check against internal records
internal_record = identity_store.get_verified_identity(applicant_id)
if internal_record is None:
    raise VerificationFailed(
        f"No internal identity record for {applicant_id} — "
        f"partner assertion cannot be corroborated"
    )
record_access_decision(
    applicant_id,
    basis="partner_verified + internal_corroborated",
    partner_response=partner_verification,
)
grant_system_access(applicant_id, level="standard")
```

**Why it's dangerous:** The code looks like a normal API integration. The partner says "verified" and access is granted — no independent check, no recording of the basis for the decision. Once an external system's assertions are trusted directly, the security of the entire system depends on the security and *correct operation* of every external partner — not just against compromise, but against misconfiguration, bugs, and schema changes that the partner may not consider security incidents. Unlike traditional authentication failures, which produce visible events, implicit privilege grants create no signal that anything is wrong until the erroneous grants are acted upon.

Consider a grants management system that uses a partner eligibility verification service to determine whether organisations qualify to receive funding. The agent-generated integration calls the partner API and grants portal access based on the response — no independent check, no audit record of the corroboration basis. The partner says eligible; access is granted.

The partner verification service has a caching layer. A misconfiguration in the caching infrastructure causes it to return stale positive responses — `{"eligible": true}` — for all queries, regardless of actual eligibility status, for approximately 18 hours before the issue is detected and corrected. During the window, the grants management system processes 1,200 eligibility checks. All 1,200 receive `{"eligible": true}`. All 1,200 are granted portal access.

The partner notices the caching issue, corrects it, and issues an incident report. From their perspective, it is a platform reliability incident — no data was lost, the caching layer returned stale data for a bounded window, the issue was resolved.

From the grants management system's perspective, 1,200 organisations were granted portal access on the basis of partner assertions that may or may not have reflected actual eligibility. Some number of those organisations were legitimately eligible and would have received access anyway. Some number were not eligible and received access erroneously. The system has no way to determine which is which. The audit trail for each of the 1,200 grants records: `access_granted=true, basis="partner_verified"`. That entry is identical for a legitimately eligible organisation and one that was erroneously verified. There is no record of independent corroboration, because no independent corroboration was performed. Incident response cannot reconstruct the legitimate grants from the erroneous ones without contacting all 1,200 organisations and performing manual re-verification — an expensive, time-consuming process that the partner's incident report does not trigger, because from the partner's perspective the incident was a platform reliability issue, not a security event.

Now extend the scenario operationally. Some of the organisations that received erroneous portal access used it — they submitted grant applications, viewed funding criteria, downloaded programme materials. None of those actions required elevated access — portal access is only the first step in a multi-stage process. But portal access was the gate, and the gate was open for 18 hours on the basis of stale partner assertions. By the time the misconfiguration is discovered, the grants team is reviewing 47 applications from organisations that may or may not have been eligible to apply. The partner's incident report gives them a time window but not a list of affected organisations, because the partner's system does not record which queries were served stale data.

**The unknowability consequence is the same shape as ACF-R1's.** The audit trail records what the system did — `basis="partner_verified"` for all 1,200 grants — but it does not record whether the partner's assertion was valid at the time it was made. An independently corroborated grant would have recorded `basis="partner_verified + internal_corroborated"` with a reference to the internal eligibility record that was checked. That distinction is exactly what is missing. The system is in the same position as the SIEM-less authentication system in ACF-R1: the records are present, they are internally consistent, and they are forensically insufficient for the question that now needs to be answered.

**The transitive trust property extends the blast radius.** The code that accepted the partner's assertion without independent verification was written once, in a single function. But every access decision downstream of that function now depends on the partner's correctness. If the grants management system feeds downstream systems — reporting dashboards, compliance records, programme performance metrics — those systems inherit the contaminated grants data as authoritative input.

Correcting the access grants does not retroactively correct the downstream records generated on the basis of them. A programme report produced during the window may record 1,200 verified organisations when the correct number was lower. That report may already be distributed. The error in the source data propagates to every document that cited it. This is not a chain of explicit trust grants but a chain of *assumptions* — each system in the chain assumed the system that fed it had validated its inputs. None of them had. They were all downstream of the single point where the partner's unvalidated assertion entered the trusted data flow.

**Detection approach:** Taint analysis — the return value of an `@external_boundary` function is used as a predicate in an access control decision without passing through validation. Requires both boundary annotation and understanding of which operations are access-control-relevant. This taint analysis capability is specified in the companion specification as tier-flow enforcement between declared boundaries (see companion documents).

---

#### ACF-E2: Unvalidated Delegation

**STRIDE:** Elevation of Privilege | **Risk:** High | **Detection:** Partial

**Description:** User-supplied parameters are used directly in privileged operations (database queries, file access, system commands) without validation or restriction.

**Why agents produce this:** The pattern `db.query(Model).filter_by(**user_params)` is concise and idiomatic. Agents produce it because it is the shortest path from input to query. The concept that user parameters must be restricted to an allowlist of permitted fields is a security requirement, not a language requirement.

**Example:**

```python
# Agent-generated — concise, idiomatic, insecure
def search_records(user_query: dict):
    return db.query(Record).filter_by(**user_query)
# User can filter on internal fields: is_deleted, internal_score,
# admin_notes — fields that should not be queryable.

# Correct — restrict to allowed fields
ALLOWED_SEARCH_FIELDS = frozenset({"name", "status", "created_date"})

def search_records(user_query: dict):
    filtered = {
        k: v for k, v in user_query.items()
        if k in ALLOWED_SEARCH_FIELDS
    }
    return db.query(Record).filter_by(**filtered)
```

**Why it's dangerous:** Unvalidated delegation allows users to access data or operations they should not have access to. By passing arbitrary parameters to a privileged operation, a user can filter on internal fields (exposing hidden data), modify fields that should be read-only, or access records that should be restricted. The delegation effectively grants the user the same privilege level as the database query itself.

**Process-layer dimension.** The same structural pattern extends beyond generated code to the development process itself. Agentic coding tools inherit the operator's system credentials and execute privileged operations — shell commands, package installation, git push, CI configuration changes — without the operator constraining the scope of permissible operations. This is a condition by design, and the default posture of most agentic frameworks is to grant broad execution authority. The mitigation is the same principle applied at the process layer: restrict delegation to an allowlist of permitted operations, just as the code-level mitigation restricts query parameters to an allowlist of permitted fields.

**Detection approach:** SQL injection scanners catch some cases (especially string interpolation into SQL). Parameter delegation via `**kwargs` unpacking into ORM queries is less consistently detected. Semantic detection requires understanding which operations are privileged and which parameters are user-controlled. Taint analysis can trace user input to privileged operations, but distinguishing validated from unvalidated parameters requires annotation of validation boundaries. The companion specification maps ACF-E2 to taint analysis combined with Group 14 (access and attribution), which verifies that authorisation checks precede privileged operations (see companion documents).

---

### Detection Capability Summary

| Detection Level | Count | Failure IDs | Implication |
|----------------|-------|-------------|-------------|
| **None** (no existing tool detects it) | 4 | ACF-T1, ACF-R2, ACF-R5, ACF-E1 | These require new tooling or new review practices |
| **Partial** (some tools catch some cases) | 9 | ACF-S1, ACF-S2, ACF-S3, ACF-T2, ACF-T3, ACF-R1, ACF-R3[^r3b-summary], ACF-I1, ACF-E2 | Existing tools provide incomplete coverage; augmentation needed |
| **N/A** (process threat, not code pattern) | 2 | ACF-D1, ACF-D2 | Requires process controls, not technical controls |

Of the fifteen core failure modes, thirteen are undetected or only partially detected by existing tools — including all four with no tool coverage at all, both Critical-rated entries among them. This is the gap this paper identifies.

[^r3b-summary]: ACF-R3's "Partial" composite rating reflects R3a (Verification Substitution), which has identifiable detection signatures. R3b (Compensating Control Dependency) has no practical detection surface without a specification review gate. If R3b were rated independently, the "None" count would be 5 and the "Partial" count would be 8.

---

### Provisional Candidate Modes

The following five entries are documented separately from the core taxonomy because they meet a lower evidentiary threshold. They are included because the patterns are consistent and practically significant, but they are presented for community discussion and validation rather than as settled taxonomic classes.

ACF-S4 (Type Annotation Erosion) and ACF-S5 (Type Structure Avoidance) were identified through external consultation feedback and describe complementary meta-failures: S4 targets the erosion of *existing* type safety infrastructure, while S5 targets the failure to create type structure in the first place. Both degrade the detection capability for other taxonomy entries, but through opposite mechanisms — S4 removes safety nets that are already in place, S5 ensures they are never constructed.

ACF-R4 was identified in the original case study; it concerns context-pressure failures in agentic workflows — specifically, the assumption that deferred findings will survive session handovers. ACF-R4's generative mechanism is described in §2.4(a).

ACF-T4 and ACF-R6 were identified through a structured audit of agent-generated commits against project-specific semantic rules; they describe failures that occur during *maintenance-phase work* (refactoring, remediation, auditing, triage) rather than during initial code generation. ACF-T4 (Safety Guard Erosion) is plausible but narrowly scoped to precondition guards on untested paths; without that scoping it would overlap with generic refactoring damage. ACF-R6 (Scope-Limited Triage) describes a workflow-level pattern (agent triage behaviour during sessions) rather than a code-level pattern, and requires further corroboration across a broader set of agentic workflows.

| ID | Name | STRIDE | Risk | Existing Detection |
|----|------|--------|------|-------------------|
| ACF-S4 | Type Annotation Erosion | Spoofing | High | Partial |
| ACF-S5 | Type Structure Avoidance | Spoofing | High | Partial |
| ACF-R4 | Context Handover Assumption | Repudiation | Medium | Partial |
| ACF-T4 | Safety Guard Erosion | Tampering | Medium | None |
| ACF-R6 | Scope-Limited Triage | Repudiation | Medium | None |

#### ACF-S4: Type Annotation Erosion

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

**Description:** Type annotations are weakened or suppressed — `# type: ignore` comments are added, typed parameters are widened to `Any`, or `cast()` calls are inserted — to resolve type errors rather than fixing the underlying type mismatch. The code presents itself as type-safe (mypy reports no errors) while the type safety that detection tools depend on has been silently removed.

**Why agents produce this:** When an agent encounters a type error — a parameter mismatch, an incompatible return type, a missing attribute on a typed object — the correct fix requires understanding the type hierarchy and modifying the code to satisfy the constraint. The expedient fix is to suppress the constraint: add `# type: ignore`, widen the parameter to `Any`, or wrap the expression in `cast()`. Training data contains both approaches, but the suppression pattern is shorter, locally complete, and resolves the immediate error without requiring changes elsewhere. Agents optimising for local coherence and minimal diff size will reach for suppression. This is structurally similar to ACF-T4 (Safety Guard Erosion) — both remove a safety mechanism rather than satisfying it — but S4 targets the *type system* specifically, which is the detection substrate for other taxonomy entries.

**Example:**

```python
# Agent encounters a type error on assessment.risk_rating
# (risk_rating is Optional[int], but the comparison requires int)

# Suppression approach — resolves the error, degrades detection
def check_threshold(assessment: Any):  # was: Assessment
    # type: ignore[union-attr]
    if assessment.risk_rating > 5:
        escalate(assessment)
# mypy is now silent on this function. If a future change removes
# risk_rating from Assessment, mypy will not catch it — because
# the parameter is Any. ACF-S2 (spurious field access) is
# now undetectable in this function.

# Correct approach — satisfies the type constraint
def check_threshold(assessment: Assessment):
    if assessment.risk_rating is None:
        raise MissingRiskRating(assessment.id)
    if assessment.risk_rating > 5:
        escalate(assessment)
# mypy validates field access. If risk_rating is removed or
# renamed, mypy catches it. The None case is handled explicitly.
```

**Why it's dangerous:** This is a meta-failure — it degrades the detection capability for other taxonomy entries. ACF-S2 (Spurious Field Access) is detectable by mypy *if the object is fully annotated*. ACF-S3 (Structural Identity Spoofing) is detectable by `isinstance` checks *if the type hierarchy is maintained*. When an agent widens a parameter to `Any` or adds `# type: ignore`, those detection mechanisms are disabled for the affected code path. The erosion is cumulative: each suppression is locally minor, but across a codebase they create expanding blind spots where the type checker — which is the first line of detection for several ACF entries — can no longer see. Unlike a missing annotation (which is visible as an untyped parameter), an `Any` annotation or a `# type: ignore` comment *claims* type safety while providing none. The code appears to participate in the type system while actually opting out of it. This is spoofing in the STRIDE sense: the code misrepresents a safety property.

**Detection approach:** Flag `# type: ignore` comments, parameters typed as `Any` (especially where a narrower type was previously used), and `cast()` calls in agent-generated diffs. The structural pattern is straightforward and existing tools can identify it — mypy itself reports the count of `type: ignore` directives, and ruff/flake8 plugins can flag `Any` usage. Detection is rated Partial because identifying the *suppression* is easy, but distinguishing legitimate uses (genuinely dynamic code, third-party library interop) from erosion requires context. In codebases with a strict `disallow_any_explicit = True` mypy configuration, the detection is effectively Good — but few codebases enforce this. A useful proxy metric: track the `# type: ignore` count over time in agent-generated commits. A rising count is a signal that type safety is being traded for compilation success.

---

#### ACF-S5: Type Structure Avoidance

**STRIDE:** Spoofing | **Risk:** High | **Detection:** Partial

**Description:** Agent-generated code systematically avoids creating typed data structures — using `dict`, `Map<String, Object>`, `Record<string, any>`, or equivalent untyped containers where a domain-specific type (dataclass, interface, schema model) would be appropriate. The pattern has two faces: (1) function parameters and variables default to `str`, `Any`, `Object`, or equivalent top types, so type information is absent from the start; and (2) data from external APIs is consumed as raw untyped containers (`response.json()` into a bare `dict`, `JsonNode`, or `any`) rather than being hydrated into a validated model. The code compiles, runs, and passes linting — but the type system has nothing to check because no type structure was ever created.

**Why agents produce this:** Typed structures require understanding the domain schema: which fields exist, which are required, what their types and constraints are, and how they relate to other structures. An untyped container requires none of this — `dict[str, Any]` accepts anything, compiles immediately, and never produces a type error. Training data contains both approaches, but the untyped path is shorter, requires fewer coordinated changes (no model definition, no import, no migration), and never blocks the agent with a type error it would need to resolve. For external API data, the problem is amplified: the agent would need to read API documentation, infer a schema, and create a model — or it can call `.json()` and index into the result with string keys. The path of least resistance produces working code with zero type safety. Unlike ACF-S4 (Type Annotation Erosion), where existing type infrastructure is degraded, S5 means the infrastructure was never built — there is nothing to erode.

**Example (Python):**

```python
# Agent-generated — external API consumed as bare dict
def sync_partner_clearances(api_url: str, auth: str) -> dict:
    response = requests.get(f"{api_url}/clearances", headers={"Authorization": auth})
    data = response.json()  # dict[str, Any] — no schema, no validation
    results = {}
    for item in data["records"]:
        # String-keyed access — typos are runtime errors, not type errors
        results[item["entity_id"]] = item["clearance_level"]
    return results

# Correct — external data hydrated into a validated model
class PartnerClearance(BaseModel):
    entity_id: str
    clearance_level: ClearanceLevel  # enum — constrained values
    issued_date: date
    expiry_date: date | None

class ClearanceResponse(BaseModel):
    records: list[PartnerClearance]

def sync_partner_clearances(api_url: str, auth: str) -> dict[str, ClearanceLevel]:
    response = requests.get(f"{api_url}/clearances", headers={"Authorization": auth})
    data = ClearanceResponse.model_validate(response.json())
    # Type checker knows every field. Typos caught at edit time.
    # Invalid clearance_level values rejected at parse time.
    return {record.entity_id: record.clearance_level for record in data.records}
```

**Example (TypeScript):**

```typescript
// Agent-generated — API response typed as any
async function getPartnerClearances(apiUrl: string): Promise<any> {
    const resp = await fetch(`${apiUrl}/clearances`);
    const data = await resp.json(); // any — no type narrowing
    return data.records.map((r: any) => ({
        id: r.entity_id,
        level: r.clearance_level  // typo in field name? No error.
    }));
}

// Correct — typed interface with runtime validation
interface PartnerClearance {
    entity_id: string;
    clearance_level: ClearanceLevel;
    issued_date: string;
    expiry_date: string | null;
}

async function getPartnerClearances(apiUrl: string): Promise<PartnerClearance[]> {
    const resp = await fetch(`${apiUrl}/clearances`);
    const data: unknown = await resp.json();
    const parsed = ClearanceResponseSchema.parse(data); // Zod — runtime validation
    return parsed.records;
    // TypeScript knows the shape. Field access is checked at compile time.
}
```

**Why it's dangerous:** This is a detection-surface suppressor — a meta-failure that degrades the detection capability for multiple other taxonomy entries. ACF-S2 (Spurious Field Access) is detectable by type checkers *if the object has a declared field set*; when the object is `dict[str, Any]`, every field access is valid by definition. ACF-T1 (Authority Tier Conflation) becomes structurally guaranteed: a `dict` from an external API and a `dict` from a validated internal query are the same type — there is no type-level distinction for a tool or reviewer to check. ACF-R2 (Partial Completion) is harder to detect because you cannot determine what fields are missing from a container that declares no required fields. Unlike ACF-S4, which removes safety nets that were already in place, S5 ensures the safety nets are never constructed — the code never participates in the type system at all. The spoofing in the STRIDE sense is that the code *appears* to handle structured data — it assigns variables, passes arguments, indexes into results — while the type system is entirely hollow. The effect is cumulative: as more functions accept and return untyped containers, typed islands in the codebase become disconnected, and the type checker's effective coverage shrinks even though no annotation was removed.

**Detection approach:** Flag functions whose parameters or return types use `dict[str, Any]`, `Dict[str, object]`, `Map<String, Object>`, `Record<string, any>`, `JsonNode`, or equivalent untyped containers — particularly where the function interacts with external data sources (HTTP clients, database results, message queue payloads). Flag API client code where `.json()`, `JSON.parse()`, or equivalent deserialisation calls are not immediately followed by schema validation or model hydration. Detection is rated Partial because the surface patterns are identifiable by lint rules, but distinguishing legitimate uses of untyped containers (genuinely dynamic data, configuration blobs, serialisation boundaries) from type structure avoidance requires context. A useful heuristic: in a well-typed codebase, untyped containers should appear only at serialisation boundaries and should be immediately narrowed; if they propagate through function signatures, the type system's coverage is eroding. Codebases with strict type-checking configurations (`disallow_any_explicit` in mypy, `strict` mode in TypeScript, `@NonNullApi` in Java) will catch many instances, but the detection depends on the strictness being configured — and agents generating new modules may not inherit the project's strictness settings. This is a practical gap worth monitoring: when an agent creates a new file, it typically does not pick up per-directory mypy overrides, `tsconfig.json` strict-mode inheritance, or equivalent project-level type strictness. The result is that new agent-generated modules start with weaker type checking than the surrounding codebase, creating a detection gap precisely where the newest (and least-reviewed) code lives. Organisations should ensure that project-level type strictness is configured to apply by default to new files, not just existing ones.

---

#### ACF-R4: Context Handover Assumption

**STRIDE:** Repudiation | **Risk:** Medium | **Detection:** Partial

**Description:** An agent produces an artefact — a review, a specification, a plan, or a set of recommendations — that defers actions to a future session or a different agent, implicitly assuming the consumer will have access to the producing agent's context. The artefact reads as actionable, but it is incomplete for its actual delivery path because required context remains in the producing session rather than in the artefact handed to the consumer. In agentic workflows, handover between sessions is not optional — reviewing agents hand off to implementing agents, planning agents hand off to coding agents, specification agents hand off to test-writing agents. Each handover crosses a context boundary, and the workflow cannot assume the producing agent has correctly modelled what the consumer will or will not see. The STRIDE fit is Repudiation: the handover artefact cannot be relied upon as a complete record of findings required by the next stage. Risk rises in workflows where handover artefacts are reviewed only once or where later-stage review is materially lighter — common in government specification review processes where the whole point of pre-implementation review is to avoid a second pass.

**Why agents produce this:** The workflow provides no basis to assume the producing agent has correctly modelled the information boundary between its session and the next. Within a session, deferred actions are reasonable — "I'll address this in the next function" works because the agent retains context. The same reasoning pattern applied *across* session boundaries produces undeliverable recommendations, because the agent does not distinguish between "defer within my session" and "defer to a session that cannot see my reasoning." Critically, this assumption is made implicitly — the agent does not produce a visible "I assume the implementer will have my context" step. It simply acts on that assumption, and the consequence (deferred, undeliverable actions) is the only observable signal.

**Example:**

A reviewing agent produces specification-level findings:

```
Blocking: ctx.fingerprint_key is a spurious symbol.
  Fix: Replace with get_fingerprint_key() from security module.

High: on_no_results: continue enables silent semantic degradation.
  Fix in spec before implementation.

Medium: HTTP 401 classified as non-retryable (could be transient token expiry).
  Fix during implementation.
```

The blocking and high-priority fixes are specified inline — actionable regardless of consumer context. The medium-priority items are deferred to "implementation" — but the implementing agent will start a fresh session with the specification as input, not the review. Unless the review findings are written *into* the specification, the deferred items are silently dropped. The reviewing agent has produced a complete-looking triage that is incomplete for its actual delivery path.

**Why it's dangerous:** An important structural property distinguishes ACF-R4 from the other failure modes: it is naturally self-correcting under agentic review. If a reviewing agent's deferred findings are lost at the handover boundary and the implementing agent reproduces the same problems in code, a second review pass will generally catch the same issues — the reviewing agent's analytical frames do not depend on the first review's context. In workflows where review runs on every artefact, ACF-R4 is primarily an efficiency failure caught by the next cycle. The danger concentrates in workflows where review is run only once or where subsequent review is lighter. With that calibration: the output looks like a competent, prioritised review. A human reading it accumulates context across the conversation and can carry the deferred items forward — the human is the context bridge. An implementing agent given only the specification will reproduce the exact patterns the review flagged, because the specification still contains them and the review findings are not in the implementing agent's context. The failure is invisible at the review stage — the review *is* correct — and only manifests when the implementation proceeds without the deferred findings.

This is particularly consequential in multi-agent workflows that are becoming standard practice: a planning agent drafts a specification, a reviewing agent evaluates it, an implementing agent builds it, a testing agent verifies it. Each handover is a context boundary. Any finding, caveat, or design decision that lives in one agent's session but is not written into the artefact that crosses the boundary is lost — not forgotten, but never transmitted. The more handovers in the workflow, the more context boundaries exist, and the more opportunities for this failure to silently drop information that a human workflow participant would have carried forward.

**Detection approach:** Detection is rated Partial because the surface pattern is identifiable — deferred-action language in agent-produced artefacts — but the semantic question (whether the deferral target actually has access to the finding) requires understanding the workflow's session topology. Heuristic indicators: recommendations that use future-tense deferral ("the implementer should," "address during," "fix in the next phase") without embedding the fix in the artefact the consumer will actually read; review findings triaged into priority tiers where lower-priority items are expected to survive by context transfer rather than by document modification; and plans that reference earlier-session findings by description rather than by embedding. The structural mitigation is to require that every handover artefact be self-contained: if information matters for the next session, it must be in the document, not in the conversation.

---

#### ACF-T4: Safety Guard Erosion

**STRIDE:** Tampering | **Risk:** Medium | **Detection:** None

**Description:** Existing precondition guards — assertions, defensive raises, invariant checks — are removed or weakened during agent-performed refactoring. The specific failure shape: guards that protect preconditions on code paths *not currently exercised by the test suite*. The assertion that is "obviously redundant" because the current code always satisfies it exists to catch future code paths that do not — initialisation reordering, new construction paths, subclass overrides. The agent cannot model future modifications and removes the guard as dead code.

**Why agents produce this:** Agents optimise for the local coherence of the code they are editing. An assertion checking `self._client is not None` looks redundant when the agent can see that `_client` is assigned in `connect()`, called in `__enter__()`. But the assertion exists to catch a future code path that calls `_paginate()` before `connect()` completes. Training data reinforces this: "remove dead code," "simplify assertions," "trust the type system" are sound principles for human developers who can evaluate future-regression risk. Agents apply them without that evaluation.

**Example:**

```python
# Before refactoring — assertion guards a precondition
class DataverseSource:
    def _paginate(self):
        assert self._client is not None, "pagination called before connect()"
        # ... pagination logic

# After agent refactoring — assertion removed as "unnecessary"
class DataverseSource:
    def _paginate(self):
        # Agent: _client assigned in connect(), called in __enter__().
        # "Obviously not None here." Guard removed.
        # A future code path that calls _paginate before connect()
        # will get a confusing NoneType error instead of the assertion.
```

**Why it's dangerous:** Safety guards are typically added in response to a past incident or an experienced developer's understanding of what can go wrong. Removing them silently reverses institutional learning. This is a maintenance-phase failure — it appears during refactoring, not during initial code generation, and targets a gap in the core taxonomy's coverage. A related pattern — not removal of existing guards but failure to *adopt* established conventions in new code — produces the same outcome through a different path. In the case study project, peer checkpoint modules established a rigorous deserialisation pattern (set-based required-field checks, `isinstance` type guards, `AuditIntegrityError` on any anomaly). A later module written by the same agent defaulted to `int()`/`str()` coercion instead — the statistically common pattern from training data, not the project convention. The peer modules were available as examples. The agent did not consult them. Unless CI enforces the convention, later additions drift from it, and the drift is invisible because the new code looks correct in isolation.

**Detection approach:** No existing tool detects this. Structural detection is feasible: flag removed `assert` statements and `if ... raise` guard patterns in agent-generated diffs, but only on code paths not covered by the current test suite. This scoping is critical — flagging all removed guards would produce unacceptable noise. The related convention-drift pattern (new code not adopting established guards) is harder to detect because there is no before/after diff to compare — the guard was never present. Detection would require a convention-expectation model that specifies which patterns should appear in which contexts, then flags their absence in new code.

---

#### ACF-R6: Scope-Limited Triage

**STRIDE:** Repudiation | **Risk:** Medium | **Detection:** None

*Note: This entry describes a workflow-level pattern (agent triage behaviour during sessions) rather than a code-level pattern, and is derived from session transcript analysis rather than code artefact inspection. It requires further corroboration across a broader set of agentic workflows before it can be considered a settled taxonomic class.*

**Description:** An agent encounters evidence of a problem — a failing test, a warning, a deprecation, a TODO with safety implications — and classifies it as out of scope. The agent narrates the triage decision ("pre-existing failure, unrelated to our changes"), moves on, and the problem becomes *less* visible than it was before the agent encountered it. The core failure is not that the agent ignores the problem — it is that the agent makes a triage decision that should be the human's to make, presented as a factual observation rather than a judgement call.

**Why agents produce this:** Agentic workflows are structured around task completion. Evidence that falls outside the defined scope is a distraction from task completion. Training data reinforces this: development workflows routinely triage unrelated failures as "known issues" to maintain focus. A human developer who triages a failing test as "not mine" has institutional context about whether the test matters, who owns it, and whether it has been triaged before. The agent has none of this context and substitutes confidence for knowledge.

**Example (agent session transcript):**

```
● Bash(pytest tests/ -x -q 2>&1 | tail -20)
  ⎿  FAILED tests/unit/plugins/llm/test_llm_config.py::test_reserved_suffix_warns
     1 failed, 847 passed

● Good — the failing test is in test_llm_config.py which we didn't
  touch. Let me confirm it fails on the unchanged code too.

● Bash(git stash && pytest tests/.../test_llm_config.py -x -q)
  ⎿  FAILED

● Pre-existing failure, unrelated to our changes.
```

**Why it's dangerous:** The STRIDE mapping is classical Repudiation: the agent's triage decision is an unauditable action — the agent made a judgement that affected what information the human received, that judgement is not recorded in any persistent artefact, and it cannot be reconstructed or challenged after the fact. In agentic workflows with multiple sessions over days or weeks, scope-limited triage creates an accumulated tenure problem: each session encounters the pre-existing failure, confirms it was already failing, and moves on. The failure is surfaced repeatedly, triaged repeatedly, and addressed never — because every session correctly determines it is "not my problem." Nobody is negligent. The failure accumulates anyway. In contracted development, an agent triaging a pre-existing defect as out-of-scope is making a contractual decision that the contracting agency might disagree with.

**Detection approach:** No code-level tool detects this — it is a workflow behaviour. Detection requires transcript-level analysis: flag sessions that encounter test failures and do not surface them for human decision, and track which failures accumulate tenure across multiple sessions.

---

[^cross-language-analogues]: ACF-S1: `.get()` with defaults — other languages have analogues like `Optional.orElse()` in Java or `??` in C#. ACF-S2: `getattr()` with defaults — Python-specific, though dynamic languages like Ruby have `send`/`respond_to?`. ACF-S3: `hasattr()` as capability gate — Python-specific surface form, though the underlying failure applies to any language with duck typing or structural typing; Ruby's `respond_to?`, Go's interface satisfaction, and TypeScript's structural type compatibility are analogues. ACF-S4: `# type: ignore` and `Any` widening — Python-specific surface form; analogues include `@SuppressWarnings("unchecked")` in Java, `// @ts-ignore` or `as any` in TypeScript, and `#pragma warning disable` in C#. The underlying failure (suppressing the type checker rather than satisfying it) is language-general. ACF-S5: language-general. Python uses `dict[str, Any]`, TypeScript uses `any` / `Record<string, any>`, Java uses `Map<String, Object>` / `JsonNode`, C# uses `Dictionary<string, object>` / `dynamic`, Go uses `map[string]any`. The surface form differs; the failure mode is the same. Arguably most acute in languages with opt-in type systems (Python, TypeScript, PHP) where the untyped path is the default.

[^risk-rating-scale]: **Critical** — silent compromise of access control or trust boundaries; high likelihood of agent generation; no existing detection. **High** — data integrity, audit trail, or availability impact; moderate-to-high likelihood of agent generation. **Medium** — exploitable under specific conditions or with limited blast radius. **Low** — detectable by existing tools with minimal residual risk.

### Taxonomy Extension Mechanism

This taxonomy is presented as a starting point, not a closed set. The generative conditions described in §2 and §3 will produce failure modes not yet observed. The provisional candidates above (ACF-S4, ACF-S5, ACF-T4, ACF-R4, ACF-R6) illustrate the expected path from observation to inclusion. ACF-S4 and ACF-S5 demonstrate a second submission pathway — external consultation feedback identifying a gap in the existing taxonomy. Notably, ACF-T3, ACF-T4, ACF-R5, and ACF-R6 were identified through maintenance-phase work — refactoring, remediation, auditing, and triage — rather than through initial code generation, suggesting that the taxonomy's coverage should explicitly encompass the full software lifecycle, not only greenfield authoring.

**Criteria for new entries.** A candidate ACF entry should meet four conditions: (1) a reproducible code-level or process-level pattern, with at least one worked example; (2) a STRIDE mapping that identifies the threat category; (3) a risk rating using the scale defined in this appendix; and (4) an assessment of existing detection capability. Entries that describe known vulnerability classes should document why agentic generation changes the management burden (volume, systematicity, or detection difficulty) rather than simply cataloguing a known class.

**Submission pathway.** Until a formal maintenance process for the taxonomy is established, candidate entries can be submitted through the consultation process accompanying this paper. Submissions should follow the entry structure used in this appendix: description, generative mechanism, worked example, risk assessment, and detection approach. The authors welcome submissions from practitioners, researchers, and tool vendors — particularly entries backed by empirical observation from projects with detection capability in place.

**Detection gap summary.** Of the fifteen core failure modes, thirteen are undetected or only partially detected by existing tools — including all four with no tool coverage at all, both Critical-rated entries among them. For provisional candidates, 2 of 5 have no detection and 3 have partial detection. The full table appears after the core entries and before the provisional candidates.

**Versioning.** New entries should use the next available number within the appropriate STRIDE category (e.g., the next Spoofing entry would be ACF-S6, the next Tampering entry ACF-T5). Provisional entries retain their provisional status until they meet the full evidentiary threshold described above. Entries may be deprecated if model improvements or tool coverage render them obsolete — but deprecation should be evidenced, not assumed.

### Related Entries and Distinguishing Criteria

Several pairs of entries describe adjacent failure modes. The distinguishing criteria below help reviewers and tool builders classify findings correctly.

**ACF-S1 vs ACF-T2:** S1 fabricates a value where none exists (the field is missing); T2 silently coerces a value that does exist into a different type or representation. S1 invents data; T2 transforms it. Both produce wrong values, but S1 is detectable by checking for default arguments on security-sensitive fields, while T2 requires tracing type coercion across operations.

**ACF-T1 vs ACF-E1:** T1 is a provenance failure — external data crosses into trusted processing without passing a validation boundary. E1 is a decision failure — privileges or access are granted on the strength of unvalidated assertions or data. T1 asks "did this data earn trusted status?"; E1 asks "did this claim improperly trigger a privileged action?"

**ACF-T2 vs ACF-T3:** T2 silently coerces a *type*; T3 silently parses *prose as structure*. Both produce values that look correct today and silently degrade when the source changes, but the mechanisms differ — T2 converts data, T3 fabricates structure from text.

**ACF-R1 vs ACF-R2:** R1 destroys auditability by swallowing or suppressing failures that should be recorded or propagated. R2 destroys atomicity by allowing a multi-step operation to complete partially without rollback or compensating action. R1 corrupts the record of what happened; R2 corrupts the state that resulted.

**ACF-R3 vs ACF-R5:** R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.

**ACF-D1 vs ACF-D2:** D1 is an upstream cause — agents generate a high volume of findings that flood the review pipeline. D2 is the downstream effect — sustained volume degrades human review quality through habituation and fatigue. D1 can be addressed with precision-gated tooling; D2 requires capacity planning and review effectiveness measurement.

**ACF-E1 vs ACF-S3:** E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*.

**ACF-S4 vs ACF-S2:** S4 degrades the detection substrate for S2. S2 is a spurious field access masked by `getattr()` with a default — detectable by mypy *if the object is typed*. S4 widens the object to `Any` or adds `# type: ignore`, making mypy silent. S2 is a data-level failure (wrong field); S4 is a meta-level failure (detection disabled).

**ACF-S4 vs ACF-S5:** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.

**ACF-S5 vs ACF-T1:** S5 is a representational failure — external and internal data are both reduced to untyped containers, so downstream code cannot distinguish them at the type level. T1 is the trust-boundary failure that results when such data crosses into trusted processing without validation. S5 makes T1 harder to detect; T1 is the semantic violation itself.

**ACF-S4 vs ACF-T4:** Both describe the removal of a safety mechanism rather than satisfaction of it. T4 removes runtime guards (assertions, defensive raises); S4 removes static analysis guards (type annotations, type-checker constraints). Both are maintenance-phase failures — they appear when agents are resolving errors, not when generating greenfield code.

**ACF-T4 vs ACF-R5:** T4 (guard erosion) can manifest as part of R5 — a remediation commit that removes safety guards not related to the original violation. Both are maintenance-phase failures targeting the gap between greenfield authoring and code modification.

---
