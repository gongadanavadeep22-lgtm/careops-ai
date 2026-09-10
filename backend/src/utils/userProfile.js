function inferRoleAndName(email = '', fallbackName = '') {
  const prefix = (email || '').split('@')[0].toLowerCase();
  let role = 'patient';
  let name = fallbackName || '';

  if (prefix.includes('doctor') || prefix.includes('dr')) {
    role = 'doctor';
    if (!name) name = 'Dr. Staff';
  } else if (prefix.includes('nurse')) {
    role = 'nurse';
    if (!name) name = 'Nurse Staff';
  } else if (prefix.includes('pharm') || prefix.includes('phara')) {
    role = 'pharmacist';
    if (!name) name = 'Pharmacist';
  } else if (prefix.includes('ops') || prefix.includes('admin')) {
    role = 'ops';
    if (!name) name = 'Operations';
  } else {
    role = 'patient';
    if (!name) name = prefix ? 'Patient ' + prefix : 'Patient';
  }

  return { role, name };
}

module.exports = { inferRoleAndName };
