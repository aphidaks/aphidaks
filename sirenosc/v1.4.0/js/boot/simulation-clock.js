
(function(){
  var rn=performance.now.bind(performance), rd=Date.now, raf=window.requestAnimationFrame.bind(window), caf=window.cancelAnimationFrame.bind(window);
  var off=0, pausedAt=null, map={}, nid=1, timers=[]; var lastFrame=rn(), lastPump=0, capTs=-1e9; window._fpsCapMs=1000/60;
  window._simPaused=false;
  var ctxs=[], held=[], AC=window.AudioContext||window.webkitAudioContext;
  if(AC){
    var origResume=AC.prototype.resume;
    var Wrapped=function(a,b){ var c=Reflect.construct(AC,arguments,new.target||Wrapped); ctxs.push(c); try{ if(window.__bgAttachCtx) window.__bgAttachCtx(c); }catch(e){} if(window._simPaused){ held.push(c); try{ c.suspend(); }catch(e){} } return c; };
    Wrapped.prototype=AC.prototype; Object.setPrototypeOf(Wrapped,AC);
    window.AudioContext=Wrapped; if(window.webkitAudioContext) window.webkitAudioContext=Wrapped;
    AC.prototype.resume=function(){ if(window._simPaused){ if(held.indexOf(this)<0) held.push(this); return Promise.resolve(); } return origResume.apply(this,arguments); };
    window._simResumeCtx=function(c){ return origResume.call(c); };
  }
  performance.now=function(){ return (pausedAt!==null?pausedAt:rn())-off; };
  Date.now=function(){ return rd()-off; };
  function sched(id){
    var e=map[id]; if(!e) return;
    if(pausedAt!==null){ e.real=0; return; }
    e.real=raf(function(ts){ lastFrame=rn(); var e2=map[id]; if(!e2) return; e2.real=0; if(pausedAt!==null) return;
      var cap=window._fpsCapMs; if(cap && ts!==capTs){ if(ts-capTs<cap-3){ sched(id); return; } capTs=ts; }
      delete map[id]; e2.cb(ts-off); });
  }
  window.requestAnimationFrame=function(cb){ var id=nid++; map[id]={cb:cb,real:0}; sched(id); return id; };
  window.cancelAnimationFrame=function(id){ var e=map[id]; if(!e) return; if(e.real) caf(e.real); delete map[id]; };
  window._bgPump=function(){
    if(pausedAt!==null) return;
    var nw=rn(); if(!document.hidden && nw-lastFrame<400) return;
    if(nw-lastPump<(document.hidden?50:15)) return; lastPump=nw;
    var ids=Object.keys(map), t=nw-off;
    for(var i=0;i<ids.length;i++){ var e=map[ids[i]]; if(!e) continue; if(e.real) caf(e.real); e.real=0; delete map[ids[i]]; try{ e.cb(t); }catch(err){ setTimeout(function(){ throw err; },0); } }
  };
  function arm(t){ if(pausedAt!==null) return; t.at=rn(); t.h=setTimeout(function(){ drop(t); t.fn(); },t.rem); }
  function drop(t){ var i=timers.indexOf(t); if(i>=0) timers.splice(i,1); }
  window._ptSet=function(fn,ms){ var t={fn:fn,rem:Math.max(0,ms||0),h:0,at:0}; timers.push(t); arm(t); return t; };
  window._ptClear=function(t){ if(!t) return; clearTimeout(t.h); drop(t); };
  var FLUSH_MS=4000, flushT=0, flushMuted=false;
  function mainVol(){ try{ return parseFloat(document.getElementById('sMasterVol').value)/100; }catch(e){ return 1; } }
  window._simSetPaused=function(v,flush){
    v=!!v; if(v===window._simPaused) return;
    if(v){
      pausedAt=rn(); window._simPaused=true;
      timers.forEach(function(t){ clearTimeout(t.h); t.rem=Math.max(0,t.rem-(pausedAt-t.at)); });
      held=[];
      var mainC=null; try{ if(typeof audioCtx!=='undefined') mainC=audioCtx||null; }catch(e){}
      var doFlush=!!flush && mainC && mainC.state==='running' && typeof masterGain!=='undefined' && masterGain;
      if(doFlush){
        try{ masterGain.gain.cancelScheduledValues(mainC.currentTime); masterGain.gain.setTargetAtTime(0,mainC.currentTime,0.02); flushMuted=true; }catch(e){ flushMuted=false; }
        clearTimeout(flushT);
        flushT=setTimeout(function(){ flushT=0; if(!window._simPaused) return; try{ if(mainC.state==='running'){ held.push(mainC); mainC.suspend(); } }catch(e){} },FLUSH_MS);
      }
      ctxs.forEach(function(c){ try{ if(doFlush&&c===mainC) return; if(c.state==='running'){ held.push(c); c.suspend(); } }catch(e){} });
      try{ if(!doFlush && mainC && ctxs.indexOf(mainC)<0 && mainC.state==='running'){ held.push(mainC); mainC.suspend(); } }catch(e){}
      window._simMedia=[]; document.querySelectorAll('audio,video').forEach(function(m){ if(!m.paused){ window._simMedia.push(m); try{ m.pause(); }catch(e){} } });
    } else {
      off+=rn()-pausedAt; pausedAt=null; window._simPaused=false;
      timers.slice().forEach(arm);
      Object.keys(map).forEach(function(id){ if(!map[id].real) sched(id); });
      clearTimeout(flushT); flushT=0;
      var h=held; held=[]; h.forEach(function(c){ try{ (window._simResumeCtx?window._simResumeCtx(c):c.resume()); }catch(e){} });
      if(flushMuted){ flushMuted=false; try{ if(typeof masterGain!=='undefined' && masterGain && typeof audioCtx!=='undefined' && audioCtx ){ masterGain.gain.cancelScheduledValues(audioCtx.currentTime); masterGain.gain.setTargetAtTime(mainVol(),audioCtx.currentTime,0.03); } }catch(e){} }
      (window._simMedia||[]).forEach(function(m){ try{ m.play(); }catch(e){} }); window._simMedia=[];
    }
    document.dispatchEvent(new Event('simpausechange'));
  };
})();
