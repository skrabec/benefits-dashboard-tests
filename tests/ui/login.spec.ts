import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import * as dotenv from 'dotenv';
dotenv.config();

const USERNAME = process.env.UI_USERNAME ?? '';
const PASSWORD = process.env.UI_PASSWORD ?? '';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('redirects to Benefits Dashboard after valid login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(USERNAME, PASSWORD);
    await expect(page).toHaveURL(/\/Benefits/);
    await expect(page.locator('#employeesTable')).toBeVisible();
  });

  test('shows error message with invalid password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(USERNAME, 'wrong_password_123');
    await expect(page).toHaveURL(/\/Account\/Login/);
    await expect(loginPage.errorSummary).toBeVisible();
  });

  test('shows error message with invalid username', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('nonexistent_user', PASSWORD);
    // BUG: App navigates to chrome-error://chromewebdata/ (server crash) instead of
    // staying on the login page and showing an error. Expected behaviour: 200 with error message.
    await expect(page).toHaveURL(/\/Account\/Login/);
    await expect(loginPage.errorSummary).toBeVisible();
  });

  test('stays on login page when both credentials are empty', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginButton.click();
    await expect(page).toHaveURL(/\/Account\/Login/);
  });

  test('login page title contains "Paylocity"', async ({ page }) => {
    await expect(page).toHaveTitle(/Paylocity/i);
  });
});
