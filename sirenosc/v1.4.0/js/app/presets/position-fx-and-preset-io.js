function gatherRotorConfigData() { return (typeof window.rcGather === 'function') ? (window.rcGather() || {}) : {}; }
function applyRotorConfigData(d) { if (typeof window.rcApply === 'function') window.rcApply(d && d.global ? d : null); }
function gatherPosFxData() {
  const posState = (typeof getPosMapState === 'function') ? (getPosMapState() || {}) : {};
  return {
    spatialFxMode: (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni',
    distanceEnabled: distanceEnabled,
    distanceRate: parseFloat(get('sDistanceRate').value),
    distanceDepth: parseFloat(get('sDistanceDepth').value),
    distanceRevDist: parseFloat(get('nDistanceRevDist').value),
    distanceDb100: parseFloat(get('nDistanceDb100').value),
    maxDispersion: parseFloat(get('nMaxDispersion').value),
    minDispersion: parseFloat(get('nMinDispersion').value),
    midDispersion: parseFloat(get('nMidDispersion').value),
    dispHandles: _dispCleanHandles(window._dispHandles),
    midDispersionAuto: false,
    leftDispersion: parseFloat((get('nLeftDispersion')||{}).value),
    dispSpan: (dispIs360() ? 360 : 180),
    dispHandles360: _dispCleanHandles360(window._dispHandles360),
    distCurve: (typeof window._distCurveGet === 'function') ? window._distCurveGet() : null,
    directionEnabled: directionEnabled,
    directionRate: parseFloat(get('sDirectionRate').value),
    directionMix: parseFloat(get('sDirectionMix').value),
    directionPanStrength: parseFloat(get('sDirPanStrength').value),
    sosEnabled: sosEnabled,
    sosSpeed: parseFloat(get('sSosSpeed').value),
    posUserX: posState.posUserX,
    posUserY: posState.posUserY,
    posUnit: posState.posUnit,
    posScaleIdx: posState.scaleIdx,
    posHalfMi: posState.halfMi,
    ctrlDotX: (window._ctrlDot || {x:0}).x,
    ctrlDotY: (window._ctrlDot || {y:0}).y,
    ctrlDotLock: !!window._ctrlLock,
    posWavesBlue: !!(get('posWavesBlue') ? get('posWavesBlue').checked : true),
    posWavesRed: !!(get('posWavesRed') ? get('posWavesRed').checked : true),
    posDirOutline: !!(get('posDirOutline') && get('posDirOutline').checked),
    posWaveInterval: parseFloat((get('nPosWaveInterval') || {}).value) || 1000,
    userDir: parseFloat((get('posUserDir') || {}).value) || 0,
    userTidal: !(get('posUserTidal') && !get('posUserTidal').checked)
  };
}

function applyPosFxData(data) {
  if (!data) return;
  window._ctrlDot = window._ctrlDot || {x:0, y:0};
  window._ctrlDot.x = parseFloat(data.ctrlDotX) || 0; window._ctrlDot.y = parseFloat(data.ctrlDotY) || 0;
  window._ctrlLock = (data.ctrlDotLock === undefined) ? true : !!data.ctrlDotLock; if(typeof window._ctrlSetLock === 'function') window._ctrlSetLock(window._ctrlLock);
  { const _b = data.posWavesBlue !== undefined ? !!data.posWavesBlue : (data.posWaves === undefined ? true : !!data.posWaves), _r = data.posWavesRed !== undefined ? !!data.posWavesRed : (data.posWaves === undefined ? true : !!data.posWaves);
    if (get('posWavesBlue')) get('posWavesBlue').checked = _b; if (get('posWavesRed')) get('posWavesRed').checked = _r; }

  if (get('posDirOutline')) get('posDirOutline').checked = !!data.posDirOutline;
  if (get('posUserTidal')) get('posUserTidal').checked = data.userTidal === undefined ? true : !!data.userTidal;
  if (get('posUserDir')) get('posUserDir').value = isFinite(+data.userDir) ? +data.userDir : 0;
  if (get('nPosWaveInterval')) get('nPosWaveInterval').value = (isFinite(+data.posWaveInterval) && +data.posWaveInterval >= 20) ? +data.posWaveInterval : 1000;

  if (data.spatialFxMode) {
    if (typeof setSpatialFxMode === 'function') setSpatialFxMode(data.spatialFxMode);
    else { spatialFxMode = data.spatialFxMode; if (get('dSpatialFxMode')) get('dSpatialFxMode').value = data.spatialFxMode; }
  }

  if (data.distanceRate !== undefined) { get('sDistanceRate').value = data.distanceRate; get('svDistanceRate').textContent = data.distanceRate+'s'; }
  if (data.distanceDepth !== undefined) { get('sDistanceDepth').value = data.distanceDepth; get('svDistanceDepth').textContent = data.distanceDepth+'%'; }
  if (data.distanceRevDist !== undefined) get('nDistanceRevDist').value = data.distanceRevDist;
  if (data.distanceDb100 !== undefined) get('nDistanceDb100').value = data.distanceDb100;
  window._dispHandles = _dispCleanHandles(data.dispHandles);
  if (data.maxDispersion !== undefined) get('nMaxDispersion').value = data.maxDispersion;
  if (data.minDispersion !== undefined) get('nMinDispersion').value = data.minDispersion;
  if (data.maxDispersion === undefined && data.minDispersion === undefined && data.dispersionRate !== undefined) {
    get('nMaxDispersion').value = data.dispersionRate;
    get('nMinDispersion').value = data.dispersionRate;
  }
  if (data.midDispersionAuto !== undefined && get('tMidDispersionAuto')) get('tMidDispersionAuto').checked = !!data.midDispersionAuto;
  if (typeof updateMidDispersionAuto === 'function') updateMidDispersionAuto();
  if (data.midDispersion !== undefined && get('tMidDispersionAuto') && !get('tMidDispersionAuto').checked) {
    get('nMidDispersion').value = data.midDispersion;
  }
  window._dispHandles360 = _dispCleanHandles360(data.dispHandles360);
  if (typeof window._distCurveSet === 'function') window._distCurveSet(data.distCurve);
  if (get('nDispSpan')) get('nDispSpan').value = (data.dispSpan === 360 || data.dispSpan === '360') ? '360' : '180';
  if (get('nLeftDispersion')) get('nLeftDispersion').value = (data.leftDispersion !== undefined && isFinite(+data.leftDispersion)) ? data.leftDispersion : get('nMidDispersion').value;
  window._dispLeftTouched = (data.leftDispersion !== undefined);
  if (typeof updateEffectiveDispersion === 'function') updateEffectiveDispersion();
  if (typeof updateDistDirParams === 'function') updateDistDirParams('Distance');
  if (data.distanceEnabled !== undefined && !!data.distanceEnabled !== distanceEnabled) {
    get('btnDistanceEnable').click();
  }

  if (data.directionRate !== undefined) { get('sDirectionRate').value = data.directionRate; get('svDirectionRate').textContent = data.directionRate+'s'; }
  if (data.directionMix !== undefined) { get('sDirectionMix').value = data.directionMix; get('svDirectionMix').textContent = data.directionMix+'%'; }
  if (data.directionPanStrength !== undefined) { get('sDirPanStrength').value = data.directionPanStrength; get('svDirPanStrength').textContent = data.directionPanStrength+'%'; }
  if (typeof updateDistDirParams === 'function') updateDistDirParams('Direction');
  if (data.directionEnabled !== undefined && !!data.directionEnabled !== directionEnabled) {
    get('btnDirectionEnable').click();
  }
  { const sp = isFinite(data.sosSpeed) ? data.sosSpeed : 343;
    get('sSosSpeed').value = sp; get('svSosSpeed').textContent = get('sSosSpeed').value + ' m/s';
    if (!!data.sosEnabled !== sosEnabled) get('btnSosEnable').click(); }

  if (typeof setPosMapState === 'function') {
    setPosMapState({
      posUserX: data.posUserX,
      posUserY: data.posUserY,
      posUnit: data.posUnit,
      scaleIdx: data.posScaleIdx,
      halfMi: data.posHalfMi
    });
  }
}

function _applyEffectEnabledState(key, presetEnabled, varRef, btnId, bodyId, extraOn, extraOff) {
  if (_fxDisabled) {
    try {
      const raw = localStorage.getItem(_FX_SNAP_KEY);
      const snap = raw ? JSON.parse(raw) : {};
      snap[key] = !!presetEnabled;
      localStorage.setItem(_FX_SNAP_KEY, JSON.stringify(snap));
    } catch(e) {}
    if (varRef() && extraOff) extraOff();
  } else {
    const currentEnabled = varRef();
    const wantEnabled = !!presetEnabled;
    if (wantEnabled !== currentEnabled) {
      const btn = get(btnId);
      const body = bodyId ? get(bodyId) : null;
      if (wantEnabled) {
        btn.textContent = 'ENABLED'; btn.className = 'vbtn btn-accent active';
        if (body) body.classList.remove('disabled-overlay');
        if (extraOn) extraOn();
      } else {
        btn.textContent = 'ENABLE'; btn.className = 'vbtn btn-accent';
        if (body) body.classList.add('disabled-overlay');
        if (extraOff) extraOff();
      }
    }
  }
}

function applyEffectsData(data) {
  if (!data) return;
  if (typeof window._fcPresetGraph === 'function') { try { window._fcPresetGraph(data.fxGraph || null); } catch(e) { console.error(e); } }
  else if (window.FXG && FXG.load) { try { FXG.load(data.fxGraph || null); } catch(e) { console.error(e); } }
  if (typeof window._fcLoad === 'function') { try { window._fcLoad(data.fxChains, data.fxChainSel); } catch(e) { console.error(e); } }


  if (data.filterSlope) get('dFilterSlope').value = data.filterSlope;
  if (data.filterFn) get('dFilterFn').value = data.filterFn;
  if (data.filterEasing) setEasingGroup('egFilter','dFilterEasing', data.filterEasing);
  if (data.filterLow !== undefined) get('nFilterLow').value = data.filterLow;
  if (data.filterHigh !== undefined) get('nFilterHigh').value = data.filterHigh;
  if (data.filterOffset !== undefined) {
    get('sFilterOffset').value = data.filterOffset;
    const v = data.filterOffset;
    get('svFilterOffset').textContent = v > 0 ? '+'+v : String(v);
  }
  { const sv = data.filterSteep || 0; get('sFilterSteep').value = sv; get('svFilterSteep').textContent = sv > 0 ? '+'+sv : String(sv); }

  if (data.reverbMode !== undefined && typeof applyReverb1Mode === 'function') {
    applyReverb1Mode(data.reverbMode);
    const mSel = get('dReverb1Mode');
    if (mSel) mSel.value = data.reverbMode;
  }
  if (data.reverbSize !== undefined) { get('sReverbSize').value = data.reverbSize; get('svReverbSize').textContent = data.reverbSize+'%'; }
  if (data.reverbDecay !== undefined) { get('sReverbDecay').value = data.reverbDecay; get('svReverbDecay').textContent = data.reverbDecay+'%'; }
  if (data.reverbDiffusion !== undefined) { get('sReverbDiffusion').value = data.reverbDiffusion; get('svReverbDiffusion').textContent = data.reverbDiffusion+'%'; }
  if (data.reverbColor !== undefined) { get('sReverbColor').value = data.reverbColor; get('svReverbColor').textContent = data.reverbColor+'%'; }
  if (data.reverbLowCut !== undefined) { const hz=data.reverbLowCut; get('sReverbLowCut').value = hz; get('svReverbLowCut').textContent = hz>=1000?(hz/1000).toFixed(2)+' kHz':hz+' Hz'; }
  if (data.reverbPreDelay !== undefined) get('nReverbPreDelay').value = data.reverbPreDelay;
  if (data.reverbMix !== undefined) { get('sReverbMix').value = data.reverbMix; get('svReverbMix').textContent = data.reverbMix+'%'; }
  _rvPLApply(data.rvPosLink || null);
  if (data.reverbIRPreset) {
    const _sel1 = get('revPreset1'); if (_sel1) _sel1.value = data.reverbIRPreset;
    function _applyRev1IR() {
      _loadPresetIR(data.reverbIRPreset, 'reverbIRName', 'reverbIRStatus', function(buf) {
        reverb1IRBuffer = buf;
        if (typeof reverbNode !== 'undefined' && reverbNode) reverbNode.buffer = buf;
        if (audioCtx && reverbEnabled) rebuildFxChain();
      });
    }
    if (audioCtx) { _applyRev1IR(); } else { (function _w1(){ if(audioCtx){_applyRev1IR();}else{setTimeout(_w1,250);} })(); }
  } else if (data.reverbIRName && get('reverbIRName')) { get('reverbIRName').textContent = data.reverbIRName; }

  if (data.reverb2Mode !== undefined && typeof applyReverb2Mode === 'function') {
    applyReverb2Mode(data.reverb2Mode);
    const mSel2 = get('dReverb2Mode');
    if (mSel2) mSel2.value = data.reverb2Mode;
  }
  if (data.reverb2Size !== undefined) { get('sReverb2Size').value = data.reverb2Size; get('svReverb2Size').textContent = data.reverb2Size+'%'; }
  if (data.reverb2Decay !== undefined) { get('sReverb2Decay').value = data.reverb2Decay; get('svReverb2Decay').textContent = data.reverb2Decay+'%'; }
  if (data.reverb2Diffusion !== undefined) { get('sReverb2Diffusion').value = data.reverb2Diffusion; get('svReverb2Diffusion').textContent = data.reverb2Diffusion+'%'; }
  if (data.reverb2Color !== undefined) { get('sReverb2Color').value = data.reverb2Color; get('svReverb2Color').textContent = data.reverb2Color+'%'; }
  if (data.reverb2LowCut !== undefined) { const hz=data.reverb2LowCut; get('sReverb2LowCut').value = hz; get('svReverb2LowCut').textContent = hz>=1000?(hz/1000).toFixed(2)+' kHz':hz+' Hz'; }
  if (data.reverb2PreDelay !== undefined) get('nReverb2PreDelay').value = data.reverb2PreDelay;
  if (data.reverb2Mix !== undefined) { get('sReverb2Mix').value = data.reverb2Mix; get('svReverb2Mix').textContent = data.reverb2Mix+'%'; }
  if (data.reverb2IRPreset) {
    const _sel2 = get('revPreset2'); if (_sel2) _sel2.value = data.reverb2IRPreset;
    function _applyRev2IR() {
      _loadPresetIR(data.reverb2IRPreset, 'reverb2IRName', 'reverb2IRStatus', function(buf) {
        reverb2IRBuffer = buf;
        if (typeof reverb2Node !== 'undefined' && reverb2Node) reverb2Node.buffer = buf;
        if (audioCtx && reverb2Enabled) rebuildFxChain();
      });
    }
    if (audioCtx) { _applyRev2IR(); } else { (function _w2(){ if(audioCtx){_applyRev2IR();}else{setTimeout(_w2,250);} })(); }
  } else if (data.reverb2IRName && get('reverb2IRName')) { get('reverb2IRName').textContent = data.reverb2IRName; }

  if (data.reverb3Mode !== undefined && typeof applyReverb3Mode === 'function') {
    applyReverb3Mode(data.reverb3Mode);
    const mSel3 = get('dReverb3Mode');
    if (mSel3) mSel3.value = data.reverb3Mode;
  }
  if (data.reverb3Size !== undefined) { get('sReverb3Size').value = data.reverb3Size; get('svReverb3Size').textContent = data.reverb3Size+'%'; }
  if (data.reverb3Decay !== undefined) { get('sReverb3Decay').value = data.reverb3Decay; get('svReverb3Decay').textContent = data.reverb3Decay+'%'; }
  if (data.reverb3Diffusion !== undefined) { get('sReverb3Diffusion').value = data.reverb3Diffusion; get('svReverb3Diffusion').textContent = data.reverb3Diffusion+'%'; }
  if (data.reverb3Color !== undefined) { get('sReverb3Color').value = data.reverb3Color; get('svReverb3Color').textContent = data.reverb3Color+'%'; }
  if (data.reverb3LowCut !== undefined) { const hz=data.reverb3LowCut; get('sReverb3LowCut').value = hz; get('svReverb3LowCut').textContent = hz>=1000?(hz/1000).toFixed(2)+' kHz':hz+' Hz'; }
  if (data.reverb3PreDelay !== undefined) get('nReverb3PreDelay').value = data.reverb3PreDelay;
  if (data.reverb3Mix !== undefined) { get('sReverb3Mix').value = data.reverb3Mix; get('svReverb3Mix').textContent = data.reverb3Mix+'%'; }
  if (data.reverb3IRPreset) {
    const _sel3 = get('revPreset3'); if (_sel3) _sel3.value = data.reverb3IRPreset;
    function _applyRev3IR() {
      _loadPresetIR(data.reverb3IRPreset, 'reverb3IRName', 'reverb3IRStatus', function(buf) {
        reverb3IRBuffer = buf;
        if (typeof reverb3Node !== 'undefined' && reverb3Node) reverb3Node.buffer = buf;
        if (audioCtx && reverb3Enabled) rebuildFxChain();
      });
    }
    if (audioCtx) { _applyRev3IR(); } else { (function _w3(){ if(audioCtx){_applyRev3IR();}else{setTimeout(_w3,250);} })(); }
  } else if (data.reverb3IRName && get('reverb3IRName')) { get('reverb3IRName').textContent = data.reverb3IRName; }

  if (data.slpfCutoff !== undefined) get('nSlpfCutoff').value = data.slpfCutoff;
  if (data.slpfQ !== undefined) get('nSlpfQ').value = data.slpfQ;
  if (data.slpfMix !== undefined) { get('sSlpfMix').value = data.slpfMix; get('svSlpfMix').textContent = data.slpfMix+'%'; }

  if (data.hpfCutoff !== undefined) get('nHpfCutoff').value = data.hpfCutoff;
  if (data.hpfQ !== undefined) get('nHpfQ').value = data.hpfQ;
  if (data.hpfMix !== undefined) { get('sHpfMix').value = data.hpfMix; get('svHpfMix').textContent = data.hpfMix+'%'; }

  if (data.distDrive !== undefined) { get('sDistDrive').value = data.distDrive; get('svDistDrive').textContent = data.distDrive+'%'; }
  if (data.distTone !== undefined) get('nDistTone').value = data.distTone;
  if (data.distChar) get('dDistChar').value = data.distChar;
  if (data.distOutput !== undefined) { get('sDistOutput').value = data.distOutput; get('svDistOutput').textContent = data.distOutput+'%'; }
  if (data.distMix !== undefined) { get('sDistMix').value = data.distMix; get('svDistMix').textContent = data.distMix+'%'; }

  if (data.normPreGain !== undefined) { get('sNormPreGain').value = data.normPreGain; get('svNormPreGain').textContent = data.normPreGain+'%'; }
  if (data.normPostGain !== undefined) { get('sNormPostGain').value = data.normPostGain; get('svNormPostGain').textContent = data.normPostGain+'%'; }
  if (data.normCeiling !== undefined) get('nNormCeiling').value = data.normCeiling;
  updateNormalizerParams();

  if (data.masterVol !== undefined) {
    get('sMasterVol').value = data.masterVol;
    get('svMasterVol').textContent = data.masterVol+'%';
    if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(data.masterVol/100, audioCtx.currentTime, 0.02);
  }


  if (data.lpfEnabled !== undefined) {
    lpfEnabled = !!data.lpfEnabled;
    const btn = get('btnLpfEnable');
    btn.textContent = lpfEnabled ? 'ENABLED' : 'BYPASSED';
    btn.className   = lpfEnabled ? 'vbtn btn-accent active' : 'vbtn btn-gray';
    get('lpfBody').style.opacity = lpfEnabled ? '' : '0.4';
  }

  if (data.normEnabled !== undefined) {
    normEnabled = !!data.normEnabled;
    const nbtn = get('btnNormEnable');
    nbtn.textContent = normEnabled ? 'ENABLED' : 'ENABLE';
    nbtn.className   = normEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
    get('normBody').classList.toggle('disabled-overlay', !normEnabled);
    updateNormalizerParams();
  }

  function _applyOne(wantEnabled, varSetter, btnId, bodyId) {
    const want = !!wantEnabled;
    varSetter(want);
    const btn  = get(btnId);
    const body = bodyId ? get(bodyId) : null;
    if (want) {
      btn.textContent = 'ENABLED'; btn.className = 'vbtn btn-accent active';
      if (body) body.classList.remove('disabled-overlay');
    } else {
      btn.textContent = 'ENABLE'; btn.className = 'vbtn btn-accent';
      if (body) body.classList.add('disabled-overlay');
    }
  }

  if (_fxDisabled) {
    const newSnap = {
      reverb:    data.reverbEnabled    !== undefined ? !!data.reverbEnabled    : reverbEnabled,
      reverb2:   data.reverb2Enabled   !== undefined ? !!data.reverb2Enabled   : reverb2Enabled,
      reverb3:   data.reverb3Enabled   !== undefined ? !!data.reverb3Enabled   : reverb3Enabled,
      slpf:      data.slpfEnabled      !== undefined ? !!data.slpfEnabled      : slpfEnabled,
      hpf:       data.hpfEnabled       !== undefined ? !!data.hpfEnabled       : hpfEnabled,
      dist:      data.distEnabled      !== undefined ? !!data.distEnabled      : distEnabled,
      blower:    data.blowerEnabled    !== undefined ? !!data.blowerEnabled    : blowerEnabled
    };
    try { localStorage.setItem(_FX_SNAP_KEY, JSON.stringify(newSnap)); } catch(e) {}
    if (audioCtx) { buildFilterChain(); rebuildFxChain(); }
    return;
  }

  if (data.reverbEnabled  !== undefined) _applyOne(data.reverbEnabled,  v=>{ reverbEnabled=v;  }, 'btnReverbEnable',  'reverbBody');
  if (data.reverb2Enabled !== undefined) _applyOne(data.reverb2Enabled, v=>{ reverb2Enabled=v; }, 'btnReverb2Enable', 'reverb2Body');
  if (data.reverb3Enabled !== undefined) _applyOne(data.reverb3Enabled, v=>{ reverb3Enabled=v; }, 'btnReverb3Enable', 'reverb3Body');
  if (data.slpfEnabled    !== undefined) _applyOne(data.slpfEnabled,    v=>{ slpfEnabled=v;    }, 'btnSlpfEnable',    'slpfBody');
  if (data.hpfEnabled     !== undefined) _applyOne(data.hpfEnabled,     v=>{ hpfEnabled=v;     }, 'btnHpfEnable',     'hpfBody');
  if (data.distEnabled    !== undefined) _applyOne(data.distEnabled,    v=>{ distEnabled=v;    }, 'btnDistEnable',    'distBody');

  if (audioCtx) { buildFilterChain(); rebuildFxChain(); }
}

function applyBlowerData(data) {
  if (!data) return;

  if (data.blowerFadeTime !== undefined) get('nBlowerFadeTime').value = data.blowerFadeTime;
  if (data.blowerFadeInTime !== undefined) get('nBlowerFadeInTime').value = data.blowerFadeInTime;
  if (data.blowerVolDrop !== undefined) { get('sBlowerVolDrop').value = data.blowerVolDrop; get('svBlowerVolDrop').textContent = data.blowerVolDrop+'%'; }
  if (data.blowerAirRes !== undefined && isFinite(data.blowerAirRes)) get('nBlowerAirRes').value = data.blowerAirRes;
  if (data.blowerAmplitude !== undefined) { get('sBlowerAmplitude').value = data.blowerAmplitude; get('svBlowerAmplitude').textContent = data.blowerAmplitude+'%'; }
  if (data.blowerSmoothing !== undefined) { get('sBlowerSmoothing').value = data.blowerSmoothing; get('svBlowerSmoothing').textContent = data.blowerSmoothing+'%'; }
  if (data.blowerOutput !== undefined) { get('sBlowerOutput').value = data.blowerOutput; get('svBlowerOutput').textContent = data.blowerOutput+'%'; }
  if (data.blowerMix !== undefined) { get('sBlowerMix').value = data.blowerMix; get('svBlowerMix').textContent = data.blowerMix+'%'; }
  if (data.blowerConstWindUpOffset !== undefined) get('nBlowerConstWindUpOffset').value = data.blowerConstWindUpOffset;
  if (data.blowerConstWindUpFn) get('dBlowerConstWindUpFn').value = data.blowerConstWindUpFn;
  if (data.blowerConstWindDownOffset !== undefined) get('nBlowerConstWindDownOffset').value = data.blowerConstWindDownOffset;
  if (data.blowerConstWindDownFn) get('dBlowerConstWindDownFn').value = data.blowerConstWindDownFn;

  if (data.blowerEnabled !== undefined) {
    if (_fxDisabled) {
      try {
        const raw = localStorage.getItem(_FX_SNAP_KEY);
        const snap = raw ? JSON.parse(raw) : {};
        snap.blower = !!data.blowerEnabled;
        localStorage.setItem(_FX_SNAP_KEY, JSON.stringify(snap));
      } catch(e) {}
      blowerEnabled = false;
      blowerCurrentGain = 1;
    } else {
      blowerEnabled = !!data.blowerEnabled;
      const _bBtn  = get('btnBlowerEnable');
      const _bBody = get('blowerBody');
      if (blowerEnabled) {
        _bBtn.textContent = 'ENABLED'; _bBtn.className = 'vbtn btn-accent active';
        _bBody.classList.remove('disabled-overlay');
      } else {
        _bBtn.textContent = 'ENABLE'; _bBtn.className = 'vbtn btn-accent';
        _bBody.classList.add('disabled-overlay');
        blowerCurrentGain = 1;
      }
    }
  }

  if (audioCtx) rebuildFxChain();
}

function applyRotationData(data) {
  if (!data) return;
  if (data.rotPeakWet !== undefined) get('nRotPeakWet').value = data.rotPeakWet;
  if (typeof syncMinVolUIFromPeakWet === 'function') syncMinVolUIFromPeakWet();
  if (data.rotMaxRPM !== undefined) get('nRotMaxRPM').value = data.rotMaxRPM;
  if (data.rotMode !== undefined) {
    _applyRotMode(data.rotMode);
  } else if (data.rotLinkedToChopper !== undefined) {
    _applyRotMode(data.rotLinkedToChopper ? 'linked' : 'unlinked');
  }
  if (data.rotWindUp !== undefined && get('nRotWindUp')) get('nRotWindUp').value = data.rotWindUp;
  if (data.rotWindUpFn !== undefined && get('dRotWindUpFn')) get('dRotWindUpFn').value = data.rotWindUpFn;
  if (data.rotWindUpEasing !== undefined) setEasingGroup('egRotWindUp', 'dRotWindUpEasing', data.rotWindUpEasing);
  if (data.rotWindDown !== undefined && get('nRotWindDown')) get('nRotWindDown').value = data.rotWindDown;
  if (data.rotWindDownFn !== undefined && get('dRotWindDownFn')) get('dRotWindDownFn').value = data.rotWindDownFn;
  if (data.rotWindDownEasing !== undefined) setEasingGroup('egRotWindDown', 'dRotWindDownEasing', data.rotWindDownEasing);
  if (data.rotOscillate !== undefined && get('tRotOscillate')) {
    get('tRotOscillate').checked = !!data.rotOscillate;
    const fields = get('rotOscFields');
    if (fields) { fields.classList.toggle('disabled-overlay', !data.rotOscillate); fields.style.pointerEvents = data.rotOscillate ? '' : 'none'; }
    if (!data.rotOscillate) { _rotOscDir = 1; _rotOscPauseLeft = 0; }
  }
  if (data.rotOscAngle !== undefined && get('nRotOscAngle')) get('nRotOscAngle').value = data.rotOscAngle;
  if (data.rotOscPause !== undefined && get('nRotOscPause')) get('nRotOscPause').value = data.rotOscPause;
  if (data.rotOscSine  !== undefined && get('tRotOscSine'))  get('tRotOscSine').checked = !!data.rotOscSine;
  if (data.collectorOffDur !== undefined && get('nCollectorOffDur')) get('nCollectorOffDur').value = data.collectorOffDur;
  if (data.collectorFreq   !== undefined && get('sCollectorFreq'))   {
    get('sCollectorFreq').value = data.collectorFreq;
    get('sCollectorFreq').dispatchEvent(new Event('input'));
  }
  if (data.collectorData && typeof window._cwSetData === 'function') window._cwSetData(data.collectorData);
  else if (data.collectorWear !== undefined && typeof window._cwSetData === 'function') window._cwSetData({ enabled: !!data.collectorWear, points: [] });
  if (data.dirAngle !== undefined) {
    const deg = Math.max(0, Math.min(360, Math.round(data.dirAngle)));
    const sl = get('sRotDirAngle'); if (sl) sl.value = deg;
    const nm = get('nRotDirAngle'); if (nm) nm.value = deg;
    if (spatialFxMode === 'directional') { rotAngleDeg = deg; }
  }
  if (audioCtx) rebuildFxChain();
}

function applyConstantsData(data) {
  if (!data) return;

  const CONST_EXTRA_ALPHABET = 'CDEFGHIJKLMNOPQRSTUVWXYZ';
  const incomingExtraIds = CONST_EXTRA_ALPHABET.split('')
    .filter(id => data['const' + id + 'Enabled'] !== undefined);

  CONSTS.filter(id => id !== 'A' && id !== 'B').slice().forEach(id => {
    tearConst(id);
    const idx = CONSTS.indexOf(id);
    if (idx !== -1) CONSTS.splice(idx, 1);
    delete constNodes[id];
    const el = get('constItem_' + id);
    if (el) el.remove();
  });

  incomingExtraIds.forEach(id => {
    CONSTS.push(id);
    constNodes[id] = {
      enabled: false, osc: null, noise: null, noiseGain: null, gain: null, lpf: null, splitGain: null,
      blowerLink: false, blowerWindState: 'idle', blowerWindAnimId: null, blowerWindStart: null, blowerWindStartFreq: 0
    };
    const list = get('constList');
    if (list) list.appendChild(createConstHTML(id));
    wireConst(id);
  });

  ['A','B'].concat(incomingExtraIds).forEach(id => {
    const wantEnabled = data['const'+id+'Enabled'];
    const freq     = data['const'+id+'Freq'];
    const wave     = data['const'+id+'Wave'];
    const vol      = data['const'+id+'Vol'];
    const lpf      = data['const'+id+'Lpf'];
    const rpmLink  = data['const'+id+'RpmLink'];
    const harmonic = data['const'+id+'Harmonic'];
    const blowerLink = data['const'+id+'BlowerLink'];
    {
      const pEl = get('dConst'+id+'Pos'), dbEl = get('nConst'+id+'Db10'), ofEl = get('nConst'+id+'Off'), stEl = get('nConst'+id+'Steep');
      if (pEl) pEl.value = (data['const'+id+'Pos'] === 'dot') ? 'dot' : 'follow';
      if (dbEl) dbEl.value = isFinite(data['const'+id+'Db10']) ? data['const'+id+'Db10'] : (isFinite(data['const'+id+'Db']) ? data['const'+id+'Db'] + 20 : 126);
      if (ofEl) ofEl.value = isFinite(data['const'+id+'Off']) ? data['const'+id+'Off'] : 0;
      if (stEl) stEl.value = isFinite(data['const'+id+'Steep']) ? data['const'+id+'Steep'] : 0;
    }
    { const lo = get('tConst'+id+'LpfOn'); if (lo) lo.checked = (data['const'+id+'LpfOn'] !== false); }

    if (freq !== undefined) get('nConst'+id+'Freq').value = freq;
    if (wave !== undefined) get('dConst'+id+'Wave').value = wave;
    if (vol  !== undefined) { get('sConst'+id+'Vol').value = vol;  get('svConst'+id+'Vol').textContent = vol+'%'; }
    if (lpf  !== undefined) { get('sConst'+id+'Lpf').value = lpf;  get('svConst'+id+'Lpf').textContent = lpf+'%'; }

    if (rpmLink !== undefined) {
      const toggleEl = get('tConst'+id+'RpmLink');
      if (toggleEl) {
        toggleEl.checked = !!rpmLink;
        const freqInput    = get('nConst'+id+'Freq');
        const harmonicWrap = get('const'+id+'HarmonicWrap');
        const freqDisplay  = get('const'+id+'RpmFreqDisplay');
        if (freqInput)    { freqInput.disabled = !!rpmLink; freqInput.style.opacity = rpmLink ? '0.35' : '1'; }
        if (harmonicWrap) harmonicWrap.style.display = rpmLink ? 'flex' : 'none';
        if (freqDisplay)  freqDisplay.style.display  = rpmLink ? 'inline' : 'none';
      }
    }
    if (harmonic !== undefined) {
      const hEl = get('nConst'+id+'Harmonic');
      if (hEl) hEl.value = harmonic;
    }

    if (blowerLink !== undefined) {
      const blEl = get('tConst'+id+'BlowerLink');
      if (blEl && !!blowerLink !== blEl.checked) {
        blEl.checked = !!blowerLink;
        blEl.dispatchEvent(new Event('change'));
      }
    }

    const c    = constNodes[id];
    const btn  = get('btnConst'+id+'Enable');
    const body = get('const'+id+'Body');

    if (wantEnabled !== undefined) {
      if (_fxDisabled) {
        c.enabled = false;
        btn.textContent = 'ENABLE'; btn.className = 'vbtn btn-gray';
        if (body) body.classList.add('disabled-overlay');
        tearConst(id);
      } else {
        const want = !!wantEnabled;
        if (want !== c.enabled) {
          c.enabled = want;
          btn.textContent = c.enabled ? 'DISABLE' : 'ENABLE';
          btn.className   = c.enabled ? 'vbtn btn-accent' : 'vbtn btn-gray';
          if (body) body.classList.toggle('disabled-overlay', !c.enabled);
        }
        if (c.enabled && audioCtx) { buildConst(id); updateConstLpf(id); }
        else if (!c.enabled) tearConst(id);
      }
    } else {
      if (c.enabled && !_fxDisabled && audioCtx) { buildConst(id); updateConstLpf(id); }
      else if (_fxDisabled && c.enabled) { c.enabled = false; tearConst(id); }
    }
  });
}

async function savePreset() {
  if (typeof JSZip === 'undefined') {
    alert('JSZip library still loading. Please wait a moment and try again.');
    return;
  }

  get('presetDetailsBox').classList.add('show');
  
  presetSnapshot = capturePresetSnapshot();
  setPresetStatus('current');
  
  get('statusTxt').textContent = 'PRESET SAVED';
  setTimeout(() => get('statusTxt').textContent = 'IDLE', 2000);
}

window._wavRaw = window._wavRaw || new WeakMap();
window._wavReg = function(buf, ab) {
  try {
    if (!buf || !ab) return;
    var u = new Uint8Array(ab, 0, 12);
    if (String.fromCharCode(u[0],u[1],u[2],u[3]) === 'RIFF' && String.fromCharCode(u[8],u[9],u[10],u[11]) === 'WAVE') window._wavRaw.set(buf, ab.slice(0));
  } catch (e) {}
};
function _audioBufferToWav(buffer) {
  try { var _raw = window._wavRaw && window._wavRaw.get(buffer); if (_raw) return _raw.slice(0); } catch (e) {}
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const dataSize = numFrames * numCh * bytesPerSample;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * bytesPerSample, true);
  view.setUint16(32, numCh * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, s < 0 ? s * 32768 : s * 32767, true);
      offset += 2;
    }
  }
  return ab;
}

