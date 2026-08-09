// Typst template for the Semantic Defects publication suite.
// Requires Typst >= 0.14.0.
//
// Used via pandoc: pandoc input.md -t typst --template=pandoc-typst.typ --metadata-file=metadata.yaml

// A restrained, high-contrast palette for screen and print. Colour is never
// the only carrier of meaning; links are also underlined and callouts use rules.
#let ink = rgb("#18212F")
#let muted = rgb("#56616E")
#let accent = rgb("#315C87")
#let accent-dark = rgb("#234564")
#let teal = rgb("#2D7371")
#let paper-blue = rgb("#EAF1F5")
#let code-bg = rgb("#F4F6F8")
#let rule = rgb("#CBD5DE")

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
  pdf-description: none,
  running-title: none,
  running-version: none,
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
    description: pdf-description,
    date: auto,
  )

  // --- Page setup ---
  set page(
    paper: "a4",
    margin: (top: 2.8cm, bottom: 2.8cm, left: 2.7cm, right: 2.7cm),
    fill: white,
    header: context {
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(size: 9pt, fill: muted)[#if running-title != none { running-title }],
        text(size: 9pt, fill: muted)[#if running-version != none { running-version }],
      )
      v(0.25em)
      line(length: 100%, stroke: 0.6pt + rule)
    },
    footer: context {
      // Read the counter value directly: display() is a locatable reference,
      // which PDF/UA correctly forbids inside an artifact.
      let page-num = str(counter(page).get().first())
      line(length: 100%, stroke: 0.6pt + rule)
      v(0.25em)
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(size: 9pt, fill: muted, "semanticdefects.foundryside.dev"),
        text(size: 9pt, weight: "medium", fill: ink, page-num),
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
    fill: ink,
    lang: lang,
    region: region,
    hyphenate: true,
  )

  // --- Paragraph spacing ---
  // Ragged-right copy avoids rivers in long technical passages and is easier
  // to track for readers with dyslexia or low vision.
  set par(
    leading: 0.78em,
    spacing: 1.1em,
    justify: false,
    linebreaks: "optimized",
  )

  // --- Headings ---
  // Sans-serif headings for visual contrast against serif body text
  set heading(numbering: none)

  // Prevent headings from appearing at the bottom of a page with no following content
  show heading: set block(sticky: true)

  // Front-matter H1s are semantic landmarks but stay within their composed page.
  show heading.where(level: 1, outlined: false): it => {
    text(
      font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"),
      size: 21pt,
      weight: "bold",
      fill: ink,
    )[#it.body]
  }

  // Level 1 = ## in markdown (part titles) — strong visual separation with rule.
  show heading.where(level: 1, outlined: true): it => {
    pagebreak(weak: true)
    v(1.5cm)
    line(length: 100%, stroke: 2pt + accent)
    v(0.6em)
    text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 21pt, weight: "bold", fill: ink)[#it.body]
    v(1em)
  }

  // Level 2 = ### in markdown (numbered sections like "1. What a Wardline Is")
  show heading.where(level: 2): it => {
    v(1.5em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 14pt, weight: "bold", fill: accent-dark)[#it.body]
      #v(0.4em)
    ]
  }

  // Level 3 = #### in markdown (subsections like "4.1 Three Tiers")
  show heading.where(level: 3): it => {
    v(0.8em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 12pt, weight: "bold", fill: ink)[#it.body]
      #v(0.3em)
    ]
  }

  // Level 4 = ##### in markdown (sub-subsections like "12.1.1 Root Manifest Schema")
  show heading.where(level: 4): it => {
    v(0.6em)
    block(breakable: false)[
      #text(font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"), size: 11pt, weight: "bold", fill: ink)[#it.body]
      #v(0.2em)
    ]
  }

  // --- Links ---
  show link: it => text(fill: accent-dark)[#underline(it)]

  // --- Code blocks ---
  // Noto Sans Mono is more compact than DejaVu, fitting longer lines before wrapping.
  // At 9pt it matches DejaVu's 8.5pt width while being more readable.
  show raw.where(block: true): it => {
    set text(font: ("Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono"), size: 9pt)
    block(
      width: 100%,
      fill: code-bg,
      inset: (x: 12pt, y: 10pt),
      radius: 3pt,
      breakable: true,
      stroke: (left: 2pt + teal, rest: 0.5pt + rule),
      it,
    )
  }

  // --- Inline code ---
  show raw.where(block: false): it => {
    set text(font: ("Noto Sans Mono", "DejaVu Sans Mono", "Liberation Mono"), size: 9pt)
    box(
      fill: code-bg,
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
      if y == 0 { (bottom: 1.2pt + accent-dark) }
      else { (bottom: 0.5pt + rule) }
    },
    fill: (x, y) => {
      if y == 0 { paper-blue }
      else if calc.odd(y) { white }
      else { rgb("#F8FAFB") }
    },
  )

  // Table cell text: smaller font, left-aligned (not justified — avoids rivers in narrow columns)
  show table.cell: set text(size: 9pt)
  show table.cell: set par(leading: 0.65em, justify: false, linebreaks: "optimized")
  set table.cell(breakable: true)

  // Bold header row text
  show table.cell.where(y: 0): set text(weight: "bold", size: 9pt, fill: accent-dark, hyphenate: true)

  // Pandoc wraps tables in figure blocks — make them breakable across pages
  show figure.where(kind: table): set block(breakable: true, width: 100%)
  show figure.where(kind: table): set align(left)

  // Table captions smaller than body text
  show figure.caption: set text(size: 9pt, fill: muted)

  // --- Block quotes ---
  show quote.where(block: true): it => {
    block(
      width: 100%,
      inset: (left: 1.2em, right: 1.2em, top: 0.8em, bottom: 0.8em),
      fill: paper-blue,
      stroke: (left: 3pt + teal),
      text(fill: ink)[#it.body],
    )
  }

  // --- Lists ---
  set list(indent: 1em, spacing: 0.8em)
  set enum(indent: 1em, spacing: 0.8em)

  // --- Footnotes ---
  // Smaller footnote text with a visible separator rule
  set footnote.entry(separator: line(length: 30%, stroke: 0.5pt + luma(180)))
  show footnote.entry: set text(size: 9pt)

  // Emit the document body
  doc
}
