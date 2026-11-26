# Kolibri sources

- The 189-page vendor edition is the source for PDF page numbers and figure crops. Sections 2–4 and appendices A, B, D, G, H and I underpin the study. [Aleph Alpha technical report](https://aleph-alpha.com/downloads/tech-report.pdf)
- The HTML edition corroborates the architecture and carries the paper’s licence in the arXiv record. [ArXiv paper record](https://arxiv.org/abs/2610.31945) · [HTML edition](https://arxiv.org/html/2610.31945v1)
- The checkpoint settings confirm the 513-slot window, 50-layer pattern, head counts, untied embeddings and expert dimensions. [Released configuration](https://huggingface.co/Aleph-Alpha/Kolibri-1/blob/main/config.json)
- The model card documents the hardware guidance, evaluated context limit, weight licence and approximate data mix. The study records differences between its figures and §2.3.2 and §2.1.6 of the report. [Model card](https://huggingface.co/Aleph-Alpha/Kolibri-1)
- The authors trace benchmark contamination to pre-training and explain the evidence for HumanEval reference recitation. [Contamination analysis](https://aleph-alpha.com/en/blog/generalization-or-memorization-what-contaminated-training-data-does-to-benchmark-scores/)

The memory and parameter examples are derived estimates, and the routing and rollout examples use invented inputs. Reported performance results come from the authors’ experiments.

## Performance figures checked 2026-11-21

- The checkpoint comparison plots four published rows. The SFT and release sampling settings differ. [Table 25](https://arxiv.org/html/2610.31945v1#Pt3.S2.T25)
- The context chart plots the 128k–1M base-model RULER rows for Kolibri, Nemotron 3 Nano and Qwen3.5 35B-A3B. The assistant reasoning-mode results come from a separate experiment. [Table 18](https://arxiv.org/html/2610.31945v1#Pt2.S4.T18) · [Figure 65](https://arxiv.org/html/2610.31945v1#A7.F65)
- The speed figure visualises the two ratios printed in Figure 1. Appendix A gives the vLLM setup and the tokeniser-derived byte conversion. [Figure 1](https://arxiv.org/html/2610.31945v1#Pt0.S0.F1) · [Appendix A](https://arxiv.org/html/2610.31945v1#A1)
- The English and German aggregates, peer benchmarks and in-house retrieval proxies use the report’s protocol. [§3.3](https://arxiv.org/html/2610.31945v1#Pt3.S3) · [Table 29](https://arxiv.org/html/2610.31945v1#Pt3.S3.T29)
