---
title: 'B-Trees vs LSM-Trees: The Two Religions of On-Disk Data'
date: '2026-06-17T00:00:00.000Z'
description: >-
  Every database you use bets on one of two storage engines: B-trees
  (read-optimised, update-in-place) or LSM-trees (write-optimised,
  append-and-compact). The choice isn't about speed but about which kind of
  amplification you're willing to pay.
labels: 'software,databases,data structures,systems'
release: true
author: Ben Ebsworth
heroImage: /blog/b-trees-vs-lsm-trees/hero.webp
takeaways:
  - >-
    Read, write, and space amplification are conserved: you can drive any one
    toward zero only by shoving the slack onto the other two.
  - >-
    A B-tree's wide fan-out doesn't change what it does, only the base of the
    log; B=500 turns a billion-key lookup from ~30 seeks into ~3.
  - >-
    An LSM-tree's UPDATE is a disguised INSERT: it writes a newer value that
    shadows the old one and trusts background compaction to retire it.
  - >-
    Leveled-compaction write amplification is roughly L*T (often ~50x), but
    every rewrite is sequential, trading higher write volume for a disk-friendly
    pattern.
markdown_url: /blog/b-trees-vs-lsm-trees/
canonical_url: 'https://benebsworth.com/blog/b-trees-vs-lsm-trees/'
---
## Key takeaways

- Read, write, and space amplification are conserved: you can drive any one toward zero only by shoving the slack onto the other two.
- A B-tree's wide fan-out doesn't change what it does, only the base of the log; B=500 turns a billion-key lookup from ~30 seeks into ~3.
- An LSM-tree's UPDATE is a disguised INSERT: it writes a newer value that shadows the old one and trusts background compaction to retire it.
- Leveled-compaction write amplification is roughly L*T (often ~50x), but every rewrite is sequential, trading higher write volume for a disk-friendly pattern.

The engine under your data is not "fast" or "slow". It is *amplified*, a fact that survives almost every database argument you have ever had. Every read you issue touches more bytes than the row you asked for; every write you commit rewrites more bytes than the value you changed; every gigabyte you store occupies more than a gigabyte on disk. Those three taxes (read amplification, write amplification, and space amplification) are not bugs to be tuned away. They're conserved. You can push any one of them down to almost nothing, but only by shoving the slack onto the other two. A storage engine is the specific bargain its designers struck about which tax to pay.

The two great bargains have names, and they split the database world cleanly down the middle. **B-trees** keep the data sorted in fixed-size pages and update those pages in place. This is the structure Postgres, MySQL/InnoDB, and almost every relational database of the last half-century quietly runs on. **Log-structured merge-trees (LSM-trees)** refuse to update anything in place; they buffer writes in memory, dump them to disk in sorted batches, and clean up later in the background. That is the structure behind RocksDB, Cassandra, LevelDB, and most of the "web-scale" lineage. One religion optimises the read. The other optimises the write. Neither escapes the bill, and that's the thread we'll pull on.

> [StorageEngineSim component] A dual-pane interactive contrasting the two on-disk storage philosophies for the "B-trees vs LSM-trees" post. A B-tree (read-optimised, update-in-place, with real top-down node splits that push the median up) sits beside an LSM-tree (write-optimised: a memtable that flushes to immutable L0 SSTable runs which then size-tier-compact into L1). Controls — Insert key, Insert ×8, a read-heavy/write-heavy workload toggle, and Reset — drive live counters (page writes, SSTable writes, live vs total bytes) and a qualitative read/write/space amplification readout illustrating the RUM-conjecture trade-off. The rendered post has the live version.

Insert a few keys into both panes above and the two philosophies separate immediately. The B-tree on the left keeps everything sorted and, when a node fills, *splits* it, pushing a median key up and rewriting the page in place. The LSM-tree on the right does nothing of the sort. Keys pile into an in-memory buffer, and when it fills it gets flushed wholesale to an immutable sorted run on disk. Same keys, same order in, two completely different shapes on disk. This post is about why those shapes exist, what each one costs, and why your database sometimes does surprise disk IO at 3am that nobody asked for.

## Two ways to put a tree on a disk

Let's start with the constraint that makes storage engines hard: the disk. A spinning disk or even an SSD is happiest reading and writing in large, contiguous chunks, a page, typically 4 KB to 16 KB, and miserable doing scattered single-byte updates. Memory does not care where things live; disk cares enormously. So the entire game is arranging your data so that the access pattern your workload generates maps onto the access pattern the disk wants.

