import { Chess } from "/vendor/chess.js";

const $ = id => document.getElementById(id);
const socket = io();
const translations = {
 en: {navPlay:"⚔ Play",navCoach:"✦ Coach",navLearn:"♟ Learn",navRank:"🏆 Rankings",navHistory:"📜 My games",navSettings:"⚙ Settings",matchControl:"MATCH CONTROL",modeComputer:"Computer",modeOnline:"Online",modeFriend:"Friend",computerStrength:"Computer strength",findMatch:"🌐 Find global match",createPrivateRoom:"＋ Create private room",gameStatus:"GAME STATUS",ready:"Ready to play",readyDetail:"Press Start game when you're ready.",startGame:"Start game",gameInProgress:"Game in progress",newGame:"New game",undo:"Undo",offerDraw:"Offer draw",resign:"Resign",mateCoach:"✦ MATE COACH",liveAnalysis:"LIVE ANALYSIS",strongMove:"✦ Find a strong move",liveChat:"LIVE MATCH CHAT",roomOnly:"ROOM ONLY",send:"Send",moveHistory:"MOVE HISTORY",personalize:"MAKE IT YOURS",settingsTitle:"Your settings",settingsDescription:"Choose how MateVerse looks, sounds and speaks. Your preferences stay on this device.",language:"Language",languageHelp:"Choose the interface language.",appearance:"Appearance",appearanceHelp:"Switch between dark and light mode.",boardColors:"Board colors",boardColorsHelp:"Pick a board palette.",strengthHelp:"Make the computer easier or more challenging.",moveSounds:"Move sounds",soundHelp:"Play a sound after each move.",flipBoard:"Flip board",flipHelp:"Show your pieces at the bottom.",wins:"Wins",winnerSuffix:"wins",losses:"Losses",draws:"Draws",whiteToMove:"White to move",blackToMove:"Black to move",check:"Check",checkmate:"Checkmate",draw:"Draw",youWin:"You win",youLose:"You lose",gameDraw:"Game drawn",noMoves:"No legal moves available.",askCoach:"Get a move suggestion with a quick explanation.",coachStart:"Start a game, then ask Mate Coach to analyse your position.",noHistory:"No saved games yet."},
 es: {navPlay:"⚔ Jugar",navCoach:"✦ Entrenador",navLearn:"♟ Aprender",navRank:"🏆 Clasificación",navHistory:"📜 Mis partidas",navSettings:"⚙ Ajustes",matchControl:"CONTROL DE PARTIDA",modeComputer:"Computadora",modeOnline:"En línea",modeFriend:"Amigo",computerStrength:"Nivel de la computadora",findMatch:"🌐 Buscar partida",createPrivateRoom:"＋ Crear sala privada",gameStatus:"ESTADO DE PARTIDA",ready:"Listo para jugar",readyDetail:"Pulsa Iniciar partida cuando quieras.",startGame:"Iniciar partida",gameInProgress:"Partida en curso",newGame:"Nueva partida",undo:"Deshacer",offerDraw:"Ofrecer tablas",resign:"Rendirse",mateCoach:"✦ MATE COACH",liveAnalysis:"ANÁLISIS EN VIVO",strongMove:"✦ Buscar una buena jugada",liveChat:"CHAT DE PARTIDA",roomOnly:"SOLO EN LA SALA",send:"Enviar",moveHistory:"HISTORIAL DE JUGADAS",personalize:"PERSONALÍZALO",settingsTitle:"Tus ajustes",settingsDescription:"Elige el aspecto, el sonido y el idioma. Tus preferencias se guardan en este dispositivo.",language:"Idioma",languageHelp:"Elige el idioma de la interfaz.",appearance:"Apariencia",appearanceHelp:"Cambia entre modo oscuro y claro.",boardColors:"Colores del tablero",boardColorsHelp:"Elige una paleta para el tablero.",strengthHelp:"Haz que la computadora sea más fácil o desafiante.",moveSounds:"Sonidos de jugada",soundHelp:"Reproducir un sonido después de cada jugada.",flipBoard:"Girar tablero",flipHelp:"Muestra tus piezas en la parte inferior.",wins:"Victorias",winnerSuffix:"gana",losses:"Derrotas",draws:"Tablas",whiteToMove:"Juegan blancas",blackToMove:"Juegan negras",check:"Jaque",checkmate:"Jaque mate",draw:"Tablas",youWin:"Has ganado",youLose:"Has perdido",gameDraw:"Partida en tablas",noMoves:"No hay jugadas legales.",askCoach:"Pide una sugerencia de jugada con una breve explicación.",coachStart:"Inicia una partida y pide a Mate Coach que analice la posición.",noHistory:"Todavía no hay partidas guardadas."},
 fr: {navPlay:"⚔ Jouer",navCoach:"✦ Coach",navLearn:"♟ Apprendre",navRank:"🏆 Classement",navHistory:"📜 Mes parties",navSettings:"⚙ Réglages",matchControl:"CONTRÔLE DE PARTIE",modeComputer:"Ordinateur",modeOnline:"En ligne",modeFriend:"Ami",computerStrength:"Niveau de l’ordinateur",findMatch:"🌐 Trouver une partie",createPrivateRoom:"＋ Créer une salle privée",gameStatus:"ÉTAT DE LA PARTIE",ready:"Prêt à jouer",readyDetail:"Appuyez sur Démarrer quand vous êtes prêt.",startGame:"Démarrer",gameInProgress:"Partie en cours",newGame:"Nouvelle partie",undo:"Annuler",offerDraw:"Proposer nulle",resign:"Abandonner",mateCoach:"✦ MATE COACH",liveAnalysis:"ANALYSE EN DIRECT",strongMove:"✦ Chercher un bon coup",liveChat:"CHAT DE PARTIE",roomOnly:"SALLE UNIQUEMENT",send:"Envoyer",moveHistory:"HISTORIQUE DES COUPS",personalize:"À VOTRE GOÛT",settingsTitle:"Vos réglages",settingsDescription:"Choisissez l’apparence, le son et la langue. Vos préférences restent sur cet appareil.",language:"Langue",languageHelp:"Choisissez la langue de l’interface.",appearance:"Apparence",appearanceHelp:"Choisissez le mode sombre ou clair.",boardColors:"Couleurs de l’échiquier",boardColorsHelp:"Choisissez une palette.",strengthHelp:"Rendez l’ordinateur plus facile ou plus difficile.",moveSounds:"Sons des coups",soundHelp:"Jouer un son après chaque coup.",flipBoard:"Retourner l’échiquier",flipHelp:"Placez vos pièces en bas.",wins:"Victoires",winnerSuffix:"gagne",losses:"Défaites",draws:"Nulles",whiteToMove:"Aux blancs de jouer",blackToMove:"Aux noirs de jouer",check:"Échec",checkmate:"Échec et mat",draw:"Nulle",youWin:"Vous avez gagné",youLose:"Vous avez perdu",gameDraw:"Partie nulle",noMoves:"Aucun coup légal.",askCoach:"Obtenez un conseil avec une courte explication.",coachStart:"Lancez une partie, puis demandez à Mate Coach d’analyser la position.",noHistory:"Aucune partie enregistrée pour le moment."},
 sw: {navPlay:"⚔ Cheza",navCoach:"✦ Kocha",navLearn:"♟ Jifunze",navRank:"🏆 Viwango",navHistory:"📜 Michezo yangu",navSettings:"⚙ Mipangilio",matchControl:"UDHIBITI WA MCHEZO",modeComputer:"Kompyuta",modeOnline:"Mtandaoni",modeFriend:"Rafiki",computerStrength:"Uwezo wa kompyuta",findMatch:"🌐 Tafuta mpinzani",createPrivateRoom:"＋ Fungua chumba binafsi",gameStatus:"HALI YA MCHEZO",ready:"Tayari kucheza",readyDetail:"Bonyeza Anza mchezo ukiwa tayari.",startGame:"Anza mchezo",gameInProgress:"Mchezo unaendelea",newGame:"Mchezo mpya",undo:"Rudisha",offerDraw:"Pendekeza sare",resign:"Jisalimishe",mateCoach:"✦ MATE COACH",liveAnalysis:"UCHAMBUZI WA SASA",strongMove:"✦ Tafuta hatua nzuri",liveChat:"MAZUNGUMZO YA MCHEZO",roomOnly:"CHUMBA PEKEE",send:"Tuma",moveHistory:"HISTORIA YA HATUA",personalize:"WEKA UPENDAVYO",settingsTitle:"Mipangilio yako",settingsDescription:"Chagua mwonekano, sauti na lugha. Mapendeleo yako yanahifadhiwa kwenye kifaa hiki.",language:"Lugha",languageHelp:"Chagua lugha ya kiolesura.",appearance:"Mwonekano",appearanceHelp:"Chagua hali ya giza au mwanga.",boardColors:"Rangi za ubao",boardColorsHelp:"Chagua rangi za ubao.",strengthHelp:"Fanya kompyuta iwe rahisi au ngumu zaidi.",moveSounds:"Sauti za hatua",soundHelp:"Cheza sauti baada ya kila hatua.",flipBoard:"Geuza ubao",flipHelp:"Weka vipande vyako chini.",wins:"Ushindi",winnerSuffix:"ameshinda",losses:"Kushindwa",draws:"Sare",whiteToMove:"Zamu ya weupe",blackToMove:"Zamu ya weusi",check:"Shah",checkmate:"Shah na mati",draw:"Sare",youWin:"Umeshinda",youLose:"Umeshindwa",gameDraw:"Mchezo ni sare",noMoves:"Hakuna hatua halali.",askCoach:"Pata pendekezo la hatua na maelezo mafupi.",coachStart:"Anza mchezo, kisha muulize Mate Coach kuchambua nafasi.",noHistory:"Bado hakuna michezo iliyohifadhiwa."}
};
function loadSettings(){try{return JSON.parse(localStorage.getItem("mateverse-settings")||"{}");}catch{return {};}}
let settings=loadSettings();
let game = new Chess(), mode = "computer", difficulty = [1,2,3].includes(Number(settings.difficulty))?Number(settings.difficulty):1;
let selected = null, targets = [], myColor = "w", roomCode = "";
let onlineReady = false, aiBusy = false, lastMove = null, gameStarted = false, gameResultSaved = false;
let account = null, loginMode = false, boardFlipped = settings.flipped===true, clockSeconds = 300, clocks = {w:300,b:300}, clockTimer = null, flagged = false, soundOn = settings.sound!==false;
let activeGameId = makeGameId();
let name = localStorage.getItem("mateverse-name") || "Guest";
let stats = JSON.parse(localStorage.getItem("mateverse-stats") || '{"wins":0,"games":0}');
const glyph = { w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"}, b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"} };
const pieceValue = {p:100,n:320,b:335,r:500,q:900,k:20000};

