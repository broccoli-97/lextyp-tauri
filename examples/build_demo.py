#!/usr/bin/env python3
"""Build examples/citation-demo.lextyp from the source files in citation-demo/."""
import json
import os
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEMO = ROOT / "citation-demo"
BIB_PATH = DEMO / "references.bib"
OUT = ROOT / "citation-demo.lextyp"


def block_id():
    return str(uuid.uuid4())


def text(s, styles=None):
    return {"type": "text", "text": s, "styles": styles or {}}


def citation(key):
    return {"type": "citation", "props": {"key": key}, "content": []}


def heading(level, inline):
    return {
        "id": block_id(),
        "type": "heading",
        "props": {
            "backgroundColor": "default",
            "textColor": "default",
            "textAlignment": "left",
            "level": level,
            "isToggleable": False,
        },
        "content": inline if isinstance(inline, list) else [text(inline)],
        "children": [],
    }


def paragraph(inline):
    return {
        "id": block_id(),
        "type": "paragraph",
        "props": {
            "backgroundColor": "default",
            "textColor": "default",
            "textAlignment": "left",
        },
        "content": inline if isinstance(inline, list) else [text(inline)],
        "children": [],
    }


def bullet(inline):
    return {
        "id": block_id(),
        "type": "bulletListItem",
        "props": {
            "backgroundColor": "default",
            "textColor": "default",
            "textAlignment": "left",
        },
        "content": inline if isinstance(inline, list) else [text(inline)],
        "children": [],
    }


def toc():
    return {
        "id": block_id(),
        "type": "tableOfContents",
        "props": {},
        "content": [],
        "children": [],
    }


# ---------------------------------------------------------------------------
# Document body
# ---------------------------------------------------------------------------
doc = [
    heading(1, "Legal Positivism: A Short Survey"),

    paragraph([
        text("This brief survey examines the central disputes in twentieth-century "
             "legal positivism — from Hart's foundational restatement "),
        citation("hart1961"),
        text(" through Fuller's procedural counter-argument "),
        citation("fuller1958"),
        text(" to Dworkin's interpretivist alternative. "),
        text("Switch the citation style from the sidebar to see the same "
             "references re-render in OSCOLA, Harvard, APA, Chicago, or IEEE — "
             "no manual edits required.", {"italic": True}),
    ]),

    toc(),

    heading(2, "Introduction"),
    paragraph([
        text("Modern legal positivism is often traced to Hart's "),
        text("The Concept of Law", {"italic": True}),
        text(", which reframed law as a union of primary and secondary rules "),
        citation("hart1961"),
        text(". Fuller's "),
        text("immediate", {"bold": True}),
        text(" and influential reply argued that law's "),
        text("inner morality", {"italic": True}),
        text(" could not be separated from its rule-structure "),
        citation("fuller1958"),
        text("."),
    ]),

    heading(2, "The Separation Thesis"),
    paragraph([
        text("At the heart of positivism is the thesis that the existence of "
             "a law is one question and its merit another. Raz's reformulation "
             "of the sources thesis tightened this core claim "),
        citation("raz1972"),
        text(", arguing that a legal system's authority derives from its sources, "
             "not its content."),
    ]),

    paragraph([
        text("Three consequences typically follow from the separation thesis:"),
    ]),
    bullet([
        text("Legal validity can be identified without moral evaluation "),
        citation("hart1961"),
        text("."),
    ]),
    bullet([
        text("Judicial discretion operates in the open texture left by rules, "
             "not in their application "),
        citation("raz1972"),
        text("."),
    ]),
    bullet([
        text("Fidelity to law is distinct from fidelity to justice "),
        citation("fuller1958"),
        text("."),
    ]),

    heading(2, "Critics from Within and Without"),

    heading(3, "Dworkin's Interpretivism"),
    paragraph([
        text("Dworkin's "),
        text("Law's Empire", {"italic": True}),
        text(" rejected the rule-based picture altogether, arguing that "
             "adjudication is an interpretive practice guided by principles "
             "embedded in the community's legal history "),
        citation("dworkin1986"),
        text("."),
    ]),

    heading(3, "Natural Law Responses"),
    paragraph([
        text("Finnis, writing from the natural-law tradition, offered a different "
             "challenge — one that accepts much of the positivist description of "
             "legal systems while denying its normative implications "),
        citation("finnis1980"),
        text("."),
    ]),

    heading(2, "Beyond Theory: Applications"),
    paragraph([
        text("These debates are not purely academic. The foundational negligence "
             "decision in "),
        text("Donoghue v Stevenson", {"italic": True}),
        text(" "),
        citation("donoghue1932"),
        text(" illustrates how courts, whatever their background theory, must "
             "articulate duties that are recognisably legal. More recently, "
             "human-rights legislation such as the "),
        text("Human Rights Act 1998", {"italic": True}),
        text(" "),
        citation("humanrights1998"),
        text(" has forced English courts to operate at the boundary Hart and "
             "Fuller disputed."),
    ]),

    heading(2, "Contemporary Directions"),
    paragraph([
        text("Recent work has pushed the debate into computational and empirical "
             "territory "),
        citation("chen2019"),
        text(", and into systematic re-examinations of positivism for a new "
             "century "),
        citation("smith2020"),
        text("."),
    ]),

    heading(2, "Conclusion"),
    paragraph([
        text("The positivism debate remains the terrain on which most other "
             "questions of legal philosophy are contested. What this short survey "
             "illustrates — beyond its arguments — is how LexTyp lets you write "
             "without thinking about citation formatting: cite with "),
        text("@key", {"code": True}),
        text(", switch styles from the sidebar, and let the compiler produce a "
             "publication-ready PDF."),
    ]),
]

# ---------------------------------------------------------------------------
# Write outputs
# ---------------------------------------------------------------------------
now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
meta = {
    "title": "Legal Positivism — A Short Survey",
    "citation_style": "oscola",
    "created_at": now,
    "modified_at": now,
}

bib = BIB_PATH.read_text(encoding="utf-8")

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("meta.json", json.dumps(meta))
    z.writestr("document.json", json.dumps(doc, indent=2))
    z.writestr("references.bib", bib)

print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
print(f"Blocks: {len(doc)}")
print(f"Citations: {sum(1 for b in doc for c in b.get('content', []) if c.get('type') == 'citation')}")
