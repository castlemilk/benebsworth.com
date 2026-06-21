---
title: 'How Python Dicts Really Work: Open Addressing, Probing, and the djb2 Lie'
date: '2026-06-17T00:00:00.000Z'
description: >-
  The dict is the most-used data structure in Python and almost nobody knows it
  uses open addressing, not chaining — so a single deletion leaves a tombstone,
  and a simple hash table is really a careful dance between load factor, probe
  sequences, and cache lines.
labels: 'software,data structures,python,computer science'
release: true
author: Ben Ebsworth
heroImage: /blog/how-python-dicts-really-work/hero.webp
takeaways:
  - >-
    CPython dicts use open addressing, not chaining, so a delete can't blank its
    slot — it leaves a tombstone that lookups walk past, keeping probe chains
    long even as live keys drop.
  - >-
    The real enemy is clustering, not collisions: collisions are routine (the
    birthday paradox guarantees them when a table is ~6% full), but contiguous
    runs are what make probes go vertical.
  - >-
    CPython's perturbed probe mixes in the high hash bits discarded by the
    modulo, scattering colliding keys; once it decays, the 5j+1 recurrence
    provably visits every slot of the power-of-two table.
  - >-
    Insertion-ordered dicts (3.6+) were never designed — they fell out of
    Hettinger's compact-dict memory optimisation, which packs entries densely
    and just walks them front to back.
markdown_url: /blog/how-python-dicts-really-work/
canonical_url: 'https://benebsworth.com/blog/how-python-dicts-really-work/'
---
## Key takeaways

- CPython dicts use open addressing, not chaining, so a delete can't blank its slot — it leaves a tombstone that lookups walk past, keeping probe chains long even as live keys drop.
- The real enemy is clustering, not collisions: collisions are routine (the birthday paradox guarantees them when a table is ~6% full), but contiguous runs are what make probes go vertical.
- CPython's perturbed probe mixes in the high hash bits discarded by the modulo, scattering colliding keys; once it decays, the 5j+1 recurrence provably visits every slot of the power-of-two table.
- Insertion-ordered dicts (3.6+) were never designed — they fell out of Hettinger's compact-dict memory optimisation, which packs entries densely and just walks them front to back.

When you delete a key from a Python dictionary, the slot it lived in does not become empty. It becomes a small lie, a marker that says "nothing lives here now, but keep looking anyway". Delete enough keys without inserting new ones and you build a table that is mostly empty and yet searches as slowly as a full one. The usual mental model says a hash table is an array of buckets, each holding a little list, and collisions just get appended to the list. That picture is wrong for the single most-used data structure in the language. CPython does not chain. It uses **open addressing**, and that one decision rewrites everything downstream: deletion, resizing, iteration order, even how the structure interacts with your CPU's cache.

The trap is a quiet assumption: that the enemy in a hash table is the collision. It's not. Two keys landing in the same slot is routine and unavoidable, and the birthday paradox guarantees it long before the table is anywhere near full. What actually destroys performance is **clustering**: collisions that pile up into long contiguous runs, where every new arrival walks the whole run before it finds a seat. A good hash table is not one that avoids collisions. It's one that scatters them so they never clump.

> [HashTableDemo component] An interactive open-addressing hash table visualiser for the "how Python dicts really work" post. Inserting keys animates the djb2 hash being computed and the probe sequence ricocheting through slots (collisions flashed orange, the landing slot in the blog accent); deletes leave tombstones that lookups must probe past, and crossing the 2/3 load factor triggers an animated 2× resize and rehash. A probe-strategy toggle (Linear, Quadratic, Python-style Perturbed) shows how each walk clusters differently. The rendered post has the live version.

Insert a few keys and watch the purple path. Most of the time a key lands on its first slot: one step, done. But when the slot it wants is taken, the table doesn't give up. It **probes** to the next candidate slot, and the next, until it finds an opening. That walk is the probe sequence, and the entire art of hash-table design is keeping it short as the table fills. What follows is why open addressing wins, why a deletion can't just blank a slot, and why CPython's layout accidentally gave Python ordered dictionaries for free.

