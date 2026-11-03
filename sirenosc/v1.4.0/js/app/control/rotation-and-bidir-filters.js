
function getRotWetFraction() {
  const peakWet = (parseFloat(get('nRotPeakWet').value) || 100) / 100;
  const isBidir = (spatialFxMode === 'rotationalBidir' || spatialFxMode === 'directionalBidir');
  if (isBidir) {
    const raw = (1 - Math.cos(2 * rotAngleDeg * Math.PI / 180)) / 2;
    return raw * peakWet;
  }
  const raw = (1 - Math.cos(rotAngleDeg * Math.PI / 180)) / 2;
  return raw * peakWet;
}

function applyRotMix() {
  if (!rotationEnabled || !audioCtx) return;
  const wet = getRotWetFraction();
  const now = audioCtx.currentTime;
  applyUserPan();
  const mixSlider = get('sDirectionMix');
  const mixLabel  = get('svDirectionMix');
  if (mixSlider) mixSlider.value = Math.round(wet * 100);
  if (mixLabel)  mixLabel.textContent = Math.round(wet * 100) + '%';
  applyBidirOscVolumes(wet);
}

function applyUserPan() {
  if (!audioCtx || !directionEnabled || !directionCenterSrc) return;
  const mode = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni';
  const isDirectionalPattern = (mode === 'directional' || mode === 'rotational');
  const panStrength = (isFinite(parseFloat((get('sDirPanStrength')||{}).value)) ? parseFloat(get('sDirPanStrength').value) : 100) / 100;
  const heading = getUserHeadingDeg();
  const userAngle = (typeof getUserAngleDeg === 'function') ? (getUserAngleDeg() || 0) : 0;
  const facing = (typeof rotAngleDeg === 'number' && isFinite(rotAngleDeg)) ? rotAngleDeg : 0, R = Math.PI / 180;
  const facingPan = isDirectionalPattern ? Math.sin((facing - (heading + 180)) * R) : 0;
  const posPan = Math.sin((userAngle + 180 - heading) * R);
  const centerPan = -Math.max(-1, Math.min(1, facingPan + posPan)) * panStrength;
  directionCenterSrc.offset.setTargetAtTime(isFinite(centerPan) ? centerPan : 0, audioCtx.currentTime, 0.01);
}

function applyBidirOscVolumes(wet) {
  const isBidir = (spatialFxMode === 'rotationalBidir' || spatialFxMode === 'directionalBidir');
  if (!isBidir || !audioCtx) return;
  const peakWet = (parseFloat(get('nRotPeakWet').value) || 100) / 100;
  const angleRad = rotAngleDeg * Math.PI / 180;
  const floor = 1 - peakWet;
  const mid = (1 + floor) / 2;
  const amp = mid - floor;
  const side1Open = mid + amp * Math.cos(angleRad);
  const side2Open = mid - amp * Math.cos(angleRad);

  const s1pct = document.getElementById('bidirSide1Pct');
  const s2pct = document.getElementById('bidirSide2Pct');
  const s1bar = document.getElementById('bidirSide1Bar');
  const s2bar = document.getElementById('bidirSide2Bar');
  const p1 = Math.round(side1Open * 100);
  const p2 = Math.round(side2Open * 100);
  if (s1pct) s1pct.textContent = p1 + '%';
  if (s2pct) s2pct.textContent = p2 + '%';
  if (s1bar) s1bar.style.width = p1 + '%';
  if (s2bar) s2bar.style.width = p2 + '%';

  pushGains(0.012);
}

function syncMinVolUIFromPeakWet() {
  const peakWetEl = get('nRotPeakWet');
  const peakWet = peakWetEl ? (parseFloat(peakWetEl.value) || 0) : 0;
  const minVol = Math.max(0, Math.min(100, 100 - peakWet));
  const sMinVol = get('sBidirMinVol');
  const nMinVol = get('nBidirMinVol');
  if (sMinVol) sMinVol.value = minVol;
  if (nMinVol) nMinVol.value = minVol;
}
function applyMinVolFromUI(minVol) {
  minVol = Math.max(0, Math.min(100, parseFloat(minVol) || 0));
  const sMinVol = get('sBidirMinVol');
  const nMinVol = get('nBidirMinVol');
  if (sMinVol) sMinVol.value = minVol;
  if (nMinVol) nMinVol.value = minVol;
  const peakWetEl = get('nRotPeakWet');
  if (peakWetEl) peakWetEl.value = 100 - minVol;

  if (typeof applyRotMix === 'function') applyRotMix();
  if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
}
(function wireBidirMinVolSlider(){
  const sMinVol = get('sBidirMinVol');
  const nMinVol = get('nBidirMinVol');
  if (sMinVol) sMinVol.addEventListener('input', function(){ applyMinVolFromUI(this.value); });
  if (nMinVol) nMinVol.addEventListener('input', function(){ applyMinVolFromUI(this.value); });
  syncMinVolUIFromPeakWet();
})();

