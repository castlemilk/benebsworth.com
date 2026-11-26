# Hardware Acceleration as a worked reel

Reviewed the built Chapter 11 player at 390 and 1440 px. Times below are rounded down to the displayed second. The [narration and authored cues](../../../../study/mlsys/vol1/11-hw-acceleration/podcast.md) show what the speaker says at each transition.

| Moment | What the listener encounters | Editorial decision |
|---|---|---|
| 0:53 | The speaker specifies a 4,096 × 4,096 projection, two-byte inputs and weights, and 32-bit partial sums. The picture works through a stationary weight of 3, producing 7 and 17. | Use a small matrix sketch labelled with dimensions, storage precision and accumulation precision here. Keep the stationary-weight picture for 4:44, when the speaker explains local reuse. |
| 2:37 through 3:17 | The first voice compares A and B at batch 1. The second compares them at batch 256. Both pairs stay in view. The 33.6 µs value is legible beside the shortest bar on a phone. | Hold the comparison across both voices. Returning to it at 9:47 also works because the listener can now explain why the ranking changed. [Comparison slide](../../../../public/study-audio/vol1/11-hw-acceleration/projection-time.svg) |
| 5:50 into 6:12 | The equation gives the general capacity condition. While it is on screen the speaker already asks the listener to compare 80 KiB with 96 KiB. The next diagram shows both, and the second allocation at 128 KiB. | For this recording, try moving the budget diagram one turn earlier and holding it through double buffering. For a new script, an earlier derivation turn could give the symbolic equation its own job. [Tile diagram](../../../../study/mlsys/vol1/11-hw-acceleration/diagrams/tile-budget.svg) |

The playback tests passed on both viewports. The first and third observations require comparing the spoken claim with the content of the frame. A functioning transition can still cue the wrong part of a lesson.