There are exactly two honest answers, and they correspond to which operation you refuse to compromise.

The first answer: **keep the data sorted on disk at all times, in place.** Then any lookup is a search through a sorted structure, a handful of page reads, no matter how much data you hold. This is the B-tree. The cost is that keeping things sorted *as you write* means finding the right page, reading it, modifying it, and writing it back: a read-modify-write for every change, scattered wherever the key happens to land.

The second answer: **never sort on disk; only ever append.** Writes go to a buffer in memory and then to disk as immutable, append-only sorted runs. Appending is the one thing disks do superbly. The cost is deferred, not avoided: now your data is scattered across many runs, so a read has to check several of them, and a background process has to keep merging runs together or they'll multiply without bound. This is the LSM-tree.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

You don't get to pick "read-optimised" and "write-optimised" at query time. The decision is baked into the on-disk layout the moment you choose the engine. A B-tree has already paid for fast reads by the time your first `SELECT` arrives: the data is sorted, the pages are placed. An LSM-tree has already paid for fast writes by the time your first `INSERT` arrives: the append path is clear, the sorting is postponed. The storage engine is a bet placed at schema-creation time about which way your workload leans, and you live with it.

## The B-tree: update-in-place, shallow, read-optimised

A B-tree is a sorted tree built for the disk's block size. Each node is one page and holds many keys, not two children like a binary tree but $B$ of them, where $B$ is large precisely so the tree stays shallow. A node with room for hundreds of keys has hundreds of children, so the tree fans out fast and bottoms out in very few levels.