(function wireBidirFilterRangeInputs(){
  const ids = ['nBidirFilterFloorHz','nBidirFilterOpenHz','nBidirFilterQ'];
  ids.forEach(function(id){
    const el = get(id);
    if (!el) return;
    el.addEventListener('input', function(){
      if (typeof applyBidirFilters === 'function') applyBidirFilters(0.03);
      if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
    });
  });
})();

function updateRotUI() {
  const wet = getRotWetFraction();
  const wetPct = Math.round(wet * 100);
  const readout = get('rotMixReadout');
  const bar = get('rotMixBar');
  if (bar) bar.style.width = wetPct + '%';
  if (readout) { readout.textContent = wetPct + '%'; readout.style.color = 'var(--accent2)'; }
  const g = get('rotDiagramG');
  if (g) g.setAttribute('transform', 'rotate(' + rotAngleDeg.toFixed(1) + ',44,44)');
  const rpmTxt = get('rotRpmTxt');
  if (rpmTxt) rpmTxt.textContent = (spatialFxMode === 'directional') ? Math.round(rotAngleDeg) + '°' : Math.round(rotRPM) + ' RPM';
}

let _rotTestHeld      = false;

let _rotOscDir        = 1;
let _rotOscPauseLeft  = 0;
let _rotOscTarget     = null;
let _rotOscLegStart   = 0;
let _rotOscLegSpan    = 0;

function _rotRampTick(ts, target) {
  if (_rotRampTarget === null || target !== _rotRampTarget) {
    _rotRampTarget    = target;
    _rotRampStartRPM  = _rotRampRPM;
    _rotRampStartTime = null;
  }
  if (_rotRampStartTime === null) _rotRampStartTime = ts;

  const windingUp = target > _rotRampStartRPM;
  const fn     = windingUp ? get('dRotWindUpFn').value     : get('dRotWindDownFn').value;
  const _om    = getOffsetMultiplier();
  const offset = windingUp ? (parseFloat(get('nRotWindUp').value)   || 3) * _om :
                              (parseFloat(get('nRotWindDown').value) || 5) * _om;
  const easing = windingUp ? get('dRotWindUpEasing').value : get('dRotWindDownEasing').value;

  const elapsed = (ts - _rotRampStartTime) / 1000;
  const t = Math.min(1, elapsed / offset);
  _rotRampRPM = _rotRampStartRPM + (target - _rotRampStartRPM) * applyFn(fn, t, easing);
  if (t >= 1) _rotRampRPM = target;
  return _rotRampRPM;
}

function tickRotation(ts) {
  if (!rotationEnabled) { rotAnimId = null; return; }
  const dt = rotAnimLastTs === null ? 0 : Math.min((ts - rotAnimLastTs) / 1000, 0.1);
  rotAnimLastTs = ts;

  const maxRot = parseFloat(get('nRotMaxRPM').value) || 60;
  let baseRPM = 0;
  if (rotMode === 'linked') {
    const peakChopper = (parseFloat(get('eRPM').value) || 3600);
    baseRPM = peakChopper > 0 ? Math.max(0, Math.min(1, currentRPM / peakChopper)) * maxRot : 0;
  } else if (rotMode === 'unlinked') {
    const _ceRot = (typeof window._ceRotatorState === 'function') ? window._ceRotatorState() : null;
    baseRPM = _rotRampTick(ts, (_ceRot && _ceRot.on) ? maxRot : 0);
  } else {
    baseRPM = _rotRampTick(ts, _rotTestHeld ? maxRot : 0);
  }

  if (!isFinite(baseRPM)) baseRPM = 0;
  if (!isFinite(rotAngleDeg)) rotAngleDeg = 0;

  const oscillate = get('tRotOscillate') && get('tRotOscillate').checked;
  if (oscillate && baseRPM > 0) {
    const farthest = Math.max(2, parseFloat(get('nRotOscAngle').value) || 180);
    const half     = farthest / 2;
    const pause    = Math.max(0, parseFloat(get('nRotOscPause').value) || 0);
    const sine     = get('tRotOscSine') && get('tRotOscSine').checked;

    if (_rotOscTarget === null) {
      rotAngleDeg    = 0;
      _rotOscDir     = 1;
      _rotOscTarget  = half;
      _rotOscLegStart = 0;
      _rotOscLegSpan  = half;
    }

    if (_rotOscPauseLeft > 0) {
      _rotOscPauseLeft -= dt;
      rotRPM = 0;
    } else {
      let speedMult = 1;
      if (sine && _rotOscLegSpan > 0) {
        const traveled = Math.min(_rotOscLegSpan, Math.abs(rotAngleDeg - _rotOscLegStart));
        const progress = traveled / _rotOscLegSpan;
        speedMult = Math.max(0.05, Math.sin(Math.PI * progress));
      }

      const delta = baseRPM * speedMult / 60 * 360 * dt;
      rotAngleDeg += _rotOscDir * delta;
      rotRPM = baseRPM * speedMult;

      if ((_rotOscDir > 0 && rotAngleDeg >= _rotOscTarget) ||
          (_rotOscDir < 0 && rotAngleDeg <= _rotOscTarget)) {
        rotAngleDeg      = _rotOscTarget;
        _rotOscPauseLeft = pause;
        _rotOscDir      = -_rotOscDir;
        _rotOscLegStart = rotAngleDeg;
        _rotOscLegSpan  = farthest;
        _rotOscTarget   = rotAngleDeg + _rotOscDir * farthest;
      }
    }
  } else {
    rotRPM = baseRPM;
    rotAngleDeg = (rotAngleDeg + rotRPM / 60 * 360 * dt) % 360;
  }

  applyRotMix();
  updateRotUI();
  if (typeof window._cwCheckCrossing === 'function') window._cwCheckCrossing(rotAngleDeg);
  if (typeof posRecalc === 'function') posRecalc();
  rotAnimId = requestAnimationFrame(tickRotation);
}

