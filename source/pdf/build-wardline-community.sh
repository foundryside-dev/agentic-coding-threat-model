#!/bin/bash
# Build PDF from the Wardline companion document using Typst — community edition.
# Uses pandoc-typst-community.typ (no agency branding) and metadata-wardline-community.yaml.
#
# Usage:
#   ./build-wardline-community.sh          # Generates .typ only
#   ./build-wardline-community.sh --pdf    # Generates .typ and compiles to PDF

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/build-common.sh"

THREAT_MODEL_DIR="$(dirname "$SCRIPT_DIR")"
SOURCE="$THREAT_MODEL_DIR/wardline-companion-document.md"
TEMPLATE="$SCRIPT_DIR/pandoc-typst-community.typ"
METADATA="$SCRIPT_DIR/metadata-wardline-community.yaml"
OUTPUT_TYP="$SCRIPT_DIR/wardline-companion-community.typ"
OUTPUT_PDF="$SCRIPT_DIR/wardline-companion-community.pdf"

# Strip the metadata header from Markdown
BODY_MD=$(mktemp)
MERMAID_DIR="$SCRIPT_DIR/.mermaid-tmp"
mkdir -p "$MERMAID_DIR"
trap 'rm -f "$BODY_MD"; rm -rf "$MERMAID_DIR"' EXIT

# Keep the full document but strip front matter metadata blocks
sed -n '/^## Wardline/,$p' "$SOURCE" > "$BODY_MD"

# Strip document-level ## headings — title page handles these
sed -i '/^## Wardline: A Classification Framework/d' "$BODY_MD"
sed -i '/^## Wardline for Python:/d' "$BODY_MD"
sed -i '/^## Wardline for Java:/d' "$BODY_MD"
sed -i '/^## Wardline Practitioner Guide/d' "$BODY_MD"

# Strip horizontal rules — Typst sections provide structure
sed -i '/^---$/d' "$BODY_MD"

# Promote "How to read" preamble heading — after stripping ## part titles,
# this ### heading would be level 3 with no level 2 before it (PDF/UA violation)
sed -i 's/^### How to read this \(document\|guide\)$/## How to read this \1/' "$BODY_MD"

# Strip front matter metadata lines rendered by the title page
sed -i \
    -e '/^\*\*Status:\*\*/d' \
    -e '/^\*\*Companion document:\*\*/d' \
    -e '/^\*\*Parent paper:\*\*/d' \
    -e '/^\*\*Parent specification:\*\*/d' \
    -e '/^\*\*Date:\*\*/d' \
    -e '/^\*\*Document ID:\*\*/d' \
    -e '/^\*\*Version:\*\*/d' \
    -e '/^\*\*Baselined:\*\*/d' \
    -e '/^\*\*Derived from:\*\*/d' \
    -e '/^\*\*Constraints from:\*\*/d' \
    -e '/^\*\*Language bindings:\*\*/d' \
    -e '/^\*\*Sibling binding:\*\*/d' \
    -e '/^\*\*Protective Marking:\*\*/d' \
    -e '/^\*\*Prepared by:\*\*/d' \
    "$BODY_MD"

# Strip the markdown Table of Contents — the Typst template generates its own via #outline()
python3 -c "
import re, sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
content = re.sub(r'### Contents\n.*?(?=### \d+\.)', '', content, flags=re.DOTALL)
with open(sys.argv[1], 'w') as f:
    f.write(content)
" "$BODY_MD"

render_mermaid "$BODY_MD" "$MERMAID_DIR" "$SCRIPT_DIR"
run_pandoc "$BODY_MD" "$TEMPLATE" "$METADATA" "$OUTPUT_TYP"

# Table overrides for the Wardline companion
TABLE_OVERRIDES='{
    "Trusted assertion": "15%, 15%, 30%, 40%",
    "Not Applicable": "12%, 14%, 14%, 14%, 46%",
    "Institutional Knowledge": "18%, 30%, 18%, 34%",
    "Annotation expressiveness": "22%, 12%, 66%",
    "Key Decorators": "5%, 18%, 40%, 37%"
}'
postprocess_tables "$OUTPUT_TYP" "$TABLE_OVERRIDES"

if [[ "${1:-}" == "--pdf" ]]; then
    compile_pdf "$SCRIPT_DIR" "$THREAT_MODEL_DIR" "$(basename "$OUTPUT_TYP")" "$(basename "$OUTPUT_PDF")"
fi

echo "Done."
