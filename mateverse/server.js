const path = require("path");
const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const { Chess } = require("chess.js");
const { OAuth2Client } = require("google-auth-library");
const nodemailer = require("nodemailer");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.ALLOWED_ORIGIN || true } });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const waiting = [];
const profiles = new Map();
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const dataFile = path.join(dataDir, "mateverse.json");
const avatarDir = path.join(dataDir, "avatars");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(avatarDir, { recursive: true });
let database = { users: {}, games: [], friendRequests: [], friendChallenges: [], reviews: [] };
try { if (fs.existsSync(dataFile)) database = { ...database, ...JSON.parse(fs.readFileSync(dataFile, "utf8")) }; } catch (e) { console.error("Database load failed:", e.message); }
database.friendRequests ||= [];
database.friendChallenges ||= [];
database.reviews ||= [];
const sessions = new Map();
const requestLimits = new Map();
const googleClient = new OAuth2Client();
function persist() { const tmp = dataFile + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(database, null, 2)); fs.renameSync(tmp, dataFile); }
app.use(express.json({ limit: "30kb" }));
app.use("/vendor", express.static(path.join(__dirname, "node_modules", "chess.js", "dist", "esm")));
app.use("/uploads", express.static(avatarDir, { index: false, dotfiles: "deny" }));
function readCookie(req, key) { const m = (req.headers.cookie || "").match(new RegExp("(?:^|; )" + key + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
function getUser(req) { const s = sessions.get(readCookie(req, "mv_session")); return s && s.expires > Date.now() ? database.users[s.username] || null : null; }
function safeUser(u) { return { username:u.username, displayName:u.displayName, rating:u.rating, games:u.games, wins:u.wins, draws:u.draws, losses:u.losses, computerGames:u.computerGames||0, computerWins:u.computerWins||0, computerDraws:u.computerDraws||0, computerLosses:u.computerLosses||0, avatarUrl:u.avatarUrl||"", profileVisibility:u.profileVisibility||"public" }; }
function makeSession(res, username) { const token=crypto.randomBytes(32).toString("hex"); sessions.set(token,{username,expires:Date.now()+30*86400000}); res.setHeader("Set-Cookie",`mv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`); }
function passwordHash(password, salt=crypto.randomBytes(16).toString("hex")) { return {salt,hash:crypto.scryptSync(password,salt,64).toString("hex")}; }
function authRequired(req,res,next) { req.user=getUser(req); if(!req.user)return res.status(401).json({error:"Sign in to view your game history."}); next(); }
app.post("/api/logout",(req,res)=>{sessions.delete(readCookie(req,"mv_session"));res.setHeader("Set-Cookie","mv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");res.json({ok:true});});
app.get("/api/me",(req,res)=>{const u=getUser(req);res.json({user:u?safeUser(u):null});});
function rateLimit(req,key,limit,windowMs) {
  const now=Date.now(),id=`${key}:${req.ip}`,recent=(requestLimits.get(id)||[]).filter(at=>now-at<windowMs);
  if(recent.length>=limit)return false;
  recent.push(now);requestLimits.set(id,recent);return true;
}
function emailTransport() {
  if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS||!process.env.SMTP_FROM)return null;
  return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true",auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
}
async function sendVerification(email,token,origin) {
  const transport=emailTransport();
  if(!transport)throw new Error("SMTP delivery is not configured.");
  const base=(process.env.PUBLIC_URL||origin).replace(/\/$/,"");
  await transport.sendMail({from:process.env.SMTP_FROM,to:email,subject:"Verify your MateVerse email",text:`Verify your email address to activate MateVerse: ${base}/?verify=${encodeURIComponent(token)}\nThis link expires in one hour.`});
}
function issueVerification(user) {
  const token=crypto.randomBytes(32).toString("hex");
  user.emailVerification={hash:crypto.createHash("sha256").update(token).digest("hex"),expires:Date.now()+3600000};
  return token;
}
function emailValid(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254;}
function sameFriend(a,b){return database.friendRequests.some(r=>r.status==="accepted"&&((r.from===a&&r.to===b)||(r.from===b&&r.to===a)));}
function publicProfile(user,viewer) {
  const isOwner=viewer?.username===user.username,isFriend=viewer&&sameFriend(viewer.username,user.username),visible=user.profileVisibility!=="friends"||isOwner||isFriend;
  if(!visible)return {username:user.username,displayName:user.displayName,profileVisibility:"friends",isFriend:false,private:true};
  return {username:user.username,displayName:user.displayName,rating:user.rating,games:user.games,wins:user.wins,losses:user.losses,draws:user.draws,computerGames:user.computerGames||0,computerWins:user.computerWins||0,computerLosses:user.computerLosses||0,computerDraws:user.computerDraws||0,avatarUrl:user.avatarUrl||"",profileVisibility:user.profileVisibility||"public",socialLinks:user.socialLinks||{instagram:"",facebook:""},isFriend:!!isFriend};
}
function connectedSocket(username){return[...io.sockets.sockets.values()].find(s=>s.data.username===username&&!s.data.room);}
function uniqueUsername(seed) {
  const base=String(seed||"player").toLowerCase().replace(/[^a-z0-9_]/g,"_").replace(/^_+|_+$/g,"").slice(0,14)||"player";
  let value=base,index=1;while(database.users[value])value=`${base.slice(0,14)}_${index++}`;return value;
}
app.get("/api/config",(_req,res)=>res.json({googleClientId:process.env.GOOGLE_CLIENT_ID||""}));
app.post("/api/register",async(req,res)=>{
  if(!rateLimit(req,"register",5,3600000))return res.status(429).json({error:"Too many registration attempts. Try again later."});
  const username=String(req.body.username||"").trim().toLowerCase(),email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||""),displayName=String(req.body.displayName||username).replace(/[^a-zA-Z0-9_ -]/g,"").trim().slice(0,18);
  if(!/^[a-z0-9_]{3,18}$/.test(username))return res.status(400).json({error:"Username must be 3–18 letters, numbers or underscores."});
  if(!emailValid(email))return res.status(400).json({error:"Enter a valid email address."});
  if(password.length<8||password.length>100)return res.status(400).json({error:"Password must be 8–100 characters."});
  if(!emailTransport())return res.status(503).json({error:"Email verification is not configured yet. Please try again later."});
  if(database.users[username])return res.status(409).json({error:"That username is already taken."});
  if(Object.values(database.users).some(user=>user.email===email))return res.status(409).json({error:"That email is already registered."});
  const user={username,email,emailVerified:false,displayName:displayName||username,...passwordHash(password),rating:1200,games:0,wins:0,draws:0,losses:0,avatarUrl:"",socialLinks:{instagram:"",facebook:""},profileVisibility:"public"};
  const token=issueVerification(user);database.users[username]=user;persist();
  try{await sendVerification(email,token,`${req.protocol}://${req.get("host")}`);}
  catch(error){console.error("Verification email delivery failed:",error.message);return res.status(503).json({error:"Your account is pending verification, but the email could not be sent. Resend the verification link after the email service is available."});}
  res.json({verificationRequired:true,message:"Check your email for a verification link."});
});
app.post("/api/verify-email",(req,res)=>{
  const token=String(req.body.token||"");
  if(!/^[a-f0-9]{64}$/.test(token))return res.status(400).json({error:"This verification link is invalid or expired."});
  const hash=crypto.createHash("sha256").update(token).digest("hex");
  const user=Object.values(database.users).find(item=>item.emailVerification?.hash===hash&&item.emailVerification.expires>Date.now());
  if(!user)return res.status(400).json({error:"This verification link is invalid or expired."});
  user.emailVerified=true;delete user.emailVerification;persist();res.json({ok:true,message:"Email verified. You can now sign in."});
});
app.post("/api/resend-verification",async(req,res)=>{
  if(!rateLimit(req,"resend-verification",5,3600000))return res.status(429).json({error:"Too many requests. Try again later."});
  const email=String(req.body.email||"").trim().toLowerCase(),user=Object.values(database.users).find(item=>item.email===email&&!item.emailVerified);
  if(!user)return res.json({ok:true,message:"If that account needs verification, a link will be sent."});
  const token=issueVerification(user);persist();
  try{await sendVerification(email,token,`${req.protocol}://${req.get("host")}`);res.json({ok:true,message:"If that account needs verification, a link will be sent."});}
  catch(error){console.error("Verification email delivery failed:",error.message);res.status(503).json({error:"The verification email could not be sent. Please try again later."});}
});
app.post("/api/login",(req,res)=>{
  const identifier=String(req.body.identifier||req.body.username||"").trim().toLowerCase(),password=String(req.body.password||""),u=database.users[identifier]||Object.values(database.users).find(user=>user.email===identifier);
  if(!u||!u.hash||!u.salt)return res.status(401).json({error:"Incorrect email/username or password."});
  const hash=crypto.scryptSync(password,u.salt,64),expected=Buffer.from(u.hash,"hex");
  if(hash.length!==expected.length||!crypto.timingSafeEqual(hash,expected))return res.status(401).json({error:"Incorrect email/username or password."});
  if(u.email&&!u.emailVerified)return res.status(403).json({error:"Verify your email before signing in.",verificationRequired:true});
  makeSession(res,u.username);res.json({user:safeUser(u)});
});
app.post("/api/auth/google",async(req,res)=>{
  const clientId=process.env.GOOGLE_CLIENT_ID,credential=String(req.body.credential||"");
  if(!clientId)return res.status(503).json({error:"Google sign-in is not configured yet."});
  if(!credential)return res.status(400).json({error:"Google credential is required."});
  try{
    const ticket=await googleClient.verifyIdToken({idToken:credential,audience:clientId}),payload=ticket.getPayload();
    if(!payload?.email||payload.email_verified!==true)return res.status(401).json({error:"Google must provide a verified email address."});
    const email=payload.email.toLowerCase();
    let user=Object.values(database.users).find(item=>item.googleId===payload.sub||item.email===email);
    if(!user){const username=uniqueUsername(payload.name||email.split("@")[0]);user=database.users[username]={username,email,emailVerified:true,googleId:payload.sub,displayName:String(payload.name||username).replace(/[^a-zA-Z0-9_ -]/g,"").trim().slice(0,18)||username,rating:1200,games:0,wins:0,draws:0,losses:0,avatarUrl:"",socialLinks:{instagram:"",facebook:""},profileVisibility:"public"};}
    else{user.googleId=payload.sub;user.email=email;user.emailVerified=true;if(!user.displayName&&payload.name)user.displayName=String(payload.name).slice(0,18);}
    delete user.emailVerification;persist();makeSession(res,user.username);res.json({user:safeUser(user)});
  }catch(error){console.error("Google sign-in verification failed:",error.message);res.status(401).json({error:"Google sign-in could not be verified. Please try again."});}
});
app.get("/api/profile",authRequired,(req,res)=>res.json({user:{...safeUser(req.user),email:req.user.email||"",socialLinks:req.user.socialLinks||{instagram:"",facebook:""}}}));
app.put("/api/profile",authRequired,(req,res)=>{
  const name=String(req.body.displayName||req.user.displayName).replace(/[^a-zA-Z0-9_ -]/g,"").trim().slice(0,18),visibility=req.body.profileVisibility,socials=req.body.socialLinks||{},checked={};
  for(const network of ["instagram","facebook"]){
    const value=String(socials[network]||"").trim();
    if(value){try{const url=new URL(value);const host=url.hostname.toLowerCase(),allowed=network==="instagram"?(host==="instagram.com"||host.endsWith(".instagram.com")):(host==="facebook.com"||host.endsWith(".facebook.com"));if(url.protocol!=="https:"||!allowed)throw new Error();checked[network]=url.toString();}catch{return res.status(400).json({error:`Enter a valid HTTPS ${network} profile URL.`});}}
    else checked[network]="";
  }
  if(!name)return res.status(400).json({error:"Display name cannot be empty."});
  if(!["public","friends"].includes(visibility))return res.status(400).json({error:"Choose a valid profile visibility."});
  req.user.displayName=name;req.user.profileVisibility=visibility;req.user.socialLinks=checked;persist();res.json({user:{...safeUser(req.user),socialLinks:checked}});
});
app.post("/api/profile/avatar",authRequired,express.raw({type:["image/png","image/jpeg","image/webp"],limit:"1mb"}),(req,res)=>{
  const type=req.headers["content-type"],buffer=req.body;
  if(!Buffer.isBuffer(buffer)||buffer.length<12)return res.status(400).json({error:"Choose a PNG, JPEG or WebP image smaller than 1 MB."});
  const valid=type==="image/png"?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==="image/jpeg"?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:type==="image/webp"?buffer.toString("ascii",0,4)==="RIFF"&&buffer.toString("ascii",8,12)==="WEBP":false;
  if(!valid)return res.status(400).json({error:"The uploaded file does not match a supported image format."});
  const ext=type==="image/png"?"png":type==="image/jpeg"?"jpg":"webp",filename=`${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(avatarDir,filename),buffer,{flag:"wx"});
  const old=req.user.avatarUrl;if(old?.startsWith("/uploads/")){const oldPath=path.join(avatarDir,path.basename(old));if(fs.existsSync(oldPath))fs.unlinkSync(oldPath);}
  req.user.avatarUrl=`/uploads/${filename}`;persist();res.json({avatarUrl:req.user.avatarUrl});
});
app.get("/api/players",(req,res)=>{
  const query=String(req.query.q||"").trim().toLowerCase();if(query.length<2)return res.json({players:[]});
  const viewer=getUser(req),players=Object.values(database.users).filter(user=>user.username!==viewer?.username&&(user.username.includes(query)||user.displayName.toLowerCase().includes(query))).slice(0,20).map(user=>publicProfile(user,viewer));
  res.json({players});
});
app.get("/api/players/:username",(req,res)=>{
  const user=database.users[String(req.params.username||"").toLowerCase()];
  if(!user)return res.status(404).json({error:"Player not found."});
  res.json({player:publicProfile(user,getUser(req))});
});
app.get("/api/friends",authRequired,(req,res)=>{
  const username=req.user.username;
  const friends=database.friendRequests.filter(item=>item.status==="accepted"&&(item.from===username||item.to===username)).map(item=>database.users[item.from===username?item.to:item.from]).filter(Boolean).map(user=>publicProfile(user,req.user));
  const requests=database.friendRequests.filter(item=>item.status==="pending"&&item.to===username).map(item=>({id:item.id,player:publicProfile(database.users[item.from],req.user)}));
  const challenges=database.friendChallenges.filter(item=>item.status==="pending"&&item.to===username&&item.expires>Date.now()).map(item=>({id:item.id,from:item.from,displayName:database.users[item.from]?.displayName||item.from}));
  res.json({friends,requests,challenges});
});
app.post("/api/friends/requests",authRequired,(req,res)=>{
  const to=String(req.body.username||"").trim().toLowerCase(),target=database.users[to],from=req.user.username;
  if(!target||to===from)return res.status(404).json({error:"Player not found."});
  if(sameFriend(from,to))return res.status(409).json({error:"You are already friends."});
  const existing=database.friendRequests.find(item=>item.status==="pending"&&((item.from===from&&item.to===to)||(item.from===to&&item.to===from)));
  if(existing){if(existing.to===from){existing.status="accepted";persist();return res.json({ok:true,accepted:true});}return res.status(409).json({error:"Friend request already sent."});}
  const request={id:crypto.randomUUID(),from,to,status:"pending",createdAt:Date.now()};database.friendRequests.push(request);persist();
  for(const socket of io.sockets.sockets.values())if(socket.data.username===to)socket.emit("friendRequestReceived",{id:request.id,from});
  res.json({ok:true});
});
app.post("/api/friends/requests/:id/respond",authRequired,(req,res)=>{
  const request=database.friendRequests.find(item=>item.id===req.params.id&&item.to===req.user.username&&item.status==="pending");
  if(!request)return res.status(404).json({error:"Friend request not found."});
  if(req.body.accept===true)request.status="accepted";else database.friendRequests=database.friendRequests.filter(item=>item.id!==request.id);
  persist();res.json({ok:true});
});
app.post("/api/friends/:username/challenges",authRequired,(req,res)=>{
  const to=String(req.params.username||"").toLowerCase();
  if(!sameFriend(req.user.username,to))return res.status(403).json({error:"You can challenge only a saved friend."});
  if(!connectedSocket(req.user.username))return res.status(409).json({error:"You must be online and available to send a match request."});
  const target=connectedSocket(to);if(!target)return res.status(409).json({error:"Your friend is offline or already in a game."});
  const challenge={id:crypto.randomUUID(),from:req.user.username,to,status:"pending",expires:Date.now()+300000};
  database.friendChallenges.push(challenge);database.friendChallenges=database.friendChallenges.filter(item=>item.expires>Date.now()).slice(-500);persist();
  target.emit("friendChallengeRequest",{id:challenge.id,username:req.user.username,displayName:req.user.displayName});res.json({ok:true});
});
app.post("/api/friend-challenges/:id/respond",authRequired,(req,res)=>{
  const challenge=database.friendChallenges.find(item=>item.id===req.params.id&&item.to===req.user.username&&item.status==="pending"&&item.expires>Date.now());
  if(!challenge)return res.status(404).json({error:"This match request has expired."});
  if(req.body.accept!==true){challenge.status="declined";persist();return res.json({ok:true,accepted:false});}
  const from=connectedSocket(challenge.from),to=connectedSocket(challenge.to);
  if(!from||!to)return res.status(409).json({error:"Both players must be online and available to start a match."});
  const code=roomCode(),names={w:from.data.name||database.users[challenge.from].displayName,b:to.data.name||database.users[challenge.to].displayName};
  makeRoom(code,from.id,to.id,names,"friend");challenge.status="accepted";challenge.roomCode=code;persist();
  from.emit("friendChallengeAccepted",{code,color:"w",fen:new Chess().fen(),opponent:names.b,names,ready:true});
  to.emit("friendChallengeAccepted",{code,color:"b",fen:new Chess().fen(),opponent:names.w,names,ready:true});
  sendRoomState(code);res.json({ok:true,accepted:true,code});
});
app.get("/api/reviews",(_req,res)=>{
  const reviews=database.reviews.slice(-100).reverse(),average=reviews.length?Math.round(reviews.reduce((sum,item)=>sum+item.rating,0)/reviews.length*10)/10:0;
  res.json({reviews,average,count:reviews.length});
});
app.post("/api/reviews",(req,res)=>{
  if(!rateLimit(req,"review",3,3600000))return res.status(429).json({error:"Please wait before posting another review."});
  const rating=Number(req.body.rating),comment=String(req.body.comment||"").trim().slice(0,600),displayName=String(req.body.displayName||"Guest").replace(/[<>]/g,"").trim().slice(0,32)||"Guest";
  if(!Number.isInteger(rating)||rating<1||rating>5)return res.status(400).json({error:"Choose a rating from 1 to 5 stars."});
  if(comment.length<8)return res.status(400).json({error:"Please write at least 8 characters."});
  const user=getUser(req),existing=user&&database.reviews.find(item=>item.username===user.username);
  if(existing){existing.rating=rating;existing.comment=comment;existing.displayName=user.displayName;existing.date=new Date().toISOString();persist();return res.json({review:existing});}
  const review={id:crypto.randomUUID(),username:user?.username||null,displayName:user?.displayName||displayName,rating,comment,date:new Date().toISOString()};
  database.reviews.push(review);database.reviews=database.reviews.slice(-1000);persist();res.json({review});
});
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
  socket.on("setProfile", ({ name }, reply = () => {}) => {
    const user=getUser({headers:{cookie:socket.handshake.headers.cookie||""}});
    const safe = user?.displayName||cleanName(name);
    profiles.set(socket.id, safe);
    socket.data.name = safe;
    socket.data.username = user?.username||null;
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
