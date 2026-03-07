import { type Page, type Locator, expect } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { API_TOKEN } from '../helpers/api-client';
import * as dotenv from 'dotenv';
dotenv.config();

const UI_USERNAME = process.env.UI_USERNAME ?? '';
const UI_PASSWORD = process.env.UI_PASSWORD ?? '';

export interface EmployeeRow {
  id: string;
  /** Actual firstName data (displayed under the mislabelled "Last Name" header — app bug) */
  firstName: string;
  /** Actual lastName data (displayed under the mislabelled "First Name" header — app bug) */
  lastName: string;
  dependants: string;
  salary: string;
  gross: string;
  benefitsCost: string;
  net: string;
}

export class DashboardPage {
  readonly page: Page;
  readonly table: Locator;
  readonly addButton: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dependantsInput: Locator;
  readonly addEmployeeButton: Locator;
  readonly updateEmployeeButton: Locator;
  /** "Cancel" button (secondary) inside the employee modal — NOT the × close button */
  readonly cancelButton: Locator;
  readonly deleteConfirmButton: Locator;
  /** "Cancel" button inside the delete modal */
  readonly deleteCancelButton: Locator;
  readonly deleteFirstName: Locator;
  readonly deleteLastName: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.locator('#employeesTable');
    this.addButton = page.locator('#add');
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.dependantsInput = page.locator('#dependants');
    this.addEmployeeButton = page.locator('#addEmployee');
    this.updateEmployeeButton = page.locator('#updateEmployee');
    // Use .btn-secondary to disambiguate from the × close button (which also has data-dismiss="modal")
    this.cancelButton = page.locator('#employeeModal .btn-secondary');
    this.deleteConfirmButton = page.locator('#deleteEmployee');
    this.deleteCancelButton = page.locator('#deleteModal .btn-secondary');
    this.deleteFirstName = page.locator('#deleteFirstName');
    this.deleteLastName = page.locator('#deleteLastName');
  }

  /**
   * Intercept all AJAX calls to /api/employees* and inject the Basic auth header.
   *
   * BUG: The frontend JavaScript (employeeClient.js) does not include an Authorization
   * header in its AJAX requests. The API endpoints require Basic auth, so without this
   * interception all AJAX calls return 401 and the table remains permanently empty.
   */
  private async interceptApiAuth() {
    await this.page.route('**\/api\/employees**', async (route) => {
      const headers = {
        ...route.request().headers(),
        Authorization: API_TOKEN,
      };
      await route.continue({ headers });
    });
  }

  /** Wait for the table to be refreshed (employeeClient GET call to complete). */
  private async waitForTableRefresh() {
    await this.page.waitForResponse(
      (r) => r.url().includes('/api/employees') && r.request().method() === 'GET',
      { timeout: 10_000 }
    );
  }

  /** Navigate to the dashboard, logging in first if needed. */
  async goto() {
    await this.interceptApiAuth();
    await this.page.goto('Benefits');
    if (this.page.url().includes('/Account/Login')) {
      const loginPage = new LoginPage(this.page);
      await loginPage.login(UI_USERNAME, UI_PASSWORD);
      await this.page.waitForURL('**/Benefits');
    }
    // Wait for initial table load
    await this.waitForTableRefresh();
    await expect(this.table).toBeVisible();
  }

  async openAddModal() {
    await this.addButton.click();
    await expect(this.page.locator('#employeeModal')).toBeVisible();
  }

  async addEmployee(firstName: string, lastName: string, dependants: number = 0) {
    await this.openAddModal();
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.dependantsInput.fill(String(dependants));
    await this.addEmployeeButton.click();
    // Wait for the POST then the GET (loadTable) to complete
    await this.waitForTableRefresh();
    await expect(this.page.locator('#employeeModal')).toBeHidden({ timeout: 10_000 });
  }

  /**
   * Row action locators.
   * Table cells: [0]=id, [1]=firstName, [2]=lastName, [3]=dependants, ...
   * Actions column contains .fa-edit and .fa-times icons (no data-id attributes).
   */
  private rowLocator(employeeId: string) {
    return this.page.locator('#employeesTable tbody tr').filter({
      has: this.page.locator('td:nth-child(1)', { hasText: new RegExp(`^${employeeId}$`) }),
    });
  }

  async openEditModal(employeeId: string) {
    await this.rowLocator(employeeId).locator('.fa-edit').click();
    await expect(this.page.locator('#employeeModal')).toBeVisible();
  }

  async submitEdit() {
    await this.updateEmployeeButton.click();
    // Wait for the PUT + subsequent GET (loadTable) to complete
    await this.waitForTableRefresh();
    await expect(this.page.locator('#employeeModal')).toBeHidden({ timeout: 10_000 });
  }

  async openDeleteModal(employeeId: string) {
    await this.rowLocator(employeeId).locator('.fa-times').click();
    await expect(this.page.locator('#deleteModal')).toBeVisible();
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
    await this.waitForTableRefresh();
    await expect(this.page.locator('#deleteModal')).toBeHidden({ timeout: 10_000 });
  }

  async cancelDelete() {
    await this.deleteCancelButton.click();
    await expect(this.page.locator('#deleteModal')).toBeHidden({ timeout: 10_000 });
  }

  /**
   * Returns all rows in the employees table.
   * NOTE: cells[1] = actual firstName, cells[2] = actual lastName.
   * The table headers are SWAPPED (app bug): the "Last Name" column shows firstName data
   * and the "First Name" column shows lastName data.
   */
  async getEmployeeRows(): Promise<EmployeeRow[]> {
    await this.page.waitForSelector('#employeesTable tbody tr:not(:has(td[colspan]))', {
      timeout: 10_000,
    });
    return this.page.$$eval('#employeesTable tbody tr', (rows) =>
      rows
        .filter((row) => row.querySelector('td[colspan]') === null)
        .map((row) => {
          const cells = Array.from(row.querySelectorAll('td'));
          return {
            id: cells[0]?.textContent?.trim() ?? '',
            firstName: cells[1]?.textContent?.trim() ?? '',
            lastName: cells[2]?.textContent?.trim() ?? '',
            dependants: cells[3]?.textContent?.trim() ?? '',
            salary: cells[4]?.textContent?.trim() ?? '',
            gross: cells[5]?.textContent?.trim() ?? '',
            benefitsCost: cells[6]?.textContent?.trim() ?? '',
            net: cells[7]?.textContent?.trim() ?? '',
          };
        })
    );
  }

  async findRowByName(firstName: string, lastName: string): Promise<EmployeeRow | undefined> {
    const rows = await this.getEmployeeRows();
    return rows.find((r) => r.firstName === firstName && r.lastName === lastName);
  }

  async findRowById(id: string): Promise<EmployeeRow | undefined> {
    const rows = await this.getEmployeeRows();
    return rows.find((r) => r.id === id);
  }
}
