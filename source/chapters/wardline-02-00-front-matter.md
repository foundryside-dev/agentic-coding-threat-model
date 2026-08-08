## Part II — Practitioner Reference

Part I describes what wardline is and what it does. Part II describes how to use it.

This part is a **practitioner quick reference derived from the implementation**, not a binding specification. Every flag, path, file format, and exit code in it was read out of the `wardline` source tree and its command help rather than transcribed from a design document, and a reader who installs the tool and runs `wardline --help` should find no surprises. Where Part II and Part I appear to disagree, Part I states the model and Part II states the mechanics; where either appears to disagree with the tool, the tool is right and both are stale.

**One binding.** The designed specification (archived) carried two language binding references, Python and Java, each mapping seventeen abstract annotation groups onto a language's annotation mechanism, type system, and runtime enforcement layer. There is no Java implementation, there never was, and no Java binding appears here. Rust is a *scanned target language* with a two-rule preview frontend (Part I §6, §11), not a binding — there is nothing to write a practitioner reference for beyond `wardline scan --lang rust`.

**Section A — Python.** Installation and extras, the decorator reference with the imports the tool actually recognises, `weft.toml` configuration, the command-line surface, the three suppression file formats, output formats, and a worked example carried from a failing gate to a clean one.

Section references of the form "§N" without a part prefix refer to Part I. Version and provenance details for the document as a whole are in the Part I front matter.

---
