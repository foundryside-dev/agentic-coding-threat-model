### 5. Declarations and trust grants

A wardline deployment has to answer two separate questions, and the designed specification only ever answered one of them well.

The first question is *what does this repository declare?* — where the boundaries are, which functions produce trusted data, which levels they claim. The implementation answers it with three decorators and nothing else.

The second question is *who decides that those declarations mean anything?* The designed specification (archived) assumed the repository decided, and then spent a governance chapter trying to stop the repository from lying. The implementation reverses the assumption: the **caller** who invokes the scanner decides which repository-supplied trust semantics are permitted to load, and refuses to run when the repository asks for something the caller did not grant. That inversion is the strongest idea in the codebase, so this section leads with it.

#### 5.1 The threat the designed specification named

Section 9.3.2 of the designed specification identified an attack it called **manifest poisoning**:

> Corrupting tier assignments so that agents generate code compliant with the wrong policy. A tier assignment that classifies external API data as Tier 1 (AUDIT_TRAIL) causes downstream code to treat unvalidated input as authoritative — and the code will be structurally correct against the declared wardline. **The poisoning is invisible to enforcement because enforcement faithfully implements the policy it is given.**

The diagnosis is exactly right, and the last sentence is the whole problem: a scanner that reads its policy from the repository it is scanning cannot detect a repository that has written itself a favourable policy. The finding is not suppressed; it is never generated.

The designed answer was procedural. Tier changes were to require two-person review, be tracked as a distinct category in a fingerprint baseline diff, trigger impact assessments, and carry a documented `rationale` field. All of these depend on sustained human attention to a policy artefact that changes constantly — the resource the governance model was itself designed to economise. The designed specification's own residual-risk chapter conceded the point.

#### 5.2 The answer the implementation gives

The implementation answers the same threat mechanically, and it is a strictly better answer because it does not depend on anyone reading anything.

A repository may declare a **trust-grammar pack** — an importable Python module that extends wardline's vocabulary, adds rules, and merges its own configuration over the project's. It declares packs in the `packs` key of the `[wardline]` table in `weft.toml`. That declaration, on its own, does nothing at all. To load, each pack must additionally be granted by the invoking operator:

```bash
wardline scan . --trust-pack myorg.trustpack --fail-on ERROR
```

`--trust-pack` is repeatable. A pack that lives inside the scanned checkout needs a second, separate grant, `--allow-custom-packs`, because importing it means executing code from the repository under analysis. Both grants default to off, and enforcement is fail-closed in `core/config.py` (lines 271–288): an ungranted pack raises `ConfigError` before any analysis begins, as does a project-local pack without `--allow-custom-packs`. The error messages name the missing grant rather than degrading quietly:

```
trust-grammar pack 'myorg.trustpack' is not trusted. Grant it with
--trust-pack myorg.trustpack (CLI or `wardline mcp` launch flag) or the
`trust_packs` MCP tool argument.
```

```
loading trust-grammar pack 'myorg.trustpack' from local project directory is
disabled for security. Grant it with --allow-custom-packs (CLI or `wardline
mcp` launch flag) or the `trust_local_packs` MCP tool argument.
```

The consequence is the one that matters for the poisoning threat. A repository can *ask* for arbitrary trust semantics. It cannot *obtain* them. The gate that decides is on the caller's side of the boundary, and the failure mode when the two disagree is a hard exit, not a silently weaker policy. Wardline's own documentation states the division plainly: `wardline install <pack>` only *emits guidance* to add a pack to `weft.toml`; it never writes the file on the operator's behalf.

This does not make the declarations *correct* — a granted pack can encode a bad trust model just as a hand-written manifest could, and the residual risk survives (§9). What it removes is the class of attack where the repository upgrades its own policy without anyone choosing to let it.

#### 5.3 The declaration surface: three decorators

Everything a project declares about its own trust topology goes through three decorators, defined in `src/wardline/decorators/trust.py`. There is no fourth, and there is no manifest equivalent.

| Decorator | Arguments | Meaning |
|---|---|---|
| `@external_boundary` | none | An external entry point. Its return value carries `EXTERNAL_RAW`. |
| `@trust_boundary(to_level=…)` | `to_level` ∈ {`GUARDED`, `ASSURED`} | A validation or sanitisation boundary that raises trust on its return to `to_level`. |
| `@trusted` / `@trusted(level=…)` | `level` ∈ {`INTEGRAL`, `ASSURED`}, default `INTEGRAL` | A trusted producer or sink: it operates on, and returns, data at `level`. |

Application code should import them from the standalone marker package, not from wardline itself:

```python
from weft_markers import trusted, trust_boundary, external_boundary

@external_boundary
def read_request(req):
    return req.body                      # EXTERNAL_RAW

@trust_boundary(to_level="ASSURED")
def validate(raw):
    if not raw:
        raise ValueError("empty body")
    return raw                           # ASSURED

@trusted(level="ASSURED")
def build_record(req):
    return validate(read_request(req))   # claim matches actual
```

