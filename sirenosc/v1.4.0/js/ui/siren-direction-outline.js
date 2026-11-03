
(function(){
  const wrap = document.getElementById('posMapWrap'), cv = document.getElementById('posDirCv'), cb = document.getElementById('posDirOutline');
  if(!wrap || !cv || !cb || !window._posMath) return;
  const ctx = cv.getContext('2d'), SEG = 120; let W = 0, H = 0, wasOn = false;
  function fit(){
    const w = wrap.clientWidth, h = wrap.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if(!w || !h) return false;
    if(W !== w || H !== h || cv.width !== Math.round(w * d)){ W = w; H = h; cv.width = Math.round(w * d); cv.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0); }
    return true;
  }
  (function frame(){
    try{
      const on = cb.checked && wrap.offsetParent !== null;
      if(!on){ if(wasOn && fit()) ctx.clearRect(0, 0, W, H); wasOn = false; }
      else if(fit()){
        wasOn = true;
        const m = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni';
        const bidir = (m === 'rotationalBidir' || m === 'directionalBidir');
        const face = ((typeof rotAngleDeg === 'number' && isFinite(rotAngleDeg)) ? rotAngleDeg : 0) * Math.PI / 180;
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,210,60,0.9)'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
        ctx.beginPath();
        for(let k = 0; k <= SEG; k++){
          const psi = k * 2 * Math.PI / SEG, th = face - psi;
          let g = (m === 'omni') ? 1 : bidir ? (1 + Math.cos(2 * th)) / 2 : (1 + Math.cos(th)) / 2;
          if(m !== 'omni') g = 0.06 + 0.94 * g;
          const x = cx + Math.sin(psi) * R * g, y = cy - Math.cos(psi) * R * g;
          if(k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
    }catch(e){}
    requestAnimationFrame(frame);
  })();
  cb.addEventListener('change', function(){ if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); });
})();
