const test = require('node:test');
const assert = require('node:assert/strict');
const { objectId, userCreate, userUpdate, thoughtCreate, thoughtUpdate, reactionCreate, pagination, escapeRegex, pageResult, publicUser, publicThought } = require('../utils/validation');

test('validates identifiers before querying', () => {
  assert.equal(objectId('A'.repeat(24)), 'a'.repeat(24));
  assert.throws(() => objectId('123'), /Invalid id/);
  assert.throws(() => objectId('z'.repeat(24)), /Invalid id/);
});
test('normalizes user input, blocks unsafe fields and immutable names', () => {
  assert.deepEqual(userCreate({ username: ' Alice_22 ', email: ' ALICE@Example.Com ' }), { username: 'Alice_22', email: 'alice@example.com' });
  assert.throws(() => userCreate({ username: 'a', email: 'x@y.com' }), /username/);
  assert.throws(() => userCreate({ username: 'valid', email: 'bad' }), /valid email/);
  assert.throws(() => userCreate({ username: 'valid', email: 'a@b.com', isAdmin: true }), /Unexpected fields/);
  assert.deepEqual(userUpdate({ email: ' New@Test.com ' }), { email: 'new@test.com' });
  assert.throws(() => userUpdate({ username: 'changed' }), /Unexpected fields/);
});
test('enforces thought and reaction lengths and stable ownership', () => {
  assert.deepEqual(thoughtCreate({ username: 'Alice', thoughtText: ' Hello! ' }), { username: 'Alice', thoughtText: 'Hello!' });
  assert.throws(() => thoughtCreate({ username: 'Alice', thoughtText: ' '.repeat(8) }), /thoughtText/);
  assert.throws(() => thoughtUpdate({ thoughtText: 'a'.repeat(281) }), /thoughtText/);
  assert.throws(() => thoughtUpdate({ username: 'someone', thoughtText: 'hi' }), /Unexpected fields/);
  assert.deepEqual(reactionCreate({ username: 'Alice', reactionBody: ' Nice ' }), { username: 'Alice', reactionBody: 'Nice' });
});
test('bounds pagination and escapes regex searches', () => {
  assert.deepEqual(pagination({}), { page: 1, limit: 20, q: '', skip: 0 });
  assert.deepEqual(pagination({ page: '2', limit: '5', q: 'wow' }), { page: 2, limit: 5, q: 'wow', skip: 5 });
  assert.throws(() => pagination({ limit: '101' }), /limit/);
  assert.throws(() => pagination({ page: 'abc' }), /page/);
  assert.throws(() => pagination({ q: {} }), /string/);
  assert.equal(escapeRegex('hello.*[world]'), 'hello\\.\\*\\[world\\]');
  assert.deepEqual(pageResult(['x'], 12, { page: 2, limit: 5 }), { data: ['x'], pagination: { page: 2, limit: 5, total: 12, pages: 3 } });
});
test('public resources omit emails and compute counts', () => {
  assert.deepEqual(publicUser({ username: 'test', email: 'secret@x.com', friends: [1], thoughts: [2, 3] }),
    { username: 'test', friends: [1], thoughts: [2, 3], friendCount: 1, thoughtCount: 2 });
  assert.equal(publicThought({ thoughtText: 'hello', reactions: [1, 2, 3] }).reactionCount, 3);
});
