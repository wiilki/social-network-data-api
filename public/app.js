'use strict';
const $ = (selector) => document.querySelector(selector);
const state = { users: [], thoughts: [], usersTotal: 0, thoughtsTotal: 0, userPage: 1, thoughtPage: 1, viewer: '', writeKey: '', reactionThoughtId: '', busy: false };
const PAGE_SIZE = 100;
let toastTimer;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function initials(value) {
  return String(value || '?').split(/[\s_]+/).map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() || '?';
}
function avatar(name) {
  const i = [...String(name)].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 6;
  return '<span class="avatar a' + i + '">' + escapeHtml(initials(name)) + '</span>';
}
function relativeDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes + 'm ago';
  if (minutes < 1440) return Math.floor(minutes / 60) + 'h ago';
  if (minutes < 10080) return Math.floor(minutes / 1440) + 'd ago';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function toast(message, error = false) {
  const element = $('#toast');
  element.textContent = message;
  element.className = 'toast' + (error ? ' error' : '');
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, 4600);
}
async function api(path, options = {}) {
  const headers = { Accept: 'application/json' };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (state.writeKey && options.method && options.method !== 'GET') headers['X-API-Key'] = state.writeKey;
  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch (_) {
    throw new Error('Cannot reach the API server. Make sure it is running.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || ('Request failed (' + response.status + ')'));
  }
  return data;
}
function showOffline(message) {
  const empty = '<div class="empty-state"><strong>Could not load the database</strong>' + escapeHtml(message) + '</div>';
  $('#thought-list').innerHTML = empty;
  $('#people-preview').innerHTML = empty;
  $('#user-directory').innerHTML = empty;
}
async function checkHealth() {
  let ok = false;
  try {
    const response = await fetch('/api/health');
    ok = response.ok;
  } catch (_) { /* Show an offline state. */ }
  $('#db-pill').textContent = ok ? '● Database connected' : '● Database offline';
  $('#db-pill').className = 'pill ' + (ok ? 'ok' : 'bad');
  $('#side-status-text').textContent = ok ? 'Database connected' : 'Database unavailable';
  $('#side-status-dot').className = 'status-dot' + (ok ? ' ok' : '');
  return ok;
}
function renderStats() {
  $('#stat-users').textContent = state.usersTotal.toLocaleString();
  $('#stat-thoughts').textContent = state.thoughtsTotal.toLocaleString();
  $('#stat-reactions').textContent = state.thoughts.reduce((n, t) => n + (t.reactionCount || t.reactions?.length || 0), 0).toLocaleString();
}
function renderSelectors() {
  const previousAuthor = $('#post-author').value || state.viewer;
  const previousReaction = $('#reaction-author').value || state.viewer;
  const options = state.users.map((user) => '<option value="' + escapeHtml(user.username) + '">' + escapeHtml(user.username) + '</option>').join('');
  $('#post-author').innerHTML = '<option value="">Select a profile</option>' + options;
  $('#reaction-author').innerHTML = '<option value="">Select a profile</option>' + options;
  $('#viewer-select').innerHTML = '<option value="">Select a profile</option>' +
    state.users.map((user) => '<option value="' + escapeHtml(user._id) + '">' + escapeHtml(user.username) + '</option>').join('');
  if (state.users.some((user) => user.username === previousAuthor)) $('#post-author').value = previousAuthor;
  if (state.users.some((user) => user.username === previousReaction)) $('#reaction-author').value = previousReaction;
  if (state.users.some((user) => user._id === state.viewer)) $('#viewer-select').value = state.viewer;
  else state.viewer = '';
}
function renderThoughts() {
  const search = $('#feed-search').value.trim().toLowerCase();
  const thoughts = state.thoughts.filter((item) =>
    item.thoughtText?.toLowerCase().includes(search) || item.username?.toLowerCase().includes(search)
  );
  if (!thoughts.length) {
    $('#thought-list').innerHTML = '<div class="empty-state"><strong>' + (search ? 'No matching conversations' : 'A fresh start') + '</strong>' +
      (search ? 'Try another search term.' : 'Your first thought could be the start of something great.') + '</div>';
  } else {
    $('#thought-list').innerHTML = thoughts.map((item) => {
      const reactions = (item.reactions || []).slice(-3).reverse().map((reaction) =>
        '<div class="reaction"><strong>@' + escapeHtml(reaction.username) + '</strong> ' + escapeHtml(reaction.reactionBody) + '</div>'
      ).join('');
      return '<article class="thought-card">' +
        '<div class="thought-top">' + avatar(item.username) +
        '<div><div class="thought-author">@' + escapeHtml(item.username) + '</div><div class="thought-time">' + escapeHtml(relativeDate(item.createdAt)) + '</div></div>' +
        '<div class="spacer"></div><button class="small-action" data-action="delete-thought" data-id="' + escapeHtml(item._id) + '" title="Delete thought">Delete</button></div>' +
        '<p class="thought-text">' + escapeHtml(item.thoughtText) + '</p>' +
        '<div class="thought-actions"><button class="thought-action" data-action="react" data-id="' + escapeHtml(item._id) + '">♡ <span>' + (item.reactionCount || 0) + ' reactions</span></button>' +
        '<span class="thought-action">⌁ Shared publicly</span></div>' +
        (reactions ? '<div class="reactions">' + reactions + '</div>' : '') + '</article>';
    }).join('');
  }
  $('#load-more-thoughts').hidden = state.thoughts.length >= state.thoughtsTotal;
}
function renderPeople() {
  const people = state.users.slice(0, 5);
  $('#people-preview').innerHTML = people.length ? people.map((user) =>
    '<div class="person-row">' + avatar(user.username) + '<div class="person-meta"><strong>@' + escapeHtml(user.username) +
    '</strong><small>' + (user.thoughtCount || 0) + ' thoughts · ' + (user.friendCount || 0) + ' connections</small></div><span class="person-arrow">↗</span></div>'
  ).join('') : '<div class="empty-state"><strong>Be the first.</strong>Create a profile to get started.</div>';
  const search = $('#user-search').value.trim().toLowerCase();
  const selected = state.users.find((user) => user._id === state.viewer);
  const peopleToShow = state.users.filter((user) => user.username?.toLowerCase().includes(search));
  $('#user-directory').innerHTML = peopleToShow.length ? peopleToShow.map((user) => {
    const self = selected && selected._id === user._id;
    const added = selected && (selected.friends || []).some((friend) => String(friend?._id || friend) === user._id);
    const label = !selected ? 'Choose profile' : self ? 'You' : added ? '✓ Connected' : '+ Connect';
    return '<article class="directory-card">' + avatar(user.username) +
      '<div class="person-meta"><strong>@' + escapeHtml(user.username) + '</strong><small>' + (user.thoughtCount || 0) + ' posts · ' + (user.friendCount || 0) + ' friends</small></div>' +
      '<button class="friend-btn' + (added ? ' added' : '') + '" data-action="friend" data-id="' + escapeHtml(user._id) +
      '" ' + (!selected || self ? 'disabled' : '') + '>' + label + '</button></article>';
  }).join('') : '<div class="empty-state">No matching people yet.</div>';
  $('#load-more-users').hidden = state.users.length >= state.usersTotal;
}
function render() { renderStats(); renderSelectors(); renderThoughts(); renderPeople(); }
async function refresh() {
  $('#refresh').disabled = true;
  const connected = await checkHealth();
  try {
    const [users, thoughts] = await Promise.all([
      api('/api/users?limit=' + PAGE_SIZE),
      api('/api/thoughts?limit=' + PAGE_SIZE)
    ]);
    state.users = users.data;
    state.thoughts = thoughts.data;
    state.usersTotal = users.pagination.total;
    state.thoughtsTotal = thoughts.pagination.total;
    state.userPage = 1; state.thoughtPage = 1;
    render();
  } catch (error) {
    state.users = []; state.thoughts = [];
    state.usersTotal = 0; state.thoughtsTotal = 0;
    renderStats();
    showOffline(error.message);
    if (connected) toast(error.message, true);
  } finally { $('#refresh').disabled = false; }
}
async function more(kind) {
  const isUsers = kind === 'users';
  const page = (isUsers ? state.userPage : state.thoughtPage) + 1;
  const path = '/api/' + (isUsers ? 'users' : 'thoughts') + '?limit=' + PAGE_SIZE + '&page=' + page;
  const response = await api(path);
  if (isUsers) {
    state.userPage = page; state.users.push(...response.data);
  } else {
    state.thoughtPage = page; state.thoughts.push(...response.data);
  }
  render();
}
function switchView(view) {
  if (!['overview', 'community', 'explorer'].includes(view)) return;
  document.querySelectorAll('.view-panel').forEach((panel) => { panel.hidden = panel.id !== view; });
  document.querySelectorAll('.nav-link').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === view));
  $('#breadcrumb-current').textContent = ({ overview: 'Overview', community: 'Community', explorer: 'API explorer' })[view];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function mutate(path, options, success) {
  if (state.busy) return;
  state.busy = true;
  try {
    await api(path, options);
    toast(success);
    await refresh();
  } catch (error) {
    if (error.message.includes('X-API-Key')) toast('Set your write key at the top of the page.', true);
    else toast(error.message, true);
  } finally { state.busy = false; }
}
function jsonBody(value) { return { method: 'POST', body: JSON.stringify(value) }; }

