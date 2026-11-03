function _build8D(name) {
  const panner = audioCtx.createStereoPanner();
  fxChainOut.connect(panner);
  fxChainOut = panner;

  const centerSrc = audioCtx.createConstantSource();
  centerSrc.offset.value = 0;
  centerSrc.connect(panner.pan);
  centerSrc.start();

  if (name === 'Distance') {
    const autoFilter = audioCtx.createBiquadFilter();
    autoFilter.type = 'lowpass';
    autoFilter.Q.value = 0.7071;
    autoFilter.frequency.value = parseFloat(get('sDistanceAutoFilterFreq').value) || 20000;
    fxChainOut.connect(autoFilter);
    fxChainOut = autoFilter;

    const preGain = audioCtx.createGain();
    preGain.gain.value = (parseFloat(get('sDistancePreGain').value) || 0) / 100;
    fxChainOut.connect(preGain);
    fxChainOut = preGain;

    distancePanner=panner; distanceCenterSrc=centerSrc; distanceLfo=null; distanceDepthGain=null;
    distancePreGainNode=preGain; distanceAutoFilterNode=autoFilter;
  } else {
    directionPanner=panner; directionCenterSrc=centerSrc; directionLfo=null; directionDepthGain=null;
    if (typeof applyRotMix === 'function') applyRotMix();
  }
}

function _buildSlpf() {
  const cutoff = Math.max(20, parseFloat(get('nSlpfCutoff').value) || 8000);
  const q      = Math.max(0.1, parseFloat(get('nSlpfQ').value) || 0.7);
  const mix    = parseFloat(get('sSlpfMix').value) / 100;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = cutoff; filt.Q.value = q;
  const stage = _insertFxStage([filt, filt], mix);
  slpfSplitGain=stage.split; slpfDryGain=stage.dry; slpfWetGain=stage.wet; slpfNode=filt;
}

function _buildHpf() {
  const cutoff = Math.min(20000, Math.max(20, (parseFloat(get('nHpfCutoff').value) || 120) + (window.rcHpfAdd ? window.rcHpfAdd() : 0)));
  const q      = Math.max(0.1, parseFloat(get('nHpfQ').value) || 0.7);
  const mix    = parseFloat(get('sHpfMix').value) / 100;
  const filt = audioCtx.createBiquadFilter();
  filt.type = 'highpass'; filt.frequency.value = cutoff; filt.Q.value = q;
  const stage = _insertFxStage([filt, filt], mix);
  hpfSplitGain=stage.split; hpfDryGain=stage.dry; hpfWetGain=stage.wet; hpfNode=filt;
}

function makeDistCurve(amount, character) {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (character === 'hard') {
      curve[i] = Math.max(-1, Math.min(1, x * (1 + amount * 10)));
    } else if (character === 'fuzz') {
      curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * (1 + amount * 15)));
    } else if (character === 'bitcrush') {
      const bits = Math.max(1, Math.round(8 - amount * 6));
      const step = 2 / Math.pow(2, bits);
      curve[i] = Math.round(x / step) * step;
    } else {
      curve[i] = Math.tanh(x * (1 + amount * 8));
    }
  }
  return curve;
}

function _buildDist() {
  const drive  = parseFloat(get('sDistDrive').value)  / 100;
  const toneHz = parseFloat(get('nDistTone').value)   || 4000;
  const char   = get('dDistChar').value;
  const output = parseFloat(get('sDistOutput').value) / 100;
  const mix    = parseFloat(get('sDistMix').value)    / 100;
  const ws = audioCtx.createWaveShaper();
  ws.curve = makeDistCurve(drive, char);
  ws.oversample = '4x';
  const tone = audioCtx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = Math.min(toneHz, audioCtx.sampleRate/2-1); tone.Q.value = 0.7071;
  const outGain = audioCtx.createGain(); outGain.gain.value = output;
  ws.connect(tone); tone.connect(outGain);
  const stage = _insertFxStage([ws, outGain], mix);
  distSplitGain=stage.split; distDryGain=stage.dry; distWetGain=stage.wet;
  distNode=ws; distPostFilter=tone; distOutputGain=outGain;
}

var _reverbImpulseTimer = [null, null, null];


