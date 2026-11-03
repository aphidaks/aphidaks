get('btnDistanceEnable').addEventListener('click', () => {
  distanceEnabled = !distanceEnabled;
  const btn = get('btnDistanceEnable');
  btn.textContent = distanceEnabled ? 'ENABLED' : 'ENABLE';
  btn.className = distanceEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
  get('distanceBody').classList.toggle('disabled-overlay', !distanceEnabled);
  if (audioCtx) rebuildFxChain();
});
get('sDistanceRate').addEventListener('input', () => {
  get('svDistanceRate').textContent = get('sDistanceRate').value + 's';
  updateDistDirParams('Distance');
});
get('sDistanceDepth').addEventListener('input', () => {
  get('svDistanceDepth').textContent = get('sDistanceDepth').value + '%';
  updateDistDirParams('Distance');
});
get('sDistanceMix').addEventListener('input', () => { updateDistDirParams('Distance'); });

get('sDistancePreGain').addEventListener('input', () => {
  get('svDistancePreGain').textContent = get('sDistancePreGain').value + '%';
  updateDistDirParams('Distance');
});
get('sDistanceAutoFilterFreq').addEventListener('input', () => {
  get('svDistanceAutoFilterFreq').textContent = get('sDistanceAutoFilterFreq').value + ' Hz';
  updateDistDirParams('Distance');
});
get('nDistanceRevDist').addEventListener('input', () => { if (typeof posRecalc === 'function') posRecalc(); });
get('nDistanceDb100').addEventListener('input', () => { if (typeof posRecalc === 'function') posRecalc(); });
get('sDispersionRate').addEventListener('input', () => {
  const v = parseFloat(get('sDispersionRate').value) || 0;
  get('svDispersionRate').textContent = (v > 0 ? '+' : '') + v;
  if (typeof posRecalc === 'function') posRecalc();
});
get('nMaxDispersion').addEventListener('input', () => { if (typeof updateMidDispersionAuto === 'function') updateMidDispersionAuto(); if (typeof posRecalc === 'function') posRecalc(); });
get('nMinDispersion').addEventListener('input', () => { if (typeof updateMidDispersionAuto === 'function') updateMidDispersionAuto(); if (typeof posRecalc === 'function') posRecalc(); });
get('nMidDispersion').addEventListener('input', () => { if (typeof posRecalc === 'function') posRecalc(); });
get('tMidDispersionAuto').addEventListener('change', () => { if (typeof updateMidDispersionAuto === 'function') updateMidDispersionAuto(); if (typeof posRecalc === 'function') posRecalc(); });
get('nLeftDispersion').addEventListener('input', () => { if (typeof posRecalc === 'function') posRecalc(); });
get('nDispSpan').addEventListener('input', () => { if (typeof posRecalc === 'function') posRecalc(); });

