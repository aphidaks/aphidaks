
(function(){
  var LS_UPDATE    = 'sirenosc_update_140_seen';
  var LS_RESET_SUG = 'sirenosc_reset_sug_140_seen';
  var SP_KEY       = 'sirenosc_ui_settings';

  var updatePopup   = document.getElementById('updateNoticePopup');
  var resetSugPopup = document.getElementById('resetSuggestionPopup');

  function markSeen(lsKey, settingsKey, visible) {
    try { localStorage.setItem(lsKey, '1'); } catch(e) {}
    try {
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      s[settingsKey] = visible;
      localStorage.setItem(SP_KEY, JSON.stringify(s));
    } catch(e) {}
    var isUpd = settingsKey === 'updateNotice140';
    var spEl = document.getElementById(isUpd ? 'spUpdateNotice' : 'spResetSuggestion');
    if (spEl) spEl.checked = visible;
    var mpEl = document.getElementById(isUpd ? 'mpopUpdateNotice' : 'mpopResetSuggestion');
    if (mpEl) mpEl.checked = visible;
  }

  function shouldShowUpdate() {
    if (!localStorage.getItem(LS_UPDATE)) return true;
    try {
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      return s.updateNotice140 !== false;
    } catch(e) { return true; }
  }

  function shouldShowResetSug() {
    if (!localStorage.getItem(LS_RESET_SUG)) return true;
    try {
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      return s.resetSuggestion140 !== false;
    } catch(e) { return true; }
  }

  window._showDeferredPopups = function() {
    if (shouldShowUpdate()) {
      updatePopup.style.display = 'flex';
      if (typeof window._syncDontShowCheckbox === 'function') window._syncDontShowCheckbox('dontShowUpdate');
    } else if (shouldShowResetSug()) {
      resetSugPopup.style.display = 'flex';
      if (typeof window._syncDontShowCheckbox === 'function') window._syncDontShowCheckbox('dontShowReset');
    } else {
      if (typeof window._applyDontShowIfChecked === 'function') window._applyDontShowIfChecked();
    }
    window._showDeferredPopups = function(){};
  };

  var _introEl = document.getElementById('introPopup');
  var _introVisible = _introEl && _introEl.style.display === 'flex';
  if (!_introVisible) {
    window._showDeferredPopups();
  }

  document.getElementById('btnUpdateNoticeOk').addEventListener('click', function(){
    markSeen(LS_UPDATE, 'updateNotice140', !window._dontShowStartupPopups);
    updatePopup.style.display = 'none';
    if (shouldShowResetSug()) {
      resetSugPopup.style.display = 'flex';
      if (typeof window._syncDontShowCheckbox === 'function') window._syncDontShowCheckbox('dontShowReset');
    } else {
      if (typeof window._applyDontShowIfChecked === 'function') window._applyDontShowIfChecked();
    }
  });

  document.getElementById('btnResetSuggestionReset').addEventListener('click', function(){
    markSeen(LS_RESET_SUG, 'resetSuggestion140', !window._dontShowStartupPopups);
    resetSugPopup.style.display = 'none';
    if (typeof window._applyDontShowIfChecked === 'function') window._applyDontShowIfChecked();
    var btn = document.getElementById('btnResetSettings');
    if (btn) btn.click();
  });
  document.getElementById('btnResetSuggestionCancel').addEventListener('click', function(){
    markSeen(LS_RESET_SUG, 'resetSuggestion140', !window._dontShowStartupPopups);
    resetSugPopup.style.display = 'none';
    if (typeof window._applyDontShowIfChecked === 'function') window._applyDontShowIfChecked();
  });
})();
