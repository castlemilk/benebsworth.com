# MLSys study curriculum

Source of truth for the step-by-step read-through of *Machine Learning Systems*
(Vijay Janapa Reddi, Harvard CS249r: <https://mlsysbook.ai>, CC-BY-NC-SA 4.0).

Local source: `study/cs249r_book/books/<vol>/<NN_chapter>/` (gitignored sparse
clone; restore instructions in the `mlsys-study` skill). Each chapter dir holds:

- `NN_chapter.qmd`: chapter source
- `*_concepts.yml`: the book's own structured concept list
- `*_quizzes.json`: the book's own quiz bank
- `images/`: book figures (reference only; do not republish)

Regenerate this file when the book is updated (`git -C study/cs249r_book pull`):
the generator one-liner lives in `.agents/skills/mlsys-study/SKILL.md`.

Status legend: `·` unread → `P` packet → `R` reviewed → `Q` quizzed → `B` posted.
Live state is kept in `progress.md`; this file is the map, not the tracker.

## Volume I: Introduction to Machine Learning Systems (16 ch)

- [P] `vol1/01_introduction`: Introduction · *The AI Systems Moment; From Code-Defined Logic to Data-Defined Behavior; The Evolution of AI Bottlenecks; The Bitter Lesson; Defining ML Systems; When ML Systems Fail Silently; Iron Law of ML Systems; Three Dimensions of ML Efficiency; AI Engineering as a Discipline; Book Organization; Fallacies and Pitfalls; Summary*
- [P] `vol1/02_system_paradigms`: System Paradigms · *Four Deployment Regimes Across Nine Orders of Magnitude; Physical Constraints on Deployment; Analyzing Workloads; System Balance and Hardware; Cloud ML; Edge ML; Mobile ML; TinyML; Choosing a Deployment Paradigm; Hybrid Architectures; What Every Tier Shares; Fallacies and Pitfalls*
- [P] `vol1/03_ml_lifecycle`: ML Lifecycle · *The Lifecycle as a Loop; The Constraint Propagation Principle; Where the Hours Go; Stage Ownership and Hand-offs; Stages 1–6 (Problem Definition → Monitoring); Systems Thinking; Fallacies and Pitfalls*
- [ ] `vol1/04_data_engineering`: Data Engineering · *Data as Code; How Data Fails; Requirements and Data Budget; Acquisition; Ingestion and Validation; Labeling; Processing; Dataset Release; Physics of Data; Storage and Delivery; Operational Data Health*
- [ ] `vol1/05_nn_computation`: Neural Computation · *From Logic to Arithmetic; Computing with Patterns; NN Fundamentals; Learning Process; Inference Pipeline; Handwritten Digit Recognition; D·A·M Reading; Fallacies and Pitfalls*
- [ ] `vol1/06_nn_architectures`: Network Architectures · *Architectural Principles; MLPs; CNNs; Skip Connections and Normalization; RNNs; Attention; Transformers; Sparse Architectures / RecSys; Comparing Architectures; Fallacies and Pitfalls*
- [ ] `vol1/07_frameworks`: ML Frameworks · *Three Framework Problems; Evolution of Abstractions; Execution: Graphs to Kernels; Autodiff; Tensors/Devices/Ops; Modules; Anatomy of a Training Step; TF/PyTorch/JAX; Choosing a Framework*
- [ ] `vol1/08_training`: Model Training · *From One Step to a Training Run; Training-Time Law; Computation and Memory Costs; Pipeline Architecture; Identifying Bottlenecks; Pipeline Optimizations; Scaling Training Systems*
- [ ] `vol1/09_data_selection`: Data Selection · *The Data Wall; Measuring Data Value; Static Pruning; Dynamic Selection; Synthetic Data; Learning from Unlabeled Data; Selection Engineering; Cross-Layer Interactions*
- [ ] `vol1/10_model_compression`: Model Compression · *Fitting the Deployment Budget; Structural Optimization; Numerical Precision; Hardware Implementation; Choosing and Combining Techniques; Measuring Compression Gains*
- [ ] `vol1/11_hw_acceleration`: Hardware Acceleration · *Anatomy of an Accelerator; Hardware Specialization; Compute Primitives; Compute Units; Memory Systems; Performance Bounds; Hardware Mapping; Compilers and Runtimes; Beyond One Accelerator; Heterogeneous SoC*
- [ ] `vol1/12_benchmarking`: Benchmarking · *The Benchmark–Production Gap; Benchmark Carpentry; Granularity; Benchmark Suites; Training Benchmarks; Inference Benchmarks; Power and Energy Measurement; Best Practices; Model and Data Evaluation*
- [ ] `vol1/13_model_serving`: Model Serving · *The Serving Inversion; Serving Architecture; Request Lifecycle; Queuing Theory; Throughput Optimization; Runtime Selection; Node-Level Optimization; Model Loading and Versioning; LLM Serving; Economics and Planning*
- [ ] `vol1/14_ml_ops`: ML Operations · *Silent Failure in Production; Technical Debt; Development Infrastructure; Releasing Models; Production Monitoring; Retraining Decisions; Incident Response and Governance; Operational Maturity; Case Studies*
- [ ] `vol1/15_responsible_engr`: Responsible Engineering · *Responsibility as Systems Engineering; The Responsibility Gap; Across the Lifecycle; Environmental and Cost Awareness; Data Governance and Compliance*
- [ ] `vol1/16_conclusion`: Conclusion · *The System Is the Model; Lighthouse Models; Thirteen Quantitative Principles; The Dual Mandate; Future Directions; The Engineering Responsibility*

## Volume II: Scaling Machine Learning Systems, preview (17 ch)

- [ ] `vol2/01_introduction`: Introduction · *The Scale Moment; From Single Node to Fleet; AI Scaling Laws; Constraints of Scale; The C³ Taxonomy; The Fleet Stack and Lighthouse Archetypes*
- [ ] `vol2/02_compute_infrastructure`: Compute Infrastructure · *The Infrastructure Walls; The Accelerator; The Memory Wall; Sustained Compute and Precision; The Node; The Rack; The Pod; Accelerator Selection*
- [ ] `vol2/03_network_fabrics`: Network Fabrics
- [ ] `vol2/04_data_storage`: Data Storage
- [ ] `vol2/05_collective_communication`: Collective Communication
- [ ] `vol2/06_distributed_training`: Distributed Training
- [ ] `vol2/07_fault_tolerance`: Fault Tolerance
- [ ] `vol2/08_fleet_orchestration`: Fleet Orchestration
- [ ] `vol2/09_performance_engineering`: Performance Engineering
- [ ] `vol2/10_inference`: Inference at Scale
- [ ] `vol2/11_edge_intelligence`: Edge Intelligence
- [ ] `vol2/12_ops_scale`: Operations at Scale
- [ ] `vol2/13_security_privacy`: Security and Privacy
- [ ] `vol2/14_robust_ai`: Robust AI
- [ ] `vol2/15_sustainable_ai`: Sustainable AI
- [ ] `vol2/16_responsible_ai`: Responsible AI
- [ ] `vol2/17_conclusion`: Conclusion

## Volume III: Agentic ML Systems, in preparation (20 ch)

- [ ] `vol3/01_introduction`: Introduction
- [ ] `vol3/02_foundation_model`: The Foundation Model
- [ ] `vol3/03_test_time_compute`: Test-Time Compute
- [ ] `vol3/04_context_engineering`: Context Engineering
- [ ] `vol3/05_kv_cache`: KV Cache Management
- [ ] `vol3/06_long_term_memory`: Long-Term Memory
- [ ] `vol3/07_tool_calling`: Tool Calling
- [ ] `vol3/08_sandboxes`: Agent Sandboxes
- [ ] `vol3/09_security`: Agent Security
- [ ] `vol3/10_agent_harness`: The Agent Harness
- [ ] `vol3/11_durable_execution`: Durable Execution
- [ ] `vol3/12_failure_recovery`: Failure Recovery
- [ ] `vol3/13_evaluation`: Agent Evaluation
- [ ] `vol3/14_agent_operations`: Operating Agents
- [ ] `vol3/15_trajectory_curation`: Trajectory Curation
- [ ] `vol3/16_fine_tuning`: Trajectory Fine-Tuning
- [ ] `vol3/17_rlvr`: RL from Verifiable Rewards
- [ ] `vol3/18_multi_agent`: Multi-Agent Coordination
- [ ] `vol3/19_agent_economics`: Agent Economics
- [ ] `vol3/20_conclusion`: Conclusion

## Volume IV: Physical AI, in preparation (18 ch)

- [ ] `vol4/01_boundary`: The Causal Boundary
- [ ] `vol4/02_body`: The Physical Body
- [ ] `vol4/03_brain`: The Cognitive Brain
- [ ] `vol4/04_nervous`: The Nervous System
- [ ] `vol4/05_data`: Physical Data
- [ ] `vol4/06_training`: Policy Training
- [ ] `vol4/07_evaluation`: Closed-Loop Evaluation
- [ ] `vol4/08_perception`: Sensor Perception
- [ ] `vol4/09_memory`: Spatial Memory
- [ ] `vol4/10_intent`: Grounded Intent
- [ ] `vol4/11_planning`: Trajectory Planning
- [ ] `vol4/12_enforcement`: Safety Enforcement
- [ ] `vol4/13_placement`: Workload Placement
- [ ] `vol4/14_intervention`: Supervisory Intervention
- [ ] `vol4/15_verification`: Adversarial Verification
- [ ] `vol4/16_release`: Deployment Release
- [ ] `vol4/17_responsibility`: Responsible Physical AI
- [ ] `vol4/18_frontier`: Engineering Physical AI
