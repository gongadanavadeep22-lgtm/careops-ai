import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import client from '../api/client';
import Navbar from '../components/Navbar';
// LoadingSpinner available if needed for future use
import EmergencyBanner from '../components/EmergencyBanner';

const URGENCY_ORDER = { EMERGENCY: 0, PRIORITY: 1, GENERAL: 2 };

function hasSoapContent(sn) {
  if (!sn || typeof sn !== 'object') return false;
  return ['subjective', 'objective', 'assessment', 'plan'].some(
    (k) => String(sn[k] ?? '').trim().length > 0
  );
}

/** Match backend medicinesForVisit: list for approve / UI */
function medicinesFromState(soapNote, prescription) {
  if (Array.isArray(prescription) && prescription.length > 0) return prescription;
  const plan = soapNote?.plan;
  if (plan && String(plan).trim()) return [String(plan).trim()];
  return [];
}

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
  const [panelError, setPanelError] = useState('');

  // Voice / transcript
  const [transcript, setTranscript] = useState('');
  const [recording, setRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const panelRequestRef = useRef(0);

  // SOAP
  const [soapLoading, setSoapLoading] = useState(false);
  const [soapNote, setSoapNote] = useState(null);
  const [prescription, setPrescription] = useState([]);
  const [healthTips, setHealthTips] = useState([]);
  const [prescriptionValidation, setPrescriptionValidation] = useState(null);
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

  // Note: do not sync decisionPanel from Firestore onSnapshot — it races the /panel API
  // and often wipes insights right after a successful response.

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
    setHealthTips([]);
    setPrescriptionValidation(null);
    setSoapError('');
    setConfirmStatus('');
    setTranscript('');
    setDecisionPanel([]);
    setCaseError('');
    setPanelError('');
    setCaseLoading(true);
    setPanelLoading(true);

    try {
      // Fetch visit — always required
      const visitRes = await client.get(`/api/visits/by-appointment?appointmentId=${appt.id}`);
      const loadedVisit = visitRes.data.visit;
      setVisit(loadedVisit);

      // Restore SOAP / prescription if doctor reopens this case
      const sn = loadedVisit.soapNote || {};
      const hasSoap = sn.subjective || sn.objective || sn.assessment || sn.plan;
      if (hasSoap || (loadedVisit.prescription?.length > 0) || (loadedVisit.healthTips?.length > 0)) {
        setSoapNote({
          subjective: sn.subjective || '',
          objective: sn.objective || '',
          assessment: sn.assessment || '',
          plan: sn.plan || '',
        });
        setPrescription(loadedVisit.prescription || []);
        setHealthTips(loadedVisit.healthTips || []);
        // Avoid stale "green" validation when SOAP text was never saved
        setPrescriptionValidation(hasSoap ? loadedVisit.prescriptionValidation || null : null);
      }
      if (Array.isArray(loadedVisit.decisionPanel) && loadedVisit.decisionPanel.length > 0) {
        setDecisionPanel(loadedVisit.decisionPanel);
      }

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
      triggerPanel(loadedVisit.id);
    } catch {
      setCaseError('Failed to load patient case. Please try again.');
      setPanelLoading(false);
    } finally {
      setCaseLoading(false);
    }
  }

  const soapReady = hasSoapContent(soapNote);
  const medList = medicinesFromState(soapNote, prescription);
  const canApprove =
    soapReady &&
    medList.length > 0 &&
    prescriptionValidation?.isCorrect === true;

  async function triggerPanel(visitId, consultationTranscript) {
    const reqId = ++panelRequestRef.current;
    setPanelLoading(true);
    setPanelError('');
    // #region agent log
    fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
      body: JSON.stringify({
        sessionId: '74527c',
        hypothesisId: 'H1',
        location: 'DoctorDashboard.jsx:triggerPanel:start',
        message: 'panel request start',
        data: {
          hasBaseUrl: Boolean(import.meta.env.VITE_API_URL),
          visitIdLen: String(visitId || '').length,
          transcriptLen: consultationTranscript?.trim?.()?.length ?? 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    try {
      const { data } = await client.post('/api/consultation/panel', {
        visitId,
        ...(consultationTranscript?.trim() ? { transcript: consultationTranscript.trim() } : {}),
      });
      if (reqId !== panelRequestRef.current) return;
      setDecisionPanel(Array.isArray(data.insights) ? data.insights : []);
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H4',
          location: 'DoctorDashboard.jsx:triggerPanel:ok',
          message: 'panel ok',
          data: { insightsCount: Array.isArray(data.insights) ? data.insights.length : -1 },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (err) {
      if (reqId !== panelRequestRef.current) return;
      setPanelError(err.response?.data?.error || 'Failed to generate insights. Click Retry.');
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H1',
          location: 'DoctorDashboard.jsx:triggerPanel:err',
          message: 'panel failed',
          data: {
            status: err.response?.status ?? null,
            hasResponse: Boolean(err.response),
            errSnippet: String(err.response?.data?.error || err.message || '').slice(0, 80),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } finally {
      if (reqId === panelRequestRef.current) setPanelLoading(false);
    }
  }

  // ── GENERATE SOAP NOTE ──
  async function handleGenerateSOAP() {
    if (!visit?.id || !transcript.trim()) return;
    setSoapLoading(true);
    setSoapError('');
    setConfirmStatus('');
    try {
      const { data } = await client.post('/api/consultation/soap', {
        visitId: visit.id,
        transcript: transcript.trim(),
      });
      setSoapNote(data.soapNote);
      setPrescription(data.prescription || []);
      setHealthTips(data.healthTips || []);
      setPrescriptionValidation(data.prescriptionValidation || null);
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H4',
          location: 'DoctorDashboard.jsx:soap:ok',
          message: 'soap client ok',
          data: {
            rxCount: (data.prescription || []).length,
            subjLen: String(data.soapNote?.subjective || '').length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      await triggerPanel(visit.id, transcript.trim());
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H1',
          location: 'DoctorDashboard.jsx:soap:err',
          message: 'soap client fail',
          data: {
            status: err.response?.status ?? null,
            hasResponse: Boolean(err.response),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setSoapError('Failed to generate SOAP note. Please try again.');
    } finally {
      setSoapLoading(false);
    }
  }

  // ── CONFIRM PRESCRIPTION ──
  async function handleConfirm() {
    if (!visit?.id) return;
    // Server uses Firestore, not only screen state — must match saved SOAP / prescription
    if (!canApprove) {
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H3',
          location: 'DoctorDashboard.jsx:handleConfirm:blocked',
          message: 'confirm blocked by canApprove',
          data: {
            soapReady,
            medListLen: medList.length,
            validationOk: prescriptionValidation?.isCorrect === true,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setConfirmStatus(
        'Complete Generate SOAP Note with medicines (or plan text) and a passing AI check before sending.'
      );
      return;
    }
    setConfirmLoading(true);
    setConfirmStatus('');
    try {
      await client.post('/api/prescription/confirm', { visitId: visit.id });
      setConfirmStatus('Prescription sent to pharmacy successfully.');
      setSelectedAppt(null);
      setVisit(null);
      setPatient(null);
      setSoapNote(null);
      setHealthTips([]);
      setPrescriptionValidation(null);
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H5',
          location: 'DoctorDashboard.jsx:handleConfirm:ok',
          message: 'confirm client ok',
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    } catch (err) {
      const status = err.response?.status;
      const bodyErr = err.response?.data?.error || err.response?.data?.message;
      let msg =
        bodyErr ||
        (status === 401
          ? 'Session expired — sign out and sign in again.'
          : null) ||
        (!err.response
          ? 'Cannot reach API. Set VITE_API_URL to your Railway URL (Vercel) or run the backend locally.'
          : null) ||
        err.message ||
        'Failed to confirm. Please try again.';
      if (status) msg = `${msg} (HTTP ${status})`;
      setConfirmStatus(msg);
      // #region agent log
      fetch('http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
        body: JSON.stringify({
          sessionId: '74527c',
          hypothesisId: 'H1',
          location: 'DoctorDashboard.jsx:handleConfirm:err',
          message: 'confirm client fail',
          data: {
            status: err.response?.status ?? null,
            hasResponse: Boolean(err.response),
            errSnippet: String(bodyErr || err.message || '').slice(0, 100),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
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
                    <p className="text-[11px] text-gray-500 leading-snug">
                      After you stop recording, tap <strong>Generate SOAP Note</strong> so Gemini documents the visit, extracts medicines, and runs the safety check. (Manual step avoids running AI on half-finished notes.)
                    </p>

                    {soapError && (
                      <p className="text-xs text-red-600">{soapError}</p>
                    )}
                  </div>

                  {/* SOAP Note */}
                  {soapNote && (
                    <div className="border rounded-lg p-3 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">SOAP Note</h3>

                      {['subjective', 'objective', 'assessment', 'plan'].map((key) => (
                        <div key={key}>
                          <p className="text-xs font-semibold text-gray-500 uppercase">{key}</p>
                          <p className="text-sm text-gray-700">{soapNote[key] || '—'}</p>
                        </div>
                      ))}

                      {/* Prescription */}
                      {medList.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Prescription</p>
                          <ul className="space-y-1">
                            {medList.map((med, i) => (
                              <li key={i} className="text-sm text-gray-700 flex items-start gap-1">
                                <span className="text-blue-500">•</span> {med}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prescription Validation */}
                      {prescriptionValidation && (
                        <div className={`rounded-lg px-3 py-2 text-sm font-medium flex items-start gap-2 ${
                          prescriptionValidation.isCorrect
                            ? 'bg-green-50 border border-green-300 text-green-700'
                            : 'bg-red-50 border border-red-300 text-red-700'
                        }`}>
                          <span className="text-lg shrink-0">
                            {prescriptionValidation.isCorrect ? '✅' : '⚠️'}
                          </span>
                          <div>
                            <p className="font-semibold">
                              {prescriptionValidation.isCorrect
                                ? 'Prescription looks correct'
                                : soapReady
                                  ? 'Wrong medicine detected'
                                  : 'SOAP not generated'}
                            </p>
                            {prescriptionValidation.message && (
                              <p className="text-xs mt-0.5 opacity-90">{prescriptionValidation.message}</p>
                            )}
                            {!prescriptionValidation.isCorrect && prescriptionValidation.suggestedMedicines?.length > 0 && (
                              <p className="text-xs mt-1 font-semibold">
                                Suggested: {prescriptionValidation.suggestedMedicines.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Health Tips */}
                      {healthTips.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">💡 Health Tips for Patient</p>
                          <ul className="space-y-1">
                            {healthTips.map((tip, i) => (
                              <li key={i} className="text-sm text-blue-700 flex items-start gap-1">
                                <span className="shrink-0">{i + 1}.</span> {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Approve — SOAP filled + medicines + AI validation must pass */}
                      {!soapReady && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          SOAP sections must be filled (run Generate SOAP Note after your notes are complete).
                        </p>
                      )}
                      {soapReady && medList.length === 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          Add medicines in the transcript and generate SOAP again, or ensure the Plan section lists medications.
                        </p>
                      )}
                      {soapReady && medList.length > 0 && prescriptionValidation && !prescriptionValidation.isCorrect && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                          AI flagged a prescription concern — fix the plan or medicines, then generate SOAP again. Approve stays off until the check passes.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirmLoading || !canApprove}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold transition mt-1 flex items-center justify-center gap-2 ${
                          canApprove && !confirmLoading
                            ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {confirmLoading
                          ? 'Sending…'
                          : canApprove
                            ? '✅ Approve & Send to Pharmacy'
                            : '🔒 Approve & Send to Pharmacy — locked'}
                      </button>
                      {!canApprove && !confirmLoading && (
                        <p className="text-[11px] text-gray-500 text-center mt-1">
                          There is no separate Confirm button. This turns <strong>green</strong> after SOAP is filled, medicines are listed, and the AI check passes.
                        </p>
                      )}

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
              ) : (
                <>
                  {soapReady && prescriptionValidation && (
                    <div
                      className={`mb-4 rounded-lg border p-3 text-sm ${
                        prescriptionValidation.isCorrect
                          ? 'border-green-300 bg-green-50 text-green-900'
                          : 'border-red-300 bg-red-50 text-red-900'
                      }`}
                    >
                      <p className="font-bold text-xs uppercase tracking-wide mb-1">
                        {prescriptionValidation.isCorrect ? 'Prescription check — OK' : 'Prescription check — review'}
                      </p>
                      {!prescriptionValidation.isCorrect && (
                        <>
                          <p className="font-semibold">Possible issue with medicines vs diagnosis / symptoms</p>
                          {prescriptionValidation.message && (
                            <p className="text-xs mt-1.5 leading-relaxed">{prescriptionValidation.message}</p>
                          )}
                          {prescriptionValidation.suggestedMedicines?.length > 0 && (
                            <p className="text-xs mt-2 font-medium">
                              Suggested alternatives: {prescriptionValidation.suggestedMedicines.join(', ')}
                            </p>
                          )}
                        </>
                      )}
                      {prescriptionValidation.isCorrect && (
                        <p className="text-xs mt-0.5">
                          AI cross-checked listed medicines against the SOAP note — no conflict flagged. You can approve when ready.
                        </p>
                      )}
                    </div>
                  )}

                  {panelLoading ? (
                    <div className="flex flex-col items-center pt-4 gap-3">
                      <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-400">Generating insights…</p>
                    </div>
                  ) : panelError ? (
                    <div className="flex flex-col items-center pt-4 gap-3 px-2">
                      <p className="text-xs text-red-500 text-center">{panelError}</p>
                      <button
                        type="button"
                        onClick={() => visit?.id && triggerPanel(visit.id, transcript)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                      >
                        Retry
                      </button>
                    </div>
                  ) : decisionPanel.length === 0 ? (
                    <div className="flex flex-col items-center pt-4 gap-3 px-2">
                      <p className="text-xs text-gray-400 text-center">No clinical insights yet.</p>
                      <button
                        type="button"
                        onClick={() => visit?.id && triggerPanel(visit.id, transcript)}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition"
                      >
                        Generate insights
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Clinical insights (triage context)
                      </p>
                      <ul className="space-y-3">
                        {decisionPanel.map((insight, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                            <span className="text-blue-500 font-bold shrink-0">{i + 1}.</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
