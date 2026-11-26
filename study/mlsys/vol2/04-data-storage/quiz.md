# Data Storage

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
