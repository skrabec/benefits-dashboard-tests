import { test, expect } from '@playwright/test';
import { BASE_URL, API_TOKEN, ENDPOINTS } from '../../helpers/api-client';

test.describe('DELETE /api/Employees/{id}', () => {
  async function createEmployee(request: any, firstName = 'Delete', lastName = 'Me') {
    const res = await request.post(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json' },
      data: { firstName, lastName, dependants: 0 },
    });
    expect(res.status()).toBe(200);
    return (await res.json()).id as string;
  }

  test('deletes an existing employee and returns 200', async ({ request }) => {
    const id = await createEmployee(request);

    const res = await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: { Authorization: API_TOKEN },
    });
    expect(res.status()).toBe(200);
  });

  test('deleted employee no longer appears in GET all', async ({ request }) => {
    const id = await createEmployee(request, 'GoneAfter', 'Delete');

    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: { Authorization: API_TOKEN },
    });

    const listRes = await request.get(`${BASE_URL}${ENDPOINTS.employees}`, {
      headers: { Authorization: API_TOKEN },
    });
    const employees = await listRes.json();
    const found = employees.find((e: { id: string }) => e.id === id);
    expect(found).toBeUndefined();
  });

  test('deleted employee returns 404 on GET by ID', async ({ request }) => {
    const id = await createEmployee(request, 'NotFound', 'After');

    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: { Authorization: API_TOKEN },
    });

    // BUG: currently returns 500 — this test documents the expected behaviour
    const getRes = await request.get(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: { Authorization: API_TOKEN },
    });
    expect(getRes.status()).toBe(404);
  });

  test('returns 404 when deleting a non-existent employee ID', async ({ request }) => {
    // BUG: currently returns 405 — this test documents the expected behaviour
    const res = await request.delete(
      `${BASE_URL}${ENDPOINTS.employeeById('00000000-0000-0000-0000-000000000000')}`,
      { headers: { Authorization: API_TOKEN } }
    );
    expect(res.status()).toBe(404);
  });

  test('returns 401 when no auth token is provided', async ({ request }) => {
    const id = await createEmployee(request, 'Auth', 'Guard');

    const res = await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: {},
    });
    expect(res.status()).toBe(401);

    // Cleanup
    await request.delete(`${BASE_URL}${ENDPOINTS.employeeById(id)}`, {
      headers: { Authorization: API_TOKEN },
    });
  });
});
