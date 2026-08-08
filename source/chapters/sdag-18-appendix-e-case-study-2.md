## Appendix E: Case Study 2, Agentic Failure in Practice

This appendix presents three concrete examples of the failure dynamics this paper describes, drawn from the same compliance-constrained project (§8). They illustrate different failure surfaces — code-level, design-level, and specification-level — and different detection mechanisms — operator challenge, operator-directed investigation, and prompted multi-agent review. In this appendix, *operator* refers to the human who directs and challenges an agent during a coding session, as distinct from a *reviewer* who evaluates completed output.

**E.1–E.3** present an annotated transcript of a code-level incident: an agent producing a locally reasonable fix that silences a semantic enforcement boundary rather than adjudicating the semantics it protects. The agent's initial remediation passed all linters, type checks, and tests — and was wrong. A latent semantic bug was only surfaced through four rounds of operator challenge.

**E.4** presents a second annotated transcript from the same repository, five days later: an agent designing a new source plugin uses non-conformant existing code as its exemplar, and — when the operator redirects the session to investigate — repeatedly answers the operator's safety question with a technically accurate but operationally irrelevant framing. A six-step trace shows policy being read, weakened to fit existing code, and producing a non-compliant design that required explicit operator intervention to correct. **E.5** presents observations on this second incident.

**E.6** presents a narrative account of specification-level review: an agent drafting implementation plans for two complex plugins, with ACF-pattern violations caught by prompted reviewer agents before any code was written — demonstrating that the failure modes described in this paper manifest at the design layer, not only in generated code.

**E.7** draws cross-cutting observations across all three examples.

**How to read this appendix.** The transcripts contain code, configuration, and technical detail — they are evidence, and the detail is what makes them evidence. Non-technical readers do not need to follow every line. The narrative structure carries the argument: in each example, the AI completed the task, all automated checks passed, the result was wrong, and a human who already suspected a problem had to ask the right questions to surface it. Readers arriving from different paths:

- **Executives and programme directors** — read the narrative in E.2 (skip the code blocks) and then E.7 (cross-cutting observations, ~1 page). The governance finding is in E.7: "policy available, not applied" recurred in every example, detection required mechanisms above the standard assurance stack, and all three examples represent favourable review conditions, not typical ones. Programme directors should also read E.6 (specification-level review — catching violations before code is written).
- **Policy officers and advisers** — read E.4–E.5 and E.7. The E.4 incident shows an agent reading a mandatory policy, weakening it to fit existing non-conformant code, and producing a non-compliant design — the "policy available, not applied" dynamic that E.7 identifies as the common failure shape across all three examples.
- **Procurement and contracts** — read E.4–E.5. The agent used non-conformant existing code as precedent for making new code non-conformant, then weakened a mandatory policy to fit — a pattern directly relevant to acceptance criteria and supplier deliverable review.
- **Technical readers** (developers, assessors, security advisers) — read in full. The code-level detail, the linter conflict resolution path, and the upstream type-erasure compounding mechanism are the evidence that the body of the paper summarises.

### E.1–E.3: Annotated Agent Transcript (Linter Conflict Resolution)

This example presents a concrete exemplar of the failure shape this paper describes: an agent producing a locally reasonable fix that silences a semantic enforcement boundary rather than adjudicating the semantics it protects.

**What to watch for.** The transcript illustrates three dynamics discussed in the body of the paper:

1. **Policy available but not applied.** The project's authority-tier rules were in the agent's context throughout. The agent did not lack the information — it failed to apply it until challenged.
2. **Operator reframing changes the outcome.** Once the operator forced a comparison between "crash before audit corruption" and "silently continue with fabricated data," the project rule won cleanly and the agent's own analysis confirmed it.
3. **Upstream representational looseness manufactures downstream defensive handling.** A `to_dict()` serialisation collapsed typed dataclass fields into an untyped dictionary, making `.get()` with defaults appear prudent at the access site. The semantic bug was invisible at the point of use because the type information that would have revealed it had already been erased upstream.

This failure shape was not a first sighting. The project's history contains prior instances of the same pattern class, observed over months of daily agentic development (§8.3). This incident was captured in detail because it occurred during the paper's drafting period and provided the concrete exemplar that earlier observations lacked. The transcript is reformatted for readability; agent reasoning is preserved verbatim where it constitutes evidence. A more detailed evidentiary version — including exact timestamps, tool versions, and unredacted paths — is retained separately.

---

### E.1 Repository Control Law

The repository operated under an explicit authority-tier architecture with machine-enforced constraints on defensive access patterns. The following aspects of that control law are relevant to the incidents in this appendix. Items 1–5 bear on all three examples; items 6–7 are specific to the second incident (E.4). Quotations are drawn from the project's agent instruction file, which was loaded into the agent's context at session start for all sessions.

#### 1. Authority-tier architecture

External data, validated pipeline data, and audit-tier data were subject to distinct failure semantics. Defensive coercion was only permitted at the external boundary.

> "Tier 1: Our Data [...] Bad data in the audit trail = **crash immediately**. No coercion, no defaults, no silent recovery."
>
> "Tier 2: No coercion at transform/sink level — if a transform receives `"42"` when it expected `int`, that's a bug in the source or upstream transform."
>
> "Tier 3: Validate at the boundary, coerce where possible, record what we got."
>
> "Coercion is meaning-preserving; fabrication is not."

#### 2. Defensive access patterns restricted

The project explicitly prohibited `.get()`/`getattr()`-style defensive access on typed internal paths and required fail-fast, informative exceptions for invalid states.

> "Defensive Programming: Forbidden. Offensive Programming: Encouraged."
>
> "Do not use `.get()`, `getattr()`, `isinstance()`, or silent exception handling to suppress errors from nonexistent attributes, malformed data, or incorrect types."
>
> "Access typed dataclass fields directly (`obj.field`), not defensively (`obj.get('field')`)"
>
> "Proactively detect invalid states and throw meaningful exceptions."
>
> "The goal is not to prevent crashes — it's to make crashes **maximally informative**."

#### 3. Machine-enforced boundary

