---
title: 'The Memory Stack: Why AI Turned DRAM Into Strategy'
date: '2026-07-06T00:00:00.000Z'
description: >-
  Memory chips look like commodity parts until the whole computer has to wait
  for them. This is a tour of the memory ecosystem: the history, fabrication,
  architectures, HBM versus GDDR stacking, 2026 supply pressure, AI workloads,
  and the breakthroughs trying to move or shrink the bottleneck.
labels: 'hardware,semiconductors,memory,ai,systems'
release: true
author: Ben Ebsworth
takeaways:
  - >-
    Memory is not one market. SRAM, DRAM, HBM, GDDR, LPDDR, CXL memory, and NAND
    sit at different points on the same latency, bandwidth, capacity, cost, and
    power surface.
  - >-
    The DRAM market is structurally concentrated: TrendForce put Samsung, SK
    hynix, and Micron at about 90% of 1Q26 DRAM revenue, while NAND is broader
    but still led by a small supplier set.
  - >-
    Consumer GPUs use GDDR because it is cheap, board-friendly, and high-volume.
    Hyperscaler accelerators use HBM because short, wide links beat long PCB
    traces on bandwidth per watt.
  - >-
    AI inference made memory dynamic: quantized model weights can fit, then KV
    cache, batching, context length, and paging decide how many requests can
    run.
  - >-
    The future splits into two strategies: move memory closer with HBM4, custom
    base dies, CXL, and advanced packaging, or store less with FlashAttention,
    PagedAttention, MLA, and TurboQuant-style compression.
markdown_url: /blog/memory-chip-ecosystem/
canonical_url: 'https://benebsworth.com/blog/memory-chip-ecosystem/'
---
## Key takeaways

- Memory is not one market. SRAM, DRAM, HBM, GDDR, LPDDR, CXL memory, and NAND sit at different points on the same latency, bandwidth, capacity, cost, and power surface.
- The DRAM market is structurally concentrated: TrendForce put Samsung, SK hynix, and Micron at about 90% of 1Q26 DRAM revenue, while NAND is broader but still led by a small supplier set.
- Consumer GPUs use GDDR because it is cheap, board-friendly, and high-volume. Hyperscaler accelerators use HBM because short, wide links beat long PCB traces on bandwidth per watt.
- AI inference made memory dynamic: quantized model weights can fit, then KV cache, batching, context length, and paging decide how many requests can run.
- The future splits into two strategies: move memory closer with HBM4, custom base dies, CXL, and advanced packaging, or store less with FlashAttention, PagedAttention, MLA, and TurboQuant-style compression.

The most important chip in an AI server is not always the one doing the multiply. Sometimes it is the stack of DRAM beside it, the substrate under it, the SSD behind it, or the row of boring DIMMs feeding it. Compute gets the launch keynote, but memory decides what fits, what streams, what stalls, and what can be sold.

That is the useful way to look at memory chips: not as a bucket of interchangeable RAM, but as a ladder of compromises. Every rung stores bits. Every rung pays a different price in latency, bandwidth, capacity, energy, durability, yield, and packaging complexity. SRAM is absurdly fast and too large to use for bulk storage. DRAM is dense enough for working memory but forgets unless refreshed. NAND remembers without power but writes slowly and wears out. HBM is still DRAM, but stacked vertically and wired to a processor with a very wide, very short interface. GDDR is also DRAM, but spread around a consumer graphics card on a circuit board because cost and volume matter.

> [MemoryHierarchyChart component] Interactive component `MemoryHierarchyChart` — see the rendered post.

Use the chart above as the map for the whole post. Training cares about reusing tensors close to the GPU. Inference cares about serving many requests while the key-value cache grows. Retrieval cares about moving cold data out of NAND and into faster tiers before the user notices. Memory is a placement problem first and a component list second.

I am going to cover the whole ecosystem in one pass, but this is naturally a series:

- **History:** how memory moved from magnetic core to charge, then into vertical structures.
- **Fabrication:** how a memory die is made, why DRAM and NAND scale differently, and why HBM is as much packaging as silicon.
- **Architecture:** SRAM, DRAM, NAND, DDR, LPDDR, GDDR, HBM, CXL, and the real trade each one makes.
- **Usage and supply:** who makes memory, who buys it, why 2026 is tight, and why consumers feel a hyperscaler shortage.
- **AI workloads:** why HBM, KV cache, paging, and quantization determine throughput.
- **Future:** HBM4, custom HBM, stacked LPDDR, CXL, compute near memory, and software methods like TurboQuant.

