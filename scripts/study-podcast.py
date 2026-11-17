"""Generate a chapter's two-host audio overview from podcast.md.

Run:  uv run --with 'mlx-audio,misaki[en]' scripts/study-podcast.py <vol> <slug>
e.g.  uv run --with 'mlx-audio,misaki[en]' scripts/study-podcast.py vol1 01-introduction

podcast.md format:
  `# hosts: Marcus | Iris`  display names for speakers A/B (comment — never spoken)
  `A:` / `B:`               utterance start; continuation lines join the turn
  `::eq[<id>]`              on its own line inside a turn — stripped from speech,
                            tags the segment with that equations.json entry
Voices: A=am_michael, B=af_heart (Kokoro).
Outputs:
  public/study-audio/<vol>/<slug>.m4a            joined AAC audio
  study/mlsys/<vol>/<slug>/transcript.json       canonical karaoke transcript
  public/study-audio/<vol>/<slug>.transcript.json  same, fetchable by MDX
"""

import json
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

MODEL = 'mlx-community/Kokoro-82M-4bit'
VOICES = {'A': 'am_michael', 'B': 'af_heart'}
ROOT = Path(__file__).resolve().parent.parent


def parse_script(path: Path):
    """Return (hosts, segments); each segment is {voice, text, eq}."""
    hosts = {}
    segments, cur = [], None
    for line in path.read_text().split('\n'):
        s = line.strip()
        hm = re.match(r'^#\s*hosts?\s*:\s*(.+)$', s, re.I)
        if hm:
            for key, name in zip(('A', 'B'), [n.strip() for n in re.split(r'[|&,]', hm.group(1)) if n.strip()]):
                hosts[key] = name
            continue
        em = re.match(r'^::eq\[([^\]]+)\]$', s)
        if em:
            if cur is not None:
                cur['eq'] = em.group(1)
            else:
                print(f'warning: {em.group(0)} before any utterance — ignored')
            continue
        m = re.match(r'^([AB]):\s+(.+)$', s)
        if m:
            if cur:
                segments.append(cur)
            cur = {'voice': VOICES[m.group(1)], 'text': m.group(2).strip(), 'eq': None}
        elif cur and s and not s.startswith('#'):
            cur['text'] += ' ' + s
    if cur:
        segments.append(cur)
    return hosts, segments


def main():
    vol, slug = sys.argv[1], sys.argv[2]
    script = ROOT / 'study' / 'mlsys' / vol / slug / 'podcast.md'
    if not script.exists():
        sys.exit(f'no podcast.md at {script}')

    hosts, segments = parse_script(script)
    out_dir = ROOT / 'public' / 'study-audio' / vol
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f'{slug}.m4a'

    # Resolve ::eq[…] markers against the chapter's equations.json now, so the
    # public transcript copy carries {id,title,latex} self-contained.
    equations = {}
    eq_path = script.parent / 'equations.json'
    if eq_path.exists():
        for e in json.loads(eq_path.read_text()):
            equations[e['id']] = {'id': e['id'], 'title': e.get('title', ''), 'latex': e.get('latex', '')}
    for seg in segments:
        if seg['eq'] and seg['eq'] not in equations:
            print(f'warning: ::eq[{seg["eq"]}] not in equations.json — dropped')
            seg['eq'] = None

    from mlx_audio.tts.generate import generate_audio

    with tempfile.TemporaryDirectory() as tmp:
        chunks = []
        for i, seg in enumerate(segments):
            generate_audio(
                text=seg['text'],
                model=MODEL,
                voice=seg['voice'],
                save=True,
                file_prefix=f'seg_{i:03d}',
                output_path=tmp,
                verbose=False,
            )
            chunks.append(Path(tmp) / f'seg_{i:03d}_000.wav')
            print(f'[{i + 1}/{len(segments)}] {seg["voice"]}: {seg["text"][:60]}…', flush=True)

        # concat wavs (all Kokoro output is 24kHz mono pcm); measure each
        # segment's duration for the karaoke transcript as we join
        joined = Path(tmp) / 'joined.wav'
        transcript, cursor = [], 0.0
        frames = None
        params = None
        for seg, p in zip(segments, chunks):
            with wave.open(str(p), 'rb') as w:
                if params is None:
                    params = w.getparams()
                    frames = b''
                data = w.readframes(w.getnframes())
                frames += data
                dur = w.getnframes() / w.getframerate()
            entry = {'speaker': 'A' if seg['voice'] == VOICES['A'] else 'B',
                     'text': seg['text'], 'start': round(cursor, 2),
                     'end': round(cursor + dur, 2)}
            if seg['eq']:
                entry['eq'] = equations[seg['eq']]
            transcript.append(entry)
            cursor += dur
        with wave.open(str(joined), 'wb') as out:
            out.setparams(params)
            out.writeframes(frames)

        subprocess.run(
            ['afconvert', '-f', 'm4af', '-d', 'aac', str(joined), str(dest)],
            check=True,
        )

    # transcript.json: canonical copy beside podcast.md (loaded by /study),
    # public copy beside the .m4a (fetchable by MDX <AudioOverview transcriptSrc>).
    tjson = json.dumps({'hosts': hosts, 'segments': transcript}, indent=2)
    (script.parent / 'transcript.json').write_text(tjson)
    (out_dir / f'{slug}.transcript.json').write_text(tjson)
    print(f'wrote {dest} + transcript.json ({len(transcript)} segments, {cursor:.1f}s)')


if __name__ == '__main__':
    main()