async function _buildPresetZip() {
  if (typeof JSZip === 'undefined') return null;
  const zip  = new JSZip();
  const userFolder = zip.folder('user');

  zip.file('main.json', JSON.stringify(gatherMainData(), null, 2));
  try { const _stv = window._stvGather ? window._stvGather() : null; if (_stv && _stv.subtabs.length) zip.file('subtabs.json', JSON.stringify(_stv, null, 2)); } catch(e) { console.warn('[Preset] subtabs', e); }

  zip.file('functions.json',    JSON.stringify(gatherFunctionsData(),    null, 2));
  zip.file('controls.json',     JSON.stringify(gatherControlsDataNoCtl(), null, 2));
  zip.file('controller.json',   JSON.stringify(gatherControllerData(),   null, 2));
  zip.file('settings.json',     JSON.stringify(gatherSettingsData(),     null, 2));
  zip.file('timbre.json',       JSON.stringify(gatherTimbreData(),       null, 2));
  zip.file('oscillators.json',  JSON.stringify(gatherOscillatorsData(),  null, 2));
  zip.file('diagram.json',      JSON.stringify(gatherDiagramData(),      null, 2));
  zip.file('effects.json',      JSON.stringify(gatherEffectsData(),      null, 2));
  zip.file('blower.json',       JSON.stringify(gatherBlowerData(),       null, 2));
  zip.file('rotation.json',     JSON.stringify(gatherRotationData(),     null, 2));
  zip.file('constants.json',    JSON.stringify(gatherConstantsData(),    null, 2));
  zip.file('posfx.json',        JSON.stringify(gatherPosFxData(),        null, 2));
  zip.file('rotorconfig.json',  JSON.stringify(gatherRotorConfigData(),  null, 2));
  zip.file('customfns.json',    JSON.stringify(
    (typeof window._oscpGetCustomFnsData === 'function') ? window._oscpGetCustomFnsData() : { customFns: [], nameOverrides: {} },
    null, 2));

  const irSaves = [
    { buf: (typeof reverb1IRBuffer   !== 'undefined') ? reverb1IRBuffer   : null, name: 'reverb1_ir.wav'    },
    { buf: (typeof reverb2IRBuffer   !== 'undefined') ? reverb2IRBuffer   : null, name: 'reverb2_ir.wav'    },
    { buf: (typeof reverb3IRBuffer   !== 'undefined') ? reverb3IRBuffer   : null, name: 'reverb3_ir.wav'    }
  ];
  const dampSaves = [
    { buf: window._daBufHum   || null, name: 'damper_hum.wav'   },
    { buf: window._daBufOpen  || null, name: 'damper_open.wav'  },
    { buf: window._daBufClose || null, name: 'damper_close.wav' }
  ];
  [...irSaves, ...dampSaves].forEach(function(item) {
    if (item.buf) {
      try {
        const wav = _audioBufferToWav(item.buf);
        userFolder.file(item.name, wav);
      } catch(e) { console.warn('[Preset] Could not save', item.name, e); }
    }
  });

  return zip;
}

