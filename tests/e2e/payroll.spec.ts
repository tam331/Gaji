import { test, expect } from '@playwright/test';

test.describe('Gaji — Dashboard', () => {
  test('loads dashboard with Gaji branding', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Gaji').first()).toBeVisible();
    await expect(page.locator('text=One click. Every worker paid in USDC.')).toBeVisible();
  });

  test('shows stats cards on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText('Total Disbursed', { exact: true })).toBeVisible();
    await expect(page.getByText('Payroll Runs', { exact: true })).toBeVisible();
    await expect(page.getByText('Workers', { exact: true }).first()).toBeVisible();
  });

  test('shows payroll history section', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Payroll History')).toBeVisible();
  });

  test('New Run button navigates to create page', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=New Run');
    await expect(page).toHaveURL('/payroll/new');
  });
});

test.describe('Gaji — New Payroll', () => {
  test('shows upload page with step indicator', async ({ page }) => {
    await page.goto('/payroll/new');
    await expect(page.locator('text=New Payroll Run')).toBeVisible();
    await expect(page.locator('text=1. Upload')).toBeVisible();
    await expect(page.locator('text=2. Preview')).toBeVisible();
    await expect(page.locator('text=3. Disburse')).toBeVisible();
  });

  test('load sample roster shows 5 workers', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await expect(page.locator('text=Ahmad Rizki')).toBeVisible();
    await expect(page.locator('text=Siti Nurbaya')).toBeVisible();
    await expect(page.locator('text=Nguyen Van Hoa')).toBeVisible();
  });

  test('shows total USDC preview', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await expect(page.locator('text=750.00 USDC').first()).toBeVisible();
  });

  test('shows worker count and sponsored count', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await expect(page.locator('text=5').first()).toBeVisible();
    await expect(page.getByText('Workers', { exact: true }).first()).toBeVisible();
  });

  test('Fund & Disburse button present on preview', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await expect(page.locator('text=Fund & Disburse')).toBeVisible();
  });

  test('back button returns to upload step', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await page.click('text=← Back');
    await expect(page.locator('text=Drop CSV here')).toBeVisible();
  });
});

test.describe('Gaji — Mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dashboard renders on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=Gaji').first()).toBeVisible();
  });

  test('new payroll page renders on mobile', async ({ page }) => {
    await page.goto('/payroll/new');
    await expect(page.locator('text=New Payroll Run')).toBeVisible();
  });

  test('sample roster loads on mobile', async ({ page }) => {
    await page.goto('/payroll/new');
    await page.getByRole('button', { name: /Load sample roster/i }).click();
    await expect(page.locator('text=Ahmad Rizki')).toBeVisible();
  });
});
