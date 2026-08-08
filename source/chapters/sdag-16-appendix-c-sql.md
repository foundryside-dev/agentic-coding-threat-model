## Appendix C: Extension to Agentic SQL Generation


### C.1 Why SQL Deserves Separate Treatment

The threat model in this paper uses Python for its primary examples. The failure modes generalise (Appendix A notes language-general applicability for most entries), but SQL warrants explicit treatment for three reasons:

**SQL is the language most affected by the citizen programmer problem.** Python code generation by non-developers is a recent phenomenon enabled by agentic tools (§1.2.7). SQL generation by non-developers is decades old — business analysts, data engineers, operations staff, and reporting teams have always written SQL. Agentic tools do not introduce SQL to this population; they dramatically accelerate and extend what this population can produce. A business analyst who previously wrote `SELECT` queries can now produce stored procedures, triggers, scheduled ETL pipelines, and schema migrations. The capability jump is qualitatively larger than the Python case, because the baseline capability was already there.

**SQL operates directly on the authoritative data store.** Python code that mishandles data can be caught before it reaches the database — an application-layer validation boundary sits between the application and the authoritative store. SQL bypasses that boundary by definition. A malformed Python function corrupts a variable; a malformed SQL statement corrupts the table.

The blast radius is immediate, and in many cases, irreversible without backup restoration.

**SQL's failure modes are silent in exactly the way the threat model predicts.** A Python crash produces a traceback. A SQL query that returns wrong results produces... results. There is no crash, no error, no log entry. The query ran. It returned rows. The rows were wrong. In reporting and decision-support contexts — which is where non-developer SQL authors overwhelmingly operate — the wrong results are consumed as fact.

### C.2 The ACF Taxonomy Applied to SQL

The following maps the most critical ACF failure modes to their SQL equivalents. This is not a new taxonomy — it is the same failure modes expressed in a different language, included because SQL practitioners may not recognise the Python examples in Appendix A as relevant to their work.

#### ACF-S1 in SQL: Fabricated Default via COALESCE and Default Values

The SQL equivalent of Python's `.get()` with a default is `COALESCE()` and its platform-specific variants[^coalesce-variants] — and agents use them reflexively. The examples below use `COALESCE()` as the portable form, but the failure mode — substituting a fabricated value for missing data — is identical regardless of which function the agent selects. The database engine choice does not affect the risk; it affects only which function name appears in the generated code.

```sql
-- Agent-generated — looks defensive and robust
SELECT
    document_id,
    COALESCE(security_classification, 'OFFICIAL') AS classification,
    COALESCE(handling_caveats, 'None')            AS caveats
FROM documents
WHERE ...
```

This is the classification-defaulting example from §2.3, but in SQL it is worse in two respects. First, the fabricated value is not in application code where a reviewer might catch it — it is in a query that may live in a reporting tool, a view definition, a scheduled extract, or a BI platform query layer, none of which are typically subject to security-focussed code review. Second, the fabricated value may propagate into materialised views, summary tables, or downstream reports where its provenance as a `COALESCE` default is invisible — consumers see "OFFICIAL" as a data value, not as an absence marker.

```sql
-- Correct — surface the absence
SELECT
    document_id,
    security_classification,  -- NULL if missing — consumers must handle explicitly
    handling_caveats
FROM documents
WHERE security_classification IS NOT NULL
-- Or: WHERE security_classification IS NULL to find the integrity failures
```

In reporting contexts, the correct approach is often to *exclude* rows with missing critical fields and report the exclusion count separately, so that the absence is visible to the consumer rather than papered over with a default.

#### ACF-T1 in SQL: Authority Tier Conflation via Unchecked Joins and Inserts

When agents write SQL that integrates data from external sources, they treat all tables as equally trustworthy — because SQL provides no mechanism to distinguish authority-tier distinctions at the language level.

