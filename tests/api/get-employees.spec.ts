import { test, expect } from '@playwright/test';
import { BASE_URL, API_TOKEN, ENDPOINTS, RULES, calcBenefitCost, calcNet } from '../../helpers/api-client';

test.describe('GET /api/Employees', () => {
  test('returns 200 with an array when authenticated', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('each employee object contains required fields', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN },
    });

    const employees = await res.json();
    expect(employees.length).toBeGreaterThan(0);

    for (const emp of employees) {
      expect(emp).toHaveProperty('id');
      expect(emp).toHaveProperty('firstName');
      expect(emp).toHaveProperty('lastName');
      expect(emp).toHaveProperty('dependants');
      expect(emp).toHaveProperty('salary');
      expect(emp).toHaveProperty('gross');
      expect(emp).toHaveProperty('benefitsCost');
      expect(emp).toHaveProperty('net');
    }
  });

  test('returns 401 when no Authorization header is provided', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employees}`);
    expect(res.status()).toBe(401);
  });

  test('returns 401 when an invalid token is provided', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: 'Basic aW52YWxpZDppbnZhbGlk' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/Employees/{id}', () => {
  let existingEmployeeId: string;

  test.beforeAll(async ({ request }) => {
    // Create a transient employee to use for GET-by-id tests
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: { firstName: 'GetById', lastName: 'Probe', dependants: 1 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    existingEmployeeId = body.id;
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(existingEmployeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });
  });

  test('returns 200 with correct employee data for a valid ID', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employeeById(existingEmployeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });

    expect(res.status()).toBe(200);
    const emp = await res.json();
    expect(emp.id).toBe(existingEmployeeId);
    expect(emp.firstName).toBe('GetById');
    expect(emp.lastName).toBe('Probe');
    expect(emp.dependants).toBe(1);
  });

  test('returns computed financial fields correctly for a known employee', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employeeById(existingEmployeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });

    const emp = await res.json();
    expect(emp.salary).toBe(RULES.annualSalary);
    expect(emp.gross).toBe(RULES.grossPerPaycheck);
    expect(emp.benefitsCost).toBeCloseTo(calcBenefitCost(1), 2);
    expect(emp.net).toBeCloseTo(calcNet(1), 2);
  });

  test('returns 404 for a non-existent employee ID', async ({ request }) => {
    // BUG: currently returns 500 — this test documents the expected behaviour
    const res = await request.get(
      `${BASE_URL}${ENDPOINTS.employeeById('00000000-0000-0000-0000-000000000000')}`,
      { headers: { Authorization: API_TOKEN } }
    );
    // Expected: 404 — Actual: 500 (known bug)
    expect(res.status()).toBe(404);
  });

  test('returns 401 without auth when accessing by ID', async ({ request }) => {
    const res = await request.get(`${BASE_URL}${ENDPOINTS.employeeById(existingEmployeeId)}`);
    expect(res.status()).toBe(401);
  });
});
