# MateVerse — Chess Without Borders (Version 3)

MateVerse is a responsive chess web app with a futuristic gaming interface. This version expands the starter with accounts, persistent ratings, online match tools and player history.

## Features

- Legal chess moves, move highlighting, move history, castling, en passant and promotion (powered by chess.js).
- Computer opponent with beginner, intermediate and advanced search levels.
- Mate Coach move suggestions and chess-piece learning guide.
- Online matchmaking and private rooms using Socket.IO, with copyable invite codes, synchronized player names and move history.
- Optional player accounts (username + password); passwords are hashed with Node.js scrypt.
- Persistent player profiles, online match records and an Elo-style rating leaderboard.
- Online room chat, draw offers and resignation.
- Local computer-game clocks: no clock, 3, 5, 10 or 15 minutes.
- Computer games remain ready until you press **Start game**; the clock and move input begin only then.
- Mate Coach suggests and explains a legal move for the current position.
- Computer-game PGNs and practice win/loss/draw totals are saved to a signed-in player's history without changing online rating.
- Personal settings include dark/light appearance, board palette, sound, board orientation, computer strength and English, Spanish, French or Kiswahili interface labels.
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

- The first account registration creates a player profile with a starting rating of 1200.
- Online games update ratings and history only when **both** players are signed in.
- Account and game data are stored in `data/mateverse.json` (created automatically). Back up this file regularly.
- Sessions are held in server memory, so players must sign in again after a server restart.
- Set `DATA_DIR` to a persistent disk path on your host. Do not use an ephemeral filesystem if you want accounts and ratings to survive redeployments.

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
- The coach gives heuristics-based suggestions, not guaranteed best moves.
- Clocks currently apply to games against the computer. Online server-authoritative clocks are not implemented.
- Accounts use scrypt password hashing and HTTP-only cookies, but the prototype still needs rate limiting, CSRF protection, email verification, password reset, session persistence/rotation, security testing and privacy/legal pages before a public launch.
- Online rooms and matchmaking are in-memory and work on one server process. A server restart ends active matches; multi-server scaling needs a Socket.IO adapter and shared database/queue.
- Elo updates are applied to rated online games when both players are signed in. There is no anti-cheat or rating-abuse detection yet.
- Tournaments, spectators, friend lists, player search, moderation/reporting, reconnect/resume, server-authoritative online clocks and a Stockfish worker are not included in this version.
- The browser chess library is loaded from jsDelivr, so the board requires internet access.

## Before accepting real users

Have a developer review authentication, session and data security; move JSON storage to PostgreSQL; add rate limiting and CSRF protection; add moderation and abuse reporting; implement server-side clocks/reconnect; integrate Stockfish in a Web Worker; and run automated multiplayer/security tests.

## Main files

- `server.js` — Express APIs, authentication, persistent JSON records, Elo updates and Socket.IO multiplayer.
- `public/index.html` — application structure and dialogs.
- `public/style.css` — futuristic responsive design.
- `public/app.js` — board, computer opponent, coach, clocks, chat and client interactions.
