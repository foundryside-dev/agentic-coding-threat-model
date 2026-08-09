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
$if(description)$
  pdf-description: "$description$",
$endif$
$if(running-title)$
  running-title: [$running-title$],
$endif$
$if(version)$
  running-version: [$version$],
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

  #v(2.2cm)

  #text(size: 9pt, weight: "bold", tracking: 0.12em, fill: rgb("#2D7371"))[
    $if(document-type)$$document-type$$else$BRIEFING$endif$
  ]

  #v(1.1cm)

  #set text(hyphenate: false)
  #set par(justify: false)
  #heading(level: 1, outlined: false)[$if(title)$$title$$endif$]

  #v(0.5cm)

  $if(subtitle)$
  #text(size: 15pt, fill: rgb("#56616E"))[$subtitle$]

  #v(0.8cm)
  $endif$

  #line(length: 7cm, stroke: 2pt + rgb("#315C87"))

  #v(1.1cm)

  #block(fill: rgb("#EAF1F5"), radius: 4pt, inset: 14pt, width: 100%)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 14pt,
      row-gutter: 7pt,
      [*Version*], [$if(version)$$version$$endif$],
      [*Date*], [$if(date)$$date$$endif$],
      [*Author*], [$if(author)$$author$$endif$],
      $if(parent-paper)$
      [*Related work*], [#text(size: 10pt)[$parent-paper$]],
      $endif$
    )
  ]

  #v(1fr)

  #block(stroke: (left: 3pt + rgb("#2D7371")), inset: (left: 12pt, y: 7pt), width: 100%)[
    #text(size: 9pt, fill: rgb("#56616E"))[
      $if(disclaimer)$$disclaimer$$else$This is a discussion paper. It presents a threat model and preliminary analysis, not final guidance. Comments and contributions are welcome.$endif$
    ]
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
