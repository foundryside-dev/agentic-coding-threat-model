---
title: "ACF-R2: Partial Completion"
weight: 11
acf_id: "ACF-R2"
acf_name: "Partial Completion"
stride_category: "repudiation"
risk_level: "high"
detection_status: "none"
entry_type: "code-pattern"
relation: "known-class-agent-amplified"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-R1"]
---

## Description

A sequence of operations that should be atomic (all-or-nothing) is implemented without rollback, so partial failure leaves the system in an inconsistent state. The system appears to have completed an operation, but some side effects are missing. In audit-critical contexts, this means the audit trail records an incomplete picture of what actually happened.

## STRIDE Mapping

**Category:** Repudiation

The audit trail records an incomplete picture — some operations were performed but not all were recorded, or vice versa.

## Risk Rating

**Risk:** High

## Generative Mechanism

Agents implement operations sequentially and add error handling per-step. They do not naturally recognise that a group of operations should be treated as a transaction unless explicitly prompted. The concept of "these three operations must all succeed or all fail" is a design decision, not a language feature. Training data overwhelmingly shows sequential operations with individual try/except blocks — the transaction pattern is project-specific institutional knowledge.

## Code Examples

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

## Impact

Partial completion creates inconsistent system state that is difficult to detect and correct. The system appears to have completed an operation, but some side effects are missing. In audit-critical contexts, the audit trail records an incomplete picture — some operations were performed but not all were recorded, or vice versa.

## Detection Approaches

No existing tool detects this — it requires understanding which operations form a logical transaction. Addressed by a rule targeting audit writes inside broad exception handlers, combined with audit-primacy enforcement and operation-semantics declarations (`@atomic`, `@compensatable`) that supply the transaction context.

The audit-write rule's relevance to R2 is distinct from its R1 role: it fires on each individual audit-critical write inside a broad exception handler. For R1, this catches the single audit failure being swallowed. For R2, it provides a partial signal — when multiple audit-critical writes exist in the same broad handler, each write triggers the rule independently, and the collective pattern indicates a partial-completion risk. The rule alone does not detect the atomicity gap; `@atomic` and `@compensatable` annotations address the broader requirement that multiple state-modifying operations occur within a transaction context. A semantic boundary enforcer could flag functions that contain multiple audit-write operations without a transaction context, but this requires project-specific annotation of which operations are audit-critical.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

This failure mode is addressed by a rule targeting audit writes inside broad exception handlers, combined with operation-semantics declarations (`@atomic`, `@compensatable`) that identify operations which must be treated as transactions.

## Related Entries

- [ACF-R1: Audit Trail Destruction]({{< relref "/acf/r1-audit-trail-destruction" >}}) — Both concern audit trail integrity, but R1 describes the destruction of individual audit records through exception handling failures, while R2 describes inconsistent system state from non-atomic multi-step operations. A partial completion failure (R2) may leave some steps recorded and others not, producing an audit trail gap (R1) as a secondary consequence.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
