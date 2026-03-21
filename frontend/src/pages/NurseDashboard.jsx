import { useState, useEffect } from 'react';
import client from '../api/client';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const VIEWS = ['Upcoming Appointments', 'Book Appointment'];

export default function NurseDashboard() {
  const [activeView, setActiveView] = useState('Upcoming Appointments');

  // ── TODAY'S APPOINTMENTS STATE ──
  const [appointments, setAppointments] = useState([]);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptError, setApptError] = useState('');
  const [emergencyBanner, setEmergencyBanner] = useState(null);

  // Per-card state: checkin loading, checkin result, vitals form, vitals status
  const [checkinLoading, setCheckinLoading] = useState({});
  const [checkinResults, setCheckinResults] = useState({});
  const [vitalsForm, setVitalsForm] = useState({});
  const [vitalsLoading, setVitalsLoading] = useState({});
  const [vitalsStatus, setVitalsStatus] = useState({});
  const [vitalsError, setVitalsError] = useState({});

  // ── BOOK APPOINTMENT STATE ──
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [bookForm, setBookForm] = useState({
    patientName: '',
    patientPhone: '',
    patientArea: '',
    doctorId: '',
    scheduledAt: '',
    symptoms: '',
  });
  const [bookLoading, setBookLoading] = useState(false);
  const [bookStatus, setBookStatus] = useState('');
  const [bookError, setBookError] = useState('');

  async function loadTodayAppointments() {
    setApptLoading(true);
    setApptError('');
    try {
      const { data } = await client.get('/api/appointments/today');
      setAppointments(data.appointments || []);
    } catch {
      setApptError('Failed to load appointments. Please try again.');
    } finally {
      setApptLoading(false);
    }
  }

  useEffect(() => {
    loadTodayAppointments();
  }, []);

  useEffect(() => {
    if (activeView !== 'Book Appointment') return;
    setDoctorsLoading(true);
    client.get('/api/doctors')
      .then(({ data }) => setDoctors(data.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false));
  }, [activeView]);

  async function handleCheckIn(appt) {
    setCheckinLoading((prev) => ({ ...prev, [appt.id]: true }));
    try {
      const { data } = await client.post('/api/checkin', { appointmentId: appt.id });
      setCheckinResults((prev) => ({ ...prev, [appt.id]: data }));
      setVitalsForm((prev) => ({ ...prev, [appt.id]: { bp: '', temperature: '', spo2: '' } }));

      // Update appointment status locally
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id
            ? { ...a, status: 'arrived', urgency: data.urgency, department: data.department }
            : a
        )
      );

      if (data.urgency === 'EMERGENCY') {
        setEmergencyBanner(appt.patientName);
      }
    } catch {
      setCheckinResults((prev) => ({
        ...prev,
        [appt.id]: { error: 'Check-in failed. Please try again.' },
      }));
    } finally {
      setCheckinLoading((prev) => ({ ...prev, [appt.id]: false }));
    }
  }

  async function handleSaveVitals(apptId) {
    const form = vitalsForm[apptId] || {};
    const visitId = checkinResults[apptId]?.visitId;

    if (!visitId) return;

    setVitalsLoading((prev) => ({ ...prev, [apptId]: true }));
    setVitalsStatus((prev) => ({ ...prev, [apptId]: '' }));
    setVitalsError((prev) => ({ ...prev, [apptId]: '' }));

    try {
      await client.post('/api/vitals', {
        visitId,
        bp: form.bp,
        temperature: form.temperature,
        spo2: form.spo2,
      });
      setVitalsStatus((prev) => ({ ...prev, [apptId]: 'Vitals saved' }));
    } catch {
      setVitalsError((prev) => ({ ...prev, [apptId]: 'Failed to save vitals. Try again.' }));
    } finally {
      setVitalsLoading((prev) => ({ ...prev, [apptId]: false }));
    }
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    setBookStatus('');
    setBookError('');
    setBookLoading(true);

    const selectedDoctor = doctors.find((d) => d.id === bookForm.doctorId);

    try {
      await client.post('/api/appointments/book', {
        patientId: '',
        patientName: bookForm.patientName.trim(),
        patientPhone: bookForm.patientPhone.trim(),
        patientArea: bookForm.patientArea.trim(),
        doctorId: selectedDoctor?.uid || bookForm.doctorId,
        doctorName: selectedDoctor?.name || '',
        scheduledAt: bookForm.scheduledAt,
        symptoms: bookForm.symptoms.trim(),
      });

      setBookStatus('Appointment booked.');
      setBookForm({ patientName: '', patientPhone: '', patientArea: '', doctorId: '', scheduledAt: '', symptoms: '' });
      setActiveView('Upcoming Appointments');
      loadTodayAppointments();
    } catch (err) {
      setBookError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setBookLoading(false);
    }
  }

  function urgencyBadge(urgency) {
    if (urgency === 'EMERGENCY') return 'bg-red-100 text-red-700 border border-red-300';
    if (urgency === 'PRIORITY') return 'bg-orange-100 text-orange-700 border border-orange-300';
    return 'bg-green-100 text-green-700 border border-green-300';
  }

  function formatDateTime(scheduledAt) {
    if (!scheduledAt) return '';
    const d = scheduledAt?.toDate ? scheduledAt.toDate() : new Date(scheduledAt);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
      return 'Today ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Emergency Banner */}
      {emergencyBanner && (
        <div className="bg-red-600 text-white px-4 py-3 text-center font-semibold text-sm flex items-center justify-center gap-3">
          <span>🚨 EMERGENCY — {emergencyBanner} requires immediate attention!</span>
          <button
            onClick={() => setEmergencyBanner(null)}
            className="text-white underline text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Nurse Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage today's appointments and patient check-ins</p>
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 mb-6">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeView === v
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 border hover:bg-blue-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* ── TODAY'S APPOINTMENTS VIEW ── */}
        {activeView === "Upcoming Appointments" && (
          <div>
            {apptLoading ? (
              <LoadingSpinner />
            ) : apptError ? (
              <ErrorMessage message={apptError} onRetry={loadTodayAppointments} />
            ) : appointments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                <p className="text-gray-400 text-sm">No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => {
                  const result = checkinResults[appt.id];
                  const isCheckinLoading = checkinLoading[appt.id];
                  const vForm = vitalsForm[appt.id] || {};

                  return (
                    <div key={appt.id} className="bg-white rounded-xl shadow-sm p-5 space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-800">{appt.patientName}</h3>
                            <span className="text-xs text-gray-400">{formatDateTime(appt.scheduledAt)}</span>

                            {/* Status badge */}
                            {appt.status === 'arrived' ? (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                                Arrived
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                                Booked
                              </span>
                            )}

                            {/* Urgency badge after check-in */}
                            {result?.urgency && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${urgencyBadge(result.urgency)}`}>
                                {result.urgency}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-500 mt-1">
                            {appt.symptoms?.slice(0, 100)}{appt.symptoms?.length > 100 ? '…' : ''}
                          </p>

                          {result?.department && (
                            <p className="text-xs text-gray-400 mt-0.5">Dept: {result.department}</p>
                          )}
                        </div>

                        {/* Check In button */}
                        {appt.status === 'booked' && !result && (
                          <button
                            onClick={() => handleCheckIn(appt)}
                            disabled={isCheckinLoading}
                            className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isCheckinLoading ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Checking in…
                              </>
                            ) : (
                              'Check In'
                            )}
                          </button>
                        )}
                      </div>

                      {/* Check-in error */}
                      {result?.error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                          {result.error}
                        </p>
                      )}

                      {/* Vitals form — appears after successful check-in */}
                      {result?.visitId && (
                        <div className="border-t pt-4 mt-2 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700">Enter Vitals</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Blood Pressure</label>
                              <input
                                type="text"
                                placeholder="120/80"
                                value={vForm.bp || ''}
                                onChange={(e) =>
                                  setVitalsForm((prev) => ({
                                    ...prev,
                                    [appt.id]: { ...prev[appt.id], bp: e.target.value },
                                  }))
                                }
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Temperature (°F)</label>
                              <input
                                type="number"
                                placeholder="98.6"
                                value={vForm.temperature || ''}
                                onChange={(e) =>
                                  setVitalsForm((prev) => ({
                                    ...prev,
                                    [appt.id]: { ...prev[appt.id], temperature: e.target.value },
                                  }))
                                }
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Oxygen Level (SpO2 %)</label>
                              <input
                                type="number"
                                placeholder="99"
                                value={vForm.spo2 || ''}
                                onChange={(e) =>
                                  setVitalsForm((prev) => ({
                                    ...prev,
                                    [appt.id]: { ...prev[appt.id], spo2: e.target.value },
                                  }))
                                }
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleSaveVitals(appt.id)}
                              disabled={vitalsLoading[appt.id]}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {vitalsLoading[appt.id] ? 'Saving…' : 'Save Vitals'}
                            </button>
                            {vitalsStatus[appt.id] && (
                              <span className="text-sm text-green-600">{vitalsStatus[appt.id]}</span>
                            )}
                            {vitalsError[appt.id] && (
                              <span className="text-sm text-red-600">{vitalsError[appt.id]}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BOOK APPOINTMENT VIEW ── */}
        {activeView === 'Book Appointment' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Book Appointment for Patient</h2>

            {doctorsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={bookForm.patientName}
                      onChange={(e) => setBookForm((p) => ({ ...p, patientName: e.target.value }))}
                      placeholder="Full name"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Patient Phone</label>
                    <input
                      type="text"
                      value={bookForm.patientPhone}
                      onChange={(e) => setBookForm((p) => ({ ...p, patientPhone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Patient Area</label>
                    <input
                      type="text"
                      value={bookForm.patientArea}
                      onChange={(e) => setBookForm((p) => ({ ...p, patientArea: e.target.value }))}
                      placeholder="e.g. Koramangala"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Select Doctor *</label>
                    <select
                      required
                      value={bookForm.doctorId}
                      onChange={(e) => setBookForm((p) => ({ ...p, doctorId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">-- Select a doctor --</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookForm.scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setBookForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Symptoms *</label>
                  <textarea
                    required
                    rows={3}
                    value={bookForm.symptoms}
                    onChange={(e) => setBookForm((p) => ({ ...p, symptoms: e.target.value }))}
                    placeholder="Describe patient symptoms"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                {bookStatus && (
                  <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                    {bookStatus}
                  </p>
                )}
                {bookError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {bookError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={bookLoading}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookLoading ? 'Booking…' : 'Book Appointment'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
