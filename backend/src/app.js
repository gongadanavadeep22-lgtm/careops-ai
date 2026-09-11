const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/['"]/g, ''))
  .filter(Boolean);

const localDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Local Vite often shifts ports (5173 → 5174). Allow any localhost port in non-production.
  if (process.env.NODE_ENV !== 'production' && localDevOrigin.test(origin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMIT' },
});
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/checkin', require('./routes/checkin'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/consultation', require('./routes/consultation'));
app.use('/api/diseases', require('./routes/diseases'));
app.use('/api/prescription', require('./routes/prescription'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/ops', require('./routes/ops'));

app.get('/', (req, res) => {
  const frontendUrl = process.env.ALLOWED_ORIGIN && !process.env.ALLOWED_ORIGIN.includes('*')
    ? process.env.ALLOWED_ORIGIN.split(',')[0].trim()
    : 'http://localhost:5173';

  if (req.accepts('html')) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>CareOps AI API</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b132b; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
            .card { background: #1c2541; padding: 2.5rem; border-radius: 16px; border: 1px solid #3a506b; text-align: center; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 0.85rem; margin-bottom: 1.25rem; }
            .dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; }
            h1 { color: #f8fafc; margin: 0 0 0.75rem 0; font-size: 1.6rem; font-weight: 700; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin: 0 0 1.5rem 0; }
            .actions { display: flex; flex-direction: column; gap: 0.75rem; }
            .btn-primary { display: block; padding: 0.85rem 1.5rem; background: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 1rem; transition: all 0.2s; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); }
            .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
            .btn-secondary { display: block; padding: 0.6rem 1.2rem; color: #94a3b8; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
            .btn-secondary:hover { color: #e2e8f0; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge"><span class="dot"></span> Backend Online</div>
            <h1>CareOps AI Backend API</h1>
            <p>The backend server is running smoothly on port 4000. To access the user dashboards (Doctor, Nurse, Pharmacy, Patient, Ops), click below to open the frontend web application.</p>
            <div class="actions">
              <a href="${frontendUrl}" class="btn-primary">Open Web Application &rarr;</a>
              <a href="/health" class="btn-secondary">View /health JSON status</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }

  res.json({
    status: 'ok',
    service: 'CareOps API',
    message: `CareOps AI backend is running. Open frontend application at ${frontendUrl}`,
    frontendUrl,
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CareOps API',
    timestamp: new Date().toISOString(),
    geminiKeySet: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    twilioKeySet: Boolean((process.env.TWILIO_ACCOUNT_SID || '').trim()),
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}`, code: 'NOT_FOUND' });
});

app.use(errorHandler);

module.exports = app;
