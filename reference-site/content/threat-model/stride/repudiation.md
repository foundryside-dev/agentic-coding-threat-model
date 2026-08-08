---
title: "Repudiation"
weight: 3
stride_slug: "repudiation"
---

In traditional STRIDE analysis, repudiation concerns a user performing an action — a transaction, an access, a deletion — and later denying it. The system lacks sufficient logging, signing, or non-repudiation controls to prove the action occurred. The gap is in the *recording* of events.

The agentic variant is **audit trail destruction through error handling**: error handling patterns destroy the audit trail by catching, logging, and continuing rather than failing in a way that preserves the error as a first-class audit event.

## Mechanism

Agents generate broad exception handlers that prevent crashes but also prevent errors from being recorded in audit systems. The error is "handled" in the sense that the program continues, but the event that caused the error is lost to the audit trail.

## Code examples

```python
# Error swallowed — audit trail has a gap
try:
    record_decision(case_id, decision, rationale, evidence)
except Exception as e:
    logger.error(f"Failed to record decision: {e}")
    # Decision was made but not recorded. The audit database shows nothing.

# Partial completion without rollback
try:
    update_classification(document_id, new_level)
    notify_stakeholders(document_id, new_level)
    record_classification_change(document_id, old_level, new_level)
except NotificationError:
    pass  # "Notification is non-critical"
    # Three operations that should be atomic are silently partial.
```

## Why existing controls miss it

The code handles exceptions — generally considered good practice. The distinction between "handle the error and continue safely" and "swallow the error and destroy evidence" requires understanding which operations are audit-critical, which the agent does not reliably possess.

## Risk in government context

Regulatory compliance (failure to maintain complete audit trails), legal proceedings (gaps in evidence chains), and IRAP assessment failures (inability to demonstrate complete traceability).

## ACF entries in this category

The ACF taxonomy separates the Repudiation category into six failure modes (four core, two provisional):

- [ACF-R1: Audit Trail Destruction]({{< relref "/acf/r1-audit-trail-destruction" >}}) — error handling that destroys the audit trail
- [ACF-R2: Partial Completion]({{< relref "/acf/r2-partial-completion" >}}) — multi-step operations left in inconsistent state
- [ACF-R3: Verification Displacement]({{< relref "/acf/r3-verification-displacement" >}}) — verification displacement
- [ACF-R4: Context Handover Assumption]({{< relref "/acf/r4-context-handover-assumption" >}}) — context handover assumptions (provisional)
- [ACF-R5: Remediation-Induced Violation]({{< relref "/acf/r5-remediation-induced-violation" >}}) — remediation-induced violations
- [ACF-R6: Scope-Limited Triage]({{< relref "/acf/r6-scope-limited-triage" >}}) — scope-limited triage (provisional)

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [Spoofing]({{< relref "spoofing" >}}) — related category: fabricated defaults compound with audit gaps
- [Denial of Service]({{< relref "denial-of-service" >}}) — related category: review pressure that allows audit-destroying patterns to pass review
