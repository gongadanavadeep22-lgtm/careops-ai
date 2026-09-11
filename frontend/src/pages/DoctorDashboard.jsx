import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, limit, doc } from 'firebase/firestore';
import { getFirestoreDb } from '../firebase/config';
import client from '../api/client';
import Layout from '../components/Layout';
import EmergencyBanner from '../components/EmergencyBanner';
import { useAuth } from '../hooks/useAuth';
import {
  Loader2,
  Stethoscope,
  AlertCircle,
  Heart,
  Thermometer,
  Activity,
  Plus,
  Trash2,
} from 'lucide-react';

const URGENCY_ORDER = { EMERGENCY: 0, PRIORITY: 1, GENERAL: 2 };

const EMPTY_MEDICINE = {
  name: '',
  recommendedDosage: '',
  frequency: '',
  usualDuration: '',
  notes: '',
};

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

function urgencyLabel(urgency, t) {
  const u = String(urgency || 'GENERAL').toUpperCase();
  if (u === 'EMERGENCY') return t('doctor.urgencyEmergency');
  if (u === 'PRIORITY') return t('doctor.urgencyPriority');
  return t('doctor.urgencyGeneral');
}

function mergeMedicinesClient(catalog, diseaseIds) {
  if (!Array.isArray(diseaseIds) || !Array.isArray(catalog)) return [];
  const seen = new Map();
  for (const id of diseaseIds) {
    const disease = catalog.find((d) => d.id === id);
    if (!disease) continue;
    for (const medicine of disease.medicines || []) {
      const key = String(medicine.name || '').toLowerCase();
      if (key && !seen.has(key)) {
        seen.set(key, { ...medicine });
      }
    }
  }
  return Array.from(seen.values());
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
  const { t } = useTranslation();
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
  const [pastVisits, setPastVisits] = useState([]);

  const [diseases, setDiseases] = useState([]);
  const [diseasesLoading, setDiseasesLoading] = useState(true);
  const [diseasesError, setDiseasesError] = useState('');
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [selectedDiseaseIds, setSelectedDiseaseIds] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);

  const [prescriptionLetter, setPrescriptionLetter] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const [sendWhatsAppToPatient, setSendWhatsAppToPatient] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState('');
  const [confirmOutcome, setConfirmOutcome] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setDiseasesLoading(true);
    setDiseasesError('');
    client
      .get('/api/diseases')
      .then(({ data }) => {
        if (cancelled) return;
        setDiseases(Array.isArray(data.diseases) ? data.diseases : data || []);
      })
      .catch(() => {
        if (!cancelled) setDiseasesError(t('doctor.diseasesLoadFailed'));
      })
      .finally(() => {
        if (!cancelled) setDiseasesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
  }, [clinicId, db]);

  useEffect(() => {
    if (!visit?.id) return undefined;
    const unsub = onSnapshot(doc(db, 'visits', visit.id), (snap) => {
      if (!snap.exists()) return;
      const vitals = snap.data().vitals || {};
      setVisit((prev) => (prev && prev.id === snap.id ? { ...prev, vitals } : prev));
    });
    return () => unsub();
  }, [visit?.id, db]);

  const mergeMedicines = useCallback(
    async (diseaseIds) => {
      if (!diseaseIds.length) {
        setMedicines([]);
        return;
      }
      setMedicinesLoading(true);
      try {
        const { data } = await client.post('/api/diseases/merge-medicines', {
          diseaseIds,
        });
        const merged = Array.isArray(data.medicines) ? data.medicines : data;
        setMedicines(merged.length ? merged : mergeMedicinesClient(diseases, diseaseIds));
      } catch {
        setMedicines(mergeMedicinesClient(diseases, diseaseIds));
      } finally {
        setMedicinesLoading(false);
      }
    },
    [diseases]
  );

  function resetPrescriptionState() {
    setSelectedDiseaseIds([]);
    setMedicines([]);
    setPrescriptionLetter('');
    setDiseaseSearch('');
    setGenerateError('');
    setSendWhatsAppToPatient(false);
    setConfirmStatus('');
    setConfirmOutcome(null);
  }

  async function handleSelectPatient(appt) {
    setSelectedAppt(appt);
    setVisit(null);
    setPatient(null);
    resetPrescriptionState();
    setCaseError('');
    setPastVisits([]);
    setCaseLoading(true);

    try {
      const visitRes = await client.get(`/api/visits/by-appointment?appointmentId=${appt.id}`);
      const loadedVisit = visitRes.data.visit;
      setVisit(loadedVisit);

      const restoredDiseases = Array.isArray(loadedVisit.selectedDiseases)
        ? loadedVisit.selectedDiseases
        : [];
      if (restoredDiseases.length > 0) {
        setSelectedDiseaseIds(restoredDiseases);
      }

      if (String(loadedVisit.prescriptionLetter || '').trim()) {
        setPrescriptionLetter(String(loadedVisit.prescriptionLetter).trim());
      }

      if (Array.isArray(loadedVisit.selectedMedicines) && loadedVisit.selectedMedicines.length > 0) {
        setMedicines(loadedVisit.selectedMedicines);
      } else if (restoredDiseases.length > 0) {
        await mergeMedicines(restoredDiseases);
      }

      if (appt.patientId) {
        const patientPromise = client
          .get(`/api/patients/by-id?patientId=${appt.patientId}`)
          .then((patientRes) => {
            setPatient(patientRes.data.patient);
          })
          .catch(() => {
            setPatient(null);
          });

        const historyPromise = client
          .get('/api/visits/history', {
            params: { patientId: appt.patientId, excludeVisitId: loadedVisit.id },
          })
          .then((hist) => {
            setPastVisits(hist.data.visits || []);
          })
          .catch(() => {
            setPastVisits([]);
          });

        await Promise.all([patientPromise, historyPromise]);
      }
    } catch {
      setCaseError(t('doctor.loadCaseError'));
    } finally {
      setCaseLoading(false);
    }
  }

  async function handleToggleDisease(diseaseId) {
    const next = selectedDiseaseIds.includes(diseaseId)
      ? selectedDiseaseIds.filter((id) => id !== diseaseId)
      : [...selectedDiseaseIds, diseaseId];
    setSelectedDiseaseIds(next);
    setGenerateError('');
    setConfirmStatus('');
    setConfirmOutcome(null);
    await mergeMedicines(next);
  }

  function updateMedicine(index, field, value) {
    setMedicines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function addMedicineRow() {
    setMedicines((prev) => [...prev, { ...EMPTY_MEDICINE }]);
  }

  function removeMedicineRow(index) {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  }

  const canGenerate =
    visit?.id && selectedDiseaseIds.length > 0 && medicines.some((m) => String(m.name || '').trim());
  const canConfirm = Boolean(visit?.id && String(prescriptionLetter || '').trim());

  async function handleGeneratePrescription() {
    if (!canGenerate) return;
    setGenerateLoading(true);
    setGenerateError('');
    setConfirmStatus('');
    setConfirmOutcome(null);
    try {
      const { data } = await client.post('/api/prescription/generate', {
        visitId: visit.id,
        selectedDiseases: selectedDiseaseIds,
        selectedMedicines: medicines.filter((m) => String(m.name || '').trim()),
      });
      setPrescriptionLetter(data.prescriptionLetter || '');
    } catch {
      setGenerateError(t('doctor.generatePrescriptionFailed'));
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleConfirm() {
    if (!visit?.id) return;
    if (!canConfirm) {
      setConfirmOutcome('error');
      setConfirmStatus(t('doctor.confirmPrescriptionPrereq'));
      return;
    }
    setConfirmLoading(true);
    setConfirmStatus('');
    setConfirmOutcome(null);
    try {
      await client.post('/api/prescription/confirm', {
        visitId: visit.id,
        sendWhatsAppToPatient,
        prescriptionLetter: prescriptionLetter.trim(),
        selectedDiseases: selectedDiseaseIds,
        selectedMedicines: medicines.filter((m) => String(m.name || '').trim()),
      });
      setConfirmOutcome('success');
      setConfirmStatus(t('doctor.confirmSuccess'));
      setSelectedAppt(null);
      setVisit(null);
      setPatient(null);
      resetPrescriptionState();
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

  const filteredDiseases = diseases.filter((d) => {
    if (!diseaseSearch.trim()) return true;
    const q = diseaseSearch.trim().toLowerCase();
    return (
      String(d.name || '').toLowerCase().includes(q) ||
      String(d.id || '').toLowerCase().includes(q)
    );
  });

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
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{appt.symptoms}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — Patient case + prescription flow */}
          <div className="flex-[7] min-w-0 flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
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
                        { labelKey: 'doctor.bloodPressure', value: visit.vitals.bp, Icon: Heart },
                        { labelKey: 'doctor.temperature', value: visit.vitals.temperature, Icon: Thermometer },
                        { labelKey: 'doctor.spo2', value: visit.vitals.spo2, Icon: Activity },
                      ].map(({ labelKey, value, Icon }) => (
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

                  {pastVisits.length > 0 && (
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Last visits</p>
                      <ul className="space-y-2">
                        {pastVisits.map((v) => (
                          <li key={v.id} className="text-xs text-gray-700 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                            <span className="font-medium text-gray-900">
                              {v.date ? new Date(v.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                            </span>
                            {v.urgency ? ` · ${v.urgency}` : ''}
                            {v.symptoms ? ` — ${v.symptoms}` : ''}
                            {v.assessment ? <span className="block text-gray-500 mt-0.5">{v.assessment}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disease picker + prescription flow */}
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900">{t('doctor.diseasePicker')}</h3>

                    {diseasesLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 text-primary-600 animate-spin" aria-hidden />
                      </div>
                    ) : diseasesError ? (
                      <p className="text-xs text-red-600">{diseasesError}</p>
                    ) : (
                      <>
                        <input
                          type="search"
                          value={diseaseSearch}
                          onChange={(e) => setDiseaseSearch(e.target.value)}
                          placeholder={t('doctor.diseaseSearch')}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
                          {filteredDiseases.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">{t('doctor.noDiseasesMatch')}</p>
                          ) : (
                            filteredDiseases.map((disease) => (
                              <label
                                key={disease.id}
                                className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDiseaseIds.includes(disease.id)}
                                  onChange={() => handleToggleDisease(disease.id)}
                                  className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-800">{disease.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}

                    {selectedDiseaseIds.length === 0 && (
                      <p className="text-xs text-gray-500">{t('doctor.selectDiseasesHint')}</p>
                    )}

                    {(medicines.length > 0 || medicinesLoading) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">{t('doctor.medicines')}</h4>
                          {medicinesLoading && (
                            <Loader2 className="h-4 w-4 text-primary-600 animate-spin" aria-hidden />
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-500">
                                <th className="py-2 pr-2 font-semibold">{t('doctor.medicineName')}</th>
                                <th className="py-2 pr-2 font-semibold">{t('doctor.recommendedDosage')}</th>
                                <th className="py-2 pr-2 font-semibold">{t('doctor.frequency')}</th>
                                <th className="py-2 pr-2 font-semibold">{t('doctor.usualDuration')}</th>
                                <th className="py-2 pr-2 font-semibold">{t('doctor.notes')}</th>
                                <th className="py-2 w-8" />
                              </tr>
                            </thead>
                            <tbody>
                              {medicines.map((med, index) => (
                                <tr key={index} className="border-b border-gray-50">
                                  {['name', 'recommendedDosage', 'frequency', 'usualDuration', 'notes'].map((field) => (
                                    <td key={field} className="py-1 pr-2">
                                      <input
                                        type="text"
                                        value={med[field] || ''}
                                        onChange={(e) => updateMedicine(index, field, e.target.value)}
                                        className="w-full min-w-[80px] rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500/30"
                                      />
                                    </td>
                                  ))}
                                  <td className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => removeMedicineRow(index)}
                                      className="p-1 text-red-500 hover:text-red-700"
                                      aria-label={t('doctor.removeMedicine')}
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button
                          type="button"
                          onClick={addMedicineRow}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          {t('doctor.addMedicine')}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleGeneratePrescription}
                      disabled={generateLoading || !canGenerate}
                      className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generateLoading ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          {t('doctor.generatingPrescription')}
                        </span>
                      ) : (
                        t('doctor.generatePrescription')
                      )}
                    </button>

                    {generateError && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" aria-hidden />
                        <span>{generateError}</span>
                      </div>
                    )}

                    {(prescriptionLetter || canGenerate) && (
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <label className="block text-sm font-semibold text-gray-900">
                          {t('doctor.prescriptionLetter')}
                        </label>
                        <textarea
                          value={prescriptionLetter}
                          onChange={(e) => setPrescriptionLetter(e.target.value)}
                          rows={10}
                          placeholder={t('doctor.prescriptionLetterPlaceholder')}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        />

                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sendWhatsAppToPatient}
                            onChange={(e) => setSendWhatsAppToPatient(e.target.checked)}
                            className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{t('doctor.sendWhatsAppToPatient')}</span>
                        </label>

                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={confirmLoading || !canConfirm}
                          className={`w-full py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                            canConfirm && !confirmLoading
                              ? 'bg-medical-green text-white hover:opacity-95 shadow-sm'
                              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          {confirmLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {t('doctor.confirmSending')}
                            </span>
                          ) : (
                            t('doctor.confirmSend')
                          )}
                        </button>

                        {!canConfirm && !confirmLoading && (
                          <p className="text-[11px] text-gray-500 text-center">{t('doctor.confirmPrescriptionHint')}</p>
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

                        <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
                          {t('doctor.medicationDisclaimer')}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
