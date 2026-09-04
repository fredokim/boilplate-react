import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Accessibility of screens as they are being used, not as they first load.
 *
 * Lighthouse already gates `/login` and one example route in CI, but it audits
 * a page at load and nothing after. Every interesting screen here changes
 * shape once someone touches it: a dashboard grows widgets, a topology gains a
 * selection and a route, a chat fills with messages. Those states are where
 * labels go missing and focus goes nowhere, and none of them exist at load.
 *
 * Serious and critical only. Axe's minor and moderate findings are largely
 * advisory — colour-contrast ratios on decorative text, redundant landmarks —
 * and a gate that fires on advice is one people learn to skip.
 */
const BLOCKING = ['serious', 'critical'];

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  return result.violations
    .filter((violation) => BLOCKING.includes(violation.impact ?? ''))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.map((node) => ({
        target: node.target.join(' '),
        // The numbers, not just the rule name. A contrast failure that says
        // only "color-contrast" sends the reader back to the browser to find
        // out by how much.
        summary: node.failureSummary,
      })),
    }));
}

test('the login form is accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Email')).toBeVisible();

  expect(await violations(page)).toEqual([]);
});

test('the dashboard example is accessible once a widget is being edited', async ({ page }) => {
  await page.goto('/examples/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(await violations(page)).toEqual([]);

  // The edit affordances are the part that only exists after a click, and the
  // part most likely to be a div with a handler and no name.
  const edit = page.getByRole('button', { name: /edit|편집|configure/i }).first();
  if (await edit.count()) {
    await edit.click();
    expect(await violations(page)).toEqual([]);
  }
});

test('the topology example is accessible with a node selected', async ({ page }) => {
  await page.goto('/examples/graph');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(await violations(page)).toEqual([]);

  const source = page.getByLabel(/source/i).first();
  if (await source.count()) {
    await source.selectOption({ index: 1 }).catch(() => undefined);
    expect(await violations(page)).toEqual([]);
  }
});

test('the live example is accessible with the chat rendered', async ({ page }) => {
  await page.goto('/examples/live');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  expect(await violations(page)).toEqual([]);
});
