import fs from 'node:fs';
import path from 'node:path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'lab', 'harness-eval');

export function loadIntroContent(): string {
  try {
    return fs.readFileSync(path.join(CONTENT_DIR, 'index.mdx'), 'utf-8');
  } catch {
    return '';
  }
}

export function loadSuiteContent(slug: string): string {
  try {
    return fs.readFileSync(path.join(CONTENT_DIR, 'suites', `${slug}.mdx`), 'utf-8');
  } catch {
    return '';
  }
}

export function loadTaskContent(taskId: string): string {
  try {
    return fs.readFileSync(path.join(CONTENT_DIR, 'tasks', `${taskId}.mdx`), 'utf-8');
  } catch {
    return '';
  }
}
