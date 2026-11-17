# System Paradigms: Self-Test

Six book questions, three Feynman prompts, one numeric. Answer before reading
the key at the bottom.

## Section A: book questions

**Q1.** A safety-critical braking system has a 10 ms end-to-end budget and a
cloud data center 1,500 km away. Light in fiber moves at ~200,000 km/s. Why is
cloud offload physically impossible?

- a) Cloud queue latency always adds ≥25 ms regardless of load
- b) The fiber round trip fits in 5 ms, but weight serialization takes 15 ms
- c) Minimum propagation alone is 15 ms: the whole budget and more, before compute
- d) Wireless protocols require a ≥50 ms handshake first

**Q2.** Which pairing matches workload archetype, dominant bottleneck, and
lighthouse?

- a) Compute-bound → irregular table lookups and cache misses → DLRM
- b) Bandwidth-bound → dense weight streaming in autoregressive decode → GPT-2/Llama
- c) Capacity-bound → dense FLOP throughput at high arithmetic intensity → ResNet-50
- d) Power-bound → petabyte distributed training → KWS

**Q3.** Under dynamic CMOS scaling with $V \propto f$, doubling clock frequency
raises dynamic power by a factor of 8. True or false?

**Q4.** When does the additive iron law apply versus the bottleneck max form?

- a) Additive for one request's serialized latency; max for the steady-state
  completion interval of an overlapped stream
- b) Additive for cloud, max for TinyML
- c) Additive above batch 128, max at batch 1
- d) Additive in training, max in quantization

**Q5.** A drone at 60 fps (16.7 ms frame budget) captures uncompressed 4K
frames (~24.9 MB) over a 100 Mbps uplink. Remote round trip plus inference is
110 ms. Applying the data locality invariant, cloud offload is:

- a) Feasible: the cloud GPU infers in under 10 ms
- b) Feasible with 5G network slicing enabled
- c) Infeasible: drones can't speak cloud telemetry protocols
- d) Infeasible: transmission alone is ~2,000 ms, so even the lower bound
  (~2,100 ms) misses the deadline by two orders of magnitude

**Q6.** How does the memory wall manifest given historical growth rates?

- a) Bandwidth doubles every 18 months while compute grows 20%/yr
- b) Both grow ~60%/yr but capacity limits model size
- c) Thermal limits hit absolute while memory signaling energy is near zero
- d) Compute doubles ~every 18 months (~60%/yr) while bandwidth grows ~20%/yr,
  so the gap compounds

## Section B: Feynman prompts

**F1.** Explain to a junior dev why "the model is memory-bound" is an
incomplete statement. What else must be specified for the claim to mean
something?

**F2.** Why does the screening order put privacy before latency and cost last?
What happens if you run the checks in the wrong order?

**F3.** A colleague proposes fixing a phone's thermal throttling by
quantizing the model to INT8. Explain why that helps the footprint and still
fails the sustained workload.

## Section C: numeric

**N1.** A warehouse camera records 1080p RGB frames (1920×1080×3 B ≈ 6.2 MB)
at 30 fps for defect flagging over a 50 Mbps uplink. The per-frame deadline is
one frame interval. (a) Transmission time per frame? (b) Does the remote path
survive the locality screen, and if not what is the cheapest fix that keeps
cloud analytics?

--- answer key ---

**Q1: c.** $2 \times 1500 / 200{,}000 = 0.015$ s = 15 ms of pure propagation,
over the 10 ms budget before routing, queuing, or a single FLOP. Propagation
is a floor, not a parameter.

**Q2: b.** Autoregressive decode streams the whole weight set per token with
little reuse: bandwidth-bound. (a) DLRM is capacity-bound; (c) ResNet-50 is
compute-bound; (d) KWS is ~200 KB and ~1 mW, the opposite of petabyte training.

**Q3: True.** $P \propto C V^2 f$, $V \propto f$ gives $P \propto f^3$;
$2^3 = 8$. This is the engine behind the power wall and the ~2005 clock freeze.

**Q4: a.** The additive form prices one dependent path end to end. The max
form prices the interval between completions of an overlapped stream: the
slowest stage hides the rest, overhead sits outside the max.

**Q5: d.** $199.2$ Mbit $/ 100$ Mbps $= 1{,}992$ ms transmission alone; +110 ms
remote ≈ 2.1 s vs 16.7 ms. 5G raises bandwidth, not propagation; either way
the bound fails, so the path is rejected without measuring the remote compute.

**Q6: d.** The ~1.6× vs ~1.2× annual divergence (ratio ≈ 1.33) is the memory
wall: movement gains share of time and energy every generation.

**F1:** The bound is a property of (workload × batch × precision × hardware),
not the model. ResNet-50 is compute-bound at batch 256 and bandwidth-bound at
batch 1. To say "memory-bound" you must name the machine's balance point
($R_{\mathrm{peak}}/BW$) and the workload's arithmetic intensity under these
execution conditions.

**F2:** The order ranks how quickly a check can invalidate a candidate for
free. A legal prohibition removes a tier before any number is computed;
latency needs one lower bound; resources need device specs; cost is the only
check that compares rather than rejects, so it belongs last, run only on
survivors. Reordering wastes effort costing out paths that physics or law
already killed.

**F3:** INT8 quarters the *footprint*, which helps the capacity check and
moves fewer bytes per inference. But sustained power is the binding term:
switching energy and static leakage don't scale with weight precision, so a
continuous pipeline above the ~2.5-5 W thermal envelope still throttles. The
fix is a lower duty cycle, different silicon, or a different architecture.

**N1:** (a) $6.2\text{ MB} \times 8 = 49.8$ Mbit $/ 50$ Mbps $\approx 996$ ms
per frame. (b) The frame interval is $1/30$ s ≈ 33 ms, so transmission alone
misses by ~30×: the remote path is rejected. Cheapest fix keeping cloud
analytics: local flagging/filtering (send defect frames or crops only), the
hierarchical pattern: transmission drops ~100×+, and the surviving frames'
upload fits easily inside any deadline.
