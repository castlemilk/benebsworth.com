# hosts: Marcus | Iris

A: I'm Marcus, and this is Iris. Picture a phone camera that flags cyclists. The full precision model catches most cyclists at night, but it misses the frame deadline. The fastest version makes the deadline and starts missing more cyclists. Which one would you put on the phone?
::fig[camera-release-gates]

B: Let's make that choice specific. The camera supplies thirty frames a second. We also require ninety-five percent of frames to finish within thirty-three point three milliseconds. Those are two checks. A busy pipeline can keep up with incoming frames while some individual frames still finish late.

A: Here's a fictional deployment exercise. Set a floor of ninety-eight percent overall accuracy and ninety-five percent recall for cyclists at night. Limit the peak working set to sixty-four mebibytes and mean energy to twelve millijoules per frame. Hold the phone, workload, and evaluation data fixed.

B: The full precision model on the CPU takes thirty-two milliseconds for inference. Everything around it takes ten, so the frame takes forty-two. It catches nine hundred and seventy of a thousand night cyclists. It has a good quality margin, and it spends more time and energy than the application can afford.

A: With eight-bit weights and activations on the phone's integer accelerator, the frame falls to twenty-six milliseconds. Overall accuracy still clears its floor. Night recall falls to ninety-three percent. If you looked only at speed and the headline accuracy, you'd ship that model.

B: There is a third candidate. Keep one sensitive block at sixteen-bit floating point, and run the rest in eight-bit integer. In our example that costs four additional milliseconds. The thirty-millisecond frame still makes the deadline, and night recall recovers to ninety-six percent. That is the one I would choose, given these results.

A: We assumed fixed stage times for this exercise so we could add them. On a real phone I'd timestamp every complete frame under sustained load, record the throughput separately, and check for throttling. Before we return to the choice, let's work through the ways we could have made each candidate.

B: Start with structure. Suppose a layer produces sixteen output channels, and we force four of them to zero. A dense convolution can still write sixteen channels, and the consumer can still read all sixteen. You get a smaller dense operation when you remove the channels and rewrite the consumers to take twelve.
::fig[pruning-addresses]

A: The revised dimensions still have to suit the machine. If the accelerator computes in blocks of sixteen, some of the nominal saving can disappear in padding. Unstructured pruning can help with a supported sparse layout, but then we also buy position metadata and some irregular memory access.
::fig[sparse-storage-cost]

B: Think of a sparse eight-bit matrix where every retained one-byte weight needs a two-byte column index. Even if you remove half the weights, each retained entry needs three bytes. You're already storing more than when the matrix was dense, before you pay for the row pointers.
::eq[sparse-break-even]

A: Low rank is another option. Take a matrix with a thousand and twenty-four rows and the same number of columns. Replace it with two factors that meet at rank one hundred and twenty-eight. You store a quarter as many weights. In the runtime trace, look for the intermediate vector and the extra launch.
::eq[low-rank-cost]

B: Or train a smaller student with a larger teacher's soft predictions. On a frame with a bicycle, the teacher might give some probability to a motorcycle and almost none to a bus. Those relative scores can help the student learn class relationships. Training pays for the teacher's answers, and the deployed graph contains the student.
::fig[distillation-probabilities]

A: The next lever is precision. Our camera has four million weights. At thirty-two bits that is sixteen megabytes of raw weights. At eight bits it is four megabytes. The mixed version keeps a quarter of the weights at sixteen bits, so it works out to five megabytes. Scales, packed formats, and temporary buffers still add to the physical cost.
::eq[weight-bytes]

B: A quantizer assigns values to a finite set of codes. Imagine eight codes from zero through seven. Calibrated between zero and seven, they represent values one unit apart. Stretch the same eight codes from zero to fourteen and they are two units apart. More of the outlier range fits. The common values land on a coarser grid.
::eq[affine-quantizer]

A: For a first experiment, keep the trained weights fixed and calibrate on representative inputs. Investigate night frames if that slice loses recall. They may create activation ranges your calibration set barely saw. If better calibration still misses the floor, keep precision where the errors concentrate or train with simulated quantization so the weights can adapt.
::fig[calibration-grid]

B: The same drop in precision can have a different purpose on another workload. For the camera, the integer accelerator speeds the arithmetic its operators actually use. For batch-one language model decode, each token may spend most of its time waiting for weights from memory. In that case packing weights can reduce the traffic that sets the pace.

A: Take a hypothetical decoder with one and a half billion weights. At sixteen bits, it streams three gigabytes of weights per token. Packed four-bit weights would be three quarters of a gigabyte. At this context length, assume another three tenths of a gigabyte of key and value cache traffic every token. At fifty gigabytes per second, the idealized transfer floor drops from sixty-six milliseconds to twenty-one.
::eq[decode-lower-bound]

B: That is about three times faster on the memory term, even though the weights alone shrank fourfold. And the runtime still has to unpack those four-bit weights. If it writes a full floating point copy to memory and then reads it for the multiplication, the extra trip can give back the whole saving. A fused kernel can unpack small tiles on-chip as it consumes them.
::fig[dequantization-traffic]

A: Fusion also helps when two adjacent camera operators keep handing off the same activation. Once the graph is stable, the compiler may fold inference batch normalization into convolution weights and keep the activation close to the execution unit through the next operation. Check which graph the compiler actually lowers.
::eq[fusion-traffic]

B: If we change the model's shapes first, then use a teacher to recover quality, and finally calibrate, we calibrate the graph we intend to ship. If we then alter the graph, we collect new ranges. A factor of two from cutting weights and a factor of four from using fewer bits multiply into an eightfold raw payload reduction. For a speed estimate, we need the new kernels and a fresh profile.

A: Here's one final profile. Say an application takes forty milliseconds per request and only eight of those are inside the model. Halving the model time takes the request to thirty-six milliseconds. Even a model that finished instantly would leave thirty-two milliseconds. Start measuring at the point where the user starts waiting.
::eq[amdahl]

B: So I would bring the whole set of evidence back to the camera. Try the same input frames on each compiled candidate, include the host stages, and record where the hardware falls back. Compare artifact size, peak working set, sustained throughput, tail latency, and energy per frame. Keep the calibration inputs out of the held-out quality check.
::fig[camera-release-gates]

A: Then open up that single overall accuracy number. On a thousand held-out cyclists at night, the eight-bit candidate misses seventy, the mixed candidate misses forty, and the full precision baseline misses thirty. We can afford at most fifty misses. This is the gate that changes the decision.

B: On this phone and this workload the mixed candidate has room under all the gates. Put those margins next to the compiled artifact so somebody can repeat the test. The next chapter looks inside the accelerator, where the cost of moving a value and the shape of the operations decide how much of the paper saving can reach the application.
