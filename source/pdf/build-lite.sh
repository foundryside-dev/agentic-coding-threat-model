#!/bin/bash
# Build PDFs from the lite briefing documents — community edition (no agency branding).
# Uses pandoc-typst-lite.typ (no logo, no version history, no ToC).
#
# Usage:
#   ./build-lite.sh                    # Generates .typ for all three documents
#   ./build-lite.sh --pdf              # Generates .typ and compiles all three to PDF
#   ./build-lite.sh sdag               # Only sdag-lite
#   ./build-lite.sh wardline           # Only wardline-lite
#   ./build-lite.sh suitemap           # Only suite-map
#   ./build-lite.sh sdag --pdf         # Only sdag-lite, with PDF

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/build-common.sh"

CHAPTERS_DIR="$(dirname "$SCRIPT_DIR")/chapters"
TEMPLATE="$SCRIPT_DIR/pandoc-typst-lite.typ"

# Parse arguments
BUILD_PDF=false
TARGETS=()
for arg in "$@"; do
    case "$arg" in
        --pdf) BUILD_PDF=true ;;
        sdag) TARGETS+=("sdag") ;;
        wardline) TARGETS+=("wardline") ;;
        suitemap) TARGETS+=("suitemap") ;;
        *) echo "Unknown argument: $arg"; echo "Usage: $0 [sdag|wardline|suitemap] [--pdf]"; exit 1 ;;
    esac
done

# Default: build all three
if [[ ${#TARGETS[@]} -eq 0 ]]; then
    TARGETS=("sdag" "wardline" "suitemap")
fi

# Document definitions: name -> source file, metadata file, output basename
declare -A DOC_SOURCE DOC_METADATA DOC_OUTPUT
DOC_SOURCE[sdag]="$CHAPTERS_DIR/governing-ai-generated-code.md"
DOC_METADATA[sdag]="$SCRIPT_DIR/metadata-governing-ai-generated-code.yaml"
DOC_OUTPUT[sdag]="governing-ai-generated-code"

DOC_SOURCE[wardline]="$CHAPTERS_DIR/reviewing-ai-generated-code.md"
DOC_METADATA[wardline]="$SCRIPT_DIR/metadata-reviewing-ai-generated-code.yaml"
DOC_OUTPUT[wardline]="reviewing-ai-generated-code"

DOC_SOURCE[suitemap]="$CHAPTERS_DIR/suite-map.md"
DOC_METADATA[suitemap]="$SCRIPT_DIR/metadata-suite-map.yaml"
DOC_OUTPUT[suitemap]="document-suite-map"

build_document() {
    local name="$1"
    local source="${DOC_SOURCE[$name]}"
    local metadata="${DOC_METADATA[$name]}"
    local output_base="${DOC_OUTPUT[$name]}"
    local output_typ="$SCRIPT_DIR/${output_base}.typ"
    local output_pdf="$SCRIPT_DIR/${output_base}.pdf"

    echo "=== Building $name ==="

    if [[ ! -f "$source" ]]; then
        echo "  [error] Source not found: $source"
        return 1
    fi

    # Prepare body: strip the H1 title line (metadata provides the title page)
    # and strip horizontal rules (Typst sections provide structure)
    BODY_MD=$(mktemp --suffix=.md)
    trap 'rm -f "$BODY_MD"' RETURN

    # Remove the first H1 heading (title) — the template renders the title page from metadata
    sed '1{/^# /d}' "$source" > "$BODY_MD"

    # Strip standalone horizontal rules
    sed -i '/^---$/d' "$BODY_MD"

    # Strip bold subtitle lines that duplicate metadata
    sed -i '/^\*\*What .* consider/d' "$BODY_MD"
    sed -i '/^\*\*What.s changed, why it matters/d' "$BODY_MD"
    sed -i '/^\*\*What you need to know/d' "$BODY_MD"
    sed -i '/^\*\*A reading guide/d' "$BODY_MD"

    # Strip front matter metadata lines rendered by the title page
    sed -i \
        -e '/^\*\*Date:\*\*/d' \
        -e '/^\*\*Protective Marking:\*\*/d' \
        -e '/^\*\*Prepared by:\*\*/d' \
        -e '/^\*\*Parent paper:\*\*/d' \
        -e '/^\*\*Status:\*\*/d' \
        "$BODY_MD"

    # Strip disclaimer blockquote — rendered on title page from metadata
    sed -i '/^> This is a navigation guide/d' "$BODY_MD"
    sed -i '/^> This is a draft discussion paper/d' "$BODY_MD"

    # PDF companions live together in docs/pdf; keep the link useful after
    # Pandoc conversion instead of embedding a source-only Markdown path.
    sed -i 's|(governing-ai-generated-code.md)|(governing-ai-generated-code.pdf)|g' "$BODY_MD"

    # Convert MkDocs admonitions (!!! type "title") to blockquotes for pandoc
    python3 -c "
import re, sys

with open(sys.argv[1], 'r') as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    m = re.match(r'^!!! \w+ \"(.+)\"', lines[i])
    if m:
        title = m.group(1)
        # Collect indented body lines
        body_lines = []
        i += 1
        while i < len(lines) and (lines[i].startswith('    ') or lines[i].strip() == ''):
            if lines[i].strip() == '':
                body_lines.append('>\n')
            else:
                body_lines.append('> ' + lines[i][4:])
            i += 1
        out.append(f'> **{title}**\n')
        out.append('>\n')
        out.extend(body_lines)
        out.append('\n')
    else:
        out.append(lines[i])
        i += 1

with open(sys.argv[1], 'w') as f:
    f.writelines(out)
" "$BODY_MD"

    run_pandoc "$BODY_MD" "$TEMPLATE" "$metadata" "$output_typ"

    # Lite documents use a lower column threshold (3 instead of 4)
    postprocess_tables "$output_typ" '{}' 'lite'

    if $BUILD_PDF; then
        compile_pdf "$SCRIPT_DIR" "$(dirname "$SCRIPT_DIR")" "$(basename "$output_typ")" "$(basename "$output_pdf")" "$metadata"
    fi

    echo ""
}

for target in "${TARGETS[@]}"; do
    build_document "$target"
done

echo "Done."
