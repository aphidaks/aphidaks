(function(){
  var panel=document.getElementById('ctrlPanelGraphical'), row=document.getElementById('ceWorkRow'), pal=document.getElementById('cePalWrap'), props=document.getElementById('ceProps'), host=document.getElementById('ceEditorHost');
  if(!panel||!row||!pal||!props||!host) return;
  var KEY='ceLayoutV2', root=document.documentElement;
  var DEF={w:174,h:210,listLeft:false,infoTop:false,col:{canvas:false,list:false,info:false}};
  var L=JSON.parse(JSON.stringify(DEF));
  try{ var o=JSON.parse(localStorage.getItem(KEY)||'null'); if(o){ if(isFinite(o.w)) L.w=Math.max(110,Math.min(600,o.w)); if(isFinite(o.h)) L.h=Math.max(100,Math.min(900,o.h));
      L.listLeft=!!o.listLeft; L.infoTop=!!o.infoTop; if(o.col) ['canvas','list','info'].forEach(function(k){ L.col[k]=!!o.col[k]; }); } }catch(_){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(L)); }catch(_){} }
  function mk(id,key,title,before,child){
    var sec=document.createElement('div'); sec.id=id; sec.className='cs-sec'; sec.setAttribute('data-sec',key);
    sec.innerHTML='<div class="cs-head" title="Drag to rearrange"><span class="cs-grip"><svg class="si" aria-hidden="true"><use href="#si-grip"/></svg></span><span class="cs-title">'+title+'</span><button type="button" class="cs-tog" title="Collapse / expand"><svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg></button></div>';
    before.parentNode.insertBefore(sec,before); sec.appendChild(child); return sec; }
  var secs={};
  secs.canvas=mk('ceCanvasSec','canvas','Canvas',host,host);
  secs.list=mk('ceListSec','list','Items',pal,pal);
  secs.info=mk('ceInfoSec','info','Item Info',props,props);
  var vs=document.createElement('div'); vs.id='ceSplitV'; vs.title='Drag to resize the item list (double-click to reset)'; row.insertBefore(vs,secs.list);
  var hs=document.createElement('div'); hs.id='ceSplitH'; hs.title='Drag to resize the item info box (double-click to reset)'; panel.insertBefore(hs,secs.info);
  function infoHidden(){ return props.style.display==='none'; }
  function apply(){
    root.style.setProperty('--cePalW',L.w+'px'); root.style.setProperty('--cePropsH',L.h+'px');
    secs.canvas.style.order=L.listLeft?2:0; vs.style.order=1; secs.list.style.order=L.listLeft?0:2;
    secs.info.style.order=L.infoTop?1:3; row.style.order=L.infoTop?3:1; hs.style.order=2;
    ['canvas','list','info'].forEach(function(k){ secs[k].classList.toggle('cs-col',!!L.col[k]); secs[k].querySelector('.cs-tog').innerHTML=L.col[k]?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg>':'<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>'; });
    row.classList.toggle('cc-canvas',!!L.col.canvas);
    vs.style.display=(L.col.canvas||L.col.list)?'none':'';
    secs.info.style.display=infoHidden()?'none':''; hs.style.display=(L.col.info||infoHidden())?'none':''; }
  new MutationObserver(apply).observe(props,{attributes:true,attributeFilter:['style']});
  apply();
  function zoomOf(el){ var r=el.getBoundingClientRect(); return (r.width/(el.offsetWidth||1))||1; }
  function split(el,onMove,onReset){
    el.addEventListener('pointerdown',function(e){ if(e.button!==0) return; e.preventDefault(); var z=zoomOf(secs.list), x0=e.clientX, y0=e.clientY, w0=L.w, h0=L.h; el.classList.add('on'); try{ el.setPointerCapture(e.pointerId); }catch(_){}
      function mv(ev){ onMove((ev.clientX-x0)/z,(ev.clientY-y0)/z,w0,h0,z); apply(); }
      function up(){ el.classList.remove('on'); el.removeEventListener('pointermove',mv); el.removeEventListener('pointerup',up); el.removeEventListener('pointercancel',up); save(); }
      el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); });
    el.addEventListener('dblclick',function(){ onReset(); apply(); save(); }); }
  split(vs,function(dx,dy,w0){ L.w=Math.round(Math.max(110,Math.min(600,w0+(L.listLeft?dx:-dx)))); },function(){ L.w=DEF.w; });
  split(hs,function(dx,dy,w0,h0,z){ var maxH=Math.max(120,window.innerHeight/z-300); L.h=Math.round(Math.max(100,Math.min(maxH,h0+(L.infoTop?dy:-dy)))); },function(){ L.h=DEF.h; });
  Object.keys(secs).forEach(function(k){ secs[k].querySelector('.cs-tog').addEventListener('click',function(e){ e.stopPropagation(); L.col[k]=!L.col[k]; apply(); save(); }); });
  function secAt(x,y){ var el=document.elementFromPoint(x,y); return el&&el.closest?el.closest('.cs-sec'):null; }
  Object.keys(secs).forEach(function(k){
    var head=secs[k].querySelector('.cs-head');
    head.addEventListener('pointerdown',function(e){ if(e.button!==0||e.target.closest('.cs-tog')) return; var x0=e.clientX, y0=e.clientY, on=false, tgt=null;
      try{ head.setPointerCapture(e.pointerId); }catch(_){}
      function clear(){ Object.keys(secs).forEach(function(n){ secs[n].classList.remove('cs-drop','cs-drag'); }); document.body.style.cursor=''; }
      function mv(ev){ if(!on){ if(Math.hypot(ev.clientX-x0,ev.clientY-y0)<5) return; on=true; secs[k].classList.add('cs-drag'); document.body.style.cursor='grabbing'; }
        var t=secAt(ev.clientX,ev.clientY); tgt=(t&&t!==secs[k])?t:null; Object.keys(secs).forEach(function(n){ secs[n].classList.toggle('cs-drop',secs[n]===tgt); }); }
      function up(ev){ head.removeEventListener('pointermove',mv); head.removeEventListener('pointerup',up); head.removeEventListener('pointercancel',up);
        if(on&&tgt&&ev.type==='pointerup'){ var tk=tgt.getAttribute('data-sec'), r=tgt.getBoundingClientRect();
          if(k==='info'){ var wr=row.getBoundingClientRect(); L.infoTop=(ev.clientY<wr.top+wr.height/2); }
          else if(tk==='info'){ L.infoTop=!L.infoTop; }
          else if(k==='list'){ L.listLeft=(ev.clientX<r.left+r.width/2); }
          else if(k==='canvas'&&tk==='list'){ L.listLeft=!L.listLeft; }
          apply(); save(); }
        clear(); }
      head.addEventListener('pointermove',mv); head.addEventListener('pointerup',up); head.addEventListener('pointercancel',up); }); });
  var clr=document.getElementById('ceClear');
  if(clr){ var grp=document.createElement('div'); grp.style.cssText='display:flex;gap:6px;align-items:center'; clr.parentNode.insertBefore(grp,clr);
    var rb=document.createElement('button'); rb.type='button'; rb.id='ceResetLayout'; rb.className='vbtn btn-gray'; rb.title='Restore the default panel sizes, positions and expanded state'; rb.style.cssText='font-size:11px;padding:3px 9px;letter-spacing:1px'; rb.textContent='RESET LAYOUT';
    rb.addEventListener('click',function(){ L=JSON.parse(JSON.stringify(DEF)); apply(); save(); });
    grp.appendChild(rb); grp.appendChild(clr); }
})();

