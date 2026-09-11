import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { getFirestoreDb } from '../firebase/config';
import client from '../api/client';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { buildPharmacyPickupWhatsAppMessage } from '../utils/prescriptionWhatsApp';

function structuredMedicinesToFlat(medicines) {
  if (!Array.isArray(medicines)) return [];
  return medicines
    .map((m) => {
      if (typeof m === 'string') return m.trim();
      if (!m || typeof m !== 'object') return '';
      const parts = [
        m.name,
        m.recommendedDosage || m.dosage || m.strength,
        m.frequency,
        m.usualDuration || m.duration,
      ].filter(Boolean);
      return parts.join(' — ').trim() || String(m.name || '').trim();
    })
    .filter(Boolean);
}

/** Prescribed lines: prescription array, then selectedMedicines, else SOAP plan. */
function medicinesForVisit(visit) {
  const rx = visit?.prescription;
  if (Array.isArray(rx) && rx.length > 0) {
    return rx.map((m) => (typeof m === 'string' ? m : m?.name || String(m))).filter(Boolean);
  }
  const selected = visit?.selectedMedicines;
  if (Array.isArray(selected) && selected.length > 0) {
    return structuredMedicinesToFlat(selected);
  }
  const plan = visit?.soapNote?.plan;
  if (plan && String(plan).trim()) {
    return [String(plan).trim()];
  }
  return [];
}

function diseasesForVisit(visit) {
  const raw = visit?.selectedDiseases;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (typeof d === 'string') return { id: d, name: d };
      if (!d || typeof d !== 'object') return null;
      const id = String(d.id || d.name || '').trim();
      const name = String(d.name || d.id || '').trim();
      if (!id && !name) return null;
      return { id: id || name, name: name || id };
    })
    .filter(Boolean);
}

function prescriptionLetterForVisit(visit) {
  const letter = visit?.prescriptionLetter;
  return letter && String(letter).trim() ? String(letter).trim() : '';
}

