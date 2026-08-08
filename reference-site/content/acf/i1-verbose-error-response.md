---
title: "ACF-I1: Verbose Error Response"
weight: 16
acf_id: "ACF-I1"
acf_name: "Verbose Error Response"
stride_category: "information-disclosure"
risk_level: "medium"
detection_status: "partial"
entry_type: "code-pattern"
relation: "known-class-agent-amplified"
entry_status: "core"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: []
---

## Description

Error handlers expose internal system details (database schemas, file paths, query parameters, library versions) in error responses. While verbose error responses are a known vulnerability class, agents produce them at a qualitatively different rate — every error handler the agent writes defaults to maximum context, across every service, in every project, on every commit. What was a sporadic review finding in human-authored code becomes a systematic pattern requiring explicit detection at scale.

## STRIDE Mapping

**Category:** Information Disclosure

Verbose error responses disclose internal system details to external callers. The information disclosed — database schemas, file paths, query parameters, library versions — provides reconnaissance information that reduces the effort required to craft targeted attacks.

## Risk Rating

**Medium.** Verbose error responses are a known vulnerability class with existing (partial) detection coverage. The risk is elevated under agentic generation because the pattern is systematic rather than sporadic — every error handler defaults to maximum context — but the individual impact of each instance is bounded by the information available in the error context.

## Generative Mechanism

Agents produce "helpful" error messages that include full context. During development, this is valuable. In production, it is reconnaissance information. Agents do not distinguish between development and production error handling because the distinction is contextual, not syntactic. Training data is saturated with verbose error patterns because they are genuinely helpful during development — agents apply the pattern universally without distinguishing deployment context.

## Examples

```python
# Agent-generated — "helpful" error response with full context
except DatabaseError as e:
    return {
        "error": str(e),
        "query": sql,
        "connection": str(db_url),
    }
# Exposes database schema details, the exact query that failed,
# and the database connection string — all useful for an attacker.

# Correct — log internally, return opaque error to caller
except DatabaseError as e:
    logger.error(
        "Database query failed",
        extra={"query": sql, "connection": db_url, "error": str(e)},
    )
    return {"error": "Internal error", "reference": error_id}
# Details logged where operators can see them.
# Caller gets an opaque reference they can report for investigation.
```

## Impact

Verbose error responses provide attackers with reconnaissance information: database schemas reveal table and column names, file paths reveal deployment structure, query parameters reveal business logic, and library versions reveal known vulnerabilities. This information reduces the effort required to craft targeted attacks. The systematic nature of the pattern under agentic generation means that nearly every error handler in a codebase may expose internal details, rather than the sporadic instances seen in human-authored code.

## Detection

Existing scanners detect some cases (credential patterns, known sensitive variable names). Comprehensive detection requires understanding which variables contain sensitive information — a context-dependent judgement. AST-based rules can flag common patterns like `str(e)` in return values from exception handlers, but false positive rates vary by codebase. Semantic enforcement addresses ACF-I1 through secret-handling and data-sensitivity declarations, which trace sensitive data through function bodies to detect logging, error-message, and unprotected-persistence exposure.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

No pattern rule covers ACF-I1 directly. The failure mode is addressed through secret-handling and data-sensitivity declarations, which trace sensitive data through function bodies to detect exposure in logging, error messages, and unprotected persistence paths.

## Related Entries

ACF-I1 is the sole Information Disclosure entry in the core taxonomy. Stack trace exposure (e.g., `traceback.format_exc()` in HTTP handlers) is a related pattern but is well-covered by existing SAST tooling and not catalogued as a separate ACF entry. I1 concerns general verbose error construction that exposes internal state — database credentials, query parameters, connection strings — which existing tools detect less reliably because the exposure is context-dependent rather than pattern-matched.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
