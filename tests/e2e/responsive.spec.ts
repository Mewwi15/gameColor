import { expect, test, type Page, type Locator } from "@playwright/test";

const screens = [
  { name: "narrow phone", width: 280, height: 653, touch: true },
  { name: "small phone", width: 320, height: 568, touch: true },
  { name: "Android phone", width: 360, height: 640, touch: true },
  { name: "iPhone SE", width: 375, height: 667, touch: true },
  { name: "phone portrait", width: 390, height: 844, touch: true },
  { name: "large phone", width: 430, height: 932, touch: true },
  { name: "phone landscape", width: 844, height: 390, touch: true },
  { name: "phone landscape with browser bars", width: 844, height: 320, touch: true },
  { name: "short phone landscape", width: 568, height: 320, touch: true },
  { name: "iPad mini portrait", width: 768, height: 1024, touch: true },
  { name: "iPad Air portrait", width: 820, height: 1180, touch: true },
  { name: "iPad landscape", width: 1024, height: 768, touch: true },
  { name: "small laptop", width: 1280, height: 720, touch: false },
  { name: "short laptop", width: 1280, height: 600, touch: false },
  { name: "laptop", width: 1366, height: 768, touch: false },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "wide desktop", width: 1920, height: 900, touch: false },
  { name: "TV 1080p", width: 1920, height: 1080, touch: false },
  { name: "TV 4K", width: 3840, height: 2160, touch: false },
];

async function ready(page: Page) {
  await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function withinViewport(page: Page, locator: Locator, label: string) {
  const rect = await locator.boundingBox();
  const viewport = page.viewportSize()!;
  expect(rect, label).not.toBeNull();
  expect(rect!.x, `${label}: left edge`).toBeGreaterThanOrEqual(-1);
  expect(rect!.y, `${label}: top edge`).toBeGreaterThanOrEqual(-1);
  expect(rect!.x + rect!.width, `${label}: right edge`).toBeLessThanOrEqual(viewport.width + 1);
  expect(rect!.y + rect!.height, `${label}: bottom edge`).toBeLessThanOrEqual(viewport.height + 1);
}

async function touchDeliver(page: Page) {
  const ball = await page.getByRole("button", { name: /^ลูกบอลสีแดง / }).boundingBox();
  const island = await page.locator('[data-island="warm"] .island-image').boundingBox();
  if (!ball || !island) throw new Error("Missing touch targets");
  const from = { x: ball.x + ball.width / 2, y: ball.y + ball.height / 2 };
  const to = { x: island.x + island.width / 2, y: island.y + island.height * .45 };
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let step = 1; step <= 12; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * step / 12, y: from.y + (to.y - from.y) * step / 12 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

for (const screen of screens) {
  test.describe(screen.name, () => {
    test.use({ viewport: { width: screen.width, height: screen.height }, hasTouch: screen.touch, deviceScaleFactor: screen.touch ? 2 : 1, reducedMotion: "reduce" });

    test("start button, controls, drop targets, alerts, and input remain usable", async ({ page }, testInfo) => {
      await page.goto("/");
      await ready(page);
      await expect(page.locator(".title-art")).toHaveJSProperty("complete", true);
      expect(await page.locator(".title-art").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await withinViewport(page, page.getByRole("link", { name: "เริ่มเกม", exact: true }), "start action");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("welcome.png"), fullPage: true });
      await page.getByRole("link", { name: "เริ่มเกม", exact: true }).click();
      await ready(page);
      expect(await page.locator(".island-image").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await withinViewport(page, page.getByRole("button", { name: /^ลูกบอลสีแดง / }), "draggable ball");
      for (const island of ["warm", "cool", "both"]) await withinViewport(page, page.locator(`[data-island="${island}"]`), `${island} destination`);
      for (const button of await page.locator(".toolbar .tool-button").all()) {
        await withinViewport(page, button, "toolbar control");
        const rect = (await button.boundingBox())!;
        expect(rect.width).toBeGreaterThanOrEqual(44);
        expect(rect.height).toBeGreaterThanOrEqual(44);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("game.png"), fullPage: true });

      await page.locator('[data-island="cool"]').click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      const retry = page.getByRole("button", { name: "ลองสีนี้อีกครั้ง" });
      await retry.scrollIntoViewIfNeeded();
      await withinViewport(page, retry, "alert retry action");
      await retry.click();

      if (screen.touch) await touchDeliver(page);
      else {
        await page.getByRole("button", { name: /^ลูกบอลสีแดง / }).focus();
        await page.keyboard.press("ArrowDown");
        await expect(page.locator('[data-island="warm"]')).toBeFocused();
        await page.keyboard.press("Enter");
      }
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    });
  });
}