function _rvPfx(w){ return w === 1 ? '' : (w === 2 ? '2' : '3'); }
function _rvPLOn(w){ const e = get('dReverb'+_rvPfx(w)+'PosLink'); return !!e && e.value === 'on'; }
function _rvPLNum(id, d){ const e = get(id), v = e ? parseFloat(e.value) : NaN; return isFinite(v) ? v : d; }
function _rvPLSpread(w){
  const p = _rvPfx(w), ft = (typeof _sopDistM === 'function' ? _sopDistM() : 0) * 3.28084;
  const near = _rvPLNum('nReverb'+p+'PLNear', 100), far = Math.max(near + 1, _rvPLNum('nReverb'+p+'PLFar', 5280));
  const dw = Math.max(0, Math.min(1, _rvPLNum('nReverb'+p+'PLDistW', 100) / 100)), aw = Math.max(0, Math.min(1, _rvPLNum('nReverb'+p+'PLDirW', 100) / 100));
  const curve = Math.max(0.1, _rvPLNum('nReverb'+p+'PLCurve', 1));
  const td = Math.pow(Math.max(0, Math.min(1, (ft - near) / (far - near))), curve);
  const ta = Math.pow(_rvPLTA(typeof getRelativeAngleDeg === 'function' ? getRelativeAngleDeg() : 0), curve);
  const spread = 1 - (1 - dw * td) * (1 - aw * ta);
  return { spread: isFinite(spread) ? spread : 0, td: td, ta: ta };
}
function _rvPLTA(thetaDeg){
  try{
    const mode = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni';
    const maxD = parseFloat((get('nMaxDispersion')||{}).value), minD = parseFloat((get('nMinDispersion')||{}).value), midD = parseFloat((get('nMidDispersion')||{}).value);
    const hi = isNaN(maxD) ? 100 : maxD, lo = isNaN(minD) ? -100 : minD, mid = isNaN(midD) ? (hi + lo) / 2 : midD;
    if (mode === 'omni' || hi === lo) return 0;
    const bidir = (mode === 'rotationalBidir' || mode === 'directionalBidir');
    const t = (hi - dispCurveEval(thetaDeg, hi, mid, lo, bidir)) / (hi - lo);
    return isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
  }catch(e){ return 0; }
}
function _rvPLParams(w){
  const p = _rvPfx(w), near = _rvPLNum('nReverb'+p+'PLNear', 100);
  return { dry: _rvPLNum('nReverb'+p+'PLDry', 10), wet: _rvPLNum('nReverb'+p+'PLWet', 85), near: near, far: Math.max(near + 1, _rvPLNum('nReverb'+p+'PLFar', 5280)),
    dw: Math.max(0, Math.min(1, _rvPLNum('nReverb'+p+'PLDistW', 100) / 100)), aw: Math.max(0, Math.min(1, _rvPLNum('nReverb'+p+'PLDirW', 100) / 100)), curve: Math.max(0.1, _rvPLNum('nReverb'+p+'PLCurve', 1)) };
}
function _rvPLDrawCurve(cv, fn, xMax, xLabel, marker, key, ymin, ymax){
  if (!cv || cv.offsetParent === null) return;
  const W = cv.offsetWidth, H = cv.offsetHeight; if (!W || !H) return;
  const sig = [W, H, key, marker == null ? '' : Math.round(marker * 100)].join('|'); if (cv._sig === sig) return; cv._sig = sig;
  const deg = (xLabel === 'deg');
  window.vzPlot(cv, { xmin:0, xmax:xMax, ymin:Math.min(ymin, ymax), ymax:Math.max(ymin, ymax) || 1,
    xlabel: deg ? 'Angle (\u00b0)' : 'Distance (ft)', ylabel:'Mix (%)',
    xticks: deg ? (cv.clientWidth < 240 ? [0, 180, 360] : [0, 90, 180, 270, 360]) : null, xfmt: deg ? function(t){ return t + '\u00b0'; } : null,
    series:[{ f:fn, n:120, color:'#e8c547' }], marker: marker == null ? null : { x:marker, y:fn(marker) } });
}
function _rvPLGraphs(w){
  const p = _rvPfx(w), body = get('rvPL'+p+'Body'); if (!body || body.style.display === 'none') return;
  const q = _rvPLParams(w), ymin = Math.min(q.dry, q.wet), ymax = Math.max(q.dry, q.wet);
  const mixOf = function(spread){ return q.dry + (q.wet - q.dry) * spread; };
  const ft = (typeof _sopDistM === 'function' ? _sopDistM() : 0) * 3.28084, ang = typeof getRelativeAngleDeg === 'function' ? getRelativeAngleDeg() : 0;
  const xMaxD = q.far * 1.25, base = [q.dry, q.wet, q.near, q.far, q.dw, q.aw, q.curve].join(',');
  _rvPLDrawCurve(get('rvPL'+p+'CvDist'), function(x){ return mixOf(q.dw * Math.pow(Math.max(0, Math.min(1, (x - q.near) / (q.far - q.near))), q.curve)); }, xMaxD, 'ft', Math.min(ft, xMaxD), 'd' + base + '|' + xMaxD, ymin, ymax);
  const mode = (typeof spatialFxMode !== 'undefined') ? spatialFxMode : 'omni';
  _rvPLDrawCurve(get('rvPL'+p+'CvDir'), function(x){ return mixOf(q.aw * Math.pow(_rvPLTA(x), q.curve)); }, 360, 'deg', ang, 'a' + base + '|' + mode + '|' + [get('nMaxDispersion'), get('nMinDispersion'), get('nMidDispersion'), get('nLeftDispersion'), get('nDispSpan')].map(function(e){ return e ? e.value : ''; }).join(',') + JSON.stringify(window._dispHandles) + JSON.stringify(window._dispHandles360), ymin, ymax);
}
function _rvPosMix(w, fallback){
  if (!_rvPLOn(w)) return fallback;
  const p = _rvPfx(w), dry = _rvPLNum('nReverb'+p+'PLDry', 10), wet = _rvPLNum('nReverb'+p+'PLWet', 85);
  const m = (dry + (wet - dry) * _rvPLSpread(w).spread) / 100;
  return Math.max(0, Math.min(1, isFinite(m) ? m : fallback));
}
const _rvPLLast = {};
function _rvPLTick(){
  [1, 2, 3].forEach(function(w){ try{ _rvPLGraphs(w); }catch(e){} });
  [1, 2, 3].forEach(function(w){
    const p = _rvPfx(w), on = _rvPLOn(w), slider = get('sReverb'+p+'Mix'), rd = get('svReverb'+p+'PL'), grid = get('rvPL'+p+'Grid');
    if (!slider) return;
    if (slider.disabled !== on) slider.disabled = on;
    slider.style.opacity = on ? '0.45' : '';
    if (grid) grid.style.opacity = on ? '' : '0.55';
    if (!on) { if (rd && rd.textContent !== '--') rd.textContent = '--'; _rvPLLast[w] = null; return; }
    const mix = _rvPosMix(w, 0.35), pct = Math.round(mix * 100);
    const txt = pct + '% wet', sv = get('svReverb'+p+'Mix');
    if (rd && rd.textContent !== txt) rd.textContent = txt;
    if (slider.value !== String(pct)) slider.value = pct;
    if (sv && sv.textContent !== pct + '%') sv.textContent = pct + '%';
    const en = w === 1 ? reverbEnabled : (w === 2 ? reverb2Enabled : reverb3Enabled);
    if (!en || !audioCtx) return;
    if (_rvPLLast[w] != null && Math.abs(_rvPLLast[w] - mix) < 0.002) return;
    _rvPLLast[w] = mix;
    const wg = w === 1 ? reverbWetGain : (w === 2 ? reverb2WetGain : reverb3WetGain), dg = w === 1 ? reverbDryGain : (w === 2 ? reverb2DryGain : reverb3DryGain), now = audioCtx.currentTime;
    if (wg) wg.gain.setTargetAtTime(mix, now, 0.08);
    if (dg) dg.gain.setTargetAtTime(1 - mix, now, 0.08);
  });
}
setInterval(function(){ try{ _rvPLTick(); }catch(e){} }, 60);
['', '2', '3'].forEach(function(p, i){
  const w = i + 1;
  ['dReverb'+p+'PosLink','nReverb'+p+'PLDry','nReverb'+p+'PLWet','nReverb'+p+'PLNear','nReverb'+p+'PLFar','nReverb'+p+'PLDistW','nReverb'+p+'PLDirW','nReverb'+p+'PLCurve'].forEach(function(id){
    const e = get(id); if (!e) return;
    ['input','change'].forEach(function(ev){ e.addEventListener(ev, function(){ _rvPLLast[w] = null; try{ updateReverbParams(w); }catch(err){} _rvPLTick(); }); });
  });
});
document.querySelectorAll('.rvpl-tog').forEach(function(t){
  t.addEventListener('click', function(){
    const b = get('rvPL' + t.dataset.pfx + 'Body'); if (!b) return;
    const open = b.style.display === 'none'; b.style.display = open ? '' : 'none';
    const fc = t.closest('.fxn'); if (fc) fc.style.zIndex = open ? '9000' : '';
    t.innerHTML = (open ? '<svg class="si" aria-hidden="true"><use href="#si-tri-u"/></svg>' : '<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg>') + ' Position Link';
    ['CvDist','CvDir'].forEach(function(n){ const c = get('rvPL' + t.dataset.pfx + n); if (c) c._sig = ''; });
    try{ _rvPLTick(); }catch(e){}
  });
});
document.addEventListener('pointerdown', function(ev){
  document.querySelectorAll('.rvpl-body').forEach(function(b){
    if(b.style.display === 'none' || b.closest('.rv-pl').contains(ev.target)) return;
    b.style.display = 'none'; const t = b.closest('.rv-pl').querySelector('.rvpl-tog'); if(t) t.innerHTML = '<svg class="si" aria-hidden="true"><use href="#si-tri-d"/></svg> Position Link';
  });
}, true);
const _RV_PL_IDS = ['dReverb#PosLink','nReverb#PLDry','nReverb#PLWet','nReverb#PLNear','nReverb#PLFar','nReverb#PLDistW','nReverb#PLDirW','nReverb#PLCurve'];
function _rvPLGather(){ const o = {}; ['', '2', '3'].forEach(function(p){ _RV_PL_IDS.forEach(function(t){ const id = t.replace('#', p), e = get(id); if (e) o[id] = e.value; }); }); return o; }
function _rvPLApply(o){
  ['', '2', '3'].forEach(function(p){ _RV_PL_IDS.forEach(function(t){ const id = t.replace('#', p), e = get(id); if (!e) return;
    if (o && o[id] !== undefined) e.value = o[id]; else if (e.tagName === 'SELECT') e.value = 'off'; }); });
  _rvPLLast[1] = _rvPLLast[2] = _rvPLLast[3] = null; try{ _rvPLTick(); }catch(e){}
}
function updateReverbParams(which) {
  const pfx = (which === 1) ? '' : (which === 2 ? '2' : '3');
  const en   = (which === 1) ? reverbEnabled  : (which === 2 ? reverb2Enabled : reverb3Enabled);
  const node = (which === 1) ? reverbNode     : (which === 2 ? reverb2Node    : reverb3Node);
  if (!en || !node) return;
  const mix     = _rvPosMix(which, parseFloat(get('sReverb'+pfx+'Mix').value) / 100);
  const color   = parseFloat(get('sReverb'+pfx+'Color').value)   / 100;
  const lowCutHz= parseFloat(get('sReverb'+pfx+'LowCut').value);
  const preDelMs= parseFloat(get('nReverb'+pfx+'PreDelay').value) || 0;
  const size    = parseFloat(get('sReverb'+pfx+'Size').value)     / 100;
  const decay   = parseFloat(get('sReverb'+pfx+'Decay').value)    / 100;
  const diff    = parseFloat(get('sReverb'+pfx+'Diffusion').value)/ 100;
  const wg = (which===1)?reverbWetGain :(which===2?reverb2WetGain :reverb3WetGain);
  const dg = (which===1)?reverbDryGain :(which===2?reverb2DryGain :reverb3DryGain);
  const hf = (which===1)?reverbHFDamp  :(which===2?reverb2HFDamp  :reverb3HFDamp);
  const lc = (which===1)?reverbLowCut  :(which===2?reverb2LowCut  :reverb3LowCut);
  const pd = (which===1)?reverbPreDelay:(which===2?reverb2PreDelay:reverb3PreDelay);
  const now = audioCtx.currentTime;
  if (wg) wg.gain.setTargetAtTime(mix,   now, 0.05);
  if (dg) dg.gain.setTargetAtTime(1-mix, now, 0.05);
  if (hf) hf.frequency.setTargetAtTime(20000 * Math.pow(50/1000, color), now, 0.05);
  if (lc) lc.frequency.setTargetAtTime(Math.max(20, lowCutHz), now, 0.05);
  if (pd) pd.delayTime.setTargetAtTime(Math.min(0.15, preDelMs/1000), now, 0.05);
  const inConvolverMode = (which === 1 && typeof reverb1Mode !== 'undefined' && reverb1Mode === 'convolver')
                       || (which === 2 && typeof reverb2Mode !== 'undefined' && reverb2Mode === 'convolver')
                       || (which === 3 && typeof reverb3Mode !== 'undefined' && reverb3Mode === 'convolver');
  if (!inConvolverMode) {
    const ti = which - 1;
    if (_reverbImpulseTimer[ti]) { clearTimeout(_reverbImpulseTimer[ti]); _reverbImpulseTimer[ti] = null; }
    _reverbImpulseTimer[ti] = setTimeout(function() {
      _reverbImpulseTimer[ti] = null;
      const bp = (which===1) ? reverbBuildPending : (which===2 ? reverb2BuildPending : reverb3BuildPending);
      if (bp) return;
      if (which===1) reverbBuildPending=true; else if (which===2) reverb2BuildPending=true; else reverb3BuildPending=true;
      buildImpulseAsync(size, decay, diff, function(impulse) {
        const conv = (which===1) ? reverbNode : (which===2 ? reverb2Node : reverb3Node);
        if (conv) conv.buffer = impulse;
        if (which===1) reverbBuildPending=false; else if (which===2) reverb2BuildPending=false; else reverb3BuildPending=false;
      });
    }, 200);
  }
}