## History: from loops of wire to cells of charge

Before semiconductor memory won, computers remembered with magnetic core: tiny ferrite rings threaded by wires. Core was robust and non-volatile, but it was hand-assembled physics. It could not keep riding the density curve computers needed. Robert Dennard's DRAM idea at IBM changed the shape of the problem: store a bit as charge on a capacitor, access it through a transistor, and refresh it before the charge leaks away. IBM's history of DRAM describes that shift from a six-transistor MOS memory cell toward the single-transistor-plus-capacitor idea that made DRAM cheap enough to displace core memory.

Intel's 1103 made the idea commercial. Intel says that by the end of 1971 the 1103 was the world's best-selling semiconductor device, and by 1972 most major mainframe makers were relying on it. That is the hinge point: memory stopped being an electromechanical craft and became a lithography product.

NAND took a different path. DRAM is working memory, optimized for fast random access. NAND is storage, optimized for dense non-volatile retention. For decades NAND scaled mostly by shrinking planar cells. Then planar scaling ran into interference and reliability limits. Samsung's 2013 V-NAND announcement marked the mainstream transition to vertical flash: stack layers upward, etch through them, and stop relying only on shrinking features sideways.

HBM is the newest chapter in that same pattern. When the memory wall gets too high, the industry changes geometry. HBM does not invent a new bit cell. It stacks DRAM dies and connects them with through-silicon vias, then places those stacks close to logic on an interposer or advanced package. The innovation is not "DRAM, but magically faster." It is "DRAM, but the wires are short, wide, parallel, and expensive."

## Fabrication: memory is built twice

A memory chip begins like other chips: grow or buy a silicon wafer, pattern it with lithography, etch and deposit materials, implant dopants, build transistors, add metal interconnect, test, dice, package, test again. But memory is not just logic with more arrays. It has its own process priorities.

DRAM is a density machine. The bit cell is a 1T-1C structure: one access transistor and one capacitor. Imec's DRAM overview is blunt about why that matters: the capacitor stores charge, the transistor gates access, and the rest of the chip has to sense, restore, decode, and move those tiny signals. The array wants extreme density. The periphery wants good analog sense amplifiers and reliable higher-voltage devices. The process has to serve both.

> [DramRefreshCell component] Interactive component `DramRefreshCell` — see the rendered post.

That leaking capacitor is the reason DRAM is "dynamic." Refresh is not a decorative background task. It is part of correctness. A row is opened, a tiny charge difference appears on the bit line, a sense amplifier decides whether the bit was a 0 or 1, and the row is restored. Reads disturb the value, so reads also become writes.

NAND fabrication is a different cathedral. In 3D NAND, layers of material are deposited like a stack of floors, then high-aspect-ratio channels are etched through them. The staircase structure exposes wordline contacts to each layer. Applied Materials describes the scaling challenge well: adding more layers helps density, but the stack gets taller, the etches get deeper, and filling narrow spaces cleanly becomes harder. Modern NAND scaling is as much about vertical etch, stress, bonding, and array-periphery placement as it is about nominal layer count.

HBM adds a second build after the die. A high-bandwidth stack needs DRAM dies thinned, aligned, bonded, connected by TSVs, underfilled, and thermally managed. SK hynix's MR-MUF packaging story is a good example of why packaging is now a performance technology: stacked DRAM makes heat paths longer and warpage harder, so the material between dies becomes part of bandwidth and yield. Then the HBM stack has to sit near compute. TSMC's CoWoS page describes the basic package idea: logic chiplets and HBM cubes integrated over a silicon or redistribution-layer interposer for high-density wiring.

In other words, memory is built twice: once as a die, then again as a system-level package. The second build used to feel like assembly. For AI accelerators, it is now one of the hard parts.

## Architecture: the same bit at different distances

SRAM, DRAM, and NAND store bits with different physics.