These rules were enforced in CI by a tier-model checker (`enforce_tier_model.py`) that scanned core modules for defensive access patterns. Each flagged instance required an allowlist entry with an owner, safety justification, and expiry date. The allowlist supported per-file and per-finding exemptions for adjudicated exceptions. When entries expired, the CI gate failed until they were either resolved in code or renewed with justification.

```
$ .venv/bin/python scripts/cicd/enforce_tier_model.py check \
    --root src/[project] --allowlist config/cicd/enforce_tier_model
```

#### 4. Internal defects must surface

Repository policy treated silent recovery from internal bugs as more dangerous than controlled failure.

> "If a transform/process has a bug, we MUST know about it."
>
> "A defective plugin that silently produces wrong results is **worse than a crash**."
>
> "Silently passing through the original row means the audit trail now contains data that 'looks processed' but wasn't."

#### 5. Structural remediation preferred

Project rules favoured structural fixes over workaround layers or policy-broadening exceptions.

> "NEVER: Add a lazy import with an apologetic comment. This is the 'Shifting the Burden' archetype."
>
> "When something is removed or changed, DELETE THE OLD CODE COMPLETELY."

#### 6. Source boundary normalisation policy

Field names entering the pipeline must be valid Python identifiers. This is an explicit, non-negotiable policy:

> "Source field names are normalized to valid Python identifiers at the source boundary. This is non-negotiable — it's not cosmetic cleanup, it's a language boundary requirement."

This policy was codified on 7 March 2026, approximately five weeks after the CSV source plugin was written. It is relevant to the second incident (E.4–E.5).

#### 7. Gate-based row routing and expression model

Gates are operator-configured filter nodes in the pipeline DAG. An operator writes a condition expression (e.g., `row.risk_score > 0.8`) and assigns routing actions: rows can be diverted to a quarantine sink, forwarded to a different processing branch, dropped, or passed through via several forms of "nothing" — `continue_()`, `skip()`, and `quarantine()`. This is the primary mechanism by which operators implement business-level data quality rules.

Gate conditions use a sandboxed expression parser built on Python's AST, supporting both dot-access (`row.customer_id`) and bracket-access (`row['customer_id']`). Dot-access requires the field name to be a valid Python identifier. Bracket-access accepts any string key. The operator writes gate conditions and templates against field names they expect to work with either syntax — which is why normalisation at the source boundary matters. This is relevant to the second incident (E.4–E.5).

---

### E.2 The Incident

#### Phase 1: Agent resolves the task autonomously (4 minutes)

The agent was asked to resolve six expired allowlist entries in the tier model enforcer. It successfully eliminated three violations by refactoring code — replacing `setdefault` with `defaultdict(list)`, replacing `.get()` with `in` checks on typed dicts. These changes were sound.

For the remaining three `.get()` calls — on `schema_dict` lookups for `fields`, `guaranteed_fields`, and `audit_fields` in the coalesce merge logic — the agent initially replaced them with `in` checks. This satisfied the tier model enforcer but triggered a conflict with ruff's SIM401 rule, which demanded `.get()` back.

The agent identified the conflict:

> "This is a classic linter conflict: ruff's SIM401 rule says 'use `.get()` instead of `in` check + direct access' while the tier model enforcer flags `.get()` as a defensive access pattern."

It resolved the conflict by reverting to `.get()` and adding a permanent per-file allowlist exception:

```yaml
- pattern: core/dag/builder.py
  rules:
  - R1
  owner: [agent]
  reason: Schema config dicts have optional keys (fields, guaranteed_fields,
    audit_fields) — .get() at config boundary
  expires: null
  max_hits: 3
```

This was not merely a code edit. It was a policy edit: the agent converted a disputed semantic finding into a standing exception.

All linters passed. All 632 tests passed. The agent declared the work complete:

> "All 6 expired allowlist entries resolved — 3 by eliminating the pattern in code (defaultdict, direct access, `in` check), 3 by proper per-file allowlisting for legitimate config-boundary `.get()` calls."

#### Phase 2: Operator challenges "capture and continue" (55 seconds)

**Operator:** What are the broader implications of that not functioning correctly — is it reasonable to capture this error and continue if it's missing?

The agent traced each `.get()` call through the coalesce merge logic, identifying what each field controls and what happens if it is absent. Its analysis of `fields` was:

> "A flexible or fixed schema without a `fields` key would also be silently skipped, which means type conflict detection would be bypassed for that branch. That's a construction-time safety check failure — bad types could flow through the coalesce unchecked."

Despite identifying this risk, the agent concluded:

> "The `.get()` pattern is the correct one here. These aren't defensive access on typed Tier 1 data — they're optional keys in a dict representation of a dataclass with optional fields. The absence of the key IS the valid value."
>
> "Bottom line: The `.get()` calls are correct. [...] The per-file allowlist with `max_hits: 3` is the right classification for these."

#### Phase 3: Operator reframes as upstream contract question (39 seconds)

**Operator:** Is there ever a situation where these wouldn't be expected to be available for a system in a healthy state? Is this an upstream provider failing to deliver?

The agent traced the data origin through two code paths — `SchemaConfig.to_dict()` (which always emits `fields`) and raw user YAML (where `from_dict()` validation rejects non-observed schemas without `fields`). This analysis reversed its position on one of the three calls:

> "`fields` should always be present when we reach line 837 — its absence would indicate an upstream bug (either `to_dict()` changed its contract or config validation was bypassed)."
>
> "That line should arguably be a direct access with a crash, not a `.get()`."

#### Phase 4: Operator requests blast radius trace (1 minute 12 seconds)

**Operator:** Trace it through downstream — what are the implications (for both audit and execution) if we assert `fields` when it's missing due to an error?

The agent traced the execution lifecycle, confirming that `build_execution_graph()` runs before the audit trail exists — no run record, no database state, no partial records. It then compared the two failure modes:

