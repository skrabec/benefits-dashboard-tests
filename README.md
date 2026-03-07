# Benefits Dashboard – Playwright Test Automation

Automated UI and API tests for the Paylocity Benefits Dashboard sample application.
Written in **Playwright + TypeScript**.

---

## Prerequisites

- Node.js 18+
- npm 9+
- Google Chrome installed (required — see [Why System Chrome](#why-system-chrome))

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the environment file and fill in your credentials
cp .env.example .env
```

Edit `.env`:

```
BASE_URL=https://wmxrwq14uc.execute-api.us-east-1.amazonaws.com/Prod
UI_USERNAME=<your username>
UI_PASSWORD=<your password>
API_TOKEN=Basic <your base64 token>
```

---

## Running the Tests

| Command | What it runs |
|---------|-------------|
| `npm test` | All tests (API + UI) |
| `npm run test:api` | API tests only |
| `npm run test:ui` | UI tests only |
| `npm run test:report` | Open the HTML report from the last run |

---

## Project Structure

```
benefits-dashboard-tests/
├── playwright.config.ts        # Two projects: "api" (parallel) + "ui-chromium" (serial)
├── helpers/
│   └── api-client.ts           # Base URL, auth, business-rule helpers
├── pages/
│   ├── LoginPage.ts            # POM: login form
│   └── DashboardPage.ts        # POM: employee table + modals
└── tests/
    ├── api/
    │   ├── get-employees.spec.ts
    │   ├── post-employees.spec.ts
    │   ├── put-employees.spec.ts
    │   └── delete-employees.spec.ts
    └── ui/
        ├── login.spec.ts
        ├── add-employee.spec.ts
        ├── edit-employee.spec.ts
        └── delete-employee.spec.ts
```

---

## Business Rules Under Test

| Rule | Value |
|------|-------|
| Gross per paycheck | $2,000 |
| Paychecks / year | 26 |
| Annual salary | $52,000 |
| Employee benefit cost | $1,000 / year |
| Dependent benefit cost | $500 / year each |
| Per-paycheck deduction | `(1000 + dependants × 500) / 26` |
| Net per paycheck | `2000 − deduction` |

---

## Test Results Summary

| Suite | Passed | Failed | Notes |
|-------|--------|--------|-------|
| API (32 tests) | **28** | **4** | All 4 failures are confirmed app bugs |
| UI (24 tests) | **23** | **1** | Failure is a confirmed app bug |
| **Total** | **51** | **5** | — |

---

## Confirmed Bugs (tests that fail expose these)

### API Bugs

| # | Endpoint | Expected | Actual | Severity |
|---|----------|----------|--------|----------|
| 1 | `GET /api/Employees/{nonExistentId}` | 404 | **500** | High |
| 2 | `GET /api/Employees/{deletedId}` | 404 | **200** — deleted employee still returned | High |
| 3 | `DELETE /api/Employees/{nonExistentId}` | 404 | **405** Method Not Allowed | Medium |
| 4 | `GET /api/Employees` with invalid auth token | 401 | **500** | High |

### UI Bugs

| # | Scenario | Expected | Actual | Severity |
|---|----------|----------|--------|----------|
| 5 | Login with non-existent username | Stay on login, show error | **Server crash** — `chrome-error://chromewebdata/` | Critical |
| 6 | Employee table column headers | "Last Name" shows last name | **"Last Name" column shows firstName and "First Name" shows lastName** | High |
| 7 | Frontend AJAX calls | Include auth credentials | **No `Authorization` header sent** — all calls return 401, table always empty | Critical |

> **Note on Bug #7**: Tests use Playwright's `page.route()` to inject the `Authorization` header on
> outgoing AJAX requests, enabling testing of the actual UI behavior while documenting the root bug.

---

## Why System Chrome

The AWS API Gateway WAF blocks Playwright's built-in Chromium headless shell (TLS fingerprint
detection). UI tests use `channel: 'chrome'` with `headless: false` to use the locally-installed
Google Chrome which passes WAF checks.

For CI environments without a display, use `xvfb-run` on Linux or configure an appropriate
Chrome channel.

---

## Test Coverage Details

### API (32 tests)
- **GET /api/Employees** — list with auth, 401 unauthenticated, 401/500 with bad token (bug)
- **GET /api/Employees/{id}** — valid ID with financial field verification, 404 for non-existent (bug: 500), 401 unauthenticated
- **POST /api/Employees** — creates with correct `salary`/`gross`/`benefitsCost`/`net` for 0/1/5/32 dependants, all field validations (missing required fields, max length, dependants 0–32 boundary), 401 unauthenticated
- **PUT /api/Employees** — updates fields and recalculates benefits, validation, 401 unauthenticated
- **DELETE /api/Employees/{id}** — deletion confirmed via list, 404 after deletion (bug: 200), 404 for non-existent (bug: 405), 401 unauthenticated

### UI (24 tests)
- **Login** — valid credentials, invalid password error, invalid username server crash (bug), empty fields
- **Add Employee** — modal, employee in table, benefit cost/net pay/gross pay calculations, cancel
- **Edit Employee** — modal pre-populated, name/dependant updates, benefit recalculation, cancel
- **Delete Employee** — confirmation modal with name, confirm removes row, cancel keeps row
