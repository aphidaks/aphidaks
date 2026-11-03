function tickConstBlowerLinks() {
  const rpm = currentRPM + damperExtraRPM;

  CONSTS.forEach(id => {
    const c = constNodes[id];
    if (!c || !c.enabled || !c.blowerLink) return;

    const targetFreq = parseFloat((get('nConst' + id + 'Freq')       || {}).value) || 120;
    const stateEl    = get('const' + id + 'BlowerLinkState');
    const col        = getConstColor(id);

    const sb = (typeof window._ceBlowerState === 'function') ? window._ceBlowerState() : null;
    const shouldBeOn  = sb ? !!sb.on : true;
    const shouldBeOff = !shouldBeOn;

    let desired;
    if (shouldBeOn && c.blowerWindState !== 'winding-up' && c.blowerWindState !== 'up') {
      desired = 'start-up';
    } else if (shouldBeOff && (c.blowerWindState === 'up' || c.blowerWindState === 'winding-up')) {
      desired = 'start-down';
    }

    if (desired === 'start-up' && (c.blowerWindState === 'idle' || c.blowerWindState === 'winding-down')) {
      const _resumeFreq = (c.blowerWindState === 'winding-down' && c.osc && audioCtx) ? Math.max(0, c.osc.frequency.value) : 0;
      const fn     = get('dBlowerConstWindUpFn')     ? get('dBlowerConstWindUpFn').value     : 'sine';
      const offset = (get('nBlowerConstWindUpOffset') ? parseFloat(get('nBlowerConstWindUpOffset').value) || 5 : 5) * getOffsetMultiplier();
      c.blowerWindState     = 'winding-up';
      c.blowerWindStart     = performance.now();
      c.blowerWindDur       = offset * 1000;
      c.blowerWindStartFreq = _resumeFreq;
      c.blowerWindTargetFreq= targetFreq;
      c.blowerWindFn        = fn;
      c.blowerWindEasing    = 'easeout';
      if (c.osc && audioCtx && _resumeFreq === 0) c.osc.frequency.setValueAtTime(0.01, audioCtx.currentTime);
      if (stateEl) { stateEl.textContent = 'WIND-UP'; stateEl.style.color = col; }

    } else if (desired === 'start-down' && (c.blowerWindState === 'up' || c.blowerWindState === 'winding-up')) {
      const fn     = get('dBlowerConstWindDownFn')     ? get('dBlowerConstWindDownFn').value     : 'exponential';
      const offset = (get('nBlowerConstWindDownOffset') ? parseFloat(get('nBlowerConstWindDownOffset').value) || 5 : 5) * getOffsetMultiplier();
      const curFreq = (c.osc && audioCtx) ? c.osc.frequency.value : targetFreq;
      c.blowerWindState     = 'winding-down';
      c.blowerWindStart     = performance.now();
      c.blowerWindDur       = offset * 1000;
      c.blowerWindStartFreq = curFreq;
      c.blowerWindTargetFreq= 0;
      c.blowerWindFn        = fn;
      c.blowerWindEasing    = 'easeout';
      if (stateEl) { stateEl.textContent = 'WIND-DOWN'; stateEl.style.color = col; }

    }

    if (c.blowerWindState === 'winding-up' || c.blowerWindState === 'winding-down') {
      const elapsed = performance.now() - c.blowerWindStart;
      const t = Math.min(1, elapsed / c.blowerWindDur);
      const curved = applyFn(c.blowerWindFn, t, c.blowerWindEasing);
      const hz = c.blowerWindStartFreq + (c.blowerWindTargetFreq - c.blowerWindStartFreq) * curved;

      if (c.osc && audioCtx) {
        c.osc.frequency.setValueAtTime(Math.max(0.01, hz), audioCtx.currentTime);
      }

      if (t >= 1) {
        if (c.blowerWindState === 'winding-up') {
          c.blowerWindState = 'up';
          if (stateEl) { stateEl.textContent = 'ACTIVE'; stateEl.style.color = 'var(--led)'; }
        } else {
          c.blowerWindState = 'idle';
          if (c.osc && audioCtx) c.osc.frequency.setValueAtTime(0.01, audioCtx.currentTime);
          if (stateEl) { stateEl.textContent = 'IDLE'; stateEl.style.color = 'var(--muted)'; }
        }
      }
    } else if (c.blowerWindState === 'up') {
      const liveTarget = parseFloat((get('nConst' + id + 'Freq') || {}).value) || 120;
      if (c.osc && audioCtx && Math.abs(c.osc.frequency.value - liveTarget) > 0.5) {
        c.osc.frequency.setTargetAtTime(liveTarget, audioCtx.currentTime, 0.05);
      }
      if (stateEl && stateEl.textContent !== 'ACTIVE') {
        stateEl.textContent = 'ACTIVE'; stateEl.style.color = 'var(--led)';
      }
    } else if (c.blowerWindState === 'idle') {
      if (stateEl && stateEl.textContent !== 'IDLE') {
        stateEl.textContent = 'IDLE'; stateEl.style.color = 'var(--muted)';
      }
    }
  });
}
setInterval(function(){
  if (window._simPaused || typeof audioCtx === 'undefined' || !audioCtx) return;
  try { if (blowerEnabled) updateBlowerFade(); else tickConstBlowerLinks(); } catch (e) {}
}, 40);
