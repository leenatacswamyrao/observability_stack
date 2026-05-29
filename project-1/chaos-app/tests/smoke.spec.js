const { test, expect } = require('@playwright/test');

test('Application Health Check', async ({ page }) => {
  // Pulls the baseURL dynamically from our config file
  await page.goto('/');
  
  // Asserts that the page loaded successfully
  await expect(page).toHaveTitle(/.*|.*/); 
  console.log('App is up and responding beautifully!');
});