`pip install weft-markers` pulls a marker-only runtime package with no dependency on the scanner, which is the point: an application that wants trust markers in its source should not thereby acquire a static-analysis toolchain. Wardline still recognises the equivalent `wardline.decorators` imports for backward compatibility and for projects that already depend on wardline directly, and it resolves aliased imports — `from wardline.decorators import trusted as t` is recognised as the builtin marker, which is what allows `PY-WL-114` to catch a typo'd level on an aliased decorator instead of silently treating it as a foreign decorator (§6).

Three properties of this surface are worth stating explicitly, because each is a deliberate reversal of the designed specification.

**The decorators are runtime no-ops.** `decorators/_base.py` stamps `_wardline_*` attributes onto the target function and returns the function *unchanged* — no wrapper, no runtime tier-stamping, no enforcement. Its docstring names this "the deliberate lightweight departure from wardline.old's runtime-enforcing factory". The analyser reads the decorators from the AST; nothing is checked at runtime, ever (§3).

**The level vocabularies are asymmetric, and the asymmetry is load-bearing.** A boundary may raise trust to `GUARDED` or `ASSURED` but never to `INTEGRAL`; a producer may claim `INTEGRAL` or `ASSURED` but never `GUARDED`. Validation therefore cannot manufacture the top of the lattice (§4) in one step — `INTEGRAL` is a claim a producer makes about data it is already working with, not a level a validator can promote input into. This is the one surviving fragment of the designed specification's invariant that Tier 1 must be reached through composed steps rather than a skip-promotion.

**Bad levels fail twice, in two different registers.** `coerce_level` raises `ValueError` at decoration time for an unknown state name or a level outside the permitted set — that is a Python error in the annotated project, not a wardline finding. Statically readable but invalid levels are *also* a rule (`PY-WL-114`), because the static path is the one that matters when a level comes from a constant the analyser can resolve but the interpreter never evaluates in the scanner's process.

#### 5.4 The canonical vocabulary

The three decorators are canonicalised in `src/wardline/core/vocabulary.yaml`, a fourteen-line file carrying `schema: wardline.vocabulary/v1` and `version: wardline-generic-2`. Each entry names the canonical decorator, its group (all three are group 1), and its declared attributes (`_wardline_to_level` and `_wardline_level`, both typed `TaintState`).

`apply_marker` validates every decoration against this registry: an unknown decorator name, a group mismatch, or an attribute the registry does not declare is a `ValueError`. `wardline vocab` emits the descriptor as YAML, so a consuming tool can read the vocabulary instead of importing wardline to discover it.

This is what the designed specification's seventeen annotation groups became. Sixteen of them were never built (§10.8). The surviving one — the generic trust boundary — is the whole vocabulary, and it fits in a page.

#### 5.5 Trust-grammar packs