async function downloadPreset() {
  if (typeof JSZip === 'undefined') {
    alert('JSZip library still loading. Please wait a moment and try again.');
    return;
  }

  const presetName = get('ePresetModel').value || 'preset';
  const filename   = presetName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.oscp';
  const zip = await _buildPresetZip();

  const base64 = await zip.generateAsync({ type: 'base64' });
  const a = document.createElement('a');
  a.href = 'data:application/octet-stream;base64,' + base64;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  get('statusTxt').textContent = 'DOWNLOADING';
  setTimeout(() => get('statusTxt').textContent = 'IDLE', 2000);
}

function applyFunctionsData(data) {
  if (!data) return;
  if (data.windUpOffset !== undefined) get('nWindUp').value = data.windUpOffset;
  if (data.windUpFn) get('dWindUpFn').value = data.windUpFn;
  if (data.windUpEasing) setEasingGroup('egWindUp','dWindUpEasing', data.windUpEasing);
  if (data.windDownOffset !== undefined) get('nWindDown').value = data.windDownOffset;
  if (data.windDownFn) get('dWindDownFn').value = data.windDownFn;
  if (data.windDownEasing) setEasingGroup('egWindDown','dWindDownEasing', data.windDownEasing);
  if (get('tSdAutoFill') && data.sdAutoFill !== undefined) get('tSdAutoFill').checked = !!data.sdAutoFill;
  if (get('nSdWindUp')   && data.sdWindUpOffset   !== undefined) get('nSdWindUp').value   = data.sdWindUpOffset;
  if (get('dSdWindUpFn') && data.sdWindUpFn)   get('dSdWindUpFn').value   = data.sdWindUpFn;
  if (data.sdWindUpEasing)   setEasingGroup('egSdWindUp',   'dSdWindUpEasing',   data.sdWindUpEasing);
  if (get('nSdWindDown')   && data.sdWindDownOffset !== undefined) get('nSdWindDown').value   = data.sdWindDownOffset;
  if (get('dSdWindDownFn') && data.sdWindDownFn) get('dSdWindDownFn').value = data.sdWindDownFn;
  if (data.sdWindDownEasing) setEasingGroup('egSdWindDown', 'dSdWindDownEasing', data.sdWindDownEasing);
  if (data.torqueEnabled !== undefined) get('tTorque').checked = data.torqueEnabled;
  if (data.torqueRPM !== undefined) get('nTorqueRPM').value = data.torqueRPM;
  if (data.torqueOffset !== undefined) get('nTorqueOffset').value = data.torqueOffset;
  if (data.torqueFn) get('dTorqueFn').value = data.torqueFn;
  if (data.torqueEasing) setEasingGroup('egTorque','dTorqueEasing', data.torqueEasing);
  if (data.highVaneLength !== undefined) get('sHVane').value = data.highVaneLength;
  if (data.lowVaneLength !== undefined) get('sLVane').value = data.lowVaneLength;
  if (data.vibratoSpeed !== undefined) get('nVibratoSpeed').value = data.vibratoSpeed;
  if (data.vibratoDepth !== undefined) get('nVibratoDepth').value = data.vibratoDepth;
  if (data.vibratoEnabled !== undefined) {
    get('tVibrato').checked = data.vibratoEnabled;
    const fields = get('vibratoFields');
    if (fields) fields.classList.toggle('disabled-overlay', !data.vibratoEnabled);
    if (data.vibratoEnabled) startVibrato(); else stopVibrato();
  }
  if (data.rpmSnap !== undefined) get('nRPMSnap').value = data.rpmSnap;
  if (data.stateOffset !== undefined) get('nStateOffset').value = data.stateOffset;
  if (data.tailSpeed !== undefined) get('nTailSpeed').value = data.tailSpeed;
  if (get('nDualMotorPeakRPM')) { if (data.dualMotorPeakRPM !== undefined) get('nDualMotorPeakRPM').value = data.dualMotorPeakRPM; else if (data.dualMotorRPMOffset !== undefined) get('nDualMotorPeakRPM').value = Math.max(0, (parseFloat(get('eRPM').value) || 3600) + (parseFloat(data.dualMotorRPMOffset) || 0)); }
  if (data.dualMotorDelay !== undefined && get('nDualMotorDelay')) get('nDualMotorDelay').value = data.dualMotorDelay;
  if (typeof window._setExtraMotors==='function') window._setExtraMotors(data.extraMotors || []);
  if (data.pitchDeclineEnabled !== undefined && get('tPitchDecline')) {
    get('tPitchDecline').checked = data.pitchDeclineEnabled;
    const fields = get('pitchDeclineFields');
    if (fields) fields.classList.toggle('disabled-overlay', !data.pitchDeclineEnabled);
  }
  if (data.voltageDeclineMinV !== undefined && get('nPitchDeclineRPM')) get('nPitchDeclineRPM').value = data.voltageDeclineMinV;
  if (data.voltageDeclineRate !== undefined && get('nPitchDeclineTime')) get('nPitchDeclineTime').value = data.voltageDeclineRate;
  if (data.pitchDeclineFn && get('dPitchDeclineFn')) get('dPitchDeclineFn').value = data.pitchDeclineFn;
  if (data.pitchDeclineEasing) setEasingGroup('egPitchDecline', 'dPitchDeclineEasing', data.pitchDeclineEasing);
  applyConfig();
}