function updateDistDirParams(name) {
  const en     = name === 'Distance' ? distanceEnabled : directionEnabled;
  const panner = name === 'Distance' ? distancePanner  : directionPanner;
  if (!en || !panner) return;
  const pg    = name === 'Distance' ? distancePreGainNode : null;
  const af    = name === 'Distance' ? distanceAutoFilterNode : null;
  const now   = audioCtx.currentTime;
  if (name === 'Distance') {
    if (pg) pg.gain.setTargetAtTime((parseFloat(get('sDistancePreGain').value)||0)/100, now, 0.012);
    if (af) af.frequency.setTargetAtTime(parseFloat(get('sDistanceAutoFilterFreq').value)||20000, now, 0.008);
  }
}

function updateSlpfParams() {
  if (!slpfEnabled || !slpfNode) return;
  const cutoff = Math.max(20, parseFloat(get('nSlpfCutoff').value) || 8000);
  const q      = Math.max(0.1, parseFloat(get('nSlpfQ').value) || 0.7);
  const mix    = parseFloat(get('sSlpfMix').value) / 100;
  const now    = audioCtx.currentTime;
  slpfNode.frequency.setTargetAtTime(cutoff, now, 0.05);
  slpfNode.Q.setTargetAtTime(q, now, 0.05);
  if (slpfWetGain) slpfWetGain.gain.setTargetAtTime(mix,   now, 0.05);
  if (slpfDryGain) slpfDryGain.gain.setTargetAtTime(1-mix, now, 0.05);
}

