import { test, expect } from '@playwright/test';

const testUsername = 'automation_user_final';
const testPassword = 'ChaosPassword123!';
let recordId;
let sessionContext; // Persistent container to hold session cookies across steps

// 1. Establish the context once and log in
test.beforeAll(async ({ playwright }) => {
  sessionContext = await playwright.request.newContext({
    baseURL: process.env.page_url || 'http://127.0.0.1:5000',
  });

  // Register the user
  await sessionContext.post('/signup', {
    form: { username: testUsername, password: testPassword }
  });

  // Log in to capture the session cookie into this specific instance
  await sessionContext.post('/login', {
    form: { username: testUsername, password: testPassword }
  });
});

// Clean up the connection context when everything finishes
test.afterAll(async () => {
  if (sessionContext) {
    await sessionContext.dispose();
  }
});

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // --- CREATE ---
  // FIX: Notice we do NOT pass { request } here. We use the persistent sessionContext variable!
  test('1. CREATE - Add a brand new record', async () => {
    const response = await sessionContext.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);
  });

  // --- READ ---
  test('2. READ - View the specific edit page for the record', async () => {
    test.skip(!recordId, 'Skipping Read: Record ID was not captured.');

    const response = await sessionContext.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async () => {
    test.skip(!recordId, 'Skipping Update: Record ID was not captured.');

    const response = await sessionContext.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async () => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not captured.');

    const response = await sessionContext.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
  });
});
