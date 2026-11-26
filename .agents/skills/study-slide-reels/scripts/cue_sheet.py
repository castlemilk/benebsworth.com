"""Read a generated study transcript as a cue sheet, leaving its timing files untouched."""

import argparse
import json
import textwrap
from pathlib import Path


def clock(seconds):
    minutes, centiseconds = divmod(round(seconds * 100), 6000)
    return f"{minutes}:{centiseconds // 100:02d}.{centiseconds % 100:02d}"


def cue(segment):
    visual = segment.get("visual") or {}
    if visual.get("src"):
        return visual.get("title") or visual["src"], visual["src"], visual.get("alt", "")
    equation = segment.get("eq") or {}
    if equation.get("latex"):
        return equation.get("title") or equation.get("id", "Equation"), equation["latex"], ""
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--turn", type=int, help="show one numbered turn, its full narration and the slide it inherits")
    args = parser.parse_args()
    try:
        segments = json.loads(args.transcript.read_text())["segments"]
        if not isinstance(segments, list) or not segments:
            parser.error("expected a transcript with a nonempty segments array")
        if args.turn is not None and not 1 <= args.turn <= len(segments):
            parser.error(f"choose a turn from 1 to {len(segments)}")
        showing = None
        for number, segment in enumerate(segments, 1):
            change = cue(segment)
            start = clock(segment["start"])
            if change:
                showing = (number, start, *change)
            speaker = segment["speaker"]
            speech = segment["text"]
            if args.turn is None:
                action = "no visual"
                if change:
                    action = "show " + change[0]
                elif showing:
                    action = f"hold turn {showing[0]}"
                print(f"{number:>2}  {start:>8}  {action} | {speaker}: {textwrap.shorten(speech, width=90)}")
            elif number == args.turn:
                print(f"Turn {number} · {start}–{clock(segment['end'])} · {speaker}\n{speech}")
                if showing:
                    origin, since, title, asset, alt = showing
                    print(f"\nOn screen since turn {origin} ({since}) · {title}\n{asset}")
                    if alt:
                        print(alt)
                else:
                    print("\nNo visual has been cued yet.")
                return
    except (OSError, KeyError, ValueError, TypeError) as error:
        parser.exit(1, f"{args.transcript}: {error}\n")


if __name__ == "__main__":
    main()
