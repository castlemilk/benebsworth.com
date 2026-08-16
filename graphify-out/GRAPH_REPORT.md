# Graph Report - benebsworth.com  (2026-08-16)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3469 nodes · 7461 edges · 241 communities (187 shown, 54 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `df0c5f66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- site-nav.tsx
- circuit-canvas.tsx
- pipeline.mjs
- llm-benchmark/page.tsx
- layout.ts
- mdx-components.tsx
- lab/types.ts
- [category]/[task]/page.tsx
- icons.tsx
- memory-chip-ecosystem.tsx
- breadcrumbLd
- physics.ts
- circuit-sim-page.tsx
- prose-lint.mjs
- cost-dashboard/page.tsx
- neural-graph.tsx
- grid-nav.tsx
- renderOgCard
- cn
- devices.ts
- Circuit
- render-diagram.py
- catalog.ts
- validator.ts
- lab/registry.ts
- circuit-studio.tsx
- storage-engine-sim.tsx
- behavioral.ts
- demos/index.ts
- inline-dependencies.ts
- gcs.ts
- journey-map.tsx
- circuit-sim/types.ts
- generated-demo.tsx
- EffectModule
- universe-scale-studio.tsx
- provider.ts
- compilerOptions
- metaball-bloom.ts
- softmax-lab.tsx
- blog-content.tsx
- hike-gallery.tsx
- scripts
- useInViewport
- hash-table-demo.tsx
- hr-diagram.ts
- universe-scale/gl/scene.ts
- llm-benchmark/types.ts
- components.json
- sampling-data.ts
- og.tsx
- devDependencies
- denoising-planner.tsx
- skill-provenance.ts
- memory-chip-knowledge-graph.ts
- scope-canvas.tsx
- admin-context.tsx
- blog/[slug]/page.tsx
- memory-chip-ecosystem.ts
- surface-code-lattice.tsx
- gen-harness-eval.mjs
- lib/content.ts
- gen/content.ts
- ac.ts
- scorers/index.ts
- fine-tuning.ts
- gradient-descent.ts
- attention-cost-curve.tsx
- istio-flows.tsx
- primitives.tsx
- zoo-mini-map.tsx
- provider.test.ts
- phase-portrait.ts
- cache.ts
- pathfinding.ts
- dct-block.tsx
- game-of-life.tsx
- hike-annotate/package.json
- gen-md-siblings.mjs
- delta-memory.tsx
- holographic-reduction.tsx
- harness.test.ts
- hiking/[slug]/page.tsx
- layout.tsx
- cmb-sky.ts
- rotation-curve.ts
- entropy-mixing.tsx
- schwarzschild-calculator.tsx
- PortraitHero
- conformal-grid.ts
- gravitational-lensing.ts
- neural-boundary.ts
- reaction-diffusion.ts
- rlc-resonance.ts
- deepspec-architecture.tsx
- MemoryKnowledgeGraph
- mode-collapse-strip.tsx
- moe-block.tsx
- dependencies
- projects/[slug]/opengraph-image.tsx
- k-means.ts
- spirograph-rose.ts
- compute-scaling.tsx
- stages.tsx
- site-search.tsx
- moonshot.ts
- AboutPage
- hiking/[slug]/opengraph-image.tsx
- double-pendulum.ts
- gw-chirp.ts
- kinetic-gas.ts
- voronoi-bloom.ts
- cost-race.tsx
- deepspec-eli5-flow.tsx
- landmark.tsx
- kv-cache-compressor.tsx
- kv-context-histogram.tsx
- kv-quant-dial.tsx
- selective-scan.tsx
- nested-universes.tsx
- package.json
- backfill-failure-reasons.mjs
- am-modulation.ts
- black-hole.ts
- cosmic-expansion.ts
- exoplanet-transit.ts
- eye-diagram.ts
- fourier-series.ts
- inverse-kinematics.ts
- ising-model.ts
- random-walk.ts
- self-attention.ts
- spacetime-curvature.ts
- attn-res-depth.tsx
- ffn-step.tsx
- kv-ablation-ledger.tsx
- manifest.ts
- EffectCanvas
- band-structure.ts
- bloch-sphere.ts
- bode-plotter.ts
- constellation-plot.ts
- logistic-bifurcation.ts
- pid-tuner.ts
- pole-zero.ts
- compute-graph.tsx
- embedding-space.tsx
- equation.tsx
- useMeasuredGraphGroupBounds
- prompts.ts
- merge-benchmark-results.mjs
- halftone-hero.tsx
- image-picker.tsx
- wave-superposition.ts
- mdx-content.tsx
- seed-mock-results.mjs
- trail-summary.tsx
- GraphForceEdge
- positional-encoder.tsx
- capture-lab-poster.mjs
- gen-hero.mjs
- GraphEdgeRow
- content-expansion.spec.ts
- next.config.mjs
- capture-benchmark-screenshots.mjs
- @base-ui/react
- @bufbuild/buf
- class-variance-authority
- clsx
- prose-content.spec.ts
- eslint-plugin-react
- eslint-plugin-react-hooks
- exifr
- pre-commit
- pre-push
- gray-matter
- katex
- lucide-react
- @mdx-js/loader
- @mdx-js/react
- next-themes
- @next/third-parties
- next
- ogl
- react-dom
- rehype-autolink-headings
- rehype-katex
- rehype-pretty-code
- rehype-slug
- remark-gfm
- remark-math
- shadcn
- shiki
- tailwind-merge
- @tailwindcss/typography
- tw-animate-css
- @playwright/test
- serve
- species.tsx
- @tailwindcss/postcss
- @testing-library/react
- ts-proto
- tsx
- @types/node
- @types/react
- @types/react-dom
- typescript
- @vitejs/plugin-react
- vitest
- wrangler
- build-archive.sh
- deploy.sh
- deploy-pages.sh
- halftone_build.py
- galton-board.tsx
- @eslint/js

