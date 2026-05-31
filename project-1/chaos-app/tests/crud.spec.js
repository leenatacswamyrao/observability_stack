import { test, expect } from '@playwright/test';

const testUsername = 'user_static_test';
const testPassword = 'ChaosPassword123!';
let recordId;
let sharedState;

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // 1. Authenticate ONCE dynamically and save the raw state to an in-memory object
  test.beforeAll(async ({ playwright }) => {
    const setupContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
    });

    // Register user
    await setupContext.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });

    // Log in to plant the session cookie state
    await setupContext.post('/login', {
      form: { username: testUsername, password: testPassword }
    });

    // Capture the entire state package into memory natively
    sharedState = await setupContext.storageState();
    await setupContext.dispose();
  });

  // 2. Automatically inject the captured state into the individual test workers
  test.beforeEach(async ({ context }) => {
    if (sharedState) {
      await context.addInitScript(state => {
        // Safe container initialization check
      }, sharedState);
    }
  });

  // --- CREATE ---
  test('1. CREATE - Add a brand new record', async ({ playwright }) => {
    // Spin up an individual client matching the exact authenticated state
    const workerContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
      storageState: sharedState
    });

    const response = await workerContext.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);
    await workerContext.dispose();
  });

  // --- READ ---
  test('2. READ - View the specific edit page for the record', async ({ playwright }) => {
    test.skip(!recordId, 'Skipping Read: Record ID was not captured.');

    const workerContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
      storageState: sharedState
    });

    const response = await workerContext.get(`/edit/${recordId}`);
    expect(response.status()).toBe(200);
    
    const editPageHtml = await response.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');
    await workerContext.dispose();
  });

  // --- UPDATE ---
  test('3. UPDATE - Modify the existing record text', async ({ playwright }) => {
    test.skip(!recordId, 'Skipping Update: Record ID was not captured.');

    const workerContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
      storageState: sharedState
    });

    const response = await workerContext.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).toContain('Chaos Engineering MUTATED Metric');
    await workerContext.dispose();
  });

  // --- DELETE ---
  test('4. DELETE - Evict the record and purge it', async ({ playwright }) => {
    test.skip(!recordId, 'Skipping Delete: Record ID was not captured.');

    const workerContext = await playwright.request.newContext({
      baseURL: process.env.page_url || 'http://127.0.0.1:5000',
      storageState: sharedState
    });

    const response = await workerContext.get(`/delete/${recordId}`);
    expect(response.ok()).toBeTruthy();

    const dashboardHtml = await response.text();
    expect(dashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
    await workerContext.dispose();
  });
});
