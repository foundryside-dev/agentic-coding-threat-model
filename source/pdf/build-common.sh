#!/bin/bash
# Shared functions for PDF build scripts.
# Sourced by build-community.sh, build-wardline-community.sh, and build-lite.sh.

# --- Mermaid rendering ---
# Renders Mermaid code blocks in a Markdown file to accessible SVG figures.
# Arguments: $1 = body markdown file, $2 = mermaid temp directory, $3 = script directory
render_mermaid() {
    local body_md="$1"
    local mermaid_dir="$2"
    local script_dir="$3"

    if ! grep -q '^```mermaid$' "$body_md"; then
        return 0
    fi

    if ! command -v mmdc &>/dev/null; then
        echo "  [error] mmdc is required because this document contains Mermaid diagrams" >&2
        return 1
    fi

    echo "Rendering Mermaid diagrams..."
    local puppeteer_cfg="$mermaid_dir/puppeteer.json"
    local mermaid_cfg="$mermaid_dir/mermaid.json"
    echo '{ "args": ["--no-sandbox"] }' > "$puppeteer_cfg"
    echo '{ "htmlLabels": false, "flowchart": { "htmlLabels": false } }' > "$mermaid_cfg"
    python3 -c "
import re, sys, subprocess, os

body_md = sys.argv[1]
mermaid_dir = sys.argv[2]
puppeteer_cfg = os.path.join(mermaid_dir, 'puppeteer.json')
mermaid_cfg = os.path.join(mermaid_dir, 'mermaid.json')

with open(body_md, 'r') as f:
    content = f.read()

def clean_text(value):
    value = re.sub(r'<[^>]+>', ' ', value)
    value = value.replace(chr(96), '')
    value = re.sub(r'[*_#]', '', value)
    return re.sub(r'\s+', ' ', value).strip()

def diagram_alt(source, start, diagram):
    headings = re.findall(r'^#{1,6}\s+(.+)$', source[:start], flags=re.MULTILINE)
    context = clean_text(headings[-1]) if headings else 'the document'
    labels = []
    for groups in re.findall(r'\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\}', diagram):
        label = clean_text(next((part for part in groups if part), ''))
        if label and label not in labels:
            labels.append(label)
    detail = ' Key elements: ' + ', '.join(labels[:6]) + '.' if labels else ''
    return ('Diagram for ' + context + '.' + detail)[:320]

def render_mermaid(match):
    idx = render_mermaid.counter
    render_mermaid.counter += 1
    mmd_path = os.path.join(mermaid_dir, f'diagram-{idx}.mmd')
    svg_path = os.path.join(mermaid_dir, f'diagram-{idx}.svg')
    with open(mmd_path, 'w') as f:
        f.write(match.group(1))
    result = subprocess.run(
        ['mmdc', '-i', mmd_path, '-o', svg_path, '-b', 'white',
         '-t', 'neutral', '-c', mermaid_cfg, '--quiet', '-p', puppeteer_cfg],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f'  [warn] mmdc failed for diagram {idx}: {result.stderr.strip()}', file=sys.stderr)
        return match.group(0)  # keep original on failure
    print(f'  [mermaid] rendered diagram-{idx}.svg')
    rel_path = os.path.relpath(svg_path, sys.argv[3])
    alt = diagram_alt(content, match.start(), match.group(1)).replace('[', '(').replace(']', ')')
    return f'![{alt}]({rel_path}){{width=82%}}'

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

# Pandoc wraps every Typst table in figure(..., kind: table). In tagged PDF,
# the figure body becomes an artifact; footnotes or links inside that artifact
# are forbidden by PDF/UA and the table semantics are obscured. Pandoc's writer
# emits this stable wrapper even for uncaptioned tables, so unwrap it here.
figure_start = '#figure(\n  [#table('
figure_end = '  )]\n  , kind: table\n  )'
if content.count(figure_start) != content.count(figure_end):
    raise SystemExit('unbalanced Pandoc table figure wrappers')
table_count = content.count(figure_start)
content = content.replace(figure_start, '#table(')
content = content.replace(figure_end, '  )')

# Pandoc 3.9 maps Markdown image alt text to a Typst figure caption but does
# not yet populate image(alt:), which Typst 0.14 requires for PDF/UA. Copy the
# generated contextual caption into the image's machine-readable alt field.
figure_pattern = re.compile(
    r'#figure\(image\(\x22(?P<path>\.assets/[^\x22]+\.(?:svg|png))\x22, width: (?P<width>[^)]+)\),'
    r'\n  caption: \[\n(?P<caption>.*?)\n  \]\n\)',
    flags=re.DOTALL,
)

def add_image_alt(match):
    caption = re.sub(r'\s+', ' ', match.group('caption')).strip()
    image_call = 'image(' + json.dumps(match.group('path'), ensure_ascii=False) + ', width: ' + match.group('width')
    accessible_call = image_call + f', alt: {json.dumps(caption, ensure_ascii=False)}'
    return match.group(0).replace(image_call, accessible_call, 1)

content, accessible_figure_count = figure_pattern.subn(add_image_alt, content)

lost_headings = re.findall(r'\\#\\#\\#\s+(?:[0-9]+\.|[A-Z]\.)', content)
if lost_headings:
    raise SystemExit(f'heading-like text was not parsed as a heading: {lost_headings[0]}')

with open(sys.argv[1], 'w') as f:
    f.write(content)
print(f'  [post-process] Exposed {table_count} semantic tables and tagged {accessible_figure_count} figures')
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
        --from=markdown \
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
#            $3 = .typ filename, $4 = .pdf filename, $5 = metadata YAML
compile_pdf() {
    local script_dir="$1"
    local root_dir="$2"
    local typ_file="$3"
    local pdf_file="$4"
    local metadata="$5"
    local source_date_epoch

    source_date_epoch=$(sed -n 's/^source-date-epoch: *"\([0-9][0-9]*\)"/\1/p' "$metadata")
    if [[ -z "$source_date_epoch" ]]; then
        echo "  [error] source-date-epoch is missing from $metadata" >&2
        return 1
    fi

    echo "Compiling accessible PDF..."
    cd "$script_dir"
    typst compile \
        --root "$root_dir" \
        --pdf-standard ua-1 \
        --creation-timestamp "$source_date_epoch" \
        "$typ_file" "$pdf_file"
    echo "  -> $script_dir/$pdf_file"
}
