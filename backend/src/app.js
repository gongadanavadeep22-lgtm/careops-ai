const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CareOps API', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

module.exports = app;
