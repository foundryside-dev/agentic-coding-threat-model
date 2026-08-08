#!/bin/bash
# Shared functions for PDF build scripts.
# Sourced by build-community.sh, build-wardline-community.sh, and build-lite.sh.

# --- Mermaid rendering ---
# Renders mermaid code blocks in a markdown file to PNG images.
# Arguments: $1 = body markdown file, $2 = mermaid temp directory, $3 = script directory
render_mermaid() {
    local body_md="$1"
    local mermaid_dir="$2"
    local script_dir="$3"

    if ! command -v mmdc &>/dev/null; then
        echo "  [skip] mmdc not found — mermaid blocks will render as code"
        return 0
    fi

    echo "Rendering Mermaid diagrams..."
    local puppeteer_cfg="$mermaid_dir/puppeteer.json"
    echo '{ "args": ["--no-sandbox"] }' > "$puppeteer_cfg"
    python3 -c "
import re, sys, subprocess, os

body_md = sys.argv[1]
mermaid_dir = sys.argv[2]
puppeteer_cfg = os.path.join(mermaid_dir, 'puppeteer.json')

with open(body_md, 'r') as f:
    content = f.read()

def render_mermaid(match):
    idx = render_mermaid.counter
    render_mermaid.counter += 1
    mmd_path = os.path.join(mermaid_dir, f'diagram-{idx}.mmd')
    png_path = os.path.join(mermaid_dir, f'diagram-{idx}.png')
    with open(mmd_path, 'w') as f:
        f.write(match.group(1))
    result = subprocess.run(
        ['mmdc', '-i', mmd_path, '-o', png_path, '-b', 'white',
         '--quiet', '-p', puppeteer_cfg, '-s', '3'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f'  [warn] mmdc failed for diagram {idx}: {result.stderr.strip()}', file=sys.stderr)
        return match.group(0)  # keep original on failure
    print(f'  [mermaid] rendered diagram-{idx}.png')
    rel_path = os.path.relpath(png_path, sys.argv[3])
    return f'![Diagram {idx + 1}]({rel_path}){{width=75%}}'

render_mermaid.counter = 0
content = re.sub(r'\`\`\`mermaid\n(.*?)\n\`\`\`', render_mermaid, content, flags=re.DOTALL)

with open(body_md, 'w') as f:
    f.write(content)
print(f'  [mermaid] {render_mermaid.counter} diagram(s) processed')
" "$body_md" "$mermaid_dir" "$script_dir"
}

# --- Pandoc table post-processing ---
# Fixes alignment and column width issues in pandoc-generated Typst.
# Arguments: $1 = .typ file, $2 = JSON table overrides (optional),
#            $3 = "lite" to use lower narrow-column threshold (optional)
postprocess_tables() {
    local output_typ="$1"
    local table_overrides="${2:-}"
    local mode="${3:-}"

    # Remove all align: (auto,...) lines from tables — let template handle alignment
    sed -i '/^    align: ([^)]*),$/d' "$output_typ"

    # Remove align(center) wrappers around tables — pandoc adds these unnecessarily
    sed -i 's/align(center)\[#table/[#table/g' "$output_typ"

    # Fix column widths: apply specific overrides and redistribute narrow columns
    python3 -c "
import re, sys, json

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Table overrides passed as JSON
overrides = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else {}

# Apply specific overrides — search for marker within 15 lines after each
# columns: line to handle markers in data rows, not just headers.
lines = content.split('\n')
for marker, widths in overrides.items():
    for i, line in enumerate(lines):
        if 'columns:' in line and '%' in line:
            window = '\n'.join(lines[i:i+15])
            if marker in window:
                lines[i] = re.sub(r'columns: \([^)]+\)', f'columns: ({widths})', lines[i])
content = '\n'.join(lines)

# General fix: redistribute any remaining tables with very narrow columns
def fix_columns(match):
    cols = re.findall(r'[0-9.]+%', match.group(0))
    if not cols:
        return match.group(0)
    vals = [float(c.rstrip('%')) for c in cols]
    n = len(vals)
    min_cols = 3 if len(sys.argv) > 3 and sys.argv[3] == 'lite' else 4
    if any(v < 12 for v in vals) and n >= min_cols:
        floor = 15.0
        new_vals = [max(v, floor) for v in vals]
        s = sum(new_vals)
        new_vals = [v * 100.0 / s for v in new_vals]
        new_spec = ', '.join(f'{v:.2f}%' for v in new_vals)
        return f'columns: ({new_spec})'
    return match.group(0)

content = re.sub(r'columns: \([^)]+\)', fix_columns, content)

with open(sys.argv[1], 'w') as f:
    f.write(content)
print('  [post-process] Fixed table alignment and column widths')
" "$output_typ" "$table_overrides" "$mode"
}

# --- Pandoc invocation ---
# Runs pandoc with standard flags for Typst output.
# Arguments: $1 = input markdown, $2 = template, $3 = metadata file, $4 = output .typ
run_pandoc() {
    local body_md="$1"
    local template="$2"
    local metadata="$3"
    local output_typ="$4"

    echo "Generating Typst..."
    pandoc "$body_md" \
        --to=typst \
        --template="$template" \
        --metadata-file="$metadata" \
        --standalone \
        --top-level-division=chapter \
        --columns=120 \
        -o "$output_typ"
    echo "  -> $output_typ"
}

# --- Typst compilation ---
# Compiles a .typ file to PDF.
# Arguments: $1 = script directory, $2 = typst root directory,
#            $3 = .typ filename, $4 = .pdf filename
compile_pdf() {
    local script_dir="$1"
    local root_dir="$2"
    local typ_file="$3"
    local pdf_file="$4"

    echo "Compiling PDF..."
    cd "$script_dir"
    # Note: --pdf-standard ua-1 removed pending alt text for Mermaid-rendered PNGs
    typst compile --root "$root_dir" "$typ_file" "$pdf_file"
    echo "  -> $script_dir/$pdf_file"
}
