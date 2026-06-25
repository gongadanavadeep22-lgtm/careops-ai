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

const corsOptions = {
  origin: allowedOrigins.length ? allowedOrigins : true,
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
app.use('/api/prescription', require('./routes/prescription'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/ops', require('./routes/ops'));

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
