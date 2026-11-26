# Network Fabrics

1. An AllReduce step must move gradient shards off the node. On an H100-class node, per-direction bandwidth falls from NVLink inside the chassis to a single NDR InfiniBand port at the first hop off. By roughly what factor does the per-direction budget drop?
   - A. About 2×, the optical conversion at the transceiver adds latency while keeping the wire transfer rate nearly unchanged.
   - B. About 9×, from roughly 450 GB/s per direction inside the node to 50 GB/s on the NDR port, a gap that has held since 2016.
   - C. About 50×, because inter-node packets must be staged through CPU system memory and kernel TCP/IP stacks before transmission.
   - D. About 100×, since NVLink aggregates all eight GPUs' links while the fabric port serves the whole node through a single lane.

2. Using T(n) = α + n/β with the chapter's modeled anchors (α = 1.5 μs, β = 50 GB/s on NDR), compute the modeled time for a 4 KB pipeline control message, and identify which term dominates it.

3. The α-β model defines a crossover size n* = α·β (~75 KB on NDR). What does the crossover physically separate?
   - A. The regime where startup latency dominates from the regime where sustained bandwidth dominates, below n* buying more link rate buys almost nothing.
   - B. Copper-reachable links from optics-requiring links, since messages under n* stay inside the rack and their packets never reach the spine's pluggable optical modules.
   - C. Messages that fit in one packet from messages that need segmentation, below n* the NIC sends a single frame and skips all queuing.
   - D. Lossless delivery from best-effort delivery, the transport only engages RDMA credit accounting once the transfer exceeds the crossover size.

4. A training job keeps stalling on the same few fabric links while neighboring links sit idle. The fabric uses standard ECMP routing, which worked fine for web traffic. Why does ECMP produce persistent hot spots here?
   - A. ECMP requires per-packet reordering at the receiving NIC, and RDMA adapters cannot reorder flows, so colliding transfers stall on the hashed path until a timeout forces a reset.
   - B. ECMP was designed for optical circuits, and on electrical links the hash degenerates to a single active path per switch generation.
   - C. ECMP spreads flows evenly only when flows are many, small, and short-lived; training offers few, fat, synchronized flows, so hash collisions pin them onto shared paths for the whole run.
   - D. ECMP routes around failures but disables load balancing whenever PFC pause frames are active, which is nearly always during collectives.

5. A fat-tree is built from 64-port switches. Using the chapter's capacity rule (two tiers reach k²/2 hosts, three reach k³/4), how many hosts can a two-tier fabric serve, and what does a three-tier pod hold?

6. To cut switch count, a design team oversubscribes the spine 4:1 on a 1,024-GPU cluster (\$300M build). For a worst-placed ring AllReduce, what does the book's accounting show?
   - A. Crossing bandwidth halves and step time rises a few percent, an acceptable trade since collectives overlap compute anyway.
   - B. The loss is bounded by one rank's local NVLink rate, so the total slowdown caps near 9 times but converges toward baseline once rings overlap the spines.
   - C. Only small latency-bound messages suffer, since the 4:1 ratio still leaves each flow its full negotiated burst rate on average.
   - D. Bisection falls 25.6 to 6.4 TB/s, the collective quadruples from 0.20 s to 0.80 s, and the wasted compute is priced near \$142.1M.

7. Per-lane signaling moved from NRZ to PAM4 (4 levels, 2 bits per symbol). What is the primary physical trade-off this bought, and its consequence?
   - A. It spends clock rate for voltage levels: the symbol rate halves for the same throughput, so tight jitter budgets require active retimer chips inside every cable assembly.
   - B. It spends noise margin for symbol density: four levels cut the eye height, making forward error correction mandatory and adding ~300 ns to a three-hop one-way path.
   - C. It spends reach for rate: four levels only survive inside the package, so all board-level links moved to co-packaged optics first.
   - D. It spends idle cycles for density: four levels require continuous scrambling, which doubles idle power on links that carry no traffic.

8. 256 senders at 50 GB/s each converge on one 50 GB/s egress port with a 32 MB buffer. Roughly how long until the buffer overflows, and why can't congestion feedback prevent it?

