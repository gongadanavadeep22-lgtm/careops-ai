import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function PaymentSuccess() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f8] px-4 py-10">
      <div className="mb-6 w-full max-w-md">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-gray-600">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2} aria-hidden />
          <span className="text-xs font-semibold tracking-wide text-gray-600">CareOps AI</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('paymentSuccess.title')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('paymentSuccess.subtitle')}</p>
        </div>

        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <p className="text-sm font-medium text-green-800">{t('paymentSuccess.thankYou')}</p>
        </div>
      </div>
    </div>
  );
}