SRAM uses a small latch, often a six-transistor cell. It is fast because the bit is actively held as long as power is present. It is expensive in area, so it lives inside CPUs and GPUs as registers and cache.

DRAM uses charge on a capacitor. It is much denser than SRAM, but the charge leaks, so the array must refresh. It is the basis for DDR, LPDDR, GDDR, and HBM. Those names are not different storage physics. They are different interfaces, packages, power envelopes, and market bargains.

NAND stores charge in a floating gate or charge-trap structure and keeps it without power. It is slower and block-oriented, but it is dense and cheap. SSDs, phones, cameras, boot flash, and enterprise QLC drives are built on that trade.

The interface family tells you what the memory is being asked to do:

- **DDR5** is general-purpose main memory. The CPU wants capacity, commodity modules, and enough channels to feed many cores.
- **LPDDR** is power-optimized memory for phones, laptops, and increasingly server modules where capacity per watt matters.
- **GDDR** is board-level graphics memory. A GPU can place many packages around the processor, route a wide board bus, and buy bandwidth with pins and power.
- **HBM** is package-level DRAM. A stack has thousands of I/O connections close to logic, so it delivers enormous bandwidth per watt, but it consumes advanced packaging capacity.
- **CXL memory** is disaggregated or pooled expansion memory. It is not as close as DDR, but it gives servers another tier when local DRAM is too expensive or too small.

