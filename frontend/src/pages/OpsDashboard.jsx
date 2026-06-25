import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import EmergencyBanner from '../components/EmergencyBanner';
import LoadingSpinner from '../components/LoadingSpinner';

function urgencyClass(u) {
  if (u === 'EMERGENCY') return 'bg-red-100 text-red-800 border-red-200';
  if (u === 'PRIORITY') return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-green-100 text-green-800 border-green-200';
}

export default function OpsDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client
      .get('/api/ops/summary')
      .then(({ data }) => setSummary(data))
      .catch(() => setError('Failed to load operations summary.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <EmergencyBanner />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Clinic overview — appointments, waiting room, pharmacy.</p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : summary ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Today total', value: summary.today.total },
                { label: 'Booked', value: summary.today.booked },
                { label: 'Arrived', value: summary.today.arrived },
                { label: 'Completed', value: summary.today.completed },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Waiting room</p>
                <p className="text-3xl font-bold text-primary-600 mt-2">{summary.waitingCount}</p>
                <Link to="/patients/waiting" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
                  View waiting list →
                </Link>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">Pharmacy queue</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{summary.pharmacyPendingCount}</p>
                <p className="text-xs text-gray-500 mt-2">Confirmed prescriptions awaiting dispensing</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">Integrations</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className={`px-3 py-1 rounded-full border ${summary.geminiConfigured ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  Gemini {summary.geminiConfigured ? 'configured' : 'not configured'}
                </span>
                <span className={`px-3 py-1 rounded-full border ${summary.twilioConfigured ? 'bg-green-50 text-green-800 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  Twilio {summary.twilioConfigured ? 'configured' : 'not configured'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">Recent arrivals</p>
              {summary.recentArrivals?.length === 0 ? (
                <p className="text-sm text-gray-400">No patients in waiting room.</p>
              ) : (
                <ul className="space-y-2">
                  {summary.recentArrivals.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm border-b border-gray-50 pb-2">
                      <span className="font-medium text-gray-900">{a.patientName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${urgencyClass(a.urgency)}`}>{a.urgency}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to="/appointments/book" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                Book appointment
              </Link>
              <Link to="/patients/waiting" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Waiting room
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