function updateHpfParams() {
  if (!hpfEnabled || !hpfNode) return;
  const cutoff = Math.min(20000, Math.max(20, (parseFloat(get('nHpfCutoff').value) || 120) + (window.rcHpfAdd ? window.rcHpfAdd() : 0)));
  const q      = Math.max(0.1, parseFloat(get('nHpfQ').value) || 0.7);
  const mix    = parseFloat(get('sHpfMix').value) / 100;
  const now    = audioCtx.currentTime;
  hpfNode.frequency.setTargetAtTime(cutoff, now, 0.05);
  hpfNode.Q.setTargetAtTime(q, now, 0.05);
  if (hpfWetGain) hpfWetGain.gain.setTargetAtTime(mix,   now, 0.05);
  if (hpfDryGain) hpfDryGain.gain.setTargetAtTime(1-mix, now, 0.05);
}

function updateDistParams() {
  if (!distEnabled || !distNode) return;
  const drive  = parseFloat(get('sDistDrive').value)  / 100;
  const toneHz = parseFloat(get('nDistTone').value)   || 4000;
  const char   = get('dDistChar').value;
  const output = parseFloat(get('sDistOutput').value) / 100;
  const mix    = parseFloat(get('sDistMix').value)    / 100;
  const now    = audioCtx.currentTime;
  distNode.curve = makeDistCurve(drive, char);
  if (distPostFilter) distPostFilter.frequency.setTargetAtTime(Math.min(toneHz, audioCtx.sampleRate/2-1), now, 0.05);
  if (distOutputGain) distOutputGain.gain.setTargetAtTime(output, now, 0.05);
  if (distWetGain)    distWetGain.gain.setTargetAtTime(mix,   now, 0.05);
  if (distDryGain)    distDryGain.gain.setTargetAtTime(1-mix, now, 0.05);
}

