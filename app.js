const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const mongoose = require('mongoose');
const routes = require('./routes');
const { HttpError, errorHandler } = require('./utils/errors');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  });
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

function safeEqual(a, b) {
  const left = Buffer.from(a || '');
  const right = Buffer.from(b || '');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const key = process.env.API_WRITE_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    return next(new HttpError(503, 'Writes are disabled until API_WRITE_KEY is configured'));
  }
  if (!key || safeEqual(req.get('x-api-key'), key)) return next();
  return next(new HttpError(401, 'A valid X-API-Key header is required to modify data'));
});

app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new HttpError(503, 'Database is unavailable; check MONGODB_URI and server logs'));
  }
  next();
});
app.use(routes);
app.use('/api', (req, res, next) => next(new HttpError(404, 'API endpoint not found')));
app.use((req, res, next) => next(new HttpError(404, 'Page not found')));
app.use(errorHandler);
module.exports = app;
