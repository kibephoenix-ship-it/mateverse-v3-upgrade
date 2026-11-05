const path = require("path");
const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.ALLOWED_ORIGIN || true } });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const waiting = [];
const profiles = new Map();
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "mateverse.json");
fs.mkdirSync(dataDir, { recursive: true });
let database = { users: {}, games: [] };
try { if (fs.existsSync(dataFile)) database = { ...database, ...JSON.parse(fs.readFileSync(dataFile, "utf8")) }; } catch (e) { console.error("Database load failed:", e.message); }
const sessions = new Map();
function persist() { const tmp = dataFile + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(database, null, 2)); fs.renameSync(tmp, dataFile); }
app.use(express.json({ limit: "20kb" }));
app.use("/vendor", express.static(path.join(__dirname, "node_modules", "chess.js", "dist", "esm")));
function readCookie(req, key) { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + key + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
function getUser(req) { const s = sessions.get(readCookie(req, "mv_session")); return s && s.expires > Date.now() ? database.users[s.username] || null : null; }
function safeUser(u) { return { username:u.username, displayName:u.displayName, rating:u.rating, games:u.games, wins:u.wins, draws:u.draws, losses:u.losses, computerGames:u.computerGames||0, computerWins:u.computerWins||0, computerDraws:u.computerDraws||0, computerLosses:u.computerLosses||0 }; }
function makeSession(res, username) { const token=crypto.randomBytes(32).toString("hex"); sessions.set(token,{username,expires:Date.now()+30*86400000}); res.setHeader("Set-Cookie",`mv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`); }
function passwordHash(password, salt=crypto.randomBytes(16).toString("hex")) { return {salt,hash:crypto.scryptSync(password,salt,64).toString("hex")}; }
function authRequired(req,res,next) { req.user=getUser(req); if(!req.user)return res.status(401).json({error:"Sign in to view your game history."}); next(); }
app.post("/api/register",(req,res)=>{ const username=String(req.body.username||"").trim().toLowerCase(), password=String(req.body.password||""), displayName=String(req.body.displayName||username).replace(/[^a-zA-Z0-9_ -]/g,"").trim().slice(0,18); if(!/^[a-z0-9_]{3,18}$/.test(username))return res.status(400).json({error:"Username must be 3?18 letters, numbers or underscores."}); if(password.length<8||password.length>100)return res.status(400).json({error:"Password must be at least 8 characters."}); if(database.users[username])return res.status(409).json({error:"That username is already taken."}); const pass=passwordHash(password); database.users[username]={username,displayName:displayName||username,...pass,rating:1200,games:0,wins:0,draws:0,losses:0};persist();makeSession(res,username);res.json({user:safeUser(database.users[username])}); });
app.post("/api/login",(req,res)=>{const username=String(req.body.username||"").trim().toLowerCase(), password=String(req.body.password||""), u=database.users[username]; if(!u)return res.status(401).json({error:"Incorrect username or password."});const hash=crypto.scryptSync(password,u.salt,64),expected=Buffer.from(u.hash,"hex");if(hash.length!==expected.length||!crypto.timingSafeEqual(hash,expected))return res.status(401).json({error:"Incorrect username or password."});makeSession(res,username);res.json({user:safeUser(u)});});
app.post("/api/logout",(req,res)=>{sessions.delete(readCookie(req,"mv_session"));res.setHeader("Set-Cookie","mv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");res.json({ok:true});});
app.get("/api/me",(req,res)=>{const u=getUser(req);res.json({user:u?safeUser(u):null});});
app.get("/api/leaderboard",(_req,res)=>res.json({players:Object.values(database.users).sort((a,b)=>b.rating-a.rating||b.wins-a.wins).slice(0,50).map(safeUser)}));
app.get("/api/games",authRequired,(req,res)=>res.json({games:database.games.filter(g=>g.players.includes(req.user.username)).slice(-30).reverse()}));
app.post("/api/games/computer",authRequired,(req,res)=>{
  const id=String(req.body.id||"").slice(0,80), pgn=String(req.body.pgn||""), userColor=req.body.color==="b"?"b":"w";
  if(!id||!pgn||pgn.length>10000)return res.status(400).json({error:"A completed game record is required."});
  const existing=database.games.find(g=>g.id===id&&g.players.includes(req.user.username));
  if(existing)return res.json({user:safeUser(req.user),game:existing});
  const completed=new Chess();
  try{completed.loadPgn(pgn);}catch(_e){return res.status(400).json({error:"The game record is not valid PGN."});}
  if(!completed.isGameOver())return res.status(400).json({error:"Only completed games can be saved."});
  const result=completed.isCheckmate()?(completed.turn()==="w"?"0-1":"1-0"):"1/2-1/2";
  req.user.computerGames=req.user.computerGames||0;req.user.computerWins=req.user.computerWins||0;req.user.computerLosses=req.user.computerLosses||0;req.user.computerDraws=req.user.computerDraws||0;
  req.user.computerGames++;
  if(result==="1/2-1/2")req.user.computerDraws++;
  else if(result===(userColor==="w"?"1-0":"0-1"))req.user.computerWins++;
  else req.user.computerLosses++;
  const gameRecord={id,players:[req.user.username],names:[req.user.displayName,"MateVerse AI"],result,reason:"computer",pgn,date:new Date().toISOString(),mode:"computer"};
  database.games.push(gameRecord);
  database.games=database.games.slice(-5000);
  persist();
  res.json({user:safeUser(req.user),game:gameRecord});
});
const MAX_CHAT_LENGTH = 240;

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "MateVerse" }));

