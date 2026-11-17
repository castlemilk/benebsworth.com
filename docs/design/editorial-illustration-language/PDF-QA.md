# Editorial illustration PDF review

Review date: 17 November 2026. This record covers the PDF artifact and its authoring source only. Repository gates, branch delivery, PR state, browser acceptance and release are recorded separately by the workstream owner.

## Deliverables

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `editorial-illustration-language.pdf` | 4,169,366 | `02d6881662b1f657132cbda7c650f25a6f0510f75c49b32bc5b8aa26ba062973` |
| `make_review_pdf.py` | 17,892 | `4ea9cb24727e1bc7fc38db28fac5808488ed5b2d825cb1f672d995cc20bfd336` |

The PDF contains eight A4 portrait pages. The initial artwork audit baseline is `e1c0f0a4c9ac4d7d189542e7c71abf274cc0977e`; this is not a claim about the current upstream head. It identifies branch `art/blog-editorial-illustration-language-20261117` without claiming a delivery commit, push, PR or release.

## Page review

Every page was rendered with Poppler at 120 dpi and visually inspected. The longest specimen caption received additional space above its footnote rule. Pages 2–4 were inspected again after that adjustment. The final eight renders are pixel-identical to the inspected pages.

| Page | Content | Observed result |
| --- | --- | --- |
| 1 | Direction, EL01 hero and three principles | Clear hierarchy; complete original canvas; no clipped text or image |
| 2 | EL01 light/dark, rationale and caption | Gap and shim readable; caption and footnote separated |
| 3 | EL02 light/dark, rationale and caption | Open spaces and rear surfaces distinguishable; caption legible |
| 4 | EL03 light/dark, rationale and caption | Continuous form and open arch readable; longest caption clears rule |
| 5 | Three vector counterparts, light/dark | All six previews visible; contours and accent remain legible |
| 6 | 320/160 source samples and scale/drawing rules | Sample distinction and table readable; no overflowing cells |
| 7 | Reusable six-part art-direction brief | Clear spacing between numbered decisions; no collisions |
| 8 | Provenance, measured margins and limitations | Metric table, source record and live Space/index links readable |

## Actual checks

- Two consecutive builds of the final source produced the identical PDF SHA-256 above. Font conversion retains the source timestamp; the PDF metadata records the review date without an invented time.
- The PDF uses binary Flate streams. A scoped `git diff --check` for these deliverables completed without errors; no shared Git attributes were changed.
- `pdfinfo` reports eight A4 pages, PDF 1.4, no encryption, no JavaScript and no forms.
- `pdffonts` reports only `BarlowCondensed-SemiBold` and `SourceSerif4Roman-Regular`, both embedded, subset and Unicode mapped. There is no unembedded fallback font resource.
- Source Serif 4 is instantiated at weight 400 and optical size 20 from the repository WOFF into a scratch TTF. Barlow Condensed SemiBold uses the repository TTF directly. Original font names and repository OFL notices are retained; repository font files are unmodified.
- `pypdf` extracted text from all eight pages, with 112, 142, 150, 144, 110, 196, 258 and 287 words respectively. No replacement-character or black-square placeholder was present. Required metrics, 320/160 rules and the initial baseline were found in extracted text.
- `pdfplumber` verified all text lies within the page bounds and the intended 54-point horizontal margins, allowing one point of numerical tolerance. The footer occupies its own lower area.
- All six r1/r2 raster original SHA-256 values match `manifest.json`. The build also checks its three r2 inputs before and after embedding. No original raster was resaved.
- The two PDF link annotations target the canonical design Space and workstream index URLs specified for this task.

## Limits preserved in the packet

The three concepts remain unrated assistant proposals. The r1 originals are retained and counted separately from the three r2 corrections. The 12% substantial-content floor is measured at alpha greater than 16/255; it is not a strict zero-alpha cutout claim. The packet reports faint residue and EL02's border alpha of 1/255. It distinguishes the raster review matte `#181c20` from the vector review matte `#11171b` and does not alter host tokens.

Scientific meaning, exact measurements, topology, anatomy and physical foldability are not established by these invented forms. Text, captions and evidence stay separate from the art. The PDF previews of the vector counterparts are raster images; the separately supplied SVG originals remain the editable path source. PDF zoom is not a calibrated CSS-pixel preview.

This is a selectable-text visual review PDF, not a tagged PDF/UA document. Poppler and programmatic text/font checks were run; a separate browser or application PDF viewer was not tested as part of this PDF subtask.

## Reproduction

Run from the repository root with the installed dependencies; keep converted fonts and rendered review pages outside the repository:

```sh
python3 docs/design/editorial-illustration-language/make_review_pdf.py --work-dir /workspace/scratch/39342a9c23f8/pdf-review
pdftoppm -r 120 -png docs/design/editorial-illustration-language/editorial-illustration-language.pdf /workspace/scratch/39342a9c23f8/pdf-review/page
pdfinfo docs/design/editorial-illustration-language/editorial-illustration-language.pdf
pdffonts docs/design/editorial-illustration-language/editorial-illustration-language.pdf
```

Actual environment: Python 3.12.14, ReportLab 4.4.9, Pillow 13.0.0, fontTools 4.61.1, pypdf 6.21.4, pdfplumber 0.11.9 and Poppler 26.05.0. No dependencies were installed for this PDF task.
