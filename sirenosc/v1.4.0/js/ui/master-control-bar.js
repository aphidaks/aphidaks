
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var bar=document.getElementById('masterCtlBar'), title=document.getElementById('mcbTitle'), pinBtn=document.getElementById('btnMasterUnpin'), anchor=document.getElementById('btnCtrlOpenEditor');
    if(!bar||!title||!pinBtn) return;
    var home=bar.parentNode, LS='sirenosc_master_bar';
    function zoom(){ return window._uiZoom||1; }
    function topMin(){ var v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--topH'))||34; return v; }
    function place(x,y){
      var r=bar.getBoundingClientRect(), z=zoom();
      x=Math.min(Math.max(x,0),Math.max(0,window.innerWidth-r.width));
      y=Math.min(Math.max(y,topMin()*z),Math.max(topMin()*z,window.innerHeight-r.height));
      bar.style.right='auto';
      for(var i=0;i<6;i++){
        var q=bar.getBoundingClientRect(), dx=x-q.left, dy=y-q.top;
        if(Math.abs(dx)<0.5&&Math.abs(dy)<0.5) break;
        bar.style.left=((parseFloat(bar.style.left)||0)+dx/z)+'px'; bar.style.top=((parseFloat(bar.style.top)||0)+dy/z)+'px';
      }
    }
    function save(){ try{ var fl=bar.classList.contains('mcb-floating'); var q=bar.getBoundingClientRect(); localStorage.setItem(LS,JSON.stringify({unpinned:fl,x:q.left,y:q.top})); }catch(e){} }
    function setFloating(on,x,y){
      var mx=document.getElementById('mcbSection'); if(mx) mx.style.display=on?'none':'';
      if(on){
        var r=bar.getBoundingClientRect();
        bar.classList.add('mcb-floating'); document.body.appendChild(bar);
        pinBtn.title='Pin STOP / PAUSE back into the Controller section';
        place(x!=null?x:r.left, y!=null?y:r.top);
      } else {
        bar.classList.remove('mcb-floating'); bar.style.left=bar.style.top=bar.style.right='';
        home.appendChild(bar);
        pinBtn.title='Unpin STOP / PAUSE into a draggable MASTER CONTROL';
      }
      save();
    }
    pinBtn.addEventListener('click',function(){ setFloating(!bar.classList.contains('mcb-floating')); });
    var drag=null;
    title.addEventListener('pointerdown',function(e){
      if(!bar.classList.contains('mcb-floating')||e.button>0) return;
      var r=bar.getBoundingClientRect(); drag={dx:e.clientX-r.left,dy:e.clientY-r.top};
      try{ title.setPointerCapture(e.pointerId); }catch(_){}
      e.preventDefault();
    });
    title.addEventListener('pointermove',function(e){
      if(!drag) return;
      place(e.clientX-drag.dx,e.clientY-drag.dy);
    });
    function end(){ if(drag){ drag=null; save(); } }
    title.addEventListener('pointerup',end); title.addEventListener('pointercancel',end);
    window.addEventListener('resize',function(){ if(bar.classList.contains('mcb-floating')){ var q=bar.getBoundingClientRect(); place(q.left,q.top); save(); } });
    var sv={}; try{ sv=JSON.parse(localStorage.getItem(LS)||'{}')||{}; }catch(e){}
    if(sv.unpinned===false) {  }
    else if(sv.unpinned && isFinite(sv.x)) setFloating(true,sv.x,sv.y);
    else setFloating(true, Math.max(0,window.innerWidth-bar.getBoundingClientRect().width-24), topMin()*zoom()+12);
    var ob=document.getElementById('btnTestOverrideOld');
    if(ob){
      var oHeld=false, oLatched=false, oRelAt=0;
      function oShow(){ window._tovA = oHeld||oLatched; window._testOverride = !!(window._tovA||window._tovB); ob.classList.toggle('active', oHeld||oLatched); ob.classList.toggle('btn-red', oLatched); ob.style.outline = (oHeld||oLatched) ? '1px solid var(--accent2)' : ''; }
      ob.addEventListener('pointerdown',function(e){
        if(e.button>0) return; e.preventDefault();
        try{ ob.setPointerCapture(e.pointerId); }catch(_){}
        if(oLatched){ oLatched=false; oHeld=false; oRelAt=Date.now(); oShow(); return; }
        oHeld=true; oShow();
      });
      function oUp(){ if(oHeld){ oHeld=false; oShow(); } }
      ob.addEventListener('pointerup',oUp); ob.addEventListener('pointercancel',oUp); ob.addEventListener('lostpointercapture',oUp);
      ob.addEventListener('dblclick',function(e){ e.preventDefault(); if(Date.now()-oRelAt<400) return; oLatched=true; oHeld=false; oShow(); });
      ob.addEventListener('contextmenu',function(e){ e.preventDefault(); });
      window.addEventListener('blur',function(){ if(oHeld){ oHeld=false; oShow(); } });
    }
    var tb=document.getElementById('btnTestOverride');
    if(tb){
      var tS=document.getElementById('btnTestSteady'), tC=document.getElementById('btnTestCycle'), tX=document.getElementById('btnTestCancel');
      var held=false, steady=false, cycling=false, cycOn=false, cycT=null;
      function secs(id){ var v=parseFloat(document.getElementById(id).value); return (isFinite(v)&&v>=0.1?v:0.1)*1000; }
      function show(){
        var on = held||steady||(cycling&&cycOn);
        window._tovB = on; window._testOverride = !!(window._tovA||window._tovB);
        tb.classList.toggle('active', held); tb.style.outline = held ? '1px solid var(--accent2)' : '';
        tS.classList.toggle('active', steady); tS.classList.toggle('btn-red', steady);
        tC.classList.toggle('active', cycling); tC.classList.toggle('btn-red', cycling&&cycOn);
      }
      function cycStep(){
        if(!cycling) return;
        cycOn = !cycOn; show();
        cycT = setTimeout(cycStep, secs(cycOn?'testCycOn':'testCycOff'));
      }
      function stopCycle(){ cycling=false; cycOn=false; if(cycT){ clearTimeout(cycT); cycT=null; } }
      function cancel(){ steady=false; stopCycle(); show(); }
      tb.addEventListener('pointerdown',function(e){
        if(e.button>0) return; e.preventDefault();
        try{ tb.setPointerCapture(e.pointerId); }catch(_){}
        held=true; show();
      });
      function up(){ if(held){ held=false; show(); } }
      tb.addEventListener('pointerup',up); tb.addEventListener('pointercancel',up); tb.addEventListener('lostpointercapture',up);
      tb.addEventListener('contextmenu',function(e){ e.preventDefault(); });
      window.addEventListener('blur',function(){ if(held){ held=false; show(); } });
      tS.addEventListener('click',function(){ stopCycle(); steady=true; show(); });
      tC.addEventListener('click',function(){ steady=false; stopCycle(); cycling=true; cycOn=false; cycStep(); });
      tX.addEventListener('click',cancel);
    }
  });
})();
