---
title: "Data Storage — ML Systems study packet"
source: "Machine Learning Systems, Vijay Janapa Reddi (Harvard CS249r), CC-BY-NC-SA 4.0"
book_url: "https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html"
canonical_url: "https://benebsworth.com/study/vol2/04-data-storage/"
---

# Data Storage: Study Packet

A 175B training run reads a 6 TB tokenized corpus all epoch, yet the storage system is provisioned and priced for petabytes. What generates the other ~10.6 PB of traffic, and why does it arrive as a burst every ten minutes?

*Working through [Data Storage](https://mlsysbook.ai/books/vol2/04_data_storage/04_data_storage.html), chapter 4 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The dataset is not the load — the checkpoint is.** The fleet reads a 6 TB corpus once across the epoch but writes a 2,450 GB resumable state every ten minutes: 4,320 saves, ~10.6 PB, more than a thousand times the training-read volume. An engine without fuel is expensive sculpture, and the fuel line runs both directions: **the dominant traffic is the state training produces, not the data it consumes** *(why it matters: The resumable Adam contract (FP16 weights at 2 B/param, FP32 master at 4, two FP32 moments at 4+4) is 14 bytes per parameter, 2,450 GB for 175B. Every ten minutes on the 30-day window. The epoch's 6 TB of reads is a rounding error against ~10.6 PB of writes.)*. The tiered hierarchy exists because no single device is fast, capacious, and cheap at once, and the pipeline equation exists because a tier is only as good as its delivery rate at the moment the batch is due.

> **note: How to read this packet**
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Fuel Line

The running example doubles the book's usual cluster: 256 eight-GPU nodes, **2,048 accelerators** *(why it matters: Deliberately twice the 1,024-GPU reference cluster, because shared-storage pressure is easier to see at larger fleet scale. The 175B job runs as 32 replicas of 64 GPUs each (TP8 × PP8), a global batch of 1,536 sequences, 3,145,728 tokens per step, modeled at ~4.64 s, so one epoch ≈ 25.6 days inside a 30-day window.)*, training a 175B model on a corpus that is ~3 TB compressed and ~6 TB as 4-byte token IDs. The corpus is the small end of the story.

The bandwidth ladder starts with a ratio: H100 HBM moves data at **3.35 TB/s against ~7 GB/s for one NVMe drive** *(why it matters: A ~479× gap between the fastest and slowest tiers a byte visits. The ratio contrasts tiers, not required feed rate: HBM bandwidth also carries weight, activation, and tensor traffic, so the feed requirement comes from input-batch bytes per step time, not the nameplate.)*, roughly 479×. Every tier between them exists to hide that gap at a price.

![Six tiers, one gap to hide](https://benebsworth.com/study/vol2/04-data-storage/diagrams/tier-ladder.svg)

*The storage hierarchy as a ladder from T0 GPU HBM (3.35 TB/s, per accelerator) down to T5 archive (offline media, shared service). Each rung trades bandwidth for capacity and shared scope: the ~479x gap between the top and the first drive is why every rung below exists — no single tier is fast, capacious, and cheap at once.*
Then the write side arrives. The chapter's checkpoint contract is **14 bytes per parameter** *(why it matters: Resumable mixed-precision Adam: FP16 weights (2 B) + FP32 master weights (4 B) + two FP32 Adam moments (8 B). Gradients are recomputed on restore and excluded.)*, so one save is 2,450 GB, and at ten-minute intervals the 30-day window produces **4,320 checkpoints ≈ 10.6 PB** *(why it matters: Over a thousand times the epoch's 6 TB read volume. Serving compounds it differently: pushing 350 GB of FP16 weights to 100 replicas moves 35 TB in one fan-out.)*. Procurement that sizes for the corpus misses the actual workload by three orders of magnitude.


**Reads are the rounding error**

| Traffic class | TB moved over the run |
|---|---|
| corpus epoch read | 6 |
| rollout fan-out (100 replicas) | 35 |
| checkpoint writes (4,320 saves) | 10600 |

*Traffic moved over the 30-day run, three classes against each other. The 6 TB corpus is read once; the serving rollout fans 35 TB to 100 replicas; the checkpoint contract writes ~10.6 PB across 4,320 saves — over 1,000x the epoch read. Storage for this workload is a write system with a read side, not the reverse.*

## The Workload Inversion

Database storage was built for **small random accesses with strong consistency** *(why it matters: 4 KB reads, IOPS-rated drives, write-ahead logs, RAID redundancy. Full-corpus pretraining inverts each: megabyte-scale sequential scans through immutable sharded shards, sampled once per epoch in shuffle order.)*, and ML inverts the stack:

- **Sequential, not random.** A Gen4/Gen5 NVMe streams 7-14 GB/s sequentially but falls to **~0.5 GB/s on 4 KB random reads** *(why it matters: A 10-30× penalty per access pattern; spinning disks lose ~100× to seek time. A 4 TB token corpus read as random elements would take hundreds to thousands of hours; streamed as shards, about ten minutes.)*,
- **Shuffled, but not truly random.** SGD needs near-uniform batches, but global shuffling destroys sequential I/O. The compromise is **shard-order shuffle plus within-shard buffer mixing** *(why it matters: Preserves sequential reads; mixing quality depends on shard composition and buffer size, which becomes a validation step, not a constant.)*,
- **Immutable reads, bursty writes.** Training shards avoid read-write conflicts, but checkpoint publication and feature updates still need explicit consistency guarantees.

The result is the **I/O wall**: when delivery cannot keep pace, faster compute just idles sooner. The normalized example is stark: if input delivery is a quarter of compute time and overlaps perfectly, **a 16× faster accelerator buys only 4× batch throughput** *(why it matters: Doubling compute halves batch time; quadrupling makes compute and delivery equal; beyond that the pipeline is delivery-bound and compute speed stops mattering. Prefetching hides latency, not a sustained rate deficit.)*.

## The Storage Hierarchy

Six tiers, ordered by distance from the accelerator, each trading **bandwidth for capacity and shared scope** *(why it matters: Tier 0 GPU HBM (per accelerator), Tier 1 host DRAM, Tier 2 local NVMe (per node), Tier 3 parallel file system, Tier 4 object storage, Tier 5 archive (shared services). Blue tiers are bought per GB; green tiers rented per GB-month; archive is offline media.)*:

| Tier | Holds | Bandwidth character | Scope |
|---|---|---|---|
| 0 · GPU HBM | resident weights + batch | 3.35 TB/s | one accelerator |
| 1 · host DRAM | prefetch buffers, loader pipeline | ~100s GB/s, lower first-byte latency than HBM | one node |
| 2 · local NVMe | staged corpus, warm checkpoint | ~7 GB/s/drive; RAID-0 ×4 ≈ 7× the node's PFS share | one node |
| 3 · parallel FS | durable checkpoint, shared corpus | striped; metadata on a separate path | shared service |
| 4 · object | dataset of record, retention | capacity-priced, egress-taxed | shared service |
| 5 · archive | cold versions | offline media | shared service |

Two subtleties worth keeping: **HBM is not the lowest-latency tier** *(why it matters: Host DRAM reaches first byte sooner than HBM; HBM wins on sustained bandwidth, not latency. And local NVMe, RAID-0 striped across four drives, beats the node's individual share of the parallel file system by ~7×; that is why warm data stages locally at all.)*.

## The Pipeline Equation

The design question reduces to one inequality: deliver each global batch before the step ends.

**Eq 1 · The fuel-line equation**
$$
BW_{required} = \frac{N \times B_{batch}}{T_{step}}
$$

For the text job the number is almost comic: 6 TB over 25.6 days averages **~2.7 MB/s for the whole fleet** *(why it matters: A generic text-pretraining feed is tens of times smaller than measured per-accelerator demand for vision workloads: MLPerf Storage medians run ~0.09-0.18 GB/s per A100/H100 for ResNet-50, 0.35-0.55 for CosmoFlow, 1.4-2.8 for 3D U-Net. Image-heavy corpora can demand hundreds of GB/s aggregate; the same cluster is fuel-starved on pixels and overfed on tokens.)*.


**The feed requirement is workload-shaped**

| Workload | GB/s per H100 (MLPerf median) |
|---|---|
| ResNet-50 | 0.18 |
| CosmoFlow | 0.55 |
| 3D U-Net | 2.8 |

*Median sustained read throughput per emulated H100 accelerator from MLPerf Storage v1.0 closed submissions, by workload: ResNet-50 0.18, CosmoFlow 0.55, 3D U-Net 2.8 GB/s (A100 medians ran about half: 0.09, 0.35, 1.4). The 175B text job needs ~MB/s fleet-wide — the same storage system is overfed on tokens and starved on pixels.*

**Eq 2 · The stall frontier**
$$
f_{active} = \min\!\left(1,\ \frac{BW_{supply}}{BW_{demand}}\right)
$$

The stall frontier is the whole story of starvation: **below the knee, active fraction falls linearly with supply** *(why it matters: The chapter's placements: a stalled pipeline at 0.8 active; an image job fed by the whole PFS holds ~3.3× headroom; the text job holds ~6,000×. Multi-worker loading adds a second term: mean delivered rate across ~6 service paths came to about one-sixth of the all-hot rate in the chapter's measurement.)*, and prefetching only moves the knee if bandwidth moves.

![Fed or starved: one knee decides](https://benebsworth.com/study/vol2/04-data-storage/diagrams/stall-frontier.svg)

*Compute active-time fraction against supply/demand bandwidth ratio on a log axis: active = min(1, ratio). Below the knee the pipeline starves linearly; above it the fleet is fed. Placements: a stalled notebook pipeline at 0.8, an image job at ~3.3x headroom, the text job at ~6,000x. Prefetching hides latency variance; only bandwidth or a smaller representation moves the knee.*
Locality is the other lever. Prestaging the working set to local NVMe takes **~80 s once instead of paying the PFS share every read** *(why it matters: With ~88% of a multimodal corpus held in the local cache, mean delivered rate lands ~16 GB/s; a miss is 7× slower per byte than a hit. At 256 nodes failing ~once per day at 50,000 h per-GPU MTBF, restaging cost is a scheduling problem, not an afterthought.)*.

## GPUDirect Storage

The buffered path bounces every payload: NVMe DMAs into a kernel buffer in host DRAM, the CPU copies it to a pinned buffer, then DMA descends to HBM. GDS removes the **payload's detour through the CPU** *(why it matters: NVMe transfers directly into GPU memory; the CPU keeps only submission and completion control. The chapter's measured-style numbers: ~4× better CPU service ratio, ~75% latency reduction on the copy path. It removes the copy, not the network round trip or the tail.)*. The bytes skip the host entirely.

## Checkpoint Storage

Checkpoints are where the write-side physics lands. A naive full-state write is absurd at scale: the 70B side scenario's **980 GB resumable checkpoint at 100 GB/s would stall over 10,000 s** *(why it matters: Training_1K replicas scenario. The only survivable design is two-phase staging: pause only for the local NVMe write, then copy to durable storage asynchronously.)*.

**Eq 3 · Two-phase checkpoint cost**
$$
T_{pause} = \frac{B_{shard}}{BW_{local\ stripe}} \approx 0.34\ \mathrm{s}, \quad T_{pfs} \approx 2.45\ \mathrm{s\ async}
$$

On the running cluster each node's shard of the 2,450 GB save is ~9.6 GB; the local pause is **~0.34 s against a 2.45 s async copy** *(why it matters: A one-second pause would still cost ~22% of a 4.64 s step, but only ~0.17% of the 10-minute interval: async staging is what makes that trade survivable. Between local write and manifest publication the new generation is staged, not restorable; the previous committed generation remains the restore point.)*.

![Pause for the shard, publish the manifest](https://benebsworth.com/study/vol2/04-data-storage/diagrams/ckpt-staging.svg)

*Two-phase checkpoint staging across four lanes: training pauses ~0.34 s while the node's ~9.6 GB shard lands on local NVMe, a ~2.45 s async copy to the parallel file system overlaps later steps, and the manifest publishes last. Between local write and manifest the generation is staged, not restorable — the previous committed generation is the restore point.*
Retention is a separate decision from saving: **keeping every generation is itself a petabyte decision** *(why it matters: 4,320 saves × 2.45 TB. Reliability here is a write-completion contract: a checkpoint that can't restore is worse than none.)*.

## Versioned Data and Commit Boundaries

The correctness bug is the acknowledgment gap: a worker writes the output row for event e42, then **crashes before recording the commit** *(why it matters: The replacement can't tell whether the row exists and must replay. Append the replay and the click counts twice in every dataset built from the table; write under a stable key (feature_version, e42) and the replay overwrites the same row: at-least-once delivery yields an effectively exactly-once table.)*.

Synthetic data makes storage a provenance engine: the regeneration recipe is itself data, and **a 5% source change can shrink the needed payload ~20×** *(why it matters: Re-deriving the changed slice beats re-writing the corpus. Costs follow: a 1 TB synthetic set carrying 40% provenance metadata across 3 versions amplifies capacity ~1.4× and traffic ~4.4×; 100 TB of generated data at 500 MB/s per core costs ~56 core-hours just to materialize.)*.

## Storage Economics

The price list inverts intuition the same way the physics did:

- **Egress dwarfs storage rent** *(why it matters: 1 PB at \$0.02/GB-month is \$240k/year of rent; ten full reads at \$0.09/GB is \$900k of egress. The meter runs on movement, not residence.)*,
- **HBM is not a storage tier you can afford** *(why it matters: \$1.5M per 100 TB, the thought experiment that prices the whole hierarchy.)*,
- **Tiering pays for accelerators** *(why it matters: Demoting 40 of 50 datasets off the in-place tier saves ~\$144k/year; a dedup/tier pass saving \$282k/year funds ~9 H100s at list price, break-even in ~4.7 epochs. On-prem vs cloud break-even lands ~4.7-7.8 years depending on capex.)*,

## Storage for Serving

Serving replays the same fuel line at a different tempo: **35 TB of weights to 100 replicas** *(why it matters: At 1 TB/s aggregate, the rollout takes ~35 s; striped local NVMe beats a single Gen5 drive, which beats the node's PFS share. A warm replica holding weights in host DRAM is bounded by host-memory bandwidth, not the per-GPU links; eight Gen4 NVMe drives map one per GPU.)*. Retrieval indexes add a second pattern: **1B vectors × 1536-dim FP32 ≈ 6.1 TB** *(why it matters: Graph indexes (HNSW, DiskANN) add only ~0.1 TB of adjacency at 100 B/node, but recall targets trade directly against random-I/O cost, the one access pattern this chapter says to avoid.)*.

## What Moves the Tiers

The boundary devices to watch: **CXL-attached memory, DPUs that own the staging path, and computational storage** *(why it matters: Each moves a tier boundary, pulling object-store semantics toward the node, or pushing filter/decompress work into the drive. The hierarchy's shape is set by physics; which tier owns which job is set by these parts.)*.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- **Size storage for the dataset** *(why it matters: The corpus is 6 TB; the workload is ~10.6 PB of checkpoints. The write path is the design driver.)*,
- **Faster compute relieves storage pressure** *(why it matters: A 16× accelerator buys 4× throughput once delivery binds; the I/O wall is rate-matching, not peak.)*,
- **Peak TFLOP/s and fabric benchmarks prove the system** *(why it matters: They measure the engine at full throttle on a closed track; the fuel line is a different specification entirely.)*,
- **Prefetch depth fixes stalls** *(why it matters: Prefetch hides latency variance, never a sustained supply deficit; only bandwidth or a smaller representation moves the knee.)*,
- **A saved checkpoint is a restore point** *(why it matters: Until the manifest commits, the generation is staged shards; reliability is a write-completion contract.)*,
- **IOPS ratings translate to ML throughput** *(why it matters: Sequential 256 MB shard streams want sustained GB/s; procuring on random-access ratings buys capability the workload never exercises.)*,

## The physics

| Quantity | Value | Where it binds |
|---|---|---|
| HBM ↔ NVMe tier gap | 3.35 TB/s vs ~7 GB/s ≈ 479× | why the hierarchy exists |
| Corpus (compressed / tokenized) | ~3 TB / ~6 TB | epoch read volume |
| Global batch | 1,536 seqs · 3,145,728 tok · ~4.64 s step | feed-rate numerator/denominator |
| Checkpoint contract | 14 B/param → 2,450 GB | write-side payload |
| Lifetime checkpoint writes | 4,320 saves ≈ 10.6 PB | dominant traffic, >1,000× reads |
| Rollout fan-out | 100 × 350 GB = 35 TB | serving burst |
| Text feed average | ~2.7 MB/s fleet-wide | tokens are cheap fuel |
| Per-accelerator demand | 0.09-2.8 GB/s by workload | MLPerf medians, A100→H100 |
| Random-read penalty | ~0.5 GB/s vs 7-14 GB/s seq | why shards stream |
| I/O wall | 16× compute → 4× throughput | delivery-bound plateau |
| Local RAID-0 share | ~7× per-node PFS share | why warm data stages locally |
| Locality | ~80 s prestage · 88% hit · ~16 GB/s mean · miss 7× | placement pays |
| GDS | ~4× CPU service ratio · ~75% latency cut | host-copy bypass |
| 70B checkpoint | 980 GB · naive write >10,000 s | why two-phase exists |
| Two-phase save | 0.34 s pause · 2.45 s async | pause = 22% step, 0.17% interval |
| Commit boundary | stable key → effectively-once | replay safety |
| Egress vs rent | \$900k vs \$240k/yr on 1 PB | movement is the meter |
| HBM-as-storage | \$1.5M / 100 TB | prices the pyramid |
| Serving load | 35 TB at 1 TB/s = 35 s | rollout time bound |
| Vector index | 6.1 TB vectors + ~0.1 TB graph | retrieval footprint |

## Glossary

- **Checkpoint contract**: which state a resumable save must hold: FP16 weights + FP32 master + two Adam moments = 14 B/param here.
- **Commit boundary**: the point where a write becomes durable and replay-safe; the acknowledgment gap is the crash window before it.
- **GPUDirect Storage**: NVMe-to-HBM DMA without the host-DRAM bounce; CPU keeps control only.
- **I/O wall**: the plateau where batch time is set by delivery rate and compute speed stops mattering.
- **IOPS**: per-operation speed; procured for databases, nearly irrelevant to sequential shard streams.
- **PFS (parallel file system)**: striped shared file system (Lustre-class); metadata on a separate path from payload.
- **Prefetch / pipeline depth**: batches staged ahead of the step; hides latency, not rate deficits.
- **Provenance**: the regeneration recipe stored with synthetic data; the thing that makes a 20× payload reduction possible.
- **Resumable checkpoint**: full training state (weights + master + optimizer moments) needed to continue a run, not just serve it.
- **Shard / buffer shuffle**: shard-order permutation plus within-buffer mixing, the tractable approximation of global shuffle.
- **Stall frontier**: active fraction = min(1, supply/demand); the knee where supply meets demand.
- **Tier**: a rung in the hierarchy trading bandwidth for capacity and shared scope, T0 HBM → T5 archive.

## → Ben's world

- **Doc-analyser pipeline**: the commit-boundary bug is the same class as a worker that writes a row then crashes before marking the job done; stable keys make replays idempotent.
- **Cuttlefish**: prestaging is the warm-cache question at fleet scale: 80 s once vs a per-read tax; the 88% hit rate is what makes it pay.
- **Knowledge console**: egress > rent applies to any cloud object store; the bill follows movement, not residence.
- **Greenveil**: the stall frontier is the shape of every queue-bound system: throughput is min(1, supply/demand) whether the supply is storage bandwidth or API rate.

## Open questions

- Checkpoints at 2.45 TB per ten minutes are survivable because async staging hides them; at what model size does even the local-write pause (0.34 s here) become the constraint?
- If synthetic-data provenance costs 40% metadata overhead but enables 20× payload reduction, where's the break-even in versions kept?
- Does CXL-attached memory actually collapse Tier 1 and Tier 2, or does it just rename the boundary?
- Retrieval indexes reintroduce random I/O at the serving edge: does the sequential-stream bias of this chapter's hardware make RAG structurally mismatched to the storage stack?


---

## Key equations

**Eq 1 · The fuel-line equation**

$$
BW_{required} = \frac{N \times B_{batch}}{T_{step}}
$$

*Aggregate storage bandwidth must deliver every global batch inside the step window: accelerator count times batch bytes divided by step time. For the tokenized-text job it comes out to ~2.7 MB/s fleet-wide, while the same inequality on an image corpus demands hundreds of GB/s. Compute upgrades shrink the denominator and raise the requirement.*

**Eq 2 · The stall frontier**

$$
f_{active} = \min\!\left(1,\ \frac{BW_{supply}}{BW_{demand}}\right)
$$

*In a fully overlapped pipeline the fraction of time compute is active equals the ratio of delivered to demanded bandwidth, capped at one. Below the knee the fleet starves linearly; above it the fleet is fed. Prefetch depth hides latency variance but cannot move a sustained rate deficit — only bandwidth or a more compact representation moves the knee.*

**Eq 3 · Two-phase checkpoint cost**

$$
T_{pause} = \frac{B_{shard}}{BW_{local\ stripe}} \approx 0.34\ \mathrm{s}, \quad T_{pfs} \approx 2.45\ \mathrm{s}
$$

*The synchronous pause is only the local-stripe write: the node's ~9.6 GB shard at four-drive RAID-0 bandwidth. The durable copy to the parallel file system (~2.45 s) runs asynchronously against later steps. A one-second pause would still cost ~22% of a 4.64 s step, but only ~0.17% of the ten-minute interval.*

**Eq 4 · Lifetime checkpoint volume**

$$
V = B_{ckpt} \times \frac{T_{window}}{\Delta t} = 2450\ \mathrm{GB} \times 4320 \approx 10.6\ \mathrm{PB}
$$

*The 14 byte-per-parameter resumable contract makes one save 2,450 GB; at ten-minute intervals over the 30-day window that is 4,320 saves and ~10.6 PB of writes, over a thousand times the epoch's 6 TB read volume. The write path, not the corpus, sizes the storage system.*

**Eq 5 · Delivered rate under caching**

$$
BW_{delivered} = h \cdot BW_{local} + (1-h) \cdot BW_{pfs\ share}
$$

*With ~88% of the corpus held in the local RAID-0 cache, mean delivered rate lands ~16 GB/s: hits stream at local-stripe speed while misses pay the node's parallel-filesystem share, ~7x slower per byte. Locality-aware staging converts shared-service bandwidth into per-node bandwidth for the working set.*

**Eq 6 · Movement is the meter**

$$
\$_{egress} = R_{out} \times \$_{GB} = 10 \times 1\ \mathrm{PB} \times \$0.09 \gg \$_{rent}
$$

*Object storage prices residence and movement separately: 1 PB at \$0.02/GB-month is \$240k/year of rent, but ten full reads at \$0.09/GB is \$900k of egress. The cost question is how often the bytes move, not how many exist — the same asymmetry that makes checkpoints the dominant traffic makes egress the dominant bill.*

## From the book

- [ML Storage Hierarchy (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — The six tiers stacked by distance from the accelerator — the placement the packet's tier ladder re-draws in compressed form.
- [Checkpoint dominance (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — The book's own log-bar contrast of 10.6 PB of checkpoint writes against one 6 TB epoch — the thesis number pair.
- [Data-stall frontier (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — The min(1, supply/demand) knee with the text job's ~6,000x and image job's ~3.3x headroom markers.
- [Traditional vs GPUDirect path (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — The buffered bounce through host DRAM against the direct NVMe-to-HBM DMA, with the CPU's remaining control link.
- [Two-phase checkpoint staging (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — The lane timeline from t0 to t3: local-write pause, async PFS copy, manifest publish; staged vs restorable spans.
- [Commit boundary acknowledgment gap (book)](https://mlsysbook.ai/vol2/04_data_storage/04_data_storage.html) — Event e42 written but never committed: append duplicates it, a stable key makes the replay an overwrite.

*Reference figures from Machine Learning Systems (Vijay Janapa Reddi). Images are not republished here; consult the source book alongside the original sketches.*

## Self-test

1. An H100 moves data internally through HBM at roughly 3.35 TB/s while one local NVMe drive delivers about 7 GB/s sequentially. What does the ~479x gap actually imply for the storage design?
   - A. Each tier exists to hide part of the gap at a price; the feed requirement still comes from batch bytes per step, not the HBM nameplate.
   - B. The fleet needs roughly 479 NVMe drives per accelerator to keep the GPUs fed, which is why procurement starts from the device count rather than the delivery model.
   - C. HBM bandwidth is the number storage must match, so the parallel file system is always the bottleneck.
   - D. The gap is between peak and sustained rates on the same device, so better drives close it entirely.

2. The running cluster writes a resumable mixed-precision Adam checkpoint every 10 minutes across a 30-day training window. The contract is FP16 weights + FP32 master + two FP32 moments = 14 bytes per parameter on a 175B model. Give the checkpoint count and the approximate lifetime write volume.

3. Input delivery takes one quarter of compute time and overlaps perfectly. Compute gets 16x faster while the storage path is unchanged. What happens to batch throughput?
   - A. It improves 16x, because prefetching absorbs the gap between compute and delivery.
   - B. It improves 8x, since each doubling of compute halves the effective delivery time.
   - C. It improves exactly 4x, then plateaus: once compute drops below delivery time the pipeline is delivery-bound.
   - D. It stays flat from the start, because the I/O wall means compute speed can never change batch time once any storage term exists in the loop.

4. Why do ML data loaders shuffle shard order and mix within a local buffer instead of performing a true global shuffle?
   - A. Buffer mixing gives statistically identical gradients to global shuffle for every possible corpus and batch size.
   - B. Global shuffle needs per-sample random access, which turns a ~10-minute sequential stream into hundreds to thousands of hours at 4 KB random-read rates.
   - C. Shard-order shuffling is required by the resumable checkpoint contract to keep sample order deterministic across restores, not by anything stochastic gradient descent asks for.
   - D. A global shuffle would exceed the prefetch buffer, so loaders avoid it only when memory is tight.

5. A serving fleet pushes a new 175B model version to 100 replicas; each replica needs 350 GB of FP16 weights. At 1 TB/s aggregate delivery, roughly how long does the rollout take, and what is the point of the number?
   - A. 3.5 TB total, ~3.5 s: weight fan-out is negligible next to checkpoint traffic, so it needs no budget.
   - B. 350 TB total, ~350 s: every byte crosses the parallel file system once per GPU, not once per replica.
   - C. 35 TB total, ~350 s: host DRAM bandwidth bounds the whole transfer to a tenth of the fabric's headline rate, so the rollout finishes an order slower than the aggregate suggests.
   - D. 35 TB total, ~35 s: the rollout is a burst of the same fuel-line problem, bounded by whichever tier actually feeds the load.

6. A feature-pipeline worker writes the output row for event e42, then crashes before recording the commit. Its replacement replays the event. What makes the replay safe?
   - A. Writing under a stable key (feature_version, e42): the replay overwrites the same row, so at-least-once delivery yields an effectively exactly-once table.
   - B. Appending the replayed row, because deduplication at query time removes the double count automatically and keeps the write path free of key coordination entirely.
   - C. Delaying the write until after the commit record, so the acknowledgment gap closes by construction.
   - D. Keeping the commit log on local NVMe, which makes the crash window too short to matter.

7. Two-phase checkpointing pauses training only for the local NVMe shard write (~0.34 s), then copies to the parallel file system asynchronously (~2.45 s). Between local write and manifest publication, which statement is correct?
   - A. The new generation is restorable straight from the local shard even though the manifest is unpublished, because durability lives on the node's drives already.
   - B. Both the new and previous generations are valid restore points, so either can serve a restart.
   - C. The new generation is staged but not restorable; the previous committed generation remains the restore point.
   - D. The checkpoint is incomplete, so a failure in the window forces the run back to the job start.

8. On cloud object storage, which cost model surprises teams provisioning for the running example?
   - A. Rent dominates egress: cold objects price reads near zero on the public clouds, so the annual bill follows provisioned capacity rather than movement.
   - B. Egress dominates rent: 1 PB at \$0.02/GB-month is \$240k/yr, but ten full reads at \$0.09/GB cost \$900k.
   - C. Requests dominate both: millions of small GETs cost more than the bytes they return.
   - D. Egress and rent are bundled, so the only real choice is the replication factor.

9. A node holds ~88% of a multimodal corpus in its local RAID-0 cache, where a miss pays ~7x per byte over a hit. With ~80 s of prestaging, what does the chapter report for mean delivered bandwidth?
   - A. ~50 GB/s, the full local stripe rate, since 88% is close enough to always-hot.
   - B. ~7 GB/s, the node's PFS share, since misses dominate tail latency regardless of count.
   - C. ~28 GB/s, four drives at 7 GB/s each in the RAID-0 stripe, unaffected by the cache hit rate once the corpus is prestaged.
   - D. ~16 GB/s, the hit-weighted average across local stripe and the node's parallel-FS share.

10. Which of the chapter's audited beliefs is FALSE?
    - A. If the corpus fits comfortably, storage is sized correctly, since the dataset is what the storage system serves.
    - B. Prefetch depth fixes stalls whenever the mean supply rate meets demand; deeper buffers are what smooth the variance around that average.
    - C. A checkpoint file that exists is not yet a restore point until its manifest commits.
    - D. Striped local NVMe can beat the node's share of a fast parallel file system for warm data.

11. Explain to a colleague who just bought faster drives why their training run still starves the GPUs. Use the stall frontier and the pipeline equation.

## Answer key

1. A. The ratio contrasts two tiers, not the required feed rate; HBM bandwidth also carries weight, activation, and tensor traffic. The hierarchy exists because no single device is fast, capacious, and cheap at once, and the real demand is batch bytes divided by step time, about 2.7 MB/s fleet-wide for the text job.

2. 30 days x 24 h x 6 saves/h = 4,320 checkpoints; 14 B/param x 175B is about 2,450 GB per save; 4,320 x 2.45 TB is about 10.6 PB, over a thousand times the epoch's 6 TB corpus read. The write path, not the dataset, sizes the storage system.

3. C. Batch time is max(compute, delivery). Doubling compute halves batch time; at 4x the two are equal; at 16x compute sits 4x below delivery and stops mattering, a 4x total gain. Prefetch hides latency variance, never a sustained rate deficit.

4. B. SGD wants near-uniform batches; storage hardware wants sequential scans. Per-sample random access on a multi-TB corpus runs at ~0.5 GB/s instead of 7-14 GB/s. The shard+buffer compromise preserves sequential I/O and leaves mixing quality dependent on shard composition and buffer size.

5. D. 100 x 350 GB is 35 TB; at 1 TB/s that is about 35 s. Rollout is the serving-side repetition of the fuel line: the bound is whichever tier supplies the bytes (striped local NVMe beats one Gen5 drive, which beats the per-node PFS share; a warm replica is bounded by host DRAM, not the per-GPU links).

6. A. The acknowledgment gap, written but not committed, forces replay. Append duplicates the row and the click counts twice in every dataset built from the table. A stable key turns the replay into an overwrite: the row exists once whether written once or twice.

7. C. A checkpoint becomes a restore point only when the manifest commits it. Until then the save is staged shards on local NVMe plus a partial async copy; the last committed generation is what a restart reads. Reliability here is a write-completion contract, not a file's existence.

8. B. The meter runs on movement, not residence: the same asymmetry as the physics, where checkpoints dominate traffic and egress dominates the bill. Ten reads of a 1 PB corpus cost ~3.75x a year of keeping it.

9. D. Delivered rate is the hit-weighted blend: 0.88 x local stripe + 0.12 x PFS share lands ~16 GB/s. Locality-aware staging converts shared-service bandwidth into per-node bandwidth, and pays ~80 s once instead of a per-read tax forever.

10. A. Sizing for the corpus misses the workload by three orders of magnitude: the epoch reads 6 TB but checkpoints write ~10.6 PB. The write path (pause cost, async staging, retention) is the design driver, and each fallacy in the audit maps to a number that refutes it.

11. Batch time is max(compute, delivery), so the fleet starves whenever delivered bandwidth falls below demanded bandwidth, active = min(1, supply/demand). Faster drives raise supply at one tier, but the path between tiers (loader stages, prefetch depth, per-node PFS share) may still cap delivery below demand. The fix is matching rate at the tier the bytes actually cross, or shrinking the representation; a faster device at the wrong tier moves neither the supply number nor the knee.

## Audio overview

[Listen to the Marcus & Iris read-along (~8 min)](https://benebsworth.com/study-audio/vol2/04-data-storage.m4a) — a generated podcast walking this packet's argument.
