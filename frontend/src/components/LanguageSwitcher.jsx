import { useTranslation } from 'react-i18next';

const OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
];

export default function LanguageSwitcher({ className = '' }) {
  const { t, i18n } = useTranslation();
  const base = (i18n.language || 'en').split('-')[0];
  const value = OPTIONS.some((o) => o.code === base) ? base : 'en';

  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-gray-500">{t('nav.language')}</span>
      <select
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        aria-label={t('nav.language')}
      >
        {OPTIONS.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
