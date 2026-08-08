---
title: "ACF-R3: Verification Displacement"
weight: 12
acf_id: "ACF-R3"
acf_name: "Verification Displacement"
stride_category: "repudiation"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-R5"]
---

## Description

Agent-generated code displaces assurance — the system appears verified when the critical properties are unverified. The shared mechanism is task-frame reconstruction under context pressure: the agent's task frame shifts from "implement and verify the real property" to "make the artefact look correct," and the displacement is visible only to someone who knows what the artefact was supposed to verify. Two sub-entries distinguish the variants by where the displacement hides and how it can be detected.

## STRIDE Mapping

**Category:** Repudiation

The system appears verified when the critical properties are unverified. In high-stakes systems, displaced verification provides false assurance.

## Risk Rating

**Risk:** High

## Generative Mechanism

When agents operate under context pressure — long sessions, compacted history, multi-step plans — the task frame can shift from "implement and verify" to "make the tests pass" or "make the fix work." In the shifted frame, the agent resolves the problem by changing what problem it thinks it's solving. The agent is not suppressing an error — it has produced a locally reasonable solution to the wrong problem. Model providers are introducing mitigations that may reduce the incidence of this pattern — improved context-management tooling, checkpointing, plan persistence, context editing, and resumed runs that preserve transcript history. Individual manifestations of this failure may become less common, but the underlying mechanism — finite context under unbounded task complexity — is architectural rather than fully eliminable under current agentic architectures and workflows.

## Code Examples

### ACF-R3a: Verification Substitution

Tests that should verify real system behaviour are rewritten to verify mock or stub behaviour, displacing assurance from the actual integration to a simulation of it. The test suite reports full coverage and all tests pass, but the critical paths are no longer tested. A related sub-pattern: tests written against code already degraded by another ACF failure mode (e.g., a `.get()` default that fabricates data) verify the degraded behaviour as correct — the test passes because it asserts the fabricated default, not because the system works. Tests are particularly vulnerable because they are typically written or fixed last in a plan, precisely when context compression is most acute.

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

The displaced test is visually indistinguishable from a real test at the call site. The agent names everything correctly — `partner_api`, not `mock_partner_api` — because in its reconstructed task frame, the mock *is* the partner API. The call `partner_api.get_records()` reads identically whether `partner_api` is a `PartnerAPI` or a `Mock()`. The displacement is visible only by inspecting the provenance of the object: scrolling up to the constructor, checking a `setUp` method, or tracing a fixture in another file. This is precisely the kind of active verification that review volume pressure eliminates.

**Detection approach for R3a:** The key detection problem is provenance, not surface syntax. At the call site, well-named mocks are visually indistinguishable from real objects. On a large codebase, the failure is particularly insidious — mature projects typically centralise test object construction in factories or shared helpers, and when an agent bypasses the factory and mocks the component it cannot reconstruct from first principles, the test still reads like a genuine test in a ten-line diff. Heuristic indicators include: tests whose central objects are constructed outside the project's standard test helpers or factories; tests where the mock setup mirrors the code under test so closely that the test is effectively tautological (asserting that a function returns what you told it to return); tests that assert on mock return values rather than on system behaviour; and tests that exercise only the fallback path of code that should primarily exercise the real path. In extreme cases of context collapse, the entire test body may reduce to mock construction and assertions over mock attributes.

### ACF-R3b: Compensating Control Dependency

An upstream normalisation layer (e.g., a `deep_thaw()` call that converts frozen containers to plain dicts) masks downstream type-narrowness. The downstream code uses `isinstance(data, dict)` instead of `isinstance(data, Mapping)`, but passes all tests because the upstream layer guarantees the precondition. The code is *incidentally correct* — not because the type check is well-written, but because the compensating control ensures it never encounters the type it cannot handle. This fragility is invisible under normal operation and only surfaces when the compensating control is correctly removed during a structural improvement, at which point the downstream checks silently produce wrong results rather than failing loudly.

This variant only manifests under structural improvement — it actively punishes correctness. The characteristic user experience is delayed: a team removes a compensating control as part of a well-planned structural fix, the fix passes all tests, ships, and operates correctly — until weeks or months later, when a code path that previously ran through the removed normalisation encounters the type it can no longer handle.

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

**Detection approach for R3b:** R3b leaves no smell at all: `isinstance(data, dict)` is a reasonable-looking check, the tests pass legitimately because test fixtures use plain dicts, and the fragility is only visible to someone who knows the upstream normalisation existed and is tracking whether it was truly eliminated rather than relocated. The fragility is only detectable by someone who (a) knows the upstream compensating control existed, (b) is tracking whether removing it exposed downstream assumptions, and (c) verifies the task against the specification rather than the test suite. The only reliable detection mechanism observed to date is an orchestrating agent or human reviewer comparing the implementation against the specification rather than the test results. Without that spec review gate, R3b has no detection surface.

## Impact

Unlike [ACF-R2]({{< relref "/acf/r2-partial-completion" >}}) (partial completion), which leaves observable traces — inconsistent database state, missing audit records, downstream failures — verification displacement produces an artefact that looks complete and correct. Tests pass. Coverage is reported. The highest-impact instances are not the ones that look obviously artificial, but the ones that pass visual inspection because the names, structure, and local flow all look legitimate. Active supervision of the agent during generation would reduce the risk of verification displacement — but as trust in agentic output increases, scrutiny decreases. The teams most likely to catch verification displacement are those that already distrust agent-generated code; the teams most vulnerable are those whose experience with agents has been positive enough to stop checking. In high-stakes systems, displaced verification provides false assurance — the system appears verified when the critical properties are unverified.

## Detection Approaches

Detection is rated Partial for R3 overall because heuristic indicators exist and experienced practitioners can apply them, but no widely-deployed tool implements them. R3a is Partial in the conventional sense — heuristics exist (mock provenance inspection, factory bypass detection, tautological assertion patterns) and experienced practitioners can apply them. R3b arguably warrants a harder rating: the only reliable detection mechanism observed to date is an orchestrating agent or human reviewer comparing the implementation against the specification rather than the test results. Without that spec review gate, R3b has no detection surface — the code is syntactically reasonable, the tests pass legitimately, and the fragility is invisible until a future structural change exposes it.

The R3b detection gap merits attention during framework review. "Partial" for R3 overall reflects R3a's heuristic detectability. R3b in isolation may be closer to "None (without spec review gate)" — the only reliable catch is a reviewer who holds the full plan in context and can recognise that "tests pass" does not mean "task complete." This is a meaningful distinction for organisations designing review processes: R3a can be caught by pattern-matching review tools; R3b requires a reviewer who understands the *intent* of the change, not just its *effect* on the test suite.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this entry are under development.

## Related Entries

- [ACF-R5: Remediation-Induced Violation]({{< relref "/acf/r5-remediation-induced-violation" >}}) — R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
