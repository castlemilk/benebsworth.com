'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatModelLabel } from '@/lib/lab/harness-eval/labels';
import { harnessComparePath, harnessModelPath } from '@/lib/lab/harness-eval/nav';

/**
 * Open a side-by-side comparison from the model list.
 *
 * The page is a static export, so this cannot be a form that posts anywhere:
 * it picks two models in the browser and hands off to the comparison route,
 * which is a real prerendered page. State lives here only long enough to
 * build that link, so there is no query-string comparison that dies on reload
 * or loses the pair when someone shares the URL.
 *
 * The form works without JavaScript: every option set submits to the compare
 * index, which links to the model pages, and each model page lists its own
 * ranked comparisons. This control is the fast path, not the only path.
 */

export interface ComparePickerModel {
  id: string;
  label: string;
  passRate: number;
  totalTasks: number;
  /** Task keys this model has runs for, so the picker can say what a pair shares. */
  taskKeys: string[];
}

function sharedCount(a: ComparePickerModel, b: ComparePickerModel): number {
  const other = new Set(b.taskKeys);
  return a.taskKeys.reduce((n, key) => (other.has(key) ? n + 1 : n), 0);
}

export function ComparePicker({ models }: { models: ComparePickerModel[] }) {
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');

  const leftModel = models.find((m) => m.id === left);
  const rightModel = models.find((m) => m.id === right);
  // How much a pair would actually show: 37 of the 66 possible pairs have no
  // task in common, and saying so up front beats landing someone on a page
  // whose comparison is two coverage lists and nothing else.
  const shared = leftModel && rightModel ? sharedCount(leftModel, rightModel) : null;

  // Offer each model as the opponent for the current pick, so a pair can never
  // end up comparing a model with itself.
  const rightOptions = useMemo(
    () => (left ? models.filter((m) => m.id !== left) : models),
    [models, left]
  );
  const leftOptions = useMemo(
    () => (right ? models.filter((m) => m.id !== right) : models),
    [models, right]
  );

  const ready = left !== '' && right !== '' && left !== right;

  return (
    <section className="mb-10 border-y border-[var(--color-border)] py-6">
      <h2 className="text-[16px] font-medium text-fg">Compare two models</h2>
      <p className="mt-1 mb-4 max-w-[70ch] text-[16px] text-muted">
        The same tasks, run by both, with the rows where they disagree first.
      </p>
      <form
        className="flex flex-wrap items-end gap-x-4 gap-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) window.location.href = harnessComparePath(left, right);
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] text-muted">First model</span>
          <select
            value={left}
            onChange={(event) => {
              const next = event.target.value;
              setLeft(next);
              if (next !== '' && next === right) setRight('');
            }}
            className="min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-fg"
          >
            <option value="">Choose a model</option>
            {leftOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.passRate}%)
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] text-muted">versus</span>
          <select
            value={right}
            onChange={(event) => {
              const next = event.target.value;
              setRight(next);
              if (next !== '' && next === left) setLeft('');
            }}
            className="min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px] text-fg"
          >
            <option value="">Choose a model</option>
            {rightOptions.map((m) => {
              // With a first model picked, the option says what picking it buys:
              // how many tasks the two would be compared on.
              const n = leftModel ? sharedCount(leftModel, m) : null;
              return (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.passRate}%)
                  {n === null ? '' : n === 0 ? ' — no shared tasks' : ` — ${n} shared`}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg bg-[var(--color-fg)] px-4 py-2 text-[16px] font-medium text-[var(--color-bg)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Compare side by side
        </button>
      </form>
      {ready && (
        <p className="mt-3 text-[15px] text-muted">
          {shared === 0 ? (
            <>
              These two have no task in common, so the page will show their coverage rather than a head-to-head.{' '}
              <Link href={harnessComparePath(left, right)} className="underline underline-offset-4">
                Open it anyway
              </Link>
              .
            </>
          ) : (
            <>
              {`${String(shared)} task${shared === 1 ? '' : 's'} in common.`}{' '}
              <Link href={harnessComparePath(left, right)} className="underline underline-offset-4">
                {formatModelLabel(left)} vs {formatModelLabel(right)}
              </Link>
            </>
          )}
        </p>
      )}
      <p className="mt-3 text-[15px] text-muted">
        Prefer to start from a model?{' '}
        <Link
          href={models[0] ? harnessModelPath(models[0].id) : '/lab/harness-eval/models/'}
          className="underline underline-offset-4"
        >
          Every model page lists its own comparisons
        </Link>
        , ranked by how much the comparison would teach.
      </p>
    </section>
  );
}
