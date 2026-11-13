const mongoose = require('mongoose');
const app = require('./app');
const { connectDatabase } = require('./config/connection');
const port = Number(process.env.PORT || 3001);

async function start() {
  if (process.env.NODE_ENV === 'production' && !process.env.API_WRITE_KEY) {
    throw new Error('Set API_WRITE_KEY before running in production');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  await connectDatabase();
  const server = app.listen(port, () => {
    console.log('Social Network Studio listening on http://localhost:' + port);
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close(async (error) => {
      try { await mongoose.disconnect(); }
      finally { process.exitCode = error ? 1 : 0; }
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}
if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start the API:', error.message);
    process.exitCode = 1;
  });
}
module.exports = { start };
