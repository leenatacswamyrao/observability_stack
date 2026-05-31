const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Kept to 1 worker to ensure data seeding tasks run sequentially
  reporter: 'html',
  use: {
    // Falls back to localhost:5000 if page_url isn't explicitly passed
    baseURL: process.env.page_url || 'http://localhost:5000',
    trace: 'on-first-retry',
  },
  
  // FIX: Remove { ...devices['Desktop Chrome'] } 
  // Defining 'browserName: undefined' forces Playwright to run pure API requests.
  projects: [
    {
      name: 'api-suite',
      use: { 
        browserName: undefined 
      },
    },
  ],
});
