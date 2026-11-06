# MateVerse — Chess Without Borders (Version 3)

MateVerse is a responsive chess web app with a futuristic gaming interface. This version expands the starter with accounts, persistent ratings, online match tools and player history.

## Features

- Legal chess moves, move highlighting, move history, castling, en passant and promotion (powered by chess.js).
- Drag-and-drop and click-to-move controls, with visible legal targets and last-move highlights; optional online premoves are queued from Settings.
- Local position-evaluation bar and move-quality badges, plus backward/forward review controls after a completed game.
- Separate move, capture, check, castle, game-over and low-clock audio cues, with vibration where supported by the browser.
- Low-time clock alerts, an in-game server-connection banner, computer-game recovery and online-room resume credentials in LocalStorage, plus one-click rematch requests.
- Computer opponent with beginner, intermediate and advanced search levels.
- Mate Coach move suggestions and chess-piece learning guide.
- Online matchmaking and private rooms using Socket.IO, with copyable invite codes, synchronized player names and move history.
- Player accounts with verified email/password or optional Google sign-in; passwords are hashed with Node.js scrypt.
- Friend search and requests, saved connections, and live match challenges for friends who are online.
- Editable profiles with uploaded avatars, public/friends-only visibility, Instagram/Facebook profile links and shareable rating cards.
- Public guest or account website reviews with an average rating, plus help email and phone links in the footer.
- Persistent player profiles, online match records and an Elo-style rating leaderboard.
- Online room chat, draw offers and resignation.
- Local computer-game clocks: no clock, 3, 5, 10 or 15 minutes.
- Computer games remain ready until you press **Start game**; the clock and move input begin only then.
- Mate Coach suggests and explains a legal move for the current position.
- Computer-game PGNs and practice win/loss/draw totals are saved to a signed-in player's history without changing online rating.
- Personal settings include dark/light appearance, board palette, sound, premoves, board orientation, computer strength and English, Spanish, French or Kiswahili interface labels.
- Completed games show a winner banner above the board; online room chat includes delivery errors and recent room messages.
- Board flip, move sounds, PGN export, FEN copy and responsive layout.
- `/health` endpoint for basic hosting health checks.

## Run locally

1. Install Node.js LTS: https://nodejs.org/
2. Open this folder in VS Code.
3. In the terminal run:

```bash
npm install
npm start
```

4. Visit http://localhost:3000

## Accounts and stored data

- Email/password registration requires email verification; verification links expire after one hour. Existing username-only accounts remain usable.
- The first account registration creates a player profile with a starting rating of 1200.
- Friend connections, reviews, player records and profile metadata are stored in the JSON database. Avatars are stored under `DATA_DIR/avatars`; use persistent storage for both.
- Online games update ratings and history only when **both** players are signed in.
- Account and game data are stored in `data/mateverse.json` (created automatically). Back up this file regularly.
- Sessions are held in server memory, so players must sign in again after a server restart.
- Set `DATA_DIR` to a persistent disk path on your host. Do not use an ephemeral filesystem if you want accounts and ratings to survive redeployments.

## Sign-in and community configuration

Email verification and Google sign-in are configurable and must be set up before those options can be used in production:

- Configure SMTP with `SMTP_HOST`, `SMTP_PORT` (usually `587`), `SMTP_SECURE` (`true` only for implicit TLS, commonly port `465`), `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`.
- Set `PUBLIC_URL` to the canonical HTTPS site URL so verification links point to the deployed app.
- For Google, create a Google Identity Services OAuth **Web application** client and set `GOOGLE_CLIENT_ID`. Add the production site origin (and local development origin when needed) to its authorized JavaScript origins. Never commit OAuth or SMTP secrets.
- Add these values in Render's environment settings, not in source files. Email/password registration will stay unavailable until SMTP is configured; Google sign-in stays hidden until its client ID is configured.
- Players can add Instagram/Facebook profile URLs and share a MateVerse profile/rating using their device's share sheet or copy link. MateVerse does not post automatically or ask for social-media passwords.
- Reviews are public. Guests may post; review text is limited and rate-limited, but public submissions still need moderation before a large-scale launch.
- Help: [MateVersechess2026@mateverse-9jqw.onrender.com](mailto:MateVersechess2026@mateverse-9jqw.onrender.com) · [+254 103 705 543](tel:+254103705543).

## Publish online

Deploy to a Node.js host that supports WebSockets and persistent disk storage.

- Build command: `npm install`
- Start command: `npm start`
- Set `NODE_ENV=production` and configure HTTPS at the host.
- Attach a persistent volume and set `DATA_DIR` to its mount path.
- Both players open the same public URL. Private room codes and live matchmaking work through the same server process.

## Important limitations — read before public launch

This is a feature-rich prototype, **not yet a production-grade chess service**.

- The computer opponent is a small JavaScript search, not Stockfish; its strongest setting is not grandmaster strength.
- The coach, evaluation bar and move badges use the app's local JavaScript search/material heuristics. They are estimates, not Stockfish/WASM analysis or guaranteed best moves.
- Clocks currently apply to games against the computer. Online server-authoritative clocks are not implemented.
- Accounts use scrypt password hashing, verified email for new password accounts, optional Google ID-token verification and HTTP-only cookies, but the prototype still needs stronger rate limiting, CSRF protection, password reset, session persistence/rotation, security testing, review moderation and privacy/legal pages before a public launch.
- Online rooms and matchmaking are in-memory and work on one server process. A server restart ends active matches; multi-server scaling needs a Socket.IO adapter and shared database/queue.
- Elo updates are applied to rated online games when both players are signed in. There is no anti-cheat or rating-abuse detection yet.
- Tournaments, spectators, user reporting, server-authoritative online clocks and Stockfish/WASM are not included. Socket.IO recovers brief online disconnects and stored room credentials can reattach after a page refresh for up to two minutes while the hosting process remains alive; server restarts still end active matches.
- The browser chess library is loaded from jsDelivr, so the board requires internet access.

## Before accepting real users

Have a developer review authentication, session and data security; move JSON storage to PostgreSQL; add rate limiting and CSRF protection; add moderation and abuse reporting; implement server-side clocks; integrate Stockfish in a Web Worker if full engine-grade analysis is required; and run automated multiplayer/security tests.

## Main files

- `server.js` — Express APIs, authentication, persistent JSON records, Elo updates and Socket.IO multiplayer.
- `public/index.html` — application structure and dialogs.
- `public/style.css` — futuristic responsive design.
- `public/app.js` — board, computer opponent, coach, clocks, chat and client interactions.
