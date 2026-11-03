let _wasCancelled=false;
let _vsGesture=false;
let _vsLastRatio=null;
['pointerup','click','keydown','touchend'].forEach(function(ev){
  document.addEventListener(ev,function(){ _vsGesture=true; },{capture:true,passive:true});
});

function _vsStatus(dir){
  get('statusTxt').textContent = dir==='up' ? 'WINDING UP' : 'WINDING DOWN';
  get('playLed').style.cssText = dir==='up' ? 'background:var(--warn)' : 'background:var(--led)';
  if(get('tUndulate').checked) applyContactorForPhase(dir);
  setIndicators();
}

function _vsSlowToTarget(){
  if(windAnimId){cancelAnimationFrame(windAnimId);windAnimId=null;}
  windDirection='down';
  onStateOverrideTransition('down');
  if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
  _vsStatus('down');
  const startRPM=currentRPM;
  const _sdShut=window._bothDampersShut && window._bothDampersShut();
  let fn,offset,easing;
  if(_sdShut){fn=get('dSdWindDownFn').value||get('dWindDownFn').value;offset=(parseFloat(get('nSdWindDown').value)||120);easing=get('dSdWindDownEasing').value||get('dWindDownEasing').value;}
  else{fn=get('dWindDownFn').value;offset=(parseFloat(get('nWindDown').value)||20);easing=get('dWindDownEasing').value;}
  const tgt0=Math.max(0,getEffectivePeakRPM());
  const frac=startRPM>0?Math.min(1,Math.max(0,(startRPM-tgt0)/startRPM)):1;
  const dur=Math.max(0.05,offset*frac);
  const snap=parseFloat(get('nRPMSnap').value)||1;
  let t0=null;
  function tick(ts){
    if(t0===null) t0=ts;
    const tgt=getEffectivePeakRPM();
    const t=Math.min(1,(ts-t0)/1000/dur);
    currentRPM=startRPM+(tgt-startRPM)*applyFn(fn,t,easing);
    if(t>=1 || currentRPM<=tgt+snap){ currentRPM=tgt; onReachPeak(); return; }
    liveUpdateFreqs();updateFreqDisplay();setIndicators();
    windAnimId=requestAnimationFrame(tick);
  }
  windAnimId=requestAnimationFrame(tick);
}

function _vsRetarget(){
  if(isTorqueMode('up')){
    startWind('up'); _vsStatus('up'); return;
  }
  const tgt=getEffectivePeakRPM(), cur=currentRPM, snap=parseFloat(get('nRPMSnap').value)||1;
  if(Math.abs(tgt-cur)<=snap) return;
  if(tgt>cur){ if(windDirection!=='up'){ startWind('up'); _vsStatus('up'); } }
  else _vsSlowToTarget();
}

function _vsTick(){
  try{
    if(window._dirReversing && windDirection==='idle' && currentRPM<=0 && !windAnimId) window._dirReversing=false;
    const reversing=!!window._dirReversing;
    const cutting=!!(window._cwIsCutting && window._cwIsCutting());
    if(_vsGesture && !reversing && !cutting){
      const r=getVoltageRatio();
      const shouldRun=steadyActive && r>0;
      if(shouldRun!==active){
        _vsLastRatio=r;
        setActive(shouldRun);
        if(shouldRun && window._scheduleAudioTip) window._scheduleAudioTip();
      } else if(active && r!==_vsLastRatio){
        _vsLastRatio=r;
        _vsRetarget();
      } else if(_vsLastRatio===null){ _vsLastRatio=r; }
    }
  }catch(e){}
  requestAnimationFrame(_vsTick);
}
requestAnimationFrame(_vsTick);

