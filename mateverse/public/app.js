import { Chess } from "/vendor/chess.js";

const $ = id => document.getElementById(id);
const socket = io();
let game = new Chess(), mode = "computer", difficulty = 2;
let selected = null, targets = [], myColor = "w", roomCode = "";
let onlineReady = false, aiBusy = false, lastMove = null;
let account = null, loginMode = false, boardFlipped = false, clockSeconds = 300, clocks = {w:300,b:300}, clockTimer = null, flagged = false, soundOn = true;
let name = localStorage.getItem("mateverse-name") || "Guest";
let stats = JSON.parse(localStorage.getItem("mateverse-stats") || '{"wins":0,"games":0}');
const glyph = { w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"}, b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"} };
const pieceValue = {p:100,n:320,b:335,r:500,q:900,k:20000};

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300);}
function setStatus(a,b=""){$("status").textContent=a;$("status-detail").textContent=b;}
function updateStats(){ $("stat-wins").textContent=stats.wins;$("stat-games").textContent=stats.games;$("stat-rate").textContent=stats.games?Math.round(stats.wins/stats.games*100)+"%":"—";localStorage.setItem("mateverse-stats",JSON.stringify(stats));}
function saveResult(){if(!game.isGameOver())return;stats.games++;if(game.isCheckmate()&&game.turn()!==myColor)stats.wins++;updateStats();}
function clearSelection(){selected=null;targets=[];}
function render(){
 const board=$("board");board.innerHTML="";
 const orientation=(boardFlipped ? (myColor==="w"?"b":"w") : myColor);
 const ranks=orientation==="w"?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];
 const files=orientation==="w"?"abcdefgh":"hgfedcba";
 const legal=game.moves({verbose:true});
 for(const rank of ranks)for(const file of files){
  const sq=file+rank,p=game.get(sq),btn=document.createElement("button");
  btn.className="square "+((files.indexOf(file)+rank)%2?"dark":"light");
  if(selected===sq)btn.classList.add("selected");
  if(lastMove&&(lastMove.from===sq||lastMove.to===sq))btn.classList.add("last-move");
  btn.setAttribute("aria-label",sq+(p?` ${p.color} ${p.type}`:""));
  if(p){const span=document.createElement("span");span.className="piece "+(p.color==="w"?"white":"black");span.textContent=glyph[p.color][p.type];btn.append(span);}
  if(targets.includes(sq)){const dot=document.createElement("span");dot.className=p?"legal-capture":"legal-dot";btn.append(dot);}
  btn.addEventListener("click",()=>squareClick(sq));board.append(btn);
 }
 renderMoves();updateGameStatus();updateStats();
}
function renderMoves(){const ol=$("move-list"),h=game.history();ol.innerHTML="";$("move-total").textContent=h.length+" plies";if(!h.length){const li=document.createElement("li");li.className="empty";li.textContent="Your game moves appear here.";ol.append(li);return;}for(let i=0;i<h.length;i+=2){const li=document.createElement("li");li.textContent=`${Math.floor(i/2)+1}. ${h[i]}${h[i+1]?"   "+h[i+1]:""}`;ol.append(li);}}
function updateGameStatus(){if(game.isCheckmate())setStatus("Checkmate",`${game.turn()==="w"?"Black":"White"} wins.`);else if(game.isDraw())setStatus("Draw",game.isStalemate()?"Stalemate.":"Draw by chess rules.");else setStatus((game.turn()==="w"?"White":"Black")+" to move"+(game.isCheck()?" · Check!":""),mode==="online"?(onlineReady?"Room "+roomCode:"Waiting for opponent…"):"Choose a piece to see its legal moves.");}
function squareClick(sq){
 if(game.isGameOver()||aiBusy||flagged)return;
 if(mode==="online"&&(!onlineReady||game.turn()!==myColor))return;
 const p=game.get(sq);
 if(selected&&targets.includes(sq)){makeMove(selected,sq);return;}
 if(p&&p.color===game.turn()){selected=sq;targets=game.moves({square:sq,verbose:true}).map(m=>m.to);}else clearSelection();
 render();
}
function makeMove(from,to,promotion="q"){
    if(mode==="online"){
        if(!onlineReady||!roomCode||game.turn()!==myColor)return;
        const snapshot=game.fen();
        let m;
        try{m=game.move({from,to,promotion});if(!m)return;}catch(e){toast("Illegal move.");return;}
        clearSelection();lastMove={from:m.from,to:m.to};playMoveSound(m);render();
        socket.emit("makeMove",{code:roomCode,from,to,promotion},r=>{
            if(!r?.ok){game.load(snapshot);clearSelection();lastMove=null;render();toast(r?.error||"Move not sent.");socket.emit("getRoomState",{code:roomCode});}
        });
        return;
    }
 try{
  const m=game.move({from,to,promotion});if(!m)return;
  clearSelection();lastMove={from:m.from,to:m.to};playMoveSound(m);
  render();if(game.isGameOver())saveResult();
  if(mode==="computer"&&!game.isGameOver()&&game.turn()==="b"){aiBusy=true;setStatus("Computer thinking…","Calculating a reply.");setTimeout(computerMove,350);}
 }catch(e){toast("Illegal move.");}
}
function evaluate(chess,side){
 let score=0;const board=chess.board();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;const sign=p.color===side?1:-1;score+=sign*pieceValue[p.type];const center=3.5-(Math.abs(3.5-r)+Math.abs(3.5-c))/2;if(["n","b"].includes(p.type))score+=sign*center*7;if(p.type==="p")score+=sign*(p.color==="w"?6-r:r-1)*4;}
 if(chess.isCheckmate())return chess.turn()===side?-99999:99999;if(chess.isDraw())return 0;return score;
}
function searchBest(chess,side,depth){
 const moves=chess.moves({verbose:true});if(!moves.length)return {score:evaluate(chess,side),move:null};
 const maximizing=chess.turn()===side;let best={score:maximizing?-Infinity:Infinity,move:null};
 for(const m of moves){
  const next=new Chess(chess.fen());next.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
  const score=depth<=1||next.isGameOver()?evaluate(next,side):searchBest(next,side,depth-1).score;
  if((maximizing&&score>best.score)||(!maximizing&&score<best.score))best={score,move:m};
 }
 return best;
}
function chooseMove(chess,side,level=2){
 const moves=chess.moves({verbose:true});if(!moves.length)return null;
 if(level===1)return moves[Math.floor(Math.random()*moves.length)];
 const depth=level===2?2:3;let best=null,bestScore=-Infinity;
 for(const m of moves){
  const next=new Chess(chess.fen());next.move({from:m.from,to:m.to,promotion:m.promotion||"q"});
  const score=depth===1?evaluate(next,side):searchBest(next,side,depth-1).score;
  const noisy=score+(Math.random()*.2);
  if(noisy>bestScore){bestScore=noisy;best=m;}
 }
 return best;
}
function computerMove(){if(mode!=="computer"||game.turn()!=="b"||game.isGameOver()||flagged){aiBusy=false;return;}const m=chooseMove(game,"b",difficulty);if(m){const made=game.move({from:m.from,to:m.to,promotion:m.promotion||"q"});lastMove={from:made.from,to:made.to};playMoveSound(made);}aiBusy=false;render();if(game.isGameOver())saveResult();}
function explainMove(m){
 const piece=game.get(m.from);const target=game.get(m.to);
 const labels={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
 let reason=target?`It captures the ${labels[target.type]}. `:"It develops your "+labels[piece.type]+". ";
 if(m.san.includes("+"))reason+="It gives check. ";
 if(m.san.includes("#"))reason+="It is checkmate. ";
 if(["d4","e4","d5","e5"].includes(m.to))reason+="It fights for the centre. ";
 return reason;
}
function giveHint(){
 if(game.isGameOver())return;
 const m=chooseMove(game,game.turn(),3);if(!m){$("coach-message").textContent="No legal moves available.";return;}
 selected=m.from;targets=[m.to];render();
 const desc=`Suggested move: ${m.san} (${m.from} → ${m.to}). ${explainMove(m)} A suggestion is not a guaranteed win.`;
 $("coach-message").textContent=desc;$("coach-result").textContent=desc;
}
function resetGame(){game=new Chess();clearSelection();lastMove=null;aiBusy=false;flagged=false;resetClocks();render();$("coach-message").textContent="Get a move suggestion with a quick explanation.";$("coach-result").textContent="Start a game, then ask Mate Coach to analyse your position.";}
function showMode(next){
 mode=next;$("chat-card").hidden=mode!=="online";updateClocks();document.querySelectorAll(".mode-choice").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));
 $("computer-options").hidden=mode!=="computer";$("online-options").hidden=mode!=="online";$("friend-options").hidden=mode!=="friend";
 $("black-name").textContent=mode==="computer"?"Computer":mode==="online"?"Online opponent":"Friend";
 $("black-caption").textContent="Black · Opponent";$("white-name").textContent=name;$("white-caption").textContent="White · You";
 if(mode!=="online"){
  socket.emit("cancelSearch");
  if(roomCode)socket.emit("leaveRoom");
  roomCode="";onlineReady=false;
 }
 myColor="w";resetGame();
}
function setRoom(result,friend=false){
 roomCode=result.code;myColor=result.color;onlineReady=!!result.ready;$ ("chat-card").hidden=false;$("chat-messages").innerHTML="";
 game=new Chess(result.fen);clearSelection();lastMove=null;
 $("black-name").textContent=result.color==="w"?"Waiting for player":result.opponent||"Opponent";
 $("white-name").textContent=result.color==="w"?name:(result.opponent||"Opponent");
 $("white-caption").textContent="White";$("black-caption").textContent="Black";
 if(myColor==="b"){$("white-name").textContent=result.opponent||"Opponent";$("black-name").textContent=name;}
 $("online-message").textContent=`Room ${roomCode}. ${friend?"Share this code with your friend.":"Match found!"} You are ${myColor==="w"?"White":"Black"}.`;
 render();
}
function createRoom(){const code=Math.random().toString(36).slice(2,8).toUpperCase();socket.emit("createRoom",{code},r=>{if(!r?.ok)return toast(r?.error||"Could not create room.");setRoom(r,true);});}
function joinRoom(){const code=$("room-code").value.trim().toUpperCase();if(!code)return toast("Enter a room code.");socket.emit("joinRoom",{code},r=>{if(!r?.ok)return toast(r?.error||"Could not join.");setRoom(r,true);});}

