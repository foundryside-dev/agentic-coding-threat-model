---
title: "Engine Findings"
weight: 4
---

Not everything wardline emits is a policy rule. A separate `WLN-ENGINE-*` family reports **on the scan** rather than on the code, and a reader counting rule identifiers in a report will meet them.

| Identifier | Kind / severity | What it reports |
|---|---|---|
| `WLN-ENGINE-POLICY-CONFIG` | DEFECT, `ERROR` | Project policy configuration weakens or disables wardline's own rules |
| `WLN-ENGINE-PARSE-ERROR` | DEFECT, `ERROR` | A file that could not be parsed. Gate-eligible since v1.0.1 — unscanned code must not read green |
| `WLN-ENGINE-NESTED-SCAN-ROOT` | — | A subdirectory scan that will mint identities the rest of the toolchain will not match |
| `WLN-ENGINE-FINGERPRINT-COLLISION` | DEFECT | Two distinct findings sharing a fingerprint — gate-tripping, so one can never silently mask the other on cross-tool joins |
| `WLN-ENGINE-METRICS` | METRIC, `NONE` | Per-function provenance histogram; the input the [inertness trip]({{< relref "../gates-suppression-and-judge" >}}#inertness) folds |
| `WLN-L3-LOW-RESOLUTION` | `INFO` | A function whose calls the resolver could not resolve — an analysis-confidence signal, not a policy defect |
| `WLN-L3-MONOTONICITY-VIOLATION` | `ERROR` | A non-anchored function moved toward *more*-trusted during propagation — a transfer-function bug. The function is pinned at its older, safer value |

**Findings of kind `FACT` or `METRIC` carry severity `NONE` and never gate.**

## `WLN-ENGINE-POLICY-CONFIG` — the rule set defending itself

Fires when:

- `rules.enable` selects no rules
- a pattern matches no known rule
- a severity override names an unknown rule
- an override is not a valid severity
- an override tries to set a defect rule to `NONE`

In each case **the offending directive is not honoured** — the finding is raised and the configuration is rejected, rather than the rule set quietly shrinking.

> [!NOTE]
> This is [caller-granted trust]({{< relref "../declarations-and-trust-grants" >}}) applied to the rule set itself. A repository can misconfigure wardline; **it cannot misconfigure wardline into silence without saying so out loud.**

## The `--fail-on-unanalyzed` sub-gate

Keys on the scan's **unanalysed count** — files discovered but never analysed, excluding benign no-module skips — not on the presence of any one of these findings. See [the gate decision]({{< relref "../gates-suppression-and-judge" >}}#the-gate-decision).

## See also

- [Gates, Suppression, and the Judge]({{< relref "../gates-suppression-and-judge" >}}) — what gates and what does not