That fan-out is the whole point, and it falls straight out of the height formula. A balanced tree of fan-out $B$ holding $n$ keys has height:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
h \approx \log_B(n)
```

$$
h \approx \log_B(n)
$$

The base of that logarithm is the lever. With a binary tree, $B = 2$, and a billion keys is $\log_2(10^9) \approx 30$ levels deep: 30 disk seeks per lookup, a catastrophe. Make $B = 500$ instead, and the same billion keys is $\log_{500}(10^9) \approx 3.3$ levels deep. Three or four page reads, and you've found any row in a billion. A large $B$ does not change *what* the tree does; it changes the base of the log, and the base of the log is the number of seeks. That's why every B-tree node is a fat page crammed with keys: each key you add to a node multiplies the tree's reach without adding depth.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

A binary search tree and a B-tree both find a key in logarithmic time. The difference is the base of the log, and on a disk the base is everything. Each level of the tree is potentially one disk seek, the single most expensive thing the database does, milliseconds on a spinning disk, still microseconds on an SSD versus nanoseconds in memory. A binary tree spends 30 seeks where a B-tree spends 3. The B-tree wins not by being smarter per comparison but by doing the comparisons in memory, hundreds at a time, between rare disk seeks.

Now let's watch what an insert actually does, and the left pane of the simulator at the top of this post does exactly this. You walk down to the correct leaf and write the key into the page in place. If the page still has room, you're done: one page read, one page write. But if the page is full, it has to **split**. The node divides in two, the median key moves up into the parent, and now the parent might be full too, so the split can cascade upward, occasionally all the way to the root (which is how the tree grows a level). Each split rewrites several pages: the one that overflowed, the new sibling, and the parent that received the median. The B-tree's **page writes** counter climbs faster than the keys you inserted, and that gap is the B-tree's write amplification, the price of keeping everything sorted in place so reads stay cheap.

That bargain has a sharp consequence. Because B-tree pages are modified in place, a single-row update can mean reading a 16 KB page, changing 8 bytes, and writing the whole 16 KB page back. Databases soften this with a write-ahead log and by batching dirty pages, but the structural fact stands. The B-tree pays on the write to be lavish on the read.

## The LSM-tree: append to a memtable, flush, compact

The LSM-tree starts from the opposite premise, that random in-place writes are the enemy, and arranges never to do them. A write does not touch the on-disk tree at all. It lands in two places: an append-only write-ahead log for durability, and an in-memory sorted structure called the **memtable** (usually a skip list or a balanced tree, sorted because sorting in RAM is cheap).

The memtable absorbs writes until it hits a size threshold. Then it is **flushed**: written out, in one sequential sweep, as an immutable **sorted string table (SSTable)**, a file of key-value pairs in sorted order. Crucially, the SSTable is never modified again. An update to a key you wrote yesterday does not find and edit yesterday's SSTable; it just writes a *newer* entry, in a *newer* SSTable, that shadows the old one. A delete writes a **tombstone**, a marker that says "this key is gone", which also shadows the old value until cleanup removes both.

You can probably already see the problem this creates. Keep flushing memtables and you accumulate dozens, then hundreds, of SSTables, each sorted internally but overlapping the others. A read for a single key might have to check many of them, newest first, until it finds the key or a tombstone. Reads degrade as the number of runs grows. The fix is **compaction**: a background process that merges several SSTables into one, discarding shadowed values and dead tombstones along the way. SSTables are organised into levels, each level larger than the one above, and compaction merges runs from one level down into the next.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

An LSM-tree never overwrites a byte on disk; it writes a newer truth on top of the old one and lets a background janitor reconcile them later.

> [StorageEngineSim component] A dual-pane interactive contrasting the two on-disk storage philosophies for the "B-trees vs LSM-trees" post. A B-tree (read-optimised, update-in-place, with real top-down node splits that push the median up) sits beside an LSM-tree (write-optimised: a memtable that flushes to immutable L0 SSTable runs which then size-tier-compact into L1). Controls — Insert key, Insert ×8, a read-heavy/write-heavy workload toggle, and Reset — drive live counters (page writes, SSTable writes, live vs total bytes) and a qualitative read/write/space amplification readout illustrating the RUM-conjecture trade-off. The rendered post has the live version.

Now drive the right pane. Hit **Insert ×8** and watch the memtable fill (four keys here) then **flush** as a single immutable L0 run; the **SSTable writes** counter ticks once per flush, not once per key. Keep inserting and L0 runs accumulate until three of them trigger a **compaction** that merges them into a larger L1 run. That compaction is the surprise IO. It isn't driven by your query; it's the engine reconciling its deferred work, reading several runs and writing one larger run, all in the background. The "why is my database hammering the disk when nobody's querying it" phenomenon is compaction catching up on the writes you batched cheaply earlier. You paid a low price at write time; compaction is the invoice arriving later.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Because SSTables are immutable, an LSM-tree never has a write that races a read on the same byte. Readers see a consistent snapshot of files that, once written, never change. This is the same insight behind log-structured filesystems, copy-on-write, and immutable data structures everywhere: you avoid the hard concurrency problem of in-place mutation by never mutating, only appending and later garbage-collecting. The complexity doesn't vanish; it concentrates into the compaction scheduler, which is the single hardest piece of any LSM engine to get right.

## The three amplifications and the RUM conjecture

Let's name the taxes precisely, because the whole comparison reduces to them. For a storage engine, define:

- **Read amplification:** the number of bytes read from disk to satisfy a query, divided by the bytes of the result. A B-tree reads a handful of pages per lookup. An LSM-tree may probe several runs across several levels, so its read amplification grows with the number of levels.
- **Write amplification:** the number of bytes written to disk, divided by the bytes of the logical write. A B-tree rewrites whole pages and splits nodes. An LSM-tree rewrites every record once per compaction it survives.
- **Space amplification:** the bytes occupied on disk, divided by the bytes of live data. A B-tree leaves pages partially empty after splits (typically about 2/3 full). An LSM-tree holds stale, shadowed values and tombstones until compaction reclaims them.

The LSM-tree's write amplification has a clean approximate form for leveled compaction. Every record is written once when its memtable flushes, then rewritten again each time it is merged down a level. With $L$ levels and a per-level size ratio (fan-out) $T$, the worst-case rewriting at each level is on the order of $T$. When a level fills, compacting it into the next reads and rewrites roughly $T$ times as much data as it contributes. Summed across all $L$ levels, the total lands on the order of $L$ times $T$:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
W_\text{LSM} \approx L \times T
```

$$
W_\text{LSM} \approx L \times T
$$

A typical configuration with $L = 5$ levels and a fan-out of $T = 10$ gives write amplification around 50: every byte you logically write gets physically written roughly 50 times over its lifetime, spread across the flush and the compactions it survives. That sounds ruinous until you remember the alternative: those rewrites are all *sequential* writes, which a disk handles far faster than the *random* in-place page writes a B-tree scatters around. So the LSM-tree trades a higher write *volume* for a far friendlier write *pattern*.

