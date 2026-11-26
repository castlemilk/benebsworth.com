# Chapter-engine review drafts

Two reading companions built from the pinned MLSys chapters on model compression and hardware acceleration. The saved outlines contain Sol 6.2’s explanatory cores and source coverage. Terra 6.1 expanded them and Luna reviewed the assembled chapters. The final copy includes the browser review edits.

The [full Astra 6.2 comparison](astra/comparison.md) includes both alternative chapters, the reader-facing diffs and token usage broken down by role.

| Chapter | Guided sections | Guided prose words | Self-test questions | Tokens on accepted generation path | Live tokens across trials |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Model Compression](10-model-compression/packet/packet.md) | 9 | 3,061 | 9 | 173,820 | 252,960 |
| [Hardware Acceleration](11-hw-acceleration/packet/packet.md) | 10 | 3,638 | 10 | 182,327 | 255,697 |

Guided prose counts omit headings, figure markers, gloss explanations and reference material. The accepted path counts original input and output tokens once for each required model call, including a reply later served from cache. Live trial usage also includes superseded drafts and reviews. These figures cover the content-generation commands. Each final browser correction replayed with zero new model calls.

To reproduce a draft, pass its saved `outline.json` and matching chapter spec to the [chapter command](../../scripts/study-engine/README.md). Each folder contains the planner receipt, the final replay receipt and a native packet suitable for the [isolated reader preview](../../scripts/study-engine/preview.mjs).
