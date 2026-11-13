const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { User } = require('../models');
const app = require('../app');

const uri = process.env.TEST_MONGODB_URI;
const isTestDatabase = Boolean(uri && /\/[a-zA-Z0-9_-]+-test(?:\?|$)/.test(uri));

test('real MongoDB: profiles, posts, reactions, friendships, and cleanup', { skip: !isTestDatabase }, async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  await User.init();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const api = async (method, path, body) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(process.env.API_WRITE_KEY ? { 'X-API-Key': process.env.API_WRITE_KEY } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, data: await response.json() };
  };
  const prefix = 't' + Date.now().toString(36).slice(-8);
  try {
    assert.equal((await api('GET', '/api/health')).status, 200);
    const a = await api('POST', '/api/users', { username: prefix + 'a', email: prefix + 'a@example.com' });
    const b = await api('POST', '/api/users', { username: prefix + 'b', email: prefix + 'b@example.com' });
    assert.equal(a.status, 201);
    assert.equal(b.status, 201);
    assert.equal(a.data.email, undefined);
    assert.equal((await api('POST', '/api/users', { username: prefix + 'a', email: 'other@example.com' })).status, 409);
    assert.equal((await api('POST', '/api/users/' + a.data._id + '/friends/' + a.data._id)).status, 422);
    const connected = await api('POST', '/api/users/' + a.data._id + '/friends/' + b.data._id);
    assert.equal(connected.status, 200);
    assert.equal(connected.data.friendCount, 1);
    assert.equal((await api('POST', '/api/users/' + a.data._id + '/friends/' + b.data._id)).data.friendCount, 1);
    assert.equal((await api('POST', '/api/thoughts', { username: 'unknown_author', thoughtText: 'orphan' })).status, 404);
    const thought = await api('POST', '/api/thoughts', { username: prefix + 'a', thoughtText: 'A real thought!' });
    assert.equal(thought.status, 201);
    assert.equal((await api('GET', '/api/users/' + a.data._id)).data.thoughtCount, 1);
    const reaction = await api('POST', '/api/thoughts/' + thought.data._id + '/reactions',
      { username: prefix + 'b', reactionBody: 'Nice work!' });
    assert.equal(reaction.status, 201);
    assert.equal(reaction.data.reactionCount, 1);
    const reactionId = reaction.data.reactions[0].reactionId;
    assert.equal((await api('DELETE', '/api/thoughts/' + thought.data._id + '/reactions/' + reactionId)).data.reactionCount, 0);
    assert.equal((await api('GET', '/api/thoughts?q=real&limit=3')).data.pagination.limit, 3);
    assert.equal((await api('PUT', '/api/thoughts/' + thought.data._id, { username: prefix + 'b', thoughtText: 'hijack' })).status, 400);
    assert.equal((await api('DELETE', '/api/users/' + a.data._id)).status, 200);
    assert.equal((await api('GET', '/api/thoughts/' + thought.data._id)).status, 404);
    assert.equal((await api('GET', '/api/users/' + b.data._id)).data.friendCount, 0);
  } finally {
    await mongoose.connection.dropDatabase();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
