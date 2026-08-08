---
title: "ACF-E1: Implicit Privilege Grant"
weight: 20
acf_id: "ACF-E1"
acf_name: "Implicit Privilege Grant"
stride_category: "elevation-of-privilege"
risk_level: "critical"
detection_status: "none"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-T1", "ACF-S3"]
---

## Description

External system assertions are accepted without independent verification, granting privileges based on unvalidated claims. The code looks like a normal API integration — the partner says "verified" and access is granted — but no independent check is performed and no recording of the basis for the decision is made. This is one of the two Critical-rated failure modes in the taxonomy.

## STRIDE Mapping

**Category:** Elevation of Privilege

Privileges or access are granted on the strength of unvalidated assertions or data from external systems. The elevation is implicit — the code does not explicitly grant elevated privileges, but by accepting an external assertion without independent verification, it effectively delegates the access control decision to the external system.

## Risk Rating

**Critical.** Silent compromise of access control or trust boundaries; high likelihood of agent generation; no existing detection. Once an external system's assertions are trusted directly, the security of the entire system depends on the security and correct operation of every external partner — not just against compromise, but against misconfiguration, bugs, and schema changes that the partner may not consider security incidents.

## Generative Mechanism

Agents implement integration patterns by calling external APIs and acting on the response. The concept that the external system's response must be independently verified — that the response itself is untrusted — is not visible in the code structure. The code looks like a normal API call and response handling. The pattern is language-general: the same trust-without-verify integration pattern appears across Python, Java, C#, TypeScript, and Go.

## Examples

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

## Impact

The code looks like a normal API integration. The partner says "verified" and access is granted — no independent check, no recording of the basis for the decision. Once an external system's assertions are trusted directly, the security of the entire system depends on the security and *correct operation* of every external partner — not just against compromise, but against misconfiguration, bugs, and schema changes that the partner may not consider security incidents. Unlike traditional authentication failures, which produce visible events, implicit privilege grants create no signal that anything is wrong until the erroneous grants are acted upon.

Consider a grants management system that uses a partner eligibility verification service to determine whether organisations qualify to receive funding. The agent-generated integration calls the partner API and grants portal access based on the response — no independent check, no audit record of the corroboration basis. The partner says eligible; access is granted.

The partner verification service has a caching layer. A misconfiguration in the caching infrastructure causes it to return stale positive responses — `{"eligible": true}` — for all queries, regardless of actual eligibility status, for approximately 18 hours before the issue is detected and corrected. During the window, the grants management system processes 1,200 eligibility checks. All 1,200 receive `{"eligible": true}`. All 1,200 are granted portal access.

The partner notices the caching issue, corrects it, and issues an incident report. From their perspective, it is a platform reliability incident — no data was lost, the caching layer returned stale data for a bounded window, the issue was resolved.

From the grants management system's perspective, 1,200 organisations were granted portal access on the basis of partner assertions that may or may not have reflected actual eligibility. Some number of those organisations were legitimately eligible and would have received access anyway. Some number were not eligible and received access erroneously. The system has no way to determine which is which. The audit trail for each of the 1,200 grants records: `access_granted=true, basis="partner_verified"`. That entry is identical for a legitimately eligible organisation and one that was erroneously verified. There is no record of independent corroboration, because no independent corroboration was performed. Incident response cannot reconstruct the legitimate grants from the erroneous ones without contacting all 1,200 organisations and performing manual re-verification — an expensive, time-consuming process that the partner's incident report does not trigger, because from the partner's perspective the incident was a platform reliability issue, not a security event.

Now extend the scenario operationally. Some of the organisations that received erroneous portal access used it — they submitted grant applications, viewed funding criteria, downloaded programme materials. None of those actions required elevated access — portal access is only the first step in a multi-stage process. But portal access was the gate, and the gate was open for 18 hours on the basis of stale partner assertions. By the time the misconfiguration is discovered, the grants team is reviewing 47 applications from organisations that may or may not have been eligible to apply. The partner's incident report gives them a time window but not a list of affected organisations, because the partner's system does not record which queries were served stale data.

**The unknowability consequence is the same shape as ACF-R1's.** The audit trail records what the system did — `basis="partner_verified"` for all 1,200 grants — but it does not record whether the partner's assertion was valid at the time it was made. An independently corroborated grant would have recorded `basis="partner_verified + internal_corroborated"` with a reference to the internal eligibility record that was checked. That distinction is exactly what is missing. The system is in the same position as the SIEM-less authentication system in ACF-R1: the records are present, they are internally consistent, and they are forensically insufficient for the question that now needs to be answered.

**The transitive trust property extends the blast radius.** The code that accepted the partner's assertion without independent verification was written once, in a single function. But every access decision downstream of that function now depends on the partner's correctness. If the grants management system feeds downstream systems — reporting dashboards, compliance records, programme performance metrics — those systems inherit the contaminated grants data as authoritative input.

Correcting the access grants does not retroactively correct the downstream records generated on the basis of them. A programme report produced during the window may record 1,200 verified organisations when the correct number was lower. That report may already be distributed. The error in the source data propagates to every document that cited it. This is not a chain of explicit trust grants but a chain of *assumptions* — each system in the chain assumed the system that fed it had validated its inputs. None of them had. They were all downstream of the single point where the partner's unvalidated assertion entered the trusted data flow.

## Detection

Taint analysis — the return value of an `@external_boundary` function is used as a predicate in an access control decision without passing through validation. Requires both boundary annotation and understanding of which operations are access-control-relevant. This is tier-flow enforcement between declared boundaries. No widely deployed tool currently detects this.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

No pattern rule covers ACF-E1 directly. The failure mode requires taint analysis across function boundaries — tracing external assertions to access control decisions. Organisations should require independent corroboration of external assertions before granting privileges, and record the basis for every access decision.

## Related Entries

ACF-E1 is closely related to [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) (Authority Tier Conflation). Both involve accepting external data or assertions without independent verification, but T1 concerns data integrity (external data contaminating internal stores) while E1 concerns access control (external assertions granting privileges). T1 asks "did this data earn trusted status?"; E1 asks "did this claim improperly trigger a privileged action?"

E1 is also related to [ACF-S3]({{< relref "/acf/s3-structural-identity-spoofing" >}}) (Structural Identity Spoofing): S3's structural impersonation can result in implicit privilege grants, with the object passing through a privilege gate that should have rejected it. E1 is about unvalidated external assertions — a partner API says "verified" and the code grants access. S3 is about unsound gate predicates — `hasattr()` gates accept any object with the expected attribute regardless of type. Both result in implicit privilege grants, but through different mechanisms: E1 trusts the wrong *source*; S3 trusts the wrong *check*.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
