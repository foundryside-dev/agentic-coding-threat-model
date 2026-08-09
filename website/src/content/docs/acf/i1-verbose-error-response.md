---
title: "ACF-I1: Verbose Error Response"
sidebar:
  label: "ACF-I1: Verbose Error Response"
  order: 11
acf:
  id: ACF-I1
  name: Verbose Error Response
  stride: information-disclosure
  failure_layer: training-bias
  entry_type: code-pattern
  relation: known-class-agent-amplified
  risk_level: medium
  detection_status: partial
  portable_coverage: not-covered
  entry_status: core
  language_generality: language-general
  related: []
---

## Description

Error handlers expose internal system details such as database schemas, file paths, query parameters, or library versions in error responses. These details give attackers reconnaissance information that reduces the effort needed to craft targeted attacks.

## Why agents produce this

Agents produce helpful error messages with full context. That is useful during development but unsafe in production. The development-versus-production distinction is contextual rather than syntactic, so agents tend to expose maximum context in every handler. A sporadic human-authored finding becomes a systematic, agent-amplified pattern across services and commits.

## Example

```python
# Agent-generated: full internal context is returned to the caller.
except DatabaseError as error:
    return {
        "error": str(error),
        "query": sql,
        "connection": str(db_url),
    }

# Safer: retain diagnostic detail internally and return an opaque reference.
except DatabaseError as error:
    logger.error(
        "Database query failed",
        extra={"query": sql, "connection": db_url, "error": str(error)},
    )
    return {"error": "Internal error", "reference": error_id}
```

## Detection

Existing scanners detect some credentials and known sensitive names. AST rules can flag patterns such as `str(error)` in exception-handler return values, but comprehensive detection depends on knowing which values are sensitive. The designed companion specification included data-sensitivity annotations and secret-handling rules, but they were not built. The shipped log-format-injection rule targets injection rather than disclosure, so the portable tool does not cover this entry.
