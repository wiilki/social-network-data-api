# Threadline — Social Network Studio

A modernized version of the original Social Network Data API. The original MongoDB + Express + Mongoose assignment now includes a polished, responsive browser interface for profiles, thoughts, reactions and friend connections.

**Technology:** Node.js 22+, Express 4, MongoDB, Mongoose 7, and plain HTML/CSS/JavaScript. No frontend build step or paid account is required.

## Highlights

- Real-time-ready browser studio with a community feed, new-profile form, composer, reactions, friend management, search and a live API explorer.
- One server entrypoint and one MongoDB connection. No obsolete Mongoose connection flags.
- Strict request-body allowlists, input validation, predictable errors and clear MongoDB health status.
- Safer data relationships: posting requires an existing author; deleting users removes their thoughts and friend links; deleting thoughts removes dangling references.
- Paginated lists and optional text/username search; email fields are excluded from public API responses.
- Tests for validators, HTTP behavior, models, and real database CRUD in GitHub Actions.

## Get started on your computer

1. Install Node.js 22 or newer and MongoDB (local or hosted).
2. Clone this repository.
3. In the project folder, run: **npm ci**
4. Run: **npm start**
5. Open **http://localhost:3001** in your browser.

The default database URL is mongodb://127.0.0.1:27017/social-network-api.

If using MongoDB Atlas, set an environment variable named MONGODB_URI to your connection string before running npm start. PORT changes the listening port. API_WRITE_KEY optionally protects all POST, PUT, PATCH and DELETE API calls; set it to a random secret and use the key icon in the Studio's toolbar to provide it for the current browser tab.

The app deliberately fails startup if MongoDB is unavailable rather than reporting false success.

For development with automatic restarts run **npm run dev**.

## REST API

Base URL: http://localhost:3001/api

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /health | Database health |
| GET | /users?page=1&limit=20&q=alex | List/search profiles |
| GET | /users/:id | Get one profile and relationships |
| POST | /users | Create a profile |
| PUT | /users/:id | Update email |
| DELETE | /users/:id | Delete profile and its thoughts |
| POST / DELETE | /users/:userId/friends/:friendId | Save or remove a one-way friend |
| GET | /thoughts?page=1&limit=20&q=hello | List/search thoughts |
| GET | /thoughts/:id | Get a thought |
| POST | /thoughts | Publish a thought |
| PUT | /thoughts/:id | Edit thought text |
| DELETE | /thoughts/:id | Delete thought |
| POST | /thoughts/:thoughtId/reactions | React to a thought |
| DELETE | /thoughts/:thoughtId/reactions/:reactionId | Remove a reaction |

For POST /users, send JSON like this:

    { "username": "alex", "email": "alex@example.com" }

For POST /thoughts, send:

    { "username": "alex", "thoughtText": "Hello, Threadline!" }

For POST /thoughts/:thoughtId/reactions, send:

    { "username": "alex", "reactionBody": "Agreed!" }

Lists now return **data** and **pagination** fields instead of raw arrays. Valid page values start at 1; limit defaults to 20 and caps at 100. Usernames are immutable after creation; thought ownership is immutable. Timestamps are ISO strings.

Errors consistently use an error.message field. HTTP status codes include 400 for invalid bodies/IDs, 401 for missing write keys, 404 for missing resources, 409 for duplicate users, 422 for validation errors, and 503 for disconnected databases.

## Security and deployment

**This is a portfolio / education demo, not a production social-network identity service.** There is no per-user sign-in, object-level authorization, moderation, rate limiting, or anti-abuse system. Do not store private user content, and do not publish it as a public multi-user service without implementing those protections first.

Production startup requires NODE_ENV=production and a strong API_WRITE_KEY. Clients must provide the secret in an X-API-Key header for every write request. The Studio stores the key only in browser memory for the current tab. GET requests remain publicly accessible, but user emails are hidden. Store credentials outside Git.

Friend connections are one-directional, as they were in the original API; accepting mutual friendships would require a different workflow.

Multi-document cleanup operations run sequentially. For enterprise deployment, use MongoDB replica-set transactions for full atomic guarantees.

## Tests

Run **npm test** for the Node.js built-in test runner. Unit, schema, and local HTTP tests do not require MongoDB. The integration test runs only when TEST_MONGODB_URI points at a database whose name ends in "-test" (for example, mongodb://127.0.0.1:27017/social-network-test). The integration test drops that test database when complete: never point it at real data. GitHub Actions provisions an isolated MongoDB service and runs the full suite on pull requests.

## Migration from the 2023 version

The updated app is an intentional API v2: collection GET requests now return paginated objects, public emails are excluded, authorship cannot be reassigned by editing a thought, and username changes are disabled to protect relationships. Existing database collections are retained; review older client integrations before upgrading.

Original repository: https://github.com/wiilki/social-network-data-api