A pack is the extension point: an importable module that may carry a `config` attribute (a dictionary deep-merged over the project's `[wardline]` table) and may register additional rules on the same config-gated path as the builtins. Packs are how an organisation encodes vocabulary its own domain needs without a fork.

Because a pack imports and executes code, the documentation classifies packs as **operator-authored**, and the two grants of §5.2 apply. The load sequence is worth stating in order, because the order is the security property:

1. Read `[wardline]` from `weft.toml` (or the file named by `--config`).
2. For each name in `packs`: refuse unless the caller granted it with `--trust-pack`; refuse a project-local pack unless the caller also granted `--allow-custom-packs`.
3. Import each granted pack, deep-merge its `config` over the project's table.
4. Validate the merged result against the JSON Schema (draft 2020-12) — `additionalProperties: false`, so a typo'd key after merging is a hard error, not a silent default.

Steps 2 and 4 are both fail-closed, and step 2 precedes any import. A repository cannot get its code executed by wardline before the grant check runs.

#### 5.6 The pattern generalises

Caller-granted trust is not a one-off answer to manifest poisoning. It is the design principle the CLI surface is built on. It covers three domains — vocabulary, judge behaviour, and suppression state — across five flags, each defaulting to off and each granted from the caller's side:

| Grant | What the repository may otherwise supply | Default |
|---|---|---|
| `--trust-pack <name>` (repeatable) | Trust-grammar packs named in `weft.toml` | ungranted |
| `--allow-custom-packs` | Packs resolved from inside the scanned checkout | ungranted |
| `--trust-judge-config` | Project-supplied judge transport, models, context radius, finding cap, write-confidence floor | ungranted |
| `--trust-judge-policy` | A project `policy_file` appended to the judge prompt — passed to the model only as *untrusted context* | ungranted |
| `--trust-suppressions` | Repository-controlled baseline, waiver, and judged files clearing the `--fail-on` gate | ungranted |

The last of these is the second fully mechanical instance of the principle. Wardline's three suppression channels — baseline, waiver, judged — are all committed repository content, so a pull request could otherwise add a suppression entry keyed to the fingerprint of its own new defect and clear the gate with it. Since v1.0.1 it cannot: the gate evaluates a separately built **unsuppressed** population, and a repository's suppression records annotate the emitted findings without touching the exit code. §7.3 owns the mechanics, the two caller-side escapes, and the migration signal that explains a repository going red with no code change.

The judge grants are the same shape a third time. A repository may declare judge settings and a judge policy file in its own `weft.toml`; neither reaches the model unless the caller passes `--trust-judge-config` or `--trust-judge-policy`, and even then the policy file's contents are supplied to the model as *untrusted context* rather than as instructions.

Read together, these are one principle applied three times over: **the caller grants trust semantics — vocabulary, suppressions, judge policy — and the repository only ever requests them.** Every artefact the scanned repository controls, from vocabulary and rules through judge configuration and prompt material to suppression state, is treated as a *request*, and every request needs a caller-side grant before it changes what the gate does. §7 covers the gate decision model, the three suppression channels, and the judge in full.

#### 5.7 `--strict-defaults`

`--strict-defaults` is the blunt instrument at the end of the same axis, and its mechanism is stronger than its help text suggests. `core/config.py` short-circuits at the top of `load()`: with `--strict-defaults` set, the config file is *never read*. Wardline runs on built-in defaults — `source_roots = ["."]`, all rules enabled, no severity overrides, no packs.

The distinction matters. Under `--strict-defaults`, packs are not merely ungranted; they are unreachable, because the list that would name them is never parsed. There is no partial-trust mode to reason about.

The flag is accepted by `scan`, `judge`, `baseline create`, `baseline update`, `attest`, `rekey`, `scan-job`, and `scan-file-findings`. Those same eight commands are the ones that accept `--trust-pack` and `--allow-custom-packs` — as does `wardline mcp`, which takes the two grants as launch flags but has no strict-defaults switch. The other policy-loading commands (`fix`, `findings`, `explain-taint`, `dossier`, `decorator-coverage`) take `--config` but neither the grants nor the strict-defaults switch, so in a project that declares packs they fail closed with `ConfigError`. The error tells the caller to pass `--trust-pack`, which those commands do not accept; the only routes open are a `--config` pointing at a pack-free policy, or fixing `weft.toml`. The grant surface is narrower than the policy-loading surface — a rough edge, not a security hole, since the failure direction is refusal.

#### 5.8 Where grants reside

One caveat limits how the guarantee should be phrased, and it should be stated rather than glossed.

Grants have **residency**. On the CLI they live in the invocation and nowhere else. For the MCP server they live in the server's launch arguments — `wardline mcp --trust-pack myorg.trustpack` in the `args` array of `.mcp.json` — so that agent tool calls need not re-pass `trust_packs` on every call. But `.mcp.json` is a file inside the repository, and `install/mcp_json.py` deliberately preserves the grant arguments it finds there across `wardline install` and `wardline doctor --repair` runs, on the stated reasoning that stripping a grant would silently return a working taint gate to inert.

The one place wardline *reads* grants back out of that repository file is `install/doctor.py`, which loads the project config using the grants recorded in `.mcp.json` so that `wardline doctor` reports the health of the configuration as it will next spawn, rather than reporting a false "pack not trusted" error against a granted, working setup. That is a diagnostic path. It is not the scan gate: `wardline scan` takes its grants from its own invocation, and no code path lets `weft.toml` grant itself anything.

The accurate formulation is therefore narrower than "the repository cannot grant trust", and worth using precisely: **repository *configuration* cannot self-authorise the scan gate.** A repository that also controls the MCP launch entry an agent host reads is a different, and weaker, position — one that belongs to whoever provisions the agent's tooling, not to wardline.

#### 5.9 No manifest is required

The designed specification's §13 defined a root `wardline.yaml` manifest with tier definitions, boundary declarations, dependency taint entries, and rule overrides — a substantial schema, and the artefact the entire governance model was built around. It was never built (§10). A file called `wardline.yaml` does exist in the implementation's repository; it is 101 bytes of federation URLs and has nothing to do with the designed schema.

The tool requires no manifest to scan. `weft.toml` is optional operator configuration, shared across the Weft federation, of which wardline reads only its own `[wardline]` table and which it never writes. Wardline's own repository does not ship one. Run without it and the tool boots on built-in defaults and says so:

```
warning: no weft.toml found; using built-in source_roots=['.'], which can make
project-root scans broad and slow. Run `wardline doctor --repair --root <proj>`
to create a bounded default policy, or `wardline scan-job start <path>` for a
pollable long-running scan.
```

That warning is a performance advisory, not a policy failure — a scan with no configuration at all is a supported mode, and the declarations in the source are the only policy input that is genuinely required. The full configuration surface is in Part II-A.
