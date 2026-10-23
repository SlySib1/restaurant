require('dotenv').config({ path: ['.env.local', '.env'] });
const express = require('express');
const path = require('path');
const { router: apiRouter, ApiError } = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, 'public');
const allowedSpaOrigins = new Set(
  (process.env.SPA_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.disable('x-powered-by');

app.use('/api', (req, res, next) => {
  const origin = req.get('Origin');
  if (!origin) return next();

  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  res.vary('Origin');
  if (origin !== requestOrigin && !allowedSpaOrigins.has(origin)) {
    return res.status(403).json({
      ok: false,
      error: {
        code: 'CORS_ORIGIN_DENIED',
        message: 'Origin này không được phép gọi API.'
      }
    });
  }

  res.set('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') {
    const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'DELETE']);
    const allowedHeaders = new Set(['accept', 'content-type']);
    const requestedMethod = req.get('Access-Control-Request-Method');
    const requestedHeaders = (req.get('Access-Control-Request-Headers') || '')
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);

    if ((requestedMethod && !allowedMethods.has(requestedMethod)) ||
        requestedHeaders.some((header) => !allowedHeaders.has(header))) {
      return res.status(403).json({
        ok: false,
        error: {
          code: 'CORS_PREFLIGHT_DENIED',
          message: 'Phương thức hoặc header của request không được phép.'
        }
      });
    }

    res.set('Access-Control-Allow-Methods', [...allowedMethods].join(', '));
    res.set('Access-Control-Allow-Headers', [...allowedHeaders].join(', '));
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRouter);

app.use('/api', (req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'Không tìm thấy API endpoint.' }
  });
});

app.use('/api', (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Nội dung JSON không hợp lệ.' }
    });
  }
  if (error instanceof ApiError) {
    const responseError = {
      code: error.code,
      message: error.message
    };
    if (error.fields) responseError.fields = error.fields;
    return res.status(error.status).json({ ok: false, error: responseError });
  }

  console.error('API request failed:', error);
  return res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Đã xảy ra lỗi hệ thống.' }
  });
});

app.use(express.static(publicDirectory, { index: false }));

app.get(/.*/, (req, res) => {
  if (!req.accepts('html') || path.extname(req.path)) {
    return res.status(404).send('404 - Không tìm thấy trang');
  }
  return res.sendFile(path.join(publicDirectory, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});