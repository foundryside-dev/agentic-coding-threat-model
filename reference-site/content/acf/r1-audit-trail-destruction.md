---
title: "ACF-R1: Audit Trail Destruction"
weight: 10
acf_id: "ACF-R1"
acf_name: "Audit Trail Destruction"
stride_category: "repudiation"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "known-class-agent-amplified"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-R2"]
---

## Description

Exception handling around audit-critical operations compromises audit trail integrity. Two surface forms produce the same consequence through opposite mechanisms: (a) broad exception handlers catch errors and log-and-continue rather than propagating the failure to the audit system; (b) audit-critical operations propagate failures as untyped exceptions that bypass the structured handling path, so the failure is either caught by a generic handler that does not recognise it as an audit integrity violation, or crashes the process without the diagnostic context and incident routing that the typed handler would have provided.

## STRIDE Mapping

**Category:** Repudiation

In regulatory contexts, the audit trail constitutes the legal record. A gap in the audit trail is not just a logging failure — it is a compliance failure that may have legal consequences.

## Risk Rating

**Risk:** High

## Generative Mechanism

Both forms arise from the same training-data gap. Form (a): "catch exceptions and log them" is a pervasive pattern — a web server should log errors and keep serving. Agents apply this to audit-critical operations without recognising that some failures must propagate rather than be absorbed. Form (b): agents told to avoid form (a) — "let audit failures propagate, don't swallow them" — produce the correct action (propagation) with the wrong type (generic `Exception` rather than the domain-specific type that routes to the audit integrity handler). The *routing semantics* of exceptions — which handlers catch which types, and what each handler does differently — are institutional knowledge encoded in the exception hierarchy, not in the language syntax. Training data overwhelmingly uses generic exception types; domain-specific exception hierarchies are project-specific and rarely appear in public repositories.

## Code Examples

**Form (a) — broad catch-and-continue (canonical):**

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

**Form (b) — untyped propagation:**

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

**Extended scenario — middleware security control bypass through exception routing:**

The untyped-propagation mechanism in form (b) is not specific to audit operations. The same mechanism — correct action, wrong exception type, bypassed structured handler — produces different consequences depending on which handler is bypassed. Consider a web application with middleware-based security controls:

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

An agent refactoring the authentication internals replaces `raise AuthenticationError(reason="incorrect_password")` with `raise Exception("Authentication failed")`. The middleware's `except AuthenticationError` no longer catches the failure. A second agent fixes the visible symptom by catching the exception in the login view and returning 401. Every automated check passes. What the fix does not restore is the SIEM event and rate limiter increment — the middleware still exists, unchanged, but no `AuthenticationError` reaches it. SIEM integration, rate limiting, and account lockout are silently disabled. Middleware-based security controls are particularly vulnerable to this pattern because the controls are architecturally separated from the code that triggers them, connected only by exception type — institutional knowledge that lives in deployment configuration, not in the code being modified.

This example illustrates why the category is defined by its *consequence* (structured handling bypassed through exception mistyping) rather than its *mechanism* (swallowing or untyped propagation). The category encompasses audit trail gaps, middleware security control bypass, and validation handler bypass — all produced by the same training-data gap. Every instance involves either a catch-and-continue on a path that should propagate (form a), or an operation that should raise a domain-specific exception type but raises a generic one (form b).

## Impact

In regulatory contexts, the audit trail constitutes the legal record. A gap in the audit trail is not just a logging failure — it is a compliance failure that may have legal consequences. "We made a decision but cannot prove what it was based on" is an unacceptable answer in a formal inquiry. Form (b) is particularly difficult to catch because the agent has followed the project's explicit rule ("don't swallow audit failures") and the code *does* propagate — the failure is in the exception's *type*, not its *handling*. A codebase audit looking for catch-and-swallow patterns (form a) will not find form (b), because there is no `except` block to flag.

The two forms also compose. An agent producing form (b) — an untyped `Exception` propagating from an audit-critical operation — creates an exception that has no guaranteed destination. A different agent, or the same agent in a different session, may independently add a catch-all `except Exception` handler further up the call stack, because the application "keeps crashing" on certain code paths and broad exception handling is the training-data default for making crashes stop. The untyped audit exception lands in the catch-all, is logged as a generic error, and the operation continues — form (a) and form (b) working together, neither introduced by the same agent or in the same session, composing into a silent audit trail gap that neither detection rule in isolation would flag.

The catch-all handler is not wrapping the audit operation (which form (a) detection targets); the audit operation is not swallowed at its call site (which form (b) detection targets). The gap exists in the *space between* two independently reasonable patterns — an instance of the composable-defect mechanism.

## Detection Approaches

Form (a): existing linters flag bare `except:` (no exception type) but not `except Exception:` (which is considered acceptable practice). Semantic detection requires understanding which operations are audit-critical — this is project-specific knowledge encoded in the trust topology (e.g., functions annotated as audit-write operations should not be inside broad exception handlers that continue on failure).

Form (b): flag audit-critical call sites (e.g., functions annotated as `@audit_writer` or matching a known audit-operation list) where the call is not wrapped in a handler that raises a domain-specific exception type. The detection signature is the *absence* of a typed wrapper, not the *presence* of a catch block — a structurally different rule from form (a).

Addressed by rules targeting broad exception catching, silent exception handling, and audit writes inside broad handlers, with `@audit_writer` and `@audit_critical` declarations providing the audit-primacy mechanism. Form (b) is not yet covered — it requires a new detection category targeting untyped propagation from declared audit-critical operations.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

This failure mode is addressed by rules targeting broad exception catching, silent exception handling, and audit writes inside broad handlers, with `@audit_writer` and `@audit_critical` declarations providing the audit-primacy mechanism. Form (b) — untyped propagation from declared audit-critical operations — requires a new detection category that no current rule set provides.

## Related Entries

- [ACF-R2: Partial Completion]({{< relref "/acf/r2-partial-completion" >}}) — Both concern audit trail integrity, but R1 describes the destruction of individual audit records through exception handling failures, while R2 describes inconsistent system state from non-atomic multi-step operations. The two frequently co-occur: a partial completion failure (R2) may leave some steps recorded and others not, producing an audit trail gap (R1) as a secondary consequence.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
