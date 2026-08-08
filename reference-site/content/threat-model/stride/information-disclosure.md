---
title: "Information Disclosure"
weight: 4
stride_slug: "information-disclosure"
---

In traditional STRIDE analysis, information disclosure involves sensitive data exposed to unauthorised parties — through a misconfigured access control, a side-channel leak, an unprotected API endpoint, or data at rest without encryption. The exposure is typically of *stored or transmitted* data.

The agentic variant concerns **verbose error responses and stack trace exposure**: agent-generated error handling that exposes internal system details in error responses, log messages, or API returns.

## Mechanism

Agents produce "helpful" error messages that include internal state, query parameters, file paths, or stack traces (ACF-I1: Verbose Error Response). This is good practice for development but dangerous in production, and agents do not distinguish between the two contexts. Stack trace exposure — a related pattern well-covered by existing SAST tooling — is not catalogued as a separate core ACF entry because existing tools provide adequate detection.

## Code examples

```python
# Agent-generated "helpful" error handler
except DatabaseError as e:
    return {
        "error": str(e),
        "query": sql_query,         # Exposes database schema
        "connection": str(db_url),  # May contain credentials
        "params": query_params,     # Exposes internal identifiers
    }

# Stack trace in API response
except Exception as e:
    import traceback
    return {"error": traceback.format_exc()}
    # Full stack trace exposes file paths, function names, and library versions.
```

## Why existing controls miss it

The error handling is syntactically correct and genuinely helpful during development. Detecting that internal details should not appear in production error responses requires understanding the deployment context, not the code structure.

## Risk in government context

Reconnaissance information for attackers, credential exposure, and violation of need-to-know principles.

## ACF entries in this category

The ACF taxonomy covers one entry in this category:

- [ACF-I1: Verbose Error Response]({{< relref "/acf/i1-verbose-error-response" >}}) — error messages that expose internal state including database credentials, query parameters, and connection strings

Stack trace exposure (e.g., `traceback.format_exc()` in response handlers) is a related pattern well-covered by existing SAST tooling and is not catalogued as a separate ACF entry.

## See also

- [ACF Taxonomy Index]({{< relref "/acf" >}}) — complete taxonomy of AI code failure modes
- [Repudiation]({{< relref "repudiation" >}}) — related category: verbose error handling can also destroy audit trails
- [Elevation of Privilege]({{< relref "elevation-of-privilege" >}}) — related category: exposed details enable further exploitation