function cleanName(value) {
  return String(value || "Player").replace(/[<>]/g, "").trim().slice(0, 18) || "Player";
}
function sendRoomState(code) {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit("roomState", {
    code,
    fen: room.game.fen(),
    history: room.game.history(),
    chat: room.chat,
    players: room.players,
    names: room.names,
    status: room.game.isGameOver()
      ? (room.game.isCheckmate() ? "Checkmate" : "Draw")
      : (room.game.turn() === "w" ? "White" : "Black") + " to move",
    gameOver: room.game.isGameOver()
  });
}
function makeRoom(code, white, black, names, type) {
  const room = {
    code, game: new Chess(), type,
    players: { w: white, b: black },
    names: { w: names.w, b: names.b },
    chat: [], users: { w: io.sockets.sockets.get(white)?.data.username || null, b: io.sockets.sockets.get(black)?.data.username || null }, recorded: false, drawOffer: null, createdAt: Date.now()
  };
  rooms.set(code, room);
  if (white) io.sockets.sockets.get(white)?.join(code);
  if (black) io.sockets.sockets.get(black)?.join(code);
  if (white) {
    const s = io.sockets.sockets.get(white);
    if (s) { s.data.room = code; s.data.color = "w"; }
  }
  if (black) {
    const s = io.sockets.sockets.get(black);
    if (s) { s.data.room = code; s.data.color = "b"; }
  }
  return room;
}
function roomCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 8).toUpperCase(); } while (rooms.has(code));
  return code;
}

function removeFromQueue(socket) {
  let index;
  while ((index = waiting.indexOf(socket.id)) !== -1) waiting.splice(index, 1);
  socket.data.queued = false;
}

function recordRoomResult(room, result, reason) {
  if (room.recorded) return; room.recorded = true; room.ended = true;
  const white = room.users?.w && database.users[room.users.w], black = room.users?.b && database.users[room.users.b];
  if (!white || !black) { io.to(room.code).emit("gameFinished", { result, reason, rated:false }); return; }
  const expected = 1 / (1 + Math.pow(10, (black.rating-white.rating)/400)); const actual = result === "1-0" ? 1 : result === "0-1" ? 0 : .5; const k=24;
  white.rating=Math.max(100,Math.round(white.rating+k*(actual-expected))); black.rating=Math.max(100,Math.round(black.rating+k*((1-actual)-(1-expected))));
  white.games++; black.games++;
  if(result==="1-0"){white.wins++;black.losses++;} else if(result==="0-1"){black.wins++;white.losses++;} else {white.draws++;black.draws++;}
  database.games.push({id:crypto.randomUUID(),players:[white.username,black.username],names:[white.displayName,black.displayName],result,reason,pgn:room.game.pgn(),date:new Date().toISOString()}); database.games=database.games.slice(-5000);persist();
  io.to(room.code).emit("ratingsUpdated",{white:safeUser(white),black:safeUser(black)}); io.to(room.code).emit("gameFinished",{result,reason,rated:true});
}