function makeGameId(){return globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function t(key){return translations[settings.language||"en"]?.[key]||translations.en[key]||key;}
function saveSettings(){localStorage.setItem("mateverse-settings",JSON.stringify(settings));}
function applyLanguage(){
 const language=settings.language||"en";
 document.documentElement.lang=language;
 document.querySelectorAll("[data-i18n]").forEach(el=>{const value=translations[language]?.[el.dataset.i18n];if(value)el.textContent=value;});
 document.querySelector("#chat-input").placeholder=language==="es"?"Escribe algo…":language==="fr"?"Écrivez un message…":language==="sw"?"Andika ujumbe…":"Say something…";
 if(mode!=="online")$("black-name").textContent=t(mode==="computer"?"modeComputer":"modeFriend");
}
function applySettings(){
 if(!["en","es","fr","sw"].includes(settings.language))settings.language="en";
 if(!["dark","light"].includes(settings.theme))settings.theme="dark";
 if(!["classic","ocean","forest"].includes(settings.board))settings.board="classic";
 document.documentElement.dataset.theme=settings.theme||"dark";
 document.documentElement.dataset.board=settings.board||"classic";
 document.documentElement.dataset.pieces=settings.pieceSize||"regular";
 $("language-setting").value=settings.language||"en";
 $("theme-setting").value=settings.theme||"dark";
 $("board-setting").value=settings.board||"classic";
 $("settings-difficulty").value=String(difficulty);
 $("difficulty").value=String(difficulty);
 $("sound-toggle").checked=soundOn;
 $("settings-sound").checked=soundOn;
 $("settings-flip").checked=boardFlipped;
 applyLanguage();
}
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2300);}
function setStatus(a,b=""){$("status").textContent=a;$("status-detail").textContent=b;}
function updateStats(){ $("stat-wins").textContent=stats.wins;$("stat-games").textContent=stats.games;$("stat-rate").textContent=stats.games?Math.round(stats.wins/stats.games*100)+"%":"—";localStorage.setItem("mateverse-stats",JSON.stringify(stats));}
function resultFromGame(){return game.isCheckmate()?(game.turn()==="w"?"0-1":"1-0"):"1/2-1/2";}
function showWinner(result,reason=""){
 const winningColor=result==="1-0"?"w":result==="0-1"?"b":null;
 const winnerName=winningColor?$(winningColor==="w"?"white-name":"black-name").textContent:t("draw");
 $("winner-title").textContent=winningColor?`${winnerName} ${t("winnerSuffix")}`:t("gameDraw");
 $("winner-detail").textContent=reason;
 $("winner-banner").classList.toggle("draw",!winningColor);
 $("winner-banner").classList.toggle("victory",winningColor===myColor);
 $("winner-banner").hidden=false;
}
function updateProfileStats(user){
 if(!user)return;
 account=user;
 $("account-wins").textContent=(user.wins||0)+(user.computerWins||0);
 $("account-losses").textContent=(user.losses||0)+(user.computerLosses||0);
 $("account-draws").textContent=(user.draws||0)+(user.computerDraws||0);
 $("profile-name").textContent=`${user.displayName} · ${user.rating}`;
 $("account-summary").textContent=`Signed in as ${user.displayName} (@${user.username}) · ${user.rating} rating · ${(user.games||0)+(user.computerGames||0)} games.`;
}
function saveResult(){
 if(!game.isGameOver()||gameResultSaved)return;
 gameResultSaved=true;
 const result=resultFromGame();
 stats.games++;
 if(result==="1/2-1/2")stats.draws=(stats.draws||0)+1;
 else if((result==="1-0"&&myColor==="w")||(result==="0-1"&&myColor==="b"))stats.wins++;
 else stats.losses=(stats.losses||0)+1;
 updateStats();
 showWinner(result,game.isCheckmate()?t("checkmate"):t("draw"));
 if(mode==="computer"){
  Promise.resolve(account||api("/api/me").then(data=>data.user))
   .then(user=>{
    if(!user)return null;
    account=user;
    return api("/api/games/computer",{id:activeGameId,pgn:game.pgn(),color:myColor});
   })
   .then(data=>{if(data){updateProfileStats(data.user);loadHistory();}})
   .catch(error=>toast(`Game ended, but could not save it: ${error.message}`));
 }
}
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
function updateGameStatus(){if(game.isCheckmate()){const winnerColor=game.turn()==="w"?"b":"w";setStatus(t("checkmate"),winnerColor===myColor?t("youWin"):t("youLose"));}else if(game.isDraw())setStatus(t("draw"),game.isStalemate()?"Stalemate.":"Draw by chess rules.");else if(mode!=="online"&&!gameStarted)setStatus(t("ready"),t("readyDetail"));else setStatus((game.turn()==="w"?t("whiteToMove"):t("blackToMove"))+(game.isCheck()?` · ${t("check")}!`:""),mode==="online"?(onlineReady?`Room ${roomCode}`:"Waiting for opponent…"):"Choose a piece to see its legal moves.");}
function squareClick(sq){
 if(game.isGameOver()||aiBusy||flagged||(mode!=="online"&&!gameStarted))return;
 if(mode==="online"&&(!onlineReady||game.turn()!==myColor))return;
 const p=game.get(sq);
 if(selected&&targets.includes(sq)){makeMove(selected,sq);return;}
 if(p&&p.color===game.turn()){selected=sq;targets=game.moves({square:sq,verbose:true}).map(m=>m.to);}else clearSelection();
 render();
}
function makeMove(from,to,promotion="q"){
    if(mode!=="online"&&!gameStarted)return;
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
 const piece=game.get(m.from);
 const labels={p:"pawn",n:"knight",b:"bishop",r:"rook",q:"queen",k:"king"};
 const reasons=[];
 if(m.captured)reasons.push(`Captures a ${labels[m.captured]}.`);
 if(m.flags?.includes("k")||m.flags?.includes("q"))reasons.push("Castles your king to safety.");
 if(m.san.includes("#"))reasons.push("Delivers checkmate.");
 else if(m.san.includes("+"))reasons.push("Gives check.");
 if(["d4","e4","d5","e5"].includes(m.to))reasons.push("Fights for the centre.");
 if(m.promotion)reasons.push("Promotes the pawn.");
 if(!reasons.length)reasons.push(`Improves your ${labels[piece.type]} and develops your position.`);
 return reasons.join(" ");
}
function giveHint(){
 if(game.isGameOver()){$("coach-message").textContent=t("checkmate");$("coach-result").textContent=t("checkmate");return;}
 if(mode==="online"&&(!onlineReady||game.turn()!==myColor)){$("coach-message").textContent="Wait for your turn to ask for a move suggestion.";return;}
 const m=chooseMove(game,game.turn(),3);if(!m){$("coach-message").textContent=t("noMoves");$("coach-result").textContent=t("noMoves");return;}
 selected=m.from;targets=[m.to];render();
 const desc=`Suggested move: ${m.san} (${m.from} → ${m.to}). ${explainMove(m)} A suggestion is not a guaranteed win.`;
 $("coach-message").textContent=desc;$("coach-result").textContent=desc;
}
function resetGame(){game=new Chess();clearSelection();lastMove=null;aiBusy=false;gameStarted=false;gameResultSaved=false;activeGameId=makeGameId();flagged=false;$("winner-banner").hidden=true;resetClocks();updateStartButton();render();$("coach-message").textContent=t("askCoach");$("coach-result").textContent=t("coachStart");}
function updateStartButton(){$("start-game").hidden=mode==="online";$("start-game").disabled=gameStarted;$("start-game").textContent=gameStarted?t("gameInProgress"):t("startGame");}
function startGame(){if(mode==="online"||gameStarted)return;gameStarted=true;updateStartButton();updateClocks();startClock();render();}
function showMode(next){
 mode=next;$("chat-card").hidden=mode!=="online";updateClocks();document.querySelectorAll(".mode-choice").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));
 $("computer-options").hidden=mode!=="computer";$("online-options").hidden=mode!=="online";$("friend-options").hidden=mode!=="friend";
 $("black-name").textContent=mode==="computer"?t("modeComputer"):mode==="online"?"Online opponent":t("modeFriend");
 $("black-elo").textContent=mode==="computer"?"AI":"ONLINE";$("white-elo").textContent="YOU";$("invite-tools").hidden=true;
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
 game=new Chess(result.fen);clearSelection();lastMove=null;gameResultSaved=false;$("winner-banner").hidden=true;
 updateRoomPlayers(result.names||{w:result.color==="w"?name:result.opponent||"Opponent",b:result.color==="b"?name:result.ready?result.opponent||"Opponent":"Waiting for player"});
 $("invite-tools").hidden=!friend;
 if(friend)$("invite-code").value=roomCode;
 $("online-message").textContent=friend
  ?`Invite code: ${roomCode}. Share this code; your friend can choose Online and enter it to join.`
  :`Connected to ${result.opponent||"your opponent"} in room ${roomCode}. You are ${myColor==="w"?"White":"Black"}.`;
 render();
}
function updateRoomPlayers(names){
 $("white-name").textContent=names.w||"Waiting for player";
 $("black-name").textContent=names.b||"Waiting for player";
 $("white-caption").textContent=`White · ${myColor==="w"?"You":"Opponent"}`;
 $("black-caption").textContent=`Black · ${myColor==="b"?"You":"Opponent"}`;
 $("white-elo").textContent=myColor==="w"?"YOU":"OPP";
 $("black-elo").textContent=myColor==="b"?"YOU":"OPP";
}
function showView(view,scroll=false){
 document.querySelectorAll(".tab").forEach(button=>button.classList.toggle("active",button.dataset.view===view));
 document.querySelectorAll(".view").forEach(section=>section.classList.toggle("active",section.id===`view-${view}`));
 if(view==="history")loadHistory();
 if(view==="community"){loadCommunity();loadReviews();}
 if(scroll)$(`view-${view}`)?.scrollIntoView({behavior:"smooth",block:"start"});
}
function restoreChat(items=[]){$("chat-messages").innerHTML="";items.forEach(addChat);}
function loadRoomPosition(data){
 if(Array.isArray(data.history)){
  const syncedGame=new Chess();
  data.history.forEach(move=>syncedGame.move(move));
  game=syncedGame;
 }else game.load(data.fen);
}
function createRoom(){const code=Math.random().toString(36).slice(2,8).toUpperCase();socket.emit("createRoom",{code},r=>{if(!r?.ok)return toast(r?.error||"Could not create room.");setRoom(r,true);});}
function joinRoom(){const code=$("room-code").value.trim().toUpperCase();if(!code)return toast("Enter a room code.");socket.emit("joinRoom",{code},r=>{if(!r?.ok)return toast(r?.error||"Could not join.");setRoom(r);});}

