class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve().then(() => handler(req, res, next)).catch(next);

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON request body';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err.name === 'ValidationError') {
    status = 422;
    message = 'Validation failed';
    details = Object.values(err.errors || {}).map((field) => field.message);
  } else if (err.code === 11000) {
    status = 409;
    message = 'A user with that username or email already exists';
  }
  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error';
  }
  res.status(status).json({ error: { message, ...(details ? { details } : {}) } });
}
module.exports = { HttpError, asyncRoute, errorHandler };