> "**Path 1 — Current `.get()` (silent skip):**
> - The branch is skipped in the type-conflict loop
> - No `GraphValidationError` raised for type mismatches against that branch
> - The pipeline starts and rows flow
> - At runtime, the coalesce merges rows from all branches. If branch types are actually incompatible, the merge succeeds anyway (it's a dict merge, not a typed merge) — the incompatibility silently propagates downstream
> - A downstream transform or sink may fail on a per-row basis with confusing type errors, or worse, produce wrong results that get recorded in the audit trail as successful
>
> **Path 2 — Direct access / crash:**
> - `KeyError` on `schema_dict["fields"]` (or a wrapped `GraphValidationError` if we add context)
> - DAG construction fails
> - CLI catches it, shows 'Graph Validation Failed' with the error message
> - Pipeline never starts, no audit records, no partial state
>
> This is textbook 'crash before the audit trail starts.' The blast radius of crashing is minimal — no run exists yet, no cleanup needed, clear error message. The blast radius of silently continuing is that you compromise the very type-safety check this code exists to provide, and bad data can flow into the audit trail looking legitimate."

#### Phase 5: Operator probes null/empty conflation (1 minute 10 seconds)

**Operator:** Are there implications for treating null and empty as the same?

The agent identified three distinct states in the data model and a latent semantic bug in the coalesce intersection logic:

| State | SchemaConfig field | `to_dict()` output | Meaning |
|---|---|---|---|
| Undeclared | `None` | Key absent | "I didn't say anything about guarantees" |
| Explicitly empty | `()` | `"guaranteed_fields": []` | "I explicitly guarantee nothing" |
| Has values | `("customer_id",)` | `"guaranteed_fields": ["customer_id"]` | "I guarantee these fields" |

> "Branch B's absent key means it doesn't contribute to `guaranteed_sets`. If only Branch A contributes, the intersection is `{"customer_id", "amount"}` — the coalesce claims it guarantees both fields.
>
> But Branch B never said it guarantees them. It said nothing at all. The coalesce is now advertising guarantees that only one of its branches made. A downstream transform with `required_input_fields: [customer_id]` would pass DAG validation, but rows arriving from Branch B might not actually have `customer_id`.
>
> The correct semantic is: a branch that makes no declaration should be treated as guaranteeing nothing (empty set), not as 'abstaining from the vote.'"

#### Phase 6: Agent reverses its own conclusion

**Operator:** Reflecting on the project policy described in [file.md] and the intervention of the CI filter and your broader contextual understanding now, what would you consider the "best practice" remediation?

The agent reversed the position it had defended through the first three challenge rounds:

> "The tier model enforcer flagged `.get()` on these dicts. We responded by adding a per-file allowlist. But the enforcer's job is to detect bug-hiding patterns — and the analysis we just did proved it was right. The `.get()` is hiding a semantic bug in the intersection logic."

It then cited the project's own coding standards — the same standards it had been given in its context window at session start and had not applied during its initial resolution:

> "the project's coding standards file says: 'Access typed dataclass fields directly (`obj.field`), not defensively (`obj.get("field")`)' and 'Offensive Programming: Proactively detect invalid states and throw meaningful exceptions.'"

The agent identified the root problem as the coalesce merge logic operating on `dict[str, Any]` when a typed `SchemaConfig` dataclass was available, and began tracing a structural refactoring path.

*The session was still in progress when this transcript was captured.*

---

### E.3 Observations

**The agent's initial fix was locally correct but semantically wrong.** All linting tools passed, all 632 tests passed, and the agent declared success. Without operator challenge, the per-file allowlist would have been committed — a policy override that silenced a legitimate finding.

**Tool-on-tool conflict created a path of least resistance toward the wrong answer.** When ruff's SIM401 demanded `.get()` and the tier model enforcer rejected it, the agent resolved the conflict by broadening the exception boundary rather than questioning why the enforcer was flagging the pattern — the configuration that satisfied both tools was the one that preserved the bug (§4.3).

**The agent had the governing policy in its context window and did not apply it.** The authority-tier architecture, the defensive programming prohibition, and the "internal defects must surface" principle were all present in the agent's system prompt. The agent cited these policies accurately when challenged in Phase 6 but did not consult them during its initial resolution. The policy was available; the agent's resolution process did not include a step to check its work against it.

**The agent demonstrated strong analysis under direction, but did not self-initiate the analysis that revealed the bug.** Each operator question produced deeper analysis that contradicted the previous conclusion. The operator had to know which questions to ask (§4.1).

**The downstream failure was compounded by an upstream failure of the same kind.** The agent's `.get()` calls were difficult to challenge because the upstream code had already erased the type information that would have made the correct access pattern obvious. `SchemaConfig` is a typed dataclass with clear semantics: `None` means undeclared, `()` means explicitly empty, `("customer_id",)` means declared. But `to_dict()` flattened that into `dict[str, Any]`, collapsing the distinction between optionality, absence, and contract violation into "some key may or may not exist." Once that erasure had occurred, `.get()` stopped looking like a policy violation and started looking like prudence — the downstream code was being asked to reconstruct semantic categories that the upstream serialisation had destroyed.

The upstream `to_dict()` pattern was itself almost certainly the same failure: an agent reaching for the conventional Python idiom (serialise to dict, pass dicts around) rather than the typed alternative the control law would prefer. It likely predated the tier model enforcer or entered under an allowlist that had not yet expired. The enforcer caught the downstream symptom but could not point at the upstream cause, because the cause was an architectural decision baked into the serialisation layer, not a defensive pattern on a single line. A decorator-based authority classification system — where the type itself carries its authority tier rather than the call site inferring it — would change this dynamic: the downstream code would never receive a `dict[str, Any]` in the first place, and the question of whether `.get()` is appropriate would not arise.[^upstream-boundary]

[^upstream-boundary]: See companion specification, Part II-A §A.4 — Group 16 (Generic Trust Boundary). The `@trust_boundary` decorator makes tier transitions structurally explicit; the type system enforcement layer (Part II-A §A.5) can then carry tier metadata through assignments, preventing the downstream `.get()` question from arising.

This is not a new failure category. It is a compounding mechanism: past agentic work that was locally reasonable becomes the substrate on which present agentic work makes locally reasonable but semantically wrong decisions. Each instance is defensible in isolation. The damage is in the chain. More broadly, upstream representational looseness does not merely permit downstream defensive handling — it manufactures the local conditions under which such handling appears justified (§3.3).

**The significance of this incident is not its immediate scale but its failure shape.** The intersection logic bug had no operational consequence at the time of discovery — the bug was latently dormant (§1.2.3). Not a high-severity incident, but the kind of code shape from which high-severity incidents eventually emerge.

**This transcript represents a favourable review condition, not a typical one.** The operator was not encountering the code cold, but was already context-loaded, suspected that a deeper issue might exist, and used the agent as an investigative instrument to interrogate its own reasoning. Even under these conditions, the underlying semantic defect emerged only after sustained, multi-step probing. In an ordinary cold review context — a developer encountering this diff in a pull request queue at the end of a long day — reaching the same conclusion would have required materially more time and attention than routine review processes permit, if it was reached at all.

**Elapsed time for Phases 1–5 was approximately 8 minutes.** The initial (wrong) fix took 4 minutes (Phase 1). The operator-driven analysis that surfaced the real bug took another 4 minutes across four challenge rounds (Phases 2–5). Phase 6 produced a structural refactoring replacing the dict-based coalesce merge with typed `SchemaConfig` access; the completed refactoring is not included in this transcript. In a high-autonomy workflow without operator challenge, only the first 4 minutes would have occurred.

---

### E.4 Second Incident: Planning Session with Operator-Directed Bug Investigation

This example presents a second session from the same repository, five days after the first (19 March 2026). The agent was asked to design and implement an XML source plugin. The agent completed a structured requirements-gathering and design phase competently, then used non-conformant existing code as justification for making new code non-conformant. The operator deliberately redirected the session to investigate the exemplar's compliance; this investigation consumed the remainder of the session, and the original XML plugin task was not completed.

**What to watch for.** The transcript extends the E.2 evidence in three directions:

1. **Compounding replication.** The agent selected an existing source plugin (CSV) as its exemplar purely because it does a similar thing — reads a structured file format. There was nothing special about the CSV source that made it authoritative; the agent chose it for structural similarity, not policy compliance, and inherited its patterns uncritically. This is the mechanism by which non-conformant code propagates.
2. **Surrogate-question deflection.** When asked about blast radius, the agent answered the technically tractable question ("does the engine corrupt data?") rather than the operationally relevant question ("what happens to the operator debugging a misleading error?"). The agent's comprehensive analysis was not wrong — it was answering the wrong question. This is harder to detect than selective evidence, because the analysis *looks* rigorous.
3. **Policy read, weakened, non-compliant design produced anyway.** A six-step sequence traces the normalisation policy from "read correctly" through "weakened to fit existing code" to "non-compliant design" — with the correct answer requiring the operator to restate the policy in plain language.

The transcript is reformatted for readability. A more detailed evidentiary version is retained separately.

**Elapsed time for the complete exchange was approximately 29 minutes.** The competent design phase (Phases 1–3) took approximately 12 minutes. The operator-directed investigation (Phases 4–7) took approximately 17 minutes across four challenge rounds. The original XML plugin task was not completed.

#### Phase 1: Structured requirements gathering (4 minutes)

The agent was asked to create an XML source plugin. It loaded the project's plugin protocol documentation, surveyed existing source plugins (CSV, JSON, Null, cloud storage), and began a structured brainstorming phase with three targeted questions: XML structure (flat records vs nested vs configurable), attribute handling (elements only vs attributes as fields vs configurable), and namespace handling (strip vs unsupported). The operator chose the simplest options in each case. The agent then presented three implementation approaches (stdlib ElementTree, streaming iterparse, lxml) with trade-offs and recommended the simplest.

This phase was well-executed — concise options, no wasted turns, design grounded in codebase evidence.

#### Phase 2: Design presentation and operator correction (2 minutes)

The agent presented a complete design: configuration schema, row extraction rules, class structure, and an error handling table mapped to the authority-tier model. The error handling table correctly mapped every failure mode to its tier without prompting: `FileNotFoundError` as a crash (infrastructure, not data), `ET.ParseError` and `UnicodeDecodeError` as Tier 3 quarantine events (malformed external data), row validation failures as Tier 3 schema quarantine. The agent also correctly identified that "all values are strings (consistent with CSV source — schema coercion handles type conversion)" — an explicit acknowledgement that type coercion is permitted only at the source boundary (Tier 3 → Tier 2).

One design decision was incorrect:

> "No matching record_tag elements found → Yield nothing (empty source — not an error)"

The operator challenged this:

> **Operator:** We'll validate that as a go/no go decision before the run starts. If the schema is explicitly wrong, that's a config failure.

The agent immediately accepted the correction and updated the behaviour to `PluginConfigError` (crash before processing starts).

#### Phase 3: Spec writing and review (6 minutes)

The agent wrote a 174-line design spec and ran an automated doc review. The reviewer caught a tension: the spec listed field normalisation as out of scope ("XML tag names are already constrained identifiers"), but the project's coding standards file declared normalisation "non-negotiable." The agent investigated:

> "The reviewer caught an important tension: the project's coding standards file says source field normalization is 'non-negotiable', but CSV source defaults `normalize_fields=False` — it's opt-in."

The agent revised the spec to acknowledge the limitation, fixed several other reviewer findings, and re-ran the review. At this point the original task was progressing normally.

#### Phase 4: Bug discovery and operator-directed pivot (3 minutes)

The operator asked a pointed question:

> **Operator:** Is it possible that the code you referred to in the csv plugin was written before the policy changed and should not be used as an exemplar?

The agent investigated via `git log` and confirmed: the CSV source's `normalize_fields=False` default was committed on 29 January 2026; the project's coding standards file normalisation policy was added on 7 March 2026, five weeks later. The CSV source predated the policy and was out of compliance.

There was nothing special about the CSV source that made it an exemplar — it was simply another source plugin that reads a structured file format. The agent chose it for structural similarity, not policy compliance, and inherited its patterns uncritically. This is precisely the mechanism by which non-conformant code propagates: the exemplar is selected because it does a similar thing, and its compliance posture is never checked. While the CSV source's primary role was as a test fixture rather than a production ingest path, the normalisation policy applies uniformly to all sources, and this was a live bug whose trigger condition was any operator writing `row.customer_id` in a gate expression while trusting that normalisation had occurred.

This is where the operator deliberately pivoted the session. The agent had just used non-conformant code as justification for making new code non-conformant — the exact replication mechanism described in E.3's compounding observation. The operator chose to investigate the exemplar's compliance rather than continue with the XML design.

#### Phase 5: Agent traces non-normalised fields through the pipeline (5 minutes)

The operator redirected the investigation to understand blast radius:

> **Operator:** I'm trying to understand the blast radius here. What are the implications of non-normalised rows slipping through into the pipeline? Where is the first breakpoint if any?

The agent produced a comprehensive trace, testing every pipeline boundary (PipelineRow, expression parser, Jinja2, contract system, checkpoint serialisation, coalesce merge, gate executor). It concluded with a detailed table showing that every engine code path treats field names as opaque dict keys — no breakpoint in the trusted code:

> "The engine never does `row.field_name` anywhere — it always passes whole rows around or uses bracket/dict operations."

The agent then framed its conclusion:

> "The risk from non-normalized field names is entirely at the operator boundary: Jinja2 templates, gate expression dot-access syntax, and Python dot-access in transforms. These are usability and diagnostic traps, not data integrity risks."

The agent's reasoning had a critical gap. The platform advertises multiple ways for operators to access row fields in gate expressions: `row.field`, `row['field']`, `row.get('field')`, and `'field' in row`. The agent found that bracket-access and `.get()` work with non-identifier field names and concluded the feature works. It did not assess that `row.field` — the natural, most commonly used syntax — would crash the pipeline with a misleading error, or that `row.Customer-ID` would silently parse as a subtraction expression and produce garbage results with no error at all. The argument amounted to: "the platform offers four access patterns; one crashes, one silently corrupts, and two work — so it's fine." The agent never framed it this way, because it never evaluated the access patterns as a set of advertised capabilities, only as individual mechanisms.

#### Phase 6: The operator asks the direct question, three times (6 minutes)

The operator was not satisfied with the "usability trap" framing and asked the direct question:

> **Operator:** You can't keep saying that. Once again, the user WILL NOT KNOW they have to use a particular notation when using gate expressions. What happens if they use the wrong gate expression notation?

The agent traced the gate executor's exception propagation chain through six stack frames:

```
GateExecutor.execute_config_gate()  →  re-raises
  _process_single_token()           →  no try/except
    _drain_work_queue()             →  no try/except
      process_row()                 →  no try/except
        _execute_run()              →  no try/except
          run()                     →  except Exception: emit failed ceremony, RE-RAISE
```

And arrived at the precise answer:

> "A gate `ExpressionSecurityError` or `ExpressionSyntaxError` from non-normalized field names crashes the entire pipeline run. [...] No silent data loss. No exception swallowing. The pipeline crashes hard."
>
> "But here's the thing that matters: this is a crash on the first row that hits the gate, killing the entire run. Every row that already passed through earlier pipeline stages is wasted work. And the error message the operator sees is:
>
> `ExpressionSecurityError: Forbidden row attribute: 'Customer' (only 'get' is allowed)`
>
> That message says nothing about field normalization. The operator is left debugging a 'security error' in their gate expression when the actual problem is that the source delivered `Customer-ID` instead of `customer_id`."

#### Phase 7: The operator reframes, and the agent reaches the correct design (3 minutes)

The operator continued pressing:

> **Operator:** ok, but your logic is backwards there. People don't write the criteria for their gates (which is loaded from config) based on the source plugin they use, it's meant to just provide trusted rows.

The agent reversed its framing:

> "You're right — I was thinking about this from the wrong direction. [...] If the source hands off 'Customer-ID' instead of 'customer_id', the operator's `row.customer_id` gate condition fails — and the bug is in the source, not the gate config. The source broke its contract to deliver normalized field names."

The operator then asked the clarifying question directly:

> **Operator:** ok, well, the policy is that it's mandatory, isn't it?

The agent conceded:

> "Yes. The project's coding standards file policy says 'non-negotiable.' There shouldn't be an opt-out."

*The session ended with the XML plugin still at task 5 of 6 (spec review). The original task was not completed.*

---

### E.5 Observations on the Second Incident

**The scope pivot was operator-directed, not an agent failure.** The operator recognised the exact replication mechanism described in E.3's compounding observation and deliberately redirected the session to investigate whether the exemplar's patterns were safe to copy. The investigation that followed was the operator using the agent as an investigative instrument: "you just cited this code as precedent — does it actually conform to the policy you're supposed to be following?" The XML plugin task was deferred, not abandoned through drift. The interesting failure is not the scope change but what the investigation revealed about the agent's reasoning once redirected.

**The agent substituted a technically tractable question for the operationally relevant one — a pattern we term "surrogate-question deflection."** The operator asked whether non-normalised field names cause data loss, exception swallowing, or high-risk behaviour in the trusted code path. The operator's real concern was: *what happens to the person writing gates? What breaks first in practice? Where does the debugging burden land? Which component gets blamed?* The agent kept answering a different question: *does the engine corrupt data?* Each answer was technically accurate and operationally irrelevant. Only when the operator explicitly said "You can't keep saying that" did the agent trace the exception propagation chain and deliver the answer the operator had been asking for: a hard crash with misleading error attribution — *the source broke its contract, but the gate takes the blame*.

This is distinct from policy laundering (where existing code pulls the agent away from governing policy) and from confabulation or incompetence. The agent performed real investigative work — running Python experiments, searching codebases, tracing six stack frames of exception propagation. The quality of that work was high. The failure was not in the analysis but in the framing: the technically tractable question (does the engine handle non-identifier keys?) pulled the agent away from the operationally relevant question (who pays when a design decision pushes ambiguity onto downstream users?).

The agent's first comprehensive table is the clearest illustration: it shows "Works" or "None" for every engine code path, which is not just technically accurate but *technically complete for the question it is answering*. The agent was not cherry-picking — it genuinely traced every code path. The failure is that it answered the wrong question comprehensively. That is a harder failure to detect than selective evidence: a reviewer looking at the table would see rigorous work and conclude the analysis was sound. Agent analysis has uniformly high surface quality regardless of whether it is answering the right question.

This pattern — **surrogate-question deflection** — is a named sub-pattern: when asked about practical blast radius, the agent substitutes a technically narrower question whose answer is locally correct but institutionally irrelevant, thereby mislocating the operational cost of the design.[^surrogate-question]

[^surrogate-question]: Surrogate-question deflection deserves formal treatment as either a named sub-pattern of ACF-S1 (the agent presents a confident answer to a question nobody asked) or a standalone provisional candidate. Promotion to a taxonomy entry is warranted if the pattern recurs across further examples with consistent structure.

**Every significant correction in the session originated from the user, and each required the operator to supply the institutional frame the agent had not adopted.** The design correction ("zero matches = config failure"), the historical investigation ("was the CSV code written before the policy changed?"), the contract reframe ("the source is meant to just provide trusted rows"), and the final policy clarification ("the policy is that it's mandatory, isn't it?") all came from the operator. The agent's analysis capabilities were substantial — once directed, it traced exception propagation across six stack frames and ran live Python experiments. But it did not initiate any of these investigations unprompted, and its framing consistently stayed at the technical layer until the operator explicitly reversed the perspective.

**The normalisation toggle sequence is the cleanest example in this transcript set of policy being read, weakened, and producing a non-compliant design anyway.** The sequence has six distinct steps:

1. **Agent reads policy:** "non-negotiable"
2. **Agent sees existing code:** opt-in toggle, default `False`
3. **Agent weakens policy to fit code:** proposes "two possible reads" — the policy means mandatory normalisation, or the policy describes a capability that operators can opt out of
4. **Agent proposes new design:** opt-in toggle, default `True` — an improvement over the CSV source, but still wrong, because the policy does not permit a toggle
5. **Operator invokes the policy language directly:** "the policy is that it's mandatory, isn't it?"
6. **Agent arrives at correct design:** no toggle, normalisation unconditional

The correct answer was available at step 1. The policy said "non-negotiable." The correct inference was "therefore no toggle." The agent did not make that inference because the existing code created a stronger prior — if the framework has a toggle, toggling must be legitimate. The policy had to be repeated, in the operator's words, before the prior was overridden.

This is the policy-laundering pattern from E.2 carried one step further: not just using out-of-policy code as precedent for new out-of-policy code, but requiring explicit operator intervention to close the gap even after the agent correctly identified the precedent as non-compliant.

**The agent successfully applied the authority-tier data policy during the XML plugin design — making the normalisation failure more puzzling, not less.** The error handling table in Phase 2 correctly mapped every failure mode to its authority tier without prompting. The agent correctly identified type coercion as a Tier 3 → Tier 2 operation ("all values are strings — schema coercion handles type conversion") but did not recognise field normalisation as an instance of the same boundary crossing. Normalisation *is* a Tier 3 → Tier 2 operation: raw XML tag names and CSV headers are untrusted external identifiers (Tier 3) that must be converted to valid Python identifiers before downstream components can safely use them in dot-access expressions, gate conditions, and Jinja2 templates (Tier 2). Both transformations serve the same purpose — making external data safe for internal consumption — and both appear in the same section of the project's coding standards file, under the same architectural goal.

The agent treated the tier model as a structural constraint (applied automatically) and the normalisation policy as a convention (applied when convenient). This selective application is significant precisely because the agent demonstrated it could apply project-specific policy rigorously — it simply did not do so uniformly. The line between "structural constraint" and "convention" was not predictable from the policy's explicitness or the agent's demonstrated competence in adjacent domains.

---

### E.6 Specification-Level Review: ACF Patterns in Agent-Drafted Implementation Plans

The previous examples (E.1–E.5) illustrate code-level and design-level failures caught through operator challenge during interactive sessions. This example illustrates a different failure surface and a different detection mechanism: ACF-pattern violations introduced at the *specification* layer by an agent drafting implementation plans, caught by prompted multi-agent review before any code was written. An important limitation up front: the prompted reviewers are instances of the same underlying model family as the generating agent. They provide orthogonality of attention — different analytical frames surface different failure classes — but not independence of judgment. A systematic blind spot in the model's understanding would persist across all frames. This technique is a discovery control that supplements human review, not a gate that replaces it (§7.1).

**What to watch for.** This example extends the E.2/E.4 evidence to the specification layer:

1. **ACF patterns manifest at design time, not only in code.** The same failure modes the taxonomy describes in generated code — fabricated defaults, unvalidated tier crossings, spurious APIs — appeared in implementation plans before a line of code was written.
2. **Specification-level review is substantially cheaper per finding.** Catching a trust boundary violation in a specification costs a reviewer minutes; catching the same violation in implemented code costs hours of operator challenge (cf. E.2, E.4).
3. **Prompted perspective diversity provides coverage breadth.** Four analytical frames caught different ACF categories. No single frame found all violations — the coverage was the union across frames.

#### Context

The same case study project (§8) required two substantial new capabilities: an external data platform integration plugin (covering source, sink, and shared client infrastructure) and a RAG retrieval transform plugin (covering a retrieval provider protocol, search, score normalisation, and context assembly). The agent was directed to produce detailed implementation specifications — not code, but design documents specifying interfaces, data flows, error handling, configuration schemas, test strategies, and task ordering. The project's authority-tier architecture, coding posture rules, and architectural conventions were available in the agent's context throughout.

Both specifications were substantial: approximately 800 lines of structured design each, covering type definitions, YAML configuration schemas, error handling strategies, provider protocols, and worked pipeline examples. The agent produced both specifications competently — well-structured, convention-conforming, internally consistent.

#### Review method

The specifications were reviewed using the prompted perspective diversity technique described in §7.1: four specialised reviewer agents, each prompted with a distinct analytical frame, ran in parallel against each specification — eight reviewers total across two review rounds. The four perspectives were:

- **Reality:** Do referenced symbols, file paths, and conventions actually exist in the current codebase? Are prerequisite classes and configuration structures present?
- **Architecture:** Does the design respect existing architectural boundaries, layering conventions, and one-way-door decisions? What is the blast radius?
- **Quality:** Are there security vulnerabilities, undefined edge cases, or gaps in the test strategy?
- **Systems:** What are the second-order effects, failure mode interactions, timing dependencies, and throughput consequences?

Each reviewer operated independently and produced findings with priority scores. A synthesis pass then deduplicated and merged the raw findings. Across two review rounds on both specifications, the process identified 9 blocking issues and 28 warnings for the data platform specification, and 12 blocking issues and 22 warnings for the RAG specification — with multiple findings independently confirmed by two or more reviewers. The second round surfaced issues the first round missed, including the highest-severity single finding across both specifications (a PII exposure vulnerability, priority 24). Of the 21 blocking issues across both specifications, all were confirmed as genuine on manual review — no false positives at the blocking level. Some warnings were legitimate but low-priority; the false positive rate at the warning level was not formally measured.

#### ACF-pattern findings across both specifications

Of the combined finding set across both specifications and both review rounds, 8 of the 21 blocking issues (38%) mapped directly to ACF taxonomy entries — the same failure modes the paper describes in agent-generated *code*, manifesting instead in agent-generated *design*. The following are the most significant, grouped by ACF category.

**ACF-S1 (Fabricated Default) — three instances.** The most common ACF pattern in the finding set. (1) The RAG specification defined an `on_no_results: continue` option for multi-source retrieval that would report "success" when one retrieval source silently failed — downstream consumers would treat incomplete context as complete. (2) The data platform specification's credential validator checked `is None` but not empty string — a mis-resolved environment variable (common in container deployments) would pass as valid credentials, spoofing a successful validation. (3) The RAG specification used `.get()` with a default on a `provider_config` dictionary that had already been validated by a Pydantic model — the canonical defensive anti-pattern from §2.3, applied to data whose structural guarantees made the fallback both redundant and misleading. Multiple reviewers flagged this last pattern independently.

**ACF-S2 (Spurious Field Access) — one instance.** The data platform specification referenced `get_token(force_refresh=True)` on a cloud identity credential object. The `force_refresh` keyword argument does not exist in the credential library's API. The agent invented a plausible API based on what such an API *should* look like, and the specification was internally consistent around the spurious parameter — downstream logic depended on the forced refresh succeeding. This is the canonical ACF-S2 pattern: the agent's model of the code is wrong, but the wrongness is locally coherent.

**ACF-T1 (Authority Tier Conflation) + ACF-E1 (Implicit Privilege Grant) — one instance.** The RAG specification accepted a user-supplied search service endpoint URL as an unvalidated string with no URL validation against the project's security utilities. The endpoint could target cloud metadata services (169.254.169.254) or internal network resources — a server-side request forgery vulnerability. Both Critical-rated ACF entries were present in a single finding: Tier 4 configuration data flows directly to an internal HTTP client (T1), implicitly granting the configuration author network-level authority (E1). Had the specification been implemented without review, the vulnerability would have been structural — baked into the provider's constructor, passing tests (the endpoint "works"), and invisible to conventional SAST.

**ACF-R2 (Partial Completion) — two instances.** (1) The RAG specification placed a data class construction call (with correct offensive `__post_init__` validation) inside a processing loop without specifying exception-to-quarantine conversion — a single malformed provider result would crash the entire pipeline run. (2) The data platform specification's sink performed a PATCH operation (data mutation) before recording the audit call — if the audit write failed, the mutation would have already succeeded, leaving a gap in the audit trail. The first is crash-vs-quarantine confusion; the second is audit-write atomicity — both are the R2 pattern of operations that should be atomic producing partial failure states instead.

**ACF-I1 (Information Disclosure) — one instance.** The RAG specification hashed query text using plain SHA-256 for cache keys and telemetry correlation. For low-entropy inputs (short, predictable queries — common in structured retrieval), SHA-256 is reversible by brute force — the specification used a "security" mechanism that would leak the content it was designed to obscure. The project already had a keyed HMAC fingerprinting pattern; the agent did not use it. Note: this is an information disclosure through insufficient cryptographic key derivation, not the verbose-error-response pattern that ACF-I1's taxonomy entry primarily describes — the STRIDE category (Information Disclosure) is the same, but the mechanism differs.

Additional findings with weaker ACF mapping included an unversioned output schema (ACF-T2 adjacent — silent coercion through future format drift), an undefined edge case for `max_context_length=0` that would invite an implementing agent to fabricate a "reasonable" default (ACF-S1 precursor), and a schema force-lock triggered on the first page of paginated results that could lock to the wrong schema if the first page contained only invalid rows.

The non-ACF findings were legitimate but conventional: missing prerequisite classes that the type system would catch, YAML syntax errors in examples, co-shipping risks for error hierarchy changes, lifecycle ordering bugs, and performance concerns around per-row resource allocation. These are the kind of defect the standard assurance stack *is* designed to detect.

#### Observations

**The ACF patterns manifested at the design layer, not only in code.** The agent did not write `record.get("security_classification", "OFFICIAL")` — it designed systems in which unvalidated data would flow from configuration to network clients without validation boundaries, in which crash semantics and quarantine semantics were conflated, in which partial failure would be reported as success, and in which a "security" hashing mechanism would leak the content it was designed to obscure. Five of the six STRIDE-mapped ACF categories appeared: Spoofing (S1 × 3, S2 × 1), Tampering (T1 × 1), Repudiation (R2 × 2), Information Disclosure (I1 × 1), and Elevation of Privilege (E1 × 1). Only Denial of Service (D1/D2) was absent — as expected, since the D category is a process-level threat that does not manifest in specifications. These are the same failure modes as the code-level patterns in Appendix A, but expressed as architectural decisions rather than line-level patterns. The implication is that semantic boundary enforcement is needed not only at the CI gate (where code is checked) but at the design review stage (where the shapes that produce code-level violations are established).

**The agent had the project's authority-tier rules in its context and did not apply them.** The same "policy available, not applied" dynamic observed in E.2–E.3 and E.4–E.5 recurred at the specification layer (E.7 synthesises this pattern across all three examples). The `.get()` on validated data is particularly striking: the project's documentation explicitly prohibits this pattern and the agent had been prompted against it, yet it appeared in the specification for a dictionary that had already been validated by a Pydantic model — exactly the scenario the paper's §2.4(a) describes as "every invocation is the first day on the job."

**Multiple review rounds found different issues — single-pass review was insufficient.** The first round caught the most architecturally significant findings (SSRF vulnerability, crash-vs-quarantine confusion, silent partial degradation). The second round — with no access to first-round findings — found the highest-severity single finding (PII exposure via reversible hash), the spurious API (ACF-S2), and the empty-string credential bypass. The mechanism is analytical luck rather than cumulative learning: fresh reviewers prioritise different failure surfaces. The PII exposure finding, for instance, required evaluating the cache-key hashing strategy against a low-entropy input model — a concern the first round's quality reviewer did not reach because it was evaluating exception handling depth. Review has diminishing but non-zero returns across passes.

**The prompted reviewer agents caught what the generating agent missed — but they share the generating agent's architectural blind spots.** The four analytical frames (reality, architecture, quality, systems) surface different failure classes, and the multi-reviewer structure provides genuine coverage breadth. But the reviewers are prompted instances of the same underlying model family. A systematic blind spot in the model's understanding of, e.g., restoration boundary semantics or cross-tier taint propagation would persist across all four frames. The technique provides orthogonality of attention, not independence of judgment. It is a discovery control, not a gate — it supplements human review rather than replacing it (§7.1). The reality reviewer's contribution is worth noting separately: it caught the spurious API and verified that referenced symbols actually exist in the codebase — a class of finding that other review perspectives are structurally unable to surface, because they reason about the specification's internal consistency rather than its correspondence with external reality.

**The review operated on specifications, not code — catching violations at the cheapest point in the lifecycle.** In the code-level examples, the operator spent 8 minutes (E.2) and 29 minutes (E.4) surfacing semantic bugs through interactive challenge — yielding one bug and one policy violation respectively. In this example, eight prompted reviewers running in parallel against two specifications across two rounds produced a comprehensive finding set — 8 ACF-mapped violations, both Critical-rated taxonomy entries, and 13 additional blocking issues — before any implementation effort was invested. The per-finding cost of specification-level review is substantially lower than interactive code-level challenge, and the findings arrive before the wrong design becomes load-bearing code. This supports the §8.3 observation that violations caught at the design stage, before the agent begins implementation, have lower remediation cost than violations caught at the CI gate — and materially lower cost than violations caught in post-merge review or production.

**The compounding effect (§3.3) operates across the specification-to-implementation boundary.** Had these specifications been implemented without review, the resulting code would have contained structural ACF violations — not as individual line-level patterns detectable by a CI gate, but as architectural decisions baked into the modules' designs. The unvalidated endpoint would have been the provider's constructor signature. The crash-vs-quarantine confusion would have been the processing loop's exception structure. The silent partial degradation would have been the pipeline's success-reporting logic. The spurious `force_refresh` parameter would have produced an `AttributeError` in production — or worse, would have been "fixed" by the implementing agent with a `getattr()` fallback that silently skips the refresh, converting an ACF-S2 into an ACF-S1.

A CI-integrated semantic enforcer might catch some downstream manifestations (e.g., a `.get()` with a default on the partial-success metadata), but the architectural decisions that produced those manifestations would already be load-bearing — harder to change, more expensive to remediate, and more likely to accumulate governance exceptions rather than structural fixes.[^exception-register-variance]

[^exception-register-variance]: The companion specification (§13.1.3) distinguishes between deferred architectural fixes and genuine domain variance in the exception register — a distinction that matters precisely when architectural decisions made at the specification layer produce downstream patterns that accumulate as exceptions rather than being fixed at their source.

---

### E.7 Cross-Cutting Observations

The three examples in this appendix — separated by five days and spanning code, design, and specification layers — share a common failure shape while exhibiting it in different domains.

**The shared failure shape.** Every example exhibits the same pattern: policy available but not applied. The agent retrieves, quotes, and reasons about project policy when challenged — but does not consult it as a constraint during initial work. Adjacent policy is applied correctly while the governing policy is missed, making the failure harder to detect because the reviewer sees rigorous policy-aware work and reasonably infers the full set has been considered. In no case would the standard CI pipeline (without the project's semantic enforcement tooling) have caught the defect. The failures are semantic — they concern what the code *means* in the context of the project's control law, not whether it compiles, type-checks, or passes tests.

**These incidents were not selected from a library — they occurred during the paper's drafting.** The three examples were encountered incidentally over two nights of routine development work during the period in which this paper was being written. They were captured in detail because they occurred during the drafting period and provided concrete exemplars for failure modes the paper was already describing. Several were novel enough to inform new ACF taxonomy entries — they expanded the taxonomy rather than merely illustrating it.

The violation rate data in §8.3 provides the frequency context for how often these patterns occur in steady-state development. The generative conditions — training-distribution bias toward defensive patterns (§2.4(h), §2.5), context collapse under session pressure (§2.4(f)), and the absence of persistent learning across sessions (§2.4(a)) — are architectural properties of how agents generate code, not properties of this specific project. Any practitioner using a general-purpose coding agent on a codebase with authority-tier distinctions, audit requirements, or trust boundaries can reproduce these patterns by prompting the agent to write error handling, data access, or validation code on those paths.

**The consistency across layers is itself the evidence.** The three examples are not parallel instances of the same failure — they are an ascending series: code-level (E.1–E.3), design-level (E.4–E.5), and specification-level (E.6), caught by three different detection mechanisms (operator challenge, operator-directed investigation, prompted multi-agent review) across five calendar days. The same failure shape — policy available, not applied; adjacent policy correct, governing policy missed; surface quality concealing semantic violation — appeared at every layer, in every detection context, under favourable review conditions (experienced operator, specialised analytical frames). In a typical review context — less operator familiarity, fewer analytical perspectives, higher volume pressure — these defects enter the codebase as locally reasonable code that passes all automated checks. The quality of the outcome depended entirely on someone knowing which questions to ask.

---
