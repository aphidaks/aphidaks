const MAX_MOTORS = 8;
let dualMotorEnabled = true;
let motor2RPM = 0;
let motorRPMs = {};
let extraMotors = [];
let motor2History = [];
let motor2AnimId = null;

function getDualMotorDelay() { return parseFloat(get('nDualMotorDelay').value) || 0; }
function getDualMotorPeak() { const v = parseFloat(get('nDualMotorPeakRPM').value); return isFinite(v) ? Math.max(0, v) : 0; }
function motorGearRatio(peak) { const ref = parseFloat(get('eRPM').value) || 3600; return ref > 0 ? peak / ref : 1; }
function getMotorCount() { return 2 + extraMotors.length; }

function computeFollowerRPM(delayMs, peak) {
  const gear = motorGearRatio(peak);
  const now = performance.now();
  if (delayMs <= 0) {
    return Math.max(0, (currentRPM + damperExtraRPM) * gear);
  }
  const targetTime = now - delayMs;
  let lo = null, hi = null;
  for (let i = motor2History.length - 1; i >= 0; i--) {
    if (motor2History[i].t <= targetTime) { lo = motor2History[i]; break; }
    hi = motor2History[i];
  }
  let baseRPM;
  if (!lo && !hi) baseRPM = 0;
  else if (!lo) baseRPM = hi.rpm;
  else if (!hi) baseRPM = lo.rpm;
  else {
    const span = hi.t - lo.t;
    const t = span > 0 ? (targetTime - lo.t) / span : 1;
    baseRPM = lo.rpm + (hi.rpm - lo.rpm) * t;
  }
  return Math.max(0, baseRPM * gear);
}
function computeMotor2RPM() { return computeFollowerRPM(getDualMotorDelay(), getDualMotorPeak()); }

function getMotorRPM(m, base) {
  if (m >= 3) return motorRPMs[m] || 0;
  if (m === 2) return motor2RPM;
  return base;
}

function tickMotor2(ts) {
  if (!dualMotorEnabled) { motor2AnimId = null; return; }
  try { tickMotor2Body(); } catch (e) { console.error('[multi motor]', e); }
  motor2AnimId = requestAnimationFrame(tickMotor2);
}
function tickMotor2Body() {
  const now = performance.now();
  motor2History.push({ t: now, rpm: currentRPM + damperExtraRPM });
  const cutoff = now - 10000;
  while (motor2History.length > 1 && motor2History[0].t < cutoff) motor2History.shift();
  motor2RPM = computeMotor2RPM();
  extraMotors.forEach(function(m, i){
    const n = i + 3; motorRPMs[n] = computeFollowerRPM(m.delay, m.peak);
    const d = get('dualMotor' + n + 'RPMDisplay'); if (d) d.textContent = Math.round(motorRPMs[n]) + ' RPM';
  });
  if (get('dualMotor1RPMDisplay')) get('dualMotor1RPMDisplay').textContent = Math.round(currentRPM + damperExtraRPM) + ' RPM';
  if (get('dualMotor2RPMDisplay')) get('dualMotor2RPMDisplay').textContent = Math.round(motor2RPM) + ' RPM';
}

function startMotor2() {
  if (motor2AnimId) { cancelAnimationFrame(motor2AnimId); motor2AnimId = null; }
  motor2History = [];
  motor2RPM = 0; motorRPMs = {};
  motor2AnimId = requestAnimationFrame(tickMotor2);
}

function stopMotor2() {
  if (motor2AnimId) { cancelAnimationFrame(motor2AnimId); motor2AnimId = null; }
  motor2History = [];
  motor2RPM = 0; motorRPMs = {};
  if (get('dualMotor1RPMDisplay')) get('dualMotor1RPMDisplay').textContent = '0';
  if (get('dualMotor2RPMDisplay')) get('dualMotor2RPMDisplay').textContent = '0';
  for (let n = 3; n <= MAX_MOTORS; n++) { const d = get('dualMotor' + n + 'RPMDisplay'); if (d) d.textContent = '0'; }
}

