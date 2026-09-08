import http from "node:http";
import { WebSocketServer } from "ws";
import { randomInt } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=process.env.PORT||3000;
const rooms=new Map();

function id(){return Math.random().toString(36).slice(2,9).toUpperCase()}
function roomCode(){let c; do c=Math.random().toString(36).slice(2,7).toUpperCase(); while(rooms.has(c)); return c}
function deck(){
 const suits=["♠","♥","♦","♣"], ranks=["2","3","4","5","6","7","8","9","10","J","Q","K","A"], d=[];
 for(const s of suits)for(const r of ranks)d.push({r,s});
 for(let i=d.length-1;i>0;i--){const j=randomInt(i+1);[d[i],d[j]]=[d[j],d[i]]}
 return d;
}
function publicRoom(r){
 return {code:r.code, max:r.max, started:r.started, host:r.host,
   players:r.players.map(p=>({id:p.id,name:p.name,score:p.score,connected:!!p.ws}))};
}
function send(ws,obj){if(ws?.readyState===1)ws.send(JSON.stringify(obj))}
function broadcast(r,obj){for(const p of r.players)send(p.ws,obj)}
function state(r){
 return {type:"state",room:publicRoom(r),community:r.community||[],
   turn:r.turn||null,round:r.round||0,phase:r.phase||"lobby",
   scores:Object.fromEntries(r.players.map(p=>[p.id,p.score]))};
}
function broadcastState(r){broadcast(r,state(r))}

const server=http.createServer((req,res)=>{
 let u=new URL(req.url,"http://localhost");
 let file=u.pathname==="/"?"/index.html":u.pathname;
 let safe=path.normalize(file).replace(/^(\.\.[/\\])+/, "");
 let full=path.join(__dirname,"public",safe);
 if(!full.startsWith(path.join(__dirname,"public"))){res.writeHead(403);return res.end("Forbidden")}
 fs.readFile(full,(err,data)=>{
  if(err){res.writeHead(404);return res.end("Not found")}
  const ext=path.extname(full); const type={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[ext]||"application/octet-stream";
  res.writeHead(200,{"Content-Type":type});res.end(data);
 });
});
const wss=new WebSocketServer({server});

wss.on("connection",ws=>{
 ws.on("message",raw=>{
  let m; try{m=JSON.parse(raw)}catch{return}
  if(m.type==="create"){
   const max=Math.max(2,Math.min(8,Number(m.max)||4)), code=roomCode();
   const p={id:id(),name:String(m.name||"Jogador").slice(0,18),score:0,ws};
   const r={code,max,host:p.id,players:[p],started:false,community:[],round:0,phase:"lobby",turn:null};
   rooms.set(code,r); ws.room=code;ws.pid=p.id; send(ws,{type:"joined",you:p.id,room:publicRoom(r)});broadcastState(r);return;
  }
  if(m.type==="join"){
   const r=rooms.get(String(m.code||"").toUpperCase()); if(!r)return send(ws,{type:"error",message:"Sala não encontrada."});
   if(r.players.length>=r.max)return send(ws,{type:"error",message:"Sala cheia."});
   const p={id:id(),name:String(m.name||"Jogador").slice(0,18),score:0,ws};r.players.push(p);ws.room=r.code;ws.pid=p.id;
   send(ws,{type:"joined",you:p.id,room:publicRoom(r)});broadcastState(r);return;
  }
  const r=rooms.get(ws.room); if(!r)return;
  const me=r.players.find(p=>p.id===ws.pid); if(!me)return;

  if(m.type==="chat"){broadcast(r,{type:"chat",name:me.name,text:String(m.text||"").slice(0,180)});return}
  if(m.type==="start"){
   if(me.id!==r.host)return;
   if(r.players.length<2)return send(ws,{type:"error",message:"São necessários pelo menos 2 jogadores."});
   r.started=true;r.phase="playing";r.round++;r.community=[];r.deck=deck();
   r.players.forEach(p=>p.hand=[r.deck.pop(),r.deck.pop()]);
   r.turn=r.players[0].id;broadcastState(r);r.players.forEach(p=>send(p.ws,{type:"hand",cards:p.hand}));return;
  }
  if(m.type==="next"){
   if(me.id!==r.host)return;
   if(!r.started)return;
   r.community.push(r.deck.pop()); if(r.community.length>=5){
    // Card Arena uses points, not betting: each player may reveal a card as an action.
    r.phase="results";r.turn=null;
    const scored=r.players.map(p=>({p,value:p.hand.reduce((a,c)=>a+["2","3","4","5","6","7","8","9","10","J","Q","K","A"].indexOf(c.r)+2,0)+r.community.reduce((a,c)=>a+["2","3","4","5","6","7","8","9","10","J","Q","K","A"].indexOf(c.r)+2,0)}));
    const best=Math.max(...scored.map(x=>x.value));scored.filter(x=>x.value===best).forEach(x=>x.p.score+=1);
   }else{
    const idx=r.players.findIndex(p=>p.id===r.turn);r.turn=r.players[(idx+1)%r.players.length].id;
    r.phase="playing";
   }
   broadcastState(r);return;
  }
  if(m.type==="reset"){
   if(me.id!==r.host)return;
   r.started=false;r.phase="lobby";r.community=[];r.turn=null;broadcastState(r);return;
  }
 });
 ws.on("close",()=>{
  const r=rooms.get(ws.room); if(!r)return;
  const p=r.players.find(x=>x.id===ws.pid);if(p)p.ws=null;
  broadcastState(r);
  if(r.players.every(x=>!x.ws)){rooms.delete(r.code)}
 });
});

server.listen(PORT,()=>console.log(`Card Arena running on port ${PORT}`));