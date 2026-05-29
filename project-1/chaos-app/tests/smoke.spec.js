const { test, expect } = require('@playwright/test');

// Change { page } to { request } to use native API fetching
test('Application Health Check', async ({ request }) => {
  
  // This executes a direct HTTP GET request using your config's baseURL
  const response = await request.get('/');
  
  // Log the output directly to your Jenkins console
  console.log(`Status Received: ${response.status()}`);
  
  // Verify the status code is a clean 200 OK
  expect(response.status()).toBe(200);
});
