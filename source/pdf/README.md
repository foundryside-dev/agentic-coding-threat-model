# PDF publication pipeline

The public PDFs are generated from the tracked Markdown in `source/chapters/`,
converted by Pandoc, and typeset by Typst. The build targets Typst 0.14's
tagged-PDF model and requires PDF/UA-1 conformance for every publication.

## Requirements

- Pandoc 3.2 or newer
- Typst 0.14.0 or newer
- Mermaid CLI 11 or newer (`mmdc`)
- Poppler utilities (`pdfinfo`, `pdffonts`, and `pdftotext`)

The repository currently builds with Pandoc 3.9.0.2, Typst 0.14.2, and Mermaid CLI
11.16.0. Keep CI and local versions aligned when changing the template.

## Commands

```bash
# Build all five PDFs into source/pdf/ and run structural checks
./source/pdf/build-all.sh

# Build, verify, and update the public artifacts used by MkDocs
./source/pdf/build-all.sh --publish

# Rebuild and fail if the checked-in public PDFs are stale
./source/pdf/build-all.sh --check
```

The legacy per-profile commands remain available for focused iteration:

```bash
./source/pdf/build-community.sh --pdf
./source/pdf/build-wardline-community.sh --pdf
./source/pdf/build-lite.sh sdag --pdf
```

## Design and accessibility contract

- Markdown chapters remain the source of truth; ignored generated monoliths
  are never publication inputs.
- Mermaid diagrams are strict build dependencies and render as vector SVG with
  contextual alternative text.
- Metadata lives in `metadata-*.yaml` and includes a fixed source date epoch so
  repeated builds are byte-reproducible.
- Covers use a semantic level-one heading. Tables use header cells, repeated
  page furniture is marked as an artifact, body copy is ragged right, and text
  never drops below 9 pt.
- Typst compilation always uses `--pdf-standard ua-1`. This is a strong
  automated gate, not a substitute for release-time testing with veraPDF or
  PAC and a screen reader.
- `--publish` copies artifacts only after all five documents build and pass
  metadata, tagging, text-extraction, page-count, and font-embedding checks.

Generated `.typ`, PDF, and Mermaid asset files under `source/pdf/` are ignored.
They are retained locally so the intermediate Typst documents can be inspected
and recompiled while diagnosing layout issues.