function applyControlsData(data) {
  if (!data) return;
  if (Array.isArray(data.damperAudioGroupVols)) {
    window._daGroupVolsPending = data.damperAudioGroupVols.slice();
    setTimeout(function(){ data.damperAudioGroupVols.forEach(function(v,i){ var el=document.getElementById('daDamperVol'+i); if(el){ el.value=v; el.dispatchEvent(new Event('input')); } }); }, 0);
  }
  if (typeof _dsLoad === 'function') _dsLoad(data.damperStates, data.damperStateSel);
  if (typeof _dmSetMode === 'function') _dmSetMode(!!data.damperCtlMode, data.damperCtlGroups);
  if (data.controllerEditor && typeof window._setControllerEditorData==='function') window._setControllerEditorData(data.controllerEditor);
  if (data.peakWaitMode !== undefined) {
    peakWaitMode = (['off','startup','always'].includes(data.peakWaitMode)) ? data.peakWaitMode : 'off';
    _applyPeakWaitBtn();
  } else if (data.customWaitForPeak !== undefined) {
    peakWaitMode = data.customWaitForPeak ? 'startup' : 'off';
    _applyPeakWaitBtn();
  }
  if (data.pulseHiLo !== undefined) {
    get('tPulseHiLo').checked = data.pulseHiLo;
    if (typeof applyDamperModeUI === 'function') applyDamperModeUI();
    if (typeof damperEnabled !== 'undefined' && damperEnabled) { stopDampers(); ensureDampers(); }
  }
  if (data.undulate !== undefined) get('tUndulate').checked = data.undulate;
  if (data.dampRPMRaise !== undefined) get('nDampRPMRaise').value = data.dampRPMRaise;
  if (data.dampAirOffset !== undefined) get('nDampAirOffset').value = data.dampAirOffset;
  if (data.dampRPMRaiseAuto !== undefined && window._setRaiseAuto) window._setRaiseAuto(!!data.dampRPMRaiseAuto);
  if (data.dampRaiseTime !== undefined) get('nDampRaiseTime').value = data.dampRaiseTime;
  if (data.dampReturnTime !== undefined) get('nDampReturnTime').value = data.dampReturnTime;
  if (data.dampRate !== undefined) get('nDampRate').value = data.dampRate;
  if (data.dampRateOffset !== undefined) get('nDampRateOffset').value = data.dampRateOffset;
  if (data.seqStepCount !== undefined){
    seqStepCount=Math.min(8,Math.max(2,data.seqStepCount));
    if(data.seqNumGroups!==undefined) seqNumGroups=Math.min(MAX_DAMPER_GROUPS,Math.max(2,data.seqNumGroups));
    if(Array.isArray(data.seqGroups)){
      seqGroups=data.seqGroups.map(function(g){return Array.isArray(g)?g.slice():[];}).slice(0,seqNumGroups);
      while(seqGroups.length<seqNumGroups) seqGroups.push(new Array(seqStepCount).fill(0));
    } else if(Array.isArray(data.seqHiSteps)){
      seqGroups=[data.seqHiSteps.slice(0,seqStepCount), (data.seqLoSteps||[]).slice(0,seqStepCount)];
      seqNumGroups=2;
    }
    if(data.oscGroupAssign) Object.assign(oscGroupAssign, data.oscGroupAssign);
    if(data.oscSideAssign) {
      Object.assign(oscSideAssign, data.oscSideAssign);
      const _km = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
      Object.keys(_km).forEach(function(k){ const sel = document.getElementById('permBidirSide'+_km[k]); if (sel && oscSideAssign[k] !== undefined) { sel.value = String(oscSideAssign[k]); sel.style.color = sideDropdownColor(sel.value); } });
    }
    if(data.stateOverrideConfig && typeof data.stateOverrideConfig === 'object'){
      ['idle','up','steady','down'].forEach(function(k){
        if(data.stateOverrideConfig[k]){
          _stateOverrideConfig[k].override   = !!data.stateOverrideConfig[k].override;
          _stateOverrideConfig[k].defaultOn  = !!data.stateOverrideConfig[k].defaultOn;
          _stateOverrideConfig[k].delayMs    = parseInt(data.stateOverrideConfig[k].delayMs)||0;
        }
      });
      var soMap = {idle:'soIdle',up:'soWindUp',steady:'soSteady',down:'soWindDown'};
      Object.keys(soMap).forEach(function(k){
        var prefix = soMap[k];
        var cfg = _stateOverrideConfig[k];
        var ob = get(prefix+'Override'); if(ob){ ob.textContent=cfg.override?'ON':'OFF'; ob.className=cfg.override?'vbtn btn-accent':'vbtn btn-gray'; }
        var db = get(prefix+'Default');  if(db){ db.textContent=cfg.defaultOn?'ON':'OFF'; db.className=cfg.defaultOn?'vbtn btn-accent':'vbtn btn-gray'; db.style.opacity=cfg.override?'':'0.4'; }
        var di = get(prefix+'Delay');    if(di){ di.value=cfg.delayMs; di.style.opacity=cfg.override?'':'0.4'; }
      });
    }
    if(Array.isArray(data.seqGroupVol)){
      data.seqGroupVol.forEach(function(v,i){ if(i<MAX_DAMPER_GROUPS) seqGroupVol[i]=Math.max(0,Math.min(100,parseInt(v)||100)); });
    }
    if(Array.isArray(data.seqGroupVolOff)){
      data.seqGroupVolOff.forEach(function(v,i){ if(i<MAX_DAMPER_GROUPS) seqGroupVolOff[i]=Math.max(0,Math.min(100,parseInt(v)||10)); });
    }
    if(data.seqModeActive){
      seqModeActive=true;
      const box=get('seqBox');if(box)box.classList.add('show');
      const btn=get('btnSeqMode');if(btn){btn.className='vbtn btn-accent';btn.style.marginLeft='6px';}
      const badge=get('seqActiveBadge');if(badge)badge.style.display='';
    }
    buildSeqUI();
  } else {
    var oldIsPulse = (data.pulseHiLo === undefined) ? true : !data.pulseHiLo;
    applySeqDefaults(oldIsPulse);
    buildSeqUI();
  }
  if(data.damperEnabled !== undefined){
    if(data.damperEnabled !== damperUserOn){
      var db = get('btnDamperHardDisable'); if(db) db.click();
    }
  }
  if (data.contactorWindUp !== undefined) get('nContactorWindUp').value = data.contactorWindUp;
  if (data.contactorWindUpFn) get('dContactorWindUpFn').value = data.contactorWindUpFn;
  if (data.contactorWindUpEasing) setEasingGroup('egContactorUp','dContactorWindUpEasing', data.contactorWindUpEasing);
  if (data.contactorWindDown !== undefined) get('nContactorWindDown').value = data.contactorWindDown;
  if (data.contactorWindDownFn) get('dContactorWindDownFn').value = data.contactorWindDownFn;
  if (data.contactorWindDownEasing) setEasingGroup('egContactorDown','dContactorWindDownEasing', data.contactorWindDownEasing);
  if (data.filterSlope) get('dFilterSlope').value = data.filterSlope;
  if (data.filterFn) get('dFilterFn').value = data.filterFn;
  if (data.filterEasing) setEasingGroup('egFilter','dFilterEasing', data.filterEasing);
  if (data.filterLow !== undefined) get('nFilterLow').value = data.filterLow;
  if (data.filterHigh !== undefined) get('nFilterHigh').value = data.filterHigh;
  if (data.damperAudio) {
    var da = data.damperAudio;
    ['hum','open','close'].forEach(function(k) {
      var cap = k.charAt(0).toUpperCase() + k.slice(1);
      var en = get('da' + cap + 'Enabled');
      var vol = get('da' + cap + 'Vol');
      var volVal = get('da' + cap + 'VolVal');
      if (en && da[k + 'Enabled'] !== undefined) {
        en.checked = !!da[k + 'Enabled'];
        en.dispatchEvent(new Event('change'));
      }
      if (vol && da[k + 'Vol'] !== undefined) {
        vol.value = da[k + 'Vol'];
        if (volVal) volVal.textContent = da[k + 'Vol'] + '%';
        vol.dispatchEvent(new Event('input'));
      }
    });
  }
  if (data.brakeOffset !== undefined || data.brakeTime !== undefined) {
    var bte = get('nBrakeOffset');
    if (bte) bte.value = (data.brakeOffset !== undefined ? data.brakeOffset : data.brakeTime);
  }
  if (data.brakeFn !== undefined) {
    var bfn = get('dBrakeFn');
    if (bfn) bfn.value = data.brakeFn;
  }
  if (data.brakeEasing !== undefined) {
    setEasingGroup('egBrake', 'dBrakeEasing', data.brakeEasing);
  }
}

