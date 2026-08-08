---
title: "ACF-S5: Type Structure Avoidance"
weight: 5
acf_id: "ACF-S5"
acf_name: "Type Structure Avoidance"
stride_category: "spoofing"
risk_level: "high"
detection_status: "partial"
entry_type: "code-pattern"
relation: "agent-specific"
entry_status: "provisional"
language_generality: "language-general"
source_chapter: "Appendix A — ACF Taxonomy"
related_entries: ["ACF-S4", "ACF-T1"]
---

## Description

Agent-generated code systematically avoids creating typed data structures — using `dict`, `Map<String, Object>`, `Record<string, any>`, or equivalent untyped containers where a domain-specific type (dataclass, interface, schema model) would be appropriate. The pattern has two faces: (1) function parameters and variables default to `str`, `Any`, `Object`, or equivalent top types, so type information is absent from the start; and (2) data from external APIs is consumed as raw untyped containers (`response.json()` into a bare `dict`, `JsonNode`, or `any`) rather than being hydrated into a validated model. The code compiles, runs, and passes linting — but the type system has nothing to check because no type structure was ever created.

## STRIDE Mapping

**Primary category:** [Spoofing]({{< relref "/threat-model/stride/spoofing" >}})

The spoofing is that the code *appears* to handle structured data — it assigns variables, passes arguments, indexes into results — while the type system is entirely hollow. The code misrepresents its participation in type safety.

## Risk Rating

**High.** This is a detection-surface suppressor — a meta-failure that degrades the detection capability for multiple other taxonomy entries. [ACF-S2]({{< relref "/acf/s2-hallucinated-field-access" >}}) (Spurious Field Access) is detectable by type checkers *if the object has a declared field set*; when the object is `dict[str, Any]`, every field access is valid by definition. [ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) (Authority Tier Conflation) becomes structurally guaranteed: a `dict` from an external API and a `dict` from a validated internal query are the same type — there is no type-level distinction for a tool or reviewer to check. [ACF-R2]({{< relref "/acf/r2-partial-completion" >}}) (Partial Completion) is harder to detect because you cannot determine what fields are missing from a container that declares no required fields. Unlike [ACF-S4]({{< relref "/acf/s4-type-annotation-erosion" >}}), which removes safety nets that were already in place, S5 ensures the safety nets are never constructed — the code never participates in the type system at all. The effect is cumulative: as more functions accept and return untyped containers, typed islands in the codebase become disconnected, and the type checker's effective coverage shrinks even though no annotation was removed.

## Generative Mechanism

Typed structures require understanding the domain schema: which fields exist, which are required, what their types and constraints are, and how they relate to other structures. An untyped container requires none of this — `dict[str, Any]` accepts anything, compiles immediately, and never produces a type error. Training data contains both approaches, but the untyped path is shorter, requires fewer coordinated changes (no model definition, no import, no migration), and never blocks the agent with a type error it would need to resolve. For external API data, the problem is amplified: the agent would need to read API documentation, infer a schema, and create a model — or it can call `.json()` and index into the result with string keys. The path of least resistance produces working code with zero type safety. Unlike [ACF-S4]({{< relref "/acf/s4-type-annotation-erosion" >}}) (Type Annotation Erosion), where existing type infrastructure is degraded, S5 means the infrastructure was never built — there is nothing to erode.

## Examples

**Python:**