function formatClock(seconds){const m=Math.floor(Math.max(0,seconds)/60),s=Math.max(0,seconds)%60;return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;}
function resetClocks(){clearInterval(clockTimer);clockSeconds=Number($("time-control")?.value||300);clocks={w:clockSeconds,b:clockSeconds};flagged=false;updateClocks();if(gameStarted)startClock();}
function startClock(){clearInterval(clockTimer);if(clockSeconds===0||mode==="online")return;clockTimer=setInterval(()=>{if(game.isGameOver()||flagged||!gameStarted||mode==="online")return;const side=game.turn();clocks[side]=Math.max(0,clocks[side]-1);updateClocks();if(clocks[side]===0){flagged=true;clearInterval(clockTimer);setStatus("Time expired",`${side==="w"?"Black":"White"} wins on time.`);toast("Time expired.");}},1000);}
function updateClocks(){if($("white-clock"))$("white-clock").textContent=mode==="online"?"—":clockSeconds?formatClock(clocks.w):"∞";if($("black-clock"))$("black-clock").textContent=mode==="online"?"—":clockSeconds?formatClock(clocks.b):"∞";$("white-clock")?.classList.toggle("active-clock",mode!=="online"&&gameStarted&&game.turn()==="w");$("black-clock")?.classList.toggle("active-clock",mode!=="online"&&gameStarted&&game.turn()==="b");}
function playMoveSound(move){if(!soundOn)return;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=new C(),o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=move?.captured?220:440;g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.09);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.1);o.onended=()=>c.close();}catch(e){}}
async function api(path,body,method){const r=await fetch(path,{method:method||(body?"POST":"GET"),headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined,credentials:"same-origin"});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"Request failed.");return data;}
async function loadLeaderboard(){try{const d=await api("/api/leaderboard");const el=$("leaderboard");el.innerHTML="";if(!d.players.length){el.textContent="No rated players yet. Create an account and play a rated match to claim the first spot.";return;}const table=document.createElement("table");table.innerHTML="<thead><tr><th>#</th><th>PLAYER</th><th>RATING</th><th>GAMES</th><th>W-L-D</th></tr></thead>";const body=document.createElement("tbody");d.players.forEach((u,i)=>{const tr=document.createElement("tr");[i+1,u.displayName,u.rating,u.games,`${u.wins}-${u.losses}-${u.draws}`].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});body.append(tr);});table.append(body);el.append(table);}catch(e){$("leaderboard").textContent="Leaderboard is unavailable while offline.";}}
async function loadHistory(){if(!account){$("game-history").textContent="Sign in to load your matches.";return;}try{const d=await api("/api/games");const el=$("game-history");el.innerHTML="";if(!d.games.length){el.textContent=t("noHistory");return;}d.games.forEach(g=>{const row=document.createElement("div");row.className="game-record";const title=document.createElement("b");title.textContent=`${g.names[0]} vs ${g.names[1]} · ${g.result}`;const meta=document.createElement("small");meta.textContent=`${new Date(g.date).toLocaleString()} · ${g.reason==="computer"?"Computer game":g.reason}`;const btn=document.createElement("button");btn.className="action ghost";btn.textContent="Download PGN";btn.onclick=()=>downloadText("mateverse-game.pgn",g.pgn);row.append(title,meta,btn);el.append(row);});}catch(e){$("game-history").textContent=e.message;}}
function downloadText(filename,text){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:"text/plain"}));a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}
function syncSocketIdentity(){if(socket.connected){socket.disconnect();socket.connect();}}
function showProfileError(message){$("account-error").textContent=message;}
async function openProfile(){
 $("profile-modal").hidden=false;showProfileError("");$("verification-message").textContent="";
 $("account-form").hidden=!!account;$("account-signed-in").hidden=!account;
 if(account){
  updateProfileStats(account);
  try{
   const {user}=await api("/api/profile");account={...account,...user};
   $("profile-display-name").value=user.displayName||"";
   $("profile-visibility").value=user.profileVisibility||"public";
   $("instagram-link").value=user.socialLinks?.instagram||"";
   $("facebook-link").value=user.socialLinks?.facebook||"";
   $("avatar-preview").hidden=!user.avatarUrl;
   if(user.avatarUrl)$("avatar-preview").src=user.avatarUrl;
   $("account-summary").textContent=`Signed in as ${user.displayName} (@${user.username})${user.email?` · ${user.email}`:""}.`;
  }catch(error){$("profile-message").textContent=error.message;}
 }
}
function switchAuthMode(){
 loginMode=!loginMode;
 $("account-title").innerHTML=loginMode?'Welcome <em>back.</em>':'Enter the <em>Verse.</em>';
 $("email-label").hidden=loginMode;$("account-email").hidden=loginMode;
 $("display-label").hidden=loginMode;$("account-display").hidden=loginMode;
 $("account-password").autocomplete=loginMode?"current-password":"new-password";
 $("account-submit").textContent=loginMode?"Sign in":"Create account";
 $("account-switch").textContent=loginMode?"New to MateVerse? Create an account":"Already have an account? Sign in";
 $("account-name").placeholder=loginMode?"Email or username":"Choose a username";
 $("verification-message").textContent="";$("resend-verification").hidden=true;showProfileError("");
}
function activateAccount(user){
 account=user;name=user.displayName;localStorage.setItem("mateverse-name",name);
 $("profile-name").textContent=`${name} · ${user.rating}`;
 $("account-form").hidden=true;$("account-signed-in").hidden=false;
 updateProfileStats(user);syncSocketIdentity();loadLeaderboard();loadHistory();loadCommunity();
 openProfile();
}
async function submitAccount(){
 const identifier=$("account-name").value.trim(),password=$("account-password").value;
 try{
  if(loginMode){
   const data=await api("/api/login",{identifier,password});
   activateAccount(data.user);toast("Welcome back!");
  }else{
   const email=$("account-email").value.trim(),username=identifier,displayName=$("account-display").value.trim();
   const data=await api("/api/register",{username,email,password,displayName});
   $("verification-message").textContent=data.message||"Check your email for a verification link.";
   $("resend-verification").hidden=false;
   showProfileError("");
  }
 }catch(error){
  showProfileError(error.message);
  if(error.message.toLowerCase().includes("verify")||error.message.toLowerCase().includes("verification"))$("resend-verification").hidden=false;
 }
}
async function resendVerification(){
 const email=$("account-email").value.trim()||$("account-name").value.trim();
 try{const data=await api("/api/resend-verification",{email});$("verification-message").textContent=data.message;showProfileError("");}
 catch(error){showProfileError(error.message);}
}
async function logout(){
 try{await api("/api/logout",{});account=null;$("profile-name").textContent=name+" · Sign in";$("account-form").hidden=false;$("account-signed-in").hidden=true;syncSocketIdentity();openProfile();loadLeaderboard();loadCommunity();toast("Signed out.");}
 catch(error){toast(error.message);}
}
async function loadAccount(){
 try{const {user}=await api("/api/me");account=user;if(user){name=user.displayName;updateProfileStats(user);socket.emit("setProfile",{name});loadHistory();loadCommunity();}else $("profile-name").textContent=name+" · Sign in";}
 catch(error){$("profile-name").textContent=name+" · Sign in";}
}
function safeText(tag,text,className=""){const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;return el;}
function communityMessage(id,text){$(id).replaceChildren(safeText("p",text,"muted"));}
function renderPlayerProfile(player){
 const panel=$("player-profile");panel.replaceChildren();panel.hidden=false;
 const heading=document.createElement("h3");heading.textContent=player.displayName;panel.append(heading,safeText("p",player.private?`@${player.username} · This player shares profile details with friends only.`:`@${player.username} · Rating ${player.rating} · ${player.wins||0} wins`));
 if(player.avatarUrl){const avatar=document.createElement("img");avatar.src=player.avatarUrl;avatar.alt=`${player.displayName}'s profile`;avatar.className="profile-avatar";panel.prepend(avatar);}
 if(player.socialLinks)for(const network of ["instagram","facebook"]){const href=player.socialLinks[network];if(href){const link=safeText("a",`View ${network}`);link.href=href;link.target="_blank";link.rel="noopener noreferrer";panel.append(link);}}
 const actions=document.createElement("div");actions.className="profile-actions";
 const add=safeText("button",player.isFriend?"Friends":"Add friend","action secondary");add.disabled=player.isFriend;add.onclick=async()=>{try{await api("/api/friends/requests",{username:player.username});toast("Friend request sent.");loadCommunity();}catch(error){toast(error.message);}};actions.append(add);
 if(player.isFriend){const challenge=safeText("button","Request a match","action gold");challenge.onclick=async()=>{try{await api(`/api/friends/${encodeURIComponent(player.username)}/challenges`,{});toast("Match request sent.");}catch(error){toast(error.message);}};actions.append(challenge);}
 const share=safeText("button","Share profile","action ghost");share.onclick=()=>shareContent(`${player.displayName} on MateVerse`,`Check out ${player.displayName}'s MateVerse chess profile: ${player.rating} rating`,`${location.origin}/?player=${encodeURIComponent(player.username)}`);actions.append(share);
 panel.append(actions);
}
async function showPublicProfile(username){
 try{const {player}=await api(`/api/players/${encodeURIComponent(username)}`);renderPlayerProfile(player);$("player-profile").scrollIntoView({behavior:"smooth",block:"center"});}
 catch(error){toast(error.message);}
}
function playerRow(player,actions=[]){
 const row=document.createElement("div");row.className="community-row";
 const label=safeText("span",`${player.displayName} (@${player.username}) · ${player.rating??"Friends only"}`);row.append(label);
 const view=safeText("button","Profile","action ghost");view.onclick=()=>showPublicProfile(player.username);row.append(view);
 for(const action of actions)row.append(action);
 return row;
}
async function loadCommunity(){
 if(!account){communityMessage("friend-requests","Sign in to manage friend requests.");communityMessage("friend-challenges","Sign in to receive match requests.");communityMessage("friends-list","Sign in to see friends.");return;}
 try{
  const data=await api("/api/friends");const requestList=$("friend-requests"),challengeList=$("friend-challenges"),friendsList=$("friends-list");
  requestList.replaceChildren();challengeList.replaceChildren();friendsList.replaceChildren();
  if(!data.requests.length)requestList.append(safeText("p","No pending requests.","muted"));
  data.requests.forEach(item=>{const row=playerRow(item.player),accept=safeText("button","Accept","action secondary"),reject=safeText("button","Decline","action ghost");accept.onclick=async()=>{await api(`/api/friends/requests/${item.id}/respond`,{accept:true});loadCommunity();};reject.onclick=async()=>{await api(`/api/friends/requests/${item.id}/respond`,{accept:false});loadCommunity();};row.append(accept,reject);requestList.append(row);});
  if(!data.challenges.length)challengeList.append(safeText("p","No incoming match requests.","muted"));
  data.challenges.forEach(item=>{const row=document.createElement("div");row.className="community-row";row.append(safeText("span",`${item.displayName} wants to play`));const accept=safeText("button","Accept match","action gold"),decline=safeText("button","Decline","action ghost");accept.onclick=async()=>{try{await api(`/api/friend-challenges/${item.id}/respond`,{accept:true});loadCommunity();}catch(error){toast(error.message);}};decline.onclick=async()=>{await api(`/api/friend-challenges/${item.id}/respond`,{accept:false});loadCommunity();};row.append(accept,decline);challengeList.append(row);});
  if(!data.friends.length)friendsList.append(safeText("p","Add players to build your friend list.","muted"));
  data.friends.forEach(player=>{const row=playerRow(player),challenge=safeText("button","Challenge","action gold");challenge.onclick=async()=>{try{await api(`/api/friends/${encodeURIComponent(player.username)}/challenges`,{});toast("Match request sent.");}catch(error){toast(error.message);}};row.append(challenge);friendsList.append(row);});
 }catch(error){communityMessage("friend-requests",error.message);communityMessage("friend-challenges",error.message);communityMessage("friends-list",error.message);}
}
async function searchPlayers(){
 const query=$("player-search").value.trim(),results=$("player-results");
 if(query.length<2){communityMessage("player-results","Enter at least two characters.");return;}
 try{const {players}=await api(`/api/players?q=${encodeURIComponent(query)}`);results.replaceChildren();if(!players.length){communityMessage("player-results","No players found.");return;}players.forEach(player=>results.append(playerRow(player)));}catch(error){communityMessage("player-results",error.message);}
}
async function loadReviews(){
 try{const data=await api("/api/reviews");$("review-summary").textContent=data.count?`${data.average} out of 5 stars · ${data.count} review${data.count===1?"":"s"}`:"No reviews yet—be the first to share feedback.";const list=$("reviews-list");list.replaceChildren();data.reviews.forEach(review=>{const card=document.createElement("article");card.className="review-item";card.append(safeText("b",`${"★".repeat(review.rating)}${"☆".repeat(5-review.rating)} · ${review.displayName}`),safeText("p",review.comment),safeText("small",new Date(review.date).toLocaleDateString()));list.append(card);});}catch(error){$("review-summary").textContent=error.message;}
}
async function postReview(event){
 event.preventDefault();
 try{await api("/api/reviews",{displayName:$("review-name").value.trim(),rating:Number($("review-rating").value),comment:$("review-comment").value.trim()});$("review-message").textContent="Thanks for your review!";$("review-comment").value="";loadReviews();}
 catch(error){$("review-message").textContent=error.message;}
}
async function saveProfile(){
 try{
  const data=await api("/api/profile",{displayName:$("profile-display-name").value.trim(),profileVisibility:$("profile-visibility").value,socialLinks:{instagram:$("instagram-link").value.trim(),facebook:$("facebook-link").value.trim()}},"PUT");
  account={...account,...data.user};name=account.displayName;updateProfileStats(account);socket.emit("setProfile",{name});$("profile-message").textContent="Profile saved.";loadCommunity();
 }catch(error){$("profile-message").textContent=error.message;}
}
async function uploadAvatar(){
 const file=$("avatar-file").files[0];if(!file)return;
 if(file.size>1024*1024){$("profile-message").textContent="Image must be smaller than 1 MB.";return;}
 try{
  const response=await fetch("/api/profile/avatar",{method:"POST",headers:{"Content-Type":file.type},body:file,credentials:"same-origin"}),data=await response.json();
  if(!response.ok)throw new Error(data.error||"Upload failed.");
  account.avatarUrl=data.avatarUrl;$("avatar-preview").src=data.avatarUrl;$("avatar-preview").hidden=false;$("profile-message").textContent="Profile picture updated.";
 }catch(error){$("profile-message").textContent=error.message;}
}
async function shareContent(title,text,url){
 try{if(navigator.share)await navigator.share({title,text,url});else{await navigator.clipboard.writeText(`${text} ${url}`);toast("Share text copied.");}}
 catch(error){if(error.name!=="AbortError")toast("Could not share this link.");}
}
function shareCurrentProfile(){if(!account){openProfile();return;}const wins=(account.wins||0)+(account.computerWins||0),losses=(account.losses||0)+(account.computerLosses||0),draws=(account.draws||0)+(account.computerDraws||0);shareContent(`${name} on MateVerse`,`My MateVerse rating is ${account.rating} (${wins} wins, ${losses} losses, ${draws} draws). Follow my games and challenge me!`,`${location.origin}/?player=${encodeURIComponent(account.username)}`);}
async function loadGoogleSignIn(){
 try{const {googleClientId}=await api("/api/config");if(!googleClientId){$("google-signin").hidden=true;return;}
  const script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;
  script.onload=()=>{window.google.accounts.id.initialize({client_id:googleClientId,callback:async response=>{try{const result=await api("/api/auth/google",{credential:response.credential});activateAccount(result.user);toast("Signed in with Google.");}catch(error){showProfileError(error.message);}}});window.google.accounts.id.renderButton($("google-signin"),{theme:"outline",size:"large",text:"continue_with",shape:"rectangular",width:280});};
  script.onerror=()=>showProfileError("Google sign-in could not load. Check your connection.");document.head.append(script);
 }catch(error){showProfileError(error.message);}
}
async function verifyEmailFromLink(){
 const token=new URLSearchParams(location.search).get("verify");if(!token)return;
 $("profile-modal").hidden=false;$("account-form").hidden=false;$("account-signed-in").hidden=true;
 try{const result=await api("/api/verify-email",{token});$("verification-message").textContent=result.message;loginMode=false;switchAuthMode();history.replaceState(null,"",location.pathname);toast(result.message);}
 catch(error){$("verification-message").textContent=error.message;history.replaceState(null,"",location.pathname);}
}
function addChat(item){const el=$("chat-messages"),line=document.createElement("p"),who=document.createElement("b"),msg=document.createElement("span");who.textContent=item.name+": ";msg.textContent=item.text;line.append(who,msg);el.append(line);el.scrollTop=el.scrollHeight;}
function exportPgn(){downloadText("mateverse-game.pgn",game.pgn()||"[Event \"MateVerse\"]\n[Result \"*\"]\n\n*");}

