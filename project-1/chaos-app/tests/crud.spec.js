const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' }); // Enforces sequential step order

test.describe('Chaos App Form-Based CRUD Operations', () => {
  let apiContext;
  let recordId;
  const testUsername = `user_${Date.now()}`;
  const testPassword = 'ChaosPassword123$'; // Meets all length, case, number, and special char rules

 let page;

  test.beforeAll(async ({ playwright }) => {
    // 1. Launch a real browser instance to handle state and cookies perfectly
    const browser = await playwright.chromium.launch();
    const context = await browser.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });
    page = await context.newPage();

    // 2. SIGNUP - Fill out the signup interface
    await page.goto('/signup');
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // 3. LOGIN - Authenticate to capture the valid session state
    await page.goto('/login');
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify we cleared the gate and landed on the dashboard layout
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Share the cookies back to your main execution context
    apiContext = context.request;
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
