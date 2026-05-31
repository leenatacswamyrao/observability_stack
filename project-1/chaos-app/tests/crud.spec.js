import { test, expect } from '@playwright/test';

test.describe('Chaos App Form-Based CRUD Operations', () => {
  
  // Running everything inside one continuous sequence forces the API context
  // to preserve cookies and session state perfectly across your operations.
  test('Execute Complete Lifecycle Sequential CRUD Flow', async ({ request }) => {
    const testUsername = `user_${Date.now()}`; // Unique username to prevent conflicts
    const testPassword = 'ChaosPassword123!';
    let recordId;

    // 1. --- SIGNUP ---
    const signupResponse = await request.post('/signup', {
      form: { username: testUsername, password: testPassword }
    });
    expect(signupResponse.ok()).toBeTruthy();

    // 2. --- LOGIN ---
    const loginResponse = await request.post('/login', {
      form: { username: testUsername, password: testPassword }
    });
    expect(loginResponse.ok()).toBeTruthy();

    // 3. --- CREATE ---
    const createResponse = await request.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    expect(createResponse.ok()).toBeTruthy();

    const dashboardHtml = await createResponse.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

    // Extract the created record ID from the dashboard links
    const match = dashboardHtml.match(/\/edit\/(\d+)/);
    expect(match).not.toBeNull();
    recordId = match[1];
    console.log(`Successfully Extracted Created Record ID: ${recordId}`);

    // 4. --- READ ---
    const readResponse = await request.get(`/edit/${recordId}`);
    expect(readResponse.status()).toBe(200);
    
    const editPageHtml = await readResponse.text();
    expect(editPageHtml).toContain('Chaos Engineering Initial Metric');

    // 5. --- UPDATE ---
    const updateResponse = await request.post(`/edit/${recordId}`, {
      form: { content: 'Chaos Engineering MUTATED Metric' }
    });
    expect(updateResponse.ok()).toBeTruthy();

    const updatedDashboardHtml = await updateResponse.text();
    expect(updatedDashboardHtml).toContain('Chaos Engineering MUTATED Metric');

    // 6. --- DELETE ---
    const deleteResponse = await request.get(`/delete/${recordId}`);
    expect(deleteResponse.ok()).toBeTruthy();

    const finalDashboardHtml = await deleteResponse.text();
    expect(finalDashboardHtml).not.toContain('Chaos Engineering MUTATED Metric');
  });
});
