
(function(){
  const cv = document.getElementById('dispCurveCv'); if(!cv) return;
  const ctx = cv.getContext('2d'), L = 38, R = 14, T = 8, B = 24;
  const lblEl = document.getElementById('dispCurveSel'), bRst = document.getElementById('btnDispHandleReset');
  const b180 = document.getElementById('btnDispSpan180'), b360 = document.getElementById('btnDispSpan360'), spanEl = document.getElementById('nDispSpan');
  let W = 0, Hh = 0, sel = null, drag = null, frozen = null, lastKey = '', y0 = -120, y1 = 20, lastTap = null, lpTimer = 0, ed = null;
  const INPUT = { max: 'nMaxDispersion', mid: 'nMidDispersion', min: 'nMinDispersion', left: 'nLeftDispersion' };
  const HKEY = { max: 'a0', mid: 'a90', min: 'a180', left: 'a270' };
  const ORDER = ['max', 'mid', 'min', 'left'];
  const num = function(id, d){ const e = document.getElementById(id), v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; };
  const span = function(){ return (spanEl && spanEl.value === '360') ? 360 : 180; };
  const H = function(){ return window._dispHandles || (window._dispHandles = _dispCleanHandles(null)); };
  const H3 = function(){ return window._dispHandles360 || (window._dispHandles360 = _dispCleanHandles360(null)); };
  const cl = function(v, a, b){ return Math.max(a, Math.min(b, v)); };
  function st(){
    const mode = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni', hi = num('nMaxDispersion', 100), lo = num('nMinDispersion', -100), mid = num('nMidDispersion', (hi + lo) / 2);
    return { mode: mode, omni: mode === 'omni', bidir: (mode === 'rotationalBidir' || mode === 'directionalBidir'), hi: hi, lo: lo, mid: mid, left: num('nLeftDispersion', mid), full: span() === 360 };
  }
  const X = function(d){ return L + d / span() * (W - L - R); }, Y = function(v){ return T + (1 - (v - y0) / (y1 - y0)) * (Hh - T - B); };
  const dX = function(px){ return (px - L) / (W - L - R) * span(); }, dY = function(py){ return y0 + (1 - (py - T) / (Hh - T - B)) * (y1 - y0); };
  function dots(S){
    const d = [{ k: 'max', deg: 0, v: S.hi }];
    if(S.omni) return d;
    d.push({ k: 'mid', deg: 90, v: S.mid });
    if(S.full){
      if(!S.bidir) d.push({ k: 'min', deg: 180, v: S.lo });
      d.push({ k: 'left', deg: 270, v: S.left });
    } else if(!S.bidir) d.push({ k: 'min', deg: 180, v: S.lo });
    return d;
  }
  function dotName(k, S){
    if(S.full) return { max: '0\u00b0', mid: '90\u00b0', min: '180\u00b0', left: '270\u00b0' }[k];
    return { max: 'Max (0\u00b0)', mid: 'Mid (90\u00b0)', min: 'Min (180\u00b0)' }[k];
  }
  function hv(d, S){
    if(S.full){ const P = _disp360Pts(S.hi, S.mid, S.lo, S.bidir, S.left)[ORDER.indexOf(d.k)]; return { x: P.hx, y: P.hy }; }
    return H()[d.k] || null;
  }
  function handleEnd(d, S){ const h = hv(d, S); return h ? { deg: d.deg + h.x, v: d.v + h.y } : null; }
  function fit(){
    const w = cv.clientWidth, h = cv.clientHeight, dp = Math.min(4, Math.max(3, (typeof hiResK === 'function' ? hiResK() : (window.devicePixelRatio || 1))));
    if(!w || !h) return false;
    if(W !== w || Hh !== h || cv.width !== Math.round(w * dp)){ W = w; Hh = h; cv.width = Math.round(w * dp); cv.height = Math.round(h * dp); ctx.setTransform(dp, 0, 0, dp, 0, 0); }
    return true;
  }
  function css(n, f){ const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || f; }
  function range(S){
    if(frozen){ y0 = frozen[0]; y1 = frozen[1]; return; }
    let vals = [S.hi, S.lo, S.mid, S.left];
    if(!S.omni) dots(S).forEach(function(d){ const e = handleEnd(d, S); if(e){ vals.push(e.v); if(S.full || d.k === 'mid') vals.push(d.v - (e.v - d.v)); } });
    let a = Math.min.apply(null, vals) - 15, b = Math.max.apply(null, vals) + 15;
    if(b - a < 40){ const c = (a + b) / 2; a = c - 20; b = c + 20; }
    y0 = Math.floor(a / 10) * 10; y1 = Math.ceil(b / 10) * 10;
  }
  function draw(){
    const S = st(), W0 = span(); range(S);
    const muted = css('--muted', '#7480a8');
    const full = S.full, gl = full ? [0, 90, 180, 270, 360] : [0, 90, 180];
    const yTicks = [y0, y1]; if(y0 < 0 && y1 > 0) yTicks.push(0);
    let mk = null;
    if(!S.omni && typeof getRelativeAngleDeg === 'function'){
      let t = getRelativeAngleDeg(); if(!S.full && t > 180) t = 360 - t;
      mk = { x: t, y: dispCurveEval(t, S.hi, S.mid, S.lo, S.bidir, S.left) };
    }
    window.vzPlot(cv, { prepared: true, fixed: true, fs: 9, L: L, R: R, T: T, B: B, xmin: 0, xmax: W0, ymin: y0, ymax: y1,
      xticks: gl, xfmt: function(d){ return d + '\u00b0'; }, yticks: yTicks, xlabel: 'Angle (\u00b0)', ylabel: 'Dispersion',
      series: [{ f: function(d){ return S.omni ? S.hi : dispCurveEval(d, S.hi, S.mid, S.lo, S.bidir, S.left); }, n: W0, color: '#c9ced8' }],
      marker: mk ? { x: mk.x, y: mk.y, color: '#e6e8ee', line: 'rgba(200,205,216,0.45)' } : null });
    ctx.font = '12px "Open Sans", sans-serif'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#9aa0ad'; ctx.lineWidth = 1.5; ctx.globalAlpha = .45;
    if(S.bidir && !S.omni){ ctx.beginPath(); ctx.arc(X(180), Y(S.hi), 5, 0, 7); ctx.stroke(); }
    if(S.full){ ctx.beginPath(); ctx.arc(X(360), Y(S.hi), 5, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const D = S.omni ? [] : dots(S);
    D.forEach(function(d){
      const e = handleEnd(d, S); if(!e) return;
      ctx.strokeStyle = '#7d8493'; ctx.fillStyle = '#7d8493'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(d.deg), Y(d.v)); ctx.lineTo(X(e.deg), Y(e.v)); ctx.stroke();
      ctx.fillRect(X(e.deg) - 4, Y(e.v) - 4, 8, 8);
      if(S.full || d.k === 'mid'){
        const mx = d.deg - (e.deg - d.deg), my = d.v - (e.v - d.v);
        if(mx >= 0){ ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(X(d.deg), Y(d.v)); ctx.lineTo(X(mx), Y(my)); ctx.stroke(); ctx.fillRect(X(mx) - 3, Y(my) - 3, 6, 6); ctx.globalAlpha = 1; }
        else if(d.k === 'max' && S.full){ ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(X(360), Y(d.v)); ctx.lineTo(X(360 + mx), Y(my)); ctx.stroke(); ctx.fillRect(X(360 + mx) - 3, Y(my) - 3, 6, 6); ctx.globalAlpha = 1; }
      }
    });
    D.forEach(function(d){
      ctx.fillStyle = '#e6e8ee'; ctx.beginPath(); ctx.arc(X(d.deg), Y(d.v), 5, 0, 7); ctx.fill();
      if(sel === d.k){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X(d.deg), Y(d.v), 8, 0, 7); ctx.stroke(); }
    });
  }
  function refreshUi(){
    const S = st(), D = dots(S);
    if(S.omni || !D.some(function(d){ return d.k === sel; })) sel = null;
    const sd = sel ? D.filter(function(d){ return d.k === sel; })[0] : null;
    lblEl.textContent = S.omni ? '' : sd ? dotName(sd.k, S) + ': ' + Math.round(sd.v) : '';
    [[b180, 180], [b360, 360]].forEach(function(p){ if(p[0]) p[0].className = 'vbtn ' + (span() === p[1] ? 'btn-accent active' : 'btn-gray'); });
  }
  function ensureMid(S){
    if(S.full || S.omni || H().mid) return;
    const D = Math.PI / 180;
    H().mid = S.bidir ? { x: 30, y: 0 } : { x: 30, y: Math.round((-(S.hi - S.mid) * D - (S.mid - S.lo) * D) / 2 * 30 * 10) / 10 };
    changed();
  }
  function changed(){ lastKey = ''; try{ if(typeof posRecalc === 'function') posRecalc(); }catch(e){} }
  function hit(px, py){
    const S = st(); if(S.omni) return null; const d = dots(S);
    for(let i = d.length - 1; i >= 0; i--){ const e = handleEnd(d[i], S); if(e && Math.abs(px - X(e.deg)) <= 8 && Math.abs(py - Y(e.v)) <= 8) return { t: 'handle', k: d[i].k }; }
    for(let i = d.length - 1; i >= 0; i--){ if(Math.hypot(px - X(d[i].deg), py - Y(d[i].v)) <= 9) return { t: 'dot', k: d[i].k }; }
    if(Math.hypot(px - X(0), py - Y(S.hi)) <= 9) return { t: 'dot', k: 'max' };
    return null;
  }
  function pt(e){ const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.clientWidth / (r.width || 1)), (e.clientY - r.top) * (cv.clientHeight / (r.height || 1))]; }
  function setDot(k, v){
    const inp = document.getElementById(INPUT[k]); if(!inp || inp.disabled) return;
    if(k === 'left') window._dispLeftTouched = true;
    inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true }));
    if(typeof window.saveSettings === 'function'){ clearTimeout(setDot._t); setDot._t = setTimeout(window.saveSettings, 400); }
  }
  function closeEd(commit){
    if(!ed) return; const e = ed; ed = null; clearTimeout(e.t);
    const v = parseFloat(e.inp.value);
    e.inp.removeEventListener('blur', e.onBlur); if(e.inp.parentNode) e.inp.parentNode.removeChild(e.inp);
    if(commit && isFinite(v)) setDot(e.k, Math.round(cl(v, -200, 200)));
    lastKey = '';
  }
  function openEd(k){
    const S = st(), d = dots(S).filter(function(x){ return x.k === k; })[0]; if(!d) return;
    closeEd(false); sel = k;
    const wrap = cv.parentElement; if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    const inp = document.createElement('input'); inp.type = 'number'; inp.min = -200; inp.max = 200; inp.step = 1; inp.value = Math.round(d.v);
    const wd = 62, left = cl(cv.offsetLeft + X(d.deg) - wd / 2, cv.offsetLeft, cv.offsetLeft + W - wd), above = Y(d.v) > 34;
    inp.style.cssText = 'position:absolute;z-index:50;width:' + wd + 'px;height:22px;box-sizing:border-box;padding:1px 4px;font-size:12px;text-align:center;left:' + left + 'px;top:' + (cv.offsetTop + Y(d.v) + (above ? -32 : 12)) + 'px;background:var(--bg,#10131f);color:#fff;border:1px solid #a78bfa;border-radius:3px;outline:none';
    inp.setAttribute('aria-label', dotName(k, S) + ' dispersion');
    inp.addEventListener('keydown', function(ev){ if(ev.key === 'Enter'){ ev.preventDefault(); closeEd(true); } else if(ev.key === 'Escape'){ ev.preventDefault(); closeEd(false); } ev.stopPropagation(); });
    wrap.appendChild(inp);
    ed = { inp: inp, k: k, onBlur: function(){ closeEd(true); }, t: 0 };
    ed.t = setTimeout(function(){ if(!ed || ed.inp !== inp) return; inp.focus(); inp.select(); inp.addEventListener('blur', ed.onBlur); }, 40);
    refreshUi(); lastKey = '';
  }
  cv.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  cv.addEventListener('pointerdown', function(e){
    if(!fit()) return; closeEd(true); clearTimeout(lpTimer);
    const p = pt(e), h = hit(p[0], p[1]);
    if(!h){ sel = null; lastTap = null; refreshUi(); lastKey = ''; return; }
    sel = h.k;
    if(h.t === 'dot'){
      const now = performance.now();
      if(lastTap && lastTap.k === h.k && now - lastTap.t < 400 && Math.hypot(p[0] - lastTap.x, p[1] - lastTap.y) < 14){ lastTap = null; drag = null; frozen = null; openEd(h.k); e.preventDefault(); return; }
      lastTap = { k: h.k, t: now, x: p[0], y: p[1] };
      lpTimer = setTimeout(function(){ if(drag && drag.t === 'dot' && !drag.moved){ drag = null; frozen = null; lastTap = null; openEd(h.k); } }, 550);
    } else lastTap = null;
    drag = { t: h.t, k: h.k, moved: false, x: p[0], y: p[1] }; frozen = [y0, y1]; try{ cv.setPointerCapture(e.pointerId); }catch(_){}
    refreshUi(); lastKey = ''; e.preventDefault();
  });
  cv.addEventListener('pointermove', function(e){
    if(!fit()) return; const p = pt(e), S = st();
    if(!drag){ const h = hit(p[0], p[1]); cv.style.cursor = h ? (h.t === 'handle' ? 'move' : 'ns-resize') : 'default'; return; }
    if(!drag.moved){ if(Math.hypot(p[0] - drag.x, p[1] - drag.y) < 4) return; drag.moved = true; clearTimeout(lpTimer); lastTap = null; }
    if(drag.t === 'dot'){
      setDot(drag.k, Math.round(cl(dY(p[1]), -200, 200)));
    } else {
      const d = dots(S).filter(function(x){ return x.k === drag.k; })[0]; if(!d) return;
      let vx = dX(p[0]) - d.deg, vy = dY(p[1]) - d.v;
      if(S.full) H3()[HKEY[drag.k]] = { x: Math.round(cl(vx, 0.5, 89) * 10) / 10, y: Math.round(cl(vy, -400, 400) * 10) / 10 };
      else { vx = drag.k === 'min' ? cl(vx, -90, -0.5) : cl(vx, 0.5, 90); H()[drag.k] = { x: Math.round(vx * 10) / 10, y: Math.round(cl(vy, -400, 400) * 10) / 10 }; }
      changed();
    }
    lastKey = '';
  });
  function end(){ clearTimeout(lpTimer); drag = null; frozen = null; lastKey = ''; if(ed && ed.inp){ try{ ed.inp.focus(); ed.inp.select(); }catch(_){} } }
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  function setSpan(n){
    if(!spanEl || spanEl.value === String(n)) return;
    if(n === 360 && !window._dispLeftTouched){ const m = document.getElementById('nMidDispersion'), l = document.getElementById('nLeftDispersion'); if(m && l) l.value = m.value; }
    closeEd(false); sel = null; spanEl.value = String(n); spanEl.dispatchEvent(new Event('input', { bubbles: true }));
    changed(); refreshUi();
    if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  }
  if(b180) b180.addEventListener('click', function(){ setSpan(180); });
  if(b360) b360.addEventListener('click', function(){ setSpan(360); });
  bRst.addEventListener('click', function(){
    if(span() === 360) window._dispHandles360 = _dispCleanHandles360(null);
    else { window._dispHandles = _dispCleanHandles(null); ensureMid(st()); }
    refreshUi(); changed();
  });
  (function loop(){
    try{
      if(cv.offsetParent !== null && fit()){
        ensureMid(st());
        const S = st(), rel = (typeof getRelativeAngleDeg === 'function') ? getRelativeAngleDeg().toFixed(1) : '', key = [S.mode, S.hi, S.lo, S.mid, S.left, S.full, JSON.stringify(H()), JSON.stringify(H3()), sel, rel, W, Hh, drag ? 1 : 0].join('|');
        if(key !== lastKey){ lastKey = key; refreshUi(); draw(); }
      }
    }catch(e){}
    requestAnimationFrame(loop);
  })();
})();
