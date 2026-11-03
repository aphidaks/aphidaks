
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
document.head.appendChild(script);


let presetModified = false;
let presetSnapshot = null;

function setPresetStatus(status) {
  const dot = get('presetStatusDot');
  if (status === 'current') {
    dot.className = 'ind-dot on-green';
    presetModified = false;
  } else if (status === 'modified') {
    dot.className = 'ind-dot on-red';
    presetModified = true;
  } else {
    dot.className = 'ind-dot';
    presetModified = false;
  }
}

function capturePresetSnapshot() {
  return JSON.stringify({
    functions: gatherFunctionsData(),
    controls: gatherControlsData(),
    timbre: gatherTimbreData(),
    oscillators: gatherOscillatorsData(),
    diagram: gatherDiagramData(),
    rotorConfig: gatherRotorConfigData()
  });
}

function checkForModifications() {
  if (!presetSnapshot) return;
  const current = capturePresetSnapshot();
  if (current !== presetSnapshot && !presetModified) {
    setPresetStatus('modified');
  }
}

function gatherFunctionsData() {
  return {
    windUpOffset: parseFloat(get('nWindUp').value),
    windUpFn: get('dWindUpFn').value,
    windUpEasing: get('dWindUpEasing').value,
    windDownOffset: parseFloat(get('nWindDown').value),
    windDownFn: get('dWindDownFn').value,
    windDownEasing: get('dWindDownEasing').value,
    sdAutoFill: !!(get('tSdAutoFill') && get('tSdAutoFill').checked),
    sdWindUpOffset: parseFloat(get('nSdWindUp') ? get('nSdWindUp').value : 7.5),
    sdWindUpFn: get('dSdWindUpFn') ? get('dSdWindUpFn').value : 'sine',
    sdWindUpEasing: get('dSdWindUpEasing') ? get('dSdWindUpEasing').value : 'easeout',
    sdWindDownOffset: parseFloat(get('nSdWindDown') ? get('nSdWindDown').value : 120),
    sdWindDownFn: get('dSdWindDownFn') ? get('dSdWindDownFn').value : 'exponential',
    sdWindDownEasing: get('dSdWindDownEasing') ? get('dSdWindDownEasing').value : 'easeout',
    torqueEnabled: get('tTorque').checked,
    torqueRPM: parseFloat(get('nTorqueRPM').value),
    torqueOffset: parseFloat(get('nTorqueOffset').value),
    torqueFn: get('dTorqueFn').value,
    torqueEasing: get('dTorqueEasing').value,
    highVaneLength: parseFloat(get('sHVane').value),
    lowVaneLength: parseFloat(get('sLVane').value),
    vibratoEnabled: get('tVibrato').checked,
    vibratoSpeed: parseFloat(get('nVibratoSpeed').value),
    vibratoDepth: parseFloat(get('nVibratoDepth').value),
    rpmSnap: parseFloat(get('nRPMSnap').value),
    stateOffset: parseFloat(get('nStateOffset').value),
    tailSpeed: parseFloat(get('nTailSpeed').value),
    dualMotorEnabled: get('tDualMotor') ? get('tDualMotor').checked : false,
    dualMotorPeakRPM: parseFloat(get('nDualMotorPeakRPM').value) || 0,
    dualMotorDelay: parseFloat(get('nDualMotorDelay').value) || 0,
    extraMotors: (typeof window._getExtraMotors==='function') ? window._getExtraMotors() : [],
    pitchDeclineEnabled: get('tPitchDecline') ? get('tPitchDecline').checked : false,
    voltageDeclineMinV: parseFloat(get('nPitchDeclineRPM').value) || 0,
    voltageDeclineRate: parseFloat(get('nPitchDeclineTime').value) || 5,
    pitchDeclineFn: get('dPitchDeclineFn') ? get('dPitchDeclineFn').value : 'sine',
    pitchDeclineEasing: get('dPitchDeclineEasing') ? get('dPitchDeclineEasing').value : 'easeout'
  };
}

function applySeqDefaults(isPulse) {
  if (isPulse === undefined) isPulse = !get('tPulseHiLo').checked;
  if (isPulse) {
    seqStepCount = 4;
    seqNumGroups = 3;
    seqGroups = [[1,0,1,0],[1,0,1,0],[1,0,1,0]];
    seqGroupVol = [100,100,100,100,100,100,100,100];
    seqGroupVolOff = [10,10,10,10,10,10,10,10];
  } else {
    seqStepCount = 4;
    seqNumGroups = 3;
    seqGroups = [[1,0,1,0],[0,1,0,1],[1,0,1,0]];
    seqGroupVol = [100,100,80,100,100,100,100,100];
    seqGroupVolOff = [10,10,65,10,10,10,10,10];
  }
  oscGroupAssign.hp = 0; oscGroupAssign.hv = 0;
  oscGroupAssign.lp = 1; oscGroupAssign.lv = 1;
  oscGroupAssign.ut = 2; oscGroupAssign.ot = 2;
  oscSideAssign.hp = 1; oscSideAssign.hv = 1;
  oscSideAssign.lp = 1; oscSideAssign.lv = 1;
  oscSideAssign.ut = 1; oscSideAssign.ot = 1;
}

