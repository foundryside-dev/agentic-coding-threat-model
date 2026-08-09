---
title: 'ACF-T3: Unstructured Signal Parsing'
sidebar:
  label: 'ACF-T3: Unstructured Signal Parsing'
  order: 6
acf:
  id: ACF-T3
  name: Unstructured Signal Parsing
  stride: tampering
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered
  entry_status: core
  language_generality: language-general
  related: [ACF-T2]
---

## Description

Control-flow or classification decisions are made by substring matching on unstructured text — error messages, log output, or human-readable descriptions — rather than on typed, structured fields. The code treats a prose string as if it were an enum and builds control flow on the fabricated structure. The data is not crossing a trust boundary or changing type; it is being parsed as something it is not.

The failure mode is silent reclassification. When a developer or agent later changes an error message's wording, the substring match stops matching, the condition falls through to a default branch, and the event is silently reclassified. In audit-critical contexts, an SSRF rejection recorded as a generic `pagination_error` destroys the forensic value of the audit trail without any error or test failure. The reclassification is worse than an audit gap because a gap is visible — the record is absent — while a misclassification is invisible: the record is present with the wrong category.

## Why agents produce this

Training data is saturated with `if "error" in str(e)` patterns. The correct pattern — a typed category field set at the raise site and read at the catch site — requires coordinating the exception class definition with every raise site, which is architecturally demanding work that agents rarely undertake spontaneously.

## Example

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

## Detection

Flag `in str(e)`, `in e.message`, `in error_msg`, and similar substring matching on exception text inside exception handlers that feed audit, telemetry, or control-flow decisions. Custom lint rules can flag this structural pattern without semantic knowledge. Detection is rated Partial because the surface pattern is identifiable, but distinguishing audit-critical classification from benign logging requires context.

## Distinguished from

**ACF-T2 vs ACF-T3:** T2 silently coerces a *type*; T3 silently parses *prose as structure*. Both produce values that look correct today and silently degrade when the source changes, but the mechanisms differ — T2 converts data, T3 fabricates structure from text.
