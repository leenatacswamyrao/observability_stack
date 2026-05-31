import { test, expect } from '@playwright/test';

// Generate dynamic test credentials per test run
const testUsername = 'user_' + Date.now();
const testPassword = 'ChaosPassword123!';

// Use test.use to share storage state automatically
test.describe('Chaos App Form-Based CRUD Operations', () => {

  test.beforeAll(async ({ playwright }) => {
    // 1. Create a lightweight API context to register and log in
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });

    // 2. Register the user
    await apiContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // 3. Log in to capture the valid session cookies
    await apiContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });

    // 4. Save the authenticated storage state to a temporary file
    await apiContext.storageState({ path: 'auth.json' });
    await apiContext.dispose();
  });

  // Tell ALL tests in this file to automatically load the authenticated session cookies!
  test.use({ storageState: 'auth.json' });

  test('1. CREATE - Add a brand new record', async ({ page }) => {
    // Go directly to the creation or dashboard page—you are already logged in!
    await page.goto('/');
  });
  
  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async () => {
    const response = await apiContext.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    
    // Flask redirects back to /dashboard on success (Status 200 or 302 depending on followRedirect)
    expect(response.ok()).toBeTruthy();

    // Verify the record was added by reading the dashboard page HTML
    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    // Parse out the record ID dynamically from the HTML links (e.g., /edit/1 or /delete/1)
    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);
  });

  // --- READ ---
  test('2. READ - View the specific edit page for the record', async () => {
    test.skip(!recordId, 'Skipping Read: Record ID was not successfully captured.');

    const response = await apiContext.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async () => {
    test.skip(!recordId, 'Skipping Update: Record ID was not successfully captured.');

    const response = await apiContext.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    // Verify dashboard reflects the update
    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
    expect(dashboardHtml).not.toContain('Chaos Engineering Initial Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async () => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not successfully captured.');

    const response = await apiContext.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    // Verify it is clean and gone from the dashboard layout
    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
    console.log(`Record ${recordId} successfully deleted.`);
  });
});
