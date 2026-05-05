process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.PORT = process.env.PORT || '8080';
process.env.SECRET_KEY_ACCESS_TOKEN = process.env.SECRET_KEY_ACCESS_TOKEN || 'smoke-test-access-token-key';
process.env.SECRET_KEY_REFRESH_TOKEN = process.env.SECRET_KEY_REFRESH_TOKEN || 'smoke-test-refresh-token-key';
process.env.MAIL_USER = process.env.MAIL_USER || 'smoke@example.com';
process.env.MAIL_PASS = process.env.MAIL_PASS || 'smoke-password';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eprkavach-smoke';

const checks = [
  import('../services/cache.service.js'),
  import('../middleware/pagination.middleware.js'),
  import('../queues/pdf.queue.js'),
  import('../services/pdf.service.js'),
  import('../routes/report.route.js'),
];

Promise.all(checks)
  .then(() => {
    console.log('Server smoke test passed');
  })
  .catch((error) => {
    console.error('Server smoke test failed', error);
    process.exitCode = 1;
  });