function getRPMForOsc(eo) {
  const base = currentRPM + damperExtraRPM;
  if (!dualMotorEnabled) return base;
  return getMotorRPM((eo && eo.motor) ? eo.motor : 1, base);
}



let windAnimId=null;
let windStartTime=null;
let windStartRPM=0;
let windDirection='idle';

let didWindDown=false;
let windDownCrossedSwitch=false;
let usingTorqueFn=false;

let steadyActive=true;
let peakWaitMode='off';
let _peakWaitUserDisabled=false;

let damperEnabled=false;
let damperUserOn=false;
let damperAutoCut=false;
let userDisabledDamper=false;
let damperAnimId=null;
let damperVar=true;
let damperPhaseStart=0;
let damperContractorStart=0;
let currentHalfPeriod=Infinity;

let seqModeActive=true;
let seqStepCount=4;
let seqNumGroups=3;
let seqGroups=[[1,0,1,0],[0,1,0,1],[1,0,1,0]];
let seqGroupVol=[100,100,80,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100];
let seqGroupVolOff=[10,10,65,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
const MAX_DAMPER_GROUPS=24;
const SEQ_GROUP_COLORS=['#00e5a0','#004a5e','#a78bfa','#f59e0b','#ef4444','#80c090','#0f2a5e','#fb923c','#e879f9',
  '#22d3ee','#a3e635','#f472b6','#facc15','#818cf8','#34d399','#fb7185','#38bdf8','#c084fc','#fdba74','#4ade80','#f87171','#60a5fa','#d946ef','#fde047'];
const SEQ_GROUP_CLASSES=SEQ_GROUP_COLORS.map(function(_,i){ return 'on-g'+(i+1); });
(function(){
  var css=''; SEQ_GROUP_COLORS.forEach(function(c,i){ if(i<8) return; var h=c.replace('#',''), r=parseInt(h.substr(0,2),16), g=parseInt(h.substr(2,2),16), b=parseInt(h.substr(4,2),16);
    css+='.seq-step.on-g'+(i+1)+'{background:rgba('+r+','+g+','+b+',.25);border-color:'+c+';color:'+c+'}\n'; });
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
})();
let seqCurrentStep=0;
let damperCtlMode=false; const _ctlGroupOn=[], _ovGroup=[], _midiGrp=[];
function _midiOn(){ return !!(window._ceMidiPresent && window._ceMidiPresent()); }
function _grpOnNow(g){
  if(damperCtlMode) return !!(window._ceDamperPin && window._ceDamperPin(g));
  if(_ovGroup[g]===true || _ovGroup[g]===false) return _ovGroup[g];
  if(_midiOn()) return (_midiGrp[g]|0)>0;
  return !!(seqGroups[g] && seqGroups[g][seqCurrentStep]); }
let seqPhaseStart=0;
let seqAnimId=null;
let seqElapsedBeforeStop=0;
let seqManualMode=false;
let seqManualGroupOn=[false,false,false,false,false,false,false,false];

let extraRPMAnimId=null;
let extraRPMFrom=0,extraRPMTo=0,extraRPMStartMs=0,extraRPMDurMs=500;

function getV(){
  return{
    hp:parseFloat(get('eHigherPort').value)||12,
    lp:parseFloat(get('eLowerPort').value)||10,
    hv:parseFloat(get('eHigherVanes').value)||5,
    lv:parseFloat(get('eLowerVanes').value)||4,
    ut:parseFloat(get('eUndertone').value)||2,
    ot:parseFloat(get('eOvertone').value)||3,
    sHV:parseFloat(get('sHVane').value)/100,
    sLV:parseFloat(get('sLVane').value)/100,
    sUT:parseFloat(get('sUT').value)/100,
    sOT:parseFloat(get('sOT').value)/100,
    sHP:parseFloat(get('sHP').value)/100,
    sLP:parseFloat(get('sLP').value)/100,
    detune:parseFloat(get('detuneSlider').value)||0,
    waveform:get('dWaveform').value,
    chopper:get('dChopper').value,
    peakRPM:getEffectivePeakRPM()
  };
}

function computeGain(key,v,dual){
  const _b0={hp:v.sHP*0.18,hv:v.sHV*0.18,lp:dual?v.sLP*0.18:0,lv:dual?v.sLV*0.18:0,ut:dual?v.sUT*0.18:0,ot:dual?v.sOT*0.18:0}[key];
  if(_b0===undefined) return 0;
  const base=_b0*(window.rcGainMul?window.rcGainMul(key):1);
  if(!damperEnabled) return base;
  if(seqModeActive){
    if(typeof _stateOverrideApplied !== 'undefined' && _stateOverrideApplied !== null){
      const oscGroup = getOscGroup(key);
      const vol    = (seqGroupVol[oscGroup]    !== undefined ? seqGroupVol[oscGroup]    : 100) / 100;
      const offVol = (seqGroupVolOff[oscGroup] !== undefined ? seqGroupVolOff[oscGroup] : 10)  / 100;
      return base * (_stateOverrideApplied === 'on' ? vol : offVol);
    }
    const oscGroup = getOscGroup(key);
    const grpOn = oscGroup>=0 && oscGroup<seqNumGroups ? _grpOnNow(oscGroup) : false;
    const vol = (seqGroupVol[oscGroup]!==undefined?seqGroupVol[oscGroup]:100)/100;
    const offVol=(seqGroupVolOff[oscGroup]!==undefined?seqGroupVolOff[oscGroup]:10)/100;
    const mul = grpOn ? vol : offVol*vol;
    return base * mul;
  }
  const isPulse=!get('tPulseHiLo').checked;
  const _gdCfgDown = typeof _stateOverrideConfig !== 'undefined' ? _stateOverrideConfig['down'] : null;
  const _gdDownDefaultOn = _gdCfgDown ? _gdCfgDown.defaultOn : true;
  if(!_gdDownDefaultOn && windDirection==='down' && get('tUndulate').checked){
    const shutMul = 0.10;
    if(key==='hp'||key==='hv'||key==='lp'||key==='lv'||key==='ut'||key==='ot') return base*shutMul;
    return base;
  }
  const highOn=damperVar;
  const lowOn=isPulse?damperVar:!damperVar;
  const hiMul=highOn?1.0:0.10;
  const loMul=lowOn?1.0:0.10;
  if(key==='hp'||key==='hv') return base*hiMul;
  if(key==='lp'||key==='lv') return base*loMul;
  if(key==='ut'||key==='ot') return isPulse?base*(damperVar?1.0:0.10):base*0.5;
  return base;
}

const permOscEnabled = {hp:true, hv:true, lp:true, lv:true, ut:true, ot:false};
const permOscVisible = {hp:true, hv:true, lp:true, lv:true, ut:true, ot:true};
const permOscMotor = {hp:1, hv:1, lp:1, lv:1, ut:1, ot:1};
const permOscWaveform = {hp:'default', hv:'default', lp:'default', lv:'default', ut:'default', ot:'default'};
const PERM_ATTEN_KEYS = ['hv','lv','ut','ot'];
const permAtten = {
  hv:{enabled:false, filterType:'lowpass', cutoff:1000, q:0.7071, curve:'12', mix:100, filterNodes:[], dryGain:null, wetGain:null, sumGain:null},
  lv:{enabled:false, filterType:'lowpass', cutoff:1000, q:0.7071, curve:'12', mix:100, filterNodes:[], dryGain:null, wetGain:null, sumGain:null},
  ut:{enabled:false, filterType:'lowpass', cutoff:1000, q:0.7071, curve:'12', mix:100, filterNodes:[], dryGain:null, wetGain:null, sumGain:null},
  ot:{enabled:false, filterType:'lowpass', cutoff:1000, q:0.7071, curve:'12', mix:100, filterNodes:[], dryGain:null, wetGain:null, sumGain:null}
};
const permStator = {
  hp: {linked:true, val:null, color:'#e5a61f', visible:true, mixerVal:40, enabled:true, name:'Stator'},
  lp: {linked:true, val:null, color:'#e5a61f', visible:true, mixerVal:40, enabled:true, name:'Stator'}
};

function getBidirSideMul(key, sideOverride) {
  const isBidir = (spatialFxMode === 'rotationalBidir' || spatialFxMode === 'directionalBidir');
  if (!isBidir) return 1;
  const peakWet = (parseFloat((get('nRotPeakWet')||{}).value) || 100) / 100;
  const angleRad = (typeof rotAngleDeg !== 'undefined' ? rotAngleDeg : 0) * Math.PI / 180;
  const floor = 1 - peakWet;
  const mid = (1 + floor) / 2;
  const amp = mid - floor;
  const side = sideOverride !== undefined ? sideOverride : (oscSideAssign[key] || 1);
  if (side === 'both') return 1;
  return side === 2 ? mid - amp * Math.cos(angleRad) : mid + amp * Math.cos(angleRad);
}

function getBidirLpfOpenHz() {
  const v = parseFloat((get('nBidirFilterOpenHz')||{}).value);
  return isNaN(v) ? 20000 : Math.max(20, Math.min(20000, v));
}
function getBidirLpfFloorHz() {
  const v = parseFloat((get('nBidirFilterFloorHz')||{}).value);
  return isNaN(v) ? 250 : Math.max(20, Math.min(20000, v));
}
function getBidirLpfQ() {
  const v = parseFloat((get('nBidirFilterQ')||{}).value);
  return isNaN(v) ? 0.7071 : Math.max(0.1, Math.min(20, v));
}
function bidirOpennessToHz(frac) {
  const pct = Math.max(0, Math.min(1, frac));
  const openHz = getBidirLpfOpenHz(), floorHz = Math.min(getBidirLpfFloorHz(), openHz);
  return floorHz * Math.pow(openHz / floorHz, pct);
}

function applyBidirFilters(ramp) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const r = Math.min(ramp || 0.012, 0.012);
  const q = getBidirLpfQ();
  ['hp','lp','hv','lv','ut','ot'].forEach(k=>{
    const f = bidirFilterNodes[k];
    if (!f) return;
    f.frequency.setTargetAtTime(bidirOpennessToHz(getBidirSideMul(k)), now, r);
    f.Q.setTargetAtTime(q, now, r);
  });
  extraOscs.forEach(eo=>{
    if (!eo.bidirFilterNode) return;
    eo.bidirFilterNode.frequency.setTargetAtTime(bidirOpennessToHz(getBidirSideMul(null, eo.bidirSide||1)), now, r);
    eo.bidirFilterNode.Q.setTargetAtTime(q, now, r);
  });
}