```sql
-- Agent-generated — clean, readable, catastrophically wrong
INSERT INTO internal_records (name, status, clearance_level)
SELECT name, status, clearance_level
FROM partner_staging_table;
-- No validation. External data enters the authoritative store directly.
-- If partner_staging_table contains malformed data, injection payloads,
-- or values outside the expected domain, they are now internal records.
```

The SQL case is more dangerous than the Python case (ACF-T1 in Appendix A) because SQL's `INSERT ... SELECT` pattern is a single statement that reads from one authority tier and writes to another with no syntactic position where a validation step can be expressed. In Python, the loop body provides a natural location for validation. In SQL, the validation must happen *before* the `INSERT` — as a separate query, a staging table with constraints, or a pre-insert trigger — and agents rarely generate these unprompted because the single-statement pattern is overwhelmingly more common in training data.

```sql
-- Correct — validate in the staging layer
INSERT INTO internal_records (name, status, clearance_level)
SELECT name, status, clearance_level
FROM partner_staging_table
WHERE status IN ('active', 'inactive', 'pending')        -- Domain validation
  AND clearance_level IN ('baseline', 'nv1', 'nv2')      -- Allowlist
  AND name IS NOT NULL                                     -- Required field
  AND LENGTH(name) <= 200;                                 -- Boundary check

-- Rejected rows logged to quarantine with categorised rejection reasons
INSERT INTO quarantine_log (source_table, rejection_reason, row_data, quarantined_at)
SELECT 'partner_staging_table',
    CASE
        WHEN status NOT IN ('active', 'inactive', 'pending') THEN 'invalid_status'
        WHEN clearance_level NOT IN ('baseline', 'nv1', 'nv2') THEN 'invalid_clearance'
        WHEN name IS NULL THEN 'null_name'
        ELSE 'boundary_violation'
    END,
    CONCAT(COALESCE(name, '[NULL]'), '|', COALESCE(status, '[NULL]'), '|', COALESCE(clearance_level, '[NULL]')),
    CURRENT_TIMESTAMP
FROM partner_staging_table
WHERE status NOT IN ('active', 'inactive', 'pending')
   OR clearance_level NOT IN ('baseline', 'nv1', 'nv2')
   OR name IS NULL
   OR LENGTH(name) > 200;
```

The correct version is substantially more verbose. This is precisely the pattern agents omit, because the concise version is what appears in training data.

#### ACF-R1 in SQL: Audit Trail Destruction via Silent Overwrites

In Python, audit trail destruction happens through error handlers that swallow exceptions. In SQL, it happens through `UPDATE` and `DELETE` statements that modify or remove data without preserving the prior state.

```sql
-- Agent-generated — clean, correct, and an audit trail disaster
UPDATE case_decisions
SET decision = 'approved', decided_by = 'J.Smith', decided_at = CURRENT_TIMESTAMP
WHERE case_id = 12345;
-- What was the previous decision? Who made it? When?
-- Gone. Overwritten. The audit trail now shows only the current state.
```

This is not a bug in the traditional sense — the `UPDATE` does exactly what it says. But in systems where decision history is a compliance requirement, an `UPDATE` that overwrites without first preserving the prior state is an audit trail failure. Agents produce `UPDATE` statements because they are the natural SQL pattern for "change this value." The concept that the prior value must be preserved — in a history table, an audit log, or a temporal table — is institutional knowledge, not SQL syntax.

```sql
-- Correct — preserve the prior state before updating
INSERT INTO case_decision_history
    (case_id, decision, decided_by, decided_at, superseded_at, superseded_by)
SELECT
    case_id, decision, decided_by, decided_at, CURRENT_TIMESTAMP, 'J.Smith'
FROM case_decisions
WHERE case_id = 12345;

UPDATE case_decisions
SET decision = 'approved', decided_by = 'J.Smith', decided_at = CURRENT_TIMESTAMP
WHERE case_id = 12345;
```

