import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import client from '../api/client';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import BookAppointmentForm from '../components/BookAppointmentForm';

const VIEWS = ['Upcoming Appointments', 'Book Appointment'];

export default function NurseDashboard() {
  const [searchParams] = useSearchParams();
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
    if (searchParams.get('view') === 'book') {
      setActiveView('Book Appointment');
    }
  }, [searchParams]);

  useEffect(() => {
    loadTodayAppointments();
  }, []);

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

  function relativeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const sec = Math.floor((Date.now() - t) / 1000);
    if (sec < 0) return 'soon';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }

  function patientInitial(name) {
    const s = String(name || '').trim();
    return s ? s[0].toUpperCase() : '?';
  }

  const totalToday = appointments.length;
  const checkedInCount = appointments.filter((a) => a.status === 'arrived').length;
  const waitingCount = appointments.filter((a) => a.status === 'booked').length;

  return (
    <Layout>
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Nurse Station</h1>
          <p className="text-gray-500 text-sm mt-1">Manage patient check-ins and appointments.</p>
        </div>

        <div className="flex gap-2 mb-8">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition border ${
                activeView === v
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {activeView === 'Upcoming Appointments' && (
          <div>
            {apptLoading ? (
              <LoadingSpinner />
            ) : apptError ? (
              <ErrorMessage message={apptError} onRetry={loadTodayAppointments} />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      <Calendar className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Today</p>
                      <p className="text-2xl font-bold text-gray-900">{totalToday}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                      <span className="h-3 w-3 rounded-full bg-medical-green" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Checked In</p>
                      <p className="text-2xl font-bold text-gray-900">{checkedInCount}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Clock className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Waiting</p>
                      <p className="text-2xl font-bold text-gray-900">{waitingCount}</p>
                    </div>
                  </div>
                </div>

                {appointments.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                    <p className="text-gray-400 text-sm">No upcoming appointments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appointments.map((appt) => {
                  const result = checkinResults[appt.id];
                  const isCheckinLoading = checkinLoading[appt.id];
                  const vForm = vitalsForm[appt.id] || {};
                  const scheduledLine = formatDateTime(appt.scheduledAt);
                  const agoLine = relativeAgo(appt.createdAt);

                  return (
                    <div key={appt.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4 flex-1 min-w-0">
                          <div
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700"
                            aria-hidden
                          >
                            {patientInitial(appt.patientName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900">{appt.patientName}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {scheduledLine}
                              {agoLine ? (
                                <>
                                  <span className="text-gray-300 mx-1">•</span>
                                  {agoLine}
                                </>
                              ) : null}
                            </p>
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                              {appt.symptoms?.slice(0, 100)}
                              {appt.symptoms?.length > 100 ? '…' : ''}
                            </p>
                            {result?.department && (
                              <p className="text-xs text-gray-400 mt-1">Dept: {result.department}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {appt.status === 'arrived' ? (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-medium">
                              Arrived
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                              Booked
                            </span>
                          )}
                          {result?.urgency && (
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${urgencyBadge(result.urgency)}`}>
                              {result.urgency}
                            </span>
                          )}
                          {appt.status === 'booked' && !result && (
                            <button
                              type="button"
                              onClick={() => handleCheckIn(appt)}
                              disabled={isCheckinLoading}
                              className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      </div>

                      {/* Check-in error */}
                      {result?.error && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                          {result.error}
                        </p>
                      )}

                      {/* Vitals form — appears after successful check-in */}
                      {result?.visitId && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-800">Enter Vitals</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                className="w-full border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
                                className="w-full border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
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
                                className="w-full border border-gray-200 rounded-lg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveVitals(appt.id)}
                              disabled={vitalsLoading[appt.id]}
                              className="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              </>
            )}
          </div>
        )}

        {/* ── BOOK APPOINTMENT VIEW ── */}
        {activeView === 'Book Appointment' && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Book Appointment for Patient</h2>
            <BookAppointmentForm
              onSuccess={() => {
                setActiveView('Upcoming Appointments');
                loadTodayAppointments();
              }}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
