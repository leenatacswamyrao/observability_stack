import { test, expect } from '@playwright/test';

// 1. Declare variables at the file level so all tests can share them
const testUsername = 'user_' + Date.now();
const testPassword = 'ChaosPassword123!';
let recordId; 

test.describe('Chaos App Form-Based CRUD Operations', () => {

  test.beforeAll(async ({ playwright }) => {
    const apiContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });

    // Register the user
    await apiContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // Log in to capture the valid session cookies
    await apiContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });

    // Save the authenticated storage state to a temporary file
    await apiContext.storageState({ path: 'auth.json' });
    await apiContext.dispose();
  });

  // Automatically load the authenticated session cookies for all subsequent steps
  test.use({ storageState: 'auth.json' });
  
  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async ({ request }) => {
    // FIX: Clean syntax using the built-in, pre-authenticated 'request' context
    const response = await request.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    
    expect(response.ok()).toBeTruthy();

    // Verify the record was added by reading the dashboard page HTML
    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    // Parse out the record ID dynamically from the HTML links
    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);
  });

  // --- READ ---
  test('2. READ - View the specific edit page for the record', async ({ request }) => {
    test.skip(!recordId, 'Skipping Read: Record ID was not successfully captured.');

    const response = await request.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async ({ request }) => {
    test.skip(!recordId, 'Skipping Update: Record ID was not successfully captured.');

    const response = await request.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
    expect(dashboardHtml).not.toContain('Chaos Engineering Initial Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async ({ request }) => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not successfully captured.');

    const response = await request.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
    console.log(`Record ${recordId} successfully deleted.`);
  });
});
