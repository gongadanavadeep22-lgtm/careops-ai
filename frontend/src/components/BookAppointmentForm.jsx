import { useState, useEffect } from 'react';
import client from '../api/client';

export default function BookAppointmentForm({ onSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [form, setForm] = useState({
    patientName: '',
    patientPhone: '',
    patientArea: '',
    doctorId: '',
    scheduledAt: '',
    symptoms: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/api/doctors')
      .then(({ data }) => setDoctors(data.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);
    const selectedDoctor = doctors.find((d) => d.id === form.doctorId);
    try {
      await client.post('/api/appointments/book', {
        patientId: '',
        patientName: form.patientName.trim(),
        patientPhone: form.patientPhone.trim(),
        patientArea: form.patientArea.trim(),
        doctorId: selectedDoctor?.uid || form.doctorId,
        doctorName: selectedDoctor?.name || '',
        scheduledAt: form.scheduledAt,
        symptoms: form.symptoms.trim(),
      });
      setStatus('Appointment booked successfully.');
      setForm({ patientName: '', patientPhone: '', patientArea: '', doctorId: '', scheduledAt: '', symptoms: '' });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (doctorsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Patient Name *</label>
          <input
            type="text"
            required
            value={form.patientName}
            onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Patient Phone</label>
          <input
            type="text"
            value={form.patientPhone}
            onChange={(e) => setForm((p) => ({ ...p, patientPhone: e.target.value }))}
            placeholder="+91 9876543210"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Patient Area</label>
          <input
            type="text"
            value={form.patientArea}
            onChange={(e) => setForm((p) => ({ ...p, patientArea: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Doctor *</label>
          <select
            required
            value={form.doctorId}
            onChange={(e) => setForm((p) => ({ ...p, doctorId: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          >
            <option value="">Select doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
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
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Symptoms *</label>
        <textarea
          required
          rows={3}
          value={form.symptoms}
          onChange={(e) => setForm((p) => ({ ...p, symptoms: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        />
      </div>
      {status && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{status}</p>}
      {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? 'Booking…' : 'Book Appointment'}
      </button>
    </form>
  );
}
