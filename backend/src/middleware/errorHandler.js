function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);

  const status = err.status || err.statusCode || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR');
  res.status(status).json({
    error: err.message || 'Internal server error',
    code,
  });
}

module.exports = errorHandler;
