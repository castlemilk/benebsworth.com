/** Illustrative review copy only: not a published post or measured result. */
export const technicalProseFixture = `
## Technical prose and source links

This is a **layout specimen**, not a scientific result. Read the *structure* and keep the exact source destination intact.[^review-scope]

### Follow the reasoning

1. Read the heading and the example.
   - Check the nested list at the current column width.
   - Keep a long inline identifier readable: \`illustrative_configuration_for_a_deliberately_long_local_scroll_regression_example\`.
2. Move to the code and table using the keyboard.

#### A smaller heading still belongs to the argument

> A quotation stays selectable and follows the same reading measure. This sentence is illustrative review copy, not an attributed quotation.

The source URL is intentionally long: [https://github.com/remarkjs/remark-gfm#this-deliberately-long-fragment-tests-visible-link-wrapping-without-changing-the-source-destination](https://github.com/remarkjs/remark-gfm#this-deliberately-long-fragment-tests-visible-link-wrapping-without-changing-the-source-destination).

### Code keeps its line intact

The horizontal scroll region preserves the entire example; no copy control is implied.

\`\`\`ts
const specimen = { label: "Illustrative configuration only", description: "A deliberately long code line checks local horizontal scrolling without forcing the whole reading surface to become wider than its container." };
console.log(specimen.label);
\`\`\`

### A table keeps its headers

The labels below describe review states, not measured values.

| Specimen | Full reading column | Narrow reading column | Light surface | Dark surface | Keyboard inspection |
| --- | --- | --- | --- | --- | --- |
| Code example | Preserve complete lines | Scroll within the code region | Keep syntax paired with its background | Keep syntax paired with its background | Focus and scroll the region |
| Source destination | Keep the original href | Wrap the visible label | Underline remains visible | Underline remains visible | Follow the source link |

<GithubLink url="https://github.com/remarkjs/remark-gfm" />

---

[^review-scope]: This fixture exercises the production GFM footnote and backlink pipeline. It is not an article, measurement or research citation.
`;