socket.on("connect",()=>{$("connection").textContent="SERVER CONNECTED";socket.emit("setProfile",{name,username:account?.username});});
socket.on("disconnect",()=>{$("connection").textContent="OFFLINE";});
socket.on("matchFound",data=>{setRoom(data,false);$("online-message").textContent=`Match found! Playing ${data.opponent}. Room ${data.code}.`;});
socket.on("roomState",data=>{if(mode!=="online"||data.code!==roomCode)return;loadRoomPosition(data);onlineReady=!!(data.players.w&&data.players.b);if(data.names)updateRoomPlayers(data.names);if(Array.isArray(data.chat))restoreChat(data.chat);if(onlineReady)$("online-message").textContent=`Connected to ${data.names?.[myColor==="w"?"b":"w"]||"your opponent"} in room ${roomCode}.`;render();});
socket.on("moveMade",data=>{if(mode!=="online"||!data?.fen)return;loadRoomPosition(data);clearSelection();if(data.move){lastMove={from:data.move.from,to:data.move.to};playMoveSound(data.move);}render();if(game.isGameOver())saveResult();});
socket.on("systemMessage",data=>{$("online-message").textContent=data.text;});
socket.on("opponentLeft",data=>{onlineReady=false;updateRoomPlayers({w:myColor==="w"?name:"Waiting for player",b:myColor==="b"?name:"Waiting for player"});$("online-message").textContent=data.message+" Create a new invite room or join another room.";toast("Opponent disconnected.");});
socket.on("chatMessage",data=>addChat(data));
socket.on("friendRequestReceived",()=>{toast("You have a new friend request.");loadCommunity();});
socket.on("friendChallengeRequest",data=>{
 if(!confirm(`${data.displayName} wants to play a match. Accept?`)){api(`/api/friend-challenges/${data.id}/respond`,{accept:false}).catch(error=>toast(error.message));return;}
 api(`/api/friend-challenges/${data.id}/respond`,{accept:true}).then(()=>loadCommunity()).catch(error=>toast(error.message));
});
socket.on("friendChallengeAccepted",data=>{showMode("online");setRoom(data);$("online-message").textContent=`Friend match started with ${data.opponent}.`;showView("play",true);loadCommunity();});
socket.on("drawOffered",data=>{if(confirm(`${data.name} offers a draw. Accept?`))socket.emit("respondDraw",{code:roomCode,accept:true});else socket.emit("respondDraw",{code:roomCode,accept:false});});
socket.on("gameFinished",data=>{const draw=data.result==="1/2-1/2";showWinner(data.result,data.reason);setStatus(draw?t("draw"):`${data.result==="1-0"?$("white-name").textContent:$("black-name").textContent} ${t("winnerSuffix")}`,`${data.reason}. ${data.rated?"Rated result saved.":"Sign in on both sides to record ratings."}`);toast(data.rated?"Rated game recorded.":"Game finished.");loadLeaderboard();loadHistory();});
socket.on("ratingsUpdated",data=>{if(account){const updated=data.white.username===account.username?data.white:data.black.username===account.username?data.black:account;updateProfileStats({...account,...updated});}});

