---
openingQuestion: "A 175B training run reads a 6 TB tokenized corpus all epoch, yet the storage system is provisioned and priced for petabytes. What generates the other ~10.6 PB of traffic, and why does it arrive as a burst every ten minutes?"
---

# Data Storage: Study Packet

*Working through [Data Storage](https://mlsysbook.ai/books/vol2/04_data_storage/04_data_storage.html), chapter 4 of Machine Learning Systems volume II by Vijay Janapa Reddi and collaborators (CC BY-NC-SA 4.0).*

## Thesis

**The dataset is not the load — the checkpoint is.** The fleet reads a 6 TB corpus once across the epoch but writes a 2,450 GB resumable state every ten minutes: 4,320 saves, ~10.6 PB, more than a thousand times the training-read volume. An engine without fuel is expensive sculpture, and the fuel line runs both directions: ==the dominant traffic is the state training produces, not the data it consumes=={The resumable Adam contract (FP16 weights at 2 B/param, FP32 master at 4, two FP32 moments at 4+4) is 14 bytes per parameter, 2,450 GB for 175B. Every ten minutes on the 30-day window. The epoch's 6 TB of reads is a rounding error against ~10.6 PB of writes.}. The tiered hierarchy exists because no single device is fast, capacious, and cheap at once, and the pipeline equation exists because a tier is only as good as its delivery rate at the moment the batch is due.

> [!note] How to read this packet
> Amber dotted marks carry a one-line reason the phrase earns attention, hover, tap or tab to open them. The physics table at the bottom collects every number worth keeping.

## The Fuel Line

The running example doubles the book's usual cluster: 256 eight-GPU nodes, ==2,048 accelerators=={Deliberately twice the 1,024-GPU reference cluster, because shared-storage pressure is easier to see at larger fleet scale. The 175B job runs as 32 replicas of 64 GPUs each (TP8 × PP8), a global batch of 1,536 sequences, 3,145,728 tokens per step, modeled at ~4.64 s, so one epoch ≈ 25.6 days inside a 30-day window.}, training a 175B model on a corpus that is ~3 TB compressed and ~6 TB as 4-byte token IDs. The corpus is the small end of the story.

The bandwidth ladder starts with a ratio: H100 HBM moves data at ==3.35 TB/s against ~7 GB/s for one NVMe drive=={A ~479× gap between the fastest and slowest tiers a byte visits. The ratio contrasts tiers, not required feed rate: HBM bandwidth also carries weight, activation, and tensor traffic, so the feed requirement comes from input-batch bytes per step time, not the nameplate.}, roughly 479×. Every tier between them exists to hide that gap at a price.

::fig[tier-ladder]

Then the write side arrives. The chapter's checkpoint contract is ==14 bytes per parameter=={Resumable mixed-precision Adam: FP16 weights (2 B) + FP32 master weights (4 B) + two FP32 Adam moments (8 B). Gradients are recomputed on restore and excluded.}, so one save is 2,450 GB, and at ten-minute intervals the 30-day window produces ==4,320 checkpoints ≈ 10.6 PB=={Over a thousand times the epoch's 6 TB read volume. Serving compounds it differently: pushing 350 GB of FP16 weights to 100 replicas moves 35 TB in one fan-out.}. Procurement that sizes for the corpus misses the actual workload by three orders of magnitude.

::chart[ckpt-dominance]

## The Workload Inversion

Database storage was built for ==small random accesses with strong consistency=={4 KB reads, IOPS-rated drives, write-ahead logs, RAID redundancy. Full-corpus pretraining inverts each: megabyte-scale sequential scans through immutable sharded shards, sampled once per epoch in shuffle order.}, and ML inverts the stack:

- **Sequential, not random.** A Gen4/Gen5 NVMe streams 7-14 GB/s sequentially but falls to ==~0.5 GB/s on 4 KB random reads=={A 10-30× penalty per access pattern; spinning disks lose ~100× to seek time. A 4 TB token corpus read as random elements would take hundreds to thousands of hours; streamed as shards, about ten minutes.},
- **Shuffled, but not truly random.** SGD needs near-uniform batches, but global shuffling destroys sequential I/O. The compromise is ==shard-order shuffle plus within-shard buffer mixing=={Preserves sequential reads; mixing quality depends on shard composition and buffer size, which becomes a validation step, not a constant.},
- **Immutable reads, bursty writes.** Training shards avoid read-write conflicts, but checkpoint publication and feature updates still need explicit consistency guarantees.

The result is the **I/O wall**: when delivery cannot keep pace, faster compute just idles sooner. The normalized example is stark: if input delivery is a quarter of compute time and overlaps perfectly, ==a 16× faster accelerator buys only 4× batch throughput=={Doubling compute halves batch time; quadrupling makes compute and delivery equal; beyond that the pipeline is delivery-bound and compute speed stops mattering. Prefetching hides latency, not a sustained rate deficit.}.

## The Storage Hierarchy

Six tiers, ordered by distance from the accelerator, each trading ==bandwidth for capacity and shared scope=={Tier 0 GPU HBM (per accelerator), Tier 1 host DRAM, Tier 2 local NVMe (per node), Tier 3 parallel file system, Tier 4 object storage, Tier 5 archive (shared services). Blue tiers are bought per GB; green tiers rented per GB-month; archive is offline media.}:

| Tier | Holds | Bandwidth character | Scope |
|---|---|---|---|
| 0 · GPU HBM | resident weights + batch | 3.35 TB/s | one accelerator |
| 1 · host DRAM | prefetch buffers, loader pipeline | ~100s GB/s, lower first-byte latency than HBM | one node |
| 2 · local NVMe | staged corpus, warm checkpoint | ~7 GB/s/drive; RAID-0 ×4 ≈ 7× the node's PFS share | one node |
| 3 · parallel FS | durable checkpoint, shared corpus | striped; metadata on a separate path | shared service |
| 4 · object | dataset of record, retention | capacity-priced, egress-taxed | shared service |
| 5 · archive | cold versions | offline media | shared service |

Two subtleties worth keeping: ==HBM is not the lowest-latency tier=={Host DRAM reaches first byte sooner than HBM; HBM wins on sustained bandwidth, not latency. And local NVMe, RAID-0 striped across four drives, beats the node's individual share of the parallel file system by ~7×; that is why warm data stages locally at all.}.

## The Pipeline Equation

The design question reduces to one inequality: deliver each global batch before the step ends.

::eq[required-bw]

$$
BW_{required} = \frac{N \times B_{batch}}{T_{step}}
$$

For the text job the number is almost comic: 6 TB over 25.6 days averages ==~2.7 MB/s for the whole fleet=={A generic text-pretraining feed is tens of times smaller than measured per-accelerator demand for vision workloads: MLPerf Storage medians run ~0.09-0.18 GB/s per A100/H100 for ResNet-50, 0.35-0.55 for CosmoFlow, 1.4-2.8 for 3D U-Net. Image-heavy corpora can demand hundreds of GB/s aggregate; the same cluster is fuel-starved on pixels and overfed on tokens.}.

::chart[per-accel-demand]

::eq[stall-fraction]

$$
f_{active} = \min\!\left(1,\ \frac{BW_{supply}}{BW_{demand}}\right)
$$

The stall frontier is the whole story of starvation: ==below the knee, active fraction falls linearly with supply=={The chapter's placements: a stalled pipeline at 0.8 active; an image job fed by the whole PFS holds ~3.3× headroom; the text job holds ~6,000×. Multi-worker loading adds a second term: mean delivered rate across ~6 service paths came to about one-sixth of the all-hot rate in the chapter's measurement.}, and prefetching only moves the knee if bandwidth moves.

::fig[stall-frontier]

Locality is the other lever. Prestaging the working set to local NVMe takes ==~80 s once instead of paying the PFS share every read=={With ~88% of a multimodal corpus held in the local cache, mean delivered rate lands ~16 GB/s; a miss is 7× slower per byte than a hit. At 256 nodes failing ~once per day at 50,000 h per-GPU MTBF, restaging cost is a scheduling problem, not an afterthought.}.

## GPUDirect Storage

The buffered path bounces every payload: NVMe DMAs into a kernel buffer in host DRAM, the CPU copies it to a pinned buffer, then DMA descends to HBM. GDS removes the ==payload's detour through the CPU=={NVMe transfers directly into GPU memory; the CPU keeps only submission and completion control. The chapter's measured-style numbers: ~4× better CPU service ratio, ~75% latency reduction on the copy path. It removes the copy, not the network round trip or the tail.}. The bytes skip the host entirely.

## Checkpoint Storage

Checkpoints are where the write-side physics lands. A naive full-state write is absurd at scale: the 70B side scenario's ==980 GB resumable checkpoint at 100 GB/s would stall over 10,000 s=={Training_1K replicas scenario. The only survivable design is two-phase staging: pause only for the local NVMe write, then copy to durable storage asynchronously.}.

::eq[two-phase-ckpt]

$$
T_{pause} = \frac{B_{shard}}{BW_{local\ stripe}} \approx 0.34\ \mathrm{s}, \quad T_{pfs} \approx 2.45\ \mathrm{s\ async}
$$

On the running cluster each node's shard of the 2,450 GB save is ~9.6 GB; the local pause is ==~0.34 s against a 2.45 s async copy=={A one-second pause would still cost ~22% of a 4.64 s step, but only ~0.17% of the 10-minute interval: async staging is what makes that trade survivable. Between local write and manifest publication the new generation is staged, not restorable; the previous committed generation remains the restore point.}.

::fig[ckpt-staging]

Retention is a separate decision from saving: ==keeping every generation is itself a petabyte decision=={4,320 saves × 2.45 TB. Reliability here is a write-completion contract: a checkpoint that can't restore is worse than none.}.

## Versioned Data and Commit Boundaries

The correctness bug is the acknowledgment gap: a worker writes the output row for event e42, then ==crashes before recording the commit=={The replacement can't tell whether the row exists and must replay. Append the replay and the click counts twice in every dataset built from the table; write under a stable key (feature_version, e42) and the replay overwrites the same row: at-least-once delivery yields an effectively exactly-once table.}.

Synthetic data makes storage a provenance engine: the regeneration recipe is itself data, and ==a 5% source change can shrink the needed payload ~20×=={Re-deriving the changed slice beats re-writing the corpus. Costs follow: a 1 TB synthetic set carrying 40% provenance metadata across 3 versions amplifies capacity ~1.4× and traffic ~4.4×; 100 TB of generated data at 500 MB/s per core costs ~56 core-hours just to materialize.}.

## Storage Economics

The price list inverts intuition the same way the physics did:

- ==Egress dwarfs storage rent=={1 PB at \$0.02/GB-month is \$240k/year of rent; ten full reads at \$0.09/GB is \$900k of egress. The meter runs on movement, not residence.},
- ==HBM is not a storage tier you can afford=={\$1.5M per 100 TB, the thought experiment that prices the whole hierarchy.},
- ==Tiering pays for accelerators=={Demoting 40 of 50 datasets off the in-place tier saves ~\$144k/year; a dedup/tier pass saving \$282k/year funds ~9 H100s at list price, break-even in ~4.7 epochs. On-prem vs cloud break-even lands ~4.7-7.8 years depending on capex.},

## Storage for Serving

Serving replays the same fuel line at a different tempo: ==35 TB of weights to 100 replicas=={At 1 TB/s aggregate, the rollout takes ~35 s; striped local NVMe beats a single Gen5 drive, which beats the node's PFS share. A warm replica holding weights in host DRAM is bounded by host-memory bandwidth, not the per-GPU links; eight Gen4 NVMe drives map one per GPU.}. Retrieval indexes add a second pattern: ==1B vectors × 1536-dim FP32 ≈ 6.1 TB=={Graph indexes (HNSW, DiskANN) add only ~0.1 TB of adjacency at 100 B/node, but recall targets trade directly against random-I/O cost, the one access pattern this chapter says to avoid.}.

## What Moves the Tiers

The boundary devices to watch: ==CXL-attached memory, DPUs that own the staging path, and computational storage=={Each moves a tier boundary, pulling object-store semantics toward the node, or pushing filter/decompress work into the drive. The hierarchy's shape is set by physics; which tier owns which job is set by these parts.}.

## Fallacies and Pitfalls

The chapter's own audit, the ones the numbers above refute directly:

- ==Size storage for the dataset=={The corpus is 6 TB; the workload is ~10.6 PB of checkpoints. The write path is the design driver.},
- ==Faster compute relieves storage pressure=={A 16× accelerator buys 4× throughput once delivery binds; the I/O wall is rate-matching, not peak.},
- ==Peak TFLOP/s and fabric benchmarks prove the system=={They measure the engine at full throttle on a closed track; the fuel line is a different specification entirely.},
- ==Prefetch depth fixes stalls=={Prefetch hides latency variance, never a sustained supply deficit; only bandwidth or a smaller representation moves the knee.},
- ==A saved checkpoint is a restore point=={Until the manifest commits, the generation is staged shards; reliability is a write-completion contract.},
- ==IOPS ratings translate to ML throughput=={Sequential 256 MB shard streams want sustained GB/s; procuring on random-access ratings buys capability the workload never exercises.},

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
