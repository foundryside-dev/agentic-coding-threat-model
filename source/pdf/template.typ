// Typst template for long-form discussion papers
//
// Used via pandoc: pandoc input.md -t typst --template=pandoc-typst.typ --metadata-file=metadata.yaml

// --- Brand Colours ---
#let dta-navy = rgb("#2C3E5D")
#let dta-body = rgb("#333333")
#let dta-code-bg = rgb("#F5F5F5")
#let dta-rule-blue = rgb("#2E5090")

// --- conf function (called by pandoc's template wrapper) ---
#let conf(
  title: none,
  subtitle: none,
  authors: (),
  date: none,
  abstract: none,
  abstract-title: none,
  keywords: (),
  lang: "en",
  region: "AU",
  cols: 1,
  // String metadata for PDF/UA — Typst 0.14+ requires str, not content
  pdf-title: none,
  pdf-author: none,
  pdf-keywords: none,
  // Custom metadata passed via pandoc
  doc,
) = {

  // Machine-readable PDF metadata (XMP) — required for WCAG 2.1 AA SC 2.4.2
  // Typst 0.14+ requires str values for document(). Pandoc wraps metadata
  // in content blocks, so we pass string versions via pdf-title/pdf-author.
  // Keywords are passed as a comma-separated string and split into an array.
  set document(
    title: if pdf-title != none { pdf-title } else { none },
    author: if pdf-author != none { (pdf-author,) } else { () },
    keywords: if pdf-keywords != none { pdf-keywords.split(", ") } else { () },
    date: auto,
  )

  // --- Page setup ---
  set page(
    paper: "a4",
    margin: (top: 3cm, bottom: 3cm, left: 3cm, right: 3cm),
    fill: white,
    header: {
      line(length: 100%, stroke: 0.4pt + luma(180))
    },
    footer: context {
      let page-num = counter(page).display()
      line(length: 100%, stroke: 0.4pt + luma(180))
      v(0.2em)
      grid(
        columns: (1fr, 1fr, 1fr),
        align: (left, center, right),
        [], [], text(size: 9pt)[#page-num],
      )
    },
  )

  // --- Body text defaults ---
  // Serif body font for long-form reading; sans-serif headings provide contrast.
  // Libertinus Serif is a high-quality open-source font with excellent glyph
  // coverage and readable italics — preferred over Computer Modern for
  // non-mathematical documents.
  set text(
    font: ("Libertinus Serif", "TeX Gyre Termes", "Liberation Serif", "DejaVu Serif"),
    size: 11pt,
    fill: dta-body,
    lang: lang,
    region: region,
    hyphenate: true,
  )

  // --- Paragraph spacing ---
  // Justified body text with controlled hyphenation for formal government documents.
  // "optimized" linebreaks provide some implicit widow/orphan mitigation by choosing
  // better break points across the full paragraph.
  // Note: par(costs: (widow: ..., orphan: ...)) requires Typst 0.15+ — add when available.
  set par(
    leading: 0.9em,
    spacing: 1.1em,
    justify: true,
    linebreaks: "optimized",
  )

  // --- Headings ---
  // Sans-serif headings for visual contrast against serif body text
  set heading(numbering: none)

  // Prevent headings from appearing at the bottom of a page with no following content
  show heading: set block(sticky: true)

  // Level 1 = ## in markdown (part titles) — strong visual separation with rule
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    v(1.5cm)
    line(length: 100%, stroke: 1.5pt + dta-navy)
    v(0.6em)
    text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 20pt, weight: "bold", fill: dta-navy)[#it.body]
    v(1em)
  }

  // Level 2 = ### in markdown (numbered sections like "1. What a Wardline Is")
  show heading.where(level: 2): it => {
    v(1.5em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 14pt, weight: "bold", fill: dta-navy)[#it.body]
      #v(0.4em)
    ]
  }

  // Level 3 = #### in markdown (subsections like "4.1 Three Tiers")
  show heading.where(level: 3): it => {
    v(0.8em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 12pt, weight: "bold", fill: dta-navy)[#it.body]
      #v(0.3em)
    ]
  }

  // Level 4 = ##### in markdown (sub-subsections like "12.1.1 Root Manifest Schema")
  show heading.where(level: 4): it => {
    v(0.6em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 11pt, weight: "bold", fill: dta-navy)[#it.body]
      #v(0.2em)
    ]
  }

  // --- Links ---
  show link: it => text(fill: dta-rule-blue)[#it]

  // --- Code blocks ---
  // Noto Sans Mono is more compact than DejaVu, fitting longer lines before wrapping.
  // At 9pt it matches DejaVu's 8.5pt width while being more readable.
  show raw.where(block: true): it => {
    set text(font: ("Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono"), size: 9pt)
    block(
      width: 100%,
      fill: dta-code-bg,
      inset: (x: 12pt, y: 10pt),
      radius: 3pt,
      breakable: true,
      stroke: 0.5pt + luma(200),
      it,
    )
  }

  // --- Inline code ---
  show raw.where(block: false): it => {
    set text(font: ("Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono"), size: 9.5pt)
    box(
      fill: dta-code-bg,
      inset: (x: 3pt, y: 0pt),
      outset: (y: 2pt),
      radius: 2pt,
      it,
    )
  }

  // --- Tables ---
  set table(
    inset: (x: 8pt, y: 6pt),
    stroke: (x, y) => {
      if y == 0 { (bottom: 1.2pt + dta-navy) }
      else { (bottom: 0.5pt + luma(200)) }
    },
    fill: (x, y) => {
      if y == 0 { dta-navy.lighten(90%) }
      else if calc.odd(y) { white }
      else { luma(240) }
    },
  )

  // Table cell text: smaller font, left-aligned (not justified — avoids rivers in narrow columns)
  show table.cell: set text(size: 9pt)
  show table.cell: set par(leading: 0.65em, justify: false, linebreaks: "optimized")
  set table.cell(breakable: true)

  // Bold header row text
  show table.cell.where(y: 0): set text(weight: "bold", size: 9pt, fill: dta-navy, hyphenate: true)

  // Pandoc wraps tables in figure blocks — make them breakable across pages
  show figure.where(kind: table): set block(breakable: true, width: 100%)
  show figure.where(kind: table): set align(left)

  // Table captions smaller than body text
  show figure.caption: set text(size: 8.5pt)

  // --- Block quotes ---
  show quote.where(block: true): it => {
    block(
      inset: (left: 1.5em, top: 0.5em, bottom: 0.5em),
      stroke: (left: 2.5pt + dta-navy.lighten(60%)),
      text(style: "italic", fill: dta-body.lighten(15%))[#it.body],
    )
  }

  // --- Lists ---
  set list(indent: 1em, spacing: 0.8em)
  set enum(indent: 1em, spacing: 0.8em)

  // --- Footnotes ---
  // Smaller footnote text with a visible separator rule
  set footnote.entry(separator: line(length: 30%, stroke: 0.5pt + luma(180)))
  show footnote.entry: set text(size: 8.5pt)

  // Emit the document body
  doc
}