The bandwidth formula is simple:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{bandwidth} = \frac{\text{interface bits} \cdot \text{Gb/s per pin}}{8}
```

$$
\text{bandwidth} = \frac{\text{interface bits} \cdot \text{Gb/s per pin}}{8}
$$

That equation is why HBM works. JEDEC's HBM4 release describes a 2048-bit interface and speeds up to 8 Gb/s per pin, giving up to about 2 TB/s per stack. A consumer RTX 5090 uses 32 GB of GDDR7 on a 512-bit interface; NVIDIA's spec page lists the 512-bit bus and 32 GB configuration, while Micron's GDDR7 material describes 32 Gb/s-class devices and system bandwidth above 1.5 TB/s. Both are DRAM. One buys bandwidth by surrounding a GPU with many fast packages. The other buys bandwidth by stacking memory beside compute on an advanced package.

> [MemoryPackagingTradeoff component] Interactive component `MemoryPackagingTradeoff` — see the rendered post.

## The players: memory makers, package makers, and buyers

The DRAM supplier base is small because the entry fee is enormous. Leading-edge DRAM needs process technology, yield learning, cleanroom scale, packaging, controller ecosystem work, and years of customer qualification. TrendForce's 1Q26 DRAM survey put Samsung at 38.5% revenue share, SK hynix at 28.8%, and Micron at 22.4%. That is roughly 90% of the market in three companies.

NAND is still concentrated, but more plural. In 1Q26, TrendForce put Samsung first at 31.6%, SK hynix Group second at 17.6%, and Kioxia, Micron, and SanDisk each at 13.9%. YMTC, Nanya, Winbond, PSMC, and others matter in specific products and geographies, but they do not change the basic structure: buyers negotiate with a short list of suppliers.

> [MemoryMarketBars component] Interactive component `MemoryMarketBars` — see the rendered post.

The graph view below is a deliberately small first slice of the ecosystem. It does not pretend every commercial link is public. Instead it separates direct disclosures from inferred supply-chain paths, so a reader can traverse ASML to TSMC to NVIDIA to Azure without mistaking the whole path for one disclosed contract.

> [MemoryKnowledgeGraph component] Interactive component `MemoryKnowledgeGraph` — see the rendered post.

The rest of the ecosystem matters just as much:

- **Equipment:** ASML lithography, Applied Materials deposition and etch, Lam Research etch, Tokyo Electron tools, KLA inspection and metrology.
- **Foundry and packaging:** TSMC CoWoS, Samsung Foundry, OSATs, substrate makers, underfill and materials suppliers.
- **Controller and PHY IP:** memory controllers, HBM PHYs, CXL controllers, SSD controllers.
- **Accelerator buyers:** NVIDIA, AMD, Broadcom, Google, Amazon, Microsoft, Meta, and other hyperscalers designing or buying AI systems.
- **Module and system vendors:** DIMM makers, SSD makers, server OEMs, cloud integrators, and PC/gaming board partners.

The market is no longer just "how many bits can a fab make?" It is "which customer gets which qualified stack, on which package, in which quarter?"

## Consumer versus hyperscaler stacking

Consumer graphics cards are brutally cost-sensitive. They need high volume, replaceable boards, broad AIB manufacturing, manageable thermals, and a price gamers can eventually pay. GDDR fits that world. The memory chips sit around the GPU on the PCB. The bus is wide by board standards, narrow by HBM standards, and fast enough because GDDR7 runs high pin speeds with PAM3 signaling.

Hyperscaler accelerators optimize a different equation. A training or inference GPU is already expensive, power-hungry, and usually sold inside a validated server platform. The buyer cares about tokens per watt, model fit, rack throughput, and deployment schedule. HBM fits that world. A Blackwell-class GPU can pair multiple HBM3E stacks with a huge logic package, trading packaging cost for bandwidth, energy efficiency, and capacity close to compute. NVIDIA's Blackwell Ultra technical blog lists Hopper at up to 141 GB HBM3E on H200, Blackwell at 192 GB HBM3E, and Blackwell Ultra at 288 GB HBM3E, all with up to 8 TB/s class HBM bandwidth for the Blackwell generations.

That split explains why consumers can feel an AI memory shortage even when they are not buying HBM. DRAM wafer starts, engineering attention, packaging capacity, test capacity, and supplier allocation all move toward the highest-margin constrained products. The consumer part does not need to be physically identical to lose capacity priority.

## Supply and demand: the shortage is an allocation regime

The 2026 memory market is tight in a very specific way. It is not just that the world wants more bits. It wants the best bits in the hardest packages, while also wanting conventional DDR, LPDDR, GDDR, and NAND to remain cheap.

TrendForce's June 2026 DRAM report said 1Q26 conventional DRAM contract prices rose roughly 93% to 98% quarter over quarter, lifting industry revenue to $97 billion. It also said suppliers were prioritizing high-margin server applications and that 2026 bit output expansion would rely mainly on process migration because new cleanroom construction takes time. Its July 2026 pricing note then forecast further Q3 increases, but at a slower pace: 13% to 18% for conventional DRAM and 10% to 15% for NAND, as consumer customers hit affordability limits while AI server demand kept supply tight.

NAND has the same shape. TrendForce's May 2026 NAND report tied 1Q26 revenue growth to AI server infrastructure, enterprise SSD demand, QLC enterprise drives, and constrained supply. It also said major NAND suppliers would add virtually no new production capacity in 2026.

This is why the cycle feels strange. Normally, high prices invite supply. They still do, but memory capacity is slow, capital-heavy, and qualification-bound. HBM also consumes more than just wafer capacity. It needs known-good DRAM die, TSV processing, stack assembly, thermal packaging, interposer capacity, substrate capacity, and customer qualification beside a specific accelerator. A wafer start today is not a validated HBM stack tomorrow.

## AI workloads: memory is the batch size

Training and inference stress memory differently.

Training keeps weights, activations, gradients, optimizer state, communication buffers, and temporary attention matrices in play. The work is compute-heavy, but the fast path is still shaped by movement between HBM and on-chip SRAM. FlashAttention became important because it treated attention as an I/O problem: tile the computation so less intermediate data is written to and read back from HBM.

Inference starts with a different bargain. A quantized model may fit comfortably. Then requests arrive. Each request stores a key and value vector for each token, layer, and KV head. That KV cache grows with context and batch size:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\text{bytes} = 2 \cdot L \cdot H_{kv} \cdot d \cdot T \cdot B \cdot b
```

$$
\text{bytes} = 2 \cdot L \cdot H_{kv} \cdot d \cdot T \cdot B \cdot b
$$

> [AiMemorySizer component] Interactive component `AiMemorySizer` — see the rendered post.

That is why serving systems obsess over paging and scheduling. PagedAttention and vLLM borrowed a virtual-memory idea: store KV cache in blocks instead of requiring every request to own one contiguous slab. The paper reports near-zero KV waste and 2x to 4x throughput improvement over prior systems at comparable latency. That kind of result is not a model-quality breakthrough. It is a memory-management breakthrough.

