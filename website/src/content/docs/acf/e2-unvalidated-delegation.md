---
title: "ACF-E2: Unvalidated Delegation"
sidebar:
  label: "ACF-E2: Unvalidated Delegation"
  order: 15
acf:
  id: ACF-E2
  name: Unvalidated Delegation
  stride: elevation-of-privilege
  failure_layer: training-bias
  entry_type: code-pattern
  relation: known-class-agent-amplified
  risk_level: high
  detection_status: partial
  portable_coverage: partial
  entry_status: core
  language_generality: language-general
  related: []
---

## Description

User-supplied parameters are used directly in privileged operations such as database queries, file access, or system commands without validation or restriction. Arbitrary parameters may expose internal fields, modify read-only values, or reach records that should remain inaccessible. The delegation gives the user the effective privilege of the operation receiving those parameters.

The same structure exists at the process layer. Agentic coding tools inherit operator credentials and can execute privileged actions unless the operator constrains the permitted scope. In both layers, the mitigation is an allowlist: permitted query fields in code and permitted operations in the development process.

## Why agents produce this

Patterns such as `filter_by(**user_params)` are concise and idiomatic. They are the shortest route from user input to a result. Restricting the parameters to an allowlist is a security requirement rather than a language requirement, so the unvalidated delegation looks complete to the agent.

## Example

```python
# Agent-generated: every supplied field is delegated to a privileged query.
def search_records(user_query: dict):
    return db.query(Record).filter_by(**user_query)


ALLOWED_SEARCH_FIELDS = frozenset({"name", "status", "created_date"})


def search_records(user_query: dict):
    filtered = {
        key: value
        for key, value in user_query.items()
        if key in ALLOWED_SEARCH_FIELDS
    }
    return db.query(Record).filter_by(**filtered)
```

## Detection

SQL-injection scanners find some string-interpolation cases but do not consistently detect `**kwargs` delegation into ORM operations. Semantic detection must know which inputs are user-controlled, which operations are privileged, and whether validation occurred. The portable companion tool partially covers untrusted data reaching deserialisation, dynamic execution, command execution, dynamic import, or native-library loading. It does not model the broader authorisation-check-before-action requirement.
