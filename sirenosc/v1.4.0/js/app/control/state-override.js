var _stateOverrideConfig = {
  idle:   { override: true,  defaultOn: true,  delayMs: 0 },
  up:     { override: false, defaultOn: false,  delayMs: 0 },
  steady: { override: false, defaultOn: false,  delayMs: 0 },
  down:   { override: true,  defaultOn: true,  delayMs: 0 }
};

var _stateOverrideApplied = null;
var _stateOverrideTimer = null;

function _applyAllGroupsVolume(allOn) {
  if (!audioCtx) return;
  var v = getV();
  var dual = v.chopper !== 'single';
  var now = audioCtx.currentTime;
  var r = 0.03;
  function applyKey(key, base) {
    var g = oscGroupAssign[key] || 0;
    var vol    = (seqGroupVol[g]    !== undefined ? seqGroupVol[g]    : 100) / 100;
    var offVol = (seqGroupVolOff[g] !== undefined ? seqGroupVolOff[g] : 10)  / 100;
    var mul = allOn ? vol : offVol;
    var gn = gainNodes[key];
    if (gn) gn.gain.setTargetAtTime((permOscEnabled[key] ? base : 0) * mul, now, r);
  }
  applyKey('hp', v.sHP * 0.18);
  applyKey('hv', v.sHV * 0.18);
  applyKey('lp', dual ? v.sLP * 0.18 : 0);
  applyKey('lv', dual ? v.sLV * 0.18 : 0);
  applyKey('ut', dual ? v.sUT * 0.18 : 0);
  applyKey('ot', dual ? v.sOT * 0.18 : 0);
  extraOscs.forEach(function(eo) {
    if (!eo.gainNode) return;
    var g = eo.seqGroup || 0;
    var vol    = (seqGroupVol[g]    !== undefined ? seqGroupVol[g]    : 100) / 100;
    var offVol = (seqGroupVolOff[g] !== undefined ? seqGroupVolOff[g] : 10)  / 100;
    var mul = allOn ? vol : offVol;
    var base = (eo.mixerVal ?? 50) / 100 * 0.18;
    var mute = isEoDisabled(eo);
    eo.gainNode.gain.setTargetAtTime(mute ? 0 : base * mul, now, r);
  });
  var arr = [];
  for (var i = 0; i < seqNumGroups; i++) arr.push(allOn);
  setGroupIndicators(arr);
  if(typeof window._daUpdate === 'function') window._daUpdate();
}

function _clearStateOverride() {
  _stateOverrideApplied = null;
}

function onStateOverrideTransition(newDir) {
  if (_stateOverrideTimer) { clearTimeout(_stateOverrideTimer); _stateOverrideTimer = null; }
  if (!damperEnabled || damperCtlMode) { _clearStateOverride(); return; }
  var cfg = _stateOverrideConfig[newDir];
  if (!cfg || !cfg.override) {
    _clearStateOverride();
    return;
  }
  var delay = cfg.delayMs || 0;
  function applyNow() {
    _stateOverrideApplied = cfg.defaultOn ? 'on' : 'off';
    _applyAllGroupsVolume(cfg.defaultOn);
  }
  if (delay <= 0) {
    applyNow();
  } else {
    _stateOverrideTimer = setTimeout(function() {
      _stateOverrideTimer = null;
      if (windDirection === newDir) {
        applyNow();
      }
    }, delay);
  }
}

(function() {
  var states = [
    { state: 'idle',   overrideId: 'soIdleOverride',     defaultId: 'soIdleDefault',     delayId: 'soIdleDelay'     },
    { state: 'up',     overrideId: 'soWindUpOverride',   defaultId: 'soWindUpDefault',   delayId: 'soWindUpDelay'   },
    { state: 'steady', overrideId: 'soSteadyOverride',   defaultId: 'soSteadyDefault',   delayId: 'soSteadyDelay'   },
    { state: 'down',   overrideId: 'soWindDownOverride', defaultId: 'soWindDownDefault', delayId: 'soWindDownDelay' }
  ];

  states.forEach(function(s) {
    var overrideBtn = get(s.overrideId);
    var defaultBtn  = get(s.defaultId);
    var delayInput  = get(s.delayId);
    if (!overrideBtn || !defaultBtn || !delayInput) return;

    function syncOverrideBtn() {
      var on = _stateOverrideConfig[s.state].override;
      overrideBtn.textContent = on ? 'ON' : 'OFF';
      overrideBtn.className = on ? 'vbtn btn-accent' : 'vbtn btn-gray';
      defaultBtn.style.opacity = on ? '' : '0.4';
      delayInput.style.opacity = on ? '' : '0.4';
    }
    function syncDefaultBtn() {
      var on = _stateOverrideConfig[s.state].defaultOn;
      defaultBtn.textContent = on ? 'ON' : 'OFF';
      defaultBtn.className = on ? 'vbtn btn-accent' : 'vbtn btn-gray';
    }

    overrideBtn.addEventListener('click', function() {
      _stateOverrideConfig[s.state].override = !_stateOverrideConfig[s.state].override;
      syncOverrideBtn();
      if (windDirection === s.state) onStateOverrideTransition(windDirection);
    });

    defaultBtn.addEventListener('click', function() {
      _stateOverrideConfig[s.state].defaultOn = !_stateOverrideConfig[s.state].defaultOn;
      syncDefaultBtn();
      if (_stateOverrideApplied !== null && windDirection === s.state && _stateOverrideConfig[s.state].override) {
        _applyAllGroupsVolume(_stateOverrideConfig[s.state].defaultOn);
        _stateOverrideApplied = _stateOverrideConfig[s.state].defaultOn ? 'on' : 'off';
      }
    });

    delayInput.addEventListener('change', function() {
      _stateOverrideConfig[s.state].delayMs = parseInt(delayInput.value) || 0;
    });

    syncOverrideBtn();
    syncDefaultBtn();
  });
})();