function formatClock(seconds){const m=Math.floor(Math.max(0,seconds)/60),s=Math.max(0,seconds)%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function resetClocks(){clearInterval(clockTimer);clockSeconds=Number($("time-control")?.value||300);clocks={w:clockSeconds,b:clockSeconds};flagged=false;updateClocks();if(clockSeconds>0&&mode!=="online")clockTimer=setInterval(()=>{if(game.isGameOver()||flagged||mode==="online")return;const side=game.turn();clocks[side]=Math.max(0,clocks[side]-1);updateClocks();if(clocks[side]===0){flagged=true;clearInterval(clockTimer);setStatus("Time expired",`${side==="w"?"Black":"White"} wins on time.`);toast("Time expired.");}},1000);}
function updateClocks(){if($("white-clock"))$("white-clock").textContent=mode==="online"?"—":clockSeconds?formatClock(clocks.w):"∞";if($("black-clock"))$("black-clock").textContent=mode==="online"?"—":clockSeconds?formatClock(clocks.b):"∞";$("white-clock")?.classList.toggle("active-clock",game.turn()==="w");$("black-clock")?.classList.toggle("active-clock",game.turn()==="b");}
function playMoveSound(move){if(!soundOn)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=move?.captured?220:440;g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.09);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.1);o.onended=()=>c.close();}catch(e){}}
async function api(path,body){const r=await fetch(path,{method:body?"POST":"GET",headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined,credentials:"same-origin"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Request failed.");return data;}
function openProfile(){$("profile-modal").hidden=false;$("account-error").textContent="";if(account){$("account-form").hidden=true;$("account-signed-in").hidden=false;$("account-summary").textContent=`Signed in as ${account.displayName} (@${account.username}) · ${account.rating} rating · ${account.games} rated games.`;}else{$("account-form").hidden=false;$("account-signed-in").hidden=true;}}
function switchAuthMode(){loginMode=!loginMode;$("account-title").innerHTML=loginMode?'Welcome <em>back.</em>':'Enter the <em>Verse.</em>';$ ("account-display").hidden=loginMode;$("account-display").previousElementSibling.hidden=loginMode;$("account-submit").textContent=loginMode?"Sign in":"Create account";$("account-switch").textContent=loginMode?"New to MateVerse? Create an account":"Already have an account? Sign in";$("account-error").textContent="";}
async function submitAccount(){const username=$("account-name").value.trim(),password=$("account-password").value,displayName=$("account-display").value.trim();try{const data=await api(loginMode?"/api/login":"/api/register",{username,password,displayName});account=data.user;name=account.displayName;localStorage.setItem("mateverse-name",name);$("profile-name").textContent=`${name} · ${account.rating}`;socket.emit("setProfile",{name,username:account.username});openProfile();loadLeaderboard();loadHistory();toast(loginMode?"Welcome back!":"Account created!");}catch(e){$("account-error").textContent=e.message;}}
async function logout(){await api("/api/logout",{});account=null;$("profile-name").textContent=name+" · Sign in";socket.emit("setProfile",{name});openProfile();loadLeaderboard();toast("Signed out.");}
async function loadAccount(){try{const d=await api("/api/me");account=d.user;if(account){name=account.displayName;$("profile-name").textContent=`${name} · ${account.rating}`;socket.emit("setProfile",{name,username:account.username});loadHistory();}else $("profile-name").textContent=name+" · Sign in";}catch(e){}}
async function loadLeaderboard(){try{const d=await api("/api/leaderboard");const el=$("leaderboard");el.innerHTML="";if(!d.players.length){el.textContent="No rated players yet. Create an account and play a rated match to claim the first spot.";return;}const table=document.createElement("table");table.innerHTML="<thead><tr><th>#</th><th>PLAYER</th><th>RATING</th><th>GAMES</th><th>W-L-D</th></tr></thead>";const body=document.createElement("tbody");d.players.forEach((u,i)=>{const tr=document.createElement("tr");[i+1,u.displayName,u.rating,u.games,`${u.wins}-${u.losses}-${u.draws}`].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});body.append(tr);});table.append(body);el.append(table);}catch(e){$("leaderboard").textContent="Leaderboard is unavailable while offline.";}}
async function loadHistory(){if(!account){$("game-history").textContent="Sign in to load your matches.";return;}try{const d=await api("/api/games");const el=$("game-history");el.innerHTML="";if(!d.games.length){el.textContent="No rated online games yet.";return;}d.games.forEach(g=>{const row=document.createElement("div");row.className="game-record";const title=document.createElement("b");title.textContent=`${g.names[0]} vs ${g.names[1]} · ${g.result}`;const meta=document.createElement("small");meta.textContent=`${new Date(g.date).toLocaleString()} · ${g.reason}`;const btn=document.createElement("button");btn.className="action ghost";btn.textContent="Download PGN";btn.onclick=()=>downloadText("mateverse-game.pgn",g.pgn);row.append(title,meta,btn);el.append(row);});}catch(e){$("game-history").textContent=e.message;}}
function downloadText(filename,text){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function addChat(item){const el=$("chat-messages"),line=document.createElement("p"),who=document.createElement("b"),msg=document.createElement("span");who.textContent=item.name+": ";msg.textContent=item.text;line.append(who,msg);el.append(line);el.scrollTop=el.scrollHeight;}
function exportPgn(){downloadText("mateverse-game.pgn",game.pgn()||"[Event \"MateVerse\"]\n[Result \"*\"]\n\n*");}

socket.on("connect",()=>{$("connection").textContent="SERVER CONNECTED";socket.emit("setProfile",{name,username:account?.username});});
socket.on("disconnect",()=>{$("connection").textContent="OFFLINE";});
socket.on("matchFound",data=>{setRoom(data,false);$("online-message").textContent=`Match found! Playing ${data.opponent}. Room ${data.code}.`;});
socket.on("roomState",data=>{if(mode!=="online"||data.code!==roomCode)return;game.load(data.fen);onlineReady=!!(data.players.w&&data.players.b);render();});
socket.on("moveMade",data=>{if(mode!=="online"||!data?.fen)return;game.load(data.fen);clearSelection();if(data.move){lastMove={from:data.move.from,to:data.move.to};playMoveSound(data.move);}render();if(game.isGameOver())saveResult();});
socket.on("systemMessage",data=>{$("online-message").textContent=data.text;onlineReady=true;});
socket.on("opponentLeft",data=>{onlineReady=false;$("online-message").textContent=data.message+" You can wait or start another room.";toast("Opponent disconnected.");});
socket.on("chatMessage",data=>addChat(data));
socket.on("drawOffered",data=>{if(confirm(`${data.name} offers a draw. Accept?`))socket.emit("respondDraw",{code:roomCode,accept:true});else socket.emit("respondDraw",{code:roomCode,accept:false});});
socket.on("gameFinished",data=>{setStatus(data.result==="1/2-1/2"?"Draw":"Game finished",`${data.reason}. ${data.rated?"Rated result saved.":"Sign in on both sides to record ratings."}`);toast(data.rated?"Rated game recorded.":"Game finished.");loadLeaderboard();loadHistory();});
socket.on("ratingsUpdated",data=>{if(account){account=data.white.username===account.username?data.white:data.black.username===account.username?data.black:account;$("profile-name").textContent=`${account.displayName} · ${account.rating}`;}});

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===btn));document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+btn.dataset.view));}));
document.querySelectorAll(".mode-choice").forEach(btn=>btn.addEventListener("click",()=>showMode(btn.dataset.mode)));
$("difficulty").addEventListener("change",e=>difficulty=Number(e.target.value));
$("hint-button").addEventListener("click",giveHint);$("coach-go").addEventListener("click",giveHint);
$("new-game").addEventListener("click",()=>{if(mode==="online"){toast("Create or join a new room to start another online game.");return;}resetGame();});
$("undo").addEventListener("click",()=>{if(mode==="online")return toast("Undo is disabled in online matches.");if(mode==="computer"&&game.history().length>=2){game.undo();game.undo();}else game.undo();clearSelection();lastMove=null;aiBusy=false;render();});
$("find-match").addEventListener("click",()=>{socket.emit("findMatch",{},r=>{if(!r?.ok)return toast(r?.error||"Search failed.");if(r.waiting)$("online-message").textContent=r.message;else setRoom(r);});});
$("create-room").addEventListener("click",createRoom);$("create-friend-room").addEventListener("click",()=>{showMode("online");createRoom();});
$("join-room").addEventListener("click",joinRoom);$("profile-open").addEventListener("click",openProfile);
$("profile-close").addEventListener("click",()=>$("profile-modal").hidden=true);