The same pattern applies to `DELETE`. An agent asked to "remove inactive users" will generate `DELETE FROM users WHERE status = 'inactive'` — not a soft delete, not an archive-then-delete, not a deletion record in an audit table. The data is gone.

#### ACF-R2 in SQL: Partial Completion Without Transaction Boundaries

Agents frequently generate multi-statement SQL operations without wrapping them in explicit transactions. In autocommit mode,[^autocommit-defaults] each statement succeeds or fails independently, leaving the database in an inconsistent state on partial failure.

```sql
-- Agent-generated — three statements that should be atomic
UPDATE documents SET classification = 'PROTECTED' WHERE doc_id = 456;
INSERT INTO classification_changes (doc_id, old_level, new_level, changed_at)
    VALUES (456, 'OFFICIAL', 'PROTECTED', CURRENT_TIMESTAMP);
INSERT INTO notifications (recipient, message, created_at)
    VALUES ('security_team', 'Document 456 reclassified to PROTECTED', CURRENT_TIMESTAMP);
-- If the second statement fails, the document is reclassified
-- but there's no record of the change. If the third fails,
-- the security team is never notified of a classification upgrade.
```

Agents produce sequential statements because that is how SQL appears in tutorials, documentation, and Stack Overflow answers. Explicit transaction management (`BEGIN TRANSACTION ... COMMIT / ROLLBACK`) is less common in training data because most examples demonstrate individual operations, not multi-step workflows with atomicity requirements.

```sql
-- Correct — all three statements succeed or none do
BEGIN TRANSACTION;
UPDATE documents SET classification = 'PROTECTED' WHERE doc_id = 456;
INSERT INTO classification_changes (doc_id, old_level, new_level, changed_at)
    VALUES (456, 'OFFICIAL', 'PROTECTED', CURRENT_TIMESTAMP);
INSERT INTO notifications (recipient, message, created_at)
    VALUES ('security_team', 'Document 456 reclassified to PROTECTED', CURRENT_TIMESTAMP);
COMMIT;
-- On any failure: ROLLBACK restores the database to its pre-change state.
-- The document is never reclassified without a matching audit record.
```

The remaining language-general ACF entries (I1, D1, D2, E1, E2) apply to SQL contexts through their general mechanisms and are not repeated here. The four entries above (S1, T1, R1, R2) are the ones where the SQL surface form differs enough from the Python examples in Appendix A to warrant explicit treatment.

### C.3 SQL-Specific Risks Not Covered by the Python Taxonomy

Two failure modes are SQL-specific and do not have direct Python equivalents:

**Implicit type coercion in comparisons.** Many SQL implementations (notably MySQL and SQL Server) silently coerce types in comparisons, joins, and `UNION` operations. PostgreSQL is stricter — it raises a type error rather than coercing — but the majority of enterprise deployments use platforms where silent coercion is the default behaviour. An agent joining an `INT` column to a `VARCHAR` column will produce a query that runs without error but may silently drop rows (where the coercion fails) or silently match wrong rows (where the coercion produces unexpected equality). This is related to ACF-T2 (silent coercion) but the mechanism is the database engine itself, not application code — and the developer receives no warning.

**Privilege escalation through dynamic SQL.** Agents generating stored procedures or application queries frequently use string concatenation to build SQL dynamically. This is the well-known SQL injection risk, but the agentic context compounds it: the agent is generating the vulnerable pattern, not a human developer who might recognise it. An agent asked to "make the table name configurable" will produce `EXEC('SELECT * FROM ' + @tableName)` because that is the pattern in its training data. The agent has no concept of parameterisation as a security boundary — it is completing a pattern.

### C.4 The Citizen Programmer Intersection

SQL producers are a larger and more established population than Python producers in most government organisations — the citizen programmer scenario from §1.2.7 is most likely to manifest through SQL. The business analyst building a reporting dashboard, the operations officer creating a data extract, the policy team generating compliance reports — these activities are overwhelmingly SQL-based, not Python-based. The BA scenario in §1.2.7 (a plugin that holds open long-running queries and silently writes partial results) is a SQL scenario.