9. On day 3 of a 30-day run, steps slow from 4.2 s to 4.8 s (+14%) and GPU busy rate reads 85% instead of 92%. Fleet dashboards show nothing. What does the chapter's debugging workflow find, and what is the systemic lesson?
   - A. A single link negotiated at half rate; a pairwise ib_write_bw bisects to it. The lesson is that synchronous steps transmit one link's degradation to every GPU while aggregate telemetry stays silent.
   - B. Thermal throttling on the ToR switch ASIC reducing port rates; the lesson is that switch cooling, not GPU cooling, ends up bounding sustained fabric throughput under load.
   - C. A driver regression in the collective library; the lesson is to pin NCCL versions across the fleet before launch.
   - D. Checkpoint traffic from a neighboring tenant's job; the lesson is that SR-IOV rate caps must be tightened before multi-tenant training.

10. RoCE is configured on the same 400 Gb/s links as InfiniBand NDR. At equal line rate, how do the modeled transfer times compare for a 4 KB control message and a 350 MB shard?
    - A. Both match NDR within ~1%, equal line rate means equal transfer time at every message size.
    - B. Both run ~4× slower on RoCE, the Ethernet header overhead multiplies against every byte regardless of size.
    - C. The 4 KB message matches but the shard diverges, since RoCE's lossless fabric halts large transfers whenever a PFC pause storm forms inside the shared Ethernet segment.
    - D. The 350 MB shard matches within ~1% but the 4 KB message stays several times slower, RoCE's ~5 μs alpha, not its rate, is the gap at small sizes.

11. Explain to a new engineer why 'upgrade the links from HDR to NDR' did not halve the job's collective time, and name the two independent levers the fabric actually offers.

## Answer key

1. B. NVLink 4 gives each GPU 450 GB/s per direction (900 GB/s bidirectional); the first hop off the node is a 400 Gb/s NDR port at 50 GB/s. The ~9× cliff is why placement, deciding what may cross the boundary, is the first-order fabric design decision.

2. T = 1.5 μs + 4,000 B / 50 GB/s = 1.5 + 0.08 = 1.58 μs. The startup term carries ~95% of the total, the transfer term is a rounding error at this size. Raising the link rate cannot fix a message that lives below the ~75 KB crossover.

3. A. At n* the transfer term n/β equals the startup α. Below it (~75 KB on NDR, ~62.5 KB on 100G RoCE) the fixed startup is most of the bill, so doubling the rate does nearly nothing. Above it bandwidth rules, and the same doubling halves the time.

4. C. Statistical multiplexing assumes many small independent flows. Lockstep collectives invert that: a handful of elephant flows start together, and a hash collision that lands two on one path persists for the duration. Adaptive routing exists precisely to repair this.

5. Two tiers: k²/2 = 64²/2 = 2,048 hosts. Three tiers: k³/4 = 64³/4 = 65,536, organized as pods of 1,024 in the chapter's scale-out. The exponent on radix is why next-generation switches that spend capacity on port count, not per-port rate, can collapse an entire tier.

6. D. The slowdown matches the oversubscription ratio on crossing traffic: 25.6→6.4 TB/s, 0.20→0.80 s. At ~30% of the step communicating, the throughput surrender prices to ~\$142.1M on a \$300M cluster, more than the switches it saved. Even 2:1 gives up 23.1%.

7. B. PAM4 doubles the bits per symbol at the cost of roughly a third of NRZ's SNR margin. The link can no longer run naked: FEC is required, and its encode-decode passes contribute ~100-300 ns per hop direction, inside the alpha term of every message.

8. Offered minus drained ≈ 12.75 TB/s, so the buffer fills in 32 MB / 12.75 TB/s ≈ 2.5 μs, under 5 μs at any accounting. A congestion-feedback round trip is itself ~5 μs: the signal cannot return before the buffer is gone. The bandwidth-delay product is only ~250 KB. Scheduling prevents incast; buffers only rename the loss.

9. A. The healthy link delivers ~96% of line rate on ib_write_bw; the measured pair showed 50%. One degraded lane transmitted a 2-3% step tax (after overlap) to all 1,024 GPUs, silent at fleet level, priced in the tens of thousands of dollars on a 737,280 GPU-hour run.

10. D. Same β makes the transfer term equal; RoCE's modeled startup is 5 μs vs NDR's 1.5 μs. At 350 MB the α difference is a rounding error (~1% total); at 4 KB it is most of the time. Protocol choice is a latency purchase more than a bandwidth one.

11. The α-β model splits every message into a fixed startup α and a per-byte rate β. HDR→NDR doubles β only. Messages below the ~75 KB crossover (control handoffs, small collectives) are almost all startup: α stays ~1.5 μs and they gain nothing. Only large transfers see the doubling, so the end-to-end gain lands under 25%. The two levers are startup (protocol path, hop count, FEC, queueing) and rate (per-port bandwidth, radix, oversubscription), and they fix different message sizes.