document.addEventListener('click', async (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { switchView(viewButton.dataset.view); return; }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const id = action.dataset.id;
  if (action.dataset.action === 'react') {
    state.reactionThoughtId = id;
    if (state.viewer) {
      const viewer = state.users.find((user) => user._id === state.viewer);
      if (viewer) $('#reaction-author').value = viewer.username;
    }
    $('#reaction-dialog').showModal();
  }
  if (action.dataset.action === 'delete-thought') {
    if (window.confirm('Delete this thought and its reactions? This cannot be undone.')) {
      await mutate('/api/thoughts/' + encodeURIComponent(id), { method: 'DELETE' }, 'Thought deleted');
    }
  }
  if (action.dataset.action === 'friend') {
    const viewer = state.users.find((user) => user._id === state.viewer);
    if (!viewer) return;
    const added = (viewer.friends || []).some((friend) => String(friend?._id || friend) === id);
    await mutate('/api/users/' + encodeURIComponent(viewer._id) + '/friends/' + encodeURIComponent(id),
      { method: added ? 'DELETE' : 'POST' }, added ? 'Connection removed' : 'Connection added');
  }
});

$('#thought-input').addEventListener('input', () => { $('#thought-count').textContent = $('#thought-input').value.length; });
$('#feed-search').addEventListener('input', renderThoughts);
$('#user-search').addEventListener('input', renderPeople);
$('#viewer-select').addEventListener('change', (event) => { state.viewer = event.target.value; renderPeople(); });
$('#refresh').addEventListener('click', refresh);
$('#jump-to-compose').addEventListener('click', () => $('#thought-input').focus());
$('#load-more-thoughts').addEventListener('click', () => more('thoughts').catch((error) => toast(error.message, true)));
$('#load-more-users').addEventListener('click', () => more('users').catch((error) => toast(error.message, true)));