## God Nodes (most connected - your core abstractions)
1. `cn()` - 66 edges
2. `EffectModule` - 63 edges
3. `Params` - 60 edges
4. `ControlSpec` - 59 edges
5. `breadcrumbLd()` - 51 edges
6. `useInViewport()` - 41 edges
7. `SiteNav()` - 40 edges
8. `Breadcrumb()` - 39 edges
9. `SiteFooter()` - 39 edges
10. `.next` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Props` --references--> `ComponentType`  [EXTRACTED]
  components/lab/circuit-sim/component-palette.tsx → lib/lab/circuit-sim/types.ts
- `generateStaticParams()` --calls--> `getAllProjects()`  [EXTRACTED]
  app/projects/[slug]/opengraph-image.tsx → lib/content.ts
- `ContourMotif()` --calls--> `cn()`  [EXTRACTED]
  components/mdx/trailkit/primitives.tsx → lib/utils.ts
- `BenchmarkTaskPage()` --indirect_call--> `stripOutput()`  [INFERRED]
  app/lab/llm-benchmark/[category]/[task]/page.tsx → lib/lab/llm-benchmark/results.ts
- `generateStaticParams()` --calls--> `getPublishedPosts()`  [EXTRACTED]
  app/blog/[slug]/opengraph-image.tsx → lib/content.ts

## Import Cycles
- None detected.

## Communities (241 total, 54 thin omitted)

### Community 0 - "site-nav.tsx"
Cohesion: 0.07
Nodes (40): ACCENT, ISSUER_META, ISSUER_ORDER, metadata, metadata, metadata, metadata, metadata (+32 more)

### Community 1 - "circuit-canvas.tsx"
Cohesion: 0.06
Nodes (71): CircuitCanvas(), distToSegment(), drawDcOverlay(), drawProbeMarker(), drawValueChip(), formatAmps(), formatVolts(), nodeHint() (+63 more)

### Community 2 - "pipeline.mjs"
Cohesion: 0.05
Nodes (65): args, byWp, stamp, t0, pexec, server, ctx, lat (+57 more)

### Community 3 - "llm-benchmark/page.tsx"
Cohesion: 0.06
Nodes (59): LlmBenchmarkPage(), metadata, OG_IMAGE, dynamic, GET(), dynamic, sitemap(), BENCH_ACCENT (+51 more)

### Community 4 - "layout.ts"
Cohesion: 0.05
Nodes (45): ARCH_ASYNC, ARCH_AUTH, ARCH_CONN, ARCH_DOT, BOTTOM_PAD, FLOW_CONN, FLOW_DOT, FLOW_NODE_FILL (+37 more)

### Community 5 - "mdx-components.tsx"
Cohesion: 0.05
Nodes (64): Figure(), PullQuote(), Stat(), StatGroup(), Policy, AiMemorySizer, AttentionHeatmap, ColorLegend (+56 more)

### Community 6 - "lab/types.ts"
Cohesion: 0.05
Nodes (45): Controls(), Props, Props, EffectPlaygroundInner(), BoidsFlocking, controls, defaults, controls (+37 more)

### Community 7 - "[category]/[task]/page.tsx"
Cohesion: 0.08
Nodes (49): BenchmarkCategoryPage(), generateMetadata(), BenchmarkTaskPage(), generateMetadata(), statusClass(), generateMetadata(), ModelDetailPage(), statusClass() (+41 more)

### Community 8 - "icons.tsx"
Cohesion: 0.12
Nodes (10): AscentIcon(), BootIcon(), DurationIcon(), ExposureIcon(), IconProps, SeasonIcon(), StarIcon(), DELTA_LABEL (+2 more)

### Community 9 - "memory-chip-ecosystem.tsx"
Cohesion: 0.03
Nodes (42): AI_PRESETS, CAPEX_EDGE_IDS, EDGE_COLORS, EVIDENCE_STYLES, FINANCIAL_CANVAS_EDGE_IDS, fmt, FORCE_GRAPH_EDGES, FORCE_GRAPH_NODES (+34 more)

### Community 10 - "breadcrumbLd"
Cohesion: 0.06
Nodes (46): BlogPage(), HikingPage(), BlackHoleSimPageRoute(), CircuitSimPageRoute(), formatDuration(), formatTokens(), metadata, ModelsIndexPage() (+38 more)

### Community 11 - "physics.ts"
Cohesion: 0.07
Nodes (46): BlackHoleStudio(), Quality, BlackHoleGL, BlackHoleParams, compile(), createBlackHoleGL(), FOV_TAN, UniformName (+38 more)

### Community 12 - "circuit-sim-page.tsx"
Cohesion: 0.08
Nodes (39): CircuitSimPage(), AnalysisPanel(), GalleryDialog(), Props, Tab, ShinyText(), ShinyTextProps, StarBorder() (+31 more)

### Community 13 - "prose-lint.mjs"
Cohesion: 0.09
Nodes (45): root, expandPath(), manifest, parseArgs(), printTable(), resolveExplicit(), root, run() (+37 more)

### Community 14 - "cost-dashboard/page.tsx"
Cohesion: 0.08
Nodes (34): CostDashboardPage(), ExpensiveTasksTable(), metadata, PerComplexityTable(), PerModelTable(), PerSuiteTable(), formatDuration(), formatTokens() (+26 more)

### Community 15 - "neural-graph.tsx"
Cohesion: 0.10
Nodes (35): ENTRIES, LegendEntry, FigureLegend(), NodeTooltip(), SwatchSVG(), NeuralGraph(), NeuralGraphProps, SPEED_OPTIONS (+27 more)

### Community 16 - "grid-nav.tsx"
Cohesion: 0.07
Nodes (32): HomeEmbed(), homeEmbedSlug(), ArtifactTile(), fitLine(), Props, ARTIFACTS, CASCADE, COLOR (+24 more)

### Community 17 - "renderOgCard"
Cohesion: 0.06
Nodes (38): alt, contentType, dynamic, Image(), size, alt, contentType, dynamic (+30 more)

### Community 18 - "cn"
Cohesion: 0.08
Nodes (31): BlogFilter(), BlogFilterItem, TableOfContents(), CategoryNav(), CategoryNavItem, IterationChecks(), MetricCard(), SortHeader() (+23 more)

### Community 19 - "devices.ts"
Cohesion: 0.10
Nodes (32): D_GMIN, D_IS, D_N, D_VT, DC_STAMPS, pnjlim(), stampCapacitorTransient(), stampConductance() (+24 more)

### Community 20 - "Circuit"
Cohesion: 0.12
Nodes (25): SolveEnv, checkKCL(), checkKVL(), checkPowerConservation(), checkRCTransient(), fuzzKCL(), generateRandomCircuit(), resistorPower() (+17 more)

### Community 21 - "render-diagram.py"
Cohesion: 0.09
Nodes (20): char_w(), Edge, esc(), find_back_edges(), fmt(), geometry(), Group, Layout (+12 more)

### Community 22 - "catalog.ts"
Cohesion: 0.12
Nodes (39): BLACK, blobModel(), circle(), COL, darken(), dotCloud(), drawAnt(), DrawArgs (+31 more)

### Community 23 - "validator.ts"
Cohesion: 0.10
Nodes (25): DT_PRESETS, DURATION_PRESETS, Props, Toolbar(), componentNodes(), AdjacencyOptions, assertDC(), assertTransient() (+17 more)

### Community 24 - "lab/registry.ts"
Cohesion: 0.11
Nodes (29): generateMetadata(), EffectPlayground(), LabCard(), CATEGORY_ACCENT, catMeta(), LabCardLink(), LabContent(), LabMatrix() (+21 more)

### Community 25 - "circuit-studio.tsx"
Cohesion: 0.07
Nodes (29): DRAG_MIME, CircuitStudio(), clamp(), DT_PRESETS, DURATION_PRESETS, fmtTime(), KEY_TYPES, Props (+21 more)

### Community 26 - "storage-engine-sim.tsx"
Cohesion: 0.10
Nodes (31): Amp, BInsertResult, BLayout, BNode, btreeAmp(), btreeHeight(), btreeInsert(), btreeKeyCount() (+23 more)

### Community 27 - "behavioral.ts"
Cohesion: 0.09
Nodes (27): BehavioralScoreOptions, BehavioralScoreResult, scoreBehavioral(), scoreWithBreakdown(), CHECKS_BY_TASK, circuitChecks, getChecksForTask(), landingPageChecks (+19 more)

### Community 28 - "demos/index.ts"
Cohesion: 0.10
Nodes (23): CircuitBuilderTeaserDemo(), CryptoHashRaceDemo(), PRESETS, DemoFrame(), DemoFrameProps, BenchmarkDemo(), DEMO_COMPONENTS, EquationSolverDemo() (+15 more)

### Community 29 - "inline-dependencies.ts"
Cohesion: 0.09
Nodes (30): ADDON_IMPORT_TO_SCRIPT, buildUrlMap(), DependencyRewriteResult, detectReactUsage(), detectThreeUsage(), ensureReactGlobals(), ensureThreeGlobals(), fetchCache (+22 more)

### Community 30 - "gcs.ts"
Cohesion: 0.14
Nodes (28): useAdmin(), AdminShell(), keyOf(), HikeJourney(), emptyManifest(), encode(), listExistingManifests(), loadLibrary() (+20 more)

### Community 31 - "journey-map.tsx"
Cohesion: 0.13
Nodes (24): HikeCard(), buildProfile(), PAD_BOT, PAD_TOP, PAD_X, peakIndex(), project(), smoothPath() (+16 more)

### Community 32 - "circuit-sim/types.ts"
Cohesion: 0.14
Nodes (28): Props, BodeCanvas(), DECADE_OPTIONS, fmtHz(), Props, Props, Props, ProbeManager() (+20 more)

### Community 33 - "generated-demo.tsx"
Cohesion: 0.10
Nodes (20): GeneratedDemo(), run(), HTML_CATEGORIES, isHtmlRunnable(), LoadState, ArtifactFrame(), ArtifactFrameInner(), run() (+12 more)

### Community 34 - "EffectModule"
Cohesion: 0.06
Nodes (21): controls, coupledOscillators, defaults, controls, cyclicAutomaton, defaults, NEIGHBORS, holographicBound (+13 more)

### Community 35 - "universe-scale-studio.tsx"
Cohesion: 0.11
Nodes (28): UniverseGL, focusFor(), JUMPS, logToInitial(), MARKERS, UniverseScaleStudio(), UniverseScale(), UniverseScaleStudio (+20 more)

### Community 36 - "provider.ts"
Cohesion: 0.12
Nodes (25): AgyConfig, generateAgy(), AnthropicConfig, generateAnthropic(), GenerationResponse, CodexConfig, generateGoogle(), GenerationResponse (+17 more)

### Community 37 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, ES2022, legacy, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 38 - "metaball-bloom.ts"
Cohesion: 0.08
Nodes (21): controls, defaults, dotLattice, controls, defaults, flowField, controls, defaults (+13 more)

### Community 39 - "softmax-lab.tsx"
Cohesion: 0.13
Nodes (25): attendsTo(), attentionMatrix(), D_K, DEFAULT_SCALE, RAW_SCORES, rawRow(), SCALE_MAX, SCALE_MIN (+17 more)

### Community 40 - "blog-content.tsx"
Cohesion: 0.18
Nodes (18): Home(), metadata, BlogContent(), TOPIC_ACCENT_REVERSE, topicKey(), BlogPostCard(), RelatedPosts(), TopicMarker() (+10 more)

### Community 41 - "hike-gallery.tsx"
Cohesion: 0.18
Nodes (19): chooseFiles(), ItemEditor(), Slot(), LibraryView(), BlogGallery(), aspectOf(), GalleryTile(), HikeGallery() (+11 more)

### Community 42 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, benchmark:run, build, build:archive, deploy:aws:next, deploy:aws:prod, deploy:next, deploy:pages:next (+17 more)

### Community 43 - "useInViewport"
Cohesion: 0.08
Nodes (35): alphaBars(), DiffusionLoop(), makeNoiseField(), makeSmiley(), mulberry32(), NoiseSchedule(), reducedMotion(), ParallelismRace() (+27 more)

### Community 44 - "hash-table-demo.tsx"
Cohesion: 0.21
Nodes (11): djb2(), emptySlots(), HashTableDemo(), overLoad(), PRESET_KEYS, probeSequence(), RANDOM_POOL, Slot (+3 more)

### Community 45 - "hr-diagram.ts"
Cohesion: 0.13
Nodes (17): BgStar, buildPopulation(), buildTrack(), controls, defaults, hrDiagram, LOG_T_COOL, LOG_T_HOT (+9 more)

### Community 46 - "universe-scale/gl/scene.ts"
Cohesion: 0.15
Nodes (21): blobData(), C, createUniverseGL(), buildSpec(), galaxyData(), helixData(), MeshPart, ObjSpec (+13 more)

### Community 47 - "llm-benchmark/types.ts"
Cohesion: 0.21
Nodes (16): CliRunnerConfig, estimateTokensFromChars(), extractLikelyCode(), fileArtifactSuffix(), generateFromCli(), GenerationResponse, runCli(), FULL_COMPONENT (+8 more)

### Community 48 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 49 - "sampling-data.ts"
Cohesion: 0.18
Nodes (19): applyTopK(), applyTopP(), CANDIDATES, LOGITS, sampleDistribution(), sampleIndex(), softmaxTemp(), STEM (+11 more)

### Community 50 - "og.tsx"
Cohesion: 0.15
Nodes (17): alt, contentType, dynamic, generateStaticParams(), Image(), size, alt, contentType (+9 more)

### Community 51 - "devDependencies"
Cohesion: 0.10
Nodes (21): autoprefixer, eslint, globals, jsdom, @next/eslint-plugin-next, devDependencies, autoprefixer, eslint (+13 more)

### Community 52 - "denoising-planner.tsx"
Cohesion: 0.15
Nodes (19): alphaBars(), buildSamples(), clearanceAt(), DenoisingPlanner(), EXPERT_LOWER, EXPERT_UPPER, GOAL, hexToRgb() (+11 more)

### Community 53 - "skill-provenance.ts"
Cohesion: 0.16
Nodes (19): about, SKILL_META, timeline, About, SkillSource, TimelineEntry, ALIAS, buildIndex() (+11 more)

### Community 54 - "memory-chip-knowledge-graph.ts"
Cohesion: 0.13
Nodes (18): buildCompanyProfile(), buildSankeyFlows(), byId(), CompanyProfile, confidenceRank, findTraversalPath(), GraphConfidence, GraphEdge (+10 more)

### Community 55 - "scope-canvas.tsx"
Cohesion: 0.17
Nodes (16): ChannelLegend(), chrono(), CursorId, Cursors, drawCursors(), drawGraticule(), formatA(), formatHz() (+8 more)

### Community 56 - "admin-context.tsx"
Cohesion: 0.15
Nodes (15): AdminPage(), metadata, Admin, AdminProvider(), Ctx, TokenClient, TokenClientError, TokenResponse (+7 more)

### Community 57 - "blog/[slug]/page.tsx"
Cohesion: 0.19
Nodes (12): generateMetadata(), PostPage(), AuthorBio(), KeyTakeaways(), MobileToc(), RelatedLabs(), hikeForGuide(), getPost() (+4 more)

### Community 58 - "memory-chip-ecosystem.ts"
Cohesion: 0.13
Nodes (16): AiMemorySizer(), DramRefreshCell(), MemoryMarketBars(), MemoryPackagingTradeoff(), AiMemoryFootprint, AiMemoryInput, BandwidthInput, BandwidthResult (+8 more)

### Community 59 - "surface-code-lattice.tsx"
Cohesion: 0.16
Nodes (18): anticommutes(), boundaryDist(), buildLattice(), correctionFlips(), DataQubit, Distance, ErrType, Lattice (+10 more)

### Community 60 - "gen-harness-eval.mjs"
Cohesion: 0.12
Nodes (14): allTasks, benchmarkReports, buildModelSummaries(), CONSENSUS_COMPONENT_PRICING, estimateCostUsd(), extractTaskResults(), LIB_OUT, modelEvalReports (+6 more)

### Community 61 - "lib/content.ts"
Cohesion: 0.18
Nodes (14): generateStaticParams(), dynamic, escapeXml(), GET(), RFC-822, BLOG_DIR, getAllPosts(), getLatestPost() (+6 more)

### Community 62 - "gen/content.ts"
Cohesion: 0.14
Nodes (13): KIND_GLYPH, SkillCard(), SkillMarquee(), BlogPost, Certification, LabCategory, LabEffect, Link (+5 more)

### Community 63 - "ac.ts"
Cohesion: 0.21
Nodes (14): acPointAtNode(), acSweep(), BodeChannel, DEFAULT_OPTIONS, logFreqs(), makeCircuit(), rcLowPass(), cabs() (+6 more)

### Community 64 - "scorers/index.ts"
Cohesion: 0.18
Nodes (10): behavioralScorer, hasBalancedTag(), htmlScorer, tagCounts(), HTML_CATEGORIES, selectScorer(), EQUATION_SOLUTION_PAIRS, TASK_PATTERNS (+2 more)

### Community 65 - "fine-tuning.ts"
Cohesion: 0.17
Nodes (13): band(), clamp(), controls, defaults, drawRadialArrows(), drawUniverse(), fineTuning, roundRect() (+5 more)

### Community 66 - "gradient-descent.ts"
Cohesion: 0.15
Nodes (14): Ball, bowl(), BUMPS, bumpy(), controls, defaults, gradientDescent, Landscape (+6 more)

### Community 67 - "attention-cost-curve.tsx"
Cohesion: 0.23
Nodes (14): AttentionCostCurve(), linearPath, Marker, MARKERS, quadPath, sampleCurve(), SUP, tooltipStyle() (+6 more)

### Community 68 - "istio-flows.tsx"
Cohesion: 0.17
Nodes (10): FlowDiagram(), FlowDiagramProps, FlowLayer, FlowStep, InlineProse(), parseBlocks(), renderInline(), egressAdvancedSteps (+2 more)

### Community 69 - "primitives.tsx"
Cohesion: 0.13
Nodes (15): Gear(), GearList(), GearProps, GROUP_LABEL, GROUP_ORDER, PackIcon(), accentStyle(), ContourMotif() (+7 more)

### Community 70 - "zoo-mini-map.tsx"
Cohesion: 0.13
Nodes (7): Arch, BUILDERS, COLOURS, EdgeXY, NodeXY, ORDER, TARGET_ID

### Community 71 - "provider.test.ts"
Cohesion: 0.22
Nodes (14): classifyFailureReason(), createProviderRunner(), extractStatus(), generateOne(), isQuotaError(), isRateLimitError(), isTimeoutError(), isTransientError() (+6 more)

### Community 72 - "phase-portrait.ts"
Cohesion: 0.14
Nodes (9): controls, defaults, DUF_BOUNDS, DUF_ICS, LV_BOUNDS, LV_ICS, phasePortrait, VDP_BOUNDS (+1 more)

### Community 73 - "cache.ts"
Cohesion: 0.24
Nodes (13): buildCacheKey(), CACHE_FILE, CachedResponse, CacheEntry, clearCache(), entries, flush(), getCachedResponse() (+5 more)

### Community 74 - "pathfinding.ts"
Cohesion: 0.15
Nodes (6): controls, defaults, MinHeap, N4, N8, pathfinding

### Community 75 - "dct-block.tsx"
Cohesion: 0.26
Nodes (12): Block, C(), coeffFill(), cosT, DctBlock(), forwardDct(), grayFill(), inverseDct() (+4 more)

### Community 76 - "game-of-life.tsx"
Cohesion: 0.27
Nodes (12): countPop(), GameOfLife(), idx(), Palette, PatternName, PATTERNS, randomGrid(), reducedMotion() (+4 more)

### Community 77 - "hike-annotate/package.json"
Cohesion: 0.15
Nodes (12): @modelcontextprotocol/sdk, bin, hike-annotate, dependencies, @modelcontextprotocol/sdk, zod, description, name (+4 more)

### Community 78 - "gen-md-siblings.mjs"
Cohesion: 0.18
Nodes (12): absolutiseImages(), CHECK_ONLY, COMPONENT_DESCRIPTIONS, OUT, processPost(), NOTE: LabCanvas / LabSide are described further down (near PllDiagram) —, ROOT, skipped (+4 more)

### Community 79 - "delta-memory.tsx"
Cohesion: 0.27
Nodes (11): applyWrite(), basis(), close(), DeltaMemory(), fmt(), Mode, query(), SUB (+3 more)

### Community 80 - "holographic-reduction.tsx"
Cohesion: 0.27
Nodes (7): clamp01(), fmtBig(), fmtLengthMeters(), HolographicReduction(), sub(), sup(), SUPER

### Community 81 - "harness.test.ts"
Cohesion: 0.18
Nodes (8): ModelReliability, estimateCost(), model, task, aggregateRuns(), IterationRun, BenchmarkFailureReason, BenchmarkRunner

### Community 82 - "hiking/[slug]/page.tsx"
Cohesion: 0.29
Nodes (8): generateMetadata(), HikePage(), hikeLd(), completedHikes, getHike(), guideForHike(), HIKE_GUIDE, plannedHikes

### Community 83 - "layout.tsx"
Cohesion: 0.22
Nodes (7): display, metadata, mono, sans, viewport, Analytics(), ThemeProvider()

### Community 84 - "cmb-sky.ts"
Cohesion: 0.20
Nodes (6): cmbSky, controls, ControlSpec, defaults, firstPeakL(), spectrumDl()

### Community 85 - "rotation-curve.ts"
Cohesion: 0.24
Nodes (7): controls, defaults, discMassFraction(), rotationCurve, vDiscSq(), vHaloSq(), vTotal()

### Community 86 - "entropy-mixing.tsx"
Cohesion: 0.33
Nodes (10): computeReadout(), EntropyMixing(), makeSeparated(), mulberry32(), Particle, Readout, reducedMotion(), stepUntilMixed() (+2 more)

### Community 87 - "schwarzschild-calculator.tsx"
Cohesion: 0.36
Nodes (10): formatLength(), formatMass(), formatRatio(), formatSci(), Preset, PRESETS, SchwarzschildCalculator(), schwarzschildRadius() (+2 more)

### Community 88 - "PortraitHero"
Cohesion: 0.33
Nodes (8): PortraitHero(), coverRect(), ensureLoop(), loop(), onLeave(), onMove(), renderFrame(), stamp()

### Community 89 - "conformal-grid.ts"
Cohesion: 0.29
Nodes (8): applyMap(), conformalGrid, controls, defaults, exponentialMap(), inversionMap(), joukowskiMap(), powerMap()

### Community 90 - "gravitational-lensing.ts"
Cohesion: 0.20
Nodes (6): controls, defaults, GravitationalLensing, INDIGO, Star, VIOLET

### Community 91 - "neural-boundary.ts"
Cohesion: 0.22
Nodes (7): controls, defaults, gauss(), INDIGO, makeData(), NeuralBoundary, ORANGE

### Community 92 - "reaction-diffusion.ts"
Cohesion: 0.20
Nodes (5): controls, defaults, Fields, PRESETS, reactionDiffusion

### Community 93 - "rlc-resonance.ts"
Cohesion: 0.20
Nodes (4): controls, defaults, rlcResonance, RlcState

### Community 94 - "deepspec-architecture.tsx"
Cohesion: 0.27
Nodes (9): classNames(), DeepSpecArchitecture(), draftTokens, LoadId, loadProfiles, StepId, steps, SurvivalBars() (+1 more)

### Community 95 - "MemoryKnowledgeGraph"
Cohesion: 0.22
Nodes (10): buildVisibleGraphProfile(), clampGraphZoom(), formatGraphMetric(), getPrimaryFinancialMetric(), getVisibleProfileNode(), GraphCompanyPanel(), GraphFinancialPanel(), GraphNodeInner() (+2 more)

### Community 96 - "mode-collapse-strip.tsx"
Cohesion: 0.40
Nodes (9): Draw, gaussian(), makeDraws(), mixturePdf(), ModeCollapseStrip(), mulberry32(), normalPdf(), peakDensity() (+1 more)

### Community 97 - "moe-block.tsx"
Cohesion: 0.27
Nodes (9): ATTN, fmtB(), GATE, gateOut, gridCellCenter(), MoEBlock(), OUT, outIn (+1 more)

### Community 98 - "dependencies"
Cohesion: 0.22
Nodes (9): animejs, @next/mdx, next-mdx-remote, dependencies, animejs, @next/mdx, next-mdx-remote, react (+1 more)

### Community 99 - "projects/[slug]/opengraph-image.tsx"
Cohesion: 0.25
Nodes (8): alt, contentType, dynamic, generateStaticParams(), Image(), size, generateMetadata(), getProject()

### Community 100 - "k-means.ts"
Cohesion: 0.22
Nodes (4): controls, defaults, KMeans, PALETTE

### Community 101 - "spirograph-rose.ts"
Cohesion: 0.25
Nodes (7): controls, defaults, hexToRgb(), layerColor(), LayerState, spirographRose, Renderer

### Community 102 - "compute-scaling.tsx"
Cohesion: 0.36
Nodes (8): accAt(), clamp(), ComputeScaling(), crossoverC(), reducedMotion(), STRATEGIES, Strategy, StrategyKey

### Community 103 - "stages.tsx"
Cohesion: 0.19
Nodes (11): Pt, DescentIcon(), DistanceIcon(), IconKind, ABOVE, ProfilePoint, Checkpoint(), CheckpointProps (+3 more)

### Community 104 - "site-search.tsx"
Cohesion: 0.25
Nodes (7): Hit, loadPagefind(), Pagefind, PagefindData, PagefindSubResult, SiteSearch(), Status

### Community 105 - "moonshot.ts"
Cohesion: 0.28
Nodes (7): generateMoonshot(), GenerationResponse, MoonshotConfig, readChatStream(), model, start, task

### Community 106 - "AboutPage"
Cohesion: 0.29
Nodes (5): AboutPage(), MAP, PALETTE, techColor(), youtubeId()

### Community 107 - "hiking/[slug]/opengraph-image.tsx"
Cohesion: 0.29
Nodes (6): alt, contentType, dynamic, Image(), size, repoFileDataUri()

### Community 108 - "double-pendulum.ts"
Cohesion: 0.25
Nodes (4): controls, defaults, doublePendulum, shiftHue()

### Community 109 - "gw-chirp.ts"
Cohesion: 0.25
Nodes (3): controls, defaults, gwChirp

### Community 110 - "kinetic-gas.ts"
Cohesion: 0.25
Nodes (5): COLD, controls, defaults, HOT, KineticGas

### Community 111 - "voronoi-bloom.ts"
Cohesion: 0.25
Nodes (5): controls, defaults, pool, Seed, voronoiBloom

### Community 112 - "cost-race.tsx"
Cohesion: 0.39
Nodes (7): CostRace(), fmt(), idxToN(), LOG_MAX, LOG_MIN, nToIdx(), reducedMotion()

### Community 113 - "deepspec-eli5-flow.tsx"
Cohesion: 0.32
Nodes (6): classNames(), DeepSpecEli5Flow(), Metric(), StageId, stages, tokenRows

### Community 114 - "landmark.tsx"
Cohesion: 0.18
Nodes (10): AltitudeIcon(), CompassIcon(), KIND_ICON, WaterIcon(), Landmark(), LandmarkProps, TrailCard(), Stop() (+2 more)

### Community 115 - "kv-cache-compressor.tsx"
Cohesion: 0.29
Nodes (6): COST_COLOR, CostClass, keptColumns(), KvCacheCompressor(), Mech, MECHS

### Community 116 - "kv-context-histogram.tsx"
Cohesion: 0.29
Nodes (4): bins(), FULL, KvContextHistogram(), SMOKE

### Community 117 - "kv-quant-dial.tsx"
Cohesion: 0.36
Nodes (6): BASE, hadamard16(), KvQuantDial(), quantise(), QuantResult, rotate()

### Community 118 - "selective-scan.tsx"
Cohesion: 0.39
Nodes (7): makeWriteVectors(), mulberry32(), reducedMotion(), runRecurrence(), SelectiveScan(), SENTENCE, Tok

### Community 119 - "nested-universes.tsx"
Cohesion: 0.27
Nodes (9): formatLength(), formatSci(), Level, LEVELS, NestedUniverses(), schwarzschildRadius(), SUPERSCRIPTS, toSuperscript() (+1 more)

### Community 120 - "package.json"
Cohesion: 0.25
Nodes (7): browserslist, name, packageManager, private, type, version, defaults and fully supports es6-module-dynamic-import

### Community 121 - "backfill-failure-reasons.mjs"
Cohesion: 0.32
Nodes (7): classify(), extractStatus(), isQuota(), reasonHistogram, results, resultsPath, root

### Community 122 - "am-modulation.ts"
Cohesion: 0.33
Nodes (5): amModulation, controls, defaults, drawSpectrum(), drawSpike()

### Community 123 - "black-hole.ts"
Cohesion: 0.29
Nodes (4): blackHole, controls, defaults, Star

### Community 124 - "cosmic-expansion.ts"
Cohesion: 0.29
Nodes (4): controls, cosmicExpansion, defaults, MODE_PRESETS

### Community 125 - "exoplanet-transit.ts"
Cohesion: 0.29
Nodes (5): A_BRIGHT, A_DIM, controls, defaults, ExoplanetTransit

### Community 126 - "eye-diagram.ts"
Cohesion: 0.29
Nodes (3): controls, defaults, EyeDiagram

### Community 127 - "fourier-series.ts"
Cohesion: 0.29
Nodes (4): controls, defaults, Epicycle, fourierSeries

### Community 128 - "inverse-kinematics.ts"
Cohesion: 0.29
Nodes (4): controls, createRenderer(), defaults, inverseKinematics

### Community 129 - "ising-model.ts"
Cohesion: 0.29
Nodes (6): controls, defaults, DOWN, IsingModel, LN1P_SQRT2, UP

### Community 130 - "random-walk.ts"
Cohesion: 0.29
Nodes (4): controls, defaults, makePRNG(), randomWalk

### Community 131 - "self-attention.ts"
Cohesion: 0.29
Nodes (4): controls, defaults, Particle, selfAttention

### Community 132 - "spacetime-curvature.ts"
Cohesion: 0.29
Nodes (4): controls, defaults, spacetimeCurvature, Theme

### Community 133 - "attn-res-depth.tsx"
Cohesion: 0.43
Nodes (6): ALPHAS, AttnResDepth(), blockName(), blockY(), Mode, strokeFor()

### Community 134 - "ffn-step.tsx"
Cohesion: 0.43
Nodes (4): barFill(), FfnStep(), w1(), w2()

### Community 135 - "kv-ablation-ledger.tsx"
Cohesion: 0.29
Nodes (5): GROUPS, Row, ROWS, Verdict, VERDICT_COLOR

### Community 137 - "EffectCanvas"
Cohesion: 0.47
Nodes (5): EffectCanvas(), loop(), size(), start(), resolveTheme()

### Community 138 - "band-structure.ts"
Cohesion: 0.33
Nodes (3): bandStructure, controls, defaults

### Community 139 - "bloch-sphere.ts"
Cohesion: 0.33
Nodes (3): blochSphere, controls, defaults

### Community 140 - "bode-plotter.ts"
Cohesion: 0.33
Nodes (4): bodePlotter, controls, createRenderer(), defaults

### Community 141 - "constellation-plot.ts"
Cohesion: 0.33
Nodes (4): constellationPlot, controls, createRenderer(), defaults

### Community 142 - "logistic-bifurcation.ts"
Cohesion: 0.33
Nodes (4): controls, defaults, LogisticBifurcation, PURPLE

### Community 143 - "pid-tuner.ts"
Cohesion: 0.33
Nodes (4): controls, createRenderer(), defaults, pidTuner

### Community 144 - "pole-zero.ts"
Cohesion: 0.33
Nodes (3): controls, defaults, PoleZero

### Community 145 - "compute-graph.tsx"
Cohesion: 0.40
Nodes (5): ComputeGraph(), EdgeKey, fmt(), Mode, NODE

### Community 146 - "embedding-space.tsx"
Cohesion: 0.47
Nodes (5): dist(), EmbeddingSpace(), idx(), Word, WORDS

### Community 148 - "useMeasuredGraphGroupBounds"
Cohesion: 0.33
Nodes (6): areGraphGroupBoundsEqual(), clamp(), computeForceLayout(), forceGraphNodeRadius(), GraphForceCanvas(), useMeasuredGraphGroupBounds()

### Community 149 - "prompts.ts"
Cohesion: 0.47
Nodes (3): HTML_CATEGORIES, SANDBOX_CONSTRAINTS, withSandboxConstraints()

### Community 150 - "merge-benchmark-results.mjs"
Cohesion: 0.33
Nodes (5): base, merged, modelIds, modelSet, resultsPath

### Community 151 - "halftone-hero.tsx"
Cohesion: 0.50
Nodes (4): HalftoneHero(), MASK_H, OLD_LOCAL_KEYS, ssGet()

### Community 152 - "image-picker.tsx"
Cohesion: 0.50
Nodes (3): ImagePicker(), intersects(), Rect

### Community 153 - "wave-superposition.ts"
Cohesion: 0.40
Nodes (3): controls, defaults, waveSuperposition

### Community 154 - "mdx-content.tsx"
Cohesion: 0.70
Nodes (4): imageDimensions(), MdxContent(), rehypeImageAttrs(), remarkImageBasePath()

### Community 156 - "seed-mock-results.mjs"
Cohesion: 0.50
Nodes (4): cost(), models, results, seed

### Community 157 - "trail-summary.tsx"
Cohesion: 0.36
Nodes (8): deriveDifficulty(), Difficulty, DIFFICULTY_LABEL, DIFFICULTY_VAR, difficultyScore(), ORDER, TrailSummary(), TrailSummaryProps

### Community 158 - "GraphForceEdge"
Cohesion: 0.50
Nodes (4): getForceEdgeColor(), getForceEdgeWidth(), GraphForceEdge(), hashString()

### Community 159 - "positional-encoder.tsx"
Cohesion: 0.83
Nodes (3): cellFill(), peValue(), PositionalEncoder()

### Community 160 - "capture-lab-poster.mjs"
Cohesion: 0.83
Nodes (3): captureUniverse(), clickMarker(), HIDE_CHROME()

### Community 161 - "gen-hero.mjs"
Cohesion: 0.50
Nodes (3): env, key, [slug, scene]

### Community 162 - "GraphEdgeRow"
Cohesion: 0.67
Nodes (3): getProfileEdgeColor(), getProfileEvidenceStyle(), GraphEdgeRow()

### Community 202 - "species.tsx"
Cohesion: 0.25
Nodes (6): LeafIcon(), TrackIcon(), IconPill(), Fauna(), Flora(), SpeciesProps

### Community 239 - "galton-board.tsx"
Cohesion: 0.43
Nodes (5): Ball, binomProb(), GaltonBoard(), logFactorial(), reducedMotion()

## Knowledge Gaps
- **1000 isolated node(s):** `YouTubeProps`, `AnimatedHeadingProps`, `RevealProps`, `SpotlightCardProps`, `ProjectEmblemProps` (+995 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `err()` connect `inline-dependencies.ts` to `pipeline.mjs`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `site-nav.tsx`, `generated-demo.tsx`, `llm-benchmark/page.tsx`, `universe-scale-studio.tsx`, `mdx-components.tsx`, `primitives.tsx`, `[category]/[task]/page.tsx`, `blog-content.tsx`, `physics.ts`, `landmark.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `.next` connect `site-nav.tsx` to `llm-benchmark/page.tsx`, `compilerOptions`, `[category]/[task]/page.tsx`, `manifest.ts`, `blog-content.tsx`, `breadcrumbLd`, `cost-dashboard/page.tsx`, `hiking/[slug]/page.tsx`, `layout.tsx`, `admin-context.tsx`, `blog/[slug]/page.tsx`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `YouTubeProps`, `AnimatedHeadingProps`, `RevealProps` to the rest of the system?**
  _1000 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `site-nav.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06794783802333562 - nodes in this community are weakly interconnected._
- **Should `circuit-canvas.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.058519793459552494 - nodes in this community are weakly interconnected._
- **Should `pipeline.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.05201292976785189 - nodes in this community are weakly interconnected._