function makeBlowerCurve(amplitude, smoothing) {
  const n = 512;
  const curve = new Float32Array(n);
  const deadband = 0.15;

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (x > deadband) {
      const t = (x - deadband) / (1 - deadband);
      curve[i] = smoothing > 0
        ? Math.tanh(t * (1 + smoothing * 6)) / Math.tanh(1 + smoothing * 6)
        : Math.min(1, t);
    } else if (x < -deadband) {
      const t = (-x - deadband) / (1 - deadband);
      curve[i] = -(smoothing > 0
        ? Math.tanh(t * (1 + smoothing * 6)) / Math.tanh(1 + smoothing * 6)
        : Math.min(1, t));
    } else {
      if (smoothing > 0) {
        curve[i] = Math.tanh(x / deadband * smoothing * 3) * smoothing * 0.15;
      } else {
        curve[i] = 0;
      }
    }
  }
  return curve;
}

function _buildBlower() {
  const amplitude = parseFloat(get('sBlowerAmplitude').value) / 100;
  const smoothing = parseFloat(get('sBlowerSmoothing').value) / 100;
  const output    = parseFloat(get('sBlowerOutput').value)    / 100;
  const mix       = parseFloat(get('sBlowerMix').value)       / 100;

  const preGain = audioCtx.createGain();
  preGain.gain.value = 1 + amplitude * 10;

  const ws = audioCtx.createWaveShaper();
  ws.curve = makeBlowerCurve(amplitude, smoothing);
  ws.oversample = '4x';

  const outGain = audioCtx.createGain();
  outGain.gain.value = output * blowerCurrentGain;

  preGain.connect(ws); ws.connect(outGain);
  const stage = _insertFxStage([preGain, outGain], mix);
  blowerSplitGain=stage.split; blowerDryGain=stage.dry; blowerWetGain=stage.wet;
  blowerPreGain=preGain; blowerNode=ws; blowerPostFilter=null; blowerOutputGain=outGain;
}