> [StorageEngineSim component] A dual-pane interactive contrasting the two on-disk storage philosophies for the "B-trees vs LSM-trees" post. A B-tree (read-optimised, update-in-place, with real top-down node splits that push the median up) sits beside an LSM-tree (write-optimised: a memtable that flushes to immutable L0 SSTable runs which then size-tier-compact into L1). Controls — Insert key, Insert ×8, a read-heavy/write-heavy workload toggle, and Reset — drive live counters (page writes, SSTable writes, live vs total bytes) and a qualitative read/write/space amplification readout illustrating the RUM-conjecture trade-off. The rendered post has the live version.

Flip the **workload toggle** between read-heavy and write-heavy and watch the amplification readout re-weight. Under a write-heavy workload, the LSM-tree's bargain looks brilliant: sequential appends, batched flushes, the cost deferred to background compaction. Flip to read-heavy and the picture inverts: the LSM-tree's read amplification, all those runs to probe, starts to hurt, and the B-tree's always-sorted layout pays off. Keep inserting in either mode and watch the **live vs total bytes** counters drift apart: the gap between them *is* space amplification, the dead weight of shadowed values and half-empty pages.

This isn't a coincidence of these two designs. It's a theorem-shaped observation called the **RUM conjecture** (Read, Update, Memory). It states that an access method can optimise at most two of the three overheads, and improving one of read, update, or memory amplification comes at the expense of at least one of the others:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\min R \;\wedge\; \min U \;\Longrightarrow\; \uparrow M \qquad \text{(any two, never all three)}
```

$$
\min R \;\wedge\; \min U \;\Longrightarrow\; \uparrow M \qquad \text{(any two, never all three)}
$$

The B-tree picks low read amplification and moderate space, paying with random in-place writes. The LSM-tree picks low write amplification (sequential, batched) and pays with read amplification and transient space bloat. You can move the dial (bigger Bloom filters cut LSM read amplification at the cost of memory; more aggressive compaction cuts space at the cost of write amplification) but in practice every adjustment is a slide along the triangle, never an escape from it.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

When a vendor benchmark shows their engine "beating" the other on throughput, read the workload first. A write-heavy benchmark flatters LSM-trees; a read-heavy or scan-heavy benchmark flatters B-trees. Neither result is a lie, and neither is general. The RUM triangle guarantees that any engine winning decisively on one axis is paying for it on another. The benchmark just chose which axis to spotlight. So the honest question is never "which is faster" but "which amplification can my workload afford".

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## Who picks what, and why

Map the engines onto the workloads and the choices stop looking arbitrary.

**Postgres and MySQL/InnoDB** are B-trees because the relational world they grew up in tends to be read-and-scan-heavy: indexes that get range-scanned, joins that walk sorted keys, point lookups that must be fast and predictable. Update-in-place also makes transactional semantics and secondary indexes simpler: the row lives in one place, so an index entry can point at it. The B-tree's bargain, pay on the write to be cheap and predictable on the read, is exactly the bargain an OLTP relational database wants.

**Cassandra** is an LSM-tree because it was built for write-heavy, high-ingest workloads (time-series, event logs, sensor feeds, audit trails) where data pours in far faster than it is read back, and where horizontal write scalability matters more than single-key read latency. Append-and-compact turns a flood of random-looking inserts into a stream of sequential flushes, which is the only way to keep a write-saturated node from collapsing.

**RocksDB** (a fork of Google's LevelDB) is the LSM-tree as a reusable embedded library, the storage engine extracted from any particular database and handed to others. It sits under MySQL's MyRocks, under TiKV (and so under TiDB), under Kafka Streams' state stores, under countless services that need a fast embedded key-value store; CockroachDB famously re-implemented the same design in Go as Pebble, a RocksDB-inspired engine it has shipped by default since 2020. RocksDB exposes the RUM triangle as *configuration*: compaction style, level sizes, Bloom-filter bits, block-cache size. Every knob is a position on the trade-off, handed to the operator to set for their workload.

```python
# The same logical operation, two storage philosophies underneath.

# B-tree (Postgres-style): UPDATE finds the page, reads it, modifies it
# in place, writes it back. One row changed, one page (or a few) rewritten.
db.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 42")
# -> walk B-tree to the leaf holding id=42, read page, edit, write page back

