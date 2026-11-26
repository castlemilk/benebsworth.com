# Vol II · Ch2: Compute Infrastructure: self-test

1. A vendor's next accelerator exceeds the single-reticle exposure limit (~858 mm²) and moves to a dual-die chiplet package. What is the main architectural consequence?
   - A. The two dies need an on-package die-to-die link fast enough to behave as one device, B200's die link exceeds even its NVLink total.
   - B. The two dies must share a single memory controller, which halves effective HBM bandwidth per die relative to an equivalent monolithic design.
   - C. Only one die can be active in a step, reticle stitching requires the partner die to idle during all communication phases.
   - D. The chiplet design removes the memory wall entirely, since two dies each bring their own HBM stacks and the effective ridge point halves.

2. A successor part doubles dense FP16 peak but ships the same HBM bandwidth. For a batch-1 decode job at 1 FLOP/byte, what does the upgrade buy?
   - A. Roughly half the per-token latency, because decode wall-clock divides evenly across whichever resource doubled in the new part.
   - B. Almost nothing: decode sits ~295× below the ridge, so the floor is weight bytes ÷ bandwidth, and bandwidth did not change.
   - C. A two-times latency gain from the doubled peak rate, since decode reads weights at full HBM speed regardless of batch size.
   - D. Better aggregate throughput at unchanged latency, since the doubled peak lets more requests share each weight read for free.

3. A run is estimated at 800 GPU-hours by dividing its FLOP count by the accelerator's peak rate. Profiling shows MFU 0.32 for the real step. How many GPU-hours should the schedule book?

4. A team proposes 8-way tensor parallelism across eight single-GPU servers on 50 GB/s InfiniBand NDR rather than inside one NVSwitch node. What does the bandwidth staircase say?
   - A. Fine, tensor-parallel exchanges are large, infrequent sends, so they tolerate the 50 GB/s fabric tier without hurting the step.
   - B. It works only at batch one, where each exchange payload is small enough that fabric latency stops being visible in the step.
   - C. Poor fit, TP exchanges are frequent and latency-sensitive; stepping from 900 GB/s NVLink to 50 GB/s IB (~18× down) puts a large communication share in every step.
   - D. Better, spreading TP across nodes removes the NVSwitch bottleneck, and the fabric link draws less power than the switch fabric.

5. HBM3 gives ~17× the bandwidth of socketed DDR5 at lower signaling energy per bit. Which packaging mechanism explains both advantages?
   - A. HBM stacks sit on an interposer millimeters from the logic with a very wide interface, short reach, thousands of lanes, low per-bit energy.
   - B. HBM uses a much faster signaling clock than DDR5, so each lane carries more bits per second at roughly similar per-transfer energy.
   - C. HBM compresses operands in transit between the stack and the logic die, trading a little compute for lower signaling energy per useful bit.
   - D. HBM places the DRAM stacks directly on top of the compute die in true 3D, eliminating the interposer and its wire energy entirely.

6. A facilities team provisions rack power for the ~500 W average GPU draw observed during training rather than the 700 W TDP. What breaks first?
   - A. Nothing, average draw is what electrical and cooling systems must dissipate; TDP is a burst-only rating that infrastructure never sees.
   - B. The voltage rail droops out of tolerance first, because average-based provisioning ignores how decoupling capacitance must be sized.
   - C. Thermal throttling lowers achieved MFU below plan, but breakers and cooling hold, average is the right budget for steady-state design.
   - D. Breakers trip when synchronized steps ramp the cluster >300 kW in a GW/s event, the fleet moves together, so the excursion, not the mean, is what the infrastructure must survive.

7. How many 80 GB accelerators are needed just to hold 175B parameters of weights, at FP16 (2 bytes/param)? Give a number.

8. Barroso and Hölzle's warehouse-scale computer thesis reframes an ML pod as 'a single computer that fills a room.' Which property makes that framing literal rather than rhetorical?
   - A. All nodes run one vendor's silicon and firmware, so the pod presents a uniform ISA to the scheduler like a single machine would.
   - B. The pod's aggregate ~9.9 EFLOP/s FP16 peak exceeds any single chip's by orders, which is what 'one computer' quantitatively means.
   - C. Components share fate and are engineered as one system, one synchronized program, a composite ~5 h MTBF, shared power/cooling/fabric, the way a laptop's parts are designed together, not a room of independent machines.
   - D. A pod fits inside one failure domain, so operators can reboot and reimage it atomically the way they reboot a single machine.

