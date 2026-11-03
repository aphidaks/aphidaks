


function getFilterCutoff(){
  const peakRPM=parseFloat(get('eRPM').value)||3600;
  const rpm=Math.max(0,Math.min(peakRPM,currentRPM));
  const t=peakRPM>0?rpm/peakRPM:0;
  const fn=get('dFilterFn').value;
  const easing=get('dFilterEasing').value;
  const low=Math.max(1,parseFloat(get('nFilterLow').value)||55)/100;
  const high=Math.max(1,parseFloat(get('nFilterHigh').value)||85)/100;
  const offset=(parseFloat(get('sFilterOffset').value)||0)/100;
  const tShifted=steepWarp(Math.max(0,Math.min(1, t - offset * 0.5)), get('sFilterSteep').value);
  const pct=low+(high-low)*applyFn(fn,tShifted,easing);
  return 20*Math.pow(1000,pct);
}

function updateFilterCutoff(){
  if(!audioCtx) return;
  if(!lpfEnabled||!filterNodes.length){
    get('filterMeter').style.width='0%';
    get('filterCutoffTxt').textContent=lpfEnabled?'-- Hz':'BYPASS';
    return;
  }
  const hz=getFilterCutoff();
  const now=audioCtx.currentTime;
  filterNodes.forEach(f=>f.frequency.setTargetAtTime(Math.min(hz,audioCtx.sampleRate/2-1),now,0.05));
  const pct=Math.min(100,Math.round((Math.log10(hz/20)/Math.log10(1000))*100));
  get('filterMeter').style.width=pct+'%';
  get('filterCutoffTxt').textContent=hz>=1000?(hz/1000).toFixed(1)+'k Hz':Math.round(hz)+' Hz';
}

function ensureAudio(){
  if(audioCtx){
    if(audioCtx.state==='suspended') audioCtx.resume();
    return;
  }
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = parseFloat(get('sMasterVol').value) / 100;
  masterGain.connect(audioCtx.destination);
  startNormMeter();
  const v=getV();
  const slope=parseInt(get('dFilterSlope').value)||6;
  const count=slope/6;
  if(lpfEnabled){
    for(let i=0;i<count;i++){
      const f=audioCtx.createBiquadFilter();f.type='lowpass';f.Q.value=0.7071;
      if(filterNodes.length) filterNodes[filterNodes.length-1].connect(f);
      filterNodes.push(f);
    }
  }
  ['hp','lp','hv','lv','ut','ot'].forEach(k=>{
    const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();
    const wf=getPermWaveform(k,v.waveform);
    osc._rasp=permRasp[k];
    osc.type='sine';setOscWaveform(osc,wf);osc.frequency.setValueAtTime(0.01,audioCtx.currentTime);
    gain.gain.setValueAtTime(0,audioCtx.currentTime);
    const bf=audioCtx.createBiquadFilter();
    bf.type='lowpass';bf.Q.value=getBidirLpfQ();bf.frequency.setValueAtTime(getBidirLpfOpenHz(),audioCtx.currentTime);
    osc.connect(bf);bf.connect(gain);
    oscNodes[k]=osc;gainNodes[k]=gain;oscNodes['_wf_'+k]=wf;bidirFilterNodes[k]=bf;
    connectPermOscOutput(k, gain, _sirenInNode());
    osc.start();
  });
  ['hpSt','lpSt'].forEach(k=>{
    const osc=audioCtx.createOscillator();const gain=audioCtx.createGain();
    const rotorKey = k==='hpSt' ? 'hp' : 'lp';
    osc.type='sine';setOscWaveform(osc,getPermWaveform(rotorKey,v.waveform));osc.frequency.setValueAtTime(0.01,audioCtx.currentTime);
    gain.gain.setValueAtTime(0,audioCtx.currentTime);
    osc.connect(gain);gain.connect(_sirenInNode());osc.start();
    oscNodes[k]=osc;gainNodes[k]=gain;
  });
  extraOscs.forEach(eo => {
    buildExtraOscAudio(eo);
    if(eo.type === 'rotor' && !eo.statorLinked) buildStatorAudio(eo);
  });
  rebuildFxChain();
}

