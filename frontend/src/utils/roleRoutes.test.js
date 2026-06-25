import { describe, it, expect } from 'vitest';
import { dashboardPathForRole } from '../utils/roleRoutes';

describe('dashboardPathForRole', () => {
  it('routes each clinic role to its dashboard', () => {
    expect(dashboardPathForRole('doctor')).toBe('/doctor');
    expect(dashboardPathForRole('nurse')).toBe('/nurse');
    expect(dashboardPathForRole('pharmacist')).toBe('/pharmacy');
    expect(dashboardPathForRole('ops')).toBe('/ops');
    expect(dashboardPathForRole('patient')).toBe('/patient');
  });

  it('normalizes case and whitespace', () => {
    expect(dashboardPathForRole('  DOCTOR  ')).toBe('/doctor');
  });

  it('falls back to /login for unknown roles', () => {
    expect(dashboardPathForRole('admin')).toBe('/login');
    expect(dashboardPathForRole('')).toBe('/login');
    expect(dashboardPathForRole(null)).toBe('/login');
  });
});