/** True when medicines list would come only from SOAP plan (no structured rx). */
function medicinesFromSoapOnly(visit) {
  const rx = visit?.prescription;
  if (Array.isArray(rx) && rx.length > 0) return false;
  const selected = visit?.selectedMedicines;
  if (Array.isArray(selected) && selected.length > 0) return false;
  const plan = visit?.soapNote?.plan;
  return Boolean(plan && String(plan).trim());
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = dateStr?.toDate ? dateStr.toDate() : new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Phone stored on visit at check-in or loaded from patient profile in UI */
function phoneOnVisit(visit) {
  const p = visit?.patientPhone;
  if (p != null && String(p).trim()) return String(p).trim();
  return '';
}

/** Numeric total from visit if present (hide badge / row when null). */
function amountForVisit(visit) {
  if (!visit) return null;
  const raw = visit.totalAmount ?? visit.total ?? visit.amountTotal ?? visit.amount;
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return raw;
  const n = parseFloat(String(raw).replace(/[^\d.]/g, ''));
  if (Number.isNaN(n)) return null;
  return n;
}

function formatAmountInr(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

/** E.164-style digits for wa.me (India demo): 91 + 10-digit mobile, no + or spaces. */
function phoneDigitsForWaMe(phoneRaw) {
  const d = String(phoneRaw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return `91${d}`;
  if (d.startsWith('91') && d.length >= 12) return d.slice(0, 12);
  if (d.startsWith('91')) return d;
  return d;
}

function openWhatsAppWaMePrefilled(phoneDigits, text) {
  if (!phoneDigits) return;
  const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Queue card / quick demo: uses phone on the visit row only (not patient profile). */
function openWaMeFromVisit(visit) {
  const digits = phoneDigitsForWaMe(phoneOnVisit(visit));
  if (!digits) return;
  const billN = amountForVisit(visit) ?? 1000;
  const msg = buildPharmacyPickupWhatsAppMessage({
    patientName: visit.patientName,
    visit,
    billLabel: formatAmountInr(billN),
  });
  openWhatsAppWaMePrefilled(digits, msg);
}

export default function PharmacyDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const clinicId = user?.clinicId || 'clinic-001';
  const db = getFirestoreDb();

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
  /** 'success' | 'warning' — warning when marked ready but WhatsApp did not send */
  const [readyTone, setReadyTone] = useState('success');
  const [readyError, setReadyError] = useState('');
  const [lastPayUrl, setLastPayUrl] = useState('');

  // ── ACTIVE PRESCRIPTIONS (confirmed) via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'visits'),
      where('clinicId', '==', clinicId),
      where('prescriptionStatus', '==', 'confirmed'),
      limit(100)
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
  }, [clinicId]);

  // ── COMPLETED PRESCRIPTIONS (dispensed) via onSnapshot ──
  useEffect(() => {
    const q = query(
      collection(db, 'visits'),
      where('clinicId', '==', clinicId),
      where('prescriptionStatus', '==', 'dispensed'),
      limit(100)
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
  }, [clinicId]);

  async function handleSelectVisit(visit) {
    setSelectedVisit(visit);
    setPatientPhone(visit.patientPhone ? String(visit.patientPhone) : '');
    setReadyStatus('');
    setReadyTone('success');
    setReadyError('');
    setLastPayUrl('');
    setPhoneLoading(true);

    if (visit.patientId) {
      try {
        const { data } = await client.get(`/api/patients/by-id?patientId=${visit.patientId}`);
        const fromProfile = String(data.patient?.phone || '').trim();
        const fromVisit = phoneOnVisit(visit);
        setPatientPhone(fromProfile || fromVisit);
      } catch {
        setPatientPhone(phoneOnVisit(visit));
      }
    } else {
      setPatientPhone(phoneOnVisit(visit));
    }
    setPhoneLoading(false);
  }

  function openWaMeFromDetailPanel() {
    if (!selectedVisit) return;
    const digits = phoneDigitsForWaMe(patientPhone);
    if (!digits) return;
    const billN = amountForVisit(selectedVisit) ?? 1000;
    const appUrl = String(import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(
      /\/$/,
      ''
    );
    const msg = buildPharmacyPickupWhatsAppMessage({
      patientName: selectedVisit.patientName,
      visit: selectedVisit,
      billLabel: formatAmountInr(billN),
      payUrl: `${appUrl}/payment-success?amount=${billN}`,
    });
    openWhatsAppWaMePrefilled(digits, msg);
  }

  async function handleMarkReady() {
    if (!selectedVisit) return;
    setReadyLoading(true);
    setReadyStatus('');
    setReadyTone('success');
    setReadyError('');
    setLastPayUrl('');

    try {
      const { data } = await client.post('/api/pharmacy/ready', { visitId: selectedVisit.id });
      if (data.payUrl) setLastPayUrl(String(data.payUrl));
      const sent =
        data.whatsappSent === true ||
        (data.whatsappSent == null && !data.warning);

      if (sent && !data.warning) {
        setReadyTone('success');
        setReadyStatus(t('pharmacy.readyOk'));
      } else if (sent && data.warning) {
        setReadyTone('success');
        setReadyStatus(t('pharmacy.readyWithWarning', { warning: data.warning }));
      } else {
        setReadyTone('warning');
        const twilioMsg = data.twilioError?.message;
        setReadyStatus(
          twilioMsg
            ? `${data.warning || t('pharmacy.readyWarnTwilio')} (${twilioMsg})`
            : data.warning || t('pharmacy.readyWarnTwilio')
        );
      }

      const waDigits = phoneDigitsForWaMe(patientPhone);
      if (waDigits && !sent) {
        const billN =
          data.totalAmount != null && !Number.isNaN(Number(data.totalAmount))
            ? Number(data.totalAmount)
            : amountForVisit(selectedVisit) ?? 1000;
        const msg = buildPharmacyPickupWhatsAppMessage({
          patientName: selectedVisit.patientName,
          visit: selectedVisit,
          billLabel: formatAmountInr(billN),
        });
        openWhatsAppWaMePrefilled(waDigits, msg);
      }

      setTimeout(() => setSelectedVisit(null), 3000);
    } catch (err) {
      setReadyError(err.response?.data?.error || t('pharmacy.markReadyError'));
    } finally {
      setReadyLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('pharmacy.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('pharmacy.subtitle')}</p>
        </div>

        {/* ── SECTION 1 — ACTIVE PRESCRIPTIONS ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            {t('pharmacy.pending')}
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
              <p className="text-gray-400 text-sm">{t('pharmacy.noPending')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map((visit) => {
                const visitAmount = amountForVisit(visit);
                const visitDiseases = diseasesForVisit(visit);
                const visitLetter = prescriptionLetterForVisit(visit);
                const visitMeds = medicinesForVisit(visit);
                const hideSoapMeds = visitLetter && medicinesFromSoapOnly(visit);
                const showMeds = visitMeds.length > 0 && !hideSoapMeds;
                return (
                <div key={visit.id}>
                  <div
                    className={`flex overflow-hidden rounded-xl border-l-4 border-blue-500 bg-white shadow-sm transition hover:shadow-md ${selectedVisit?.id === visit.id ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectVisit(visit)}
                      className="min-w-0 flex-1 p-5 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-800">{visit.patientName}</h3>
                            <span className="text-xs text-gray-400">
                              {t('pharmacy.confirmed')} {timeAgo(visit.createdAt)}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              {t('pharmacy.medicinesCount', { count: visitMeds.length })}
                            </span>
                          </div>
                          {visitDiseases.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {visitDiseases.map((d) => (
                                <span
                                  key={d.id}
                                  className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-600 mt-1">
                            <span className="font-medium text-gray-700">{t('pharmacy.phoneLabel')}</span>{' '}
                            {phoneOnVisit(visit) ? (
                              <span className="text-gray-800">{phoneOnVisit(visit)}</span>
                            ) : (
                              <span className="text-amber-700">{t('pharmacy.phoneMissing')}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{t('pharmacy.rowHint')}</p>
                        </div>
                        <span className="text-blue-500 text-sm font-medium shrink-0">{t('pharmacy.view')}</span>
                      </div>
                    </button>
                    <div className="flex w-[5.5rem] shrink-0 flex-col justify-center gap-1 border-l border-gray-100 bg-slate-50 px-2 py-3">
                      <button
                        type="button"
                        title={
                          phoneDigitsForWaMe(phoneOnVisit(visit))
                            ? t('pharmacy.whatsappTitle')
                            : t('pharmacy.whatsappDisabledTitle')
                        }
                        disabled={!phoneDigitsForWaMe(phoneOnVisit(visit))}
                        onClick={() => openWaMeFromVisit(visit)}
                        className="rounded-lg bg-[#25D366] px-2 py-2 text-center text-[11px] font-bold leading-tight text-white shadow-sm transition hover:bg-[#20bd5a] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {t('pharmacy.whatsapp')}
                      </button>
                    </div>
                  </div>

                  {/* Detail Panel — shown when this card is selected */}
                  {selectedVisit?.id === visit.id && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mt-2 border border-blue-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-800">{t('pharmacy.detailsTitle')}</h3>
                        <button onClick={() => setSelectedVisit(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                          {t('pharmacy.close')}
                        </button>
                      </div>

                      {/* Patient Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium uppercase">{t('pharmacy.patientName')}</p>
                          <p className="text-sm font-bold text-gray-800 mt-1">{visit.patientName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 font-medium uppercase">{t('pharmacy.phoneWhatsapp')}</p>
                          {phoneLoading ? (
                            <p className="text-sm text-gray-400 mt-1">{t('pharmacy.loadingPhone')}</p>
                          ) : (
                            <p className="text-sm font-bold text-gray-800 mt-1">
                              {patientPhone || t('pharmacy.phoneNotAvailable')}
                            </p>
                          )}
                          {!phoneLoading && !patientPhone && (
                            <p className="text-xs text-amber-700 mt-2">{t('pharmacy.phoneHelpProfile')}</p>
                          )}
                        </div>
                      </div>

                      {/* Diagnoses */}
                      {visitDiseases.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase mb-2">{t('pharmacy.diseases')}</p>
                          <div className="flex flex-wrap gap-2">
                            {visitDiseases.map((d) => (
                              <span
                                key={d.id}
                                className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
                              >
                                {d.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prescription letter (primary) */}
                      {visitLetter && (
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase mb-2">{t('pharmacy.prescriptionLetter')}</p>
                          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-gray-800 font-sans">
                            {visitLetter}
                          </pre>
                        </div>
                      )}

                      {/* Medicines — de-emphasized when prescription letter is present */}
                      {showMeds && (
                        <div className={visitLetter ? 'opacity-75' : ''}>
                          <p
                            className={`text-xs font-medium uppercase mb-2 ${visitLetter ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            {t('pharmacy.prescribedMeds')}
                          </p>
                          <ul className="space-y-2">
                            {visitMeds.map((med, i) => (
                              <li
                                key={i}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                                  visitLetter ? 'bg-gray-50' : 'bg-blue-50'
                                }`}
                              >
                                <span className={`font-bold ${visitLetter ? 'text-gray-400' : 'text-blue-500'}`}>
                                  {i + 1}.
                                </span>
                                <span className={`text-sm font-medium ${visitLetter ? 'text-gray-600' : 'text-gray-800'}`}>
                                  {med}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!visitLetter && !showMeds && (
                        <p className="text-sm text-gray-400">{t('pharmacy.noMeds')}</p>
                      )}

                      {/* Total Amount — only when visit has an amount */}
                      {visitAmount != null && (
                        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                          <span className="text-sm font-semibold text-gray-700">{t('pharmacy.totalAmount')}</span>
                          <span className="text-xl font-bold text-green-700">{formatAmountInr(visitAmount)}</span>
                        </div>
                      )}

                      {/* Mark as Ready */}
                      {!readyStatus && (
                        <div className="space-y-2">
                        <button
                          type="button"
                          onClick={openWaMeFromDetailPanel}
                          disabled={phoneLoading || !phoneDigitsForWaMe(patientPhone)}
                          title={t('pharmacy.openWaTitle')}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-white py-2.5 text-sm font-bold text-[#128C7E] shadow-sm transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                        >
                          {t('pharmacy.openWa')}
                        </button>
                        <button
                          type="button"
                          onClick={handleMarkReady}
                          disabled={readyLoading || (!phoneLoading && !patientPhone)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {readyLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {t('pharmacy.sending')}
                            </>
                          ) : !patientPhone && !phoneLoading ? (
                            t('pharmacy.addPhoneFirst')
                          ) : (
                            t('pharmacy.markReady')
                          )}
                        </button>
                        </div>
                      )}

                      {readyStatus && (
                        <p
                          className={
                            readyTone === 'warning'
                              ? 'text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-left font-medium'
                              : 'text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 text-center font-medium'
                          }
                        >
                          {readyTone === 'warning' ? '⚠️ ' : '✅ '}
                          {readyStatus}
                        </p>
                      )}
                      {lastPayUrl && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-left">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                            {t('pharmacy.payLinkLabel')}
                          </p>
                          <a
                            href={lastPayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-sm font-medium text-blue-700 underline"
                          >
                            {lastPayUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(lastPayUrl)}
                            className="mt-2 text-xs font-semibold text-blue-700 hover:underline"
                          >
                            {t('pharmacy.copyPayLink')}
                          </button>
                        </div>
                      )}
                      {readyError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                          {readyError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 2 — COMPLETED PRESCRIPTIONS ── */}
        <section>
          <h2 className="text-lg font-semibold text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
            {t('pharmacy.completed')}
            {completed.length > 0 && (
              <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium">
                {completed.length}
              </span>
            )}
          </h2>

          {completedLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" strokeWidth={2} aria-hidden />
            </div>
          ) : completed.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <p className="text-gray-300 text-sm">{t('pharmacy.noCompleted')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map((visit) => {
                const visitAmount = amountForVisit(visit);
                const visitDiseases = diseasesForVisit(visit);
                const visitLetter = prescriptionLetterForVisit(visit);
                const visitMeds = medicinesForVisit(visit);
                const hideSoapMeds = visitLetter && medicinesFromSoapOnly(visit);
                const showMeds = visitMeds.length > 0 && !hideSoapMeds;
                return (
                <div
                  key={visit.id}
                  className="rounded-xl border border-gray-200 border-l-4 border-l-gray-400 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-600">{visit.patientName}</h3>
                        {phoneOnVisit(visit) && (
                          <span className="text-xs text-gray-500">📱 {phoneOnVisit(visit)}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {t('pharmacy.dispensed')} {timeAgo(visit.dispensedAt)}
                        </span>
                        <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          {t('pharmacy.dispensed')}
                        </span>
                      </div>
                      {visitDiseases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {visitDiseases.map((d) => (
                            <span
                              key={d.id}
                              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600"
                            >
                              {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {visitLetter && (
                        <p className="mt-1 line-clamp-2 text-xs text-gray-500 whitespace-pre-wrap">{visitLetter}</p>
                      )}
                      {showMeds && (
                        <ul className="mt-1 space-y-0.5">
                          {visitMeds.map((med, i) => (
                            <li key={i} className="flex items-start gap-1 text-xs text-gray-500">
                              <span className="text-gray-400">•</span> {med}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {visitAmount != null && (
                      <span className="shrink-0 text-sm font-semibold text-gray-700">
                        {formatAmountInr(visitAmount)}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
