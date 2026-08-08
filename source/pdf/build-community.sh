#!/bin/bash
# Build PDF from the parent discussion paper using Typst — community edition.
# Uses pandoc-typst-community.typ (no agency branding) and metadata-community.yaml.
#
# Usage:
#   ./build-community.sh          # Generates .typ only
#   ./build-community.sh --pdf    # Generates .typ and compiles to PDF

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/build-common.sh"

THREAT_MODEL_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE="$THREAT_MODEL_DIR/agentic-code-threat-model-discussion-paper.md"
TEMPLATE="$SCRIPT_DIR/pandoc-typst-community.typ"
METADATA="$SCRIPT_DIR/metadata-community.yaml"
OUTPUT_TYP="$SCRIPT_DIR/threat-model-discussion-paper-community.typ"
OUTPUT_PDF="$SCRIPT_DIR/threat-model-discussion-paper-community.pdf"

# Strip the metadata header from Markdown
BODY_MD=$(mktemp)
MERMAID_DIR="$SCRIPT_DIR/.mermaid-tmp"
mkdir -p "$MERMAID_DIR"
trap 'rm -f "$BODY_MD"; rm -rf "$MERMAID_DIR"' EXIT

# Keep everything from "## Abstract" onward
sed -n '/^## Abstract$/,$p' "$SOURCE" > "$BODY_MD"

# Strip the manual Table of Contents section — Typst #outline() handles it
sed -i '/^## Table of Contents$/,/^---$/d' "$BODY_MD"

# Strip horizontal rules (---) — Typst sections provide structure
sed -i '/^---$/d' "$BODY_MD"

# Strip the final disclaimer line (template handles it)
sed -i '/^\*This is a discussion paper\./d' "$BODY_MD"

render_mermaid "$BODY_MD" "$MERMAID_DIR" "$SCRIPT_DIR"
run_pandoc "$BODY_MD" "$TEMPLATE" "$METADATA" "$OUTPUT_TYP"

# Table overrides for the parent paper
TABLE_OVERRIDES='{"Summary Table": "8%, 20%, 8%, 12%, 15%, 8%, 29%"}'
postprocess_tables "$OUTPUT_TYP" "$TABLE_OVERRIDES"

if [[ "${1:-}" == "--pdf" ]]; then
    compile_pdf "$SCRIPT_DIR" "$THREAT_MODEL_DIR" "$(basename "$OUTPUT_TYP")" "$(basename "$OUTPUT_PDF")"
fi

echo "Done."
