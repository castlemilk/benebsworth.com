"""Align transcript.json words to the joined .m4a via whisper word timestamps.

Run:  uv run --with 'mlx-whisper' scripts/study-align.py <vol> <slug>
      uv run --with 'mlx-whisper' scripts/study-align.py <vol> --all

Reads public/study-audio/<vol>/<slug>.m4a + the chapter's transcript.json,
runs whisper with word_timestamps=True, and writes a `words` array into
each segment ({text,start,end} — absolute seconds in the .m4a). Words are
assigned to the segment whose [start,end] window contains the word's
midpoint; the sweep in AudioOverview uses them verbatim, falling back to
char-weighted interpolation on segments that get none.

Kokoro output is clean TTS speech, so alignment is typically within
~50-100 ms of the true boundary — far tighter than the uniform-rate
interpolation it replaces.
"""

import json
import sys
from pathlib import Path

MODEL = 'mlx-community/whisper-small-mlx'
ROOT = Path(__file__).resolve().parent.parent


def align(vol: str, slug: str) -> None:
    pkg = (ROOT / 'study' / 'research' / slug if vol == 'research' else ROOT / 'study' / 'mlsys' / vol / slug)
    audio = ROOT / 'public' / 'study-audio' / vol / f'{slug}.m4a'
    tpath = pkg / 'transcript.json'
    if not audio.exists() or not tpath.exists():
        print(f'skip {vol}/{slug}: missing {audio if not audio.exists() else tpath}')
        return
    data = json.loads(tpath.read_text())
    segments = data.get('segments', [])
    if not segments:
        print(f'skip {vol}/{slug}: no segments')
        return

    import mlx_whisper
    import numpy as np
    import subprocess
    import tempfile
    import wave

    # mlx_whisper's file loader shells out to ffmpeg, which is broken on this
    # box — decode the m4a with afconvert (macOS built-in) to 16kHz mono PCM
    # and hand whisper the array directly.
    with tempfile.TemporaryDirectory() as tmp:
        wav_path = Path(tmp) / 'joined.wav'
        subprocess.run(
            ['afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', str(audio), str(wav_path)],
            check=True,
        )
        with wave.open(str(wav_path), 'rb') as w:
            pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    audio_arr = pcm.astype(np.float32) / 32768.0
    result = mlx_whisper.transcribe(audio_arr, path_or_hf_repo=MODEL, word_timestamps=True, verbose=False)
    words = []
    for wseg in result.get('segments', []):
        for w in wseg.get('words', []):
            text = w.get('word', '').strip()
            if text:
                words.append({'text': text, 'start': round(w['start'], 2), 'end': round(w['end'], 2)})
    words.sort(key=lambda w: w['start'])
    if not words:
        print(f'fail {vol}/{slug}: whisper returned no words')
        return

    # Assign each word to the transcript segment containing its midpoint.
    # Segments are contiguous and words arrive in order — walk a cursor.
    si = 0
    for seg in segments:
        seg['words'] = []
    stray = 0
    for w in words:
        mid = (w['start'] + w['end']) / 2
        while si + 1 < len(segments) and mid >= segments[si]['end']:
            si += 1
        if segments[si]['start'] <= mid < segments[si]['end'] or (si == len(segments) - 1 and mid < segments[si]['end'] + 0.5):
            segments[si]['words'].append(w)
        else:
            stray += 1

    covered = sum(1 for s in segments if s['words'])
    print(f'{vol}/{slug}: {len(words)} words → {covered}/{len(segments)} segments, {stray} stray')

    tjson = json.dumps(data, indent=2)
    tpath.write_text(tjson)
    (audio.parent / f'{slug}.transcript.json').write_text(tjson)


def main():
    vol, slug = sys.argv[1], sys.argv[2]
    root = ROOT / 'public' / 'study-audio' / vol
    slugs = sorted(p.stem for p in root.glob('*.m4a')) if slug == '--all' else [slug]
    for s in slugs:
        align(vol, s)


if __name__ == '__main__':
    main()
