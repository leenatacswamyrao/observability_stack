import { test, expect } from '@playwright/test';

// Declare file-level variables so all test blocks share the exact same context
const testUsername = 'user_' + Date.now();
const testPassword = 'ChaosPassword123!';
let authenticatedContext;
let recordId; 

test.describe('Chaos App Form-Based CRUD Operations', () => {

  test.beforeAll(async ({ playwright }) => {
    // Create the shared request context
    authenticatedContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });

    // 1. Register the user
    await authenticatedContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // 2. Log in to plant the session cookies into this context
    await authenticatedContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });
  });

  test.afterAll(async () => {
    if (authenticatedContext) {
      await authenticatedContext.dispose();
    }
  });
  
  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async () => {
    // Use the context that holds the session cookie
    const response = await authenticatedContext.post('/add', {
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

    const response = await authenticatedContext.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async () => {
    test.skip(!recordId, 'Skipping Update: Record ID was not successfully captured.');

    const response = await authenticatedContext.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
    expect(dashboardHtml).not.toContain('Chaos Engineering Initial Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async () => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not successfully captured.');

    const response = await authenticatedContext.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
    console.log(`Record ${recordId} successfully deleted.`);
  });
});
