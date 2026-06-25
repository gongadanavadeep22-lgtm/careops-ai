import { useState, useEffect } from 'react';
import client from '../api/client';
import { profileToBookingFields, profileFieldSources } from '../utils/patientBookingPrefill';

function FieldHint({ fromProfile }) {
  if (!fromProfile) return null;
  return (
    <p className="mt-0.5 text-[11px] text-green-700">From patient profile — edit on patient dashboard if wrong</p>
  );
}

const EMPTY_FORM = {
  patientId: '',
  patientName: '',
  patientPhone: '',
  patientArea: '',
  doctorId: '',
  scheduledAt: '',
  symptoms: '',
};

export default function BookAppointmentForm({ onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [fromProfile, setFromProfile] = useState({
    patientName: false,
    patientPhone: false,
    patientArea: false,
    symptoms: false,
  });

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');

  async function loadPatients(query) {
    setPatientsLoading(true);
    setListError('');
    try {
      const { data } = await client.get('/api/patients/list', {
        params: query ? { q: query } : undefined,
      });
      setPatients(data.patients || []);
      if ((data.patients || []).length === 0 && query) {
        setListError(`No patient named "${query}" found. Ask them to log in, fill Profile (name + age), and tap Save Changes.`);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error;
      if (status === 404) {
        setListError('Patient list API not found — redeploy the backend on Railway (latest code).');
      } else if (status === 403) {
        setListError('Access denied. Log in as nurse, doctor, or ops.');
      } else {
        setListError(msg || 'Could not load patients. Check network and API URL on Vercel.');
      }
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  }

  useEffect(() => {
    loadPatients('');
    client
      .get('/api/doctors')
      .then(({ data }) => setDoctors(data.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false));
  }, []);

  function applyPatientProfile(patient) {
    const fields = profileToBookingFields(patient);
    const sources = profileFieldSources(patient);
    setFromProfile(sources);
    setForm((prev) => ({
      ...prev,
      patientId: fields.patientId,
      patientName: fields.patientName,
      patientPhone: fields.patientPhone,
      patientArea: fields.patientArea,
      symptoms: fields.symptoms || prev.symptoms,
    }));
  }

  async function handlePatientSelect(patientId) {
    setSelectedPatientId(patientId);
    setStatus('');
    setError('');
    if (!patientId) {
      setFromProfile({ patientName: false, patientPhone: false, patientArea: false, symptoms: false });
      setForm((prev) => ({
        ...EMPTY_FORM,
        doctorId: prev.doctorId,
        scheduledAt: prev.scheduledAt,
      }));
      return;
    }
    if (patientId === '__manual__') {
      setFromProfile({ patientName: false, patientPhone: false, patientArea: false, symptoms: false });
      setForm((prev) => ({
        ...EMPTY_FORM,
        doctorId: prev.doctorId,
        scheduledAt: prev.scheduledAt,
      }));
      return;
    }
    const cached = patients.find((p) => p.id === patientId);
    if (cached) {
      applyPatientProfile(cached);
      return;
    }
    try {
      const { data } = await client.get('/api/patients/by-id', { params: { patientId } });
      if (data.patient) applyPatientProfile(data.patient);
    } catch {
      setError('Could not load patient profile.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);
    const selectedDoctor = doctors.find((d) => d.id === form.doctorId);
    try {
      await client.post('/api/appointments/book', {
        patientId: form.patientId || '',
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        patientArea: form.patientArea.trim(),
        doctorId: selectedDoctor?.uid || form.doctorId,
        doctorName: selectedDoctor?.name || '',
        scheduledAt: form.scheduledAt,
        symptoms: form.symptoms.trim(),
      });
      setStatus('Appointment booked successfully.');
      setForm(EMPTY_FORM);
      setSelectedPatientId('');
      setFromProfile({ patientName: false, patientPhone: false, patientArea: false, symptoms: false });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (doctorsLoading && patientsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-4 space-y-3">
        <label className="block text-sm font-semibold text-gray-800">
          Select registered patient *
        </label>
        <p className="text-xs text-gray-600">
          Choose a patient who completed their profile. Name, phone, area, and symptoms auto-fill — you only
          enter doctor, date/time, and any missing fields.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="search"
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                loadPatients(patientSearch);
              }
            }}
            placeholder="Search by name, phone, or area"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
          <button
            type="button"
            onClick={() => loadPatients(patientSearch)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Search
          </button>
        </div>
        <select
          value={selectedPatientId}
          onChange={(e) => handlePatientSelect(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="">— Select patient —</option>
          <option value="__manual__">Manual entry (patient not registered)</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || 'Unnamed'}
              {p.phone ? ` · ${p.phone}` : ''}
              {p.area ? ` · ${p.area}` : ''}
            </option>
          ))}
        </select>
        {patientsLoading && (
          <p className="text-xs text-gray-500">Loading registered patients…</p>
        )}
        {listError && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">{listError}</p>
        )}
        {!patientsLoading && !listError && patients.length === 0 && (
          <p className="text-xs text-amber-700">
            No registered patients yet. Patient must sign in, enter <strong>name + age</strong> on Profile, and tap{' '}
            <strong>Save Changes</strong> before they appear here.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Patient Name *</label>
          <input
            type="text"
            required
            readOnly={fromProfile.patientName}
            value={form.patientName}
            onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
            placeholder={fromProfile.patientName ? '' : 'Full name'}
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
              fromProfile.patientName ? 'bg-gray-50 text-gray-700' : ''
            }`}
          />
          <FieldHint fromProfile={fromProfile.patientName} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Patient Phone {fromProfile.patientPhone ? '' : '*'}
          </label>
          <input
            type="text"
            required={!fromProfile.patientPhone}
            readOnly={fromProfile.patientPhone}
            value={form.patientPhone}
            onChange={(e) => setForm((p) => ({ ...p, patientPhone: e.target.value }))}
            placeholder="+91 9876543210"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
              fromProfile.patientPhone ? 'bg-gray-50 text-gray-700' : ''
            }`}
          />
          <FieldHint fromProfile={fromProfile.patientPhone} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Patient Area</label>
          <input
            type="text"
            readOnly={fromProfile.patientArea}
            value={form.patientArea}
            onChange={(e) => setForm((p) => ({ ...p, patientArea: e.target.value }))}
            placeholder="e.g. Koramangala"
            className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
              fromProfile.patientArea ? 'bg-gray-50 text-gray-700' : ''
            }`}
          />
          <FieldHint fromProfile={fromProfile.patientArea} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Select Doctor *</label>
          <select
            required
            value={form.doctorId}
            onChange={(e) => setForm((p) => ({ ...p, doctorId: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">— Select a doctor —</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
          <p className="mt-0.5 text-[11px] text-gray-500">Staff only — patient does not pick this on profile</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Date &amp; Time *</label>
        <input
          type="datetime-local"
          required
          value={form.scheduledAt}
          min={new Date().toISOString().slice(0, 16)}
          onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
        <p className="mt-0.5 text-[11px] text-gray-500">Staff only — set at booking time</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Symptoms *{fromProfile.symptoms ? ' (from profile)' : ''}
        </label>
        <textarea
          required
          rows={3}
          readOnly={fromProfile.symptoms}
          value={form.symptoms}
          onChange={(e) => setForm((p) => ({ ...p, symptoms: e.target.value }))}
          placeholder="Describe patient symptoms (patient can add under Symptoms & Allergies)"
          className={`w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${
            fromProfile.symptoms ? 'bg-gray-50 text-gray-700' : ''
          }`}
        />
        <FieldHint fromProfile={fromProfile.symptoms} />
      </div>

      {status && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{status}</p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !selectedPatientId}
        className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Booking…' : 'Book Appointment'}
      </button>
    </form>
  );
}
