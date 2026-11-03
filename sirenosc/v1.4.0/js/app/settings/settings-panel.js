(function(){
  var SP_KEY = 'sirenosc_ui_settings';
  var panel  = document.getElementById('settingsPanel');
  var floatBtn = document.getElementById('settingsFloatBtn');

  function loadUiSettings() {
    try { return JSON.parse(localStorage.getItem(SP_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveUiSettings(obj) {
    try { localStorage.setItem(SP_KEY, JSON.stringify(obj)); } catch(e) {}
  }

  floatBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    if (!panel.contains(e.target) && e.target !== floatBtn) {
      panel.classList.remove('open');
    }
  });
  panel.addEventListener('click', function(e) { e.stopPropagation(); });

  (function syncVer() {
    var hv = document.getElementById('headerVersion');
    var sv = document.getElementById('spVersion');
    if (hv && sv && hv.textContent) { sv.textContent = hv.textContent; }
    else { setTimeout(syncVer, 120); }
  })();

  var startupSwitch = document.getElementById('spStartupPopups');
  startupSwitch.addEventListener('change', function() {
    var s = loadUiSettings();
    s.startupPopups = startupSwitch.checked;
    saveUiSettings(s);
  });

  var audioTipSwitch = document.getElementById('spAudioTipPopup');
  var AUDIO_TIP_KEY = 'sirenosc_audio_tip_enabled';
  audioTipSwitch.addEventListener('change', function() {
    var s = loadUiSettings();
    s.audioTipPopup = audioTipSwitch.checked;
    saveUiSettings(s);
    try { localStorage.setItem(AUDIO_TIP_KEY, audioTipSwitch.checked ? '1' : '0'); } catch(e) {}
  });

  var updateNoticeSwitch = document.getElementById('spUpdateNotice');
  var LS_UPDATE_140 = 'sirenosc_update_140_seen';
  updateNoticeSwitch.addEventListener('change', function() {
    var s = loadUiSettings();
    s.updateNotice140 = updateNoticeSwitch.checked;
    saveUiSettings(s);
    if (updateNoticeSwitch.checked) {
      try { localStorage.removeItem(LS_UPDATE_140); } catch(e) {}
    } else {
      try { localStorage.setItem(LS_UPDATE_140, '1'); } catch(e) {}
    }
  });

  var resetSugSwitch = document.getElementById('spResetSuggestion');
  var LS_RESET_SUG_140 = 'sirenosc_reset_sug_140_seen';
  resetSugSwitch.addEventListener('change', function() {
    var s = loadUiSettings();
    s.resetSuggestion140 = resetSugSwitch.checked;
    saveUiSettings(s);
    if (resetSugSwitch.checked) {
      try { localStorage.removeItem(LS_RESET_SUG_140); } catch(e) {}
    } else {
      try { localStorage.setItem(LS_RESET_SUG_140, '1'); } catch(e) {}
    }
  });

  var fxSwitch = document.getElementById('spEffectsToggle');
  function syncFxSwitch() {
    if (typeof _fxDisabled !== 'undefined') {
      fxSwitch.checked = !_fxDisabled;
    }
  }
  fxSwitch.addEventListener('change', function() {
    if (fxSwitch.checked) {
      if (typeof restoreAllEffects === 'function') restoreAllEffects();
    } else {
      if (typeof disableAllEffects === 'function') disableAllEffects();
    }
    var s = loadUiSettings();
    s.effectsEnabled = fxSwitch.checked;
    saveUiSettings(s);
  });

  var mainFxBtn = document.getElementById('btnDisableAllFx');
  if (mainFxBtn) {
    mainFxBtn.addEventListener('click', function() {
      setTimeout(syncFxSwitch, 60);
    });
  }

  var spRM = document.getElementById('spRecordMode');
  if (spRM) {
    spRM.addEventListener('click', function() {
      var btn = document.getElementById('btnRecordMode');
      if (btn) btn.click();
    });
  }

  var SCALE_STEPS = [70, 80, 90, 100, 110, 120, 130, 140, 150];
  var DEFAULT_SCALE_IDX = 3;
  var scaleDecBtn = document.getElementById('spScaleDec');
  var scaleIncBtn = document.getElementById('spScaleInc');
  var scaleValEl  = document.getElementById('spScaleVal');
  var currentScaleIdx = DEFAULT_SCALE_IDX;

  function applyScale(idx) {
    currentScaleIdx = Math.max(0, Math.min(SCALE_STEPS.length - 1, idx));
    var pct = SCALE_STEPS[currentScaleIdx];
    if (window._applyUiZoom) window._applyUiZoom(pct); else document.body.style.zoom = (pct / 100).toFixed(2);
    if (scaleValEl) scaleValEl.textContent = pct + '%';
    if (scaleDecBtn) scaleDecBtn.disabled = (currentScaleIdx === 0);
    if (scaleIncBtn) scaleIncBtn.disabled = (currentScaleIdx === SCALE_STEPS.length - 1);
  }

  (function(){
    var bF=document.getElementById('spStyleFlat'), bG=document.getElementById('spStyleGlossy'); if(!bF||!bG||!window._setUiStyle) return;
    window._setUiStyle(document.documentElement.classList.contains('glossy'),true);
    bF.addEventListener('click',function(){ window._setUiStyle(false); }); bG.addEventListener('click',function(){ window._setUiStyle(true); });
  })();

  var autoScaleSw = document.getElementById('spAutoScale');
  if (autoScaleSw) {
    autoScaleSw.checked = !(window._uiAutoScale && !window._uiAutoScale.isAuto());
    autoScaleSw.addEventListener('change', function() {
      var s3 = loadUiSettings(); s3.uiScaleAuto = autoScaleSw.checked; saveUiSettings(s3);
      if (window._applyUiZoom) window._applyUiZoom();
    });
  }
  if (scaleDecBtn) scaleDecBtn.addEventListener('click', function() {
    var s2 = loadUiSettings();
    s2.uiScaleIdx = currentScaleIdx - 1;
    saveUiSettings(s2);
    applyScale(currentScaleIdx - 1);
  });
  if (scaleIncBtn) scaleIncBtn.addEventListener('click', function() {
    var s2 = loadUiSettings();
    s2.uiScaleIdx = currentScaleIdx + 1;
    saveUiSettings(s2);
    applyScale(currentScaleIdx + 1);
  });

  var s = loadUiSettings();

  var savedScaleIdx = (s.uiScaleIdx != null) ? s.uiScaleIdx : DEFAULT_SCALE_IDX;
  applyScale(savedScaleIdx);

  if (s.startupPopups === false) {
    startupSwitch.checked = false;
  } else {
    startupSwitch.checked = true;
  }

  if (s.audioTipPopup === false) {
    audioTipSwitch.checked = false;
    try { localStorage.setItem(AUDIO_TIP_KEY, '0'); } catch(e) {}
  } else {
    audioTipSwitch.checked = true;
    try { localStorage.setItem(AUDIO_TIP_KEY, '1'); } catch(e) {}
  }

  updateNoticeSwitch.checked = (s.updateNotice140 !== false);
  resetSugSwitch.checked     = (s.resetSuggestion140 !== false);

  setTimeout(syncFxSwitch, 500);

})();
