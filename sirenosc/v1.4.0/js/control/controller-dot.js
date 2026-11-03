
(function(){
  const FT=5280, MI_M=1609.344;
  window._ctrlDot = window._ctrlDot || {x:0, y:0};
  const ctrl = window._ctrlDot;
  const wrap = document.getElementById('posMapWrap'), userX = document.getElementById('posUserX');
  if(!wrap || !userX || !window._posMath) return;
  const PM = window._posMath;
  const ps = function(){ try{ return getPosMapState() || {}; }catch(e){ return {}; } };
  const toUnit = function(v,u){ return u==='m' ? v*MI_M : (u==='ft' ? v*FT : v); };
  const fromUnit = function(v,u){ return u==='m' ? v/MI_M : (u==='ft' ? v/FT : v); };
  const clampMi = function(v){ return Math.max(-12, Math.min(12, v)); };
  const save = function(){ if(typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); };

  const dot = document.createElement('div');
  dot.id = 'posCtrlDot';
  dot.title = 'Controller Dot (drag me): source of every Constant set to "Controller Dot". Always omnidirectional';
  dot.style.cssText = 'position:absolute;width:12px;height:12px;border-radius:50%;background:var(--purple);left:50%;top:50%;transform:translate(-50%,-50%);cursor:grab;box-shadow:none;z-index:6;touch-action:none';
  wrap.appendChild(dot);
  let drag = false;
  dot.addEventListener('pointerdown', function(e){ if(window._ctrlLock) return; drag = true; try{ dot.setPointerCapture(e.pointerId); }catch(_){} e.preventDefault(); e.stopPropagation(); });
  dot.addEventListener('pointermove', function(e){
    if(!drag) return;
    const r = wrap.getBoundingClientRect(), h = PM.curHalfMi();
    const px = Math.max(0, Math.min(1, (e.clientX - r.left)/r.width)), py = Math.max(0, Math.min(1, (e.clientY - r.top)/r.height));
    ctrl.x = px*2*h - h; ctrl.y = h - py*2*h;
  });
  const endDrag = function(){ if(drag){ drag = false; save(); } };
  dot.addEventListener('pointerup', endDrag); dot.addEventListener('pointercancel', endDrag);

  const grid = document.createElement('div');
  grid.className = 'entry-grid'; grid.style.cssText = 'gap:5px;margin-top:6px;letter-spacing:1px';
  grid.innerHTML = '<div class="entry"><label>Controller X</label><input type="number" id="posCtrlX" step="0.1" style="color:var(--purple);letter-spacing:1px"></div>'
                 + '<div class="entry"><label>Controller Y</label><input type="number" id="posCtrlY" step="0.1" style="color:var(--purple);letter-spacing:1px"></div>';
  userX.closest('.entry-grid').insertAdjacentElement('afterend', grid);
  const cx = document.getElementById('posCtrlX'), cy = document.getElementById('posCtrlY');
  const lockRow = document.createElement('label');
  lockRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;letter-spacing:1px;color:var(--muted);text-transform:uppercase;cursor:pointer';
  lockRow.innerHTML = '<input type="checkbox" id="posCtrlLock" style="accent-color:var(--purple)"> Lock Controller Dot to Siren';
  grid.insertAdjacentElement('afterend', lockRow);
  const lockCb = document.getElementById('posCtrlLock');
  window._ctrlLock = (window._ctrlLock === undefined) ? true : !!window._ctrlLock;
  function applyLock(){
    if(window._ctrlLock){ ctrl.x = 0; ctrl.y = 0; }
    lockCb.checked = !!window._ctrlLock; cx.disabled = cy.disabled = !!window._ctrlLock; dot.style.cursor = window._ctrlLock ? 'default' : 'grab';
    dot.title = window._ctrlLock ? 'Controller Dot (locked to the siren)' : 'Controller Dot (drag me): source of every Constant set to "Controller Dot". Always omnidirectional';
  }
  window._ctrlSetLock = function(v){ window._ctrlLock = !!v; applyLock(); };
  applyLock();
  lockCb.addEventListener('change', function(){ window._ctrlLock = lockCb.checked; applyLock(); save(); });
  cx.addEventListener('input', function(){ ctrl.x = clampMi(fromUnit(parseFloat(cx.value)||0, ps().posUnit||'ft')); save(); });
  cy.addEventListener('input', function(){ ctrl.y = clampMi(fromUnit(parseFloat(cy.value)||0, ps().posUnit||'ft')); save(); });

  function calcRaw(offIn, steepIn, dbIn){
    const st = ps(), dx = (st.posUserX||0) - ctrl.x, dy = (st.posUserY||0) - ctrl.y, distFt = Math.hypot(dx, dy)*FT;
    if(typeof distanceEnabled !== 'undefined' && !distanceEnabled) return {distFt:distFt, hz:20000, gain:1, pct:100};
    const off = Math.max(-100, Math.min(100, parseFloat(offIn) || 0)), steep = Math.max(-100, Math.min(300, parseFloat(steepIn) || 0));
    const db10 = isFinite(parseFloat(dbIn)) ? parseFloat(dbIn) : 126;
    const pct = PM.lpfPctAtFtCS(distFt, off, steep), hz = PM.lpfPctToHz(pct);
    let gp = PM.dbToGainPct(PM.db10ToDb100(db10));
    if(pct < PM.GAIN_LPF_FLOOR_PCT) gp = gp*(pct/PM.GAIN_LPF_FLOOR_PCT);
    gp = Math.max(0, Math.min(300, gp));
    return {distFt:distFt, hz:hz, gain:gp/100, pct:pct};
  }
  function calc(id){ const oEl = document.getElementById('nConst'+id+'Off'), sEl = document.getElementById('nConst'+id+'Steep'), bEl = document.getElementById('nConst'+id+'Db10'); return calcRaw(oEl && oEl.value, sEl && sEl.value, bEl && bEl.value); }
  window._ctrlDotCalc = calcRaw;
  function dispose(c){ if(c && c._cd){ ['lpf','gain'].forEach(function(k){ try{ c._cd[k].disconnect(); }catch(e){} }); c._cd = null; } }
  function route(id){
    const c = constNodes[id]; if(!c || !c.lpf || !audioCtx) return;
    const sel = document.getElementById('dConst'+id+'Pos'), mode = (sel && sel.value === 'dot') ? 'dot' : 'follow';
    const want = (mode === 'dot') ? (masterGain || audioCtx.destination) : (window._constPosIn || fxChainOut || audioCtx.destination);
    const rt = c._rt; if(rt && rt.lpf === c.lpf && rt.mode === mode && rt.dest === want) return;
    try{ c.lpf.disconnect(); }catch(e){}
    dispose(c);
    if(mode === 'dot'){
      const l = audioCtx.createBiquadFilter(); l.type = 'lowpass'; l.Q.value = 0.7071;
      const g = audioCtx.createGain(), v = calc(id);
      l.frequency.value = Math.min(v.hz, audioCtx.sampleRate/2 - 1); g.gain.value = v.gain;
      c.lpf.connect(l); l.connect(g); g.connect(want);
      c._cd = {lpf:l, gain:g, key:''};
    } else { c.lpf.connect(want); }
    c.dest = want; c._rt = {lpf:c.lpf, mode:mode, dest:want};
  }
  function applyDot(id){
    const c = constNodes[id]; if(!c || !c._cd || !audioCtx) return;
    const v = calc(id), key = v.hz.toFixed(1)+'|'+v.gain.toFixed(4);
    if(c._cd.key === key) return; c._cd.key = key;
    const t = audioCtx.currentTime;
    c._cd.lpf.frequency.setTargetAtTime(Math.min(v.hz, audioCtx.sampleRate/2 - 1), t, 0.01);
    c._cd.gain.gain.setTargetAtTime(v.gain, t, 0.03);
  }

  const _build = buildConst;  buildConst = function(id){ _build(id); try{ route(id); }catch(e){} };
  const _tear = tearConst;    tearConst = function(id){ const c = constNodes[id]; if(c){ dispose(c); c._rt = null; } _tear(id); };
  reconnectConsts = function(){ CONSTS.forEach(function(id){ const c = constNodes[id]; if(c && c.enabled && c.lpf && audioCtx){ try{ route(id); }catch(e){} } }); };

  const dispKeys = {};
  function drawDisp(id, isDot){
    const cv = document.getElementById('const'+id+'DispCv'); if(!cv || !cv.clientWidth || !cv.clientHeight || !window.vzPlot) return;
    const oEl = document.getElementById('nConst'+id+'Off'), sEl = document.getElementById('nConst'+id+'Steep'), sl = document.getElementById('sDispersionRate');
    const off = isDot ? Math.max(-100, Math.min(100, parseFloat(oEl && oEl.value) || 0)) : 0, steep = isDot ? Math.max(-100, Math.min(300, parseFloat(sEl && sEl.value) || 0)) : 0;
    const disp = isDot ? 0 : Math.max(-200, Math.min(200, parseFloat(sl && sl.value) || 0));
    const curve = function(x){ return isDot ? PM.lpfPctAtFtCS(x, off, steep) : PM.lpfPctAtFt(x, disp); };
    const st = ps(), ft = Math.hypot((st.posUserX||0) - ctrl.x, (st.posUserY||0) - ctrl.y) * FT;
    const key = [isDot ? 1 : 0, off, steep, disp, Math.round(ft), cv.clientWidth, cv.clientHeight].join('|'); if(dispKeys[id] === key) return; dispKeys[id] = key;
    let col = '#4dd6a0'; try{ col = getConstColor(id) || col; }catch(e){}
    window.vzPlot(cv, { fs: 8, L: 36, R: 8, T: 6, B: 18, xmin: 0, xmax: 6000, ymin: 0, ymax: 100,
      xticks: [0, 2000, 4000, 6000], xfmt: function(t){ return t ? (t/1000) + 'k' : '0'; }, yticks: [0, 50, 100],
      xlabel: 'Distance (ft)', ylabel: 'LPF %',
      series: [{ f: function(x){ return PM.lpfPctAtFt(x, 0); }, n: 120, color: '#3a3f4d', w: 1 }, { f: curve, n: 120, color: col }],
      marker: { x: Math.min(ft, 6000), y: curve(ft), color: col } });
  }

  let lastDot = '', lastIn = '';
  (function tick(){
    try{
      const st = ps(), h = PM.curHalfMi(), u = st.posUnit || 'ft';
      if(window._ctrlLock && (ctrl.x !== 0 || ctrl.y !== 0)){ ctrl.x = 0; ctrl.y = 0; }
      if(lockCb.checked !== !!window._ctrlLock) applyLock();
      const dk = [ctrl.x, ctrl.y, h].join('|');
      if(dk !== lastDot){
        lastDot = dk;
        const inside = Math.abs(ctrl.x) <= h && Math.abs(ctrl.y) <= h;
        dot.style.display = inside ? '' : 'none';
        dot.style.left = ((ctrl.x + h)/(2*h)*100) + '%'; dot.style.top = ((h - ctrl.y)/(2*h)*100) + '%';
      }
      const ik = [ctrl.x, ctrl.y, u].join('|');
      if(ik !== lastIn){
        lastIn = ik;
        if(document.activeElement !== cx) cx.value = toUnit(ctrl.x, u).toFixed(2);
        if(document.activeElement !== cy) cy.value = toUnit(ctrl.y, u).toFixed(2);
      }
      CONSTS.forEach(function(id){
        const sel = document.getElementById('dConst'+id+'Pos'); if(!sel) return;
        const isDot = sel.value === 'dot';
        const df = document.getElementById('const'+id+'DotFields'); if(df) df.style.display = isDot ? '' : 'none';
        if(isDot){
          const v = calc(id), rd = document.getElementById('const'+id+'DotRead');
          if(rd){
            const d = toUnit(v.distFt/FT, u), hz = v.hz;
            const txt = d.toFixed(u === 'mi' ? 2 : 0)+' '+u+' from listener  |  LPF '+(hz >= 1000 ? (hz/1000).toFixed(1)+'k' : Math.round(hz))+' Hz  |  gain '+Math.round(v.gain*100)+'%';
            if(rd.textContent !== txt) rd.textContent = txt;
          }
        }
        ['Off','Steep'].forEach(function(k){ const inp = document.getElementById('nConst'+id+k), lb = document.getElementById('svConst'+id+k);
          if(inp && lb){ const v = parseFloat(inp.value) || 0, t = (v > 0 ? '+' : '') + v; if(lb.textContent !== t) lb.textContent = t; } });
        try{ drawDisp(id, isDot); }catch(e){}
        const c = constNodes[id]; if(!c || !c.enabled || !c.lpf || !audioCtx) return;
        route(id);
        if(isDot) applyDot(id);
      });
    }catch(e){}
    requestAnimationFrame(tick);
  })();
})();
