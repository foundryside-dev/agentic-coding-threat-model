---
title: 'ACF-R1: Audit Trail Destruction'
sidebar:
  label: 'ACF-R1: Audit Trail Destruction'
  order: 7
acf:
  id: ACF-R1
  name: Audit Trail Destruction
  stride: repudiation
  failure_layer: training-bias
  entry_type: code-pattern
  relation: known-class-agent-amplified
  risk_level: high
  detection_status: partial
  portable_coverage: partial
  entry_status: core
  language_generality: language-general
  related: [ACF-R2]
---

## Description

Exception handling around audit-critical operations compromises audit trail integrity. Two surface forms produce the same consequence through opposite mechanisms:

- Broad exception handlers catch errors and log-and-continue rather than propagating the failure to the audit system.
- Audit-critical operations propagate failures as untyped exceptions that bypass the structured handling path. A generic handler may then fail to recognise an audit integrity violation, or the process may crash without the diagnostic context and incident routing that a typed handler would have provided.

In regulatory contexts, the audit trail constitutes the legal record. A gap is not just a logging failure; it is a compliance failure that may have legal consequences. "We made a decision but cannot prove what it was based on" is an unacceptable answer in a formal inquiry. Form (b) is particularly difficult to catch because the agent has followed the explicit rule not to swallow audit failures and the code *does* propagate. The failure is in the exception's *type*, not its *handling*. A codebase audit looking for catch-and-swallow patterns will not find it because there is no `except` block to flag. In one observed project, correcting form (a) across a codebase revealed twelve instances of form (b) across six plugins — the correlated failure property in action.

The two forms also compose. An untyped `Exception` propagating from an audit-critical operation has no guaranteed destination. A different agent, or the same agent in another session, may independently add a catch-all `except Exception` further up the call stack because the application keeps crashing. The audit exception lands in the catch-all, is logged as a generic error, and the operation continues. Neither pattern needs to be introduced by the same agent or in the same session. The gap exists in the space between two independently reasonable patterns — an instance of the composable-defect mechanism.

## Why agents produce this

Both forms arise from the same training-data gap. For form (a), "catch exceptions and log them" is a pervasive pattern: a web server should log errors and keep serving. Agents apply it to audit-critical operations without recognising that some failures must propagate rather than be absorbed.

For form (b), agents told to let audit failures propagate produce the correct action with the wrong type: a generic `Exception` rather than the domain-specific type that routes to the audit integrity handler. Exception routing semantics — which handlers catch which types and what each handler does differently — are institutional knowledge encoded in the exception hierarchy, not in language syntax. Training data overwhelmingly uses generic exception types; domain-specific exception hierarchies are project-specific and rarely appear in public repositories.

## Example

Form (a), broad catch-and-continue:

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

Form (b), untyped propagation:

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

### Extended scenario: middleware security control bypass through exception routing

The untyped-propagation mechanism in form (b) is not specific to audit operations. The same mechanism — correct action, wrong exception type, bypassed structured handler — produces different consequences depending on which handler is bypassed.

Consider a web application with middleware-based security controls, a standard pattern in Django, Starlette, and WSGI applications:

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

The `except AuthenticationError` clause is the security control: it creates security information and event management (SIEM) events, increments the rate limiter, and returns a 401 response. The `except Exception` clause is the safety net: log the error, return 500, and keep running.

An agent refactoring the authentication internals replaces `raise AuthenticationError(reason="incorrect_password")` with `raise Exception("Authentication failed")`. The middleware's `except AuthenticationError` no longer catches the failure, so the application returns 500 on every incorrect password.

A second agent fixes the visible symptom by catching the exception in the login view and returning 401. Every automated check passes. The fix does not restore the SIEM event or rate limiter increment because no `AuthenticationError` reaches the middleware.

The attack chain is:

1. Exception type erodes from specific to generic during refactoring (form b).
2. The generic exception bypasses middleware security controls.
3. A second agent fixes the visible symptom by catching the exception in the view (form a, applied to a different handler).
4. SIEM integration, rate limiting, and account lockout are silently disabled.

The changes ship on a Thursday. Monitoring alerts on elevated 500 error rates that evening, and an on-call engineer is paged on Friday night. They test the site after the second agent's fix has deployed, find that everything works, and silence the alert until Monday. By then, the window has been open for over 60 hours — enough time for credential stuffing without rate limiting, account lockout, or SIEM alerts.

Whether an attack occurred is unknowable because the SIEM audit trail that would have recorded it is the control that broke. The incident response team cannot distinguish "no attacks happened" from "attacks happened and we have no record." Middleware-based security controls are particularly vulnerable because they are architecturally separated from the triggering code and connected only by exception type — institutional knowledge that lives in deployment configuration, not in the modified code.

The category is therefore defined by its consequence, structured handling bypassed through exception mistyping, rather than only its mechanism. It encompasses audit trail gaps, middleware security control bypass, and validation handler bypass. Every instance involves either catch-and-continue on a path that should propagate or an operation that should raise a domain-specific exception but raises a generic one.

## Detection

For form (a), existing linters flag bare `except:` but not `except Exception:`, which is considered acceptable practice. Semantic detection requires understanding which operations are audit-critical. This is project-specific knowledge encoded in the trust topology: functions annotated as audit-write operations should not be inside broad exception handlers that continue on failure.

For form (b), flag audit-critical call sites — such as functions annotated `@audit_writer` or matching a known audit-operation list — where the call is not wrapped in a handler that raises a domain-specific exception type. The signature is the *absence* of a typed wrapper, not the *presence* of a catch block, so it requires a structurally different rule from form (a).

Two designed form (a) rules shipped: the as-built companion implementation covers broad exception handlers in trusted-tier functions (`PY-WL-103`) and silently swallowed exceptions in trusted-tier functions (`PY-WL-104`), rating ACF-R1 partially covered. The designed WL-005 for audit writes inside broad handlers and the `@audit_writer` and `@audit_critical` annotations that would supply its declaration mechanism were never built. Form (b) was not covered by the designed rule set and requires a new detection category targeting untyped propagation from declared audit-critical operations.

## Distinguished from

**ACF-R1 vs ACF-R2:** R1 destroys auditability by swallowing or suppressing failures that should be recorded or propagated. R2 destroys atomicity by allowing a multi-step operation to complete partially without rollback or compensating action. R1 corrupts the record of what happened; R2 corrupts the state that resulted.
