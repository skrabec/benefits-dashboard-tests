import { test, expect } from '@playwright/test';
import { BASE_URL, API_TOKEN, ENDPOINTS, RULES, calcBenefitCost, calcNet } from '../../helpers/api-client';

test.describe('PUT /api/Employees', () => {
  let employeeId: string;
  let employeeUsername: string;

  test.beforeAll(async ({ request }) => {
    // Create an employee to update
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: { firstName: 'PutTest', lastName: 'Original', dependants: 0 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    employeeId = body.id;
    employeeUsername = body.username;
  });

  test.afterAll(async ({ request }) => {
    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(employeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });
  });

  test('updates employee firstName and returns 200', async ({ request }) => {
    const res = await request.put(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: {
        id: employeeId,
        username: employeeUsername,
        firstName: 'Updated',
        lastName: 'Original',
        dependants: 0,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.firstName).toBe('Updated');
    expect(body.id).toBe(employeeId);
  });

  test('updates lastName and reflects in GET by ID', async ({ request }) => {
    await request.put(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: {
        id: employeeId,
        username: employeeUsername,
        firstName: 'Updated',
        lastName: 'NewLastName',
        dependants: 0,
      },
    });

    const getRes = await request.get(`${BASE_URL}${ENDPOINTS.employeeById(employeeId)}`, {
      headers: { Authorization: API_TOKEN },
    });
    const emp = await getRes.json();
    expect(emp.lastName).toBe('NewLastName');
  });

  test('recalculates benefitsCost and net when dependants change', async ({ request }) => {
    const newDependants = 4;
    const res = await request.put(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: {
        id: employeeId,
        username: employeeUsername,
        firstName: 'Updated',
        lastName: 'NewLastName',
        dependants: newDependants,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.dependants).toBe(newDependants);
    expect(body.benefitsCost).toBeCloseTo(calcBenefitCost(newDependants), 2);
    expect(body.net).toBeCloseTo(calcNet(newDependants), 2);
    expect(body.salary).toBe(RULES.annualSalary);
    expect(body.gross).toBe(RULES.grossPerPaycheck);
  });

  test('returns 400 when firstName is missing in update', async ({ request }) => {
    const res = await request.put(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: {
        id: employeeId,
        username: employeeUsername,
        lastName: 'OnlyLast',
        dependants: 0,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 401 when no auth token is provided', async ({ request }) => {
    const res = await request.put(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        id: employeeId,
        username: employeeUsername,
        firstName: 'No',
        lastName: 'Auth',
        dependants: 0,
      },
    });
    expect(res.status()).toBe(401);
  });
});