```python
# Agent-generated — external API consumed as bare dict
def sync_partner_clearances(api_url: str, auth: str) -> dict:
    response = requests.get(f"{api_url}/clearances", headers={"Authorization": auth})
    data = response.json()  # dict[str, Any] — no schema, no validation
    results = {}
    for item in data["records"]:
        # String-keyed access — typos are runtime errors, not type errors
        results[item["entity_id"]] = item["clearance_level"]
    return results

# Correct — external data hydrated into a validated model
class PartnerClearance(BaseModel):
    entity_id: str
    clearance_level: ClearanceLevel  # enum — constrained values
    issued_date: date
    expiry_date: date | None

class ClearanceResponse(BaseModel):
    records: list[PartnerClearance]

def sync_partner_clearances(api_url: str, auth: str) -> dict[str, ClearanceLevel]:
    response = requests.get(f"{api_url}/clearances", headers={"Authorization": auth})
    data = ClearanceResponse.model_validate(response.json())
    # Type checker knows every field. Typos caught at edit time.
    # Invalid clearance_level values rejected at parse time.
    return {record.entity_id: record.clearance_level for record in data.records}
```

**TypeScript:**

```typescript
// Agent-generated — API response typed as any
async function getPartnerClearances(apiUrl: string): Promise<any> {
    const resp = await fetch(`${apiUrl}/clearances`);
    const data = await resp.json(); // any — no type narrowing
    return data.records.map((r: any) => ({
        id: r.entity_id,
        level: r.clearance_level  // typo in field name? No error.
    }));
}

// Correct — typed interface with runtime validation
interface PartnerClearance {
    entity_id: string;
    clearance_level: ClearanceLevel;
    issued_date: string;
    expiry_date: string | null;
}

async function getPartnerClearances(apiUrl: string): Promise<PartnerClearance[]> {
    const resp = await fetch(`${apiUrl}/clearances`);
    const data: unknown = await resp.json();
    const parsed = ClearanceResponseSchema.parse(data); // Zod — runtime validation
    return parsed.records;
    // TypeScript knows the shape. Field access is checked at compile time.
}
```

## Detection Approaches

Flag functions whose parameters or return types use `dict[str, Any]`, `Dict[str, object]`, `Map<String, Object>`, `Record<string, any>`, `JsonNode`, or equivalent untyped containers — particularly where the function interacts with external data sources (HTTP clients, database results, message queue payloads). Flag API client code where `.json()`, `JSON.parse()`, or equivalent deserialisation calls are not immediately followed by schema validation or model hydration. Detection is rated Partial because the surface patterns are identifiable by lint rules, but distinguishing legitimate uses of untyped containers (genuinely dynamic data, configuration blobs, serialisation boundaries) from type structure avoidance requires context.

A useful heuristic: in a well-typed codebase, untyped containers should appear only at serialisation boundaries and should be immediately narrowed; if they propagate through function signatures, the type system's coverage is eroding. Codebases with strict type-checking configurations (`disallow_any_explicit` in mypy, `strict` mode in TypeScript, `@NonNullApi` in Java) will catch many instances, but the detection depends on the strictness being configured — and agents generating new modules may not inherit the project's strictness settings.

This is a practical gap worth monitoring: when an agent creates a new file, it typically does not pick up per-directory mypy overrides, `tsconfig.json` strict-mode inheritance, or equivalent project-level type strictness. The result is that new agent-generated modules start with weaker type checking than the surrounding codebase, creating a detection gap precisely where the newest (and least-reviewed) code lives. Organisations should ensure that project-level type strictness is configured to apply by default to new files, not just existing ones.

## Remediation

*This section is in development. Contributions welcome.*

## Prevention

Detection approaches for this provisional entry are under development.

## Related Entries

- **[ACF-S4]({{< relref "/acf/s4-type-annotation-erosion" >}}) (Type Annotation Erosion).** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.
- **[ACF-T1]({{< relref "/acf/t1-authority-tier-conflation" >}}) (Authority Tier Conflation).** S5 is a representational failure — external and internal data are both reduced to untyped containers, so downstream code cannot distinguish them at the type level. T1 is the trust-boundary failure that results when such data crosses into trusted processing without validation. S5 makes T1 harder to detect; T1 is the semantic violation itself.

## References

- [Agentic Code Threat Model Discussion Paper — Appendix A: ACF Taxonomy](https://semanticdefects.foundryside.dev/understand/paper/#appendix-a-agentic-code-failure-taxonomy)
