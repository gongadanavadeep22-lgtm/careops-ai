const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const allowedOrigin = (process.env.ALLOWED_ORIGIN || '').trim().replace(/['"]/g, '');

const corsOptions = {
  origin: allowedOrigin || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareOps API', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

module.exports = app;
