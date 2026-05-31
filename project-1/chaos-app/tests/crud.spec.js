import { test, expect } from '@playwright/test';

const testUsername = 'user_static_test';
const testPassword = 'ChaosPassword123!';
let savedCookies = []; // Store cookies dynamically in memory
let recordId;

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // 1. One-time setup to validate credentials and capture cookies in memory
  test.beforeAll(async ({ playwright }) => {
    const setupContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://localhost:5000',
    });

    // Register user
    await setupContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // Log in to verify credentials and generate a fresh session token
    await setupContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });

    // Extract the valid session cookies directly from memory
    savedCookies = await setupContext.cookies();
    await setupContext.dispose();
  });

  // 2. Intercept the test execution fixture to apply the active cookies manually
  test.beforeEach(async ({ context }) => {
    if (savedCookies.length > 0) {
      await context.addCookies(savedCookies);
    }
  });

  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async ({ request }) => {
    const response = await request.post('/add', {
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
  test('2. READ - View the specific edit page for the record', async ({ request }) => {
    test.skip(!recordId, 'Skipping Read: Record ID was not captured.');

    const response = await request.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async ({ request }) => {
    test.skip(!recordId, 'Skipping Update: Record ID was not captured.');

    const response = await request.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async ({ request }) => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not captured.');

    const response = await request.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
  });
});
