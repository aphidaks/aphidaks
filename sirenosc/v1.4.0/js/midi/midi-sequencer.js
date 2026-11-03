
(function(){
'use strict';
var PPQ=480, KEYW=64, RULER=26, MAXN=8000, ACC='#ff7ac8';
var SNAPS={'1/1':1920,'1/2':960,'1/4':480,'1/8':240,'1/16':120,'1/32':60,'1/4T':320,'1/8T':160,'1/16T':80,'off':0};
var SNAPL=['1/1','1/2','1/4','1/8','1/16','1/32','1/4T','1/8T','1/16T','off'];
var NN=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function nname(n){ return NN[n%12]+(Math.floor(n/12)-1); }
function isBlack(n){ var k=n%12; return k===1||k===3||k===6||k===8||k===10; }
function $(id){ return document.getElementById(id); }
function cleanSeq(r){ return window._midiCleanSeq(r); }
function fnt(px){ var c=document.body.classList; return px+'px '+(c.contains('theme-old-classic')?'"MS Sans Serif Pixel",sans-serif':c.contains('font-open-sans')?'"Open Sans",sans-serif':'"Share Tech Mono",monospace'); }
function API(){ return window._ceApi&&window._ceApi.midi; }
function groupsN(){ try{ return Math.max(1,Math.min(24,seqNumGroups)); }catch(_){ return 24; } }
function bT(S){ return PPQ*4/S.den; }
function barT(S){ return bT(S)*S.num; }
function totT(S){ return barT(S)*S.bars; }
function gridT(S){ var k=S.snap, B=bT(S), f, v; if(k==='none'||k==='off') return 0; if(k==='bar') return barT(S); if(k==='beat') return B;
  f={'1/6s':20,'1/4s':30,'1/3s':40,'1/2s':60,'step':120}[k]; if(f) return f; f={'1/6b':6,'1/4b':4,'1/3b':3,'1/2b':2}[k]; if(f) return Math.max(1,Math.round(B/f));
  v=SNAPS[k]; return v===undefined?120:v; }
function snapT(S){ return gridT(S); }
function newLen(S){ return U.lastLen||gridT(S)||bT(S); }
var VER=(typeof WeakMap==='function')?new WeakMap():null;
function ver(S){ return VER?(VER.get(S)||0):0; }
function touch(S){ if(VER) VER.set(S,ver(S)+1); }

var U={id:0,tool:'draw',follow:true,sel:[],lastLen:0,msg:'',msgT:0,built:false,dirty:true,drag:null,aud:null,raf:0,lastSeq:null};
var PL={};
var LV={}, LB={}, HELD={}, LKB={}, LPT={}, MA=null, MAasked=false, MIN=[];

function board(){ var a=API(); return a?a.get(U.id):null; }
function seq(){ var a=API(); return (a&&U.id)?a.ensure(U.id):null; }
function player(id){ return PL[id]||(PL[id]={id:id,state:'stop',pos:0,last:performance.now(),ev:null,evSrc:null,evVer:-1,ei:0,cnt:{},lit:{}}); }
function setMsg(t){ U.msg=t; U.msgT=performance.now(); U.dirty=true; paintStatus(); }

function ready(id){
  var a=API(), b=a&&a.get(id); if(!b) return {ok:false,why:'BOARD REMOVED'};
  var v=a.vin(id), lo=Math.min(+b.d.vmin,+b.d.vmax), hi=Math.max(+b.d.vmin,+b.d.vmax);
  if(!(v>0)) return {ok:false,why:'NO POWER'};
  if(v<lo||v>hi) return {ok:false,why:'INPUT '+(Math.round(v*100)/100)+' V IS OUTSIDE THE RATED '+lo+'-'+hi+' V'};
  if(!a.wired(id)) return {ok:false,why:'DAMPER NOT WIRED'};
  return {ok:true,why:''};
}

function grpOf(id,n){ var b=API().get(id); if(!b) return 0; var g=n-Math.round(+b.d.low||0)+1; return (g>=1&&g<=24)?g:0; }
function parseMap(b){ var s0=String((b&&b.d&&b.d.nmap)||'').trim(); if(!s0) return null; var p=s0.split(','), low=Math.round(+b.d.low||0), m=[], i, t;
  for(i=0;i<24;i++){ t=(p[i]||'').trim(); if(t==='-') m.push(-1); else if(t===''||!isFinite(+t)) m.push(low+i<=127?low+i:-1); else m.push(clamp(Math.round(+t),0,127)); } return m; }
function grpsOf(id,n){ var b=API().get(id); if(!b) return []; var m=parseMap(b), o=[], i; if(!m){ var g=grpOf(id,n); return g?[g]:[]; }
  for(i=0;i<24;i++) if(m[i]===n) o.push(i+1); return o; }
function mapSet(b){ var m=parseMap(b), o={}, G=groupsN(), low=Math.round(+b.d.low||0), i;
  if(!m){ for(i=0;i<G;i++) if(low+i<=127) o[low+i]=[i+1]; return o; }
  for(i=0;i<G;i++) if(m[i]>=0) (o[m[i]]=o[m[i]]||[]).push(i+1); return o; }
function setGrp(p,n,on){ grpsOf(p.id,n).forEach(function(g){
  if(on){ if(!p.lit[g]&&window._midiDamperGroup&&window._midiDamperGroup(g,true)==='ok') p.lit[g]=1; }
  else if(p.lit[g]){ try{ window._midiDamperGroup(g,false); }catch(_){} delete p.lit[g]; } }); }
function noteOn(p,n){ p.cnt[n]=(p.cnt[n]||0)+1; if(p.cnt[n]===1) setGrp(p,n,true); }
function noteOff(p,n){ if(!p.cnt[n]) return; p.cnt[n]--; if(!p.cnt[n]){ delete p.cnt[n]; setGrp(p,n,false); } }
function releaseAll(p){ p.cnt={}; Object.keys(p.lit).forEach(function(g){ try{ if(window._midiDamperGroup) window._midiDamperGroup(+g,false); }catch(_){} }); p.lit={}; }
function rebuild(p,S){ var ev=[]; S.notes.forEach(function(a){ ev.push([a[1],1,a[0]]); ev.push([a[1]+a[2],0,a[0]]); });
  ev.sort(function(x,y){ return x[0]-y[0]||x[1]-y[1]; }); p.ev=ev; p.evSrc=S; p.evVer=ver(S); p.ei=firstIdx(ev,p.pos); }
function firstIdx(ev,t){ var lo=0,hi=ev.length; while(lo<hi){ var m=(lo+hi)>>1; if(ev[m][0]<t) lo=m+1; else hi=m; } return lo; }
function startedAt(p,S){ S.notes.forEach(function(a){ if(a[1]<p.pos&&a[1]+a[2]>p.pos) noteOn(p,a[0]); }); }
function fire(p,upto,end){ var ev=p.ev; while(p.ei<ev.length){ var e=ev[p.ei]; if(e[0]>upto) break; if(e[1]===1&&e[0]>=end) break; if(e[1]===1) noteOn(p,e[2]); else noteOff(p,e[2]); p.ei++; } }
function say(p,name){ try{ var b=API().get(p.id), q=b&&b.seqs&&b.seqs[b.sq]; if(window._feDataFrom) window._feDataFrom('b'+p.id,String((b&&b.d.name)||'MIDI'),name,String((q&&q.name)||'')); }catch(_){} }
function setState(p,st){ p.state=st; try{ API().playing(p.id,st==='play'); }catch(_){} U.dirty=true; paintTransport(); }
function play(id){ if(LV[id]) setLive(id,false); var p=player(id), rd=ready(id); if(p.state==='play') return;
  if(!rd.ok){ if(id===U.id) setMsg(rd.why); return; }
  var S=API().ensure(id); if(!S.notes.length){ if(id===U.id) setMsg('NOTHING TO PLAY'); return; }
  if(p.pos>=totT(S)) p.pos=0; p.last=performance.now(); rebuild(p,S); releaseAll(p); startedAt(p,S); setState(p,'play'); say(p,'started'); }
function pause(id){ var p=player(id); if(p.state!=='play') return; releaseAll(p); setState(p,'pause'); say(p,'paused'); }
function stop(id,silent){ var p=player(id), was=p.state!=='stop'; releaseAll(p); p.pos=0; p.ei=0; if(was){ setState(p,'stop'); if(!silent) say(p,'stopped'); } else U.dirty=true; }
function stopAll(){ Object.keys(PL).forEach(function(k){ stop(+k,true); }); }
function seek(id,t){ var p=player(id), S=API().ensure(id); if(!S) return; p.pos=Math.max(0,Math.min(totT(S),t)); U.dirty=true;
  if(p.state==='play'){ releaseAll(p); rebuild(p,S); startedAt(p,S); } }
function tick(){
  var now=performance.now(), a=API(); if(!a) return;
  Object.keys(PL).forEach(function(k){ var p=PL[k], dt=now-p.last; p.last=now; if(p.state!=='play'||window._simPaused) return;
    var b=a.get(+k); if(!b){ releaseAll(p); p.state='stop'; p.pos=0; return; }
    var rd=ready(+k); if(!rd.ok){ releaseAll(p); setState(p,'pause'); say(p,'paused'); if(+k===U.id) setMsg('PAUSED: '+rd.why); return; }
    var S=b.seq||a.ensure(+k); if(p.evSrc!==S||p.evVer!==ver(S)) rebuild(p,S);
    dt=Math.min(dt,100); p.pos+=dt/1000*S.tempo/60*PPQ; var end=totT(S), g=0;
    while(p.pos>=end&&g++<4){ fire(p,end,end); releaseAll(p);
      if(S.loop){ p.pos-=end; if(p.pos>=end) p.pos=0; p.ei=0; say(p,'loop'); }
      else { p.pos=0; p.ei=0; setState(p,'stop'); say(p,'finished'); return; } }
    fire(p,p.pos,end); });
}
setInterval(tick,8);
(function(){ var o=window._ctlStopAll; window._ctlStopAll=function(){ try{ stopAll(); }catch(_){} return o?o.apply(this,arguments):undefined; }; })();
var LKEYS={KeyZ:0,KeyS:1,KeyX:2,KeyD:3,KeyC:4,KeyV:5,KeyG:6,KeyB:7,KeyH:8,KeyN:9,KeyJ:10,KeyM:11,KeyQ:12,Digit2:13,KeyW:14,Digit3:15,KeyE:16,KeyR:17,Digit5:18,KeyT:19,Digit6:20,KeyY:21,Digit7:22,KeyU:23};
var LLAB=['Z','S','X','D','C','V','G','B','H','N','J','M','Q','2','W','3','E','R','5','T','6','Y','7','U'];
function liveBase(id){ var b=API().get(id), d=b?Math.floor((Math.round(+b.d.low||0))/12)*12:48, v=(LB[id]==null)?d:LB[id]; return clamp(Math.round(v/12)*12,0,96); }
function liveOn(id,n,src){ if(!LV[id]) return; var rd=ready(id); if(!rd.ok){ U.lvMsg=rd.why; paintLive(); return; }
  var k=id+'|'+src+'|'+n; if(HELD[k]) return; HELD[k]=1; U.lvMsg=''; noteOn(player(id),n); paintLive(); }
function liveOff(id,n,src){ var k=id+'|'+src+'|'+n; if(!HELD[k]) return; delete HELD[k]; noteOff(player(id),n); paintLive(); }
function liveRelAll(id){ Object.keys(HELD).forEach(function(k){ if(k.split('|')[0]===String(id)) delete HELD[k]; });
  Object.keys(LKB).forEach(function(c){ if(LKB[c].id===id) delete LKB[c]; }); Object.keys(LPT).forEach(function(c){ if(LPT[c].id===id) delete LPT[c]; });
  releaseAll(player(id)); paintLive(); }
function setLive(id,on){ on=!!on; if(!!LV[id]===on) return; var p=player(id);
  if(on){ stop(id); LV[id]=true; U.lvMsg=''; liveMidiInit(); say(p,'live'); }
  else { liveRelAll(id); delete LV[id]; say(p,'seqmode'); }
  if(id===U.id) applyMode(); U.dirty=true; }
function liveShift(d){ var id=U.id; if(!LV[id]) return; LB[id]=clamp(liveBase(id)+d,0,96); renderKeys(); }
function liveKeyDown(e){ if(e.ctrlKey||e.metaKey||e.altKey) return; var c=e.code;
  if(c==='ArrowLeft'||c==='ArrowRight'){ e.preventDefault(); liveShift(c==='ArrowLeft'?-12:12); return; }
  var o=LKEYS[c]; if(o===undefined) return; e.preventDefault(); if(e.repeat||LKB[c]) return;
  var n=liveBase(U.id)+o; LKB[c]={id:U.id,n:n}; liveOn(U.id,n,'kb'+c); }
function liveKeyUp(e){ var h=LKB[e.code]; if(!h) return; delete LKB[e.code]; liveOff(h.id,h.n,'kb'+e.code); }
function liveBlur(){ Object.keys(LKB).forEach(function(c){ var h=LKB[c]; delete LKB[c]; liveOff(h.id,h.n,'kb'+c); });
  Object.keys(LPT).forEach(function(c){ var h=LPT[c]; delete LPT[c]; liveOff(h.id,h.n,'p'+c); }); }
function keyEl(e){ var el=e.target&&e.target.closest&&e.target.closest('.mdk'); return (el&&el.dataset)?el:null; }
function livePtrDown(e){ var el=keyEl(e); if(!el||!LV[U.id]) return; e.preventDefault(); var n=+el.dataset.n; LPT[e.pointerId]={id:U.id,n:n}; liveOn(U.id,n,'p'+e.pointerId); }
function livePtrMove(e){ var h=LPT[e.pointerId]; if(!h) return; var el=keyEl(e); if(!el) return; var n=+el.dataset.n; if(n===h.n) return; liveOff(h.id,h.n,'p'+e.pointerId); h.n=n; liveOn(h.id,n,'p'+e.pointerId); }
function livePtrUp(e){ var h=LPT[e.pointerId]; if(!h) return; delete LPT[e.pointerId]; liveOff(h.id,h.n,'p'+e.pointerId); }
function liveMidiInit(){ if(MAasked) return; MAasked=true;
  if(!navigator.requestMIDIAccess){ U.midiMsg='NOT SUPPORTED BY THIS BROWSER'; paintLive(); return; }
  try{ navigator.requestMIDIAccess().then(function(a){ MA=a; a.onstatechange=hookMidi; hookMidi(); },function(){ MAasked=false; U.midiMsg='ACCESS DENIED'; paintLive(); }); }catch(_){ MAasked=false; U.midiMsg='UNAVAILABLE'; paintLive(); } }
function hookMidi(){ var nm=[]; if(!MA) return; MA.inputs.forEach(function(inp){ inp.onmidimessage=midiIn; if(inp.state!=='disconnected') nm.push(inp.name||'MIDI INPUT'); }); MIN=nm; U.midiMsg=''; paintLive(); }
function midiIn(ev){ var d=ev.data; if(!d||d.length<2) return; var st=d[0]&0xF0, n=d[1], v=d.length>2?d[2]:0;
  if(st===0xB0&&n===123){ Object.keys(HELD).forEach(function(k){ var q=k.split('|'); if(q[1]==='midi') liveOff(+q[0],+q[2],'midi'); }); return; }
  var on=(st===0x90&&v>0), off=(st===0x80||(st===0x90&&v===0)); if(!on&&!off) return;
  Object.keys(LV).forEach(function(id){ if(on) liveOn(+id,n,'midi'); else liveOff(+id,n,'midi'); }); }
function renderKeys(){ var host=$('mdKeys'), b=board(); if(!host||!b||!LV[U.id]) return;
  var base=liveBase(U.id), MM=mapSet(b), w=100/14, bw=w*0.62, wc=0, W='', B='', i;
  for(i=0;i<24;i++){ var n=base+i, blk=isBlack(n), g=MM[n], tag=g?'G'+g.join('/'):'', nm=(i%12===0)?nname(n):'', left, inner;
    inner='<span style="font-size:9px;color:#2f8a1f;pointer-events:none">'+tag+'</span><span style="display:flex;flex-direction:column;align-items:center;pointer-events:none"><span style="font-size:9px;opacity:.7">'+nm+'</span><b style="font-size:11px">'+LLAB[i]+'</b></span>';
    if(blk){ left=wc*w-bw/2; B+='<div class="mdk" data-n="'+n+'" data-b="1" data-m="'+(g?1:0)+'" style="position:absolute;left:'+left+'%;top:0;width:'+bw+'%;height:62%;box-sizing:border-box;border:1px solid #0b0d0f;border-radius:0 0 3px 3px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:3px 0;color:#d8dde3;cursor:pointer;z-index:2">'+inner+'</div>'; }
    else { left=wc*w; wc++; W+='<div class="mdk" data-n="'+n+'" data-b="0" data-m="'+(g?1:0)+'" style="position:absolute;left:'+left+'%;top:0;width:'+w+'%;height:100%;box-sizing:border-box;border:1px solid #101215;border-radius:0 0 4px 4px;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:3px 0;color:#1b1e22;cursor:pointer;z-index:1">'+inner+'</div>'; } }
  host.innerHTML=W+B; paintLive(); }
function paintLive(){ if(!LV[U.id]) return; var host=$('mdKeys'), p=player(U.id);
  if(host) Array.prototype.forEach.call(host.children,function(el){ var lit=!!p.cnt[+el.dataset.n], bl=el.dataset.b==='1', mp=el.dataset.m==='1'; el.style.background=lit?'#ffb552':(bl?(mp?'#1b1e22':'#3a4046'):(mp?'#e7eaee':'#a3a9b0')); });
  var r=$('mdLvRange'); if(r){ var bs=liveBase(U.id); r.textContent=nname(bs)+' - '+nname(bs+23); }
  var f=$('mdLvInfo'); if(f){ f.textContent=(U.lvMsg?U.lvMsg+'   |   ':'')+'MIDI KEYBOARD: '+(U.midiMsg||(MIN.length?MIN.join(', '):'NONE DETECTED')); f.style.color=U.lvMsg?'#ff7a6a':'#aab3bd'; } }
function applyMode(){ if(!panel||!U.built) return; var lv=!!LV[U.id], d=lv?'none':'';
  ['mdPlay','mdStop','mdLoop','mdFollow','mdPos'].forEach(function(i){ var e=$(i); if(e) e.style.display=d; });
  var tr=$('mdToolRow'); if(tr) tr.style.display=d; var wr=panel.querySelector('.mdwrap'); if(wr&&wr.id!=='mdKeysWrap') wr.style.display=d;
  var L=$('mdLive'); if(L) L.style.display=lv?'flex':'none';
  var a=$('mdModeSeq'), c=$('mdModeLive'); if(a) a.className='vbtn '+(lv?'btn-gray':'btn-accent'); if(c) c.className='vbtn '+(lv?'btn-accent':'btn-gray');
  if(lv) renderKeys(); else { layout(); U.dirty=true; } }
window._midiInfo=function(key){ var id=+String(key).slice(1), a=API(); if(!a) return null; var b=a.get(id); if(!b) return null; var p=player(id), S=a.ensure(id); if(!S) return null;
  function sec(t){ return S.tempo>0?Math.round(t/PPQ*60/S.tempo*100)/100:0; }
  return {mode:LV[id]?'live':'sequence', state:p.state==='play'?'playing':p.state==='pause'?'paused':'stopped', seq:b.sq+1, seqName:String(S.name||''), seqCount:b.seqs.length, length:sec(totT(S)), pos:sec(p.pos), tempo:S.tempo, loop:!!S.loop, bars:S.bars, notes:S.notes.length}; };
window._midiMsg=function(key,msg,dat,from){ var id=+String(key).slice(1), a=API(); if(!a||!a.get(id)) return false; var m=String(msg).trim().toLowerCase(), p=player(id);
  if(m==='mode live') setLive(id,true); else if(m==='mode sequence'||m==='mode seq') setLive(id,false);
  else if(m==='play'||m==='start') play(id); else if(m==='pause') pause(id); else if(m==='stop') stop(id);
  else if(m==='toggle'){ if(p.state==='play') pause(id); else play(id); }
  else if(m==='restart'){ stop(id,true); play(id); }
  else if(/^seq(uence)?\s+/.test(m)){ var arg=m.replace(/^seq(uence)?\s+/,'').trim(), bd=a.get(id), ix=-1; if(/^\d+$/.test(arg)) ix=+arg-1; else bd.seqs.forEach(function(q,i){ if(ix<0&&String(q.name).toLowerCase()===arg) ix=i; });
    if(ix>=0&&ix<bd.seqs.length){ var wp=p.state==='play'; stop(id,true); bd.sq=ix; a.ensure(id); try{ a.changed(); }catch(_){} if(id===U.id){ U.sel=[]; U.lastSeq=null; syncFields(); layout(); initScroll(); } U.dirty=true; if(wp) play(id); say(p,'sequence'); } }
  else if(m==='loop on'||m==='loop off'){ var S=a.ensure(id); S.loop=(m==='loop on'); touch(S); if(id===U.id) syncFields(); }
  return true; };

function edit(fn){ var S=seq(); if(!S) return; fn(S); touch(S); try{ API().changed(); }catch(_){} layout(); U.dirty=true; }
function curPos(){ var p=PL[U.id]; return p?p.pos:0; }
function toTick(S,vx){ return (vx-KEYW+scr.scrollLeft)/(S.zx/PPQ); }
function toNote(S,vy){ return 127-Math.floor((vy-RULER+scr.scrollTop)/S.zy); }
function snapTick(S,t,floorIt){ var g=U.alt?0:snapT(S); if(!g) return Math.round(t); return (floorIt?Math.floor(t/g):Math.round(t/g))*g; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

var panel,scr,cv,ctx,sp,cw=300,ch=300,dpr=1;
function lab(t){ return '<label style="font-size:10px;letter-spacing:1px;color:var(--muted);margin:0 2px 0 6px;white-space:nowrap">'+t+'</label>'; }
function bt(id,t,cls,tip){ return '<button type="button" class="vbtn '+(cls||'btn-gray')+'" id="'+id+'"'+(tip?' title="'+tip+'"':'')+' style="font-size:11px;padding:3px 9px;letter-spacing:1px">'+t+'</button>'; }
function build(){
  panel=$('ctrlPanelMidi'); if(!panel||U.built) return; U.built=true;
  if(!document.getElementById('mdFlCss')){ var cs=document.createElement('style'); cs.id='mdFlCss'; cs.textContent=
   '#ctrlPanelMidi #mdMain{background:#2b3035;border:1px solid #14171a;border-radius:4px;padding:6px;gap:5px !important}'+
   '#mdMain .mdbar{background:linear-gradient(#3b4249,#2f353b);border:1px solid #181b1f;border-radius:3px;padding:4px 6px;gap:4px !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}'+
   '#mdMain .mdsep{width:1px;align-self:stretch;background:#1b1f23;box-shadow:1px 0 0 rgba(255,255,255,.06);margin:0 5px}'+
   '#mdMain .mdttl{font-size:11px;letter-spacing:2px;color:#ff9a2e;font-weight:bold;margin-right:4px}'+
   '#mdMain button.vbtn{border-radius:2px !important;background-color:#3f464e !important;background-image:linear-gradient(#4d555e,#3a4149) !important;border:1px solid #181b1f !important;color:#d8dde3;box-shadow:inset 0 1px 0 rgba(255,255,255,.14);text-shadow:none !important}'+
   '#mdMain button.vbtn,#mdMain button.vbtn:hover,#mdMain button.vbtn:active,#mdMain button.vbtn:focus,#mdMain button.vbtn:focus-visible{color:#d8dde3 !important;outline:none}'+
   '#mdMain button.vbtn:hover{background-color:#4a525b !important;background-image:linear-gradient(#5a636d,#444c55) !important}'+
   '#mdMain button.vbtn:active{background-color:#3a4149 !important;background-image:linear-gradient(#3a4149,#4d555e) !important}'+
   '#mdMain button.vbtn.btn-accent,#mdMain button.vbtn.btn-accent:hover,#mdMain button.vbtn.btn-accent:active,#mdMain button.vbtn.btn-accent:focus{color:#1d0f03 !important}'+
   '#mdMain button.vbtn.btn-accent:hover{background-color:#f08028 !important;background-image:linear-gradient(#ffc06a,#f08028) !important}'+
   '#mdMain button.vbtn.btn-accent:active{background-color:#e8731a !important;background-image:linear-gradient(#e8731a,#ffb552) !important}'+
   '#mdMain button.vbtn.btn-red,#mdMain button.vbtn.btn-red:hover,#mdMain button.vbtn.btn-red:active,#mdMain button.vbtn.btn-red:focus{color:#ffbcbc !important}'+
   '#mdMain button.vbtn.btn-red:hover{background-color:#552828 !important;background-image:linear-gradient(#7d3c3c,#552828) !important}'+
   '#mdMain button.vbtn.btn-red:active{background-color:#4a2222 !important;background-image:linear-gradient(#4a2222,#6d3434) !important}'+
   '#mdMain button.vbtn.btn-accent{background-color:#e8731a !important;background-image:linear-gradient(#ffb552,#e8731a) !important;color:#1d0f03;border:1px solid #6e3407 !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}'+
   '#mdMain button.vbtn.btn-red{background-color:#4a2222 !important;background-image:linear-gradient(#6d3434,#4a2222) !important;color:#ffbcbc;border:1px solid #181b1f !important}'+
   '#mdMain select,#mdMain input[type=number]{background:#171a1d;color:#ffb454;border:1px solid #0b0d0f;border-radius:2px;box-shadow:inset 0 1px 2px rgba(0,0,0,.6)}'+
   '#mdMain label{color:#9ba4ae !important}'+
   '#ctrlPanelMidi #mdMain{position:relative}'+
   '#mdSizeMenu{position:absolute;z-index:60;background:var(--panel);color:var(--text);border:1px solid var(--border);box-shadow:2px 2px 8px rgba(0,0,0,.45);padding:2px;min-width:190px;max-height:70vh;overflow:auto;font-size:12px}'+
   '#mdSizeMenu .mdmt{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:4px 8px 2px}'+
   '#mdSizeMenu .mdmi{position:relative;padding:4px 14px 4px 28px;font-size:12px;color:var(--text);cursor:pointer;white-space:nowrap;letter-spacing:0}'+
   '#mdSizeMenu .mdmi.rad{padding-left:28px}'+
   '#mdSizeMenu .mdmi:hover{background:var(--accent);color:var(--on-accent,#fff)}'+
   '#mdSizeMenu .mdmi.rad::before{content:"";position:absolute;left:9px;top:50%;width:8px;height:8px;margin-top:-5px;border:1px solid var(--muted);border-radius:50%;background:transparent}'+
   '#mdSizeMenu .mdmi.rad.on::before{background:radial-gradient(circle,currentColor 0 38%,transparent 42%);border-color:currentColor}'+
   '#mdSizeMenu .mdsepi{height:1px;background:var(--border);margin:3px 2px}'+
   '#mdMain select{width:auto !important;flex:0 0 auto !important}'+
   '#mdMain #mdPos{background:#101315;border:1px solid #0a0c0d;border-radius:2px;padding:3px 8px;color:#ffa83a !important;box-shadow:inset 0 1px 3px rgba(0,0,0,.8);text-shadow:0 0 6px rgba(255,150,40,.45)}'+
   '#mdMain .mdwrap{border:1px solid #101215;border-radius:3px;background:#262b30;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}'+
   '#mdMain #mdStat{background:#1d2125;border:1px solid #121518;border-radius:2px;padding:3px 7px;color:#aab3bd}';
   document.head.appendChild(cs); }
  var SEP='<span class="mdsep"></span>';
  panel.innerHTML=
   '<div id="mdNone" style="display:none;padding:24px;text-align:center;color:var(--muted);letter-spacing:1px">NO MIDI BOARD - ADD ONE FROM THE LAYOUT TAB</div>'+
   '<div id="mdMain" style="display:flex;flex-direction:column;gap:8px">'+
   '<div class="row mdbar" style="flex-wrap:wrap;align-items:center;justify-content:flex-start">'+
     '<span class="mdttl">PIANO ROLL</span>'+lab('BOARD')+'<select id="mdBoard" style="font-size:11px;padding:3px 6px;max-width:170px"></select>'+SEP+bt('mdModeSeq','SEQUENCE MODE','btn-accent','Sequence mode: piano roll and sequencer')+bt('mdModeLive','LIVE MODE','btn-gray','Live mode: play the dampers from an on-screen keyboard, the computer keyboard or a MIDI keyboard')+SEP+
     lab('SEQUENCE')+'<select id="mdSeq" style="font-size:11px;padding:3px 6px;max-width:190px"></select>'+
     bt('mdSeqNew','NEW','btn-gray','Add an empty sequence to this board')+bt('mdSeqDup','COPY','btn-gray','Duplicate the current sequence')+bt('mdSeqRen','RENAME','btn-gray','Rename the current sequence')+bt('mdSeqDel','DELETE','btn-red','Delete the current sequence')+SEP+
     bt('mdImp','IMPORT .MID')+bt('mdExp','EXPORT .MID')+bt('mdClr','CLEAR NOTES','btn-red')+
     '<input type="file" id="mdFile" accept=".mid,.midi,audio/midi,audio/x-midi" style="display:none">'+
   '</div>'+
   '<div class="row mdbar" style="flex-wrap:wrap;align-items:center;justify-content:flex-start">'+
     bt('mdPlay','PLAY','btn-accent')+bt('mdStop','STOP')+bt('mdLoop','LOOP')+bt('mdFollow','FOLLOW')+
     '<span id="mdPos" style="font-size:13px;min-width:112px;text-align:center;margin-left:4px">001.1</span>'+SEP+
     lab('TEMPO')+'<input type="number" id="mdTempo" min="20" max="400" step="1" style="width:64px;font-size:11px;padding:3px 5px">'+
     lab('SIG')+'<input type="number" id="mdNum" min="1" max="32" step="1" style="width:46px;font-size:11px;padding:3px 5px"><span style="color:var(--muted)">/</span>'+
       '<select id="mdDen" style="font-size:11px;padding:3px 5px"><option>1</option><option>2</option><option>4</option><option>8</option><option>16</option><option>32</option></select>'+
     lab('BARS')+'<input type="number" id="mdBars" min="1" max="256" step="1" style="width:56px;font-size:11px;padding:3px 5px">'+SEP+
     lab('GROUP 1 =')+'<input type="number" id="mdLow" min="0" max="127" step="1" title="Lowest MIDI note (= Damper group 1)" style="width:56px;font-size:11px;padding:3px 5px"><span id="mdLowN" style="font-size:10px;color:#ffb454;min-width:26px"></span>'+bt('mdMapNotes','MAP NOTES','btn-gray','Map notes: choose which MIDI note opens each damper. Note plays = damper open, note not playing = damper closed')+
   '</div>'+
   '<div class="row mdbar" style="flex-wrap:wrap;align-items:center;justify-content:flex-start" id="mdToolRow">'+
     bt('mdDraw','DRAW','btn-accent','Draw (P): click to place a note, hold and drag to position it. Right-click erases, Ctrl+drag selects, Alt disables snap, middle-drag pans, Shift+middle-drag zooms rows')+bt('mdDel','DELETE','btn-gray','Delete (D): click or drag over notes to remove them')+
     bt('mdSlice','SLICE','btn-gray','Slice (C): click a note to cut it at the snap position')+bt('mdSel','SELECT','btn-gray','Select (E): drag a box to select notes')+SEP+
     bt('mdSnapBtn','<svg width="17" height="17" viewBox="0 0 24 24" style="display:block;pointer-events:none"><path d="M4 3h5.5v9.2a2.5 2.5 0 0 0 5 0V3H20v9.2a8 8 0 0 1-16 0z" fill="#fff"/><rect x="4" y="3" width="5.5" height="4" fill="#fff"/><rect x="14.5" y="3" width="5.5" height="4" fill="#fff"/></svg>','btn-gray','Snap: click for grid size, right-click or long-press for stock note lengths')+SEP+
     lab('ZOOM H')+bt('mdXm','<svg class="si" aria-hidden="true"><use href="#si-minus"/></svg>','btn-gray','Zoom out (time)')+bt('mdXp','<svg class="si" aria-hidden="true"><use href="#si-plus"/></svg>','btn-gray','Zoom in (time)')+lab('V')+
     bt('mdYm','<svg class="si" aria-hidden="true"><use href="#si-minus"/></svg>','btn-gray','Shrink rows')+bt('mdYp','<svg class="si" aria-hidden="true"><use href="#si-plus"/></svg>','btn-gray','Grow rows')+
   '</div>'+
   '<div class="mdwrap" style="position:relative;overflow:hidden">'+
     '<div id="mdScroll" style="overflow:auto;position:relative;height:calc(100vh / var(--uiz,1) - 330px);min-height:300px"><canvas id="mdCv" style="position:sticky;top:0;left:0;display:block;touch-action:none"></canvas><div id="mdSp" style="pointer-events:none"></div></div>'+
   '</div>'+
   '<div id="mdLive" style="display:none;flex-direction:column;gap:6px">'+
     '<div class="row mdbar" style="flex-wrap:wrap;align-items:center;justify-content:flex-start">'+bt('mdLvDn','<svg class="si" aria-hidden="true"><use href="#si-minus"/></svg> OCT','btn-gray','Octave down (Left arrow)')+'<span id="mdLvRange" style="font-size:12px;min-width:96px;text-align:center;color:#ffb454"></span>'+bt('mdLvUp','OCT +','btn-gray','Octave up (Right arrow)')+SEP+'<span id="mdLvInfo" style="font-size:10px;letter-spacing:1px;color:#aab3bd;line-height:1.5"></span></div>'+
     '<div class="mdwrap" id="mdKeysWrap" style="padding:10px"><div id="mdKeys" style="position:relative;height:170px;touch-action:none;user-select:none;-webkit-user-select:none"></div></div>'+
   '</div>'+
   '</div>';
  scr=$('mdScroll'); cv=$('mdCv'); sp=$('mdSp'); ctx=cv.getContext('2d');
  panel.addEventListener('contextmenu',function(e){ var t=e.target.closest&&e.target.closest('#mdSnapBtn'); if(t){ e.preventDefault(); U.lpFired=false; stockMenu(t); } });
  panel.addEventListener('pointerdown',function(e){ var t=e.target.closest&&e.target.closest('#mdSnapBtn'); if(t&&e.button===0){ clearTimeout(U.lp); U.lpFired=false; U.lp=setTimeout(function(){ U.lpFired=true; stockMenu(t); },500); } });
  ['pointerup','pointercancel','pointerleave'].forEach(function(n){ panel.addEventListener(n,function(){ clearTimeout(U.lp); },true); });
  panel.addEventListener('click',onClick); panel.addEventListener('change',onChange); panel.addEventListener('input',onInput);
  scr.addEventListener('scroll',function(){ U.dirty=true; });
  scr.addEventListener('wheel',onWheel,{passive:false});
  cv.addEventListener('pointerdown',onDown); cv.addEventListener('pointermove',onMove); cv.addEventListener('pointerup',onUp); cv.addEventListener('pointercancel',onUp);
  cv.addEventListener('contextmenu',function(e){ e.preventDefault(); });
  cv.addEventListener('mousedown',function(e){ if(e.button===1) e.preventDefault(); }); cv.addEventListener('auxclick',function(e){ e.preventDefault(); });
  document.addEventListener('keydown',onKey); document.addEventListener('keyup',liveKeyUp); window.addEventListener('blur',liveBlur);
  document.addEventListener('pointerup',livePtrUp); document.addEventListener('pointercancel',livePtrUp);
  var _kh=$('mdKeys'); if(_kh){ _kh.addEventListener('pointerdown',livePtrDown); _kh.addEventListener('pointermove',livePtrMove); _kh.addEventListener('contextmenu',function(e){ e.preventDefault(); }); }
  if(window.ResizeObserver) new ResizeObserver(function(){ layout(); U.dirty=true; }).observe(scr);
  window.addEventListener('resize',function(){ layout(); U.dirty=true; });
}
function isVisible(){ return panel&&panel.offsetParent!==null&&panel.style.display!=='none'; }
function fillBoards(){ var a=API(), sel=$('mdBoard'); if(!a||!sel) return 0; var L=a.list();
  if(!L.some(function(b){ return b.id===U.id; })) U.id=L.length?L[0].id:0;
  var h=L.map(function(b){ return '<option value="'+b.id+'"'+(b.id===U.id?' selected':'')+'>'+String(b.name).replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</option>'; }).join('');
  if(sel.innerHTML!==h) sel.innerHTML=h; var none=$('mdNone'), main=$('mdMain'); if(none) none.style.display=L.length?'none':''; if(main) main.style.display=L.length?'flex':'none'; return L.length; }
function fillSeqs(){ var b=board(), sel=$('mdSeq'); if(!b||!sel) return; var S0=seq(); var h=b.seqs.map(function(q,i){ return '<option value="'+i+'"'+(i===b.sq?' selected':'')+'>'+(i+1)+'. '+String(q.name).replace(/&/g,'&amp;').replace(/</g,'&lt;')+' ('+q.notes.length+')</option>'; }).join('');
  if(sel.innerHTML!==h) sel.innerHTML=h; sel.value=String(b.sq); }
function newSeqName(b,base){ var n=b.seqs.length+1, nm; do{ nm=base+' '+n++; }while(b.seqs.some(function(q){ return q.name===nm; })); return nm; }
function addSeq(b,q,activate){ if(b.seqs.length>=32){ setMsg('SEQUENCE LIMIT (32) REACHED'); return false; } b.seqs.push(q); if(activate) b.sq=b.seqs.length-1; return true; }
function selectSeq(i){ var b=board(); if(!b) return; var was=PL[U.id]&&PL[U.id].state==='play'; stop(U.id,true); b.sq=clamp(Math.round(i)||0,0,b.seqs.length-1); API().ensure(U.id);
  U.sel=[]; U.lastSeq=null; try{ API().changed(); }catch(_){} syncFields(); layout(); initScroll(); U.dirty=true; if(was) play(U.id); }
function syncFields(){ var S=seq(), b=board(); if(!S||!b||!panel) return; fillSeqs();
  $('mdTempo').value=S.tempo; $('mdNum').value=S.num; $('mdDen').value=S.den; $('mdBars').value=S.bars; $('mdLow').value=Math.round(+b.d.low||0); paintLow(); var _mn=$('mdMapNotes'), _cm=!!parseMap(b); if(_mn) _mn.className='vbtn '+(_cm?'btn-accent':'btn-gray'); $('mdLow').style.opacity=_cm?'.45':''; applyMode();
  $('mdLoop').className='vbtn '+(S.loop?'btn-accent':'btn-gray'); $('mdFollow').className='vbtn '+(U.follow?'btn-accent':'btn-gray');
  $('mdDraw').className='vbtn '+(U.tool==='draw'?'btn-accent':'btn-gray'); $('mdSel').className='vbtn '+(U.tool==='sel'?'btn-accent':'btn-gray'); $('mdDel').className='vbtn '+(U.tool==='del'?'btn-accent':'btn-gray'); $('mdSlice').className='vbtn '+(U.tool==='slice'?'btn-accent':'btn-gray'); $('mdSnapBtn').className='vbtn '+(gridT(S)?'btn-accent':'btn-gray'); paintTransport(); }
function paintLow(){ var b=board(); var e=$('mdLowN'); if(e&&b) e.textContent=nname(clamp(Math.round(+b.d.low||0),0,127)); }
function paintTransport(){ if(!panel||!U.built) return; var p=PL[U.id], pl=p&&p.state==='play'; var e=$('mdPlay'); if(e){ e.innerHTML=pl?'PAUSE':'PLAY'; e.className='vbtn '+(pl?'btn-gray':'btn-accent'); } }
function paintStatus(){ var e=$('mdStat'); if(!e) return; var p=PL[U.id], st=p?p.state:'stop', b=board(), S=seq();
  var t=(performance.now()-U.msgT<6000&&U.msg)?U.msg:(function(){ var rd=ready(U.id); return (st==='play'?'PLAYING':st==='pause'?'PAUSED':'STOPPED')+(rd.ok?'  |  OUTPUT READY':'  |  '+rd.why); })();
  var n=S?S.notes.length:0, sl=U.sel.length; e.textContent=t+'   ['+n+' NOTE'+(n===1?'':'S')+(sl?', '+sl+' SELECTED':'')+']'; }
function layout(){ if(!scr||!cv) return; var S=seq(); if(!S) return;
  dpr=window.devicePixelRatio||1; cw=Math.max(200,scr.clientWidth); ch=Math.max(120,scr.clientHeight);
  cv.width=Math.round(cw*dpr); cv.height=Math.round(ch*dpr); cv.style.width=cw+'px'; cv.style.height=ch+'px';
  var W=KEYW+totT(S)*(S.zx/PPQ)+160, H=RULER+128*S.zy; sp.style.width=W+'px'; sp.style.height=H+'px'; sp.style.marginTop=(-ch)+'px'; }
function closeSizeMenu(){ var m=$('mdSizeMenu'); if(m&&m.parentNode) m.parentNode.removeChild(m); document.removeEventListener('mousedown',menuOut,true); document.removeEventListener('keydown',menuEsc,true); }
function menuOut(e){ var m=$('mdSizeMenu'); if(m&&!m.contains(e.target)&&!(e.target.closest&&e.target.closest('#mdSnapBtn'))) closeSizeMenu(); }
function menuEsc(e){ if(e.key==='Escape'){ e.stopPropagation(); closeSizeMenu(); } }
function openMenu(btn,title,items,pick){ closeSizeMenu(); var m=document.createElement('div'); m.id='mdSizeMenu'; m.style.left=btn.offsetLeft+'px'; m.style.top=(btn.offsetTop+btn.offsetHeight+2)+'px';
  m.innerHTML=(title?'<div class="mdmt">'+title+'</div>':'')+items.map(function(it,i){ return it==='-'?'<div class="mdsepi"></div>':'<div class="mdmi'+(it.rad?' rad':'')+(it.on?' on':'')+'" data-i="'+i+'">'+it.label+'</div>'; }).join('');
  m.addEventListener('click',function(ev){ var x=ev.target.closest&&ev.target.closest('.mdmi'); if(!x) return; ev.stopPropagation(); var it=items[+x.getAttribute('data-i')]; closeSizeMenu(); pick(it); });
  $('mdMain').appendChild(m); setTimeout(function(){ document.addEventListener('mousedown',menuOut,true); document.addEventListener('keydown',menuEsc,true); },0); }
var SNAP_ITEMS=[['(none)','none'],['1/6 step','1/6s'],['1/4 step','1/4s'],['1/3 step','1/3s'],['1/2 step','1/2s'],['Step','step'],['1/6 beat','1/6b'],['1/4 beat','1/4b'],['1/3 beat','1/3b'],['1/2 beat','1/2b'],['Beat','beat'],['Bar','bar']];
function snapMenu(btn){ var S=seq(); if(!S) return; var items=[{label:'Line',rad:1,on:S.snapm==='line',m:'line'},{label:'Cell',rad:1,on:S.snapm!=='line',m:'cell'},'-'].concat(SNAP_ITEMS.map(function(x){ return {label:x[0],rad:1,on:S.snap===x[1],k:x[1]}; }));
  openMenu(btn,'',items,function(it){ edit(function(S){ if(it.m) S.snapm=it.m; else S.snap=it.k; }); syncFields(); U.dirty=true; }); }
function stockMenu(btn){ var S=seq(); if(!S) return; var items=SNAP_ITEMS.slice(1).map(function(x){ return {label:x[0],k:x[1]}; });
  openMenu(btn,'Stock note lengths',items,function(it){ U.lastLen=Math.max(1,gridT(Object.assign({},S,{snap:it.k}))); U.dirty=true; }); }
function onClick(e){ var b=e.target.closest&&e.target.closest('button'); if(!b||!b.id) return; var id=b.id, S=seq(); if(!S) return; var p=player(U.id);
  if(id==='mdPlay'){ if(p.state==='play') pause(U.id); else play(U.id); }
  else if(id==='mdStop') stop(U.id);
  else if(id==='mdLoop'){ edit(function(S){ S.loop=!S.loop; }); syncFields(); }
  else if(id==='mdFollow'){ U.follow=!U.follow; syncFields(); }
  else if(id==='mdDraw'){ U.tool='draw'; syncFields(); }
  else if(id==='mdSnapBtn'){ if(U.lpFired){ U.lpFired=false; return; } if($('mdSizeMenu')) closeSizeMenu(); else snapMenu(e.target.closest('button')); }
  else if(id==='mdSel'){ U.tool='sel'; syncFields(); }
  else if(id==='mdDel'){ U.tool='del'; syncFields(); }
  else if(id==='mdSlice'){ U.tool='slice'; syncFields(); }
  else if(id==='mdXp'||id==='mdXm'){ zoomX(id==='mdXp'?1.25:0.8,null); }
  else if(id==='mdYp'||id==='mdYm'){ edit(function(S){ S.zy=clamp(Math.round(S.zy*(id==='mdYp'?1.25:0.8)),8,32); }); }
  else if(id==='mdSeqNew'){ var b=board(); stop(U.id,true); var q=cleanSeq({tempo:S.tempo,num:S.num,den:S.den,bars:S.bars,snap:S.snap,zx:S.zx,zy:S.zy}); q.name=newSeqName(b,'Sequence'); if(addSeq(b,q,true)){ selectSeq(b.sq); } }
  else if(id==='mdSeqDup'){ var b2=board(); stop(U.id,true); var q2=cleanSeq(JSON.parse(JSON.stringify(S))); q2.name=String(S.name||'Sequence').slice(0,26)+' copy'; if(addSeq(b2,q2,true)){ selectSeq(b2.sq); } }
  else if(id==='mdSeqRen'){ var nm=window.prompt('Sequence name:',S.name); if(nm!=null){ nm=String(nm).trim().slice(0,32); if(nm){ edit(function(S){ S.name=nm; }); syncFields(); } } }
  else if(id==='mdSeqDel'){ var b3=board(); if(b3.seqs.length<=1){ setMsg('A BOARD NEEDS AT LEAST ONE SEQUENCE'); return; }
    if(window.confirm('Delete sequence "'+S.name+'" ('+S.notes.length+' notes)?')){ stop(U.id,true); b3.seqs.splice(b3.sq,1); selectSeq(Math.min(b3.sq,b3.seqs.length-1)); } }
  else if(id==='mdMapNotes'){ mapNotesDialog(); }
  else if(id==='mdModeSeq') setLive(U.id,false);
  else if(id==='mdModeLive') setLive(U.id,true);
  else if(id==='mdLvDn') liveShift(-12);
  else if(id==='mdLvUp') liveShift(12);
  else if(id==='mdImp'){ $('mdFile').click(); }
  else if(id==='mdExp') exportMidi();
  else if(id==='mdClr'){ if(!S.notes.length) return; if(window.confirm('Delete all notes on this board?')){ edit(function(S){ S.notes=[]; }); U.sel=[]; stop(U.id,true); } } }
function onChange(e){ var t=e.target, id=t.id, S=seq(), b=board(); if(!S||!b) return;
  if(id==='mdBoard'){ U.id=+t.value; U.sel=[]; U.lastSeq=null; syncFields(); layout(); initScroll(); U.dirty=true; return; }
  if(id==='mdSeq'){ selectSeq(+t.value); return; }
  if(id==='mdFile'){ var f=t.files&&t.files[0]; t.value=''; if(f) importFile(f); return; }
  if(id==='mdNum') edit(function(S){ S.num=clamp(Math.round(+t.value)||4,1,32); });
  else if(id==='mdDen') edit(function(S){ S.den=+t.value||4; });
  else if(id==='mdBars') edit(function(S){ S.bars=clamp(Math.round(+t.value)||1,1,256); });
  else if(id==='mdSnap') edit(function(S){ S.snap=t.value; });
  else if(id==='mdTempo') edit(function(S){ S.tempo=clamp(Math.round((+t.value||120)*10)/10,20,400); });
  else if(id==='mdLow'){ b.d.low=clamp(Math.round(+t.value)||0,0,127); try{ API().changed(); }catch(_){} }
  syncFields(); U.dirty=true; }
function onInput(e){ if(e.target.id==='mdTempo'){ var v=+e.target.value, S=seq(); if(S&&v>=20&&v<=400){ S.tempo=Math.round(v*10)/10; touch(S); } } if(e.target.id==='mdLow') paintLow(); }
function initScroll(){ var S=seq(), b=board(); if(!S||!b||!scr) return; var top=clamp(Math.round(+b.d.low||0)+groupsN(),0,127); scr.scrollTop=Math.max(0,(127-top)*S.zy-6); scr.scrollLeft=0; }
function zoomX(f,anchorVx){ var S=seq(); if(!S) return; var vx=(anchorVx==null)?(cw/2):anchorVx, t=toTick(S,vx), z=clamp(S.zx*f,12,320); if(z===S.zx) return; S.zx=z; touch(S); layout(); scr.scrollLeft=Math.max(0,KEYW+t*(z/PPQ)-vx); U.dirty=true; }
function onWheel(e){ var S=seq(); if(!S) return;
  if(e.ctrlKey||e.metaKey){ e.preventDefault(); var r=cv.getBoundingClientRect(); if(e.altKey){ edit(function(S){ S.zy=clamp(Math.round(S.zy*(e.deltaY<0?1.15:0.87)),8,32); }); } else zoomX(e.deltaY<0?1.15:0.87,e.clientX-r.left); }
  else if(e.shiftKey){ e.preventDefault(); scr.scrollLeft+=(e.deltaY||e.deltaX); } }

function hitNote(S,vx,vy){ var ppt=S.zx/PPQ, sl=scr.scrollLeft, st=scr.scrollTop, N=S.notes, i, a, x0, x1, y0;
  for(i=N.length-1;i>=0;i--){ a=N[i]; y0=RULER+(127-a[0])*S.zy-st; if(vy<y0||vy>=y0+S.zy) continue; x0=KEYW+a[1]*ppt-sl; x1=x0+a[2]*ppt; if(vx<x0||vx>x1) continue;
    var ew=Math.min(7,Math.max(3,(x1-x0)*0.4)); return {a:a,edge:(x1-vx)<=ew,ledge:(x1-x0)>=14&&(vx-x0)<=ew}; }
  return null; }
function pt(e){ var r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
function auditionOn(n){ if(!ready(U.id).ok){ setMsg(ready(U.id).why); return; } var p=player(U.id); U.aud={n:n,p:p}; noteOn(p,n); }
function auditionOff(){ if(U.aud){ noteOff(U.aud.p,U.aud.n); U.aud=null; } }
function delAt(S,q){ var h=hitNote(S,q.x,q.y); if(!h) return; var i=S.notes.indexOf(h.a); if(i>=0){ S.notes.splice(i,1); U.sel=U.sel.filter(function(a){ return a!==h.a; }); touch(S); U.dirty=true; } }
function onDown(e){ var S=seq(); if(!S||!board()) return; U.alt=!!e.altKey; var q=pt(e); try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  if(e.button===1){ e.preventDefault(); U.drag=e.shiftKey?{kind:'zoom',y0:q.y,z0:S.zy,ay:(q.y-RULER+scr.scrollTop)/S.zy,qy:q.y}:{kind:'pan',x0:e.clientX,y0:e.clientY,sl:scr.scrollLeft,st:scr.scrollTop}; cv.style.cursor=e.shiftKey?'ns-resize':'grabbing'; return; }
  if(q.x<KEYW&&q.y>=RULER){ if(e.button===0){ var n=toNote(S,q.y); if(n>=0&&n<=127){ auditionOn(n); U.drag={kind:'key'}; } } return; }
  if(q.y<RULER){ if(e.button===0){ U.drag={kind:'seek'}; seek(U.id,snapTick(S,toTick(S,q.x),false)); } return; }
  var tk=toTick(S,q.x), nt=toNote(S,q.y), h=hitNote(S,q.x,q.y);
  if(e.button===2){ U.drag={kind:'del'}; delAt(S,q); return; }
  if(e.button!==0) return;
  if(U.tool==='del'){ U.drag={kind:'del'}; delAt(S,q); return; }
  if(U.tool==='slice'){ if(h){ var t=snapTick(S,tk,false), a0=h.a, end=a0[1]+a0[2]; if(t>a0[1]&&t<end&&S.notes.length<MAXN){ edit(function(S){ a0[2]=t-a0[1]; S.notes.push([a0[0],t,end-t,a0[3]]); }); } } return; }
  if(h){ U.lastLen=h.a[2]; if(e.shiftKey||e.ctrlKey||e.metaKey){ var ix=U.sel.indexOf(h.a); if(ix>=0){ U.sel.splice(ix,1); U.dirty=true; return; } U.sel.push(h.a); } else if(U.sel.indexOf(h.a)<0) U.sel=[h.a];
    U.drag={kind:h.edge?'resize':(h.ledge?'resizeL':'move'),t0:tk,n0:nt,anchor:h.a,orig:U.sel.map(function(a){ return {a:a,n:a[0],t:a[1],d:a[2]}; }),moved:false}; if(!h.edge&&!h.ledge) auditionOn(h.a[0]); U.dirty=true; return; }
  if(U.tool==='draw'&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&nt>=0&&nt<=127){ var t2=Math.max(0,snapTick(S,tk,S.snapm!=='line')), len=newLen(S), a=[nt,t2,len,100]; if(S.notes.length>=MAXN){ setMsg('NOTE LIMIT ('+MAXN+') REACHED'); return; }
    S.notes.push(a); U.sel=[a]; U.drag={kind:'move',t0:tk,n0:nt,anchor:a,orig:[{a:a,n:nt,t:t2,d:len}],moved:true,created:true}; auditionOn(nt); U.dirty=true; return; }
  if(!e.shiftKey) U.sel=[]; U.drag={kind:'band',x0:q.x,y0:q.y,x1:q.x,y1:q.y,base:e.shiftKey?U.sel.slice():[]}; U.dirty=true; }
function onMove(e){ var S=seq(); if(!S) return; U.alt=!!e.altKey; var q=pt(e), d=U.drag;
  if(!d){ if(q.x>=KEYW&&q.y>=RULER){ var h=hitNote(S,q.x,q.y); cv.style.cursor=U.tool==='del'?'not-allowed':U.tool==='slice'?'col-resize':h?((h.edge||h.ledge)?'ew-resize':'move'):(U.tool==='draw'?'crosshair':'default'); } else cv.style.cursor=q.y<RULER?'pointer':'default'; return; }
  var g=e.altKey?0:snapT(S);
  if(d.kind==='pan'){ scr.scrollLeft=d.sl-(e.clientX-d.x0); scr.scrollTop=d.st-(e.clientY-d.y0); U.dirty=true; return; }
  if(d.kind==='zoom'){ var zz=clamp(d.z0*Math.pow(1.012,d.y0-q.y),8,32); if(zz!==S.zy){ S.zy=zz; touch(S); layout(); scr.scrollTop=Math.max(0,d.ay*zz-(d.qy-RULER)); } U.dirty=true; return; }
  if(d.kind==='del'){ delAt(S,q); return; }
  if(d.kind==='seek'){ seek(U.id,snapTick(S,toTick(S,q.x),false)); return; }
  if(d.kind==='key'){ var n=toNote(S,q.y); if(U.aud&&n!==U.aud.n&&n>=0&&n<=127){ var p=U.aud.p; noteOff(p,U.aud.n); U.aud.n=n; noteOn(p,n); } return; }
  if(d.kind==='band'){ d.x1=q.x; d.y1=q.y; U.dirty=true; return; }
  var tk=toTick(S,q.x), nt=toNote(S,q.y), dt, dn;
  if(d.kind==='move'){ var an=d.orig.filter(function(o){ return o.a===d.anchor; })[0]||d.orig[0]; dt=(S.snapm!=='line'&&g)?Math.round((tk-d.t0)/g)*g:snapTick(S,an.t+(tk-d.t0),false)-an.t; dn=nt-d.n0;
    var minT=Math.min.apply(null,d.orig.map(function(o){ return o.t; })), minN=Math.min.apply(null,d.orig.map(function(o){ return o.n; })), maxN=Math.max.apply(null,d.orig.map(function(o){ return o.n; }));
    dt=Math.max(dt,-minT); dn=clamp(dn,-minN,127-maxN); if(dt!==0||dn!==0) d.moved=true;
    d.orig.forEach(function(o){ o.a[1]=o.t+dt; o.a[0]=o.n+dn; });
    if(U.aud){ var np=an.n+dn; if(U.aud.n!==np&&np>=0&&np<=127){ noteOff(U.aud.p,U.aud.n); U.aud.n=np; noteOn(U.aud.p,np); } } }
  else if(d.kind==='resizeL'){ var mn2=g||10, dl2=g?Math.round((tk-d.t0)/g)*g:Math.round(tk-d.t0), l1=1e12, l2=1e12; d.orig.forEach(function(o){ l1=Math.min(l1,o.d-mn2); l2=Math.min(l2,o.t); }); dl2=Math.max(-l2,Math.min(l1,dl2)); if(Math.abs(tk-d.t0)>2) d.moved=true; d.orig.forEach(function(o){ o.a[1]=o.t+dl2; o.a[2]=o.d-dl2; }); }
  else if(d.kind==='resize'){ var dl=g?Math.round((tk-d.t0)/g)*g:Math.round(tk-d.t0), mn=g||10; if(Math.abs(tk-d.t0)>2) d.moved=true;
    d.orig.forEach(function(o){ o.a[2]=Math.max(mn,o.d+dl); }); }
  U.dirty=true; }
function onUp(e){ var d=U.drag; U.drag=null; try{ cv.releasePointerCapture(e.pointerId); }catch(_){}
  if(!d) return; var S=seq(); if(!S) return;
  auditionOff(); if(d.kind==='key') return;
  if(d.kind==='del'){ touch(S); try{ API().changed(); }catch(_){} layout(); U.dirty=true; return; }
  if(d.kind==='band'){ var x0=Math.min(d.x0,d.x1), x1=Math.max(d.x0,d.x1), y0=Math.min(d.y0,d.y1), y1=Math.max(d.y0,d.y1), ppt=S.zx/PPQ, sl=scr.scrollLeft, st=scr.scrollTop, out=d.base.slice();
    if(x1-x0>3||y1-y0>3) S.notes.forEach(function(a){ var ax=KEYW+a[1]*ppt-sl, ay=RULER+(127-a[0])*S.zy-st; if(ax<=x1&&ax+a[2]*ppt>=x0&&ay<=y1&&ay+S.zy>=y0&&out.indexOf(a)<0) out.push(a); }); U.sel=out; U.dirty=true; return; }
  if(d.kind==='move'||d.kind==='resize'||d.kind==='resizeL'){ if(d.kind==='resize'&&d.anchor) U.lastLen=d.anchor[2]; if(d.moved||d.created){ touch(S); try{ API().changed(); }catch(_){} layout(); } }
  U.dirty=true; }
function onKey(e){ if(!isVisible()) return; var tg=e.target&&e.target.tagName; if(tg==='INPUT'||tg==='SELECT'||tg==='TEXTAREA') return; if(LV[U.id]){ liveKeyDown(e); return; } var S=seq(); if(!S) return; var k=e.key, g=snapT(S)||bT(S)/4;
  if(k===' '){ e.preventDefault(); var p=player(U.id); if(p.state==='play') pause(U.id); else play(U.id); return; }
  if(k==='Delete'||k==='Backspace'){ if(!U.sel.length) return; e.preventDefault(); var del=U.sel.slice(); edit(function(S){ S.notes=S.notes.filter(function(a){ return del.indexOf(a)<0; }); }); U.sel=[]; return; }
  if((e.ctrlKey||e.metaKey)&&(k==='a'||k==='A')){ e.preventDefault(); U.sel=S.notes.slice(); U.dirty=true; return; }
  if((e.ctrlKey||e.metaKey)&&(k==='c'||k==='C'||k==='x'||k==='X')){ e.preventDefault(); if(!U.sel.length) return; var m0=Math.min.apply(null,U.sel.map(function(a){ return a[1]; })); U.clip=U.sel.map(function(a){ return [a[0],a[1]-m0,a[2],a[3]]; });
    if(k==='x'||k==='X'){ var cut=U.sel.slice(); edit(function(S){ S.notes=S.notes.filter(function(a){ return cut.indexOf(a)<0; }); }); U.sel=[]; } return; }
  if((e.ctrlKey||e.metaKey)&&(k==='v'||k==='V')){ e.preventDefault(); if(!U.clip||!U.clip.length||S.notes.length+U.clip.length>MAXN) return; var at=Math.max(0,snapTick(S,curPos(),false)), pn=[]; edit(function(S){ U.clip.forEach(function(c){ var n=[c[0],c[1]+at,c[2],c[3]]; S.notes.push(n); pn.push(n); }); }); U.sel=pn; return; }
  if((e.ctrlKey||e.metaKey)&&(k==='d'||k==='D'||k==='b'||k==='B')){ e.preventDefault(); if(!U.sel.length) return; var a0=Math.min.apply(null,U.sel.map(function(a){ return a[1]; })), a1=Math.max.apply(null,U.sel.map(function(a){ return a[1]+a[2]; })), sh=Math.max(g,Math.ceil((a1-a0)/g)*g), ns=[];
    if(S.notes.length+U.sel.length>MAXN){ setMsg('NOTE LIMIT ('+MAXN+') REACHED'); return; }
    edit(function(S){ U.sel.forEach(function(a){ var c=[a[0],a[1]+sh,a[2],a[3]]; S.notes.push(c); ns.push(c); }); }); U.sel=ns; return; }
  if(!e.ctrlKey&&!e.metaKey&&!e.altKey){ var tm={p:'draw',e:'sel',d:'del',c:'slice'}[String(k).toLowerCase()]; if(tm){ U.tool=tm; syncFields(); return; } }
  var dx=0,dy=0; if(k==='ArrowLeft') dx=-g; else if(k==='ArrowRight') dx=g; else if(k==='ArrowUp') dy=e.shiftKey?12:1; else if(k==='ArrowDown') dy=e.shiftKey?-12:-1; else return;
  if(!U.sel.length) return; e.preventDefault();
  var mt=Math.min.apply(null,U.sel.map(function(a){ return a[1]; })), mn=Math.min.apply(null,U.sel.map(function(a){ return a[0]; })), mx=Math.max.apply(null,U.sel.map(function(a){ return a[0]; }));
  dx=Math.max(dx,-mt); dy=clamp(dy,-mn,127-mx); edit(function(S){ U.sel.forEach(function(a){ a[1]+=dx; a[0]+=dy; }); }); }

function draw(){ if(!ctx||!isVisible()) return; var S=seq(), b=board(); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cw,ch); if(!S||!b) return;
  var sl=scr.scrollLeft, st=scr.scrollTop, zy=S.zy, ppt=S.zx/PPQ, low=Math.round(+b.d.low||0), G=groupsN(), MM=mapSet(b), n, y, x, t, i;
  var bt_=bT(S), bar=barT(S), tot=totT(S), g=gridT(S), t0=Math.max(0,(sl-8)/ppt), t1=(sl+cw-KEYW)/ppt, AB=ch, KB=Math.round(KEYW*0.62), pp=PL[U.id], bi;
  ctx.fillStyle='#262b30'; ctx.fillRect(0,0,cw,ch);
  ctx.save(); ctx.beginPath(); ctx.rect(KEYW,RULER,cw-KEYW,AB-RULER); ctx.clip();
  for(n=127;n>=0;n--){ y=RULER+(127-n)*zy-st; if(y>AB||y+zy<RULER) continue; var mapped=!!MM[n];
    ctx.fillStyle=isBlack(n)?'#343a41':'#41484f'; ctx.fillRect(KEYW,y,cw-KEYW,zy);
    if(mapped){ ctx.fillStyle='rgba(120,225,110,0.075)'; ctx.fillRect(KEYW,y,cw-KEYW,zy); } else { ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.fillRect(KEYW,y,cw-KEYW,zy); }
    ctx.fillStyle=(n%12===0)?'rgba(0,0,0,0.6)':'rgba(0,0,0,0.16)'; ctx.fillRect(KEYW,y+zy-1,cw-KEYW,1); }
  for(bi=Math.floor(t0/bar);bi*bar<=t1&&bi<S.bars;bi++){ if(bi%2){ x=KEYW+bi*bar*ppt-sl; ctx.fillStyle='rgba(255,255,255,0.028)'; ctx.fillRect(Math.round(x),RULER,Math.round(bar*ppt),AB-RULER); } }
  if(g>0&&g*ppt>=7){ ctx.fillStyle='rgba(0,0,0,0.12)'; for(t=Math.floor(t0/g)*g;t<=t1&&t<=tot;t+=g){ x=KEYW+t*ppt-sl; ctx.fillRect(Math.round(x),RULER,1,AB-RULER); } }
  if(bt_*ppt>=5){ ctx.fillStyle='rgba(0,0,0,0.3)'; for(t=Math.floor(t0/bt_)*bt_;t<=t1&&t<=tot;t+=bt_){ x=KEYW+t*ppt-sl; ctx.fillRect(Math.round(x),RULER,1,AB-RULER); } }
  ctx.fillStyle='rgba(0,0,0,0.75)'; for(t=Math.floor(t0/bar)*bar;t<=t1&&t<=tot;t+=bar){ x=KEYW+t*ppt-sl; ctx.fillRect(Math.round(x),RULER,1,AB-RULER); }
  var ex=KEYW+tot*ppt-sl; if(ex<cw){ ctx.fillStyle='rgba(10,12,14,0.62)'; ctx.fillRect(Math.max(KEYW,ex),RULER,cw,AB-RULER); ctx.fillStyle='#ff9a2e'; ctx.fillRect(Math.round(ex),RULER,1,AB-RULER); }
  function nc(a,sel){ var m=!!MM[a[0]], v=a[3]/127, r,gg,bb; if(m){ r=78+v*80; gg=150+v*80; bb=62+v*52; } else { r=96+v*50; gg=104+v*50; bb=114+v*50; }
    if(sel){ r=Math.min(255,r+75); gg=Math.min(255,gg+32); bb=Math.min(255,bb+75); } return 'rgb('+Math.round(r)+','+Math.round(gg)+','+Math.round(bb)+')'; }
  S.notes.forEach(function(a){ var x0=KEYW+a[1]*ppt-sl, w=a[2]*ppt, y0=RULER+(127-a[0])*zy-st; if(x0>cw||x0+w<KEYW||y0>AB||y0+zy<RULER) return;
    var sel=U.sel.indexOf(a)>=0, ww=Math.max(2,w-1);
    ctx.fillStyle=nc(a,sel); ctx.fillRect(x0,y0+1,ww,zy-2);
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.fillRect(x0,y0+1,ww,1); ctx.fillStyle='rgba(0,0,0,0.26)'; ctx.fillRect(x0,y0+zy-2,ww,1);
    ctx.strokeStyle=sel?'#ffffff':'rgba(0,0,0,0.62)'; ctx.lineWidth=1; ctx.strokeRect(x0+0.5,y0+1.5,ww-1,zy-3);
    if(ww>10){ ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.fillRect(x0+ww-3,y0+2,2,zy-4); }
    if(w>=30&&zy>=12){ ctx.fillStyle='#0f1d0b'; ctx.font=fnt(9); ctx.textBaseline='middle'; ctx.fillText(nname(a[0]),x0+4,y0+zy/2); } });
  var d=U.drag; if(d&&d.kind==='band'){ ctx.fillStyle='rgba(255,154,46,0.14)'; ctx.strokeStyle='#ff9a2e'; ctx.lineWidth=1; var bx=Math.min(d.x0,d.x1), by=Math.min(d.y0,d.y1), bw=Math.abs(d.x1-d.x0), bh=Math.abs(d.y1-d.y0); ctx.fillRect(bx,by,bw,bh); ctx.strokeRect(bx+0.5,by+0.5,bw,bh); }
  var ph=curPos(), px=KEYW+ph*ppt-sl, pl=pp&&pp.state!=='stop'; if(px>=KEYW&&px<=cw){ ctx.fillStyle=pl?'#ffe27a':'#c9ced6'; ctx.fillRect(Math.round(px),RULER,1.5,AB-RULER); }
  ctx.restore();
  var gr=ctx.createLinearGradient(0,0,0,RULER); gr.addColorStop(0,'#434b53'); gr.addColorStop(1,'#2c3238'); ctx.fillStyle=gr; ctx.fillRect(KEYW,0,cw-KEYW,RULER); ctx.fillStyle='#14171a'; ctx.fillRect(KEYW,RULER-1,cw-KEYW,1);
  ctx.save(); ctx.beginPath(); ctx.rect(KEYW,0,cw-KEYW,RULER); ctx.clip(); ctx.font=fnt(10); ctx.textBaseline='middle';
  var bpx=bar*ppt, every=Math.max(1,Math.ceil(30/bpx));
  for(bi=Math.floor(t0/bar);bi*bar<=t1&&bi<S.bars;bi++){ x=KEYW+bi*bar*ppt-sl; ctx.fillStyle='#8d97a3'; ctx.fillRect(Math.round(x),3,1,RULER-4); if(bi%every===0){ ctx.fillStyle='#e8ecf1'; ctx.fillText(String(bi+1),x+4,10); } }
  if(bt_*ppt>=14){ ctx.fillStyle='#6b7480'; for(t=Math.floor(t0/bt_)*bt_;t<=t1&&t<tot;t+=bt_){ if(t%bar===0) continue; x=KEYW+t*ppt-sl; ctx.fillRect(Math.round(x),RULER-8,1,6); } }
  if(px>=KEYW&&px<=cw){ ctx.fillStyle=pl?'#ffe27a':'#c9ced6'; ctx.beginPath(); ctx.moveTo(px-5,RULER-9); ctx.lineTo(px+6,RULER-9); ctx.lineTo(px+0.5,RULER-1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0,RULER,KEYW,AB-RULER); ctx.clip(); ctx.textBaseline='middle'; ctx.font=fnt(9);
  for(n=127;n>=0;n--){ y=RULER+(127-n)*zy-st; if(y>AB||y+zy<RULER) continue; var blk=isBlack(n), lit=!!(pp&&pp.cnt[n])||!!(U.aud&&U.aud.n===n), mp=!!MM[n];
    ctx.fillStyle=lit?'#ffb552':'#e7eaee'; ctx.fillRect(0,y,KEYW-1,zy);
    if(blk){ ctx.fillStyle=lit?'#e8731a':'#1d2024'; ctx.fillRect(0,y+1,KB,zy-2); ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.fillRect(1,y+1,KB-2,1); }
    else if(n%12===0||n%12===5){ ctx.fillStyle='#8f98a3'; ctx.fillRect(0,y+zy-1,KEYW-1,1); }
    if(n%12===0&&zy>=9){ ctx.fillStyle=lit?'#2a1204':'#4a515a'; ctx.textAlign='left'; ctx.fillText(nname(n),4,y+zy/2); }
    if(mp&&zy>=11){ ctx.fillStyle=lit?'#2a1204':'#2f8a1f'; ctx.textAlign='right'; ctx.fillText('G'+MM[n].join('/'),KEYW-4,y+zy/2); ctx.textAlign='left'; } }
  ctx.restore();
  gr=ctx.createLinearGradient(0,0,0,RULER); gr.addColorStop(0,'#434b53'); gr.addColorStop(1,'#2c3238'); ctx.fillStyle=gr; ctx.fillRect(0,0,KEYW,RULER); ctx.fillStyle='#14171a'; ctx.fillRect(0,RULER-1,KEYW,1);
  ctx.fillStyle='#9ba4ae'; ctx.font=fnt(9); ctx.textBaseline='middle'; ctx.fillText('NOTE',6,RULER/2);
  ctx.fillStyle='#14171a'; ctx.fillRect(KEYW-1,0,1,AB);
}
function loop(){ U.raf=0; if(!isVisible()) return; var p=PL[U.id], playing=p&&p.state==='play';
  if(playing||U.dirty){
    if(playing&&U.follow&&!U.drag){ var S=seq(); if(S){ var px=KEYW+p.pos*(S.zx/PPQ)-scr.scrollLeft; if(px>cw-30||px<KEYW){ scr.scrollLeft=Math.max(0,p.pos*(S.zx/PPQ)-40); } } }
    U.dirty=false; draw(); var S2=seq(), e=$('mdPos'); if(S2&&e){ var ps=curPos(), br=Math.floor(ps/barT(S2))+1, bt2=Math.floor((ps%barT(S2))/bT(S2))+1, sec=ps/PPQ*60/S2.tempo; e.textContent=String(br).padStart(3,'0')+'.'+bt2+'  '+sec.toFixed(1)+'s'; } paintStatus(); }
  U.raf=requestAnimationFrame(loop); }
function kick(){ U.dirty=true; if(!U.raf&&isVisible()) U.raf=requestAnimationFrame(loop); }

window._midiGetId=function(){ return U.id; };
window._midiSetId=function(id){ if(id) U.id=+id; U.sel=[]; };
window._midiOpen=function(id){ var b=$('btnCtrlMidi'); if(b) b.style.display=''; if(id) U.id=+id; U.sel=[]; if(window._setControllerEditorMode) window._setControllerEditorMode('midi'); };
window._midiShow=function(){ build(); var n=fillBoards(); if(!n){ return; } syncFields(); layout(); if(U.lastSeq!==seq()){ U.lastSeq=seq(); initScroll(); } kick(); setTimeout(function(){ layout(); kick(); },60); };
function external(){ var a=API(), btn=$('btnCtrlMidi'); if(!a||!btn) return; var L=a.list(); btn.style.display=L.length?'':'none';
  if(!L.length){ stopAll(); if(window._getControllerEditorMode&&window._getControllerEditorMode()==='midi'&&window._setControllerEditorMode) window._setControllerEditorMode('graphical'); return; }
  if(U.built&&isVisible()){ fillBoards(); var S=seq(); if(S&&U.lastSeq!==S){ U.lastSeq=S; U.sel=U.sel.filter(function(x){ return S.notes.indexOf(x)>=0; }); syncFields(); layout(); } kick(); } }
var extT=0; function extSoon(){ if(extT) return; extT=setTimeout(function(){ extT=0; try{ external(); }catch(_){} },80); }
(function(){ var o=window._feCtlChanged; window._feCtlChanged=function(){ var r; try{ r=o?o.apply(this,arguments):undefined; }catch(_){} extSoon(); return r; }; })();
setInterval(function(){ try{ external(); }catch(_){} },1000);

function vlq(n){ var b=[n&127]; n=Math.floor(n/128); while(n>0){ b.unshift((n&127)|128); n=Math.floor(n/128); } return b; }
function mapNotesDialog(){ var b=board(); if(!b) return; var G=groupsN(), low=Math.round(+b.d.low||0), cur=parseMap(b), ov=document.createElement('div'), i, n, h='', oh='<option value="-1">- none -</option>';
  for(n=127;n>=0;n--) oh+='<option value="'+n+'">'+nname(n)+' ('+n+')</option>';
  for(i=0;i<G;i++) h+='<div class="menu-cb-row" style="display:flex;align-items:center;gap:8px"><span style="width:84px;font-size:11px;letter-spacing:1px">DAMPER '+(i+1)+'</span><select data-g="'+i+'" style="flex:1;font-size:11px">'+oh+'</select></div>';
  ov.className='popup-overlay'; ov.style.zIndex='10020'; ov.style.background='rgba(0,0,0,.45)';
  ov.innerHTML='<div class="mfile-popup-box" style="max-width:420px;width:min(420px,92vw)"><div class="mfile-popup-title">MAP NOTES</div><div class="mfile-cb-list" style="max-height:46vh;overflow:auto">'+h+'</div><div style="display:flex;gap:8px;margin-top:12px"><button class="mfile-btn-primary" id="mnOk">APPLY</button><button class="mfile-btn-cancel" id="mnReset">RESET</button><button class="mfile-btn-cancel" id="mnNo">CANCEL</button></div></div>';
  document.body.appendChild(ov);
  function dv(k){ return cur?cur[k]:(low+k<=127?low+k:-1); }
  ov.querySelectorAll('select[data-g]').forEach(function(s){ s.value=String(dv(+s.getAttribute('data-g'))); });
  function done(){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown',kd,true); }
  function kd(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(); } }
  document.addEventListener('keydown',kd,true);
  ov.querySelector('#mnNo').onclick=done;
  ov.querySelector('#mnReset').onclick=function(){ stop(U.id,true); b.d.nmap=''; try{ API().changed(); }catch(_){} done(); syncFields(); U.dirty=true; setMsg('NOTE MAP RESET - CONSECUTIVE FROM THE LOWEST NOTE'); };
  ov.querySelector('#mnOk').onclick=function(){ var arr=[], k; for(k=0;k<24;k++) arr.push(dv(k)); ov.querySelectorAll('select[data-g]').forEach(function(s){ arr[+s.getAttribute('data-g')]=+s.value; });
    stop(U.id,true); b.d.nmap=arr.map(function(v){ return v<0?'-':String(v); }).join(','); try{ API().changed(); }catch(_){} done(); syncFields(); U.dirty=true; setMsg('NOTES MAPPED TO DAMPERS'); };
}
function pickDialog(items,opts){ return new Promise(function(res){
  var ov=document.createElement('div'); ov.className='popup-overlay'; ov.style.zIndex='10020'; ov.style.background='rgba(0,0,0,.45)';
  var esc_=function(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;'); };
  ov.innerHTML='<div class="mfile-popup-box" style="max-width:520px;width:min(520px,92vw)"><div class="mfile-popup-title">'+esc_(opts.title)+'</div>'+
    ''+
    '<div class="mfile-cb-list" style="max-height:46vh;overflow:auto">'+items.map(function(it,i){ return '<div class="menu-cb-row"><label><input type="checkbox" data-i="'+i+'"'+(it.checked?' checked':'')+'> '+esc_(it.label)+'</label></div>'; }).join('')+'</div>'+
    (opts.extra?'<div class="menu-cb-row" style="margin-top:8px"><label><input type="checkbox" id="pdExtra"'+(opts.extra.checked?' checked':'')+'> '+esc_(opts.extra.label)+'</label></div>':'')+
    '<div style="display:flex;gap:8px;margin-top:12px"><button class="mfile-btn-primary" id="pdOk">'+esc_(opts.ok||'OK')+'</button><button class="mfile-btn-cancel" id="pdNo">CANCEL</button></div></div>';
  document.body.appendChild(ov);
  function done(v){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown',kd,true); res(v); }
  function kd(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(null); } }
  document.addEventListener('keydown',kd,true);
  ov.querySelector('#pdNo').onclick=function(){ done(null); };
  ov.querySelector('#pdOk').onclick=function(){ var sel=[]; ov.querySelectorAll('input[data-i]').forEach(function(c){ if(c.checked) sel.push(+c.getAttribute('data-i')); }); if(!sel.length){ return; } var x=ov.querySelector('#pdExtra'); done({sel:sel,extra:!!(x&&x.checked)}); };
}); }
function trackBytes(S,name,scale){ var ev=[], tr=[], i, sc=scale||1; function push(arr){ for(var k=0;k<arr.length;k++) tr.push(arr[k]); }
  S.notes.forEach(function(a){ var t0=Math.round(a[1]*sc), t1=Math.max(t0+1,Math.round((a[1]+a[2])*sc)); ev.push([t0,1,a[0],a[3]]); ev.push([t1,0,a[0],0]); }); ev.sort(function(x,y){ return x[0]-y[0]||x[1]-y[1]; });
  var nm=String(name||'').replace(/[^\x20-\x7e]/g,'?').slice(0,60), nb=[]; for(i=0;i<nm.length;i++) nb.push(nm.charCodeAt(i));
  push([0,0xFF,3,nb.length].concat(nb)); push([0,0xC0,0]);
  var last=0; ev.forEach(function(e){ push(vlq(e[0]-last)); last=e[0]; push([e[1]?0x90:0x80,e[2]&127,e[1]?(e[3]||100):0]); });
  var endT=Math.max(last,Math.round(totT(S)*sc)); push(vlq(endT-last)); push([0xFF,0x2F,0]); return tr; }
function chunk(id,bytes){ return [id.charCodeAt(0),id.charCodeAt(1),id.charCodeAt(2),id.charCodeAt(3),(bytes.length>>>24)&255,(bytes.length>>>16)&255,(bytes.length>>>8)&255,bytes.length&255].concat(bytes); }
function exportMidi(){ var S0=seq(), b=board(); if(!S0||!b) return;
  var go=function(idx){ var L=idx.map(function(i){ return b.seqs[i]; }), F=L[0], i, out;
    var us=Math.round(60000000/F.tempo), head=[0,0xFF,0x51,3,(us>>16)&255,(us>>8)&255,us&255,0,0xFF,0x58,4,F.num,Math.round(Math.log(F.den)/Math.LN2),24,8];
    var total=0; L.forEach(function(q){ total+=q.notes.length; });
    if(L.length===1){ var tb=trackBytes(F,F.name,1); tb=head.concat(tb);
      out=[0x4D,0x54,0x68,0x64,0,0,0,6,0,0,0,1,(PPQ>>8)&255,PPQ&255].concat(chunk('MTrk',tb)); }
    else { var nb=[], bn=String(b.d.name||'MIDI Board').replace(/[^\x20-\x7e]/g,'?'); for(i=0;i<bn.length;i++) nb.push(bn.charCodeAt(i));
      var cond=[0,0xFF,3,nb.length].concat(nb,head,[0,0xFF,0x2F,0]);
      out=[0x4D,0x54,0x68,0x64,0,0,0,6,0,1,0,L.length+1,(PPQ>>8)&255,PPQ&255].concat(chunk('MTrk',cond));
      L.forEach(function(q){ out=out.concat(chunk('MTrk',trackBytes(q,q.name,F.tempo/q.tempo))); }); }
    var base=String(b.d.name||'midi_board').replace(/[^\w\- ]+/g,'').trim()||'midi_board'; if(L.length===1&&b.seqs.length>1) base+=' - '+(String(F.name).replace(/[^\w\- ]+/g,'').trim()||'sequence');
    var blob=new Blob([new Uint8Array(out)],{type:'audio/midi'}), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=base+'.mid'; document.body.appendChild(a); a.click(); setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); },500);
    setMsg('EXPORTED '+L.length+' SEQUENCE'+(L.length===1?'':'S')+', '+total+' NOTES (INSTRUMENT 0 - PIANO)'); };
  if(b.seqs.length===1) return go([0]);
  pickDialog(b.seqs.map(function(q,i){ return {label:(i+1)+'. '+q.name+'  -  '+q.notes.length+' notes',checked:true}; }),
    {title:'EXPORT .MID',ok:'EXPORT',note:'Choose the sequences to export. Each becomes one track; all notes are written as Instrument 0 (piano). Tempo and time signature come from the first chosen sequence.'}).then(function(r){ if(r) go(r.sel); }); }
function parseMidi(buf){ var d=new DataView(buf), p=0, size=buf.byteLength;
  function u8(){ if(p>=size) throw new Error('Unexpected end of file'); return d.getUint8(p++); }
  function u16(){ var v=(u8()<<8)|u8(); return v; } function u32(){ return ((u8()*16777216)+(u8()<<16)+(u8()<<8)+u8()); }
  function str4(){ var s=''; for(var i=0;i<4;i++) s+=String.fromCharCode(u8()); return s; }
  function rvlq(){ var v=0,b,n=0; do{ b=u8(); v=v*128+(b&127); n++; }while((b&128)&&n<5); return v; }
  if(size<14||str4()!=='MThd') throw new Error('Not a MIDI file'); var hl=u32(), fmt=u16(), nt=u16(), div=u16(); p=8+hl;
  if(div&0x8000) throw new Error('SMPTE time division is not supported'); if(!div) throw new Error('Invalid time division');
  var notes=[], tempos=[], sigs=[], tcount=0, chans={}, parts={}, tnames={};
  while(p+8<=size&&tcount<nt){ var id=str4(), len=u32(), end=Math.min(size,p+len); if(id!=='MTrk'){ p=end; continue; } tcount++;
    var tick=0, run=0, open={}, ti=tcount-1;
    while(p<end){ var dl=rvlq(); tick+=dl; var st=d.getUint8(p);
      if(st&128){ p++; if(st<0xF0) run=st; } else st=run;
      if(st===0xFF){ var ty=u8(), l=rvlq(); if(ty===3){ var tn=''; for(var z=0;z<l&&z<60;z++) tn+=String.fromCharCode(d.getUint8(p+z)); tnames[ti]=tn.replace(/[^\x20-\x7e]/g,'?'); } if(ty===0x51&&l===3) tempos.push([tick,(d.getUint8(p)<<16)|(d.getUint8(p+1)<<8)|d.getUint8(p+2)]); else if(ty===0x58&&l>=2) sigs.push([tick,d.getUint8(p),Math.pow(2,d.getUint8(p+1))]); p+=l; }
      else if(st===0xF0||st===0xF7){ var l2=rvlq(); p+=l2; }
      else if(st>=0x80){ var hi=st&0xF0, ch=st&15, a1=u8(), a2=(hi===0xC0||hi===0xD0)?0:u8(), key=ch*128+a1;
        var pk=ti*16+ch; if(hi===0xC0){ (parts[pk]=parts[pk]||{t:ti,ch:ch,n:0,prog:-1}); if(parts[pk].prog<0) parts[pk].prog=a1; }
        if(hi===0x90&&a2>0){ (open[key]=open[key]||[]).push([tick,a2]); }
        else if(hi===0x80||(hi===0x90&&a2===0)){ var q=open[key]; if(q&&q.length){ var o=q.shift(); notes.push([a1,o[0],tick-o[0],o[1],ch,ti]); chans[ch]=1; } } }
      else throw new Error('Corrupt MIDI data'); }
    Object.keys(open).forEach(function(k){ open[k].forEach(function(o){ notes.push([+k%128,o[0],Math.max(1,tick-o[0]),o[1],Math.floor(+k/128),ti]); chans[Math.floor(+k/128)]=1; }); }); p=end; }
  return {div:div,notes:notes,tempos:tempos,sigs:sigs,chans:chans,parts:parts,tnames:tnames}; }
function importFile(f){ var rd=new FileReader(); rd.onerror=function(){ setMsg('COULD NOT READ THE FILE'); };
  var FAM=['PIANO', 'CHROMATIC PERC', 'ORGAN', 'GUITAR', 'BASS', 'STRINGS', 'ENSEMBLE', 'BRASS', 'REED', 'PIPE', 'SYNTH LEAD', 'SYNTH PAD', 'SYNTH FX', 'ETHNIC', 'PERCUSSIVE', 'SOUND FX'];
  rd.onload=function(){ var M; try{ M=parseMidi(rd.result); }catch(err){ setMsg('IMPORT FAILED: '+err.message); window.alert('Could not import this MIDI file: '+err.message); return; }
    var cnt={}; M.notes.forEach(function(a){ var k=a[5]*16+a[4]; cnt[k]=(cnt[k]||0)+1; });
    var P=Object.keys(cnt).map(function(k){ var pt=M.parts[k]||{t:Math.floor(k/16),ch:k%16,prog:-1}; return {key:+k,t:pt.t,ch:pt.ch,prog:pt.prog,n:cnt[k],name:M.tnames[pt.t]||''}; }).sort(function(x,y){ return x.key-y.key; });
    if(!P.length){ setMsg('IMPORT FAILED: NO NOTES IN THIS FILE'); window.alert('This MIDI file contains no notes.'); return; }
    var hasMelodic=P.some(function(x){ return x.ch!==9; });
    function finish2(chosen,split,rng){ var moved=0; function fold(n){ var m=n; while(m<rng.lo) m+=12; while(m>rng.hi) m-=12; if(m!==n) moved++; return m; }
      var b=board(); if(!b) return; stop(U.id,true);
      var tp=M.tempos.slice().sort(function(a,b){ return a[0]-b[0]; }), base=tp.length?tp[0][1]:500000, bpm=clamp(Math.round(60000000/base*10)/10,20,400), multi=tp.some(function(x){ return x[1]!==base; });
      function toInt(tk){ if(!multi) return Math.round(tk*PPQ/M.div);
        var sec=0, pt_=0, us=tp[0][1], i; for(i=0;i<tp.length;i++){ if(tp[i][0]>=tk) break; if(tp[i][0]>pt_){ sec+=(tp[i][0]-pt_)/M.div*us/1e6; pt_=tp[i][0]; } us=tp[i][1]; }
        sec+=(tk-pt_)/M.div*us/1e6; return Math.round(sec*(bpm/60)*PPQ); }
      var sg=M.sigs.slice().sort(function(a,b){ return a[0]-b[0]; })[0], num=sg?clamp(sg[1],1,32):4, den=(sg&&[1,2,4,8,16,32].indexOf(sg[2])>=0)?sg[2]:4;
      var groups=split?chosen.map(function(x){ return [x]; }):[chosen], made=[], dropped=0, total=0, lo=999, hi=-1, base0=String(f.name||'MIDI').replace(/\.[^.]*$/,'').slice(0,26)||'MIDI';
      groups.forEach(function(g,gi){ var keys={}; g.forEach(function(x){ keys[x.key]=1; }); var N=[];
        M.notes.forEach(function(a){ if(!keys[a[5]*16+a[4]]) return; var t=toInt(a[1]), e=toInt(a[1]+a[2]); N.push([fold(a[0]),Math.max(0,t),Math.max(1,e-t),clamp(a[3],1,127)]); });
        N.sort(function(x,y){ return x[1]-y[1]||x[0]-y[0]; }); if(N.length>MAXN){ dropped+=N.length-MAXN; N=N.slice(0,MAXN); }
        var endT=0; N.forEach(function(a){ endT=Math.max(endT,a[1]+a[2]); lo=Math.min(lo,a[0]); hi=Math.max(hi,a[0]); });
        var q=cleanSeq({tempo:bpm,num:num,den:den,bars:clamp(Math.ceil(endT/(PPQ*4/den*num)),1,256),snap:'1/16',zx:S_zx(),zy:S_zy(),loop:false}); q.notes=N; total+=N.length;
        var nm=split?(g[0].name||('Track '+(g[0].t+1)))+(g[0].ch!==chosen[0].ch||chosen.some(function(y){ return y!==g[0]&&y.t===g[0].t; })?' ch'+(g[0].ch+1):''):base0; q.name=nm.slice(0,32); made.push(q); });
      var added=0; made.forEach(function(q){ if(addSeq(b,q,true)) added++; }); if(!added){ setMsg('SEQUENCE LIMIT (32) REACHED - NOTHING IMPORTED'); window.alert('A board can hold at most 32 sequences.'); return; }
      API().ensure(U.id); b.d.low=rng.lo; b.d.nmap=''; try{ API().changed(); }catch(_){}
      U.sel=[]; U.lastSeq=null; syncFields(); layout(); initScroll(); U.dirty=true;
      var out=0, L=Math.round(+b.d.low||0), G=groupsN(); b.seq.notes.forEach(function(a){ if(a[0]<L||a[0]>=L+G) out++; });
      setMsg('IMPORTED '+total+' NOTES AS '+added+' SEQUENCE'+(added===1?'':'S')+' (INSTRUMENT 0 - PIANO)'+(multi?' (TEMPO CHANGES FLATTENED TO '+bpm+' BPM)':'')+(dropped?' ('+dropped+' OVER THE LIMIT DROPPED)':'')+(moved?' - '+moved+' NOTES MOVED INTO '+nname(rng.lo)+'-'+nname(rng.hi):'')+(groupsN()<rng.n?' - ONLY '+groupsN()+' OF '+rng.n+' DAMPER GROUPS ARE ENABLED':'')); }
    function finish(chosen,split){ rangeDialog(chosen).then(function(rng){ if(rng) finish2(chosen,split,rng); }); }
    function rangeDialog(chosen){ return new Promise(function(res){
      var keys={}, ns=[], mn=127, mx=0, i; chosen.forEach(function(x){ keys[x.key]=1; });
      M.notes.forEach(function(a){ if(keys[a[5]*16+a[4]]){ ns.push(a[0]); if(a[0]<mn) mn=a[0]; if(a[0]>mx) mx=a[0]; } });
      var k0=(mx-mn>=12)?2:1, ov=document.createElement('div');
      ov.className='popup-overlay'; ov.style.zIndex='10020'; ov.style.background='rgba(0,0,0,.45)';
      ov.innerHTML='<div class="mfile-popup-box" style="max-width:420px;width:min(420px,92vw)"><div class="mfile-popup-title">USABLE OCTAVES</div>'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="width:110px;font-size:11px;letter-spacing:1px">OCTAVES</span><select id="orK" style="flex:1;font-size:11px"><option value="1">1 octave (12 dampers)</option><option value="2">2 octaves (24 dampers)</option></select></div>'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="width:110px;font-size:11px;letter-spacing:1px">START OCTAVE</span><select id="orS" style="flex:1;font-size:11px"></select></div>'+
        '<div id="orInfo" style="font-size:10px;letter-spacing:1px;line-height:1.6;color:#ffb454"></div>'+
        '<div style="display:flex;gap:8px;margin-top:12px"><button class="mfile-btn-primary" id="orOk">IMPORT</button><button class="mfile-btn-cancel" id="orNo">CANCEL</button></div></div>';
      document.body.appendChild(ov);
      var selK=ov.querySelector('#orK'), selS=ov.querySelector('#orS'), info=ov.querySelector('#orInfo');
      function maxStart(k){ return k===2?7:8; }
      function fillS(keep){ var k=+selK.value, h='', o; for(o=-1;o<=maxStart(k);o++) h+='<option value="'+o+'">'+nname((o+1)*12)+' - '+nname((o+1)*12+12*k-1)+'</option>'; selS.innerHTML=h; selS.value=String(clamp(keep,-1,maxStart(k))); }
      function cur(){ var k=+selK.value, lo=(+selS.value+1)*12; return {lo:lo,hi:lo+12*k-1,n:12*k}; }
      function upd(){ var r=cur(), mv=0, j; for(j=0;j<ns.length;j++) if(ns[j]<r.lo||ns[j]>r.hi) mv++;
        info.textContent='RANGE '+nname(r.lo)+' - '+nname(r.hi)+' = DAMPER GROUPS 1-'+r.n+'.  '+mv+' OF '+ns.length+' NOTES WILL BE MOVED. (FILE USES '+nname(mn)+' - '+nname(mx)+')'; }
      selK.value=String(k0); fillS(Math.floor(mn/12)-1); upd();
      selK.onchange=function(){ fillS(+selS.value); upd(); }; selS.onchange=upd;
      function done(v){ if(ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown',kd,true); res(v); }
      function kd(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(null); } }
      document.addEventListener('keydown',kd,true);
      ov.querySelector('#orNo').onclick=function(){ done(null); };
      ov.querySelector('#orOk').onclick=function(){ done(cur()); };
    }); }
    function S_zx(){ var s0=seq(); return s0?s0.zx:48; } function S_zy(){ var s0=seq(); return s0?s0.zy:16; }
    if(P.length===1){ finish(P,false); return; }
    pickDialog(P.map(function(x){ return {label:'TRACK '+(x.t+1)+(x.name?' "'+x.name+'"':'')+'  -  CH '+(x.ch+1)+(x.ch===9?' (DRUMS)':'')+(x.prog>=0&&x.ch!==9?'  -  '+FAM[x.prog>>3]:'')+'  -  '+x.n+' notes',checked:!hasMelodic||x.ch!==9}; }),
      {title:'IMPORT .MID',ok:'IMPORT',note:'This file has several tracks / instruments. Choose what to import - every chosen note is imported as Instrument 0 (piano).',extra:{label:'Make each chosen track its own sequence',checked:false}}).then(function(r){ if(!r) return; finish(r.sel.map(function(i){ return P[i]; }),r.extra); }); };
  rd.readAsArrayBuffer(f); }
})();

