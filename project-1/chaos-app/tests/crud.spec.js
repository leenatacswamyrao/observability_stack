import { test, expect } from '@playwright/test';

const testUsername = 'user_static_test';
const testPassword = 'ChaosPassword123!';
let recordId;
let authRequest;

// Helper function to let the port-forward socket breathe
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Chaos App Form-Based CRUD Operations', () => {

  test.beforeEach(async ({ playwright }) => {
    authRequest = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
    });

    // 1. Register the user
    await authRequest.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // 2. Log in
    await authRequest.post('/login', {
      form: { username: testUsername, password: testPassword }
    });

    // CRITICAL FIX: Wait 500ms for the 'connection reset by peer' socket buffer to clear
    await delay(500);
  });

  test.afterEach(async () => {
    if (authRequest) {
      await authRequest.dispose();
    }
  });

  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async () => {
    const response = await authRequest.post('/add', {
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

    const response = await authRequest.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async () => {
    test.skip(!recordId, 'Skipping Update: Record ID was not captured.');

    const response = await authRequest.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async () => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not captured.');

    const response = await authRequest.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
  });
});
