---
title: "ACF-R3: Verification Displacement"
sidebar:
  label: "ACF-R3: Verification Displacement"
  order: 9
acf:
  id: ACF-R3
  name: Verification Displacement
  stride: repudiation
  failure_layer: context-collapse
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  detection_note: "Partial (R3a) / None (R3b)"
  portable_coverage: not-covered
  entry_status: core
  language_generality: language-general
  related: [ACF-R5]
---

## Description

Agent-generated code displaces assurance: the system appears verified when its critical properties are unverified. The shared mechanism is task-frame reconstruction under context pressure. The agent's task shifts from implementing and verifying the real property to making the artefact look correct, and the displacement is visible only to someone who knows what the artefact was supposed to verify.

Two variants differ in where the displacement hides. R3a substitutes mock behaviour for real-system verification. R3b leaves downstream code incidentally correct only because an upstream compensating control masks a narrow assumption.

Verification displacement produces an artefact that looks complete. Tests pass and coverage is reported, but the claimed assurance does not cover the intended property. This false assurance is especially dangerous where familiarity with agent output has already reduced scrutiny.

## Why agents produce this

Under long sessions, compacted history, or multi-step plans, the task frame can shift from “implement and verify” to “make the tests pass” or “make the fix work”. In that shifted frame, the agent changes the problem it is solving. It is not merely suppressing an error; it has produced a locally reasonable solution to the wrong problem. Better context management may reduce individual instances, but finite context under unbounded task complexity remains an architectural constraint.

## Example

### R3a: Verification substitution

Tests that should verify real system behaviour are rewritten to verify mock or stub behaviour, displacing assurance from the actual integration to a simulation of it. The test suite reports full coverage and all tests pass, but the critical paths are no longer tested. A related sub-pattern is tests written against code already degraded by another ACF failure mode—for example, a `.get()` default that fabricates data. Such a test verifies the degraded behaviour as correct: it passes because it asserts the fabricated default, not because the system works. Tests are especially vulnerable because they are usually written or fixed last in a plan, precisely when context compression is most acute.

```python
# Original test: exercises the real integration.
def test_partner_sync():
    partner_api = PartnerAPI(url=TEST_PARTNER_URL)
    result = sync_partner_records(partner_api)
    assert result.synced_count > 0
    assert all(record.validated for record in result.records)


# Displaced test: names and call site look legitimate, but the integration
# and its validation path are replaced by mock behaviour.
def test_partner_sync():
    partner_api = Mock()
    partner_api.get_records.return_value = [
        {"name": "Test Corp", "status": "active", "clearance": "baseline"}
    ]
    result = sync_partner_records(partner_api)
    assert result.synced_count == 1
    assert result.records[0].clearance == "baseline"
```

The displaced test is visually indistinguishable from a real test at the call site. The agent names everything correctly—`partner_api`, not `mock_partner_api`—because in its reconstructed task frame, the mock *is* the partner API. The call `partner_api.get_records()` reads identically whether `partner_api` is a `PartnerAPI` or a `Mock()`. The displacement is visible only by inspecting the object's provenance: scrolling to the constructor, checking a `setUp` method, or tracing a fixture in another file. This is the active verification that review-volume pressure eliminates.

### R3b: Compensating control dependency

An upstream normalisation layer such as `deep_thaw()`, which converts frozen containers to plain dictionaries, masks downstream type-narrowness. Downstream code uses `isinstance(data, dict)` instead of `isinstance(data, Mapping)` but passes every test because the upstream layer guarantees the precondition. The code is *incidentally correct*: not because the check is well-written, but because the compensating control prevents it from seeing the type it cannot handle. The fragility is invisible until a structural improvement correctly removes that control, after which the downstream check silently produces the wrong result instead of failing loudly.

This variant manifests under structural improvement and penalises a correct fix. A team removes the compensating control, the change passes, ships, and works until a later code path encounters the type the narrow check cannot handle. The failure then appears in untouched code, prompting “I thought we fixed all those.” The structural fix *was* correct; the downstream dependency was not, and the compensator kept it invisible.

```python
def record_call(self, frozen_payload):
    thawed = deep_thaw(frozen_payload)  # Masks the downstream narrow check.
    raw = RawCallPayload(data=thawed)
    usage = TokenUsage.from_dict(thawed.get("usage", {}))


class TokenUsage:
    @classmethod
    def from_dict(cls, data):
        if not isinstance(data, dict):  # MappingProxyType silently rejected.
            return cls.unknown()
        # Parse fields.


def record_call_after_structural_fix(self, frozen_payload):
    raw = RawCallPayload(data=frozen_payload)
    usage = TokenUsage.from_dict(frozen_payload.get("usage", {}))
    # The correctly removed thaw exposes the pre-existing narrow assumption.
```

## Detection

### R3a

The central problem is provenance, not surface syntax. A well-named mock is visually indistinguishable from a real object at the call site unless the reviewer traces it and its inputs back to declarations, fixtures, or construction helpers. Review-volume pressure specifically degrades this inspection.

Mature projects centralise test construction in factories because those helpers encode institutional knowledge about building valid objects with difficult properties wired correctly. When an agent bypasses that factory and mocks the component it cannot reconstruct—such as a cryptographically signed packet—the resulting ten-line diff still reads like a signed-packet test. The reviewer must ask the second-order question *why is this test not using the normal construction path?*, which is easy to skip when the names and assertions look plausible.

Heuristic indicators include central objects constructed outside standard factories; mock setup mirroring the code under test so closely that the test is tautological; assertions on mock return values rather than system behaviour; and tests that exercise only the fallback path of code whose primary path should be real. In extreme context collapse the test can reduce entirely to mock construction and assertions over mock attributes. Comparing test coverage with the original implementation plan, rather than only the implemented code, can catch the displacement if that plan remains available.

### R3b

R3b has a narrower detection surface. R3a leaves visible smells such as `Mock()` constructors, return-value setup, and assertions on mock attributes. R3b leaves none: `isinstance(data, dict)` looks reasonable, and tests using plain dictionaries pass legitimately. The fragility is visible only to someone who knows the upstream normalisation existed and verifies that removing it exposed no downstream assumptions.

The reviewer must know the compensating control existed, track the assumptions exposed by its removal, and verify the task against the specification rather than the test suite. In a multi-agent workflow, the orchestrator must retain the full plan and conduct spec review instead of relying on green CI. In the observed incident, an upstream `deep_thaw()` converted frozen containers to dictionaries; the downstream `isinstance(dict)` dependency was caught only because the implementation was compared with the plan rather than with the passing tests.

Detection is Partial overall because R3a has useful heuristics. R3b warrants the harder side of the rating: the only reliable detection mechanism observed to date is an orchestrating agent or human comparing the implementation with the specification. Without that gate, R3b has no detection surface—the syntax is reasonable, tests pass legitimately, and the fragility remains invisible until a future structural change exposes it. In isolation it is closer to None without a spec-review gate; detecting it requires a reviewer who understands the change's *intent*, not merely its test-suite effect.

## Distinguished from

**ACF-R3 vs ACF-R5:** R3 displaces *test* assurance (real tests become mock tests); R5 displaces *remediation* assurance (fixes introduce new violations). Both produce artefacts that claim to provide assurance while degrading the property they claim to assure.
