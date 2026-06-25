/** Map Firestore patient profile → nurse/ops booking form fields */
export function profileToBookingFields(patient) {
  if (!patient) {
    return {
      patientId: '',
      patientName: '',
      patientPhone: '',
      patientArea: '',
      symptoms: '',
    };
  }
  return {
    patientId: patient.id || patient.uid || '',
    patientName: String(patient.name || '').trim(),
    patientPhone: String(patient.phone || '').trim(),
    patientArea: String(patient.area || '').trim(),
    symptoms: String(patient.symptoms || '').trim(),
  };
}

/** Which booking fields were filled on the patient dashboard (staff should not re-type these). */
export function profileFieldSources(patient) {
  if (!patient) {
    return { patientName: false, patientPhone: false, patientArea: false, symptoms: false };
  }
  return {
    patientName: Boolean(String(patient.name || '').trim()),
    patientPhone: Boolean(String(patient.phone || '').trim()),
    patientArea: Boolean(String(patient.area || '').trim()),
    symptoms: Boolean(String(patient.symptoms || '').trim()),
  };
}
