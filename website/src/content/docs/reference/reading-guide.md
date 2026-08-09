---
title: 'Reading Guide'
sidebar: { order: 4 }
---

AI coding tools are in active use across organisations and their contracted suppliers. They are productive and increasingly standard, and this body of work does not recommend restricting them; it addresses a specific defect class that existing assurance frameworks were not designed to catch: code that is syntactically correct, passes automated checks, and looks right to reviewers but makes the wrong institutional decision, such as a silently defaulted security classification, a swallowed audit record, or an unvalidated external authority claim treated as trusted. Informed by measured defect data from a real project, the suite classifies the failure modes using a STRIDE-based taxonomy and assesses gaps in current guidance, including the ISM and Essential Eight. It presents one argument at different depths, and the **Document Suite Map** routes **12 roles** from the accessible overview and practical guide through the discussion paper and **Wardline companion**, so you do not need to read the whole suite.

**Start here:** [Governing AI-Generated Code](../../understand/) is the common entry point. **If you have 15 minutes**, read its problem statement and then use the role paths below; **What to read next** depends on whether you need practical review guidance, assurance evidence, or implementation detail. For a quick overview of all documents, see the [home page](../../).

---

## By time available

| Time | What to read | What you'll get |
|------|-------------|-----------------|
| **5 minutes** | [Governing AI-Generated Code](../../understand/) §1 (one-paragraph problem) + §3 (three properties) | Whether this risk applies to your organisation |
| **30 minutes** | [Governing AI-Generated Code](../../understand/) in full (~13 pages) | The complete argument and response landscape — enough to brief others |
| **1 hour** | Governing AI-Generated Code + [Practical Guide](../../respond/practical-guide/) | Actionable next steps — review techniques and how to apply them |
| **Half day** | Discussion paper [§1–6](../../pdf/threat-model-discussion-paper-community.pdf#1-introduction-and-scope), [App A](../../acf/) (taxonomy), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (controlled generation case study), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (longitudinal case study) | Deep technical understanding of threat landscape and evidence base |
| **Full day** | [Full discussion paper](../../pdf/threat-model-discussion-paper-community.pdf) (~200 pages) + [Wardline specification](../../wardline/) | Complete command of the analysis and the as-built semantic enforcement tooling |

---

## Reading paths by role

The [home page](../../#find-your-path) has the role routing cards. Below are the paths in detail, organised by audience cluster.

---

### Leadership, policy, and non-developer staff

#### Executive (Secretary, Deputy Secretary, SES)

**Task:** Decide whether to invest further time, resources, or policy attention.

**5-minute path:**

Read [Governing AI-Generated Code](../../understand/) §1 ("The one-paragraph problem"). This gives you the core finding: AI coding tools produce code that passes every automated check but makes the wrong decision about data that matters in institutional contexts. The question for your organisation is whether you have detection capability for this class of defect.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the full 13-page document. Covers the problem, the evidence, the three properties that make it a distinct risk class, the gaps in current frameworks, and the staged response.
2. Discussion paper [Executive Summary](../../pdf/threat-model-discussion-paper-community.pdf#executive-summary) (2 pages) — the condensed version of the ~200-page analysis.

**After reading:** You should be able to answer: "Is our organisation exposed? Are our suppliers?" and decide whether to direct your CTO/CISO to investigate further.

**Key sections if you go deeper:** Discussion paper [App E §E.7](../../pdf/threat-model-discussion-paper-community.pdf#e7-cross-cutting-observations) (1 page) — cross-cutting observations from the longitudinal case study, written for a non-technical audience.

---

#### Policy officer / adviser

**Task:** Understand the problem and where current frameworks fall short.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the core argument in accessible form.

**1-hour path (adds rationale and evidence):**

2. Discussion paper [§6](../../pdf/threat-model-discussion-paper-community.pdf#6-current-guidance-gap-analysis) (guidance gap analysis) — where the ISM, Essential Eight, OWASP, and NIST SSDF leave gaps for agent-generated code.

**Key sections if you go deeper:** Discussion paper [Executive Summary](../../pdf/threat-model-discussion-paper-community.pdf#executive-summary), [§6](../../pdf/threat-model-discussion-paper-community.pdf#6-current-guidance-gap-analysis) (guidance gap analysis), [App E §E.4–E.7](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (longitudinal case study — policy-not-applied pattern and cross-cutting observations), [App G](../../pdf/threat-model-discussion-paper-community.pdf#appendix-g-a-systems-thinking-primer-for-this-papers-arguments) (systems thinking primer).

---

#### Programme director

**Task:** Understand organisational exposure and decide on team-level response.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the core argument in accessible form.
2. Discussion paper [§1.2.6](../../pdf/threat-model-discussion-paper-community.pdf#126-legacy-modernisation-risk) and [§9.6](../../pdf/threat-model-discussion-paper-community.pdf#96-legacy-modernisation-and-implicit-security-properties) (legacy modernisation risk — particularly relevant for modernisation programmes), [App E §E.7](../../pdf/threat-model-discussion-paper-community.pdf#e7-cross-cutting-observations) (cross-cutting observations), and [App E §E.6](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (spec-level review — catching violations before code is written).

**After reading:** You should understand whether your programme's codebase is exposed and whether the [Practical Guide](../../respond/practical-guide/) should be distributed to your development teams.

---

### Security, assessment, and assurance

#### CISO / Security adviser

**Task:** Assess control gaps and prioritise remediation.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the core argument.
2. [CISO Assessment](../../assess/ciso-assessment/) — translates the failure taxonomy into control-gap language, maps failure modes to existing ISM controls, and identifies where current frameworks leave gaps.

**1-hour path (adds taxonomy and actionable detail):**

3. [ACF Taxonomy](../../acf/) — the summary tables at the top give you the full threat landscape with STRIDE mapping, risk ratings, and detection status at a glance.

**After reading:** You should be able to produce a control-gap assessment and a prioritised remediation plan.

**Key sections if you go deeper:** Discussion paper [§2](../../pdf/threat-model-discussion-paper-community.pdf#2-the-threat-is-not-what-you-think) (the threat), [§6](../../pdf/threat-model-discussion-paper-community.pdf#6-current-guidance-gap-analysis) (full gap analysis), [App E §E.7](../../pdf/threat-model-discussion-paper-community.pdf#e7-cross-cutting-observations) (cross-cutting observations).

---

#### CTO / CIO

**Task:** Assess organisational exposure and determine response investment.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the full argument in accessible form.
2. Discussion paper [§1–2](../../pdf/threat-model-discussion-paper-community.pdf#1-introduction-and-scope) (scope and threat characterisation), [§6](../../pdf/threat-model-discussion-paper-community.pdf#6-current-guidance-gap-analysis) (gap analysis).

**1-hour path (adds case study and operational evidence):**

3. Discussion paper [§8](../../pdf/threat-model-discussion-paper-community.pdf#8-case-studies-what-the-invisibility-problem-looks-like-in-practice) (case studies — what detection looks like in practice, productivity impact, the redirection insight), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

**After reading:** You should be able to scope the response — whether existing controls are sufficient, what detection capability is needed, and how to brief your CISO and development leads.

---

#### IRAP assessor

**Task:** Evaluate AI-assisted development against ISM controls.

**30-minute path:**

1. [IRAP Checklist](../../assess/irap-checklist/) — your primary working document.

**1-hour path (adds evidence base and response landscape):**

2. Discussion paper [§7](../../pdf/threat-model-discussion-paper-community.pdf#7-the-response-landscape) (response landscape), [§9](../../pdf/threat-model-discussion-paper-community.pdf#9-open-questions) (open questions — evidence thresholds), [App A](../../acf/) (ACF taxonomy).

**Key sections if you go deeper:** Discussion paper [§6](../../pdf/threat-model-discussion-paper-community.pdf#6-current-guidance-gap-analysis) (gap analysis), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (transcripts).

---

#### Auditor / assurance

**Task:** Assess governance adequacy and evidence thresholds.

**30-minute path:**

1. Discussion paper [Executive Summary](../../pdf/threat-model-discussion-paper-community.pdf#executive-summary), [App E §E.7](../../pdf/threat-model-discussion-paper-community.pdf#e7-cross-cutting-observations) (cross-cutting observations).

**Key sections if you go deeper:** Discussion paper [§9](../../pdf/threat-model-discussion-paper-community.pdf#9-open-questions) (open questions — governance mechanics, evidence thresholds), [App E §E.4–E.5](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (policy-not-applied pattern).

---

#### Procurement / contracts

**Task:** Understand what to require from suppliers delivering AI-assisted code.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) §5–6 (the contracted development dimension).

**Key sections if you go deeper:** Discussion paper [§6.7](../../pdf/threat-model-discussion-paper-community.pdf#67-contracted-development-as-the-primary-delivery-context) (contracted development as the primary delivery context), [App E §E.4–E.5](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (what detection looks like in practice — policy-not-applied pattern).

---

### Development and implementation

#### Developer / code author

**Task:** Understand the threat, review code effectively, and plan detection capability.

**30-minute path:**

1. [Practical Guide](../../respond/practical-guide/) (~23 pages) — five review questions with worked code examples, hot-path identification, and pattern recognition techniques. This is hands-on and immediately applicable.
2. [Governing AI-Generated Code](../../understand/) — for context on why these defects matter.

**1-hour path (adds the analytical framework):**

3. [ACF Taxonomy](../../acf/) — the detailed failure mode entries with code examples and detection approaches.
4. Discussion paper [§2](../../pdf/threat-model-discussion-paper-community.pdf#2-the-threat-is-not-what-you-think) (the threat), [§4](../../pdf/threat-model-discussion-paper-community.pdf#4-the-review-process-as-attack-surface) (review as attack surface), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript — the most instructive section for practitioners).

**For semantic enforcement tooling:** the [Wardline specification](../../wardline/) — an as-built specification of a shipped semantic trust-boundary scanner (trust lattice §4, declarations and caller-granted trust §5, the rule catalogue §6, gates and suppression §7) — and the [Python reference](../../wardline/python-reference/) for CLI, configuration, and suppression formats.

**After reading:** You should be able to identify the highest-risk code paths in your project, apply the five review questions, and evaluate whether detection tooling (custom rules or semantic enforcement) is warranted.

---

#### Citizen programmer (non-developer using AI to write code)

**Task:** Learn to review code you've generated with AI chat tools, without CI or developer tooling.

**30-minute path:**

1. [Practical Guide](../../respond/practical-guide/) (~23 pages) — five review questions, worked code examples, hot-path identification. Written specifically for people copying code from AI chat windows.
2. [Governing AI-Generated Code](../../understand/) — for context on why this matters.

**Key sections if you go deeper:** Discussion paper [App C](../../pdf/threat-model-discussion-paper-community.pdf#appendix-c-extension-to-agentic-sql-generation) (SQL extension — relevant for data and analytics work), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation with worked examples), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (annotated transcripts).

---

#### Development team lead

**Task:** Assess team exposure and decide whether to adopt detection tooling.

**30-minute path:**

1. [Governing AI-Generated Code](../../understand/) — the core argument.
2. Discussion paper [§2](../../pdf/threat-model-discussion-paper-community.pdf#2-the-threat-is-not-what-you-think) (the threat), [§4](../../pdf/threat-model-discussion-paper-community.pdf#4-the-review-process-as-attack-surface) (review as attack surface), [§7](../../pdf/threat-model-discussion-paper-community.pdf#7-the-response-landscape) (response landscape), [App A](../../acf/) (ACF taxonomy).

**1-hour path (adds case studies):**

3. Discussion paper [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) (simulation), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

**For implementation:** read discussion paper [§7.2](../../pdf/threat-model-discussion-paper-community.pdf#72-technical-controls-what-is-buildable), then use the [Wardline companion](../../wardline/) and [Python reference](../../wardline/python-reference/) to evaluate or adopt the shipped reference scanner.

---

#### Tool implementer / architect

**Task:** Build or evaluate semantic enforcement tooling.

**30-minute path:**

1. [Wardline companion](../../wardline/) — start with the as-built scanner, its trust lattice, declarations, rule catalogue, and verification model.
2. Discussion paper [§2–3](../../pdf/threat-model-discussion-paper-community.pdf#2-the-threat-is-not-what-you-think) (the threat and its three properties), [App A](../../acf/) (detection approaches per taxonomy entry).

**1-hour path (adds implementation evidence):**

3. Discussion paper [§7.2](../../pdf/threat-model-discussion-paper-community.pdf#72-technical-controls-what-is-buildable) (technical controls — what is buildable), [§8](../../pdf/threat-model-discussion-paper-community.pdf#8-case-studies-what-the-invisibility-problem-looks-like-in-practice) (case studies), [App E](../../pdf/threat-model-discussion-paper-community.pdf#appendix-e-case-study-2-agentic-failure-in-practice) (annotated agent transcript).

---

## Other roles

| Role | Start here | Then if needed |
|------|-----------|----------------|
| **Autonomy assessment** | [Autonomy Self-Assessment](../../assess/autonomy-assessment/) | Discussion paper [App B](../../pdf/threat-model-discussion-paper-community.pdf#appendix-b-agent-autonomy-self-assessment) |
| **Analyst / data engineer / ops staff** | [Practical Guide](../../respond/practical-guide/) | [Governing AI-Generated Code](../../understand/); Discussion paper [App C](../../pdf/threat-model-discussion-paper-community.pdf#appendix-c-extension-to-agentic-sql-generation) (SQL extension), [App D](../../pdf/threat-model-discussion-paper-community.pdf#appendix-d-case-study-1-controlled-generation-of-a-government-assistance-application) |
