
function ensureDampers(){
  if(!damperEnabled||!audioCtx) return;
  if(seqModeActive){
    const isConstantMode = !(get('tUndulate') && get('tUndulate').checked);
    if(isConstantMode && seqAnimId) return;
    if(seqAnimId){cancelAnimationFrame(seqAnimId);seqAnimId=null;}
    seqPhaseStart=performance.now();
    applySeqStep();
    updateSeqMarkerHighlight();
    seqAnimId=requestAnimationFrame(tickSeq);
    if(!isConstantMode && windDirection !== 'idle'){
      applyContactorForPhase(windDirection);
    }
    return;
  }
  if(damperAnimId){cancelAnimationFrame(damperAnimId);damperAnimId=null;}
  damperVar=true;
  if(typeof window._daUpdate === 'function') window._daUpdate();
  damperPhaseStart=performance.now()-999999;
  if(get('tUndulate').checked) damperContractorStart=performance.now();
  damperAnimId=requestAnimationFrame(tickDamper);
}

function stopDampers(){
  const isConstantMode = !(get('tUndulate') && get('tUndulate').checked);
  if(!isConstantMode || !seqModeActive || !damperEnabled){
    if(seqAnimId){cancelAnimationFrame(seqAnimId);seqAnimId=null;}
  }
  if(damperAnimId){cancelAnimationFrame(damperAnimId);damperAnimId=null;}
  damperVar=true;
  currentHalfPeriod=Infinity;
  updateSeqMarkerHighlight();
  pushGains(0.05);
  setIndicators();
  if(typeof window._daStopAll === 'function') window._daStopAll();
  if(damperExtraRPM!==0 && currentRPM>0){
    const returnTimeMs=(parseFloat(get('nDampReturnTime').value)||0.8)*1000;
    if(extraRPMAnimId){cancelAnimationFrame(extraRPMAnimId);extraRPMAnimId=null;}
    const fromRPM=damperExtraRPM;
    const startMs=performance.now();
    function tick(ts){
      const t=Math.max(0,Math.min(1,(ts-startMs)/returnTimeMs));
      damperExtraRPM=fromRPM*(1-t);
      liveUpdateFreqs();updateFreqDisplay();
      if(t<1){extraRPMAnimId=requestAnimationFrame(tick);}
      else{damperExtraRPM=0;extraRPMAnimId=null;liveUpdateFreqs();updateFreqDisplay();}
    }
    extraRPMAnimId=requestAnimationFrame(tick);
  } else {
    if(extraRPMAnimId){cancelAnimationFrame(extraRPMAnimId);extraRPMAnimId=null;}
    damperExtraRPM=0;
  }
}

let vibratoAnimId = null;
let vibratoPhase = 0;
let vibratoLastTs = null;
let vibratoExtraRPM = 0;

function startVibrato() {
  if (vibratoAnimId) { cancelAnimationFrame(vibratoAnimId); vibratoAnimId = null; }
  vibratoPhase = 0;
  vibratoLastTs = null;
  vibratoExtraRPM = 0;
  function tick(ts) {
    vibratoAnimId = requestAnimationFrame(tick);
    const dt = vibratoLastTs === null ? 0 : Math.min((ts - vibratoLastTs) / 1000, 0.1);
    vibratoLastTs = ts;
    const enabled = get('tVibrato') && get('tVibrato').checked;
    const windingDown = (typeof windDirection !== 'undefined' && windDirection === 'down');
    if (!enabled || currentRPM <= 0 || windingDown) {
      if (vibratoExtraRPM !== 0) {
        vibratoExtraRPM = 0;
        liveUpdateFreqs(); updateFreqDisplay();
      }
      return;
    }
    const speed = Math.max(0.05, parseFloat(get('nVibratoSpeed').value) || 2.0);
    const depth = Math.max(0, parseFloat(get('nVibratoDepth').value) || 50);
    vibratoPhase = (vibratoPhase + dt / speed) % 1;
    vibratoExtraRPM = depth * (vibratoPhase < 0.5 ? vibratoPhase * 2 : (1 - vibratoPhase) * 2);
    liveUpdateFreqs(); updateFreqDisplay();
  }
  vibratoAnimId = requestAnimationFrame(tick);
}

function stopVibrato() {
  if (vibratoAnimId) { cancelAnimationFrame(vibratoAnimId); vibratoAnimId = null; }
  vibratoExtraRPM = 0;
  vibratoLastTs = null;
  liveUpdateFreqs(); updateFreqDisplay();
}

