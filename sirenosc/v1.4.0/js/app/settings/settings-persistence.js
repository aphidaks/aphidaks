(function(){
  const LS_KEY = 'sirenosc_settings';

  window.__sirenoscSaveFailed = false;
  function showSaveFailureBanner(reason) {
    if (window.__sirenoscSaveFailed) return;
    window.__sirenoscSaveFailed = true;
    try {
      const bar = document.createElement('div');
      bar.textContent = 'SirenOsc could not save your settings (' + reason + '). ' +
        'Changes will NOT persist after reload. Try freeing browser storage or disabling private browsing.';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;' +
        'background:#5a1a1a;color:#fff;font:12px/1.4 sans-serif;padding:8px 14px;' +
        'text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)';
      bar.title = 'Click to dismiss';
      bar.addEventListener('click', function(){ bar.remove(); });
      document.body.appendChild(bar);
    } catch(e) {  }
  }
  const LS_NONESSENTIAL_KEYS = ['sirenosc_fx_snapshot', 'sirenosc_fx_startup'];
  window.lsSetSafe = function(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn('[SirenOsc] localStorage.setItem failed for "' + key + '", attempting cleanup + retry:', err);
      try {
        LS_NONESSENTIAL_KEYS.forEach(function(k) {
          if (k !== key) { try { localStorage.removeItem(k); } catch(e2) {} }
        });
        localStorage.setItem(key, value);
        console.warn('[SirenOsc] Retry succeeded after clearing non-essential caches.');
        return true;
      } catch (err2) {
        console.error('[SirenOsc] localStorage write permanently failed for "' + key + '":', err2);
        showSaveFailureBanner(err2 && err2.name ? err2.name : 'storage error');
        return false;
      }
    }
  };

  const VALUE_IDS = [
    'dChopper','dWaveform','dWindUpFn','dWindUpEasing','dWindDownFn','dWindDownEasing',
    'dTorqueFn','dTorqueEasing','dFilterFn','dFilterEasing','dFilterSlope',
    'dContactorWindUpFn','dContactorWindUpEasing','dContactorWindDownFn','dContactorWindDownEasing',
    'dDistChar','dConstAWave','dConstBWave','dPresetType','dConstAPos','dConstBPos','nConstADb10','nConstBDb10','nConstAOff','nConstBOff','nConstASteep','nConstBSteep',
    'dReverb1Mode','dReverb2Mode','dReverb3Mode','dSpatialFxMode',
    'dReverbPosLink','dReverb2PosLink','dReverb3PosLink',
'nReverbPLDry','nReverbPLWet','nReverbPLNear','nReverbPLFar','nReverbPLDistW','nReverbPLDirW','nReverbPLCurve','nReverb2PLDry','nReverb2PLWet','nReverb2PLNear','nReverb2PLFar','nReverb2PLDistW','nReverb2PLDirW','nReverb2PLCurve','nReverb3PLDry','nReverb3PLWet','nReverb3PLNear','nReverb3PLFar','nReverb3PLDistW','nReverb3PLDirW','nReverb3PLCurve',
    'dSdWindUpFn','dSdWindUpEasing','dSdWindDownFn','dSdWindDownEasing',
    'dBlowerConstWindUpFn','dBlowerConstWindDownFn',
    'eHigherPort','eLowerPort','eHigherVanes','eLowerVanes','eRPM','eUndertone','eOvertone',
    'ePresetModel','ePresetMfg','ePresetSeries','ePresetDerivedFrom','ePresetCreator','ePresetDesc',
    'nWindUp','nWindDown','nTorqueRPM','nTorqueOffset',
    'nFilterLow','nFilterHigh',
    'nDampRate','nDampRateOffset','nDampRPMRaise','nDampAirOffset','nDampRaiseTime','nDampReturnTime',
    'nBlowerFadeTime','nBlowerFadeInTime',
    'nContactorWindUp','nContactorWindDown',
    'nReverbPreDelay','nReverb2PreDelay','nReverb3PreDelay','nDistanceRevDist','nDistanceDb100',
    'nSlpfCutoff','nSlpfQ','nHpfCutoff','nHpfQ','nDistTone','nNormCeiling',
    'nRotMaxRPM','nRotPeakWet','nRotDirAngle',
    'nBidirFilterFloorHz','nBidirFilterOpenHz','nBidirFilterQ',
    'nRotWindUp','nRotWindDown','dRotWindUpFn','dRotWindDownFn','dRotWindUpEasing','dRotWindDownEasing',
    'nRotOscAngle','nRotOscPause',
    'nCollectorOffDur',
    'nSdWindUp','nSdWindDown',
    'nConstAFreq','nConstBFreq',
    'nBlowerConstWindUpOffset','nBlowerConstWindDownOffset',
    'sHP','sLP','sUT','sOT','sHVane','sLVane','sMasterVol',
    'sFilterOffset','sFilterSteep',
    'sReverbSize','sReverbDecay','sReverbDiffusion','sReverbColor','sReverbMix','sReverbLowCut',
    'sReverb2Size','sReverb2Decay','sReverb2Diffusion','sReverb2Color','sReverb2Mix','sReverb2LowCut',
    'sReverb3Size','sReverb3Decay','sReverb3Diffusion','sReverb3Color','sReverb3Mix','sReverb3LowCut',
    'sDistanceMix','sDistancePreGain','sDistanceAutoFilterFreq','sDispersionRate','sDistanceRate','sDistanceDepth',
    'nMaxDispersion','nMinDispersion','nMidDispersion','nLeftDispersion','nDispSpan',
    'sDirectionMix','sDirectionRate','sDirPanStrength','sSosSpeed',
    'sSlpfMix','sHpfMix','sDistDrive','sDistOutput','sDistMix','sNormPreGain','sNormPostGain',
    'sBlowerAmplitude','sBlowerSmoothing','sBlowerMix','sBlowerOutput','sBlowerVolDrop',
    'sConstAVol','sConstALpf','sConstBVol','sConstBLpf',
    'sCollectorFreq',
    'nVibratoSpeed','nVibratoDepth','nRPMSnap','nTailSpeed',
    'detuneSlider',
    'nDualMotorPeakRPM','nDualMotorDelay',
    'daHumVol','daOpenVol','daCloseVol',
    'nPitchDeclineRPM','nPitchDeclineTime','dPitchDeclineFn','dPitchDeclineEasing',
    'nBrakeOffset','dBrakeFn','dBrakeEasing',
    'revPreset1','revPreset2','revPreset3'
  ];

  const CHECK_IDS = ['tUndulate','tPulseHiLo','tTorque','tVibrato','daHumEnabled','daOpenEnabled','daCloseEnabled','tPitchDecline','tConstABlowerLink','tConstBBlowerLink','tConstALpfOn','tConstBLpfOn','tSdAutoFill','tDualMotor','tCollectorWear','tRotOscillate','tRotOscSine','tMidDispersionAuto'];

  const ENABLE_BTNS = [
    'btnReverbEnable','btnReverb2Enable','btnReverb3Enable','btnSlpfEnable','btnHpfEnable',
    'btnDistEnable','btnBlowerEnable','btnDamperHardDisable','btnNormEnable',
    'btnRotMode',
    'btnConstAEnable','btnConstBEnable',
    'btnLpfEnable','btnDistanceEnable','btnDirectionEnable','btnSosEnable'
  ];

  window.saveSettings = function() { saveSettings(); };
  function saveSettings() {
    const data = { values: {}, checks: {}, enableBtns: {} };
    VALUE_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) data.values[id] = el.value;
    });
    CHECK_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) data.checks[id] = el.checked;
    });
    ENABLE_BTNS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === 'btnDamperHardDisable' || id === 'btnConstAEnable' || id === 'btnConstBEnable') {
        data.enableBtns[id] = el.classList.contains('btn-accent');
      } else {
        data.enableBtns[id] = el.classList.contains('active');
      }
    });
    if (typeof permOscEnabled !== 'undefined') {
      data.permOscEnabled = Object.assign({}, permOscEnabled);
    }
    data.permOscNames = {
      Hp: (get('permNameHp') && get('permNameHp').value) || '',
      Hv: (get('permNameHv') && get('permNameHv').value) || '',
      Lp: (get('permNameLp') && get('permNameLp').value) || '',
      Lv: (get('permNameLv') && get('permNameLv').value) || '',
      Ut: (get('permNameUt') && get('permNameUt').value) || '',
      Ot: (get('permNameOt') && get('permNameOt').value) || ''
    };
    if (typeof permStator !== 'undefined') {
      data.permStator = {
        hp: Object.assign({}, permStator.hp),
        lp: Object.assign({}, permStator.lp)
      };
    }
    if (typeof gatherOscillatorsData === 'function') {
      data.oscillators = gatherOscillatorsData();
    }
    if (typeof gatherTimbreData === 'function') {
      const t = gatherTimbreData();
      data.timbreConfig = { chopper: t.chopper, rpm: t.rpm, waveform: t.waveform, detuneValue: t.detuneValue };
    }
    if (typeof gatherControlsData === 'function') {
      data.controlsData = gatherControlsData();
    }
    lsSetSafe(LS_KEY, JSON.stringify(data));

    if (typeof gatherPosFxData === 'function') {
      lsSetSafe('sirenosc_posfx_json', JSON.stringify(gatherPosFxData()));
    }

    const extraConsts = CONSTS.filter(id => id !== 'A' && id !== 'B');
    const extraData = extraConsts.map(id => ({
      id,
      freq:       parseFloat((get('nConst' + id + 'Freq')    || {}).value) || 120,
      wave:       (get('dConst' + id + 'Wave')  || {}).value || 'square',
      vol:        parseFloat((get('sConst' + id + 'Vol')     || {}).value) || 4,
      lpf:        parseFloat((get('sConst' + id + 'Lpf')     || {}).value) || 2,
      harmonic:   parseFloat((get('nConst' + id + 'Harmonic')|| {}).value) || 1,
      rpmLink:    isConstRpmLinked(id),
      blowerLink: (get('tConst' + id + 'BlowerLink') || {}).checked || false,
      fadeInRPM:  parseFloat((get('nConst' + id + 'FadeInRPM') || {}).value) || 50,
      cutoffRPM:  parseFloat((get('nConst' + id + 'CutoffRPM') || {}).value) || 800,
      lpfOn:      !(get('tConst' + id + 'LpfOn') && !get('tConst' + id + 'LpfOn').checked),
      pos:        (get('dConst' + id + 'Pos') || {}).value || 'follow',
      db10:       parseFloat((get('nConst' + id + 'Db10') || {}).value),
      off:        parseFloat((get('nConst' + id + 'Off') || {}).value),
      steep:      parseFloat((get('nConst' + id + 'Steep') || {}).value),
      enabled:    constNodes[id] ? constNodes[id].enabled : false
    }));
    lsSetSafe(LS_KEY + '_extraConsts', JSON.stringify(extraData));
  }

  function restoreSettings() {
    let raw;
    try { raw = localStorage.getItem(LS_KEY); } catch(e) { return; }
    if (!raw) return;
    let data;
    try { data = JSON.parse(raw); } catch(e) { return; }

    if (data.values) {
      VALUE_IDS.forEach(id => {
        if (data.values[id] !== undefined) {
          const el = document.getElementById(id);
          if (el) {
            el.value = data.values[id];
            el.dispatchEvent(new Event('input'));
            if (id === 'dReverb1Mode' || id === 'dReverb2Mode' || id === 'dReverb3Mode' || id === 'dSpatialFxMode') {
              el.dispatchEvent(new Event('change'));
            }
          }
        }
      });
    }
    if (data.checks) {
      CHECK_IDS.forEach(id => {
        if (data.checks[id] !== undefined) {
          const el = document.getElementById(id);
          if (el) { el.checked = data.checks[id]; el.dispatchEvent(new Event('change')); }
        }
      });
    }
    if (data.enableBtns) {
      ENABLE_BTNS.forEach(id => {
        if (data.enableBtns[id] !== undefined) {
          const el = document.getElementById(id);
          if (!el) return;
          const isActive = (id === 'btnDamperHardDisable' || id === 'btnConstAEnable' || id === 'btnConstBEnable')
            ? el.classList.contains('btn-accent')
            : el.classList.contains('active');
          if (isActive !== data.enableBtns[id]) el.click();
        }
      });
    }
    if (data.permOscEnabled) {
      const keyMap = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
      Object.keys(data.permOscEnabled).forEach(function(k) {
        const want = !!data.permOscEnabled[k];
        if (typeof permOscEnabled !== 'undefined') permOscEnabled[k] = want;
        const btnId = 'permEnable' + (keyMap[k] || k);
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const isOn = btn.textContent.trim() === 'ON';
        if (isOn !== want) btn.click();
      });
    }
    if (data.permOscMotor) {
      const keyMap2 = {hp:'Hp', hv:'Hv', lp:'Lp', lv:'Lv', ut:'Ut', ot:'Ot'};
      Object.keys(data.permOscMotor).forEach(function(k) {
        const m = parseInt(data.permOscMotor[k])||1;
        if (typeof permOscMotor !== 'undefined') permOscMotor[k] = m;
        const sel = document.getElementById('permMotor' + (keyMap2[k] || k));
        if (sel) { sel.value = String(m); sel.style.color = m>=2 ? 'var(--accent2)' : 'var(--accent)'; }
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
    if (data.permStator && typeof permStator !== 'undefined') {
      ['hp','lp'].forEach(function(k){
        const saved = data.permStator[k];
        const idStr = k === 'hp' ? 'Hp' : 'Lp';
        if (!saved) return;
        const st = permStator[k];
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
        if (typeof _applyPermStatorLinkState === 'function') _applyPermStatorLinkState(idStr, k);
        const mixSl = document.getElementById('sPermStator'+idStr);
        const mixSv = document.getElementById('svPermStator'+idStr);
        if (mixSl) { mixSl.value = st.mixerVal; if (mixSv) mixSv.textContent = st.mixerVal + '%'; }
      });
    }
    if (data.oscillators && typeof applyOscillatorsData === 'function') {
      applyOscillatorsData(data.oscillators);
    }
    if (data.timbreConfig) {
      if (data.timbreConfig.detuneValue !== undefined && typeof setDetune === 'function') {
        setDetune(data.timbreConfig.detuneValue);
      }
    }
    if (data.controlsData && typeof applyControlsData === 'function') {
      applyControlsData(data.controlsData);
    } else if (typeof applySeqDefaults === 'function') {
      applySeqDefaults();
      if (typeof buildSeqUI === 'function') buildSeqUI();
    }
    if (typeof refreshDefaultWaveformLabels === 'function') refreshDefaultWaveformLabels();

    let posfxRaw;
    try { posfxRaw = localStorage.getItem('sirenosc_posfx_json'); } catch(e) {}
    if (posfxRaw && typeof applyPosFxData === 'function') {
      try { applyPosFxData(JSON.parse(posfxRaw)); } catch(e) {}
    }
  }

  document.addEventListener('input', saveSettings);
  document.addEventListener('change', saveSettings);
  ENABLE_BTNS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => setTimeout(saveSettings, 50));
  });


  var resetBtn    = document.getElementById('btnResetSettings');
  var resetPopup  = document.getElementById('resetConfirmPopup');
  var resetConfirm= document.getElementById('btnResetConfirm');
  var resetCancel = document.getElementById('btnResetCancel');

  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (resetPopup) resetPopup.style.display = 'flex';
    });
  }
  if (resetCancel) {
    resetCancel.addEventListener('click', function() {
      if (resetPopup) resetPopup.style.display = 'none';
    });
  }
  if (resetPopup) {
    resetPopup.addEventListener('click', function(e) {
      if (e.target === resetPopup) resetPopup.style.display = 'none';
    });
  }
  if (resetConfirm) {
    resetConfirm.addEventListener('click', function() {
      try {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_KEY + '_extraConsts');
        localStorage.removeItem('sirenosc_fx_startup');
        localStorage.removeItem('sirenosc_intro_seen');
        localStorage.removeItem('sirenosc_posfx_json');
      } catch(e) {}
      if (resetPopup) resetPopup.style.display = 'none';
      location.reload();
    });
  }

  restoreSettings();
  if (typeof window._restoreMotorSim === 'function') window._restoreMotorSim();

  try {
    const extraRaw = localStorage.getItem(LS_KEY + '_extraConsts');
    if (extraRaw) {
      const extraArr = JSON.parse(extraRaw);
      extraArr.forEach(function(saved) {
        const id = saved.id;
        if (CONSTS.includes(id)) return;
        CONSTS.push(id);
        constNodes[id] = {
          enabled: false, osc: null, noise: null, noiseGain: null, gain: null, lpf: null, splitGain: null,
          blowerLink: false, blowerWindState: 'idle', blowerWindAnimId: null, blowerWindStart: null, blowerWindStartFreq: 0
        };
        var list = document.getElementById('constList');
        if (list) list.appendChild(createConstHTML(id));
        wireConst(id);
        var freq  = get('nConst' + id + 'Freq');   if (freq)  { freq.value  = saved.freq;     }
        var wave  = get('dConst' + id + 'Wave');   if (wave)  { wave.value  = saved.wave;     }
        var vol   = get('sConst' + id + 'Vol');    if (vol)   { vol.value   = saved.vol;  get('svConst'+id+'Vol').textContent = saved.vol + '%'; }
        var lpf   = get('sConst' + id + 'Lpf');    if (lpf)   { lpf.value   = saved.lpf;  get('svConst'+id+'Lpf').textContent = saved.lpf + '%'; }
        var harm  = get('nConst' + id + 'Harmonic'); if (harm) harm.value   = saved.harmonic;
        var rpmLk = get('tConst' + id + 'RpmLink'); if (rpmLk && saved.rpmLink) { rpmLk.checked = true; rpmLk.dispatchEvent(new Event('change')); }
        var bLink = get('tConst' + id + 'BlowerLink'); if (bLink && saved.blowerLink) { bLink.checked = true; bLink.dispatchEvent(new Event('change')); }
        var fadeIn = get('nConst' + id + 'FadeInRPM'); if (fadeIn) fadeIn.value = saved.fadeInRPM;
        var cutoff = get('nConst' + id + 'CutoffRPM'); if (cutoff) cutoff.value = saved.cutoffRPM;
        var cPos = get('dConst' + id + 'Pos'); if (cPos && saved.pos) cPos.value = saved.pos;
        var cDb = get('nConst' + id + 'Db10'); if (cDb) { if (isFinite(saved.db10)) cDb.value = saved.db10; else if (isFinite(saved.db)) cDb.value = saved.db + 20; }
        var cOff = get('nConst' + id + 'Off'); if (cOff && isFinite(saved.off)) cOff.value = saved.off;
        var cSteep = get('nConst' + id + 'Steep'); if (cSteep && isFinite(saved.steep)) cSteep.value = saved.steep;
        var lpfOnEl = get('tConst' + id + 'LpfOn'); if (lpfOnEl) lpfOnEl.checked = (saved.lpfOn !== false);
        if (saved.enabled) {
          var btn = get('btnConst' + id + 'Enable');
          if (btn) btn.click();
        }
      });
    }
  } catch(e) {}

  applyConfig();
  applyDamperModeUI();
  var _sb = document.getElementById('seqBox'); if (_sb) _sb.classList.add('show');
  if (typeof updateDamperSubsectionOverlay === 'function') updateDamperSubsectionOverlay();
  (function() {
    var db  = document.getElementById('btnDamperHardDisable');
    var dbd = document.getElementById('damperBody');
    var sab = document.getElementById('seqActiveBadge');
    if (db)  { db.textContent = damperUserOn ? 'DISABLE' : 'ENABLE'; db.className = damperUserOn ? 'vbtn btn-accent' : 'vbtn btn-gray'; }
    if (dbd) { dbd.classList.toggle('disabled-overlay', !damperUserOn); }
    if (sab) { sab.style.display = damperEnabled ? '' : 'none'; }
    var dsw = document.getElementById('damperSubsectionWrap');
    if (dsw) { dsw.classList.toggle('damper-sub-disabled', !damperUserOn); }
  })();

  try {
    const FX_STARTUP_KEY = 'sirenosc_fx_startup';
    const btnActiveMap = {
      btnReverbEnable:    'reverb',
      btnReverb2Enable:   'reverb2',
      btnReverb3Enable:   'reverb3',
      btnSlpfEnable:      'slpf',
      btnHpfEnable:       'hpf',
      btnDistEnable:      'dist',
      btnBlowerEnable:    'blower'
    };
    const startSnap = {};
    Object.keys(btnActiveMap).forEach(id => {
      const el = document.getElementById(id);
      startSnap[btnActiveMap[id]] = el
        ? (el.classList.contains('active') || el.textContent.trim() === 'ENABLED' || el.textContent.trim() === 'DISABLE')
        : false;
    });
    localStorage.setItem(FX_STARTUP_KEY, JSON.stringify(startSnap));
  } catch(e) {}
})();


