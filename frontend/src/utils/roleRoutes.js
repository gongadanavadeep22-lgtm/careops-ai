/** Post-login dashboard path by Firestore user role */
export const ROLE_ROUTES = {
  nurse: '/nurse',
  doctor: '/doctor',
  pharmacist: '/pharmacy',
  ops: '/ops',
  patient: '/patient',
};

export function dashboardPathForRole(role) {
  const normalized = role != null ? String(role).toLowerCase().trim() : '';
  return ROLE_ROUTES[normalized] || '/login';
}
