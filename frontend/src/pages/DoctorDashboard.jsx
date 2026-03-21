import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import client from '../api/client';
import Navbar from '../components/Navbar';
// LoadingSpinner available if needed for future use
import EmergencyBanner from '../components/EmergencyBanner';

const URGENCY_ORDER = { EMERGENCY: 0, PRIORITY: 1, GENERAL: 2 };

function urgencyBorderColor(urgency) {
  if (urgency === 'EMERGENCY') return 'border-l-4 border-red-500';
  if (urgency === 'PRIORITY') return 'border-l-4 border-orange-400';
  return 'border-l-4 border-green-500';
}

function urgencyBadgeStyle(urgency) {
  if (urgency === 'EMERGENCY') return 'bg-red-100 text-red-700 border border-red-300';
  if (urgency === 'PRIORITY') return 'bg-orange-100 text-orange-700 border border-orange-300';
  return 'bg-green-100 text-green-700 border border-green-300';
}

function WaitTime({ createdAt }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    function calc() {
      if (!createdAt) return setDisplay('');
      const ts = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      const diff = Math.floor((Date.now() - ts.getTime()) / 60000);
      setDisplay(diff < 1 ? 'Just arrived' : `${diff}m waiting`);
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [createdAt]);

  return <span className="text-xs text-gray-400">{display}</span>;
}

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const [selectedAppt, setSelectedAppt] = useState(null);
  const [visit, setVisit] = useState(null);
  const [patient, setPatient] = useState(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState('');

  const [decisionPanel, setDecisionPanel] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);

  // Voice / transcript
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);

  // SOAP
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapNote, setSoapNote] = useState(null);
  const [prescription, setPrescription] = useState([]);
  const [soapError, setSoapError] = useState('');

  // Confirm
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState('');

  // ── LIVE QUEUE via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'appointments'),
      where('clinicId', '==', 'clinic-001')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.status === 'arrived');

      docs.sort((a, b) => {
        const uDiff = (URGENCY_ORDER[a.urgency] ?? 2) - (URGENCY_ORDER[b.urgency] ?? 2);
        if (uDiff !== 0) return uDiff;
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return aTime - bTime;
      });
      setQueue(docs);
      setQueueLoading(false);
    }, () => setQueueLoading(false));

    return () => unsubscribe();
  }, []);

  // ── DECISION PANEL live onSnapshot on visit doc ──
  useEffect(() => {
    if (!visit?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'visits', visit.id), (snap) => {
      if (snap.exists()) {
        const panel = snap.data().decisionPanel || [];
        setDecisionPanel(panel);
      }
    });

    return () => unsubscribe();
  }, [visit?.id]);

  // ── SPEECH RECOGNITION ──
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' ';
      }
      setTranscript(full.trim());
    };
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  }

  // ── LOAD PATIENT CASE ──
  async function handleSelectPatient(appt) {
    setSelectedAppt(appt);
    setVisit(null);
    setPatient(null);
    setSoapNote(null);
    setPrescription([]);
    setSoapError('');
    setConfirmStatus('');
    setTranscript('');
    setDecisionPanel([]);
    setCaseError('');
    setCaseLoading(true);
    setPanelLoading(true);

    try {
      // Fetch visit — always required
      const visitRes = await client.get(`/api/visits/by-appointment?appointmentId=${appt.id}`);
      const loadedVisit = visitRes.data.visit;
      setVisit(loadedVisit);

      // Fetch patient only if patientId exists
      if (appt.patientId) {
        try {
          const patientRes = await client.get(`/api/patients/by-id?patientId=${appt.patientId}`);
          setPatient(patientRes.data.patient);
        } catch {
          setPatient(null);
        }
      }

      // Trigger decision panel generation
      client.post('/api/consultation/panel', { visitId: loadedVisit.id })
        .catch(() => {})
        .finally(() => setPanelLoading(false));
    } catch {
      setCaseError('Failed to load patient case. Please try again.');
      setPanelLoading(false);
    } finally {
      setCaseLoading(false);
    }
  }

  // ── GENERATE SOAP NOTE ──
  async function handleGenerateSOAP() {
    if (!visit?.id || !transcript.trim()) return;
    setSoapLoading(true);
    setSoapError('');
    try {
      const { data } = await client.post('/api/consultation/soap', {
        visitId: visit.id,
        transcript: transcript.trim(),
      });
      setSoapNote(data.soapNote);
      setPrescription(data.prescription || []);
    } catch {
      setSoapError('Failed to generate SOAP note. Please try again.');
    } finally {
      setSoapLoading(false);
    }
  }

  // ── CONFIRM PRESCRIPTION ──
  async function handleConfirm() {
    if (!visit?.id) return;
    setConfirmLoading(true);
    try {
      await client.post('/api/prescription/confirm', { visitId: visit.id });
      setConfirmStatus('Prescription sent to pharmacy successfully.');
      setSelectedAppt(null);
      setVisit(null);
      setPatient(null);
      setSoapNote(null);
    } catch {
      setConfirmStatus('Failed to confirm. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmergencyBanner />
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live patient queue and consultation management</p>
        </div>

        <div className="flex gap-4 h-[calc(100vh-160px)]">

          {/* ── LEFT COLUMN — LIVE QUEUE (35%) ── */}
          <div className="w-[35%] flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">
                {queueLoading ? 'Loading…' : `${queue.length} patient${queue.length !== 1 ? 's' : ''} waiting`}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {queueLoading ? (
                <div className="flex justify-center pt-8">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : queue.length === 0 ? (
                <p className="text-center text-gray-400 text-sm pt-8">No patients waiting</p>
              ) : (
                queue.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={() => handleSelectPatient(appt)}
                    className={`w-full text-left p-3 rounded-lg bg-white hover:bg-gray-50 transition ${urgencyBorderColor(appt.urgency)} ${
                      selectedAppt?.id === appt.id ? 'ring-2 ring-blue-400 bg-blue-50' : 'border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{appt.patientName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyBadgeStyle(appt.urgency)}`}>
                        {appt.urgency || 'GENERAL'}
                      </span>
                    </div>
                    <WaitTime createdAt={appt.createdAt} />
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {appt.symptoms?.slice(0, 80)}{appt.symptoms?.length > 80 ? '…' : ''}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── CENTER COLUMN — PATIENT CASE (40%) ── */}
          <div className="w-[40%] flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">
                {selectedAppt ? selectedAppt.patientName : 'Select a patient'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!selectedAppt ? (
                <p className="text-center text-gray-400 text-sm pt-8">Click a patient card to view their case</p>
              ) : caseLoading ? (
                <div className="flex justify-center pt-8">
                  <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : caseError ? (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{caseError}</p>
              ) : (
                <>
                  {/* Demographics */}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Age:</span> {patient?.age || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Area:</span> {patient?.area || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Conditions:</span> {patient?.conditions || 'None'}
                    </p>
                    {patient?.allergies && (
                      <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                        ⚠ Allergies: {patient.allergies}
                      </p>
                    )}
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Today's symptoms:</span> {visit?.symptoms || 'N/A'}
                    </p>
                  </div>

                  {/* Vitals */}
                  {visit?.vitals && Object.keys(visit.vitals).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'BP', value: visit.vitals.bp },
                        { label: 'Temp °F', value: visit.vitals.temperature },
                        { label: 'SpO2 %', value: visit.vitals.spo2 },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-blue-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-blue-500 font-medium">{label}</p>
                          <p className="text-lg font-bold text-blue-700">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Voice Recorder */}
                  <div className="border rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700">Consultation Notes</h3>

                    {speechSupported ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          {!recording ? (
                            <button
                              onClick={startRecording}
                              className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition flex items-center gap-1"
                            >
                              <span className="w-2 h-2 rounded-full bg-white inline-block" />
                              Start Recording
                            </button>
                          ) : (
                            <button
                              onClick={stopRecording}
                              className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
                              Stop Recording
                            </button>
                          )}
                        </div>
                        {transcript && (
                          <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 max-h-20 overflow-y-auto">
                            {transcript}
                          </p>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Type your consultation notes here"
                        rows={4}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                      />
                    )}

                    <button
                      onClick={handleGenerateSOAP}
                      disabled={soapLoading || !transcript.trim()}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {soapLoading ? 'Generating…' : 'Generate SOAP Note'}
                    </button>

                    {soapError && (
                      <p className="text-xs text-red-600">{soapError}</p>
                    )}
                  </div>

                  {/* SOAP Note */}
                  {soapNote && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700">SOAP Note</h3>
                      {['subjective', 'objective', 'assessment', 'plan'].map((key) => (
                        <div key={key}>
                          <p className="text-xs font-semibold text-gray-500 uppercase">{key}</p>
                          <p className="text-sm text-gray-700">{soapNote[key] || '—'}</p>
                        </div>
                      ))}

                      {prescription.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Prescription</p>
                          <ul className="space-y-1">
                            {prescription.map((med, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-1">
                                <span className="text-blue-500">•</span> {med}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={handleConfirm}
                        disabled={confirmLoading}
                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                      >
                        {confirmLoading ? 'Sending…' : 'Confirm and Send to Pharmacy'}
                      </button>

                      {confirmStatus && (
                        <p className={`text-xs text-center ${confirmStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                          {confirmStatus}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN — DECISION PANEL (25%) ── */}
          <div className="w-[25%] flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">AI Decision Panel</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedAppt ? (
                <p className="text-center text-gray-400 text-xs pt-6">Select a patient to view insights</p>
              ) : panelLoading ? (
                <div className="flex flex-col items-center pt-8 gap-3">
                  <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Generating insights…</p>
                </div>
              ) : decisionPanel.length === 0 ? (
                <p className="text-center text-gray-400 text-xs pt-6">No insights available</p>
              ) : (
                <ul className="space-y-3">
                  {decisionPanel.map((insight, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
