import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: process.env.QA_BASE_URL || "http://127.0.0.1:3000",
    launchOptions: {
      executablePath:
        process.env.QA_CHROME_EXECUTABLE ??
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
  },
  reporter: "list",
});
