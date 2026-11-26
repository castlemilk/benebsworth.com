# Comparing the Model Compression and Hardware Acceleration packets

GPT-6.2 Sol drafted Chapter 10 and GPT-6.1 Terra drafted Chapter 11, both at max reasoning. Both authors used the same pinned book revision, `de87c010`, and the MLSys packet and diagram workflows. Terra could read Sol’s finished chapter. The two chapters cover different material. Sol’s first-pass observations come from its editorial review; Terra handed over a complete draft before the substantive revision request.

| Reader task | Sol · Model Compression | Terra · Hardware Acceleration |
|---|---|---|
| Make the opening decision | The camera’s 26 ms INT8 result makes speed attractive until night-cyclist recall falls to 93%. The 30 ms mixed candidate reaches 96%. | The same projection favours bandwidth at batch 1 and compute at batch 256. The draft states the precision, traffic boundary and work convention and distinguishes each modeled lower bound from measured time. |
| Check an assumption | Review added that precision and execution hardware change together. It also showed that the mixed candidate’s observed recall clears 95% while the lower confidence limit falls below it. | Recalculation confirmed both rankings and all four time floors. The endpoints hid a different question: the devices’ predicted rates cross at 100 FLOP/byte, between their individual ridges of 50 and 200. |
| Learn from a figure | Review turned the distillation table into a common-scale comparison of hard and soft targets. | The tile diagram already showed why 80 KiB fits and 128 KiB exceeds a 96 KiB store. The core roofline example initially relied on a table and endpoint bars. |
| Demonstrate understanding | The last numeric problem transfers the method to a new request. All six multiple-choice keys in the reviewed packet are the uniquely longest option. | Six of seven first-draft keys are the uniquely longest, and all seven sit in the first two positions. The initial tile question repeats the worked dimensions. |

Terra’s revision plots both rooflines on shared axes. The worked example now predicts the switch between batches 105 and 106. A replacement tile problem changes the width and adds 1 KiB of workspace. Double buffering uses the entire 96 KiB store, so the workspace changes the answer. Editorial review also replaced three implausible fusion distractors with competing explanations a profiler could distinguish. One of seven final keys is uniquely longest and all four option positions appear.

For another chapter, either author can supply a draft worth reviewing. Use a fresh example and a blind read of the answer choices to judge the exercise. Browser checks establish that a reader can reach an explanation and submit an answer. Retention and comprehension still need a learner’s responses.