function _applyExtraOscs(extraOscsArr) {
  if (!Array.isArray(extraOscsArr)) return;
  [...extraOscs].forEach(eo => removeExtraOsc(eo.id));
  const _idMap = {}, _restored = []; let _lastRotorNew;
  window._eoIdMap = _idMap;
  extraOscsArr.forEach(saved => {
    const restoreType = (saved.type === 'vane' || saved.type === 'harmonic') ? saved.type : undefined;
    addExtraOsc(restoreType);
    const eo = extraOscs[extraOscs.length-1];
    if(saved.id !== undefined && saved.id !== null) _idMap[saved.id] = eo.id;
    _restored.push(eo);
    if(saved.type === 'vane') eo._fbParent = _lastRotorNew;
    else if(!saved.type || saved.type === 'rotor') _lastRotorNew = eo.id;
    eo.type = saved.type || 'rotor';
    eo.value = Math.min(saved.value || 1, 23);
    eo.linkedChopper = saved.linkedChopper || 'hp';
    eo.mixerVal = saved.mixerVal ?? 50;
    eo.customName = saved.customName || '';
    eo.customColor = saved.customColor || eo.customColor;
    eo.seqGroup = saved.seqGroup || 0;
    eo.waveform = saved.waveform || 'default';
    const waveformEl = document.getElementById('eoWaveform'+eo.id);
    if(waveformEl) waveformEl.value = eo.waveform;
    Object.assign(eo.rasp, raspDef(), raspUnpack(saved.rasp)); raspNorm(eo.rasp); raspSyncUI('eo', eo.id, eo.rasp);
    if (saved.enabled === false) eo.enabled = false;
    eo.attenuate = saved.attenuate === true;
    eo.attenFilterType = saved.attenFilterType || 'lowpass';
    eo.attenCutoff = saved.attenCutoff || 1000;
    eo.attenQ = saved.attenQ || 0.7071;
    eo.attenCurve = saved.attenCurve || '12';
    eo.attenMix = saved.attenMix !== undefined ? saved.attenMix : 100;
    const attenEl = document.getElementById('eoAtten'+eo.id);
    if(attenEl) attenEl.checked = eo.attenuate;
    const attenFieldsEl = document.getElementById('eoAttenFields'+eo.id);
    if(attenFieldsEl) attenFieldsEl.style.display = eo.attenuate ? '' : 'none';
    const attenFilterTypeEl = document.getElementById('eoAttenFilterType'+eo.id);
    if(attenFilterTypeEl) attenFilterTypeEl.value = eo.attenFilterType;
    const attenCutoffEl = document.getElementById('eoAttenCutoff'+eo.id);
    if(attenCutoffEl) attenCutoffEl.value = eo.attenCutoff;
    const attenQEl = document.getElementById('eoAttenQ'+eo.id);
    if(attenQEl) attenQEl.value = eo.attenQ;
    const attenCurveEl = document.getElementById('eoAttenCurve'+eo.id);
    if(attenCurveEl) attenCurveEl.value = eo.attenCurve;
    const attenMixEl = document.getElementById('eoAttenMix'+eo.id);
    if(attenMixEl) attenMixEl.value = eo.attenMix;
    const attenMixValEl = document.getElementById('eoAttenMixVal'+eo.id);
    if(attenMixValEl) attenMixValEl.textContent = eo.attenMix + '%';
    const typeEl = document.getElementById('eoType'+eo.id);
    if(typeEl){ typeEl.value = eo.type; typeEl.dispatchEvent(new Event('change')); }
    const portEl = document.getElementById('eoPort'+eo.id);
    if(portEl) portEl.value = eo.value;
    const vaneEl = document.getElementById('eoVane'+eo.id);
    if(vaneEl) vaneEl.value = eo.value;
    const harmEl = document.getElementById('eoHarmonic'+eo.id);
    if(harmEl) harmEl.value = eo.value;
    const linkedEl = document.getElementById('eoLinked'+eo.id);
    if(linkedEl) linkedEl.value = eo.linkedChopper;
    const mixerEl = document.getElementById('sEO'+eo.id);
    if(mixerEl){ mixerEl.value = eo.mixerVal; document.getElementById('svEO'+eo.id).textContent = eo.mixerVal+'%'; }
    const nameEl = document.getElementById('eoName'+eo.id);
    if(nameEl){ nameEl.value = getEoDisplayName(eo); }
    const colorEl = document.getElementById('eoColor'+eo.id);
    if(colorEl){ colorEl.value = eo.customColor; }
    if (saved.enabled === false) {
      eo.enabled = false;
      const enableBtn = document.getElementById('eoEnable'+eo.id);
      if(enableBtn){ enableBtn.textContent = 'OFF'; enableBtn.className = 'vbtn btn-gray'; }
      const item = document.getElementById('eoItem'+eo.id);
      if(item) item.classList.add('eo-off');
    }
    if (saved.visible === false) {
      eo.visible = false;
      const eyeBtn = document.getElementById('eoEye'+eo.id);
      if(eyeBtn){ eyeBtn.style.color = 'var(--muted)'; eyeBtn.style.borderColor = 'transparent'; eyeBtn.style.opacity = '0.4'; eyeBtn.innerHTML = eyeClosedSVG; }
    }
    const groupSel = document.getElementById('seqGroupSelEO'+eo.id);
    if(groupSel){ groupSel.value = eo.seqGroup; if(typeof SEQ_GROUP_COLORS !== 'undefined') groupSel.style.color = SEQ_GROUP_COLORS[eo.seqGroup] || ''; }
    if (saved.motor !== undefined) eo.motor = saved.motor || 1;
    const motorEl = document.getElementById('eoMotor'+eo.id);
    if(motorEl){
      if(typeof refreshMotorSelects==='function') refreshMotorSelects();
      motorEl.value = String(eo.motor||1);
      motorEl.style.color = (eo.motor>=2) ? 'var(--accent2)' : 'var(--accent)';
    }
    if (saved.bidirSide !== undefined) eo.bidirSide = saved.bidirSide || 1;
    const bidirSideEl = document.getElementById('eoBidirSide'+eo.id);
    if(bidirSideEl){ bidirSideEl.value = String(eo.bidirSide||1); bidirSideEl.style.color = sideDropdownColor(bidirSideEl.value); }
    const statorUnlinked = (saved && saved.statorLinked === false);
    const mixSl = document.getElementById('sEO'+eo.id);
    if(mixSl){ mixSl.max = 100; }
    syncEoDisplayName(eo);
    syncEoColor(eo);
    if(eo.type === 'rotor' && saved){
      const hasStatorData = saved.hasOwnProperty('statorLinked');
      eo.statorLinked = hasStatorData ? saved.statorLinked !== false : true;
      eo.statorColor = saved.statorColor || '#e5a61f';
      eo.statorName = (saved.statorName && saved.statorName.length > 0) ? saved.statorName : 'Stator';
      eo.statorVal = hasStatorData ? (saved.statorVal ? Math.min(saved.statorVal, 23) : null) : Math.min(saved.value || 1, 23);
      eo.statorMixerVal = saved.statorMixerVal || 40;
      eo.statorEnabled = saved.statorEnabled !== false;
      eo.statorVisible = saved.statorVisible !== false;
      const statorEyeEl = document.getElementById('statorEye'+eo.id);
      if(statorEyeEl){
        statorEyeEl.innerHTML = eo.statorVisible ? eyeOpenSVG : eyeClosedSVG;
        statorEyeEl.style.color       = eo.statorVisible ? 'var(--accent)' : 'var(--muted)';
        statorEyeEl.style.borderColor = eo.statorVisible ? 'var(--border)' : 'transparent';
        statorEyeEl.style.opacity     = eo.statorVisible ? '1' : '0.4';
      }
      const statorColorEl = document.getElementById('statorColor'+eo.id);
      if(statorColorEl){ statorColorEl.value = eo.statorColor; statorColorEl.dispatchEvent(new Event('input')); }
      const statorNameEl = document.getElementById('statorName'+eo.id);
      if(statorNameEl) statorNameEl.value = eo.statorName;
      const statorPortEl = document.getElementById('statorPort'+eo.id);
      if(statorPortEl && eo.statorVal) statorPortEl.value = eo.statorVal;
      _applyStatorLinkState(eo);
      const statorMixSl = document.getElementById('sStator'+eo.id);
      const statorMixSv = document.getElementById('svStator'+eo.id);
      if(statorMixSl){ statorMixSl.value = eo.statorMixerVal; if(statorMixSv) statorMixSv.textContent = eo.statorMixerVal+'%'; }
    }
    if(audioCtx) buildExtraOscAudio(eo);
  });
  _restored.forEach((eo, i) => {
    const m = /^eo(\d+)$/.exec((extraOscsArr[i] && extraOscsArr[i].linkedChopper) || '');
    if(!m) return;
    let np = _idMap[+m[1]];
    if(np === undefined) np = eo._fbParent;
    if(np === undefined) return;
    eo.linkedChopper = 'eo' + np;
    delete eo._fbParent;
  });
  if(typeof refreshAllVaneLinkedDropdowns === 'function') refreshAllVaneLinkedDropdowns();
  _restored.forEach(eo => {
    const le = document.getElementById('eoLinked'+eo.id); if(le) le.value = eo.linkedChopper;
    if(eo.type === 'vane' && /^eo\d+$/.test(eo.linkedChopper||'') && audioCtx) buildExtraOscAudio(eo);
  });
  extraOscs.forEach(eo=>{
    if(eo.type === 'vane' && eo.linkedChopper && (eo.linkedChopper.indexOf('eo') === 0 || eo.linkedChopper === 'hp' || eo.linkedChopper === 'lp')){
      nestVaneUnderParentRotor(eo);
    }
  });
  relabelExtraOscs();
}

