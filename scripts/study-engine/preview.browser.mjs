import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';

const [root, baseURL] = process.argv.slice(2);
if (!root || !baseURL) throw new Error('Usage: node scripts/study-engine/preview.browser.mjs PREVIEW_ROOT BASE_URL');
const packets = JSON.parse(await readFile(join(root, 'preview.json'), 'utf8'));
assert.ok(packets.length, 'Expected at least one preview packet');
const screenshotDir = process.env.MLSYS_PREVIEW_SCREENSHOTS;
if (screenshotDir) await mkdir(screenshotDir, { recursive: true });

// A chapter can have both supporting figures and a planned primary, as well as
// unillustrated sections. Walk direct article children so gallery copies cannot
// satisfy section-local placement.
async function checkReadingPath(page, sections) {
  const article = page.locator('main article.prose');
  await expect(article.locator('[data-fig-missing], .katex-error')).toHaveCount(0);
  const { headings, figures } = await article.evaluate((element) => {
    const headings = [];
    const figures = [];
    let heading = null;
    for (const child of element.children) {
      if (child.matches('h2,h3')) {
        heading = child.textContent.trim();
        headings.push(heading);
      }
      if (child.matches('figure[id^="fig-"]')) figures.push({ heading, id: child.id.slice(4) });
    }
    return { headings, figures };
  });
  const planned = Object.keys(sections);
  assert.deepEqual(headings.filter((heading) => Object.hasOwn(sections, heading)), planned,
    'Planned headings should appear in the packet in reading order');
  for (const [heading, { figure }] of Object.entries(sections)) {
    if (!figure) continue;
    const primary = /^::(?:fig|chart)\[([\w-]+)\]$/.exec(figure);
    assert.ok(primary && figures.some((item) => item.heading === heading && item.id === primary[1]),
      heading + ' should contain its planned primary ' + figure);
  }
  assert.ok(figures.length, 'Expected a section-local figure or chart');
  return figures.map(({ id }) => id);
}

async function checkQuiz(page, questions) {
  assert.ok(questions.length, 'Expected self-test questions');
  const quiz = page.locator('#self-test');
  await expect(quiz.getByRole('article')).toHaveCount(questions.length);
  const progress = quiz.getByRole('progressbar');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
  let correct = 0;
  let triedDistractor = false;
  for (const [i, data] of questions.entries()) {
    const card = quiz.getByRole('article', { name: 'Question ' + (i + 1), exact: true });
    if (data.kind === 'MCQ') {
      // Exercise both the distractor and correct paths when the chapter has multiple MCQs.
      const answerCorrectly = triedDistractor;
      const index = data.options.findIndex(({ id }) => (id === data.correctOptionId) === answerCorrectly);
      assert.ok(index >= 0, data.id + ' needs a valid choice');
      await card.getByRole('button').nth(index).click();
      await expect(card.getByRole('status')).toContainText(answerCorrectly ? /^correct/i : /not quite/i);
      await expect(card.getByText('Correct answer', { exact: true })).toBeVisible();
      triedDistractor = true;
      correct += Number(answerCorrectly);
    } else {
      assert.ok(['FEYNMAN', 'NUMERIC'].includes(data.kind), 'Unknown question kind ' + data.kind);
      await expect(card.getByText('Model answer', { exact: true })).toHaveCount(0);
      await card.getByRole('button', { name: 'Reveal model answer' }).click();
      await expect(card.locator('.study-quiz-model .text-sm')).toContainText(/\S/);
      const gotIt = data.kind === 'NUMERIC';
      await card.getByRole('button', { name: gotIt ? 'Got it' : 'Missed it', exact: true }).click();
      await expect(card.locator('.study-quiz-self-mark')).toContainText(gotIt ? 'got it' : 'missed');
      correct += Number(gotIt);
    }
    await expect(progress).toHaveAttribute('aria-valuenow', String(i + 1));
  }
  await expect(quiz.locator('.study-quiz-summary')).toContainText(Math.round(correct * 100 / questions.length) + '%');
  await quiz.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
}