9. A four-node DGX H100 rack draws ~33.5 kW. Which heat-transfer property makes direct-to-chip liquid attractive at this density?
   - A. Water's specific heat is over four times air's per unit flow, ~0.01 L/s of water carries what tens of L/s of air would, a thousands-fold flow difference.
   - B. Liquid coolant boils on contact with the cold plate, carrying heat away as latent energy without needing pump-driven flow loops.
   - C. Liquid cooling is mainly an acoustic measure, the fans needed to move 33.5 kW of air would exceed the facility's noise limits for staff.
   - D. Copper cold plates conduct heat far better than air does, which alone explains the flow-rate reduction without invoking water's heat capacity.

10. Doubling a cluster from 1,024 to 2,048 GPUs cuts wall-clock training from 14 days to 10 days rather than 7. Which explanation is consistent with the chapter's scaling model?
    - A. Scaling efficiency declines with fleet size (measured ordering: 256 > 1,024 > 8,192 GPUs), so the second thousand GPUs buys less than the first, communication and coordination terms grow.
    - B. The larger cluster is power-throttled by the datacenter's fixed envelope, which caps achieved MFU at half the small-cluster value.
    - C. The extra 1,024 GPUs are reserved for checkpointing and failover duties and never contribute compute to the training step.
    - D. Per-replica batch was held fixed, so the global batch doubled and each step simply costs twice as much wall-clock to run.

11. Explain how relieving a constraint at one level of the stack can expose the next level's constraint, walk the chain accelerator → node → rack → pod.

## Answer key

1. A. The reticle limit (~26×33 mm) caps what one exposure can print, so B200-class parts are already two dies. The package must fuse them with a die-to-die interconnect faster than the off-chip fabric, otherwise the 'one chip' abstraction leaks.

2. B. At 1 FLOP/byte the job is ~295× under the ridge: the floor is bytes÷bandwidth. Doubling peak while holding bandwidth moves the ridge, not the token time, this is why serving upgrades should be priced in GB/s, not TFLOP/s.

3. 800 / 0.32 = 2,500 GPU-hours. Peak-rate estimates are optimistic by exactly 1/MFU; the booked number must come from the sustained rate, before any failure or maintenance overhead is added.

4. C. TP's small frequent exchanges are why it lives inside the chassis: on NVLink they cost under a millisecond each and the compute share stays ~89%; the same pattern over PCIe/IB can put ~47% of the step into communication. Frequent exchanges need the fast tier; rare large sends can cross it.

5. A. Bandwidth is baked into the package: DRAM dies stacked on a silicon interposer centimeters from the logic get a huge interface at tiny wire lengths, ~670 GB/s per stack at a fraction of DDR5's per-bit signaling energy. Neither can be retrofitted.

6. D. Synchronous training makes the whole fleet draw in phase: step boundaries are ramp events measured in GW/s. Provisioning at the mean is provisioning for a draw the system never actually makes, the same bug as sizing serving capacity for average latency.

7. 350 GB ÷ 80 GB = 4.4 → 5 devices. (The book walks the same count down at lower precision: INT8 → 3, INT4 → 2, precision is a capacity dial as much as a rate dial.)

8. C. The WSC claim is about co-design: the synchronous step makes 1,024 nodes one computer with a composite MTBF (~5 h), shared power sequencing, and a fabric engineered as its backplane. Treating it as 'more servers' misses that the parts' behaviors are coupled every step.

9. A. Specific heat per volume does the work: water carries over 4× the heat per unit flow of air, so ~170 L/min handles a GB200-class rack where air would need thousands-fold more volume. At ~86 W/cm² die flux, air simply can't reach the plate fast enough.

10. A. 1.4× speedup on 2× hardware ≈ 70% marginal efficiency, exactly the decay pattern the chapter models: communication and coordination terms don't shrink with N, so each added GPU contributes less. Fleet size is bought with diminishing returns, not in linear units.

11. Each level's fix hands the problem up. Feed the accelerator with more HBM bandwidth and the node's job becomes fitting the state (2.1 TB vs 640 GiB) and moving it on NVLink vs IB. Solve the node with TP8×PP8×DP16 and the rack's 33.5 kW heat and >300 kW ramp rates become the constraint, liquid cooling and TDP provisioning. Solve the rack and the pod inherits the composite: 7–10 MW of power sequencing, a ~5 h MTBF, and facility commissioning on the critical path. No wall disappears; the cheapest wall to relieve moves.