io.on("connection", socket => {
  socket.on("setProfile", ({ name, username }, reply = () => {}) => {
    const safe = cleanName(name);
    profiles.set(socket.id, safe);
    socket.data.name = safe;
    socket.data.username = username && database.users[username] ? username : null;
    reply({ ok: true, name: safe });
  });

  socket.on("createRoom", ({ code }, reply = () => {}) => {
    if (socket.data.room && !rooms.get(socket.data.room)?.ended) return reply({ ok: false, error: "Leave your current match first." });
    if (socket.data.room) leaveRoom(socket);
    removeFromQueue(socket);
    code = String(code || roomCode()).trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) return reply({ ok: false, error: "Room codes must be 4–8 letters or numbers." });
    if (rooms.has(code)) return reply({ ok: false, error: "That room already exists." });
    const name = socket.data.name || "Player";
    const room = makeRoom(code, socket.id, null, { w: name, b: "Waiting for player" }, "private");
    reply({ ok: true, code, color: "w", fen: room.game.fen(), name, names: room.names, ready: false });
    sendRoomState(code);
  });

  socket.on("joinRoom", ({ code }, reply = () => {}) => {
    if (socket.data.room && !rooms.get(socket.data.room)?.ended) return reply({ ok: false, error: "Leave your current match first." });
    if (socket.data.room) leaveRoom(socket);
    removeFromQueue(socket);
    code = String(code || "").trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return reply({ ok: false, error: "Room not found. Check the code." });
    if (room.players.b) return reply({ ok: false, error: "This room is full." });
    if (room.players.w === socket.id) return reply({ ok: false, error: "You created this room." });
    room.players.b = socket.id;
    room.names.b = socket.data.name || "Player";
    room.users.b = socket.data.username || null;
    socket.join(code);
    socket.data.room = code;
    socket.data.color = "b";
    reply({ ok: true, code, color: "b", fen: room.game.fen(), name: room.names.b, opponent: room.names.w, names: room.names, ready: true });
    sendRoomState(code);
    io.to(code).emit("systemMessage", { text: `${room.names.b} joined the match.` });
  });

  socket.on("findMatch", (_payload, reply = () => {}) => {
    if (socket.data.room && !rooms.get(socket.data.room)?.ended) return reply({ ok: false, error: "Leave your current match first." });
    if (socket.data.room) leaveRoom(socket);
    if (socket.data.queued || waiting.includes(socket.id)) {
      socket.data.queued = true;
      return reply({ ok: true, waiting: true, message: "Searching for an opponent…" });
    }
    for (let i = waiting.length - 1; i >= 0; i--) {
      const queuedSocket = io.sockets.sockets.get(waiting[i]);
      if (!queuedSocket || !queuedSocket.data.queued || queuedSocket.data.room) {
        if (queuedSocket) queuedSocket.data.queued = false;
        waiting.splice(i, 1);
      }
    }
    const index = waiting.findIndex(id => id !== socket.id);
    if (index < 0) {
      waiting.push(socket.id);
      socket.data.queued = true;
      reply({ ok: true, waiting: true, message: "Searching for an opponent…" });
      return;
    }
    const opponentId = waiting.splice(index, 1)[0];
    const opponent = io.sockets.sockets.get(opponentId);
    if (!opponent) return reply({ ok: false, error: "Opponent disconnected. Try again." });
    opponent.data.queued = false;
    socket.data.queued = false;
    const code = roomCode();
    const firstName = opponent.data.name || "Player";
    const secondName = socket.data.name || "Player";
    const room = makeRoom(code, opponentId, socket.id, { w: firstName, b: secondName }, "matchmaking");
    reply({ ok: true, waiting: false, code, color: "b", fen: room.game.fen(), opponent: firstName, names: room.names, ready: true });
    opponent.emit("matchFound", { code, color: "w", fen: room.game.fen(), opponent: secondName, names: room.names, ready: true });
    sendRoomState(code);
  });

  socket.on("cancelSearch", () => {
    removeFromQueue(socket);
  });

  socket.on("getRoomState", ({ code }) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (room && socket.data.room === room.code && Object.values(room.players).includes(socket.id)) sendRoomState(room.code);
  });

  socket.on("makeMove", ({ code, from, to, promotion }, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || socket.data.room !== room.code) return reply({ ok: false, error: "You are not in this room." });
    const color = socket.data.color;
    if (room.players[color] !== socket.id) return reply({ ok: false, error: "Player session mismatch." });
    if (room.ended || room.game.isGameOver()) return reply({ ok: false, error: "This game has ended." });
    if (room.game.turn() !== color) return reply({ ok: false, error: "It is not your turn." });
    try {
      const move = room.game.move({ from, to, promotion: promotion || "q" });
      if (!move) return reply({ ok: false, error: "Illegal move." });
      io.to(room.code).emit("moveMade", {
        fen: room.game.fen(), move: { san: move.san, from: move.from, to: move.to },
        history: room.game.history(), turn: room.game.turn(),
        gameOver: room.game.isGameOver(),
        status: room.game.isCheckmate() ? "Checkmate" : room.game.isDraw() ? "Draw" : "In progress"
      });
      reply({ ok: true });
      if (room.game.isGameOver()) recordRoomResult(room, room.game.isCheckmate() ? (room.game.turn() === "w" ? "0-1" : "1-0") : "1/2-1/2", room.game.isCheckmate() ? "checkmate" : "draw");
    } catch (_e) { reply({ ok: false, error: "Illegal move." }); }
  });

  socket.on("chatMessage", ({ code, message }, reply = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || socket.data.room !== room.code || !Object.values(room.players).includes(socket.id)) return reply({ ok: false, error: "You are not in this room." });
    const text = String(message || "").trim().slice(0, MAX_CHAT_LENGTH);
    if (!text) return reply({ ok: false, error: "Enter a message first." });
    const item = { name: socket.data.name || "Player", text, at: Date.now() };
    room.chat.push(item);
    room.chat = room.chat.slice(-50);
    io.to(room.code).emit("chatMessage", item);
    reply({ ok: true });
  });

  socket.on("offerDraw", ({ code }) => { const room=rooms.get(String(code||"").toUpperCase()); if(!room||socket.data.room!==room.code||room.ended||room.game.isGameOver())return; room.drawOffer=socket.id; socket.to(room.code).emit("drawOffered",{name:socket.data.name||"Opponent"}); });
  socket.on("respondDraw", ({ code, accept }) => { const room=rooms.get(String(code||"").toUpperCase()); if(!room||socket.data.room!==room.code||!room.drawOffer||room.drawOffer===socket.id)return; if(accept)recordRoomResult(room,"1/2-1/2","agreement");else io.to(room.code).emit("systemMessage",{text:"Draw offer declined."}); room.drawOffer=null; });
  socket.on("resign", ({ code }) => { const room=rooms.get(String(code||"").toUpperCase()); if(!room||socket.data.room!==room.code||room.ended||room.game.isGameOver())return; recordRoomResult(room,socket.data.color==="w"?"0-1":"1-0","resignation"); });
  socket.on("leaveRoom", () => leaveRoom(socket));
  socket.on("disconnect", () => {
    removeFromQueue(socket);
    leaveRoom(socket);
    profiles.delete(socket.id);
  });
});

function leaveRoom(socket) {
  const code = socket.data.room;
  if (!code) return;
  const room = rooms.get(code);
  socket.data.room = null;
  socket.data.color = null;
  if (!room) return;
  const color = room.players.w === socket.id ? "w" : room.players.b === socket.id ? "b" : null;
  if (!color) return;
  const opponentColor = color === "w" ? "b" : "w";
  const opponentId = room.players[opponentColor];
  const opponent = opponentId && io.sockets.sockets.get(opponentId);
  if (opponent) {
    opponent.data.room = null;
    opponent.data.color = null;
    opponent.leave(code);
    opponent.emit("opponentLeft", { message: `${room.names[color]} left the match.` });
  }
  socket.leave(code);
  rooms.delete(code);
}

server.listen(PORT, () => console.log(`MateVerse running at http://localhost:${PORT}`));
