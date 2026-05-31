import { test, expect } from '@playwright/test';

// Helper function to slow down the network execution rate
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Chaos App Form-Based CRUD Operations', () => {
  
  test('Execute Complete Lifecycle Sequential CRUD Flow', async ({ request }) => {
    const testUsername = `user_${Date.now()}`; 
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

    // CRITICAL BUFFER FIX: Give the kubectl port-forward tunnel 1 second to clear 
    // its 'connection reset by peer' TCP socket state before hitting the next endpoint.
    await delay(1000);

    // 3. --- CREATE ---
    const createResponse = await request.post('/add', {
      form: { content: 'Chaos Engineering Initial Metric' }
    });
    expect(createResponse.ok()).toBeTruthy();

    const dashboardHtml = await createResponse.text();
    expect(dashboardHtml).toContain('Chaos Engineering Initial Metric');

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
