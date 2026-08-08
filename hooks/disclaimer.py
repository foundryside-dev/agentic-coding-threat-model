"""MkDocs hook: prepend the draft disclaimer to every page.

The draft status is also shown in the announcement bar
(overrides/main.html); this hook adds the collapsible disclaimer.
"""

DISCLAIMER = (
    '??? warning "Disclaimer"\n'
    "    This is a draft discussion paper circulated for peer review. It is "
    "independent work published in a personal capacity and does not "
    "constitute official guidance or policy of any government body. It does "
    "not mandate or recommend specific controls for any agency, system, or "
    "project. Views and analysis are the author's own.\n"
)


def on_page_markdown(markdown: str, page, **kwargs) -> str:
    return DISCLAIMER + "\n" + markdown