This is also where software and memory architecture meet. Grouped-query attention reduces the number of KV heads. Multi-head latent attention compresses what gets stored. TurboQuant attacks precision: its paper reports quality-neutral KV cache quantization at 3.5 bits per channel and marginal degradation at 2.5 bits. These methods do not make HBM irrelevant. They make a fixed amount of HBM serve more tokens.

## Future: move memory closer, or store less

The future of memory for AI is not one breakthrough. It is two families of pressure relief.

The first family moves memory closer:

- **HBM4 and HBM4E:** JEDEC's HBM4 standard doubles the stack interface to 2048 bits. Samsung says its HBM4 reaches 11.7 Gb/s in production tests, with up to 3.3 TB/s per stack, and its HBM4E samples scale to 16 Gb/s and up to 3.6 TB/s per stack. SK hynix says its HBM4 doubles bandwidth versus the previous generation and improves power efficiency by more than 40%.
- **Custom HBM:** base dies stop being generic plumbing and start being customer-specific logic, power, test, and controller surfaces for GPU and ASIC vendors.
- **Advanced packaging:** CoWoS-class interposers, RDL interposers, embedded bridges, hybrid bonding, and better thermal materials decide how many stacks can sit around a compute die.
- **CXL and pooled memory:** slower than local DDR, but useful for capacity expansion, memory tiering, and stranded-memory reduction across servers.
- **Near-memory and in-memory compute:** attractive for bandwidth-bound kernels, but difficult because memory process, logic process, programmability, and yield all pull in different directions.

The second family stores less:

- **Lower precision:** FP8, FP4, INT4 weights, and quantized KV cache reduce bytes moved per token.
- **Better attention I/O:** FlashAttention-like kernels keep data in SRAM long enough to avoid unnecessary HBM traffic.
- **Paged serving:** vLLM-style cache paging turns capacity fragmentation into a schedulable problem.
- **Architectural compression:** grouped-query attention, multi-query attention, and latent attention reduce the cache shape.
- **Eviction and retrieval:** not every token remains equally useful forever, but forgetting safely is workload-dependent.

The important pattern is that every "memory breakthrough" chooses one of two verbs: **move** or **shrink**. Move the bytes closer to compute, or shrink the bytes so the existing path carries more useful work. HBM4, custom base dies, and CoWoS are move strategies. FlashAttention, PagedAttention, MLA, and TurboQuant are shrink strategies.

The mistake is thinking one replaces the other. The history of memory says the opposite. Every time the industry gets a denser cell or a wider package, software learns how to spend it. Every time software compresses or schedules better, models grow until the bottleneck returns. Memory is not behind compute. It is the thing compute keeps catching up to.

## Where I would split the series

If this becomes a series, I would split it like this:

1. **The history of memory:** core, DRAM, SRAM, NAND, 3D NAND, HBM.
2. **How a memory chip is made:** DRAM cells, NAND strings, TSV stacks, yield, test, packaging.
3. **Architectures and interfaces:** DDR, LPDDR, GDDR, HBM, CXL, SSDs, and why each exists.
4. **The 2026 memory economy:** market shares, allocation, hyperscalers, consumers, and the next shortage.
5. **AI's memory problem:** HBM, SRAM, KV cache, paging, batching, FlashAttention, and TurboQuant.
6. **Future memory:** HBM4/E, custom HBM, stacked LPDDR, near-memory compute, CXL pools, and persistent memory ideas.

For now, the map is enough: memory is the computer's geography. AI did not create the memory wall. It just built a city right up against it.

## Reading further