function updateBlowerFade() {
  if (!blowerEnabled) return;
  const fadeTimeSec  = parseFloat(get('nBlowerFadeTime').value)     || 3;
  const fadeInTime   = parseFloat(get('nBlowerFadeInTime').value)   || 2;
  const volDrop      = parseFloat(get('sBlowerVolDrop').value)      / 100;
  const outputGain   = parseFloat(get('sBlowerOutput').value)       / 100;

  const dot = get('blowerStateDot');
  const txt = get('blowerStateTxt');

  let fadeMult = 1;
  let fadeDur  = 0.05;
  let stateLabel = 'ACTIVE';
  let dotClass = 'ind-dot on-green';
  const sirenBlower = (typeof window._ceBlowerState === 'function') ? window._ceBlowerState() : null;

  if (sirenBlower) {
    if (sirenBlower.on) {
      fadeMult = 1; fadeDur = fadeInTime; stateLabel = 'ON'; dotClass = 'ind-dot on-green';
    } else {
      fadeMult = 1 - volDrop; fadeDur = fadeTimeSec; stateLabel = 'OFF'; dotClass = 'ind-dot on-yellow';
    }
  }

  dot.className = dotClass;
  txt.textContent = stateLabel;

  const targetGain = outputGain * fadeMult;

  if (blowerOutputGain && audioCtx) {
    const tgKey = targetGain.toFixed(5);
    if (blowerOutputGain._fadeKey !== tgKey) {
      blowerOutputGain._fadeKey = tgKey;
      const now = audioCtx.currentTime;
      const g = blowerOutputGain.gain;
      const cur = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(cur, now);
      const _fd = Math.max(0.02, fadeDur), _N = 96, _FLOOR = 0.00316;
      const _lo = Math.min(cur, targetGain), _hi = Math.max(cur, targetGain);
      const _eLo = Math.max(_lo, _hi * _FLOOR);
      if (_hi <= 1e-6 || _eLo >= _hi * 0.999) {
        g.linearRampToValueAtTime(targetGain, now + _fd);
      } else {
        const _eFrom = Math.max(cur, _eLo), _eTo = Math.max(targetGain, _eLo);
        for (let i = 1; i <= _N; i++) {
          const x = i / _N, k = x;
          g.linearRampToValueAtTime(i === _N ? targetGain : _eFrom * Math.pow(_eTo / _eFrom, k), now + _fd * x);
        }
      }
    }
  }
  blowerCurrentGain = fadeMult;

  if (blowerWetGain && audioCtx) {
    const mix = parseFloat(get('sBlowerMix').value) / 100;
    const now = audioCtx.currentTime;
    blowerWetGain.gain.setTargetAtTime(mix, now, 0.05);
    blowerDryGain.gain.setTargetAtTime(1 - mix, now, 0.05);
  }

  tickConstBlowerLinks();
}