function applyTimbreData(data) {
  if (!data) return;
  function _syncPermMix(permId, hiddenMixId, val){
    if(val===undefined) return;
    const sliderEl = get(hiddenMixId);
    if(sliderEl){ sliderEl.value=val; }
    const svEl = get(hiddenMixId.replace(/^s/,'sv'));
    if(svEl) svEl.textContent = val+'%';
    if(sliderEl) syncSliderLabel(sliderEl);
  }
  if (data.chopper) get('dChopper').value = data.chopper;
  if (data.rpm !== undefined) get('eRPM').value = data.rpm;
  if (data.waveform) get('dWaveform').value = data.waveform;
  if (data.detuneValue !== undefined) setDetune(data.detuneValue);
  if (data.mixerHP !== undefined) { get('sHP').value = data.mixerHP; _syncPermMix('Hp','sHP',data.mixerHP); }
  if (data.mixerLP !== undefined) { get('sLP').value = data.mixerLP; _syncPermMix('Lp','sLP',data.mixerLP); }
  if (data.mixerUT !== undefined) { get('sUT').value = data.mixerUT; _syncPermMix('Ut','sUT',data.mixerUT); }
  if (data.mixerOT !== undefined) { get('sOT').value = data.mixerOT; _syncPermMix('Ot','sOT',data.mixerOT); }
  if (data.mixerHVane !== undefined) { get('sHVane').value = data.mixerHVane; _syncPermMix('Hv','sHVane',data.mixerHVane); }
  if (data.mixerLVane !== undefined) { get('sLVane').value = data.mixerLVane; _syncPermMix('Lv','sLVane',data.mixerLVane); }
  if (data.masterVol !== undefined) {
    get('sMasterVol').value = data.masterVol;
    get('svMasterVol').textContent = data.masterVol + '%';
    if (typeof masterGain !== 'undefined' && masterGain && typeof audioCtx !== 'undefined' && audioCtx) {
      masterGain.gain.setTargetAtTime(data.masterVol / 100, audioCtx.currentTime, 0.02);
    }
  }
  if (!data._version || data._version < 2) {
    applyOscillatorsData(data);
  }
  if (typeof refreshDefaultWaveformLabels === 'function') refreshDefaultWaveformLabels();
}

