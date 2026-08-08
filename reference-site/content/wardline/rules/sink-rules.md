---
title: "Sink Rules"
weight: 2
---

**Fourteen rules.** These fire when untrusted data reaches a dangerous operation **inside a trusted-tier function**.

> [!NOTE]
> **What distinguishes these from the equivalent rules in a general-purpose scanner:** every one is tier-modulated. They are **silent unless somebody has declared that the surrounding function is trusted**. `rules/_sink_helpers.py` names the path in its own docstring — *"the developer-freedom zone (undecorated → `UNKNOWN_RAW` → `modulate` → `NONE`)"*.
>
> This document makes **no claim of novelty** for the detections themselves. They exist because the trust-taint engine already had to track untrusted data, and pointing it at sinks was nearly free.

Severities below are **base** severities, before [tier modulation]({{< relref "/wardline/rules" >}}#severity-is-a-product-not-a-table).

| ID | Base | Maturity | Sink family |
|---|---|---|---|
| `PY-WL-106` | WARN | stable | **Deserialisation** — `pickle`/`Unpickler`/`marshal`/`yaml.load`/`shelve`, plus a curated third-party table (`dill`, `jsonpickle`, `joblib`, `torch.load`, `numpy.load(allow_pickle=True)`) (CWE-502) |
| `PY-WL-107` | WARN | stable | **Dynamic code execution** — `eval`/`exec`/`compile` (CWE-95) |
| `PY-WL-108` | ERROR | stable | **Command/program execution** — `os.system`/`os.popen`/`subprocess.getoutput`, `os.exec*`/`os.spawn*`/`os.posix_spawn`/`pty.spawn` (CWE-78) |
| `PY-WL-112` | ERROR | stable | **Conditional shell** — a subprocess call with a literal `shell=True` (CWE-78) |
| `PY-WL-115` | WARN | stable | **Dynamic code/module load** — `importlib.import_module`, `__import__`, `runpy.run_path`, `runpy.run_module`, `importlib.util.spec_from_file_location` (CWE-829 / CWE-94) |
| `PY-WL-116` | WARN | preview | **Path/filesystem traversal** — `open`/`os.path.join`/`pathlib.Path`, mutation via `os.remove`/`os.rename`/`shutil.*`, methods on a tainted `pathlib.Path`, and `tarfile`/`zipfile` extraction (Zip Slip) (CWE-22) |
| `PY-WL-117` | WARN | preview | **SSRF** — the URL slot of an HTTP client sink: `requests`/`httpx`/`aiohttp`/`urllib`, module-level calls, constructed client/session methods, and client `base_url=` (CWE-918) |
| `PY-WL-118` | ERROR | preview | **SQL/database execution** — `execute`/`executemany`/`executescript` (CWE-89) |
| `PY-WL-121` | ERROR | preview | **XML parsing** — XXE and billion-laughs (CWE-611) |
| `PY-WL-122` | ERROR | preview | **Server-side template compilation** — `jinja2.Template`/`Environment.from_string`, mako `Template` (SSTI, CWE-1336) |
| `PY-WL-123` | WARN | preview | **Reflective attribute access** — untrusted data used as the attribute *name* in `setattr`/`getattr`; dynamic attribute injection / mass assignment (CWE-915) |
| `PY-WL-124` | ERROR | preview | **Native-library load** — `ctypes.CDLL`/`WinDLL`/`OleDLL`/`PyDLL`, `ctypes.cdll.LoadLibrary` (CWE-114 / CWE-829) |
| `PY-WL-125` | INFO | preview | **Log injection** — untrusted data used as the log *message format string* (CWE-117) |
| `PY-WL-126` | WARN | preview | **Mail/header injection** — untrusted recipient or message reaching `smtplib.SMTP.sendmail` (CWE-93) |

## Where the precision work lives

The precision in this family is in the **clean** examples, and it is where the ≤ 5% [false-positive gate]({{< relref "../verification" >}}#property-3--measured-precision) gets earned. Three illustrations, all from the rules' own metadata:

| Rule | Does **not** fire on | Why |
|---|---|---|
| `PY-WL-118` | Untrusted data in a **bound-parameter** position | Parameterised queries are the canonical mitigation; SQL injection is a property of the SQL string alone |
| `PY-WL-122` | Untrusted data passed as a **render variable** | Only a tainted template *source* is SSTI |
| `PY-WL-125` | Logging's own lazy `%`-parameterisation — `logging.info('user input = %s', raw)` | That is the safe idiom, and is never a finding |

## Two calibration notes

**`PY-WL-121` reports at two severities from one base.** Its metadata declares base `ERROR`, but internally `lxml.etree` sinks emit at `ERROR` and stdlib `etree`/`minidom`/`sax` sinks at `WARN`, reflecting the different default entity-resolution behaviour. A reader comparing the table above to a report should expect that one divergence.

**`PY-WL-125`'s `INFO` base is deliberate, not an oversight.** Log injection sits below the family's working ceiling of `WARN`, so it annotates without gating at the default `--fail-on ERROR`.

## Coverage is enumerative

Each rule recognises the sinks it knows. **A dangerous call the catalogue does not name is not checked**, and the catalogue grows by deliberate addition rather than by inference. This is the same trade the project's scope statement makes — precision over breadth — expressed at rule level, and it is recorded as [residual risk 6]({{< relref "../residual-risks" >}}#analysis-scope-risks).

## Evasion note

The [evasion-surface trajectory]({{< relref "../residual-risks" >}}#analysis-scope-risks) holds less strongly for this family than for the boundary rules. The pattern being matched is a call to a specific dangerous target rather than a stylistic idiom — a model cannot rephrase its way out of calling `subprocess` with tainted input, only out of being *recognised* as calling it, through indirection the callgraph does not resolve.

## See also

- [Boundary rules]({{< relref "boundary-rules" >}}) — the twelve rules that check declarations
- [ACF-E2: Unvalidated Delegation]({{< relref "/acf/e2-unvalidated-delegation" >}}) — the taxonomy entry this family partially covers
