
(function(){
  var bar=document.getElementById('docTabBar'); if(!bar) return;
  var COLORS=['#35b9f0','#ff7a1a','#4dd6a0','#b48cff','#e8c547','#ff4d3d','#ff7ab8','#5ee0e0'];
  var groups=[], activeId=null, nextId=1, colorIdx=0, busy=false, internal=false;
  function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function byId(id){ for(var i=0;i<groups.length;i++) if(groups[i].id===id) return groups[i]; return null; }
  function cur(){ return byId(activeId); }
  function curModified(){ return (typeof presetModified!=='undefined') && !!presetModified; }
  function modelName(){ var el=document.getElementById('ePresetModel'); return el?String(el.value||'').trim():''; }
  function newGroup(name,blob){
    var g={id:nextId++,color:COLORS[colorIdx++%COLORS.length],name:name||'Untitled',fileName:name||'Untitled',blob:blob||null,snap:null,modified:false,view:'editor',hasRecord:false,hasCE:false,_md:false,oscpSubs:[],localSubs:[]};
    groups.push(g); return g;
  }
  var first=newGroup(modelName()||'Default Preset',null); activeId=first.id;

  function overlayActive(){ var o=document.getElementById('recordOverlay'); return !!(o&&o.classList.contains('active')); }
  function pressInternal(id){ var b=document.getElementById(id); if(!b) return; internal=true; try{ b.click(); }finally{ internal=false; } }
  function recShow(){ pressInternal('btnRecordMode'); }
  function recHide(){ pressInternal('btnNormalMode'); }
  function ceHide(){ if(window._ceIsOpen && window._ceIsOpen()) window._ceClose(); }

  async function snapshotActive(){
    var g=cur(); if(!g) return true;
    g.snap=(typeof presetSnapshot!=='undefined')?presetSnapshot:null;
    g.modified=curModified();
    if(typeof _buildPresetZip!=='function') return false;
    var zip=await _buildPresetZip(); if(!zip) return false;
    g.blob=await zip.generateAsync({type:'blob'});
    return true;
  }
  function resetSiren(){
    try{
      if(typeof windAnimId!=='undefined' && windAnimId){ cancelAnimationFrame(windAnimId); windAnimId=null; }
      active=false; currentRPM=0; window._simWs=0;
      if(typeof damperExtraRPM!=='undefined') damperExtraRPM=0;
      if(typeof onReachZero==='function') onReachZero();
    }catch(e){}
  }

  var SC_IDS=['ctrlEditorOverlay','recMainArea','ceEditorHost','feWork','stvView'], scrollGen=0;
  function capScroll(){
    var o={w:[window.pageXOffset||0,window.pageYOffset||0],e:{}};
    SC_IDS.forEach(function(i){ var el=document.getElementById(i); if(el&&el.offsetParent!==null&&(el.scrollTop||el.scrollLeft)) o.e[i]=[el.scrollLeft,el.scrollTop]; });
    return o;
  }
  function saveScroll(g){ if(!g) return; g.scroll=g.scroll||{}; g.scroll[g.view||'editor']=capScroll(); }
  function applyScroll(o){
    window.scrollTo(o.w[0],o.w[1]);
    SC_IDS.forEach(function(i){ var el=document.getElementById(i), v=o.e[i]; if(el&&v){ el.scrollLeft=v[0]; el.scrollTop=v[1]; } });
  }
  function restoreScroll(g){
    var o=g.scroll&&g.scroll[g.view||'editor']; if(!o) return;
    var gen=++scrollGen;
    [0,60,200,450].forEach(function(ms){ setTimeout(function(){ if(gen===scrollGen) applyScroll(o); },ms); });
  }
  ['wheel','touchstart','keydown','mousedown'].forEach(function(ev){ window.addEventListener(ev,function(){ scrollGen++; },{passive:true,capture:true}); });

  async function activate(id,view){
    if(busy) return; var g=byId(id); if(!g) return;
    busy=true;
    try{
      var c=cur();
      if(c) saveScroll(c);
      if(c && window._ceIsOpen && window._ceIsOpen() && window._ceCapAll){ try{ c.ceUI=window._ceCapAll(); }catch(_){} }
      endPick(); hideSub();
      if(c && c.id!==id){
        var ok=await snapshotActive();
        if(!ok){ alert('Still loading libraries. Please try again in a moment.'); return; }
        if(overlayActive()) recHide();
        ceHide();
        resetSiren();
        loadTarget=g;
        if(g.loader){
          var ld=g.loader; g.loader=null;
          await ld();
        } else if(g.blob && typeof loadPreset==='function'){
          await loadPreset(g.blob);
          if(g.snap && typeof presetSnapshot!=='undefined') presetSnapshot=g.snap;
          if(typeof setPresetStatus==='function') setPresetStatus(g.modified?'modified':'current');
        }
        activeId=id;
      }
      var want=view||g.view||'editor';
      if(want==='record' && g.hasRecord){ g.view='record'; ceHide(); if(!overlayActive()) recShow(); }
      else if(want==='ceditor' && g.hasCE){ g.view='ceditor'; if(overlayActive()) recHide(); var _wasCE=!!(window._ceIsOpen&&window._ceIsOpen()); if(window._ceOpen) window._ceOpen(); if(!_wasCE&&g.ceUI&&window._ceApplyAll){ try{ window._ceApplyAll(g.ceUI); }catch(e){ console.warn('controller editor screen not restored',e); } } }
      else if(typeof want==='string' && want.indexOf('sub:')===0 && findSub(g,want.slice(4))){ g.view=want; if(overlayActive()) recHide(); ceHide(); showSub(findSub(g,want.slice(4))); }
      else { g.view='editor'; if(overlayActive()) recHide(); ceHide(); }
      restoreScroll(g);
    } finally { busy=false; loadTarget=null; render(); }
  }

  function defaultFile(){
    var dn=(window.SIRENOSC_PRESETS&&window.SIRENOSC_PRESETS.default.file)||'default.oscp';
    var dp=(typeof getBuiltinPreset==='function')?getBuiltinPreset(dn):null;
    if(!dp) return null;
    var bin=safeAtob(dp.b64), bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new File([bytes],dp.file,{type:'application/octet-stream'});
  }
  async function loadDefault(){
    var f=defaultFile(); if(!f) throw new Error('Default preset not available.');
    await loadPreset(f);
  }
  async function addGroup(name,loader){
    if(busy) return;
    var g=newGroup(name,null); g.loader=loader; render();
    await activate(g.id,'editor');
    if(activeId!==g.id){ groups.splice(groups.indexOf(g),1); render(); throw new Error('Could not open the new tab.'); }
  }
  function addDefaultTab(){
    return addGroup('Default Preset',loadDefault).catch(function(e){ alert(e.message||e); });
  }
  var ALL_SECTIONS=14;
  function importFile(file,selectedJsons){
    var name=file.name.replace(/\.oscp$/i,'');
    return addGroup(name,async function(){
      if(!selectedJsons || selectedJsons.length>=ALL_SECTIONS){ await loadPreset(file); }
      else { await loadDefault(); await loadPreset(file,selectedJsons); }
    });
  }
  async function openFiles(files){
    for(var i=0;i<files.length;i++) await importFile(files[i]);
  }
  async function closeGroup(id){
    if(busy || groups.length<=1) return;
    var g=byId(id); if(!g) return;
    var mod=(id===activeId)?curModified():g.modified;
    if(mod && !(await _dsDialog({title:'Unsaved changes',msg:'"'+g.name+'" has unsaved changes. Close it anyway?',ok:'CLOSE'}))) return;
    var idx=groups.indexOf(g);
    if(id===activeId){
      var next=groups[idx+1]||groups[idx-1];
      await activate(next.id,'editor');
      if(activeId!==next.id) return;
    }
    groups.splice(groups.indexOf(g),1); render();
  }

  var GKEY='sirenosc_stv_global_v1', GLOBAL=[], loadTarget=null, shown=null, moved=[], pick=null, menuEl=null, lastMenuT=0, swallowUntil=0;
  var SKIPT={SCRIPT:1,STYLE:1,HR:1,BR:1,TEMPLATE:1,LINK:1,META:1};
  var LEAFC=['vbtn','badge'];
  var SPP={t:'marginTop',l:'marginLeft',pt:'paddingTop',pb:'paddingBottom',pl:'paddingLeft',pr:'paddingRight'};
  function cleanItem(it){
    if(!it||typeof it.sx!=='string') return null;
    var o={sx:it.sx,label:String(it.label||'').slice(0,80)};
    if(Array.isArray(it.p)&&it.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })){ o.p=it.p.slice(0,12); if(typeof it.id==='string'&&it.id) o.id=it.id; }
    if(it.c&&typeof it.c==='object'&&it.sx.indexOf('custom:')===0){ var cc=it.c; o.c={title:String(cc.title||'').slice(0,80),src:(typeof cc.src==='string'&&cc.src.indexOf('data:image/')===0&&cc.src.length<4000000)?cc.src:'',text:String(cc.text||'').slice(0,20000),box:cc.box!==false}; }
    if(Array.isArray(it.omit)){ var om=[]; it.omit.slice(0,400).forEach(function(e){ if(e&&Array.isArray(e.p)&&e.p.length&&e.p.length<=14&&e.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })){ var q={p:e.p.slice()}; if(typeof e.id==='string'&&e.id) q.id=e.id; om.push(q); } }); if(om.length) o.omit=om; }
    if(Array.isArray(it.hid)){ var hd=[]; it.hid.slice(0,400).forEach(function(e){ if(e&&Array.isArray(e.p)&&e.p.length&&e.p.length<=16&&e.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })){ var q={p:e.p.slice()}; if(typeof e.id==='string'&&e.id) q.id=e.id; hd.push(q); } }); o.hid=hd; }
    if(Array.isArray(it.sp)){ var sp=[]; it.sp.slice(0,200).forEach(function(e){ if(e&&Array.isArray(e.p)&&e.p.length<=16&&e.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })&&SPP[e.s]&&typeof e.m==='number'&&isFinite(e.m)){ var q={p:e.p.slice(),s:e.s,m:e.m}; if(typeof e.id==='string'&&e.id) q.id=e.id; sp.push(q); } }); if(sp.length) o.sp=sp; }
    if(typeof it.vz==='string'&&/^[A-Za-z0-9]+$/.test(it.vz)) o.vz=it.vz;
    if(Array.isArray(it.mv)){ var mvv=[]; it.mv.slice(0,200).forEach(function(e){ if(e&&Array.isArray(e.p)&&e.p.length&&e.p.length<=16&&e.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })&&typeof e.x==='number'&&typeof e.y==='number'&&isFinite(e.x)&&isFinite(e.y)){ var q={p:e.p.slice(),x:e.x,y:e.y}; if(typeof e.id==='string'&&e.id) q.id=e.id; mvv.push(q); } }); if(mvv.length) o.mv=mvv; }
    if(typeof it.sc==='number'&&isFinite(it.sc)&&Math.abs(it.sc-1)>0.004) o.sc=Math.max(0.4,Math.min(3,Math.round(it.sc*100)/100));
    if(Array.isArray(it.rz)){ var rzz=[]; it.rz.slice(0,200).forEach(function(e){ if(e&&Array.isArray(e.p)&&e.p.length&&e.p.length<=16&&e.p.every(function(n){ return typeof n==='number'&&n>=0&&n%1===0; })){ var q={p:e.p.slice()}; if(typeof e.w==='number'&&isFinite(e.w)&&e.w>=8&&e.w<=4000) q.w=Math.round(e.w); if(typeof e.h==='number'&&isFinite(e.h)&&e.h>=8&&e.h<=4000) q.h=Math.round(e.h); if(q.w===undefined&&q.h===undefined) return; if(typeof e.id==='string'&&e.id) q.id=e.id; rzz.push(q); } }); if(rzz.length) o.rz=rzz; }
    var lf=it.lf; if(lf&&[lf.x,lf.y,lf.w,lf.h].every(function(n){ return typeof n==='number'&&isFinite(n); })) o.lf={x:lf.x,y:lf.y,w:lf.w,h:lf.h};
    var l=it.l; if(l&&[l.x,l.y,l.w,l.h].every(function(n){ return typeof n==='number'&&isFinite(n); })) o.l={x:l.x,y:l.y,w:l.w,h:l.h};
    if(o.vz==='controller'){ delete o.omit; delete o.hid; delete o.sp; delete o.mv; delete o.rz; delete o.sc; }
    return o;
  }
  function cleanSub(x){
    if(!x||typeof x.id!=='string') return null;
    return {id:x.id,name:String(x.name||'Tab').slice(0,40),scroll:x.m2?(x.scroll!==false):false,m2:1,global:!!x.global,oscp:!!x.oscp,closed:!!x.closed,perm:x.perm?1:0,pv:x.pv||0,noscroll:x.m2?!!x.noscroll:true,locked:!!x.locked,items:(Array.isArray(x.items)?x.items:[]).map(cleanItem).filter(Boolean)};
  }
  try{ var _gs=JSON.parse(localStorage.getItem(GKEY)||'[]'); if(Array.isArray(_gs)) GLOBAL=_gs.map(cleanSub).filter(Boolean); }catch(e){}
  function saveGlobal(){ try{ localStorage.setItem(GKEY,JSON.stringify(GLOBAL)); }catch(e){} }
  var PERM_TABS=[{id:'perm-recording',ver:3,tab:{"name":"Recording","m2":1,"scroll":false,"noscroll":true,"locked":true,"items":[{"sx":"chopperDiagramSec","label":"Chopper Diagram","omit":[{"p":[0]},{"p":[1,2,0],"id":"btnChopperAnim"}],"hid":[{"p":[0,0,0]},{"p":[1,0,1],"id":"chopperCanvasWrapB"},{"p":[1,1],"id":"chopperDiagNav"}],"lf":{"x":0,"y":0,"w":0.3683737646001797,"h":0.2889928271711162},"l":{"x":0,"y":0,"w":455.6783468104223,"h":214.4326777609682}},{"sx":"vz:gTorque","label":"Motor / Speed Torque Graph","vz":"gTorque","lf":{"x":0.3683737646001797,"y":0,"w":0.2066486972147349,"h":0.2695417789757412},"l":{"x":455.6783468104223,"y":0,"w":255.62443845462707,"h":200}},{"sx":"vz:gCounter","label":"Air Resistance / Friction Graph","vz":"gCounter","lf":{"x":0.3683737646001797,"y":0.2695417789757412,"w":0.2066486972147349,"h":0.29323372656801133},"l":{"x":455.6783468104223,"y":200,"w":255.62443845462707,"h":217.57942511346442}},{"sx":"vz:gOmega","label":"Angular Velocity (RPM) Graph","vz":"gOmega","lf":{"x":0.5750224618149146,"y":0,"w":0.21832884097035055,"h":0.2889928271711162},"l":{"x":711.3027852650494,"y":0,"w":270.07277628032364,"h":214.4326777609682}},{"sx":"vz:gVoltage","label":"Live Voltage Graph","vz":"gVoltage","lf":{"x":0.7933513027852651,"y":0,"w":0.20664869721473486,"h":0.2695417789757412},"l":{"x":981.375561545373,"y":0,"w":255.624438454627,"h":200}},{"sx":"vz:gCurrent","label":"Current Usage Graph","vz":"gCurrent","lf":{"x":0.7933513027852651,"y":0.2695417789757412,"w":0.20664869721473486,"h":0.29323372656801133},"l":{"x":981.375561545373,"y":200,"w":255.624438454627,"h":217.57942511346442}},{"sx":"vz:gAlpha","label":"Angular Acceleration Graph","vz":"gAlpha","lf":{"x":0.5750224618149146,"y":0.2889928271711162,"w":0.21832884097035055,"h":0.2737826783726365},"l":{"x":711.3027852650494,"y":214.4326777609682,"w":270.07277628032364,"h":203.14674735249628}},{"sx":"vz:posMap","label":"Position Map","vz":"posMap","lf":{"x":0.3683737646001797,"y":0.5639455821258036,"w":0.2425876010781671,"h":0.4402420574886536},"l":{"x":455.6783468104222,"y":420.7034042658495,"w":300.0808625336927,"h":328.4205748865356}},{"sx":"vz:preset","label":"Preset Information","omit":[{"p":[0,0,0]}],"vz":"preset","lf":{"x":0.6109613656783468,"y":0.5639455821258036,"w":0.3881401617250674,"h":0.14709829079401487},"l":{"x":680,"y":372.76802978515616,"w":432,"h":97.23197021484384}},{"sx":"vz:posRead","label":"Spatial Readouts","vz":"posRead","lf":{"x":0.12578616352201258,"y":0.7412398921832885,"w":0.24258760107816707,"h":0.2641509433962264},"l":{"x":155.59748427672955,"y":550,"w":300.08086253369265,"h":196}},{"sx":"vz:status","label":"Status Monitor (State / Voltage / Speed)","omit":[{"p":[0]}],"vz":"status","lf":{"x":0.6109613656783468,"y":0.7110438729198184,"w":0.3890386343216532,"h":0.1059001512859305},"l":{"x":680,"y":469.99999999999994,"w":433,"h":70.00000000000006}},{"sx":"vz:freq","label":"Frequency Monitor","omit":[{"p":[0]}],"vz":"freq","lf":{"x":0.6109613656783468,"y":0.8169440242057489,"w":0.3890386343216532,"h":0.18305597579425115},"l":{"x":680,"y":540,"w":433,"h":121}},{"sx":"vz:controller","label":"Controller","vz":"controller","lf":{"x":0,"y":0.28899282717111624,"w":0.3683737646001797,"h":0.45224706501217216},"l":{"x":0,"y":214.43267776096826,"w":455.6783468104223,"h":335.56732223903174}},{"sx":"vz:wiring","label":"Motor Wiring Diagram","omit":[{"p":[1,0,0]}],"vz":"wiring","lf":{"x":0,"y":0.7412398921832885,"w":0.12578616352201258,"h":0.2670676280311171},"l":{"x":0,"y":550,"w":155.59748427672955,"h":198.1641799990889}}]}}];
    (function(){ var add=false;
    PERM_TABS.forEach(function(pt){
      var ex=null; GLOBAL.forEach(function(x){ if(x.id===pt.id) ex=x; });
      if(ex){ ex.perm=1; ex.global=true; ex.oscp=false; if(ex.pv!==pt.ver){ ex.pv=pt.ver; var _u=cleanSub(Object.assign({},pt.tab,{id:pt.id,perm:1,global:true,oscp:false,closed:!!ex.closed})); if(_u){ ex.items=_u.items; ex.name=_u.name; ex.noscroll=_u.noscroll; ex.locked=_u.locked; ex.scroll=_u.scroll; add=true; } } return; }
      var src={}; for(var k in pt.tab) src[k]=pt.tab[k]; src.id=pt.id; src.perm=1; src.global=true; src.oscp=false; src.closed=false;
      var x=cleanSub(src); if(x){ x.perm=1; x.global=true; x.oscp=false; x.pv=pt.ver; GLOBAL.push(x); add=true; }
    });
    if(add) saveGlobal(); })();
  function subsOf(g){
    var seen={}, out=[];
    GLOBAL.concat((g&&g.oscpSubs)||[],(g&&g.localSubs)||[]).forEach(function(x){ if(x&&!seen[x.id]){ seen[x.id]=1; out.push(x); } });
    var ord=g&&g.subOrder;
    if(ord&&ord.length){ var rk=function(x){ var i=ord.indexOf(x.id); return i<0?1e6+out.indexOf(x):i; }; out.sort(function(a,b){ return rk(a)-rk(b); }); }
    return out;
  }
  function findSub(g,id){ var l=subsOf(g); for(var i=0;i<l.length;i++) if(l[i].id===id) return l[i]; return null; }
  function newSubId(){ return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function subTabsHtml(g,isA){
    return subsOf(g).filter(function(x){ return !x.closed; }).map(function(x){ return '<div class="dt-tab dt-sub'+(isA&&g.view==='sub:'+x.id?' active':'')+'" data-act="sub" data-sid="'+esc(x.id)+'" title="Right-click or long-press to edit">'+esc(x.name)+'<span class="dt-x" data-act="closesub" title="Close tab (reopen from the model name menu)"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span></div>'; }).join('');
  }
  function removeFromLists(g,x){
    if(x&&x.perm) return;
    [GLOBAL,g.oscpSubs,g.localSubs].forEach(function(l){ var i=l?l.indexOf(x):-1; if(i>=0) l.splice(i,1); });
  }
  function putSub(g,x){
    var lists=[GLOBAL,g.oscpSubs,g.localSubs], cl=null, ci=-1, old=null;
    for(var i=0;i<lists.length&&!cl;i++){ for(var j=0;j<lists[i].length;j++) if(lists[i][j].id===x.id){ cl=lists[i]; ci=j; old=lists[i][j]; break; } }
    var target=x.global?GLOBAL:(x.oscp?g.oscpSubs:g.localSubs);
    if(cl===target){ target[ci]=x; }
    else { if(old) removeFromLists(g,old); target.push(x); }
    touch(x);
  }
  var HIST={}, histBusy=false;
  function hget(x){ return HIST[x.id]||(HIST[x.id]={u:[],r:[],cur:null}); }
  function hbase(x){ var h=hget(x); h.cur=JSON.stringify(x.items); }
  function hrecord(x){
    if(histBusy) return; var h=hget(x), now=JSON.stringify(x.items);
    if(h.cur===null){ h.cur=now; return; }
    if(now===h.cur) return;
    h.u.push(h.cur); if(h.u.length>100) h.u.shift(); h.r=[]; h.cur=now;
  }
  function hstep(x,dir){
    if(!x||x.locked) return false; var h=hget(x), from=dir<0?h.u:h.r, to=dir<0?h.r:h.u; if(!from.length) return false;
    var st=from.pop(); to.push(h.cur!==null?h.cur:JSON.stringify(x.items)); h.cur=st;
    var items; try{ items=JSON.parse(st).map(cleanItem).filter(Boolean); }catch(e){ return false; }
    histBusy=true; try{ x.items=items; touch(x); if(shown===x.id) showSub(x); } finally{ histBusy=false; }
    hbase(x); return true;
  }
  function curSub(){ var g=cur(); return g&&shown?findSub(g,shown):null; }
  function undoItem(x){ return {label:'Undo'+(hget(x).u.length?'':' (none)'),fn:function(){ hstep(x,-1); }}; }
  function redoItem(x){ return {label:'Redo'+(hget(x).r.length?'':' (none)'),fn:function(){ hstep(x,1); }}; }
  function setLocked(x,on){ x.locked=!!on; touch(x); if(shown===x.id) showSub(x); }
  document.addEventListener('keydown',function(e){
    if(!shown||!(e.ctrlKey||e.metaKey)||e.altKey) return; var t=e.target;
    if(t&&t.closest&&t.closest('input,textarea,select,[contenteditable],.popup-overlay,.sx-modal')) return;
    var k=(e.key||'').toLowerCase(), x=curSub(); if(!x) return;
    if(k==='z'&&!e.shiftKey){ e.preventDefault(); hstep(x,-1); }
    else if(k==='y'||(k==='z'&&e.shiftKey)){ e.preventDefault(); hstep(x,1); }
  },true);
  function touch(x){
    hrecord(x);
    if(x.global) saveGlobal();
    if(x.oscp && typeof setPresetStatus==='function'){ try{ setPresetStatus('modified'); }catch(e){} }
    schedulePersist();
  }
  window._stvGather=function(){
    var g=cur(), seen={}, list=[];
    ((g&&g.oscpSubs)||[]).concat(GLOBAL.filter(function(x){ return x.oscp; })).forEach(function(x){ if(!seen[x.id]){ seen[x.id]=1; list.push({id:x.id,name:x.name,scroll:x.scroll,m2:1,closed:!!x.closed,noscroll:!!x.noscroll,locked:!!x.locked,items:x.items}); } });
    return {v:1,subtabs:list};
  };
  window._stvApply=function(d){
    var t=loadTarget||cur(); if(!t) return;
    t.oscpSubs=(d&&Array.isArray(d.subtabs)?d.subtabs:[]).slice(0,24).map(cleanSub).filter(Boolean).map(function(x){ x.global=false; x.oscp=true; return x; });
    if(t===cur()&&shown&&!findSub(t,shown)){ hideSub(); t.view='editor'; }
    render();
  };

  function hostEl(){ return document.querySelector('.vst>.body'); }
  function secEl(sx){ var l=document.querySelectorAll('[data-sx]'); for(var i=0;i<l.length;i++) if(l[i].getAttribute('data-sx')===sx) return l[i]; return null; }
  function clean(t){ return String(t||'').replace(/[\u25be\u25b8\u21bb\u22ee\u2715\u00d7]/g,'').replace(/\s+/g,' ').trim(); }
  function secTitle(sx){
    var e=secEl(sx), t=e&&e.querySelector('.sec-title'); if(!t) return sx;
    var tn=Array.prototype.find.call(t.childNodes,function(n){ return n.nodeType===3&&n.textContent.trim(); });
    return clean(tn?tn.textContent:t.textContent)||sx;
  }
  function buildCustom(it){
    var c=it.c, el=document.createElement('div'); el.className='sec stv-custom'; el.style.cssText='display:flex;flex-direction:column;gap:8px;min-width:0';
    if(c.title){ var t=document.createElement('div'); t.className='sec-title'; t.style.marginBottom='0'; t.textContent=c.title; el.appendChild(t); }
    if(c.src){ var im=document.createElement('img'); im.src=c.src; im.draggable=false; im.style.cssText='display:block;max-width:100%;height:auto;border-radius:2px;align-self:center;flex:0 1 auto;min-height:0;object-fit:contain'; el.appendChild(im); }
    if(c.box){ var ta=document.createElement('textarea'); ta.value=c.text||''; ta.placeholder='Type here...'; ta.style.cssText='width:100%;box-sizing:border-box;flex:1 1 auto;min-height:60px;resize:none;background:var(--inset);color:var(--text);border:1px solid var(--border);border-radius:2px;font:inherit;font-size:12px;padding:6px 8px';
      var tm=null; ta.addEventListener('input',function(){ c.text=ta.value; clearTimeout(tm); tm=setTimeout(function(){ var g=cur(), sb=g&&shown&&findSub(g,shown); if(sb) touch(sb); },500); }); el.appendChild(ta); }
    return el;
  }
  function resolve(it){
    if(it.c) return buildCustom(it);
    if(it.vz) return VZ[it.vz]?buildVisual(it):null;
    var sec=secEl(it.sx); if(!sec) return null;
    if(!it.p) return sec;
    var el=it.id?document.getElementById(it.id):null; if(el&&sec.contains(el)) return el;
    var n=sec; for(var i=0;i<it.p.length&&n;i++) n=n.children[it.p[i]];
    return n||null;
  }
  function viewEl(){
    var v=document.getElementById('stvView'); if(v) return v;
    var h=hostEl(); if(!h) return null;
    v=document.createElement('div'); v.id='stvView'; h.insertBefore(v,h.firstChild);
    v.addEventListener('contextmenu',function(e){ e.preventDefault(); e.stopPropagation(); if(Date.now()-lastMenuT<700) return; pressMenu(e.target,e.clientX,e.clientY); },true);
    v.addEventListener('pointerdown',function(e){ var t=e.target; if(e.button===0&&t&&t.closest&&t.closest('.sx-handle')&&!t.closest('button,input,select,textarea,a,label')) { e.stopImmediatePropagation(); if(document.body.classList.contains('stv-fixed')){ var nn=nodeAt(e.target); if(nn){ nn.node.style.zIndex=++zTopS; var ed0=edgeOf(nn,e); if(ed0) e.preventDefault(); startOp(e,nn,ed0); } } } },true);
    var lp=null;
    v.addEventListener('pointerdown',function(e){
      if(e.pointerType==='mouse'||e.button>0) return;
      var x=e.clientX,y=e.clientY,tg=e.target; clearTimeout(lp);
      lp=setTimeout(function(){ lastMenuT=Date.now(); pressMenu(tg,x,y); },600);
      var cancel=function(ev){ if(ev&&ev.type==='pointermove'&&Math.hypot(ev.clientX-x,ev.clientY-y)<8) return; clearTimeout(lp); v.removeEventListener('pointermove',cancel); v.removeEventListener('pointerup',cancel); v.removeEventListener('pointercancel',cancel); };
      v.addEventListener('pointermove',cancel); v.addEventListener('pointerup',cancel); v.addEventListener('pointercancel',cancel);
    },true);
    return v;
  }
  document.addEventListener('contextmenu',function(e){
    if(!document.body.classList.contains('stv-on')) return;
    var t=e.target, v=document.getElementById('stvView'); if(!t||!t.closest||!v||v.contains(t)) return;
    if(t.closest('#docTabBar,.sx-ctx,.popup-overlay,.header,.menu-bar-row,input,select,textarea,button,a,canvas,[contenteditable]')) return;
    e.preventDefault(); e.stopImmediatePropagation(); if(Date.now()-lastMenuT<700) return; pressMenu(t,e.clientX,e.clientY);
  },true);
  function sizeView(sub){
    var v=document.getElementById('stvView'); if(!v) return;
    if(sub&&!sub.scroll){ window.scrollTo(0,0);
      var bar=document.getElementById('docTabBar'); if(bar){ v.style.top=''; var r0=v.getBoundingClientRect(), z0=(r0.width/(v.offsetWidth||1))||1, dd=bar.getBoundingClientRect().bottom-r0.top; if(Math.abs(dd)>0.3) v.style.top='calc(var(--topH,34px) - 2px + '+(dd/z0)+'px)'; }
      var r=v.getBoundingClientRect(), z=(r.width/(v.offsetWidth||1))||1; v.style.height=Math.max(220,(window.innerHeight-r.top)/z-8)+'px'; }
    else v.style.height='';
  }
  window.addEventListener('resize',function(){ if(shown){ var g=cur(), x=g&&findSub(g,shown); if(x) sizeView(x); } });
  function showSub(sub){
    hideSub();
    var v=viewEl(); if(!v) return;
    v.innerHTML=''; shown=sub.id;
    document.body.classList.add('stv-on'); document.body.classList.toggle('stv-nosb',!!sub.noscroll); document.body.classList.toggle('stv-fixed',!sub.scroll); v.classList.toggle('stv-fixed',!sub.scroll);
    var tmp=[]; vzReserved=[];
    sub.items.forEach(function(it,i){ if(it.vz) return; var el=resolve(it); if(el){ tmp.push({it:it,el:el,i:i}); vzReserved.push(el); } });
    sub.items.forEach(function(it,i){ if(!it.vz) return; var el=resolve(it); if(el) tmp.push({it:it,el:el,i:i}); });
    var res=tmp.sort(function(a,b){ return a.i-b.i; }); vzReserved=[];
    res=res.filter(function(r,ix){ return !res.some(function(o,ox){ return o!==r&&(o.el!==r.el&&o.el.contains(r.el)); }); });
    var shells={};
    var usedEl=[];
    res.forEach(function(r){
      if(usedEl.indexOf(r.el)>=0){ r.el=makeMirror(r.el,r.it.sx); r.mir=true; } else usedEl.push(r.el);
      var target=v;
      if(r.it.p){
        var sx=r.it.sx;
        if(!shells[sx]){ var sh=document.createElement('div'); sh.className='sec stv-shell'; v.appendChild(sh); shells[sx]=sh; }
        target=shells[sx];
      }
      var ph=null; if(!r.it.c&&!r.it.vz&&!r.mir){ ph=document.createElement('span'); ph.className='stv-ph'; ph.hidden=true; r.el.parentNode.insertBefore(ph,r.el); }
      r.el.setAttribute('data-stv-i',r.i); target.appendChild(r.el); moved.push({el:r.el,ph:ph,sx:r.it.sx,saved:(r.it.c||r.it.vz||r.mir)?(r.el.classList.contains('sx-col')?(r.el.classList.remove('sx-col'),{p:{},c:['sx-col'],np:1}):null):isolate(r.el)});
    });
    var fresh=false;
    res.forEach(function(r){ if(r.it.p||r.it.c||r.it.vz) return;
      if(!Array.isArray(r.it.hid)){ r.it.hid=computeHidden(r.el); fresh=true; }
      applyHidden(r.el,r.it.hid); });
    if(fresh){ histBusy=true; try{ touch(sub); } finally{ histBusy=false; } }
    res.forEach(function(r){ if(r.it.omit&&r.it.omit.length) applyOmit(r.el,r.it.omit); });
    res.forEach(function(r){ if(r.it.sp&&r.it.sp.length) applySp(r.el,r.it.sp); });
    res.forEach(function(r){ if(r.it.mv&&r.it.mv.length) applyMv(r.el,r.it.mv); });
    res.forEach(function(r){ if(r.it.rz&&r.it.rz.length) applyRz(r.el,r.it.rz); });
    res.forEach(function(r){ if(r.it.p||r.it.c||r.it.vz||!(+r.it.sc>0)||+r.it.sc===1) return; [].slice.call(r.el.children).forEach(function(c){ if(c.classList.contains('stv-omit')) return; scSaved.push({el:c,prev:c.style.zoom}); c.style.zoom=+r.it.sc; }); });
    if(!res.length){ var h=document.createElement('div'); h.className='stv-empty'; h.textContent=''; if(!sub.items.length){ h.style.cssText='padding:24px;text-align:center;color:var(--muted);font-size:12px;letter-spacing:1px'; h.textContent='Right-click anywhere to add a section or a visual.'; } v.appendChild(h); }
    sizeView(sub);
    if(!sub.scroll) layoutFixed(sub,res,shells);
    hbase(sub);
  }
  var laid=[], curNodes=[], zTopS=10, scSaved=[], gfSaved=[];
  var CURS={n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize',ne:'nesw-resize',sw:'nesw-resize',nw:'nwse-resize',se:'nwse-resize'};
  var ISO_P=['position','left','top','width','height','zIndex','flex','overflow','transform','transition'], ISO_C=['sx-col','sx-half','sx-half-r','sx-moving','sx-drag'];
  function isolate(el){
    var sv={p:{},c:[]}; ISO_P.forEach(function(k){ sv.p[k]=el.style[k]; el.style[k]=''; });
    ISO_C.forEach(function(c){ if(el.classList.contains(c)){ sv.c.push(c); el.classList.remove(c); } }); return sv;
  }
  function unisolate(el,sv){ if(!sv) return; if(!sv.np) ISO_P.forEach(function(k){ el.style[k]=sv.p[k]; }); sv.c.forEach(function(c){ el.classList.add(c); }); }
  function layoutFixed(sub,res,shells){
    var v=document.getElementById('stvView'); if(!v||!res.length) return;
    var nodes=[], seen=[];
    res.forEach(function(r){ var nd=r.it.p?shells[r.it.sx]:r.el; if(nd&&seen.indexOf(nd)<0){ seen.push(nd); nodes.push({node:nd,it:r.it}); } });
    var vr=v.getBoundingClientRect(), z=(vr.width/(v.offsetWidth||1))||1;
    nodes.forEach(function(n){ var r=n.node.getBoundingClientRect(); n.d={x:(r.left-vr.left)/z,y:(r.top-vr.top)/z,w:r.width/z,h:r.height/z}; });
    var GAP=10, PX=14, PY=12, maxY=v.offsetHeight-10, cx=PX, cy=PY, colW=0;
    nodes.forEach(function(n){ if(n.it.l) return; var w=Math.min(n.d.w,420), h=Math.min(n.d.h,Math.max(120,maxY-PY));
      if(cy>PY&&cy+h>maxY){ cx+=colW+GAP; cy=PY; colW=0; }
      n.d={x:cx,y:cy,w:w,h:h}; cy+=h+GAP; colW=Math.max(colW,w); });
    var VW=v.offsetWidth||1200, VH=v.offsetHeight||700, okn=function(q){ return typeof q==='number'&&isFinite(q); }, refW=0, refH=0, dirty=false;
    nodes.forEach(function(n){ var q=n.it, f=q.lf, l=q.l; if(!refW&&f&&l&&f.w>0&&f.h>0&&l.w>0&&l.h>0){ refW=l.w/f.w; refH=l.h/f.h; } });
    nodes.forEach(function(n){ var q=n.it;
      if(q.lf&&okn(q.lf.x)&&okn(q.lf.y)&&okn(q.lf.w)&&okn(q.lf.h)) return;
      var src=q.l&&okn(q.l.x)&&okn(q.l.y)&&okn(q.l.w)&&okn(q.l.h)?q.l:n.d, rw=(q.l&&refW)?refW:VW, rh=(q.l&&refH)?refH:VH;
      q.lf={x:src.x/rw,y:src.y/rh,w:src.w/rw,h:src.h/rh}; dirty=true; });
    nodes.forEach(function(n){
      var l=vzL(n)||n.it.l||n.d, st=n.node.style;
      if(!l||!okn(l.x)||!okn(l.y)||!okn(l.w)||!okn(l.h)) l=n.d;
      var lw=Math.max(60,Math.min(l.w,VW)), lh=Math.max(40,Math.min(l.h,VH));
      l={x:Math.max(0,Math.min(l.x,VW-Math.min(lw,60))),y:Math.max(0,Math.min(l.y,VH-Math.min(lh,40))),w:lw,h:lh};
      laid.push({node:n.node,css:n.node.getAttribute('style')});
      st.position='absolute'; st.boxSizing='border-box'; st.margin='0'; st.overflow='hidden'; st.flex='none'; n.l={x:l.x,y:l.y,w:l.w,h:l.h}; place(n);
    });
    if(dirty){ histBusy=true; try{ touch(sub); } finally{ histBusy=false; } }
    curNodes=nodes; nodes.forEach(function(n){ zfit(n); recenter(n); }); clearInterval(recIv); recIv=setInterval(function(){ if(!document.body.classList.contains('stv-op')) curNodes.forEach(function(n){ zfit(n); recenter(n); }); },700); [60,350,1200].forEach(function(ms){ setTimeout(function(){ curNodes.forEach(function(n){ zfit(n); recenter(n); }); },ms); });
    if(!v._stvLay){ v._stvLay=1;
      v.addEventListener('pointermove',function(e){ if(e.buttons||document.body.classList.contains('stv-op')) return; var n=nodeAt(e.target); setCur(n?edgeOf(n,e):''); });
      v.addEventListener('pointerleave',function(){ if(!document.body.classList.contains('stv-op')) setCur(''); });
      v.addEventListener('pointerdown',function(e){
        if(e.button>0||!curNodes.length||e._stvDone) return; var n=nodeAt(e.target); if(!n) return;
        n.node.style.zIndex=++zTopS; if(lockedNow()) return;
        var ed=edgeOf(n,e);
        if(ed){ e.preventDefault(); e.stopPropagation(); startOp(e,n,ed); return; }
        if(e.target.closest&&e.target.closest('input,select,textarea,button,a,canvas,label,svg,[contenteditable],.vbtn')) return;
        startOp(e,n,'');
      },true);
    }
  }
  function lockedNow(){ var s=curSub(); return !!(s&&s.locked); }
  window.addEventListener('pointerdown',function(e){
    if(e.button>0||!shown||!curNodes.length||!document.body.classList.contains('stv-fixed')||document.body.classList.contains('stv-op')) return;
    var v=document.getElementById('stvView'); if(!v||!e.target||!v.contains(e.target)||(e.target.closest&&e.target.closest('.sx-ctx'))) return;
    var n=nodeAt(e.target); if(!n) return; if(lockedNow()){ return; }
    var ed=edgeOf(n,e);
    if(!ed){
      var inBand=false;
      if(n.it&&n.it.vz){ var rr=n.node.getBoundingClientRect(), dx=Math.min(e.clientX-rr.left,rr.right-e.clientX), dy=Math.min(e.clientY-rr.top,rr.bottom-e.clientY); inBand=Math.min(dx,dy)<18; if(inBand&&e.target.closest){ if(e.target.closest('input,select,textarea,[contenteditable]')) inBand=false; else if(e.target.closest('button,a,label,.vbtn')){ if(!e.altKey){ n.node.style.zIndex=++zTopS; startOp(e,n,''); return; } } } }
      if(!(e.altKey||inBand||(e.ctrlKey&&e.shiftKey))) return;
    }
    n.node.style.zIndex=++zTopS; e.preventDefault(); e.stopImmediatePropagation(); startOp(e,n,ed);
  },true);
  window.addEventListener('pointermove',function(e){
    if(e.buttons||!shown||!curNodes.length||document.body.classList.contains('stv-op')) return;
    var v=document.getElementById('stvView'); if(!v||!e.target||!v.contains(e.target)) return;
    var n=nodeAt(e.target); setCur(n&&!lockedNow()?edgeOf(n,e):'');
  },true);
  var RC={n:'ns',s:'ns',e:'ew',w:'ew',ne:'nesw',sw:'nesw',nw:'nwse',se:'nwse'};
  function setCur(ed,move){ var b=document.body; b.classList.remove('stv-c-ns','stv-c-ew','stv-c-nesw','stv-c-nwse','stv-c-move'); if(ed) b.classList.add('stv-c-'+RC[ed]); else if(move) b.classList.add('stv-c-move'); }
  function nodeAt(t){ for(var i=0;i<curNodes.length;i++) if(curNodes[i].node.contains(t)) return curNodes[i]; return null; }
  function edgeOf(n,e){
    var r=n.node.getBoundingClientRect(), Z=(n.it&&n.it.vz)?14:8, x=e.clientX-r.left, y=e.clientY-r.top, ed='';
    if(y<Z) ed='n'; else if(y>r.height-Z) ed='s'; if(x<Z) ed+='w'; else if(x>r.width-Z) ed+='e'; return ed;
  }
  function zTargets(host){ return [].slice.call(host.children).filter(function(c){ if(SKIPT[c.tagName]||c.classList.contains('stv-omit')) return false; var q=getComputedStyle(c); return q.display!=='none'&&q.position!=='absolute'&&q.position!=='fixed'; }); }
  function fitCore(host,base,setz){
    var k=1, i; setz(base);
    function over(){ return host.scrollHeight>host.clientHeight+1||host.scrollWidth>host.clientWidth+1; }
    for(i=0;i<8&&over();i++){ var r=Math.min(host.clientHeight/Math.max(1,host.scrollHeight),host.clientWidth/Math.max(1,host.scrollWidth)); k=Math.max(.3,k*Math.max(.5,Math.min(.97,r*.98))); setz(base*k); }
    return k;
  }
  function zset(el,z){ if(!el._zsv){ el._zsv=1; scSaved.push({el:el,prev:el.style.zoom}); } el.style.zoom=z; }
  function inTab(n){ return !!(n&&n.node&&n.node.closest&&n.node.closest('#stvView')); }
  function zfit(n,force){
    var it=n&&n.it; if(!it||(it.c&&it.c.box)) return; if(!inTab(n)) return;
    var host, targets, base=+it.sc>0?+it.sc:1, vz=!!it.vz, w=n.node;
    if(vz){ var sp=VZ[it.vz]; if(!sp||sp.fit) return; host=w._body; if(!host) return; targets=w._node?[w._node]:[].slice.call(host.children); if(w._mir) base=1; }
    else { host=w; targets=zTargets(host);
      if(host.querySelector('.simgraph canvas')){ if(!host.classList.contains('stv-gfill')){ host.classList.add('stv-gfill'); gfSaved.push(host); } targets.forEach(function(t){ if(t.style.zoom) zset(t,''); }); return; } }
    if(!host||!targets.length||host.clientWidth<8||host.clientHeight<8) return;
    var sig=host.clientWidth+'x'+host.clientHeight;
    if(!force&&n.zs===sig&&!(host.scrollHeight>host.clientHeight+1||host.scrollWidth>host.clientWidth+1)) return;
    n.zs=sig;
    if(!vz){ host.style.paddingTop=''; host.style.paddingBottom=''; }
    fitCore(host,base,function(z){ targets.forEach(function(t){ if(vz) t.style.zoom=z; else zset(t,z); }); });
  }
  function schedFit(n){ if(n._zr) return; n._zr=requestAnimationFrame(function(){ n._zr=0; zfit(n,true); recenter(n); }); }
  window._fitContent=function(host,off){
    var t=zTargets(host);
    if(off||host.querySelector('textarea,[contenteditable="true"]')){ t.forEach(function(c){ if(c._fz){ c.style.zoom=''; c._fz=0; } }); return; }
    fitCore(host,1,function(z){ t.forEach(function(c){ c._fz=1; c.style.zoom=z===1?'':z; }); });
  };
  function recenter(n){
    if(n.zf||!inTab(n)) return;
    var nd=n.node, st=nd.style;
    var k=nd.getBoundingClientRect().width/(nd.offsetWidth||1)||1, top=Infinity, bot=-Infinity, any=false;
    [].slice.call(nd.children).forEach(function(c){ if(NOHID[c.tagName]) return; var q=getComputedStyle(c); if(q.display==='none'||q.position==='absolute'||q.position==='fixed') return; var r=c.getBoundingClientRect(); if(r.height<=0) return;
      var mo=c.hasAttribute('data-stv-m')?mvGet(c)[1]*k:0;
      any=true; top=Math.min(top,r.top-mo-Math.max(0,parseFloat(q.marginTop)||0)*k); bot=Math.max(bot,r.bottom-mo+Math.max(0,parseFloat(q.marginBottom)||0)*k); });
    var want=-1; if(any){ var slack=nd.clientHeight-(bot-top)/k; if(slack>2) want=slack/2; }
    var cur=parseFloat(st.paddingTop); if(isNaN(cur)) cur=-1;
    if(Math.abs(cur-want)<0.6) return;
    if(want<0){ st.paddingTop=''; st.paddingBottom=''; } else { st.paddingTop=want+'px'; st.paddingBottom=want+'px'; spSet.add(nd); }
  }
  var recIv=0;
  function recenterAll(){ if(document.body.classList.contains('stv-fixed')) curNodes.forEach(recenter); }
  function vzL(n){ if(!n.it.lf) return null; var v=document.getElementById('stvView'); if(!v||!v.offsetWidth) return null; var f=n.it.lf, W=v.offsetWidth, H=v.offsetHeight; return {x:f.x*W,y:f.y*H,w:Math.max(60,f.w*W),h:Math.max(40,f.h*H)}; }
  function vzSaveLf(n){ var v=document.getElementById('stvView'); if(!v||!v.offsetWidth) return; var W=v.offsetWidth,H=v.offsetHeight; n.it.lf={x:n.l.x/W,y:n.l.y/H,w:n.l.w/W,h:n.l.h/H}; }
  window.addEventListener('resize',function(){ if(!shown||!curNodes.length) return; curNodes.forEach(function(n){ var l=vzL(n); if(l){ n.l=l; place(n); } zfit(n); }); });
  function place(n){ var st=n.node.style; st.left=n.l.x+'px'; st.top=n.l.y+'px'; st.width=n.l.w+'px'; st.height=n.l.h+'px'; }
  function startOp(e,n,ed){
    if(lockedNow()) return;
    var v=document.getElementById('stvView'), vr=v.getBoundingClientRect(), z=(vr.width/(v.offsetWidth||1))||1, W=v.offsetWidth, H=v.offsetHeight, TH=8, GR=10, MINW=120, MINH=50;
    var o={x:n.l.x,y:n.l.y,w:n.l.w,h:n.l.h}, sx=e.clientX, sy=e.clientY, on=false, pid=e.pointerId;
    var cx=[0,W], cy=[0,H]; curNodes.forEach(function(m){ if(m!==n){ cx.push(m.l.x,m.l.x+m.l.w); cy.push(m.l.y,m.l.y+m.l.h); } });
    function sn(val,c){ var best=null; c.forEach(function(k){ if(Math.abs(k-val)<=TH&&(best===null||Math.abs(k-val)<Math.abs(best-val))) best=k; }); return best!==null?best:Math.round(val/GR)*GR; }
    function mv(ev){
      if(ev.pointerId!==pid) return;
      if(ev.pointerType==='mouse'&&ev.buttons===0){ up(ev); return; }
      var dx=(ev.clientX-sx)/z, dy=(ev.clientY-sy)/z;
      if(!on){ if(Math.abs(dx)+Math.abs(dy)<5) return; on=true; document.body.style.userSelect='none'; document.body.classList.add('stv-op'); setCur(ed,true); }
      var l;
      if(!ed){
        var x=o.x+dx, y=o.y+dy, ax=sn(x,cx), bx=sn(x+o.w,cx), ay=sn(y,cy), by=sn(y+o.h,cy);
        var nx=Math.abs(ax-x)<=Math.abs(bx-(x+o.w))?ax:bx-o.w, ny=Math.abs(ay-y)<=Math.abs(by-(y+o.h))?ay:by-o.h;
        l={x:Math.max(0,nx),y:Math.max(0,ny),w:o.w,h:o.h};
      } else {
        var L=o.x, T=o.y, R=o.x+o.w, B=o.y+o.h;
        if(ed.indexOf('e')>=0) R=Math.max(L+MINW,sn(R+dx,cx));
        if(ed.indexOf('w')>=0) L=Math.min(R-MINW,Math.max(0,sn(L+dx,cx)));
        if(ed.indexOf('s')>=0) B=Math.max(T+MINH,sn(B+dy,cy));
        if(ed.indexOf('n')>=0) T=Math.min(B-MINH,Math.max(0,sn(T+dy,cy)));
        l={x:L,y:T,w:R-L,h:B-T};
      }
      n.l=l; place(n); recenter(n); schedFit(n);
    }
    function up(ev){
      if(ev.pointerId!==undefined&&ev.pointerId!==pid) return;
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',up); document.removeEventListener('pointercancel',up);
      document.body.style.userSelect=''; document.body.classList.remove('stv-op'); setCur('');
      if(!on) return;
      var swc=function(ev){ ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click',swc,true); setTimeout(function(){ document.removeEventListener('click',swc,true); },0);
      zfit(n,true); n.it.l={x:n.l.x,y:n.l.y,w:n.l.w,h:n.l.h}; vzSaveLf(n); var gr=cur(), sb=gr&&shown&&findSub(gr,shown); if(sb) touch(sb);
    }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up);
  }
  function hideSub(){
    if(!shown&&!moved.length) return;
    endVisual(); vzRestore(); stopMirrors(); clearInterval(recIv); omitted.forEach(function(e){ e.classList.remove('stv-omit'); }); omitted=[];
    hiddenSaved.slice().reverse().forEach(function(h){ h.el.style.display=h.prev; }); hiddenSaved=[];
    mvClear(); rzClear(); gfSaved.forEach(function(h){ h.classList.remove('stv-gfill'); }); gfSaved=[];
    spSaved.slice().reverse().forEach(function(h){ h.el.style[h.prop]=h.prev; }); spSaved=[]; spSet=new Set();
    scSaved.slice().reverse().forEach(function(h){ h.el.style.zoom=h.prev; h.el._zsv=0; }); scSaved=[];
    laid.forEach(function(l){ if(l.css==null) l.node.removeAttribute('style'); else l.node.setAttribute('style',l.css); }); laid=[]; curNodes=[];
    
    moved.slice().reverse().forEach(function(m){
      m.el.removeAttribute('data-stv-i');
      if(!m.ph){ if(m.el.parentNode) m.el.parentNode.removeChild(m.el); return; }
      unisolate(m.el,m.saved);
      if(m.ph.parentNode) m.ph.parentNode.replaceChild(m.el,m.ph);
      else (secEl(m.sx)||hostEl()||document.body).appendChild(m.el);
    });
    moved=[];
    [].slice.call(document.querySelectorAll('.stv-gfill,.stv-omit,[data-stv-r],[data-stv-m]')).forEach(function(e){ if(e.closest&&e.closest('#stvView')) return; e.classList.remove('stv-gfill','stv-omit'); e.removeAttribute('data-stv-r'); e.removeAttribute('data-stv-m'); });
    var v=document.getElementById('stvView'); if(v){ v.innerHTML=''; v.classList.remove('stv-fixed'); v.style.height=''; v.style.top=''; }
    document.body.classList.remove('stv-on','stv-fixed','stv-nosb'); shown=null;
  }

  function closeMenu(){ if(menuEl){ if(menuEl.parentNode) menuEl.parentNode.removeChild(menuEl); menuEl=null; } }
  function openMenu(x,y,items){
    closeMenu();
    var m=document.createElement('div'); m.className='sx-ctx'; m.setAttribute('role','menu');
    items.forEach(function(it){
      if(it.sep){ var sp=document.createElement('div'); sp.style.cssText='height:0;margin:5px 6px;border-top:1px solid var(--muted);opacity:.6;pointer-events:none'; sp.setAttribute('role','separator'); m.appendChild(sp); return; }
      if(it.head){ var hh=document.createElement('div'); hh.style.cssText='padding:4px 8px 2px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);pointer-events:none'; hh.textContent=it.head; m.appendChild(hh); return; }
      var d=document.createElement('div'); d.className='sx-ctx-item'; d.setAttribute('role','menuitem'); d.textContent=it.label;
      if(it.sub){
        d.insertAdjacentHTML('beforeend','&nbsp;&nbsp;<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>'); d.style.justifyContent='space-between';
        var fly=null, openFly=function(){
          if(fly) return; fly=document.createElement('div'); fly.className='sx-ctx'; fly.style.cssText='position:absolute;left:100%;top:-3px;max-height:70vh;overflow:auto;min-width:250px';
          it.sub.forEach(function(s){
            if(s.sep){ var sp2=document.createElement('div'); sp2.className='sx-ctx-sep'; fly.appendChild(sp2); return; }
            if(s.head){ var h2=document.createElement('div'); h2.style.cssText='padding:4px 8px 2px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);pointer-events:none'; h2.textContent=s.head; fly.appendChild(h2); return; }
            var e2=document.createElement('div'); e2.className='sx-ctx-item'; e2.textContent=s.label; e2.addEventListener('click',function(ev){ ev.stopPropagation(); closeMenu(); s.fn(); }); fly.appendChild(e2);
          });
          d.appendChild(fly); var zz=parseFloat(document.body.style.zoom)||1, r=fly.getBoundingClientRect(); if(r.right>window.innerWidth-4){ fly.style.left='auto'; fly.style.right='100%'; }
          fly.style.maxHeight=Math.floor((window.innerHeight-16)/zz)+'px'; r=fly.getBoundingClientRect();
          var dy=0; if(r.bottom>window.innerHeight-6) dy=-(r.bottom-window.innerHeight+6); if(r.top+dy<6) dy=6-r.top;
          if(dy) fly.style.top=(-3+dy/zz)+'px';
        };
        d.addEventListener('mouseenter',openFly); d.addEventListener('click',function(ev){ ev.stopPropagation(); openFly(); });
        d.addEventListener('mouseleave',function(ev){ if(fly&&!(ev.relatedTarget&&fly.contains(ev.relatedTarget))&&!d.contains(ev.relatedTarget)){ if(fly.parentNode) fly.parentNode.removeChild(fly); fly=null; } });
        m.appendChild(d); return;
      }
      d.addEventListener('click',function(ev){ ev.stopPropagation(); closeMenu(); it.fn(); }); m.appendChild(d);
      if(it.alt){
        d.addEventListener('contextmenu',function(ev){ ev.preventDefault(); ev.stopPropagation(); closeMenu(); it.alt(); });
        var lp=null; d.addEventListener('pointerdown',function(ev){ if(ev.pointerType==='mouse'||ev.button>0) return; clearTimeout(lp); lp=setTimeout(function(){ d._lp=1; closeMenu(); it.alt(); },600); });
        ['pointerup','pointercancel','pointermove'].forEach(function(t){ d.addEventListener(t,function(){ clearTimeout(lp); }); });
      }
    });
    document.body.appendChild(m); menuEl=m;
    var z=parseFloat(document.body.style.zoom)||1, px=Math.min(x,window.innerWidth-m.offsetWidth*z-4), py=Math.min(y,window.innerHeight-m.offsetHeight*z-4);
    m.style.left=(Math.max(0,px)/z)+'px'; m.style.top=(Math.max(0,py)/z)+'px';
  }
  document.addEventListener('mousedown',function(e){ if(menuEl&&!(e.target.closest&&e.target.closest('.sx-ctx'))) closeMenu(); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeMenu(); });
  function modal(title,bodyEl,buttons){
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
    var box=document.createElement('div'); box.className='ds-pop';
    box.style.cssText='background:var(--card);border:1px solid #555;border-radius:8px;padding:16px 18px;width:min(420px,92vw);max-height:90vh;display:flex;flex-direction:column;color:var(--x-ddd,#ddd);font:13px/1.45 sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.6)';
    var t=document.createElement('div'); t.style.cssText='font-weight:600;letter-spacing:1px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);text-transform:uppercase'; t.textContent=title; box.appendChild(t);
    box.appendChild(bodyEl);
    var row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap'; box.appendChild(row);
    function close(){ document.removeEventListener('keydown',onKey,true); if(ov.parentNode) ov.parentNode.removeChild(ov); }
    function onKey(e){ if(e.key==='Escape'){ e.stopPropagation(); close(); if(opts.onCancel) opts.onCancel(); } }
    var opts={};
    buttons.forEach(function(b){
      var el=document.createElement('button'); el.type='button'; el.className='vbtn '+(b.cls||'btn-gray'); el.textContent=b.label;
      el.addEventListener('click',function(){ if(b.fn&&b.fn(close)===false) return; if(!b.keep) close(); if(b.cancel&&opts.onCancel) opts.onCancel(); });
      row.appendChild(el);
    });
    ov.appendChild(box); document.body.appendChild(ov); document.addEventListener('keydown',onKey,true);
    return {close:close,opts:opts};
  }
  function field(label,el,hint){
    var d=document.createElement('div'); d.style.cssText='display:flex;flex-direction:column;gap:4px';
    var l=document.createElement('div'); l.style.cssText='font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)'; l.textContent=label; d.appendChild(l); d.appendChild(el);
    if(hint){ var h=document.createElement('div'); h.style.cssText='font-size:10px;color:var(--muted)'; h.textContent=hint; d.appendChild(h); }
    return d;
  }
  function toggleRow(label,hint,on){
    var d=document.createElement('div'); d.style.cssText='display:flex;flex-direction:column;gap:3px';
    var r=document.createElement('label'); r.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:11px;letter-spacing:1px;text-transform:uppercase';
    var sp=document.createElement('span'); sp.textContent=label; var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=!!on; r.appendChild(sp); r.appendChild(cb); d.appendChild(r);
    var h=document.createElement('div'); h.style.cssText='font-size:10px;color:var(--muted)'; h.textContent=hint; d.appendChild(h);
    return {el:d,cb:cb};
  }

  function subDialog(g,sub){
    var isNew=!sub, x=sub?JSON.parse(JSON.stringify(sub)):{id:newSubId(),name:'New Tab',scroll:false,m2:1,global:false,oscp:false,noscroll:true,items:[]};
    var body=document.createElement('div'); body.style.cssText='display:flex;flex-direction:column;gap:12px';
    var nm=document.createElement('input'); nm.type='text'; nm.maxLength=40; nm.value=x.name; nm.style.cssText='width:100%;box-sizing:border-box;font-size:13px';
    var op=document.createElement('select'); op.style.cssText='width:100%;font-size:12px;padding:3px 5px';
    op.innerHTML='<option value="scroll">SCROLL</option><option value="fixed">STATIONARY</option>'; op.value=x.scroll?'scroll':'fixed';
    var tg=toggleRow('Save as global','',x.global);
    var to=toggleRow('Save to OSCP','',x.oscp);
    var nsb=toggleRow("Don't show scrollbars",'',x.noscroll);
    var lkl=toggleRow('Lock layout','',x.locked);
    body.appendChild(field('Tab name',nm));
    body.appendChild(field('Tab option',op,''));
    body.appendChild(tg.el); body.appendChild(to.el); body.appendChild(nsb.el); body.appendChild(lkl.el);
    var btns=[{label:'CANCEL'}];
    if(!isNew&&!sub.perm) btns.push({label:'DELETE TAB',cls:'btn-red',keep:true,fn:function(close){
      _dsDialog({title:'Delete tab',msg:'Delete "'+x.name+'"?'+(sub.global?' It is a global tab and will disappear from every preset.':''),ok:'DELETE'}).then(function(ok){
        if(!ok) return; close();
        var wasShown=(shown===sub.id); removeFromLists(g,sub); if(sub.global) saveGlobal(); touch(sub);
        if(wasShown) activate(g.id,'editor'); else render();
      }); return false; }});
    btns.push({label:'SAVE AS .OSCTAB',keep:true,fn:function(){
      var nme=(nm.value||'').trim()||'Tab', d={v:1,type:'osctab',tab:{name:nme,m2:1,scroll:(op.value==='scroll'),noscroll:nsb.cb.checked,locked:lkl.cb.checked,items:x.items}};
      var url=URL.createObjectURL(new Blob([JSON.stringify(d,null,1)],{type:'application/json'})), a=document.createElement('a');
      a.href=url; a.download=nme.replace(/[\\/:*?"<>|]+/g,'_')+'.osctab'; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); if(a.parentNode) a.parentNode.removeChild(a); },500); return false; }});
    btns.push({label:isNew?'CREATE':'SAVE',cls:'btn-accent',fn:function(){
      x.m2=1; x.name=(nm.value||'').trim()||'Tab'; x.scroll=(op.value==='scroll'); x.global=tg.cb.checked; x.oscp=to.cb.checked; x.noscroll=nsb.cb.checked; x.locked=lkl.cb.checked; if(sub&&sub.perm){ x.perm=1; x.global=true; x.oscp=false; }
      var prev=sub; putSub(g,x);
      if(prev&&(prev.global!==x.global||prev.oscp!==x.oscp)) touch(prev);
      if(isNew||shown===x.id) activate(g.id,'sub:'+x.id); else render();
    }});
    modal(isNew?'New subtab':'Edit subtab',body,btns);
    setTimeout(function(){ nm.focus(); nm.select(); },30);
  }

  var pickBar=null;
  function endPick(){
    if(!pick) return;
    pick=null; document.body.classList.remove('stv-pick');
    document.removeEventListener('mouseover',pOver,true); document.removeEventListener('click',pClick,true);
    Array.prototype.forEach.call(document.querySelectorAll('.stv-hl'),function(e){ e.classList.remove('stv-hl'); });
    if(pickBar&&pickBar.parentNode) pickBar.parentNode.removeChild(pickBar); pickBar=null;
  }
  function secAtTarget(t){
    if(!t||!t.closest||t.closest('#docTabBar,.stv-bar,.sx-ctx')) return null;
    var s=t.closest('[data-sx]'); if(!s) return null;
    while(s.parentElement&&s.parentElement.closest('[data-sx]')) s=s.parentElement.closest('[data-sx]');
    return s.closest('.vst>.body')?s:null;
  }
  function pOver(e){
    Array.prototype.forEach.call(document.querySelectorAll('.stv-hl'),function(x){ x.classList.remove('stv-hl'); });
    var s=secAtTarget(e.target); if(s) s.classList.add('stv-hl');
  }
  function pClick(e){
    var s=secAtTarget(e.target); if(!s||!pick) return;
    e.preventDefault(); e.stopPropagation();
    var g=byId(pick.gid), sub=g&&findSub(g,pick.sid); endPick();
    if(g&&sub){ sub.items.push({sx:s.getAttribute('data-sx'),label:secTitle(s.getAttribute('data-sx')),hid:computeHidden(s)}); touch(sub); activate(g.id,'sub:'+sub.id); } else if(g) activate(g.id,'editor');
  }
  function startPick(g,sub){
    closeMenu();
    activate(g.id,'editor').then(function(){
      if(activeId!==g.id) return;
      pick={gid:g.id,sid:sub.id}; document.body.classList.add('stv-pick');
      pickBar=document.createElement('div'); pickBar.className='stv-bar';
      var tx=document.createElement('span'); tx.textContent='Click a section to add it to "'+sub.name+'"';
      var cb=document.createElement('button'); cb.type='button'; cb.className='vbtn btn-gray'; cb.textContent='CANCEL';
      cb.addEventListener('click',function(){ endPick(); activate(g.id,'sub:'+sub.id); });
      pickBar.appendChild(tx); pickBar.appendChild(cb); document.body.appendChild(pickBar);
      document.addEventListener('mouseover',pOver,true); document.addEventListener('click',pClick,true);
    });
  }
  function meaningful(c){
    if(SKIPT[c.tagName]||c.classList.contains('stv-ph')||c.classList.contains('sx-ctl')) return false;
    var hasTxt=!!(c.textContent||'').trim(), hasCtl=!!c.querySelector('canvas,input,select,button,svg,img,textarea,details')||/^(CANVAS|INPUT|SELECT|BUTTON|SVG|IMG|TEXTAREA)$/i.test(c.tagName);
    if(!hasTxt&&!hasCtl) return false;
    if(!hasTxt&&getComputedStyle(c).display==='none') return false;
    return true;
  }
  function labelOf(el,kids){
    var HEAD='.sec-title,summary,.simgraph-head,legend,h1,h2,h3,h4,label';
    var h=el.matches(HEAD)?el:Array.prototype.find.call(el.children,function(c){ return c.matches(HEAD); });
    var t=h?clean(h.textContent):'';
    if(!t&&el.classList.contains('simgraph-grid')) t='Graphs';
    if(!t&&kids&&kids.length>=2){ var k0=kids[0].el; t=(k0.matches('.sec-title')||k0.querySelector('.sec-title'))?kids[0].label:'Group: '+kids[0].label+' + '+(kids.length-1)+' more'; }
    if(!t&&!(kids&&kids.length)){ var q=el.querySelector(HEAD); t=q?clean(q.textContent):clean(el.textContent); }
    if(!t) t=el.id||el.tagName.toLowerCase();
    return t.length>46?t.slice(0,45)+'\u2026':t;
  }
  var nodeCount=0;
  function sxOf(e){ return e.getAttribute('data-sx')||e.getAttribute('data-stv-sx'); }
  function mkNode(el,p,depth,isRoot,isTitle){
    var n={el:el,p:p,depth:depth,checked:true,kids:[],label:''};
    nodeCount++;
    var leaf=!isTitle&&LEAFC.some(function(c){ return el.classList.contains(c); });
    if(!leaf&&depth<14&&nodeCount<4000){
      Array.prototype.forEach.call(el.children,function(c,i){
        if(el.tagName==='DETAILS'&&c.tagName==='SUMMARY') return;
        if(!meaningful(c)) return;
        var tt=isRoot&&c.classList.contains('sec-title');
        n.kids.push(mkNode(c,p.concat([i]),depth+1,false,tt));
      });
      if(!isTitle){
        while(n.kids.length===1&&n.kids[0].kids.length) n.kids=n.kids[0].kids;
        if(n.kids.length<2) n.kids=[];
      }
    }
    n.label=isRoot?secTitle(sxOf(el)):(isTitle?'Title: '+secTitle(sxOf(el.parentElement)):labelOf(el,n.kids));
    return n;
  }
  function stateOf(n){ if(!n.kids.length) return n.checked?1:0; var a=n.kids.map(stateOf); return a.every(function(v){return v===1;})?1:a.every(function(v){return v===0;})?0:0.5; }
  function setDown(n,v){ n.checked=v; n.kids.forEach(function(k){ setDown(k,v); }); }
  function paint(n){ var st=stateOf(n); n.cb.checked=(st===1); n.cb.indeterminate=(st===0.5); n.kids.forEach(paint); }
  function covers(a,b){
    if(a.sx!==b.sx) return false; if(!a.p) return true; if(!b.p) return false;
    if(a.p.length>b.p.length) return false;
    return a.p.every(function(v,i){ return v===b.p[i]; });
  }
  function addItems(sub,list){
    list.forEach(function(n){
      if(sub.items.some(function(o){ return covers(o,n); })) return;
      sub.items=sub.items.filter(function(o){ return !covers(n,o); });
      sub.items.push(n);
    });
  }
  function arrSvg(open){ return '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" style="display:block;transform:rotate('+(open?90:0)+'deg)"><path d="M5 2.5l7 5.5-7 5.5z"/></svg>'; }
  function partsDialog(g,sub,secElm){
    var sx=secElm.getAttribute('data-sx'); nodeCount=0;
    var root=mkNode(secElm,[],0,true);
    var body=document.createElement('div'); body.style.cssText='display:flex;flex-direction:column;gap:8px;min-height:0';
    var info=document.createElement('div'); info.style.cssText='font-size:11px;color:var(--muted)';
    info.textContent=root.kids.length?'':'This section is added as a whole.'; if(!root.kids.length) info.style.display='';  else info.style.display='none';
    var list=document.createElement('div'); list.style.cssText='overflow:auto;max-height:52vh;border:1px solid var(--border);border-radius:3px;padding:6px 8px;background:var(--inset)';
    body.appendChild(info); body.appendChild(list);
    function build(n,parent,open){
      var row=document.createElement('div'); row.className='stv-row'; row.style.paddingLeft=(n.depth*16)+'px';
      var arr=document.createElement('span'); arr.className='stv-arr'; arr.innerHTML=n.kids.length?arrSvg(open):'';
      var cb=document.createElement('input'); cb.type='checkbox'; n.cb=cb;
      var lb=document.createElement('span'); lb.textContent=n.label; lb.style.cssText='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'; lb.title=n.label;
      row.appendChild(arr); row.appendChild(cb); row.appendChild(lb);
      if(n.kids.length){ var ct=document.createElement('span'); ct.className='stv-cnt'; ct.textContent=n.kids.length+' parts'; row.appendChild(ct); }
      parent.appendChild(row);
      var holder=document.createElement('div'); holder.style.display=open?'block':'none'; parent.appendChild(holder);
      n.kids.forEach(function(k){ build(k,holder,false); });
      arr.addEventListener('click',function(){ if(!n.kids.length) return; var o=holder.style.display==='none'; holder.style.display=o?'block':'none'; arr.innerHTML=arrSvg(o); });
      lb.addEventListener('click',function(){ if(n.kids.length) arr.click(); });
      cb.addEventListener('change',function(){ setDown(n,cb.checked); paint(root); });
    }
    build(root,list,true); paint(root);
    function emit(n,out){ if(stateOf(n)===1){ out.push(n); return; } n.kids.forEach(function(k){ emit(k,out); }); }
    var dlg=modal('Add section: '+root.label,body,[
      {label:'CANCEL',cancel:true},
      {label:'ADD',cls:'btn-accent',fn:function(){
        var items;
        if(stateOf(root)===1) items=[{sx:sx,label:root.label}];
        else { var out=[]; emit(root,out); if(!out.length){ return false; } items=out.map(function(n){ var o={sx:sx,p:n.p,label:n.label}; if(n.el.id) o.id=n.el.id; return o; }); }
        addItems(sub,items); touch(sub); activate(g.id,'sub:'+sub.id);
      }}
    ]);
    dlg.opts.onCancel=function(){ activate(g.id,'sub:'+sub.id); };
  }

  var omitted=[], vis=null, hiddenSaved=[], spSaved=[], spSet=new Set();
  function spEl(sec,en){ if(!en.p.length) return sec; if(en.id){ var q=document.getElementById(en.id); if(q&&sec.contains(q)) return q; } var n=sec; for(var i=0;i<en.p.length&&n;i++) n=n.children[en.p[i]]; return n; }
  var mvSaved=[], mvMap={}, mvN=0, mvStyle=null;
  function mvFlush(){ if(!mvStyle){ mvStyle=document.createElement('style'); mvStyle.id='stvMvStyle'; document.head.appendChild(mvStyle); } mvStyle.textContent=Object.keys(mvMap).map(function(id){ return '[data-stv-m="'+id+'"]{translate:'+mvMap[id][0]+'px '+mvMap[id][1]+'px !important}'; }).join('\n'); }
  function mvSet(el,x,y){ var id=el.getAttribute('data-stv-m'); if(!id){ id=String(++mvN); el.setAttribute('data-stv-m',id); mvSaved.push(el); } mvMap[id]=[x,y]; mvFlush(); }
  var rzMap={}, rzN=0, rzSaved=[], rzStyle=null;
  function rzFlush(){ if(!rzStyle){ rzStyle=document.createElement('style'); rzStyle.id='stvRzStyle'; document.head.appendChild(rzStyle); } rzStyle.textContent=Object.keys(rzMap).map(function(id){ var m=rzMap[id], c=''; if(m[0]!=null) c+='width:'+m[0]+'px !important;min-width:0 !important;max-width:none !important;flex:none !important;'; if(m[1]!=null) c+='height:'+m[1]+'px !important;min-height:0 !important;max-height:none !important;'; return 'html body [data-stv-r="'+id+'"]{'+c+'box-sizing:border-box !important}'; }).join('\n'); }
  function rzSet(el,w,h){ var id=el.getAttribute('data-stv-r'); if(!id){ id=String(++rzN); el.setAttribute('data-stv-r',id); rzSaved.push(el); } rzMap[id]=[w,h]; rzFlush(); }
  function rzUnset(el){ var id=el.getAttribute('data-stv-r'); if(id){ delete rzMap[id]; el.removeAttribute('data-stv-r'); rzFlush(); } }
  function rzGet(el){ var id=el.getAttribute('data-stv-r'); return (id&&rzMap[id])||[null,null]; }
  function rzClear(){ rzSaved.forEach(function(el){ el.removeAttribute('data-stv-r'); }); rzSaved=[]; rzMap={}; if(rzStyle) rzStyle.textContent=''; }
  function applyRz(sec,list){ list.forEach(function(en){ var el=omitEl(sec,en); if(el) rzSet(el,(en.w==null||en.w<24)?null:en.w,(en.h==null||en.h<24)?null:en.h); }); }
  function mvGet(el){ var id=el.getAttribute('data-stv-m'); return (id&&mvMap[id])||[0,0]; }
  function mvClear(){ mvSaved.forEach(function(el){ el.removeAttribute('data-stv-m'); }); mvSaved=[]; mvMap={}; if(mvStyle) mvStyle.textContent=''; }
  function applyMv(sec,list){ list.forEach(function(en){ var el=omitEl(sec,en); if(el) mvSet(el,en.x,en.y); }); }
  function applySp(sec,list){ list.forEach(function(en){ var el=spEl(sec,en), prop=SPP[en.s]; if(!el||!prop) return; spSaved.push({el:el,prop:prop,prev:el.style[prop]}); spSet.add(el); el.style[prop]=en.m+'px'; }); }
  function gapAt(t,x,y){
    if(!t||!t.children||!t.children.length) return null;
    var r=t.getBoundingClientRect(), k=r.width/(t.offsetWidth||1)||1, cs=getComputedStyle(t);
    var P={pt:parseFloat(cs.paddingTop)||0,pb:parseFloat(cs.paddingBottom)||0,pl:parseFloat(cs.paddingLeft)||0,pr:parseFloat(cs.paddingRight)||0};
    var auto=curNodes.some(function(n){ return n.node===t; });
    if(!auto&&P.pt>=2&&P.pt<=48&&y<r.top+P.pt*k) return {b:t,s:'pt',amt:P.pt,box:{left:r.left,top:r.top,width:r.width,height:P.pt*k}};
    if(!auto&&P.pb>=2&&P.pb<=48&&y>r.bottom-P.pb*k) return {b:t,s:'pb',amt:P.pb,box:{left:r.left,top:r.bottom-P.pb*k,width:r.width,height:P.pb*k}};
    if(!auto&&P.pl>=2&&P.pl<=48&&x<r.left+P.pl*k) return {b:t,s:'pl',amt:P.pl,box:{left:r.left,top:r.top,width:P.pl*k,height:r.height}};
    if(!auto&&P.pr>=2&&P.pr<=48&&x>r.right-P.pr*k) return {b:t,s:'pr',amt:P.pr,box:{left:r.right-P.pr*k,top:r.top,width:P.pr*k,height:r.height}};
    var kids=[].slice.call(t.children).filter(function(c){ if(NOHID[c.tagName]||c.classList.contains('stv-omit')) return false; var q=getComputedStyle(c); if(q.display==='none'||q.position==='absolute'||q.position==='fixed') return false; var b=c.getBoundingClientRect(); return b.width>0&&b.height>0; }).map(function(c){ return {c:c,r:c.getBoundingClientRect()}; });
    var A=null,B=null;
    kids.forEach(function(o){ if(x>=o.r.left&&x<=o.r.right){ if(o.r.bottom<=y+0.5&&(!A||o.r.bottom>A.r.bottom)) A=o; if(o.r.top>=y-0.5&&(!B||o.r.top<B.r.top)) B=o; } });
    if(A&&B&&(B.r.top-A.r.bottom)/k>=1&&(B.r.top-A.r.bottom)/k<=48) return {b:B.c,s:'t',amt:(B.r.top-A.r.bottom)/k,box:{left:B.r.left,top:A.r.bottom,width:B.r.width,height:B.r.top-A.r.bottom}};
    A=B=null;
    kids.forEach(function(o){ if(y>=o.r.top&&y<=o.r.bottom){ if(o.r.right<=x+0.5&&(!A||o.r.right>A.r.right)) A=o; if(o.r.left>=x-0.5&&(!B||o.r.left<B.r.left)) B=o; } });
    if(A&&B&&(B.r.left-A.r.right)/k>=1&&(B.r.left-A.r.right)/k<=48) return {b:B.c,s:'l',amt:(B.r.left-A.r.right)/k,box:{left:A.r.right,top:B.r.top,width:B.r.left-A.r.right,height:B.r.height}};
    return null;
  }
  function bandEl(g,cls){ var d=document.createElement('div'); d.className='stv-gapband '+cls; d.style.cssText='left:'+g.box.left+'px;top:'+g.box.top+'px;width:'+g.box.width+'px;height:'+g.box.height+'px'; document.body.appendChild(d); return d; }
  var mirrors=[], mirN=0, KEEPC=['stv-omit','stv-vsel','stv-vhov','stv-vedit'];
  function stopMirrors(){ mirrors.forEach(function(m){ clearInterval(m.iv); cancelAnimationFrame(m.raf); m.stop.forEach(function(f){ f(); }); }); mirrors=[]; }
  function makeMirror(orig,sx){
    var clone=orig.cloneNode(true), k=++mirN, os=[orig].concat([].slice.call(orig.querySelectorAll('*'))), cs=[clone].concat([].slice.call(clone.querySelectorAll('*'))), map=new Map(), cans=[];
    cs.forEach(function(c,i){ map.set(c,os[i]); c.removeAttribute('id'); c.removeAttribute('for'); c.removeAttribute('data-sx'); c.removeAttribute('data-stv-i'); c.classList.remove('stv-omit'); c.classList.remove('sx-col');
      if(c.tagName==='INPUT'&&c.hasAttribute('name')) c.setAttribute('name','stvm'+k+'_'+c.getAttribute('name'));
      if(c.tagName==='CANVAS') cans.push([os[i],c]); });
    clone.setAttribute('data-stv-sx',sx);
    var m={iv:0,raf:0,stop:[]}; mirrors.push(m);
    var ph=new Set();
    function syncOne(c,o){
      var t=c.tagName;
      if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'){
        if(c.disabled!==o.disabled) c.disabled=o.disabled;
        if(document.activeElement!==c){
          if(t==='SELECT'&&c.options.length!==o.options.length) c.innerHTML=o.innerHTML;
          if(c.type==='checkbox'||c.type==='radio'){ if(c.checked!==o.checked) c.checked=o.checked; }
          else if(c.value!==o.value) c.value=o.value;
        }
      } else if(t!=='CANVAS'&&!o.firstElementChild&&c.textContent!==o.textContent) c.textContent=o.textContent;
      var keep=KEEPC.filter(function(x){ return c.classList.contains(x); }), cn=(typeof o.className==='string')?o.className.replace(/(^|\s)sx-col(?=\s|$)/g,' '):o.className;
      if(typeof cn==='string'){ var want=cn.split(/\s+/).filter(function(x){ return x&&KEEPC.indexOf(x)<0; }).concat(keep).sort().join(' '), have=c.className.split(/\s+/).filter(Boolean).sort().join(' '); if(want!==have) c.className=cn.split(/\s+/).filter(function(x){ return x&&KEEPC.indexOf(x)<0; }).concat(keep).join(' '); }
      var hid=hiddenSaved.length&&hiddenSaved.some(function(h){ return h.el===c; });
      if(!hid&&!spSet.has(c)&&!c.classList.contains('stv-omit')&&c.style.cssText!==o.style.cssText&&!(c===clone)) c.style.cssText=o.style.cssText;
    }
    function sync(){ for(var i=0;i<cs.length;i++) if(cs[i].tagName!=='CANVAS'||true) syncOne(cs[i],os[i]); }
    function frame(){
      cans.forEach(function(p){ var o=p[0], c=p[1]; if(!o.width||!o.height) return; if(c.width!==o.width) c.width=o.width; if(c.height!==o.height) c.height=o.height; try{ var g=c.getContext('2d'); g.clearRect(0,0,c.width,c.height); g.drawImage(o,0,0); }catch(e){} });
      m.raf=requestAnimationFrame(frame);
    }
    sync(); m.iv=setInterval(sync,120); m.raf=requestAnimationFrame(frame);
    function fwd(e){ var t=e.target, o=map.get(t); if(!o) return;
      if(t.type==='checkbox'||t.type==='radio') o.checked=t.checked; else if('value' in t) o.value=t.value;
      o.dispatchEvent(new Event(e.type,{bubbles:true,cancelable:true})); }
    clone.addEventListener('input',fwd,true); clone.addEventListener('change',fwd,true);
    function mapPt(c,o,ev){ var r1=c.getBoundingClientRect(), r2=o.getBoundingClientRect(); return {x:r2.left+(ev.clientX-r1.left)*r2.width/(r1.width||1), y:r2.top+(ev.clientY-r1.top)*r2.height/(r1.height||1)}; }
    function send(o,ev,pt,type){
      var init={bubbles:true,cancelable:true,clientX:pt.x,clientY:pt.y,screenX:ev.screenX,screenY:ev.screenY,button:ev.button,buttons:ev.buttons,ctrlKey:ev.ctrlKey,shiftKey:ev.shiftKey,altKey:ev.altKey,metaKey:ev.metaKey,view:window};
      var E=/^pointer/.test(type)&&window.PointerEvent?PointerEvent:(type==='wheel'?WheelEvent:MouseEvent);
      if(E===PointerEvent){ init.pointerId=ev.pointerId; init.pointerType=ev.pointerType; init.isPrimary=true; }
      if(type==='wheel'){ init.deltaX=ev.deltaX; init.deltaY=ev.deltaY; init.deltaMode=ev.deltaMode; }
      o.dispatchEvent(new E(type,init));
    }
    var drag=null;
    ['pointerdown','mousedown','pointerup','mouseup','pointermove','mousemove','click','dblclick','contextmenu','wheel'].forEach(function(type){
      clone.addEventListener(type,function(e){
        var t=e.target, o=map.get(t); if(!o) return;
        if(t.tagName==='CANVAS'){
          if(type==='wheel'||type==='contextmenu') e.preventDefault();
          if(/move$/.test(type)&&drag) return;
          send(o,e,mapPt(t,o,e),type);
          if(type==='pointerdown'&&!drag){ drag={c:t,o:o}; }
          return;
        }
        if(type!=='click') return;
        if(t.closest('label')) return;
        var tag=t.tagName; if(/^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(tag)&&!(tag==='INPUT'&&/^(button|submit|reset)$/.test(t.type))) return;
        if(tag==='BUTTON'||(tag==='INPUT')) o.click(); else send(o,e,{x:e.clientX,y:e.clientY},'click');
      },true);
    });
    function dm(e){ if(!drag) return; send(drag.o,e,mapPt(drag.c,drag.o,e),e.type); }
    function du(e){ if(!drag) return; send(drag.o,e,mapPt(drag.c,drag.o,e),e.type); if(e.type==='pointerup'||e.type==='mouseup') { if(e.type==='pointerup') drag=null; } }
    ['pointermove','mousemove'].forEach(function(t){ document.addEventListener(t,dm,true); });
    ['pointerup','mouseup'].forEach(function(t){ document.addEventListener(t,du,true); });
    m.stop.push(function(){ ['pointermove','mousemove'].forEach(function(t){ document.removeEventListener(t,dm,true); }); ['pointerup','mouseup'].forEach(function(t){ document.removeEventListener(t,du,true); }); });
    return clone;
  }
  var NOHID={SCRIPT:1,STYLE:1,TEMPLATE:1,LINK:1,META:1,DATALIST:1,OPTION:1,OPTGROUP:1,SOURCE:1,TRACK:1,TITLE:1,HEAD:1};
  function computeHidden(sec){
    var out=[], had=sec.classList.contains('sx-col'); if(had) sec.classList.remove('sx-col');
    try{
      var all=sec.querySelectorAll('*');
      for(var i=0;i<all.length&&out.length<300;i++){ var el=all[i]; if(NOHID[el.tagName]||el.classList.contains('stv-omit')) continue;
        if(getComputedStyle(el).display!=='none') continue;
        var par=el.parentElement; if(par!==sec&&getComputedStyle(par).display==='none') continue;
        var p=pathOf(el,sec); if(!p||!p.length) continue; var en={p:p}; if(el.id) en.id=el.id; out.push(en); }
    } finally { if(had) sec.classList.add('sx-col'); }
    return out;
  }
  function applyHidden(sec,list){ list.forEach(function(en){ var el=omitEl(sec,en); if(el&&getComputedStyle(el).display!=='none'){ hiddenSaved.push({el:el,prev:el.style.display}); el.style.display='none'; } }); }
  function pcov(a,b){ return a.length<=b.length&&a.every(function(v,i){ return v===b[i]; }); }
  function pathOf(el,sec){ var a=[]; while(el&&el!==sec){ var par=el.parentElement; if(!par) return null; a.unshift(Array.prototype.indexOf.call(par.children,el)); el=par; } return a; }
  function omitEl(sec,en){
    var el=null; if(en.id){ var q=document.getElementById(en.id); if(q&&sec.contains(q)&&q!==sec) el=q; }
    if(!el){ var n=sec; for(var i=0;i<en.p.length&&n;i++) n=n.children[en.p[i]]; el=n; }
    return (el&&el!==sec)?el:null;
  }
  function applyOmit(sec,list){ list.forEach(function(en){ var el=omitEl(sec,en); if(el){ el.classList.add('stv-omit'); omitted.push(el); } }); }
  function dedupeOmit(list){
    return list.filter(function(a,i){ return !list.some(function(b,j){ return j!==i&&pcov(b.p,a.p)&&(b.p.length<a.p.length||j<i); }); });
  }
  function partOf(t,sec){
    var e=t; if(!e||!sec.contains(e)||e===sec) return null;
    while(e!==sec&&e.parentElement&&(e.tagName==='OPTION'||(window.SVGElement&&e instanceof SVGElement&&e.tagName.toLowerCase()!=='svg')||getComputedStyle(e).display==='inline')) e=e.parentElement;
    return e===sec?null:e;
  }
  function startVisual(g,sub,idx){
    endVisual();
    var sec=document.querySelector('[data-stv-i="'+idx+'"]'), item=sub.items[idx]; if(!sec||!item) return;
    var bar=document.createElement('div'); bar.className='stv-bar'; bar.style.display='none';
    var tx=document.createElement('span'); tx.textContent='Drag a part to move it (it snaps to other parts, hold Alt to move freely). Click a part, then press Delete (Ctrl+Backspace keeps only the selected part)';
    var db=document.createElement('button'); db.type='button'; db.className='vbtn btn-red'; db.textContent='DELETE';
    var xb=document.createElement('button'); xb.type='button'; xb.className='vbtn btn-gray'; xb.textContent='DONE';
    bar.appendChild(tx); bar.appendChild(db); bar.appendChild(xb); document.body.appendChild(bar);
    vis={sec:sec,item:item,sub:sub,sel:null,hov:null,bar:bar,tx:tx};
    document.body.classList.add('stv-vis'); sec.classList.add('stv-vedit');
    function clr(k){ if(vis&&vis[k]){ vis[k].classList.remove(k==='sel'?'stv-vsel':'stv-vhov'); vis[k]=null; if(k==='sel'&&vis.rzEl){ if(vis.rzEl.parentNode) vis.rzEl.parentNode.removeChild(vis.rzEl); vis.rzEl=null; } } }
    function clrGap(){ if(vis&&vis.gap){ if(vis.gapEl&&vis.gapEl.parentNode) vis.gapEl.parentNode.removeChild(vis.gapEl); vis.gap=null; vis.gapEl=null; } if(vis&&vis.hovEl){ if(vis.hovEl.parentNode) vis.hovEl.parentNode.removeChild(vis.hovEl); vis.hovEl=null; } }
    function delGap(){
      var g=vis.gap, B=g.b, prop=SPP[g.s], cur=parseFloat(getComputedStyle(B)[prop])||0, m=(g.s==='t'||g.s==='l')?(cur-g.amt):0, pth=pathOf(B,sec); if(!pth&&B!==sec) return;
      spSaved.push({el:B,prop:prop,prev:B.style[prop]}); spSet.add(B); B.style[prop]=m+'px';
      var en={p:pth||[],s:g.s,m:m}; if(B.id) en.id=B.id;
      item.sp=(item.sp||[]).filter(function(q){ return !(q.s===en.s&&q.p.join()===en.p.join()); }).concat([en]);
      clrGap(); tx.textContent='Click a part, then press Delete'; touch(sub); recenterAll();
    }
    function del(){
      if(vis&&vis.gap){ delGap(); return; }
      if(!vis||!vis.sel) return; var el=vis.sel, p=pathOf(el,sec); if(!p||!p.length) return; if(vis.rzEl){ if(vis.rzEl.parentNode) vis.rzEl.parentNode.removeChild(vis.rzEl); vis.rzEl=null; }
      var en={p:p}; if(el.id) en.id=el.id;
      item.omit=dedupeOmit((item.omit||[]).concat([en])); el.classList.remove('stv-vsel'); el.classList.add('stv-omit'); omitted.push(el); vis.sel=null; tx.textContent='Click a part, then press Delete';
      if(vis.hov){ vis.hov.classList.remove('stv-vhov'); vis.hov=null; } touch(sub); recenterAll(); recenterAll();
    }
    function keepOnly(){
      if(!vis||!vis.sel) return; var cur=vis.sel, add=[];
      while(cur&&cur!==sec){ var par=cur.parentElement; if(!par) break;
        Array.prototype.forEach.call(par.children,function(sib){ if(sib===cur||NOHID[sib.tagName]||sib.classList.contains('stv-omit')) return;
          var p=pathOf(sib,sec); if(!p||!p.length) return; var en={p:p}; if(sib.id) en.id=sib.id; add.push(en); sib.classList.remove('stv-vhov'); sib.classList.add('stv-omit'); omitted.push(sib); });
        cur=par; }
      item.omit=dedupeOmit((item.omit||[]).concat(add)); if(vis.hov){ vis.hov.classList.remove('stv-vhov'); vis.hov=null; } touch(sub);
      tx.textContent='Kept only the selected part';
    }
    var dragged=false;
    function rzPlace(){ var h=vis&&vis.rzEl; if(!h) return; if(!vis.sel||!document.body.contains(vis.sel)){ rzHide(); return; } var r=vis.sel.getBoundingClientRect(); h.style.left=(r.right-6)+'px'; h.style.top=(r.bottom-6)+'px'; }
    function rzHide(){ if(vis&&vis.rzEl){ if(vis.rzEl.parentNode) vis.rzEl.parentNode.removeChild(vis.rzEl); vis.rzEl=null; } }
    function rzShow(){
      rzHide(); if(!vis||!vis.sel||sub.locked) return;
      var el=vis.sel, h=document.createElement('div'); h.className='stv-rzh'; h.title='Drag to resize (double-click to reset, Shift keeps the shape)'; document.body.appendChild(h); vis.rzEl=h; rzPlace();
      h.addEventListener('dblclick',function(e){ e.preventDefault(); e.stopPropagation(); var pth=pathOf(el,sec); rzUnset(el); if(pth){ item.rz=(item.rz||[]).filter(function(q){ return q.p.join()!==pth.join(); }); if(!item.rz.length) delete item.rz; } touch(sub); recenterAll(); rzPlace(); });
      h.addEventListener('pointerdown',function(e){
        if(e.button>0) return; e.preventDefault(); e.stopPropagation();
        var r0=el.getBoundingClientRect(), Z=(sec.getBoundingClientRect().width/(sec.offsetWidth||1))||1, w0=r0.width/Z, h0=r0.height/Z, sx=e.clientX, sy=e.clientY, pid=e.pointerId, on=false, nw=w0, nh=h0, cur=rzGet(el);
        var sr=sec.getBoundingClientRect(), xs=[sr.right], ys=[sr.bottom], all=sec.querySelectorAll('*'), n=0, i;
        for(i=0;i<all.length&&n<250;i++){ var c=all[i]; if(c===el||el.contains(c)||c.contains(el)||NOHID[c.tagName]) continue; var q=c.getBoundingClientRect(); if(q.width<6||q.height<6) continue; xs.push(q.right); ys.push(q.bottom); n++; }
        function near(v,list,TH){ var b=null; list.forEach(function(t){ var d=t-v; if(Math.abs(d)<=TH&&(b===null||Math.abs(d)<Math.abs(b))) b=d; }); return b; }
        function mv(ev){ if(ev.pointerId!==pid) return; var dx=(ev.clientX-sx)/Z, dy=(ev.clientY-sy)/Z; if(!on){ if(Math.abs(dx)+Math.abs(dy)<3) return; on=true; document.body.style.userSelect='none'; }
          nw=Math.max(24,Math.round(w0+dx)); nh=Math.max(24,Math.round(h0+dy));
          if(ev.shiftKey){ var k=Math.max(nw/w0,nh/h0); nw=Math.round(w0*k); nh=Math.round(h0*k); }
          rzSet(el,nw,nh);
          if(!ev.altKey&&!ev.shiftKey){ var r=el.getBoundingClientRect(), bx=near(r.right,xs,6*Z), by=near(r.bottom,ys,6*Z); if(bx!==null) nw=Math.max(24,Math.round(nw+bx/Z)); if(by!==null) nh=Math.max(24,Math.round(nh+by/Z)); if(bx!==null||by!==null) rzSet(el,nw,nh); }
          rzPlace(); }
        function up(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return; document.removeEventListener('pointermove',mv,true); document.removeEventListener('pointerup',up,true); document.removeEventListener('pointercancel',up,true); document.body.style.userSelect='';
          if(!on) return; dragged=true; setTimeout(function(){ dragged=false; },0);
          var pth=pathOf(el,sec); if(!pth||!pth.length) return; var en={p:pth,w:nw,h:nh}; if(el.id) en.id=el.id;
          item.rz=(item.rz||[]).filter(function(q){ return q.p.join()!==pth.join(); }); item.rz.push(en); touch(sub); recenterAll(); rzPlace(); }
        document.addEventListener('pointermove',mv,true); document.addEventListener('pointerup',up,true); document.addEventListener('pointercancel',up,true);
      });
      if(!vis.rzIv) vis.rzIv=setInterval(rzPlace,300);
    }
    function onDown(e){
      if(!vis) return; if(bar.contains(e.target)) return;
      if(sec.contains(e.target)){
        e.preventDefault(); e.stopPropagation();
        if(e.type!=='pointerdown'||e.button>0||sub.locked) return;
        var t=e.target, el=(vis.sel&&vis.sel.contains(t))?vis.sel:partOf(t,sec); if(!el) return;
        var pth=pathOf(el,sec); if(!pth||!pth.length) return;
        var Z=(sec.getBoundingClientRect().width/(sec.offsetWidth||1))||1, cs=mvGet(el), ox=cs[0], oy=cs[1], sx=e.clientX, sy=e.clientY, pid=e.pointerId, on=false, nx=ox, ny=oy;
        var sn=null, gx=null, gy=null;
        function snapPrep(){
          var sr=sec.getBoundingClientRect(), xs=[sr.left,sr.left+sr.width/2,sr.right], ys=[sr.top,sr.top+sr.height/2,sr.bottom], all=sec.querySelectorAll('*'), n=0, i;
          for(i=0;i<all.length&&n<250;i++){ var c=all[i]; if(c===el||el.contains(c)||c.contains(el)||NOHID[c.tagName]||c.classList.contains('stv-omit')) continue;
            var r=c.getBoundingClientRect(); if(r.width<6||r.height<6) continue; var q=getComputedStyle(c); if(q.display==='none'||q.visibility==='hidden') continue;
            xs.push(r.left,r.left+r.width/2,r.right); ys.push(r.top,r.top+r.height/2,r.bottom); n++; }
          return {xs:xs,ys:ys,sr:sr};
        }
        function best(mine,targets,TH){ var b=null, at=0; mine.forEach(function(m){ targets.forEach(function(t){ var d=t-m; if(Math.abs(d)<=TH&&(b===null||Math.abs(d)<Math.abs(b))){ b=d; at=t; } }); }); return b===null?null:{d:b,at:at}; }
        function guide(g,vert,at,sr){ if(at===null){ if(g&&g.parentNode) g.parentNode.removeChild(g); return null; } if(!g){ g=document.createElement('div'); g.className='stv-snap'; document.body.appendChild(g); }
          if(vert){ g.style.left=at+'px'; g.style.top=sr.top+'px'; g.style.width='1px'; g.style.height=sr.height+'px'; } else { g.style.top=at+'px'; g.style.left=sr.left+'px'; g.style.height='1px'; g.style.width=sr.width+'px'; } return g; }
        function mv(ev){ if(ev.pointerId!==pid) return; var dx=(ev.clientX-sx)/Z, dy=(ev.clientY-sy)/Z;
          if(!on){ if(Math.abs(dx)+Math.abs(dy)<4) return; on=true; document.body.style.userSelect='none'; sn=snapPrep(); }
          nx=Math.round(ox+dx); ny=Math.round(oy+dy); mvSet(el,nx,ny);
          if(sn&&!ev.altKey){
            var r=el.getBoundingClientRect(), TH=6*Z, bx=best([r.left,r.left+r.width/2,r.right],sn.xs,TH), by=best([r.top,r.top+r.height/2,r.bottom],sn.ys,TH);
            if(bx) nx=Math.round(nx+bx.d/Z); if(by) ny=Math.round(ny+by.d/Z);
            if(bx||by) mvSet(el,nx,ny);
            gx=guide(gx,true,bx?bx.at:null,sn.sr); gy=guide(gy,false,by?by.at:null,sn.sr);
          } else { gx=guide(gx,true,null); gy=guide(gy,false,null); } }
        function up(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return;
          document.removeEventListener('pointermove',mv,true); document.removeEventListener('pointerup',up,true); document.removeEventListener('pointercancel',up,true); document.body.style.userSelect=''; gx=guide(gx,true,null); gy=guide(gy,false,null);
          if(!on) return; dragged=true; setTimeout(function(){ dragged=false; },0);
          var en={p:pth,x:nx,y:ny}; if(el.id) en.id=el.id;
          item.mv=(item.mv||[]).filter(function(q){ return q.p.join()!==pth.join(); }); if(nx||ny) item.mv.push(en); if(!item.mv.length) delete item.mv;
          touch(sub); recenterAll(); }
        document.addEventListener('pointermove',mv,true); document.addEventListener('pointerup',up,true); document.addEventListener('pointercancel',up,true);
      }
    }
    function onClick(e){
      if(!vis) return; var t=e.target; if(bar.contains(t)) return;
      if(t.closest&&t.closest('.stv-rzh')){ e.preventDefault(); e.stopPropagation(); return; }
      if(dragged){ e.preventDefault(); e.stopPropagation(); return; }
      if(sec.contains(t)){ e.preventDefault(); e.stopPropagation(); var gp=gapAt(t,e.clientX,e.clientY), prevSel=vis.sel; clr('sel'); clrGap(); if(gp){ vis.gap=gp; vis.gapEl=bandEl(gp,'stv-gapsel'); tx.textContent='Selected: space  -  press Delete'; return; } var el=partOf(t,sec); if(el&&prevSel&&el===prevSel&&prevSel.parentElement&&prevSel.parentElement!==sec&&sec.contains(prevSel.parentElement)) el=prevSel.parentElement; if(el){ vis.sel=el; el.classList.add('stv-vsel'); tx.textContent='Selected: '+labelOf(el,[])+'  -  drag to move, press Delete to remove, click again for the parent group'; rzShow(); } else tx.textContent='Drag a part to move it. Click a part, then press Delete'; return; }
      if(t.closest&&t.closest('#docTabBar,.sx-ctx,.popup-overlay')) { endVisual(); return; }
      e.preventDefault(); e.stopPropagation(); endVisual();
    }
    function onOver(e){ if(!vis||bar.contains(e.target)) return; clr('hov'); if(vis.hovEl){ if(vis.hovEl.parentNode) vis.hovEl.parentNode.removeChild(vis.hovEl); vis.hovEl=null; } var gh=sec.contains(e.target)?gapAt(e.target,e.clientX,e.clientY):null; if(gh&&!(vis.gap&&vis.gapEl&&false)){ vis.hovEl=bandEl(gh,'stv-gaphov'); return; } var el=sec.contains(e.target)?partOf(e.target,sec):null; if(el&&el!==vis.sel){ vis.hov=el; el.classList.add('stv-vhov'); } }
    function onKey(e){
      if(!vis) return;
      if(e.key==='Escape'){ e.preventDefault(); endVisual(); return; }
      if(e.ctrlKey&&(e.key==='Backspace'||e.key===' '||e.code==='Space')&&vis.sel&&!(e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))){ e.preventDefault(); e.stopPropagation(); keepOnly(); return; }
      if((e.key==='Delete'||e.key==='Backspace')&&(vis.sel||vis.gap)&&!(e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]'))){ e.preventDefault(); e.stopPropagation(); del(); }
    }
    db.addEventListener('click',function(e){ e.stopPropagation(); del(); }); xb.addEventListener('click',function(e){ e.stopPropagation(); endVisual(); });
    ['pointerdown','mousedown','touchstart'].forEach(function(t){ document.addEventListener(t,onDown,true); });
    document.addEventListener('click',onClick,true); document.addEventListener('mouseover',onOver,true); document.addEventListener('keydown',onKey,true);
    vis.off=function(){ ['pointerdown','mousedown','touchstart'].forEach(function(t){ document.removeEventListener(t,onDown,true); }); document.removeEventListener('click',onClick,true); document.removeEventListener('mouseover',onOver,true); document.removeEventListener('keydown',onKey,true); };
  }
  function endVisual(){
    if(!vis) return; var v=vis; vis=null; v.off();
    [v.gapEl,v.hovEl].forEach(function(b){ if(b&&b.parentNode) b.parentNode.removeChild(b); });
    if(v.rzEl&&v.rzEl.parentNode) v.rzEl.parentNode.removeChild(v.rzEl); clearInterval(v.rzIv);
    v.sec.classList.remove('stv-vedit'); if(v.sel) v.sel.classList.remove('stv-vsel'); if(v.hov) v.hov.classList.remove('stv-vhov');
    document.body.classList.remove('stv-vis'); if(v.bar.parentNode) v.bar.parentNode.removeChild(v.bar);
  }
  function treeDialog(g,sub,idx){
    var item=sub.items[idx], sec=document.querySelector('[data-stv-i="'+idx+'"]'); if(!item||!sec) return;
    var hid=omitted.filter(function(e){ return sec.contains(e); }); hid.forEach(function(e){ e.classList.remove('stv-omit'); });
    nodeCount=0; var root; try{ root=mkNode(sec,[],0,true); } finally { hid.forEach(function(e){ e.classList.add('stv-omit'); }); }
    var old=item.omit||[], all=[];
    (function walk(n){ all.push(n); n.kids.forEach(walk); })(root);
    (function init(n){ n.checked=!old.some(function(e){ return pcov(e.p,n.p); }); n.kids.forEach(init); })(root);
    var list=document.createElement('div'); list.style.cssText='overflow:auto;max-height:60vh;border:1px solid var(--border);border-radius:3px;padding:6px 8px;background:var(--inset)';
    function build(n,parent,open){
      var row=document.createElement('div'); row.className='stv-row'; row.style.paddingLeft=(n.depth*16)+'px';
      var arr=document.createElement('span'); arr.className='stv-arr'; arr.innerHTML=n.kids.length?arrSvg(open):'';
      var cb=document.createElement('input'); cb.type='checkbox'; n.cb=cb;
      var lb=document.createElement('span'); lb.textContent=n.label; lb.style.cssText='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'; lb.title=n.label;
      row.appendChild(arr); row.appendChild(cb); row.appendChild(lb);
      if(n.kids.length){ var ct=document.createElement('span'); ct.className='stv-cnt'; ct.textContent=n.kids.length+' parts'; row.appendChild(ct); }
      parent.appendChild(row);
      var holder=document.createElement('div'); holder.style.display=open?'block':'none'; parent.appendChild(holder);
      n.kids.forEach(function(k){ build(k,holder,false); });
      arr.addEventListener('click',function(){ if(!n.kids.length) return; var o=holder.style.display==='none'; holder.style.display=o?'block':'none'; arr.innerHTML=arrSvg(o); });
      lb.addEventListener('click',function(){ if(n.kids.length) arr.click(); });
      cb.addEventListener('change',function(){ setDown(n,cb.checked); paint(root); });
    }
    build(root,list,true); paint(root);
    function emit(n,out){ var st=stateOf(n); if(st===1) return; if(st===0&&n.p.length){ var en={p:n.p.slice()}; if(n.el.id) en.id=n.el.id; out.push(en); return; } n.kids.forEach(function(k){ emit(k,out); }); }
    var vfit=item.vz&&VZ[item.vz]?VZ[item.vz].fit:null, scOK=!item.vz||!vfit||vfit==='sg'||vfit==='grid'||vfit==='scale';
    var wrap=document.createElement('div'); wrap.style.cssText='display:flex;flex-direction:column;gap:10px;min-height:0';
    var scv=item.sc>0?item.sc:1, sl=document.createElement('input'), sn=document.createElement('span'), sr=document.createElement('button'), srow=document.createElement('div');
    sl.type='range'; sl.min='0.5'; sl.max='3'; sl.step='0.05'; sl.value=scv; sl.style.cssText='flex:1;min-width:0';
    sn.style.cssText='width:44px;text-align:right;font-size:12px'; sn.textContent=Math.round(scv*100)+'%';
    sr.type='button'; sr.className='vbtn btn-gray'; sr.textContent='RESET';
    sl.addEventListener('input',function(){ sn.textContent=Math.round(sl.value*100)+'%'; });
    sr.addEventListener('click',function(){ sl.value=1; sn.textContent='100%'; });
    srow.style.cssText='display:flex;align-items:center;gap:8px'; srow.appendChild(sl); srow.appendChild(sn); srow.appendChild(sr);
    if(scOK) wrap.appendChild(field('Content scale',srow,'Scales the text, buttons and graph labels inside this section.'));
    else { var nt=document.createElement('div'); nt.style.cssText='font-size:10px;color:var(--muted)'; nt.textContent='Content scale is not available for this visual.'; wrap.appendChild(nt); }
    wrap.appendChild(list);
    var tb=[{label:'CANCEL'}];
    if((item.sp&&item.sp.length)||(item.mv&&item.mv.length)||(item.rz&&item.rz.length)) tb.push({label:'RESTORE SPACING / POSITIONS / SIZES',keep:false,fn:function(){ delete item.sp; delete item.mv; delete item.rz; touch(sub); activate(g.id,'sub:'+sub.id); }});
    modal('Edit section: '+root.label,wrap,tb.concat([{label:'SAVE',cls:'btn-accent',fn:function(){
      var out=[]; emit(root,out);
      var keep=old.filter(function(e){ var cov=all.filter(function(n){ return pcov(e.p,n.p); }); return !cov.length||cov.every(function(n){ return stateOf(n)===0; }); });
      var res=dedupeOmit(keep.concat(out)); if(res.length) item.omit=res; else delete item.omit;
      if(scOK){ var nv=Math.round(sl.value*100)/100; if(Math.abs(nv-1)<0.005) delete item.sc; else item.sc=nv; }
      touch(sub); activate(g.id,'sub:'+sub.id);
    }}]));
  }

  function customDialog(g,sub,item){
    var isNew=!item, c=item?JSON.parse(JSON.stringify(item.c)):{title:'',src:'',text:'',box:true};
    var body=document.createElement('div'); body.style.cssText='display:flex;flex-direction:column;gap:12px';
    var ti=document.createElement('input'); ti.type='text'; ti.maxLength=80; ti.value=c.title; ti.placeholder='Optional'; ti.style.cssText='width:100%;box-sizing:border-box;font-size:13px';
    var prev=document.createElement('img'); prev.style.cssText='max-width:100%;max-height:140px;object-fit:contain;display:'+(c.src?'block':'none');  if(c.src) prev.src=c.src;
    var fi=document.createElement('input'); fi.type='file'; fi.accept='image/*'; fi.style.display='none';
    var row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;align-items:center';
    var pick=document.createElement('button'); pick.type='button'; pick.className='vbtn btn-gray'; pick.textContent='CHOOSE IMAGE';
    var clr=document.createElement('button'); clr.type='button'; clr.className='vbtn btn-gray'; clr.textContent='REMOVE IMAGE';
    row.appendChild(pick); row.appendChild(clr); row.appendChild(fi);
    pick.addEventListener('click',function(){ fi.click(); });
    clr.addEventListener('click',function(){ c.src=''; prev.style.display='none'; prev.removeAttribute('src'); });
    fi.addEventListener('change',function(){
      var f=fi.files&&fi.files[0]; if(!f) return; var fr=new FileReader();
      fr.onload=function(){ var im=new Image(); im.onload=function(){
        var M=1200, k=Math.min(1,M/Math.max(im.width,im.height)), cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(im.width*k)); cv.height=Math.max(1,Math.round(im.height*k));
        cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);
        var png=f.type==='image/png'&&f.size<400000; c.src=cv.toDataURL(png?'image/png':'image/jpeg',0.85); prev.src=c.src; prev.style.display='block'; };
        im.src=fr.result; };
      fr.readAsDataURL(f);
    });
    var bx=toggleRow('Text box','',c.box);
    bx.el.removeChild(bx.el.lastChild);
    body.appendChild(field('Title',ti)); body.appendChild(field('Image',row)); body.appendChild(prev); body.appendChild(bx.el);
    modal(isNew?'Add custom section':'Edit custom section',body,[{label:'CANCEL'},{label:isNew?'ADD':'SAVE',cls:'btn-accent',fn:function(){
      c.title=(ti.value||'').trim(); c.box=bx.cb.checked; if(!c.src&&!c.box&&!c.title) return false;
      if(isNew){ sub.items.push({sx:'custom:'+newSubId(),label:c.title||'Custom',c:c}); }
      else { item.c=c; item.label=c.title||'Custom'; }
      touch(sub); activate(g.id,'sub:'+sub.id);
    }}]);
  }

  var vzLive=[], vzReserved=[];
  function q1(s){ return document.querySelector(s); }
  function sg(k){ return q1('.simgraph[data-key="'+k+'"]'); }
  var VZ={
    posMap:   {label:'Position Map',cat:'Spatial',w:420,h:440,el:function(){ return q1('#posMapWrap'); },fit:'square'},
    posRead:  {label:'Spatial Readouts',cat:'Spatial',w:360,h:170,el:function(){ var e=q1('#posDistanceReadout'); return e&&e.closest('.freq-display'); }},
    dispCurve:{label:'Dispersion Curve',cat:'Spatial',w:420,h:260,el:function(){ var e=q1('#dispCurveCv'); return e&&e.parentElement; },fit:'fillcv'},
    lpf:      {label:'Low-Pass Filter Curve',cat:'Spatial',w:380,h:180,el:function(){ var e=q1('#lpfCurveGraph'); return e&&e.closest('.mfn-curve-wrap'); },fit:'lpf'},
    gTorque:  {label:'Motor / Speed Torque Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('torque'); },fit:'sg',bare:1},
    gCounter: {label:'Air Resistance / Friction Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('counter'); },fit:'sg',bare:1},
    gOmega:   {label:'Angular Velocity (RPM) Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('omega'); },fit:'sg',bare:1},
    gAlpha:   {label:'Angular Acceleration Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('alpha'); },fit:'sg',bare:1},
    gVoltage: {label:'Live Voltage Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('voltage'); },fit:'sg',bare:1},
    gCurrent: {label:'Current Usage Graph',cat:'Motor & Current',w:480,h:260,el:function(){ return sg('current'); },fit:'sg',bare:1},
    gAll:     {label:'All Motor Graphs',cat:'Motor & Current',w:900,h:640,el:function(){ return q1('#simGraphGrid'); },fit:'grid',bare:1},
    wiring:   {label:'Motor Wiring Diagram',cat:'Motor & Current',w:240,h:300,el:function(){ return q1('#wiringDiagramWrap'); },fit:'scale'},
    chopper:  {label:'Chopper Diagram',cat:'Diagrams',w:460,h:330,el:function(){ return q1('#chopperDiagramSec'); },fit:'scale',own:1},
    controller:{label:'Controller',cat:'Diagrams',w:600,h:360,el:function(){ return q1('#ceInlineHost'); },fit:'ccanvas',own:1},
    ctrlCode: {label:'Controller Code',cat:'Diagrams',w:760,h:480,el:function(){ return (window._ccOpen||(window._ceIsOpen&&window._ceIsOpen()))?null:q1('#ctrlPanelFunctional'); },fit:'code'},
    preset:   {label:'Preset Information',cat:'Diagrams',w:520,h:200,el:function(){ return q1('#presetInfoSec'); },own:1},
    status:   {label:'Status Monitor (State / Voltage / Speed)',cat:'Monitors',w:520,h:90,el:function(){ return q1('.rpm-status-row'); }},
    freq:     {label:'Frequency Monitor',cat:'Monitors',w:460,h:200,el:function(){ return q1('#freqPagesContainer'); }}
  };
  var VZ_CATS=['Spatial','Motor & Current','Diagrams','Monitors'];
  function vzFit(w){
    var sp=w._vz, b=w._body, n=w._node; if(!n||!b) return;
    var bw=b.clientWidth, bh=b.clientHeight; if(bw<8||bh<8) return;
    if(sp.fit==='square'){ var s=Math.max(60,Math.min(bw,bh)-2); n.style.width=s+'px'; n.style.height=s+'px'; n.style.margin='0 auto'; }
    else if(sp.fit==='scale'){ n.style.transform=''; n.style.translate=''; n.style.marginLeft=''; n.style.width='max-content'; n.style.maxWidth='none'; n.style.overflow='visible'; n.style.flex='none'; var nw=Math.max(n.offsetWidth,n.scrollWidth)||1, nh=Math.max(n.offsetHeight,n.scrollHeight)||1, k=Math.max(.2,Math.min(bw/nw,bh/nh))*(w._sc||1); n.style.transformOrigin='0 0'; n.style.transform='scale('+k+')'; b.style.overflow='hidden'; n.style.translate=Math.max(0,(bw-nw*k)/2)+'px '+Math.max(0,(bh-nh*k)/2)+'px'; }
    else if(sp.fit==='code'){ if(window._feShow) try{ window._feShow(); }catch(e){} }
    else if(sp.fit==='ccanvas'){  }
    if(sp.fit==='sg'||sp.fit==='grid'){ if(window._simGraphsRefresh) window._simGraphsRefresh(); }
  }
  function vzScaleApply(w){
    var sc=w._sc||1, f=w._vz.fit, n=w._node; if(!n||w._mir) return;
    if(f==='sg'||f==='grid'){ n.setAttribute('data-vz-sc',sc); n.style.setProperty('--vz-sc',sc); }
    else if(!f){ n.style.zoom=sc; }
  }
  function vzPrep(w,n){
    var sp=w._vz; w._saved=n.getAttribute('style');
    if(sp.fit==='sg'){ n.classList.add('vz-sg'); }
    else if(sp.fit==='grid'){ n.classList.add('vz-grid'); }
    else if(sp.fit==='fillcv'){ n.classList.add('vz-fillcv'); }
    else if(sp.fit==='lpf'){ n.style.height='100%'; n.style.margin='0'; }
    else if(sp.fit==='code'){ n.style.display='flex'; n.style.height='100%'; }
    else if(sp.fit==='square'){ n.style.flex='none'; n.style.aspectRatio='1/1'; }
    else if(sp.fit==='ccanvas'){ n.classList.add('vz-ccv'); n.style.overflow='hidden'; }
  }
  function vzUndo(w){
    var n=w._node; if(!n) return;
    n.classList.remove('vz-sg','vz-grid','vz-fillcv','vz-ccv','sx-col'); if(w._wasCol){ n.classList.add('sx-col'); w._wasCol=0; } n.removeAttribute('data-vz-sc'); if(w._saved==null) n.removeAttribute('style'); else n.setAttribute('style',w._saved);
    if(w._vz.fit==='code'){ var C=document.getElementById('ctrlEditorOverlay'); n.style.display=(window._getControllerEditorMode&&window._getControllerEditorMode()==='functional')?'flex':'none'; }
    if(w._ph&&w._ph.parentNode) w._ph.parentNode.replaceChild(n,w._ph);
    else { var h=hostEl()||document.body; h.appendChild(n); }
    w._node=null;
  }
  function vzRestore(){
    vzLive.forEach(function(w){ if(w._ro) try{ w._ro.disconnect(); }catch(e){} if(w._mir) return; vzUndo(w); });
    vzLive=[]; if(window._simGraphsRefresh) try{ window._simGraphsRefresh(); }catch(e){}
  }
  function buildVisual(it){
    var sp=VZ[it.vz], w=document.createElement('div'); w.className='sec stv-vz'+(sp.bare?' vz-bare':'')+(sp.own?' vz-own':''); w._vz=sp; w._sc=(+it.sc>0?+it.sc:1);
    w.style.cssText='display:flex;flex-direction:column;min-width:0;min-height:0;box-sizing:border-box;padding:'+((sp.bare||sp.own)?'0':'6px')+';overflow:hidden';
    if(!sp.bare&&!sp.own){ var hd=document.createElement('div'); hd.className='sec-title vz-head'; hd.style.cssText='margin-bottom:4px;flex:0 0 auto'; hd.textContent=sp.label; w.appendChild(hd); }
    var b=document.createElement('div'); b.className='vz-body'; b.style.cssText='flex:1 1 auto;min-height:0;min-width:0;position:relative;overflow:'+(sp.fit==='code'?'auto':'hidden')+';display:flex;flex-direction:column'; w.appendChild(b); w._body=b;
    var node=null; try{ node=sp.el(); }catch(e){}
    if(!node){ var pr=vzLive.filter(function(o){ return o._vz===sp&&o._node; })[0]; if(pr) node=pr._node; }
    var taken=!!node&&(vzLive.some(function(o){ return o._node&&(o._node===node||o._node.contains(node)||node.contains(o._node)); })||vzReserved.some(function(e){ return e===node||e.contains(node)||node.contains(e); }));
    if(!node){ var m=document.createElement('div'); m.className='stv-empty'; m.style.cssText='padding:10px;color:var(--muted);font-size:11px;letter-spacing:1px'; m.textContent=sp.label+' is not available right now.'; b.appendChild(m); return w; }
    if(taken||(node.closest&&node.closest('#stvView'))){ var mc=makeMirror(node,'vz:'+it.vz); w._mir=1; w._node=null; mc.style.width='100%'; b.appendChild(mc); vzLive.push(w); return w; }
    var ph=document.createElement('span'); ph.hidden=true; node.parentNode.insertBefore(ph,node); w._ph=ph; w._node=node;
    if(node.classList.contains('sx-col')){ node.classList.remove('sx-col'); w._wasCol=1; }
    vzPrep(w,node); vzScaleApply(w); b.appendChild(node); vzLive.push(w);
    if(window.ResizeObserver){ w._ro=new ResizeObserver(function(){ vzFit(w); }); w._ro.observe(b); }
    setTimeout(function(){ vzFit(w); },30); setTimeout(function(){ vzFit(w); },300);
    return w;
  }
  function vzFree(sub,W,H,w,h){
    var rs=sub.items.filter(function(i){ return i.l; }).map(function(i){ return i.l; });
    for(var y=12;y+h<=H;y+=20) for(var x=14;x+w<=W;x+=20){
      if(!rs.some(function(r){ return x<r.x+r.w+8&&x+w+8>r.x&&y<r.y+r.h+8&&y+h+8>r.y; })) return {x:x,y:y};
    }
    var n=rs.length*24; return {x:14+n%200,y:12+n%160};
  }
  function addVisual(g,sub,id){
    var sp=VZ[id]; if(!sp) return;
    var v=document.getElementById('stvView'), W=v?v.offsetWidth:1200, H=v?v.offsetHeight:700, it={sx:'vz:'+id,label:sp.label,vz:id};
    if(!sub.scroll){ var w=Math.round(Math.min(sp.w,Math.max(170,W*.46))), h=Math.round(Math.min(sp.h,Math.max(100,H*.5))), p=vzFree(sub,W,H,w,h); it.l={x:p.x,y:p.y,w:w,h:h}; }
    if(sub.locked) return; sub.items.push(it); touch(sub); activate(g.id,'sub:'+sub.id);
  }
  function visualMenuItems(g,sub){
    var out=[];
    VZ_CATS.forEach(function(c,ci){
      if(ci) out.push({sep:true}); out.push({head:c});
      Object.keys(VZ).filter(function(k){ return VZ[k].cat===c; }).forEach(function(k){ out.push({label:VZ[k].label,fn:function(){ addVisual(g,sub,k); }}); });
    });
    return out;
  }

  function pressMenu(target,x,y){
    var g=cur(), sub=g&&shown&&findSub(g,shown); if(!sub) return;
    var part=target&&target.closest?target.closest('[data-stv-i]'):null;
    if(part){
      var i=parseInt(part.getAttribute('data-stv-i'),10);
      var ci=(i>=0&&i<sub.items.length)?sub.items[i]:null, mi=[];
      var delIt={label:'Delete',fn:function(){ if(!sub.locked&&i>=0&&i<sub.items.length){ sub.items.splice(i,1); touch(sub); showSub(sub); } }};
      var addV={label:'Add Visual',sub:visualMenuItems(g,sub)}, addS={label:'Add Section',fn:function(){ startPick(g,sub); }};
      if(sub.locked){ if(ci&&ci.c) mi.push({label:'Edit Custom Section',fn:function(){ customDialog(g,sub,ci); }}); if(ci&&!ci.c&&!ci.p&&ci.vz!=='controller'){ mi.push({label:'Edit Section (Visual)',fn:function(){ startVisual(g,sub,i); }}); mi.push({label:'Edit Section (Tree)',fn:function(){ treeDialog(g,sub,i); }}); } else if(ci&&(ci.c||ci.p)){ mi.push({label:'Resize Fields (Visual)',fn:function(){ startVisual(g,sub,i); }}); } mi.push({label:'Unlock Layout',fn:function(){ setLocked(sub,false); }}); openMenu(x,y,mi); return; }
      if(ci&&ci.c){ mi.push({label:'Edit Custom Section',fn:function(){ customDialog(g,sub,ci); }}); mi.push({label:'Resize Fields (Visual)',fn:function(){ startVisual(g,sub,i); }}); mi.push(delIt); mi.push(addV); }
      else if(ci&&!ci.p&&!ci.vz){ mi.push({label:'Edit Section (Visual)',fn:function(){ startVisual(g,sub,i); }}); mi.push({label:'Edit Section (Tree)',fn:function(){ treeDialog(g,sub,i); }}); mi.push(addV); mi.push(delIt); }
      else if(ci&&ci.vz){ if(ci.vz!=='controller'){ mi.push({label:'Edit Section (Visual)',fn:function(){ startVisual(g,sub,i); }}); mi.push({label:'Edit Section (Tree)',fn:function(){ treeDialog(g,sub,i); }}); } mi.push(delIt); mi.push(addS); mi.push(addV); }
      else { if(ci&&ci.p) mi.push({label:'Resize Fields (Visual)',fn:function(){ startVisual(g,sub,i); }}); mi.push(delIt); mi.push(addS); mi.push(addV); }
      mi.push({sep:true}); mi.push(undoItem(sub)); mi.push(redoItem(sub)); mi.push({label:'Lock Layout',fn:function(){ setLocked(sub,true); }});
      openMenu(x,y,mi);
    } else {
      if(sub.locked) openMenu(x,y,[{label:'Unlock Layout',fn:function(){ setLocked(sub,false); }},{label:'Edit Tab',fn:function(){ subDialog(g,sub); }}]);
      else openMenu(x,y,[{label:'Add Section',fn:function(){ startPick(g,sub); }},{label:'Add Custom Section',fn:function(){ customDialog(g,sub,null); }},{label:'Add Visual',sub:visualMenuItems(g,sub)},{label:'Edit Tab',fn:function(){ subDialog(g,sub); }},{sep:true},undoItem(sub),redoItem(sub),{label:'Lock Layout',fn:function(){ setLocked(sub,true); }}]);
    }
  }
  function chipMenu(gid,el){
    var g=byId(gid); if(!g) return;
    var r=el.getBoundingClientRect(), items=[];
    if(gid!==activeId) items.push({label:'Open',fn:function(){ activate(gid,'editor'); }});
    items.push({label:'New Subtab',fn:function(){ var go=function(){ subDialog(byId(gid),null); }; if(gid!==activeId) activate(gid,'editor').then(go); else go(); }});
    items.push({label:'Import Subtab',fn:function(){
      var inp=document.createElement('input'); inp.type='file'; inp.accept='.osctab,application/json'; inp.multiple=true; inp.style.display='none'; document.body.appendChild(inp);
      inp.addEventListener('change',async function(){
        var last=null;
        for(var i=0;i<inp.files.length;i++){
          try{
            var d=JSON.parse(await inp.files[i].text()), t=d&&d.tab; if(!t||!Array.isArray(t.items)) throw 0;
            var x=cleanSub({id:newSubId(),name:t.name,m2:t.m2,scroll:t.scroll!==false,noscroll:t.noscroll,locked:t.locked,items:t.items}); if(!x) throw 0;
            x.global=false; x.oscp=false; putSub(g,x); last=x;
          }catch(e){ alert('"'+inp.files[i].name+'" is not a valid .osctab file.'); }
        }
        if(inp.parentNode) inp.parentNode.removeChild(inp);
        if(last) activate(gid,'sub:'+last.id); else render();
      });
      inp.click();
    }});
    var ceShut=!g.hasCE;
    if(ceShut||subsOf(g).some(function(x){ return x.closed; })) items.push({sep:true});
    if(ceShut) items.push({label:'Controller Editor',fn:function(){ var go=function(){ openControllerEditor(); }; if(gid!==activeId) activate(gid,'editor').then(go); else go(); }});
    subsOf(g).filter(function(x){ return x.closed; }).forEach(function(x){
      var mi={label:x.name,fn:function(){ x.closed=false; touch(x); activate(gid,'sub:'+x.id); }};
      if(!x.perm) mi.alt=function(){
        _dsDialog({title:'Delete tab',msg:'Delete "'+x.name+'" permanently?',ok:'DELETE'}).then(function(yes){ if(!yes) return; removeFromLists(g,x); if(x.global) saveGlobal(); touch(x); render(); }); };
      items.push(mi);
    });
    openMenu(r.left,r.bottom+2,items);
  }
  bar.addEventListener('contextmenu',function(e){ var c=e.target.closest&&e.target.closest('.dt-chip'), grp=c&&c.closest('.dt-group'); if(!c||!grp) return; e.preventDefault(); chipMenu(parseInt(grp.getAttribute('data-gid'),10),c); });
  (function(){ var lp=null;
    bar.addEventListener('pointerdown',function(e){ var c=e.target.closest&&e.target.closest('.dt-chip'); if(!c||e.pointerType==='mouse'||e.button>0) return; var grp=c.closest('.dt-group'), x0=e.clientX,y0=e.clientY; clearTimeout(lp);
      lp=setTimeout(function(){ swallowUntil=Date.now()+700; chipMenu(parseInt(grp.getAttribute('data-gid'),10),c); },600);
      var cancel=function(ev){ if(ev&&ev.type==='pointermove'&&Math.hypot(ev.clientX-x0,ev.clientY-y0)<8) return; clearTimeout(lp); bar.removeEventListener('pointermove',cancel); bar.removeEventListener('pointerup',cancel); bar.removeEventListener('pointercancel',cancel); };
      bar.addEventListener('pointermove',cancel); bar.addEventListener('pointerup',cancel); bar.addEventListener('pointercancel',cancel); }); })();
  bar.addEventListener('contextmenu',function(e){
    var t=e.target.closest&&e.target.closest('.dt-sub'); if(!t) return;
    e.preventDefault(); if(Date.now()-lastMenuT<700) return;
    var grp=t.closest('.dt-group'), g=grp&&byId(parseInt(grp.getAttribute('data-gid'),10)), x=g&&findSub(g,t.getAttribute('data-sid'));
    if(x) subDialog(g,x);
  });
  (function(){
    var lp=null;
    bar.addEventListener('pointerdown',function(e){
      var t=e.target.closest&&e.target.closest('.dt-sub'); if(!t||e.pointerType==='mouse'||e.button>0) return;
      var x0=e.clientX,y0=e.clientY; clearTimeout(lp);
      lp=setTimeout(function(){
        lastMenuT=Date.now(); swallowUntil=Date.now()+700;
        var grp=t.closest('.dt-group'), g=grp&&byId(parseInt(grp.getAttribute('data-gid'),10)), x=g&&findSub(g,t.getAttribute('data-sid'));
        if(x) subDialog(g,x);
      },600);
      var cancel=function(ev){ if(ev&&ev.type==='pointermove'&&Math.hypot(ev.clientX-x0,ev.clientY-y0)<8) return; clearTimeout(lp); bar.removeEventListener('pointermove',cancel); bar.removeEventListener('pointerup',cancel); bar.removeEventListener('pointercancel',cancel); };
      bar.addEventListener('pointermove',cancel); bar.addEventListener('pointerup',cancel); bar.addEventListener('pointercancel',cancel);
    });
  })();

  (function(){
    bar.addEventListener('pointerdown',function(e){
      var t=e.target.closest&&e.target.closest('.dt-sub'); if(!t||e.pointerType==='touch'||e.button>0) return;
      var grp=t.closest('.dt-group'), g=grp&&byId(parseInt(grp.getAttribute('data-gid'),10)); if(!g) return;
      var x0=e.clientX, on=false;
      function mv(ev){
        if(!on){ if(Math.abs(ev.clientX-x0)<6) return; on=true; t.style.opacity='.55'; t.style.cursor='grabbing'; }
        var sibs=Array.prototype.slice.call(grp.querySelectorAll('.dt-sub'));
        for(var i=0;i<sibs.length;i++){ var o=sibs[i]; if(o===t) continue; var r=o.getBoundingClientRect(), mid=r.left+r.width/2, ti=sibs.indexOf(t);
          if(i<ti&&ev.clientX<mid){ o.parentNode.insertBefore(t,o); break; }
          if(i>ti&&ev.clientX>mid){ o.parentNode.insertBefore(t,o.nextSibling); } }
      }
      function up(){
        window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up);
        if(!on) return; swallowUntil=Date.now()+300;
        g.subOrder=Array.prototype.map.call(grp.querySelectorAll('.dt-sub'),function(n){ return n.getAttribute('data-sid'); });
        render();
      }
      window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
    });
  })();

  function openControllerEditor(){ var g=cur(); if(!g) return; g.hasCE=true; return activate(g.id,'ceditor'); }
  function closeCE(id){
    var g=byId(id); if(!g) return;
    if(id===activeId) ceHide();
    g.hasCE=false; g.view='editor'; render();
  }
  function closeRecordTab(id){
    var g=byId(id); if(!g) return;
    if(id===activeId && overlayActive()) recHide();
    g.hasRecord=false; g.view='editor'; render();
  }

  function render(){
    var h='';
    groups.forEach(function(g){
      var isA=g.id===activeId, md=isA?curModified():g.modified;
      h+='<div class="dt-group" data-gid="'+g.id+'" style="--gc:'+g.color+'">'+
        '<div class="dt-chip" data-act="chip" title="'+esc(g.name)+(md?' (unsaved changes)':'')+' - click for options">'+esc(g.name)+(md?'*':'')+'</div>'+
        '<div class="dt-tab'+(isA&&g.view==='editor'?' active':'')+'" data-act="editor">Siren Editor'+
          (groups.length>1?'<span class="dt-x" data-act="close" title="Close this file"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span>':'')+'</div>'+
        (g.hasCE?'<div class="dt-tab'+(isA&&g.view==='ceditor'?' active':'')+'" data-act="ceditor">Controller Editor<span class="dt-x" data-act="closece" title="Close Controller Editor"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span></div>':'')+
        (g.hasRecord?'<div class="dt-tab'+(isA&&g.view==='record'?' active':'')+'" data-act="record">Record Mode<span class="dt-x" data-act="closerec" title="Close Record Mode"><svg class="si" aria-hidden="true"><use href="#si-x"/></svg></span></div>':'')+
        subTabsHtml(g,isA)+
      '</div>';
    });
    h+='<button type="button" id="dtAdd" title="New tab (default preset)"><svg class="si" aria-hidden="true"><use href="#si-plus"/></svg></button>';
    bar.innerHTML=h;
    schedulePersist();
  }
  bar.addEventListener('click',function(e){
    if(e.target.id==='dtAdd'){ addDefaultTab(); return; }
    var el=e.target.closest('[data-act]'), grp=e.target.closest('.dt-group'); if(!el||!grp) return;
    var id=parseInt(grp.getAttribute('data-gid'),10), act=el.getAttribute('data-act');
    e.stopPropagation();
    if(Date.now()<swallowUntil) return;
    if(act==='chip'){ chipMenu(id,el); return; }
    if(act==='sub'){ activate(id,'sub:'+el.getAttribute('data-sid')); return; }
    if(act==='closesub'){ var gg=byId(id), sid=el.parentElement.getAttribute('data-sid'), xs=gg&&findSub(gg,sid); if(!xs) return; xs.closed=true; touch(xs);
      if(id===activeId&&gg.view==='sub:'+sid) activate(id,'editor'); else render(); return; }
    if(act==='close') closeGroup(id);
    else if(act==='closerec') closeRecordTab(id);
    else if(act==='closece') closeCE(id);
    else activate(id,act==='record'?'record':act==='ceditor'?'ceditor':'editor');
  });
  function wireRecord(){
    var bRec=document.getElementById('btnRecordMode'), bNorm=document.getElementById('btnNormalMode');
    if(!bRec||!bNorm){ setTimeout(wireRecord,300); return; }
    bRec.addEventListener('click',function(){ if(internal) return; var g=cur(); if(!g) return; ceHide(); g.hasRecord=true; g.view='record'; render(); });
    bNorm.addEventListener('click',function(){ if(internal) return; var g=cur(); if(!g) return; g.hasRecord=false; g.view='editor'; render(); });
  }
  wireRecord();

  setInterval(function(){
    var g=cur(); if(!g || busy) return;
    var nm=modelName()||g.fileName, md=curModified();
    if(nm!==g.name || md!==g._md){ g.name=nm; g._md=md; render(); }
  },400);
  render();
  (function(){
    var o=document.getElementById('recordOverlay'); if(!o) return;
    function sync(){ document.body.classList.toggle('dt-rec', o.classList.contains('active')); }
    new MutationObserver(sync).observe(o,{attributes:true,attributeFilter:['class']}); sync();
  })();
  var restoring=true, saving=false, persistT=null, TDB='sirenosc-tabs', TST='s', TKEY='session';
  function tdb(){ return new Promise(function(res,rej){ if(!window.indexedDB) return rej(new Error('no indexedDB'));
    var r=indexedDB.open(TDB,1); r.onupgradeneeded=function(){ r.result.createObjectStore(TST); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }
  function tdbGet(){ return tdb().then(function(db){ return new Promise(function(res,rej){ var q=db.transaction(TST,'readonly').objectStore(TST).get(TKEY); q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ rej(q.error); }; }); }); }
  function tdbSet(v){ return tdb().then(function(db){ return new Promise(function(res,rej){ var tx=db.transaction(TST,'readwrite'); tx.objectStore(TST).put(v,TKEY); tx.oncomplete=function(){ res(); }; tx.onerror=function(){ rej(tx.error); }; }); }); }
  async function persistTabs(){
    if(restoring||saving||busy) return; saving=true;
    try{
      await snapshotActive();
      var list=groups.filter(function(g){ return g.blob; }), a=cur(), ai=list.indexOf(a);
      if(!list.length) return;
      await tdbSet({v:1,active:ai<0?0:ai,groups:list.map(function(g){ return {name:g.name,fileName:g.fileName,color:g.color,modified:!!g.modified,snap:g.snap||null,view:g.view,hasCE:!!g.hasCE,subs:g.localSubs||[],osubs:g.oscpSubs||[],so:g.subOrder||[],blob:g.blob}; })});
    }catch(e){ console.warn('Could not save open tabs',e); }
    finally{ saving=false; }
  }
  function schedulePersist(){ if(restoring) return; clearTimeout(persistT); persistT=setTimeout(persistTabs,1500); }
  var _pwTabsDone=window._pwBegin?window._pwBegin():function(){};
  async function restoreTabs(){ try{ await _restoreTabs(); } finally{ _pwTabsDone(); } }
  async function _restoreTabs(){
    var d=null; try{ d=await tdbGet(); }catch(e){ d=null; }
    if(!d||!d.groups||!d.groups.length){ restoring=false; return; }
    for(var i=0;i<100&&(typeof JSZip==='undefined'||typeof loadPreset!=='function');i++) await new Promise(function(r){ setTimeout(r,100); });
    if(typeof JSZip==='undefined'||typeof loadPreset!=='function'){ restoring=false; return; }
    var wantView='editor', a=null;
    busy=true;
    try{
      var list=d.groups.filter(function(s){ return s&&s.blob; }).map(function(s){
        return {id:nextId++,color:s.color||COLORS[colorIdx++%COLORS.length],name:s.name||'Untitled',fileName:s.fileName||s.name||'Untitled',blob:s.blob,snap:s.snap||null,modified:!!s.modified,view:'editor',hasRecord:false,hasCE:!!s.hasCE,oscpSubs:Array.isArray(s.osubs)?s.osubs:[],localSubs:Array.isArray(s.subs)?s.subs:[],subOrder:Array.isArray(s.so)?s.so:[],_md:!!s.modified,_sv:s.view}; });
      if(list.length){
        var ai=Math.min(Math.max(d.active|0,0),list.length-1); a=list[ai];
        resetSiren();
        loadTarget=a;
        await loadPreset(a.blob);
        if(a.snap && typeof presetSnapshot!=='undefined') presetSnapshot=a.snap;
        if(typeof setPresetStatus==='function') setPresetStatus(a.modified?'modified':'current');
        groups=list; activeId=a.id;
        if(a._sv==='ceditor' && a.hasCE) wantView='ceditor';
        else if(typeof a._sv==='string' && a._sv.indexOf('sub:')===0 && findSub(a,a._sv.slice(4))) wantView=a._sv;
      }
    }catch(e){ console.error('Could not restore tabs',e); }
    finally{ busy=false; restoring=false; loadTarget=null; render(); }
    if(wantView!=='editor' && a) await activate(a.id,wantView);
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ clearTimeout(persistT); persistTabs(); } });
  window.addEventListener('pagehide',function(){ clearTimeout(persistT); persistTabs(); });
  setInterval(function(){ if(document.visibilityState==='visible') persistTabs(); },6000);
  if(document.readyState==='complete') setTimeout(restoreTabs,400); else window.addEventListener('load',function(){ setTimeout(restoreTabs,400); });
  window._docTabs={activateEditor:function(){ var g=cur(); return g?activate(g.id,'editor'):Promise.resolve(); },openControllerEditor:openControllerEditor,open:openFiles,importFile:importFile,addDefault:addDefaultTab,activate:activate,groups:function(){return groups.slice();}};
})();
