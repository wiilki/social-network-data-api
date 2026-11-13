const { HttpError } = require('./errors');
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const USERNAME = /^[a-zA-Z0-9_]{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function objectId(value, label = 'id') {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) {
    throw new HttpError(400, 'Invalid ' + label + ': expected a 24-character MongoDB ObjectId');
  }
  return value.toLowerCase();
}
function bodyObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Expected a JSON object');
  return value;
}
function onlyFields(body, allowed) {
  const extra = Object.keys(body).filter((field) => !allowed.includes(field));
  if (extra.length) throw new HttpError(400, 'Unexpected fields: ' + extra.join(', '));
}
function stringField(value, label, max, min = 1) {
  if (typeof value !== 'string') throw new HttpError(422, label + ' must be a string');
  const result = value.trim();
  if (result.length < min || result.length > max) {
    throw new HttpError(422, label + ' must be between ' + min + ' and ' + max + ' characters');
  }
  return result;
}
function userCreate(body) {
  bodyObject(body); onlyFields(body, ['username', 'email']);
  const username = stringField(body.username, 'username', 24, 3);
  const email = stringField(body.email, 'email', 254).toLowerCase();
  if (!USERNAME.test(username)) throw new HttpError(422, 'username must use 3-24 letters, numbers, or underscores');
  if (!EMAIL.test(email)) throw new HttpError(422, 'Enter a valid email address');
  return { username, email };
}
function userUpdate(body) {
  bodyObject(body); onlyFields(body, ['email']);
  if (body.email === undefined) throw new HttpError(400, 'Provide an email to update');
  const email = stringField(body.email, 'email', 254).toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(422, 'Enter a valid email address');
  return { email };
}
function thoughtCreate(body) {
  bodyObject(body); onlyFields(body, ['username', 'thoughtText']);
  const username = stringField(body.username, 'username', 24, 3);
  const thoughtText = stringField(body.thoughtText, 'thoughtText', 280);
  if (!USERNAME.test(username)) throw new HttpError(422, 'Invalid username');
  return { username, thoughtText };
}
function thoughtUpdate(body) {
  bodyObject(body); onlyFields(body, ['thoughtText']);
  return { thoughtText: stringField(body.thoughtText, 'thoughtText', 280) };
}
function reactionCreate(body) {
  bodyObject(body); onlyFields(body, ['username', 'reactionBody']);
  const username = stringField(body.username, 'username', 24, 3);
  const reactionBody = stringField(body.reactionBody, 'reactionBody', 280);
  if (!USERNAME.test(username)) throw new HttpError(422, 'Invalid username');
  return { username, reactionBody };
}
function pagination(query) {
  const parse = (value, fallback, label, max) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new HttpError(400, label + ' must be a positive integer');
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new HttpError(400, label + ' must be between 1 and ' + max);
    return n;
  };
  const page = parse(query.page, 1, 'page', 10000);
  const limit = parse(query.limit, 20, 'limit', 100);
  const q = query.q === undefined ? '' : stringField(query.q, 'q', 100, 0);
  return { page, limit, q, skip: (page - 1) * limit };
}
function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
}
function pageResult(data, total, { page, limit }) {
  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
function publicUser(user) {
  if (!user) return user;
  const value = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  delete value.email; delete value.__v;
  value.friendCount = (value.friends || []).length;
  value.thoughtCount = (value.thoughts || []).length;
  return value;
}
function publicThought(thought) {
  if (!thought) return thought;
  const value = thought.toObject ? thought.toObject({ virtuals: true }) : { ...thought };
  delete value.__v;
  value.reactionCount = (value.reactions || []).length;
  return value;
}
module.exports = { objectId, userCreate, userUpdate, thoughtCreate, thoughtUpdate, reactionCreate, pagination, escapeRegex, pageResult, publicUser, publicThought };
