(function(){
  var audioTipTimer = null;
  var audioTipShown = false;
  var tipOpenedWhileTestHeld = false;

  function isTestHeld() { return false; }

  function showAudioTipPopup() {
    if (audioTipShown) return;
    try {
      if (localStorage.getItem('sirenosc_audio_tip_enabled') === '0') return;
    } catch(e) {}
    var overlay = document.getElementById('audioTipPopup');
    if (!overlay) return;
    audioTipShown = true;
    tipOpenedWhileTestHeld = isTestHeld();
    overlay.style.display = 'flex';
  }

  function hideAudioTipPopup() {
    var overlay = document.getElementById('audioTipPopup');
    if (!overlay) return;
    overlay.style.display = 'none';
    if (tipOpenedWhileTestHeld) {
      tipOpenedWhileTestHeld = false;
      setTimeout(function() {
      }, 1000);
    }
  }

  function scheduleAudioTip() {
    if (audioTipShown) return;
    if (audioTipTimer) clearTimeout(audioTipTimer);
    audioTipTimer = setTimeout(showAudioTipPopup, 2000);
  }

  window._scheduleAudioTip = scheduleAudioTip;

  document.getElementById('audioTipTurnOffFx').addEventListener('click', function() {
    disableAllEffects();
    hideAudioTipPopup();
  });

  document.getElementById('audioTipLowerVol').addEventListener('click', function() {
    var slider = document.getElementById('sMasterVol');
    var valEl  = document.getElementById('svMasterVol');
    if (slider) {
      var cur = parseInt(slider.value, 10);
      var next = Math.max(10, cur - 25);
      slider.value = next;
      if (valEl) valEl.textContent = next + '%';
      slider.dispatchEvent(new Event('input'));
    }
    hideAudioTipPopup();
  });

  document.getElementById('audioTipNo').addEventListener('click', hideAudioTipPopup);

  document.getElementById('dontShowAudioTip').addEventListener('change', function() {
    if (this.checked) {
      try { localStorage.setItem('sirenosc_audio_tip_enabled', '0'); } catch(e) {}
      var spToggle = document.getElementById('spAudioTipPopup');
      if (spToggle) spToggle.checked = false;
    }
  });

  document.getElementById('audioTipPopup').addEventListener('click', function(e) {
    if (e.target === this) hideAudioTipPopup();
  });
})();

function reconnectConsts() {
  CONSTS.forEach(id => {
    const c = constNodes[id];
    if (!c.enabled || !c.lpf) return;
    try { c.lpf.disconnect(); } catch(e) {}
    const dest = fxChainOut ? fxChainOut : audioCtx.destination;
    c.lpf.connect(dest);
    c.dest = dest;
  });
}

wireConst('A');
wireConst('B');


const _origUpdateFilterCutoff = updateFilterCutoff;
updateFilterCutoff = function() {
  _origUpdateFilterCutoff();
  reconnectConsts();
  updateAllConstLpfs();
};