function startRotAnim() {
  if (rotAnimId) return;
  rotAnimLastTs = null;
  rotAnimId = requestAnimationFrame(tickRotation);
}

function stopRotAnim() {
  if (rotAnimId) { cancelAnimationFrame(rotAnimId); rotAnimId = null; }
  _rotOscDir = 1; _rotOscPauseLeft = 0; _rotOscTarget = null; _rotOscLegStart = 0; _rotOscLegSpan = 0;
  _rotRampRPM = 0; _rotRampTarget = null; _rotRampStartRPM = 0; _rotRampStartTime = null;
}

function _applyRotMode(mode) {
  rotMode = mode;
  rotLinkedToChopper = (mode === 'linked');
  _rotTestHeld = false;
  _rotRampRPM = 0; _rotRampTarget = null; _rotRampStartRPM = 0; _rotRampStartTime = null;

  const btn = get('btnRotMode');
  const ucUnlinked = get('rotUnlinkedControls');
  const ucManual   = get('rotManualControls');
  const ucWind     = get('rotWindControls');

  if (mode === 'linked') {
    if (btn) { btn.textContent = 'LINKED'; btn.className = 'vbtn btn-accent'; btn.style.cssText = 'width:100%;font-size:10px;letter-spacing:0.5px'; }
    if (ucUnlinked) ucUnlinked.style.display = 'none';
    if (ucManual)   ucManual.style.display   = 'none';
    if (ucWind)     ucWind.style.display     = 'none';
  } else if (mode === 'unlinked') {
    if (btn) { btn.textContent = 'UNLINKED'; btn.className = 'vbtn btn-yellow'; btn.style.cssText = 'width:100%;font-size:10px;letter-spacing:0.5px'; }
    if (ucUnlinked) ucUnlinked.style.display = 'flex';
    if (ucManual)   ucManual.style.display   = 'none';
    if (ucWind)     ucWind.style.display     = 'flex';
  } else {
    if (btn) { btn.textContent = 'MANUAL'; btn.className = 'vbtn btn-blue'; btn.style.cssText = 'width:100%;font-size:10px;letter-spacing:0.5px'; }
    if (ucUnlinked) ucUnlinked.style.display = 'none';
    if (ucManual)   ucManual.style.display   = 'flex';
    if (ucWind)     ucWind.style.display     = 'flex';
  }
}

get('btnRotMode').addEventListener('click', () => {
  const next = rotMode === 'linked' ? 'unlinked' : rotMode === 'unlinked' ? 'manual' : 'linked';
  _applyRotMode(next);
});

(function() {
  const btn = get('btnRotTest');
  function startTest(e) { e.preventDefault(); _rotTestHeld = true; }
  function stopTest(e)  { e.preventDefault(); _rotTestHeld = false; }
  btn.addEventListener('mousedown',  startTest);
  btn.addEventListener('mouseup',    stopTest);
  btn.addEventListener('mouseleave', stopTest);
  btn.addEventListener('touchstart', startTest, {passive:false});
  btn.addEventListener('touchend',   stopTest,  {passive:false});
  btn.addEventListener('touchcancel',stopTest,  {passive:false});
})();

_applyRotMode('linked');

get('tRotOscillate').addEventListener('change', function() {
  const fields = get('rotOscFields');
  if (fields) {
    fields.classList.toggle('disabled-overlay', !this.checked);
    fields.style.pointerEvents = this.checked ? '' : 'none';
  }
  if (!this.checked) { _rotOscDir = 1; _rotOscPauseLeft = 0; _rotOscTarget = null; _rotOscLegStart = 0; _rotOscLegSpan = 0; rotAngleDeg = 0; }
});

updateRotUI();

(function() {
  function applyDirAngle(deg) {
    deg = Math.max(0, Math.min(360, Math.round(deg)));
    rotAngleDeg = deg;
    const sl = get('sRotDirAngle'); if (sl) sl.value = deg;
    const nm = get('nRotDirAngle'); if (nm) nm.value = deg;
    applyRotMix();
    updateRotUI();
    if (typeof posRecalc === 'function') posRecalc();
  }
  const sl = get('sRotDirAngle');
  const nm = get('nRotDirAngle');
  if (sl) sl.addEventListener('input', function() { applyDirAngle(parseFloat(this.value)); });
  if (nm) nm.addEventListener('input', function() { applyDirAngle(parseFloat(this.value) || 0); });
})();

