import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

function urgencyClass(u) {
  if (u === 'EMERGENCY') return 'bg-red-100 text-red-800 border-red-200';
  if (u === 'PRIORITY') return 'bg-orange-100 text-orange-800 border-orange-200';
  return 'bg-green-100 text-green-800 border-green-200';
}

export default function PatientWaiting() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    client
      .get('/api/appointments/waiting')
      .then(({ data }) => setAppointments(data.appointments || []))
      .catch(() => setError('Failed to load waiting room.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiting Room</h1>
            <p className="mt-1 text-sm text-gray-500">Patients checked in and waiting for the doctor.</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : appointments.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No patients waiting right now.</p>
            <Link to="/nurse" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
              Go to nurse station →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{appt.patientName}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{appt.symptoms}</p>
                    <p className="text-xs text-gray-400 mt-1">Dr. {appt.doctorName || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold border shrink-0 ${urgencyClass(appt.urgency)}`}>
                    {appt.urgency || 'GENERAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
