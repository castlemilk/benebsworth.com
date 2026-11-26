"""Generate a chapter's two-host audio overview from podcast.md.

Run:  uv run --with 'mlx-audio,misaki[en]' scripts/study-podcast.py <vol> <slug>
e.g.  uv run --with 'mlx-audio,misaki[en]' scripts/study-podcast.py vol1 01-introduction

podcast.md format:
  `# hosts: Marcus | Iris`  display names for speakers A/B (comment — never spoken)
  `A:` / `B:`               utterance start; continuation lines join the turn
  `::eq[<id>]`              on its own line inside a turn — stripped from speech,
                            tags the segment with that equations.json entry
  `::fig[<id>]`             slide from the chapter's diagrams.json
  `![alt](/path/to/image)`  slide from public/; put one visual cue in a turn
Use --sync-cues after <slug> to update an existing recording's slide track.
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
import xml.etree.ElementTree as ET
from pathlib import Path

MODEL = 'mlx-community/Kokoro-82M-4bit'
VOICES = {'A': 'am_michael', 'B': 'af_heart'}
ROOT = Path(__file__).resolve().parent.parent


def parse_script(path: Path):
    """Separate spoken turns from their optional visual cues."""
    hosts = {}
    segments, cur = [], None
    for line in path.read_text().split('\n'):
        s = line.strip()
        hm = re.match(r'^#\s*hosts?\s*:\s*(.+)$', s, re.I)
        if hm:
            for key, name in zip(('A', 'B'), [n.strip() for n in re.split(r'[|&,]', hm.group(1)) if n.strip()]):
                hosts[key] = name
            continue
        marker = re.fullmatch(r'::(eq|fig)\[([\w-]+)\]', s)
        image = re.fullmatch(r'!\[([^\]]+)\]\((/[^\s)]+)\)', s)
        if marker or image:
            if cur is None or cur['cue']:
                raise ValueError(f'{path}: place one visual cue inside a speaker turn: {s}')
            cur['cue'] = marker.groups() if marker else ('image', *image.groups())
            continue
        if s.startswith(('::eq[', '::fig[', '![')):
            raise ValueError(f'{path}: malformed visual cue: {s}')
        m = re.match(r'^([AB]):\s+(.+)$', s)
        if m:
            if cur:
                segments.append(cur)
            cur = {'speaker': m.group(1), 'voice': VOICES[m.group(1)], 'text': m.group(2).strip(), 'cue': None}
        elif cur and s and not s.startswith('#'):
            cur['text'] += ' ' + s
    if cur:
        segments.append(cur)
    return hosts, segments


def resolve_cues(folder, vol, slug, turns):
    def manifest(name):
        path = folder / name
        return {row['id']: row for row in json.loads(path.read_text())} if path.exists() else {}

    figures, equations = manifest('diagrams.json'), manifest('equations.json')
    public = ROOT / 'public'
    for turn in turns:
        cue = turn['cue']
        turn['media'] = {}
        if not cue:
            continue
        kind, value, *_ = cue
        if kind == 'eq' and value in equations:
            turn['media']['eq'] = {k: equations[value][k] for k in ('id', 'title', 'latex')}
        elif kind == 'fig' and value in figures:
            fig = figures[value]
            filename = fig['file']
            svg = ET.parse(folder / 'diagrams' / filename).getroot()
            alt = svg.findtext('{http://www.w3.org/2000/svg}desc') or fig.get('caption') or fig['title']
            turn['media']['visual'] = {'src': f'/study/{vol}/{slug}/diagrams/{filename}',
                                       'title': fig['title'], 'alt': alt}
        elif kind == 'image':
            src = cue[2]
            file = (public / src.lstrip('/')).resolve()
            if src.startswith('//') or not file.is_relative_to(public) or not file.is_file():
                raise ValueError(f'{folder}: missing local image {src}')
            alt = ET.parse(file).getroot().findtext('{http://www.w3.org/2000/svg}desc') if file.suffix == '.svg' else None
            turn['media']['visual'] = {'src': src, 'title': value, 'alt': alt or value}
        else:
            raise ValueError(f'{folder}: unknown {kind} cue {value}')


def sync_cues(script, out_dir, slug, turns):
    path = script.with_name('transcript.json')
    transcript = json.loads(path.read_text())
    recorded = transcript['segments']
    if len(recorded) != len(turns):
        raise ValueError('Turn count changed. Regenerate the recording before syncing cues.')
    for index, (entry, turn) in enumerate(zip(recorded, turns), 1):
        previous = {k: entry[k] for k in ('eq', 'visual') if k in entry}
        if entry['speaker'] != turn['speaker']:
            raise ValueError(f'Speaker changed at turn {index}.')
        if previous != turn['media']:
            if re.findall(r'\w+', entry['text']) != re.findall(r'\w+', turn['text']):
                raise ValueError(f'Spoken words differ at turn {index}. Check the cue against the recording.')
            for key in previous:
                del entry[key]
            entry.update(turn['media'])
    payload = json.dumps(transcript, indent=2)
    path.write_text(payload)
    (out_dir / f'{slug}.transcript.json').write_text(payload)


def main():
    vol, slug = sys.argv[1], sys.argv[2]
    script = (ROOT / 'study' / 'research' / slug if vol == 'research' else ROOT / 'study' / 'mlsys' / vol / slug) / 'podcast.md'
    if not script.exists():
        sys.exit(f'no podcast.md at {script}')

    hosts, segments = parse_script(script)
    out_dir = ROOT / 'public' / 'study-audio' / vol
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f'{slug}.m4a'

    resolve_cues(script.parent, vol, slug, segments)
    if sys.argv[3:] == ['--sync-cues']:
        sync_cues(script, out_dir, slug, segments)
        return
    if sys.argv[3:]:
        sys.exit('usage: study-podcast.py <vol> <slug> [--sync-cues]')

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
            entry = {'speaker': seg['speaker'],
                     'text': seg['text'], 'start': round(cursor, 2),
                     'end': round(cursor + dur, 2), **seg['media']}
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

    # Word-level karaoke timing: whisper-align the joined audio into the
    # transcript (uv caches the env; skip quietly if unavailable).
    align = ROOT / 'scripts' / 'study-align.py'
    try:
        subprocess.run(['uv', 'run', '--with', 'mlx-whisper', str(align), vol, slug], check=True, cwd=ROOT)
    except subprocess.CalledProcessError as e:
        print(f'warning: word alignment failed ({e.returncode}) — karaoke falls back to interpolation')


if __name__ == '__main__':
    main()
