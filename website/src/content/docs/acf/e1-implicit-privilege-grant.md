---
title: "ACF-E1: Implicit Privilege Grant"
sidebar:
  label: "ACF-E1: Implicit Privilege Grant"
  order: 14
acf:
  id: ACF-E1
  name: Implicit Privilege Grant
  stride: elevation-of-privilege
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: critical
  detection_status: none
  portable_coverage: covered
  entry_status: core
  language_generality: language-general
  related: [ACF-T1, ACF-S3]
---

## Description

External-system assertions are accepted without independent verification, granting privileges based on unvalidated claims. The integration looks normal: a partner says an applicant is verified and the system grants access. No signal indicates that the assertion was wrong until the resulting privilege is used.

This creates an unknowability problem. An audit record such as `basis="partner_verified"` says what the system did but not whether the partner's claim was valid at the time. Independent corroboration would record both sources and make the basis reconstructable. Without it, a partner reliability incident can leave an organisation unable to distinguish legitimate grants from erroneous ones.

The trust is transitive: every downstream decision, report, and compliance record inherits data that entered through the unchecked assertion. Correcting access later cannot retroactively repair artefacts already produced from the contaminated source.

## Why agents produce this

Agents implement integrations by calling an external API and acting on its response. The need to verify the response independently is not visible in the code's type or control structure. The response handling therefore looks like an ordinary and complete API integration even though the response itself remains untrusted.

## Example

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
    )  # Callers can catch this policy-level failure specifically.

if not partner_verified:
    raise VerificationFailed(
        f"Partner verification failed for {applicant_id}"
    )

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

Direct field access makes a malformed response visible, but it does not by itself solve the privilege failure. The critical controls are independent corroboration and an audit record of the decision basis.

## Detection

Taint analysis can detect a value returned by an external boundary being used as a predicate in an access-control decision without validation. That requires boundary declarations and knowledge of access-control-relevant operations. The companion implementation provides this coverage through tier-flow enforcement between declared trust boundaries, using the same trust-flow family that covers ACF-T1.

## Distinguished from

**ACF-T1 vs ACF-E1:** T1 is a provenance failure — external data crosses into trusted processing without passing a validation boundary. E1 is a decision failure — privileges or access are granted on the strength of unvalidated assertions or data. T1 asks "did this data earn trusted status?"; E1 asks "did this claim improperly trigger a privileged action?"

**ACF-E1 vs ACF-S3:** E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*.
