
(function(){
  function updateBackdrop() {
    var bd = document.getElementById('popupBackdrop');
    if (!bd) return;
    var overlays = document.querySelectorAll('.popup-overlay');
    var anyVisible = false;
    for (var i = 0; i < overlays.length; i++) {
      var el = overlays[i];
      var computed = window.getComputedStyle(el).display;
      if (computed !== 'none') { anyVisible = true; break; }
    }
    bd.style.display = anyVisible ? 'block' : 'none';
  }
  document.addEventListener('DOMContentLoaded', function() {
    var obs = new MutationObserver(updateBackdrop);
    document.querySelectorAll('.popup-overlay').forEach(function(el) {
      obs.observe(el, { attributes: true, attributeFilter: ['style'] });
    });
    updateBackdrop();
  });
  window._updatePopupBackdrop = updateBackdrop;
})();