(function(){
  var WINDOW_MS=150, STEADY_HOLD_MS=300, SEED_GRACE_MS=600;
  var samples=[], lastDir=null, seedTs=0, steadySince=null;
  function label(d){ return d==='up'?'WINDING UP':d==='down'?'WINDING DOWN':d==='steady'?'STEADY':'IDLE'; }
  function derive(now){
    var rpm=currentRPM;
    var so=parseFloat(get('nStateOffset').value); if(!(so>=0)) so=1;
    var LONG_MS=Math.max(WINDOW_MS,so*1000);
    samples.push({t:now,r:rpm});
    while(samples.length>2 && now-samples[1].t>=LONG_MS) samples.shift();
    var ref=samples[0];
    for(var i=samples.length-1;i>=0;i--){ if(now-samples[i].t>=WINDOW_MS){ ref=samples[i]; break; } }
    var dShort=rpm-ref.r, dLong=rpm-samples[0].r;
    var band=parseFloat(get('nRPMSnap').value)||1;
    var bandShort=(windDirection==='steady')?band*2:band;
    var d=Math.abs(dLong)>band ? dLong : dShort, b=Math.abs(dLong)>band ? band : bandShort;
    if(windDirection==='steady' && window._simSettled && rpm>0.5 && typeof isTorqueMode==='function' && isTorqueMode('up')) return 'steady';
    if(d>b) return 'up';
    if(rpm<=0.5) return 'idle';
    if(d<-b) return 'down';
    return 'steady';
  }
  function apply(d){
    windDirection=d;
    onStateOverrideTransition(d);
    if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
    get('statusTxt').textContent=label(d);
    get('playLed').style.cssText = d==='up' ? 'background:var(--warn)' : 'background:var(--led)';
    if(get('tUndulate').checked) applyContactorForPhase(d);
    setIndicators();
    if(d==='steady' && peakWaitMode==='startup'){ peakWaitMode='off'; _applyPeakWaitBtn(); }
  }
  function applyIdle(){
    windDirection='idle';
    onStateOverrideTransition('idle');
    get('statusTxt').textContent='IDLE';
    get('playLed').style.cssText='';get('playLed').className='led-dot';
    stopDampers();stopContactorAnim();setIndicators();
  }
  function frame(){
    try{
      var now=performance.now();
      if(windDirection!==lastDir){ lastDir=windDirection; seedTs=now; steadySince=null; samples=[]; }
      var d=derive(now);
      if(d!==windDirection && (d==='up'||d==='down')){
        apply(d); lastDir=windDirection; steadySince=null;
      } else if(d==='steady' && windDirection!=='steady' && (!windAnimId || (typeof isTorqueMode==='function' && isTorqueMode()))){
        if(steadySince===null) steadySince=now;
        if(now-steadySince>=STEADY_HOLD_MS && now-seedTs>=SEED_GRACE_MS){ apply('steady'); lastDir=windDirection; steadySince=null; }
      } else if(d==='idle' && windDirection!=='idle' && !windAnimId){
        if(steadySince===null) steadySince=now;
        if(now-steadySince>=STEADY_HOLD_MS){ applyIdle(); lastDir=windDirection; steadySince=null; }
      } else {
        steadySince=null;
      }
    }catch(e){}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

function _applyPeakWaitBtn(){
  const btn=get('btnCustomWaitPeak');
  if(!btn) return;
  const badge = document.getElementById('peakWaitBadge');
  if(peakWaitMode==='off'){
    if(badge) badge.textContent='OFF';
    btn.className='vbtn btn-gray';
  } else if(peakWaitMode==='startup'){
    if(badge) badge.textContent='ON STARTUP';
    btn.className='vbtn btn-yellow active';
  } else {
    if(badge) badge.textContent='ALWAYS';
    btn.className='vbtn btn-accent active';
  }
}
function updateDamperSubsectionOverlay() {
  var wrap = get('damperSubsectionWrap');
  if (!wrap) return;
  wrap.classList.toggle('damper-sub-disabled', !damperUserOn);
}
function damperRecalc(fromClick){
  var auto=null; try{ auto=window._feDamperAuto?window._feDamperAuto():null; }catch(e){}
  damperAutoCut=!!(damperUserOn && auto && auto.uses && !auto.powered);
  var eff=!!damperUserOn && !damperAutoCut;
  if(eff!==damperEnabled){
    damperEnabled=eff;
    var sab=get('seqActiveBadge'); if(sab) sab.style.display=damperEnabled?'':'none';
    if(damperEnabled){ if(fromClick||audioCtx){ if(fromClick) ensureAudio(); ensureDampers(); } }
    else { stopDampers(); if(_stateOverrideTimer){clearTimeout(_stateOverrideTimer);_stateOverrideTimer=null;} _clearStateOverride(); }
    setIndicators();
  }
}
function damperPaintButton(){
  var b=get('btnDamperHardDisable'); if(!b) return;
  b.textContent=damperUserOn?'DISABLE':'ENABLE';
  b.className=damperUserOn?'vbtn btn-accent':'vbtn btn-gray';
  get('damperBody').classList.toggle('disabled-overlay',!damperUserOn);
}

get('btnDamperHardDisable').addEventListener('click',()=>{
  const buttonShowsEnable = get('btnDamperHardDisable').textContent.trim() === 'ENABLE';
  damperUserOn = buttonShowsEnable; userDisabledDamper = !buttonShowsEnable;
  damperPaintButton();
  get('seqBox').classList.add('show');
  damperRecalc(true);
  setIndicators();
  updateDamperSubsectionOverlay();
});
setInterval(function(){ try{ damperRecalc(false); }catch(e){} },250);

get('tPulseHiLo').addEventListener('change',()=>{applyDamperModeUI();if(damperEnabled){stopDampers();ensureDampers();}});

get('btnSeqMode').addEventListener('click',function(){
});
get('seqBtnMinus').addEventListener('click',function(){
  if(seqStepCount>2){seqStepCount--;buildSeqUI();}
  if(seqModeActive&&damperEnabled){stopDampers();ensureDampers();}
});
get('seqBtnPlus').addEventListener('click',function(){
  if(seqStepCount<8){seqStepCount++;buildSeqUI();}
  if(seqModeActive&&damperEnabled){stopDampers();ensureDampers();}
});
get('seqAddGroup').addEventListener('click',function(){
  addSeqGroup();
});

(function(){
  function applyAndRefresh(isPulse){
    applySeqDefaults(isPulse);
    buildSeqUI();
    if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
    if(typeof window.saveSettings==='function') setTimeout(window.saveSettings,50);
  }
  var btnHiLo=get('seqPresetHiLo');
  if(btnHiLo) btnHiLo.addEventListener('click',function(){ applyAndRefresh(false); });
  var btnPulse=get('seqPresetPulse');
  if(btnPulse) btnPulse.addEventListener('click',function(){ applyAndRefresh(true); });
})();

function applyManualGains(){
  if(!audioCtx||!damperEnabled) return;
  const v=getV();const dual=v.chopper!=='single';const now=audioCtx.currentTime;const r=0.03;
  function applyPerm(key,base){
    const g=oscGroupAssign[key]||0;
    const on=seqManualGroupOn[g]||false;
    const vol=(seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
    const offVol2=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
    const mul=on?vol:offVol2*vol;
    const gn=gainNodes[key];
    if(gn) gn.gain.setTargetAtTime((permOscEnabled[key]?base:0)*mul,now,r);
  }
  applyPerm('hp',v.sHP*0.18);
  applyPerm('hv',v.sHV*0.18);
  applyPerm('lp',dual?v.sLP*0.18:0);
  applyPerm('lv',dual?v.sLV*0.18:0);
  applyPerm('ut',dual?v.sUT*0.18:0);
  applyPerm('ot',dual?v.sOT*0.18:0);
  extraOscs.forEach(function(eo){
    if(!eo.gainNode) return;
    const g=eo.seqGroup||0;
    const on=seqManualGroupOn[g]||false;
    const vol=(seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
    const offVol3=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
    const mul=on?vol:offVol3*vol;
    const base=(eo.mixerVal ?? 50)/100*0.18;
    const mute=isEoDisabled(eo);
    eo.gainNode.gain.setTargetAtTime(mute?0:base*mul,now,r);
  });
  setGroupIndicators(seqManualGroupOn.slice(0,seqNumGroups));
}

function enterSeqManualMode(){
  seqManualMode=true;
  seqManualGroupOn=seqManualGroupOn.map(function(){return false;});
  if(seqAnimId){cancelAnimationFrame(seqAnimId);seqAnimId=null;}
  var stopBtn=get('seqStopBtn');
  if(stopBtn){stopBtn.innerHTML='<svg class="si" aria-hidden="true"><use href="#si-tri-r"/></svg> RESUME';stopBtn.style.borderColor='var(--accent)';stopBtn.style.color='var(--accent)';}
  get('seqActiveBadge').style.display='';
  if(audioCtx) applyManualGains();
}

function exitSeqManualMode(){
  seqManualMode=false;
  seqManualGroupOn=seqManualGroupOn.map(function(){return false;});
  var stopBtn=get('seqStopBtn');
  if(stopBtn){stopBtn.innerHTML='<svg class="si" aria-hidden="true"><use href="#si-sq-f"/></svg> STOP';stopBtn.style.borderColor='var(--muted)';stopBtn.style.color='var(--muted)';}
  if(seqModeActive&&damperEnabled) startSeq();
}

(function(){

})();

buildSeqUI();
get('tUndulate').addEventListener('change',()=>{
  applyDamperModeUI();
  if(damperEnabled){
    damperContractorStart=performance.now();
    if(!get('tUndulate').checked){
      stopDampers();ensureDampers();stopContactorAnim();
    } else {
      if(windDirection!=='idle') applyContactorForPhase(windDirection);
    }
  }
});

get('tVibrato').addEventListener('change', function() {
  const on = this.checked;
  const fields = get('vibratoFields');
  if (fields) fields.classList.toggle('disabled-overlay', !on);
  if (!on) stopVibrato();
  else startVibrato();
});
startVibrato();
(function(){
  const tog = get('tPitchDecline');
  const fields = get('pitchDeclineFields');
  function syncPD(){ if(fields) fields.classList.toggle('disabled-overlay', !tog.checked); }
  tog.addEventListener('change', syncPD);
  syncPD();
})();
get('dChopper').addEventListener('change',()=>{chopperDiagPage=1;applyConfig();if(!chopperAnimEnabled) redrawChoppers(0,0);});
get('dWaveform').addEventListener('change',()=>{liveUpdateFreqs();refreshDefaultWaveformLabels();});
['eHigherPort','eLowerPort','eHigherVanes','eLowerVanes','eUndertone','eOvertone','eRPM'].forEach(id=>{
  get(id).addEventListener('input',()=>{liveUpdateFreqs();updateFreqDisplay();});
});
['sHVane','sLVane','sUT','sOT','sHP','sLP'].forEach(id=>{
  get(id).addEventListener('input',e=>{syncSliderLabel(e.target);liveUpdateFreqs();updateFreqDisplay();if(!chopperAnimEnabled) redrawChoppers(chopperAngleA,chopperAngleB);if(typeof pushGains==='function') pushGains(0.03);});
});

get('sMasterVol').addEventListener('input', () => {
  const val = parseFloat(get('sMasterVol').value);
  get('svMasterVol').textContent = val + '%';
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(val / 100, audioCtx.currentTime, 0.02);
  }
});


