---
title: "ACF-S5: Type Structure Avoidance"
sidebar:
  label: "ACF-S5: Type Structure Avoidance"
  order: 17
acf:
  id: ACF-S5
  name: Type Structure Avoidance
  stride: spoofing
  failure_layer: training-bias
  entry_type: code-pattern
  relation: agent-specific
  risk_level: high
  detection_status: partial
  portable_coverage: not-covered-bespoke-only
  entry_status: provisional
  language_generality: language-general
  related: [ACF-S4, ACF-T1]
---

## Description

Agent-generated code avoids domain-specific types, using `dict`, `Map<String, Object>`, `Record<string, any>`, or equivalent containers instead. Parameters begin as top types, and external data is consumed as raw containers rather than hydrated into validated models. The code runs and passes linting, but the type system has no structure to check.

This is a detection-surface suppressor. Spurious fields cannot be checked when every field is permitted by `Any`; external and internal records cannot be distinguished when both are bare dictionaries; missing required fields cannot be inferred when no fields are declared. The code appears to handle structured data while its type structure is hollow.

## Why agents produce this

Typed structures require understanding the domain schema, required fields, constraints, and relationships. An untyped container requires none of that, compiles immediately, and avoids coordinated model and import changes. For API data, calling `.json()` and indexing string keys is shorter than reading the schema, defining a model, and validating the response.

## Example

### Python

```python
# Agent-generated: external data remains an unvalidated dictionary.
def sync_partner_clearances(api_url: str, auth: str) -> dict:
    response = requests.get(
        f"{api_url}/clearances",
        headers={"Authorization": auth},
    )
    data = response.json()
    return {
        item["entity_id"]: item["clearance_level"]
        for item in data["records"]
    }


class PartnerClearance(BaseModel):
    entity_id: str
    clearance_level: ClearanceLevel
    issued_date: date
    expiry_date: date | None


class ClearanceResponse(BaseModel):
    records: list[PartnerClearance]


def sync_partner_clearances(
    api_url: str,
    auth: str,
) -> dict[str, ClearanceLevel]:
    response = requests.get(
        f"{api_url}/clearances",
        headers={"Authorization": auth},
    )
    data = ClearanceResponse.model_validate(response.json())
    return {record.entity_id: record.clearance_level for record in data.records}
```

### TypeScript

```typescript
// Agent-generated — API response typed as any
async function getPartnerClearances(apiUrl: string): Promise<any> {
  const resp = await fetch(`${apiUrl}/clearances`);
  const data = await resp.json(); // any — no type narrowing
  return data.records.map((r: any) => ({
    id: r.entity_id,
    level: r.clearance_level // typo in field name? No error.
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
  const parsed = ClearanceResponseSchema.parse(data);
  return parsed.records;
  // TypeScript knows the shape. Field access is checked at compile time.
}
```

## Detection

Flag untyped containers in parameters and return types, especially around HTTP, database, or queue boundaries. Flag deserialisation not immediately followed by schema validation or model hydration. The patterns are recognisable, but legitimate dynamic data and serialisation boundaries require context. In a well-typed system, untyped containers should be narrowed at the boundary rather than propagated through signatures.

## Distinguished from

**ACF-S4 vs ACF-S5:** S4 removes or weakens type safety that already exists; S5 avoids creating type structure in the first place. S4 is erosion of an existing detection surface; S5 is failure to construct that surface at all.

**ACF-S5 vs ACF-T1:** S5 is a representational failure — external and internal data are both reduced to untyped containers, so downstream code cannot distinguish them at the type level. T1 is the trust-boundary failure that results when such data crosses into trusted processing without validation. S5 makes T1 harder to detect; T1 is the semantic violation itself.
