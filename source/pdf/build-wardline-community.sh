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
CHAPTERS_DIR="$THREAT_MODEL_DIR/chapters"
TEMPLATE="$SCRIPT_DIR/pandoc-typst-community.typ"
METADATA="$SCRIPT_DIR/metadata-wardline-community.yaml"
OUTPUT_TYP="$SCRIPT_DIR/wardline-companion-community.typ"
OUTPUT_PDF="$SCRIPT_DIR/wardline-companion-community.pdf"

# Strip the metadata header from Markdown
FULL_MD=$(mktemp --suffix=.md)
BODY_MD=$(mktemp --suffix=.md)
MERMAID_DIR="$SCRIPT_DIR/.assets/wardline"
mkdir -p "$MERMAID_DIR"
trap 'rm -f "$FULL_MD" "$BODY_MD"' EXIT

for chapter in "$CHAPTERS_DIR"/wardline-*.md; do
    sed -n '1,$p' "$chapter" >> "$FULL_MD"
    printf '\n\n' >> "$FULL_MD"
done

# Keep the full document but strip front matter metadata blocks
sed -n '/^## Wardline/,$p' "$FULL_MD" > "$BODY_MD"

# Strip document-level headings — the title page handles these.
sed -i '/^## Wardline: An As-Built Specification$/d' "$BODY_MD"
sed -i '/^### Semantic Trust-Boundary Enforcement$/d' "$BODY_MD"

# Strip horizontal rules — Typst sections provide structure
sed -i '/^---$/d' "$BODY_MD"

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
    -e '/^\*\*Describes:\*\*/d' \
    -e '/^\*\*Document type:\*\*/d' \
    -e '/^\*\*Implementation:\*\*/d' \
    -e '/^\*\*Language frontends:\*\*/d' \
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

# The tracked source nests all substantive sections below its document title.
# With the title moved to the cover, promote the remaining hierarchy by one
# level so major specification clauses become H2 and subsections become H3.
python3 -c "
import re, sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
content = re.sub(
    r'^(#{3,6})(?= )',
    lambda match: match.group(1)[1:],
    content,
    flags=re.MULTILINE,
)
with open(sys.argv[1], 'w') as f:
    f.write(content)
" "$BODY_MD"

render_mermaid "$BODY_MD" "$MERMAID_DIR" "$SCRIPT_DIR"
run_pandoc "$BODY_MD" "$TEMPLATE" "$METADATA" "$OUTPUT_TYP"

# Table overrides for the Wardline companion
TABLE_OVERRIDES='{
    "INTEGRAL": "7%, 22%, 39%, 32%",
    "Trusted assertion": "15%, 15%, 30%, 40%",
    "Not Applicable": "12%, 14%, 14%, 14%, 46%",
    "Institutional Knowledge": "18%, 30%, 18%, 34%",
    "Annotation expressiveness": "22%, 12%, 66%",
    "Key Decorators": "5%, 18%, 40%, 37%"
}'
postprocess_tables "$OUTPUT_TYP" "$TABLE_OVERRIDES"

if [[ "${1:-}" == "--pdf" ]]; then
    compile_pdf "$SCRIPT_DIR" "$THREAT_MODEL_DIR" "$(basename "$OUTPUT_TYP")" "$(basename "$OUTPUT_PDF")" "$METADATA"
fi

echo "Done."