function setSpatialFxMode(mode) {
  spatialFxMode = mode;
  const sel = get('dSpatialFxMode');
  if (sel && sel.value !== mode) sel.value = mode;

  const isRot = (mode === 'rotational' || mode === 'rotationalBidir');
  const isDir = (mode === 'directional' || mode === 'directionalBidir');
  const isBidir = (mode === 'rotationalBidir' || mode === 'directionalBidir');
  const isActive = isRot || isDir;
  const isOmni = (mode === 'omni');

  (function() {
    const dirBtn = get('btnDirectionEnable');
    const dirBody = get('directionBody');
    if (dirBtn) {
      dirBtn.disabled = isOmni;
      dirBtn.style.opacity = isOmni ? '0.35' : '';
      dirBtn.style.cursor = isOmni ? 'default' : '';
      dirBtn.textContent = directionEnabled ? 'ENABLED' : 'ENABLE';
      dirBtn.className = directionEnabled ? 'vbtn btn-accent active' : 'vbtn btn-accent';
    }
    if (dirBody) dirBody.classList.toggle('disabled-overlay', isOmni || !directionEnabled);
  })();

  const block = get('directionRotationBlock');
  const badge = get('directionRotBadge');
  if (block) block.style.display = isActive ? '' : 'none';
  if (badge) {
    badge.style.display = isActive ? '' : 'none';
    badge.textContent = isBidir ? 'Bidir' : (isRot ? 'Rotation' : 'Direction');
  }

  const rotControls  = get('dirRotModeControls');
  const dirAngle     = get('dirAngleControls');
  const maxRpmEntry  = get('dirMaxRpmEntry');
  const typeBtnEntry = get('dirTypeBtnEntry');
  if (rotControls)  rotControls.style.display  = isDir ? 'none' : '';
  if (dirAngle)     dirAngle.style.display      = isDir ? 'flex' : 'none';
  if (maxRpmEntry)  maxRpmEntry.style.display   = isDir ? 'none' : '';
  if (typeBtnEntry) typeBtnEntry.style.display  = isDir ? 'none' : '';

  rotationEnabled = isActive;

  ['Hp','Hv','Lp','Lv','Ut','Ot'].forEach(function(pid){
    const row = document.getElementById('permBidirSideRow'+pid);
    if(row) row.style.display = isBidir ? 'flex' : 'none';
  });
  extraOscs.forEach(function(eo){
    const row = document.getElementById('eoBidirSideRow'+eo.id);
    if(row) row.style.display = isBidir ? 'flex' : 'none';
  });
  const sideVolReadout = document.getElementById('bidirSideVolReadout');
  if (sideVolReadout) sideVolReadout.style.display = isBidir ? 'flex' : 'none';
  const minVolControl = document.getElementById('bidirMinVolControl');
  if (minVolControl) minVolControl.style.display = isBidir ? 'flex' : 'none';
  const filterRangeControl = document.getElementById('bidirFilterRangeControl');
  if (filterRangeControl) filterRangeControl.style.display = isBidir ? 'flex' : 'none';
  if (!isBidir && audioCtx) {
    const _v = getV();
    const _dual = _v.chopper !== 'single';
    const _now = audioCtx.currentTime;
    const _openHz = getBidirLpfOpenHz();
    ['hp','hv','lp','lv','ut','ot'].forEach(function(k){
      if (gainNodes[k] && permOscEnabled[k]) {
        gainNodes[k].gain.setTargetAtTime(computeGain(k, _v, _dual), _now, 0.03);
      }
      if (bidirFilterNodes[k]) {
        bidirFilterNodes[k].frequency.setTargetAtTime(_openHz, _now, 0.03);
      }
    });
    const _isSingle = _v.chopper === 'single';
    extraOscs.forEach(function(eo){
      if (eo.bidirFilterNode) {
        eo.bidirFilterNode.frequency.setTargetAtTime(_openHz, _now, 0.03);
      }
      if (!eo.gainNode) return;
      const isHpVane = eo.type === 'vane' && (eo.linkedChopper === 'hp' || !eo.linkedChopper);
      const mute = isEoDisabled(eo);
      const base = mute ? 0 : (eo.mixerVal ?? 40) / 100 * 0.18;
      eo.gainNode.gain.setTargetAtTime(base, _now, 0.03);
    });
  }

  if (audioCtx) rebuildFxChain();

  const isDirectionalPattern = (mode === 'directional' || mode === 'rotational');
  if (!isDirectionalPattern && directionCenterSrc && audioCtx) {
    const _now = audioCtx.currentTime;
    directionCenterSrc.offset.cancelScheduledValues(_now);
    directionCenterSrc.offset.setValueAtTime(0, _now);
  }

  if (isRot) {
    if (audioCtx) ensureAudio();
    startRotAnim();
  } else if (isDir) {
    stopRotAnim();
    if (audioCtx) { applyRotMix(); updateRotUI(); }
  } else {
    stopRotAnim();
    if (audioCtx) {
      updateRotUI();
      if (directionEnabled && typeof updateDistDirParams === 'function') updateDistDirParams('Direction');
    }
  }
  if (typeof posRecalc === 'function') posRecalc();
}

function updateBidirAvailability() {
  const sel = get('dSpatialFxMode');
  if (!sel) return;
  const chopperMode = get('dChopper').value;
  const bidirAllowed = chopperMode === 'dblchopper';
  const dirBidirOpt = sel.querySelector('option[value="directionalBidir"]');
  const rotBidirOpt = sel.querySelector('option[value="rotationalBidir"]');
  [dirBidirOpt, rotBidirOpt].forEach(opt => { if (opt) opt.disabled = !bidirAllowed; });
  if (!bidirAllowed && (sel.value === 'directionalBidir' || sel.value === 'rotationalBidir')) {
    const fallback = sel.value === 'directionalBidir' ? 'directional' : 'rotational';
    setSpatialFxMode(fallback);
  }
}

get('dSpatialFxMode').addEventListener('change', function() {
  setSpatialFxMode(this.value);
  if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
});

