import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { BASE_URL, API_TOKEN, ENDPOINTS, calcBenefitCost, calcNet } from '../../helpers/api-client';
import * as dotenv from 'dotenv';
dotenv.config();

test.describe('Edit Employee', () => {
  let dashboard: DashboardPage;
  let testEmployeeId: string;

  test.beforeEach(async ({ page, request }) => {
    // Create a fresh employee via API for each test
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: { firstName: 'EditUI', lastName: 'Before', dependants: 0 },
    });
    expect(res.status()).toBe(200);
    testEmployeeId = (await res.json()).id;

    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(testEmployeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });
  });

  test('opens Edit modal pre-populated with current employee values', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);

    await expect(dashboard.firstNameInput).toHaveValue('EditUI');
    await expect(dashboard.lastNameInput).toHaveValue('Before');
    await expect(dashboard.dependantsInput).toHaveValue('0');
  });

  test('updating lastName reflects in the table', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);
    await dashboard.lastNameInput.fill('After');
    await dashboard.submitEdit();

    const row = await dashboard.findRowById(testEmployeeId);
    expect(row).toBeDefined();
    expect(row!.lastName).toBe('After');
  });

  test('updating firstName reflects in the table', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);
    await dashboard.firstNameInput.fill('Renamed');
    await dashboard.submitEdit();

    const row = await dashboard.findRowById(testEmployeeId);
    expect(row).toBeDefined();
    expect(row!.firstName).toBe('Renamed');
  });

  test('adding dependants recalculates benefit cost in table', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);
    await dashboard.dependantsInput.fill('3');
    await dashboard.submitEdit();

    const row = await dashboard.findRowById(testEmployeeId);
    expect(row).toBeDefined();

    const expectedCost = calcBenefitCost(3); // ~115.38
    const displayedCost = parseFloat(row!.benefitsCost.replace(/[^0-9.]/g, ''));
    expect(displayedCost).toBeCloseTo(expectedCost, 1);
  });

  test('adding dependants recalculates net pay in table', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);
    await dashboard.dependantsInput.fill('3');
    await dashboard.submitEdit();

    const row = await dashboard.findRowById(testEmployeeId);
    expect(row).toBeDefined();

    const expectedNet = calcNet(3);
    const displayedNet = parseFloat(row!.net.replace(/[^0-9.]/g, ''));
    expect(displayedNet).toBeCloseTo(expectedNet, 1);
  });

  test('cancelling edit leaves table unchanged', async ({ page }) => {
    await dashboard.openEditModal(testEmployeeId);
    await dashboard.firstNameInput.fill('ShouldNotSave');
    await dashboard.cancelButton.click();
    await expect(page.locator('#employeeModal')).toBeHidden();

    const row = await dashboard.findRowById(testEmployeeId);
    expect(row!.firstName).toBe('EditUI');
  });
});
