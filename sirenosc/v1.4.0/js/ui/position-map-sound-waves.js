
(function(){
  const wrap = document.getElementById('posMapWrap'), cv = document.getElementById('posWaveCv'), cbB = document.getElementById('posWavesBlue'), cbR = document.getElementById('posWavesRed');
  if(!wrap || !cv || !window._posMath) return;
  const PM = window._posMath, MI_M = 1609.344, SEG = 90, MAX_RINGS = 300;
  const rings = []; let lastBlue = null, lastSig = null, pendingRed = null, lastChangeT = 0, lastRedAt = -1e9, emittedSig = null, W = 0, H = 0; window._posWaveRings = rings;
  const ctx = cv.getContext('2d');
  const now = function(){ return performance.now() / 1000; };
  const mode = function(){ return (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni'; };
  const isBidir = function(m){ return m === 'rotationalBidir' || m === 'directionalBidir'; };
  const num = function(id, d){ const e = document.getElementById(id), v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; };
  const speed = function(){ const v = num('sSosSpeed', 343); return v > 0 ? v : 343; };
  const facing = function(){ return (typeof rotAngleDeg === 'number' && isFinite(rotAngleDeg)) ? rotAngleDeg : 0; };
  function dispAt(m, face, psi){
    const hi0 = num('nMaxDispersion', 100), lo0 = num('nMinDispersion', -100), mid0 = num('nMidDispersion', (hi0 + lo0) / 2);
    if(m === 'omni') return hi0;
    return (typeof dispCurveEval === 'function') ? dispCurveEval(face - psi, hi0, mid0, lo0, isBidir(m), num('nLeftDispersion', mid0)) : hi0;
  }
  function sources(){
    const m = mode(), f = facing(), h = PM.curHalfMi(), off = (m === 'omni') ? 0 : h * 0.05, fr = f * Math.PI / 180;
    const ux = Math.sin(fr), uy = Math.cos(fr);
    if(m === 'omni') return [{ x: 0, y: 0, face: f, side: 0 }];
    if(isBidir(m)) return [{ x: ux * off, y: uy * off, face: f, side: 1 }, { x: -ux * off, y: -uy * off, face: f, side: -1 }];
    return [{ x: ux * off, y: uy * off, face: f, side: 0 }];
  }
  function emit(color, t0){
    const t = (t0 == null) ? now() : t0, m = mode();
    sources().forEach(function(sr){ rings.push({ t0: t, x: sr.x, y: sr.y, face: sr.face, side: sr.side, mode: m, color: color }); });
    while(rings.length > MAX_RINGS) rings.shift();
  }
  function fit(){
    const w = wrap.clientWidth, h = wrap.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if(!w || !h) return false;
    if(W !== w || H !== h || cv.width !== Math.round(w * d)){ W = w; H = h; cv.width = Math.round(w * d); cv.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0); }
    return true;
  }
  let wasOn = true;
  (function frame(){
    try{
      const wantB = !cbB || cbB.checked, wantR = !cbR || cbR.checked, on = wantB || wantR, vis = wrap.offsetParent !== null;
      if(window._simStopped){
        if(rings.length || wasOn){ rings.length = 0; if(fit()) ctx.clearRect(0, 0, W, H); }
        lastBlue = null; lastSig = null; pendingRed = null; emittedSig = null; wasOn = false;
      } else if(!on){ if(wasOn){ rings.length = 0; if(fit()) ctx.clearRect(0, 0, W, H); } wasOn = false; }
      else if(vis && fit()){
        wasOn = true;
        const t = now(), h = PM.curHalfMi(), c = speed(), sig = (typeof windDirection !== 'undefined' ? windDirection : '') + '|' + (typeof active !== 'undefined' ? active : '');
        if(lastBlue == null) lastBlue = t;
        if(lastSig == null){ lastSig = sig; emittedSig = sig; }
        const iv = Math.max(0.02, num('nPosWaveInterval', 1000) / 1000);
        if(t - lastBlue >= iv){ lastBlue = t - ((t - lastBlue) % iv); if(wantB && ((typeof currentRPM === 'number' ? currentRPM : 0) + (typeof damperExtraRPM === 'number' ? damperExtraRPM : 0)) > 0.01) emit('b'); }
        if(sig !== lastSig){ lastSig = sig; lastChangeT = t; if(pendingRed == null) pendingRed = t; }
        if(pendingRed != null && ((t - lastChangeT >= 0.15 && t - lastRedAt >= 0.5) || t - pendingRed >= 1.2)){
          if(sig !== emittedSig){ if(wantR) emit('r', pendingRed); emittedSig = sig; lastRedAt = t; }
          pendingRed = null;
        }
        for(let i = rings.length - 1; i >= 0; i--) if((rings[i].color === 'b' && !wantB) || (rings[i].color === 'r' && !wantR)) rings.splice(i, 1);
        ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        const sx = W / (2 * h), sy = H / (2 * h), maxR = h * 1.6;
        for(let i = rings.length - 1; i >= 0; i--){
          const r = rings[i], rMi = c * (t - r.t0) / MI_M;
          if(rMi > maxR){ rings.splice(i, 1); continue; }
          if(rMi * sx < 1) continue;
          const rFt = rMi * PM.FT_PER_MI, rgb = r.color === 'b' ? '70,160,255' : '255,70,70';
          let px = null, py = null, pa = 0;
          for(let k = 0; k <= SEG; k++){
            const psi = k * 360 / SEG, pr = psi * Math.PI / 180;
            const x = r.x + Math.sin(pr) * rMi, y = r.y + Math.cos(pr) * rMi, cx = (x + h) * sx, cy = (h - y) * sy;
            let a = PM.lpfPctAtFt(rFt, dispAt(r.mode, r.face, psi)) / 100;
            if(r.side) a *= (1 + r.side * Math.cos((r.face - psi) * Math.PI / 180)) / 2;
            a = Math.max(0, Math.min(1, a)) * 0.9;
            if(px !== null && (a + pa) > 0.03){ ctx.strokeStyle = 'rgba(' + rgb + ',' + ((a + pa) / 2).toFixed(3) + ')'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke(); }
            px = cx; py = cy; pa = a;
          }
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }catch(e){}
    requestAnimationFrame(frame);
  })();
  [cbB, cbR, document.getElementById('nPosWaveInterval')].forEach(function(c){ if(c) c.addEventListener('change', function(){ if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); }); });
})();
