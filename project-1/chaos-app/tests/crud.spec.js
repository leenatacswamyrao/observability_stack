import { test, expect } from '@playwright/test';

// Declare file-level variables for data sharing across steps
const testUsername = 'user_' + Date.now();
const testPassword = 'ChaosPassword123!';
let recordId; 

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // Authenticate before EVERY test execution block to keep the network pipeline perfectly fresh
  test.beforeEach(async ({ request }) => {
    // 1. Silent registration
    await request.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // 2. Clear the authentication gate to bind session cookies directly to this execution worker
    await request.post('/login', {
      form: { username: testUsername, password: testPassword }
    });
  });

  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async ({ request }) => {
    const response = await request.post('/add', {
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
