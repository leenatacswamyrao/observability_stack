const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' }); // Enforces sequential step order

test.describe('Chaos App Form-Based CRUD Operations', () => {
  let apiContext;
  let recordId;
  const testUsername = `user_${Date.now()}`;
  const testPassword = 'Password123!'; // Meets all length, case, number, and special char rules

 test.beforeAll(async ({ playwright }) => {
    // 1. Enable followRedirect so Playwright follows Flask's redirect(url_for('login'))
    apiContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
      extraHTTPHeaders: { 'Origin': process.env.page_url || 'http://localhost:5000' }
    });

    // 2. SIGNUP - Provision a new test user
    const signupResponse = await apiContext.post('/signup', {
      form: { username: testUsername, password: testPassword },
      maxRedirects: 2 // Allow it to follow the 302 redirect to the login page
    });
    
    // If signup failed, the HTML will contain the flashed error text
    const signupHtml = await signupResponse.text();
    if (signupHtml.contains('Username already exists')) {
       console.error("Signup failed: Username constraint collision in Postgres.");
    }

    // 3. LOGIN - Establish the session cookie on our context
    const loginResponse = await apiContext.post('/login', {
      form: { username: testUsername, password: testPassword },
      maxRedirects: 2
    });
    
    const loginHtml = await loginResponse.text();
    expect(loginHtml).toContain('Dashboard'); // Ensure we actually landed on the dashboard!
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