const browser = await chromium.launch();
try {
  for (const { title, folder, url } of packets) {
    const { questions } = JSON.parse(await readFile(join(root, folder, 'quiz.json'), 'utf8'));
    const { sections } = JSON.parse(await readFile(join(root, folder, 'diagram-plan.json'), 'utf8'));
    for (const phone of [false, true]) {
      for (const colorScheme of ['light', 'dark']) {
        const screenshotName = folder.replace('/', '-') + '-' + (phone ? 'phone' : 'desktop') + '-' + colorScheme;
        const viewport = phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
        const context = await browser.newContext({ baseURL, viewport, colorScheme, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(15_000);
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (message.type() === 'error' && /hydration|hydrate|server rendered html/i.test(message.text())) errors.push(message.text());
          });
          const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
          assert.ok(response?.ok(), 'Study packet should return a successful response: ' + url);
          await expect(page.locator('html')).toHaveClass(new RegExp('\\b' + colorScheme + '\\b'));
          await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
          // A native <details> can open before React hydrates and cause a hydration mismatch.
          await page.waitForFunction(() => typeof document.querySelector('#self-test .study-question button')?.onclick === 'function',
            undefined, { timeout: 45_000 });
          // Navigate to the end of a long packet the same way a reader would.
          const contents = phone ? page.locator('details.study-toc-mobile') : page.locator('aside.study-toc-rail');
          if (phone) await contents.locator('summary').tap();
          const lastSection = contents.getByRole('navigation', { name: 'Packet contents' }).getByRole('link').last();
          const target = await lastSection.getAttribute('href');
          assert.ok(target?.startsWith('#'), 'The contents link needs a heading anchor');
          await lastSection.click();
          await expect(page.locator('main article.prose').locator(target)).toBeInViewport();
          const figureIds = await checkReadingPath(page, sections);
          for (const id of figureIds) {
            const figure = page.locator('#fig-' + id);
            await expect(figure).toHaveCount(1);
            await figure.scrollIntoViewIfNeeded();
            await expect(figure.locator('figcaption')).toContainText(/\S/);
            const reference = figure.locator(':scope > a');
            if (await reference.count()) {
              await expect(reference).toHaveAccessibleName(/source book figure/i);
              await expect(reference).toHaveAttribute('href', /^https?:\/\//);
              continue;
            }
            const svg = figure.locator('svg').first();
            await expect(svg).toBeVisible({ timeout: 15_000 });
            const box = await figure.boundingBox();
            assert.ok(box && box.x >= -1 && box.x + box.width <= viewport.width + 1, 'Figure must fit the viewport: ' + id);
            const problems = await svg.evaluate((root) => {
              if (!root.classList.contains('study-fig-fit')) return [];
              const frame = root.getBoundingClientRect();
              const labels = [...root.querySelectorAll('text:not(:has(tspan)), tspan:not(:has(tspan))')]
                .map((label) => ({ text: label.textContent, box: label.getBoundingClientRect() }))
                .filter(({ box }) => box.width && box.height);
              const problems = [];
              if (!labels.length) problems.push('no visible labels');
              for (const [index, { text, box }] of labels.entries()) {
                if (box.left < frame.left - 1 || box.right > frame.right + 1 ||
                    box.top < frame.top - 1 || box.bottom > frame.bottom + 1) problems.push('clipped: ' + text);
                for (const other of labels.slice(index + 1)) {
                  const width = Math.min(box.right, other.box.right) - Math.max(box.left, other.box.left);
                  const height = Math.min(box.bottom, other.box.bottom) - Math.max(box.top, other.box.top);
                  if (width > 2 && height > Math.max(2, Math.min(box.height, other.box.height) * 0.2)) {
                    problems.push('overlap: ' + text + ' / ' + other.text);
                  }
                }
              }
              return problems;
            });
            assert.deepEqual(problems, [], 'Figure labels: ' + id);
            if (screenshotDir) {
              await figure.screenshot({ path: join(screenshotDir, screenshotName + '-figure-' + id + '.png') });
            }
          }
          const glosses = page.locator('main article mark[tabindex="0"]').filter({
            has: page.getByRole('note', { includeHidden: true }),
          });
          await expect(glosses.first()).toBeVisible();
          for (const mark of await glosses.all()) {
            await mark.evaluate((element) => element.scrollIntoView({ block: 'center' }));
            if (phone) await mark.tap();
            else await mark.focus();
            const note = mark.getByRole('note');
            await expect(note).toBeVisible();
            const bounds = await note.boundingBox();
            assert.ok(bounds && bounds.x >= -1 && bounds.x + bounds.width <= viewport.width + 1, 'Gloss must fit the viewport');
          }

          for (const toggle of await page.locator('article.prose [data-eq-explainer]').all()) {
            await toggle.click();
            await expect(toggle).toHaveAttribute('aria-expanded', 'true');
            const panel = page.locator('#' + await toggle.getAttribute('aria-controls'));
            await expect(panel.locator('dt').first()).toBeVisible();
            await toggle.click();
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          }
          await checkQuiz(page, questions);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Page must fit the viewport');
          assert.deepEqual(errors, []);
          if (screenshotDir) {
            await page.evaluate(() => window.scrollTo(0, 0));
            // Long mobile packets can exceed Chromium’s maximum bitmap height.
            const fullPage = await page.evaluate(() => document.documentElement.scrollHeight <= 16_384);
            await page.screenshot({ path: join(screenshotDir, screenshotName + '.png'), fullPage });
          }
          process.stdout.write('PASS ' + url + ' ' + (phone ? 'phone' : 'desktop') + ' ' + colorScheme + '\n');
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
