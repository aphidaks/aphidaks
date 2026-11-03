(function(){
  var panel=document.getElementById('ctrlPanelFunctional'); if(!panel) return;
  var CATS=[['manip','Manipulation','#5b8def'],['event','Event','#f2c200'],['control','Control','#e69a1e'],['timing','Timing','#20b2c4'],['math','Math','#45b36b'],
            ['vars','Variables','#ee6b2f'],['bcast','Broadcast','#e04a68'],['input','Input','#4c97ff'],['output','Output','#9b6bff'],['antenna','Antenna','#a78bfa'],
            ['define','Define','#ff5d8f'],['cblk','Components','#c64fd6']];
  var CAT={}; CATS.forEach(function(c){ CAT[c[0]]={name:c[1],color:c[2]}; });
  var nextBid=1, curCat='manip';
  var CANCEL={cancel:true}, MAXDEPTH=40;
  function askName(title,msg){ return (typeof _dsDialog==='function')?_dsDialog({title:title,msg:msg,input:true,def:'',ok:'OK'}):Promise.resolve(window.prompt(msg+':')); }
  function mkCtl(key,name){ var c={key:key,name:name,paused:false,S:{vars:[],msgs:[],scripts:[]}};
    c.R={ctl:c,vout:0,vl:0,pw:true,vars:{},timerStart:performance.now(),keyLast:{},keyHeld:{},running:false,timers:[],pm:null,pr:0,threads:new Set()}; return c; }
  var CTLS=[mkCtl('main','Main')], curKey='main', S=CTLS[0].S, E=CTLS[0].R, ctxCtl=null, lastSig=null;
  function ctlByKey(k){ for(var i=0;i<CTLS.length;i++) if(CTLS[i].key===k) return CTLS[i]; return null; }
  function curCtl(){ return ctlByKey(curKey)||CTLS[0]; }
  function idLabel(c){ return c.key==='main'?'C0':(c.key.charAt(0)==='d'?'T':'C')+c.key.slice(1); }
  function fnSlot(k){ return k.charAt(0)==='b'?k.slice(1):k; }
  function thE(th){ return (th&&th.ctl)?th.ctl.R:curCtl().R; }
  function ctxKey(){ return ctxCtl?ctxCtl.key:curKey; }
  function ctxS(){ return ctxCtl?ctxCtl.S:S; }
  function escH(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
  var STUB={sourceV:function(){return 12;},links:function(){return [];},list:function(){return [];},get:function(){return null;},setOn:function(){},setD:function(){},setColor:function(){},owner:function(){return 'main';},boxes:function(){return [];}};
  function RAW(){ return window._ceApi||STUB; }
  function API(){ var a=RAW(), key=(E&&E.ctl)?E.ctl.key:'main';
    return {
      list:function(k){ return a.list(k===undefined?key:k); },
      get:function(id){ return a.owner(+id)===key?a.get(id):null; },
      setOn:function(id,v){ if(a.owner(+id)===key) a.setOn(id,v); },
      setD:function(id,k,v){ if(a.owner(+id)===key) a.setD(id,k,v); },
      setPos:function(id,p){ if(a.owner(+id)===key&&a.setPos) a.setPos(id,p); },
      setPct:function(id,p){ if(a.owner(+id)===key&&a.setPct) a.setPct(id,p); },
      tone:function(id,hz){ if(a.owner(+id)===key&&a.tone) a.tone(id,hz); },
      toneOff:function(id){ if(a.owner(+id)===key&&a.toneOff) a.toneOff(id); },
      setColor:function(id,h){ if(a.owner(+id)===key) a.setColor(id,h); } }; }

  function num(v){ var n=parseFloat(v); return isFinite(n)?n:0; }
  function str(v){ return v===true?'true':v===false?'false':v==null?'':String(v); }
  function truthy(v){ return !(v===false||v===''||v==null||v===0||v==='0'||String(v).toLowerCase()==='false'); }
  function cmp(a,b){ var na=parseFloat(a), nb=parseFloat(b);
    if(isFinite(na)&&isFinite(nb)&&String(a).trim()!==''&&String(b).trim()!=='') return na-nb;
    a=String(a).toLowerCase(); b=String(b).toLowerCase(); return a<b?-1:a>b?1:0; }
  function sleep(ms){ return new Promise(function(r){ window._ptSet(r,Math.max(0,ms)); }); }
  function sleepT(ms,th){ return new Promise(function(r){ var t=window._ptSet(done,Math.max(0,ms)); function done(){ window._ptClear(t); if(th.wake===done) th.wake=null; r(); } th.wake=done; }); }
  var _tkW=[], _tkT=null;
  function tick(th){ return new Promise(function(res){ _tkW.push(res); if(!_tkT) _tkT=window._ptSet(function(){ _tkT=null; var w=_tkW; _tkW=[]; for(var i=0;i<w.length;i++) w[i](); },16); }).then(function(){ if(th.cancel) throw CANCEL; }); }
  function logLine(t){ var l=document.getElementById('feLog'); if(!l) return; var d=document.createElement('div'); d.textContent=t; l.appendChild(d); while(l.childNodes.length>60) l.removeChild(l.firstChild); l.scrollTop=l.scrollHeight; }

  function ctlLabel(el){
    function clean(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
    var t='';
    if(el.id){ try{ var l=document.querySelector('label[for="'+el.id.replace(/"/g,'\\"')+'"]'); if(l) t=clean(l.textContent); }catch(e){} }
    for(var a=el.parentElement, n=0; !t&&a&&n<3; a=a.parentElement, n++){
      var parts=[]; Array.prototype.forEach.call(a.children,function(c){
        if(c===el||c.contains(el)||!c.matches('label,.toggle-label,.sp-row-label')||c.querySelector('input,select,textarea')) return;
        var s=clean(c.textContent); if(s) parts.push(s); });
      if(parts.length) t=parts.join(' / '); }
    if(!t&&el.tagName==='BUTTON') t=clean(el.textContent)||clean(el.title);
    if(!t) t=clean(el.getAttribute('aria-label'))||clean(el.title)||clean(el.placeholder)||el.id;
    return t.length>34?t.slice(0,33)+'\u2026':t;
  }
  function ctlIdOf(x){ return (x&&typeof x==='object')?(x.t==='ctlRef'?String(x.a.c||''):''):x; }
  function ctlInfo(id){
    id=ctlIdOf(id);
    var el=id?document.getElementById(id):null; if(!el) return null;
    var tg=el.tagName, ty=(el.type||'').toLowerCase(), o={el:el,label:ctlLabel(el),kind:'text',opts:null,def:''};
    if(tg==='SELECT'){ o.kind='select'; o.opts=[]; Array.prototype.forEach.call(el.options,function(op){ if(!op.hidden) o.opts.push([op.value,(op.textContent||op.value).trim()]); }); o.def=el.value; }
    else if(tg==='BUTTON'||ty==='button'||ty==='submit'||ty==='reset'||ty==='radio') o.kind='press';
    else if(ty==='checkbox'){ o.kind='toggle'; o.opts=[['on','ON'],['off','OFF']]; o.def='on'; }
    else if(ty==='number'||ty==='range'){ o.kind='number'; o.def=el.value; }
    else { o.kind='text'; o.def=el.value; }
    return o;
  }
  function readCtl(id){
    var el=id?document.getElementById(id):null, inf=ctlInfo(id); if(!el||!inf) return '';
    if(inf.kind==='toggle') return el.checked?'on':'off';
    if(inf.kind==='press') return '';
    return el.value;
  }
  function inheritCtl(parent,slot){
    var sp=SP[parent.t], id='';
    Object.keys(sp.s).forEach(function(k){ if(id||k===slot) return; var x=parent.a[k];
      if(x&&typeof x==='object'){ if((x.t==='ctlRef'||x.t==='ctlParams')&&x.a.c) id=String(x.a.c); }
      else if(sp.s[k].t==='ctl'&&x) id=String(x); });
    return id;
  }
  function applyCtl(id,v){
    var el=document.getElementById(id), inf=ctlInfo(id); if(!el||!inf){ logLine('control not found: #'+id); return; }
    function fire(n){ el.dispatchEvent(new Event(n,{bubbles:true})); }
    if(inf.kind==='press'){ el.click(); return; }
    if(inf.kind==='toggle'){ var want=(v==='on'||v===true); if(el.checked!==want) el.click(); return; }
    if(inf.kind==='select'){ var s=str(v), hit=null;
      Array.prototype.forEach.call(el.options,function(op){ if(!hit&&op.value===s) hit=op; });
      Array.prototype.forEach.call(el.options,function(op){ if(!hit&&op.textContent.trim().toLowerCase()===s.toLowerCase()) hit=op; });
      if(!hit){ logLine('"'+s+'" is not an option of '+inf.label); return; }
      el.value=hit.value; fire('input'); fire('change'); return; }
    if(inf.kind==='number'){ var n=parseFloat(v); if(!isFinite(n)){ logLine('"'+str(v)+'" is not a number ('+inf.label+')'); return; }
      if(el.min!==''&&isFinite(+el.min)) n=Math.max(+el.min,n); if(el.max!==''&&isFinite(+el.max)) n=Math.min(+el.max,n);
      el.value=String(n); fire('input'); fire('change'); return; }
    el.value=str(v); fire('input'); fire('change');
  }
  var CT={t:'ctl'}, CV={t:'cval'};

  var SP={}, ORDER=[];
  function N(d){ return {t:'n',def:d}; }
  var BOOL={t:'b'};
  function CS(f){ return {t:'comp',f:f}; }
  function OS(o,d){ return {t:'opt',o:o,def:d}; }
  function OV(o,d){ return {t:'optv',o:o,def:d}; }
  function isOn(x){ if(x===true) return true; if(x===false||x==null) return false; var t=String(x).trim().toLowerCase(); if(t==='on'||t==='true'||t==='yes') return true; if(t===''||t==='off'||t==='false'||t==='no') return false; var n=Number(t); return isFinite(n)?n!==0:false; }
  var VARS={t:'var'}, MSG={t:'msg'}, LINK={t:'link'}, VIN='Voltage In';
  function def(id,cat,k,txt,s,run,extra){ var sp={id:id,cat:cat,k:k,txt:txt,s:s||{},run:run,m:(k==='c'?txt.split('|').length:0)}; if(extra) for(var x in extra) sp[x]=extra[x]; SP[id]=sp; ORDER.push(id); }
  var ONOFF=[['on','ON'],['off','OFF']];
  var DSOPT=[['','']];
  window._feSetDamperOpts=function(names){ DSOPT.length=0; (names||[]).forEach(function(n){ DSOPT.push([n,n]); }); if(!DSOPT.length) DSOPT.push(['','']);
    try{ if(pal&&panel.style.display!=='none') renderAll(); }catch(_){} };
  try{ if(window._damperStateNames) window._feSetDamperOpts(window._damperStateNames()); }catch(_){}

  def('whenStart','event','hat','when program starts',{},null,{hk:'start',match:function(){return true;}});
  def('whenPowerLoss','event','hat','when controller loses power',{},null,{hk:'plost',match:function(){return true;},tip:'Runs when this controller loses power (input voltage drops to 0 V or outside its rated range). Forever blocks can\u2019t be used under it. When every script under this block has finished, the controller stops and runs nothing until it is powered again. Without this block the controller stops immediately.'});
  def('whenComp','event','hat','when %c %e',{c:CS('state'),e:OS([['on','turned ON / pressed'],['off','turned OFF / released'],['any','changes']],'on')},null,
      {hk:'comp',match:function(a,i){ return String(a.c)===String(i.id)&&(a.e==='any'||a.e===i.ev); }});
  def('whenSel','event','hat','when selector %c is set to position %n',{c:CS('selector'),n:N(1)},null,
      {hk:'sel',match:function(a,i){ return String(a.c)===String(i.id)&&(String(a.n).trim()===''||num(a.n)===i.pos); },tip:'Fires when the selector is turned to that position (1 = left). Leave the position empty for any change.'});
  def('whenPot','event','hat','when potentiometer %c changes',{c:CS('pot')},null,
      {hk:'pot',match:function(a,i){ return String(a.c)===String(i.id); },tip:'Fires every time the potentiometer is turned.'});
  def('whenKey','event','hat','when keypad %c key %k pressed',{c:CS('keypad'),k:N('')},null,
      {hk:'key',match:function(a,i){ return String(a.c)===String(i.id)&&(String(a.k).trim()===''||String(a.k).trim()===String(i.key)); }});
  def('whenMotor','event','hat','when motor becomes %m',{m:OS([['idle','Idle'],['up','Winding-Up'],['steady','Steady'],['down','Winding-Down']],'steady')},null,
      {hk:'motor',match:function(a,i){ return a.m===i.m; }});
  def('whenRpm','event','hat','when RPM rises above %n',{n:N(100)},null,
      {hk:'rpm',match:function(a,i){ return i.prev<=num(a.n)&&i.now>num(a.n); }});
  def('if','control','c','if %c then',{c:BOOL},function(A,th,b){ return truthy(A('c'))?runList(b.s1,th):null; });
  def('ifelse','control','c','if %c then|else',{c:BOOL},function(A,th,b){ return runList(truthy(A('c'))?b.s1:b.s2,th); });
  def('repeat','control','c','repeat %n',{n:N(10)},async function(A,th,b){ var n=Math.floor(num(A('n'))); for(var i=0;i<n;i++){ await runList(b.s1,th); await tick(th); } });
  def('forever','control','c','forever',{},async function(A,th,b){ var R0=E; if(th.noLoop||(R0&&R0.dying)){ logLine('['+((th.ctl&&th.ctl.name)||'')+'] forever blocks are not allowed while the controller loses power - skipped'); return; } while(true){ await runList(b.s1,th); await tick(th); } });
  def('repeatUntil','control','c','repeat until %c',{c:BOOL},async function(A,th,b){ while(true){ await pre(b.a.c,th); if(truthy(A('c'))) break; await runList(b.s1,th); await tick(th); } });
  def('cycleUntil','control','c','cycle until %c',{c:BOOL},async function(A,th,b){
    var sub={cancel:false,ctl:th.ctl,dm:th.dm,wake:null,killed:false,finishing:false,args:th.args,root:th.root||th}, R=thE(th), stopIt, killed=new Promise(function(r){ stopIt=r; });
    function kill(){ if(sub.killed) return; sub.killed=true; sub.cancel=true; if(sub.wake) sub.wake(); stopIt(); }
    function cond(){ return truthy(ev(b.a.c,th)); }
    if(cond()) return;
    R.threads.add(sub);
    var fam=sub.root, ent={sub:sub,check:function(from){ if(sub.cancel||sub.killed||sub.finishing) return; try{ if(!cond()) return; }catch(e){ return; }
      if(from&&(from===sub||(from.root||from)===fam)) sub.finishing=true; else kill(); }};
    CYC.add(ent);
    var watch=setInterval(function(){ if(th.cancel||sub.cancel){ kill(); return; } if(window._simPaused||sub.finishing) return; try{ if(cond()) kill(); }catch(e){} },33);
    var stopped=false;
    var loop=(async function(){ try{ while(!sub.cancel&&!sub.finishing){ await runList(b.s1,sub); await tick(sub); } }
      catch(e){ if(e!==CANCEL) throw e; if(!sub.killed) stopped=true; } })();
    loop.catch(function(e){ logLine('['+(th.ctl?th.ctl.name:'')+'] error: '+(e&&e.message)); });
    await Promise.race([loop,killed]);
    clearInterval(watch); CYC.delete(ent); sub.cancel=true; R.threads.delete(sub);
    if(th.cancel||stopped) throw CANCEL;
  },{tip:'Repeats its blocks. If something outside turns the condition true, the cycle stops at once (even in the middle of a wait). If a block inside the cycle makes it true, the cycle finishes that pass and then stops.'});
  def('stop','control','cmd','stop %o',{o:OS([['script','this script'],['all','all scripts']],'script')},function(A,th){ if(A('o')==='all') stopCtl(E.ctl); throw CANCEL; });
  def('wait','timing','cmd','wait %n seconds',{n:N(1)},async function(A,th){ await sleepT(num(A('n'))*1000,th); if(th.cancel) throw CANCEL; });
  def('waitUntil','timing','cmd','wait until %c',{c:BOOL},async function(A,th,b){ while(true){ await pre(b.a.c,th); if(truthy(A('c'))) break; await tick(th); } });
  def('every','timing','hat','every %n seconds',{n:N(1)},null,{hk:'every'});
  def('timer','timing','rep','timer (s)',{},function(){ return Math.round((performance.now()-E.timerStart))/1000; });
  def('resetTimer','timing','cmd','reset timer',{},function(){ E.timerStart=performance.now(); });
  def('add','math','rep','%a + %b',{a:N(''),b:N('')},function(A){ return num(A('a'))+num(A('b')); });
  def('sub','math','rep','%a − %b',{a:N(''),b:N('')},function(A){ return num(A('a'))-num(A('b')); });
  def('mul','math','rep','%a × %b',{a:N(''),b:N('')},function(A){ return num(A('a'))*num(A('b')); });
  def('div','math','rep','%a ÷ %b',{a:N(''),b:N('')},function(A){ var d=num(A('b')); return d?num(A('a'))/d:0; });
  def('mod','math','rep','%a mod %b',{a:N(''),b:N('')},function(A){ var d=num(A('b')), a=num(A('a')); return d?a-Math.floor(a/d)*d:0; });
  def('round','math','rep','round %a',{a:N('')},function(A){ return Math.round(num(A('a'))); });
  def('mathop','math','rep','%o of %a',{o:OS([['abs','abs'],['floor','floor'],['ceil','ceiling'],['sqrt','sqrt'],['sin','sin'],['cos','cos'],['tan','tan']],'abs'),a:N('')},
      function(A){ var a=num(A('a')), o=A('o'); return o==='abs'?Math.abs(a):o==='floor'?Math.floor(a):o==='ceil'?Math.ceil(a):o==='sqrt'?Math.sqrt(Math.max(0,a)):
        Math[o](a*Math.PI/180); });
  def('rand','math','rep','pick random %a to %b',{a:N(1),b:N(10)},function(A){ var a=num(A('a')), b=num(A('b')); if(a>b){ var t=a;a=b;b=t; }
        return (Number.isInteger(a)&&Number.isInteger(b))?a+Math.floor(Math.random()*(b-a+1)):a+Math.random()*(b-a); });
  def('join','math','rep','join %a %b',{a:N('hello '),b:N('world')},function(A){ return str(A('a'))+str(A('b')); });
  def('lt','math','bool','%a < %b',{a:N(''),b:N(50)},function(A){ return cmp(A('a'),A('b'))<0; });
  def('eq','math','bool','%a = %b',{a:N(''),b:N(50)},function(A){ return cmp(A('a'),A('b'))===0; });
  def('gt','math','bool','%a > %b',{a:N(''),b:N(50)},function(A){ return cmp(A('a'),A('b'))>0; });
  def('and','math','bool','%a and %b',{a:BOOL,b:BOOL},function(A){ return truthy(A('a'))&&truthy(A('b')); });
  def('or','math','bool','%a or %b',{a:BOOL,b:BOOL},function(A){ return truthy(A('a'))||truthy(A('b')); });
  def('not','math','bool','not %a',{a:BOOL},function(A){ return !truthy(A('a')); });
  var VSEP='\u00bb';
  function varRef(id){ id=String(id); var i=id.indexOf(VSEP);
    if(i>0){ var c=ctlByKey(id.slice(0,i)); if(c&&c!==E.ctl&&dataLinked(E.ctl.key).indexOf(c.key)>=0) return {R:c.R,n:id.slice(i+1)}; }
    return {R:E,n:id}; }
  def('varGet','vars','rep','%v',{v:VARS},function(A){ var r=varRef(A('v')); if(r.n===VIN) return vinOf(r.R.ctl); var v=r.R.vars[r.n]; return v===undefined?0:v; });
  def('setVar','vars','cmd','set %v to %n',{v:VARS,n:N(0)},function(A){ var r=varRef(A('v')); r.R.vars[r.n]=A('n'); });
  def('changeVar','vars','cmd','change %v by %n',{v:VARS,n:N(1)},function(A){ var r=varRef(A('v')); r.R.vars[r.n]=num(r.R.vars[r.n])+num(A('n')); });
  def('whenReceive','bcast','hat','when I receive %m',{m:MSG},null,{hk:'msg',match:function(a,i){ return a.m===i.m; }});
  function bcastAll(m){ var ps=fireHats('msg',{m:m}), me=E.ctl; dataLinked(me.key).forEach(function(k){ var t=ctlByKey(k); if(!t||!t.R.running) return;
      linkList().forEach(function(l){ if(l.t==='d'&&((l.f===me.key&&l.to===k)||(l.to===me.key&&l.f===k))){ try{ if(RAW().flash) RAW().flash(l.f,l.to); }catch(_){} } });
      ps=ps.concat(fireHats('msg',{m:m},t)); }); return ps; }
  def('broadcast','bcast','cmd','broadcast %m',{m:MSG},function(A){ bcastAll(A('m')); },{tip:'Also reaches every running controller linked through the Data dot (their "when I receive" scripts with the same message name run).'});
  def('msgReceived','bcast','bool','%m received?',{m:MSG},function(A){ var R=E.ctl.R, k=str(A('m')), r=!!(R.rcv&&R.rcv[k]); if(r) R.rcv[k]=false; return r; },
      {tip:'True once each time the message arrived (broadcast, or a data message with that name) since this block last checked; then it resets to false.'});
  def('broadcastWait','bcast','cmd','broadcast %m and wait',{m:MSG},async function(A,th){ await Promise.all(bcastAll(A('m'))); if(th.cancel) throw CANCEL; });
  def('isOn','input','bool','%c is ON?',{c:CS('state')},function(A){ var g=API().get(+A('c')); return !!(g&&g.on); });
  def('potVal','input','rep','%c value',{c:CS('pot')},function(A){ var g=API().get(+A('c')); return g?g.val:0; },{tip:'The potentiometer value, between its "Value at 0%" and "Value at 100%" settings.'});
  def('selPos','input','rep','%c position',{c:CS('selector')},function(A){ var g=API().get(+A('c')); return g?g.pos:0; },{tip:'The selector position: 1 = left, 2, 3.'});
  def('lastKey','input','rep','%c last key',{c:CS('keypad')},function(A){ return E.keyLast[A('c')]||''; });
  def('keyHeld','input','bool','%c key %k held?',{c:CS('keypad'),k:N('')},function(A){ var h=E.keyHeld[A('c')], k=str(A('k')).trim(); return !!h&&(k===''||k===h); });
  def('motorRpm','input','rep','motor RPM',{},function(){ return typeof currentRPM!=='undefined'?Math.round(currentRPM):0; });
  def('motorState','input','rep','motor state',{},function(){ return typeof windDirection!=='undefined'?windDirection:'idle'; },{tip:'idle / up / steady / down'});
  def('playTone','output','cmd','play tone on %c at %f Hz for %d seconds',{c:CS('buzzer'),f:N(440),d:N(0.5)},async function(A,th){
    var id=+A('c'), ms=Math.max(0,num(A('d')))*1000; API().tone(id,num(A('f')));
    try{ await sleepT(ms,th); } finally{ API().toneOff(id); }
    if(th.cancel) throw CANCEL; },{tip:'Plays a tone and waits until it finishes (frequency in Hz, duration in seconds).'});
  def('startTone','output','cmd','start tone on %c at %f Hz',{c:CS('buzzer'),f:N(440)},function(A){ API().tone(+A('c'),num(A('f'))); },{tip:'Starts a tone that keeps sounding until you stop it. Run it again with another frequency to change pitch.'});
  def('stopTone','output','cmd','stop tone on %c',{c:CS('buzzer')},function(A){ API().toneOff(+A('c')); });
  def('setPot','output','cmd','set potentiometer %c to %n %',{c:CS('pot'),n:N(50)},function(A){ API().setPct(+A('c'),num(A('n'))); },{tip:'Turns the potentiometer to a position from 0 to 100 percent.'});
  def('setSel','output','cmd','set selector %c to position %n',{c:CS('selector'),n:N(1)},function(A){ API().setPos(+A('c'),num(A('n'))); },{tip:'Turns the selector to position 1, 2 or 3.'});
  def('setOn','output','cmd','set %c to %o',{c:CS('state'),o:OV(ONOFF,'on')},function(A){ API().setOn(+A('c'),isOn(A('o'))); });
  def('toggle','output','cmd','toggle %c',{c:CS('state')},function(A){ var g=API().get(+A('c')); if(g) API().setOn(+A('c'),!g.on); });
  function dampGate(){ var ok=true; try{ var r=RAW(); ok=r.damperGate?!!r.damperGate(E.ctl.key):true; }catch(_){} if(!ok) logLine('['+E.ctl.name+'] Damper output is not wired to the Siren Damper dot'); return ok; }
  function _dgOk(key){ try{ var r=RAW(); return r.damperGate?!!r.damperGate(key):true; }catch(_){ return true; } }
  def('setDamperState','manip','cmd','set damper state to %s',{s:OV(DSOPT,'')},function(A){ var n=String(A('s')==null?'':A('s')); if(!n) return; if(!dampGate()) return;
      if(window._damperMode&&window._damperMode()==='controller'){ logLine('['+E.ctl.name+'] Damper is in Controller Mode: damper states are locked'); return; }
      if(!(window._setDamperState&&window._setDamperState(n))) logLine('['+E.ctl.name+'] damper state "'+n+'" not found'); },
      {tip:'Loads a saved Damper State (Dampers section, SAVE button). Works in DATA mode only; Controller Mode locks it.'});
  function dgWarn(r){ if(r==='ctl') logLine('['+E.ctl.name+'] Damper is in Controller Mode: groups follow the Damper item pins, overrides work in DATA mode only'); else if(r==='range') logLine('['+E.ctl.name+'] no such damper group'); }
  def('overrideDamperGroup','manip','cmd','override damper group %g to %o',{g:N(1),o:OV(ONOFF,'on')},function(A){ if(!dampGate()) return; dgWarn(window._overrideDamperGroup?window._overrideDamperGroup(A('g'),isOn(A('o'))):'ctl'); },
      {tip:'DATA mode only: forces a damper group fully ON or OFF, ignoring the sequencer and MIDI, until it is released.'});
  def('releaseDamperGroup','manip','cmd','release override on damper group %g',{g:N(1)},function(A){ if(!dampGate()) return; dgWarn(window._overrideDamperGroup?window._overrideDamperGroup(A('g'),null):'ctl'); },
      {tip:'DATA mode only: gives a damper group back to the sequencer / MIDI.'});
  def('releaseAllDampers','manip','cmd','release all damper overrides',{},function(A){ if(!dampGate()) return; if(window._releaseDamperOverrides) window._releaseDamperOverrides(); },
      {tip:'DATA mode only: clears every damper group override.'});
  def('overrideDamperGroupOut','output','cmd','override damper group %g to %o',{g:N(1),o:OV(ONOFF,'on')},function(A){ if(!dampGate()) return; dgWarn(window._overrideDamperGroup?window._overrideDamperGroup(A('g'),isOn(A('o'))):'ctl'); },
      {tip:'Output block (shown when this controller is wired to the Damper item and Dampers are in DATA mode): forces a damper group ON or OFF until it is released.'});
  def('damperGroupOn','input','bool','damper group %g is ON?',{g:N(1)},function(A){ return !!(window._getDamperGroup&&window._getDamperGroup(A('g'))); });
  def('damperMode','input','rep','damper mode',{},function(){ return window._damperMode?window._damperMode():'simple'; },{tip:'simple / controller'});
  def('setCtl','manip','cmd','set %c to %v',{c:CT,v:CV},function(A,th,b){ applyCtl(ctlIdOf(b.a.c),A('v')); },
      {tip:'Drop it in, then click any switch, input, button or dropdown in the Editor tab. The value choices match that control.'});
  def('ctlRef','manip','rep','%c',{c:CT},function(A,th,b){ return readCtl(ctlIdOf(b.a.c)); },
      {tip:'The picked control. As a value it is the control\u2019s current setting, so you can compare it with (parameters for ...). In the control slot of a set block it names the control.'});
  def('ctlParams','manip','rep','parameters for %c %v',{c:CT,v:CV},function(A){ return A('v'); },
      {tip:'One parameter of a control (e.g. SLIP or PRECISE). Use it in = comparisons with (control), or in the "to" slot of a set block. It copies the control from the block it is dropped next to.'});
  def('lcdLine','output','cmd','LCD %c line %l = %t',{c:CS('lcd'),l:OS([['1','1'],['2','2'],['3','3'],['4','4']],'1'),t:N('HELLO')},function(A){ API().setD(+A('c'),'l'+(['1','2','3','4'].indexOf(A('l'))>=0?A('l'):'1'),Array.from(str(A('t'))).slice(0,40).join('')); },{tip:'Text beyond the LCD\u2019s column count is cut off on the display.'});
  def('lcdClear','output','cmd','clear LCD %c',{c:CS('lcd')},function(A){ ['l1','l2','l3','l4'].forEach(function(k){ API().setD(+A('c'),k,''); }); });
  def('lcdBl','output','cmd','LCD %c backlight %o',{c:CS('lcd'),o:OV(ONOFF,'on')},function(A){ API().setD(+A('c'),'bl',isOn(A('o'))); });
  def('setText','output','cmd','set text %c to %t',{c:CS('text'),t:N('Hello')},function(A){ API().setD(+A('c'),'text',str(A('t')).slice(0,200)); });
  def('setColor','output','cmd','set %c color to %t',{c:CS('any'),t:N('#ff0000')},function(A){ var h=str(A('t')).trim(); if(/^#[0-9a-f]{6}$/i.test(h)) API().setColor(+A('c'),h); });
  def('comment','control','cmd','// %t',{t:N('comment')},function(){},{tip:'Comment: a note for yourself. Does nothing when the script runs.'});
  def('say','output','cmd','print %t',{t:N('hello')},function(A){ logLine((CTLS.length>1?'['+E.ctl.name+'] ':'')+str(A('t'))); });

  var _lkC=null; function linkList(){ if(_lkC) return _lkC; try{ return RAW().links?RAW().links():[]; }catch(_){ return []; } }
  function dataLinked(key){ var o=[]; linkList().forEach(function(l){ if(l.t!=='d') return; var k=l.f===key?l.to:l.to===key?l.f:null; if(k!==null&&o.indexOf(k)<0) o.push(k); }); return o; }
  function vinOf(ctl){ var L=linkList(); for(var i=0;i<L.length;i++) if((L[i].t==='v'||(L[i].t==='p'&&L[i].tp==='in'))&&L[i].to===ctl.key){ if(L[i].t==='p'&&/^po\d+$/.test(L[i].fp)){ var s0=ctlByKey(L[i].f); return (s0&&s0.R.pinOut)?(+s0.R.pinOut[+L[i].fp.slice(2)]||0):0; } if(L[i].f==='source') return srcVolt(); var s=ctlByKey(L[i].f); return s?s.R.vout:0; } return ctl.key==='main'?srcVolt():0; }
  function srcVolt(){ try{ return RAW().sourceV?(+RAW().sourceV()||0):0; }catch(_){ return 0; } }
  function ratedOk(ctl,n){ if(ctl.sp) return true; if(!(n>0)) return false; if(ctl.key==='main') return true; var lo=+ctl.vmin, hi=+ctl.vmax; if(!isFinite(lo)||!isFinite(hi)) return true; return n>=lo&&n<=hi; }
  function rangeTxt(ctl){ return (+ctl.vmin)+'\u2013'+(+ctl.vmax)+' V'; }
  function powerDown(ctl,n){
    var R=ctl.R, was=R.running, hats=[];
    var why=n>0?'input '+(Math.round(n*100)/100)+' V is outside the rated range ('+rangeTxt(ctl)+')':'lost power';
    if(was&&!R.dying&&!ctl.paused&&!window._simPaused) hats=ctl.S.scripts.filter(function(sc){ var f=sc.blocks[0]; return f&&f.t==='whenPowerLoss'; });
    if(!hats.length){ stopCtl(ctl); R.vout=0; R.pinOut={}; if(was) logLine('['+ctl.name+'] '+why+(n>0?' - stopped':'')); return; }
    R.threads.forEach(function(t){ t.cancel=true; }); R.threads.clear(); R.timers.forEach(clearInterval); R.timers=[];
    R.vout=0; R.pinOut={}; R.dying=true; var tok=R.dyTok=(R.dyTok||0)+1;
    logLine('['+ctl.name+'] '+why+' - running power-loss scripts');
    var ps=fireHats('plost',{},ctl);
    Promise.all(ps).then(function(){ if(R.dying&&R.dyTok===tok){ stopCtl(ctl); R.vout=0; R.pinOut={}; logLine('['+ctl.name+'] stopped'); fillCtlSel(); wiresRefresh(); } });
  }
  function vConnected(ctl){ return linkList().some(function(l){ return (l.t==='v'||(l.t==='p'&&l.tp==='in'))&&l.to===ctl.key; }); }
  function checkVin(){ var chg=false; _lkC=null; try{ _lkC=RAW().links?RAW().links():[]; }catch(_){ _lkC=null; } try{ CTLS.forEach(function(ctl){ var R=ctl.R, n=vinOf(ctl), pw=ratedOk(ctl,n); R.oor=(n>0&&!pw);
      if(pw!==R.pw){ R.pw=pw; R.vl=n; chg=true; if(!pw) powerDown(ctl,n); else if(!ctl.paused){ startCtl(ctl); logLine('['+ctl.name+'] powered up'); } else fillCtlSel(); fillCtlSel(); }
      else if(n!==R.vl){ var p=R.vl; R.vl=n; chg=true; if(R.running) fireHats('vin',{prev:p,now:n},ctl); } }); }finally{ _lkC=null; }
    if(chg) wiresRefresh(); }
  window._fePowered=function(key){ var c=ctlByKey(key); return c?!!c.R.pw:true; };
  var DMPCMD={setDamperState:1,overrideDamperGroup:1,overrideDamperGroupOut:1,releaseDamperGroup:1,releaseAllDampers:1};
  function usesDamper(list){ if(!Array.isArray(list)) return false; for(var i=0;i<list.length;i++){ var b=list[i]; if(!b) continue; if(DMPCMD[b.t]) return true; if(usesDamper(b.s1)||usesDamper(b.s2)) return true; } return false; }
  window._feDamperAuto=function(){ var uses=false, powered=false;
    CTLS.forEach(function(c){ var u=false; try{ u=(c.S.scripts||[]).some(function(sc){ return usesDamper(sc.blocks); }); }catch(_){} if(u&&_dgOk(c.key)){ uses=true; if(c.R.pw) powered=true; } });
    return {uses:uses,powered:powered}; };
  function wiresRefresh(){ try{ if(RAW().refresh) RAW().refresh(); }catch(_){} }
  window._feVolt=function(key){ var c=ctlByKey(key); return c?c.R.vout:0; };
  window._fePinOut=function(key,n){ var c=ctlByKey(key); return (c&&c.R.pinOut)?(+c.R.pinOut[n]||0):0; };
  window._feVinTick=function(){ checkVin(); };
  window._feLinksChanged=function(){ checkVin(); wiresRefresh(); if(pal&&panel.style.display!=='none') renderWork(); };
  def('whenVin','event','hat','when input voltage %d %n',{d:OS([['rise','rises above'],['fall','falls below'],['any','changes']],'rise'),n:N(1)},null,
      {hk:'vin',match:function(a,i){ var n=num(a.n); return a.d==='any'?i.prev!==i.now:a.d==='rise'?(i.prev<=n&&i.now>n):(i.prev>=n&&i.now<n); }});
  def('vconn','input','bool','input connected?',{},function(){ return vConnected(E.ctl); });
  function pinGet(n){ try{ return RAW().pinIn?RAW().pinIn(E.ctl.key,Math.round(num(n))):null; }catch(_){ return null; } }
  function r3(v){ return Math.round(v*1000)/1000; }
  def('pinRead','input','rep','pin %n',{n:N(1)},function(A){ var p=pinGet(A('n')); if(!p) return 'LOW'; return p.m==='a'?r3(p.v):((p.v>0&&p.v>=p.hv)?'HIGH':'LOW'); },{tip:'Digital pin: HIGH or LOW (HIGH at or above the voltage set for the pin). Analog pin: its voltage.'});
  def('pinHigh','input','bool','pin %n high?',{n:N(1)},function(A){ var p=pinGet(A('n')); return !!p&&p.v>0&&p.v>=p.hv; },{tip:'True when the pin has at least its HIGH voltage on it.'});
  def('pinVolt','input','rep','pin %n voltage',{n:N(1)},function(A){ var p=pinGet(A('n')); return p?r3(p.v):0; },{tip:'The voltage on an input pin.'});
  def('pinAtV','input','bool','pin %n at %v V?',{n:N(1),v:N(5)},function(A){ var p=pinGet(A('n')); return !!p&&p.v>0&&p.v>=num(A('v')); },{tip:'True when the pin voltage is at or above this many volts.'});
  function pinOutOk(n,warn){ var c=null; try{ c=RAW().pinCounts?RAW().pinCounts(E.ctl.key):null; }catch(_){} n=Math.round(num(n)); var ok=(c&&n>=1&&n<=c.o)?n:0;
    if(!ok&&warn){ var cnt=c?c.o:0, key=n+'/'+cnt; E._pinWarn=E._pinWarn||{}; if(!E._pinWarn[key]){ E._pinWarn[key]=1; logLine('['+E.ctl.name+'] output pin '+n+' does not exist - this controller has '+cnt+' output pin'+(cnt===1?'':'s')+' (raise "Output pins" on the controller box)'); } }
    return ok; }
  def('pinOutSet','output','cmd','set output pin %n voltage to %v',{n:N(1),v:N(5)},function(A){ var n=pinOutOk(A('n'),true); if(!n) return; E.pinOut=E.pinOut||{}; var pv=Math.max(0,num(A('v'))); if(E.pinOut[n]===pv) return; E.pinOut[n]=pv; checkVin(); wiresRefresh(); },{tip:'Sets the voltage on one of this controller\u2019s output pins (set the number of output pins on the controller). Wired inputs see it.'});
  def('pinOutVal','output','rep','output pin %n voltage',{n:N(1)},function(A){ var n=pinOutOk(A('n')); return n&&E.pinOut?(+E.pinOut[n]||0):0; });
  def('setVout','output','cmd','set output voltage to %n',{n:N(5)},function(A){ var nv=num(A('n')); if(E.vout===nv) return; E.vout=nv; checkVin(); wiresRefresh(); },{tip:'Sets the voltage on this controller\u2019s Output dot. Wired controllers see it on their Input dot.'});
  def('changeVout','output','cmd','change output voltage by %n',{n:N(1)},function(A){ var dv=num(A('n')); if(!dv) return; E.vout=num(E.vout)+dv; checkVin(); wiresRefresh(); });
  def('vout','output','rep','output voltage',{},function(){ return E.vout; });
  def('whenData','bcast','hat','when data message %m received',{m:N('')},null,
      {hk:'dmsg',match:function(a,i){ var w=str(a.m).trim(); return w===''||w===str(i.m); },tip:'Fires when a linked controller sends a data message (leave the name empty for any message).'});
  def('sendData','bcast','cmd','send data %d as message %m to %t',{d:N('hello'),m:N('message'),t:LINK},function(A){
    var me=E.ctl, key=me.key, tg=A('t'), msg=str(A('m')).slice(0,24), dat=A('d'); if(typeof dat==='string') dat=dat.slice(0,200); var sent=0;
    linkList().forEach(function(l){ if(l.t!=='d') return; var o=l.f===key?l.to:l.to===key?l.f:null; if(o===null||(tg!=='*'&&tg!==o)) return;
      var t=ctlByKey(o); if(!t){ var mm=''; try{ mm=RAW().midiName?RAW().midiName(o):''; }catch(_){} if(mm&&window._midiMsg&&window._midiMsg(o,msg,dat,me.name)){ sent++; try{ if(RAW().flash) RAW().flash(l.f,l.to); }catch(_){} } return; }
      if(!t.R.running) return; sent++; try{ if(RAW().flash) RAW().flash(l.f,l.to); }catch(_){}
      fireHats('dmsg',{m:msg,d:dat},t,{m:msg,d:dat,from:me.name}); });
    if(!sent) logLine('['+me.name+'] no linked controller received "'+msg+'"'); },{tip:'Sends a message with data to controllers linked through the Data dot.'});
  window._feDataFrom=function(key,name,msg,dat){ linkList().forEach(function(l){ if(l.t!=='d') return; var o=l.f===key?l.to:l.to===key?l.f:null; if(o===null) return; var t=ctlByKey(o); if(!t||!t.R.running) return;
      try{ if(RAW().flash) RAW().flash(l.f,l.to); }catch(_){} fireHats('dmsg',{m:msg,d:dat,k:key},t,{m:msg,d:dat,from:name}); }); };
  def('dataVal','bcast','rep','received data',{},function(A,th){ return th&&th.dm?th.dm.d:''; });
  def('dataMsg','bcast','rep','received message name',{},function(A,th){ return th&&th.dm?th.dm.m:''; });
  def('dataFrom','bcast','rep','data sent by',{},function(A,th){ return th&&th.dm?th.dm.from:''; });

  function midiKeyOf(A){ var tg=A('t'), key=E.ctl.key, found=''; linkList().forEach(function(l){ if(found||l.t!=='d') return; var o=l.f===key?l.to:l.to===key?l.f:null; if(o===null||(tg&&tg!=='*'&&tg!==o)) return; var mm=''; try{ mm=RAW().midiName?RAW().midiName(o):''; }catch(_){} if(mm) found=o; }); return found; }
  function midiRead(A,f,dflt){ var k=midiKeyOf(A); if(!k||!window._midiInfo) return dflt; var i=null; try{ i=window._midiInfo(k); }catch(_){} return i?f(i):dflt; }
  function midiSend(A,msg){ var k=midiKeyOf(A); if(!k||!window._midiMsg){ logLine('['+E.ctl.name+'] no MIDI board linked to its Data dot'); return; } window._midiMsg(k,msg,'',E.ctl.name); try{ if(RAW().flash) RAW().flash(E.ctl.key,k); }catch(_){} }
  def('whenMidi','bcast','hat','when MIDI %t %e',{t:LINK,e:OS([['started','starts playing'],['paused','pauses'],['stopped','is stopped'],['finished','finishes'],['loop','loops'],['sequence','changes sequence'],['live','goes to live mode'],['seqmode','goes to sequence mode']],'started')},null,
      {hk:'dmsg',match:function(a,i){ return !!i.k&&(!a.t||a.t==='*'||a.t===i.k)&&str(i.m)===str(a.e); },tip:'Fires when a MIDI board linked through the Data dot starts, pauses, stops, finishes, loops or switches sequence. Use received data to get the sequence name.'});
  def('midiDo','bcast','cmd','MIDI %t: %a',{t:LINK,a:OS([['play','play'],['pause','pause'],['stop','stop'],['toggle','play / pause'],['restart','restart'],['loop on','loop on'],['loop off','loop off'],['mode live','live mode'],['mode sequence','sequence mode']],'play')},function(A){ midiSend(A,str(A('a'))); },{tip:'Controls the MIDI board linked to this controller\u2019s Data dot.'});
  def('midiSeq','bcast','cmd','MIDI %t: switch to sequence %n',{t:LINK,n:N(1)},function(A){ midiSend(A,'seq '+str(A('n')).trim()); },{tip:'Switches the MIDI board to a sequence by number (1 = first) or by name. A playing board keeps playing the new sequence.'});
  def('midiPlaying','bcast','bool','MIDI %t is playing?',{t:LINK},function(A){ return midiRead(A,function(i){ return i.state==='playing'; },false); });
  def('midiLoopOn','bcast','bool','MIDI %t loop on?',{t:LINK},function(A){ return midiRead(A,function(i){ return i.loop; },false); });
  def('midiState','bcast','rep','MIDI %t state',{t:LINK},function(A){ return midiRead(A,function(i){ return i.state; },''); },{tip:'playing, paused or stopped.'});
  def('midiSeqNum','bcast','rep','MIDI %t sequence number',{t:LINK},function(A){ return midiRead(A,function(i){ return i.seq; },0); });
  def('midiSeqName','bcast','rep','MIDI %t sequence name',{t:LINK},function(A){ return midiRead(A,function(i){ return i.seqName; },''); });
  def('midiSeqCount','bcast','rep','MIDI %t number of sequences',{t:LINK},function(A){ return midiRead(A,function(i){ return i.seqCount; },0); });
  def('midiLength','bcast','rep','MIDI %t sequence length (seconds)',{t:LINK},function(A){ return midiRead(A,function(i){ return i.length; },0); });
  def('midiPos','bcast','rep','MIDI %t position (seconds)',{t:LINK},function(A){ return midiRead(A,function(i){ return i.pos; },0); });
  def('midiTempo','bcast','rep','MIDI %t tempo (BPM)',{t:LINK},function(A){ return midiRead(A,function(i){ return i.tempo; },0); });
  def('midiMode','bcast','rep','MIDI %t mode',{t:LINK},function(A){ return midiRead(A,function(i){ return i.mode; },''); },{tip:'sequence or live.'});
  def('midiLive','bcast','bool','MIDI %t in live mode?',{t:LINK},function(A){ return midiRead(A,function(i){ return i.mode==='live'; },false); });

  function antCtls(me){ return CTLS.filter(function(c){ return c.ant&&c.R.antA&&c!==me; }); }
  def('whenComA','antenna','hat','when Com A data received',{},null,{hk:'amsg',match:function(){ return true; },tip:'Fires when another controller sends data to this one with Com A. Needs the Antenna option and A set to active.'});
  def('askGlobalA','antenna','rep','ask global A',{},function(){ return antCtls(E.ctl).map(function(c){ return c.name; }).join(', '); },
      {tip:'The names of the other controllers whose antenna is set to active (comma separated). Drop it into a Com A to slot.'});
  def('setAActive','antenna','cmd','set A active',{},function(){ var c=E.ctl; if(!c.ant){ logLine('['+c.name+'] has no antenna'); return; } E.antA=true; },
      {tip:'Other controllers can now communicate with this controller.'});
  def('setAInactive','antenna','cmd','set A inactive',{},function(){ var c=E.ctl; if(!c.ant){ logLine('['+c.name+'] has no antenna'); return; } E.antA=false; },
      {tip:'Other controllers can no longer communicate with this controller, and it is hidden from ask global A.'});
  def('comA','antenna','c','Com A %d',{d:N('hello')},async function(A,th,b){
    var me=E.ctl, dat=A('d'), want=[], sent=0, names=[]; if(typeof dat==='string') dat=dat.slice(0,200);
    if(!me.ant){ logLine('['+me.name+'] has no antenna'); return; }
    for(var i=0;i<b.s1.length;i++){ var ch=b.s1[i];
      if(ch.t==='comAto'){ String(ev(ch.a.x,th)==null?'':ev(ch.a.x,th)).split(',').forEach(function(p){ p=p.trim().toLowerCase(); if(p&&want.indexOf(p)<0) want.push(p); }); }
      else await runBlock(ch,th); }
    CTLS.forEach(function(t){ if(t===me||want.indexOf(String(t.name).toLowerCase())<0) return;
      if(!t.ant||!t.R.antA||!t.R.running) return; sent++; names.push(t.name);
      fireHats('amsg',{},t,{d:dat,from:me.name,w:1}); });
    if(!sent) logLine('['+me.name+'] Com A: no controller received the data'); },
      {tip:'Sends the data wirelessly. Put Com A to blocks inside it; the same data goes to every controller named.'});
  def('comAto','antenna','cmd','Com A to %x',{x:N('')},function(){},
      {tip:'Goes inside Com A. Type a controller name, or drop in ask global A. Add several to send to several controllers.'});
  def('comAData','antenna','rep','Com A data',{},function(A,th){ return th&&th.dm&&th.dm.w?th.dm.d:''; });
  def('comAFrom','antenna','rep','Com A sent by',{},function(A,th){ return th&&th.dm&&th.dm.w?th.dm.from:''; });

  function cleanNm(v){ return (typeof v==='string')?v.replace(/[%|]/g,'').replace(/\s+/g,' ').trim().slice(0,30):''; }
  function parseParams(v){ var o=[]; if(typeof v==='string') v.split(',').forEach(function(p){ p=cleanNm(p); if(p&&o.indexOf(p)<0&&o.length<4) o.push(p); }); return o; }
  function defsOf(ctl){ var out=[]; if(!ctl) return out;
    ctl.S.scripts.forEach(function(sc){ var f=sc.blocks[0]; if(!f||f.t!=='defBlock') return; var nm=cleanNm(f.a.nm); if(!nm) return;
      if(out.some(function(d){ return d.name.toLowerCase()===nm.toLowerCase(); })) return;
      out.push({name:nm,k:f.a.k==='rep'?'rep':'cmd',params:parseParams(f.a.pp),sc:sc}); });
    return out; }
  function paramList(){ var o=[]; defsOf(ctxCtl||curCtl()).forEach(function(d){ d.params.forEach(function(p){ if(o.indexOf(p)<0) o.push(p); }); }); (ctxCtl||curCtl()).S.scripts.forEach(function(sc){ var f=sc.blocks[0]; if(f&&f.t==='defBlock'&&!cleanNm(f.a.nm)) parseParams(f.a.pp).forEach(function(p){ if(o.indexOf(p)<0) o.push(p); }); }); return o; }
  function findDef(ctl,name){ var n=cleanNm(name).toLowerCase(), l=defsOf(ctl); for(var i=0;i<l.length;i++) if(l[i].name.toLowerCase()===n) return l[i]; return null; }
  function cuInfo(key){ var l=RAW().cuList?RAW().cuList(ctxKey()):[]; for(var i=0;i<l.length;i++) if(l[i].key===key) return l[i]; return null; }
  async function callCustom(th,instKey,name,args){
    var host=th&&th.ctl?th.ctl:curCtl(), inst=ctlByKey(instKey);
    if(!inst){ logLine('['+host.name+'] custom component not found for "'+cleanNm(name)+'"'); return ''; }
    if(!inst.R.running){ logLine('['+host.name+'] '+inst.name+' is not running (no power or paused)'); return ''; }
    var df=findDef(inst,name); if(!df){ logLine('['+host.name+'] '+inst.name+' has no block "'+cleanNm(name)+'"'); return ''; }
    var depth=(th&&th.depth||0)+1; if(depth>MAXDEPTH){ logLine('['+host.name+'] block calls nested too deep ("'+df.name+'")'); return ''; }
    var a={}; df.params.forEach(function(p,j){ a[p]=(args&&args[j]!==undefined)?args[j]:''; });
    var t2={ctl:inst,dm:null,args:a,ret:'',returned:false,depth:depth,_c:false};
    Object.defineProperty(t2,'cancel',{get:function(){ return t2._c||!!(th&&th.cancel); },set:function(v){ t2._c=!!v; },enumerable:true});
    t2.root=t2; inst.R.threads.add(t2);
    try{ await runList(bodyOf(df.sc),t2); }
    catch(e){ if(e!==CANCEL) throw e; if(!t2.returned){ if(th&&th.cancel) throw CANCEL; } }
    finally{ inst.R.threads.delete(t2); }
    return t2.returned?t2.ret:''; }
  async function pre(v,th){
    if(!v||typeof v!=='object') return;
    await preArgs(v,th);
    if(v.t==='ccallr'){ var df=findDef(ctlByKey(v.a.i),v.a.n), n=df?df.params.length:0, args=[]; for(var j=1;j<=n;j++) args.push(ev(v.a['p'+j],th));
      v._val=await callCustom(th,v.a.i,v.a.n,args); } }
  async function preArgs(b,th){ if(!b||!b.a) return; for(var k in b.a){ var x=b.a[k]; if(x&&typeof x==='object') await pre(x,th); } }
  function dynCall(b){ var inst=ctlByKey(b.a.i), df=inst?findDef(inst,b.a.n):null, ps=df?df.params:[], t='%i : '+cleanNm(b.a.n);
    for(var j=0;j<ps.length;j++) t+=' '+ps[j]+' %p'+(j+1); return t; }
  var PSL={p1:N(''),p2:N(''),p3:N(''),p4:N('')};
  function callSlots(){ var o={i:{t:'cinst'},n:{t:'nm'}}; for(var k in PSL) o[k]=PSL[k]; return o; }
  def('defBlock','define','hat','define %k %nm ( %pp )',{k:OS([['cmd','command'],['rep','reporter']],'cmd'),nm:N('my block'),pp:N('')},null,{hk:'define',match:function(){ return false; }});
  def('report','define','cmd','report %v',{v:N('')},function(A,th){ var r=th.root||th; r.ret=A('v'); r.returned=true; throw CANCEL; });
  def('argVal','define','rep','input %v',{v:{t:'parm'}},function(A,th){ var a=th&&th.args, k=A('v'); return (a&&Object.prototype.hasOwnProperty.call(a,k))?a[k]:''; });
  def('ccall','cblk','cmd','',callSlots(),function(A,th,b){ var df=findDef(ctlByKey(b.a.i),b.a.n), n=df?df.params.length:0, args=[]; for(var j=1;j<=n;j++) args.push(A('p'+j));
      return callCustom(th,b.a.i,b.a.n,args); },{dyn:dynCall});
  def('ccallr','cblk','rep','',callSlots(),function(A,th,b){ return b._val===undefined?'':b._val; },{dyn:dynCall});

  function defOf(sl){
    if(sl.t==='n') return sl.def===undefined?'':String(sl.def);
    if(sl.t==='opt'||sl.t==='optv') return sl.def||sl.o[0][0];
    if(sl.t==='comp'){ var l=compOpts(sl.f); return l.length?String(l[0].id):''; }
    if(sl.t==='var') return ctxS().vars[0]||'';
    if(sl.t==='msg') return ctxS().msgs[0]||'';
    if(sl.t==='link') return '*';
    if(sl.t==='cinst'){ var cl=RAW().cuList?RAW().cuList(ctxKey()):[]; return cl.length?cl[0].key:''; }
    if(sl.t==='parm'){ var pl=paramList(); return pl.length?pl[0]:''; }
    return '';
  }
  function makeBlock(t,over){
    var sp=SP[t], b={t:t,a:{},_id:nextBid++};
    Object.keys(sp.s).forEach(function(k){ b.a[k]=defOf(sp.s[k]); });
    if(over) for(var x in over) b.a[x]=over[x];
    for(var i=1;i<=sp.m;i++) b['s'+i]=[];
    return b;
  }
  var cnt=0;
  function cleanBlock(r,depth){
    if(!r||typeof r!=='object'||depth>40||cnt>5000) return null; var sp=SP[r.t]; if(!sp) return null; cnt++;
    var o={t:r.t,a:{},_id:nextBid++};
    Object.keys(sp.s).forEach(function(k){ var sl=sp.s[k], v=r.a&&r.a[k];
      if(v&&typeof v==='object'){ var c=(sl.t==='n'||sl.t==='b'||sl.t==='cval'||sl.t==='ctl'||sl.t==='optv')?cleanBlock(v,depth+1):null;
        o.a[k]=(c&&(SP[c.t].k==='bool'||(SP[c.t].k==='rep'&&(sl.t==='n'||sl.t==='cval'||sl.t==='optv'||(sl.t==='ctl'&&c.t==='ctlRef')))))?c:defOf(sl); }
      else if(typeof v==='string'||typeof v==='number') o.a[k]=String(v).slice(0,400);
      else o.a[k]=defOf(sl); });
    for(var i=1;i<=sp.m;i++) o['s'+i]=cleanList(r['s'+i],depth+1);
    return o;
  }
  function noForever(l){ var o=[]; l.forEach(function(b){ if(b.t==='forever'){ o=o.concat(noForever(b.s1||[])); return; } for(var i=1;i<=2;i++) if(b['s'+i]) b['s'+i]=noForever(b['s'+i]); o.push(b); }); return o; }
  function hasForever(l){ return l.some(function(b){ if(b.t==='forever') return true; for(var i=1;i<=2;i++) if(b['s'+i]&&hasForever(b['s'+i])) return true; return false; }); }
  function cleanList(l,depth){ var out=[]; if(Array.isArray(l)) l.forEach(function(x){ var c=cleanBlock(x,depth); if(c) out.push(c); }); return out; }
  function cleanNames(l){ var o=[]; if(Array.isArray(l)) l.forEach(function(x){ x=String(x==null?'':x).trim().slice(0,24); if(x&&o.indexOf(x)<0&&o.length<200) o.push(x); }); return o; }
  function cleanS(x){ return JSON.parse(JSON.stringify(x,function(k,v){ return k[0]==='_'?undefined:v; })); }
  window._getFnData=function(){ var m=ctlByKey('main')||CTLS[0], out=cleanS(m.S); out.boxes={};
    CTLS.forEach(function(c){ if(c.key!=='main') out.boxes[fnSlot(c.key)]=cleanS(c.S); }); return out; };
  function loadS(d,ctl){
    var ns={vars:cleanNames(d&&d.vars).filter(function(x){ return x!==VIN; }),msgs:cleanNames(d&&d.msgs),scripts:[]}; ctl.S=ns; ctxCtl=ctl; cnt=0;
    try{ if(d&&Array.isArray(d.scripts)) d.scripts.slice(0,300).forEach(function(s){ var bl=cleanList(s&&s.blocks,0); if(bl.length&&bl[0].t==='whenPowerLoss') bl=noForever(bl);
        if(bl.length) ns.scripts.push({x:Math.max(0,Math.min(4000,+s.x||0)),y:Math.max(0,Math.min(3000,+s.y||0)),blocks:bl}); }); }
    finally{ ctxCtl=null; }
  }
  window._setFnData=function(d){
    reconcile();
    CTLS.forEach(function(c){ stopCtl(c); loadS(c.key==='main'?d:(d&&d.boxes&&d.boxes[fnSlot(c.key)]),c); });
    S=curCtl().S; renderAll(); setTimeout(function(){ CTLS.forEach(startCtl); },120);
  };

  function ev(v,th){ return (v&&typeof v==='object')?runRep(v,th):v; }
  function runRep(b,th){ var sp=SP[b.t]; if(!sp||!sp.run) return ''; var pe=E; E=thE(th);
    try{ return sp.run(function(k){ return ev(b.a[k],th); },th,b); } finally{ E=pe; } }
  async function runBlock(b,th){ var sp=SP[b.t]; if(!sp||!sp.run) return; await preArgs(b,th); var pe=E, p; E=thE(th);
    try{ p=sp.run(function(k){ return ev(b.a[k],th); },th,b); } finally{ E=pe; } await p; }
  var CYC=new Set();
  async function runList(list,th){ for(var i=0;i<list.length;i++){ if(th.cancel) throw CANCEL; await runBlock(list[i],th); if(CYC.size) CYC.forEach(function(e){ e.check(th); }); } }
  function startThread(ctl,sc,blocks,dm){
    if(sc._th) sc._th.cancel=true;
    var th={cancel:false,ctl:ctl,dm:dm||null,noLoop:!!(sc.blocks[0]&&sc.blocks[0].t==='whenPowerLoss')}; sc._th=th; ctl.R.threads.add(th);
    return (async function(){ try{ await runList(blocks,th); }catch(e){ if(e!==CANCEL) logLine('['+ctl.name+'] error: '+(e&&e.message)); }
      finally{ ctl.R.threads.delete(th); if(sc._th===th) sc._th=null; } })();
  }
  function bodyOf(sc){ var f=sc.blocks[0]; return (f&&SP[f.t].k==='hat')?sc.blocks.slice(1):sc.blocks.slice(); }
  function fireHats(kind,info,ctl,dm){
    ctl=ctl||(E&&E.ctl); var ps=[]; if(!ctl||!ctl.R.running||window._simPaused) return ps;
    if(ctl.R.dying&&kind!=='plost') return ps;
    if((kind==='msg'||kind==='dmsg')&&info&&info.m!==undefined){ (ctl.R.rcv=ctl.R.rcv||{})[str(info.m)]=true; }
    ctl.S.scripts.forEach(function(sc){ var f=sc.blocks[0]; if(!f) return; var sp=SP[f.t];
      if(sp.k==='hat'&&sp.hk===kind&&sp.match(f.a,info)) ps.push(startThread(ctl,sc,bodyOf(sc),dm)); });
    return ps;
  }
  function stopCtl(ctl){ var R=ctl.R; R.rcv={}; try{ RAW().silence&&RAW().silence(ctl.key); }catch(_){} R.running=false; R.dying=false; R.threads.forEach(function(t){ t.cancel=true; }); R.threads.clear(); R.timers.forEach(clearInterval); R.timers=[]; }
  function syncTimers(ctl){
    var R=ctl.R; R.timers.forEach(clearInterval); R.timers=[]; if(!R.running) return;
    ctl.S.scripts.forEach(function(sc){ var f=sc.blocks[0]; if(f&&f.t==='every')
      R.timers.push(setInterval(function(){ if(R.running&&!window._simPaused) startThread(ctl,sc,bodyOf(sc)); },Math.max(50,num(f.a.n)*1000))); });
  }
  function startCtl(ctl){
    stopCtl(ctl); ctl.paused=false; var R=ctl.R; R.running=true; R.antA=true; R.vars={}; R.vout=0; R.pinOut={}; R.vl=vinOf(ctl); R.pw=ratedOk(ctl,R.vl); R.oor=(R.vl>0&&!R.pw); if(!R.pw){ R.running=false; syncPause(); fillCtlSel(); wiresRefresh(); return; } ctl.S.vars.forEach(function(v){ R.vars[v]=0; });
    R.timerStart=performance.now(); R.keyLast={}; R.keyHeld={};
    R.pm=(typeof windDirection!=='undefined')?windDirection:null; R.pr=(typeof currentRPM!=='undefined')?currentRPM:0;
    fireHats('start',{},ctl); syncTimers(ctl); syncPause(); fillCtlSel(); wiresRefresh();
  }
  function syncPause(){ var p=document.getElementById('fePause'), c=curCtl(); if(!p) return;
    p.innerHTML=c.paused?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg> RESUME':'<svg class="si" aria-hidden="true"><use href="#si-pause"/></svg> PAUSE'; p.className='vbtn '+(c.paused?'btn-accent':'btn-gray'); }
  function setPaused(ctl,v){
    if(v===ctl.paused) return; ctl.paused=v;
    if(v){ stopCtl(ctl); logLine('['+ctl.name+'] paused'); }
    else if(!ctl.R.pw) logLine('['+ctl.name+'] has no power');
    else { ctl.R.running=true; syncTimers(ctl); logLine('['+ctl.name+'] running'); }
    syncPause(); fillCtlSel();
  }
  var syncT=null; function changed(){ if(window._ceHistSoon) window._ceHistSoon(); clearTimeout(syncT); syncT=setTimeout(function(){ syncTimers(curCtl()); },300); }
  window._feEvent=function(kind,id,info){
    var ctl=ctlByKey(RAW().owner(id)); if(!ctl) return; var R=ctl.R;
    if(kind==='key'){ R.keyLast[id]=String(info); R.keyHeld[id]=String(info); fireHats('key',{id:id,key:String(info)},ctl); }
    else if(kind==='keyup') R.keyHeld[id]='';
    else if(kind==='sel') fireHats('sel',{id:id,pos:+info},ctl);
    else if(kind==='pot') fireHats('pot',{id:id,val:+info},ctl);
    else fireHats('comp',{id:id,ev:kind},ctl);
  };
  setInterval(function(){
    if(typeof windDirection==='undefined'||window._simPaused) return;
    CTLS.forEach(function(ctl){ var R=ctl.R; if(!R.running) return;
      if(windDirection!==R.pm){ R.pm=windDirection; fireHats('motor',{m:windDirection},ctl); }
      if(currentRPM!==R.pr){ var p=R.pr; R.pr=currentRPM; fireHats('rpm',{prev:p,now:currentRPM},ctl); } });
  },50);

  setInterval(function(){ if(!window._simPaused) checkVin(); },50);
  window._ctlStopAll=function(){ CTLS.forEach(function(c){ stopCtl(c); c.paused=true; c.R.vout=0; c.R.pinOut={}; }); syncPause(); fillCtlSel(); wiresRefresh(); logLine('all controllers stopped'); };
  window._ctlRearm=function(){ CTLS.forEach(function(c){ c.paused=false; startCtl(c); }); syncPause(); fillCtlSel(); wiresRefresh(); };
  window._ctlFireStart=function(){ CTLS.forEach(function(c){ if(c.R.running) fireHats('start',{},c); }); logLine('all controllers started'); };

  function fillCtlSel(){ var sel=document.getElementById('feCtlSel'); if(!sel) return; var h='';
    CTLS.forEach(function(c){ h+='<option value="'+c.key+'"'+(c.key===curKey?' selected':'')+'>'+escH(c.name)+' ('+idLabel(c)+')'+(c.paused?' - paused':'')+(c.tpl?' - template':(c.R.pw?'':(c.R.oor?' - OUT OF RATED RANGE':' - NO POWER')))+'</option>'; });
    sel.innerHTML=h; }
  function selectCtl(key){ var c=ctlByKey(key); if(!c) return; curKey=key; S=c.S; selBid=null; fillCtlSel(); syncPause(); if(pal) renderAll(); }
  function reconcile(){
    var bx=RAW().boxes(), sig=bx.map(function(b){ return b.key+':'+b.name+':'+(b.ant?1:0)+':'+b.vmin+'-'+b.vmax+':'+(b.sp?1:0)+(b.tpl?1:0)+(b.cu?1:0)+':'+(b.own||''); }).join('|');
    if(sig===lastSig) return; lastSig=sig;
    var want=[{key:'main',name:'Main'}].concat(bx.map(function(b){ return {key:b.key,name:b.name||('Controller C'+b.id),ant:!!b.ant,vmin:b.vmin,vmax:b.vmax,sp:!!b.sp,tpl:!!b.tpl,cu:!!b.cu}; }));
    CTLS=CTLS.filter(function(c){ var keep=want.some(function(w){ return w.key===c.key; }); if(!keep) stopCtl(c); return keep; });
    var out=[]; want.forEach(function(w){ var c=ctlByKey(w.key); if(c){ c.name=w.name; c.ant=w.ant; c.vmin=w.vmin; c.vmax=w.vmax; c.sp=w.sp; c.tpl=w.tpl; c.cu=w.cu; } else{ c=mkCtl(w.key,w.name); c.ant=w.ant; c.vmin=w.vmin; c.vmax=w.vmax; c.sp=w.sp; c.tpl=w.tpl; c.cu=w.cu; CTLS.push(c); startCtl(c); } out.push(c); });
    CTLS=out; if(!ctlByKey(curKey)) curKey='main'; S=curCtl().S; checkVin(); fillCtlSel(); syncPause();
    if(pal&&panel.style.display!=='none') renderAll();
  }
  window._feCtlChanged=function(){ reconcile(); };
  function remapComps(d,mp){
    function blk(b){ var sp=b&&SP[b.t]; if(!sp) return;
      Object.keys(sp.s).forEach(function(k){ var sl=sp.s[k], v=b.a&&b.a[k]; if(v&&typeof v==='object') blk(v); else if(sl.t==='comp'&&typeof v==='string'&&v!=='') b.a[k]=String(mp(v)); });
      for(var i=1;i<=2;i++) if(Array.isArray(b['s'+i])) b['s'+i].forEach(blk); }
    (d.scripts||[]).forEach(function(sc){ (sc.blocks||[]).forEach(blk); }); }
  window._feCopyCtl=function(from,to){ reconcile(); var a=ctlByKey(from), b=ctlByKey(to); if(!a||!b||a===b) return false;
    var d=cleanS(a.S); try{ var mp=RAW().mapIds?RAW().mapIds(from,to):null; if(mp) remapComps(d,mp); }catch(_){} stopCtl(b); loadS(d,b); if(b===curCtl()) S=b.S; startCtl(b); if(pal&&panel.style.display!=='none') renderAll(); return true; };
  window._feSelect=function(key){ reconcile(); if(!ctlByKey(key)) return false; selectCtl(key); return true; };
  window._feCurKey=function(){ return curKey; };
  window._feOpenCtl=function(key){ reconcile(); if(!ctlByKey(key)) return false; if(window._setControllerEditorMode) window._setControllerEditorMode('functional'); selectCtl(key); return true; };
  window._feCtlInfo=function(key){ var c=ctlByKey(key); return c?{name:c.name,scripts:c.S.scripts.length}:null; };

  var pal=document.getElementById('fePalette'), work=document.getElementById('feWork'), inner=document.getElementById('feWorkInner'), catsEl=document.getElementById('feCats');
  function compOpts(f){
    return RAW().list(ctxKey()).filter(function(c){ if(c.kind==='box'||c.kind==='custom'||c.kind==='midi') return false; return f==='any'||(f==='state'?(c.kind==='latch'||c.kind==='button'||c.kind==='light'||c.kind==='selector'):f==='lcd'?c.type==='lcd':f==='keypad'?c.type==='keypad':f==='selector'?c.type==='selector':f==='pot'?c.type==='pot':f==='buzzer'?c.type==='buzzer':f==='text'?c.type==='text':true); });
  }
  function slotEl(b,k){
    var sl=SP[b.t].s[k], v=b.a[k], span=document.createElement('span');
    if(b.t==='varGet'&&v===VIN){ span.className='fs-slot'; span.dataset.bid=b._id; span.dataset.slot=k; span.dataset.st='x'; span.title='Always the voltage arriving on this controller\u2019s Input dot. Read-only. Without power (above 0) the controller cannot run.'; span.textContent=VIN; return span; }
    span.className='fs-slot'; span.dataset.bid=b._id; span.dataset.slot=k; span.dataset.st=sl.t==='b'?'b':(sl.t==='n'||sl.t==='cval'||sl.t==='optv')?'n':sl.t==='ctl'?'ctl':'x';
    var ci=null; if(sl.t==='cval'){ ci=ctlInfo(b.a.c); if(ci&&(ci.kind==='number'||ci.kind==='text')) span.dataset.st='n'; }
    if(v&&typeof v==='object'){ span.className+=' fs-has'; span.appendChild(blockEl(v)); return span; }
    if(sl.t==='ctl'){ var chip=document.createElement('span'), cinf=ctlInfo(v);
      chip.className='fe-ctl'+(cinf?'':' fe-ctl-none'); chip.dataset.bid=b._id;
      chip.textContent=cinf?cinf.label:(v?'(missing: '+v+')':''); if(!cinf) chip.style.cssText+='display:inline-block;min-width:28px;min-height:1em';
      chip.title=cinf?('#'+v+' \u2014 click to pick a different control'):'Click to choose a control in the Editor tab';
      span.appendChild(chip); return span; }
    if(sl.t==='cval'&&(!ci||ci.kind==='press')){ var ph=document.createElement('span'); ph.className='fe-cval-none'; ph.textContent=ci?'(press)':''; if(!ci) ph.style.cssText+='display:inline-block;min-width:28px;min-height:1em'; span.appendChild(ph); return span; }
    if(sl.t==='n'||(ci&&(ci.kind==='number'||ci.kind==='text'))){ var i=document.createElement('input'); i.type='text'; i.value=v; i.size=Math.max(2,Math.min(b.t==='comment'?60:14,String(v).length+1));
      i.addEventListener('input',function(){ b.a[k]=i.value; i.size=Math.max(2,Math.min(b.t==='comment'?60:14,i.value.length+1)); changed(); }); span.appendChild(i); }
    else if(sl.t==='b'){ span.className+=' fs-bslot'; }
    else {
      var opts, sel=document.createElement('select');
      if(sl.t==='opt'||sl.t==='optv'){ opts=sl.o; if(b.t==='whenComp'&&!compOpts('state').length){ var se=document.createElement('select'); se.appendChild(document.createElement('option')); se.style.minWidth='28px'; span.appendChild(se); return span; } }
      else if(sl.t==='comp'){ opts=compOpts(sl.f).map(function(c){ return [String(c.id),c.label+' #'+c.id,c.tname||c.type||'Other']; }); opts.sort(function(a,b){ return a[2]<b[2]?-1:a[2]>b[2]?1:0; }); if(!opts.length) opts=[['','']]; if((v===''||v==null)&&opts[0][0]!==''){ v=b.a[k]=opts[0][0]; } }
      else if(sl.t==='cval'){ opts=ci.opts; if(!opts.some(function(o){ return o[0]===v; })) v=b.a[k]=ci.def; }
      else if(sl.t==='var'){ opts=S.vars.map(function(x){ return [x,x]; }); dataLinked(ctxKey()).forEach(function(k2){ var c2=ctlByKey(k2); if(c2) c2.S.vars.forEach(function(n2){ opts.push([k2+VSEP+n2,c2.name+' '+VSEP+' '+n2]); }); }); if(!opts.length) opts=[['','(new variable)']]; if(!v&&S.vars.length) v=b.a[k]=S.vars[0]; }
      else if(sl.t==='cinst'){ opts=(RAW().cuList?RAW().cuList(ctxKey()):[]).map(function(c){ return [c.key,c.name]; }); if(!opts.length) opts=[['','(none)']]; if(!v&&opts[0][0]) v=b.a[k]=opts[0][0]; }
      else if(sl.t==='parm'){ opts=paramList().map(function(x){ return [x,x]; }); if(!opts.length) opts=[['','(no inputs)']]; if(!v&&opts[0][0]) v=b.a[k]=opts[0][0]; }
      else if(sl.t==='link'){ opts=[['*','all linked controllers']]; dataLinked(ctxKey()).forEach(function(k2){ var c2=ctlByKey(k2), mn=''; if(!c2){ try{ mn=RAW().midiName?RAW().midiName(k2):''; }catch(_){} } opts.push([k2,c2?c2.name:(mn||k2)]); }); if(!v) v=b.a[k]='*'; }
      else { opts=S.msgs.map(function(x){ return [x,x]; }); dataLinked(ctxKey()).forEach(function(k2){ var c2=ctlByKey(k2); if(c2) c2.S.msgs.forEach(function(n2){ if(!opts.some(function(o){ return o[0]===n2; })) opts.push([n2,n2+'  ('+c2.name+')']); }); }); opts.push(['__new','New message…']); if(!v&&S.msgs.length) v=b.a[k]=S.msgs[0]; }
      if(!opts.some(function(o){ return o[0]===v; })) opts=opts.concat([[v,v?(sl.t==='comp'?('#'+v+' (not in this controller)'):sl.t==='cinst'?(v+' (missing)'):v):'(none)']]);
      var _grp={}; opts.forEach(function(o){ var op=document.createElement('option'); op.value=o[0]; op.textContent=o[1]; if(o[0]===v) op.selected=true;
        if(o[2]){ var g=_grp[o[2]]; if(!g){ g=_grp[o[2]]=document.createElement('optgroup'); g.label=o[2]; sel.appendChild(g); } g.appendChild(op); } else sel.appendChild(op); });
      sel.addEventListener('change',function(){
        if(sl.t==='msg'&&sel.value==='__new'){ askName('NEW MESSAGE','Message name').then(function(nm){
          nm=(nm||'').trim().slice(0,24); if(nm){ if(S.msgs.indexOf(nm)<0) S.msgs.push(nm); b.a[k]=nm; } renderAll(); }); return; }
        b.a[k]=sel.value; if(sl.t==='cinst'){ renderWork(); } changed(); });
      span.appendChild(sel);
    }
    return span;
  }
  function blockEl(b,inPal){
    var sp=SP[b.t], d=document.createElement('div');
    d.className='fb fb-'+sp.k+(sp.id==='comment'?' fb-comment':''); d.style.setProperty('--bc',CAT[sp.cat].color); d.dataset.bid=b._id; d.dataset.kind=sp.k;
    if(inPal){ d.dataset.pal=b.t; if(b.t==='varGet'&&b.a.v!==undefined) d.dataset.palv=b.a.v; if(b._px) d.dataset.palx=JSON.stringify(b._px); if(sp.tip) d.title=sp.tip; }
    function fill(r,txt){ txt.split(/(%\w+)/).forEach(function(p){ if(!p) return;
      if(p[0]==='%'&&sp.s[p.slice(1)]) r.appendChild(slotEl(b,p.slice(1)));
      else { var t=document.createElement('span'); t.textContent=p; r.appendChild(t); } }); }
    if(sp.k==='c'){
      sp.txt.split('|').forEach(function(pt,i){
        var r=document.createElement('div'); r.className='fb-row'; fill(r,pt); d.appendChild(r);
        var m=document.createElement('div'); m.className='fb-mouth'; m.dataset.slot='s'+(i+1);
        (b['s'+(i+1)]||[]).forEach(function(ch){ m.appendChild(blockEl(ch)); }); d.appendChild(m); });
      var f=document.createElement('div'); f.className='fb-foot'; d.appendChild(f);
    } else fill(d,sp.dyn?sp.dyn(b):sp.txt);
    return d;
  }
  function renderWork(){
    inner.innerHTML='';
    S.scripts.forEach(function(sc){
      var w=document.createElement('div'); w.className='fs-script'; w.style.left=sc.x+'px'; w.style.top=sc.y+'px';
      var l=document.createElement('div'); l.className='fs-list'; sc.blocks.forEach(function(b){ l.appendChild(blockEl(b)); });
      w.appendChild(l); inner.appendChild(w); });
    markSel();
  }
  function renderPal(){
    pal.innerHTML=''; if(catHidden(curCat)) curCat='manip';
    var h=document.createElement('div'); h.className='fe-pal-h'; h.style.color=CAT[curCat].color; h.textContent=CAT[curCat].name; pal.appendChild(h);
    function chips(list,label,onAdd,onDel){
      var bt=document.createElement('button'); bt.type='button'; bt.className='vbtn btn-gray'; bt.style.cssText='font-size:10px;letter-spacing:1px;padding:3px 8px'; bt.textContent=label; bt.addEventListener('click',onAdd); pal.appendChild(bt);
      var w=document.createElement('div'); w.className='fe-chips';
      list.forEach(function(n){ var c=document.createElement('span'); c.className='fe-chip'; c.textContent=n+' '; var x=document.createElement('b'); x.innerHTML='<svg class="si" aria-hidden="true"><use href="#si-x"/></svg>'; x.title='Delete'; x.addEventListener('click',function(){ onDel(n); }); c.appendChild(x); w.appendChild(c); });
      pal.appendChild(w); }
    if(curCat==='vars') chips(S.vars,'NEW VARIABLE',function(){ askName('NEW VARIABLE','Variable name').then(function(n){ n=(n||'').trim().slice(0,24); if(n===VIN){ _dsDialog({title:'Built-in variable',msg:'"'+VIN+'" is a built-in variable.',ok:'OK'}); } else if(n&&S.vars.indexOf(n)<0){ S.vars.push(n); curCtl().R.vars[n]=0; renderAll(); } }); },
      function(n){ S.vars=S.vars.filter(function(x){return x!==n;}); renderAll(); });
    if(curCat==='bcast') chips(S.msgs,'NEW MESSAGE',function(){ askName('NEW MESSAGE','Message name').then(function(n){ n=(n||'').trim().slice(0,24); if(n&&S.msgs.indexOf(n)<0){ S.msgs.push(n); renderAll(); } }); },
      function(n){ S.msgs=S.msgs.filter(function(x){return x!==n;}); renderAll(); });
    if(curCat==='cblk'){
      var cl=RAW().cuList?RAW().cuList(ctxKey()):[], any=false;
      cl.forEach(function(ci){ defsOf(ctlByKey(ci.key)).forEach(function(df){ any=true; var t=df.k==='rep'?'ccallr':'ccall'; var nb=makeBlock(t,{i:ci.key,n:df.name}); nb._px={i:ci.key,n:df.name}; pal.appendChild(blockEl(nb,true)); }); });
      
      return; }
    ORDER.forEach(function(id){ var sp=SP[id]; if(sp.cat!==curCat) return;
      if(id==='overrideDamperGroupOut'){ var dOk=false; try{ dOk=(window._damperMode?window._damperMode():'simple')!=='controller'&&RAW().links().some(function(l){ return l.t==='k'&&l.f===curKey&&l.to==='damper'; }); }catch(_){} if(!dOk) return; }
      if((id==='setVout'||id==='changeVout'||id==='vout')&&!(RAW().outDot&&RAW().outDot(curKey))) return;
      if(id==='varGet'){ pal.appendChild(blockEl(makeBlock('varGet',{v:VIN}),true)); S.vars.forEach(function(v){ pal.appendChild(blockEl(makeBlock('varGet',{v:v}),true)); }); dataLinked(curKey).forEach(function(k2){ var c2=ctlByKey(k2); if(c2) c2.S.vars.forEach(function(n2){ pal.appendChild(blockEl(makeBlock('varGet',{v:k2+VSEP+n2}),true)); }); }); return; }
      pal.appendChild(blockEl(makeBlock(id),true)); });
  }
  function catHidden(k){ var cu=!!curCtl().cu; return (k==='define'&&!cu)||(k==='cblk'&&cu); }
  function renderCats(){
    catsEl.innerHTML=''; var cu=!!curCtl().cu; if(catHidden(curCat)) curCat='manip';
    CATS.forEach(function(c){ if(catHidden(c[0])) return; var b=document.createElement('button'); b.type='button'; b.className='fe-cat'+(c[0]===curCat?' on':''); b.style.setProperty('--bc',c[2]); b.textContent=c[1];
      b.addEventListener('click',function(){ curCat=c[0]; renderCats(); renderPal(); }); catsEl.appendChild(b); });
  }
  function renderAll(){ if(!pal) return; renderCats(); renderPal(); renderWork(); changed(); }
  window._feShow=function(){ reconcile(); fillCtlSel(); renderAll(); try{ feRestoreView(); }catch(_){} };
  reconcile(); fillCtlSel();
  setTimeout(function(){ CTLS.forEach(function(c){ if(!c.R.running&&!c.paused) startCtl(c); }); },0);

  function find(id){
    var res=null;
    function inBlock(b,sc){
      for(var k in b.a){ var v=b.a[k]; if(v&&typeof v==='object'){ if(v._id===id){ res={b:v,parent:b,slot:k,script:sc}; return true; } if(inBlock(v,sc)) return true; } }
      for(var i=1;i<=2;i++) if(b['s'+i]&&inList(b['s'+i],sc)) return true;
      return false; }
    function inList(l,sc){ for(var i=0;i<l.length;i++){ if(l[i]._id===id){ res={b:l[i],list:l,idx:i,script:sc}; return true; } if(inBlock(l[i],sc)) return true; } return false; }
    for(var i=0;i<S.scripts.length;i++) if(inList(S.scripts[i].blocks,S.scripts[i])) break;
    return res;
  }
  function detach(id){
    var r=find(id); if(!r) return null;
    if(r.list){ var out=r.list.splice(r.idx); if(r.list===r.script.blocks&&!r.list.length) S.scripts.splice(S.scripts.indexOf(r.script),1); return out; }
    r.parent.a[r.slot]=defOf(SP[r.parent.t].s[r.slot]); return [r.b];
  }

  var fz=1, fbox=null, fpan=null, lastMouse=null, hov=null, clip=[], lastPaste=null, selBid=null, fBelow=false;
  if(work&&inner){
    fbox=document.createElement('div'); fbox.style.cssText='position:relative;width:2600px;height:1800px';
    inner.parentNode.insertBefore(fbox,inner); fbox.appendChild(inner);
    inner.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0';
  }
  var FE_VKEY='sirenosc_fe_view', feRestored=false, feSaveT=0;
  function feSaveView(){ if(!work||!feRestored) return; clearTimeout(feSaveT); feSaveT=setTimeout(function(){ try{ localStorage.setItem(FE_VKEY,JSON.stringify({fz:fz,l:Math.round(work.scrollLeft),t:Math.round(work.scrollTop)})); }catch(_){} },300); }
  function feRestoreView(){
    if(feRestored||!work||!fbox) return;
    if(!work.offsetParent&&work.clientWidth===0) return;
    var o=null; try{ o=JSON.parse(localStorage.getItem(FE_VKEY)||'null'); }catch(_){}
    feRestored=true;
    if(o&&isFinite(o.fz)){ setFZ(+o.fz,work.getBoundingClientRect().left,work.getBoundingClientRect().top); work.scrollLeft=+o.l||0; work.scrollTop=+o.t||0; fzBg(); }
  }
  if(work){ work.addEventListener('scroll',feSaveView); }
  window.addEventListener('pagehide',function(){ if(work&&feRestored){ try{ localStorage.setItem(FE_VKEY,JSON.stringify({fz:fz,l:Math.round(work.scrollLeft),t:Math.round(work.scrollTop)})); }catch(_){} } });
  function fzBg(){ if(!work) return; work.style.backgroundSize=(20*fz)+'px '+(20*fz)+'px'; work.style.backgroundPosition=(-work.scrollLeft)+'px '+(-work.scrollTop)+'px'; }
  function setFZ(z,cx,cy){
    if(!work||!fbox) return;
    z=Math.max(0.3,Math.min(2.5,Math.round(z*100)/100));
    var wr=work.getBoundingClientRect(); if(cx==null){ cx=wr.left+wr.width/2; cy=wr.top+wr.height/2; }
    var ix=(cx-wr.left+work.scrollLeft)/fz, iy=(cy-wr.top+work.scrollTop)/fz;
    fz=z; inner.style.transform='scale('+z+')'; fbox.style.width=(2600*z)+'px'; fbox.style.height=(1800*z)+'px';
    work.scrollLeft=ix*z-(cx-wr.left); work.scrollTop=iy*z-(cy-wr.top); fzBg();
    Array.prototype.forEach.call(document.querySelectorAll('[data-fe-zoom-label]'),function(el){ el.textContent=Math.round(z*100)+'%'; });
    feSaveView();
  }
  if(work){
    work.addEventListener('scroll',fzBg);
    work.addEventListener('wheel',function(e){ if(!e.ctrlKey&&!e.metaKey) return; e.preventDefault();
      var d=Math.max(-30,Math.min(30,e.deltaY)); setFZ(fz*Math.exp(-d*0.01),e.clientX,e.clientY); },{passive:false});
    work.addEventListener('pointerdown',function(e){ if(e.target===work||e.target===fbox){ setSel(null); startFPan(e); } });
    var pinch=null;
    function td(t){ var a=t[0], b=t[1]; return {d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2}; }
    work.addEventListener('touchstart',function(e){ if(e.touches.length===2){ var p=td(e.touches); pinch={d:p.d,z:fz}; } else pinch=null; },{passive:true});
    work.addEventListener('touchmove',function(e){ if(pinch&&e.touches.length===2){ e.preventDefault(); var p=td(e.touches); if(pinch.d>0) setFZ(pinch.z*p.d/pinch.d,p.x,p.y); } },{passive:false});
    work.addEventListener('touchend',function(e){ if(e.touches.length<2) pinch=null; });
    work.addEventListener('pointermove',function(e){ lastMouse={x:e.clientX,y:e.clientY}; });
    work.addEventListener('mouseover',function(e){ var b=e.target.closest&&e.target.closest('.fb'); hov=b?+b.dataset.bid:null; });
    work.addEventListener('mouseleave',function(){ hov=null; });
  }
  panel.addEventListener('click',function(e){
    var ab=e.target.closest&&e.target.closest('[data-fe-act]');
    if(ab){ var q=ab.getAttribute('data-fe-act');
      if(q==='below'){ fBelow=!fBelow; syncActs(); return; }
      if(q==='paste'){ pasteAt(null,null); syncActs(); return; }
      if(selBid==null) return;
      if(q==='copy') copyBlock(selBid,fBelow);
      else if(q==='dup') dupBlock(selBid,fBelow);
      else if(q==='del'){ var did=selBid; selBid=null; delBlock(did,fBelow); }
      syncActs(); return; }
    var b=e.target.closest&&e.target.closest('[data-fe-zoom]'); if(!b) return;
    var a=b.getAttribute('data-fe-zoom'); setFZ(a==='in'?fz+0.1:a==='out'?fz-0.1:1); });
  function startFPan(e,force){ if((e.pointerType==='touch'&&!force)||(e.button!==0&&e.button!==1)) return;
    fpan={x:e.clientX,y:e.clientY,l:work.scrollLeft,t:work.scrollTop}; work.classList.add('fe-panning'); if(e.button===1) e.preventDefault(); }
  function markSel(){ if(!inner) return;
    Array.prototype.forEach.call(inner.querySelectorAll('.fb.fe-sel'),function(x){ x.classList.remove('fe-sel'); });
    if(selBid!=null){ if(find(selBid)){ var el=inner.querySelector('.fb[data-bid="'+selBid+'"]'); if(el) el.classList.add('fe-sel'); } else selBid=null; }
    syncActs(); }
  function setSel(b){ selBid=(b==null?null:b); markSel(); }
  function syncActs(){
    Array.prototype.forEach.call(panel.querySelectorAll('[data-fe-act]'),function(b){ var a=b.getAttribute('data-fe-act');
      if(a==='below'){ b.textContent='+ BELOW: '+(fBelow?'ON':'OFF'); b.className='vbtn '+(fBelow?'btn-accent':'btn-gray'); }
      else if(a==='paste') b.disabled=!clip.length;
      else b.disabled=(selBid==null); }); }
  function toInner(cx,cy){ var ir=inner.getBoundingClientRect(), k=fz*(window._uiZoom||1); return {x:Math.max(0,(cx-ir.left)/k),y:Math.max(0,(cy-ir.top)/k)}; }

  function cloneB(b){
    var sp=SP[b.t], o={t:b.t,a:{},_id:nextBid++};
    Object.keys(b.a).forEach(function(k){ var v=b.a[k]; o.a[k]=(v&&typeof v==='object')?cloneB(v):v; });
    for(var i=1;i<=sp.m;i++) o['s'+i]=(b['s'+i]||[]).map(cloneB);
    return o;
  }
  function blocksFor(bid,withBelow){ var r=find(bid); if(!r) return null; return (r.list&&withBelow)?r.list.slice(r.idx):[r.b]; }
  function belowCount(bid){ var r=find(bid); return (r&&r.list)?r.list.length-r.idx-1:0; }
  function dupBlock(bid,withBelow){
    var src=blocksFor(bid,withBelow); if(!src) return;
    var el=inner.querySelector('.fb[data-bid="'+bid+'"]'), rc=el?el.getBoundingClientRect():null, pos=rc?toInner(rc.left,rc.top):{x:40,y:40};
    S.scripts.push({x:pos.x+26,y:pos.y+26,blocks:src.map(cloneB)}); renderWork(); changed();
  }
  function copyBlock(bid,withBelow){ var src=blocksFor(bid,withBelow); if(src){ clip=src.map(cloneB); syncActs(); logLine('copied '+clip.length+' block'+(clip.length>1?'s':'')); } }
  function pasteAt(cx,cy){
    if(!clip.length) return;
    var wr=work.getBoundingClientRect(), inside=cx!=null&&cx>=wr.left&&cx<=wr.right&&cy>=wr.top&&cy<=wr.bottom;
    if(!inside){ cx=wr.left+40; cy=wr.top+40; }
    if(lastPaste&&lastPaste.x===cx&&lastPaste.y===cy){ cx+=22; cy+=22; lastPaste={x:cx,y:cy}; } else lastPaste={x:cx,y:cy};
    var pos=toInner(cx,cy); S.scripts.push({x:pos.x,y:pos.y,blocks:clip.map(cloneB)}); renderWork(); changed();
  }
  function delBlock(bid,withBelow){
    var r=find(bid); if(!r) return;
    if(r.list){ r.list.splice(r.idx,withBelow?r.list.length-r.idx:1);
      if(r.list===r.script.blocks&&!r.list.length){ if(r.script._th) r.script._th.cancel=true; S.scripts.splice(S.scripts.indexOf(r.script),1); } }
    else r.parent.a[r.slot]=defOf(SP[r.parent.t].s[r.slot]);
    renderWork(); changed();
  }
  var menu=null;
  function closeMenu(){ if(menu){ menu.remove(); menu=null; } }
  function showMenu(x,y,items){
    closeMenu(); menu=document.createElement('div'); menu.id='feMenu'; menu.className='sx-ctx'; menu.setAttribute('role','menu');
    items.forEach(function(it){ if(!it){ var sp=document.createElement('div'); sp.className='sx-ctx-sep'; menu.appendChild(sp); return; }
      var d=document.createElement('div'); d.textContent=it[0]; d.className='sx-ctx-item'+(it[2]?' '+it[2]:''); d.setAttribute('role','menuitem');
      d.addEventListener('click',function(){ closeMenu(); it[1](); }); menu.appendChild(d); });
    document.body.appendChild(menu);
    var z=parseFloat(document.body.style.zoom)||1, w=menu.offsetWidth*z, hh=menu.offsetHeight*z;
    menu.style.left=(Math.max(4,Math.min(x,innerWidth-w-4))/z)+'px'; menu.style.top=(Math.max(4,Math.min(y,innerHeight-hh-4))/z)+'px';
  }
  document.addEventListener('pointerdown',function(e){ if(menu&&!e.target.closest('#feMenu')) closeMenu(); },true);
  window.addEventListener('blur',closeMenu); window.addEventListener('resize',closeMenu);
  if(work) work.addEventListener('contextmenu',function(e){
    if(e.target.closest('input,select,textarea')) return;
    e.preventDefault(); var be=e.target.closest('.fb'), x=e.clientX, y=e.clientY, items=[];
    if(be){ var bid=+be.dataset.bid, n=belowCount(bid); if(!find(bid)) return;
      items.push(['Duplicate'+(n?' (with '+n+' below)':''),function(){ dupBlock(bid,true); }]);
      if(n) items.push(['Duplicate this block only',function(){ dupBlock(bid,false); }]);
      items.push(null);
      items.push(['Copy',function(){ copyBlock(bid,false); }]);
      if(n) items.push(['Copy with blocks below',function(){ copyBlock(bid,true); }]);
    }
    if(clip.length) items.push(['Paste',function(){ pasteAt(x,y); }]);
    if(be){ items.push(null); items.push(['Delete',function(){ delBlock(bid,false); },'fe-m-del']);
      if(belowCount(bid)) items.push(['Delete with blocks below',function(){ delBlock(bid,true); },'fe-m-del']); }
    if(items.length) showMenu(x,y,items);
  });
  document.addEventListener('keydown',function(e){
    if(pickBid!==null||panel.style.display==='none') return;
    if(!((window._ceIsOpen&&window._ceIsOpen())||window._ccOpen)) return;
    var t=e.target; if(t&&t.closest&&t.closest('input,select,textarea,[contenteditable]')) return;
    var k=String(e.key).toLowerCase(), mod=e.ctrlKey||e.metaKey;
    if(e.key==='Escape'&&menu){ closeMenu(); return; }
    var tg=(hov!=null?hov:selBid);
    if((e.key==='Delete'||e.key==='Backspace')&&tg!=null){ e.preventDefault(); delBlock(tg,false); hov=null; }
    else if(mod&&k==='c'&&tg!=null){ e.preventDefault(); copyBlock(tg,false); }
    else if(mod&&k==='d'&&tg!=null){ e.preventDefault(); dupBlock(tg,true); }
    else if(mod&&k==='v'&&clip.length){ e.preventDefault(); pasteAt(lastMouse?lastMouse.x:null,lastMouse?lastMouse.y:null); }
  });

  var pickBid=null, pickHot=null, pickBar=null, pickMsgT=null, PICK_EVTS=['click','mousedown','mouseup','pointerdown','pointerup'];
  function needsPick(b){ var s=SP[b.t].s.c; return !!(s&&s.t==='ctl'&&!b.a.c); }
  function goEditor(){ var D=window._docTabs; if(D&&D.activateEditor) return D.activateEditor(); if(window._ceClose) window._ceClose(); }
  function backToCE(){ var D=window._docTabs; if(D&&D.openControllerEditor) return D.openControllerEditor(); if(window._ceOpen) window._ceOpen(); }
  function resolvePick(t){
    if(!t||!t.closest||t.closest('#ctrlEditorOverlay,#docTabBar,#fePickBar')) return null;
    var el=t.closest('input,select,textarea,button'), vis=el;
    if(el){ if(el.type==='checkbox'||el.type==='radio') vis=el.closest('label')||el; }
    else { var lb=t.closest('label'); if(lb){ el=lb.control||lb.querySelector('input,select,textarea,button'); vis=lb; } }
    return el?{el:el,vis:vis||el}:null;
  }
  function checkPick(r){
    var el=r.el;
    if(!el.id) return 'That control has no ID, so it can\u2019t be linked.';
    if(el.type==='file') return 'File pickers can\u2019t be controlled.';
    if(el.disabled||el.readOnly) return 'That control is read-only.';
    return '';
  }
  function pickMsg(txt,bad){
    var m=pickBar&&pickBar.querySelector('.fe-pick-msg'); if(!m) return;
    m.textContent=txt; m.style.color=bad?'#ff7a7a':''; clearTimeout(pickMsgT);
    pickMsgT=setTimeout(function(){ m.textContent=m.dataset.def; m.style.color=''; },2600);
  }
  function pickEvt(e){
    if(pickBid===null||e.shiftKey) return;
    if(e.target.closest&&e.target.closest('#fePickBar')) return;
    var r=resolvePick(e.target); if(!r) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if(e.type!=='click') return;
    var err=checkPick(r); if(err){ pickMsg(err,true); return; }
    endPick(r.el.id);
  }
  function pickHover(e){
    var r=resolvePick(e.target), v=(r&&!checkPick(r))?r.vis:null;
    if(v!==pickHot){ if(pickHot) pickHot.classList.remove('fe-pick-hot'); pickHot=v; if(v) v.classList.add('fe-pick-hot'); }
  }
  function pickKey(e){ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); endPick(null); } }
  function cleanupPick(){
    PICK_EVTS.forEach(function(n){ document.removeEventListener(n,pickEvt,true); });
    document.removeEventListener('mouseover',pickHover,true); document.removeEventListener('keydown',pickKey,true);
    if(pickHot){ pickHot.classList.remove('fe-pick-hot'); pickHot=null; }
    if(pickBar){ pickBar.remove(); pickBar=null; } document.body.classList.remove('fe-picking');
  }
  async function startPick(bid){
    if(pickBid!==null) return; pickBid=bid;
    if(window._ccSuspend) window._ccSuspend(true);
    try{ await goEditor(); }catch(e){}
    if(pickBid!==bid){ if(window._ccSuspend) window._ccSuspend(false); return; }
    var bar=document.createElement('div'); bar.id='fePickBar';
    bar.innerHTML='<span class="fe-pick-msg" data-def="Click any field"></span><button type="button" class="vbtn btn-gray" style="font-size:10px;padding:3px 9px;letter-spacing:1px">CANCEL</button>';
    bar.querySelector('.fe-pick-msg').textContent=bar.querySelector('.fe-pick-msg').dataset.def;
    bar.querySelector('button').addEventListener('click',function(){ endPick(null); });
    document.body.appendChild(bar); pickBar=bar; document.body.classList.add('fe-picking');
    PICK_EVTS.forEach(function(n){ document.addEventListener(n,pickEvt,true); });
    document.addEventListener('mouseover',pickHover,true); document.addEventListener('keydown',pickKey,true);
  }
  async function endPick(id){
    var bid=pickBid; pickBid=null; cleanupPick();
    if(id){ var r=find(bid); if(r){ var inf=ctlInfo(id); r.b.a.c=id; if(SP[r.b.t].s.v) r.b.a.v=inf?inf.def:'';
      if(r.parent&&SP[r.parent.t].s.v&&SP[r.parent.t].s.c&&SP[r.parent.t].s.c.t==='ctl'&&r.slot==='c') r.parent.a.v=inf?inf.def:''; changed(); } }
    try{ await backToCE(); }catch(e){}
    if(window._ccSuspend) window._ccSuspend(false);
    renderAll();
  }

  var cand=null, drag=null, zones=[], flo=null, mark=null;
  function kindOf(b){ return SP[b.t].k; }
  function palOver(c){ if(c.palx){ try{ var o=JSON.parse(c.palx); if(o&&typeof o==='object') return o; }catch(_){} } return c.palv!==null?{v:c.palv}:undefined; }
  function computeZones(){
    zones=[];
    inner.querySelectorAll('.fb').forEach(function(el){ var k=el.dataset.kind, r=el.getBoundingClientRect();
      if(k==='hat'||k==='cmd'||k==='c') zones.push({t:'after',bid:+el.dataset.bid,x:r.left,y:r.bottom});
      if(k==='c') el.querySelectorAll(':scope > .fb-mouth').forEach(function(m){ var mr=m.getBoundingClientRect(); zones.push({t:'in',bid:+el.dataset.bid,slot:m.dataset.slot,x:mr.left,y:mr.top}); }); });
    inner.querySelectorAll('.fs-list > .fb:first-child').forEach(function(el){ if(el.dataset.kind==='hat') return; var r=el.getBoundingClientRect(); zones.push({t:'before',bid:+el.dataset.bid,x:r.left,y:r.top}); });
    inner.querySelectorAll('.fs-slot').forEach(function(el){ if(el.dataset.st==='x') return; zones.push({t:'slot',bid:+el.dataset.bid,slot:el.dataset.slot,st:el.dataset.st,rect:el.getBoundingClientRect(),el:el}); });
  }
  function zoneBlocked(z,bl){
    var r=find(z.bid); if(!r||!r.script) return false; var sb=r.script.blocks, hat=sb[0]&&sb[0].t, newHat=hat;
    if(z.t==='before'&&r.list===sb&&r.idx===0) newHat=bl[0].t;
    if(newHat!=='whenPowerLoss') return false;
    return hasForever(bl)||(newHat!==hat&&hasForever(sb));
  }
  function pick(e,fr){
    var first=drag.blocks[0], k=kindOf(first), best=null, bd=1e9;
    if(drag.blocks.length===1&&(k==='rep'||k==='bool')){
      zones.forEach(function(z){ if(z.t!=='slot') return; if(z.st==='b'&&k!=='bool') return; if(z.st==='ctl'&&first.t!=='ctlRef') return;
        var r=z.rect; if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) return;
        var a=r.width*r.height; if(a<bd){ bd=a; best=z; } });
      return best; }
    if(k==='rep'||k==='bool') return null;
    zones.forEach(function(z){ if(z.t==='slot') return; if(k==='hat'&&z.t!=='before') return; if(zoneBlocked(z,drag.blocks)) return;
      var dx=fr.left-z.x, dy=(z.t==='before'?fr.bottom:fr.top)-z.y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<32&&d<bd){ bd=d; best=z; } });
    return best;
  }
  function clearMark(){ if(mark){ if(mark.el) mark.el.classList.remove('fs-hot'); mark=null; } var ind=document.getElementById('feInd'); if(ind) ind.style.display='none'; }
  function showMark(z){
    clearMark(); if(!z) return; mark=z;
    if(z.t==='slot'){ z.el.classList.add('fs-hot'); return; }
    var ind=document.getElementById('feInd'), wr=work.getBoundingClientRect();
    var uz=window._uiZoom||1; ind.style.display='block'; ind.style.width=(70*fz)+'px'; ind.style.left=((z.x-wr.left-work.clientLeft)/uz+work.scrollLeft)+'px'; ind.style.top=((z.y-wr.top-work.clientTop)/uz+work.scrollTop-2)+'px';
  }
  function startDrag(e){
    var rect=cand.el.getBoundingClientRect(), blocks;
    if(cand.pal) blocks=[makeBlock(cand.pal,palOver(cand))]; else { blocks=detach(cand.bid); if(!blocks) { cand=null; return; } renderWork(); }
    drag={blocks:blocks,dx:(cand.x-rect.left)*(cand.pal?fz:1),dy:(cand.y-rect.top)*(cand.pal?fz:1)};
    flo=document.createElement('div'); flo.className='fe-float'; flo.style.transformOrigin='0 0'; flo.style.transform='scale('+fz+')';
    blocks.forEach(function(b){ flo.appendChild(blockEl(b)); });
    document.body.appendChild(flo);
    computeZones(); moveDrag(e);
  }
  function moveDrag(e){
    var uz=window._uiZoom||1; flo.style.left=((e.clientX-drag.dx)/uz)+'px'; flo.style.top=((e.clientY-drag.dy)/uz)+'px';
    var fr={left:e.clientX-drag.dx,top:e.clientY-drag.dy,bottom:e.clientY-drag.dy+flo.offsetHeight*fz*(window._uiZoom||1)};
    var pr=pal.getBoundingClientRect(), over=e.clientX>=pr.left&&e.clientX<=pr.right&&e.clientY>=pr.top&&e.clientY<=pr.bottom;
    pal.classList.toggle('fe-del',over);
    showMark(over?null:pick(e,fr));
  }
  function endDrag(e){
    var fr={left:e.clientX-drag.dx,top:e.clientY-drag.dy,bottom:e.clientY-drag.dy+flo.offsetHeight*fz*(window._uiZoom||1)};
    var pr=pal.getBoundingClientRect(), wr=work.getBoundingClientRect(), ir=inner.getBoundingClientRect();
    var ik=fz*(window._uiZoom||1);
    var overPal=e.clientX>=pr.left&&e.clientX<=pr.right&&e.clientY>=pr.top&&e.clientY<=pr.bottom;
    var overWork=e.clientX>=wr.left&&e.clientX<=wr.right&&e.clientY>=wr.top&&e.clientY<=wr.bottom;
    var z=(overPal||!overWork)?null:pick(e,fr), bl=drag.blocks, r;
    clearMark(); pal.classList.remove('fe-del'); flo.remove(); flo=null;
    if(!overPal && (overWork||drag.fromWork)){
      if(z){
        if(z.t==='after'&&(r=find(z.bid))) r.list.splice.apply(r.list,[r.idx+1,0].concat(bl));
        else if(z.t==='in'&&(r=find(z.bid))) r.b[z.slot].splice.apply(r.b[z.slot],[0,0].concat(bl));
        else if(z.t==='before'&&(r=find(z.bid))) r.list.splice.apply(r.list,[r.idx,0].concat(bl));
        else if(z.t==='slot'&&(r=find(z.bid))){ var old=r.b.a[z.slot]; r.b.a[z.slot]=bl[0];
          if(needsPick(bl[0])){ var inh=inheritCtl(r.b,z.slot); if(inh){ var ii=ctlInfo(inh); bl[0].a.c=inh; if(SP[bl[0].t].s.v) bl[0].a.v=ii?ii.def:''; } }
          if(old&&typeof old==='object') S.scripts.push({x:Math.max(0,(fr.left-ir.left)/ik+30),y:Math.max(0,(fr.top-ir.top)/ik+30),blocks:[old]}); }
      } else if(overWork) S.scripts.push({x:Math.max(0,(fr.left-ir.left)/ik),y:Math.max(0,(fr.top-ir.top)/ik),blocks:bl});
    }
    var np=(!drag.fromWork&&!overPal&&overWork&&bl[0]&&needsPick(bl[0]))?bl[0]._id:0;
    drag=null; renderWork(); changed(); if(np) startPick(np);
  }
  function runClicked(bid){
    var r=find(bid); if(!r) return; var k=kindOf(r.b), ctl=curCtl();
    if(k==='rep'||k==='bool'){ var th0={cancel:false,ctl:ctl}; pre(r.b,th0).then(function(){ logLine('> '+str(runRep(r.b,th0))); }).catch(function(e){ if(e!==CANCEL) logLine('error: '+(e&&e.message)); }); return; }
    var was=ctl.R.running; ctl.R.running=true; startThread(ctl,r.script,bodyOf(r.script)); ctl.R.running=was;
  }
  function onDown(e){
    var pe0=e.target.closest('[data-pal]'); if(e.button===1&&!pe0){ startFPan(e); return; }
    if(e.button!==0) return;
    var pe=pe0, be=e.target.closest('.fb');
    if(!pe&&e.target.closest('input,select,option')) return;
    if(!pe&&!be){ setSel(null); startFPan(e); return; }
    if(!pe&&e.target.closest('.fs-slot')&&e.target.closest('.fs-slot')===e.target) {  }
    cand={x:e.clientX,y:e.clientY,palx:(pe&&pe.getAttribute('data-palx'))||null,pal:pe?pe.getAttribute('data-pal'):null,palv:(pe&&pe.getAttribute('data-palv')!==null)?pe.getAttribute('data-palv'):null,bid:(!pe&&be)?+be.dataset.bid:null,el:pe||be,chip:(!pe&&e.target.closest)?e.target.closest('.fe-ctl'):null};
    e.preventDefault();
  }
  if(pal&&work){
    pal.addEventListener('pointerdown',onDown); inner.addEventListener('pointerdown',onDown);
    document.addEventListener('pointermove',function(e){
      if(fpan){ work.scrollLeft=fpan.l-(e.clientX-fpan.x); work.scrollTop=fpan.t-(e.clientY-fpan.y); return; }
      if(cand&&!drag&&Math.abs(e.clientX-cand.x)+Math.abs(e.clientY-cand.y)>5){ drag=null; startDrag(e); if(drag) drag.fromWork=!cand.pal; }
      else if(drag) moveDrag(e);
    });
    document.addEventListener('pointerup',function(e){
      if(fpan){ fpan=null; work.classList.remove('fe-panning'); return; }
      if(drag){ endDrag(e); cand=null; return; }
      if(cand){ var c=cand; cand=null;
        if(c.pal){ var n=S.scripts.length, nb=makeBlock(c.pal,palOver(c)); S.scripts.push({x:24+(n%8)*24,y:24+(n%8)*24,blocks:[nb]}); renderWork(); changed(); if(needsPick(nb)) startPick(nb._id); }
        else if(c.chip) startPick(+c.chip.dataset.bid);
        else { setSel(c.bid); runClicked(c.bid); } }
    });
    document.addEventListener('pointercancel',function(){ if(fpan){ fpan=null; work.classList.remove('fe-panning'); } });
    var pz=document.getElementById('fePause'), rst=document.getElementById('feReset'), clr=document.getElementById('feClear');
    var csel=document.getElementById('feCtlSel'); if(csel) csel.addEventListener('change',function(){ selectCtl(csel.value); });
    if(pz) pz.addEventListener('click',function(){ var c=curCtl(); setPaused(c,!c.paused); });
    if(rst) rst.addEventListener('click',function(){ var c=curCtl(); startCtl(c); logLine('['+c.name+'] reset'); });
    if(clr) clr.addEventListener('click',function(){
      function go(){ var c=curCtl(), was=c.paused; stopCtl(c); c.S.scripts=[]; renderAll(); if(!was){ c.R.running=true; syncTimers(c); } }
      if(!S.scripts.length){ go(); return; }
      if(typeof _dsDialog==='function') _dsDialog({title:'Clear scripts',msg:'Remove all scripts in this controller?',ok:'REMOVE'}).then(function(v){ if(v) go(); });
      else if(window.confirm('Remove all scripts in this controller?')) go(); });
  }
})();

