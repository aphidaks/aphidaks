
(function(){
  var isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && !/Windows NT/i.test(navigator.userAgent));

  try {
    var _uiS = JSON.parse(localStorage.getItem('sirenosc_ui_settings') || '{}');
    if (_uiS.startupPopups === false) {
      setTimeout(function() {
        if (typeof window._showDeferredPopups === 'function') window._showDeferredPopups();
      }, 0);
      return;
    }
  } catch(e) {}

  var _ip = document.getElementById('introPopup');
  if (_ip) { _ip.style.display = 'flex'; _ip.style.alignItems = 'center'; _ip.style.justifyContent = 'center'; }
  if (window._updatePopupBackdrop) window._updatePopupBackdrop();

  var recYes = document.getElementById('popupRecommendYes');
  var recNo  = document.getElementById('popupRecommendNo');
  var btnYes = document.getElementById('popupYes');
  var btnNo  = document.getElementById('popupNo');
  if (!isMobile) {
    recYes.textContent = '(recommended for your device)';
    btnNo.classList.remove('yn-active');
  } else {
    recNo.textContent = '(recommended for your device)';
    btnYes.classList.remove('yn-active');
  }

  document.getElementById('popupYes').addEventListener('click', function(){
    document.getElementById('introPopup').style.display = 'none';
    if (typeof window._showDeferredPopups === 'function') window._showDeferredPopups();
  });
  document.getElementById('popupNo').addEventListener('click', function(){
    if(typeof disableAllEffects === 'function') disableAllEffects();
    document.getElementById('introPopup').style.display = 'none';
    if (typeof window._showDeferredPopups === 'function') window._showDeferredPopups();
  });
})();