- [IBM, "Dynamic random-access memory (DRAM)"](https://www.ibm.com/history/dram): the Dennard story and why the 1T capacitor idea beat magnetic core memory.
- [Intel, "The Intel 1103 DRAM"](https://timeline.intel.com/1970/the-intel-1103-dram): the commercial arrival of DRAM as a mass semiconductor product.
- [Samsung, "Samsung Starts Mass Producing Industry's First 3D Vertical NAND Flash"](https://news.samsung.com/global/samsung-starts-mass-producing-industrys-first-3d-vertical-nand-flash): the 2013 V-NAND transition from planar to vertical flash.
- [Imec, "A technology platform for thermally stable DRAM peripheral transistors"](https://www.imec-int.com/en/articles/technology-platform-thermally-stable-dram-peripheral-transistors): DRAM cells, sense amps, row decoders, and process constraints.
- [Applied Materials, "3D NAND"](https://www.appliedmaterials.com/us/en/semiconductor/markets-and-inflections/memory/3d-nand.html): staircase, vertical scaling, and 3D NAND process constraints.
- [ASML, "2025 Annual Report: Financials"](https://www.asml.com/en/investors/annual-report/2025/financials): EUV, DUV, logic, DRAM, HBM, and DDR5 demand as upstream equipment signals.
- [TSMC, "CoWoS"](https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm): package-level integration of logic chiplets and HBM cubes.
- [SK hynix, "MR-MUF Unlocks HBM Heat Control"](https://news.skhynix.com/rulebreaker-revolutions-mr-muf-unlocks-hbm-heat-control/): why HBM thermal materials and underfill matter.
- [JEDEC, "JESD270-4 HBM4 Standard"](https://www.businesswire.com/news/home/20250416843598/en/JEDEC-and-Industry-Leaders-Collaborate-to-Release-JESD270-4-HBM4-Standard-Advancing-Bandwidth-Efficiency-and-Capacity-for-AI-and-HPC): the HBM4 standard, 2048-bit interface, and up to 2 TB/s per stack baseline.
- [NVIDIA, "Inside NVIDIA Blackwell Ultra"](https://developer.nvidia.com/blog/inside-nvidia-blackwell-ultra-the-chip-powering-the-ai-factory-era/): Hopper, Blackwell, and Blackwell Ultra HBM capacity and bandwidth comparison.
- [NVIDIA, "Fourth Quarter and Fiscal 2026 Results"](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026): accelerator revenue, data center revenue, and cloud deployment context.
- [Micron, "HBM3E"](https://www.micron.com/products/memory/hbm/hbm3e): HBM3E capacities, bandwidth, and AI positioning.
- [Micron, "GDDR7"](https://www.micron.com/about/blog/memory/dram/unveiling-the-next-generation-of-graphics-memory-gddr7): GDDR7 pin rates, PAM3, and consumer/edge AI use cases.
- [Alphabet, "2026 Q1 Earnings Call"](https://abc.xyz/investor/events/event-details/2026/2026-Q1-Earnings-Call-2026-nW8kCrBAKS/default.aspx): AI infrastructure capex, Google Cloud demand, and NVIDIA GPU/TPU portfolio context.
- [Microsoft, "FY2026 Q3 Earnings Call"](https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q3): Azure AI/cloud capex and GPU/CPU spend mix.
- [Meta, "First Quarter 2026 Results"](https://investor.atmeta.com/investor-news/press-release-details/2026/Meta-Reports-First-Quarter-2026-Results/default.aspx): AI infrastructure capex guidance and component pricing pressure.
- [Amazon, "2025 Annual Report"](https://s2.q4cdn.com/299287126/files/doc_financials/2026/ar/Amazon-2025-Annual-Report.pdf): AWS AI capex, customer commitments, Trainium, and NVIDIA partnership context.
- [TrendForce, "Rapid Contract Price Surge Drives 1Q26 DRAM Industry Up 81% QoQ"](https://www.trendforce.com/presscenter/news/20260601-13070.html): current DRAM revenue shares, pricing, and server allocation.
- [TrendForce, "Combined Revenue of Top Five Global NAND Flash Suppliers Rose by 83.7% QoQ"](https://www.trendforce.com/presscenter/news/20260525-13058.html): current NAND revenue shares and enterprise SSD demand.
- [TrendForce, "AI Server Demand Continues to Support Memory Prices in 3Q26"](https://www.trendforce.com/presscenter/news/20260703-13134.html): the July 2026 pricing outlook for DRAM and NAND.
- [FlashAttention](https://arxiv.org/abs/2205.14135): attention as an I/O-aware memory algorithm.
- [PagedAttention and vLLM](https://arxiv.org/abs/2309.06180): KV cache paging for high-throughput LLM serving.
- [TurboQuant](https://arxiv.org/abs/2504.19874): vector quantization and KV cache compression at very low bit rates.
