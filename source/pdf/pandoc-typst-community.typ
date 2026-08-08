// Pandoc template for Typst output — community edition (no agency branding)
// This file is the --template passed to pandoc. It wraps the body
// with the conf function from template.typ and adds the title page.

#show terms.item: it => block(breakable: false)[
  #text(weight: "bold")[#it.term]
  #block(inset: (left: 1.5em, top: -0.4em))[#it.description]
]

$if(highlighting-definitions)$
$highlighting-definitions$

$endif$
#import "template.typ": conf

#set smartquote(enabled: true)

$for(header-includes)$
$header-includes$

$endfor$
#show: doc => conf(
$if(title)$
  title: [$title$],
  pdf-title: "$title$",
$endif$
$if(subtitle)$
  subtitle: [$subtitle$],
$endif$
$if(author)$
  authors: (
    ( name: [$author$], affiliation: "", email: "" ),
  ),
  pdf-author: "$author$",
$endif$
$if(keywords)$
  pdf-keywords: "$keywords$",
$endif$
$if(date)$
  date: [$date$],
$endif$
$if(lang)$
  lang: "$lang$",
$endif$
$if(region)$
  region: "$region$",
$endif$
  cols: 1,
  doc,
)

// =====================================================================
// TITLE PAGE — community edition
// =====================================================================
#page(header: none, footer: none, numbering: none)[

  #v(7cm)

  // Decorative rule — provides visual weight at the head of the title page
  #line(length: 100%, stroke: 2pt + rgb("#2C3E5D"))
  #v(0.8cm)

  #set text(hyphenate: false)
  #set par(justify: false)
  #text(size: 22pt, weight: "bold", fill: rgb("#2C3E5D"))[$if(title)$$title$$endif$]

  #v(0.8cm)

  $if(subtitle)$
  #text(size: 15pt, fill: rgb("#414141"))[$subtitle$]

  #v(0.6cm)
  $endif$

  #text(size: 14pt)[Discussion Paper --- $if(version)$$version$$endif$]

  #v(1.2cm)

  #table(
    columns: (auto, 1fr),
    stroke: none,
    fill: none,
    align: left,
    inset: (x: 8pt, y: 4pt),
    [*Date:*], [$if(date)$$date$$endif$],
    [*Prepared by:*], [$if(author)$$author$$endif$],
  )

  #v(1fr)

  #text(size: 9pt, fill: rgb("#414141"))[
    $if(disclaimer)$$disclaimer$$else$This is a discussion paper. It presents a threat model and preliminary analysis, not final guidance. Comments and contributions are welcome.$endif$
  ]
]

// =====================================================================
// DOCUMENT CONTROL — version history on its own page
// =====================================================================
$if(version-table)$
#page(header: none, footer: none, numbering: none)[

  #v(0.5cm)
  #text(size: 16pt, weight: "bold", fill: rgb("#2C3E5D"))[Document Control]
  #v(1cm)

  #table(
    columns: (auto, auto, 1fr),
    inset: 8pt,
    stroke: (x, y) => {
      if y == 0 { (bottom: 1.2pt + rgb("#2C3E5D")) }
      else { (bottom: 0.5pt + luma(200)) }
    },
    fill: (x, y) => {
      if y == 0 { rgb("#2C3E5D").lighten(90%) }
      else { none }
    },
    table.cell(stroke: none)[*Version*], table.cell(stroke: none)[*Date*], table.cell(stroke: none)[*Changes*],
    $for(version-table)$
    [$version-table.version$], [$version-table.date$], [#text(size: 9pt)[$version-table.changes$]],
    $endfor$
  )
]
$endif$

// =====================================================================
// TABLE OF CONTENTS
// Depth 4 captures parts, numbered sections, subsections, and sub-subsections.
// =====================================================================
#set page(numbering: "i")
#counter(page).update(1)

// ToC title styled as front matter — no navy rule or forced page break
#outline(
  title: text(
    font: ("TeX Gyre Heros", "Liberation Sans", "DejaVu Sans"),
    size: 20pt,
    weight: "bold",
    fill: rgb("#2C3E5D"),
  )[Contents],
  depth: 4,
  indent: 1.5em,
)

#pagebreak()

// =====================================================================
// BODY — switch to arabic numerals
// =====================================================================
#set page(numbering: "1")
#counter(page).update(1)

$body$

$for(include-after)$

$include-after$
$endfor$
