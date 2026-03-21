import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';
import client from '../api/client';

export default function EmergencyBanner() {
  const [emergency, setEmergency] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const emergenciesRef = ref(rtdb, 'emergencies');
    const unsubscribe = onValue(emergenciesRef, (snapshot) => {
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
    });

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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 text-white px-6">
      <div className="text-center max-w-xl">
        <div className="text-5xl mb-4">🚨</div>
        <h1 className="text-3xl font-bold mb-2">EMERGENCY ALERT</h1>
        <p className="text-xl font-semibold mb-1">{emergency.patientName}</p>
        <p className="text-lg mb-6 opacity-90">{emergency.symptoms}</p>
        <p className="text-base mb-8 opacity-80">Please attend immediately</p>
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="bg-white text-red-600 font-bold px-8 py-3 rounded-xl text-lg hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dismissing ? 'Updating…' : 'Attending Now'}
        </button>
      </div>
    </div>
  );
}
