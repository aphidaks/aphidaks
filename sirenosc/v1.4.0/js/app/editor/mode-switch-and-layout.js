(function(){
  var modeBtns={graphical:document.getElementById('btnCtrlGraphical'), functional:document.getElementById('btnCtrlFunctional'), midi:document.getElementById('btnCtrlMidi')};
  var panels={graphical:document.getElementById('ctrlPanelGraphical'), functional:document.getElementById('ctrlPanelFunctional'), midi:document.getElementById('ctrlPanelMidi')};
  var mode='graphical';
  function setMode(m){
    mode=(m==='functional')?'functional':(m==='midi')?'midi':'graphical';
    Object.keys(modeBtns).forEach(function(k){
      if(modeBtns[k]) modeBtns[k].className='vbtn '+(k===mode?'btn-accent':'btn-gray');
      if(panels[k]) panels[k].style.display=(k===mode)?'flex':'none';
    });
    var ovl=document.getElementById('ctrlEditorOverlay'); if(ovl) ovl.classList.toggle('ceo-wide',mode==='functional'||mode==='midi');
    if(mode==='functional' && window._feShow) window._feShow();
    if(mode==='midi' && window._midiShow) window._midiShow();
  }
  Object.keys(modeBtns).forEach(function(k){ if(modeBtns[k]) modeBtns[k].addEventListener('click',function(){ setMode(k); }); });
  window._getControllerEditorMode=function(){ return mode; };
  window._setControllerEditorMode=setMode;
  setMode('graphical');
})();


