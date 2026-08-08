# Semantic Defects in AI-Generated Code

An assurance framework for high-stakes systems that use AI to generate code.

**Read the full site: [semanticdefects.foundryside.dev](https://semanticdefects.foundryside.dev/)**

## What this is

AI coding tools are in active use across high-stakes code bases. This body of work identifies a specific class of defect they produce: code that is syntactically correct, passes automated checks, looks right to reviewers, but makes the wrong decision about data that matters in its institutional context.

The project provides:

- A **taxonomy of failure modes** (ACF) mapped to STRIDE categories
- **Assessment tools** for CISOs, security assessors, and technical leads
- A **practical review guide** for code authors working without CI pipelines
- The **Wardline as-built specification** — a semantic trust-boundary enforcement tool ([wardline on PyPI](https://pypi.org/project/wardline/)), specified as actually built and honestly annotated with what was designed but not built

## Start here

- [**Governing AI-Generated Code**](https://semanticdefects.foundryside.dev/understand/) — the entry point for all audiences (~13 pages)
- [**Practical Guide for Code Authors**](https://semanticdefects.foundryside.dev/respond/practical-guide/) — hands-on review guidance with worked examples
- [**Full Discussion Paper**](https://semanticdefects.foundryside.dev/understand/paper/) — the complete technical analysis (~200 pages)

## Status

v0.2.0 — Draft for Comment

## Local development

```bash
pip install mkdocs mkdocs-material
mkdocs serve        # http://127.0.0.1:8000
```

## Licence

See [About This Project](https://semanticdefects.foundryside.dev/reference/about/) for attribution and licence details.
