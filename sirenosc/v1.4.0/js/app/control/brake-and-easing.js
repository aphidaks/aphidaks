
function _syncSpinDir(){ window._spinDir = (typeof window.getWiringDir==='function') ? window.getWiringDir() : 'cw'; }
function doBrake(onDone, keepSignal){
  if(active) setActive(false);
  if(windAnimId){cancelAnimationFrame(windAnimId);windAnimId=null;}

  const startRPM = currentRPM > 0 ? currentRPM : 0;
  const brakeOffset = parseFloat((get('nBrakeOffset')||{value:0.1}).value) || 0.1;
  const brakeFn = get('dBrakeFn') ? get('dBrakeFn').value : 'linear';
  const brakeEasing = get('dBrakeEasing') ? get('dBrakeEasing').value : 'easeout';

  if (startRPM <= 0) {
    currentRPM = 0; damperExtraRPM = 0;
    _resetPitchDeclineState();
    stopDampers(); stopContactorAnim();
    liveUpdateFreqs(); updateFreqDisplay();
    get('statusTxt').textContent = 'IDLE';
    get('playLed').style.cssText = ''; get('playLed').className = 'led-dot';
    windDirection = 'idle';
    onStateOverrideTransition('idle');
    setIndicators();
    _syncSpinDir();
    if(onDone) onDone();
    return;
  }

  windDirection = 'down';
  get('statusTxt').textContent = 'BRAKING';
  onStateOverrideTransition('down');
  setIndicators();

  const brakeStart = performance.now();
  function brakeTick(ts) {
    const elapsed = (ts - brakeStart) / 1000;
    const t = Math.min(1, elapsed / brakeOffset);
    currentRPM = startRPM * (1 - applyFn(brakeFn, t, brakeEasing));
    liveUpdateFreqs(); updateFreqDisplay(); setIndicators();
    if (t >= 1) {
      currentRPM = 0; damperExtraRPM = 0;
      windAnimId = null;
      _resetPitchDeclineState();
      stopDampers(); stopContactorAnim();
      liveUpdateFreqs(); updateFreqDisplay();
      get('statusTxt').textContent = 'IDLE';
      get('playLed').style.cssText = ''; get('playLed').className = 'led-dot';
      windDirection = 'idle';
      onStateOverrideTransition('idle');
      setIndicators();
      _syncSpinDir();
      if(onDone) onDone();
      return;
    }
    windAnimId = requestAnimationFrame(brakeTick);
  }
  windAnimId = requestAnimationFrame(brakeTick);
}

window._spinDir = window._spinDir || 'cw';
window._dirReversing = false;
window.onWiringDirChange = function(newDir){
  if(window._dirReversing) return;
  if(isTorqueMode(active?'up':'down')){
    if(currentRPM<=1) window._spinDir=newDir;
    else if(active && windDirection!=='up'){ startWind('up'); _vsStatus('up'); }
    return;
  }
  if(newDir === window._spinDir) return;
  if(currentRPM + damperExtraRPM > 1){
    const wasActive = active;
    doBrake(function(){
      window._dirReversing = false;
      _syncSpinDir();
      if(steadyActive && getVoltageRatio()>0 && !active) setActive(true);
    }, true);
    window._dirReversing = true;
  } else {
    window._spinDir = newDir;
  }
};

const easingGroups = [
  {groupId:'egWindUp',   hiddenId:'dWindUpEasing'},
  {groupId:'egWindDown', hiddenId:'dWindDownEasing'},
  {groupId:'egTorque',   hiddenId:'dTorqueEasing'},
  {groupId:'egFilter',   hiddenId:'dFilterEasing'},
  {groupId:'egContactorUp',   hiddenId:'dContactorWindUpEasing'},
  {groupId:'egContactorDown', hiddenId:'dContactorWindDownEasing'},
  {groupId:'egPitchDecline',  hiddenId:'dPitchDeclineEasing'},
  {groupId:'egBrake',  hiddenId:'dBrakeEasing'},
  {groupId:'egSdWindUp',   hiddenId:'dSdWindUpEasing'},
  {groupId:'egSdWindDown', hiddenId:'dSdWindDownEasing'},
  {groupId:'egRotWindUp',   hiddenId:'dRotWindUpEasing'},
  {groupId:'egRotWindDown', hiddenId:'dRotWindDownEasing'},
];
easingGroups.forEach(({groupId, hiddenId}) => {
  const group = get(groupId);
  if (!group) return;
  group.querySelectorAll('.ease-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.ease-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      get(hiddenId).value = btn.dataset.val;
      if (audioCtx && hiddenId === 'dFilterEasing') buildFilterChain();
      checkForModifications();
    });
  });
});

function setEasingGroup(groupId, hiddenId, val) {
  const group = get(groupId);
  if (!group) return;
  get(hiddenId).value = val;
  group.querySelectorAll('.ease-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === val);
  });
}
['dFilterSlope','dFilterFn','dFilterEasing','nFilterLow','nFilterHigh'].forEach(id=>{
  get(id).addEventListener('change',()=>{
    if(audioCtx) buildFilterChain();
    updateFilterCutoff();
    checkForModifications();
  });
});

