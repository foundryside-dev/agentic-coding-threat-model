---
title: "Boundary Rules"
weight: 1
---

**Twelve rules.** These exist because someone made a trust declaration. They have no counterpart in a general-purpose scanner, because a general-purpose scanner has nothing to check the declaration against. **This is the family the designed specification was actually about.**

Severities below are **base** severities, before [tier modulation]({{< relref "/wardline/rules" >}}#severity-is-a-product-not-a-table).

| ID | Base | Maturity | What it detects |
|---|---|---|---|
| `PY-WL-101` | ERROR | stable | A trust-anchored function returns data less trusted than the level it declares — untrusted data reaches a trusted producer with no validation |
| `PY-WL-102` | ERROR | stable | A trust boundary has no rejection path (no `raise`, no falsy-constant return) — so it cannot validate |
| `PY-WL-103` | WARN | stable | A broad exception handler (bare `except` / `Exception` / `BaseException`) in a trusted-tier function |
| `PY-WL-104` | WARN | stable | An exception handler that silently swallows the error — body is only `pass`/`...`/`continue`/`break` or a bare constant expression |
| `PY-WL-105` | ERROR | stable | Untrusted data passed as an argument to a trusted producer at a call site (CWE-501) |
| `PY-WL-109` | WARN | stable | A trusted producer has both a value-bearing return and a `None`-yielding return — `None` leaks from a function declaring trusted output (CWE-394) |
| `PY-WL-110` | WARN | stable | An entity carries two or more distinct trust markers (e.g. `@trusted` + `@external_boundary`) — a contradictory declaration the engine resolves silently |
| `PY-WL-111` | ERROR | stable | A trust boundary's **only** rejection path is `assert`, which `python -O` strips — the validation silently vanishes in production (CWE-617) |
| `PY-WL-113` | ERROR | stable | A trust boundary fails open — an exception handler swallows the failure and returns a substitute value instead of re-raising, so the boundary can be bypassed by triggering the exception (CWE-636) |
| `PY-WL-114` | ERROR | stable | A builtin trust decorator has a level argument that is statically readable but invalid or out of range |
| `PY-WL-119` | ERROR | preview | No-op validator boundary — the return is equivalent to the input |
| `PY-WL-120` | ERROR | preview | Stored or persisted taint reaches trusted state without validation |

## Rules worth reading in detail

### PY-WL-101 — the flagship

A function decorated `@trusted(level="ASSURED")` that returns the output of an `@external_boundary` function without validation. The finding names **both halves of the contradiction** — the declared level and the actual one — which is why it can be explained to a code author in one sentence.

```
PY-WL-101 ERROR — app.orders.record_order declares return trust ASSURED but
actually returns UNKNOWN_RAW (less trusted) — untrusted data reaches a trusted
producer
```

This is the rule that covers [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) and [ACF-E1]({{< relref "/acf/e1-implicit-privilege-grant" >}}).

### PY-WL-111 and PY-WL-113 — boundaries that only look like they validate

Both are cases where the rejection path exists **in the source** and does not exist **in the deployed behaviour**: stripped by `python -O`, or swallowed by the handler wrapped around it.

`PY-WL-111` is careful about the claim it makes — it fires only when `assert` is the *sole* rejection path, because a `raise` alongside it survives `-O` and the CWE-617 claim would then be factually false.

Credit where due: the archived `WL-007` commentary had both of these. It excluded assertions from its list of rejection paths on exactly the `-O` reasoning `PY-WL-111` now encodes, and it called for a separate advisory finding where a boundary contains no success path — the shape `PY-WL-119` sits next to. **The rules were built from the code rather than from the archive, and arrived at the same two places.**

### PY-WL-114 — keeping the decorator contract honest

The rule that enforces the [declaration surface]({{< relref "../declarations-and-trust-grants" >}}#the-declaration-surface-three-decorators) at analysis time. Its violating examples include an *aliased* import (`from wardline.decorators import trusted as t`, then `@t(level='ASURED')`), because the alias resolves to the builtin and a typo there would otherwise silently disable the gate.

Its clean examples include a decorator that merely happens to be spelled `trusted` but is not the builtin marker — a foreign decorator with an invalid level is not this rule's business.

### PY-WL-102 versus PY-WL-119

They partition the broken-validator space:

| Shape | Rule |
|---|---|
| A boundary with **no rejection path at all** | `PY-WL-102` |
| A boundary that is a **no-op** (`return p`) | `PY-WL-119` |

`boundary_without_rejection.py` carries the comment marking the split.

### PY-WL-120 — the conservative stored-taint rule

Flags stored or persisted taint reaching a trusted state. It is the nearest thing the implementation has to a provenance model, and it is deliberately not one — it flags the flow rather than adjudicating the evidence behind it. Trusted restoration boundaries with four categories of provenance evidence were designed and [never built]({{< relref "../roadmap-the-unbuilt" >}}#trusted-restoration-boundaries).

It de-conflicts with `PY-WL-101` in the fail-safe direction: disabling 101 makes 120 *keep* the return finding rather than drop it.

## Mapping to the designed rules

| Designed | Implemented as | Status |
|---|---|---|
| `WL-001` member access with fallback default | — | **Never built.** The largest gap between the parent paper's argument and the tool |
| `WL-002` existence-checking as structural gate | — | Never built |
| `WL-003` catching all exceptions broadly | `PY-WL-103` | Survived |
| `WL-004` catching exceptions silently | `PY-WL-104` | Survived |
| `WL-005` audit-critical writes in broad handlers | — | Never built — the implementation flags broad and silent handlers but does not distinguish the audit-write case |
| `WL-006` runtime type-checking internal data | — | Never built |
| `WL-007` validation with no rejection path | `PY-WL-102`, `PY-WL-119` | Survived, split |
| `WL-008` semantic validation without shape validation | — | Never built |

The designed intent behind each unbuilt rule is recorded in [Roadmap: the unbuilt]({{< relref "../roadmap-the-unbuilt" >}}#rules-designed-but-not-implemented).

## See also

- [Sink rules]({{< relref "sink-rules" >}}) — the other fourteen
- [Residual risks]({{< relref "../residual-risks" >}}#declaration-risks) — what these rules cannot establish about a declaration
