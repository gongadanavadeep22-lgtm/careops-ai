import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import client from '../api/client';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function PharmacyDashboard() {
  const [active, setActive] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(true);

  // Detail view state
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [patientPhone, setPatientPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [readyStatus, setReadyStatus] = useState('');
  const [readyError, setReadyError] = useState('');

  // ── ACTIVE PRESCRIPTIONS (confirmed) via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'visits'),
      where('clinicId', '==', 'clinic-001'),
      where('prescriptionStatus', '==', 'confirmed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return bTime - aTime;
        });
      setActive(docs);
      setActiveLoading(false);
    }, () => setActiveLoading(false));

    return () => unsubscribe();
  }, []);

  // ── COMPLETED PRESCRIPTIONS (dispensed) via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'visits'),
      where('clinicId', '==', 'clinic-001'),
      where('prescriptionStatus', '==', 'dispensed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aTime = a.dispensedAt?.toDate ? a.dispensedAt.toDate() : new Date(a.dispensedAt || 0);
          const bTime = b.dispensedAt?.toDate ? b.dispensedAt.toDate() : new Date(b.dispensedAt || 0);
          return bTime - aTime;
        });
      setCompleted(docs);
      setCompletedLoading(false);
    }, () => setCompletedLoading(false));

    return () => unsubscribe();
  }, []);

  async function handleSelectVisit(visit) {
    setSelectedVisit(visit);
    setPatientPhone('');
    setReadyStatus('');
    setReadyError('');
    setPhoneLoading(true);

    if (visit.patientId) {
      try {
        const { data } = await client.get(`/api/patients/by-id?patientId=${visit.patientId}`);
        setPatientPhone(data.patient?.phone || '');
      } catch {
        setPatientPhone('');
      }
    }
    setPhoneLoading(false);
  }

  async function handleMarkReady() {
    if (!selectedVisit) return;
    setReadyLoading(true);
    setReadyStatus('');
    setReadyError('');

    try {
      const { data } = await client.post('/api/pharmacy/ready', { visitId: selectedVisit.id });
      const msg = data.warning
        ? `Medicines marked as ready. ${data.warning}`
        : 'Medicines marked as ready. WhatsApp sent to patient.';
      setReadyStatus(msg);
      setTimeout(() => setSelectedVisit(null), 3000);
    } catch (err) {
      setReadyError(err.response?.data?.error || 'Failed to mark as ready. Please try again.');
    } finally {
      setReadyLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pharmacy Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage prescriptions and patient notifications</p>
        </div>

        {/* ── SECTION 1 — ACTIVE PRESCRIPTIONS ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            Pending Prescriptions
            {active.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {active.length}
              </span>
            )}
          </h2>

          {activeLoading ? (
            <LoadingSpinner />
          ) : active.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">All caught up. No pending prescriptions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((visit) => (
                <div key={visit.id}>
                  {/* Prescription Card — click to open detail */}
                  <button
                    onClick={() => handleSelectVisit(visit)}
                    className={`w-full text-left bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500 hover:shadow-md transition ${selectedVisit?.id === visit.id ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800">{visit.patientName}</h3>
                          <span className="text-xs text-gray-400">Confirmed {timeAgo(visit.createdAt)}</span>
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                            {visit.prescription?.length || 0} medicines
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Click to view details and send WhatsApp</p>
                      </div>
                      <span className="text-blue-500 text-sm font-medium shrink-0">View →</span>
                    </div>
                  </button>

                  {/* Detail Panel — shown when this card is selected */}
                  {selectedVisit?.id === visit.id && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mt-2 border border-blue-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-800">Prescription Details</h3>
                        <button onClick={() => setSelectedVisit(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Close</button>
                      </div>

                      {/* Patient Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium uppercase">Patient Name</p>
                          <p className="text-sm font-bold text-gray-800 mt-1">{visit.patientName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium uppercase">Phone Number</p>
                          {phoneLoading ? (
                            <p className="text-sm text-gray-400 mt-1">Loading…</p>
                          ) : (
                            <p className="text-sm font-bold text-gray-800 mt-1">{patientPhone || 'Not available'}</p>
                          )}
                        </div>
                      </div>

                      {/* Medicines */}
                      <div>
                        <p className="text-xs text-gray-500 font-medium uppercase mb-2">Prescribed Medicines</p>
                        {visit.prescription && visit.prescription.length > 0 ? (
                          <ul className="space-y-2">
                            {visit.prescription.map((med, i) => (
                              <li key={i} className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                                <span className="text-blue-500 font-bold">{i + 1}.</span>
                                <span className="text-sm text-gray-800 font-medium">{med}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400">No medicines listed</p>
                        )}
                      </div>

                      {/* Total Amount */}
                      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                        <span className="text-xl font-bold text-green-700">₹1000</span>
                      </div>

                      {/* Submit Button */}
                      {!readyStatus && (
                        <button
                          onClick={handleMarkReady}
                          disabled={readyLoading}
                          className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {readyLoading ? 'Sending…' : '📤 Submit & Send WhatsApp to Patient'}
                        </button>
                      )}

                      {readyStatus && (
                        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2 text-center font-medium">
                          ✅ {readyStatus}
                        </p>
                      )}
                      {readyError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                          {readyError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 2 — COMPLETED PRESCRIPTIONS ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            Completed
            {completed.length > 0 && (
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
                {completed.length}
              </span>
            )}
          </h2>

          {completedLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : completed.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-gray-300 text-sm">No completed prescriptions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map((visit) => (
                <div key={visit.id} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-gray-300 opacity-70">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-600">{visit.patientName}</h3>
                        <span className="text-xs text-gray-400">
                          Dispensed {timeAgo(visit.dispensedAt)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                          Dispensed
                        </span>
                      </div>
                      {visit.prescription && visit.prescription.length > 0 && (
                        <ul className="space-y-0.5">
                          {visit.prescription.map((med, i) => (
                            <li key={i} className="text-xs text-gray-500 flex items-start gap-1">
                              <span className="text-gray-400">•</span> {med}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="text-sm text-gray-400 font-medium shrink-0">
                      ₹{(visit.prescription?.length || 0) * 150}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