## What a dict actually is

Strip away the syntax and a dict answers two questions fast: *given a key, where is its value?* and *is this key even here?* Both in roughly constant time, regardless of how many keys you store. An array answers "where is index 7?" in one step because the address is arithmetic: `base + 7 × stride`. A hash table borrows that trick for arbitrary keys: turn the key into an integer, reduce that integer to an array index, read the slot. The catch is that "turn the key into an index" is lossy compression. You're squeezing an effectively infinite space of keys into a finite array, so two keys will sometimes demand the same slot. How you handle that "sometimes" is the entire design space.

The slots hold more than the value. Each CPython entry carries the key's full hash, a pointer to the key object, and a pointer to the value. The cached hash matters more than it looks: when you probe past an occupied slot, you compare the stored hash to the one you're searching for *before* touching the key object. An integer comparison is a single instruction; calling `__eq__` on two strings might walk a hundred characters. Caching the hash turns most "is this my key?" checks into one cheap integer compare, and only on a hash match do we pay for the real equality test.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Every Python object's attributes live in a dict (`obj.__dict__`). Every module's global namespace is a dict. Keyword arguments arrive as a dict. Class method lookup walks a chain of dicts. The interpreter executes your bytecode by doing dict lookups on names. Speed up the dict and you speed up *Python itself*, which is why CPython's `dictobject.c` is some of the most carefully tuned code in the project.

## Hashing: turning a key into an index

The first job is the hash function: key in, integer out. A good hash spreads keys uniformly across the integer range so that, after you reduce modulo the table size, they spread uniformly across the slots. The classic teaching example is Dan Bernstein's **djb2**, beloved because it fits on a napkin:

```python
def djb2(s: str) -> int:
    h = 5381
    for ch in s:
        h = (h * 33 + ord(ch)) & 0xFFFFFFFF  # h = h*33 + c, kept 32-bit
    return h
```

The magic numbers are 5381 (the seed) and 33 (the multiplier). For decades the folklore held that 33 is special, that Bernstein found some deep number-theoretic property that scatters strings beautifully. That's the **djb2 lie**. The multiplier was chosen empirically; 33 simply tested well on the strings of the era, and nobody has a real explanation for why it beats nearby odd numbers. It works well enough in practice, which is a humbler claim than "mathematically optimal". The lesson generalises: a hash function earns its keep by passing tests on real key distributions, not by carrying a proof. The folklore, as usual, arrived afterwards.

