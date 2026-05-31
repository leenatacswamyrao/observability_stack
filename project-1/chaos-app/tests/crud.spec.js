import { test, expect } from '@playwright/test';

// 1. Declare file-level variables for data and context sharing
const testUsername = 'user_' + Date.now();
const testPassword = 'ChaosPassword123!';
let sharedContext;
let recordId; 

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // Create the context and authenticate ONCE for the entire test file execution
  test.beforeAll(async ({ playwright }) => {
    sharedContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });

    // Register the test user
    await sharedContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // Log in to capture the valid session cookies inside this specific instance
    await sharedContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });
  });

  // This saves the cookie jar physically to disk
    await setupContext.storageState({ path: 'playwright/.auth/user.json' });
    await setupContext.dispose();
  });

  // 2. Tell Playwright to automatically inject those cookies into ALL tests down below
  test.use({ storageState: 'playwright/.auth/user.json' });


  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async () => {
    // CRITICAL: Use sharedContext directly instead of the isolated { request } fixture!
    const response = await sharedContext.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    // Parse out the record ID dynamically from the HTML links
    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);
  });

  // --- READ ---
  test('2. READ - View the specific edit page for the record', async () => {
    test.skip(!recordId, 'Skipping Read: Record ID was not successfully captured.');

    const response = await sharedContext.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async () => {
    test.skip(!recordId, 'Skipping Update: Record ID was not successfully captured.');

    const response = await sharedContext.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async () => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not successfully captured.');

    const response = await sharedContext.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
    console.log(`Record ${recordId} successfully deleted.`);
  });
});
