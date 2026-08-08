// Pandoc template for Typst output — lite briefing edition
// No agency branding, no version history table, no ToC.
// Same visual formatting as community edition via template.typ.

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
// TITLE PAGE — lite briefing (no version history)
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
    $if(parent-paper)$
    [*Parent paper:*], [#text(size: 10pt)[$parent-paper$]],
    $endif$
  )

  #v(1fr)

  #text(size: 9pt, fill: rgb("#414141"))[
    $if(disclaimer)$$disclaimer$$else$This is a discussion paper. It presents a threat model and preliminary analysis, not final guidance. Comments and contributions are welcome.$endif$
  ]
]

// =====================================================================
// BODY — arabic numerals from page 1 (no ToC for short briefings)
// =====================================================================
#set page(numbering: "1")
#counter(page).update(1)

$body$

$for(include-after)$

$include-after$
$endfor$