document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>showView(btn.dataset.view)));
document.querySelectorAll("[data-feature-view]").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.featureMode)showMode(button.dataset.featureMode);showView(button.dataset.featureView,true);}));
document.querySelectorAll(".mode-choice").forEach(btn=>btn.addEventListener("click",()=>showMode(btn.dataset.mode)));
$("difficulty").addEventListener("change",e=>{difficulty=Number(e.target.value);$("settings-difficulty").value=String(difficulty);settings.difficulty=difficulty;saveSettings();});
$("settings-difficulty").addEventListener("change",e=>{$("difficulty").value=e.target.value;difficulty=Number(e.target.value);settings.difficulty=difficulty;saveSettings();});
$("language-setting").addEventListener("change",e=>{settings.language=e.target.value;saveSettings();applyLanguage();render();});
$("theme-setting").addEventListener("change",e=>{settings.theme=e.target.value;saveSettings();applySettings();});
$("board-setting").addEventListener("change",e=>{settings.board=e.target.value;saveSettings();applySettings();});
$("settings-sound").addEventListener("change",e=>{soundOn=e.target.checked;$("sound-toggle").checked=soundOn;settings.sound=soundOn;saveSettings();});
$("settings-flip").addEventListener("change",e=>{boardFlipped=e.target.checked;settings.flipped=boardFlipped;saveSettings();render();});
$("hint-button").addEventListener("click",giveHint);$("coach-go").addEventListener("click",giveHint);
$("start-game").addEventListener("click",startGame);
$("new-game").addEventListener("click",()=>{if(mode==="online"){toast("Create or join a new room to start another online game.");return;}resetGame();});
$("undo").addEventListener("click",()=>{if(mode==="online")return toast("Undo is disabled in online matches.");if(mode==="computer"&&game.history().length>=2){game.undo();game.undo();}else game.undo();clearSelection();lastMove=null;aiBusy=false;render();});
$("find-match").addEventListener("click",()=>{socket.emit("findMatch",{},r=>{if(!r?.ok)return toast(r?.error||"Search failed.");if(r.waiting)$("online-message").textContent=r.message;else setRoom(r);});});
$("create-room").addEventListener("click",createRoom);$("create-friend-room").addEventListener("click",()=>{showMode("online");createRoom();});
$("copy-invite-code").addEventListener("click",()=>navigator.clipboard?.writeText($("invite-code").value).then(()=>toast("Invite code copied."),()=>toast("Clipboard unavailable.")));
$("join-room").addEventListener("click",joinRoom);$("profile-open").addEventListener("click",openProfile);
$("profile-close").addEventListener("click",()=>$("profile-modal").hidden=true);

