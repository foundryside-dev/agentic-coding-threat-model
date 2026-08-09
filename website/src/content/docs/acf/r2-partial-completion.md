---
title: "ACF-R2: Partial Completion"
sidebar:
  label: "ACF-R2: Partial Completion"
  order: 8
acf:
  id: ACF-R2
  name: Partial Completion
  stride: repudiation
  failure_layer: training-bias
  entry_type: code-pattern
  relation: known-class-agent-amplified
  risk_level: high
  detection_status: none
  portable_coverage: partial
  entry_status: core
  language_generality: language-general
  related: [ACF-R1]
---

## Description

A sequence of operations that should be atomic (all-or-nothing) is implemented without rollback, so partial failure leaves the system in an inconsistent state.

Partial completion creates inconsistent system state that is difficult to detect and correct. The system appears to have completed an operation, but some side effects are missing. In audit-critical contexts, some operations may be performed but not recorded, or recorded without all required side effects.

## Why agents produce this

Agents implement operations sequentially and add error handling per step. They do not naturally recognise that a group of operations should be treated as a transaction unless explicitly prompted. The requirement that several operations must all succeed or all fail is a design decision, not a language feature.

## Example

```python
# Bad — agent-generated, each step has error handling, but no atomicity
def reclassify_document(doc_id, new_classification):
    old_classification = get_classification(doc_id)
    update_classification(doc_id, new_classification)                # Step 1: succeeds
    notify_stakeholders(doc_id, new_classification)                  # Step 2: fails
    record_reclassification(doc_id, old_classification, new_classification)  # never runs
    # Document is reclassified, stakeholders don't know, audit trail is incomplete.

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
        # Compensate in reverse order.
        try:
            if "stakeholders_notified" in steps_completed:
                retract_notification(doc_id, reason="reclassification_rolled_back")
            if "classification_updated" in steps_completed:
                rollback_classification(doc_id, old_classification)
        except Exception as rollback_error:
            # Both the operation AND the rollback failed. Surface both errors.
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

*The three layers illustrate a progression:* the bad version has no atomicity. The better version attempts rollback but loses information when rollback itself fails — the original exception is replaced by the rollback exception, and the caller cannot distinguish “failed and rolled back” from “failed and now inconsistent.” The best version uses custom exceptions to surface both failure modes distinctly: `ReclassificationFailed` (safe — rolled back) versus `ReclassificationInconsistent` (unsafe — manual intervention required). This distinction is institutional knowledge — the system's policy for handling inconsistent state cannot be inferred from the code structure, and agents have no basis for generating it without explicit instruction.

## Detection

No existing tool detects the full pattern because detection requires knowing which operations form a logical transaction. The as-built companion implementation provides partial signals through the exception rules `PY-WL-103` and `PY-WL-104`, but the designed operation-semantics annotations (`@atomic` and `@compensatable`) were not built. A semantic boundary enforcer could flag multiple audit-critical writes outside a transaction, but it would require project-specific declarations of which operations are audit-critical.

## Distinguished from

**ACF-R1 vs ACF-R2:** R1 destroys auditability by swallowing or suppressing failures that should be recorded or propagated. R2 destroys atomicity by allowing a multi-step operation to complete partially without rollback or compensating action. R1 corrupts the record of what happened; R2 corrupts the state that resulted.