$("account-switch").addEventListener("click",switchAuthMode);$("account-submit").addEventListener("click",submitAccount);$("account-logout").addEventListener("click",logout);
$("flip-board").addEventListener("click",()=>{boardFlipped=!boardFlipped;render();});
$("export-pgn").addEventListener("click",exportPgn);$("copy-fen").addEventListener("click",()=>navigator.clipboard?.writeText(game.fen()).then(()=>toast("FEN copied."),()=>toast("Clipboard unavailable.")));
$("sound-toggle").addEventListener("change",e=>soundOn=e.target.checked);
$("time-control").addEventListener("change",()=>{if(mode==="online")toast("Clocks are currently for computer games only.");resetClocks();});
$("offer-draw").addEventListener("click",()=>{if(mode!=="online"||!roomCode)return toast("Draw offers are available in online matches.");socket.emit("offerDraw",{code:roomCode});toast("Draw offer sent.");});
$("resign").addEventListener("click",()=>{if(mode!=="online"||!roomCode)return toast("Resignation is available in online matches.");if(confirm("Resign this game?"))socket.emit("resign",{code:roomCode});});
$("chat-form").addEventListener("submit",e=>{e.preventDefault();const message=$("chat-input").value.trim();if(!message||!roomCode)return;socket.emit("chatMessage",{code:roomCode,message});$("chat-input").value="";});
$("footer-year").textContent=new Date().getFullYear();$("profile-name").textContent=name;
updateStats();socket.emit("setProfile",{name,username:account?.username});resetClocks();loadAccount();loadLeaderboard();render();