$("account-switch").addEventListener("click",switchAuthMode);$("account-submit").addEventListener("click",submitAccount);$("account-logout").addEventListener("click",logout);
$("resend-verification").addEventListener("click",resendVerification);
$("search-players").addEventListener("click",searchPlayers);$("player-search").addEventListener("keydown",event=>{if(event.key==="Enter")searchPlayers();});
$("review-form").addEventListener("submit",postReview);
$("save-profile").addEventListener("click",saveProfile);$("avatar-file").addEventListener("change",uploadAvatar);$("share-profile").addEventListener("click",shareCurrentProfile);$("share-ranking").addEventListener("click",shareCurrentProfile);
 $("flip-board").addEventListener("click",()=>{boardFlipped=!boardFlipped;$("settings-flip").checked=boardFlipped;settings.flipped=boardFlipped;saveSettings();render();});
$("export-pgn").addEventListener("click",exportPgn);$("copy-fen").addEventListener("click",()=>navigator.clipboard?.writeText(game.fen()).then(()=>toast("FEN copied."),()=>toast("Clipboard unavailable.")));
 $("sound-toggle").addEventListener("change",e=>{soundOn=e.target.checked;$("settings-sound").checked=soundOn;settings.sound=soundOn;saveSettings();});
$("time-control").addEventListener("change",()=>{if(mode==="online")toast("Clocks are currently for computer games only.");resetClocks();});
$("offer-draw").addEventListener("click",()=>{if(mode!=="online"||!roomCode)return toast("Draw offers are available in online matches.");socket.emit("offerDraw",{code:roomCode});toast("Draw offer sent.");});
$("resign").addEventListener("click",()=>{if(mode!=="online"||!roomCode)return toast("Resignation is available in online matches.");if(confirm("Resign this game?"))socket.emit("resign",{code:roomCode});});
$("chat-form").addEventListener("submit",e=>{e.preventDefault();const message=$("chat-input").value.trim();if(!message)return;if(mode!=="online"||!roomCode||!onlineReady)return toast("Join an online room before sending a message.");if(!socket.connected)return toast("Chat is unavailable while disconnected.");socket.emit("chatMessage",{code:roomCode,message},reply=>{if(!reply?.ok)return toast(reply?.error||"Message could not be sent.");$("chat-input").value="";});});
$("footer-year").textContent=new Date().getFullYear();$("profile-name").textContent=name;
applySettings();updateStats();socket.emit("setProfile",{name,username:account?.username});resetClocks();loadAccount();loadLeaderboard();loadReviews();loadGoogleSignIn();verifyEmailFromLink();render();
const sharedPlayer=new URLSearchParams(location.search).get("player");if(sharedPlayer){showView("community",true);showPublicProfile(sharedPlayer);}
