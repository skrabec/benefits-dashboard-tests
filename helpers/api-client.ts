import * as dotenv from 'dotenv';
dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'https://wmxrwq14uc.execute-api.us-east-1.amazonaws.com/Prod';
export const API_TOKEN = process.env.API_TOKEN ?? '';

export const ENDPOINTS = {
  employees: '/api/Employees',
  employeeById: (id: string) => `/api/Employees/${id}`,
};

/** Business-rule constants */
export const RULES = {
  grossPerPaycheck: 2000,
  paychecksPerYear: 26,
  annualSalary: 52_000,
  employeeBenefitAnnual: 1_000,
  dependantBenefitAnnual: 500,
};

/**
 * Per-paycheck benefit cost rounded to same precision as the API.
 * API returns values rounded to ~7 significant figures.
 */
export function calcBenefitCost(dependants: number): number {
  return (RULES.employeeBenefitAnnual + dependants * RULES.dependantBenefitAnnual) / RULES.paychecksPerYear;
}

export function calcNet(dependants: number): number {
  return RULES.grossPerPaycheck - calcBenefitCost(dependants);
}

/** Headers for authenticated API requests */
export function authHeaders(): Record<string, string> {
  return {
    Authorization: API_TOKEN,
    'Content-Type': 'application/json',
  };
}
