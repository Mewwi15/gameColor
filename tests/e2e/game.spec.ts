import { expect, test } from "@playwright/test";

test("welcome, help, wrong alert, retry, all colors, completion, and restart", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ภารกิจส่งสีไป 3 เกาะ" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("welcome.png"), fullPage: true });
  await page.getByRole("button", { name: "เล่นยังไงนะ?" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("ม่วงและเหลืองอยู่ได้ทั้งสองโทน")).toBeVisible();
  await page.getByRole("button", { name: "เข้าใจแล้ว ไปกันเลย!" }).click();
  await page.getByRole("link", { name: "เริ่มเกม", exact: true }).click();
  await expect(page).toHaveURL(/\/play/);
  await expect(page.getByRole("button", { name: /^ลูกบอลสีแดง / })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("game.png"), fullPage: true });

  // The wrong island must show the explanation and keep the current color.
  await page.getByRole("button", { name: "ส่งไปเกาะโทนเย็น", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByText("สีแดงเป็นสีโทนร้อน ต้องส่งไปที่เกาะโทนร้อนนะ")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await page.screenshot({ path: testInfo.outputPath("wrong-alert.png"), fullPage: true });
  await page.getByRole("button", { name: "ลองสีนี้อีกครั้ง" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^ลูกบอลสีแดง / })).toBeVisible();

  const answers = [
    ["แดง", "โทนร้อน"], ["น้ำเงิน", "โทนเย็น"], ["เหลือง", "โทนร้อน"], ["ชมพู", "โทนร้อน"],
    ["เขียว", "โทนเย็น"], ["ม่วง", "สองโทน"], ["ส้ม", "โทนร้อน"], ["ฟ้า", "โทนเย็น"],
  ];
  for (const [i, [color, island]] of answers.entries()) {
    await expect(page.getByRole("button", { name: new RegExp(`^ลูกบอลสี${color} `) })).toBeVisible();
    await page.getByRole("button", { name: `ส่งไปเกาะ${island}`, exact: true }).click();
    await expect(page.getByText("ถูกต้อง เก่งมาก!", { exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(i + 1));
    if (i < answers.length - 1) await expect(page.getByRole("button", { name: new RegExp(`^ลูกบอลสี${answers[i + 1][0]} `) })).toBeVisible();
  }
  await expect(page.getByRole("dialog", { name: "ภารกิจสำเร็จแล้ว!" })).toBeVisible();
  await expect(page.getByText("ตอบถูกตั้งแต่ครั้งแรก 7 สี · ฝึกเพิ่ม 1 ครั้ง")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("complete.png"), fullPage: true });
  await page.getByRole("button", { name: "ผจญภัยอีกครั้ง" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");

  // Sound preference survives navigation and a page reload.
  await page.getByRole("button", { name: "ปิดเสียง", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "เปิดเสียง", exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("dragging a ball to an island works and dropping outside does not submit", async ({ page }, testInfo) => {
  await page.goto("/play");
  const ball = page.getByRole("button", { name: /^ลูกบอลสีแดง/ });
  await expect(ball).toBeVisible();
  // Stop decorative movement to make the pointer path deterministic.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const ballRect = await ball.boundingBox();
  const islandRect = await page.getByRole("button", { name: "ส่งไปเกาะโทนร้อน", exact: true }).boundingBox();
  if (!ballRect || !islandRect) throw new Error("Missing drag targets");
  if (testInfo.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    const start = { x: ballRect.x + ballRect.width / 2, y: ballRect.y + ballRect.height / 2 };
    const end = { x: islandRect.x + islandRect.width / 2, y: islandRect.y + islandRect.height / 2 };
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (let i = 1; i <= 10; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: start.x + (end.x - start.x) * i / 10, y: start.y + (end.y - start.y) * i / 10 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(ballRect.x + ballRect.width / 2, ballRect.y + ballRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(4, 250, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await expect(page.locator('[data-ball-motion="idle"]')).toHaveCount(1);
    await page.mouse.move(ballRect.x + ballRect.width / 2, ballRect.y + ballRect.height / 2);
    await page.mouse.down();
    await page.mouse.move(islandRect.x + islandRect.width / 2, islandRect.y + islandRect.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await expect(page.getByText("ถูกต้อง เก่งมาก!", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("keyboard answers and restart cancellation preserve progress", async ({ page }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: /^ลูกบอลสีแดง/ }).focus();
  await page.keyboard.press("1");
  await expect(page.getByText("ถูกต้อง เก่งมาก!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "เริ่มเกมใหม่", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "เล่นต่อจากเดิม" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  await expect(page.getByRole("button", { name: /^ลูกบอลสีน้ำเงิน / })).toBeVisible();
  await page.getByRole("button", { name: "เริ่มเกมใหม่", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "เริ่มเกมใหม่", exact: true }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
});