function updateNormalizerParams() {
  if (!normPreGainNode || !normLimiterNode || !normPostGainNode || !audioCtx) return;
  const now = audioCtx.currentTime;
  const preGainPct  = parseFloat(get('sNormPreGain').value)  || 0;
  const postGainPct = parseFloat(get('sNormPostGain').value) || 0;
  const ceilingRaw  = parseFloat(get('nNormCeiling').value);
  const ceilingDb   = isNaN(ceilingRaw) ? 0 : Math.max(-60, Math.min(0, ceilingRaw));
  if (normEnabled) {
    normPreGainNode.gain.setTargetAtTime(preGainPct / 100, now, 0.02);
    normLimiterNode.threshold.setTargetAtTime(ceilingDb, now, 0.02);
    normLimiterNode.ratio.setTargetAtTime(20, now, 0.02);
    normPostGainNode.gain.setTargetAtTime(postGainPct / 100, now, 0.02);
  } else {
    normPreGainNode.gain.setTargetAtTime(1, now, 0.02);
    normLimiterNode.ratio.setTargetAtTime(1, now, 0.02);
    normPostGainNode.gain.setTargetAtTime(1, now, 0.02);
  }
}

function startNormMeter() {
  if (normMeterRafId) return;
  function tick() {
    const meter = get('normGrMeter');
    const txt = get('normGrTxt');
    if (meter) {
      const gr = (normEnabled && normLimiterNode) ? (normLimiterNode.reduction || 0) : 0;
      const pct = Math.max(0, Math.min(100, (-gr / 24) * 100));
      meter.style.width = pct + '%';
      if (txt) txt.textContent = gr.toFixed(1) + ' dB';
    }
    normMeterRafId = requestAnimationFrame(tick);
  }
  normMeterRafId = requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', function() {
  if(document.visibilityState==='visible' && audioCtx && audioCtx.state==='suspended'){
    audioCtx.resume();
  }
});
function _resumeAudioCtxOnGesture(){
  if(audioCtx && audioCtx.state==='suspended') audioCtx.resume();
}
document.addEventListener('touchstart', _resumeAudioCtxOnGesture, {passive:true});
document.addEventListener('click', _resumeAudioCtxOnGesture, {passive:true});

function setIndicators(){
  const isWinding=windDirection==='up'||windDirection==='steady';
  const redOn=isWinding||active;
  get('indActive').className='ind-dot'+(redOn?' on-red':'');
  get('indNormal').className='ind-dot'+((windDirection!=='idle'&&!usingTorqueFn)?' on-green':'');
  get('indTorque').className='ind-dot'+((windDirection!=='idle'&&usingTorqueFn)?' on-yellow':'');
  if(seqModeActive&&damperEnabled){
    if(typeof _stateOverrideApplied !== 'undefined' && _stateOverrideApplied !== null){
      const overrideOn = _stateOverrideApplied === 'on';
      const arr = new Array(seqNumGroups).fill(overrideOn);
      setGroupIndicators(arr);
      return;
    }
    const arr=seqGroups.slice(0,seqNumGroups).map(function(g,gi){
      return _grpOnNow(gi);
    });
    setGroupIndicators(arr);
    return;
  }
  const isPulse=!get('tPulseHiLo').checked;
  const _sdCfgDown = typeof _stateOverrideConfig !== 'undefined' ? _stateOverrideConfig['down'] : null;
  const _sdDownDefaultOn = _sdCfgDown ? _sdCfgDown.defaultOn : true;
  const undulateWindDown = damperEnabled && get('tUndulate').checked && windDirection==='down' && _sdDownDefaultOn;
  const hiOn=damperEnabled&&(undulateWindDown||damperVar);
  const loOn=damperEnabled&&(undulateWindDown||(isPulse?damperVar:!damperVar));
  setGroupIndicators([hiOn,loOn]);
}

function setActive(val){
  if(window._simStopped) return;
  if(val===active) return;
  active=val;
  if(val){
    if(_wasCancelled && !_peakWaitUserDisabled && peakWaitMode==='off'){
      peakWaitMode='startup';
      _applyPeakWaitBtn();
    }
    _wasCancelled=false;
    ensureAudio();
    const torqueEnabled=get('tTorque').checked;
    const switchRPM=parseFloat(get('nTorqueRPM').value)||1600;
    usingTorqueFn=torqueEnabled&&didWindDown&&(currentRPM>=switchRPM)&&!windDownCrossedSwitch;
    startWind('up');
    get('statusTxt').textContent='WINDING UP';
    get('playLed').style.cssText='background:var(--warn)';
    if(get('tUndulate').checked) applyContactorForPhase('up');
  } else {
    didWindDown=true;
    windDownCrossedSwitch=false;
    startWind('down');
    get('statusTxt').textContent='WINDING DOWN';
    get('playLed').style.cssText='background:var(--led)';
    if(get('tUndulate').checked) applyContactorForPhase('down');
  }
  setIndicators();
}

