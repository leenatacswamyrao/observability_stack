import { test, expect } from '@playwright/test';

let recordId; 

test.describe('Chaos App Form-Based CRUD Operations', () => {

  // Automatically append the secure automation token to every single network request
  test.use({
    extraHTTPHeaders: {
      'X-Automation-Test-Token': 'ChaosSecretToken123!'
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
