# LexTyp Examples

Example projects that demonstrate what LexTyp can do.

## Citation demo (citation format-free)

A short paper on legal positivism that showcases the headline feature:
**cite once, pick any style**. Drop `@key` tags into your prose while you
write, then flip the sidebar dropdown between OSCOLA, Harvard, APA, Chicago,
IEEE or Plain — every footnote and in-text citation re-renders instantly.

- Open in LexTyp: `citation-demo.lextyp`
- Rendered output: `example.pdf`
- Source bibliography: `citation-demo/references.bib`
- More details: `citation-demo/README.md`

## Rebuilding the example

The `.lextyp` file is generated from the sources in `citation-demo/`
(plus a hand-written document body in the builder script):

```
python3 build_demo.py
```

The output is always at `citation-demo.lextyp`. `build_demo.py` is the
canonical way to update the demo — edit the document body there and
re-run.
