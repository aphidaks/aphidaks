
(function(){
  const cv = document.getElementById('distCurveCv'), PM = window._posMath;
  if(!cv || !PM || !PM.anchors) return;
  const A = PM.anchors, DEF = A.map(function(a){ return { ft: a.ft, pct: a.pct }; }), MAXFT = DEF[DEF.length - 1].ft;
  const ctx = cv.getContext('2d'), L = 38, R = 14, T = 8, B = 24, lbl = document.getElementById('distCurveSel'), bRst = document.getElementById('btnDistCurveReset');
  let W = 0, Hh = 0, drag = -1, hover = -1, lastKey = '';
  const cl = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  const X = function(ft){ return L + Math.sqrt(cl(ft, 0, MAXFT) / MAXFT) * (W - L - R); }, Y = function(p){ return T + (1 - p / 100) * (Hh - T - B); };
  const dFt = function(px){ const t = cl((px - L) / (W - L - R), 0, 1); return t * t * MAXFT; }, dPct = function(py){ return cl((1 - (py - T) / (Hh - T - B)) * 100, 0, 100); };
  function fit(){
    const w = cv.clientWidth, h = cv.clientHeight, d = Math.min(2, window.devicePixelRatio || 1);
    if(!w || !h) return false;
    if(W !== w || Hh !== h || cv.width !== Math.round(w * d)){ W = w; Hh = h; cv.width = Math.round(w * d); cv.height = Math.round(h * d); ctx.setTransform(d, 0, 0, d, 0, 0); lastKey = ''; }
    return true;
  }
  const listenerFt = function(){ try{ return (typeof _sopDistM === 'function' ? _sopDistM() : 0) * 3.28084; }catch(e){ return 0; } };
  const disp = function(){ const e = document.getElementById('sDispersionRate'), v = e ? parseFloat(e.value) : 0; return isFinite(v) ? v : 0; };
  const fmtFt = function(t){ return t >= 1000 ? (t / 1000) + 'k' : String(t); };
  function line(f, col, w){
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
    for(let i = 0; i <= 160; i++){ const t = i / 160, ft = t * t * MAXFT, x = X(ft), y = Y(f(ft)); if(i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
  }
  function draw(){
    ctx.clearRect(0, 0, W, Hh);
    ctx.font = '8px "Share Tech Mono",monospace'; ctx.fillStyle = '#7d8590'; ctx.strokeStyle = '#23272e'; ctx.lineWidth = 1;
    [0, 50, 100].forEach(function(p){ const y = Math.round(Y(p)) + .5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(W - R, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(p + '%', L - 4, y); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 100, 500, 1000, 2000, 4000, 6000].forEach(function(f){ const x = Math.round(X(f)) + .5; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, Hh - B); ctx.stroke(); ctx.fillText(fmtFt(f), x, Hh - B + 4); });
    const d = disp();
    line(function(ft){ return PM.lpfPctAtFt(ft, 0); }, d ? '#59606b' : '#e6e8ee', d ? 1 : 2);
    if(d) line(function(ft){ return PM.lpfPctAtFt(ft, d); }, '#4dd6a0', 2);
    const lf = listenerFt(), my = PM.lpfPctAtFt(lf, d);
    ctx.fillStyle = '#4dd6a0'; ctx.beginPath(); ctx.arc(X(lf), Y(my), 3, 0, 7); ctx.fill();
    A.forEach(function(a, i){
      ctx.fillStyle = '#e6e8ee'; ctx.beginPath(); ctx.arc(X(a.ft), Y(a.pct), 5, 0, 7); ctx.fill();
      if(i === drag || (drag < 0 && i === hover)){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(a.ft), Y(a.pct), 8, 0, 7); ctx.stroke(); }
    });
    const k = drag >= 0 ? drag : hover;
    if(lbl) lbl.textContent = k >= 0 ? A[k].ft + ' ft: ' + A[k].pct + '%' : '';
  }
  const pos = function(e){ const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / (r.width || 1)), y: (e.clientY - r.top) * (Hh / (r.height || 1)) }; };
  function near(p){ let b = -1, bd = 14; A.forEach(function(a, i){ const d = Math.hypot(X(a.ft) - p.x, Y(a.pct) - p.y); if(d < bd){ bd = d; b = i; } }); return b; }
  const changed = function(){ lastKey = ''; try{ if(typeof posRecalc === 'function') posRecalc(); }catch(e){} };
  const persist = function(){ if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); };
  cv.addEventListener('pointerdown', function(e){
    const p = pos(e); drag = near(p);
    if(drag >= 0){ e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(x){} lastKey = ''; }
  });
  cv.addEventListener('pointermove', function(e){
    const p = pos(e);
    if(drag < 0){ const h = near(p); if(h !== hover){ hover = h; lastKey = ''; } return; }
    const a = A[drag]; a.pct = Math.round(dPct(p.y));
    if(drag > 0 && drag < A.length - 1) a.ft = Math.round(cl(dFt(p.x), A[drag - 1].ft + 1, A[drag + 1].ft - 1));
    changed();
  });
  function end(){ if(drag >= 0){ drag = -1; lastKey = ''; persist(); } }
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', function(){ if(drag < 0 && hover >= 0){ hover = -1; lastKey = ''; } });
  if(bRst) bRst.addEventListener('click', function(){ window._distCurveSet(null); changed(); persist(); });
  window._distCurveGet = function(){ return A.map(function(a){ return [a.ft, a.pct]; }); };
  window._distCurveSet = function(arr){
    const ok = Array.isArray(arr) && arr.length === A.length && arr.every(function(r, i){ return Array.isArray(r) && isFinite(+r[0]) && isFinite(+r[1]) && (i === 0 || +r[0] > +arr[i - 1][0]); });
    A.forEach(function(a, i){ a.ft = ok ? +arr[i][0] : DEF[i].ft; a.pct = ok ? cl(+arr[i][1], 0, 100) : DEF[i].pct; });
    A[0].ft = DEF[0].ft; A[A.length - 1].ft = MAXFT; lastKey = '';
    try{ if(typeof posRecalc === 'function') posRecalc(); }catch(e){}
  };
  (function loop(){
    try{
      if(cv.offsetParent !== null && fit()){
        const lf = Math.round(listenerFt()), key = [A.map(function(a){ return a.ft + ':' + a.pct; }).join(','), disp(), lf, W, Hh, drag, hover].join('|');
        if(key !== lastKey){ lastKey = key; draw(); }
      }
    }catch(e){}
    requestAnimationFrame(loop);
  })();
})();
