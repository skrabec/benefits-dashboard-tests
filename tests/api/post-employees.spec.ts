import { test, expect } from '@playwright/test';
import { BASE_URL, API_TOKEN, ENDPOINTS, RULES, calcBenefitCost, calcNet } from '../../helpers/api-client';

test.describe('POST /api/Employees', () => {
  const createdIds: string[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of createdIds) {
      await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
        headers: { Authorization: API_TOKEN },
      });
    }
  });

  async function createEmployee(request: any, data: object) {
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data,
    });
    if (res.status() === 200) {
      const body = await res.json();
      if (body.id) createdIds.push(body.id);
    }
    return res;
  }

  // ── Happy path ────────────────────────────────────────────────────────────

  test('creates employee with required fields and returns 200', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Happy',
      lastName: 'Path',
      dependants: 0,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.firstName).toBe('Happy');
    expect(body.lastName).toBe('Path');
  });

  test('response contains correct salary and gross values', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Salary',
      lastName: 'Check',
      dependants: 0,
    });
    const body = await res.json();
    expect(body.salary).toBe(RULES.annualSalary);
    expect(body.gross).toBe(RULES.grossPerPaycheck);
  });

  // ── Benefit cost calculations ─────────────────────────────────────────────

  test('calculates benefitsCost correctly with 0 dependants', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Zero',
      lastName: 'Deps',
      dependants: 0,
    });
    const body = await res.json();
    expect(body.benefitsCost).toBeCloseTo(calcBenefitCost(0), 2); // ~38.46
    expect(body.net).toBeCloseTo(calcNet(0), 2);                  // ~1961.54
  });

  test('calculates benefitsCost correctly with 1 dependant', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'One',
      lastName: 'Dep',
      dependants: 1,
    });
    const body = await res.json();
    expect(body.benefitsCost).toBeCloseTo(calcBenefitCost(1), 2); // ~57.69
    expect(body.net).toBeCloseTo(calcNet(1), 2);                  // ~1942.31
  });

  test('calculates benefitsCost correctly with 5 dependants', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Five',
      lastName: 'Deps',
      dependants: 5,
    });
    const body = await res.json();
    expect(body.benefitsCost).toBeCloseTo(calcBenefitCost(5), 2); // ~134.62
    expect(body.net).toBeCloseTo(calcNet(5), 2);                  // ~1865.38
  });

  test('calculates benefitsCost correctly with maximum 32 dependants', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Max',
      lastName: 'Deps',
      dependants: 32,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.benefitsCost).toBeCloseTo(calcBenefitCost(32), 2); // ~653.85
    expect(body.net).toBeCloseTo(calcNet(32), 2);
  });

  test('net equals gross minus benefitsCost', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Net',
      lastName: 'Verify',
      dependants: 3,
    });
    const body = await res.json();
    expect(body.net).toBeCloseTo(body.gross - body.benefitsCost, 2);
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  test('returns 400 when firstName is missing', async ({ request }) => {
    const res = await createEmployee(request, { lastName: 'NoFirst', dependants: 0 });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('FirstName');
  });

  test('returns 400 when lastName is missing', async ({ request }) => {
    const res = await createEmployee(request, { firstName: 'NoLast', dependants: 0 });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain('LastName');
  });

  test('returns 400 when firstName exceeds 50 characters', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'A'.repeat(51),
      lastName: 'Long',
      dependants: 0,
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when lastName exceeds 50 characters', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Long',
      lastName: 'L'.repeat(51),
      dependants: 0,
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when dependants exceeds maximum of 32', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Too',
      lastName: 'Many',
      dependants: 33,
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 when dependants is negative', async ({ request }) => {
    const res = await createEmployee(request, {
      firstName: 'Neg',
      lastName: 'Deps',
      dependants: -1,
    });
    expect(res.status()).toBe(400);
  });

  // ── Auth ─────────────────────────────────────────────────────────────────

  test('returns 401 when no auth token is provided', async ({ request }) => {
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { 'Content-Type': 'application/json' },
      data: { firstName: 'Auth', lastName: 'Test', dependants: 0 },
    });
    expect(res.status()).toBe(401);
  });
});
