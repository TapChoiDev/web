/**
 * Centralized Error Handling Middleware
 * Prevents stack trace and sensitive internal details leakage in responses
 */

function errorHandler(err, req, res, next) {
  console.error(`[SERVER ERROR] ${req.method} ${req.url}:`, err);

  const status = err.status || err.statusCode || 500;
  const message = (process.env.NODE_ENV === 'development' || status < 500)
    ? err.message || 'Đã xảy ra lỗi máy chủ nội bộ.'
    : 'Đã xảy ra lỗi trên hệ thống máy chủ. Vui lòng thử lại sau.';

  res.status(status).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