function applyOscillatorsData(data) {
  if (!data) return;
  function _syncPerm(permId, hiddenValId, val){ const el=document.getElementById('permVal'+permId); if(el&&val!==undefined){ el.value=val; get(hiddenValId).value=val; } }
  if (data.higherPort !== undefined) { const v=Math.min(data.higherPort,23); get('eHigherPort').value = v; _syncPerm('Hp','eHigherPort',v); }
  if (data.lowerPort !== undefined) { const v=Math.min(data.lowerPort,23); get('eLowerPort').value = v; _syncPerm('Lp','eLowerPort',v); }
  if (data.higherVanes !== undefined) { const v=Math.min(data.higherVanes,23); get('eHigherVanes').value = v; _syncPerm('Hv','eHigherVanes',v); }
  if (data.lowerVanes !== undefined) { const v=Math.min(data.lowerVanes,23); get('eLowerVanes').value = v; _syncPerm('Lv','eLowerVanes',v); }
  if (data.undertone !== undefined) { const v=Math.min(data.undertone,23); get('eUndertone').value = v; _syncPerm('Ut','eUndertone',v); }
  if (data.overtone !== undefined) { const v=Math.min(data.overtone,23); get('eOvertone').value = v; _syncPerm('Ot','eOvertone',v); }
  if (data.extraOscs !== undefined) _applyExtraOscs(data.extraOscs);
  if (data.permOscEnabled) {
    const keyMap = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
    Object.keys(data.permOscEnabled).forEach(function(k) {
      const want = !!data.permOscEnabled[k];
      permOscEnabled[k] = want;
      const btn = document.getElementById('permEnable' + (keyMap[k] || k));
      if (!btn) return;
      const isOn = btn.textContent.trim() === 'ON';
      if (isOn !== want) btn.click();
    });
  }
  if (data.permOscMotor) {
    const keyMap2 = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
    Object.keys(data.permOscMotor).forEach(function(k) {
      const m = parseInt(data.permOscMotor[k])||1;
      permOscMotor[k] = m;
      const sel = document.getElementById('permMotor' + (keyMap2[k] || k));
      if (sel) { sel.value = String(m); sel.style.color = m>=2 ? 'var(--accent2)' : 'var(--accent)'; }
    });
  }
  {
    const keyMap6 = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
    const savedVis = data.permOscVisible || {};
    Object.keys(keyMap6).forEach(function(gk) {
      const visible = savedVis[gk] !== false;
      permOscVisible[gk] = visible;
      const eyeBtn = document.getElementById('permEye' + keyMap6[gk]);
      if (eyeBtn) {
        eyeBtn.style.color       = visible ? 'var(--accent)' : 'var(--muted)';
        eyeBtn.style.borderColor = visible ? 'var(--border)' : 'transparent';
        eyeBtn.style.opacity     = visible ? '1' : '0.4';
        eyeBtn.innerHTML         = visible ? eyeOpenSVG : eyeClosedSVG;
      }
    });
    ['hp','lp'].forEach(function(rk) {
      const vaneKey = rk === 'hp' ? 'hv' : 'lv';
      const vaneId  = rk === 'hp' ? 'Hv' : 'Lv';
      const rotorVisible = permOscVisible[rk] !== false;
      _updatePermVaneEyeFromRotor(vaneId, rotorVisible ? permOscVisible[vaneKey] : false);
    });
    if (typeof redrawChoppers === 'function') redrawChoppers(chopperAngleA, chopperAngleB);
  }
  if (data.permOscWaveform) {
    const keyMap3 = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
    Object.keys(data.permOscWaveform).forEach(function(k) {
      const wf = data.permOscWaveform[k] || 'default';
      permOscWaveform[k] = wf;
      const sel = document.getElementById('permWaveform' + (keyMap3[k] || k));
      if (sel) sel.value = wf;
    });
  }
  if (data.permAtten) {
    const keyMap5 = {hv:'Hv', lv:'Lv', ut:'Ut', ot:'Ot'};
    PERM_ATTEN_KEYS.forEach(function(k) {
      const saved = data.permAtten[k];
      if (!saved) return;
      const pa = permAtten[k];
      pa.enabled = saved.enabled === true;
      pa.filterType = saved.filterType || 'lowpass';
      pa.cutoff = saved.cutoff || 1000;
      pa.q = saved.q || 0.7071;
      pa.curve = saved.curve || '12';
      pa.mix = saved.mix !== undefined ? saved.mix : 100;
      const idStr = keyMap5[k];
      const chk = document.getElementById('permAtten'+idStr);
      if (chk) chk.checked = pa.enabled;
      const fieldsEl = document.getElementById('permAttenFields'+idStr);
      if (fieldsEl) fieldsEl.style.display = pa.enabled ? '' : 'none';
      const filterTypeEl = document.getElementById('permAttenFilterType'+idStr);
      if (filterTypeEl) filterTypeEl.value = pa.filterType;
      const cutoffEl = document.getElementById('permAttenCutoff'+idStr);
      if (cutoffEl) cutoffEl.value = pa.cutoff;
      const qEl = document.getElementById('permAttenQ'+idStr);
      if (qEl) qEl.value = pa.q;
      const curveEl = document.getElementById('permAttenCurve'+idStr);
      if (curveEl) curveEl.value = pa.curve;
      const mixEl = document.getElementById('permAttenMix'+idStr);
      if (mixEl) mixEl.value = pa.mix;
      const mixValEl = document.getElementById('permAttenMixVal'+idStr);
      if (mixValEl) mixValEl.textContent = pa.mix + '%';
      if (typeof refreshPermAttenRouting === 'function') refreshPermAttenRouting(k);
    });
  }
  RASP_KEYS.forEach(function(k){
    Object.assign(permRasp[k], raspDef(), raspUnpack(data.permRasp && data.permRasp[k])); raspNorm(permRasp[k]);
    raspSyncUI('perm', k.charAt(0).toUpperCase()+k.slice(1), permRasp[k]);
    if (oscNodes[k]) raspRefresh(oscNodes[k]);
  });
  if (data.permOscColors) Object.keys(data.permOscColors).forEach(function(k){
    const el = document.getElementById('permColor'+k);
    if (el && /^#[0-9a-f]{6}$/i.test(data.permOscColors[k])) { el.value = data.permOscColors[k]; el.dispatchEvent(new Event('input')); }
  });
  if (data.bidirFilter) [['nBidirFilterFloorHz','floorHz'],['nBidirFilterOpenHz','openHz'],['nBidirFilterQ','q']].forEach(function(p){
    const el = get(p[0]); if (el && data.bidirFilter[p[1]] !== undefined && data.bidirFilter[p[1]] !== '') { el.value = data.bidirFilter[p[1]]; el.dispatchEvent(new Event('input')); }
  });
  if (data.oscSideAssign) {
    const keyMap4 = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
    Object.keys(data.oscSideAssign).forEach(function(k) {
      const raw = data.oscSideAssign[k];
      const side = raw === 'both' ? 'both' : (parseInt(raw) || 1);
      oscSideAssign[k] = side;
      const sel = document.getElementById('permBidirSide' + (keyMap4[k] || k));
      if (sel){ sel.value = String(side); sel.style.color = sideDropdownColor(sel.value); }
    });
  }
  if (data.permOscNames) {
    const LEGACY_PERM_DEFAULTS = {Hp:'High Rotor', Hv:'High Vanes', Lp:'Low Rotor', Lv:'Low Vanes'};
    ['Hp','Hv','Lp','Lv','Ut','Ot'].forEach(function(id) {
      const name = data.permOscNames[id];
      if (name === undefined) return;
      if (LEGACY_PERM_DEFAULTS[id] && name === LEGACY_PERM_DEFAULTS[id]) return;
      const inp = document.getElementById('permName' + id);
      if (inp) {
        inp.value = name;
        inp.dispatchEvent(new Event('input'));
      }
    });
  }
  if (data.permStator) {
    ['hp','lp'].forEach(function(k){
      const saved = data.permStator[k];
      const idStr = k === 'hp' ? 'Hp' : 'Lp';
      const st = permStator[k];
      st.visible = (saved && saved.visible !== undefined) ? (saved.visible !== false) : true;
      const eyeEl = document.getElementById('permStatorEye'+idStr);
      if(eyeEl){
        eyeEl.innerHTML = st.visible ? eyeOpenSVG : eyeClosedSVG;
        eyeEl.style.color       = st.visible ? 'var(--accent)' : 'var(--muted)';
        eyeEl.style.borderColor = st.visible ? 'var(--border)' : 'transparent';
        eyeEl.style.opacity     = st.visible ? '1' : '0.4';
      }
      if (!saved) return;
      st.linked = saved.linked !== false;
      st.color = saved.color || '#e5a61f';
      st.name = (saved.name && saved.name.length > 0) ? saved.name : 'Stator';
      st.val = saved.val || null;
      st.mixerVal = saved.mixerVal ?? 40;
      st.enabled = saved.enabled !== false;
      const colorEl = document.getElementById('permStatorColor'+idStr);
      if (colorEl) { colorEl.value = st.color; colorEl.dispatchEvent(new Event('input')); }
      const nameEl = document.getElementById('permStatorName'+idStr);
      if (nameEl) nameEl.value = st.name;
      const portEl = document.getElementById('permStatorPort'+idStr);
      if (portEl && st.val) portEl.value = st.val;
      _applyPermStatorLinkState(idStr, k);
      const mixSl = document.getElementById('sPermStator'+idStr);
      const mixSv = document.getElementById('svPermStator'+idStr);
      if (mixSl) { mixSl.value = st.mixerVal; if (mixSv) mixSv.textContent = st.mixerVal + '%'; }
    });
  } else {
    var _hpPort = parseFloat(get('eHigherPort').value) || 12;
    var _lpPort = parseFloat(get('eLowerPort').value) || 10;
    ['hp','lp'].forEach(function(k){
      const st = permStator[k];
      const idStr = k === 'hp' ? 'Hp' : 'Lp';
      const portVal = k === 'hp' ? _hpPort : _lpPort;
      st.linked = true;
      st.val = portVal;
      st.visible = true;
      const eyeEl = document.getElementById('permStatorEye'+idStr);
      if(eyeEl){
        eyeEl.innerHTML = eyeOpenSVG;
        eyeEl.style.color       = 'var(--accent)';
        eyeEl.style.borderColor = 'var(--border)';
        eyeEl.style.opacity     = '1';
      }
      const portEl = document.getElementById('permStatorPort'+idStr);
      if (portEl) portEl.value = portVal;
      _applyPermStatorLinkState(idStr, k);
    });
  }
  if (data.rootOrder && typeof applyOscillatorRootOrder === 'function') {
    applyOscillatorRootOrder(data.rootOrder.map(function(k){ var m = (data.extraOscs !== undefined) ? window._eoIdMap : null; return (m && m[k] !== undefined) ? String(m[k]) : k; }));
  }
  if (typeof syncMixerOrderWithOscillatorSection === 'function') {
    syncMixerOrderWithOscillatorSection();
  }
}

function applyDiagramData(data) {
  if (!data) return;
  if (data.showHighVanes !== undefined && data.showHighVanes !== showHighVanes) toggleHighVanes();
  if (data.showLowVanes !== undefined && data.showLowVanes !== showLowVanes) toggleLowVanes();
}

var _loadedPresetVersion = null;
var _loadedPresetFileVersion = null;

function applyMainData(data) {
  if (!data) data = {};
  get('ePresetModel').value = data.presetModel || '';
  get('ePresetMfg').value = data.presetManufacturer || '';
  get('ePresetSeries').value = data.presetSeries || '';
  get('ePresetDesc').value = data.presetDescription || '';
  get('ePresetCreator').value = data.presetCreator || '';
  get('ePresetDerivedFrom').value = data.presetDerivedFrom || '';
  if (data.motorSim && typeof applyMotorSimData === 'function') applyMotorSimData(data.motorSim);
  _loadedPresetVersion = data.version || null;
  _loadedPresetFileVersion = null;
  if (typeof window._syncPresetInfoPanel === 'function') window._syncPresetInfoPanel();
}

function applyCustomFnsData(data) {
  if (!data) return;
  if (typeof window._oscpApplyCustomFnsData === 'function') window._oscpApplyCustomFnsData(data);
}

async function loadPreset(file, selectedJsons) {
  if (typeof window._clearCommunityLoadState === 'function') window._clearCommunityLoadState();

  if (typeof JSZip === 'undefined') {
    alert('JSZip library still loading. Please wait a moment and try again.');
    return;
  }

  const _fxBtn = get('btnDisableAllFx');
  if (_fxDisabled && _fxBtn) {
    _fxBtn.disabled = true;
    _fxBtn.style.opacity = '0.4';
    _fxBtn.style.cursor = 'not-allowed';
    _fxBtn.style.pointerEvents = 'none';
  }

  try {
    const zip = await JSZip.loadAsync(file);
    if (!selectedJsons && window._stvApply) { try { const _sf = zip.file('subtabs.json'); window._stvApply(_sf ? JSON.parse(await _sf.async('string')) : null); } catch(e) { console.warn('[Preset] subtabs', e); } }

    get('presetDetailsBox').classList.add('show');

    async function loadJson(name, applyFn) {
      if (selectedJsons && !selectedJsons.includes(name)) return;
      const f = zip.file(name);
      if (f) applyFn(JSON.parse(await f.async('string')));
    }

    if (!selectedJsons || selectedJsons.includes('main.json')) {
      const _mainF = zip.file('main.json');
      applyMainData(_mainF ? JSON.parse(await _mainF.async('string')) : {});
    }
    await loadJson('customfns.json', applyCustomFnsData);
    await loadJson('functions.json', applyFunctionsData);
    if (!selectedJsons || selectedJsons.includes('controller.json')) {
      const _ctlF = zip.file('controller.json');
      if (_ctlF) applyControllerData(JSON.parse(await _ctlF.async('string')));
      else applyControllerData({ comps: [] });
    }
    await loadJson('controls.json',  applyControlsData);
    await loadJson('timbre.json', data => {
      if (!data) return;
      applyTimbreData(data);
    });
    if (!selectedJsons || selectedJsons.includes('oscillators.json')) {
      [...extraOscs].forEach(eo => removeExtraOsc(eo.id));
    }
    await loadJson('oscillators.json', applyOscillatorsData);
    await loadJson('diagram.json',   applyDiagramData);
    await loadJson('effects.json',   applyEffectsData);
    await loadJson('blower.json',    applyBlowerData);
    await loadJson('rotation.json',  applyRotationData);
    await loadJson('constants.json', applyConstantsData);
    await loadJson('posfx.json',     applyPosFxData);
    if (!selectedJsons || selectedJsons.includes('rotorconfig.json')) {
      const _rcF = zip.file('rotorconfig.json');
      applyRotorConfigData(_rcF ? JSON.parse(await _rcF.async('string')) : null);
    }
    await loadJson('settings.json',  applySettingsData);

    async function _loadUserAudio(path, onDecoded) {
      const f = zip.file(path);
      if (!f) return;
      try {
        const ab = await f.async('arraybuffer');
        if (!audioCtx) return;
        audioCtx.decodeAudioData(ab.slice(0), function(buf) {
          window._wavReg(buf, ab);
          onDecoded(buf);
        }, function(e) { console.warn('[Preset] Could not decode', path, e); });
      } catch(e) { console.warn('[Preset] Could not load', path, e); }
    }

    await _loadUserAudio('user/reverb1_ir.wav', function(buf) {
      reverb1IRBuffer = buf;
      if (typeof reverbNode !== 'undefined' && reverbNode) reverbNode.buffer = buf;
      const n = get('reverbIRName'); if (n && (!n.textContent || n.textContent === 'No file loaded')) n.textContent = 'reverb1_ir.wav (saved)';
      const s = get('reverbIRStatus'); if (s) { s.textContent = 'Loaded \u2014 ' + buf.duration.toFixed(2) + 's'; s.style.color = 'var(--accent)'; s.style.display = ''; }
    });
    await _loadUserAudio('user/reverb2_ir.wav', function(buf) {
      reverb2IRBuffer = buf;
      if (typeof reverb2Node !== 'undefined' && reverb2Node) reverb2Node.buffer = buf;
      const n = get('reverb2IRName'); if (n && (!n.textContent || n.textContent === 'No file loaded')) n.textContent = 'reverb2_ir.wav (saved)';
      const s = get('reverb2IRStatus'); if (s) { s.textContent = 'Loaded \u2014 ' + buf.duration.toFixed(2) + 's'; s.style.color = 'var(--accent)'; s.style.display = ''; }
    });
    await _loadUserAudio('user/reverb3_ir.wav', function(buf) {
      reverb3IRBuffer = buf;
      if (typeof reverb3Node !== 'undefined' && reverb3Node) reverb3Node.buffer = buf;
      const n = get('reverb3IRName'); if (n && (!n.textContent || n.textContent === 'No file loaded')) n.textContent = 'reverb3_ir.wav (saved)';
      const s = get('reverb3IRStatus'); if (s) { s.textContent = 'Loaded \u2014 ' + buf.duration.toFixed(2) + 's'; s.style.color = 'var(--accent)'; s.style.display = ''; }
    });
    await _loadUserAudio('user/damper_hum.wav', function(buf) {
      window._daBufHum = buf;
      const btn = get('daHumImport'); if (btn) btn.style.borderColor = 'var(--accent)';
    });
    await _loadUserAudio('user/damper_open.wav', function(buf) {
      window._daBufOpen = buf;
      const btn = get('daOpenImport'); if (btn) btn.style.borderColor = 'var(--accent)';
    });
    await _loadUserAudio('user/damper_close.wav', function(buf) {
      window._daBufClose = buf;
      const btn = get('daCloseImport'); if (btn) btn.style.borderColor = 'var(--accent)';
    });
    
    applyConfig();
    updateFreqDisplay();
    if (!chopperAnimEnabled) redrawChoppers(0, 0);
    
    presetSnapshot = capturePresetSnapshot();
    setPresetStatus('current');
    
    get('statusTxt').textContent = 'PRESET LOADED';
    setTimeout(() => get('statusTxt').textContent = 'IDLE', 2000);

    setTimeout(function() {
      if (!audioCtx) return;
      function _cycleConv(enabledVar, setEnabled, btnId, bodyId, extraOn, extraOff) {
        if (!enabledVar()) return;
        setEnabled(false);
        if (extraOff) extraOff();
        rebuildFxChain();
        setTimeout(function() {
          setEnabled(true);
          if (extraOn) extraOn();
          rebuildFxChain();
        }, 40);
      }
      _cycleConv(
        () => reverbEnabled,
        v => { reverbEnabled = v; const b=get('btnReverbEnable'); if(b){b.textContent=v?'ENABLED':'ENABLE';b.className=v?'vbtn btn-accent active':'vbtn btn-accent';} const bd=get('reverbBody'); if(bd){bd.classList.toggle('disabled-overlay',!v);} },
        'btnReverbEnable', 'reverbBody', null, null
      );
      _cycleConv(
        () => reverb2Enabled,
        v => { reverb2Enabled = v; const b=get('btnReverb2Enable'); if(b){b.textContent=v?'ENABLED':'ENABLE';b.className=v?'vbtn btn-accent active':'vbtn btn-accent';} const bd=get('reverb2Body'); if(bd){bd.classList.toggle('disabled-overlay',!v);} },
        'btnReverb2Enable', 'reverb2Body', null, null
      );
      _cycleConv(
        () => reverb3Enabled,
        v => { reverb3Enabled = v; const b=get('btnReverb3Enable'); if(b){b.textContent=v?'ENABLED':'ENABLE';b.className=v?'vbtn btn-accent active':'vbtn btn-accent';} const bd=get('reverb3Body'); if(bd){bd.classList.toggle('disabled-overlay',!v);} },
        'btnReverb3Enable', 'reverb3Body', null, null
      );
      if (typeof setSpatialFxMode === 'function') setSpatialFxMode(spatialFxMode);
      _cycleConv(
        () => distanceEnabled,
        v => { distanceEnabled = v; const b=get('btnDistanceEnable'); if(b){b.textContent=v?'ENABLED':'ENABLE';b.className=v?'vbtn btn-accent active':'vbtn btn-accent';} const bd=get('distanceBody'); if(bd){bd.classList.toggle('disabled-overlay',!v);} },
        'btnDistanceEnable', 'distanceBody', null, null
      );
      _cycleConv(
        () => directionEnabled,
        v => { directionEnabled = v; const b=get('btnDirectionEnable'); if(b){b.textContent=v?'ENABLED':'ENABLE';b.className=v?'vbtn btn-accent active':'vbtn btn-accent';} const bd=get('directionBody'); if(bd){bd.classList.toggle('disabled-overlay',!v);} },
        'btnDirectionEnable', 'directionBody', null, null
      );
    }, 600);
    
  } catch (error) {
    console.error('Error loading preset:', error);
    alert('Failed to load preset file. Make sure it is a valid preset file.');
  } finally {
    if (_fxBtn) {
      _fxBtn.disabled = false;
      _fxBtn.style.opacity = '';
      _fxBtn.style.cursor = '';
      _fxBtn.style.pointerEvents = '';
    }
  }
}

var _hv=get('headerVersion');    if(_hv)    _hv.textContent    = APP_VERSION;
var _pv=get('popupVersion');     if(_pv)    _pv.textContent    = APP_VERSION;
var _atv=get('audioTipVersion'); if(_atv)   _atv.textContent   = APP_VERSION;
var _rpv=get('resetPopupVersion');if(_rpv)  _rpv.textContent   = APP_VERSION;
var _abv=get('aboutPopupVersion');if(_abv)  _abv.textContent   = APP_VERSION;
var _clv=get('communityLogoVersion');if(_clv)_clv.textContent   = APP_VERSION;


