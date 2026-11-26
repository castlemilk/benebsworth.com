import { cp, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const canonicalRoot = fileURLToPath(new URL('../../study/mlsys/', import.meta.url));
const roman = ['0', 'I', 'II', 'III', 'IV', 'V'];

async function prepareRun(directory) {
  const run = JSON.parse(await readFile(join(directory, 'run.json'), 'utf8'));
  const match = typeof run.id === 'string' && run.id.match(/^vol([1-5])\/(\d{2})_[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
  if (run.status !== 'accepted' || !match || typeof run.title !== 'string' || !run.title.trim() || /[\r\n]/.test(run.title)) {
    throw new Error('Preview needs an accepted run with a valid packet ID and title: ' + directory);
  }
  const volume = Number(match[1]);
  const folder = run.id.replaceAll('_', '-');
  const source = join(directory, 'packet');
  for (const file of ['packet.md', 'quiz.json']) {
    if (!(await lstat(join(source, file))).isFile()) throw new Error('Expected packet file ' + join(source, file));
  }
  return { id: run.id, title: run.title.trim(), volume, chapter: match[2], folder, source, url: '/study/' + folder + '/' };
}

async function makePreview(output, directories) {
  const root = join(await realpath(dirname(resolve(output))), basename(resolve(output)));
  const fromCanonical = relative(await realpath(canonicalRoot), root);
  if (!fromCanonical || fromCanonical !== '..' && !fromCanonical.startsWith('..' + sep)) {
    throw new Error('Preview root must be outside the canonical Study directory');
  }
  const packets = (await Promise.all(directories.map(prepareRun))).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(packets.map(({ folder }) => folder)).size !== packets.length) throw new Error('Duplicate preview packet route');
  const curriculum = ['# Machine Learning Systems preview'];
  const progress = [
    '| Chapter | Packet | Reviewed | Quiz | Post | Notes |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const volume of new Set(packets.map((packet) => packet.volume))) {
    const chapters = packets.filter((packet) => packet.volume === volume);
    curriculum.push('', '## Volume ' + roman[volume] + ': Study Engine Preview (' + chapters.length + ' ch)', '');
    for (const { id, title } of chapters) curriculum.push('- [P] `' + id + '`: ' + title);
    for (const chapter of new Set(chapters.map((packet) => packet.chapter))) {
      progress.push('| vol' + volume + '/' + chapter + ' | preview | — | — | — | — |');
    }
  }
  await mkdir(root);
  try {
    for (const { source, folder } of packets) {
      await cp(source, join(root, folder), {
        recursive: true,
        filter: async (sourcePath) => {
          const entry = await lstat(sourcePath);
          if (!entry.isFile() && !entry.isDirectory()) throw new Error('Unsupported packet entry: ' + sourcePath);
          return true;
        },
      });
    }
    const manifest = packets.map(({ id, title, folder, url }) => ({ id, title, folder, url }));
    await writeFile(join(root, 'curriculum.md'), curriculum.join('\n') + '\n');
    await writeFile(join(root, 'progress.md'), progress.join('\n') + '\n');
    await writeFile(join(root, 'preview.json'), JSON.stringify(manifest, null, 2) + '\n');
    return { root, packets: manifest };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

try {
  const [output, ...runs] = process.argv.slice(2);
  if (!output || !runs.length) throw new Error('Usage: node scripts/study-engine/preview.mjs NEW_ROOT RUN_DIR [RUN_DIR ...]');
  process.stdout.write(JSON.stringify(await makePreview(output, runs), null, 2) + '\n');
} catch (error) {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
}
