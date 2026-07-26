import { chromium } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3003';
const OUT_DIR = process.env.SCREENSHOT_DIR ?? '../screen-shot';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const shot = async (name: string, url: string, action?: () => Promise<void>) => {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
    if (action) await action();
    await page.screenshot({ path: `${OUT_DIR}/${name}`, type: 'jpeg', quality: 85 });
    console.log(`✅ ${name}`);
  };

  // 1. Landing / login redirect
  await shot('01-landing.jpg', '/');

  // 2. Dashboard
  await shot('02-dashboard.jpg', '/dashboard');

  // 3. Dashboard scrolled (payroll history)
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.screenshot({ path: `${OUT_DIR}/03-dashboard-history.jpg`, type: 'jpeg', quality: 85 });
  console.log('✅ 03-dashboard-history.jpg');

  // 4. New payroll page
  await shot('04-payroll-new.jpg', '/payroll/new');

  // 5. Preview step after loading sample roster
  await page.goto(`${BASE_URL}/payroll/new`, { waitUntil: 'networkidle' });
  const sampleBtn = page.getByRole('button', { name: /Load sample roster/i });
  if (await sampleBtn.isVisible()) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: `${OUT_DIR}/05-payroll-preview.jpg`, type: 'jpeg', quality: 85 });
  console.log('✅ 05-payroll-preview.jpg');

  // 6. Mobile view of dashboard
  await page.setViewportSize({ width: 375, height: 812 });
  await shot('06-mobile-dashboard.jpg', '/dashboard');

  await browser.close();
  console.log('\n🎉 All screenshots saved to', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
