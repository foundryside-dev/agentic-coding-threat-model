---
title: "Home"
tags:
  - executive
  - overview
hide:
  - toc
---

<div class="hero" markdown>

# Semantic Defects in AI-Generated Code

<p class="hero-subtitle">A threat model and assurance framework for high-reliability systems that use AI to generate code</p>
<p class="hero-version">v0.1.0 — Draft for Comment — 24 March 2026</p>

<div class="hero-actions" markdown>

[Start reading](understand/index.md){ .md-button .md-button--primary }
[Assess your exposure](assess/index.md){ .md-button .md-button--secondary }

</div>

</div>

AI coding tools are in active use across organisations and their contracted suppliers. These tools are productive and increasingly standard — this body of work does not recommend restricting them. It identifies a specific class of defect they produce that existing assurance frameworks were not designed to catch: code that is syntactically correct, passes all automated checks, looks right to reviewers, but makes the wrong decision about data that matters in its institutional context.

---

## Start here

[**Governing AI-Generated Code**](understand/index.md) (~13 pages) is the entry point for all audiences — it establishes the problem and summarises the response. Two paths branch from it:

- **For practitioners** — [Reviewing AI-Generated Code: A Practical Guide](respond/practical-guide.md) gives hands-on review guidance for staff who use AI to write code but do not have CI pipelines or developer tooling.
- **For assessment and governance** — the [CISO Assessment](assess/ciso-assessment.md) and [Assessor Checklist](assess/irap-checklist.md) evaluate organisational exposure against the failure taxonomy.

The [Full Discussion Paper](understand/paper.md) (~200 pages) is the complete technical analysis underpinning both paths.

---

## Find your path

<div class="grid cards" markdown>

-   :material-shield-account:{ .lg .middle } **CISO / Security Adviser**

    ---

    Evaluate control gaps against the ACF taxonomy

    [:material-arrow-right: CISO Assessment](assess/ciso-assessment.md)

-   :material-clipboard-check:{ .lg .middle } **Security Assessor**

    ---

    Assessment-ready checklist with ISM mapping

    [:material-arrow-right: Assessor Checklist](assess/irap-checklist.md)

-   :material-code-braces:{ .lg .middle } **Developer / Code Author**

    ---

    Five review questions with worked code examples

    [:material-arrow-right: Practical Guide](respond/practical-guide.md)

-   :material-account-tie:{ .lg .middle } **Executive**

    ---

    The problem in 13 pages

    [:material-arrow-right: Governing AI-Generated Code](understand/index.md)

-   :material-sitemap:{ .lg .middle } **Architect / Tech Lead**

    ---

    Failure taxonomy mapped to STRIDE categories

    [:material-arrow-right: ACF Taxonomy](understand/taxonomy.md)

</div>

For detailed reading paths with time estimates and depth options, see the [Reading Guide](reference/reading-guide.md). You can also [browse all pages by tags](reference/tags.md).

---

## The document suite

| Document | Pages | Audience | PDF |
|----------|:-----:|----------|:---:|
| [**Governing AI-Generated Code**](understand/index.md) | ~13 | Everyone — entry point for all other reading | [:material-file-pdf-box:](pdf/governing-ai-generated-code.pdf) |
| [**Practical Guide**](respond/practical-guide.md) | ~23 | Staff using AI to write code | [:material-file-pdf-box:](pdf/reviewing-ai-generated-code.pdf) |
| [**Discussion Paper**](understand/paper.md) | ~200 | Technical leads, assessors, security architects | [:material-file-pdf-box:](pdf/threat-model-discussion-paper-community.pdf) |
