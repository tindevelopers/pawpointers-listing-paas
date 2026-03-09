import { test, expect } from '@playwright/test';

/**
 * E2E session isolation: customer (portal 3030) and merchant (dashboard 3032) use
 * separate browser contexts. Verifies no cross-contamination of sessions or data.
 *
 * Prerequisites:
 * - Portal on 3030 and dashboard on 3032 (e.g. pnpm dev)
 * - Or set PORTAL_BASE_URL and DASHBOARD_BASE_URL
 * - Credentials: E2E_CUSTOMER_PASSWORD (default 88888888), E2E_MERCHANT_PASSWORD
 */

const PORTAL_BASE = process.env.PORTAL_BASE_URL ?? 'http://localhost:3030';
const DASHBOARD_BASE = process.env.DASHBOARD_BASE_URL ?? 'http://localhost:3032';

const CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL ?? 'systemadmin@tin.info';
const CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD ?? '88888888';
const MERCHANT_EMAIL = process.env.E2E_MERCHANT_EMAIL ?? 'tanzin@act.world';
const MERCHANT_PASSWORD = process.env.E2E_MERCHANT_PASSWORD ?? '88888888';

test.describe('Session isolation: customer (portal 3030) vs merchant (3032)', () => {
  test('two separate sessions show correct user and data; no cross-contamination', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const customerContext = await browser.newContext();
    const merchantContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    const merchantPage = await merchantContext.newPage();

    try {
      // ---- Session 1: Customer (portal 3030) - systemadmin@tin.info ----
      await customerPage.goto(`${PORTAL_BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await customerPage.getByLabel(/Email/i).fill(CUSTOMER_EMAIL);
      await customerPage.getByLabel(/Password/i).fill(CUSTOMER_PASSWORD);
      await customerPage.getByRole('button', { name: /Sign in/i }).click();

      // Portal redirects to / on success (returnUrl default)
      try {
        await customerPage.waitForURL((u) => u.pathname === '/' || u.pathname.startsWith('/dashboard'), { timeout: 25000 });
      } catch {
        const path = new URL(customerPage.url()).pathname;
        if (path.includes('signin')) {
        const errBox = customerPage.getByRole('alert').or(customerPage.locator('[class*="red-50"], [class*="red-900"]').first());
        const errText = (await errBox.textContent().catch(() => ''))?.trim().slice(0, 120) || 'Ensure portal runs on 3030 and systemadmin@tin.info / E2E_CUSTOMER_PASSWORD are valid.';
        throw new Error(`Portal sign-in did not redirect. ${errText}`);
        }
        throw new Error(`Portal sign-in: expected redirect to / or /dashboard, got ${path}`);
      }
      await customerPage.goto(`${PORTAL_BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await expect(customerPage).toHaveURL(/\/dashboard/);

      // Customer-specific: Member Dashboard, Welcome back, pet-friendly / account content
      await expect(customerPage.getByText(/Member Dashboard/i).first()).toBeVisible({ timeout: 10000 });
      await expect(customerPage.getByText(/Welcome back/i).first()).toBeVisible({ timeout: 5000 });
      await expect(customerPage.getByText(CUSTOMER_EMAIL)).toBeVisible({ timeout: 5000 });
      await expect(customerPage.getByText(/Your space for pet-friendly|Account|Explore|Your activity/i).first()).toBeVisible({ timeout: 5000 });

      // ---- Session 2: Merchant (dashboard 3032) - tanzin@act.world ----
      if (!MERCHANT_PASSWORD) {
        test.skip(true, 'E2E_MERCHANT_PASSWORD not set; skipping merchant login');
        return;
      }

      await merchantPage.goto(`${DASHBOARD_BASE}/signin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await merchantPage.locator('input[name="email"]').fill(MERCHANT_EMAIL);
      await merchantPage.locator('input[name="password"]').fill(MERCHANT_PASSWORD);
      await merchantPage.getByRole('button', { name: /Continue/i }).click();

      await merchantPage.waitForURL(/\/dashboard/, { timeout: 15000 });
      await expect(merchantPage).toHaveURL(/\/dashboard/);

      await expect(merchantPage.getByText(/Listings|Bookings|Reviews|Inbox/i).first()).toBeVisible({ timeout: 10000 });
      await expect(merchantPage.getByText(/Publish a listing|Boost your profile/i).first()).toBeVisible({ timeout: 5000 });
      // Merchant identity: open user dropdown (shows email) or check header
      await merchantPage.getByRole('button', { name: /Account|\.\.\.|tanzin|@/i }).first().click();
      await expect(merchantPage.getByText(MERCHANT_EMAIL).or(merchantPage.getByText(/tanzin/i))).toBeVisible({ timeout: 8000 });

      // ---- Isolation: re-check both sessions ----
      await customerPage.goto(`${PORTAL_BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await expect(customerPage).toHaveURL(/\/dashboard/);
      await expect(customerPage.getByText(CUSTOMER_EMAIL)).toBeVisible({ timeout: 5000 });
      await expect(customerPage.getByText(MERCHANT_EMAIL)).not.toBeVisible();

      await merchantPage.goto(`${DASHBOARD_BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await expect(merchantPage).toHaveURL(/\/dashboard/);
      await merchantPage.getByRole('button', { name: /Account|\.\.\.|tanzin|@/i }).first().click();
      await expect(merchantPage.getByText(MERCHANT_EMAIL).or(merchantPage.getByText(/tanzin/i))).toBeVisible({ timeout: 8000 });
      await expect(merchantPage.getByText(CUSTOMER_EMAIL)).not.toBeVisible();
    } finally {
      await customerContext.close().catch(() => {});
      await merchantContext.close().catch(() => {});
    }
  });
});