# LSM-tree (RocksDB-style): the "update" is just a newer write that
# shadows the old value. Nothing on disk is modified; a tombstone-free
# newer entry lands in the memtable, flushes later, compacts later.
store.put(b"account:42:balance", b"...")  # append; old value reconciled at compaction
```

The pattern to carry away: a B-tree's `UPDATE` is genuinely an update, finding and editing the existing bytes. An LSM-tree's `put` is a disguised `INSERT`, writing a newer truth and trusting compaction to retire the old one. The API hides the difference; the amplification profile doesn't.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The split is real but not absolute. Modern engines borrow across the aisle: WiredTiger (MongoDB's default) is a B-tree with LSM-like log-structured behaviour available; MyRocks puts an LSM engine under MySQL's relational front end; fractal trees and $B^\varepsilon$-trees (TokuDB) buffer writes inside B-tree nodes to claw back write performance without abandoning the sorted layout. Each hybrid is an attempt to occupy a *different point* on the RUM triangle than either pure design, never an attempt to leave the triangle, because that exit doesn't exist.

## The same shape in other rooms

Once you've got the append-and-compact pattern in your hand, you start seeing it everywhere the cost of in-place mutation got too high to bear.

**Log-structured filesystems** are the LSM idea applied to whole files. LFS, the 1991 design by Mendel Rosenblum and John Ousterhout, writes all changes (data and metadata alike) to a sequential log and runs a background segment cleaner to reclaim space. The motivation was identical to the LSM-tree's: disks are fast at sequential writes and slow at random ones, so turn every random write into a sequential append and pay the cleanup cost later. The segment cleaner *is* compaction wearing a filesystem hat.

**SSD flash translation layers (FTLs)** run the same playbook in firmware, because they have no choice. NAND flash cannot overwrite a page in place: a block must be erased before rewriting, and erases are slow and wear the cell out. So every SSD is secretly log-structured: writes go to fresh pages, a mapping table redirects logical addresses to wherever the data landed, and a garbage collector compacts mostly-dead blocks. Write amplification is a term SSD engineers use daily, meaning exactly what it means for an LSM-tree. Your "update-in-place" B-tree, running on an SSD, sits on a log-structured device that turns its in-place writes into appends anyway. The religion you picked at the schema layer gets quietly overruled by the firmware.

**Apache Kafka** takes the append-only half of the idea and makes it the entire product. A Kafka topic is a partitioned, append-only commit log, the memtable's write-ahead log promoted to the central abstraction. Producers append; consumers read sequentially; log compaction (Kafka's own term) retires superseded records by key. Kafka is what happens when you decide the append-only log is not an implementation detail of a storage engine but the data model itself.

The thread through all of them is one decision made over and over: when in-place mutation is expensive (because the disk is slow at random writes, because flash cannot overwrite, because concurrent mutation is hard to reason about) stop mutating. Append the new truth, shadow the old, and run a background process to reconcile. The B-tree is the holdout that insists on mutating in place and pays for it on the write; everything in the log-structured lineage is a variation on the LSM-tree's refusal. So when you choose a database, you're really choosing which tax to pay. Worth knowing which one before the bill arrives.

## Reading further

- [Bayer & McCreight, *Organization and Maintenance of Large Ordered Indices* (1970)](https://dl.acm.org/doi/10.1145/1734663.1734671): the original B-tree paper (presented at the 1970 SIGFIDET workshop, expanded in *Acta Informatica* in 1972), where the fan-out-keeps-it-shallow argument and the node-split algorithm first appear.
- [O'Neil, Cheng, Gawlick & O'Neil, *The Log-Structured Merge-Tree (LSM-Tree)* (1996)](https://www.cs.umb.edu/~poneil/lsmtree.pdf): the paper that named the structure and worked out the merge cost; short, and the source of every modern compaction design.
- [Athanassoulis et al., *Designing Access Methods: The RUM Conjecture* (EDBT 2016)](https://stratos.seas.harvard.edu/files/stratos/files/rum.pdf): the formal statement of the read/update/memory trade-off triangle that frames the whole comparison.
- [Petrov, *Database Internals* (O'Reilly, 2019)](https://www.databass.dev/): the modern, implementation-level treatment of both engines side by side, with the compaction strategies and on-disk layouts spelled out.