function getHalfPeriod(now_ms){
  const rate=parseFloat(get('nDampRate').value)||800;
  const isUndulate=get('tUndulate').checked;
  if(!isUndulate) return rate;
  const contractorMs=parseFloat(get('nDampContactor').value)||3000;
  const elapsed=now_ms-damperContractorStart;
  const prog=Math.min(1,elapsed/contractorMs);
  const maxHP = 1300;const minHP=rate/2;
  return maxHP-(maxHP-minHP)*prog;
}

function tickDamper(){
  if(!damperEnabled||!audioCtx){damperAnimId=null;return;}
  const now_ms=performance.now();
  const isUndulate=get('tUndulate').checked;
  const isPulse=!get('tPulseHiLo').checked;
  const rateOffset=(parseFloat(get('nDampRateOffset').value)||0)*getOffsetMultiplier();

  if(isUndulate){
    damperAnimId=requestAnimationFrame(tickDamper);
    return;
  }

  const halfPeriod=getHalfPeriod(now_ms);
  currentHalfPeriod=halfPeriod;
  const onDuration=halfPeriod+(rateOffset/2);
  const offDuration=Math.max(20,halfPeriod-(rateOffset/2));
  const phaseDuration=damperVar?onDuration:offDuration;
  const elapsed=now_ms-damperPhaseStart;

  if(elapsed>=phaseDuration){
    damperVar=!damperVar;
    damperPhaseStart=now_ms;
    pushGains(0.03);
    setIndicators();
    if(isPulse && !(typeof torqueRaiseActive==='function' && torqueRaiseActive())){
      const raiseRPM=parseFloat(get('nDampRPMRaise').value)||200;
      const raiseTimeMs=(parseFloat(get('nDampRaiseTime').value)||0.5)*1000;
      const returnTimeMs=(parseFloat(get('nDampReturnTime').value)||0.8)*1000;
      if(!damperVar) animateExtraRPM(windDirection==='down'?0:raiseRPM,raiseTimeMs);
      else animateExtraRPM(0,returnTimeMs);
    }
  }
  damperAnimId=requestAnimationFrame(tickDamper);
}

function animateExtraRPM(target,durMs){
  if(extraRPMAnimId&&extraRPMTo===target) return;
  if(!extraRPMAnimId&&damperExtraRPM===target) return;
  if(currentRPM<=0&&target>0){
    if(extraRPMAnimId){cancelAnimationFrame(extraRPMAnimId);extraRPMAnimId=null;}
    damperExtraRPM=0;
    liveUpdateFreqs();updateFreqDisplay();
    return;
  }
  if(extraRPMAnimId){cancelAnimationFrame(extraRPMAnimId);extraRPMAnimId=null;}
  extraRPMFrom=damperExtraRPM;extraRPMTo=target;extraRPMDurMs=Math.max(10,durMs);extraRPMStartMs=performance.now();
  function tick(ts){
    const t=Math.max(0,Math.min(1,(ts-extraRPMStartMs)/extraRPMDurMs));
    damperExtraRPM=extraRPMFrom+(extraRPMTo-extraRPMFrom)*t;
    liveUpdateFreqs();updateFreqDisplay();
    if(t<1){extraRPMAnimId=requestAnimationFrame(tick);}else extraRPMAnimId=null;
  }
  extraRPMAnimId=requestAnimationFrame(tick);
}

function applyDamperModeUI(){
  const isUndulate=get('tUndulate').checked;
  const uf=get('dampUndulateFields');
  uf.classList.toggle('dim',!isUndulate);uf.querySelectorAll('input').forEach(i=>i.disabled=!isUndulate);
  get('contactorSection').style.display=isUndulate?'block':'none';
  updateContactorMaxRpmLabel();
}

const oscGroupAssign = {hp:0, hv:0, lp:1, lv:1, ut:2, ot:2};
function getOscGroup(key){ return oscGroupAssign[key]!==undefined ? oscGroupAssign[key] : 0; }
const oscSideAssign = {hp:1, hv:1, lp:1, lv:1, ut:1, ot:1};
function sideDropdownColor(val){
  if(val==='both') return 'var(--purple)';
  return parseInt(val)===2 ? 'var(--blue)' : 'var(--led)';
}
function getExtraOscGroup(eo){ return eo.seqGroup !== undefined ? eo.seqGroup : 0; }

