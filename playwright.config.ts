import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://127.0.0.1:5174',
    // Locally this runs in the Edge already installed on the machine. CI has no
    // Edge, so it falls back to the Chromium Playwright installs itself — both
    // are Chromium, and pinning the channel in CI would only add a browser
    // download that buys nothing. Spread rather than `channel: undefined`,
    // which exactOptionalPropertyTypes rejects.
    ...(process.env.CI ? {} : { channel: 'msedge' as const }),
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
