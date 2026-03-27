import axios from 'axios';
import { getFirebaseAuth, isFirebaseConfigured } from '../firebase/config';

const raw = import.meta.env.VITE_API_URL;
const baseURL = typeof raw === 'string' ? raw.replace(/\/$/, '') : '';

if (import.meta.env.PROD && !baseURL) {
  // eslint-disable-next-line no-console
  console.error(
    '[CareOps] VITE_API_URL is missing. Set it in Vercel → Project → Settings → Environment Variables to your Railway API URL (e.g. https://xxx.up.railway.app), then redeploy.'
  );
}

const client = axios.create({
  baseURL: baseURL || undefined,
});

client.interceptors.request.use(async (config) => {
  if (!isFirebaseConfigured()) return config;
  const currentUser = getFirebaseAuth().currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config ? `${err.config.baseURL || ''}${err.config.url || ''}` : '';
    if (import.meta.env.DEV && err.config) {
      // eslint-disable-next-line no-console
      console.warn(
        '[CareOps API]',
        err.response?.status,
        err.config.method?.toUpperCase(),
        url,
        err.response?.data?.error || err.message
      );
    }
    if (import.meta.env.PROD && !err.response && err.message === 'Network Error') {
      // eslint-disable-next-line no-console
      console.error(
        '[CareOps] API network error. Set VITE_API_URL on Vercel to your Railway URL and redeploy.'
      );
    }
    return Promise.reject(err);
  }
);

export default client;
