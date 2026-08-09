#!/bin/bash
# Canonical publication entry point for the five public PDFs.
#
# Usage:
#   ./source/pdf/build-all.sh             # build and verify working outputs
#   ./source/pdf/build-all.sh --publish   # build, verify, then update docs/pdf/
#   ./source/pdf/build-all.sh --check     # fail if docs/pdf/ is out of date

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PUBLISH_DIR="$PROJECT_DIR/docs/pdf"

MODE="build"
case "${1:-}" in
    "") ;;
    --publish) MODE="publish" ;;
    --check) MODE="check" ;;
    -h|--help)
        sed -n '2,8p' "$0" | sed 's/^# *//'
        exit 0
        ;;
    *)
        echo "Unknown argument: $1" >&2
        exit 2
        ;;
esac

version_at_least() {
    local actual="$1"
    local required="$2"
    [[ "$(printf '%s\n%s\n' "$required" "$actual" | sort -V | head -n 1)" == "$required" ]]
}

require_tool() {
    local command_name="$1"
    local required="$2"
    local actual

    if ! command -v "$command_name" &>/dev/null; then
        echo "[error] Required command not found: $command_name" >&2
        exit 1
    fi
    actual=$("$command_name" --version 2>&1 | head -n 1 | grep -oE '[0-9]+(\.[0-9]+){1,2}' | head -n 1)
    if [[ -z "$actual" ]] || ! version_at_least "$actual" "$required"; then
        echo "[error] $command_name >= $required is required; found ${actual:-unknown}" >&2
        exit 1
    fi
    echo "  $command_name $actual"
}

echo "Checking publication toolchain..."
require_tool pandoc 3.2
require_tool typst 0.14.0
require_tool mmdc 11.0.0
command -v pdfinfo &>/dev/null || { echo "[error] pdfinfo is required" >&2; exit 1; }
command -v pdffonts &>/dev/null || { echo "[error] pdffonts is required" >&2; exit 1; }
command -v pdftotext &>/dev/null || { echo "[error] pdftotext is required" >&2; exit 1; }

"$SCRIPT_DIR/build-community.sh" --pdf
"$SCRIPT_DIR/build-wardline-community.sh" --pdf
"$SCRIPT_DIR/build-lite.sh" --pdf

PDFS=(
    threat-model-discussion-paper-community.pdf
    wardline-companion-community.pdf
    governing-ai-generated-code.pdf
    reviewing-ai-generated-code.pdf
    document-suite-map.pdf
)

echo "Verifying publication artifacts..."
for name in "${PDFS[@]}"; do
    pdf="$SCRIPT_DIR/$name"
    info=$(pdfinfo "$pdf" 2>/dev/null)
    grep -q '^Tagged: *yes$' <<< "$info" || { echo "[error] $name is not tagged" >&2; exit 1; }
    grep -Eq '^Pages: *[1-9][0-9]*$' <<< "$info" || { echo "[error] $name has no pages" >&2; exit 1; }
    grep -Eq '^Title: *[^[:space:]]' <<< "$info" || { echo "[error] $name has no PDF title" >&2; exit 1; }
    pdftotext "$pdf" - 2>/dev/null | awk '/[[:alnum:]]/ { found=1 } END { exit !found }' || { echo "[error] $name has no extractable text" >&2; exit 1; }
    if ! pdffonts "$pdf" 2>/dev/null | awk 'NR > 2 && ($6 != "yes" || $7 != "yes") { bad=1 } END { exit bad }'; then
        echo "[error] $name contains a font that is not embedded or subset" >&2
        exit 1
    fi
    pages=$(sed -n 's/^Pages: *//p' <<< "$info")
    echo "  [ok] $name ($pages pages, tagged PDF/UA-1)"
done

if [[ "$MODE" == "publish" ]]; then
    echo "Publishing verified PDFs to docs/pdf/..."
    for name in "${PDFS[@]}"; do
        cp "$SCRIPT_DIR/$name" "$PUBLISH_DIR/$name"
    done
elif [[ "$MODE" == "check" ]]; then
    stale=0
    for name in "${PDFS[@]}"; do
        if ! cmp -s "$SCRIPT_DIR/$name" "$PUBLISH_DIR/$name"; then
            echo "  [stale] docs/pdf/$name" >&2
            stale=1
        fi
    done
    if [[ "$stale" -ne 0 ]]; then
        echo "[error] Published PDFs are stale; run ./source/pdf/build-all.sh --publish" >&2
        exit 1
    fi
    echo "Published PDFs are current."
fi

echo "Done."