CPython does **not** use djb2. For strings and bytes it uses **SipHash**, a keyed pseudorandom function seeded with a per-process random value (since Python 3.4). That randomisation is a security feature: without it, an attacker who controls your keys (HTTP headers, JSON fields, form names) can craft thousands of strings that all hash to the same slot, turning your O(1) dict into an O(n) walk and your web server into a tarpit. This algorithmic-complexity denial-of-service class was demonstrated against many languages around 2011, and hash randomisation (`PYTHONHASHSEED`) is the fix. Small integers are their own hash (`hash(7) == 7`), which is why integer-keyed dicts have famously tidy probe behaviour, with one quirk: `hash(-1) == -2`, because `-1` is reserved as the C-level error sentinel.

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
\alpha = \frac{n}{m}
```

$$
\alpha = \frac{n}{m}
$$

Equation (1) defines the **load factor** $\alpha$: stored keys $n$ over slots $m$. It's the master dial. At $\alpha = 0.1$ almost every key lands first try; at $\alpha = 0.95$ probes turn into marathons. All hash-table tuning is a fight to keep $\alpha$ in a sweet spot, and CPython draws its line at $\alpha = 2/3$.

## Collisions and open addressing versus chaining

When two keys want the same slot, you have two structural choices at opposite ends of a trade-off.

**Chaining** (separate chaining) keeps the array-of-buckets model literal: each slot holds a pointer to a linked list, and colliding keys append to the list. It's conceptually clean, deletion is trivial (unlink a node), and the load factor can exceed 1 because each bucket holds many entries. Java's `HashMap` works this way, with a red-black-tree fallback for pathological buckets. But every collision means following a pointer to a heap-allocated node that lives who-knows-where, and every such hop is a potential cache miss.

**Open addressing** keeps everything in the array itself: no side lists, no extra allocations. When a key's slot is taken, you don't append to a list; you **probe** for another slot in the same array, following a deterministic sequence the lookup can replay later. CPython uses this, as do Rust's `HashMap`, Google's Swiss tables, and the Python `set`. The load factor is hard-capped below 1 (you can't store more keys than slots), so we have to resize before the table fills. In exchange you get what chaining can never offer: **memory locality**. The probe sequence walks neighbouring array entries that often share a cache line, so a short probe is nearly free.

> [PullQuote component] Editorial pull-quote. Renders a striking sentence from the surrounding prose as a large, italicised blockquote with a branded accent border. The quote text follows this placeholder verbatim, so the LLM reader still sees the highlighted sentence.

Chaining asks the memory system to chase pointers; open addressing asks it to read the next array slot. On modern hardware, that difference is the difference between a cache hit and a stall.

The cost of open addressing is the one this whole post is about: with no separate lists, the array entries do double duty as both storage and routing, which makes deletion genuinely hard. You can't simply blank a slot, because blanking it breaks the probe chains that pass *through* it. Hold that thought. It's the tombstone, and it's coming.

## Probing strategies and the clustering problem

A probe strategy is the rule that picks slot 2 given that slot 1 was taken. The simplest is **linear probing**: if slot $i$ is full, try $i+1$, then $i+2$, marching one step at a time and wrapping at the end. It's cache-perfect, since the next slot is the literally-next memory address, and that locality is seductive. But linear probing has a fatal social problem: **primary clustering**. Once a run of occupied slots forms, any key that hashes anywhere into that run walks to the *end* and lands there, making the run one longer. Runs grow runs; clusters merge into superclusters. A table at a reasonable $\alpha = 0.7$ can develop probe walks of dozens of slots, not because it's full, but because its occupancy has clumped.

> [HashTableDemo component] An interactive open-addressing hash table visualiser for the "how Python dicts really work" post. Inserting keys animates the djb2 hash being computed and the probe sequence ricocheting through slots (collisions flashed orange, the landing slot in the blog accent); deletes leave tombstones that lookups must probe past, and crossing the 2/3 load factor triggers an animated 2× resize and rehash. A probe-strategy toggle (Linear, Quadratic, Python-style Perturbed) shows how each walk clusters differently. The rendered post has the live version.

This is the demo to play with slowly. Let's insert ten keys under **Linear** and watch contiguous runs build up: the purple probe path lengthens as keys pile onto the ends of existing clusters. Switch to **Quadratic** and insert another batch: it tries $i+1^2,\, i+2^2,\, i+3^2,\dots$, so a collision throws the next probe far down the array instead of one step over, and the runs stay short. Finally switch to **Perturbed**, CPython's actual strategy, and watch it scatter harder still, the path hopping around the table in a way that looks random but is fully deterministic. Same keys, three different occupancy textures. The collision count barely changes; what changes is whether the collisions clump.

We can put a number on the damage. Under the idealised model of uniform random probing, where every probe lands on an independent random empty slot, the expected number of probes for an **unsuccessful** search (the costlier of the two cases, because we walk until we hit an empty slot) is:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

```latex
E[\text{probes}] \approx \frac{1}{1 - \alpha}
```

$$
E[\text{probes}] \approx \frac{1}{1 - \alpha}
$$

Equation (2) is the punchline of load-factor analysis. At $\alpha = 0.5$ you expect about 2 probes; at $\alpha = 0.66$ about 3; at $\alpha = 0.9$ about 10; at $\alpha = 0.99$ about 100. The curve is gentle until it isn't, then it goes vertical, which is why every open-addressed table resizes well before $\alpha$ reaches 1. But equation (2) assumes ideal scattering. Linear probing is *worse*, because clustering makes its probes correlated rather than independent; its unsuccessful-search cost behaves more like $\frac{1}{2}\left(1 + \frac{1}{(1-\alpha)^2}\right)$, which blows up far sooner. The squared term is primary clustering wearing a formula.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Run the birthday-paradox numbers: with 23 keys in a table of 365 slots ($\alpha \approx 0.06$, very sparse) you already have a better-than-even chance of *some* collision. Collisions are not rare events to eliminate. They are the normal weather of any hash table past trivial size. The strategy's job is not to stop two keys from colliding. It is to fling the second key somewhere far away when they do, so a *third* key hashing nearby doesn't inherit a two-deep run to climb. Spread the collisions and a half-full table searches in two probes; clump them and the same table searches in twenty.

CPython's perturbed probe is the elegant answer. It starts at the natural slot, then mixes in the *upper, unused bits of the full hash* (bits the initial modulo-by-table-size threw away) to steer each subsequent probe:

> [Equation component] Labeled display-math block (KaTeX-rendered). Wraps a `$$...$$` math expression with an optional `id` for cross-references, an explicit `number` like "(3.2)", and a short `caption` shown below in monospace muted text. The math is rendered server-side via `remark-math` + `rehype-katex` (Katex is the rendering engine, not MathJax). Use this for the *important* equations — the ones the reader should remember, the ones the post's argument hinges on. A 2,000-word post should have 3-5 numbered equations, not 30; the rest stay as inline `$...$` math in running prose. Cross-reference via `<a href="#eqn:...">equation (1)</a>`.

>=} 5">

$$
j = (5j + 1 + \text{perturb}) \bmod 2^k, \qquad \text{perturb} \mathrel{>>=} 5
$$

Read equation (3) as two phases. While `perturb` is still nonzero, those injected high bits make two keys that collided in their low bits diverge immediately on their second probe: same starting slot, different high bits, so they scatter differently and never correlate their walks. Then, because `perturb` is right-shifted by 5 each step, it decays to zero and the recurrence collapses to $j = (5j + 1) \bmod 2^k$. That bare recurrence is a full-period generator over a power-of-two table: it provably visits **every** slot before repeating, so the probe always terminates if a free slot exists. Cluster-breaking when it matters, exhaustive coverage as a safety net, and that's why CPython tables are always sized to a power of two.

## Tombstones: why deletion is subtle

Now the promised difficulty. Suppose three keys, A, B, and C, all hash to slot 5. A takes slot 5, B probes to slot 6, C probes to slot 7. The probe chain for B and C *passes through* slot 5. Let's delete A. If you blank slot 5 to "empty", then later look up B: you hash to 5, find it empty, and conclude B is absent. But B is sitting right there in slot 6. By emptying slot 5 you severed the chain, and B and C became unreachable ghosts.

The fix is the **tombstone**: a third slot state, distinct from "empty" and "filled", meaning "a key was deleted here, but the chain continues, so keep probing". A lookup treats a tombstone like an occupied-but-not-matching slot and walks past it; an insert may *reclaim* it as a free seat, but a lookup must never *stop* at one. That single extra state is what lets open addressing support deletion at all.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

Tombstones count toward your effective load factor for search cost, because every lookup still probes past them. Picture a long-lived cache where you insert and delete in equal measure: the *live* key count stays low, but tombstones accumulate, the probe chains never shorten, and searches crawl through a table that is mostly "deleted". Go back to the demo, fill it part-way, then delete several keys and watch the slots turn into tombstones rather than going empty. The survivors' probe paths do not get shorter. This is why open-addressed tables periodically rebuild: a resize (even to the same size) drops every tombstone and re-lays the live keys with clean, short chains. Deletion is never truly free; you pay for it later, in a sweep.

## Load factor and the 2/3 resize

Equation (2) showed the cost goes vertical as $\alpha \to 1$, so the table has to grow before it gets there. CPython's threshold is $\alpha = 2/3$: when filled slots plus tombstones exceed two-thirds of capacity, the table allocates a larger array (roughly 2× to 4×, sized from the live-key count and rounded up to a power of two) and **rehashes** every live key into it. Two-thirds is a deliberate compromise. Push it higher and you save memory but equation (2) punishes every lookup; push it lower and lookups stay fast but you waste memory and resize too often. Two-thirds keeps the expected unsuccessful-search probe count around 3, the empirical sweet spot.

> [HashTableDemo component] An interactive open-addressing hash table visualiser for the "how Python dicts really work" post. Inserting keys animates the djb2 hash being computed and the probe sequence ricocheting through slots (collisions flashed orange, the landing slot in the blog accent); deletes leave tombstones that lookups must probe past, and crossing the 2/3 load factor triggers an animated 2× resize and rehash. A probe-strategy toggle (Linear, Quadratic, Python-style Perturbed) shows how each walk clusters differently. The rendered post has the live version.

Drive the table to a resize yourself. Keep inserting keys, under any strategy, and watch the load-factor meter climb. The instant occupied-plus-tombstones crosses the 2/3 line, the table animates into a larger array and every key is re-placed: the long probe paths snap short again (more slots, lower $\alpha$) and any tombstones vanish in the rebuild. A resize is amortised, not free: it's O(n), but because it fires only after you've inserted Θ(n) keys, the *average* cost per insertion stays O(1). It's the same accounting that makes Python's `list.append` constant-time despite occasional reallocations.

> [StatGroup component] Editorial metric row — a wrapper for 2-4 `<Stat>` components, rendered as a horizontal band that breaks up long prose. The individual stats follow as their own placeholders.

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

  

> [Stat component] Editorial stat callout. Renders one key metric as large `value` text under a `label` header, with optional smaller `context` subtext beneath. Used inside a `<StatGroup>` to surface the numbers the post hinges on.

## The compact dict: ordered for free

The side effect surprised even the people who shipped it. Through Python 3.5, dicts were unordered: iteration came out in hash order, effectively random. Since **Python 3.6** dicts preserve insertion order, and in 3.7 that became a guaranteed language feature. Most people assume someone decided ordering was a nice property to add. They didn't. Ordering fell out of a **memory optimisation** that had nothing to do with order, which I think is the loveliest part of the whole story.

The optimisation, proposed by Raymond Hettinger, splits the dict into two arrays. The old design had one big sparse array of fat entries (hash + key pointer + value pointer), and because it ran at 2/3 load, a third of those fat slots sat empty, wasting memory. The **compact dict** keeps the sparse array but fills it with *small integer indices* instead of fat entries. Those indices point into a second, **dense** array that stores the entries packed end to end, in insertion order, with no gaps:

```text
indices (sparse):   [ _ , 1 , _ , 0 , _ , _ , 2 , _ ]   ← hashing lands here
                          │       │           │
                          ▼       ▼           ▼
