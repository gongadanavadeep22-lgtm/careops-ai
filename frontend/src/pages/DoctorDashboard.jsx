import { useState, useEffect, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import client from '../api/client';
import Layout from '../components/Layout';
import EmergencyBanner from '../components/EmergencyBanner';
import { useAuth } from '../hooks/useAuth';
import { normalizeInsights, insightToString, tipToString } from '../utils/clinicalText';
import {
  Loader2,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Shield,
  Heart,
  Thermometer,
  Activity,
  Mic,
  AlertCircle,
} from 'lucide-react';

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

function splitPills(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function patientInitial(name) {
  const s = String(name || '').trim();
  return s ? s[0].toUpperCase() : '?';
}

/** BCP-47 tag for Web Speech API — match UI language for better recognition. */
function speechRecognitionLang(i18nLang) {
  const base = String(i18nLang || 'en').split('-')[0];
  const map = { en: 'en-US', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' };
  return map[base] || 'en-US';
}

function urgencyLabel(urgency, t) {
  const u = String(urgency || 'GENERAL').toUpperCase();
  if (u === 'EMERGENCY') return t('doctor.urgencyEmergency');
  if (u === 'PRIORITY') return t('doctor.urgencyPriority');
  return t('doctor.urgencyGeneral');
}

function WaitTime({ createdAt }) {
  const { t } = useTranslation();
  const [display, setDisplay] = useState('');

  useEffect(() => {
    function calc() {
      if (!createdAt) return setDisplay('');
      const ts = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      const diffMin = Math.floor((Date.now() - ts.getTime()) / 60000);
      setDisplay(diffMin < 1 ? t('doctor.waitJustNow') : t('doctor.waitMinAgo', { n: diffMin }));
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [createdAt, t]);

  return <span className="text-xs text-gray-500">{display}</span>;
}

export default function DoctorDashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const clinicId = user?.clinicId || 'clinic-001';
  const db = getFirestoreDb();

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
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);
  const recordingIntentRef = useRef(false);
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
  const [confirmOutcome, setConfirmOutcome] = useState(null);
  const [speechInsecureHint, setSpeechInsecureHint] = useState(false);

  // ── LIVE QUEUE via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'appointments'),
      where('clinicId', '==', clinicId),
      limit(100)
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
  }, [clinicId]);

  // Note: do not sync decisionPanel from Firestore onSnapshot — it races the /panel API
  // and often wipes insights right after a successful response.

  // ── SPEECH RECOGNITION ──
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hostname;
    const localhost = h === 'localhost' || h === '127.0.0.1';
    setSpeechInsecureHint(!window.isSecureContext && !localhost);
  }, []);

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechError('');
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechRecognitionLang(i18n.language);
    recognition.onresult = (e) => {
      let full = '';
      for (let i = 0; i < e.results.length; i++) {
        full += `${e.results[i][0].transcript} `;
      }
      setTranscript(full.trim());
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError(t('doctor.speechDenied'));
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        // eslint-disable-next-line no-console
        console.warn('[speech]', event.error);
      }
    };
    recognition.onend = () => {
      if (recordingIntentRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          /* already running or stopped */
        }
      }
    };
    recordingIntentRef.current = true;
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
    } catch (err) {
      recordingIntentRef.current = false;
      recognitionRef.current = null;
      setRecording(false);
      // eslint-disable-next-line no-console
      console.warn('[speech] start failed', err);
    }
  }

  function stopRecording() {
    recordingIntentRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
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
    setConfirmOutcome(null);
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
        setDecisionPanel(normalizeInsights(loadedVisit.decisionPanel));
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
      setCaseError(t('doctor.loadCaseError'));
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
    try {
      const { data } = await client.post('/api/consultation/panel', {
        visitId,
        ...(consultationTranscript?.trim() ? { transcript: consultationTranscript.trim() } : {}),
      });
      if (reqId !== panelRequestRef.current) return;
      setDecisionPanel(normalizeInsights(data.insights));
    } catch (err) {
      if (reqId !== panelRequestRef.current) return;
      setPanelError(err.response?.data?.error || t('doctor.panelInsightFailed'));
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
    setConfirmOutcome(null);
    try {
      const { data } = await client.post('/api/consultation/soap', {
        visitId: visit.id,
        transcript: transcript.trim(),
      });
      setSoapNote(data.soapNote);
      setPrescription(data.prescription || []);
      setHealthTips(data.healthTips || []);
      setPrescriptionValidation(data.prescriptionValidation || null);
      await triggerPanel(visit.id, transcript.trim());
    } catch (err) {
      setSoapError(t('doctor.soapGenerateFailed'));
    } finally {
      setSoapLoading(false);
    }
  }

  // ── CONFIRM PRESCRIPTION ──
  async function handleConfirm() {
    if (!visit?.id) return;
    // Server uses Firestore, not only screen state — must match saved SOAP / prescription
    if (!canApprove) {
      setConfirmOutcome('error');
      setConfirmStatus(t('doctor.confirmPrereq'));
      return;
    }
    setConfirmLoading(true);
    setConfirmStatus('');
    setConfirmOutcome(null);
    try {
      await client.post('/api/prescription/confirm', { visitId: visit.id });
      setConfirmOutcome('success');
      setConfirmStatus(t('doctor.confirmSuccess'));
      setSelectedAppt(null);
      setVisit(null);
      setPatient(null);
      setSoapNote(null);
      setHealthTips([]);
      setPrescriptionValidation(null);
    } catch (err) {
      const status = err.response?.status;
      const bodyErr = err.response?.data?.error || err.response?.data?.message;
      let msg =
        bodyErr ||
        (status === 401 ? t('doctor.errorSessionExpired') : null) ||
        (!err.response ? t('doctor.errorApiUnreachable') : null) ||
        err.message ||
        t('doctor.errorConfirmFailed');
      if (status) msg = `${msg}${t('doctor.httpStatus', { status })}`;
      setConfirmOutcome('error');
      setConfirmStatus(msg);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <Layout>
      <EmergencyBanner />

      <div className="max-w-[1600px] mx-auto px-4 py-6 min-h-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('doctor.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('doctor.subtitle')}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-11rem)] max-h-[calc(100vh-8rem)]">

          {/* LEFT — Live queue */}
          <div className="flex-[3] min-w-0 flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-medical-green opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-medical-green" />
                </span>
                <h2 className="font-semibold text-gray-900 text-sm">{t('doctor.liveQueue')}</h2>
              </div>
              <span className="text-xs font-semibold rounded-full bg-primary-100 text-primary-700 px-2.5 py-0.5">
                {queueLoading ? '…' : t('doctor.waiting', { count: queue.length })}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {queueLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 text-primary-600 animate-spin" aria-hidden />
                </div>
              ) : queue.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">{t('doctor.noPatients')}</p>
              ) : (
                queue.map((appt) => {
                  const sel = selectedAppt?.id === appt.id;
                  return (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => handleSelectPatient(appt)}
                      className={`w-full text-left rounded-xl border p-3 transition hover:shadow-md ${urgencyBorderColor(appt.urgency)} ${
                        sel ? 'border-l-4 border-primary-600 bg-primary-50 ring-1 ring-primary-200' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800">
                          {patientInitial(appt.patientName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900 text-sm truncate">{appt.patientName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${urgencyBadgeStyle(appt.urgency)}`}>
                              {urgencyLabel(appt.urgency, t)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <WaitTime createdAt={appt.createdAt} />
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {appt.symptoms}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* CENTER — Patient case */}
          <div className="flex-[4.5] min-w-0 flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="font-semibold text-gray-900 text-sm">
                {selectedAppt ? selectedAppt.patientName : t('doctor.patientCase')}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {!selectedAppt ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <Stethoscope className="h-14 w-14 text-gray-300 mb-3" strokeWidth={1.25} aria-hidden />
                  <p className="text-gray-600 font-medium">{t('doctor.selectPatient')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('doctor.selectHint')}</p>
                </div>
              ) : caseLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 text-primary-600 animate-spin" aria-hidden />
                </div>
              ) : caseError ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  <span>{caseError}</span>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{selectedAppt.patientName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${urgencyBadgeStyle(selectedAppt.urgency)}`}>
                        {urgencyLabel(selectedAppt.urgency, t)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {t('doctor.age')} {patient?.age ?? '—'} · {patient?.area || t('doctor.areaNotSet')} · {t('doctor.dr')}{' '}
                      {selectedAppt.doctorName || '—'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-red-100 bg-red-50/80 p-4">
                    <h4 className="text-sm font-bold text-red-800 mb-2">{t('doctor.allergies')}</h4>
                    {splitPills(patient?.allergies).length === 0 ? (
                      <p className="text-xs text-red-700/70">{t('doctor.noAllergies')}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {splitPills(patient?.allergies).map((a) => (
                          <span key={a} className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-900 border border-red-200">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">{t('doctor.conditions')}</h4>
                    {(() => {
                      const raw = patient?.conditions;
                      const list =
                        raw && String(raw).trim() && String(raw).toLowerCase() !== 'none'
                          ? splitPills(raw)
                          : [];
                      return list.length === 0 ? (
                        <p className="text-xs text-blue-800/70">{t('doctor.noConditions')}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {list.map((c) => (
                            <span
                              key={c}
                              className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-900 border border-blue-200"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {visit?.vitals && Object.keys(visit.vitals).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { labelKey: 'doctor.bloodPressure', sub: 'BP', value: visit.vitals.bp, Icon: Heart },
                        { labelKey: 'doctor.temperature', sub: '°F', value: visit.vitals.temperature, Icon: Thermometer },
                        { labelKey: 'doctor.spo2', sub: '%', value: visit.vitals.spo2, Icon: Activity },
                      ].map(({ labelKey, sub, value, Icon }) => (
                        <div key={labelKey} className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                          <Icon className="h-5 w-5 mx-auto text-primary-600 mb-1" aria-hidden />
                          <p className="text-lg font-bold text-gray-900">{value || '—'}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t(labelKey)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{t('doctor.symptomsToday')}</p>
                    <p className="text-sm text-gray-800">{visit?.symptoms || '—'}</p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">{t('doctor.consultationNotes')}</h3>

                    {speechSupported ? (
                      <div className="space-y-3 flex flex-col items-center">
                        <button
                          type="button"
                          onClick={recording ? stopRecording : startRecording}
                          className={`flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-primary-300 ${
                            recording ? 'bg-gray-700 animate-pulse' : 'bg-primary-600 hover:bg-primary-700'
                          }`}
                          aria-pressed={recording}
                        >
                          <Mic className="h-9 w-9" strokeWidth={2} aria-hidden />
                        </button>
                        <p className="text-xs font-medium text-gray-600">
                          {recording ? t('doctor.stopRecording') : t('doctor.startRecording')}
                        </p>
                        {speechInsecureHint && (
                          <p className="text-[11px] text-amber-700 text-center max-w-sm">{t('doctor.speechHttps')}</p>
                        )}
                        {speechError && (
                          <p className="text-[11px] text-red-600 text-center max-w-sm">{speechError}</p>
                        )}
                        <textarea
                          readOnly
                          value={transcript}
                          placeholder={t('doctor.transcriptPlaceholder')}
                          rows={5}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 resize-none min-h-[100px]"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder={t('doctor.typeNotesPlaceholder')}
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
                      />
                    )}

                    <button
                      type="button"
                      onClick={handleGenerateSOAP}
                      disabled={soapLoading || !transcript.trim()}
                      className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {soapLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          {t('doctor.generatingSoap')}
                        </span>
                      ) : (
                        t('doctor.generateSoap')
                      )}
                    </button>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      <Trans i18nKey="doctor.generateSoapHint" components={{ strong: <strong /> }} />
                    </p>

                    {soapError && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" aria-hidden />
                        <span>{soapError}</span>
                      </div>
                    )}
                  </div>

                  {/* SOAP Note */}
                  {soapNote && (
                    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900">{t('doctor.soapNote')}</h3>

                      {['subjective', 'objective', 'assessment', 'plan'].map((key) => (
                        <div key={key}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t(`doctor.${key}`)}</p>
                          <p className="text-sm text-gray-800">{soapNote[key] || '—'}</p>
                        </div>
                      ))}

                      {medList.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t('doctor.prescription')}</p>
                          <div className="flex flex-wrap gap-2">
                            {medList.map((med, i) => (
                              <span
                                key={i}
                                className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-800 border border-primary-100"
                              >
                                {typeof med === 'string' ? med : med?.name || String(med)}
                              </span>
                            ))}
                          </div>
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
                                ? t('doctor.rxLooksCorrect')
                                : soapReady
                                  ? t('doctor.rxWrongDetected')
                                  : t('doctor.rxSoapNotGenerated')}
                            </p>
                            {prescriptionValidation.message && (
                              <p className="text-xs mt-0.5 opacity-90">{prescriptionValidation.message}</p>
                            )}
                            {!prescriptionValidation.isCorrect && prescriptionValidation.suggestedMedicines?.length > 0 && (
                              <p className="text-xs mt-1 font-semibold">
                                {t('doctor.suggested')} {prescriptionValidation.suggestedMedicines.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Health Tips */}
                      {healthTips.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <p className="text-xs font-semibold text-blue-600 uppercase mb-1">
                            💡 {t('doctor.healthTipsTitle')}
                          </p>
                          <ul className="space-y-1">
                            {healthTips.map((tip, i) => (
                              <li key={i} className="text-sm text-blue-700 flex items-start gap-1">
                                <span className="shrink-0">{i + 1}.</span> {tipToString(tip)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Approve — SOAP filled + medicines + AI validation must pass */}
                      {!soapReady && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          {t('doctor.soapMustFill')}
                        </p>
                      )}
                      {soapReady && medList.length === 0 && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                          {t('doctor.addMedsHint')}
                        </p>
                      )}
                      {soapReady && medList.length > 0 && prescriptionValidation && !prescriptionValidation.isCorrect && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                          {t('doctor.aiFlaggedHint')}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={confirmLoading || !canApprove}
                        className={`w-full py-3 rounded-lg text-sm font-bold transition mt-1 flex items-center justify-center gap-2 ${
                          canApprove && !confirmLoading
                            ? 'bg-medical-green text-white hover:opacity-95 shadow-sm'
                            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {confirmLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            {t('doctor.confirmSending')}
                          </span>
                        ) : canApprove ? (
                          t('doctor.confirmSend')
                        ) : (
                          t('doctor.confirmLocked')
                        )}
                      </button>
                      {!canApprove && !confirmLoading && (
                        <p className="text-[11px] text-gray-500 text-center mt-1">
                          <Trans i18nKey="doctor.confirmHint" components={{ strong: <strong /> }} />
                        </p>
                      )}

                      {confirmStatus && (
                        <p
                          className={`text-xs text-center ${
                            confirmOutcome === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {confirmStatus}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT — AI Decision Panel */}
          <div className="flex-[2.5] min-w-0 flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
              <Sparkles className="h-4 w-4 text-primary-600 shrink-0" aria-hidden />
              <h2 className="font-semibold text-gray-900 text-sm">{t('doctor.aiPanel')}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {!selectedAppt ? (
                <p className="text-center text-gray-400 text-xs pt-6">{t('doctor.selectForInsights')}</p>
              ) : (
                <>
                  {soapReady && prescriptionValidation && (
                    <div
                      className={`mb-4 rounded-xl border p-3 text-sm ${
                        prescriptionValidation.isCorrect
                          ? 'border-green-300 bg-green-50 text-green-900'
                          : 'border-red-300 bg-red-50 text-red-900'
                      }`}
                    >
                      <p className="font-bold text-xs uppercase tracking-wide mb-1">
                        {prescriptionValidation.isCorrect ? t('doctor.rxCheckOk') : t('doctor.rxCheckReview')}
                      </p>
                      {!prescriptionValidation.isCorrect && (
                        <>
                          <p className="font-semibold">{t('doctor.possibleMedIssue')}</p>
                          {prescriptionValidation.message && (
                            <p className="text-xs mt-1.5 leading-relaxed">{prescriptionValidation.message}</p>
                          )}
                          {prescriptionValidation.suggestedMedicines?.length > 0 && (
                            <p className="text-xs mt-2 font-medium">
                              {t('doctor.suggestedAlternatives')} {prescriptionValidation.suggestedMedicines.join(', ')}
                            </p>
                          )}
                        </>
                      )}
                      {prescriptionValidation.isCorrect && (
                        <p className="text-xs mt-0.5">{t('doctor.aiCrosscheckOk')}</p>
                      )}
                    </div>
                  )}

                  {panelLoading ? (
                    <div className="flex flex-col items-center pt-6 gap-3">
                      <Loader2 className="h-6 w-6 text-primary-600 animate-spin" aria-hidden />
                      <p className="text-xs text-gray-500">{t('doctor.generatingInsights')}</p>
                    </div>
                  ) : panelError ? (
                    <div className="flex flex-col items-center pt-4 gap-3 px-2">
                      <p className="text-xs text-red-600 text-center">{panelError}</p>
                      <button
                        type="button"
                        onClick={() => visit?.id && triggerPanel(visit.id, transcript)}
                        className="rounded-lg border border-primary-600 bg-white px-4 py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition"
                      >
                        {t('doctor.retry')}
                      </button>
                    </div>
                  ) : decisionPanel.length === 0 ? (
                    <div className="flex flex-col items-center pt-4 gap-3 px-2">
                      <p className="text-xs text-gray-400 text-center">{t('doctor.noInsightsYet')}</p>
                      <button
                        type="button"
                        onClick={() => visit?.id && triggerPanel(visit.id, transcript)}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 transition"
                      >
                        {t('doctor.generateInsights')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {decisionPanel.slice(0, 3).map((insight, i) => {
                        const cfg = [
                          { Icon: AlertTriangle, bar: 'border-l-4 border-amber-400', bg: 'bg-amber-50/90' },
                          { Icon: BarChart3, bar: 'border-l-4 border-blue-500', bg: 'bg-blue-50/90' },
                          { Icon: Shield, bar: 'border-l-4 border-red-500', bg: 'bg-red-50/90' },
                        ][i];
                        const Icon = cfg.Icon;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg border border-gray-100 pl-3 pr-3 py-2.5 ${cfg.bar} ${cfg.bg}`}
                          >
                            <div className="flex gap-2">
                              <Icon className="h-4 w-4 shrink-0 text-gray-700 mt-0.5" aria-hidden />
                              <p className="text-xs text-gray-800 leading-snug">{insightToString(insight)}</p>
                            </div>
                          </div>
                        );
                      })}
                      {decisionPanel.length > 3 && (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">{t('doctor.more')}</p>
                          {decisionPanel.slice(3).map((insight, i) => (
                            <div key={`extra-${i}`} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                              {insightToString(insight)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
