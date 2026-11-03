(function() {
  const M_PER_MI = 1609.344;
  const FT_PER_MI = 5280;
  const SCALES = [
    { halfMi: 12,           tick: '12mi',  title: '24mi'  },
    { halfMi: 6,             tick: '6mi',   title: '12mi'  },
    { halfMi: 3,             tick: '3mi',   title: '6mi'   },
    { halfMi: 1.5,           tick: '1.5mi', title: '3mi'   },
    { halfMi: 0.5,           tick: '0.5mi', title: '1mi'   },
    { halfMi: 500/FT_PER_MI, tick: '500ft', title: '1000ft'},
    { halfMi: 250/FT_PER_MI, tick: '250ft', title: '500ft' },
    { halfMi: 100/FT_PER_MI, tick: '100ft', title: '200ft' },
  ];
  let scaleIdx = 3;
  let halfMi = 1.5, zoomTarget = 1.5, zoomAnim = false, zoomLast = 0;
  let posUserX = 0, posUserY = 150/5280;
  let posUnit = 'ft';
  let posDragging = false;

  function dbToGainPct(db100) {
    return (20 / 3) * db100 - 610;
  }

  const LPF_PCT_ANCHORS = [
    { ft: 1,    pct: 100 },
    { ft: 100,  pct: 90  },
    { ft: 700,  pct: 60  },
    { ft: 1000, pct: 50  },
    { ft: 2640, pct: 30  },
    { ft: 4000, pct: 10  },
    { ft: 6000, pct: 0   },
  ];
  const LPF_HZ_CAL_PCT_A = 60, LPF_HZ_CAL_HZ_A = 2000;
  const LPF_HZ_CAL_PCT_B = 100, LPF_HZ_CAL_HZ_B = 11000;
  const LPF_HZ_EXP_B = Math.log(LPF_HZ_CAL_HZ_B / LPF_HZ_CAL_HZ_A) / (LPF_HZ_CAL_PCT_B - LPF_HZ_CAL_PCT_A);
  const LPF_HZ_EXP_A = LPF_HZ_CAL_HZ_A * Math.exp(-LPF_HZ_EXP_B * LPF_HZ_CAL_PCT_A);
  function lpfPctToHz(pct) {
    return Math.max(0, Math.min(20000, LPF_HZ_EXP_A * Math.exp(LPF_HZ_EXP_B * pct)));
  }
  const GAIN_LPF_FLOOR_PCT = 10;

  function basePctAtFt(ft) {
    const f = Math.max(0, ft);
    if (f <= LPF_PCT_ANCHORS[0].ft) return LPF_PCT_ANCHORS[0].pct;
    for (let i = 0; i < LPF_PCT_ANCHORS.length - 1; i++) {
      const a = LPF_PCT_ANCHORS[i], b = LPF_PCT_ANCHORS[i + 1];
      if (f <= b.ft) {
        const t = (f - a.ft) / (b.ft - a.ft);
        return a.pct + (b.pct - a.pct) * t;
      }
    }
    return 0;
  }

  function lpfPctAtFt(ft, dispersion) {
    const distScale = 1 - (dispersion / 200);
    const effFt = Math.max(0, ft * distScale);
    return basePctAtFt(effFt);
  }

  const DOT_SPAN_FT = LPF_PCT_ANCHORS[LPF_PCT_ANCHORS.length - 1].ft;
  function dotSteepWarp(ts, st) {
    st = parseFloat(st) || 0; if (!st) return ts;
    const k = Math.pow(2, st / 50);
    return ts < 0.5 ? 0.5 * Math.pow(2 * ts, k) : 1 - 0.5 * Math.pow(2 * (1 - ts), k);
  }
  function lpfPctAtFtCS(ft, offset, steep) {
    const o = Math.max(-100, Math.min(100, parseFloat(offset) || 0)) / 100;
    const t = Math.max(0, ft) / DOT_SPAN_FT;
    const ts = dotSteepWarp(Math.max(0, Math.min(1, t - o * 0.5)), steep);
    return basePctAtFt(ts * DOT_SPAN_FT);
  }
  function db10ToDb100(db10) { return db10 - 20; }

  function ftAtLpfPct(targetPct, dispersion) {
    const distScale = 1 - (dispersion / 200);
    if (distScale <= 0) return Infinity;
    let effFt;
    if (targetPct >= LPF_PCT_ANCHORS[0].pct) {
      effFt = LPF_PCT_ANCHORS[0].ft;
    } else if (targetPct <= LPF_PCT_ANCHORS[LPF_PCT_ANCHORS.length - 1].pct) {
      effFt = LPF_PCT_ANCHORS[LPF_PCT_ANCHORS.length - 1].ft;
    } else {
      effFt = LPF_PCT_ANCHORS[LPF_PCT_ANCHORS.length - 1].ft;
      for (let i = 0; i < LPF_PCT_ANCHORS.length - 1; i++) {
        const a = LPF_PCT_ANCHORS[i], b = LPF_PCT_ANCHORS[i + 1];
        if (targetPct <= a.pct && targetPct >= b.pct) {
          const t = (a.pct - targetPct) / (a.pct - b.pct);
          effFt = a.ft + (b.ft - a.ft) * t;
          break;
        }
      }
    }
    return effFt / distScale;
  }

  function computeWetMixPct(distFt, revDist) {
    const L = Math.max(revDist, 1);
    return Math.max(0, Math.min(100, (distFt / L) * 100));
  }

  function curHalfMi() { return halfMi; }

  function milesToUnit(v, unit) {
    if (unit === 'm') return v * M_PER_MI;
    if (unit === 'ft') return v * FT_PER_MI;
    return v;
  }
  function unitToMiles(v, unit) {
    if (unit === 'm') return v / M_PER_MI;
    if (unit === 'ft') return v / FT_PER_MI;
    return v;
  }
  function clampMi(v) { const h = curHalfMi(); return Math.max(-h, Math.min(h, v)); }

  function placeDot(el, xMi, yMi) {
    const h = curHalfMi();
    const px = ((xMi + h) / (h * 2)) * 100;
    const py = ((h - yMi) / (h * 2)) * 100;
    el.style.left = px + '%';
    el.style.top = py + '%';
  }

  const MIN_HALF = 50 / FT_PER_MI, MAX_HALF = 12;
  function clampHalf(v) { return Math.max(MIN_HALF, Math.min(MAX_HALF, isFinite(v) ? v : 1.5)); }
  function fmtHalf(h) { return h >= 1 ? (+h.toFixed(h >= 10 ? 0 : 2)) + 'mi' : Math.round(h * FT_PER_MI) + 'ft'; }
  function updateScaleLabels() {
    const t = fmtHalf(halfMi);
    get('posTickMin').textContent = '-' + t;
    get('posTickMax').textContent = '+' + t;
  }
  function nearestScaleIdx() { let b = 0; SCALES.forEach(function (sc, i) { if (Math.abs(Math.log(sc.halfMi / halfMi)) < Math.abs(Math.log(SCALES[b].halfMi / halfMi))) b = i; }); return b; }
  function applyHalf() {
    updateScaleLabels();
    scaleIdx = nearestScaleIdx();
    placeDot(get('posUserDot'), posUserX, posUserY);
    placeDot(get('posSirenDot'), 0, 0);
  }
  function stepZoom() {
    const now = performance.now(), dt = Math.min(0.1, Math.max(0.001, (now - zoomLast) / 1000)); zoomLast = now;
    const d = Math.log(zoomTarget / halfMi);
    if (Math.abs(d) < 0.002) { halfMi = zoomTarget; zoomAnim = false; applyHalf(); return; }
    halfMi *= Math.exp(d * (1 - Math.exp(-dt / 0.07)));
    applyHalf(); requestAnimationFrame(stepZoom);
  }
  function setHalf(v, instant) {
    zoomTarget = clampHalf(v);
    if (instant) { halfMi = zoomTarget; zoomAnim = false; applyHalf(); return; }
    if (!zoomAnim) { zoomAnim = true; zoomLast = performance.now(); requestAnimationFrame(stepZoom); }
  }

  function updateCoordInputs() {
    get('posUserX').value = milesToUnit(posUserX, posUnit).toFixed(2);
    get('posUserY').value = milesToUnit(posUserY, posUnit).toFixed(2);
  }

  function updateDistanceFromPosition(distFt) {
    const revDist = parseFloat(get('nDistanceRevDist').value) || 1;

    const mixPct = Math.round(computeWetMixPct(distFt, revDist));
    get('sDistanceMix').value = mixPct;
    get('svDistanceMix').textContent = mixPct + '%';

    const dispersion = parseFloat(get('sDispersionRate').value) || 0;
    const lpfPct = lpfPctAtFt(distFt, dispersion);
    const lpfHz = Math.round(lpfPctToHz(lpfPct));
    const afSlider = get('sDistanceAutoFilterFreq');
    if (afSlider) afSlider.value = lpfHz;
    const afReadout = get('svDistanceAutoFilterFreq');
    if (afReadout) afReadout.textContent = lpfHz + ' Hz';

    const db100raw = parseFloat(get('nDistanceDb100').value);
    const db100 = isNaN(db100raw) ? 117 : db100raw;
    let preGainPct = dbToGainPct(db100);
    if (lpfPct < GAIN_LPF_FLOOR_PCT) {
      preGainPct = preGainPct * (lpfPct / GAIN_LPF_FLOOR_PCT);
    }
    const pgSlider = get('sDistancePreGain');
    const pgMin = parseFloat(pgSlider.min) || 0;
    const pgMax = parseFloat(pgSlider.max) || 300;
    preGainPct = Math.round(Math.max(pgMin, Math.min(pgMax, preGainPct)));
    pgSlider.value = preGainPct;
    get('svDistancePreGain').textContent = preGainPct + '%';

    const dbEl = get('svListenerDb');
    if (dbEl) {
      const splDist = Math.max(distFt, 1);
      const splAtListener = db100 - 20 * Math.log10(splDist / 100);
      dbEl.textContent = isFinite(splAtListener) ? splAtListener.toFixed(1) + ' dB' : '--';
    }
    const effEl = get('svEffectiveGain');
    if (effEl) effEl.textContent = preGainPct + '%';
    const lpfEl = get('svDistanceLPFCutoff');
    if (lpfEl) lpfEl.textContent = (lpfHz >= 1000 ? (lpfHz/1000).toFixed(1) + 'k' : lpfHz) + ' Hz';

    updateDistDirParams('Distance');
  }

  function updateRangeCircles() {
    const svg = get('posRangeCirclesSvg');
    if (!svg) return;
    const halfMi = curHalfMi();

    let svgContent = '';

    svg.innerHTML = svgContent;
  }

  function recalc() {
    placeDot(get('posUserDot'), posUserX, posUserY);
    const distMi = Math.sqrt(posUserX * posUserX + posUserY * posUserY);
    const distFt = distMi * FT_PER_MI;
    let label;
    if (posUnit === 'ft') label = distFt.toFixed(0) + ' ft';
    else if (posUnit === 'm') label = (distMi * M_PER_MI).toFixed(0) + ' m';
    else label = distMi.toFixed(2) + ' mi';
    get('posDistanceReadout').textContent = label;
    if (typeof updateEffectiveDispersion === 'function') updateEffectiveDispersion();
    updateDistanceFromPosition(distFt);
    updateRangeCircles();
    if (typeof applyRotMix === 'function') applyRotMix();
  }
  posRecalc = recalc;
  (function liveSpatial(){
    let lastKey = '';
    const ids = ['nMaxDispersion','nMinDispersion','nMidDispersion','nLeftDispersion','nDispSpan','nDistanceRevDist','nDistanceDb100','sDirPanStrength'];
    const arrow = document.getElementById('posUserHeading'), dotEl = document.getElementById('posUserDot'), wrapEl = document.getElementById('posMapWrap');
    function loop(){
      try{
        if(arrow && dotEl && wrapEl){
          const dr = dotEl.getBoundingClientRect(), wr = wrapEl.getBoundingClientRect();
          const hd = getUserHeadingDeg().toFixed(1); dotEl.style.transform = 'translate(-50%,-50%) rotate(' + hd + 'deg)'; dotEl.setAttribute('data-rot', hd);
        }
        if(audioCtx){
          let k = posUserX + ',' + posUserY + ',' + (typeof rotAngleDeg === 'number' ? rotAngleDeg.toFixed(2) : '') + ',' + spatialFxMode + ',' + getUserHeadingDeg().toFixed(2);
          for(let i = 0; i < ids.length; i++){ const e = document.getElementById(ids[i]); k += ',' + (e ? e.value : ''); }
          if(k !== lastKey){ lastKey = k; recalc(); applyUserPan(); }
        }
      }catch(e){}
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  (function(){
    const cb = document.getElementById('posUserTidal'), inp = document.getElementById('posUserDir'); if(!cb || !inp) return;
    let was = cb.checked;
    cb.addEventListener('change', function(){
      const ua = getUserAngleDeg() || 0, norm = function(a){ a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
      const cur = parseFloat(inp.value) || 0;
      if(cb.checked && !was) inp.value = Math.round(norm(cur - (ua + 180)) * 10) / 10;
      else if(!cb.checked && was) inp.value = Math.round((((cur + ua + 180) % 360 + 360) % 360) * 10) / 10;
      was = cb.checked;
    });
  })();

  getUserAngleDeg = function() {
    if (posUserX === 0 && posUserY === 0) return 0;
    let a = Math.atan2(posUserX, posUserY) * 180 / Math.PI;
    return ((a % 360) + 360) % 360;
  };

  function setFromPointer(clientX, clientY) {
    const rect = get('posMapWrap').getBoundingClientRect();
    let px = (clientX - rect.left) / rect.width;
    let py = (clientY - rect.top) / rect.height;
    px = Math.max(0, Math.min(1, px));
    py = Math.max(0, Math.min(1, py));
    const h = curHalfMi();
    posUserX = clampMi(px * (h * 2) - h);
    posUserY = clampMi(h - py * (h * 2));
    updateCoordInputs();
    recalc();
  }

  const userDot = get('posUserDot');
  userDot.addEventListener('pointerdown', (e) => {
    posDragging = true;
    userDot.setPointerCapture(e.pointerId);
  });
  userDot.addEventListener('pointermove', (e) => { if (posDragging) setFromPointer(e.clientX, e.clientY); });
  userDot.addEventListener('pointerup', () => {
    posDragging = false;
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });

  get('posUserX').addEventListener('input', () => {
    posUserX = clampMi(unitToMiles(parseFloat(get('posUserX').value) || 0, posUnit));
    recalc();
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  get('posUserY').addEventListener('input', () => {
    posUserY = clampMi(unitToMiles(parseFloat(get('posUserY').value) || 0, posUnit));
    recalc();
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  get('posUnit').addEventListener('change', () => {
    posUnit = get('posUnit').value;
    updateCoordInputs();
    recalc();
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50);
  });
  get('posMapWrap').addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const d = Math.max(-30, Math.min(30, e.deltaY));
    setHalf(zoomTarget * Math.exp(d * 0.01));
    if (typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 400);
  }, { passive: false });
  (function () {
    const wrap = get('posMapWrap'), pts = {}; let pinch = null;
    wrap.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      const k = Object.keys(pts);
      if (k.length === 2) { const a = pts[k[0]], b = pts[k[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, h: zoomTarget }; }
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      const k = Object.keys(pts); if (k.length !== 2 || !pinch) return;
      const a = pts[k[0]], b = pts[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setHalf(pinch.h * (pinch.d / d), true);
    });
    const up = (e) => { delete pts[e.pointerId]; if (Object.keys(pts).length < 2) { if (pinch && typeof window.saveSettings === 'function') setTimeout(window.saveSettings, 50); pinch = null; } };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  })();

  placeDot(get('posSirenDot'), 0, 0);
  updateScaleLabels();
  updateCoordInputs();
  if (typeof updateMidDispersionAuto === 'function') updateMidDispersionAuto();
  recalc();

  window._posMath = { anchors: LPF_PCT_ANCHORS, lpfPctAtFt: lpfPctAtFt, lpfPctAtFtCS: lpfPctAtFtCS, db10ToDb100: db10ToDb100, lpfPctToHz: lpfPctToHz, dbToGainPct: dbToGainPct, GAIN_LPF_FLOOR_PCT: GAIN_LPF_FLOOR_PCT, curHalfMi: curHalfMi, FT_PER_MI: FT_PER_MI, M_PER_MI: M_PER_MI };

  getPosMapState = function() {
    return { posUserX: posUserX, posUserY: posUserY, posUnit: posUnit, scaleIdx: scaleIdx, halfMi: halfMi };
  };
  setPosMapState = function(s) {
    if (!s) return;
    if (s.posUnit) {
      posUnit = s.posUnit;
      const u = get('posUnit'); if (u) u.value = posUnit;
    }
    if (isFinite(parseFloat(s.halfMi))) {
      setHalf(parseFloat(s.halfMi), true);
    } else if (s.scaleIdx !== undefined) {
      const i = Math.max(0, Math.min(SCALES.length - 1, parseInt(s.scaleIdx, 10) || 0));
      setHalf(SCALES[i].halfMi, true);
    }
    if (s.posUserX !== undefined) posUserX = clampMi(parseFloat(s.posUserX) || 0);
    if (s.posUserY !== undefined) posUserY = clampMi(parseFloat(s.posUserY) || 0);
    updateCoordInputs();
    placeDot(get('posSirenDot'), 0, 0);
    recalc();
  };
})();