(function(){
  var first=document.querySelector('.sec'); if(!first) return;
  var KEY='edLayoutV1', host=first.parentElement;
  var secs=[], conts=[], seen={};
  function slug(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'section'; }
  document.querySelectorAll('.sec').forEach(function(e){
    if(e.parentElement.closest('.sec')||e.closest('#ctrlEditorOverlay')) return;
    if(getComputedStyle(e).display==='none' && !e.classList.contains('lo-off')) return;
    var title=e.querySelector('.sec-title'); if(!title) return;
    var tn=Array.prototype.find.call(title.childNodes,function(n){ return n.nodeType===3&&n.textContent.trim(); });
    var sid=e.id||('s-'+slug(tn?tn.textContent:title.textContent)); if(seen[sid]){ var n=2; while(seen[sid+'-'+n]) n++; sid=sid+'-'+n; } seen[sid]=1;
    e.setAttribute('data-sx',sid); secs.push({el:e,sid:sid,title:title}); });
  if(!secs.length) return;
  secs.forEach(function(o){ var par=o.el.parentElement; if(conts.indexOf(par)<0) conts.push(par); });
  function isSec(n){ return n.nodeType===1&&n.hasAttribute&&n.hasAttribute('data-sx'); }
  var slots=conts.map(function(c){ var k=0; for(var i=0;i<c.childNodes.length;i++){ var n=c.childNodes[i]; if(isSec(n)) break; k++; } return Array.prototype.slice.call(c.childNodes,0,k).length; });
  function snapshot(){ return conts.map(function(c){ return Array.prototype.filter.call(c.children,isSec).map(function(n){ return n.getAttribute('data-sx'); }); }); }
  var DEF=snapshot(), byId={}; secs.forEach(function(o){ byId[o.sid]=o; });
  function place(layout){
    layout.forEach(function(list,ci){ var c=conts[ci]; if(!c||!Array.isArray(list)) return;
      var others=Array.prototype.filter.call(c.childNodes,function(n){ return !isSec(n); }), ref=others[slots[ci]]||null;
      list.forEach(function(sid){ var o=byId[sid]; if(o) c.insertBefore(o.el,ref); }); }); }
  secs.forEach(function(o){ var t=o.title, e=o.el, x=(t.parentElement===e)?t:t.parentElement;
    while(x&&x!==e){ var par=x.parentElement; Array.prototype.forEach.call(par.children,function(sib){ if(sib!==x) sib.classList.add('sx-sib'); }); if(par===e) break; x=par; }
    if(t.parentElement!==e) Array.prototype.forEach.call(t.parentElement.children,function(sib){ sib.classList.remove('sx-sib'); });
    var ctl=document.createElement('span'); ctl.className='sx-ctl';
    ctl.innerHTML='<span class="sx-grip" title="Drag to rearrange"><svg class="si" aria-hidden="true"><use href="#si-grip"/></svg></span><button type="button" class="sx-tog" title="Collapse / expand"><svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg></button>';
    t.insertBefore(ctl,t.firstChild); o.grip=ctl.firstChild; o.tog=ctl.lastChild; });
  var col={};
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify({order:snapshot(),col:Object.keys(col).filter(function(k){ return col[k]; })})); }catch(_){} }
  function paint(){ secs.forEach(function(o){ if(o.el.hasAttribute('data-stv-i')){ o.el.classList.remove('sx-col'); return; } var c=!!col[o.sid]; o.el.classList.toggle('sx-col',c); o.tog.innerHTML=c?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>':'<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>'; o.tog.title=isWin()?(c?'Maximize':'Minimize'):(c?'Expand':'Collapse'); }); }
  try{ var sv=JSON.parse(localStorage.getItem(KEY)||'null'); if(sv){ if(Array.isArray(sv.order)) place(sv.order); (sv.col||[]).forEach(function(k){ if(byId[k]) col[k]=true; }); } }catch(_){}
  paint();
  var FKEY='edFreeV1', MKEY='edSnapModeV1', sxOffs={}, sxMode='snap', zTop=20, lastSig='', ctxEl=null;
  try{ var fv=JSON.parse(localStorage.getItem(FKEY)||'null'); if(fv&&typeof fv==='object'&&!Array.isArray(fv)) sxOffs=fv; }catch(_){}
  try{ if(localStorage.getItem(MKEY)==='free') sxMode='free'; }catch(_){}
  function isWin(){ return /\btheme-(luna|aero|old-classic|metro|mica)\b/.test(document.body.className); }
  function freeOn(){ return sxMode==='free'&&isWin(); }
  function saveFree(){ try{ localStorage.setItem(FKEY,JSON.stringify(sxOffs)); }catch(_){} }
  function ensureRel(el){ if(getComputedStyle(el).position==='static'){ el.style.position='relative'; el._sxRel=true; } }
  var WKEY='edWidthV1', SKEY='edSizeV1', sxW={}, sxSizes={}, MINW=140, MINH=40;
  try{ var wv=JSON.parse(localStorage.getItem(WKEY)||'null'); if(wv&&typeof wv==='object'&&!Array.isArray(wv)) sxW=wv; }catch(_){}
  try{ var zv=JSON.parse(localStorage.getItem(SKEY)||'null'); if(zv&&typeof zv==='object'&&!Array.isArray(zv)) sxSizes=zv; }catch(_){}
  function saveW(){ try{ localStorage.setItem(WKEY,JSON.stringify(sxW)); }catch(_){} }
  function saveSizes(){ try{ localStorage.setItem(SKEY,JSON.stringify(sxSizes)); }catch(_){} }
  function flowOn(){ return isWin()&&!freeOn()&&host.classList.contains('body'); }
  function applyWidths(){ var flow=flowOn(); host.classList.toggle('sx-flow',flow);
    secs.forEach(function(q){ var st=(flow&&q.el.parentElement===host)?(sxW[q.sid]||''):''; q.el.classList.toggle('sx-half',st==='h'||st==='hr'); q.el.classList.toggle('sx-half-r',st==='hr'); }); }
  function setW(o,st){ if(st) sxW[o.sid]=st; else delete sxW[o.sid]; applyWidths(); saveW(); }
  function edgeAt(o,e){ if(!isWin()||o.el.hasAttribute('data-stv-i')) return ''; var r=o.el.getBoundingClientRect(), Z=5, x=e.clientX-r.left, y=e.clientY-r.top, W=r.width, H=r.height, ed='';
    if(freeOn()){ if(y<Z) ed='n'; else if(y>H-Z) ed='s'; if(x<Z) ed+='w'; else if(x>W-Z) ed+='e'; if(o.el.classList.contains('sx-col')) ed=ed.replace(/[ns]/g,''); return ed; }
    if(flowOn()&&o.el.parentElement===host){ var st=sxW[o.sid]||''; if(x>W-Z&&st!=='hr') return 'e'; if(x<Z&&st!=='h') return 'w'; }
    return ''; }
  var RSCUR={n:'ns',s:'ns',e:'ew',w:'ew',ne:'nesw',sw:'nesw',nw:'nwse',se:'nwse'};
  function setEdgeCursor(ed){ var b=document.body; b.classList.remove('sx-rs-ns','sx-rs-ew','sx-rs-nesw','sx-rs-nwse'); if(ed) b.classList.add('sx-rs-'+RSCUR[ed]); }
  function startSnapResize(o,e,edge){
    var pid=e.pointerId, sx0=e.clientX, on=false;
    function mv(ev){ if(ev.pointerId!==pid) return; if(ev.pointerType==='mouse'&&ev.buttons===0){ end({type:'pointerup'}); return; }
      if(!on){ if(Math.abs(ev.clientX-sx0)<4) return; on=true; document.body.classList.add('sx-resizing'); }
      var hr=host.getBoundingClientRect(), rel=(ev.clientX-hr.left)/hr.width, cur=sxW[o.sid]||'', nw=(edge==='e')?(rel>0.75?'':'h'):(rel<0.25?'':'hr');
      if(nw!==cur) setW(o,nw); }
    function end(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return; document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end);
      document.body.classList.remove('sx-resizing'); setEdgeCursor(''); }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end); }
  function startFreeResize(o,e,edge){
    var el=o.el, sid=o.sid, pid=e.pointerId, r0=el.getBoundingClientRect(), k=r0.width/(el.offsetWidth||1); if(!(k>0.05&&k<20)) k=1;
    var w0=el.offsetWidth, h0=el.offsetHeight, base=(sxOffs[sid]||[0,0]).slice(), sx0=e.clientX, sy0=e.clientY, scx0=window.scrollX, scy0=window.scrollY,
        lx=sx0, ly=sy0, on=false, cur=null, curOff=base.slice(), needRel=/[nw]/.test(edge), hasV=/[ns]/.test(edge);
    function apply(){ var dx=((lx+window.scrollX)-(sx0+scx0))/k, dy=((ly+window.scrollY)-(sy0+scy0))/k, w=w0, h=h0, ox=base[0], oy=base[1];
      if(edge.indexOf('e')>=0) w=Math.max(MINW,w0+dx);
      if(edge.indexOf('w')>=0){ w=Math.max(MINW,w0-dx); ox=base[0]+(w0-w); }
      if(edge.indexOf('s')>=0) h=Math.max(MINH,h0+dy);
      if(edge.indexOf('n')>=0){ h=Math.max(MINH,h0-dy); oy=base[1]+(h0-h); }
      el.style.width=w+'px'; if(hasV){ el.style.height=h+'px'; el.style.overflow='hidden'; if(window._fitContent) window._fitContent(el); }
      if(needRel){ el.style.left=ox+'px'; el.style.top=oy+'px'; }
      cur=[Math.round(w),(hasV||(sxSizes[sid]&&sxSizes[sid][1]))?Math.round(h):0]; curOff=[ox,oy]; }
    function mv(ev){ if(ev.pointerId!==pid) return; if(ev.pointerType==='mouse'&&ev.buttons===0){ end({type:'pointerup'}); return; }
      lx=ev.clientX; ly=ev.clientY;
      if(!on){ if(Math.abs(lx-sx0)+Math.abs(ly-sy0)<4) return; on=true; if(needRel) ensureRel(el); el.style.flex='none'; el._sxSz=true; el.classList.add('sx-moving'); document.body.classList.add('sx-resizing'); }
      apply(); }
    function end(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return; document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end); window.removeEventListener('blur',abort);
      document.body.classList.remove('sx-resizing'); setEdgeCursor(''); if(!on) return; el.classList.remove('sx-moving');
      if(ev.type==='pointerup'&&cur){ sxSizes[sid]=cur; if(needRel) sxOffs[sid]=curOff; saveSizes(); saveFree(); }
      applyFree(); }
    function abort(){ end({type:'pointercancel'}); }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end); window.addEventListener('blur',abort); }
  function layoutTitles(){ var win=isWin();
    secs.forEach(function(q){ var t=q.title, e=q.el;
      if(q.tPar===undefined){ q.tPar=(t.parentElement!==e)?t.parentElement:null; q.tNext=q.tPar?t.nextSibling:null; }
      if(!q.tPar) return;
      if(win){ if(t.parentElement!==e){ e.insertBefore(t,e.firstChild); q.tPar.classList.add('sx-orphan-row'); } }
      else if(t.parentElement===e){ q.tPar.insertBefore(t,q.tNext); q.tPar.classList.remove('sx-orphan-row'); } }); }
  function applyFree(){ layoutTitles(); var on=freeOn(); document.body.classList.toggle('sx-free',on);
    secs.forEach(function(q){ var el=q.el, off=on?sxOffs[q.sid]:null; if(el.hasAttribute('data-stv-i')) return;
      if(off&&(off[0]||off[1])){ ensureRel(el); el.style.left=off[0]+'px'; el.style.top=off[1]+'px'; if(q.z) el.style.zIndex=q.z; }
      else if(!(on&&q.z)){ if(el._sxRel){ el.style.position=''; el._sxRel=false; } el.style.left=''; el.style.top=''; el.style.zIndex=''; }
      var sz=on?sxSizes[q.sid]:null;
      if(sz&&sz[0]){ el.style.width=sz[0]+'px'; el.style.flex='none'; el._sxSz=true; if(sz[1]){ el.style.height=sz[1]+'px'; el.style.overflow='hidden'; if(window._fitContent) window._fitContent(el); } else { el.style.height=''; el.style.overflow=''; if(window._fitContent) window._fitContent(el,true); } }
      else if(el._sxSz){ el.style.width=''; el.style.height=''; el.style.flex=''; el.style.overflow=''; el._sxSz=false; if(window._fitContent) window._fitContent(el,true); } });
    applyWidths(); paint(); }
  function startFree(o,e){
    var el=o.el, sid=o.sid, base=(sxOffs[sid]||[0,0]).slice(), sx0=e.clientX, sy0=e.clientY, scx0=window.scrollX, scy0=window.scrollY,
        lx=sx0, ly=sy0, on=false, k=1, pid=e.pointerId, raf=0, pl0=0, pt0=0, docW=0, cur=base.slice();
    function begin(){ on=true; ensureRel(el); o.z=++zTop; el.style.zIndex=o.z;
      var r0=el.getBoundingClientRect(); el.style.left=(base[0]+20)+'px'; var r1=el.getBoundingClientRect();
      k=(r1.left-r0.left)/20; if(!(k>0.05&&k<20)) k=1; el.style.left=base[0]+'px';
      scx0=window.scrollX; scy0=window.scrollY; sx0=lx; sy0=ly;
      pl0=r0.left+scx0; pt0=r0.top+scy0; docW=document.documentElement.scrollWidth;
      el.classList.add('sx-moving'); document.body.style.userSelect='none'; document.body.style.cursor='grabbing'; raf=requestAnimationFrame(tick); }
    function pos(){ var dx=(lx+window.scrollX)-(sx0+scx0), dy=(ly+window.scrollY)-(sy0+scy0),
        nx=Math.min(Math.max(pl0+dx,0),Math.max(0,docW-90)), ny=Math.max(pt0+dy,0);
      cur=[Math.round((base[0]+(nx-pl0)/k)*10)/10, Math.round((base[1]+(ny-pt0)/k)*10)/10];
      el.style.left=cur[0]+'px'; el.style.top=cur[1]+'px'; }
    function tick(){ var H=window.innerHeight, d=ly<70?-(70-ly)/3:(ly>H-70?(ly-(H-70))/3:0); if(d){ window.scrollBy(0,d); pos(); } raf=requestAnimationFrame(tick); }
    function mv(ev){ if(ev.pointerId!==pid) return; if(ev.pointerType==='mouse'&&ev.buttons===0){ end({type:'pointerup'}); return; }
      lx=ev.clientX; ly=ev.clientY; if(!on){ if(Math.abs(lx-sx0)+Math.abs(ly-sy0)<5) return; begin(); } pos(); }
    function end(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return; cancelAnimationFrame(raf);
      document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end); window.removeEventListener('blur',abort);
      document.body.style.userSelect=''; document.body.style.cursor=''; if(!on) return; el.classList.remove('sx-moving');
      if(ev.type==='pointerup'){ sxOffs[sid]=cur; } else { el.style.left=base[0]+'px'; el.style.top=base[1]+'px'; }
      saveFree(); }
    function abort(){ end({type:'pointercancel'}); }
    document.addEventListener('pointermove',mv); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end); window.addEventListener('blur',abort); }
  secs.forEach(function(o){
    o.el.addEventListener('pointerdown',function(){ if(freeOn()&&sxOffs[o.sid]){ o.z=++zTop; o.el.style.zIndex=o.z; } },true);
    o.title.addEventListener('dblclick',function(e){ if(!isWin()) return; if(e.target.closest&&e.target.closest('button,input,select,textarea,a,label,[contenteditable]')) return;
      if(o.el.hasAttribute('data-stv-i')) return; col[o.sid]=!col[o.sid]; paint(); save(); }); });
  secs.forEach(function(o){
    o.el.addEventListener('pointermove',function(e){ if(e.buttons||document.body.classList.contains('sx-resizing')) return; setEdgeCursor(edgeAt(o,e)); });
    o.el.addEventListener('pointerleave',function(){ if(!document.body.classList.contains('sx-resizing')) setEdgeCursor(''); });
    o.el.addEventListener('pointerdown',function(e){ if(e.button!==0) return; var ed=edgeAt(o,e); if(!ed) return; e.preventDefault(); e.stopPropagation();
      if(freeOn()) startFreeResize(o,e,ed); else startSnapResize(o,e,ed); },true); });
  function closeCtx(){ if(ctxEl&&ctxEl.parentNode) ctxEl.parentNode.removeChild(ctxEl); ctxEl=null; }
  function setSnapMode(m){ sxMode=m; try{ localStorage.setItem(MKEY,m); }catch(_){} lastSig=isWin()+'|'+sxMode; applyFree(); }
  var EXC='.sec,.header,.menu-bar-row,#docTabBar,#settingsPanel,.popup-overlay,.menu-dropdown,.menu-sub,#ctrlEditorOverlay,.sx-ctx,input,select,textarea,button,a,canvas,label,[contenteditable]';
  document.addEventListener('contextmenu',function(e){
    closeCtx();
    if(!isWin()) return;
    var t=e.target; if(!t||!t.closest||t.closest(EXC)) return;
    if(!(host.contains(t)||t===document.body||t===document.documentElement)) return;
    if(!host.getClientRects().length) return;
    e.preventDefault();
    var m=document.createElement('div'); m.className='sx-ctx'; m.setAttribute('role','menu');
    function item(label,on,fn){ var d=document.createElement('div'); d.className='sx-ctx-item'; d.setAttribute('role','menuitem');
      var ck=document.createElement('span'); ck.className='sx-ctx-ck'; ck.innerHTML=on?'<svg class="si" aria-hidden="true"><use href="#si-check"/></svg>':''; d.appendChild(ck); d.appendChild(document.createTextNode(label));
      d.addEventListener('click',function(ev){ ev.stopPropagation(); closeCtx(); fn(); }); m.appendChild(d); }
    item('Snap',sxMode!=='free',function(){ setSnapMode(sxMode==='free'?'snap':'free'); });
    item('Reset Layout',false,function(){ rb.click(); });
    document.body.appendChild(m); ctxEl=m;
    var z=parseFloat(document.body.style.zoom)||1, x=Math.min(e.clientX,window.innerWidth-m.offsetWidth*z-4), y=Math.min(e.clientY,window.innerHeight-m.offsetHeight*z-4);
    m.style.left=(Math.max(0,x)/z)+'px'; m.style.top=(Math.max(0,y)/z)+'px'; });
  document.addEventListener('mousedown',function(e){ if(ctxEl&&!(e.target.closest&&e.target.closest('.sx-ctx'))) closeCtx(); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeCtx(); });
  window.addEventListener('blur',closeCtx); window.addEventListener('resize',closeCtx); window.addEventListener('wheel',closeCtx,{passive:true});
  new MutationObserver(function(){ var sig=isWin()+'|'+sxMode; if(sig===lastSig) return; lastSig=sig; applyFree(); }).observe(document.body,{attributes:true,attributeFilter:['class']});
  lastSig=isWin()+'|'+sxMode; applyFree();
  secs.forEach(function(o){ o.tog.addEventListener('click',function(e){ e.stopPropagation(); col[o.sid]=!col[o.sid]; paint(); save(); });
    o.title.classList.add('sx-handle');
    o.title.addEventListener('pointerdown',function(e){ if(e.button!==0) return; if(e.target.closest&&e.target.closest('button,input,select,textarea,a,label,[contenteditable]')) return; e.preventDefault(); if(freeOn()){ startFree(o,e); return; }
      var raf=0, lx=e.clientX, ly=e.clientY, sx0=e.clientX, sy0=e.clientY, on=false, ghost=null, offX=0, offY=0, origPar=o.el.parentElement, origNext=o.el.nextSibling;
      var pid=e.pointerId, lastSnap=0;
      function snapTo(par,ref,wst){
        var first=new Map(); secs.forEach(function(q){ if(q.el!==o.el&&q.el.offsetParent) first.set(q.el,q.el.getBoundingClientRect()); });
        par.insertBefore(o.el,ref); if(wst!==undefined) setW(o,wst);
        first.forEach(function(f,el){ var n=el.getBoundingClientRect(), dx=f.left-n.left, dy=f.top-n.top; if(!dx&&!dy) return;
          el.style.transition='none'; el.style.transform='translate('+dx+'px,'+dy+'px)'; void el.offsetWidth;
          el.style.transition='transform .18s ease'; el.style.transform='';
          setTimeout(function(){ el.style.transition=''; },230); }); }
      function hit(){ if(!on) return; var flow=flowOn()&&o.el.parentElement===host, el=document.elementFromPoint(lx,ly), t=el&&el.closest?el.closest('[data-sx]'):null;
        if(!t&&flow&&el===host){
          for(var i=0;i<host.children.length;i++){ var c=host.children[i]; if(c===o.el||!c.hasAttribute('data-sx')||!c.offsetParent) continue; var cr=c.getBoundingClientRect(); if(ly>=cr.top&&ly<=cr.bottom){ t=c; break; } } }
        if(!t||t===o.el) return;
        var r=t.getBoundingClientRect(), tHalf=flow&&t.parentElement===host&&t.classList.contains('sx-half'), after=tHalf?(lx>r.left+r.width/2):(ly>r.top+r.height/2), ref=after?t.nextSibling:t, mine=sxW[o.sid]||'', wst;
        if(flow&&mine&&t.parentElement===host){ wst=tHalf?'h':((lx>r.left+r.width/2)?'hr':'h'); if(wst===mine) wst=undefined; }
        var noop=(ref===o.el||(after&&t.nextSibling===o.el)||(!after&&t.previousSibling===o.el));
        if(noop&&wst===undefined) return;
        if(Date.now()-lastSnap<140) return; lastSnap=Date.now();
        if(noop) snapTo(o.el.parentElement,o.el.nextSibling,wst); else snapTo(t.parentElement,ref,wst); }
      function place(){ ghost.style.left=(lx-offX)+'px'; ghost.style.top=(ly-offY)+'px'; }
      function begin(){ on=true; var r=o.el.getBoundingClientRect(); offX=sx0-r.left; offY=sy0-r.top;
        ghost=o.el.cloneNode(true); ghost.removeAttribute('id'); Array.prototype.forEach.call(ghost.querySelectorAll('[id]'),function(n){ n.removeAttribute('id'); });
        ghost.classList.add('sx-ghost'); ghost.style.cssText='position:fixed;margin:0;z-index:100000;pointer-events:none;width:'+r.width+'px;height:'+Math.min(r.height,300)+'px';
        try{ var cs=getComputedStyle(o.el); ['--accent','--accent2'].forEach(function(v){ var x=cs.getPropertyValue(v); if(x) ghost.style.setProperty(v,x.trim()); }); }catch(e){}
        document.body.appendChild(ghost); place();
        o.el.classList.add('sx-drag'); document.body.style.userSelect='none'; document.body.style.cursor='grabbing'; raf=requestAnimationFrame(scroll); }
      function mv(ev){ if(ev.pointerId!==pid) return; if(ev.pointerType==='mouse'&&ev.buttons===0){ end({type:'pointerup'}); return; } lx=ev.clientX; ly=ev.clientY; if(!on){ if(Math.abs(lx-sx0)+Math.abs(ly-sy0)<5) return; begin(); } place(); hit(); }
      function scroll(){ var H=window.innerHeight, d=ly<70?-(70-ly)/3:(ly>H-70?(ly-(H-70))/3:0); if(d){ window.scrollBy(0,d); hit(); } raf=requestAnimationFrame(scroll); }
      function end(ev){ if(ev.pointerId!==undefined&&ev.pointerId!==pid) return; cancelAnimationFrame(raf); document.removeEventListener('pointermove',mv); document.removeEventListener('pointerup',end); document.removeEventListener('pointercancel',end); window.removeEventListener('blur',abort);
        document.body.style.userSelect=''; document.body.style.cursor='';
        if(!on) return;
        if(ev.type!=='pointerup') origPar.insertBefore(o.el,origNext); else save();
        var pr=o.el.getBoundingClientRect(), g=ghost;
        g.style.transition='left .16s ease,top .16s ease,transform .16s ease,box-shadow .16s ease'; g.style.left=pr.left+'px'; g.style.top=pr.top+'px'; g.classList.add('sx-ghost-drop');
        setTimeout(function(){ if(g.parentNode) g.parentNode.removeChild(g); o.el.classList.remove('sx-drag'); },170); }
      function abort(){ end({type:'pointercancel'}); }
      document.addEventListener('pointermove',mv); document.addEventListener('pointerup',end); document.addEventListener('pointercancel',end); window.addEventListener('blur',abort); }); });
  var bar=document.createElement('div'); bar.className='sx-bar';
  var rb=document.createElement('button'); rb.type='button'; rb.id='btnResetEditorLayout'; rb.className='vbtn btn-gray'; rb.textContent='RESET LAYOUT'; rb.title='Put every section back in its original place and expand them all';
  rb.style.cssText='font-size:11px;padding:3px 9px;letter-spacing:1px';
  rb.addEventListener('click',function(){ place(DEF); col={}; sxOffs={}; saveFree(); sxSizes={}; saveSizes(); sxW={}; saveW(); applyFree(); paint(); try{ localStorage.removeItem(KEY); }catch(_){} });
  bar.appendChild(rb); host.insertBefore(bar,host.firstChild);
})();

