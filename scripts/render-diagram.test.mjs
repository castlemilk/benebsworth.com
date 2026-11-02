import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const renderer = fileURLToPath(new URL('./render-diagram.py', import.meta.url));

test('LLM diagram output supports captured stdout and ordinary files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'diagram-test-'));
  try {
    const graph = path.join(root, 'graph.json');
    fs.writeFileSync(graph, JSON.stringify({
      title: 'Signal flow',
      nodes: [{ id: 'input', label: 'Input λ' }, { id: 'output', label: 'Output' }],
      edges: [{ from: 'input', to: 'output', label: 'signal' }],
    }));
    const run = destination => execFileSync('python3', [renderer, graph, '--llm', destination], {
      cwd: root,
      encoding: 'utf8',
    });
    const output = path.join(root, 'diagram.md');
    assert.equal(run(output), `wrote LLM-friendly text to ${output}\n`);
    const expected = fs.readFileSync(output, 'utf8');
    assert.match(expected, /^# DIAGRAM: Signal flow\n/);
    assert.match(expected, /Input λ/);
    assert.match(expected, /\[input\] --\[signal\]--> \[output\]/);
    assert.match(expected, /```mermaid\nflowchart LR/);

    // Node captures subprocess stdout through a socket on Unix; reopening
    // /dev/stdout as a file fails there even though the existing stream works.
    for (const destination of ['/dev/stdout', '-']) {
      assert.equal(run(destination), expected);
    }
    assert.equal(fs.existsSync(path.join(root, '-')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
