import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Loader2, Pill } from 'lucide-react';
import client from '../api/client';
import LanguageSwitcher from '../components/LanguageSwitcher';

function formatInr(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

export default function Payment() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const visitId = searchParams.get('visitId') || '';
  const amountParam = searchParams.get('amount');

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [bill, setBill] = useState(null);

  useEffect(() => {
    if (!visitId) {
      setError(t('payment.missingVisit'));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    client
      .get('/api/pharmacy/bill', { params: { visitId } })
      .then(({ data }) => {
        if (cancelled) return;
        setBill(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || t('payment.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visitId, t]);

  const amount =
    bill?.totalAmount ??
    (amountParam && !Number.isNaN(Number(amountParam)) ? Number(amountParam) : null);

  const isDemo = bill?.paymentGateway === 'demo';

  async function handleDemoPay() {
    if (!visitId || amount == null) return;
    setPaying(true);
    setError('');
    try {
      await client.post('/api/pharmacy/pay', { visitId });
      navigate(
        `/payment-success?visitId=${encodeURIComponent(visitId)}&amount=${encodeURIComponent(amount)}`
      );
    } catch (err) {
      setError(err.response?.data?.error || t('payment.payFailed'));
    } finally {
      setPaying(false);
    }
  }

  function handleLiveUpiPay() {
    const upiUrl = bill?.upiPayUrl;
    if (!upiUrl) {
      setError(t('payment.upiNotConfigured'));
      return;
    }
    window.location.href = upiUrl;
  }

  async function handlePay() {
    if (isDemo) {
      await handleDemoPay();
    } else {
      handleLiveUpiPay();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#f0f4f8] px-4 py-8">
      <div className="mb-4 w-full max-w-md">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-wide text-blue-600">CareOps Hospital</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{t('payment.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isDemo ? t('payment.subtitleDemo') : t('payment.subtitleUpi')}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && bill && (
          <>
            <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">{t('payment.patient')}</p>
              <p className="font-semibold text-gray-900">{bill.patientName || t('payment.patientFallback')}</p>
            </div>

            <div className="mb-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Pill className="h-4 w-4 text-blue-600" />
                {t('payment.medicines')}
              </p>
              <ul className="space-y-2">
                {(bill.medicines || []).map((med, i) => (
                  <li
                    key={`${med.name}-${i}`}
                    className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-800"
                  >
                    {med.name}
                    {med.frequency ? ` — ${med.frequency}` : ''}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
              <span className="text-sm font-medium text-gray-700">{t('payment.total')}</span>
              <span className="text-2xl font-bold text-blue-700">
                {amount != null ? formatInr(amount) : '—'}
              </span>
            </div>

            {bill.paymentStatus === 'paid' ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-center">
                <p className="text-sm font-semibold text-green-800">{t('payment.alreadyPaid')}</p>
                <p className="mt-1 text-xs text-green-700">{t('payment.collectMedicines')}</p>
              </div>
            ) : (
              <button
                type="button"
                disabled={paying || amount == null || (!isDemo && !bill.upiPayUrl)}
                onClick={handlePay}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {paying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                {paying
                  ? t('payment.paying')
                  : isDemo
                    ? t('payment.payNowDemo', { amount: formatInr(amount || 0) })
                    : t('payment.payViaUpi', { amount: formatInr(amount || 0) })}
              </button>
            )}

            <p className="mt-4 text-center text-xs text-gray-400">
              {isDemo ? t('payment.demoNote') : t('payment.upiNote')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