Agentic tools amplify this in two ways. First, they enable non-SQL-fluent users to generate complex SQL — subqueries, window functions, CTEs, recursive queries — that they could not have written themselves and cannot fully evaluate. The user can verify that the output "looks right" for known cases but cannot assess whether the query is correct for edge cases, whether it handles NULLs appropriately, or whether it respects trust boundaries the user does not know exist.

Second, they enable SQL-fluent users (analysts, report writers) to generate *operational* SQL — DDL, stored procedures, triggers, scheduled jobs — that they previously lacked the syntax knowledge to produce. The analyst who could write a `SELECT` can now write an `INSERT INTO ... SELECT` that runs on a schedule, which is a qualitatively different capability with categorically higher risk.

The autonomy self-assessment in Appendix B could inform governance design for SQL-producing populations, though its current framing targets developer workflows and a separate practitioner-facing artefact would be required for non-developer populations (§9.7).

### C.5 Detection and Enforcement for SQL

Detection of the SQL failure modes described above faces the same fundamental challenge as the Python case — the failures are semantic, not syntactic — with an additional constraint: in many organisations, SQL is embedded in reporting tools, BI platforms, ETL configurations, and scheduled job definitions that are not stored in version-controlled repositories and are not subject to CI/CD pipeline gates. The governance perimeter problem (§1.2.7) is more acute for SQL because the SQL has never been inside the SDLC perimeter — it lives in tools that predate and exist outside the development workflow.

Candidate controls:

**Database-level enforcement.** `CHECK` constraints, foreign key relationships, domain types, and `NOT NULL` constraints enforce validation at the data layer regardless of how the SQL was generated. This is the strongest control because it is environmental — the database rejects invalid data whether the SQL was written by a human, generated by an agent, or produced by a reporting tool. Organisations should audit whether their database schemas enforce the same trust boundary rules that their application code does. In many cases, the application validates but the schema permits — meaning any SQL that bypasses the application (direct queries, reporting tools, agent-generated scripts) can write invalid data.

**Query review for privileged operations.** `INSERT`, `UPDATE`, `DELETE`, and DDL statements generated by agents or non-developer users should be subject to review proportionate to their impact. A `SELECT` query on a reporting database is low-risk; an `INSERT INTO ... SELECT` from a staging table to an authoritative table is high-risk and warrants the same trust boundary scrutiny as equivalent Python code.

**Temporal tables and audit triggers.** Database-level mechanisms that automatically preserve prior state on `UPDATE` and `DELETE` operations provide defence-in-depth against the ACF-R1 pattern regardless of whether the SQL author remembered to preserve history. These are environmental controls that do not depend on the author's awareness of audit requirements.

**Materialised view and scheduled query inventory.** Organisations should know what SQL runs on a schedule, against which databases, with which credentials, and who authored it. This is the SQL equivalent of the code provenance tracking recommended in §7.1 — and in most organisations, it does not exist.

The scheduled query that runs every night and has run without incident for three years is the SQL equivalent of the legacy system whose implicit security properties are paved over by modernisation (§1.2.6): nobody remembers why it works, and nobody will notice when it starts producing wrong results.

[^coalesce-variants]: `COALESCE()` is standard SQL and behaves identically across PostgreSQL, SQL Server, MySQL, Oracle, and SQLite. `ISNULL()` is SQL Server-specific; `IFNULL()` is MySQL/SQLite-specific. SQLite is worth noting because agents frequently generate it for prototyping and local development, and those queries sometimes migrate into production contexts — particularly in data workflows where a "temporary" SQLite database becomes a permanent operational store.

[^autocommit-defaults]: Autocommit is the default for JDBC, ODBC, and most interactive tools, though notably not Python's DB-API, which defaults to autocommit off per PEP 249.

---
