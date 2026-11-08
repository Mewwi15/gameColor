import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4310",
    channel: process.env.GAMECOLOR_BUNDLED_BROWSER === "1" ? undefined : "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: "**/responsive.spec.ts", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: "**/responsive.spec.ts", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
    { name: "responsive", testMatch: "**/responsive.spec.ts" },
  ],
  webServer: { command: "npm run dev", url: "http://127.0.0.1:4310", reuseExistingServer: true, timeout: 60000 },
});
