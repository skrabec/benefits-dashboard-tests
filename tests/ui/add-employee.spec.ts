import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { BASE_URL, API_TOKEN, ENDPOINTS, calcBenefitCost, calcNet } from '../../helpers/api-client';
import * as dotenv from 'dotenv';
dotenv.config();

test.describe('Add Employee', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test.afterEach(async ({ request, page }) => {
    // Clean up any test employees added during the test
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN },
    });
    const employees = await res.json();
    const testEmployees = employees.filter(
      (e: { firstName: string; lastName: string }) =>
        e.firstName.startsWith('UITest') || e.lastName.startsWith('UITest')
    );
    for (const emp of testEmployees) {
      await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(emp.id)}`, {
        headers: { Authorization: API_TOKEN },
      });
    }
  });

  test('opens Add Employee modal when Add Employee button is clicked', async ({ page }) => {
    await dashboard.addButton.click();
    await expect(page.locator('#employeeModal')).toBeVisible();
    await expect(page.locator('#employeeModal .modal-title')).toHaveText('Add Employee');
  });

  test('adds employee with required fields and appears in table', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'UserAdd', 0);

    const row = await dashboard.findRowByName('UITest', 'UserAdd');
    expect(row).toBeDefined();
    expect(row!.firstName).toBe('UITest');
    expect(row!.lastName).toBe('UserAdd');
  });

  test('displays correct benefit cost for employee with 0 dependants', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'ZeroDeps', 0);

    const row = await dashboard.findRowByName('UITest', 'ZeroDeps');
    expect(row).toBeDefined();

    const expectedBenefitCost = calcBenefitCost(0); // ~38.46
    const displayedCost = parseFloat(row!.benefitsCost.replace(/[^0-9.]/g, ''));
    expect(displayedCost).toBeCloseTo(expectedBenefitCost, 1);
  });

  test('displays correct net pay for employee with 0 dependants', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'NetCheck', 0);

    const row = await dashboard.findRowByName('UITest', 'NetCheck');
    expect(row).toBeDefined();

    const expectedNet = calcNet(0); // ~1961.54
    const displayedNet = parseFloat(row!.net.replace(/[^0-9.]/g, ''));
    expect(displayedNet).toBeCloseTo(expectedNet, 1);
  });

  test('displays correct benefit cost for employee with 2 dependants', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'TwoDeps', 2);

    const row = await dashboard.findRowByName('UITest', 'TwoDeps');
    expect(row).toBeDefined();

    const expectedBenefitCost = calcBenefitCost(2); // ~76.92
    const displayedCost = parseFloat(row!.benefitsCost.replace(/[^0-9.]/g, ''));
    expect(displayedCost).toBeCloseTo(expectedBenefitCost, 1);
  });

  test('table shows correct Gross Pay column value ($2000)', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'GrossCheck', 0);

    const row = await dashboard.findRowByName('UITest', 'GrossCheck');
    expect(row).toBeDefined();

    const displayedGross = parseFloat(row!.gross.replace(/[^0-9.]/g, ''));
    expect(displayedGross).toBe(2000);
  });

  test('cancels add without creating employee', async ({ page }) => {
    const rowsBefore = await dashboard.getEmployeeRows();
    await dashboard.openAddModal();
    await dashboard.firstNameInput.fill('UITest');
    await dashboard.lastNameInput.fill('Cancelled');
    await dashboard.cancelButton.click();
    await expect(page.locator('#employeeModal')).toBeHidden();

    const rowsAfter = await dashboard.getEmployeeRows();
    expect(rowsAfter.length).toBe(rowsBefore.length);
  });

  test('modal closes after successful employee add', async ({ page }) => {
    await dashboard.addEmployee('UITest', 'ModalClose', 0);
    await expect(page.locator('#employeeModal')).toBeHidden();
  });
});
