# 0006 — The karaoke follower interpolated; it was never accurate

**Executive summary.** The audio-overview karaoke sweep looked correct but
was systematically wrong in two ways: it painted from the ~4 Hz `timeupdate`
clock (up to ~250 ms stale at every paint), and it distributed segment time
uniformly across *wrapped text lines*, so sparse lines raced and dense lines
lagged. The fix replaced interpolation with measured word timing — whisper
word-level alignment on the joined audio — rendered per-word from the live
`audio.currentTime` on a rAF loop, with a weighted fallback.

## Timeline

- **2026-11-16** — the karaoke read-along shipped with the audio overview:
  segment boundaries measured exactly from each WAV, but intra-segment
  progress interpolated `p = (t-start)/(end-start)` across `clientHeight/lh`
  line counts, driven by the 4 Hz `timeupdate` path.
- **2026-11-20** — ch8's packet shipped; Ben flagged the follower as needing
  to be more accurate. The defects were architectural, not tunable: both the
  clock source and the progress model had to change.
- **2026-11-20** — `TranscriptWord` added to `proto/study.proto`;
  `scripts/study-align.py` aligned all 8 chapters (8,727 words, 0 strays);
  `audio-overview.tsx` rewritten as a per-word rAF sweep; verified live.

## Root cause

Two independent approximations compounded:

1. **The clock.** `onTimeUpdate` fires ~4 Hz per spec. Every paint used the
   last delivered `currentTime`, so the sweep ran up to a quarter-second
   behind the audio it claimed to follow. Reading `audio.currentTime`
   directly on a rAF loop is exact — the value is live; only the event is
   throttled.
2. **The model.** Uniform-rate interpolation across rendered lines assumed
   every line held equal speech time. Wrapped lines hold unequal word counts,
   TTS pauses at punctuation, and each segment's WAV carries ~300 ms of
   lead-in silence — all invisible to a line-count model. Whisper-measured
   word boundaries (~±50-100 ms on clean TTS speech) replaced the model with
   data; a char+punctuation-weighted interpolation remains as the fallback
   for unaligned transcripts.

A third latent defect surfaced during the fix: `buf generate` wiped the
hand-maintained `LabCategory` block in `lib/gen/content.ts` — the build's
own typecheck caught it, as designed.

## Guardrails

- `scripts/study-align.py` — whisper alignment runs automatically inside
  `study-podcast.py` after joining; standalone re-runs per chapter or
  `--all`. Decodes via `afconvert` because the box's ffmpeg is broken.
- `lib/study/load.ts` — `readTranscript` now validates word shape
  all-or-nothing per segment: one malformed word drops the array to the
  interpolation fallback rather than skewing the proportional zip.
- `components/mdx/audio-overview.test.tsx` — pins the contract: authored
  text zips over aligned timings, count mismatches map proportionally in
  range, fallback boundaries cover the segment contiguously with
  punctuation-aware weighting, `wordIndexAt` clamps before-start /
  holds-through-pauses / returns last word past end, and the active
  segment alone renders `.ao-w` spans.
- `SKILL.md` — documents that stale `words[]` after a podcast.md edit are
  worse than no timing at all: patch both transcript copies and re-align
  or drop the array.