function forceBothDampersOn(){
  if(!audioCtx) return;
  const v=getV();const dual=v.chopper!=='single';const now=audioCtx.currentTime;const r=0.06;
  gainNodes.hp&&gainNodes.hp.gain.setTargetAtTime(v.sHP*0.18,now,r);
  gainNodes.hv&&gainNodes.hv.gain.setTargetAtTime(v.sHV*0.18,now,r);
  gainNodes.lp&&gainNodes.lp.gain.setTargetAtTime(dual?v.sLP*0.18:0,now,r);
  gainNodes.lv&&gainNodes.lv.gain.setTargetAtTime(dual?v.sLV*0.18:0,now,r);
  gainNodes.ut&&gainNodes.ut.gain.setTargetAtTime(dual?v.sUT*0.18:0,now,r);
  gainNodes.ot&&gainNodes.ot.gain.setTargetAtTime(dual?v.sOT*0.18:0,now,r);
}



function startWind(dir){
  if(window._simStopped) return;
  window._dirReversing = false;
  if(windAnimId){cancelAnimationFrame(windAnimId);windAnimId=null;}
  windDirection=dir;
  onStateOverrideTransition(dir);
  if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
  windStartTime=null;
  windStartRPM=currentRPM;
  if(isTorqueMode(dir)){ startTorqueSim(); return; }
  const v=getV();
  const peak=v.peakRPM;
  const switchRPM=parseFloat(get('nTorqueRPM').value)||1600;
  let fn,offset,easing;
  const _sdShut = window._bothDampersShut && window._bothDampersShut();
  if(dir==='up'){
    const _om=getOffsetMultiplier();
    if(usingTorqueFn){fn=get('dTorqueFn').value;offset=(parseFloat(get('nTorqueOffset').value)||8)*_om;easing=get('dTorqueEasing').value;}
    else if(_sdShut){fn=get('dSdWindUpFn').value||get('dWindUpFn').value;offset=(parseFloat(get('nSdWindUp').value)||7.5)*_om;easing=get('dSdWindUpEasing').value||get('dWindUpEasing').value;}
    else{fn=get('dWindUpFn').value;offset=(parseFloat(get('nWindUp').value)||8)*_om;easing=get('dWindUpEasing').value;}
  } else {
    const _om=getOffsetMultiplier();
    if(_sdShut){fn=get('dSdWindDownFn').value||get('dWindDownFn').value;offset=(parseFloat(get('nSdWindDown').value)||120)*_om;easing=get('dSdWindDownEasing').value||get('dWindDownEasing').value;}
    else{fn=get('dWindDownFn').value;offset=(parseFloat(get('nWindDown').value)||20)*_om;easing=get('dWindDownEasing').value;}
  }
  function tick(ts){
    if(!windStartTime) windStartTime=ts;
    const elapsed=(ts-windStartTime)/1000;
    if(dir==='up'){
      const peak=getEffectivePeakRPM();
      if(steadyActive && peak < currentRPM-(parseFloat(get('nRPMSnap').value)||1)){
        windAnimId=null;
        if(getVoltageRatio()<=0){ if(active) setActive(false); else startWind('down'); }
        else _vsSlowToTarget();
        return;
      }
      const t=Math.min(1,elapsed/offset);
      currentRPM=windStartRPM+(peak-windStartRPM)*applyFn(fn,t,easing);
      if(currentRPM>=peak-(parseFloat(get('nRPMSnap').value)||1)){currentRPM=peak;onReachPeak();return;}
    } else {
      const t=Math.min(1,elapsed/offset);
      currentRPM=windStartRPM*(1-applyFn(fn,t,easing));
      if(!windDownCrossedSwitch&&currentRPM<switchRPM) windDownCrossedSwitch=true;
      if(currentRPM<=0.5){currentRPM=0;onReachZero();return;}
    }
    liveUpdateFreqs();updateFreqDisplay();setIndicators();
    windAnimId=requestAnimationFrame(tick);
  }
  windAnimId=requestAnimationFrame(tick);
}

function onReachPeak(){
  windAnimId=null;currentRPM=getEffectivePeakRPM();windDirection='steady';
  onStateOverrideTransition('steady');
  if(damperEnabled && seqModeActive && audioCtx) applySeqStep();
  liveUpdateFreqs();updateFreqDisplay();
  get('statusTxt').textContent='STEADY';get('playLed').style.cssText='background:var(--led)';
  if(get('tUndulate').checked) applyContactorForPhase('steady');
  setIndicators();
  if(peakWaitMode==='startup'){
    peakWaitMode='off';
    _applyPeakWaitBtn();
  }
  _startPitchDecline();
}

