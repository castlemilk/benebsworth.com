# Astra 6.2 chapter comparison

Astra gave the reader more room to work through decisions. Across two chapters it added 2,111 words of guided teaching, used 54,346 more tokens, and produced one fewer figure, inline explainer and self-test question. Hardware Acceleration makes the best use of the extra space. Model Compression has a stronger running example, while the mixed draft makes several numerical trade-offs easier to see at a glance.

## Read the differences

| Chapter | Mixed draft | Astra draft | Unified diff of the teaching text, quiz and figure captions |
| --- | --- | --- | --- |
| Model Compression | [Mixed packet](../10-model-compression/packet/packet.md) | [Astra packet](10-model-compression/packet/packet.md) | [Compression diff](10-model-compression/reader.diff) |
| Hardware Acceleration | [Mixed packet](../11-hw-acceleration/packet/packet.md) | [Astra packet](11-hw-acceleration/packet/packet.md) | [Hardware diff](11-hw-acceleration/reader.diff) |

| Chapter and workflow | Guided words | Guided sections | Bar charts / flows | Inline explainers | Questions | Accepted-path tokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Compression · mixed | 3,061 | 9 | 4 / 5 | 9 | 9 | 173,820 |
| Compression · Astra | 3,986 | 8 | 2 / 6 | 8 | 8 | 189,716 |
| Hardware · mixed | 3,638 | 10 | 2 / 8 | 10 | 10 | 182,327 |
| Hardware · Astra | 4,824 | 10 | 3 / 7 | 10 | 10 | 220,777 |

**Compression.** Astra follows a parcel sorter from a missed deadline to a release decision. The reader sees why two misroutes among 50 early exits become two failures among 100 creased labels and breach a 1% limit. The same difficult inputs return during quantization and acceptance. The mixed draft splits precision choice from quantization error. Its charts show a 20 ms weight read falling to 11.25 ms after metadata, and total tensor traffic falling from 24 MiB to 8 MiB after fusion. Astra gives rounding and folding more explanation, but readers lose both quantitative charts. Eight highlights across nearly 4,000 words also leave longer stretches between explainers. [Mixed figures](../10-model-compression/packet/diagrams.json) · [Astra figures](10-model-compression/packet/diagrams.json)

**Hardware.** The mixed roofline chart makes an upgrade decision visible. Doubling compute leaves the example at 4 TFLOP/s, while doubling bandwidth raises the ceiling to 8. Astra instead compares compute and transfer time floors, then gives the reader a new gather kernel that takes 20 ms despite a 4 ms bandwidth estimate. Its answer asks the reader to interleave independent chains and predict what happens to outstanding reads, delivered bandwidth and elapsed time. Astra also adds an energy chart where the higher-power server uses fewer joules per accepted result. The mixed procurement example retains a useful separate calculation of dollars per million requests. [Mixed hardware quiz](../11-hw-acceleration/packet/quiz.md) · [Astra hardware quiz](11-hw-acceleration/packet/quiz.md)

**Review.** Astra caught a quiz that proposed fusing a stage with a consumer the question had never named. The final question gives the normalization and decision kernels, their dependency and their combined duration. In hardware, the first draft counted traffic across two kernels but stopped the timing window after one. The correction aligns the byte count with the measured interval. Both Astra theses still repeat the opening question already displayed by the reader. [Compression review](10-model-compression/run.json) · [Hardware review](11-hw-acceleration/run.json)

## Where the tokens went

| Stage across both chapters | Mixed | Astra | Difference |
| --- | ---: | ---: | ---: |
| Architecture | 60,280 | 57,174 | −3,106 |
| Section writing | 172,050 | 173,511 | +1,461 |
| Repairs | 26,757 | 34,633 | +7,876 |
| Whole-chapter review | 97,060 | 145,175 | +48,115 |
| **Total** | **356,147** | **410,493** | **+54,346** |

Astra made 17 live calls. Each chapter needed a repair and a second full review. Planning and writing together used 1,645 fewer tokens than the mixed run. Most of the additional usage went into rereading whole chapters. Across the two workflows, tokens per guided word fell from 53.2 to 46.6. The subscription receipts give token counts only. A monetary comparison requires model-specific rates.

## How to use the result

I would use Astra’s hardware chapter as the reference for diagnosis questions. For compression, I would pair Astra’s running case with the mixed draft’s precision and fusion charts. For the engine, the next cost experiment is to keep the first whole-chapter review, then give the reviewer the corrected question or section, the affected figure, the source excerpt and the previous finding. Compare that focused check with a full reread on the same repair before making it the default.

One figure brief could improve immediately. Astra’s quantization figure lists four steps, but a reader needs the adjacent prose to see a faint signal disappear. The two worked encodings of 0.04, one reconstructed as 0 and the other as 0.04, would make a stronger figure. The hardware roofline chart already does this well. Its two labelled bars put the 0.4 ms and 4 ms bounds side by side.

Both workflows covered all seven required source headings in compression and all twelve in hardware. They used the same source and spec fingerprints, opening decisions, seeds, compiler and role efforts. The mixed run used Sol 6.2 for architecture, Terra 6.1 for writing and repairs, and Luna for review. Astra 6.2 performed every role in fresh invocations. The saved mixed outlines predate difficulty-based word targets and the revised extraction of source subheadings. This measures the two resulting workflows together. Learner retention was not tested.

Guided word counts exclude headings, figure markers, popover explanations, reference material and answers. Accepted-path totals count input plus output once per required call, including an original reply later served from local cache. Provider-cached input is included once. Historical development trials and editorial time are outside the table. [Mixed receipts and trial totals](../README.md) · [Reproduction commands](../../../scripts/study-engine/README.md)

All four packets passed the native reader checks on desktop and phone in light and dark themes. The checks exercised the contents, each figure and highlighted explainer, answer reveals, scoring and reset. Both Astra packets reproduced byte-for-byte with zero live calls. The Markdown exports kept every guided section and both flashcard downloads contained the expected cards. Independent arithmetic confirmed both transfer answers. The added buffer brings compression to 52 MiB against 48 MiB of capacity, and the narrower tile uses 88 KiB with 8 KiB remaining.