entries (dense):    [ (hashA, keyA, valA),     ← index 0, inserted 1st
                      (hashB, keyB, valB),     ← index 1, inserted 2nd
                      (hashC, keyC, valC) ]    ← index 2, inserted 3rd
```

The sparse index array now holds 1-, 2-, 4-, or 8-byte integers instead of three 8-byte pointers, so the wasted third costs almost nothing, and the real entries live in the dense array with zero waste: roughly 20–25% smaller dicts, which was the whole point. But look at the dense array: entries are appended in insertion order and never moved (a deletion tombstones an index, not the entry). Iterating the dict means walking that array front to back, which means iterating in **insertion order**. The ordering was never designed. It's a free consequence of packing entries densely and appending them as they arrive.

> [Callout component] Styled info-block component (ported from the feelingdesigner project at ~/projects/feelingdesigner). Renders a rounded card with a tinted background, a 1px left accent bar in the type-specific colour, a quarter-circle SVG in the top-left corner that visually "cuts" the corner, and a floating icon badge that sits half-off the top edge. Seven types are available, each with its own accent colour and icon: info (blue, Info icon, neutral information), warning (yellow, AlertCircle, subtle caution), success (blue, CheckCircle, positive confirmation), error (red, XCircle, something is wrong), thinking (orange, Brain, an insight or mental model), feeling (red, Heart, a subjective observation), and doing (yellow, Hammer, a practical step to take). Used in the post to highlight key insights, contrasts, and gotchas without breaking the prose flow.

The compact dict was sold to the core team as a memory win, and ordered iteration was noted almost as a footnote, at first deliberately left *unguaranteed*, so implementations stayed free to change it. Users relied on it anyway, and by 3.7 the behaviour was promoted to a language guarantee. A structure built to save a third of its memory handed the language an ordering semantics that `collections.OrderedDict` had needed a whole separate class to provide. Optimise the right thing deeply enough and you often get a second thing for free, sometimes more valuable than the first.

## The same structure in other rooms

Open addressing wins because of the **CPU cache line**, the 64-byte chunk your processor pulls from memory in one go. A chained table chases a pointer to a heap node on every collision, and that node is very likely a cache miss: a stall of hundreds of cycles while the processor waits for RAM. An open-addressed table's probe reads the *next array slot*, frequently in the cache line it already loaded or the next one prefetched. A cache miss can cost on the order of a hundred arithmetic operations, so trading pointer-chases for local array reads tends to win even when it does more comparisons. This is why so much of the industry quietly migrated from chaining toward open addressing over the last decade: the textbook cost model counts comparisons, but the machine counts cache misses.

The pattern recurs the moment you look. **Go's map** groups entries into buckets of 8 and stores the top 8 bits of each hash in a small `tophash` array at the front of each bucket, so a lookup scans those one-byte fingerprints before ever touching a key: the same idea as CPython's cached hash, packed for locality. Google's **Swiss tables** (and Rust's `hashbrown`, the standard library's `HashMap` since 2019) push this into the hardware: one metadata byte per slot, scanned 16 at a time with an SSE2 vector compare, so the common case touches a single cache line. **Robin Hood hashing** attacks clustering from another angle. When a probing key has travelled farther from its home slot than the key currently sitting there, it *evicts* the incumbent, equalising probe distances so no key suffers a pathologically long walk. Different language, same three forces: load factor, probe sequence, and the cache line underneath them all.

The dict you use without thinking is a finely balanced negotiation between those three. Collisions were never the problem; clustering was. Deletion was never free; it left a tombstone. And the ordering you rely on was never designed; it was a memory optimisation that happened to remember the order you arrived. Open the demo one more time, insert until it resizes, delete until it's mostly tombstones, and you're watching, directly, the machinery underneath nearly every line of Python you write. Open `{}` again and the probe walk is right there underneath, whether you picture it or not.

## Reading further

- [Knuth, *The Art of Computer Programming, Vol. 3: Sorting and Searching*, §6.4](https://www-cs-faculty.stanford.edu/~knuth/taocp.html): the canonical analysis of open addressing, linear probing, and primary clustering. Equation (2) and its linear-probing correction come straight from here.
- [CPython `Objects/dictobject.c` and `Objects/dictnotes.txt`](https://github.com/python/cpython/blob/main/Objects/dictobject.c): the real implementation of the perturbed probe of equation (3), the 2/3 resize, tombstones (`DKIX_DUMMY`), and the compact split-table layout, all heavily commented.
- [Raymond Hettinger, "Modern Dictionaries" (PyCon 2017 talk) and the python-dev proposal](https://www.youtube.com/watch?v=p33CVV29OG8): the teaching case for the compact dict, why it saves memory and how ordered iteration fell out for free.
- [Aumasson & Bernstein, *SipHash: a fast short-input PRF*](https://www.aumasson.jp/siphash/siphash.pdf): the keyed hash CPython actually uses for strings, and why hash randomisation defeats algorithmic-complexity denial-of-service attacks.
