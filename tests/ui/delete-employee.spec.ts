import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { BASE_URL, API_TOKEN, ENDPOINTS } from '../../helpers/api-client';
import * as dotenv from 'dotenv';
dotenv.config();

test.describe('Delete Employee', () => {
  let dashboard: DashboardPage;
  let testEmployeeId: string;

  test.beforeEach(async ({ page, request }) => {
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: { firstName: 'DelUI', lastName: 'Target', dependants: 0 },
    });
    expect(res.status()).toBe(200);
    testEmployeeId = (await res.json()).id;

    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test.afterEach(async ({ request }) => {
    // Attempt cleanup in case test didn't delete the employee
    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(testEmployeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });
  });

  test('clicking delete icon opens the Delete confirmation modal', async ({ page }) => {
    await dashboard.openDeleteModal(testEmployeeId);
    await expect(page.locator('#deleteModal')).toBeVisible();
  });

  test('delete modal shows the employee first and last name', async ({ page }) => {
    await dashboard.openDeleteModal(testEmployeeId);
    await expect(dashboard.deleteFirstName).toHaveText('DelUI');
    await expect(dashboard.deleteLastName).toHaveText('Target');
  });

  test('confirming delete removes employee from the table', async ({ page }) => {
    await dashboard.openDeleteModal(testEmployeeId);
    await dashboard.confirmDelete();

    const rows = await dashboard.getEmployeeRows();
    const found = rows.find((r) => r.id === testEmployeeId);
    expect(found).toBeUndefined();
  });

  test('cancelling delete keeps employee in the table', async ({ page }) => {
    await dashboard.openDeleteModal(testEmployeeId);
    await dashboard.cancelDelete();

    const rows = await dashboard.getEmployeeRows();
    const found = rows.find((r) => r.id === testEmployeeId);
    expect(found).toBeDefined();
  });

  test('delete modal closes after confirming deletion', async ({ page }) => {
    await dashboard.openDeleteModal(testEmployeeId);
    await dashboard.confirmDelete();
    await expect(page.locator('#deleteModal')).toBeHidden();
  });
});