function pushGains(ramp){
  if(!audioCtx) return;
  const v=getV();const dual=v.chopper!=='single';const now=audioCtx.currentTime;const r=ramp||0.04;
  ['hp','lp','hv','lv','ut','ot'].forEach(k=>{if(gainNodes[k]) gainNodes[k].gain.setTargetAtTime(permOscEnabled[k]?computeGain(k,v,dual):0,now,r);});
  applyBidirFilters(r);
  if(gainNodes.hpSt){
    const st=permStator.hp;
    const stVol = (!st.linked && st.enabled!==false) ? (st.mixerVal ?? 40)/100*0.18 : 0;
    gainNodes.hpSt.gain.setTargetAtTime(stVol,now,r);
  }
  if(gainNodes.lpSt){
    const st=permStator.lp;
    const stVol = (!st.linked && st.enabled!==false && dual) ? (st.mixerVal ?? 40)/100*0.18 : 0;
    gainNodes.lpSt.gain.setTargetAtTime(stVol,now,r);
  }
  const isSingleTone = v.chopper === 'single';

  extraOscs.forEach(eo=>{
    if(eo.gainNode && audioCtx){
      let base, mute;
      {
        mute = isEoDisabled(eo);
        base = mute ? 0 : (eo.mixerVal ?? 40)/100 * 0.18;
      }
      let vol = base;
      if(damperEnabled && seqModeActive && !mute){
        const g = eo.seqGroup||0;
        const on = _grpOnNow(g);
        const groupVol = (seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
        const offGroupVol=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
        vol = base * (on ? groupVol : offGroupVol*groupVol);
      }
      eo.gainNode.gain.setTargetAtTime(vol, now, r);
    }
    if(eo.type === 'rotor' && !eo.statorLinked && eo.statorGainNode && audioCtx){
      const statorMute = (isSingleTone) || (eo.statorEnabled === false);
      let statorVol = statorMute ? 0 : (eo.statorMixerVal||40)/100 * 0.18;
      if(!statorMute && damperEnabled && seqModeActive){
        const g = eo.seqGroup||0;
        const on = _grpOnNow(g);
        const groupVol = (seqGroupVol[g]!==undefined?seqGroupVol[g]:100)/100;
        const offGroupVol=(seqGroupVolOff[g]!==undefined?seqGroupVolOff[g]:10)/100;
        statorVol = statorVol * (on ? groupVol : offGroupVol*groupVol);
      }
      eo.statorGainNode.gain.setTargetAtTime(statorVol, now, r);
    }
  });
}

function updateFreqDisplay(){
  const v=getV();const r=centsToRatio(v.detune);const rpm=currentRPM+damperExtraRPM;
  const fmt=hz=>hz<1000?parseFloat(hz.toFixed(1)):(hz/1000).toFixed(2)+'k';
  const hzForKey=k=>{const n={hp:v.hp,lp:v.lp,hv:v.hv,lv:v.lv,ut:v.ut,ot:v.ot}[k];const r2=centsToRatio(v.detune);const permRPM=dualMotorEnabled?getMotorRPM(permOscMotor[k]||1,rpm):rpm;return calcHz(n,permRPM)*r2;};
  const hz=n=>calcHz(n,rpm)*r;
  get('fvHP').textContent=fmt(hzForKey('hp'));get('fvLP').textContent=fmt(hzForKey('lp'));
  get('fvHV').textContent=fmt(hzForKey('hv'));get('fvLV').textContent=fmt(hzForKey('lv'));get('fvUT').textContent=fmt(hzForKey('ut'));
  const fvOT=get('fvOT');if(fvOT)fvOT.textContent=fmt(hzForKey('ot'));
  const maxHz=Math.max(hzForKey('hp'),hzForKey('lp'),hzForKey('hv'),hzForKey('lv'),hzForKey('ut'),hzForKey('ot'),1);
  [['HP','hp'],['LP','lp'],['HV','hv'],['LV','lv'],['UT','ut']].forEach(([k,gk])=>{
    get('vb'+k).style.width=Math.min(100,Math.round(hzForKey(gk)/maxHz*100))+'%';
  });
  const vbOT=get('vbOT');if(vbOT)vbOT.style.width=Math.min(100,Math.round(hzForKey('ot')/maxHz*100))+'%';
  extraOscs.forEach(eo=>{
    const eoRPM = dualMotorEnabled ? getRPMForOsc(eo) : rpm;
    const freqHz = computeExtraOscFreq(eo, eoRPM, r);
    const fvEl = document.getElementById('fvEO'+eo.id);
    const vbEl = document.getElementById('vbEO'+eo.id);
    if(fvEl) fvEl.textContent = fmt(freqHz);
    if(vbEl) vbEl.style.width = Math.min(100, Math.round(freqHz/maxHz*100))+'%';
  });
  get('rpmDisplay').textContent=Math.round(currentRPM)+' RPM';
}

function liveUpdateFreqs(){
  if(!audioCtx) return;
  const v=getV();const r=centsToRatio(v.detune);const rpm=currentRPM+damperExtraRPM+(typeof vibratoExtraRPM!=='undefined'?vibratoExtraRPM:0);
  const now=audioCtx.currentTime;const ramp=0.04;
  ['hp','lp','hv','lv','ut','ot'].forEach(k=>{
    if(!oscNodes[k]) return;
    const n={hp:v.hp,lp:v.lp,hv:v.hv,lv:v.lv,ut:v.ut,ot:v.ot}[k];
    const permRPM = dualMotorEnabled ? getMotorRPM(permOscMotor[k]||1, (currentRPM+damperExtraRPM+(typeof vibratoExtraRPM!=='undefined'?vibratoExtraRPM:0))) : rpm;
    oscNodes[k].frequency.setTargetAtTime(raspHz(oscNodes[k],calcHz(n,permRPM)*r,permRPM),now,ramp);
  });
  ['hp','lp','hv','lv','ut','ot'].forEach(k=>{
    if(!oscNodes[k]) return;
    const wf = getPermWaveform(k, v.waveform);
    if(wf !== oscNodes['_wf_'+k]){ oscNodes['_wf_'+k] = wf; setOscWaveform(oscNodes[k], wf); }
  });
  if(oscNodes.hpSt && !permStator.hp.linked){
    const stPortVal = permStator.hp.val != null ? permStator.hp.val : (parseFloat(v.hp)||1);
    const hpRPM = dualMotorEnabled ? getMotorRPM(permOscMotor['hp']||1, rpm) : rpm;
    oscNodes.hpSt.frequency.setTargetAtTime(Math.max(0.01, calcHz(stPortVal, hpRPM)*r + 5), now, ramp);
    setOscWaveform(oscNodes.hpSt, getPermWaveform('hp', v.waveform));
  }
  if(oscNodes.lpSt && !permStator.lp.linked){
    const stPortVal = permStator.lp.val != null ? permStator.lp.val : (parseFloat(v.lp)||1);
    const lpRPM = dualMotorEnabled ? getMotorRPM(permOscMotor['lp']||1, rpm) : rpm;
    oscNodes.lpSt.frequency.setTargetAtTime(Math.max(0.01, calcHz(stPortVal, lpRPM)*r + 5), now, ramp);
    setOscWaveform(oscNodes.lpSt, getPermWaveform('lp', v.waveform));
  }
  extraOscs.forEach(eo=>{
    if(!eo.oscNode) return;
    const eoRPM = dualMotorEnabled ? getRPMForOsc(eo) : rpm;
    const freqHz = computeExtraOscFreq(eo, eoRPM, r);
    eo.oscNode.frequency.setTargetAtTime(raspHz(eo.oscNode, freqHz, eoRPM), now, ramp);
    const eoWf = getEoWaveform(eo, v.waveform);
    if(eoWf !== eo._appliedWaveform){ eo._appliedWaveform = eoWf; setOscWaveform(eo.oscNode, eoWf); }
    if(eo.type === 'rotor' && !eo.statorLinked && eo.statorOscNode){
      const statorPortVal = parseFloat(eo.statorVal||eo.value)||1;
      const statorFreqHz = calcHz(statorPortVal, eoRPM) * r + 5;
      eo.statorOscNode.frequency.setTargetAtTime(Math.max(0.01, statorFreqHz), now, ramp);
      const stWf = getEoWaveform(eo, v.waveform);
      if(stWf !== eo._appliedStatorWaveform){ eo._appliedStatorWaveform = stWf; setOscWaveform(eo.statorOscNode, stWf); }
    }
  });
  pushGains(ramp);
  updateFilterCutoff();
  if (blowerEnabled) updateBlowerFade();
  else tickConstBlowerLinks();
}

function computeExtraOscFreq(eo, rpm, r){
  const v = getV();
  if(eo.type === 'rotor'){
    const portVal = parseFloat(eo.value)||1;
    return calcHz(portVal, rpm) * r;
  } else if(eo.type === 'vane'){
    const vaneVal = parseFloat(eo.value)||1;
    return calcHz(vaneVal, rpm) * r;
  } else if(eo.type === 'harmonic'){
    const harmVal = parseFloat(eo.value)||1;
    return calcHz(harmVal, rpm) * r;
  }
  return 0.01;
}

function makeParabolicWave(ctx){
  const N=64;const real=new Float32Array(N);const imag=new Float32Array(N);
  for(let n=1;n<N;n+=2){imag[n]=-8/(n*n*Math.PI*Math.PI);}
  return ctx.createPeriodicWave(real,imag,{disableNormalization:false});
}

