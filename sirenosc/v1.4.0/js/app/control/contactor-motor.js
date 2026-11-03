let contactorRPM = 0;
let contactorAnimId = null;
let contactorStartTime = null;
let contactorStartRPM = 0;
let contactorDirection = 'idle';
let contactorAngle = 0;
let contactorLastTs = null;
let contactorWindFn = 'exponential';
let contactorWindEasing = 'easeout';
let contactorWindOffset = 4;
let contactorWindDir = 'idle';
let contactorWindStart = null;
let contactorWindStartRPM = 0;
let contactorPendingFlipAt = null;
let contactorPendingFlipVal = null;
let contactorLastSide = -1;

function getContactorMaxRPM(){
  const rate = parseFloat(get('nDampRate').value) || 800;
  return 60000 / (4 * rate);
}

function updateContactorMaxRpmLabel(){
  const max = getContactorMaxRPM();
  const el = get('contactorMaxRpmLabel');
  if(el) el.textContent = max.toFixed(1) + ' RPM';
}

function getDamperFromSide(side){
  return side % 2 === 0;
}

function tickContactor(ts){
  contactorAnimId = requestAnimationFrame(tickContactor);

  const dt = contactorLastTs === null ? 0 : Math.min((ts - contactorLastTs) / 1000, 0.1);
  contactorLastTs = ts;

  if(contactorWindDir === 'up'){
    if(!contactorWindStart) contactorWindStart = ts;
    const elapsed = (ts - contactorWindStart) / 1000;
    const maxRPM = getContactorMaxRPM();
    const t = Math.min(1, elapsed / contactorWindOffset);
    contactorRPM = contactorWindStartRPM + (maxRPM - contactorWindStartRPM) * applyFn(contactorWindFn, t, contactorWindEasing);
    if(t >= 1){
      contactorRPM = maxRPM;
      contactorWindDir = 'steady';
      contactorDirection = 'steady';
      contactorWindStart = null;
    }
  } else if(contactorWindDir === 'down'){
    if(!contactorWindStart) contactorWindStart = ts;
    const elapsed = (ts - contactorWindStart) / 1000;
    const t = Math.min(1, elapsed / contactorWindOffset);
    contactorRPM = contactorWindStartRPM * (1 - applyFn(contactorWindFn, t, contactorWindEasing));
    if(contactorRPM <= 0.5 || t >= 1){
      contactorRPM = 0;
      contactorWindDir = 'idle';
      contactorDirection = 'idle';
      contactorWindStart = null;
      contactorLastSide = -1;
      cancelAnimationFrame(contactorAnimId);
      contactorAnimId = null;
      contactorLastTs = null;
      const _rpmEl0 = get('contactorRpmDisplay'); if(_rpmEl0) _rpmEl0.textContent = 'CTR: 0';
      const cd = get('contactorContactDot');
      if(cd){ cd.setAttribute('fill','#151618'); cd.setAttribute('stroke','#23252b'); }
      return;
    }
  }

  if(contactorRPM > 0){
    contactorAngle = ((contactorAngle + contactorRPM / 60 * 360 * dt) % 360 + 360) % 360;
  }

  const g = get('contactorRotorG');
  if(g) g.setAttribute('transform', 'rotate(' + contactorAngle.toFixed(1) + ',20,20)');

  const activeSide = Math.floor(contactorAngle / 90);
  for(let i = 0; i < 4; i++){
    const el = get('sideInd' + i);
    if(!el) continue;
    el.className = 'side-ind' + (i === activeSide ? (i%2===0?' active-on':' active-off') : '');
  }

  const contactDot = get('contactorContactDot');
  if(contactDot){
    const damperOn = getDamperFromSide(activeSide);
    contactDot.setAttribute('fill', damperOn ? 'var(--led)' : 'var(--red)');
    contactDot.setAttribute('stroke', damperOn ? 'var(--led)' : 'var(--red)');
  }

  const _rpmEl = get('contactorRpmDisplay'); if(_rpmEl) _rpmEl.textContent = 'CTR: ' + Math.round(contactorRPM);

  if(get('tUndulate') && get('tUndulate').checked && damperEnabled){
    if(contactorLastSide !== activeSide){
      const prevSide = contactorLastSide;
      contactorLastSide = activeSide;
      if(prevSide !== -1){
        damperVar = getDamperFromSide(activeSide);
        if(seqModeActive && damperEnabled){
          seqCurrentStep = (seqCurrentStep + 1) % seqStepCount;
          seqPhaseStart = performance.now();
          applySeqStep();
          updateSeqMarkerHighlight();
        } else {
          pushGains(0.03);
          setIndicators();
        }
      }
    }
  }
}

function startContactorAnim(){
  if(contactorAnimId){ cancelAnimationFrame(contactorAnimId); contactorAnimId = null; }
  contactorLastTs = null;
  contactorAnimId = requestAnimationFrame(tickContactor);
}

function stopContactorAnim(){
  if(contactorAnimId){ cancelAnimationFrame(contactorAnimId); contactorAnimId = null; }
  contactorLastTs = null;
  contactorWindDir = 'idle';
  contactorWindStart = null;
  contactorRPM = 0;
  contactorDirection = 'idle';
  contactorPendingFlipVal = null;
  contactorPendingFlipAt = null;
  contactorLastSide = -1;
  const _rpmEl0 = get('contactorRpmDisplay'); if(_rpmEl0) _rpmEl0.textContent = 'CTR: 0';
  const cd = get('contactorContactDot');
  if(cd){ cd.setAttribute('fill','#151618'); cd.setAttribute('stroke','#23252b'); }
}

function applyContactorForPhase(phase){
  if(phase === 'up' || phase === 'steady'){
    if(contactorAnimId && (contactorWindDir === 'up' ||
       (contactorWindDir === 'steady' && Math.abs(contactorRPM - getContactorMaxRPM()) < 0.05))) return;
    startContactorWind('up');
  } else {
    startContactorWind('down');
  }
}

function startContactorWind(dir){
  if(window._simStopped) return;
  contactorWindDir = dir;
  contactorWindStart = null;
  contactorWindStartRPM = contactorRPM;
  contactorDirection = dir;
  if(dir === 'up'){
    contactorWindFn = get('dContactorWindUpFn').value;
    contactorWindEasing = get('dContactorWindUpEasing').value;
    contactorWindOffset = parseFloat(get('nContactorWindUp').value) || 4;
  } else {
    contactorWindFn = get('dContactorWindDownFn').value;
    contactorWindEasing = get('dContactorWindDownEasing').value;
    contactorWindOffset = parseFloat(get('nContactorWindDown').value) || 8;
  }
  startContactorAnim();
}

