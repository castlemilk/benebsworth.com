# Micropod benchmark summary

26 November 2026 · Gamma, Apple M5 Max · [Full article](https://benebsworth.com/blog/micropod-ci-on-apple-silicon/)

Micropod’s native Linux CI worker uses Apple’s Hypervisor.framework. Recent work improved VM startup, cache reuse on Mac-mounted checkouts and Docker networking across container restarts. On the integrated engine, stock Docker containers running as two different users shared exact Go cache bytes. Stock Buildx loaded an image, reused a cached step and exported the expected contents. [Integrated engine verification](https://github.com/castlemilk/micropod/blob/7b73d35b25470bf3e611fd828103e813bbcce787/docs/benchmarks/2026-11-26/native-engine-landing-verification.json)

| Median elapsed time on Gamma | Micropod | OrbStack 2.2.5 |
| --- | ---: | ---: |
| Eight services through verified neighbour HTTP | 439 ms | 1,196 ms |
| Eight concurrent Git checks, guest clock | 296 ms | 330 ms |
| One warm Git, Go build and test job, guest clock | 703 ms | 745 ms |
| Same job after a host edit, guest clock | 2,028 ms | 2,225 ms |

These medians come from four alternating pairs per workload on the earlier signed package. Gamma was under ambient load. The Micropod worker had four vCPUs and 4 GiB of RAM. In a separate five-restore test, a warm worker answered Docker’s ping in 10.68 ms and completed its first Alpine container in 126.1 ms. Both clocks started at VM process launch. [Paired CI measurements](https://github.com/castlemilk/micropod/blob/7b73d35b25470bf3e611fd828103e813bbcce787/docs/benchmarks/2026-11-26/workspace-reply-wait-and-native-network.md) · [Snapshot results](https://github.com/castlemilk/micropod/blob/7b73d35b25470bf3e611fd828103e813bbcce787/docs/benchmarks/2026-11-25/phase-b5-results.md)

On a quiet host, Interactive QoS lowered fresh-request p95 from 10.187 to 6.356 ms. Standard QoS carried more bulk traffic, 7,934 versus 6,294 MiB/s. At Interactive priority, two relay workers delivered 6,505 MiB/s and four delivered 5,845 MiB/s. [Controlled relay study](https://github.com/castlemilk/micropod/blob/7b73d35b25470bf3e611fd828103e813bbcce787/docs/benchmarks/2026-11-24/gamma-qos-and-workers/results.md)

The pinned Docker API 1.47 comparison matched 16 of 27 groups. The fixed suite and supplemental probes exercised 49 of 107 operations, some partially. Release qualification still includes a sustained mixed-CI soak and a clean Developer ID installation. [Compatibility and release plan](https://github.com/castlemilk/micropod/blob/7b73d35b25470bf3e611fd828103e813bbcce787/docs/research/2026-11-25-phase-b4-plan.md)
