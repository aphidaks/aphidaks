
(function(){
  var SP_KEY = 'sirenosc_ui_settings';
  var IDS = ['dontShowSlide2', 'dontShowUpdate', 'dontShowReset'];

  function syncAll(checked) {
    IDS.forEach(function(id) {
      var cb = document.getElementById(id);
      if (cb) cb.checked = checked;
    });
    window._dontShowStartupPopups = checked;
  }

  window._dontShowStartupPopups = false;

  document.addEventListener('change', function(e) {
    var t = e.target;
    if (t && t.id && IDS.indexOf(t.id) !== -1) {
      syncAll(t.checked);
    }
  });

  window._syncDontShowCheckbox = function(id) {
    var cb = document.getElementById(id);
    if (cb) cb.checked = window._dontShowStartupPopups;
  };

  window._applyDontShowIfChecked = function() {
    if (!window._dontShowStartupPopups) return;
    try {
      var s = JSON.parse(localStorage.getItem(SP_KEY) || '{}');
      s.startupPopups      = false;
      s.updateNotice140    = false;
      s.resetSuggestion140 = false;
      localStorage.setItem(SP_KEY, JSON.stringify(s));
    } catch(e) {}
    var spSP = document.getElementById('spStartupPopups');
    if (spSP) spSP.checked = false;
    ['spUpdateNotice','mpopUpdateNotice'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.checked = false;
    });
    ['spResetSuggestion','mpopResetSuggestion'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.checked = false;
    });
  };
})();
