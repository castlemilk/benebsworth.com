# Kolibri self-test

Try each question before checking the answers.

1. Why is the active parameter count insufficient to size serving memory?
   - a. The entire weight pool may still need to be stored, sharded or fetched.
   - b. Only the selected experts exist after training.
   - c. Attention has no memory cost.
   - d. Active parameters always equal total parameters.

2. What does the hybrid attention pattern retain?
   - a. Full attention in every layer.
   - b. Periodic global attention, while most layers attend within a window.
   - c. A fixed KV cache for every layer at arbitrary context.
   - d. A guaranteed fourfold serving speedup.

3. Why compare decoded bytes per second across models?
   - a. It makes the evaluation independent of hardware.
   - b. It eliminates differences in benchmark difficulty.
   - c. Different tokenisers can represent the same text with different token counts.
   - d. It measures end-to-end cost for every deployment.

4. What does the HumanEval disclosure imply?
   - a. All published benchmarks are invalid.
   - b. Later-stage filtering erases pre-training exposure.
   - c. Memorised reference solutions can inflate HumanEval scores.
   - d. The model cannot write code.

5. Explain why a globally balanced expert load can still yield poor latency.

6. Explain what the reported Pareto frontier does and does not establish.

7. Using 3.46B active and 78.1B total parameters, estimate the active fraction.

8. Kolibri has 48 query heads and four KV heads. How many query heads share each KV head?

9. For 1,024 tokens, six routed choices per token and 384 experts, what is the even-load target? How far above target are 24 assignments?

10. A routing bias makes expert C enter the top six. What score determines how strongly its output contributes?

11. Four single-segment rollouts get rewards 1, 1, 0 and 0. What advantages do the generated tokens inherit?

12. Why can two batches with the same number of tokens have very different full-attention costs during supervised fine-tuning?

--- answer key ---

1. A. Sparse activation reduces computation per token, but the larger pool of weights must remain accessible.
2. B. The report uses 40 sliding-window and 10 full-attention layers. Full layers still have sequence-dependent costs.
3. C. Byte throughput makes the amount of decoded text more comparable across tokenisers, but still depends on the serving setup.
4. C. The authors observed recitation, making this benchmark less reliable evidence of generalisation.
5. Averages can conceal a heavily loaded device or microbatch; a synchronised step waits for its slowest work.
6. It describes quality and throughput relative to selected models and measured configurations, not every workload or hardware choice.
7. 3.46 / 78.1 is approximately 0.0443, or 4.4%. This parameter ratio is not a measured speedup.
8. Twelve. Each group of 48 / 4 query heads reads the same head’s keys and values.
9. The target is 6 × 1,024 / 384 = 16 assignments per expert. Twenty-four assignments are 50% above target.
10. The sigmoid of C’s raw logit determines its output weight. The bias affects selection, and the selected scores are used without renormalising them.
11. The mean reward is 0.5. Subtracting it gives +0.5, +0.5, −0.5 and −0.5 for the four attempts.
12. Packed conversations are masked from one another. Full-attention pairs within an individual conversation grow roughly with the square of its length, so one long conversation takes more work than several shorter conversations with the same total tokens.
