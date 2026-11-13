const test = require('node:test');
const assert = require('node:assert/strict');
const { User, Thought } = require('../models');
test('user schema validates identity and never serializes email', async () => {
  const valid = new User({ username: 'sample_user', email: 'sample@example.com' });
  await valid.validate();
  assert.equal(valid.toJSON().email, undefined);
  assert.equal(valid.toJSON().friendCount, 0);
  await assert.rejects(new User({ username: '?', email: 'not-an-email' }).validate(), { name: 'ValidationError' });
});
test('thought and embedded reaction schemas enforce lengths', async () => {
  const thought = new Thought({ username: 'sample_user', thoughtText: 'Hello there', reactions: [{ username: 'another', reactionBody: 'Welcome!' }] });
  await thought.validate();
  assert.equal(thought.toJSON().reactionCount, 1);
  assert.ok(thought.reactions[0].reactionId);
  await assert.rejects(new Thought({ username: 'sample_user', thoughtText: 'x'.repeat(281) }).validate(), { name: 'ValidationError' });
});
