let _vdVolts = null;
let _pdRafId = null;

function getOffsetMultiplier(){
  var r=getVoltageRatio();
  return r>0?1/r:1;
}

function getLiveVoltageApplied(){
  var sel=get('peakVoltageSelect'); if(!sel) return 0;
  var ratedV=sel.value==='other'?parseFloat(get('peakVoltageOther').value):parseFloat(sel.value);
  if(!(ratedV>0)) ratedV=240;
  var r=getVoltageRatio();
  return steadyActive ? ratedV*(r>0?r:0) : 0;
}
(function(){
  var last=null;
  function tick(){
    var el=document.getElementById('liveVoltageDisplay');
    if(el){
      var v=getLiveVoltageApplied(), txt=(Math.round(v*10)/10)+' V';
      if(txt!==last){ last=txt; el.textContent=txt; }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

function getVoltageRatio(){
  var peak=get('peakVoltageSelect');
  var live=get('liveVoltageInput');
  if(!peak||!live) return 1;
  var peakVal=peak.value==='other'
    ? parseFloat(get('peakVoltageOther').value)
    : parseFloat(peak.value);
  var liveVal=parseFloat(live.value);
  if(window._testOverride===true){ var pk0=peak.value==='other'?parseFloat(get('peakVoltageOther').value):parseFloat(peak.value); return 1; }
  var sv=(typeof window._ceSirenVoltage==='function')?window._ceSirenVoltage():null;
  if(sv!==null&&isFinite(sv)) liveVal=Math.max(0,sv);
  if(_vdVolts!==null) liveVal=Math.min(liveVal,_vdVolts);
  if(!(liveVal>0)) return 0;
  if(!peakVal||peakVal<=0||isNaN(peakVal)) return 1;
  return liveVal/peakVal;
}

function getEffectivePeakRPM(){
  var base=(parseFloat(get('eRPM').value) || 3600);
  return base * getVoltageRatio();
}

function _startPitchDecline(){
  if(!get('tPitchDecline') || !get('tPitchDecline').checked) return;
  if(_pdRafId !== null || _vdVolts !== null) return;
  const startV  = getLiveVoltageApplied();
  const minV    = Math.max(0, parseFloat(get('nPitchDeclineRPM').value) || 0);
  if(!(startV > 0) || minV >= startV) return;
  const rate    = Math.max(0.01, parseFloat(get('nPitchDeclineTime').value) || 5);
  const declineTime = (startV - minV) / rate;
  const declineFn   = (get('dPitchDeclineFn')   || {value:'sine'}).value    || 'sine';
  const declineEase = (get('dPitchDeclineEasing')|| {value:'easeout'}).value || 'easeout';
  _vdVolts = startV;
  const startTime = performance.now();
  function tick(ts){
    const elapsed = (ts - startTime) / 1000;
    const t = Math.min(1, elapsed / declineTime);
    const curved = applyFn(declineFn, t, declineEase);
    _vdVolts = startV + (minV - startV) * curved;
    const _scaledPeak = getEffectivePeakRPM();
    if(currentRPM > _scaledPeak) currentRPM = _scaledPeak;
    liveUpdateFreqs(); updateFreqDisplay(); setIndicators();
    if(t >= 1){
      _vdVolts = minV;
      if(currentRPM > getEffectivePeakRPM()) currentRPM = getEffectivePeakRPM();
      _pdRafId = null;
      liveUpdateFreqs(); updateFreqDisplay(); setIndicators();
      return;
    }
    _pdRafId = requestAnimationFrame(tick);
  }
  _pdRafId = requestAnimationFrame(tick);
}

function _resetPitchDeclineState(){
  if(_pdRafId){ cancelAnimationFrame(_pdRafId); _pdRafId = null; }
  _vdVolts = null;
}

function onReachZero(){
  window._simSettled=false;
  windAnimId=null;currentRPM=0;windDirection='idle';
  onStateOverrideTransition('idle');
  if(extraRPMAnimId){cancelAnimationFrame(extraRPMAnimId);extraRPMAnimId=null;}
  damperExtraRPM=0;
  _resetPitchDeclineState();
  liveUpdateFreqs();updateFreqDisplay();
  get('statusTxt').textContent='IDLE';get('playLed').style.cssText='';get('playLed').className='led-dot';
  stopDampers();
  stopContactorAnim();setIndicators();
  if(!_peakWaitUserDisabled && peakWaitMode==='off'){
    peakWaitMode='startup';
    _applyPeakWaitBtn();
  }
}

