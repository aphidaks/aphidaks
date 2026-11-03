
(function(){
  var stopped=false, userPaused=false, armed=false;
  var bStop=document.getElementById('btnCtlStop'), bPause=document.getElementById('btnCtlPause');
  if(!bStop||!bPause) return;

  function sync(){
    bStop.innerHTML=stopped?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg> START':'<svg class="si" aria-hidden="true"><use href="#si-sq-f"/></svg> STOP';
    bStop.className='vbtn '+(stopped?'btn-accent':'btn-red');
    bStop.title=stopped?'Start the controllers again':'Stop everything: all scripts, motor RPM back to 0, graphs reset, sequence back to step 1, contactor motor back to side 1';
    var p=userPaused&&!stopped;
    bPause.innerHTML=p?'<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg> PLAY':'<svg class="si" aria-hidden="true"><use href="#si-pause"/></svg> PAUSE';
    bPause.className='vbtn '+(p?'btn-accent':'btn-gray');
    bPause.disabled=stopped; bPause.style.opacity=stopped?'.4':''; bPause.style.cursor=stopped?'default':'';
  }

  function stopAll(){
    userPaused=false; if(window._simPaused) window._simSetPaused(false);
    try{ if(window._ctlStopAll) window._ctlStopAll(); }catch(e){}
    try{
      if(typeof windAnimId!=='undefined' && windAnimId){ cancelAnimationFrame(windAnimId); windAnimId=null; }
      active=false; currentRPM=0; window._simWs=0; damperExtraRPM=0;
      onReachZero();
    }catch(e){}
    try{ stopMotor2(); }catch(e){}
    try{
      stopContactorAnim(); contactorAngle=0;
      var g=document.getElementById('contactorRotorG'); if(g) g.setAttribute('transform','rotate(0,20,20)');
      for(var i=0;i<4;i++){ var el=document.getElementById('sideInd'+i); if(el) el.className='side-ind'+(i===0?' active-on':''); }
      var cd=document.getElementById('contactorContactDot'); if(cd){ cd.setAttribute('fill','var(--led)'); cd.setAttribute('stroke','var(--led)'); }
      if(typeof damperVar!=='undefined') damperVar=true;
    }catch(e){}
    try{
      if(seqAnimId){ cancelAnimationFrame(seqAnimId); seqAnimId=null; }
      seqCurrentStep=0; seqPhaseStart=performance.now();
      applySeqStep(); updateSeqMarkerHighlight();
      if(extraRPMAnimId){ cancelAnimationFrame(extraRPMAnimId); extraRPMAnimId=null; }
      damperExtraRPM=0;
      if(typeof liveUpdateFreqs==='function'){ liveUpdateFreqs(); updateFreqDisplay(); }
      if(typeof setIndicators==='function') setIndicators();
    }catch(e){}
    try{ if(window._simGraphsClear) window._simGraphsClear(); }catch(e){}
    stopped=true; window._simStopped=true; armed=false; sync();
    setTimeout(function(){
      if(!stopped) return;
      armed=true;
      window._simSetPaused(true,true);
      try{ if(window._ctlRearm) window._ctlRearm(); }catch(e){}
      try{
        seqPhaseStart=performance.now();
        if(seqModeActive && damperEnabled && audioCtx && !seqAnimId) seqAnimId=requestAnimationFrame(tickSeq);
      }catch(e){}
    },120);
  }

  function startAll(){
    stopped=false; window._simStopped=false;
    try{ if(typeof startMotor2==='function') startMotor2(); }catch(e){}
    window._simSetPaused(false);
    if(!armed){ try{ if(window._ctlRearm) window._ctlRearm(); }catch(e){} }
    try{ if(window._ctlFireStart) window._ctlFireStart(); }catch(e){}
    sync();
  }

  bStop.addEventListener('click',function(){ if(stopped) startAll(); else stopAll(); });
  bPause.addEventListener('click',function(){ if(stopped) return; userPaused=!userPaused; window._simSetPaused(userPaused); sync(); });
  window._simStop=stopAll; window._simStart=startAll;
  sync();
})();