$('#user-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = $('#new-username').value.trim();
  await mutate('/api/users', jsonBody({ username, email: $('#new-email').value.trim() }), 'Welcome to the community!');
  if (state.users.some((user) => user.username === username)) {
    $('#user-form').reset();
    $('#post-author').value = username;
  }
});
$('#thought-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = $('#post-author').value;
  if (!username) { toast('Create or choose a profile first.', true); return; }
  const text = $('#thought-input').value.trim();
  await mutate('/api/thoughts', jsonBody({ username, thoughtText: text }), 'Thought published!');
  if (state.thoughts.some((thought) => thought.username === username && thought.thoughtText === text)) {
    $('#thought-input').value = ''; $('#thought-count').textContent = '0';
    $('#post-author').value = username;
  }
});
$('#close-dialog').addEventListener('click', () => $('#reaction-dialog').close());
$('#reaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const before = state.thoughts.reduce((n, t) => n + (t.reactionCount || 0), 0);
  await mutate('/api/thoughts/' + encodeURIComponent(state.reactionThoughtId) + '/reactions',
    jsonBody({ username: $('#reaction-author').value, reactionBody: $('#reaction-input').value }), 'Reaction added!');
  const after = state.thoughts.reduce((n, t) => n + (t.reactionCount || 0), 0);
  if (after > before) { $('#reaction-dialog').close(); $('#reaction-form').reset(); }
});

$('#endpoint-select').addEventListener('change', () => { $('#endpoint-display').textContent = $('#endpoint-select').value; });
$('#send-request').addEventListener('click', async () => {
  const path = $('#endpoint-select').value;
  $('#api-response').textContent = 'Sending request…';
  $('#response-status').textContent = 'Loading';
  try {
    const start = performance.now();
    const data = await api(path);
    $('#api-response').textContent = JSON.stringify(data, null, 2);
    $('#response-status').textContent = '200 OK · ' + Math.round(performance.now() - start) + 'ms';
  } catch (error) {
    $('#api-response').textContent = JSON.stringify({ error: error.message }, null, 2);
    $('#response-status').textContent = 'Request failed';
  }
});
$('#copy-response').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#api-response').textContent); toast('Response copied'); }
  catch (_) { toast('Copy is unavailable in this browser', true); }
});

// API key is kept in memory only; do not persist credentials in browser storage.
const keyButton = document.createElement('button');
keyButton.id = 'manage-key';
keyButton.className = 'icon-button key-button';
keyButton.title = 'Configure write key';
keyButton.setAttribute('aria-label', 'Configure write key');
keyButton.textContent = '⚿';
$('#refresh').before(keyButton);
keyButton.addEventListener('click', () => {
  const entered = window.prompt('Enter your API_WRITE_KEY (kept only for this browser tab). Leave empty to clear:', '');
  if (entered === null) return;
  state.writeKey = entered;
  toast(entered ? 'Write key set for this tab' : 'Write key cleared');
});

refresh();
