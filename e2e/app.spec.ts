import { expect, test } from '@playwright/test';

test('home redirects anonymous users to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
});

test('login page renders form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});
