const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

test('serves frontend, reports honest health, and rejects unauthorized writes', async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await fetch(base + '/');
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Threadline/);
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 503);
    assert.equal((await health.json()).database, 'disconnected');
    const malformed = await fetch(base + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(malformed.status, 400);
    assert.match((await malformed.json()).error.message, /Malformed JSON/);
    const oldKey = process.env.API_WRITE_KEY;
    process.env.API_WRITE_KEY = 'unit-test-secret';
    try {
      const denied = await fetch(base + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(denied.status, 401);
      const authenticated = await fetch(base + '/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': 'unit-test-secret' }, body: '{}' });
      assert.equal(authenticated.status, 503);
    } finally {
      if (oldKey === undefined) delete process.env.API_WRITE_KEY;
      else process.env.API_WRITE_KEY = oldKey;
    }
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
