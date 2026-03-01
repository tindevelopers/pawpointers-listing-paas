#!/usr/bin/env npx tsx
/**
 * Browser automation: sign in as gene@tin.info and book an appointment at any merchant.
 * Requires: portal running at PORT (default 3030), Playwright installed (npx playwright install chromium).
 *
 * Usage:
 *   npx tsx scripts/book-appointment-browser.ts
 *   PORT=3031 npx tsx scripts/book-appointment-browser.ts
 */

import { chromium } from "playwright";

const PORT = process.env.PORT || "3030";
const BASE = `http://localhost:${PORT}`;
const EMAIL = "gene@tin.info";
const PASSWORD = "88888888";

async function main() {
  console.log("[1] Launching browser...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Sign in
    console.log("[2] Navigating to sign-in...");
    await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForSelector('input[id="email"]', { timeout: 10000 }).catch(() => {
      throw new Error("Sign-in page: email input not found. Is the portal running at " + BASE + "?");
    });
    await page.fill('input[id="email"]', EMAIL);
    await page.fill('input[id="password"]', PASSWORD);
    await page.waitForTimeout(400); // allow React state to sync before submit
    await page.click('button[type="submit"]', { force: true });
    // Wait for either redirect (success) or error message (stay on signin)
    await Promise.race([
      page.waitForURL((u) => !u.pathname.includes("signin"), { timeout: 20000 }),
      page.waitForSelector("[class*='red-50'], [class*='red-900/30']", { timeout: 20000 }),
    ]).catch(() => {});
    await page.waitForLoadState("domcontentloaded");
    const url = page.url();
    if (url.includes("signin")) {
      const errBox = page.locator("[class*='red-50'], [class*='red-900'], [class*='text-red']").first();
      const errText = (await errBox.textContent().catch(() => ""))?.trim() || "";
      const fallback = await page.locator("form").first().textContent().catch(() => "");
      throw new Error("Sign-in failed (still on signin). " + (errText || fallback?.slice(0, 200) || "Check credentials."));
    }
    console.log("[3] Signed in.");

    // Homepage and open first listing
    console.log("[4] Going to homepage to find a listing...");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const listingLink = page.locator('a[href^="/listings/"]').first();
    await listingLink.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
      throw new Error("No listing links found on homepage. Seed data or check " + BASE);
    });
    const href = await listingLink.getAttribute("href");
    if (!href) throw new Error("Listing link has no href");
    await listingLink.click();
    await page.waitForURL(/\/listings\/[^/]+/, { timeout: 10000 });
    console.log("[5] Opened listing:", href);

    // Book Now
    console.log("[6] Opening Book Now modal...");
    await page.getByRole("button", { name: /book now/i }).first().click();
    await page.waitForSelector('input[type="date"]', { timeout: 5000 }).catch(() => {
      throw new Error("Booking modal did not open (date input not found).");
    });

    // Pick a future date
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + 3);
    const dateStr = future.toISOString().slice(0, 10);
    await page.fill('input[type="date"]', dateStr);
    await page.waitForTimeout(800); // allow availability fetch

    // Pick first available time
    const timeBtn = page.locator('button:has-text("AM"), button:has-text("PM")').first();
    await timeBtn.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
      throw new Error("No time slots visible. Try another date or check availability API.");
    });
    await timeBtn.click({ force: true });
    await page.getByRole("button", { name: /continue/i }).click({ force: true });

    // Service step: select first service
    await page.waitForSelector('text=Select Service', { timeout: 5000 });
    const serviceCard = page.locator('[class*="border-orange"], [class*="cursor-pointer"]').filter({ hasText: /Full Grooming|Bath|Nail|De-shedding|\\$/ }).first();
    await serviceCard.click({ force: true });
    await page.getByRole("button", { name: /review booking/i }).click({ force: true });

    // Confirmation: confirm booking
    await page.waitForSelector('text=Confirm Booking', { timeout: 5000 });
    await page.getByRole("button", { name: /confirm booking/i }).click({ force: true });

    // Success
    await page.waitForSelector('text=Booking Confirmed', { timeout: 15000 }).catch(async () => {
      const errEl = page.locator('.text-red-600, [class*="text-red"]').first();
      const errText = await errEl.textContent().catch(() => "");
      throw new Error("Booking did not confirm. " + (errText || "Check network/API."));
    });
    console.log("[7] Booking confirmed successfully.");
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : e);
    await page.screenshot({ path: "scripts/book-appointment-error.png" }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
