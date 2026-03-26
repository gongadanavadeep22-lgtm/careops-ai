import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';
import client from '../api/client';

export default function EmergencyBanner() {
  const [emergency, setEmergency] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_FIREBASE_DATABASE_URL) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[CareOps] VITE_FIREBASE_DATABASE_URL is unset; emergency banner disabled.');
      }
      return undefined;
    }

    const emergenciesRef = ref(rtdb, 'emergencies');
    const unsubscribe = onValue(
      emergenciesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setEmergency(null);
          return;
        }

        const active = Object.entries(data)
          .filter(([, val]) => val.active === true)
          .sort((a, b) => b[1].timestamp - a[1].timestamp);

        if (active.length > 0) {
          const [key, val] = active[0];
          setEmergency({ key, ...val });
        } else {
          setEmergency(null);
        }
      },
      (err) => {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn('[CareOps] Realtime DB emergencies listener:', err?.message || err);
        }
        setEmergency(null);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleDismiss() {
    if (!emergency) return;
    setDismissing(true);
    try {
      await client.patch('/api/emergency/dismiss', { emergencyKey: emergency.key });
      setEmergency(null);
    } catch {
      setEmergency(null);
    } finally {
      setDismissing(false);
    }
  }

  if (!emergency) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-red-700/95 px-4 py-8 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-banner-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white p-8 text-center shadow-2xl ring-1 ring-black/5">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-4xl" aria-hidden>
          🚨
        </div>
        <h1 id="emergency-banner-title" className="text-sm font-bold uppercase tracking-[0.15em] text-red-600">
          EMERGENCY ALERT
        </h1>
        <p className="mt-3 text-2xl font-bold text-gray-900">{emergency.patientName}</p>
        <p className="mt-3 text-base leading-relaxed text-gray-700">{emergency.symptoms}</p>
        <p className="mt-5 text-sm font-medium text-gray-500">Please attend immediately</p>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          className="mt-8 w-full rounded-xl bg-red-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {dismissing ? 'Updating…' : 'Attending Now'}
        </button>
      </div>
    </div>
  );
}
