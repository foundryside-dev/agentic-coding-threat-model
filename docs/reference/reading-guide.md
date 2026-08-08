---
tags:
  - all-audiences
  - guide
---

# Reading Guide

This guide helps you navigate the discussion paper suite based on your role and available time. The suite presents one argument at several depths — from a 13-page overview to the ~200-page full analysis. You do not need to read everything; the routing tables below identify what is relevant to your role.

For a quick overview of all documents, see the [home page](../index.md).

---

## By time available

| Time | What to read | What you'll get |
|------|-------------|-----------------|
| **5 minutes** | [Governing AI-Generated Code](../understand/index.md) §1 (one-paragraph problem) + §3 (three properties) | Whether this risk applies to your organisation |
| **30 minutes** | [Governing AI-Generated Code](../understand/index.md) in full (~13 pages) | The complete argument and response landscape — enough to brief others |
| **1 hour** | Governing AI-Generated Code + [Practical Guide](../respond/practical-guide.md) | Actionable next steps — review techniques and how to apply them |
| **Half day** | Discussion paper [§1–6](../understand/paper.md#1-introduction-and-scope), [App A](../understand/taxonomy.md) (taxonomy), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (controlled generation case study), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (longitudinal case study) | Deep technical understanding of threat landscape and evidence base |
| **Full day** | [Full discussion paper](../understand/paper.md) (~200 pages) | Complete command of the analysis |

---

## Reading paths by role

The [home page](../index.md#find-your-path) has the role routing cards. Below are the paths in detail, organised by audience cluster.

---

### Leadership, policy, and non-developer staff

#### Executive (Secretary, Deputy Secretary, SES)

**Task:** Decide whether to invest further time, resources, or policy attention.

**5-minute path:**

Read [Governing AI-Generated Code](../understand/index.md) §1 ("The one-paragraph problem"). This gives you the core finding: AI coding tools produce code that passes every automated check but makes the wrong decision about data that matters in institutional contexts. The question for your organisation is whether you have detection capability for this class of defect.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the full 13-page document. Covers the problem, the evidence, the three properties that make it a distinct risk class, the gaps in current frameworks, and the staged response.
2. Discussion paper [Executive Summary](../understand/paper.md#executive-summary) (2 pages) — the condensed version of the ~200-page analysis.

**After reading:** You should be able to answer: "Is our organisation exposed? Are our suppliers?" and decide whether to direct your CTO/CISO to investigate further.

**Key sections if you go deeper:** Discussion paper [App E §E.7](../understand/paper.md#e7-cross-cutting-observations) (1 page) — cross-cutting observations from the longitudinal case study, written for a non-technical audience.

---

#### Policy officer / adviser

**Task:** Understand the problem and where current frameworks fall short.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the core argument in accessible form.

**1-hour path (adds rationale and evidence):**

2. Discussion paper [§6](../understand/paper.md#6-current-guidance-gap-analysis) (guidance gap analysis) — where the ISM, Essential Eight, OWASP, and NIST SSDF leave gaps for agent-generated code.

**Key sections if you go deeper:** Discussion paper [Executive Summary](../understand/paper.md#executive-summary), [§6](../understand/paper.md#6-current-guidance-gap-analysis) (guidance gap analysis), [App E §E.4–E.7](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (longitudinal case study — policy-not-applied pattern and cross-cutting observations), [App G](../understand/paper.md#appendix-g-a-systems-thinking-primer-for-this-papers-arguments) (systems thinking primer).

---

#### Programme director

**Task:** Understand organisational exposure and decide on team-level response.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the core argument in accessible form.
2. Discussion paper [§9.6](../understand/paper.md#96-legacy-modernisation-and-implicit-security-properties) (legacy modernisation risk — particularly relevant for modernisation programmes), [App E §E.7](../understand/paper.md#e7-cross-cutting-observations) (cross-cutting observations), [App E §E.6](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (spec-level review — catching violations before code is written).

**After reading:** You should understand whether your programme's codebase is exposed and whether the [Practical Guide](../respond/practical-guide.md) should be distributed to your development teams.

---

### Security, assessment, and assurance

#### CISO / Security adviser

**Task:** Assess control gaps and prioritise remediation.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the core argument.
2. [CISO Assessment](../assess/ciso-assessment.md) — translates the failure taxonomy into control-gap language, maps failure modes to existing ISM controls, and identifies where current frameworks leave gaps.

**1-hour path (adds taxonomy and actionable detail):**

3. [ACF Taxonomy](../understand/taxonomy.md) — the summary tables at the top give you the full threat landscape with STRIDE mapping, risk ratings, and detection status at a glance.

**After reading:** You should be able to produce a control-gap assessment and a prioritised remediation plan.

**Key sections if you go deeper:** Discussion paper [§2](../understand/paper.md#2-the-threat-is-not-what-you-think) (the threat), [§6](../understand/paper.md#6-current-guidance-gap-analysis) (full gap analysis), [App E §E.7](../understand/paper.md#e7-cross-cutting-observations) (cross-cutting observations).

---

#### CTO / CIO

**Task:** Assess organisational exposure and determine response investment.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the full argument in accessible form.
2. Discussion paper [§1–2](../understand/paper.md#1-introduction-and-scope) (scope and threat characterisation), [§6](../understand/paper.md#6-current-guidance-gap-analysis) (gap analysis).

**1-hour path (adds case study and operational evidence):**

3. Discussion paper [§8](../understand/paper.md#8-case-studies-what-the-invisibility-problem-looks-like-in-practice) (case studies — what detection looks like in practice, productivity impact, the redirection insight), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

**After reading:** You should be able to scope the response — whether existing controls are sufficient, what detection capability is needed, and how to brief your CISO and development leads.

---

#### IRAP assessor

**Task:** Evaluate AI-assisted development against ISM controls.

**30-minute path:**

1. [IRAP Checklist](../assess/irap-checklist.md) — your primary working document.

**1-hour path (adds evidence base and response landscape):**

2. Discussion paper [§7](../understand/paper.md#7-the-response-landscape) (response landscape), [§9](../understand/paper.md#9-open-questions) (open questions — evidence thresholds), [App A](../understand/taxonomy.md) (ACF taxonomy).

**Key sections if you go deeper:** Discussion paper [§6](../understand/paper.md#6-current-guidance-gap-analysis) (gap analysis), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (transcripts).

---

#### Auditor / assurance

**Task:** Assess governance adequacy and evidence thresholds.

**30-minute path:**

1. Discussion paper [Executive Summary](../understand/paper.md#executive-summary), [App E §E.7](../understand/paper.md#e7-cross-cutting-observations) (cross-cutting observations).

**Key sections if you go deeper:** Discussion paper [§9](../understand/paper.md#9-open-questions) (open questions — governance mechanics, evidence thresholds), [App E §E.4–E.5](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (policy-not-applied pattern).

---

#### Procurement / contracts

**Task:** Understand what to require from suppliers delivering AI-assisted code.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) §5–6 (the contracted development dimension).

**Key sections if you go deeper:** Discussion paper [§6.7](../understand/paper.md#67-contracted-development-as-the-primary-delivery-context) (contracted development as the primary delivery context), [App E §E.4–E.5](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (what detection looks like in practice — policy-not-applied pattern).

---

### Development and implementation

#### Developer / code author

**Task:** Understand the threat, review code effectively, and plan detection capability.

**30-minute path:**

1. [Practical Guide](../respond/practical-guide.md) (~23 pages) — five review questions with worked code examples, hot-path identification, and pattern recognition techniques. This is hands-on and immediately applicable.
2. [Governing AI-Generated Code](../understand/index.md) — for context on why these defects matter.

**1-hour path (adds the analytical framework):**

3. [ACF Taxonomy](../understand/taxonomy.md) — the detailed failure mode entries with code examples and detection approaches.
4. Discussion paper [§2](../understand/paper.md#2-the-threat-is-not-what-you-think) (the threat), [§4](../understand/paper.md#4-the-review-process-as-attack-surface) (review as attack surface), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript — the most instructive section for practitioners).

**After reading:** You should be able to identify the highest-risk code paths in your project, apply the five review questions, and evaluate whether detection tooling (custom rules or semantic enforcement) is warranted.

---

#### Citizen programmer (non-developer using AI to write code)

**Task:** Learn to review code you've generated with AI chat tools, without CI or developer tooling.

**30-minute path:**

1. [Practical Guide](../respond/practical-guide.md) (~23 pages) — five review questions, worked code examples, hot-path identification. Written specifically for people copying code from AI chat windows.
2. [Governing AI-Generated Code](../understand/index.md) — for context on why this matters.

**Key sections if you go deeper:** Discussion paper [App C](../understand/paper.md#appendix-c-extension-to-agentic-sql-generation) (SQL extension — relevant for data and analytics work), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation with worked examples), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (annotated transcripts).

---

#### Development team lead

**Task:** Assess team exposure and decide whether to adopt detection tooling.

**30-minute path:**

1. [Governing AI-Generated Code](../understand/index.md) — the core argument.
2. Discussion paper [§2](../understand/paper.md#2-the-threat-is-not-what-you-think) (the threat), [§4](../understand/paper.md#4-the-review-process-as-attack-surface) (review as attack surface), [§7](../understand/paper.md#7-the-response-landscape) (response landscape), [App A](../understand/taxonomy.md) (ACF taxonomy).

**1-hour path (adds case studies):**

3. Discussion paper [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

---

#### Tool implementer / architect

**Task:** Build or evaluate semantic enforcement tooling.

**30-minute path:**

1. Discussion paper [§2–3](../understand/paper.md#2-the-threat-is-not-what-you-think) (the threat and its three properties), [App A](../understand/taxonomy.md) (detection approaches per taxonomy entry).

**1-hour path (adds implementation evidence):**

2. Discussion paper [§7.2](../understand/paper.md#72-technical-controls-what-is-buildable) (technical controls — what is buildable), [§8](../understand/paper.md#8-case-studies-what-the-invisibility-problem-looks-like-in-practice) (case studies), [App E](../understand/paper.md#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

---

## Other roles

| Role | Start here | Then if needed |
|------|-----------|----------------|
| **Autonomy assessment** | [Autonomy Self-Assessment](../assess/autonomy-assessment.md) | Discussion paper [App B](../understand/paper.md#appendix-b-agent-autonomy-self-assessment) |
| **Analyst / data engineer / ops staff** | [Practical Guide](../respond/practical-guide.md) | [Governing AI-Generated Code](../understand/index.md); Discussion paper [App C](../understand/paper.md#appendix-c-extension-to-agentic-sql-generation) (SQL extension), [App D](../understand/paper.md#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) |
